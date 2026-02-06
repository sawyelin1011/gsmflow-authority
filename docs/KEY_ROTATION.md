# Key Rotation Guide for GSMFlow License Authority

## Overview

This guide provides step-by-step instructions for rotating cryptographic keys and authentication secrets in the GSMFlow License Authority system.

## Key Types

The system uses several types of keys that may need rotation:

1. **ED25519 Private Key** - Used for signing licenses
2. **ED25519 Public Key** - Used for verifying licenses (distributed to clients)
3. **HMAC Shared Secret** - Used for authenticating API requests

## ED25519 Key Rotation

### When to Rotate

- **Routine Rotation:** Every 12-24 months
- **Security Incident:** Immediate rotation if compromise suspected
- **Key Exposure:** If private key is accidentally exposed
- **Personnel Changes:** When cryptographic personnel change roles

### Preparation

1. **Generate New Key Pair:**

```bash
# Generate new ED25519 key pair
openssl genpkey -algorithm ED25519 -out private_key_new.pem
openssl pkey -in private_key_new.pem -pubout -out public_key_new.pem

# Convert to base64 for Cloudflare Workers
PRIVATE_KEY_BASE64=$(base64 -i private_key_new.pem | tr -d '\n')
PUBLIC_KEY_BASE64=$(base64 -i public_key_new.pem | tr -d '\n')

# Clean up temporary files
rm private_key_new.pem public_key_new.pem
```

2. **Document Current Keys:**
   - Record current key IDs and expiration dates
   - Note all systems using current keys
   - Identify all clients that need to update

### Rotation Process

#### Phase 1: Key Generation and Testing

1. **Create new key pair** (as shown above)
2. **Test signing with new keys:**
   ```typescript
   // Test in development environment
   const testPayload = { license_id: 'test', tenant_id: 'test' };
   const signature = await signData(JSON.stringify(testPayload), NEW_PRIVATE_KEY);
   const isValid = await verifySignature(JSON.stringify(testPayload), signature, NEW_PUBLIC_KEY);
   ```
3. **Verify compatibility** with existing clients

#### Phase 2: Worker Deployment

1. **Update environment variables:**
   ```bash
   # Add new keys to Cloudflare Workers Secrets
   echo "$PRIVATE_KEY_BASE64" | wrangler secret put ED25519_PRIVATE_KEY_NEW
   echo "$PUBLIC_KEY_BASE64" | wrangler secret put ED25519_PUBLIC_KEY_NEW
   ```

2. **Update worker code** to support multiple keys:
   ```typescript
   // Temporary: Support both old and new keys during transition
   async function verifySignatureWithFallback(data: string, signature: string): Promise<boolean> {
     // Try new key first
     const isValidNew = await verifySignature(data, signature, env.ED25519_PUBLIC_KEY_NEW);
     if (isValidNew) return true;
     
     // Fallback to old key
     const isValidOld = await verifySignature(data, signature, env.ED25519_PUBLIC_KEY);
     return isValidOld;
   }
   ```

3. **Deploy updated worker:**
   ```bash
   npm run deploy
   ```

#### Phase 3: Client Transition

1. **Notify clients** of upcoming key rotation:
   - Provide new public key
   - Set transition timeline (typically 30 days)
   - Offer migration assistance

2. **Update client SDKs:**
   ```javascript
   // Clients should fetch public key from API
   async function getPublicKey() {
     const response = await fetch('https://your-worker.dev/authority/public-key');
     return await response.text();
   }
   ```

3. **Monitor transition:**
   - Track usage of old vs new keys
   - Assist clients with migration issues
   - Extend timeline if needed

#### Phase 4: Old Key Decommission

1. **Verify all clients migrated:**
   - Check audit logs for old key usage
   - Confirm no validation failures
   - Verify all major clients updated

2. **Remove old key support:**
   ```typescript
   // Remove fallback to old key
   async function verifySignature(data: string, signature: string): Promise<boolean> {
     return await verifySignature(data, signature, env.ED25519_PUBLIC_KEY);
   }
   ```

