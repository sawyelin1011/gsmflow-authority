# GSMFlow License Authority - Security Documentation

## Security Overview

The GSMFlow License Authority implements a **defense-in-depth** security model with multiple layers of protection to ensure the integrity and authenticity of software licenses.

## Cryptographic Security

### ED25519 Digital Signatures

**Algorithm Choice:**
- **Ed25519** (EdDSA over Curve25519) was chosen for its:
  - Strong security (~128-bit security level)
  - Fast verification performance
  - Small signature size (64 bytes)
  - Resistance to side-channel attacks
  - Standardized and widely audited

**Implementation:**
- Uses Web Crypto API (no external dependencies)
- Private keys are never exported in plaintext
- Public keys are exportable for client validation

**Key Generation:**
```typescript
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'Ed25519',
    namedCurve: 'Ed25519',
  },
  true, // extractable
  ['sign', 'verify']
);
```

### Key Management

**Private Key Protection:**
- Derived from environment secret using PBKDF2
- 100,000 iterations for key derivation
- SHA-256 as the underlying hash function
- Never stored in plaintext
- Never logged or exposed in errors

**Public Key Distribution:**
- Exported in PEM format for client use
- Can be cached by clients
- Rotated independently of private keys

**Key Rotation Process:**
1. Generate new key pair
2. Update environment variables
3. Deploy new worker version
4. Clients fetch new public key
5. Old keys remain valid during transition period

## Authentication

### HMAC-SHA256 Request Signing

**Authentication Flow:**
1. Client generates request with timestamp
2. Client signs `method:path:timestamp:body` with shared secret
3. Client sends signature in `X-Auth-Signature` header
4. Server verifies signature using same shared secret
5. Server validates timestamp (±5 minute tolerance)

**Security Properties:**
- Prevents replay attacks (timestamp validation)
- Prevents request tampering (HMAC verification)
- Prevents credential leakage (no plaintext secrets)
- Rate-limited to prevent brute force

**Example Signature Generation:**
```javascript
const signedData = `${method}:${path}:${timestamp}:${body}`;
const hmac = crypto.createHmac('sha256', secret);
hmac.update(signedData);
const signature = hmac.digest('base64');
```

### Shared Secret Management

**Best Practices:**
- Generate strong random secrets (32+ characters)
- Rotate secrets periodically (90 days recommended)
- Store in Cloudflare Workers Secrets
- Never commit to version control
- Use different secrets for different environments

**Secret Rotation:**
1. Generate new secret
2. Update all clients with new secret
3. Update worker with new secret
4. Deploy worker
5. Monitor for authentication failures
6. Decommission old secret after transition

## Authorization

### License Validation Process

**Validation Steps:**
1. **Signature Verification** - Ensure license hasn't been tampered with
2. **Revocation Check** - Ensure license hasn't been revoked
3. **Domain Validation** - Ensure requesting domain is allowed
4. **Expiration Check** - Ensure license is still valid (including grace period)
5. **Structure Validation** - Ensure all required fields are present

**Fail-Closed Behavior:**
- Any validation failure results in `valid: false`
- Errors are not exposed to clients
- All failures are logged for audit

### Domain Validation

**Supported Patterns:**
- Exact matches: `example.com`
- Wildcard subdomains: `*.example.com`
- Multiple domains per license

**Security Considerations:**
- Wildcards only match subdomains (not exact domain)
- Case-insensitive comparison
- No regex injection possible (simple string operations)
- Domain list is signed and cannot be tampered with

**Examples:**
- `example.com` matches `example.com` ✓
- `*.example.com` matches `sub.example.com` ✓
- `*.example.com` does NOT match `example.com` ✗
- `*.com` is NOT allowed (security restriction)

## Data Protection

### Database Security

**D1 Database Protections:**
- Prepared statements only (no SQL injection)
- No raw SQL queries
- Parameterized queries for all operations
- Read-only access for validation operations
- Write access restricted to specific endpoints

**Schema Design:**
- Primary keys on all tables
- Foreign key constraints
- Data type validation
- CHECK constraints for enums

### Cache Security

**KV Cache Protections:**
- TTL-based expiration (5 minutes)
- Signed cache invalidation
- Fallback to database on cache miss
- No sensitive data stored in cache
- Cache keys are opaque identifiers

## Network Security

### Transport Security

- **TLS 1.2+** required for all connections
- **HSTS** header enforced (1 year)
- **Secure cookies** if used
- **CSP headers** to prevent XSS
- **No mixed content** allowed

### Security Headers

**Applied to All Responses:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

## Operational Security

### Rate Limiting

**Implementation:**
- Sliding window algorithm
- Per-token rate limits (100 requests/minute default)
- Distributed counter using KV storage
- `Retry-After` header on rate limit exceeded

**Security Benefits:**
- Prevents brute force attacks
- Mitigates DDoS attempts
- Fair resource allocation
- Graceful degradation under load

### Audit Logging

**Logged Operations:**
- License issuance
- License revocation
- License validation attempts
- Authentication failures

**Log Format:**
```json
{
  "requestId": "uuid",
  "timestamp": 1234567890,
  "action": "LICENSE_ISSUED",
  "method": "POST",
  "path": "/authority/issue",
  "userAgent": "client/1.0"
}
```

**Log Protection:**
- No sensitive data in logs
- No PII collected
- Logs retained for 30 days
- Access controlled via Cloudflare

### Error Handling

**Fail-Closed Principles:**
- Any error → denied access
- Database errors → 500 error
- Authentication errors → 401 error
- Validation errors → 400 error
- No internal details exposed

**Error Response Format:**
```json
{
  "error": "Unauthorized"
}
```

