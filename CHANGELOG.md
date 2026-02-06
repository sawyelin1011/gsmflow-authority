# Changelog

All notable changes to the GSMFlow License Authority project will be documented in this file.

## [Unreleased]

### Added
- Complete ED25519 cryptographic signing implementation
- D1 database integration with full schema and migrations
- KV cache layer for revocation tracking with TTL
- HMAC-SHA256 authentication middleware
- Sliding window rate limiting with KV storage
- Real license issuance with ED25519 signing
- Complete license validation with domain and expiration checks
- License revocation with cache invalidation
- Public key endpoint for client validation
- Comprehensive security middleware with headers
- Full API router with all endpoints
- Complete test suite (50+ tests)
- Deployment scripts for D1, KV, and migrations
- Comprehensive documentation (architecture, security, key rotation)

### Changed
- Replaced placeholder authentication with real HMAC-SHA256
- Upgraded from in-memory license service to database-backed implementation
- Enhanced error handling with fail-closed behavior
- Improved TypeScript types and interfaces
- Updated project structure for better organization

### Fixed
- Security vulnerabilities from placeholder implementations
- Missing input validation
- Incomplete error handling
- Lack of proper authentication

### Security
- Implemented fail-closed security model
- Added prepared statements for all database queries
- Enforced security headers on all responses
- Implemented comprehensive audit logging
- Added rate limiting to prevent abuse
- Hardened authentication with timestamp validation

## [0.1.0] - 2024-02-06

### Added
- Initial Cloudflare Workers project setup
- Basic "Hello World" endpoint
- Vitest testing configuration
- TypeScript setup with strict mode
- Wrangler configuration
- Basic project structure

### Changed
- Initial commit from create-cloudflare CLI

### Fixed
- Initial setup complete

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for breaking changes
- **MINOR** version for new features
- **PATCH** version for bug fixes

## Migration Guide

### From 0.1.0 to Unreleased

**Breaking Changes:**
- All endpoints now require HMAC-SHA256 authentication
- License payload format has changed (now includes ED25519 signatures)
- Database schema is completely new

**Migration Steps:**

1. **Set up infrastructure:**
   ```bash
   ./scripts/setup-d1.sh
   ./scripts/setup-kv.sh
   ./scripts/migrate.sh
   ```

2. **Update client authentication:**
   - Implement HMAC-SHA256 request signing
   - Add required headers to all requests
   - Handle 401 and 429 responses appropriately

3. **Update license handling:**
   - Parse new license payload format
   - Implement ED25519 signature verification
   - Handle revocation checks
   - Validate domain restrictions

4. **Test thoroughly:**
   - Test all API endpoints
   - Verify authentication works
   - Confirm license validation
   - Check error handling

5. **Deploy:**
   ```bash
   ./scripts/deploy.sh
   ```

## Deprecations

None in current version.

## Known Issues

- KV cache fallback to D1 could have performance impact during outages
- Rate limiting uses approximate sliding window (not exact)
- No built-in key rotation automation (manual process required)

## Support

For migration assistance or questions about changes:

**Email:** support@gsmflow.com
**Documentation:** See docs/ directory
**Response Time:** 24-48 hours for migration questions