/**
 * Database Initialization Script
 * 
 * Complete setup for D1 database including migrations and initial data.
 * 
 * Usage:
 *   npm run db:init          # Initialize remote database
 *   npm run db:init:local    # Initialize local database
 */

console.log("📦 GSMFlow License Authority - Database Initialization\n");

console.log("This script will guide you through database setup.\n");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("STEP 1: Create D1 Database");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Run: npm run db:create");
console.log("Then update wrangler.jsonc with the database_id\n");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("STEP 2: Apply Migrations");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Local:  npm run db:migrate:local");
console.log("Remote: npm run db:migrate\n");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("STEP 3: Create First Tenant");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("npm run setup:tenant <tenant_id> <name>");
console.log("Example: npm run setup:tenant '550e8400-e29b-41d4-a716-446655440000' 'Acme Corp'\n");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("STEP 4: Verify Setup");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("List migrations: npm run db:list");
console.log("Query tenants:   wrangler d1 execute gsmflow-authority --remote --command='SELECT * FROM tenants'\n");

console.log("✅ Follow these steps to complete database setup.");
