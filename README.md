# GSMFlow License Authority

A production-ready Cloudflare Workers service for managing and validating software licenses using ED25519 cryptographic signatures.

## Features

- **ED25519 Cryptographic Signing** - Real asymmetric crypto for license validation
- **D1 Database Integration** - Persistent storage with migrations
- **KV Cache Layer** - Revocation cache with TTL for performance
- **HMAC-SHA256 Authentication** - Secure request signing
- **Rate Limiting** - KV-based distributed limiting
- **Complete API** - Issue, validate, revoke licenses
- **Security Hardened** - Fail-closed, input validation, audit logging

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     GSMFlow License Authority                   │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  ED25519    │    │  D1 DB      │    │  KV Cache       │  │
│  │  Crypto     │    │  (Persistent)│    │  (Revocations) │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     API Endpoints                       │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │  POST /authority/issue      - Issue new license         │  │
│  │  POST /authority/validate   - Validate license          │  │
│  │  POST /authority/revoke     - Revoke license            │  │
│  │  GET  /authority/public-key - Get public key            │  │
│  │  GET  /health               - Health check              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     Security Layers                     │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │  • HMAC-SHA256 Authentication                            │  │
│  │  • Rate Limiting (100 req/min)                           │  │
│  │  • Security Headers (CSP, HSTS, etc.)                    │  │
│  │  • Input Validation                                      │  │
│  │  • Audit Logging                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Setup

### Prerequisites

- Node.js 18+
- Cloudflare Workers CLI (`wrangler`)
- Cloudflare account

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env` and fill in the values
2. Set up D1 database:

```bash
./scripts/setup-d1.sh
```

3. Set up KV namespace:

```bash
./scripts/setup-kv.sh
```

4. Run migrations:

```bash
./scripts/migrate.sh
```

5. Deploy:

```bash
./scripts/deploy.sh
```

## API Documentation

See [API.md](docs/API.md) for complete API documentation.

## Security

See [SECURITY.md](docs/SECURITY.md) for security details and key rotation procedures.

## Development

### Running Tests

```bash
npm test
```

### Running with Coverage

```bash
npm run test:coverage
```

### Type Checking

```bash
npm run typecheck
```

### Local Development

```bash
npm run dev
```

## License

MIT © GSMFlow