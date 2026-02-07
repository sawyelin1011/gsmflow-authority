# GSMFlow License Authority

Production-grade cryptographic license issuance and revocation service for GSMFlow.

## Overview

The License Authority is the **single source of truth** for license issuance and revocation. It:

- Issues cryptographically signed licenses using ED25519
- Operates as an offline-first authority (no per-request validation)
- Maintains a global revocation list
- Provides audit trails for all operations
- Is secure even when GSMFlow is self-hosted by untrusted clients

## 📚 Documentation

- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Complete guide for integrating with your application
- **[QUICK_START.md](QUICK_START.md)** - Get started in 10 minutes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[SECURITY_BEST_PRACTICES.md](SECURITY_BEST_PRACTICES.md)** - Security guidelines
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Full documentation index

## Architecture

**Runtime**: Cloudflare Workers (global edge deployment)  
**Storage**: D1 (audit logs) + KV (revocation list)  
**Crypto**: Web Crypto API (ED25519 signatures)  
**Auth**: HMAC-SHA256 service tokens

### Security Model

**Threat Model**:
- GSMFlow host is **hostile** (untrusted self-hosted)
- Network can be **blocked** (offline operation required)
- License may be **copied** (domain binding prevents reuse)
- License may be **tampered** (signature verification fails)

**Defense Layers**:
1. Cryptographic verification (ED25519 - cannot be forged)
2. Domain binding (license tied to specific domains)
3. Expiry enforcement (time-based validity + grace period)
4. Revocation sync (periodic background checks)
5. Fail-closed (any verification failure → LOCKED)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database

```bash
npm run db:create
```

Copy the `database_id` from the output and update `wrangler.jsonc`.

### 3. Run Database Migration

```bash
npm run db:migrate
```

This applies all migrations from the `migrations/` folder to create the database schema.

For local development:
```bash
npm run db:migrate:local
```

### 4. Create KV Namespace

```bash
npm run kv:create
```

Copy the `id` from the output and update `wrangler.jsonc`.

### 5. Generate Keypair

```bash
npm run setup:keys
```

This outputs:
- **Private key**: Store as Cloudflare Secret
- **Public key**: Store in KV and embed in GSMFlow

### 6. Store Secrets

```bash
# Store private key
wrangler secret put LICENSE_PRIVATE_KEY
# Paste the private key when prompted

# Generate and store HMAC secret
openssl rand -base64 32
wrangler secret put HMAC_SECRET
# Paste the generated secret
```

### 7. Store Public Key in KV

```bash
wrangler kv:key put --binding=REVOCATIONS "public_key:v1" "<your_public_key>"
```

### 8. Deploy

```bash
npm run deploy
```

## API Endpoints

### POST /authority/license/issue

Issue a new cryptographically signed license.

**Auth**: HMAC-SHA256 (required)

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
  "license": "base64_encoded_signed_license",
  "license_id": "uuid",
  "issued_at": 1700000000,
  "expires_at": 1735689600
}
```

### POST /authority/license/revoke

Revoke an existing license.

**Auth**: HMAC-SHA256 (required)

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

### GET /authority/public-key

Retrieve the public key for offline verification.

**Auth**: None (public endpoint)

**Response**:
```json
{
  "public_key": "base64_encoded_public_key",
  "algorithm": "ED25519",
  "key_id": "v1"
}
```

### GET /authority/revocations/sync

Check if a license has been revoked (for GSMFlow background sync).

**Auth**: None  
**Rate Limit**: 1 request per hour per license

**Query Parameters**:
- `license_id`: UUID of the license to check

**Response**:
```json
{
  "revoked": false,
  "checked_at": 1700000000
}
```

## License Structure

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
    advanced_analytics: boolean;
    priority_support: boolean;
  };
  signature: string;         // Base64 ED25519 signature
}
```

## Plan Features

### Starter
- Basic features only
- No automation, multi-tenancy, or API access

### Pro
- Automation enabled
- API access
- Custom branding
- Advanced analytics

### Enterprise
- All Pro features
- Multi-tenancy
- Priority support
- Custom feature overrides available

## HMAC Authentication

Protected endpoints require HMAC-SHA256 signatures in the `Authorization` header.

**Format**: `HMAC-SHA256 <timestamp>:<signature>`

**Signature covers**: `method:path:timestamp:body`

**Example**:
```bash
# Generate signature
npm run generate:hmac POST /authority/license/issue '{"tenant_id":"..."}' 'your-secret'

# Use in request
curl -X POST https://your-worker.workers.dev/authority/license/issue \
  -H "Authorization: HMAC-SHA256 1700000000:abc123..." \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"..."}'
```

## Creating Tenants

```bash
# Generate SQL
npm run setup:tenant "550e8400-e29b-41d4-a716-446655440000" "Acme Corp"

# Execute in D1
wrangler d1 execute gsmflow-authority --command="INSERT INTO tenants..."
```

## GSMFlow Integration

### 1. Embed Public Key

