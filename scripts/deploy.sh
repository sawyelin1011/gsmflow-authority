#!/bin/bash

echo "Deploying GSMFlow License Authority..."

# Check if D1 database is configured
if [ "$(jq -r '.d1_databases[0].database_id' wrangler.jsonc)" = "to-be-created" ]; then
    echo "D1 database not configured. Please run setup-d1.sh first."
    exit 1
fi

# Check if KV namespace is configured
if [ "$(jq -r '.kv_namespaces[0].id' wrangler.jsonc)" = "to-be-created" ]; then
    echo "KV namespace not configured. Please run setup-kv.sh first."
    exit 1
fi

echo "Running migrations..."
wrangler d1 migrations apply gsmflow-authority --remote

echo "Deploying worker..."
wrangler deploy

echo "Deployment complete!"