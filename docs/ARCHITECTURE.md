# GSMFlow License Authority Architecture

## Overview

The GSMFlow License Authority is a Cloudflare Workers-based service that provides secure, scalable license management using modern cryptographic techniques and distributed systems patterns.

## Security Model

### Fail-Closed Principle

The system follows a **fail-closed** security model:
- Any error condition results in denied access (403/500, never 200)
- Authentication failures are final
- Database errors result in service denial
- Network issues result in service denial

### Threat Model

**Assets Protected:**
- License validity and authenticity
- Tenant entitlements
- Feature access control
- Domain restrictions

**Threats Mitigated:**

| Threat | Mitigation |
|--------|------------|
| License forgery | ED25519 digital signatures |
| License tampering | Cryptographic signature verification |
| Replay attacks | Request timestamps with tolerance window |
| Brute force | Rate limiting (100 req/min) |
| Unauthorized access | HMAC-SHA256 request signing |
| Domain spoofing | Strict domain validation with wildcard support |
| Clock skew | ±5 minute timestamp tolerance |
| Cache poisoning | Signed cache invalidation |
| SQL injection | Prepared statements only |
| XSS attacks | CSP headers, output encoding |
| CSRF attacks | Custom authentication headers |

## Cryptographic Design

### ED25519 Digital Signatures

- **Algorithm:** Ed25519 (EdDSA over Curve25519)
- **Key Size:** 256-bit private key, 256-bit public key
- **Signature Size:** 512-bit (64 bytes)
- **Security Level:** ~128-bit security
- **Implementation:** Web Crypto API (no external dependencies)

**Key Management:**
- Private key derived from environment secret using PBKDF2
- Public key exported in PEM format for client validation
- Key rotation supported via environment variable updates

**Signature Process:**
1. Create license payload (JSON)
2. Stringify payload (canonical JSON)
3. Sign with ED25519 private key
4. Base64 encode signature
5. Store signature in payload

**Verification Process:**
1. Extract signature from payload
2. Reconstruct payload without signature
3. Stringify payload (same canonical format)
4. Verify with ED25519 public key
5. Check signature validity

## Data Flow

### License Issuance

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│             │    │             │    │                 │
│   Client    │───▶│  Auth       │───▶│  Rate Limiter    │
│             │    │  Middleware │    │                 │
└─────────────┘    └─────────────┘    └─────────────────┘
       │                 │                         │
       │                 │                         │
       ▼                 ▼                         ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│             │    │             │    │                 │
│  Request    │    │  Validate   │    │  Check Limit    │
│  Parsing    │    │  Signature  │    │                 │
└─────────────┘    └─────────────┘    └─────────────────┘
       │                 │                         │
       │                 └─────────────┬─────────────┘
       │                               ▼
       ▼                     ┌─────────────────┐
┌─────────────┐              │                 │
│             │              │  License        │
│  Generate    │◀────────────│  Service        │
│  Payload     │              │                 │
└─────────────┘              └─────────────────┘
       │                               │
       ▼                               ▼
┌─────────────┐              ┌─────────────────┐
│             │              │                 │
│  ED25519    │              │  D1 Database    │
│  Signing    │              │  (Persistent)   │
└─────────────┘              └─────────────────┘
       │                               │
       └───────────────────────┬───────────────┘
                               ▼
                      ┌─────────────────┐
                      │                 │
                      │  Audit Logging  │
                      │                 │
                      └─────────────────┘
```

### License Validation

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│             │    │             │    │                 │
│   Client    │───▶│  Auth       │───▶│  Rate Limiter    │
│             │    │  Middleware │    │                 │
└─────────────┘    └─────────────┘    └─────────────────┘
       │                 │                         │
       ▼                 ▼                         ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│             │    │             │    │                 │
│  Request    │    │  Validate   │    │  Check Limit    │
│  Parsing    │    │  Signature  │    │                 │
└─────────────┘    └─────────────┘    └─────────────────┘
       │                 │                         │
       │                 └─────────────┬─────────────┘
       │                               ▼
       ▼                     ┌─────────────────┐
┌─────────────┐              │                 │
│             │              │  License        │
│  Verify      │◀────────────│  Service        │
│  Signature   │              │                 │
└─────────────┘              └─────────────────┘
       │                               │
       ▼                               ▼
┌─────────────┐              ┌─────────────────┐
│             │              │                 │
│  Check      │              │  KV Cache       │
│  Expiration  │              │  (Revocations)  │
└─────────────┘              └─────────────────┘
       │                               │
       └───────────────────────┬───────────────┘
                               ▼
                      ┌─────────────────┐
                      │                 │
                      │  Domain         │
                      │  Validation     │
                      │                 │
                      └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │                 │
                      │  Return         │
                      │  Validation     │
                      │  Result         │
                      │                 │
                      └─────────────────┘
```

## Storage Architecture

### D1 Database Schema

