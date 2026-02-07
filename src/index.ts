/**
 * GSMFlow License Authority
 * 
 * Production-grade license issuance and revocation service.
 * Cryptographically signs licenses for offline verification.
 * 
 * Security Model:
 * - ED25519 signatures (cannot be forged)
 * - HMAC-SHA256 service authentication
 * - Domain binding (prevents license sharing)
 * - Fail-closed (any error → locked state)
 * 
 * Architecture:
 * - Cloudflare Workers (global edge deployment)
 * - D1 (audit logs, tenant registry)
 * - KV (revocation list, public key)
 */

import type { Env } from "./types/env";
import { withErrorHandling } from "./middleware/error";
import { authenticate } from "./middleware/auth";
import { checkRateLimit, getRateLimitKey } from "./middleware/rate-limit";
import { handleIssueLicense } from "./handlers/issue";
import { handleRevokeLicense } from "./handlers/revoke";
import { handlePublicKey } from "./handlers/public-key";
import { handleRevocationSync } from "./handlers/sync";
import { methodNotAllowedResponse, notFoundResponse } from "./utils/response";

/**
 * Main request router.
 * 
 * Routes:
 * - POST /authority/license/issue    (protected)
 * - POST /authority/license/revoke   (protected)
 * - GET  /authority/public-key       (public)
 * - GET  /authority/revocations/sync (rate-limited)
 */
async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Health check endpoint
  if (path === "/health" && method === "GET") {
    return new Response("OK", { status: 200 });
  }

  // Public key endpoint (no auth required)
  if (path === "/authority/public-key") {
    if (method !== "GET") {
      return methodNotAllowedResponse();
    }
    return handlePublicKey(request, env);
  }

  // Revocation sync endpoint (rate-limited per license, no auth)
  if (path === "/authority/revocations/sync") {
    if (method !== "GET") {
      return methodNotAllowedResponse();
    }
    // Rate limiting is handled per-license in the handler
    return handleRevocationSync(request, env);
  }

  // Protected endpoints require HMAC authentication
  const authError = await authenticate(request, env);
  if (authError) {
    return authError;
  }

  // Rate limit protected endpoints
  const rateLimitKey = getRateLimitKey(request, "authority");
  const rateLimitError = checkRateLimit(rateLimitKey, 100, 60);
  if (rateLimitError) {
    return rateLimitError;
  }

  // Route to handlers
  if (path === "/authority/license/issue") {
    if (method !== "POST") {
      return methodNotAllowedResponse();
    }
    return handleIssueLicense(request, env);
  }

  if (path === "/authority/license/revoke") {
    if (method !== "POST") {
      return methodNotAllowedResponse();
    }
    return handleRevokeLicense(request, env);
  }

  // Not found
  return notFoundResponse();
}

export default {
  fetch: withErrorHandling(handleRequest),
} satisfies ExportedHandler<Env>;
