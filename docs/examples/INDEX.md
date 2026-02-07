# Examples Index

Complete code examples for GSMFlow License Authority integration.

## 📁 Structure

```
docs/examples/
├── gsmflow/              # GSMFlow self-hosted integration
│   ├── license-verifier.ts   # Core verification module
│   ├── license-sync.ts        # Background revocation sync
│   ├── feature-gate.ts        # Feature gating helpers
│   └── startup.ts             # Application startup
├── portal/               # Client portal integration
│   ├── authority-client.ts    # HMAC API client
│   ├── issue-license.ts       # License issuance
│   ├── revoke-license.ts      # License revocation
│   └── list-licenses.ts       # License listing
└── testing/              # Testing utilities
    ├── verify-license.ts      # Verify license script
    └── test-integration.ts    # Integration tests
```

## 🚀 Quick Start

### For GSMFlow Self-Hosted

**1. Copy verification modules:**
```bash
cp docs/examples/gsmflow/license-verifier.ts src/lib/
cp docs/examples/gsmflow/license-sync.ts src/lib/
cp docs/examples/gsmflow/feature-gate.ts src/lib/
```

**2. Initialize on startup:**
```typescript
import { licenseVerifier } from "./lib/license-verifier";
import { licenseSync } from "./lib/license-sync";

// Verify license
await licenseVerifier.initialize();

// Start background sync
licenseSync.start();
```

**3. Gate features:**
```typescript
import { requireFeature } from "./lib/feature-gate";

// Check feature
const error = requireFeature("automation");
if (error) return error;
```

### For Client Portal

**1. Copy API client:**
```bash
cp docs/examples/portal/authority-client.ts src/lib/
```

**2. Use in your API:**
```typescript
import { licenseAuthority } from "./lib/authority-client";

// Issue license
const result = await licenseAuthority.issueLicense({
  tenant_id: "...",
  plan_id: "pro",
  allowed_domains: ["example.com"],
  expires_at: Math.floor(Date.now() / 1000) + 31536000,
});
```

## 📚 Examples by Runtime

### Cloudflare Workers

```typescript
// src/index.ts
import { licenseVerifier } from "./lib/license-verifier";
import { requireFeature } from "./lib/feature-gate";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Initialize once (use Durable Objects for state)
    await licenseVerifier.initialize();
    
    const url = new URL(request.url);
    
    if (url.pathname === "/api/automation") {
      const error = requireFeature("automation");
      if (error) return error;
      
      return Response.json({ message: "Automation enabled" });
    }
    
    return Response.json({ error: "Not found" }, { status: 404 });
  },
  
  // Scheduled revocation check
  async scheduled(event: ScheduledEvent, env: Env) {
    const { licenseSync } = await import("./lib/license-sync");
    await licenseSync.checkNow();
  }
};
```

**wrangler.toml:**
```toml
[triggers]
crons = ["0 * * * *"]  # Check every hour
```

### Vercel Edge Functions

```typescript
// app/api/route.ts
import { licenseVerifier } from "@/lib/license-verifier";
import { requireFeature } from "@/lib/feature-gate";

export const runtime = "edge";

export async function GET(request: Request) {
  await licenseVerifier.initialize();
  
  const error = requireFeature("api_access");
  if (error) return error;
  
  return Response.json({ message: "API enabled" });
}
```

**Cron job (vercel.json):**
```json
{
  "crons": [{
    "path": "/api/cron/check-license",
    "schedule": "0 * * * *"
  }]
}
```

### Deno Deploy

```typescript
// main.ts
import { licenseVerifier } from "./lib/license-verifier.ts";
import { requireFeature } from "./lib/feature-gate.ts";

await licenseVerifier.initialize();

Deno.serve(async (request) => {
  const url = new URL(request.url);
  
  if (url.pathname === "/api/automation") {
    const error = requireFeature("automation");
    if (error) return error;
    
    return Response.json({ message: "Automation enabled" });
  }
  
  return Response.json({ error: "Not found" }, { status: 404 });
});
```

