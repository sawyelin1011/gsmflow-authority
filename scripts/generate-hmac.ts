/**
 * HMAC Signature Generator
 * 
 * Helper script to generate HMAC signatures for testing API endpoints.
 * 
 * Usage:
 *   npx tsx scripts/generate-hmac.ts <method> <path> <body> <secret>
 * 
 * Example:
 *   npx tsx scripts/generate-hmac.ts POST /authority/license/issue '{"tenant_id":"..."}' 'your-secret'
 */

import { generateHMAC } from "../src/crypto/hmac";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error("Usage: npx tsx scripts/generate-hmac.ts <method> <path> <body> <secret>");
    process.exit(1);
  }

  const [method, path, body, secret] = args;

  const signature = await generateHMAC(method, path, body, secret);

  console.log("HMAC Signature:");
  console.log(signature);
  console.log("\nUse in Authorization header:");
  console.log(`Authorization: ${signature}`);
}

main().catch(console.error);
