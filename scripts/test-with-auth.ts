/**
 * Test License Authority with HMAC Authentication
 * 
 * This script tests all endpoints including authenticated ones.
 * Run with: tsx scripts/test-with-auth.ts
 */

import { generateHMAC } from "../src/crypto/hmac";

const BASE_URL = "http://localhost:8787";
const HMAC_SECRET = "test-secret-key-for-local-development";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n🧪 ${name}...`);
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ PASSED`);
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
    console.log(`❌ FAILED: ${error instanceof Error ? error.message : error}`);
  }
}

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
  console.log("🚀 GSMFlow License Authority - Authenticated Tests");
  console.log("===================================================");

  // Test 1: Health Check
  await test("Health Check", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const text = await response.text();
    if (text !== "OK") throw new Error(`Expected "OK", got "${text}"`);
  });

  // Test 2: Public Key
  await test("Public Key Endpoint", async () => {
    const response = await fetch(`${BASE_URL}/authority/public-key`);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    if (!data.public_key) throw new Error("No public_key in response");
    if (data.algorithm !== "ED25519") throw new Error("Wrong algorithm");
    console.log(`   Public Key ID: ${data.key_id}`);
  });

  // Test 3: Issue License (with auth)
  let licenseId: string;
  await test("Issue License (authenticated)", async () => {
    const response = await makeAuthenticatedRequest(
      "POST",
      "/authority/license/issue",
      {
        tenant_id: TENANT_ID,
        plan_id: "pro",
        allowed_domains: ["example.com", "*.example.com"],
        expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
        grace_days: 14,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status: ${response.status}, Body: ${error}`);
    }

    const data = await response.json();
    if (!data.license) throw new Error("No license in response");
    if (!data.license_id) throw new Error("No license_id in response");
    
    licenseId = data.license_id;
    console.log(`   License ID: ${licenseId}`);
    console.log(`   License (base64): ${data.license.substring(0, 50)}...`);

    // Decode and verify license structure
    const licenseJson = atob(data.license);
    const license = JSON.parse(licenseJson);
    
    if (!license.signature) throw new Error("No signature in license");
    if (license.plan_id !== "pro") throw new Error("Wrong plan_id");
    if (!license.feature_flags.automation) throw new Error("Pro plan should have automation");
    
    console.log(`   Plan: ${license.plan_id}`);
    console.log(`   Features: automation=${license.feature_flags.automation}, api_access=${license.feature_flags.api_access}`);
  });

  // Test 4: Issue License with invalid tenant (should fail)
  await test("Issue License with invalid tenant (should fail)", async () => {
    const response = await makeAuthenticatedRequest(
      "POST",
      "/authority/license/issue",
      {
        tenant_id: "00000000-0000-0000-0000-000000000000",
        plan_id: "pro",
        allowed_domains: ["example.com"],
        expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
      }
    );

    if (response.ok) throw new Error("Should have failed with invalid tenant");
    const data = await response.json();
    if (!data.error) throw new Error("Should have error message");
    console.log(`   Expected error: ${data.error}`);
  });

  // Test 5: Issue License without auth (should fail)
  await test("Issue License without auth (should fail)", async () => {
    const response = await fetch(`${BASE_URL}/authority/license/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: TENANT_ID,
        plan_id: "pro",
        allowed_domains: ["example.com"],
        expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
      }),
    });

    if (response.ok) throw new Error("Should have failed without auth");
    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
    console.log(`   Expected 401 Unauthorized`);
  });

  // Test 6: Revoke License
  await test("Revoke License", async () => {
    if (!licenseId) throw new Error("No license to revoke");

    const response = await makeAuthenticatedRequest(
      "POST",
      "/authority/license/revoke",
      {
        license_id: licenseId,
        reason: "test_revocation",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status: ${response.status}, Body: ${error}`);
    }

    const data = await response.json();
    if (!data.revoked) throw new Error("License not marked as revoked");
    console.log(`   Revoked at: ${data.revoked_at}`);
  });

  // Test 7: Check Revocation Sync
  await test("Revocation Sync (revoked license)", async () => {
    if (!licenseId) throw new Error("No license to check");

    const response = await fetch(
      `${BASE_URL}/authority/revocations/sync?license_id=${licenseId}`
    );

    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    
    if (!data.revoked) throw new Error("License should be marked as revoked");
    console.log(`   Revoked: ${data.revoked}, Reason: ${data.reason}`);
  });

  // Test 8: Check Revocation Sync (non-revoked license)
  await test("Revocation Sync (non-revoked license)", async () => {
    // Use a unique UUID to avoid rate limiting from previous tests
    const testId = `88888888-8888-8888-8888-${Date.now().toString().slice(-12).padStart(12, '8')}`;
    const response = await fetch(
      `${BASE_URL}/authority/revocations/sync?license_id=${testId}`
    );

    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    
    if (data.revoked) throw new Error("License should not be revoked");
    console.log(`   Revoked: ${data.revoked}`);
  });

  // Test 9: Rate Limiting
  await test("Rate Limiting on Sync Endpoint", async () => {
    // Generate unique test ID to avoid conflicts with previous tests
    const testLicenseId = `22222222-2222-2222-2222-${Date.now().toString().slice(-12).padStart(12, '2')}`;
    
    // First request should succeed
    const response1 = await fetch(
      `${BASE_URL}/authority/revocations/sync?license_id=${testLicenseId}`
    );
    if (!response1.ok) {
      const error = await response1.text();
      throw new Error(`First request failed: ${response1.status} - ${error}`);
    }

    // Second request should be rate limited
    const response2 = await fetch(
      `${BASE_URL}/authority/revocations/sync?license_id=${testLicenseId}`
    );
    if (response2.status !== 429) throw new Error(`Expected 429, got ${response2.status}`);
    console.log(`   Rate limit working: 429 Too Many Requests`);
  });

  // Test 10: Invalid Method on protected endpoint
  await test("Invalid Method on protected endpoint (should 401 without auth)", async () => {
    // Protected endpoints check auth first, then method
    const response = await fetch(`${BASE_URL}/authority/license/issue`, {
      method: "GET",
    });

    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
    console.log(`   Unauthorized (auth checked before method): 401`);
  });

  // Test 11: Issue Starter Plan License
  await test("Issue Starter Plan License", async () => {
    const response = await makeAuthenticatedRequest(
      "POST",
      "/authority/license/issue",
      {
        tenant_id: TENANT_ID,
        plan_id: "starter",
        allowed_domains: ["starter.example.com"],
        expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status: ${response.status}, Body: ${error}`);
    }

    const data = await response.json();
    const licenseJson = atob(data.license);
    const license = JSON.parse(licenseJson);
    
    if (license.plan_id !== "starter") throw new Error("Wrong plan_id");
    if (license.feature_flags.automation) throw new Error("Starter should not have automation");
    if (license.feature_flags.api_access) throw new Error("Starter should not have API access");
    
    console.log(`   Starter plan features verified (automation=false, api_access=false)`);
  });

  // Test 12: Issue Enterprise Plan License
  await test("Issue Enterprise Plan License", async () => {
    const response = await makeAuthenticatedRequest(
      "POST",
      "/authority/license/issue",
      {
        tenant_id: TENANT_ID,
        plan_id: "enterprise",
        allowed_domains: ["*.enterprise.example.com"],
        expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        grace_days: 30,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status: ${response.status}, Body: ${error}`);
    }

    const data = await response.json();
    const licenseJson = atob(data.license);
    const license = JSON.parse(licenseJson);
    
    if (license.plan_id !== "enterprise") throw new Error("Wrong plan_id");
    if (!license.feature_flags.multi_tenant) throw new Error("Enterprise should have multi_tenant");
    if (!license.feature_flags.priority_support) throw new Error("Enterprise should have priority_support");
    if (license.grace_days !== 30) throw new Error("Wrong grace_days");
    
    console.log(`   Enterprise plan features verified (all features enabled)`);
  });

  // Summary
  console.log("\n");
  console.log("📊 Test Summary");
  console.log("===============");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${results.length}`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
  }
}

main().catch(console.error);