Add the public key to your GSMFlow codebase:

```typescript
const AUTHORITY_PUBLIC_KEY = "base64_encoded_public_key";
```

### 2. Load License from Environment

```typescript
const licenseBase64 = process.env.GSMFLOW_LICENSE;
const licenseJson = atob(licenseBase64);
const license = JSON.parse(licenseJson);
```

### 3. Verify Signature

```typescript
import { verifyLicense } from "./crypto/verify";

const isValid = await verifyLicense(license, AUTHORITY_PUBLIC_KEY);
if (!isValid) {
  throw new Error("Invalid license signature");
}
```

### 4. Check Expiry

```typescript
const now = Math.floor(Date.now() / 1000);
const gracePeriod = license.grace_days * 24 * 60 * 60;

if (now > license.expires_at + gracePeriod) {
  throw new Error("License expired");
}
```

### 5. Verify Domain

```typescript
const currentDomain = request.headers.get("host");
const isAllowed = license.allowed_domains.some(pattern => {
  if (pattern.startsWith("*.")) {
    return currentDomain.endsWith(pattern.substring(1));
  }
  return currentDomain === pattern;
});

if (!isAllowed) {
  throw new Error("Domain not allowed");
}
```

### 6. Background Revocation Sync

```typescript
// Run every hour
setInterval(async () => {
  const response = await fetch(
    `https://authority.workers.dev/authority/revocations/sync?license_id=${license.license_id}`
  );
  const data = await response.json();
  
  if (data.revoked) {
    // Lock the application
    throw new Error("License revoked");
  }
}, 3600000);
```

## Extensibility

The license format is designed for backward-compatible extensions:

### Future Enhancements (No Breaking Changes)
1. **Hardware Binding**: Add `device_fingerprint` field
2. **IP Allowlists**: Add `allowed_ips` array
3. **Multi-Product**: Add `product_id` field
4. **Key Rotation**: Add `key_id` field, support multiple public keys
5. **Enterprise Claims**: Add `custom_claims` object
6. **Usage Limits**: Add `max_users`, `max_requests` counters

Old licenses remain valid after adding new fields (signature still verifies).

## Security Best Practices

1. **Never expose private key** - Store only as Cloudflare Secret
2. **Rotate HMAC secret regularly** - Update in all calling services
3. **Monitor audit logs** - Watch for suspicious activity
4. **Rate limit aggressively** - Prevent brute force attacks
5. **Use HTTPS only** - Never transmit licenses over HTTP
6. **Validate domains strictly** - Prevent subdomain takeover attacks
7. **Set reasonable expiry dates** - Don't issue licenses for >10 years
8. **Test revocation flow** - Ensure GSMFlow respects revocations

## Monitoring

Key metrics to track:
- License issuance rate
- Revocation rate
- Sync request rate
- Failed authentication attempts
- D1 query latency
- KV read latency

Set up alerts for:
- Spike in failed auth attempts
- D1 errors
- KV unavailability
- Unusual revocation patterns

## Troubleshooting

### "Public key not found"
- Run `npm run setup:keys` and store the public key in KV

### "Invalid HMAC signature"
- Check timestamp is within 5 minutes
- Verify HMAC secret matches
- Ensure body is included in signature

### "Tenant not found"
- Create tenant using `npm run setup:tenant`

### "License verification fails in GSMFlow"
- Ensure public key matches the one used to sign
- Check license hasn't been tampered with
- Verify signature algorithm is ED25519

## Development

```bash
# Local development
npm run dev

# Run tests
npm test

# Type checking
npm run cf-typegen
```

## License

Proprietary - GSMFlow License Authority

## Database Migrations

The License Authority uses D1's migration system for schema management.

### Available Commands

```bash
# List all migrations (applied and pending)
npm run db:list

# Create new migration
npm run db:migration:create "description"

# Apply migrations to remote (production)
npm run db:migrate

# Apply migrations to local (development)
npm run db:migrate:local

# Execute raw SQL on remote
npm run db:execute --command="SELECT * FROM tenants"

# Execute raw SQL on local
npm run db:execute:local --command="SELECT * FROM tenants"
```

### Creating New Migrations

1. Generate migration file:
```bash
npm run db:migration:create "add api_keys table"
```

2. Edit the generated file in `migrations/`

3. Apply locally first:
```bash
npm run db:migrate:local
```

4. Test and verify

5. Apply to production:
```bash
npm run db:migrate
```

See `scripts/migration-helper.md` for detailed migration guide.

## Development Workflow

### Local Development

```bash
# Start local dev server
npm run dev

# Apply migrations locally
npm run db:migrate:local

# Test with local D1 and KV
# (Wrangler automatically uses local storage)
```

### Testing Migrations

```bash
# Create test migration
npm run db:migration:create "test change"

# Apply locally
npm run db:migrate:local

# Verify
wrangler d1 execute gsmflow-authority --local --command="PRAGMA table_info(your_table)"

# If good, apply to production
npm run db:migrate
```
