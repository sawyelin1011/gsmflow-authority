/**
 * Revocation Sync Handler
 * 
 * Allows GSMFlow instances to check if their license has been revoked.
 * Rate limited to prevent abuse (1 request per hour per license).
 */

import type { Env } from "../types/env";
import type { RevocationSyncResponse } from "../types/api";
import { jsonResponse, errorResponse } from "../utils/response";
import { isValidUUID } from "../utils/validation";
import { isRevoked } from "../storage/kv";
import { checkRateLimit } from "../middleware/rate-limit";

/**
 * Handle GET /authority/revocations/sync
 */
export async function handleRevocationSync(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const licenseId = url.searchParams.get("license_id");

  // Validate license ID
  if (!licenseId) {
    return errorResponse("Missing license_id parameter", "MISSING_LICENSE_ID");
  }
  
  if (!isValidUUID(licenseId)) {
    return errorResponse("Invalid license_id format", "INVALID_LICENSE_ID");
  }

  // Rate limit: 1 request per hour per license
  const rateLimitError = checkRateLimit(`sync:${licenseId}`, 1, 3600);
  if (rateLimitError) {
    return rateLimitError;
  }

  // Check revocation status
  const revocation = await isRevoked(env.REVOCATIONS, licenseId);
  const checkedAt = Math.floor(Date.now() / 1000);

  const response: RevocationSyncResponse = {
    revoked: revocation !== null,
    checked_at: checkedAt,
    reason: revocation?.reason,
  };

  return jsonResponse(response);
}
