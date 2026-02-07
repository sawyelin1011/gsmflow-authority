/**
 * Public Key Handler
 * 
 * Returns the authority's public key for offline license verification.
 * This endpoint is public (no authentication required).
 */

import type { Env } from "../types/env";
import type { PublicKeyResponse } from "../types/api";
import { jsonResponse, errorResponse } from "../utils/response";
import { getPublicKey } from "../storage/kv";

/**
 * Handle GET /authority/public-key
 */
export async function handlePublicKey(
  request: Request,
  env: Env
): Promise<Response> {
  // Default key ID (support key rotation in future)
  const keyId = "v1";

  // Retrieve public key from KV
  const publicKey = await getPublicKey(env.REVOCATIONS, keyId);

  if (!publicKey) {
    return errorResponse(
      "Public key not found - authority not initialized",
      "KEY_NOT_FOUND",
      500
    );
  }

  const response: PublicKeyResponse = {
    public_key: publicKey,
    algorithm: "ED25519",
    key_id: keyId,
  };

  // Cache public key for 1 hour (it rarely changes)
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
