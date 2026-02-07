# License Authority API Reference

## Base URL

```
Production: https://gsmflow-authority.ylstack02.workers.dev
```

## Authentication

All protected endpoints require HMAC-SHA256 authentication.

### HMAC Format

```
Authorization: HMAC-SHA256 <timestamp>:<signature>
```

### Signature Calculation

```typescript
const timestamp = Math.floor(Date.now() / 1000);
const message = `${method}:${path}:${timestamp}:${body}`;
const signature = HMAC-SHA256(message, secret);
```

**Example**:
```
POST /authority/license/issue
Body: {"tenant_id":"...","plan_id":"pro"}

Message: POST:/authority/license/issue:1707314921:{"tenant_id":"...","plan_id":"pro"}
Signature: HMAC-SHA256(message, secret)
Header: Authorization: HMAC-SHA256 1707314921:abc123...
```

## Endpoints

### Health Check

Check if the service is running.

```http
GET /health
```

**Authentication**: None

**Response**: `200 OK`
```
OK
```

---

### Get Public Key

Retrieve the public key for offline license verification.

```http
GET /authority/public-key
```

**Authentication**: None

**Response**: `200 OK`
```json
{
  "public_key": "MCowBQYDK2VwAyEAcbf2x04rbkZCYzr07Eog2wkTX1i9VTuUos2MJD4gLRM=",
  "algorithm": "ED25519",
  "key_id": "v1"
}
```

**Cache**: 1 hour

---

### Issue License

Issue a new cryptographically signed license.

```http
POST /authority/license/issue
```

**Authentication**: HMAC-SHA256 (required)

**Request Body**:
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

**Parameters**:
- `tenant_id` (string, required): UUID of the tenant
- `plan_id` (string, required): `"starter"`, `"pro"`, or `"enterprise"`
- `allowed_domains` (array, required): List of allowed domains (supports wildcards)
- `expires_at` (number, required): Unix timestamp for expiration
- `grace_days` (number, optional): Grace period in days (default: 14)
- `feature_overrides` (object, optional): Override plan features

**Response**: `200 OK`
```json
{
  "license": "eyJsaWNlbnNlX2lkIjoiNDRkYjM2YjMtN2M0Ny00OTQwLTlkZGItYmQ1YjQyMTU5YWZiIi...",
  "license_id": "44db36b3-7c47-4940-9ddb-bd5b42159afb",
  "issued_at": 1707314921,
  "expires_at": 1735689600
}
```

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid HMAC signature
- `404 Not Found`: Tenant not found
- `429 Too Many Requests`: Rate limit exceeded

---

### Revoke License

Revoke an existing license.

```http
POST /authority/license/revoke
```

**Authentication**: HMAC-SHA256 (required)

**Request Body**:
```json
{
  "license_id": "44db36b3-7c47-4940-9ddb-bd5b42159afb",
  "reason": "payment_failed"
}
```

**Parameters**:
- `license_id` (string, required): UUID of the license to revoke
- `reason` (string, required): Reason for revocation

**Response**: `200 OK`
```json
{
  "revoked": true,
  "license_id": "44db36b3-7c47-4940-9ddb-bd5b42159afb",
  "revoked_at": 1707314921
}
```

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid HMAC signature
- `404 Not Found`: License not found
- `429 Too Many Requests`: Rate limit exceeded

---

### Check Revocation

Check if a license has been revoked (for GSMFlow background sync).

```http
GET /authority/revocations/sync?license_id={license_id}
```

**Authentication**: None

**Rate Limit**: 1 request per hour per license

**Query Parameters**:
- `license_id` (string, required): UUID of the license to check

**Response**: `200 OK`
```json
{
  "revoked": false,
  "checked_at": 1707314921
}
```

Or if revoked:
```json
{
  "revoked": true,
  "checked_at": 1707314921,
  "reason": "payment_failed"
}
```

**Errors**:
- `400 Bad Request`: Invalid or missing license_id
- `429 Too Many Requests`: Rate limit exceeded (1 per hour per license)

---

## License Structure

The issued license is a base64-encoded JSON object with the following structure:

```json
{
  "license_id": "44db36b3-7c47-4940-9ddb-bd5b42159afb",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_id": "pro",
  "allowed_domains": ["example.com", "*.example.com"],
  "issued_at": 1707314921,
  "expires_at": 1735689600,
  "grace_days": 14,
  "feature_flags": {
    "automation": true,
    "multi_tenant": false,
    "api_access": true,
    "custom_branding": true,
    "advanced_analytics": true,
    "priority_support": false
  },
  "signature": "base64_ed25519_signature"
}
```

## Plan Features

### Starter Plan
```json
{
  "automation": false,
  "multi_tenant": false,
  "api_access": false,
  "custom_branding": false,
  "advanced_analytics": false,
  "priority_support": false
}
```

### Pro Plan
```json
{
  "automation": true,
  "multi_tenant": false,
  "api_access": true,
  "custom_branding": true,
  "advanced_analytics": true,
  "priority_support": false
}
```

### Enterprise Plan
```json
{
  "automation": true,
  "multi_tenant": true,
  "api_access": true,
  "custom_branding": true,
  "advanced_analytics": true,
  "priority_support": true
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/authority/license/issue` | 100 requests per minute per IP |
| `/authority/license/revoke` | 100 requests per minute per IP |
| `/authority/revocations/sync` | 1 request per hour per license |
| `/authority/public-key` | Unlimited (cached) |

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Error Codes

- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `INVALID_LICENSE_ID`: Invalid license ID format
- `INVALID_TENANT_ID`: Invalid tenant ID format
- `INVALID_PLAN_ID`: Invalid plan ID
- `INVALID_DOMAINS`: Invalid domain format
- `INVALID_EXPIRY`: Invalid expiry timestamp
- `TENANT_NOT_FOUND`: Tenant does not exist
- `TENANT_SUSPENDED`: Tenant is suspended
- `LICENSE_NOT_FOUND`: License does not exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_ERROR`: Internal server error

## Examples

### Issue License (cURL)

```bash
# Generate HMAC signature first
TIMESTAMP=$(date +%s)
BODY='{"tenant_id":"550e8400-e29b-41d4-a716-446655440000","plan_id":"pro","allowed_domains":["example.com"],"expires_at":1735689600}'
MESSAGE="POST:/authority/license/issue:$TIMESTAMP:$BODY"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "your-secret" -binary | base64)

# Make request
curl -X POST https://gsmflow-authority.ylstack02.workers.dev/authority/license/issue \
  -H "Authorization: HMAC-SHA256 $TIMESTAMP:$SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

### Check Revocation (cURL)

```bash
curl "https://gsmflow-authority.ylstack02.workers.dev/authority/revocations/sync?license_id=44db36b3-7c47-4940-9ddb-bd5b42159afb"
```

### Get Public Key (cURL)

```bash
curl https://gsmflow-authority.ylstack02.workers.dev/authority/public-key
```

## SDK Examples

See `examples/license-authority-client.ts` for a complete TypeScript SDK implementation.

## Support

For API issues or questions:
1. Check error response for details
2. Verify HMAC signature calculation
3. Check rate limits
4. Review audit logs in D1 database
