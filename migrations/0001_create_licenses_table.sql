-- Create licenses table for storing license information
CREATE TABLE IF NOT EXISTS licenses (
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

-- Create index for tenant_id
CREATE INDEX IF NOT EXISTS idx_licenses_tenant_id ON licenses(tenant_id);

-- Create index for expires_at
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at);