/**
 * API Request/Response Types
 * 
 * These define the contract for the License Authority HTTP API.
 * All endpoints use JSON for request/response bodies.
 */

import type { PlanId, FeatureFlags } from "./license";

/**
 * Request to issue a new license.
 * Feature overrides are optional - defaults come from plan.
 */
export interface IssueLicenseRequest {
  tenant_id: string;
  plan_id: PlanId;
  allowed_domains: string[];
  expires_at: number;
  grace_days?: number;
  feature_overrides?: Partial<FeatureFlags>;
}

export interface IssueLicenseResponse {
  license: string; // Base64-encoded signed license JSON
  license_id: string;
  issued_at: number;
  expires_at: number;
}

/**
 * Request to revoke an existing license.
 */
export interface RevokeLicenseRequest {
  license_id: string;
  reason: string;
}

export interface RevokeLicenseResponse {
  revoked: boolean;
  license_id: string;
  revoked_at: number;
}

/**
 * Public key response for offline verification.
 */
export interface PublicKeyResponse {
  public_key: string; // Base64-encoded SPKI format
  algorithm: "ED25519";
  key_id: string;
}

/**
 * Revocation sync response for GSMFlow background checks.
 */
export interface RevocationSyncResponse {
  revoked: boolean;
  checked_at: number;
  reason?: string;
}

/**
 * Standard error response.
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}
