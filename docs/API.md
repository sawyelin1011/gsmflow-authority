# GSMFlow License Authority API

## Authentication

All endpoints (except `/health`) require HMAC-SHA256 authentication.

### Request Headers

- `X-Auth-Token`: Shared secret token
- `X-Auth-Timestamp`: Unix timestamp in seconds
- `X-Auth-Signature`: HMAC-SHA256 signature of `method:path:timestamp:body`

### Example (Node.js)

```javascript
const crypto = require('crypto');

function signRequest(method, path, timestamp, body, secret) {
  const signedData = `${method}:${path}:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedData);
  return hmac.digest('base64');
}

const method = 'POST';
const path = '/authority/issue';
const timestamp = Math.floor(Date.now() / 1000);
const body = JSON.stringify({ tenant_id: 'test', plan_id: 'pro', ... });
const secret = 'your-shared-secret';

const signature = signRequest(method, path, timestamp, body, secret);

fetch('https://your-worker.dev/authority/issue', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': secret,
    'X-Auth-Timestamp': timestamp.toString(),
    'X-Auth-Signature': signature,
  },
  body: body,
});
```

## Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

### Issue License

```
POST /authority/issue
```

**Request Body:**
```json
{
  "tenant_id": "your-tenant-id",
  "plan_id": "starter",
  "allowed_domains": ["example.com", "*.example.org"],
  "expires_at": 1735689600,
  "grace_days": 7,
  "feature_flags": {
    "automation": true,
    "multi_tenant": false
  }
}
```

**Response:**
```json
{
  "license_id": "generated-license-id",
  "tenant_id": "your-tenant-id",
  "plan_id": "starter",
  "allowed_domains": ["example.com", "*.example.org"],
  "issued_at": 1704067200,
  "expires_at": 1735689600,
  "grace_days": 7,
  "feature_flags": {
    "automation": true,
    "multi_tenant": false
  },
  "signature": "base64-encoded-ed25519-signature"
}
```

### Validate License

```
POST /authority/validate
```

**Request Body:**
```json
{
  "license": {
    "license_id": "your-license-id",
    "tenant_id": "your-tenant-id",
    "plan_id": "starter",
    "allowed_domains": ["example.com"],
    "issued_at": 1704067200,
    "expires_at": 1735689600,
    "grace_days": 7,
    "feature_flags": {
      "automation": true,
      "multi_tenant": false
    },
    "signature": "base64-encoded-signature"
  },
  "domain": "example.com"
}
```

**Response (Valid):**
```json
{
  "valid": true
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "reason": "License revoked"
}
```

### Revoke License

```
POST /authority/revoke
```

**Request Body:**
```json
{
  "license_id": "license-to-revoke",
  "reason": "License violation",
  "revoked_by": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true
}
```

### Get Public Key

```
GET /authority/public-key
```

**Response:**
```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...base64-encoded-key...
-----END PUBLIC KEY-----
```

## Error Responses

### Authentication Failed

```json
{
  "error": "Unauthorized"
}
```

**Status Code:** `401 Unauthorized`

### Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded"
}
```

**Status Code:** `429 Too Many Requests`
**Headers:** `Retry-After: 30`

### Invalid Request

```json
{
  "error": "Missing required fields"
}
```

**Status Code:** `400 Bad Request`

### Internal Server Error

```json
{
  "error": "Internal server error"
}
```

**Status Code:** `500 Internal Server Error`

## Rate Limiting

- **Limit:** 100 requests per minute per authentication token
- **Algorithm:** Sliding window
- **Response:** `429 Too Many Requests` with `Retry-After` header

## License Payload Structure

```typescript
interface LicensePayload {
  license_id: string;           // UUID v4
  tenant_id: string;            // Tenant identifier
  plan_id: 'starter' | 'pro' | 'enterprise';
  allowed_domains: string[];    // Domain restrictions (supports wildcards)
  issued_at: number;            // Unix timestamp (seconds)
  expires_at: number;           // Unix timestamp (seconds)
  grace_days: number;           // Grace period after expiration
  feature_flags: {
    automation: boolean;         // Automation features enabled
    multi_tenant: boolean;       // Multi-tenant support enabled
  };
  signature: string;            // ED25519 signature (base64)
}
```

## Domain Validation

- **Exact matches:** `example.com` matches `example.com`
- **Wildcard matches:** `*.example.com` matches `sub.example.com` but not `example.com`
- **Case insensitive:** `Example.COM` matches `example.com`

## Offline Validation

Clients can validate licenses offline using the public key:

```javascript
import { verifySignature } from './crypto/verify';

async function validateLicenseOffline(license, publicKey) {
  // 1. Verify signature
  const { signature, ...payloadWithoutSignature } = license;
  const payloadString = JSON.stringify(payloadWithoutSignature);
  const signatureValid = await verifySignature(payloadString, signature, publicKey);
  
  if (!signatureValid) return { valid: false, reason: 'Invalid signature' };
  
  // 2. Check expiration
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const gracePeriod = license.grace_days * 24 * 60 * 60;
  const effectiveExpiry = license.expires_at + gracePeriod;
  
  if (currentTimestamp > effectiveExpiry) {
    return { valid: false, reason: 'License expired' };
  }
  
  // 3. Check domain
  // ... implement domain validation logic
  
  return { valid: true };
}
```

## cURL Examples

### Issue License

```bash
#!/bin/bash

# Configuration
SECRET="your-shared-secret"
URL="https://your-worker.dev/authority/issue"
TIMESTAMP=$(date +%s)
BODY='{"tenant_id":"test","plan_id":"pro","allowed_domains":["example.com"],"expires_at":'$(($TIMESTAMP + 86400))'}'

# Create signature
SIGNATURE=$(echo -n "POST:/authority/issue:$TIMESTAMP:$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Make request
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $SECRET" \
  -H "X-Auth-Timestamp: $TIMESTAMP" \
  -H "X-Auth-Signature: $SIGNATURE" \
  -d "$BODY"
```

### Validate License

```bash
#!/bin/bash

# Configuration
SECRET="your-shared-secret"
URL="https://your-worker.dev/authority/validate"
TIMESTAMP=$(date +%s)
LICENSE='{"license_id":"your-license-id","tenant_id":"test","plan_id":"pro","allowed_domains":["example.com"],"issued_at":'$(($TIMESTAMP - 3600))',"expires_at":'$(($TIMESTAMP + 86400))',"grace_days":7,"feature_flags":{"automation":true,"multi_tenant":false},"signature":"your-signature"}'
BODY='{"license":'$LICENSE',"domain":"example.com"}'

# Create signature
SIGNATURE=$(echo -n "POST:/authority/validate:$TIMESTAMP:$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Make request
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $SECRET" \
  -H "X-Auth-Timestamp: $TIMESTAMP" \
  -H "X-Auth-Signature: $SIGNATURE" \
  -d "$BODY"
```