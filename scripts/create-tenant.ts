/**
 * Create Tenant Script
 * 
 * Helper script to create a new tenant in the authority database.
 * 
 * Usage:
 *   npx tsx scripts/create-tenant.ts <tenant_id> <name>
 * 
 * Example:
 *   npx tsx scripts/create-tenant.ts "550e8400-e29b-41d4-a716-446655440000" "Acme Corp"
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/create-tenant.ts <tenant_id> <name>");
    process.exit(1);
  }

  const [tenantId, name] = args;

  console.log(`Creating tenant: ${name} (${tenantId})`);
  console.log("\nRun this SQL in your D1 database:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const now = Math.floor(Date.now() / 1000);
  const sql = `INSERT INTO tenants (tenant_id, name, created_at, status) VALUES ('${tenantId}', '${name}', ${now}, 'active');`;
  
  console.log(sql);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nOr use wrangler:");
  console.log(`wrangler d1 execute gsmflow-authority --command="${sql}"`);
}

main().catch(console.error);
