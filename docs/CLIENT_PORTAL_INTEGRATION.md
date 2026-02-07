# Client Portal Integration Guide

## Overview

This guide shows how to integrate the License Authority into your client portal for license management (issuance, revocation, viewing).

## Architecture

```
┌─────────────────────┐
│  Client Portal      │ ← Admin interface
│  (Your Backend)     │
└──────────┬──────────┘
           │ HTTPS + HMAC Auth
           ▼
┌─────────────────────┐
│  License Authority  │ ← Issues/revokes licenses
│  (Cloudflare)       │
└─────────────────────┘
```

## Step 1: HMAC Authentication

Create an HMAC client for secure API calls:

```typescript
// src/lib/license-authority-client.ts

export class LicenseAuthorityClient {
  private baseUrl: string;
  private hmacSecret: string;

  constructor(baseUrl: string, hmacSecret: string) {
    this.baseUrl = baseUrl;
    this.hmacSecret = hmacSecret;
  }

  private async generateHMAC(
    method: string,
    path: string,
    body: string
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${method}:${path}:${timestamp}:${body}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.hmacSecret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const signatureBase64 = Buffer.from(signature).toString("base64");

    return `HMAC-SHA256 ${timestamp}:${signatureBase64}`;
  }

  private async makeRequest<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const bodyStr = body ? JSON.stringify(body) : "";
    const authHeader = await this.generateHMAC(method, path, bodyStr);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: bodyStr || undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  async issueLicense(params: {
    tenant_id: string;
    plan_id: "starter" | "pro" | "enterprise";
    allowed_domains: string[];
    expires_at: number;
    grace_days?: number;
  }) {
    return this.makeRequest<{
      license: string;
      license_id: string;
      issued_at: number;
      expires_at: number;
    }>("POST", "/authority/license/issue", params);
  }

  async revokeLicense(licenseId: string, reason: string) {
    return this.makeRequest<{
      revoked: boolean;
      license_id: string;
      revoked_at: number;
    }>("POST", "/authority/license/revoke", {
      license_id: licenseId,
      reason,
    });
  }

  async getPublicKey() {
    const response = await fetch(`${this.baseUrl}/authority/public-key`);
    return await response.json();
  }
}

// Singleton instance
export const licenseAuthority = new LicenseAuthorityClient(
  process.env.LICENSE_AUTHORITY_URL!,
  process.env.LICENSE_AUTHORITY_SECRET!
);
```

## Step 2: License Issuance API

Create an API endpoint for license issuance:

```typescript
// src/api/licenses/issue.ts
import { licenseAuthority } from "../../lib/license-authority-client";

export async function POST(req: Request) {
  try {
    // Verify admin authentication
    const user = await verifyAdmin(req);
    
    // Parse request
    const { tenant_id, plan_id, domains, duration_days } = await req.json();

    // Validate inputs
    if (!tenant_id || !plan_id || !domains || !duration_days) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate expiry
    const expires_at = Math.floor(Date.now() / 1000) + (duration_days * 24 * 60 * 60);

    // Issue license via authority
    const result = await licenseAuthority.issueLicense({
      tenant_id,
      plan_id,
      allowed_domains: domains,
      expires_at,
      grace_days: 14,
    });

    // Store in your database
    await db.licenses.create({
      license_id: result.license_id,
      tenant_id,
      plan_id,
      license_data: result.license,
      issued_at: new Date(result.issued_at * 1000),
      expires_at: new Date(result.expires_at * 1000),
      issued_by: user.id,
    });

    // Audit log
    await db.auditLog.create({
      action: "license_issued",
      user_id: user.id,
      tenant_id,
      details: { license_id: result.license_id, plan_id },
    });

    return Response.json({
      success: true,
      license_id: result.license_id,
      license: result.license,
    });
  } catch (error) {
    console.error("License issuance failed:", error);
    return Response.json(
      { error: "Failed to issue license" },
      { status: 500 }
    );
  }
}
```

## Step 3: License Revocation API

Create an API endpoint for revocation:

```typescript
// src/api/licenses/revoke.ts
import { licenseAuthority } from "../../lib/license-authority-client";

export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { license_id, reason } = await req.json();

    if (!license_id || !reason) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Revoke via authority
    const result = await licenseAuthority.revokeLicense(license_id, reason);

    // Update in your database
    await db.licenses.update({
      where: { license_id },
      data: {
        revoked_at: new Date(result.revoked_at * 1000),
        revocation_reason: reason,
        revoked_by: user.id,
      },
    });

    // Audit log
    await db.auditLog.create({
      action: "license_revoked",
      user_id: user.id,
      license_id,
      details: { reason },
    });

    return Response.json({
      success: true,
      revoked_at: result.revoked_at,
    });
  } catch (error) {
    console.error("License revocation failed:", error);
    return Response.json(
      { error: "Failed to revoke license" },
      { status: 500 }
    );
  }
}
```

## Step 4: License Listing API

List licenses for a tenant:

```typescript
// src/api/licenses/list.ts

export async function GET(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const url = new URL(req.url);
    const tenant_id = url.searchParams.get("tenant_id");

    if (!tenant_id) {
      return Response.json({ error: "tenant_id required" }, { status: 400 });
    }

    // Fetch from your database
    const licenses = await db.licenses.findMany({
      where: { tenant_id },
      orderBy: { issued_at: "desc" },
    });

    return Response.json({
      licenses: licenses.map(l => ({
        license_id: l.license_id,
        plan_id: l.plan_id,
        issued_at: l.issued_at,
        expires_at: l.expires_at,
        revoked_at: l.revoked_at,
        revocation_reason: l.revocation_reason,
        status: getStatus(l),
      })),
    });
  } catch (error) {
    console.error("License listing failed:", error);
    return Response.json(
      { error: "Failed to list licenses" },
      { status: 500 }
    );
  }
}

function getStatus(license: any): string {
  if (license.revoked_at) return "revoked";
  
  const now = new Date();
  if (now > license.expires_at) return "expired";
  
  const warningDate = new Date(license.expires_at);
  warningDate.setDate(warningDate.getDate() - 7);
  if (now > warningDate) return "expiring_soon";
  
  return "active";
}
```

## Step 5: Frontend Integration

Create a license management UI:

```typescript
// components/LicenseManager.tsx
import { useState } from "react";

export function LicenseManager({ tenantId }: { tenantId: string }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);

  async function issueLicense(data: {
    plan_id: string;
    domains: string[];
    duration_days: number;
  }) {
    setLoading(true);
    try {
      const response = await fetch("/api/licenses/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          ...data,
        }),
      });

      if (!response.ok) throw new Error("Failed to issue license");

      const result = await response.json();
      
      // Download license file
      downloadLicense(result.license, result.license_id);
      
      // Refresh list
      await loadLicenses();
    } catch (error) {
      alert("Failed to issue license: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function revokeLicense(licenseId: string, reason: string) {
    if (!confirm("Are you sure you want to revoke this license?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/licenses/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_id: licenseId, reason }),
      });

      if (!response.ok) throw new Error("Failed to revoke license");

      await loadLicenses();
    } catch (error) {
      alert("Failed to revoke license: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadLicense(licenseBase64: string, licenseId: string) {
    const blob = new Blob([licenseBase64], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gsmflow-license-${licenseId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h2>License Management</h2>
      
      {/* Issue License Form */}
      <LicenseIssueForm onSubmit={issueLicense} loading={loading} />
      
      {/* License List */}
      <LicenseList 
        licenses={licenses} 
        onRevoke={revokeLicense}
        loading={loading}
      />
    </div>
  );
}
```

## Step 6: Environment Configuration

```bash
# .env
LICENSE_AUTHORITY_URL=https://gsmflow-authority.ylstack02.workers.dev
LICENSE_AUTHORITY_SECRET=production-hmac-secret-gsmflow-2026
```

## Security Best Practices

### ✅ DO

1. **Store HMAC secret securely** - Use environment variables
2. **Validate all inputs** - Tenant ID, domains, plan
3. **Audit all operations** - Log who issued/revoked licenses
4. **Rate limit API calls** - Prevent abuse
5. **Verify admin authentication** - Only admins can manage licenses
6. **Use HTTPS only** - Never HTTP
7. **Download licenses securely** - Don't expose in URLs

### ❌ DON'T

1. **Don't expose HMAC secret** - Keep server-side only
2. **Don't log license data** - Contains sensitive information
3. **Don't allow public access** - Admin-only endpoints
4. **Don't skip input validation** - Prevent injection attacks
5. **Don't cache licenses** - Always fetch fresh from authority

## Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// src/middleware/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour
});

export async function rateLimitMiddleware(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }
  
  return null;
}
```

## Error Handling

Handle errors gracefully:

```typescript
// src/lib/error-handler.ts

export class LicenseAuthorityError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = "LicenseAuthorityError";
  }
}

export function handleLicenseError(error: any) {
  if (error instanceof LicenseAuthorityError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("Unexpected error:", error);
  return Response.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

## Testing

Test license management:

```typescript
// test/license-management.test.ts

describe("License Management", () => {
  test("should issue license", async () => {
    const result = await licenseAuthority.issueLicense({
      tenant_id: "test-tenant",
      plan_id: "pro",
      allowed_domains: ["test.com"],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    });

    expect(result.license_id).toBeDefined();
    expect(result.license).toBeDefined();
  });

  test("should revoke license", async () => {
    const issued = await licenseAuthority.issueLicense({...});
    
    const result = await licenseAuthority.revokeLicense(
      issued.license_id,
      "test_revocation"
    );

    expect(result.revoked).toBe(true);
  });

  test("should handle invalid HMAC", async () => {
    const badClient = new LicenseAuthorityClient(url, "wrong-secret");
    
    await expect(badClient.issueLicense({...})).rejects.toThrow();
  });
});
```

## Production Checklist

- [ ] HMAC secret configured
- [ ] Admin authentication implemented
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Audit logging implemented
- [ ] Error handling implemented
- [ ] HTTPS enforced
- [ ] License download functionality
- [ ] Revocation workflow
- [ ] Tests for all operations
- [ ] Documentation for support team
