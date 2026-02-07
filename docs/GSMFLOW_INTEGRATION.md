# GSMFlow Self-Hosted Integration Guide

## Overview

This guide shows how to integrate the License Authority into your self-hosted GSMFlow application for offline license verification.

## Architecture

```
┌─────────────────────┐
│  License Authority  │ ← Issues licenses (once)
│  (Cloudflare)       │
└──────────┬──────────┘
           │ HTTPS
           │ (Initial setup only)
           ▼
┌─────────────────────┐
│  GSMFlow Self-Host  │ ← Verifies offline
│  (Customer Server)  │
└─────────────────────┘
```

**Key Principle**: License verification happens **offline** using cryptographic signatures. No network calls during runtime.

## Step 1: Embed Public Key

Add the authority's public key to your GSMFlow codebase:

```typescript
// src/config/license.ts
export const LICENSE_CONFIG = {
  AUTHORITY_PUBLIC_KEY: "MCowBQYDK2VwAyEAcbf2x04rbkZCYzr07Eog2wkTX1i9VTuUos2MJD4gLRM=",
  AUTHORITY_URL: "https://gsmflow-authority.ylstack02.workers.dev",
  SYNC_INTERVAL: 3600000, // 1 hour in milliseconds
};
```

## Step 2: License Verification Module

Create a license verification module:

```typescript
// src/lib/license-verifier.ts

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
  private publicKey: CryptoKey | null = null;

  async initialize(): Promise<void> {
    // Load license from environment
    const licenseBase64 = process.env.GSMFLOW_LICENSE;
    if (!licenseBase64) {
      throw new Error("GSMFLOW_LICENSE not set");
    }

    // Decode license
    const licenseJson = Buffer.from(licenseBase64, "base64").toString("utf-8");
    this.license = JSON.parse(licenseJson);

    // Import public key
    const publicKeyBuffer = Buffer.from(LICENSE_CONFIG.AUTHORITY_PUBLIC_KEY, "base64");
    this.publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    // Verify signature
    const isValid = await this.verifySignature();
    if (!isValid) {
      throw new Error("Invalid license signature");
    }

    // Check expiry
    this.checkExpiry();

    // Check domain
    this.checkDomain();
  }

  private async verifySignature(): Promise<boolean> {
    if (!this.license || !this.publicKey) return false;

    const { signature, ...payload } = this.license;
    
    // Canonical JSON (sorted keys)
    const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
    const payloadBytes = new TextEncoder().encode(payloadJson);
    
    const signatureBytes = Buffer.from(signature, "base64");

    return await crypto.subtle.verify(
      { name: "Ed25519" },
      this.publicKey,
      signatureBytes,
      payloadBytes
    );
  }

  private checkExpiry(): void {
    if (!this.license) throw new Error("License not loaded");

    const now = Math.floor(Date.now() / 1000);
    const gracePeriod = this.license.grace_days * 24 * 60 * 60;

    if (now > this.license.expires_at + gracePeriod) {
      throw new Error("License expired");
    }

    // Warn if in grace period
    if (now > this.license.expires_at) {
      console.warn("License in grace period - renewal required");
    }
  }

  private checkDomain(): void {
    if (!this.license) throw new Error("License not loaded");

    const currentDomain = process.env.DOMAIN || "localhost";
    
    const isAllowed = this.license.allowed_domains.some(pattern => {
      if (pattern.startsWith("*.")) {
        return currentDomain.endsWith(pattern.substring(1));
      }
      return currentDomain === pattern;
    });

    if (!isAllowed) {
      throw new Error(`Domain ${currentDomain} not allowed by license`);
    }
  }

  hasFeature(feature: keyof License["feature_flags"]): boolean {
    return this.license?.feature_flags[feature] || false;
  }

  getPlan(): string {
    return this.license?.plan_id || "unknown";
  }

  getLicenseInfo() {
    if (!this.license) return null;
    
    return {
      license_id: this.license.license_id,
      tenant_id: this.license.tenant_id,
      plan_id: this.license.plan_id,
      expires_at: new Date(this.license.expires_at * 1000),
      features: this.license.feature_flags,
    };
  }
}

// Singleton instance
export const licenseVerifier = new LicenseVerifier();
```

## Step 3: Application Startup

Initialize license verification on startup:

```typescript
// src/index.ts
import { licenseVerifier } from "./lib/license-verifier";

async function startApp() {
  try {
    // Verify license before starting
    await licenseVerifier.initialize();
    console.log("✅ License verified");
    console.log("Plan:", licenseVerifier.getPlan());
    
    // Start your application
    startServer();
  } catch (error) {
    console.error("❌ License verification failed:", error.message);
    process.exit(1);
  }
}

startApp();
```

## Step 4: Feature Gating

Use license verification to gate features:

```typescript
// src/api/automation.ts
import { licenseVerifier } from "../lib/license-verifier";

export async function handleAutomation(req, res) {
  // Check if automation is enabled
  if (!licenseVerifier.hasFeature("automation")) {
    return res.status(403).json({
      error: "Automation not enabled in license",
      plan: licenseVerifier.getPlan(),
    });
  }

  // Process automation request
  // ...
}
```

