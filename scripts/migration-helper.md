# D1 Migration Helper Guide

## Understanding D1 Migrations

D1 uses a migration-based approach for schema changes. Each migration is a timestamped SQL file that gets applied in order.

## Creating Migrations

### 1. Generate Migration File

```bash
npm run db:migration:create "description of change"
```

Example:
```bash
npm run db:migration:create "add user_limits table"
```

This creates a file like: `migrations/0002_add_user_limits_table.sql`

### 2. Edit Migration File

Add your SQL changes to the generated file:

```sql
-- Migration: Add user limits
-- Description: Track usage limits per tenant

CREATE TABLE user_limits (
  tenant_id TEXT PRIMARY KEY,
  max_users INTEGER NOT NULL DEFAULT 10,
  current_users INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);
```

### 3. Apply Migration

**Local (Development)**:
```bash
npm run db:migrate:local
```

**Remote (Production)**:
```bash
npm run db:migrate
```

## Migration Commands

### List All Migrations
```bash
npm run db:list
```

Shows:
- Applied migrations (with timestamp)
- Pending migrations (not yet applied)

### Apply Migrations

**Local Database**:
```bash
npm run db:migrate:local
```

**Remote Database**:
```bash
npm run db:migrate
```

The command will:
1. Show pending migrations
2. Ask for confirmation (in interactive mode)
3. Create automatic backup
4. Apply migrations in order
5. Show progress for each migration

### Execute Raw SQL

**Local**:
```bash
npm run db:execute:local --command="SELECT * FROM tenants"
```

**Remote**:
```bash
npm run db:execute --command="SELECT * FROM tenants"
```

Or from file:
```bash
npm run db:execute:local --file=./scripts/seed-data.sql
```

## Migration Best Practices

### 1. Always Test Locally First
```bash
# Test migration locally
npm run db:migrate:local

# Verify it worked
wrangler d1 execute gsmflow-authority --local --command="SELECT * FROM new_table"

# Then apply to production
npm run db:migrate
```

### 2. Make Migrations Idempotent

Use `IF NOT EXISTS` and `IF EXISTS`:

```sql
-- Good: Idempotent
CREATE TABLE IF NOT EXISTS new_table (...);
ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Bad: Will fail if run twice
CREATE TABLE new_table (...);
ALTER TABLE existing_table ADD COLUMN new_column TEXT;
```

### 3. Never Modify Applied Migrations

Once a migration is applied to production, never edit it. Create a new migration instead.

```bash
# Wrong: Editing 0001_initial_schema.sql after it's applied

# Right: Create new migration
npm run db:migration:create "fix initial schema"
```

### 4. Use Descriptive Names

```bash
# Good
npm run db:migration:create "add revocation_reason to licenses"
npm run db:migration:create "create api_keys table"

# Bad
npm run db:migration:create "update"
npm run db:migration:create "fix"
```

### 5. Include Rollback Instructions

Add comments for how to rollback:

```sql
-- Migration: Add API keys table
-- Rollback: DROP TABLE api_keys;

CREATE TABLE api_keys (
  key_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

## Common Migration Patterns

### Add New Table
```sql
CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_new_table_created ON new_table(created_at);
```

### Add Column
```sql
ALTER TABLE licenses ADD COLUMN metadata TEXT;
```

### Add Index
```sql
CREATE INDEX IF NOT EXISTS idx_licenses_plan ON licenses(plan_id);
```

### Seed Data
```sql
INSERT INTO tenants (tenant_id, name, created_at, status)
VALUES ('default-tenant', 'Default Tenant', 1700000000, 'active')
ON CONFLICT (tenant_id) DO NOTHING;
```

## Troubleshooting

### Migration Fails

1. Check syntax:
```bash
# Test SQL locally first
wrangler d1 execute gsmflow-authority --local --command="YOUR SQL HERE"
```

2. Check migration order:
```bash
npm run db:list
```

3. View error details in wrangler output

### Reset Local Database

```bash
# Delete local database
rm -rf .wrangler/state/v3/d1

# Reapply all migrations
npm run db:migrate:local
```

### Check Applied Migrations

```bash
wrangler d1 execute gsmflow-authority --remote --command="SELECT * FROM d1_migrations"
```

## CI/CD Integration

In CI/CD pipelines, migrations apply automatically without confirmation:

```yaml
# GitHub Actions example
- name: Apply D1 Migrations
  run: npm run db:migrate
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Migration Workflow

```
1. Create migration file
   ↓
2. Write SQL changes
   ↓
3. Test locally (db:migrate:local)
   ↓
4. Verify changes work
   ↓
5. Commit migration file
   ↓
6. Deploy to production (db:migrate)
   ↓
7. Verify production
```

## Example: Complete Migration Flow

```bash
# 1. Create migration
npm run db:migration:create "add license metadata"

# 2. Edit migrations/0002_add_license_metadata.sql
# Add: ALTER TABLE licenses ADD COLUMN metadata TEXT;

# 3. Test locally
npm run db:migrate:local

# 4. Verify
wrangler d1 execute gsmflow-authority --local --command="PRAGMA table_info(licenses)"

# 5. Apply to production
npm run db:migrate

# 6. Verify production
wrangler d1 execute gsmflow-authority --remote --command="PRAGMA table_info(licenses)"
```
