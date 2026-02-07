# Testing Guide

## Overview

This guide provides test data, examples, and procedures for testing license integration.

## Test Environment

**Local Development**: `http://localhost:8787`

**Production**: `https://gsmflow-authority.ylstack02.workers.dev`

## Test Credentials

### Local Development

```bash
HMAC_SECRET=test-secret-key-for-local-development
PUBLIC_KEY=MCowBQYDK2VwAyEAo2Rku7ZklGpjdC2futOldI1R2gUxzs0/BV6cNe4d+Vg=
```

### Production (Internal Only)

See `PRODUCTION_CREDENTIALS.md`

## Test Tenants

### Local Test Tenants

```json
[
  {
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "status": "active"
  },
  {
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Test Company",
    "status": "active"
  },
  {
    "tenant_id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Demo Inc",
    "status": "suspended"
  }
]
```

## Test Scenarios

### Scenario 1: Issue Valid License

**Request**:
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_id": "pro",
  "allowed_domains": ["test.example.com"],
  "expires_at": 1735689600
}
```

**Expected Response**: `200 OK`
```json
{
  "license": "eyJsaWNlbnNlX2lkIjoi...",
  "license_id": "uuid",
  "issued_at": 1707314921,
  "expires_at": 1735689600
}
```

**Verification**:
1. License ID is valid UUID
2. License is base64-encoded
3. Decoded license contains all fields
4. Signature is valid ED25519

### Scenario 2: Issue License for Invalid Tenant

**Request**:
```json
{
  "tenant_id": "00000000-0000-0000-0000-000000000000",
  "plan_id": "pro",
  "allowed_domains": ["test.com"],
  "expires_at": 1735689600
}
```

**Expected Response**: `404 Not Found`
```json
{
  "error": "Tenant not found",
  "code": "TENANT_NOT_FOUND"
}
```

### Scenario 3: Issue License for Suspended Tenant

**Request**:
```json
{
  "tenant_id": "770e8400-e29b-41d4-a716-446655440002",
  "plan_id": "pro",
  "allowed_domains": ["test.com"],
  "expires_at": 1735689600
}
```

**Expected Response**: `403 Forbidden`
```json
{
  "error": "Tenant is not active",
  "code": "TENANT_SUSPENDED"
}
```

### Scenario 4: Revoke License

**Request**:
```json
{
  "license_id": "44db36b3-7c47-4940-9ddb-bd5b42159afb",
  "reason": "payment_failed"
}
```

**Expected Response**: `200 OK`
```json
{
  "revoked": true,
  "license_id": "44db36b3-7c47-4940-9ddb-bd5b42159afb",
  "revoked_at": 1707314921
}
```

**Verification**:
1. License appears in KV revocation list
2. Sync endpoint returns `revoked: true`
3. D1 audit log contains revocation entry

### Scenario 5: Check Revocation (Not Revoked)

**Request**:
```
GET /authority/revocations/sync?license_id=new-license-id
```

**Expected Response**: `200 OK`
```json
{
  "revoked": false,
  "checked_at": 1707314921
}
```

### Scenario 6: Check Revocation (Revoked)

**Request**:
```
GET /authority/revocations/sync?license_id=revoked-license-id
```

**Expected Response**: `200 OK`
```json
{
  "revoked": true,
  "checked_at": 1707314921,
  "reason": "payment_failed"
}
```

### Scenario 7: Rate Limiting

**Request**: Make 2 requests to sync endpoint with same license_id

**Expected**:
- First request: `200 OK`
- Second request: `429 Too Many Requests`

### Scenario 8: Invalid HMAC

**Request**: Use wrong HMAC secret

**Expected Response**: `401 Unauthorized`
```json
{
  "error": "Invalid or missing HMAC signature",
  "code": "UNAUTHORIZED"
}
```

### Scenario 9: Expired HMAC Timestamp

**Request**: Use timestamp > 5 minutes old

**Expected Response**: `401 Unauthorized`

### Scenario 10: Invalid Domain Format

**Request**:
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_id": "pro",
  "allowed_domains": ["invalid domain!"],
  "expires_at": 1735689600
}
```

**Expected Response**: `400 Bad Request`
```json
{
  "error": "Invalid domain format: invalid domain!",
  "code": "INVALID_DOMAINS"
}
```

## Test License Examples

### Starter Plan License

```json
{
  "license_id": "starter-test-001",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_id": "starter",
  "allowed_domains": ["starter.example.com"],
  "issued_at": 1707314921,
  "expires_at": 1738850921,
  "grace_days": 14,
  "feature_flags": {
    "automation": false,
    "multi_tenant": false,
    "api_access": false,
    "custom_branding": false,
    "advanced_analytics": false,
    "priority_support": false
  },
  "signature": "..."
}
```

### Pro Plan License

```json
{
  "license_id": "pro-test-001",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_id": "pro",
  "allowed_domains": ["pro.example.com", "*.pro.example.com"],
  "issued_at": 1707314921,
  "expires_at": 1738850921,
  "grace_days": 14,
  "feature_flags": {
    "automation": true,
    "multi_tenant": false,
    "api_access": true,
    "custom_branding": true,
    "advanced_analytics": true,
    "priority_support": false
  },
  "signature": "..."
}
```

### Enterprise Plan License

