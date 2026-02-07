-- Migration: Initial Schema
-- Created: 2026-02-07
-- Description: Create tenants, licenses, and audit_log tables

-- Tenant registry
-- Stores all tenants who can receive licenses
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- License history (audit trail)
-- Stores all issued licenses for audit purposes
CREATE TABLE IF NOT EXISTS licenses (
  license_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  allowed_domains TEXT NOT NULL, -- JSON array
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revocation_reason TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_issued ON licenses(issued_at);
CREATE INDEX IF NOT EXISTS idx_licenses_revoked ON licenses(revoked_at);

-- Audit log (all operations)
-- Tracks all authority operations for security and compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL,
  tenant_id TEXT,
  license_id TEXT,
  actor TEXT NOT NULL,
  details TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_license ON audit_log(license_id);
