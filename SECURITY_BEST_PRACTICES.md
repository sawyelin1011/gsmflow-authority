# Security Best Practices

Comprehensive security guide for the License Authority system.

## Table of Contents

1. [Threat Model](#threat-model)
2. [Cryptographic Security](#cryptographic-security)
3. [API Security](#api-security)
4. [Network Security](#network-security)
5. [Operational Security](#operational-security)
6. [Incident Response](#incident-response)

## Threat Model

### Assumptions

**Trusted**:
- License Authority (Cloudflare Workers)
- Your backend services (billing, provisioning)
- Cloudflare infrastructure

**Untrusted**:
- Customer-hosted GSMFlow instances
- Customer networks
- End users
- Public internet

### Attack Scenarios

#### 1. License Forgery
**Attack**: Attacker creates fake license with desired features

**Mitigation**:
- ✅ ED25519 signatures (cannot forge without private key)
- ✅ Private key stored only in Cloudflare Secret
- ✅ Public key embedded in application (read-only)

**Result**: **PREVENTED** - Signature verification fails

#### 2. License Tampering
**Attack**: Attacker modifies existing license (change expiry, features)

**Mitigation**:
- ✅ Signature covers entire payload
- ✅ Any modification invalidates signature
- ✅ Canonical JSON serialization (sorted keys)

**Result**: **PREVENTED** - Signature verification fails

#### 3. License Sharing
**Attack**: Customer shares license with other domains

**Mitigation**:
- ✅ Domain binding (license tied to specific domains)
- ✅ Verified on every request
- ✅ Wildcard support for legitimate subdomains

**Result**: **PREVENTED** - Domain verification fails

#### 4. Replay Attacks
**Attack**: Attacker intercepts and replays API requests

**Mitigation**:
- ✅ HMAC includes timestamp
- ✅ 5-minute validity window
- ✅ Timestamp checked on server

**Result**: **PREVENTED** - Expired timestamp rejected

#### 5. Man-in-the-Middle
**Attack**: Attacker intercepts license during transmission

**Mitigation**:
- ✅ HTTPS only (TLS 1.3)
- ✅ License is signed (tampering detected)
- ✅ HMAC prevents request modification

**Result**: **MITIGATED** - Tampering detected, but license visible

#### 6. DDoS on Authority
**Attack**: Attacker floods License Authority with requests

**Mitigation**:
- ✅ Offline verification (no per-request validation)
- ✅ Cloudflare DDoS protection
- ✅ Rate limiting on all endpoints

**Result**: **MITIGATED** - GSMFlow continues working offline

#### 7. Revocation Bypass
**Attack**: Customer blocks revocation sync to keep using revoked license

**Mitigation**:
- ⚠️  Periodic sync (not enforced per-request)
- ✅ Expiry enforcement (license eventually expires)
- ✅ Grace period limits damage window

**Result**: **PARTIALLY MITIGATED** - Limited by expiry date

#### 8. Private Key Compromise
**Attack**: Attacker gains access to private key

**Mitigation**:
- ✅ Key stored as Cloudflare Secret (encrypted at rest)
- ✅ No key export functionality
- ✅ Key rotation procedure available
- ✅ Audit logging of all operations

**Result**: **CRITICAL** - Requires immediate key rotation

## Cryptographic Security

### ED25519 Signatures

**Why ED25519?**
- Fast verification (critical for offline operation)
- Small signatures (256 bits)
- Quantum-resistant candidate
- No known vulnerabilities

**Key Management**:
```typescript
// ✅ GOOD: Private key in Cloudflare Secret
const privateKey = env.LICENSE_PRIVATE_KEY;

// ❌ BAD: Private key in code
const privateKey = "MC4CAQAwBQYDK2VwBCIEI...";

// ❌ BAD: Private key in environment variable (visible in logs)
const privateKey = process.env.PRIVATE_KEY;
```

**Signature Verification**:
```typescript
// ✅ GOOD: Verify before using license
const isValid = await verifySignature(license);
if (!isValid) throw new Error("Invalid signature");

// ❌ BAD: Skip verification
const license = JSON.parse(licenseJson);
// Use license without verification
```

### HMAC Authentication

**Why HMAC-SHA256?**
- Symmetric (faster than asymmetric)
- Widely supported
- Proven security

**Secret Management**:
```typescript
// ✅ GOOD: Secret in environment variable
const secret = process.env.LICENSE_AUTHORITY_SECRET;

// ❌ BAD: Secret in code
const secret = "my-secret-key";

// ❌ BAD: Secret in database (accessible to attackers)
const secret = await db.secrets.findFirst();
```

**Timestamp Validation**:
```typescript
// ✅ GOOD: Check timestamp window
const now = Math.floor(Date.now() / 1000);
if (Math.abs(now - timestamp) > 300) {
  throw new Error("Timestamp expired");
}

// ❌ BAD: No timestamp check
// Allows replay attacks
```

## API Security

### Authentication

**Protected Endpoints**:
- `/authority/license/issue` - HMAC required
- `/authority/license/revoke` - HMAC required

**Public Endpoints**:
- `/authority/public-key` - No auth (public data)
- `/authority/revocations/sync` - No auth (rate-limited)

**Implementation**:
```typescript
// ✅ GOOD: Check auth before processing
const authError = await authenticate(request, env);
if (authError) return authError;

// Process request...

// ❌ BAD: Process before auth
const result = await processRequest(request);
const authError = await authenticate(request, env);
```

### Rate Limiting

**Per-License Rate Limiting**:
```typescript
// ✅ GOOD: Rate limit by license ID
const key = `sync:${licenseId}`;
const rateLimitError = checkRateLimit(key, 1, 3600);

// ❌ BAD: No rate limiting
// Allows abuse
```

**Per-IP Rate Limiting**:
```typescript
// ✅ GOOD: Rate limit by IP for protected endpoints
const ip = request.headers.get("CF-Connecting-IP");
const key = `authority:${ip}`;
const rateLimitError = checkRateLimit(key, 100, 60);

// ❌ BAD: Unlimited requests
// Allows DDoS
```

### Input Validation

**UUID Validation**:
```typescript
// ✅ GOOD: Validate UUID format
if (!isValidUUID(tenantId)) {
  return errorResponse("Invalid tenant_id format", "INVALID_TENANT_ID");
}

// ❌ BAD: No validation
// Allows SQL injection, path traversal
```

**Domain Validation**:
```typescript
// ✅ GOOD: Validate domain format
for (const domain of allowedDomains) {
  if (!isValidDomain(domain)) {
    throw new Error(`Invalid domain: ${domain}`);
  }
}

// ❌ BAD: No validation
// Allows malicious domains
```

## Network Security

### HTTPS Only

**Enforcement**:
```typescript
// ✅ GOOD: Enforce HTTPS
if (request.url.startsWith("http://")) {
  return new Response("HTTPS required", { status: 403 });
}

// ❌ BAD: Allow HTTP
// Exposes licenses and secrets
```

### CORS Configuration

**Restrictive CORS**:
```typescript
// ✅ GOOD: No CORS (internal API)
// No Access-Control-Allow-Origin header

// ❌ BAD: Permissive CORS
headers.set("Access-Control-Allow-Origin", "*");
// Allows unauthorized access
```

### Request Timeouts

**Client-Side Timeouts**:
```typescript
// ✅ GOOD: Set timeout
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
const response = await fetch(url, { signal: controller.signal });

// ❌ BAD: No timeout
// Hangs indefinitely
```

## Operational Security

### Secret Rotation

**HMAC Secret Rotation** (Every 90 days):

1. Generate new secret:
```bash
openssl rand -base64 32
```

2. Store as new secret:
```bash
wrangler secret put HMAC_SECRET_NEW
```

3. Update code to check both secrets:
```typescript
const isValid = 
  await verifyHMAC(authHeader, method, path, body, env.HMAC_SECRET) ||
  await verifyHMAC(authHeader, method, path, body, env.HMAC_SECRET_NEW);
```

4. Update all clients to use new secret

5. Remove old secret:
```bash
wrangler secret delete HMAC_SECRET
wrangler secret put HMAC_SECRET # Use new value
wrangler secret delete HMAC_SECRET_NEW
```

**Private Key Rotation** (Emergency only):

1. Generate new keypair:
```bash
npm run setup:keys
```

2. Store new private key:
```bash
wrangler secret put LICENSE_PRIVATE_KEY_NEW
```

3. Store new public key in KV:
```bash
wrangler kv:key put --binding=REVOCATIONS "public_key:v2" "NEW_PUBLIC_KEY"
```

4. Update code to support both keys:
```typescript
const publicKey = license.key_id === "v2" 
  ? await getPublicKey(env.REVOCATIONS, "v2")
  : await getPublicKey(env.REVOCATIONS, "v1");
```

5. Re-issue all licenses with new key

6. Remove old key after all licenses migrated

### Audit Logging

**What to Log**:
- ✅ All license issuances
- ✅ All revocations
- ✅ Failed authentication attempts
- ✅ Rate limit violations
- ✅ Signature verification failures

**What NOT to Log**:
- ❌ HMAC secrets
- ❌ Private keys
- ❌ Full license payloads (contains sensitive data)

**Implementation**:
```typescript
// ✅ GOOD: Log security events
await logAudit(
  env.DB,
  "license_issued",
  "system",
  tenantId,
  licenseId,
  { plan_id: planId }
);

// ❌ BAD: Log secrets
console.log("HMAC secret:", env.HMAC_SECRET);
```

### Monitoring

**Metrics to Track**:
- License issuance rate
- Revocation rate
- Failed authentication rate
- Rate limit violations
- API latency
- Error rate

**Alerts to Configure**:
- Spike in failed auth attempts (> 10/minute)
- Spike in revocations (> 5/hour)
- High error rate (> 5%)
- Slow API responses (> 1 second)
- D1 or KV failures

### Backup and Recovery

**What to Backup**:
- ✅ D1 database (automatic on migration)
- ✅ Private key (offline, encrypted)
- ✅ HMAC secret (offline, encrypted)
- ✅ Public key (multiple copies)

**Recovery Procedure**:

1. **Private Key Lost**:
   - Generate new keypair
   - Re-issue all licenses
   - Update all GSMFlow instances

2. **HMAC Secret Lost**:
   - Generate new secret
   - Update all clients
   - Rotate immediately

3. **D1 Database Lost**:
   - Restore from backup
   - Verify data integrity
   - Re-sync revocations to KV

## Incident Response

### Security Incident Types

#### 1. Private Key Compromise

**Indicators**:
- Unauthorized licenses issued
- Licenses with invalid tenant IDs
- Unusual issuance patterns

**Response**:
1. Immediately rotate private key
2. Revoke all suspicious licenses
3. Audit all recent issuances
4. Notify affected customers
5. Update all GSMFlow instances with new public key

#### 2. HMAC Secret Compromise

**Indicators**:
- Unauthorized API calls
- Failed auth attempts from unknown IPs
- Unusual request patterns

**Response**:
1. Immediately rotate HMAC secret
2. Update all authorized clients
3. Review audit logs for unauthorized operations
4. Revoke any licenses issued by attacker

#### 3. License Sharing

**Indicators**:
- Same license used on multiple domains
- Unusual traffic patterns
- Customer reports

**Response**:
1. Verify domain binding violations
2. Revoke shared license
3. Contact customer
4. Issue new license with correct domains

#### 4. DDoS Attack

**Indicators**:
- High request rate
- Slow API responses
- Cloudflare DDoS alerts

**Response**:
1. Verify Cloudflare DDoS protection active
2. Increase rate limits if needed
3. Monitor GSMFlow instances (should work offline)
4. Investigate attack source

### Incident Response Checklist

- [ ] Identify incident type
- [ ] Assess impact and scope
- [ ] Contain the incident (rotate keys, revoke licenses)
- [ ] Investigate root cause
- [ ] Remediate vulnerabilities
- [ ] Notify affected parties
- [ ] Document incident
- [ ] Update procedures
- [ ] Conduct post-mortem

### Contact Information

**Security Team**:
- Email: security@gsmflow.com
- PGP Key: [key fingerprint]
- Emergency: [phone number]

**Cloudflare Support**:
- Dashboard: https://dash.cloudflare.com
- Support: https://support.cloudflare.com

## Compliance

### Data Protection

**Personal Data**:
- Tenant IDs (pseudonymous)
- Domain names (may be personal)
- Audit logs (contains IP addresses)

**GDPR Compliance**:
- Right to access: Provide audit logs
- Right to erasure: Delete tenant data
- Right to portability: Export license data

### Audit Requirements

**SOC 2 Compliance**:
- Audit logging enabled
- Access controls enforced
- Encryption at rest and in transit
- Regular security reviews

**ISO 27001 Compliance**:
- Risk assessment documented
- Security policies defined
- Incident response procedures
- Regular audits conducted

## Security Checklist

### Development

- [ ] Private key never in code
- [ ] HMAC secret never in code
- [ ] All inputs validated
- [ ] All errors handled
- [ ] Audit logging implemented
- [ ] Rate limiting configured
- [ ] HTTPS enforced
- [ ] Timeouts set

### Deployment

- [ ] Secrets stored in Cloudflare
- [ ] Public key in KV
- [ ] D1 migrations applied
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Backup procedures tested
- [ ] Incident response plan documented

### Operations

- [ ] Rotate HMAC secret every 90 days
- [ ] Review audit logs weekly
- [ ] Monitor security alerts
- [ ] Update dependencies monthly
- [ ] Conduct security reviews quarterly
- [ ] Test incident response annually

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security](https://www.cloudflare.com/security/)
- [ED25519 Specification](https://ed25519.cr.yp.to/)
- [HMAC RFC 2104](https://tools.ietf.org/html/rfc2104)
