-- Create audit_logs table for tracking all operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK(action IN ('LICENSE_ISSUED', 'LICENSE_REVOKED', 'LICENSE_VALIDATED', 'AUTH_FAILURE')),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('license', 'revocation')),
  performed_by TEXT NOT NULL,
  performed_at INTEGER NOT NULL,
  metadata TEXT NOT NULL -- JSON object
);

-- Create index for entity_id and entity_type
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_id, entity_type);

-- Create index for performed_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at);