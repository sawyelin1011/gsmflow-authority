#!/bin/bash

echo "Running database migrations..."

# Check if D1 database is configured
if [ "$(jq -r '.d1_databases[0].database_id' wrangler.jsonc)" = "to-be-created" ]; then
    echo "D1 database not configured. Please run setup-d1.sh first."
    exit 1
fi

# Run migrations
for migration in migrations/*.sql; do
    echo "Applying migration: $migration"
    wrangler d1 execute gsmflow-authority --local --file="$migration"
done

echo "Migrations complete!"