3. **Remove old keys from environment:**
   ```bash
   wrangler secret delete ED25519_PRIVATE_KEY_OLD
   wrangler secret delete ED25519_PUBLIC_KEY_OLD
   ```

4. **Final deployment:**
   ```bash
   npm run deploy
   ```

### Post-Rotation Tasks

1. **Update documentation** with new key information
2. **Update monitoring** dashboards with new key metrics
3. **Review audit logs** for any issues during transition
4. **Schedule next rotation** (12-24 months in future)
5. **Document lessons learned** from rotation process

## HMAC Shared Secret Rotation

### When to Rotate

- **Routine Rotation:** Every 90 days
- **Security Incident:** Immediate rotation if compromise suspected
- **Secret Exposure:** If shared secret is accidentally exposed
- **Personnel Changes:** When personnel with secret access change roles

### Preparation

1. **Generate New Secret:**
   ```bash
   # Generate strong random secret (32+ bytes)
   openssl rand -base64 32
   ```

2. **Document Current Usage:**
   - List all clients using current secret
   - Identify integration points
   - Note any special configurations

### Rotation Process

#### Phase 1: Secret Generation

1. **Generate new secret:**
   ```bash
   NEW_SECRET=$(openssl rand -base64 32)
   echo "New secret: $NEW_SECRET"
   ```

2. **Test authentication** with new secret:
   ```javascript
   // Test client authentication
   const testSignature = signRequest('GET', '/health', Date.now(), '', NEW_SECRET);
   const response = await fetch('/health', {
     headers: {
       'X-Auth-Token': NEW_SECRET,
       'X-Auth-Timestamp': Date.now().toString(),
       'X-Auth-Signature': testSignature
     }
   });
   ```

#### Phase 2: Client Update

1. **Distribute new secret** to all clients:
   - Use secure channels (encrypted email, secret management system)
   - Provide clear migration instructions
   - Offer support for integration issues

2. **Update client configurations:**
   ```bash
   # Example: Update environment variable
   export AUTH_SHARED_SECRET="new-secret-here"
   ```

3. **Test client updates:**
   - Verify clients can authenticate with new secret
   - Check for any integration issues
   - Monitor for authentication failures

#### Phase 3: Worker Update

1. **Add new secret to environment:**
   ```bash
   echo "$NEW_SECRET" | wrangler secret put AUTH_SHARED_SECRET
   ```

2. **Deploy updated worker:**
   ```bash
   npm run deploy
   ```

3. **Monitor authentication:**
   - Check for increased authentication failures
   - Assist clients with issues
   - Verify all clients migrated successfully

### Emergency Rotation

In case of suspected compromise:

1. **Immediate Actions:**
   ```bash
   # Generate emergency secret
   EMERGENCY_SECRET=$(openssl rand -base64 32)
   
   # Deploy immediately
   echo "$EMERGENCY_SECRET" | wrangler secret put AUTH_SHARED_SECRET
   npm run deploy
   ```

2. **Client Communication:**
   - Notify all clients of compromise
   - Provide emergency secret via secure channel
   - Require immediate update (within 24 hours)

3. **Investigation:**
   - Determine scope of compromise
   - Identify affected systems
   - Rotate all related credentials

4. **Post-Incident:**
   - Review security practices
   - Implement additional safeguards
   - Schedule security audit

## Best Practices

### Key Management

1. **Never store private keys in version control**
2. **Use Cloudflare Workers Secrets for sensitive data**
3. **Rotate keys regularly** (even if no compromise suspected)
4. **Monitor key usage** for unusual patterns
5. **Limit access** to key material
6. **Use hardware security modules** for production keys if possible

### Secret Management

1. **Generate strong random secrets** (32+ bytes)
2. **Never reuse secrets** across environments
3. **Rotate secrets frequently** (every 90 days)
4. **Use different secrets** for different services
5. **Store secrets securely** (secret management system)
6. **Audit secret access** regularly

