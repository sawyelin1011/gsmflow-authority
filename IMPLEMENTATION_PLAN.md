# GSMFlow License Authority - Implementation Plan

## Architecture Overview

### Core Principle
**Offline-First Cryptographic Authority** - Licenses are signed once, verified offline forever.

### Technology Stack
- **Runtime**: Cloudflare Workers (TypeScript)
- **Storage**: 
  - D1: Audit logs, tenant registry, license history
  - KV: Revocation list (fast global reads)
- **Crypto**: Web Crypto API (ED25519 signatures)
- **Auth**: HMAC-SHA256 service tokens

## Security Model

### Threat Model
- GSMFlow host is **hostile** (untrusted self-hosted)
- Network can be **blocked** (offline operation required)
- License may be **copied** (domain binding prevents reuse)
- License may be **tampered** (signature verification fails)

### Defense Layers
1. **Cryptographic Verification**: ED25519 signatures (cannot be forged)
2. **Domain Binding**: License tied to specific domains
3. **Expiry Enforcement**: Time-based validity with grace period
4. **Revocation Sync**: Periodic background checks (not per-request)
5. **Fail-Closed**: Any verification failure → LOCKED state

## Data Model

### License Payload
```typescript
{
  license_id: string;        // UUID v4
  tenant_id: string;         // UUID v4
  plan_id: "starter" | "pro" | "enterprise";
  allowed_domains: string[]; // ["example.com", "*.example.com"]
  issued_at: number;         // Unix timestamp
  expires_at: number;        // Unix timestamp
  grace_days: number;        // 14 days default
  feature_flags: {
    automation: boolean;
    multi_tenant: boolean;
    api_access: boolean;
    custom_branding: boolean;
  };
  signature: string;         // Base64 ED25519 signature
}
```

### D1 Schema
```sql
-- Tenant registry
CREATE TABLE tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'suspended'))
);

-- License history (audit trail)
CREATE TABLE licenses (
  license_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  allowed_domains TEXT NOT NULL, -- JSON array
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revocation_reason TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Audit log
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL,
  tenant_id TEXT,
  license_id TEXT,
  actor TEXT NOT NULL,
  details TEXT
);
```

### KV Structure
```
revocations:{license_id} → { revoked_at, reason }
public_key → base64(public_key)
```

## API Endpoints

### 1. POST /authority/license/issue
**Purpose**: Issue new cryptographically signed license

**Auth**: HMAC-SHA256 service token

**Request**:
```json
{
  "tenant_id": "uuid",
  "plan_id": "pro",
  "allowed_domains": ["example.com"],
  "expires_at": 1735689600,
  "feature_overrides": { "automation": true }
}
```

**Response**:
```json
{
  "license": "base64(signed_license_json)",
  "license_id": "uuid",
  "issued_at": 1700000000,
  "expires_at": 1735689600
}
```

**Process**:
1. Validate tenant exists and is active
2. Generate license_id (UUID v4)
3. Build license payload with plan defaults + overrides
4. Sign with ED25519 private key
5. Store in D1 (audit trail)
6. Return signed license blob

### 2. POST /authority/license/revoke
**Purpose**: Revoke a license (adds to revocation list)

**Auth**: HMAC-SHA256 service token

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

**Process**:
1. Validate license exists
2. Add to KV revocation list (global propagation)
3. Update D1 audit trail
4. Return confirmation

### 3. GET /authority/public-key
**Purpose**: Retrieve public key for offline verification

**Auth**: None (public endpoint)

**Response**:
```json
{
  "public_key": "base64(ed25519_public_key)",
  "algorithm": "ED25519",
  "key_id": "v1"
}
```

### 4. GET /authority/revocations/sync
**Purpose**: GSMFlow background sync endpoint

**Auth**: License signature (proves ownership)

**Request**: `?license_id=uuid&signature=base64`

**Response**:
```json
{
  "revoked": false,
  "checked_at": 1700000000
}
```

**Rate Limit**: 1 request per hour per license

## Folder Structure

