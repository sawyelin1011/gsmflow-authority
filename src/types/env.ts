/**
 * Cloudflare Workers Environment Bindings
 * 
 * These are configured in wrangler.jsonc and injected at runtime.
 * Type-safe access to D1, KV, and secrets.
 */

export interface Env {
  // D1 Database for audit logs and tenant registry
  DB: D1Database;
  
  // KV Namespace for revocation list (fast global reads)
  REVOCATIONS: KVNamespace;
  
  // Secrets (never logged or exposed)
  LICENSE_PRIVATE_KEY: string; // Base64-encoded PKCS8 ED25519 private key
  HMAC_SECRET: string;         // HMAC-SHA256 secret for service auth
  
  // Optional: Rate limiting (if using Cloudflare Rate Limiting API)
  RATE_LIMITER?: RateLimit;
}
