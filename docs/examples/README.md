# Code Examples

Production-ready code examples for integrating the License Authority.

## Examples

### GSMFlow Self-Hosted Integration

1. **[license-verifier.ts](./gsmflow/license-verifier.ts)** - Complete license verification module
2. **[license-sync.ts](./gsmflow/license-sync.ts)** - Background revocation sync
3. **[feature-gate.ts](./gsmflow/feature-gate.ts)** - Feature gating middleware
4. **[startup.ts](./gsmflow/startup.ts)** - Application startup with license check

### Client Portal Integration

1. **[authority-client.ts](./portal/authority-client.ts)** - HMAC-authenticated API client
2. **[issue-license.ts](./portal/issue-license.ts)** - License issuance endpoint
3. **[revoke-license.ts](./portal/revoke-license.ts)** - License revocation endpoint
4. **[list-licenses.ts](./portal/list-licenses.ts)** - License listing endpoint
5. **[license-ui.tsx](./portal/license-ui.tsx)** - React UI component

### Testing

1. **[test-integration.ts](./testing/test-integration.ts)** - Integration test suite
2. **[verify-license.ts](./testing/verify-license.ts)** - License verification script
3. **[generate-test-license.ts](./testing/generate-test-license.ts)** - Test license generator

## Quick Start

### For GSMFlow Integration

```bash
# Copy verification module
cp docs/examples/gsmflow/license-verifier.ts src/lib/

# Copy sync module
cp docs/examples/gsmflow/license-sync.ts src/lib/

# Update your startup
# See docs/examples/gsmflow/startup.ts
```

### For Client Portal

```bash
# Copy API client
cp docs/examples/portal/authority-client.ts src/lib/

# Copy API endpoints
cp docs/examples/portal/*.ts src/api/licenses/

# Copy UI component
cp docs/examples/portal/license-ui.tsx src/components/
```

## Environment Setup

### GSMFlow (.env)

```bash
GSMFLOW_LICENSE=eyJsaWNlbnNlX2lkIjoi...
DOMAIN=example.com
```

### Client Portal (.env)

```bash
LICENSE_AUTHORITY_URL=https://gsmflow-authority.ylstack02.workers.dev
LICENSE_AUTHORITY_SECRET=production-hmac-secret-gsmflow-2026
```

## Testing Examples

```bash
# Test license verification
tsx docs/examples/testing/verify-license.ts your-license-base64

# Run integration tests
tsx docs/examples/testing/test-integration.ts

# Generate test license
tsx docs/examples/testing/generate-test-license.ts
```

## Production Checklist

- [ ] Copy relevant examples to your project
- [ ] Update environment variables
- [ ] Test locally first
- [ ] Review security best practices
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor logs

## Notes

- All examples use TypeScript
- Examples assume Node.js 18+
- Modify as needed for your stack
- Test thoroughly before production
- Keep credentials secure