```
src/
├── index.ts                 # Main Worker entry point
├── types/
│   ├── license.ts          # License payload types
│   ├── env.ts              # Cloudflare bindings
│   └── api.ts              # API request/response types
├── crypto/
│   ├── keys.ts             # Key generation & management
│   ├── signing.ts          # ED25519 sign/verify
│   └── hmac.ts             # HMAC service auth
├── handlers/
│   ├── issue.ts            # License issuance
│   ├── revoke.ts           # License revocation
│   ├── public-key.ts       # Public key endpoint
│   └── sync.ts             # Revocation sync
├── storage/
│   ├── d1.ts               # D1 queries
│   └── kv.ts               # KV operations
├── middleware/
│   ├── auth.ts             # HMAC authentication
│   ├── rate-limit.ts       # Rate limiting
│   └── error.ts            # Error handling
└── utils/
    ├── validation.ts       # Input validation
    ├── plans.ts            # Plan feature definitions
    └── response.ts         # Response helpers
```

## Key Generation (One-Time Setup)

```typescript
// Generate ED25519 keypair (run once, store securely)
const keypair = await crypto.subtle.generateKey(
  { name: "Ed25519" },
  true,
  ["sign", "verify"]
);

// Export private key → Cloudflare Secret
const privateKey = await crypto.subtle.exportKey("pkcs8", keypair.privateKey);

// Export public key → KV storage
const publicKey = await crypto.subtle.exportKey("spki", keypair.publicKey);
```

**Storage**:
- Private key: Cloudflare Secret `LICENSE_PRIVATE_KEY`
- Public key: KV `public_key` + embedded in GSMFlow

## Extensibility Design

### Future Enhancements (No Breaking Changes)
1. **Hardware Binding**: Add `device_fingerprint` to payload
2. **IP Allowlists**: Add `allowed_ips` array
3. **Multi-Product**: Add `product_id` field
4. **Key Rotation**: Add `key_id` field, support multiple public keys
5. **Enterprise Claims**: Add `custom_claims` object
6. **Usage Limits**: Add `max_users`, `max_requests` counters

### Backward Compatibility
- Old licenses remain valid (signature still verifies)
- New fields are optional (default to permissive)
- GSMFlow ignores unknown fields

## Deployment Checklist

1. **Generate Keys**: Run key generation script
2. **Store Secrets**: Add `LICENSE_PRIVATE_KEY` and `HMAC_SECRET` to Cloudflare
3. **Create D1 Database**: `wrangler d1 create gsmflow-authority`
4. **Create KV Namespace**: `wrangler kv:namespace create REVOCATIONS`
5. **Run Migrations**: Apply D1 schema
6. **Deploy Worker**: `npm run deploy`
7. **Test Endpoints**: Verify issue/revoke/sync flow
8. **Embed Public Key**: Add to GSMFlow codebase

## Security Notes

### Why ED25519?
- Fast verification (offline performance)
- Small signatures (256 bits)
- Quantum-resistant candidate
- Native Web Crypto API support

### Why No Runtime Validation?
- GSMFlow must work offline
- Authority cannot be DDoS'd
- Reduces attack surface
- Enables self-hosted deployments

### Why Domain Binding?
- Prevents license sharing
- Enforces tenant isolation
- Verifiable by GSMFlow (checks request.headers.host)

### Why Grace Period?
- Allows payment processing delays
- Prevents abrupt service disruption
- Configurable per license

## Testing Strategy

1. **Unit Tests**: Crypto functions, validation logic
2. **Integration Tests**: Full issue → verify → revoke flow
3. **Security Tests**: Tampered signatures, expired licenses
4. **Performance Tests**: Signature verification speed
5. **Chaos Tests**: Offline operation, KV unavailability

## Monitoring & Observability

- **Metrics**: Issue rate, revocation rate, sync requests
- **Alerts**: Failed signatures, D1 errors, KV timeouts
- **Audit Trail**: All operations logged to D1
- **Tracing**: Cloudflare Workers Analytics

---

**Next Steps**: Implement core crypto utilities, then handlers, then wire up routing.
