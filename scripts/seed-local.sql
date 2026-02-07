-- Seed data for local development and testing
-- Run with: wrangler d1 execute gsmflow-authority --local --file=./scripts/seed-local.sql

-- Create test tenants
INSERT OR IGNORE INTO tenants (tenant_id, name, created_at, status) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corp', 1707264000, 'active'),
  ('660e8400-e29b-41d4-a716-446655440001', 'Test Company', 1707264000, 'active'),
  ('770e8400-e29b-41d4-a716-446655440002', 'Demo Inc', 1707264000, 'suspended');

-- Log seed operation
INSERT INTO audit_log (timestamp, action, tenant_id, license_id, actor, details)
VALUES (1707264000, 'seed_data', NULL, NULL, 'system', '{"message": "Local development seed data"}');
