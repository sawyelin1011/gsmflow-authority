# GSMFlow Authority API Documentation

## Base URL

```
https://your-worker.your-subdomain.workers.dev
```

## Authentication

Currently, authentication is not enforced. When implemented, all protected endpoints will require a Bearer token:

```
Authorization: Bearer <your-token>
```

## Endpoints

### 1. Health Check

Check if the service is running and healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "service": "gsmflow-authority",
  "timestamp": "2026-02-06T20:12:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Service is healthy

---

### 2. API Version

Get the current API version.

**Endpoint:** `GET /api/v1/version`

**Response:**
```json
{
  "version": "1.0.0",
  "service": "gsmflow-authority"
}
```

**Status Codes:**
- `200 OK` - Success

---

### 3. Validate License

Validate a license key to check if it's active and valid.

**Endpoint:** `POST /api/v1/license/validate`

**Request Body:**
```json
{
  "licenseKey": "ABCD-1234-EFGH-5678"
}
```

**Response (Valid License):**
```json
{
  "valid": true,
  "license": {
    "licenseKey": "ABCD-1234-EFGH-5678",
    "userId": "user123",
    "plan": "premium",
    "status": "active",
    "issuedAt": "2026-01-01T00:00:00.000Z",
    "expiresAt": null,
    "metadata": {
      "email": "user@example.com"
    }
  }
}
```

**Response (Invalid License):**
```json
{
  "valid": false,
  "reason": "License not found"
}
```

**Status Codes:**
- `200 OK` - Validation completed (check `valid` field)
- `400 Bad Request` - Missing or invalid request body

**Error Response:**
```json
{
  "error": "Missing licenseKey",
  "status": 400
}
```

---

### 4. Issue License

Issue a new license for a user.

**Endpoint:** `POST /api/v1/license/issue`

**Request Body:**
```json
{
  "userId": "user123",
  "plan": "premium",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "metadata": {
    "email": "user@example.com",
    "company": "Example Corp"
  }
}
```

**Fields:**
- `userId` (required) - Unique identifier for the user
- `plan` (required) - License plan (free, basic, premium, enterprise)
- `expiresAt` (optional) - ISO 8601 date string for expiration, null for perpetual
- `metadata` (optional) - Additional metadata object

**Response (Success):**
```json
{
  "success": true,
  "license": {
    "licenseKey": "ABCD-1234-EFGH-5678",
    "userId": "user123",
    "plan": "premium",
    "status": "active",
    "issuedAt": "2026-02-06T20:12:00.000Z",
    "expiresAt": "2027-01-01T00:00:00.000Z",
    "metadata": {
      "email": "user@example.com",
      "company": "Example Corp"
    }
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Failed to issue license"
}
```

**Status Codes:**
- `200 OK` - License issuance completed (check `success` field)
- `400 Bad Request` - Missing or invalid request body

**Error Response:**
```json
{
  "error": "Missing userId or plan",
  "status": 400
}
```

---

### 5. Revoke License

Revoke an existing license.

**Endpoint:** `DELETE /api/v1/license/:licenseKey`

**Parameters:**
- `licenseKey` (path parameter) - The license key to revoke

**Example:** `DELETE /api/v1/license/ABCD-1234-EFGH-5678`

**Response (Success):**
```json
{
  "success": true,
  "message": "License revoked successfully"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "License not found"
}
```

**Status Codes:**
- `200 OK` - Revocation completed (check `success` field)
- `400 Bad Request` - Missing license key
- `404 Not Found` - License not found

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "status": 400
}
```

### Common Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no content to return
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## License Status Values

- `active` - License is valid and active
- `expired` - License has expired
- `revoked` - License has been revoked
- `suspended` - License is temporarily suspended

---

## Plan Types

- `free` - Free tier
- `basic` - Basic tier
- `premium` - Premium tier
- `enterprise` - Enterprise tier

---

## Rate Limiting

Rate limiting is not currently implemented. When enabled, rate-limited requests will return:

```json
{
  "error": "Rate limit exceeded",
  "status": 429
}
```

---

## Examples

### Example: Validate a License (cURL)

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/v1/license/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"ABCD-1234-EFGH-5678"}'
```

### Example: Issue a License (cURL)

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/v1/license/issue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "plan": "premium",
    "expiresAt": "2027-01-01T00:00:00.000Z"
  }'
```

### Example: Revoke a License (cURL)

```bash
curl -X DELETE https://your-worker.your-subdomain.workers.dev/api/v1/license/ABCD-1234-EFGH-5678
```

### Example: JavaScript/TypeScript Client

```typescript
class LicenseClient {
  constructor(private baseUrl: string) {}

  async validateLicense(licenseKey: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });
    return response.json();
  }

  async issueLicense(userId: string, plan: string, expiresAt?: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/license/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan, expiresAt }),
    });
    return response.json();
  }

  async revokeLicense(licenseKey: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/license/${licenseKey}`, {
      method: 'DELETE',
    });
    return response.json();
  }
}
```
