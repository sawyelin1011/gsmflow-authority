# License Authority Integration Guide

Complete guide for integrating the GSMFlow License Authority into your application.

## Table of Contents

1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Integration Steps](#integration-steps)
4. [Client Implementation](#client-implementation)
5. [License Verification](#license-verification)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

The License Authority provides cryptographically signed licenses that your application verifies **offline**. This means:

- ✅ No per-request validation calls to the authority
- ✅ Works in air-gapped environments
- ✅ Cannot be DDoS'd
- ✅ Secure even if your app is self-hosted by untrusted clients

### Architecture Flow

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Your Billing  │         │     License      │         │   GSMFlow   │
│     System      │────────▶│    Authority     │────────▶│     App     │
│                 │  Issue  │  (Cloudflare)    │ License │  (Customer) │
└─────────────────┘         └──────────────────┘         └─────────────┘
                                     │                           │
                                     │ Revoke                    │ Verify
                                     ▼                           │ Offline
                            ┌──────────────────┐                │
                            │  Revocation List │◀───────────────┘
                            │      (KV)        │  Periodic Sync
                            └──────────────────┘
```

## Security Architecture

### 1. Cryptographic Signing (ED25519)

Licenses are signed with ED25519 private key:
- **Private Key**: Stored only in License Authority (Cloudflare Secret)
- **Public Key**: Embedded in your application code
- **Signature**: Cannot be forged without private key

### 2. HMAC Authentication (SHA-256)

API requests authenticated with HMAC-SHA256:
- **Secret**: Shared between your backend and License Authority
- **Signature**: Covers method, path, timestamp, and body
- **Replay Protection**: 5-minute timestamp window

### 3. Domain Binding

Licenses tied to specific domains:
- Prevents license sharing between customers
- Verified by checking request hostname
- Supports wildcard subdomains (*.example.com)

### 4. Revocation System

Licenses can be revoked remotely:
- Stored in global KV (fast reads)
- Checked periodically by your app (not per-request)
- Rate-limited to prevent abuse

## Integration Steps

### Step 1: Obtain Credentials

Contact your License Authority administrator to get:

1. **HMAC Secret** - For API authentication
2. **Public Key** - For license verification
3. **Authority URL** - API endpoint (e.g., https://authority.workers.dev)

### Step 2: Install Dependencies

```bash
# No external dependencies required!
# Uses native Web Crypto API
```

### Step 3: Embed Public Key

Add the public key to your application:

```typescript
// config/license.ts
export const LICENSE_CONFIG = {
  AUTHORITY_PUBLIC_KEY: "MCowBQYDK2VwAyEA...", // From authority admin
  AUTHORITY_URL: "https://authority.workers.dev",
  SYNC_INTERVAL: 3600000, // 1 hour in milliseconds
};
```

### Step 4: Implement License Verification

Copy the verification code from `examples/gsmflow-verify.ts` into your application.

### Step 5: Set License Environment Variable

```bash
# In your deployment environment
export GSMFLOW_LICENSE="eyJsaWNlbnNlX2lkIjoi..."
```

## Client Implementation

### Backend Service (Issues Licenses)

Your billing/provisioning system calls the License Authority to issue licenses.

#### Install HTTP Client

```typescript
// No special client needed - use native fetch()
```

#### Generate HMAC Signature

```typescript
// lib/license-authority-client.ts

async function generateHMAC(
  method: string,
  path: string,
  body: string,
  secret: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method}:${path}:${timestamp}:${body}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `HMAC-SHA256 ${timestamp}:${signatureBase64}`;
}
```

#### Issue License

```typescript
interface IssueLicenseRequest {
  tenant_id: string;
  plan_id: "starter" | "pro" | "enterprise";
  allowed_domains: string[];
  expires_at: number;
  grace_days?: number;
  feature_overrides?: {
    automation?: boolean;
    multi_tenant?: boolean;
    api_access?: boolean;
    custom_branding?: boolean;
    advanced_analytics?: boolean;
    priority_support?: boolean;
  };
}

async function issueLicense(
  request: IssueLicenseRequest,
  authorityUrl: string,
  hmacSecret: string
): Promise<string> {
  const path = "/authority/license/issue";
  const body = JSON.stringify(request);
  
  const authHeader = await generateHMAC("POST", path, body, hmacSecret);

  const response = await fetch(`${authorityUrl}${path}`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`License issuance failed: ${error.error}`);
  }

  const data = await response.json();
  return data.license; // Base64-encoded signed license
}
```

#### Example Usage

```typescript
// In your billing webhook handler
async function handleSubscriptionCreated(subscription: Subscription) {
  const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
  
  const license = await issueLicense(
    {
      tenant_id: subscription.tenant_id,
      plan_id: subscription.plan, // "starter" | "pro" | "enterprise"
      allowed_domains: [subscription.domain],
      expires_at: expiresAt,
      grace_days: 14,
    },
    process.env.LICENSE_AUTHORITY_URL!,
    process.env.LICENSE_AUTHORITY_SECRET!
  );

  // Store license in your database
  await db.tenants.update({
    where: { id: subscription.tenant_id },
    data: { license },
  });

  // Send license to customer
  await sendLicenseEmail(subscription.email, license);
}
```

#### Revoke License

```typescript
async function revokeLicense(
  licenseId: string,
  reason: string,
  authorityUrl: string,
  hmacSecret: string
): Promise<void> {
  const path = "/authority/license/revoke";
  const body = JSON.stringify({ license_id: licenseId, reason });
  
  const authHeader = await generateHMAC("POST", path, body, hmacSecret);

  const response = await fetch(`${authorityUrl}${path}`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`License revocation failed: ${error.error}`);
  }
}
```

#### Example: Revoke on Cancellation

```typescript
async function handleSubscriptionCancelled(subscription: Subscription) {
  const license = await db.licenses.findFirst({
    where: { tenant_id: subscription.tenant_id },
  });

  if (license) {
    await revokeLicense(
      license.license_id,
      "subscription_cancelled",
      process.env.LICENSE_AUTHORITY_URL!,
      process.env.LICENSE_AUTHORITY_SECRET!
    );
  }
}
```

## License Verification

### Frontend Application (Verifies Licenses)

Your GSMFlow application verifies licenses offline using the embedded public key.

#### Complete Verification Module

```typescript
// lib/license-verifier.ts

