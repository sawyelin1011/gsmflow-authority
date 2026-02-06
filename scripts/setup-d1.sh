#!/bin/bash

echo "Setting up D1 database..."

# Create D1 database
D1_ID=$(wrangler d1 create gsmflow-authority --json | jq -r '.id')

if [ -z "$D1_ID" ]; then
    echo "Failed to create D1 database"
    exit 1
fi

echo "Created D1 database with ID: $D1_ID"

# Update wrangler.jsonc with database_id
jq --arg db_id "$D1_ID" '.d1_databases[0].database_id = $db_id' wrangler.jsonc > wrangler.jsonc.tmp
mv wrangler.jsonc.tmp wrangler.jsonc

echo "Updated wrangler.jsonc with D1 database ID"

# Generate TypeScript types
echo "Generating TypeScript types..."
npm run cf-typegen

echo "D1 setup complete!"