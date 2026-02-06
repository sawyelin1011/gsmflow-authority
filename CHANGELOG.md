# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Core license authority infrastructure
- HTTP router with path parameter support
- License validation endpoint (`POST /api/v1/license/validate`)
- License issuance endpoint (`POST /api/v1/license/issue`)
- License revocation endpoint (`DELETE /api/v1/license/:licenseKey`)
- Health check endpoint (`GET /health`)
- API version endpoint (`GET /api/v1/version`)
- TypeScript type definitions for License and related types
- LicenseService with business logic layer
- CORS middleware
- Authentication middleware (placeholder)
- Response utility helpers (jsonResponse, errorResponse)
- Validation utilities for license keys, emails, user IDs, and plans
- Comprehensive test suite with 24 passing tests
  - Integration tests for all endpoints
  - Unit tests for router functionality
  - Unit tests for validation utilities
- Complete API documentation
- Deployment guide
- Contributing guidelines
- Environment configuration example
- README with feature overview and usage examples

### Infrastructure
- Project structure organized by domain (services, types, middleware, utils)
- Vitest test framework with Cloudflare Workers pool
- TypeScript strict mode configuration
- EditorConfig for consistent code style
- Prettier configuration
- Wrangler 4 configuration with Node.js compatibility

### Documentation
- Comprehensive README.md
- API documentation (docs/API.md)
- Deployment guide (docs/DEPLOYMENT.md)
- Contributing guidelines (CONTRIBUTING.md)
- Environment configuration example (.env.example)

## [0.0.0] - 2026-02-06

### Added
- Initial project setup with create-cloudflare CLI
- Basic "Hello World" worker
- TypeScript configuration
- Wrangler configuration
- Basic test setup
