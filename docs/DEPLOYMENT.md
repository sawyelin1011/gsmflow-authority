# Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Already installed in the project
3. **Node.js**: v18 or later

## Initial Setup

### 1. Authenticate with Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 2. Configure Your Project

Review and update `wrangler.jsonc` if needed:
- Ensure the `name` is unique for your Cloudflare account
- Update `compatibility_date` if needed

## Development Deployment

### Local Development

Start a local development server:

```bash
npm run dev
```

The service will be available at `http://localhost:8787`

### Test Endpoints Locally

```bash
# Health check
curl http://localhost:8787/health

# API version
curl http://localhost:8787/api/v1/version

# Validate license
curl -X POST http://localhost:8787/api/v1/license/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"ABCD-1234-EFGH-5678"}'
```

## Production Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

After deployment, you'll receive a URL like:
```
https://gsmflow-authority.<your-subdomain>.workers.dev
```

### Custom Domain (Optional)

To use a custom domain:

1. Go to your Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select your `gsmflow-authority` worker
4. Go to Settings > Triggers > Custom Domains
5. Click "Add Custom Domain" and follow the instructions

## Environment Configuration

### Adding Environment Variables

For production environment variables, use Wrangler secrets:

```bash
# Add a secret
npx wrangler secret put API_SECRET_KEY

# List secrets
npx wrangler secret list

# Delete a secret
npx wrangler secret delete API_SECRET_KEY
```

Alternatively, add non-sensitive variables to `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "ENVIRONMENT": "production",
    "API_VERSION": "v1"
  }
}
```

## Database Setup (Future)

When implementing persistent storage, you'll need to set up one of the following:

### Option 1: D1 (SQL Database)

```bash
# Create a D1 database
npx wrangler d1 create gsmflow-licenses

# Add to wrangler.jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "gsmflow-licenses",
      "database_id": "your-database-id"
    }
  ]
}

# Create tables
npx wrangler d1 execute gsmflow-licenses --file=./schema.sql
```

### Option 2: KV (Key-Value Store)

```bash
# Create a KV namespace
npx wrangler kv:namespace create "LICENSES"

# Add to wrangler.jsonc
{
  "kv_namespaces": [
    {
      "binding": "LICENSES",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

### Option 3: Durable Objects

For more complex state management, consider Durable Objects. See [Cloudflare Durable Objects documentation](https://developers.cloudflare.com/durable-objects/).

## Monitoring and Logging

### View Logs

```bash
# Tail production logs
npx wrangler tail

# Tail with filtering
npx wrangler tail --format=pretty
```

### Analytics

1. Go to your Cloudflare Dashboard
2. Navigate to Workers & Pages > gsmflow-authority
3. View the Analytics tab for:
   - Request volume
   - Error rates
   - Response times
   - CPU time

### Enable Observability

Observability is already enabled in `wrangler.jsonc`. This provides:
- Request tracing
- Performance metrics
- Error tracking

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Environment-Specific Deployments

Create multiple environments in `wrangler.jsonc`:

```jsonc
{
  "name": "gsmflow-authority",
  "env": {
    "staging": {
      "name": "gsmflow-authority-staging",
      "vars": {
        "ENVIRONMENT": "staging"
      }
    },
    "production": {
      "name": "gsmflow-authority",
      "vars": {
        "ENVIRONMENT": "production"
      }
    }
  }
}
```

Deploy to specific environments:

```bash
# Deploy to staging
npx wrangler deploy --env staging

# Deploy to production
npx wrangler deploy --env production
```

## Rollback

If you need to rollback a deployment:

```bash
# View deployment history
npx wrangler deployments list

# Rollback to a specific deployment
npx wrangler rollback [deployment-id]
```

## Performance Optimization

### Smart Placement

Enable Smart Placement in `wrangler.jsonc` to automatically route requests to optimal data centers:

```jsonc
{
  "placement": {
    "mode": "smart"
  }
}
```

### Route-Based Optimization

Consider using Workers Routes to serve static assets separately from your API.

## Security Best Practices

1. **Never commit secrets** to version control
2. Use Wrangler secrets for sensitive data
3. Implement rate limiting (see TODO in README)
4. Add authentication for sensitive endpoints
5. Use CORS headers appropriately
6. Regularly update dependencies: `npm update`

## Troubleshooting

### Common Issues

**Issue: Deployment fails with authentication error**
- Solution: Run `npx wrangler login` again

**Issue: Worker not receiving requests**
- Solution: Check your routes in Cloudflare Dashboard
- Verify the worker name matches `wrangler.jsonc`

**Issue: TypeScript errors during deployment**
- Solution: Run `npx tsc --noEmit` locally to catch errors
- Fix all type errors before deploying

**Issue: Tests pass locally but fail in production**
- Solution: Check environment differences
- Verify all environment variables are set in production
- Review logs with `npx wrangler tail`

## Cost Estimation

Cloudflare Workers Free Plan includes:
- 100,000 requests per day
- 10ms CPU time per request

For higher usage, see [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Support

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Community](https://community.cloudflare.com/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