### Bun

```typescript
// index.ts
import { licenseVerifier } from "./lib/license-verifier";
import { licenseSync } from "./lib/license-sync";
import { requireFeature } from "./lib/feature-gate";

await licenseVerifier.initialize();
licenseSync.start();

Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/api/automation") {
      const error = requireFeature("automation");
      if (error) return error;
      
      return Response.json({ message: "Automation enabled" });
    }
    
    return Response.json({ error: "Not found" }, { status: 404 });
  },
});
```

### Node.js (Express/Fastify/Hono)

```typescript
// server.ts
import { licenseVerifier } from "./lib/license-verifier";
import { licenseSync } from "./lib/license-sync";

await licenseVerifier.initialize();
licenseSync.start();

// Use with any framework
const app = yourFramework();

app.get("/api/automation", async (req, res) => {
  if (!licenseVerifier.hasFeature("automation")) {
    return res.status(403).json({ error: "Feature not enabled" });
  }
  
  res.json({ message: "Automation enabled" });
});
```

## 🔐 Environment Variables

### GSMFlow Self-Hosted

```bash
# .env
GSMFLOW_LICENSE=eyJsaWNlbnNlX2lkIjoi...
DOMAIN=example.com
```

### Client Portal

```bash
# .env
LICENSE_AUTHORITY_URL=https://gsmflow-authority.ylstack02.workers.dev
LICENSE_AUTHORITY_SECRET=production-hmac-secret-gsmflow-2026
```

## 🧪 Testing

```bash
# Verify a license
tsx docs/examples/testing/verify-license.ts <license-base64>

# Run integration tests
tsx docs/examples/testing/test-integration.ts
```

## 📖 Documentation

- **[GSMFlow Integration Guide](../GSMFLOW_INTEGRATION.md)** - Complete integration guide
- **[Client Portal Guide](../CLIENT_PORTAL_INTEGRATION.md)** - Portal integration
- **[API Reference](../API_REFERENCE.md)** - API documentation
- **[Testing Guide](../TESTING_GUIDE.md)** - Testing procedures

## ⚠️ Important Notes

### Security

- ✅ Always verify signature on startup
- ✅ Check domain binding
- ✅ Enforce expiry with grace period
- ✅ Background sync for revocations
- ❌ Never skip signature verification
- ❌ Never expose license in logs

### Performance

- Signature verification: < 1ms
- License check: Instant (in-memory)
- Revocation sync: < 50ms (once per hour)

### Offline Operation

- License verification works **offline**
- No network calls during runtime
- Revocation sync fails **open** (continues if network unavailable)

## 🆘 Troubleshooting

### "Invalid signature"
- Check public key matches authority
- Verify license not tampered
- Ensure using Web Crypto API correctly

### "Domain not allowed"
- Check DOMAIN environment variable
- Verify domain in allowed_domains list
- Check wildcard patterns (*.example.com)

### "License expired"
- Check expires_at timestamp
- Verify grace period not exceeded
- Contact support for renewal

### "Feature not enabled"
- Check plan supports feature
- Verify feature_flags in license
- Consider upgrading plan

## 📝 Customization

All examples are **templates** - modify as needed:

1. **Error handling** - Add your error tracking
2. **Logging** - Integrate your logging system
3. **Monitoring** - Add metrics/alerts
4. **Caching** - Add caching if needed (carefully!)
5. **UI** - Build your own management interface

## 🔄 Updates

When updating examples:

1. Test locally first
2. Verify signature verification still works
3. Check all runtimes (Workers, Edge, Deno, etc.)
4. Update documentation
5. Test in production-like environment

## 📞 Support

For integration help:
- Check relevant documentation
- Review examples for your runtime
- Test with provided test utilities
- Contact backend team if issues persist

---

**Last Updated**: 2026-02-07