**Licenses Table:**
```sql
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL CHECK(plan_id IN ('starter', 'pro', 'enterprise')),
  allowed_domains TEXT NOT NULL, -- JSON array
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  grace_days INTEGER NOT NULL,
  feature_flags TEXT NOT NULL, -- JSON object
  signature TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Revocations Table:**
```sql
CREATE TABLE revocations (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  revoked_at INTEGER NOT NULL,
  revoked_by TEXT NOT NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
);
```

**Audit Logs Table:**
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK(action IN ('LICENSE_ISSUED', 'LICENSE_REVOKED', 'LICENSE_VALIDATED', 'AUTH_FAILURE')),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('license', 'revocation')),
  performed_by TEXT NOT NULL,
  performed_at INTEGER NOT NULL,
  metadata TEXT NOT NULL -- JSON object
);
```

### KV Cache Layer

**Cache Structure:**
- `revocations`: Array of revoked license IDs
- TTL: 5 minutes (300 seconds)
- Fallback: Direct D1 query if KV unavailable
- Invalidation: On revocation operations

**Cache Strategy:**
- Write-through on revocation
- Read-through with TTL
- Prefetch on worker startup
- Lazy loading on cache miss

## Performance Characteristics

### Read Operations

| Operation | Cache Hit | Cache Miss | Notes |
|-----------|-----------|------------|-------|
| Validate License | ~1ms | ~10-50ms | Includes signature verification |
| Check Revocation | ~1ms | ~10-30ms | KV cache vs D1 query |
| Get Public Key | ~1ms | ~1ms | No database access |

### Write Operations

| Operation | Duration | Notes |
|-----------|----------|-------|
| Issue License | ~50-100ms | Includes signing and DB write |
| Revoke License | ~30-80ms | Includes cache invalidation |
| Audit Log | ~10-20ms | Simple insert |

### Throughput

- **Max Requests:** ~10,000 RPS (Cloudflare Workers limit)
- **Sustainable:** ~1,000-2,000 RPS with current rate limits
- **Database:** D1 can handle ~10,000 QPS
- **Cache:** KV can handle ~100,000+ QPS

## Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Cloudflare Global Network                  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │             │    │             │    │                 │  │
│  │  Worker     │    │  D1         │    │  KV             │  │
│  │  (Stateless)│    │  Database   │    │  Cache         │  │
│  │             │    │  (Multi-    │    │  (Global)      │  │
│  └─────────────┘    │  Region)    │    └─────────────────┘  │
│                     └─────────────┘                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     Edge Locations                      │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │  • 250+ cities worldwide                                 │  │
│  │  • Automatic failover                                    │  │
│  │  • DDoS protection                                       │  │
│  │  • Global load balancing                                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Failure Modes & Recovery

### Database Failure

**Scenario:** D1 database unavailable
**Impact:** All write operations fail, reads fall back to cache
**Recovery:** Automatic retry, manual intervention if prolonged
**Mitigation:** Circuit breakers, retry logic, cache fallback

### Cache Failure

**Scenario:** KV namespace unavailable
**Impact:** Increased latency for revocation checks
**Recovery:** Automatic fallback to D1 queries
**Mitigation:** Graceful degradation, TTL-based fallback

### Authentication Failure

**Scenario:** Invalid or missing authentication
**Impact:** Request rejected with 401
**Recovery:** Client must provide valid credentials
**Mitigation:** Clear error messages, rate limiting

### Rate Limit Exceeded

**Scenario:** Too many requests from single client
**Impact:** Requests rejected with 429 and Retry-After header
**Recovery:** Client waits and retries
**Mitigation:** Sliding window algorithm, per-token limits

## Monitoring & Observability

### Metrics Collected

- Request count by endpoint
- Authentication success/failure
- Rate limit hits
- Database query latency
- Cache hit/miss ratio
- License issuance/revocation counts
- Error rates by type

### Logging

- Structured JSON logs
- Request IDs for tracing
- Audit logs for sensitive operations
- No sensitive data in logs
- Retention: 30 days

### Alerting

- High error rates
- Authentication failures
- Database latency spikes
- Cache miss rate increases
- Rate limit violations

## Compliance

### Data Protection

- No PII stored in licenses
- Tenant IDs are opaque identifiers
- All data encrypted in transit (TLS 1.2+)
- Data encrypted at rest (Cloudflare default)

### Audit Trail

- All license operations logged
- Immutable audit log entries
- Timestamped with server time
- Retained for compliance periods

### Key Management

- Private keys never leave Cloudflare
- Key rotation supported
- Public keys can be exported for client validation
- No key material in logs or errors

## Future Enhancements

1. **Multi-signature support** for enterprise licenses
2. **License chaining** for hierarchical permissions
3. **Time-based tokens** for temporary access
4. **IP restriction** support
5. **Usage metering** integration
6. **Automatic key rotation** with overlap period
7. **Distributed tracing** for debugging
8. **Metrics export** to Prometheus/Grafana