/**
 * Test Production License Authority
 * 
 * Tests the deployed production instance.
 * Run with: tsx scripts/test-production.ts
 */

import { generateHMAC } from "../src/crypto/hmac";

const BASE_URL = "https://gsmflow-authority.ylstack02.workers.dev";
const HMAC_SECRET = "production-hmac-secret-gsmflow-2026";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";

async function makeAuthenticatedRequest(
  method: string,
  path: string,
  body?: any
): Promise<Response> {
  const bodyStr = body ? JSON.stringify(body) : "";
  const authHeader = await generateHMAC(method, path, bodyStr, HMAC_SECRET);

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body: bodyStr || undefined,
  });

  return response;
}

async function main() {
  console.log("🚀 Testing Production License Authority");
  console.log("URL:", BASE_URL);
  console.log("=" .repeat(60));
  console.log("");

  // Test 1: Health Check
  console.log("1️⃣  Health Check...");
  const health = await fetch(`${BASE_URL}/health`);
  console.log(`   Status: ${health.status} ${health.statusText}`);
  console.log(`   Response: ${await health.text()}`);
  console.log("");

  // Test 2: Public Key
  console.log("2️⃣  Public Key...");
  const pubKey = await fetch(`${BASE_URL}/authority/public-key`);
  const pubKeyData = await pubKey.json();
  console.log(`   Status: ${pubKey.status}`);
  console.log(`   Algorithm: ${pubKeyData.algorithm}`);
  console.log(`   Key ID: ${pubKeyData.key_id}`);
  console.log(`   Public Key: ${pubKeyData.public_key.substring(0, 40)}...`);
  console.log("");

  // Test 3: Issue License
  console.log("3️⃣  Issue License...");
  const issueResponse = await makeAuthenticatedRequest(
    "POST",
    "/authority/license/issue",
    {
      tenant_id: TENANT_ID,
      plan_id: "pro",
      allowed_domains: ["example.com", "*.example.com"],
      expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
      grace_days: 14,
    }
  );

  if (!issueResponse.ok) {
    console.log(`   ❌ Failed: ${issueResponse.status}`);
    console.log(`   Error: ${await issueResponse.text()}`);
  } else {
    const issueData = await issueResponse.json();
    console.log(`   ✅ Success!`);
    console.log(`   License ID: ${issueData.license_id}`);
    console.log(`   Issued At: ${new Date(issueData.issued_at * 1000).toISOString()}`);
    console.log(`   Expires At: ${new Date(issueData.expires_at * 1000).toISOString()}`);
    
    // Decode license
    const licenseJson = atob(issueData.license);
    const license = JSON.parse(licenseJson);
    console.log(`   Plan: ${license.plan_id}`);
    console.log(`   Features: automation=${license.feature_flags.automation}, api_access=${license.feature_flags.api_access}`);
    
    // Test 4: Revoke License
    console.log("");
    console.log("4️⃣  Revoke License...");
    const revokeResponse = await makeAuthenticatedRequest(
      "POST",
      "/authority/license/revoke",
      {
        license_id: issueData.license_id,
        reason: "production_test",
      }
    );

    if (!revokeResponse.ok) {
      console.log(`   ❌ Failed: ${revokeResponse.status}`);
    } else {
      const revokeData = await revokeResponse.json();
      console.log(`   ✅ Revoked!`);
      console.log(`   Revoked At: ${new Date(revokeData.revoked_at * 1000).toISOString()}`);
    }

    // Test 5: Check Revocation
    console.log("");
    console.log("5️⃣  Check Revocation...");
    const syncResponse = await fetch(
      `${BASE_URL}/authority/revocations/sync?license_id=${issueData.license_id}`
    );
    const syncData = await syncResponse.json();
    console.log(`   Revoked: ${syncData.revoked}`);
    console.log(`   Reason: ${syncData.reason}`);
  }

  console.log("");
  console.log("=" .repeat(60));
  console.log("✅ Production tests complete!");
  console.log("");
  console.log("📝 Production Info:");
  console.log(`   URL: ${BASE_URL}`);
  console.log(`   Public Key: ${pubKeyData.public_key}`);
  console.log(`   HMAC Secret: ${HMAC_SECRET}`);
}

main().catch(console.error);