### Client Communication

1. **Provide clear migration guides**
2. **Offer multiple communication channels**
3. **Set realistic timelines** (30+ days for major changes)
4. **Monitor migration progress**
5. **Extend deadlines if needed**
6. **Provide support** for migration issues

## Troubleshooting

### Common Issues

**Problem:** Clients can't verify licenses after key rotation
**Solution:**
- Verify clients have updated public key
- Check for caching issues
- Verify signature algorithm compatibility
- Test with sample license payload

**Problem:** Authentication failures after secret rotation
**Solution:**
- Verify client has correct secret
- Check timestamp synchronization
- Verify signature generation algorithm
- Test with simple request

**Problem:** Increased latency after rotation
**Solution:**
- Check cache hit/miss ratios
- Monitor database performance
- Review key verification performance
- Optimize cryptographic operations

### Debugging Tools

```bash
# Check current keys in environment
wrangler secret list

# Test signature verification
curl -X POST https://your-worker.dev/authority/validate \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: your-secret" \
  -H "X-Auth-Timestamp: $(date +%s)" \
  -H "X-Auth-Signature: your-signature" \
  -d '{"license": {...}, "domain": "example.com"}'

# Get current public key
curl https://your-worker.dev/authority/public-key
```

## Automation

### Automated Key Rotation Script

```bash
#!/bin/bash
# automated-key-rotation.sh

set -e

echo "Starting automated key rotation..."

# Generate new key pair
echo "Generating new ED25519 key pair..."
openssl genpkey -algorithm ED25519 -out private_key_new.pem
openssl pkey -in private_key_new.pem -pubout -out public_key_new.pem

# Convert to base64
PRIVATE_KEY_BASE64=$(base64 -i private_key_new.pem | tr -d '\n')
PUBLIC_KEY_BASE64=$(base64 -i public_key_new.pem | tr -d '\n')

# Clean up
rm private_key_new.pem public_key_new.pem

# Add new keys to Cloudflare
echo "Adding new keys to Cloudflare Workers..."
echo "$PRIVATE_KEY_BASE64" | wrangler secret put ED25519_PRIVATE_KEY_NEW
echo "$PUBLIC_KEY_BASE64" | wrangler secret put ED25519_PUBLIC_KEY_NEW

# Deploy worker
echo "Deploying updated worker..."
npm run deploy

echo "Key rotation initiated. Clients have 30 days to migrate."
echo "New public key: $PUBLIC_KEY_BASE64"
```

### Scheduled Rotation

Add to cron for routine rotation:

```bash
# Rotate ED25519 keys every 12 months (first of January)
0 0 1 1 * /path/to/automated-key-rotation.sh

# Rotate HMAC secrets every 3 months
0 0 1 */3 * /path/to/automated-secret-rotation.sh
```

## Checklist

### Pre-Rotation Checklist

- [ ] Notify all stakeholders of upcoming rotation
- [ ] Review current key usage and dependencies
- [ ] Test rotation process in staging environment
- [ ] Prepare client migration guides
- [ ] Set up monitoring for rotation progress
- [ ] Schedule rotation during low-traffic period
- [ ] Prepare rollback plan

### Rotation Checklist

- [ ] Generate new keys/secrets
- [ ] Test new keys/secrets thoroughly
- [ ] Update worker configuration
- [ ] Deploy updated worker
- [ ] Notify clients of rotation
- [ ] Monitor for issues during transition
- [ ] Assist clients with migration

### Post-Rotation Checklist

- [ ] Verify all clients migrated successfully
- [ ] Remove old keys/secrets from environment
- [ ] Update documentation
- [ ] Review audit logs for issues
- [ ] Document lessons learned
- [ ] Schedule next rotation
- [ ] Celebrate successful rotation!

## Contact

For key rotation assistance:

**Support Team:** support@gsmflow.com  
**Security Team:** security@gsmflow.com (for security incidents)
**Response Time:** 24 hours for routine requests, immediate for security incidents