```json
{
  "license_id": "enterprise-test-001",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_id": "enterprise",
  "allowed_domains": ["*.enterprise.example.com"],
  "issued_at": 1707314921,
  "expires_at": 1738850921,
  "grace_days": 30,
  "feature_flags": {
    "automation": true,
    "multi_tenant": true,
    "api_access": true,
    "custom_branding": true,
    "advanced_analytics": true,
    "priority_support": true
  },
  "signature": "..."
}
```

## Automated Testing

### Run Local Tests

```bash
# Start local dev server
npm run dev

# In another terminal, run tests
npm run test:endpoints
```

**Expected**: All 12 tests pass

### Run Production Tests

```bash
npm run test:production
```

**Expected**: All tests pass

## Manual Testing

### Test License Issuance

```bash
# Generate HMAC
npm run generate:hmac POST /authority/license/issue \
  '{"tenant_id":"550e8400-e29b-41d4-a716-446655440000","plan_id":"pro","allowed_domains":["test.com"],"expires_at":1735689600}' \
  'your-secret'

# Make request
curl -X POST https://gsmflow-authority.ylstack02.workers.dev/authority/license/issue \
  -H "Authorization: HMAC-SHA256 timestamp:signature" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"550e8400-e29b-41d4-a716-446655440000","plan_id":"pro","allowed_domains":["test.com"],"expires_at":1735689600}'
```

### Test License Verification

```bash
# Decode license
echo "license_base64" | base64 -d | jq

# Verify signature (use verification script)
node scripts/verify-license.js license_base64
```

### Test Revocation

```bash
# Revoke license
npm run generate:hmac POST /authority/license/revoke \
  '{"license_id":"uuid","reason":"test"}' \
  'your-secret'

curl -X POST https://gsmflow-authority.ylstack02.workers.dev/authority/license/revoke \
  -H "Authorization: HMAC-SHA256 timestamp:signature" \
  -H "Content-Type: application/json" \
  -d '{"license_id":"uuid","reason":"test"}'

# Check revocation
curl "https://gsmflow-authority.ylstack02.workers.dev/authority/revocations/sync?license_id=uuid"
```

## Performance Testing

### Load Test License Issuance

```bash
# Using Apache Bench
ab -n 100 -c 10 -T application/json \
  -H "Authorization: HMAC-SHA256 ..." \
  -p request.json \
  https://gsmflow-authority.ylstack02.workers.dev/authority/license/issue
```

**Expected**:
- Response time: < 200ms p50
- Response time: < 500ms p99
- Success rate: 100%

### Load Test Revocation Sync

```bash
ab -n 1000 -c 50 \
  "https://gsmflow-authority.ylstack02.workers.dev/authority/revocations/sync?license_id=test"
```

**Expected**:
- Response time: < 50ms p50
- Response time: < 100ms p99
- Success rate: 100%

## Security Testing

### Test HMAC Tampering

1. Generate valid HMAC
2. Modify request body
3. Send request with original HMAC

**Expected**: `401 Unauthorized`

### Test Signature Tampering

1. Issue valid license
2. Decode and modify license data
3. Try to verify in GSMFlow

**Expected**: Signature verification fails

### Test Domain Bypass

1. Issue license for `example.com`
2. Try to use on `attacker.com`

**Expected**: Domain verification fails

### Test Expired License

1. Issue license with past expiry
2. Try to verify in GSMFlow

**Expected**: Expiry check fails

## Troubleshooting

### Test Fails: "Invalid HMAC signature"

**Check**:
1. HMAC secret is correct
2. Timestamp is current (< 5 minutes old)
3. Body matches exactly (no extra spaces)
4. Method and path are correct

### Test Fails: "Tenant not found"

**Check**:
1. Tenant exists in D1
2. Tenant ID is correct UUID format
3. Database migration applied

### Test Fails: "Invalid signature"

**Check**:
1. Public key matches private key
2. License not tampered
3. Signature algorithm is ED25519

## Test Data Cleanup

### Clean Local Data

```bash
# Clear local D1
rm -rf .wrangler/state/v3/d1

# Reapply migrations
npm run db:migrate:local
npm run db:seed
```

### Clean Production Data (Careful!)

```bash
# List all licenses
wrangler d1 execute gsmflow-authority --remote \
  --command="SELECT * FROM licenses WHERE tenant_id = 'test-tenant'"

# Delete test licenses
wrangler d1 execute gsmflow-authority --remote \
  --command="DELETE FROM licenses WHERE tenant_id = 'test-tenant'"
```

## Continuous Integration

### GitHub Actions

```yaml
name: Test License Authority

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run setup:local
      - run: npm run dev &
      - run: sleep 10
      - run: npm run test:endpoints
```

## Test Checklist

- [ ] Health check works
- [ ] Public key retrieval works
- [ ] License issuance works (valid tenant)
- [ ] License issuance fails (invalid tenant)
- [ ] License issuance fails (suspended tenant)
- [ ] License revocation works
- [ ] Revocation sync works (not revoked)
- [ ] Revocation sync works (revoked)
- [ ] Rate limiting works
- [ ] HMAC authentication works
- [ ] Invalid HMAC rejected
- [ ] Signature verification works
- [ ] Domain validation works
- [ ] Expiry checking works
- [ ] Feature flags work correctly
- [ ] All plans have correct features
