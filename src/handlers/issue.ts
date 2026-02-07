/**
 * License Issuance Handler
 * 
 * Issues cryptographically signed licenses.
 * This is the core operation of the License Authority.
 */

import type { Env } from "../types/env";
import type { IssueLicenseRequest, IssueLicenseResponse } from "../types/api";
import type { LicensePayload } from "../types/license";
import { jsonResponse, errorResponse } from "../utils/response";
import { isValidUUID, isValidPlanId, validateDomains, validateTimestamp } from "../utils/validation";
import { getPlanFeatures, DEFAULT_GRACE_DAYS } from "../utils/plans";
import { signLicense } from "../crypto/signing";
import { getTenant, storeLicense, logAudit } from "../storage/d1";

/**
 * Handle POST /authority/license/issue
 */
export async function handleIssueLicense(
  request: Request,
  env: Env
): Promise<Response> {
  // Parse request body
  const body = await request.json() as IssueLicenseRequest;

  // Validate inputs
  if (!isValidUUID(body.tenant_id)) {
    return errorResponse("Invalid tenant_id format", "INVALID_TENANT_ID");
  }

  if (!isValidPlanId(body.plan_id)) {
    return errorResponse("Invalid plan_id", "INVALID_PLAN_ID");
  }

  try {
    validateDomains(body.allowed_domains);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Invalid domains",
      "INVALID_DOMAINS"
    );
  }

  try {
    validateTimestamp(body.expires_at, "expires_at");
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Invalid expiry",
      "INVALID_EXPIRY"
    );
  }

  // Check tenant exists and is active
  const tenant = await getTenant(env.DB, body.tenant_id);
  if (!tenant) {
    return errorResponse("Tenant not found", "TENANT_NOT_FOUND", 404);
  }

  if (tenant.status !== "active") {
    return errorResponse("Tenant is not active", "TENANT_SUSPENDED", 403);
  }

  // Generate license ID
  const licenseId = crypto.randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);

  // Build license payload
  const payload: LicensePayload = {
    license_id: licenseId,
    tenant_id: body.tenant_id,
    plan_id: body.plan_id,
    allowed_domains: body.allowed_domains,
    issued_at: issuedAt,
    expires_at: body.expires_at,
    grace_days: body.grace_days ?? DEFAULT_GRACE_DAYS,
    feature_flags: getPlanFeatures(body.plan_id, body.feature_overrides),
  };

  // Sign the license
  const signedLicense = await signLicense(payload, env.LICENSE_PRIVATE_KEY);

  // Store in D1 for audit trail
  await storeLicense(
    env.DB,
    licenseId,
    body.tenant_id,
    body.plan_id,
    body.allowed_domains,
    issuedAt,
    body.expires_at
  );

  // Log audit event
  await logAudit(
    env.DB,
    "license_issued",
    "system",
    body.tenant_id,
    licenseId,
    { plan_id: body.plan_id, expires_at: body.expires_at }
  );

  // Encode signed license as base64 JSON
  const licenseJson = JSON.stringify(signedLicense);
  const licenseBase64 = btoa(licenseJson);

  const response: IssueLicenseResponse = {
    license: licenseBase64,
    license_id: licenseId,
    issued_at: issuedAt,
    expires_at: body.expires_at,
  };

  return jsonResponse(response);
}
