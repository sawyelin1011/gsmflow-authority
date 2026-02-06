#!/bin/bash

echo "Setting up KV namespace..."

# Create KV namespace
KV_ID=$(wrangler kv:namespace create "CACHE" --json | jq -r '.id')

if [ -z "$KV_ID" ]; then
    echo "Failed to create KV namespace"
    exit 1
fi

echo "Created KV namespace with ID: $KV_ID"

# Update wrangler.jsonc with KV id
jq --arg kv_id "$KV_ID" '.kv_namespaces[0].id = $kv_id' wrangler.jsonc > wrangler.jsonc.tmp
mv wrangler.jsonc.tmp wrangler.jsonc

echo "Updated wrangler.jsonc with KV namespace ID"

# Generate TypeScript types
echo "Generating TypeScript types..."
npm run cf-typegen

echo "KV setup complete!"