const AUTHORITY_PUBLIC_KEY = "MCowBQYDK2VwAyEA..."; // Embed from authority

interface License {
  license_id: string;
  tenant_id: string;
  plan_id: "starter" | "pro" | "enterprise";
  allowed_domains: string[];
  issued_at: number;
  expires_at: number;
  grace_days: number;
  feature_flags: {
    automation: boolean;
    multi_tenant: boolean;
    api_access: boolean;
    custom_branding: boolean;
    advanced_analytics: boolean;
    priority_support: boolean;
  };
  signature: string;
}

export class LicenseVerifier {
  private license: License | null = null;
  private lastRevocationCheck = 0;

  /**
   * Load and verify license from environment variable
   */
  async loadLicense(): Promise<License> {
    const licenseBase64 = process.env.GSMFLOW_LICENSE;
    
    if (!licenseBase64) {
      throw new Error("GSMFLOW_LICENSE environment variable not set");
    }

    // Decode base64
    const licenseJson = atob(licenseBase64);
    const license = JSON.parse(licenseJson) as License;

    // Verify signature
    const isValid = await this.verifySignature(license);
    if (!isValid) {
      throw new Error("Invalid license signature");
    }

    // Check expiry
    this.checkExpiry(license);

    this.license = license;
    return license;
  }

  /**
   * Verify ED25519 signature
   */
  private async verifySignature(license: License): Promise<boolean> {
    try {
      // Import public key
      const publicKeyBuffer = this.base64ToBuffer(AUTHORITY_PUBLIC_KEY);
      const publicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyBuffer,
        { name: "Ed25519" },
        false,
        ["verify"]
      );

      // Extract payload (everything except signature)
      const { signature, ...payload } = license;

      // Serialize payload to canonical JSON (sorted keys)
      const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
      const payloadBytes = new TextEncoder().encode(payloadJson);

      // Decode signature
      const signatureBuffer = this.base64ToBuffer(signature);

      // Verify signature
      return await crypto.subtle.verify(
        { name: "Ed25519" },
        publicKey,
        signatureBuffer,
        payloadBytes
      );
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }

  /**
   * Check if license is expired
   */
  private checkExpiry(license: License): void {
    const now = Math.floor(Date.now() / 1000);
    const gracePeriod = license.grace_days * 24 * 60 * 60;
    
    if (now > license.expires_at + gracePeriod) {
      throw new Error("License expired");
    }
  }