## Step 5: Background Revocation Sync

Check for revocations periodically:

```typescript
// src/lib/license-sync.ts
import { LICENSE_CONFIG } from "../config/license";

export class LicenseSync {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    // Check immediately
    this.checkRevocation();

    // Then check every hour
    this.intervalId = setInterval(() => {
      this.checkRevocation();
    }, LICENSE_CONFIG.SYNC_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async checkRevocation() {
    try {
      const license = licenseVerifier.getLicenseInfo();
      if (!license) return;

      const response = await fetch(
        `${LICENSE_CONFIG.AUTHORITY_URL}/authority/revocations/sync?license_id=${license.license_id}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        console.error("Revocation check failed:", response.status);
        return; // Fail open - don't lock on network errors
      }

      const data = await response.json();
      
      if (data.revoked) {
        console.error("LICENSE REVOKED:", data.reason);
        // Graceful shutdown
        process.exit(1);
      }
    } catch (error) {
      console.error("Revocation check error:", error.message);
      // Fail open - offline operation
    }
  }
}

export const licenseSync = new LicenseSync();
```

Start sync in your application:

```typescript
// src/index.ts
import { licenseSync } from "./lib/license-sync";

async function startApp() {
  await licenseVerifier.initialize();
  
  // Start background sync
  licenseSync.start();
  
  // Cleanup on shutdown
  process.on("SIGTERM", () => {
    licenseSync.stop();
  });
  
  startServer();
}
```

## Step 6: Environment Configuration

Set the license in your environment:

```bash
# .env
GSMFLOW_LICENSE=eyJsaWNlbnNlX2lkIjoiNDRkYjM2YjMtN2M0Ny00OTQwLTlkZGItYmQ1YjQyMTU5YWZiIiwidGVuYW50X2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicGxhbl9pZCI6InBybyIsImFsbG93ZWRfZG9tYWlucyI6WyJleGFtcGxlLmNvbSIsIiouZXhhbXBsZS5jb20iXSwiaXNzdWVkX2F0IjoxNzA3MzE0OTIxLCJleHBpcmVzX2F0IjoxNzM4ODUwOTIyLCJncmFjZV9kYXlzIjoxNCwiZmVhdHVyZV9mbGFncyI6eyJhdXRvbWF0aW9uIjp0cnVlLCJtdWx0aV90ZW5hbnQiOmZhbHNlLCJhcGlfYWNjZXNzIjp0cnVlLCJjdXN0b21fYnJhbmRpbmciOnRydWUsImFkdmFuY2VkX2FuYWx5dGljcyI6dHJ1ZSwicHJpb3JpdHlfc3VwcG9ydCI6ZmFsc2V9LCJzaWduYXR1cmUiOiJhYmMxMjMuLi4ifQ==

DOMAIN=example.com
```

## Security Best Practices

### ✅ DO

1. **Verify signature on startup** - Fail immediately if invalid
2. **Check domain binding** - Prevent license sharing
3. **Enforce expiry** - Respect grace period
4. **Background sync** - Check revocations hourly
5. **Fail closed** - Lock on signature/expiry failures
6. **Fail open** - Continue on network errors (offline operation)

### ❌ DON'T

1. **Don't skip signature verification** - Critical security check
2. **Don't cache verification results** - Verify on every startup
3. **Don't expose license in logs** - Contains sensitive data
4. **Don't allow runtime license changes** - Requires restart
5. **Don't trust client-supplied claims** - Verify everything

## Testing

Test license verification:

```typescript
// test/license.test.ts
import { licenseVerifier } from "../src/lib/license-verifier";

describe("License Verification", () => {
  beforeAll(async () => {
    process.env.GSMFLOW_LICENSE = "valid_license_base64";
    await licenseVerifier.initialize();
  });

  test("should verify valid license", () => {
    expect(licenseVerifier.getPlan()).toBe("pro");
  });

  test("should check feature flags", () => {
    expect(licenseVerifier.hasFeature("automation")).toBe(true);
    expect(licenseVerifier.hasFeature("multi_tenant")).toBe(false);
  });

  test("should reject invalid signature", async () => {
    process.env.GSMFLOW_LICENSE = "invalid_license";
    await expect(licenseVerifier.initialize()).rejects.toThrow();
  });
});
```

## Troubleshooting

### License verification fails

**Check**:
1. `GSMFLOW_LICENSE` environment variable is set
2. License is valid base64
3. Public key matches authority
4. License not expired (including grace period)
5. Domain matches allowed domains

### Features not working

**Check**:
1. Feature flag is enabled in license
2. Plan supports the feature
3. License verification succeeded

### Revocation sync fails

**Check**:
1. Network connectivity to authority
2. License ID is valid
3. Not rate limited (1 request per hour per license)

## Production Checklist

- [ ] Public key embedded in code
- [ ] License set in environment
- [ ] Signature verification on startup
- [ ] Domain binding enforced
- [ ] Expiry checking implemented
- [ ] Grace period handling
- [ ] Background revocation sync
- [ ] Feature gating implemented
- [ ] Error handling for offline operation
- [ ] Logging (without exposing license)
- [ ] Tests for license verification
- [ ] Documentation for deployment team
