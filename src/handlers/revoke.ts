/**
 * License Revocation Handler
 * 
 * Revokes licenses by adding them to the global revocation list.
 * GSMFlow learns about revocations via periodic sync.
 */

import type { Env } from "../types/env";
import type { RevokeLicenseRequest, RevokeLicenseResponse } from "../types/api";
import { jsonResponse, errorResponse } from "../utils/response";
import { isValidUUID } from "../utils/validation";
import { addRevocation } from "../storage/kv";
import { revokeLicense, licenseExists, logAudit } from "../storage/d1";

/**
 * Handle POST /authority/license/revoke
 */
export async function handleRevokeLicense(
  request: Request,
  env: Env
): Promise<Response> {
  // Parse request body
  const body = await request.json() as RevokeLicenseRequest;

  // Validate inputs
  if (!isValidUUID(body.license_id)) {
    return errorResponse("Invalid license_id format", "INVALID_LICENSE_ID");
  }

  if (!body.reason || body.reason.trim().length === 0) {
    return errorResponse("Revocation reason is required", "MISSING_REASON");
  }

  // Check license exists
  const exists = await licenseExists(env.DB, body.license_id);
  if (!exists) {
    return errorResponse("License not found", "LICENSE_NOT_FOUND", 404);
  }

  const revokedAt = Math.floor(Date.now() / 1000);

  // Add to KV revocation list (global propagation)
  await addRevocation(env.REVOCATIONS, body.license_id, body.reason);

  // Update D1 audit trail
  await revokeLicense(env.DB, body.license_id, revokedAt, body.reason);

  // Log audit event
  await logAudit(
    env.DB,
    "license_revoked",
    "system",
    undefined,
    body.license_id,
    { reason: body.reason }
  );

  const response: RevokeLicenseResponse = {
    revoked: true,
    license_id: body.license_id,
    revoked_at: revokedAt,
  };

  return jsonResponse(response);
}
