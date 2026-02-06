# GSMFlow Authority

A Cloudflare Workers-based license authority service for managing license validation, issuance, and revocation.

## Features

- **License Validation**: Validate license keys against the authority
- **License Issuance**: Issue new licenses for users and plans
- **License Revocation**: Revoke existing licenses
- **Health Monitoring**: Built-in health check endpoint
- **RESTful API**: Clean REST API design with proper error handling

## API Endpoints

### Health Check

```
GET /health
```

Returns the service health status.

**Response:**
```json
{
  "status": "ok",
  "service": "gsmflow-authority",
  "timestamp": "2026-02-06T20:12:00.000Z"
}
```

### Version

```
GET /api/v1/version
```

Returns the API version information.

**Response:**
```json
{
  "version": "1.0.0",
  "service": "gsmflow-authority"
}
```

### Validate License

```
POST /api/v1/license/validate
```

Validates a license key.

**Request:**
```json
{
  "licenseKey": "ABCD-1234-EFGH-5678"
}
```

**Response:**
```json
{
  "valid": true,
  "license": {
    "licenseKey": "ABCD-1234-EFGH-5678",
    "userId": "user123",
    "plan": "premium",
    "status": "active",
    "issuedAt": "2026-01-01T00:00:00.000Z",
    "expiresAt": null
  }
}
```

### Issue License

```
POST /api/v1/license/issue
```

Issues a new license.

**Request:**
```json
{
  "userId": "user123",
  "plan": "premium",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "metadata": {
    "email": "user@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "license": {
    "licenseKey": "ABCD-1234-EFGH-5678",
    "userId": "user123",
    "plan": "premium",
    "status": "active",
    "issuedAt": "2026-02-06T20:12:00.000Z",
    "expiresAt": "2027-01-01T00:00:00.000Z"
  }
}
```

### Revoke License

```
DELETE /api/v1/license/:licenseKey
```

Revokes an existing license.

**Response:**
```json
{
  "success": true,
  "message": "License revoked successfully"
}
```

## Development

### Prerequisites

- Node.js (v18 or later)
- npm
- Cloudflare account (for deployment)

### Setup

```bash
# Install dependencies
npm install

# Generate Cloudflare type definitions
npm run cf-typegen
```

### Running Locally

```bash
# Start development server
npm run dev

# The service will be available at http://localhost:8787
```

### Testing

```bash
# Run tests
npm test
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Architecture

### Project Structure

```
├── src/
│   ├── index.ts              # Main worker entry point
│   ├── router.ts             # HTTP router implementation
│   ├── services/
│   │   └── license-service.ts # License business logic
│   ├── types/
│   │   └── license.ts        # TypeScript type definitions
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   └── cors.ts           # CORS middleware
│   └── utils/
│       └── response.ts       # Response helpers
├── test/
│   └── index.spec.ts         # Test suite
├── wrangler.jsonc            # Cloudflare Workers configuration
└── package.json
```

### Technology Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest with Cloudflare Workers pool
- **Build Tool**: Wrangler 4

## Configuration

The service is configured via `wrangler.jsonc`. Key configuration options:

- `compatibility_date`: Cloudflare Workers compatibility date
- `nodejs_compat`: Node.js compatibility flag enabled
- `observability`: Observability features enabled

### Environment Variables

Environment variables and bindings can be configured in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "MY_VARIABLE": "value"
  }
}
```

### Bindings

To add database storage (recommended for production):

**D1 Database:**
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "gsmflow-licenses",
      "database_id": "your-database-id"
    }
  ]
}
```

**KV Namespace:**
```jsonc
{
  "kv_namespaces": [
    {
      "binding": "LICENSES",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

## Next Steps

### TODO: Implementation Tasks

1. **Database Integration**
   - Add D1 or KV binding for license storage
   - Implement persistent storage in `LicenseService`

2. **Authentication**
   - Implement JWT or API key authentication
   - Protect sensitive endpoints with auth middleware

3. **License Key Generation**
   - Enhance license key generation with cryptographic security
   - Add checksum validation

4. **Expiration Handling**
   - Implement automatic expiration checking
   - Add scheduled task for expired license cleanup

5. **Rate Limiting**
   - Add rate limiting middleware
   - Protect against abuse

6. **Logging & Monitoring**
   - Add structured logging
   - Integrate with Cloudflare Analytics

7. **Webhook Support**
   - Add webhook notifications for license events
   - Support customer systems integration

## License

Private - All rights reserved
