# Setup Checklist

Complete checklist for deploying the GSMFlow License Authority.

## Pre-Deployment

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] Cloudflare account created
- [ ] Wrangler CLI installed: `npm install -g wrangler`
- [ ] Logged into Wrangler: `wrangler login`
- [ ] Repository cloned
- [ ] Dependencies installed: `npm install`

### Configuration Files
- [ ] `wrangler.jsonc` reviewed
- [ ] `.gitignore` in place
- [ ] TypeScript compiles: `npx tsc --noEmit`

## Database Setup

### D1 Database
- [ ] Database created: `npm run db:create`
- [ ] `database_id` copied to `wrangler.jsonc`
- [ ] Migrations applied: `npm run db:migrate`
- [ ] Migrations verified: `npm run db:list`
- [ ] Tables created (check with SQL query)

### Test Locally First
- [ ] Local migrations applied: `npm run db:migrate:local`
- [ ] Local database verified
- [ ] Local dev server tested: `npm run dev`

## Storage Setup

### KV Namespace
- [ ] KV namespace created: `npm run kv:create`
- [ ] Namespace `id` copied to `wrangler.jsonc`
- [ ] Preview namespace created (optional): `npm run kv:create:preview`

## Cryptographic Keys

### Key Generation
- [ ] Keypair generated: `npm run setup:keys`
- [ ] Private key saved securely (offline backup)
- [ ] Public key saved securely

### Key Storage
- [ ] Private key stored as secret: `wrangler secret put LICENSE_PRIVATE_KEY`
- [ ] Public key stored in KV: `wrangler kv:key put --binding=REVOCATIONS "public_key:v1" "..."`
- [ ] Public key backed up for GSMFlow integration

## Authentication

### HMAC Secret
- [ ] HMAC secret generated: `openssl rand -base64 32`
- [ ] HMAC secret stored: `wrangler secret put HMAC_SECRET`
- [ ] HMAC secret documented for calling services
- [ ] HMAC secret backed up securely

### Verify Secrets
- [ ] All secrets listed: `wrangler secret list`
- [ ] `LICENSE_PRIVATE_KEY` present
- [ ] `HMAC_SECRET` present

## Tenant Setup

### Create First Tenant
- [ ] Tenant ID generated (UUID v4)
- [ ] SQL generated: `npm run setup:tenant <id> <name>`
- [ ] SQL executed: `wrangler d1 execute gsmflow-authority --remote --command="..."`
- [ ] Tenant verified in database

### Test Tenant
- [ ] Query tenant: `wrangler d1 execute gsmflow-authority --remote --command="SELECT * FROM tenants"`
- [ ] Tenant status is 'active'

## Deployment

### Pre-Deploy Checks
- [ ] All secrets configured
- [ ] All bindings configured in `wrangler.jsonc`
- [ ] TypeScript compiles without errors
- [ ] Local testing passed

### Deploy Worker
- [ ] Worker deployed: `npm run deploy`
- [ ] Deployment URL noted
- [ ] No deployment errors

### Post-Deploy Verification
- [ ] Health check works: `curl https://your-worker.workers.dev/health`
- [ ] Public key endpoint works: `curl https://your-worker.workers.dev/authority/public-key`
- [ ] Worker logs clean: `wrangler tail`

## API Testing

### Generate Test License
- [ ] HMAC signature generated: `npm run generate:hmac ...`
- [ ] License issuance tested (POST /authority/license/issue)
- [ ] License received and valid
- [ ] License stored in D1 (check audit log)

### Test Revocation
- [ ] License revoked (POST /authority/license/revoke)
- [ ] Revocation in KV: `wrangler kv:key get --binding=REVOCATIONS "revocations:<license_id>"`
- [ ] Revocation in D1 audit log

### Test Sync
- [ ] Revocation sync tested (GET /authority/revocations/sync)
- [ ] Rate limiting works (try multiple requests)

