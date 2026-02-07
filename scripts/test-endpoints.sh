#!/bin/bash
# Test all License Authority endpoints
# Run with: bash scripts/test-endpoints.sh

BASE_URL="http://localhost:8787"
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

echo "🧪 Testing GSMFlow License Authority Endpoints"
echo "================================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "$BASE_URL/health"
echo -e "\n"

# Test 2: Public Key
echo "2️⃣  Testing Public Key Endpoint..."
curl -s "$BASE_URL/authority/public-key" | jq '.'
echo ""

# Test 3: Issue License (without auth - should fail)
echo "3️⃣  Testing License Issuance (no auth - should fail)..."
curl -s -X POST "$BASE_URL/authority/license/issue" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT_ID\",\"plan_id\":\"pro\",\"allowed_domains\":[\"example.com\"],\"expires_at\":1735689600}" \
  | jq '.'
echo ""

# Test 4: Revocation Sync
echo "4️⃣  Testing Revocation Sync..."
curl -s "$BASE_URL/authority/revocations/sync?license_id=550e8400-e29b-41d4-a716-446655440000" | jq '.'
echo ""

# Test 5: Invalid endpoint
echo "5️⃣  Testing Invalid Endpoint (should 404)..."
curl -s "$BASE_URL/invalid" | jq '.'
echo ""

echo "✅ Basic endpoint tests complete!"
echo ""
echo "📝 Note: License issuance requires HMAC authentication."
echo "   Use scripts/test-with-auth.ts for authenticated tests."
