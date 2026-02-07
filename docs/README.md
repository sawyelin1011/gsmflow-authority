# License Authority Documentation

## Overview

Complete documentation for integrating and using the GSMFlow License Authority.

## Quick Links

### For GSMFlow Self-Hosted Integration
- **[GSMFlow Integration Guide](./GSMFLOW_INTEGRATION.md)** - Integrate license verification into self-hosted GSMFlow
- **[Testing Guide](./TESTING_GUIDE.md)** - Test data and procedures

### For Client Portal Integration
- **[Client Portal Integration Guide](./CLIENT_PORTAL_INTEGRATION.md)** - Build license management UI
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation

### For Operations Team
- **[Production Credentials](./PRODUCTION_CREDENTIALS.md)** - ⚠️ Confidential credentials
- **[Testing Guide](./TESTING_GUIDE.md)** - Testing procedures

## Architecture

```
┌──────────────────────┐
│   Client Portal      │ ← Admins manage licenses
│   (Your Backend)     │
└──────────┬───────────┘
           │ HTTPS + HMAC
           ▼
┌──────────────────────┐
│  License Authority   │ ← Issues signed licenses
│  (Cloudflare)        │
└──────────┬───────────┘
           │ License (one-time)
           ▼
┌──────────────────────┐
│  GSMFlow Self-Host   │ ← Verifies offline
│  (Customer Server)   │
└──────────────────────┘
```

## Key Concepts

### Offline-First Verification

Licenses are **cryptographically signed** and verified **offline** by GSMFlow. No network calls during runtime.

**Benefits**:
- Works in air-gapped environments
- No dependency on authority availability
- Fast verification (< 1ms)
- Cannot be DDoS'd

### Fail-Closed Security

Any verification failure locks the application:
- Invalid signature → LOCKED
- Expired license → LOCKED
- Wrong domain → LOCKED
- Tampered data → LOCKED

### Background Revocation Sync

GSMFlow checks for revocations periodically (every hour):
- Network available → Check and lock if revoked
- Network unavailable → Continue (fail open)

## Integration Steps

### 1. GSMFlow Self-Hosted

1. Embed public key in code
2. Implement license verification
3. Add feature gating
4. Set up background sync
5. Deploy with license in environment

**See**: [GSMFLOW_INTEGRATION.md](./GSMFLOW_INTEGRATION.md)

### 2. Client Portal

1. Store HMAC secret securely
2. Implement license issuance API
3. Implement license revocation API
4. Build management UI
5. Add audit logging

**See**: [CLIENT_PORTAL_INTEGRATION.md](./CLIENT_PORTAL_INTEGRATION.md)

## Production Information

**URL**: `https://gsmflow-authority.ylstack02.workers.dev`

**Public Key**: `MCowBQYDK2VwAyEAcbf2x04rbkZCYzr07Eog2wkTX1i9VTuUos2MJD4gLRM=`

**Algorithm**: ED25519

**Status**: ✅ Production Ready

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | None | Health check |
| `/authority/public-key` | GET | None | Get public key |
| `/authority/license/issue` | POST | HMAC | Issue license |
| `/authority/license/revoke` | POST | HMAC | Revoke license |
| `/authority/revocations/sync` | GET | None | Check revocation |

**See**: [API_REFERENCE.md](./API_REFERENCE.md)

## Security

### Authentication

Protected endpoints use **HMAC-SHA256** authentication:

```
Authorization: HMAC-SHA256 <timestamp>:<signature>
```

Signature covers: `method:path:timestamp:body`

### Cryptography

- **Signing**: ED25519 (fast, secure, quantum-resistant candidate)
- **Verification**: Offline using embedded public key
- **Domain Binding**: Prevents license sharing
- **Expiry**: Time-based with grace period

### Best Practices

✅ **DO**:
- Verify signature on every startup
- Check domain binding
- Enforce expiry with grace period
- Background sync for revocations
- Fail closed on verification errors
- Fail open on network errors

❌ **DON'T**:
- Skip signature verification
- Cache verification results
- Expose license in logs
- Allow runtime license changes
- Trust client-supplied claims

## Plans & Features

### Starter
- Basic features only
- No automation, API, or multi-tenancy

### Pro
- Automation ✅
- API access ✅
- Custom branding ✅
- Advanced analytics ✅

### Enterprise
- All Pro features ✅
- Multi-tenancy ✅
- Priority support ✅
- Custom feature overrides ✅

## Testing

### Local Testing

```bash
# Start dev server
npm run dev

# Run tests
npm run test:endpoints
```

### Production Testing

```bash
npm run test:production
```

**See**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## Support

### For Integration Issues

1. Check relevant integration guide
2. Review API reference
3. Check testing guide for examples
4. Contact backend team

### For Production Issues

1. Check Cloudflare dashboard
2. Review audit logs in D1
3. Check rate limits
4. Contact DevOps team

## Change Log

| Date | Change | Version |
|------|--------|---------|
| 2026-02-07 | Initial production deployment | 1.0.0 |
| 2026-02-07 | Documentation created | 1.0.0 |

## License

Proprietary - GSMFlow License Authority

---

**Last Updated**: 2026-02-07
