# Quick Start Guide

Get the GSMFlow License Authority running in 10 minutes.

## Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- Logged in: `wrangler login`

## Setup Steps

### 1. Install Dependencies (30 seconds)

```bash
npm install
```

### 2. Create D1 Database (1 minute)

```bash
npm run db:create
```

Copy the `database_id` and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "gsmflow-authority",
    "database_id": "PASTE_HERE"
  }
]
```

### 3. Apply Migrations (30 seconds)

```bash
npm run db:migrate
```

### 4. Create KV Namespace (1 minute)

```bash
npm run kv:create
```

Copy the `id` and update `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "REVOCATIONS",
    "id": "PASTE_HERE"
  }
]
```

### 5. Generate Keys (1 minute)

```bash
npm run setup:keys
```

Save both keys that are printed.

### 6. Store Secrets (2 minutes)

```bash
# Store private key
wrangler secret put LICENSE_PRIVATE_KEY
# Paste the private key when prompted

# Generate HMAC secret
openssl rand -base64 32

# Store HMAC secret
wrangler secret put HMAC_SECRET
# Paste the generated secret
```

### 7. Store Public Key in KV (30 seconds)

```bash
wrangler kv:key put --binding=REVOCATIONS "public_key:v1" "YOUR_PUBLIC_KEY"
```

### 8. Create First Tenant (1 minute)

```bash
npm run setup:tenant "550e8400-e29b-41d4-a716-446655440000" "Test Tenant"
```

Copy the SQL and execute:

```bash
wrangler d1 execute gsmflow-authority --remote --command="INSERT INTO tenants..."
```

### 9. Deploy (1 minute)

```bash
npm run deploy
```

### 10. Test (2 minutes)

```bash
# Health check
curl https://your-worker.workers.dev/health

# Public key
curl https://your-worker.workers.dev/authority/public-key

# Issue license (generate HMAC first)
npm run generate:hmac POST /authority/license/issue \
  '{"tenant_id":"550e8400-e29b-41d4-a716-446655440000","plan_id":"pro","allowed_domains":["example.com"],"expires_at":1735689600}' \
  'your-hmac-secret'

# Then make request with the generated signature
curl -X POST https://your-worker.workers.dev/authority/license/issue \
  -H "Authorization: HMAC-SHA256 timestamp:signature" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"550e8400-e29b-41d4-a716-446655440000","plan_id":"pro","allowed_domains":["example.com"],"expires_at":1735689600}'
```

## Done! 🎉

Your License Authority is now running. Next steps:

1. Embed the public key in GSMFlow
2. Implement license verification (see `examples/gsmflow-verify.ts`)
3. Set up monitoring and alerts
4. Document HMAC secret for calling services

## Local Development

```bash
# Start local dev server
npm run dev

# Apply migrations locally
npm run db:migrate:local

# Test locally at http://localhost:8787
```

## Common Commands

```bash
# Database
npm run db:list                    # List migrations
npm run db:migration:create "..."  # Create migration
npm run db:migrate                 # Apply to production
npm run db:migrate:local           # Apply locally

# Keys & Auth
npm run setup:keys                 # Generate keypair
npm run generate:hmac              # Generate HMAC signature

# Deployment
npm run dev                        # Local development
npm run deploy                     # Deploy to production
wrangler tail                      # View logs
```

## Troubleshooting

**"Database not found"**
- Run `npm run db:create` and update `wrangler.jsonc`

**"KV namespace not found"**
- Run `npm run kv:create` and update `wrangler.jsonc`

**"Secret not found"**
- Run `wrangler secret put LICENSE_PRIVATE_KEY`
- Run `wrangler secret put HMAC_SECRET`

**"Public key not found"**
- Run `wrangler kv:key put --binding=REVOCATIONS "public_key:v1" "..."`

**"Tenant not found"**
- Run `npm run setup:tenant` and execute the SQL

## Need Help?

- Check `README.md` for detailed documentation
- Check `DEPLOYMENT.md` for step-by-step deployment guide
- Check `scripts/migration-helper.md` for migration guide
- Review Cloudflare Workers logs: `wrangler tail`