## Threat Mitigation

### Common Threats & Mitigations

| Threat | Mitigation |
|--------|------------|
| **License Forgery** | ED25519 signatures, public key validation |
| **License Tampering** | Cryptographic signature verification |
| **Replay Attacks** | Request timestamps with ±5 minute tolerance |
| **Brute Force** | Rate limiting (100 req/min), account lockout |
| **Unauthorized Access** | HMAC-SHA256 request signing |
| **Domain Spoofing** | Strict domain validation with wildcard support |
| **Clock Skew** | ±5 minute timestamp tolerance window |
| **Cache Poisoning** | Signed cache invalidation, TTL expiration |
| **SQL Injection** | Prepared statements only, no raw SQL |
| **XSS Attacks** | CSP headers, output encoding |
| **CSRF Attacks** | Custom authentication headers, no session cookies |
| **DDoS Attacks** | Cloudflare DDoS protection, rate limiting |
| **Man-in-the-Middle** | TLS 1.2+, HSTS headers |
| **Credential Stuffing** | Strong authentication, rate limiting |

## Compliance

### Data Privacy

- **No PII Collected:** Only opaque tenant IDs and license IDs
- **Minimal Data:** Only what's necessary for license validation
- **Data Retention:** 30 days for logs, indefinite for licenses
- **Data Access:** Restricted to authorized personnel only

### Security Standards

- **OWASP Top 10:** All critical risks addressed
- **CWE/SANS Top 25:** Major vulnerabilities mitigated
- **NIST Guidelines:** Follows cryptographic best practices
- **GDPR:** No personal data processed
- **CCPA:** No personal data collected

## Incident Response

### Security Incident Procedures

1. **Detection:** Monitor for unusual activity patterns
2. **Containment:** Isolate affected systems
3. **Eradication:** Remove malicious code/access
4. **Recovery:** Restore from known-good state
5. **Analysis:** Determine root cause and impact
6. **Communication:** Notify affected parties if necessary
7. **Prevention:** Implement measures to prevent recurrence

### Compromise Indicators

- Unusual authentication failure patterns
- Sudden spike in validation requests
- Multiple revocations from same IP
- License issuance from unexpected domains
- Cache hit ratio anomalies

## Key Rotation Guide

### Private Key Rotation

**When to Rotate:**
- Suspected compromise
- Every 12-24 months (routine)
- After major security incidents

**Rotation Process:**

1. **Prepare New Keys:**
   ```bash
   # Generate new key pair
   openssl genpkey -algorithm ED25519 -out private_key.pem
   openssl pkey -in private_key.pem -pubout -out public_key.pem
   
   # Convert to base64
   base64 -i private_key.pem
   base64 -i public_key.pem
   ```

2. **Update Environment:**
   ```bash
   # Update wrangler.jsonc or environment variables
   wrangler secret put ED25519_PRIVATE_KEY
   wrangler secret put ED25519_PUBLIC_KEY
   ```

3. **Deploy New Worker:**
   ```bash
   npm run deploy
   ```

4. **Client Transition:**
   - Clients fetch new public key from `/authority/public-key`
   - Old keys remain valid during transition period
   - Monitor for validation failures

5. **Decommission Old Keys:**
   - After all clients have transitioned
   - Remove old keys from environment
   - Update documentation

### Shared Secret Rotation

**When to Rotate:**
- Suspected compromise
- Every 90 days (routine)
- After employee turnover

**Rotation Process:**

1. **Generate New Secret:**
   ```bash
   # Generate strong random secret
   openssl rand -base64 32
   ```

2. **Update Clients First:**
   - Distribute new secret to all clients
   - Ensure clients can use both old and new secrets temporarily

3. **Update Worker:**
   ```bash
   wrangler secret put AUTH_SHARED_SECRET
   npm run deploy
   ```

4. **Monitor Transition:**
   - Watch for authentication failures
   - Assist clients with migration issues

5. **Decommission Old Secret:**
   - After all clients have transitioned
   - Remove old secret from worker
   - Update documentation

## Security Checklist

### Pre-Deployment

- [ ] Generate strong ED25519 key pair
- [ ] Generate strong shared secret
- [ ] Configure D1 database with proper schema
- [ ] Configure KV namespace for caching
- [ ] Set appropriate rate limits
- [ ] Enable all security headers
- [ ] Configure audit logging
- [ ] Test fail-closed behavior
- [ ] Test authentication mechanisms
- [ ] Test rate limiting
- [ ] Test signature verification
- [ ] Test domain validation
- [ ] Test revocation process
- [ ] Test cache invalidation
- [ ] Test error handling

### Post-Deployment

- [ ] Monitor authentication success/failure rates
- [ ] Monitor rate limit hits
- [ ] Monitor database performance
- [ ] Monitor cache hit/miss ratio
- [ ] Monitor error rates
- [ ] Set up alerts for unusual activity
- [ ] Document key rotation procedures
- [ ] Schedule routine key rotation
- [ ] Train staff on incident response
- [ ] Review logs regularly
- [ ] Update dependencies regularly
- [ ] Perform security audits

### Routine Maintenance

- [ ] Rotate keys every 12-24 months
- [ ] Rotate shared secrets every 90 days
- [ ] Review audit logs weekly
- [ ] Update dependencies monthly
- [ ] Test disaster recovery quarterly
- [ ] Perform security audit annually
- [ ] Review access controls semi-annually
- [ ] Test backup restoration annually

## Contact

For security issues, please contact:

**Security Team:** security@gsmflow.com
**PGP Key:** [Available upon request]
**Response Time:** 24 hours for critical issues

**Please do not create public issues for security vulnerabilities!**