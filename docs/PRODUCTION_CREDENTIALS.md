# Production Credentials

## ⚠️ CONFIDENTIAL - Internal Use Only

This document contains production credentials for the License Authority. **Do not share externally.**

## Service Information

**Production URL**: `https://gsmflow-authority.ylstack02.workers.dev`

**Deployment Date**: 2026-02-07

**Status**: ✅ Active

## Credentials

### HMAC Secret (API Authentication)

```
production-hmac-secret-gsmflow-2026
```

**Usage**: Required for all protected API endpoints (issue, revoke)

**Storage**: 
- Cloudflare Secret: `HMAC_SECRET`
- Client Portal: Environment variable `LICENSE_AUTHORITY_SECRET`

### Public Key (License Verification)

```
MCowBQYDK2VwAyEAcbf2x04rbkZCYzr07Eog2wkTX1i9VTuUos2MJD4gLRM=
```

**Algorithm**: ED25519

**Key ID**: `v1`

**Usage**: Embed in GSMFlow for offline license verification

**Storage**:
- KV: `public_key:v1`
- GSMFlow: Hardcoded in `src/config/license.ts`

### Private Key

**⚠️ NEVER EXPOSE THIS KEY**

**Storage**: Cloudflare Secret `LICENSE_PRIVATE_KEY` only

**Access**: Only the License Authority Worker can access this

## Database

### D1 Database

**Name**: `gsmflow-authority`

**ID**: `44c9c419-8c5e-4f4b-be44-4a7d6b464b8e`

**Tables**:
- `tenants`: Tenant registry
- `licenses`: License history
- `audit_log`: Audit trail

### KV Namespace

**Name**: `REVOCATIONS`

**ID**: `700565ede6044acaa8c8df092be9d77e`

**Keys**:
- `public_key:v1`: Public key
- `revocations:{license_id}`: Revocation records

## Test Tenant

**Tenant ID**: `550e8400-e29b-41d4-a716-446655440000`

**Name**: Production Tenant

**Status**: Active

**Created**: 2026-02-07

## Access Control

### Who Has Access

1. **DevOps Team**: Full access to Cloudflare dashboard
2. **Backend Team**: HMAC secret for API integration
3. **GSMFlow Team**: Public key for verification

### Who Should NOT Have Access

- Frontend developers
- Support team
- External contractors
- Customers

## Security Procedures

### Key Rotation

If keys need to be rotated:

1. Generate new keypair: `npm run setup:keys`
2. Store new private key: `wrangler secret put LICENSE_PRIVATE_KEY`
3. Store new public key in KV with new key_id: `public_key:v2`
4. Update GSMFlow to support both v1 and v2
5. Reissue all active licenses
6. Remove old key after migration complete

### HMAC Secret Rotation

If HMAC secret is compromised:

1. Generate new secret: `openssl rand -base64 32`
2. Update Cloudflare: `wrangler secret put HMAC_SECRET`
3. Update all client portals with new secret
4. Monitor for failed auth attempts

### Incident Response

If credentials are exposed:

1. **Immediately** rotate affected credentials
2. Revoke all active licenses
3. Audit access logs
4. Notify security team
5. Reissue licenses to legitimate customers

## Monitoring

### Cloudflare Dashboard

- Workers Analytics: https://dash.cloudflare.com/workers
- D1 Database: https://dash.cloudflare.com/d1
- KV Namespace: https://dash.cloudflare.com/kv

### Alerts

Set up alerts for:
- Failed authentication attempts (> 10 per minute)
- Unusual license issuance rate (> 100 per hour)
- D1 errors
- KV unavailability

## Backup

### D1 Backup

Automatic backups on every migration apply.

Manual backup:
```bash
wrangler d1 export gsmflow-authority --remote --output backup.sql
```

### KV Backup

Export all keys:
```bash
wrangler kv:key list --binding REVOCATIONS --remote > kv-backup.json
```

### Secrets Backup

Store in secure password manager:
- 1Password
- LastPass
- HashiCorp Vault

## Compliance

### Data Retention

- License history: Indefinite (audit requirement)
- Revocation records: 1 year (auto-expire)
- Audit logs: 7 years (compliance requirement)

### Access Logs

All API calls are logged with:
- Timestamp
- Action
- Actor (IP address)
- Result (success/failure)

## Support Contacts

**Primary**: DevOps Team (devops@company.com)

**Secondary**: Backend Team (backend@company.com)

**Emergency**: On-call rotation (pagerduty)

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-02-07 | Initial deployment | DevOps |
| 2026-02-07 | Production tenant created | DevOps |
| 2026-02-07 | Keys generated and stored | DevOps |

---

**Last Updated**: 2026-02-07

**Next Review**: 2026-03-07 (monthly)