  /**
   * Verify domain is allowed
   */
  verifyDomain(currentDomain: string): boolean {
    if (!this.license) {
      throw new Error("License not loaded");
    }

    return this.license.allowed_domains.some(pattern => {
      if (pattern.startsWith("*.")) {
        const baseDomain = pattern.substring(1);
        return currentDomain.endsWith(baseDomain);
      }
      return currentDomain === pattern;
    });
  }

  /**
   * Check if license is in warning period
   */
  isInWarningPeriod(warningDays = 7): boolean {
    if (!this.license) return false;

    const now = Math.floor(Date.now() / 1000);
    const warningPeriod = warningDays * 24 * 60 * 60;
    
    return now > this.license.expires_at - warningPeriod && 
           now <= this.license.expires_at;
  }

  /**
   * Check if license is in grace period
   */
  isInGracePeriod(): boolean {
    if (!this.license) return false;

    const now = Math.floor(Date.now() / 1000);
    const gracePeriod = this.license.grace_days * 24 * 60 * 60;
    
    return now > this.license.expires_at && 
           now <= this.license.expires_at + gracePeriod;
  }

  /**
   * Check if license has been revoked (background sync)
   */
  async checkRevocation(authorityUrl: string): Promise<boolean> {
    if (!this.license) {
      throw new Error("License not loaded");
    }

    // Rate limit: only check once per hour
    const now = Date.now();
    if (now - this.lastRevocationCheck < 3600000) {
      return false;
    }

    try {
      const response = await fetch(
        `${authorityUrl}/authority/revocations/sync?license_id=${this.license.license_id}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        console.error("Revocation check failed:", response.status);
        return false; // Fail open (don't lock on network errors)
      }

      const data = await response.json();
      this.lastRevocationCheck = now;
      
      return data.revoked;
    } catch (error) {
      console.error("Revocation check error:", error);
      return false; // Fail open (offline operation)
    }
  }

  /**
   * Get current license
   */
  getLicense(): License {
    if (!this.license) {
      throw new Error("License not loaded");
    }
    return this.license;
  }

  /**
   * Helper: Convert base64 to ArrayBuffer
   */
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
```

#### Middleware Integration

```typescript
// middleware/license.ts

import { LicenseVerifier } from "../lib/license-verifier";

const verifier = new LicenseVerifier();
let licenseLoaded = false;

export async function licenseMiddleware(
  request: Request
): Promise<Response | null> {
  try {
    // Load license once on startup
    if (!licenseLoaded) {
      await verifier.loadLicense();
      licenseLoaded = true;
      
      // Start background revocation checker
      startRevocationChecker(verifier);
    }

    // Verify domain
    const currentDomain = new URL(request.url).hostname;
    if (!verifier.verifyDomain(currentDomain)) {
      return new Response("License not valid for this domain", { 
        status: 403 
      });
    }

    // Show warnings
    if (verifier.isInGracePeriod()) {
      console.warn("⚠️  License is in grace period - renewal required");
    } else if (verifier.isInWarningPeriod()) {
      console.warn("⚠️  License expiring soon - renewal recommended");
    }

    // License valid - continue
    return null;
  } catch (error) {
    console.error("License verification failed:", error);
    return new Response("Invalid or missing license", { 
      status: 403 
    });
  }
}

/**
 * Background task: Check revocation every hour
 */
function startRevocationChecker(verifier: LicenseVerifier) {
  const authorityUrl = process.env.LICENSE_AUTHORITY_URL!;
  
  setInterval(async () => {
    const isRevoked = await verifier.checkRevocation(authorityUrl);
    
    if (isRevoked) {
      console.error("🚨 LICENSE REVOKED - Shutting down");
      process.exit(1); // Or implement graceful shutdown
    }
  }, 3600000); // 1 hour
}
```

#### Feature Flag Checks

```typescript
// middleware/features.ts

import { LicenseVerifier } from "../lib/license-verifier";

export function requireFeature(
  verifier: LicenseVerifier,
  feature: keyof License["feature_flags"]
) {
  return (request: Request): Response | null => {
    const license = verifier.getLicense();
    
    if (!license.feature_flags[feature]) {
      return new Response(
        `Feature '${feature}' not enabled in your license plan`,
        { status: 403 }
      );
    }
    
    return null;
  };
}

// Usage in routes
app.get("/api/automation", 
  requireFeature(verifier, "automation"),
  handleAutomation
);
```

## API Reference

### Issue License

**Endpoint**: `POST /authority/license/issue`

**Authentication**: HMAC-SHA256

**Request**:
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_id": "pro",
  "allowed_domains": ["example.com", "*.example.com"],
  "expires_at": 1735689600,
  "grace_days": 14,
  "feature_overrides": {
    "automation": true
  }
}
```

**Response**:
```json
{
  "license": "eyJsaWNlbnNlX2lkIjoi...",
  "license_id": "uuid",
  "issued_at": 1700000000,
  "expires_at": 1735689600
}
```

### Revoke License

**Endpoint**: `POST /authority/license/revoke`

**Authentication**: HMAC-SHA256

**Request**:
```json
{
  "license_id": "uuid",
  "reason": "payment_failed"
}
```

**Response**:
```json
{
  "revoked": true,
  "license_id": "uuid",
  "revoked_at": 1700000000
}
```

### Get Public Key

**Endpoint**: `GET /authority/public-key`

**Authentication**: None

**Response**:
```json
{
  "public_key": "MCowBQYDK2VwAyEA...",
  "algorithm": "ED25519",
  "key_id": "v1"
}
```

### Check Revocation

**Endpoint**: `GET /authority/revocations/sync?license_id=uuid`

**Authentication**: None

**Rate Limit**: 1 request per hour per license

**Response**:
```json
{
  "revoked": false,
  "checked_at": 1700000000
}
```

## Best Practices

### Security

1. **Never expose HMAC secret** in client-side code
2. **Store licenses securely** (encrypted at rest)
3. **Validate domains strictly** on every request
4. **Check revocation periodically** (not per-request)
5. **Use HTTPS only** for all API calls
6. **Rotate HMAC secret** regularly (every 90 days)
7. **Monitor failed verifications** for security incidents

### Performance

1. **Load license once** on application startup
2. **Cache verification results** (but re-verify periodically)
3. **Use background tasks** for revocation checks
4. **Fail open** on network errors (offline operation)
5. **Set reasonable timeouts** (5 seconds max)

### Reliability

1. **Handle network failures** gracefully
2. **Log all verification failures** for debugging
3. **Implement retry logic** with exponential backoff
4. **Monitor license expiry** and alert customers
5. **Test offline operation** regularly

### User Experience

1. **Show warnings** before expiry (7 days)
2. **Provide grace period** (14 days default)
3. **Clear error messages** for license issues
4. **Self-service renewal** links
5. **Email notifications** for expiry/revocation

## Troubleshooting

### License Verification Fails

**Symptom**: "Invalid license signature"

**Causes**:
- Wrong public key embedded
- License tampered with
- License format corrupted

**Solution**:
```bash
# Verify public key matches
curl https://authority.workers.dev/authority/public-key

# Re-issue license if corrupted
```

### Domain Verification Fails

**Symptom**: "License not valid for this domain"

**Causes**:
- Wrong domain in license
- Hostname mismatch
- Wildcard not matching

**Solution**:
```typescript
// Debug current domain
console.log("Current domain:", new URL(request.url).hostname);
console.log("Allowed domains:", license.allowed_domains);
```

### Revocation Check Fails

**Symptom**: Network errors or timeouts

**Causes**:
- Authority unreachable
- Network blocked
- Rate limit exceeded

**Solution**:
```typescript
// Implement exponential backoff
async function checkWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await verifier.checkRevocation(authorityUrl);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

### HMAC Authentication Fails

**Symptom**: "Invalid or missing HMAC signature"

**Causes**:
- Wrong secret
- Clock skew (timestamp)
- Incorrect signature format

**Solution**:
```typescript
// Check timestamp is within 5 minutes
const now = Math.floor(Date.now() / 1000);
console.log("Current timestamp:", now);

// Verify HMAC secret
console.log("Using secret:", hmacSecret.substring(0, 10) + "...");
```

## Support

For integration support:
- 📧 Email: support@gsmflow.com
- 📚 Docs: https://docs.gsmflow.com/license-authority
- 🐛 Issues: https://github.com/gsmflow/authority/issues

## Appendix

### Complete Example Project

See `examples/gsmflow-verify.ts` for a complete working example.

### Testing

```bash
# Test license issuance
npm run test:endpoints

# Test verification locally
npm run dev
```

### Migration Guide

Migrating from another licensing system? See `MIGRATION.md`.
