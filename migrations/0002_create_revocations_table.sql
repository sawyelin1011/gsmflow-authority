-- Create revocations table for tracking revoked licenses
CREATE TABLE IF NOT EXISTS revocations (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  revoked_at INTEGER NOT NULL,
  revoked_by TEXT NOT NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
);

-- Create index for license_id
CREATE INDEX IF NOT EXISTS idx_revocations_license_id ON revocations(license_id);

-- Create index for revoked_at
CREATE INDEX IF NOT EXISTS idx_revocations_revoked_at ON revocations(revoked_at);