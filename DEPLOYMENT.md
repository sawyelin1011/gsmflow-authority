# Deployment Guide

Complete step-by-step guide to deploy the GSMFlow License Authority.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers enabled
- Wrangler CLI configured (`wrangler login`)

## Step 1: Clone and Install

```bash
git clone <repository>
cd gsmflow-authority
npm install
```

## Step 2: Create D1 Database

```bash
npm run db:create
```

**Output**:
```
✅ Successfully created DB 'gsmflow-authority'
database_id = "abc123..."
```

**Action**: Copy the `database_id` and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "gsmflow-authority",
    "database_id": "abc123..."  // ← Paste here
  }
]
```

## Step 3: Apply Database Migrations

D1 uses a migration-based approach. The initial schema is in `migrations/0001_initial_schema.sql`.

**Apply to remote (production)**:
```bash
npm run db:migrate
```

**Or apply to local (development)**:
```bash
npm run db:migrate:local
```

This creates the `tenants`, `licenses`, and `audit_log` tables.

**Verify migrations**:
```bash
npm run db:list
```

## Step 4: Create KV Namespace

```bash
npm run kv:create
```

**Output**:
```
✅ Successfully created KV namespace 'REVOCATIONS'
id = "xyz789..."
```

**Action**: Copy the `id` and update `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "REVOCATIONS",
    "id": "xyz789..."  // ← Paste here
  }
]
```

## Step 5: Generate Cryptographic Keys

```bash
npm run setup:keys
```

**Output**:
```
✅ Keypair generated successfully!

PRIVATE KEY (store as Cloudflare Secret):
MIGHAgEAMBMGByqGSAQGCEQBBggrBgEFBQcDAQQdMBsCAQEEFgQU...

PUBLIC KEY (store in KV and embed in GSMFlow):
MCowBQYDK2VwAyEA1234567890abcdef...
```

**Action**: Save both keys securely.

## Step 6: Store Private Key as Secret

```bash
wrangler secret put LICENSE_PRIVATE_KEY
```

When prompted, paste the **PRIVATE KEY** from Step 5.

## Step 7: Generate and Store HMAC Secret

```bash
# Generate random secret
openssl rand -base64 32
```

**Output**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6==`

```bash
# Store as secret
wrangler secret put HMAC_SECRET
```

When prompted, paste the generated secret.

**Important**: Save this secret - you'll need it to authenticate API requests.

## Step 8: Store Public Key in KV

```bash
wrangler kv:key put --binding=REVOCATIONS "public_key:v1" "MCowBQYDK2VwAyEA1234567890abcdef..."
```

Replace the value with your **PUBLIC KEY** from Step 5.

## Step 9: Create First Tenant

```bash
npm run setup:tenant "550e8400-e29b-41d4-a716-446655440000" "Acme Corp"
```

**Output**:
```sql
INSERT INTO tenants (tenant_id, name, created_at, status) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corp', 1700000000, 'active');
```

Execute this SQL:

```bash
wrangler d1 execute gsmflow-authority --remote --command="INSERT INTO tenants..."
```

Or for local testing:
```bash
wrangler d1 execute gsmflow-authority --local --command="INSERT INTO tenants..."
```

## Step 10: Deploy to Cloudflare

```bash
npm run deploy
```

**Output**:
```
✨ Successfully deployed to https://gsmflow-authority.your-subdomain.workers.dev
```

## Step 11: Test the Deployment

### Test Health Check

```bash
curl https://gsmflow-authority.your-subdomain.workers.dev/health
```

**Expected**: `OK`

### Test Public Key Endpoint

```bash
curl https://gsmflow-authority.your-subdomain.workers.dev/authority/public-key
```

**Expected**:
```json
{
  "public_key": "MCowBQYDK2VwAyEA...",
  "algorithm": "ED25519",
  "key_id": "v1"
}
```

### Test License Issuance

First, generate HMAC signature:

```bash
npm run generate:hmac POST /authority/license/issue \
  '{"tenant_id":"550e8400-e29b-41d4-a716-446655440000","plan_id":"pro","allowed_domains":["example.com"],"expires_at":1735689600}' \
  'your-hmac-secret'
```

Then make the request:

```bash
curl -X POST https://gsmflow-authority.your-subdomain.workers.dev/authority/license/issue \
  -H "Authorization: HMAC-SHA256 1700000000:abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "plan_id": "pro",
    "allowed_domains": ["example.com"],
    "expires_at": 1735689600
  }'
```

**Expected**:
```json
{
  "license": "eyJsaWNlbnNlX2lkIjoi...",
  "license_id": "uuid",
  "issued_at": 1700000000,
  "expires_at": 1735689600
}
```

## Step 12: Integrate with GSMFlow

1. Copy the **PUBLIC KEY** to your GSMFlow codebase
2. Add license verification code (see `examples/gsmflow-verify.ts`)
3. Set `GSMFLOW_LICENSE` environment variable with the issued license
4. Deploy GSMFlow

## Production Checklist

- [ ] D1 database created and migrated
- [ ] All migrations applied (check with `npm run db:list`)
- [ ] KV namespace created
- [ ] Private key stored as secret
- [ ] HMAC secret stored as secret
- [ ] Public key stored in KV
- [ ] At least one tenant created
- [ ] Worker deployed successfully
- [ ] Health check returns OK
- [ ] Public key endpoint works
- [ ] License issuance tested
- [ ] HMAC secret documented for calling services
- [ ] Public key embedded in GSMFlow
- [ ] Monitoring and alerts configured
- [ ] Backup plan for D1 database (automatic on migration apply)

## Rollback Plan

If deployment fails:

1. Check Cloudflare Workers dashboard for errors
2. Review wrangler logs: `wrangler tail`
3. Verify all secrets are set: `wrangler secret list`
4. Check migrations applied: `npm run db:list`
5. Check D1 database: `wrangler d1 execute gsmflow-authority --remote --command="SELECT * FROM tenants"`
6. Verify KV namespace: `wrangler kv:key list --binding=REVOCATIONS`

## Updating the Worker

```bash
# Make code changes
git pull

# Deploy update
npm run deploy
```

Secrets and database persist across deployments.

## Key Rotation

To rotate the ED25519 keypair:

1. Generate new keypair: `npm run setup:keys`
2. Store new private key: `wrangler secret put LICENSE_PRIVATE_KEY`
3. Store new public key in KV with new key_id: `wrangler kv:key put --binding=REVOCATIONS "public_key:v2" "..."`
4. Update GSMFlow to support both v1 and v2 keys
5. After all licenses are reissued, remove v1 key

## Support

For issues during deployment:
1. Check Cloudflare Workers logs
2. Review D1 query logs
3. Verify KV operations
4. Test HMAC signature generation
5. Validate license structure
