# Integration Summary

Quick reference for integrating the GSMFlow License Authority.

## 🎯 What You Need

### From License Authority Admin

1. **HMAC Secret** - For API authentication
2. **Public Key** - For license verification  
3. **Authority URL** - API endpoint

### In Your Application

1. **Backend Service** - Issues/revokes licenses
2. **Frontend Application** - Verifies licenses offline

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│ 1. ED25519 Signatures    → Cannot forge licenses        │
│ 2. HMAC Authentication   → Secure API access            │
│ 3. Domain Binding        → Prevent license sharing      │
│ 4. Offline Verification  → No per-request calls         │
│ 5. Revocation System     → Remote license control       │
└─────────────────────────────────────────────────────────┘
```

## 📦 Backend Integration (Issues Licenses)

### 1. Install Client

```typescript
// Copy examples/license-authority-client.ts to your project
import { LicenseAuthorityClient } from "./lib/license-authority-client";
```

### 2. Initialize Client

```typescript
const client = new LicenseAuthorityClient({
  authorityUrl: process.env.LICENSE_AUTHORITY_URL!,
  hmacSecret: process.env.LICENSE_AUTHORITY_SECRET!,
});
```

### 3. Issue License

```typescript
const license = await client.issueLicense({
  tenant_id: "uuid",
  plan_id: "pro",
  allowed_domains: ["example.com"],
  expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
});

// Store license.license (base64) in your database
// Send to customer via email
```

### 4. Revoke License

```typescript
await client.revokeLicense({
  license_id: "uuid",
  reason: "subscription_cancelled",
});
```

## 🎨 Frontend Integration (Verifies Licenses)

### 1. Embed Public Key

```typescript
// config/license.ts
export const LICENSE_CONFIG = {
  AUTHORITY_PUBLIC_KEY: "MCowBQYDK2VwAyEA...", // From admin
  AUTHORITY_URL: "https://authority.workers.dev",
};
```

### 2. Copy Verifier

```typescript
// Copy examples/gsmflow-verify.ts to your project
import { LicenseVerifier } from "./lib/license-verifier";
```

### 3. Load License

```typescript
const verifier = new LicenseVerifier();
await verifier.loadLicense(); // Reads from GSMFLOW_LICENSE env var
```

### 4. Verify on Every Request

```typescript
// Middleware
export async function licenseMiddleware(request: Request) {
  // Verify domain
  const domain = new URL(request.url).hostname;
  if (!verifier.verifyDomain(domain)) {
    return new Response("Invalid domain", { status: 403 });
  }

  // Check feature flags
  const license = verifier.getLicense();
  if (request.url.includes("/api/") && !license.feature_flags.api_access) {
    return new Response("API access not enabled", { status: 403 });
  }

  return null; // Continue
}
```

### 5. Background Revocation Check

```typescript
// Run every hour
setInterval(async () => {
  const isRevoked = await verifier.checkRevocation(AUTHORITY_URL);
  if (isRevoked) {
    console.error("LICENSE REVOKED");
    process.exit(1);
  }
}, 3600000);
```

## 🔑 Environment Variables

### Backend Service

```bash
LICENSE_AUTHORITY_URL=https://authority.workers.dev
LICENSE_AUTHORITY_SECRET=your-hmac-secret
```

### Frontend Application

```bash
GSMFLOW_LICENSE=eyJsaWNlbnNlX2lkIjoi...
LICENSE_AUTHORITY_URL=https://authority.workers.dev
```

## 📊 Plan Features

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| Automation | ❌ | ✅ | ✅ |
| Multi-tenant | ❌ | ❌ | ✅ |
| API Access | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

## 🚨 Error Handling

### Backend Errors

```typescript
try {
  const license = await client.issueLicense(request);
} catch (error) {
  if (error.message.includes("Tenant not found")) {
    // Create tenant first
  } else if (error.message.includes("401")) {
    // Check HMAC secret
  } else {
    // Log and retry
  }
}
```

### Frontend Errors

```typescript
try {
  await verifier.loadLicense();
} catch (error) {
  if (error.message.includes("Invalid signature")) {
    // License tampered or wrong public key
  } else if (error.message.includes("expired")) {
    // Show renewal prompt
  } else if (error.message.includes("not set")) {
    // License not configured
  }
}
```

## ✅ Integration Checklist

### Backend

- [ ] Install client library
- [ ] Set environment variables
- [ ] Issue license on subscription created
- [ ] Revoke license on subscription cancelled
- [ ] Store licenses in database
- [ ] Send licenses to customers
- [ ] Handle errors gracefully
- [ ] Log all operations

### Frontend

- [ ] Embed public key
- [ ] Copy verifier code
- [ ] Load license on startup
- [ ] Verify domain on every request
- [ ] Check feature flags
- [ ] Start background revocation checker
- [ ] Handle expiry warnings
- [ ] Show renewal prompts

### Testing

- [ ] Test license issuance
- [ ] Test license revocation
- [ ] Test signature verification
- [ ] Test domain validation
- [ ] Test feature flags
- [ ] Test expiry handling
- [ ] Test revocation sync
- [ ] Test offline operation

## 📖 Full Documentation

For complete details, see:

- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Complete integration guide
- **[examples/license-authority-client.ts](examples/license-authority-client.ts)** - Backend client
- **[examples/gsmflow-verify.ts](examples/gsmflow-verify.ts)** - Frontend verifier
- **[SECURITY_BEST_PRACTICES.md](SECURITY_BEST_PRACTICES.md)** - Security guide

## 🆘 Support

- 📧 Email: support@gsmflow.com
- 📚 Docs: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- 🐛 Issues: GitHub Issues

## 🎉 You're Ready!

With these steps, you have:

✅ Secure license issuance  
✅ Offline license verification  
✅ Domain binding  
✅ Feature flags  
✅ Revocation system  
✅ Production-ready integration  

Start integrating now! 🚀
