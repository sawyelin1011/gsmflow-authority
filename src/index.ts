/**
 * GSMFlow License Authority Worker
 * Main entry point for the Cloudflare Worker
 */

import { Router } from './router';
import { DatabaseClient } from './db/client';
import { RevocationCache } from './cache/revocations';

/**
 * Worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize database client
      const db = new DatabaseClient(env.DB);
      
      // Initialize revocation cache
      const cache = new RevocationCache(env.CACHE);
      
      // Prefetch revocations on startup (warm cache)
      ctx.waitUntil((async () => {
        try {
          const revocations = await db.getAllRevocations();
          await cache.prefetchRevocations(revocations);
        } catch (error) {
          console.error('Failed to prefetch revocations:', error);
        }
      })());
      
      // Create router with configuration from environment
      const router = Router.create(db, cache, {
        authSharedSecret: env.AUTH_SHARED_SECRET || '',
        rateLimitRequestsPerMinute: parseInt(env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
        privateKeyBase64: env.ED25519_PRIVATE_KEY || '',
        publicKeyBase64: env.ED25519_PUBLIC_KEY || '',
      });
      
      // Route the request
      return await router.route(request);
    } catch (error) {
      console.error('Worker error:', error);
      
      // Fail-closed - return 500 error
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;