## GSMFlow Integration

### Public Key Distribution
- [ ] Public key embedded in GSMFlow codebase
- [ ] Verification code implemented (see `examples/gsmflow-verify.ts`)
- [ ] Domain verification implemented
- [ ] Expiry checking implemented
- [ ] Grace period handling implemented

### License Deployment
- [ ] Test license issued for GSMFlow
- [ ] License set as `GSMFLOW_LICENSE` environment variable
- [ ] GSMFlow verifies license successfully
- [ ] Feature flags work correctly

### Background Sync
- [ ] Revocation sync implemented in GSMFlow
- [ ] Sync runs every hour
- [ ] Revoked licenses lock GSMFlow

## Monitoring & Observability

### Cloudflare Dashboard
- [ ] Workers Analytics enabled
- [ ] Request metrics visible
- [ ] Error rate monitored

### Logging
- [ ] Worker logs reviewed: `wrangler tail`
- [ ] No unexpected errors
- [ ] Audit log populated in D1

### Alerts (Recommended)
- [ ] Alert for high error rate
- [ ] Alert for D1 failures
- [ ] Alert for KV failures
- [ ] Alert for unusual revocation patterns

## Security Hardening

### Access Control
- [ ] HMAC secret rotated from default
- [ ] Secrets never committed to git
- [ ] `.gitignore` includes secrets
- [ ] Only authorized services have HMAC secret

### Rate Limiting
- [ ] Rate limits tested
- [ ] Rate limits appropriate for usage
- [ ] Rate limit errors logged

### Audit Trail
- [ ] All operations logged to D1
- [ ] Audit log reviewed
- [ ] No suspicious activity

## Documentation

### Internal Documentation
- [ ] HMAC secret documented (secure location)
- [ ] Public key documented
- [ ] Deployment process documented
- [ ] Rollback procedure documented

### Team Knowledge
- [ ] Team trained on license issuance
- [ ] Team trained on revocation process
- [ ] On-call procedures documented
- [ ] Incident response plan created

## Backup & Recovery

### Backup Strategy
- [ ] D1 automatic backups enabled (on migration apply)
- [ ] Private key backed up securely (offline)
- [ ] HMAC secret backed up securely
- [ ] Recovery procedure tested

### Disaster Recovery
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined
- [ ] Disaster recovery plan documented
- [ ] DR plan tested

## CI/CD (Optional)

### GitHub Actions
- [ ] `.github/workflows/deploy.yml` configured
- [ ] `CLOUDFLARE_API_TOKEN` secret set
- [ ] `CLOUDFLARE_ACCOUNT_ID` secret set
- [ ] Automated deployment tested
- [ ] Automated migration tested

### Testing
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Tests run in CI
- [ ] Test coverage acceptable

## Production Readiness

### Performance
- [ ] Load testing completed
- [ ] Response times acceptable
- [ ] Rate limits appropriate
- [ ] No performance bottlenecks

### Security
- [ ] Security audit completed
- [ ] Penetration testing completed
- [ ] Vulnerabilities addressed
- [ ] Security best practices followed

### Compliance
- [ ] Audit logging sufficient
- [ ] Data retention policy defined
- [ ] Privacy requirements met
- [ ] Compliance requirements met

## Post-Launch

### Monitoring
- [ ] Metrics dashboard created
- [ ] Alerts configured
- [ ] On-call rotation established
- [ ] Incident response tested

### Maintenance
- [ ] Update schedule defined
- [ ] Key rotation schedule defined
- [ ] Backup verification schedule defined
- [ ] Security patch process defined

### Documentation
- [ ] Runbook created
- [ ] Troubleshooting guide created
- [ ] API documentation published
- [ ] Integration guide published

## Sign-Off

- [ ] Technical lead approval
- [ ] Security team approval
- [ ] Operations team approval
- [ ] Product team approval

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Verified By**: _______________

**Production URL**: _______________

**Notes**:
