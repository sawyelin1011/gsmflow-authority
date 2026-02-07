#!/bin/bash
# Production Setup Script
# Run this to set up secrets for production deployment

echo "🔐 Setting up production secrets..."
echo ""

# Set LICENSE_PRIVATE_KEY
echo "Setting LICENSE_PRIVATE_KEY..."
echo "MC4CAQAwBQYDK2VwBCIEIGA1BRcLpzrGqRfZZC3rQRze+if7eG8ckw0GrUDOxMD4" | wrangler secret put LICENSE_PRIVATE_KEY

# Generate and set HMAC_SECRET
echo ""
echo "Generating HMAC_SECRET..."
HMAC_SECRET=$(openssl rand -base64 32)
echo "Generated HMAC: $HMAC_SECRET"
echo "$HMAC_SECRET" | wrangler secret put HMAC_SECRET

echo ""
echo "✅ Secrets configured!"
echo ""
echo "📝 Save this HMAC secret for API clients:"
echo "$HMAC_SECRET"
