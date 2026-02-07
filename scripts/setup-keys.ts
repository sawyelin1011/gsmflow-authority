/**
 * Key Generation Script
 * 
 * Run this ONCE during initial setup to generate ED25519 keypair.
 * 
 * Usage:
 *   npx tsx scripts/setup-keys.ts
 * 
 * Output:
 *   - Private key (store as Cloudflare Secret: LICENSE_PRIVATE_KEY)
 *   - Public key (store in KV and embed in GSMFlow)
 */

import { generateKeypair } from "../src/crypto/keys";

async function main() {
  console.log("Generating ED25519 keypair for License Authority...\n");

  const { privateKey, publicKey } = await generateKeypair();

  console.log("✅ Keypair generated successfully!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PRIVATE KEY (store as Cloudflare Secret):");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(privateKey);
  console.log("\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PUBLIC KEY (store in KV and embed in GSMFlow):");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(publicKey);
  console.log("\n");

  console.log("📝 Next steps:");
  console.log("1. Store private key as Cloudflare Secret:");
  console.log("   wrangler secret put LICENSE_PRIVATE_KEY");
  console.log("   (paste the private key when prompted)");
  console.log("\n2. Store public key in KV:");
  console.log("   wrangler kv:key put --binding=REVOCATIONS 'public_key:v1' '<public_key>'");
  console.log("\n3. Embed public key in GSMFlow codebase");
  console.log("\n4. Generate HMAC secret:");
  console.log("   openssl rand -base64 32");
  console.log("   wrangler secret put HMAC_SECRET");
}

main().catch(console.error);
