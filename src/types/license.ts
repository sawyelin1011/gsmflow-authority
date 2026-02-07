/**
 * License Authority Type Definitions
 * 
 * These types define the core license structure and related entities.
 * Licenses are immutable once signed - any changes require new issuance.
 */

export type PlanId = "starter" | "pro" | "enterprise";

/**
 * Feature flags control what functionality is enabled in GSMFlow.
 * These are baked into the license at issuance time.
 */
export interface FeatureFlags {
  automation: boolean;
  multi_tenant: boolean;
  api_access: boolean;
  custom_branding: boolean;
  advanced_analytics: boolean;
  priority_support: boolean;
}

/**
 * The core license payload that gets cryptographically signed.
 * Everything except 'signature' is included in the signature.
 */
export interface LicensePayload {
  license_id: string;
  tenant_id: string;
  plan_id: PlanId;
  allowed_domains: string[];
  issued_at: number;
  expires_at: number;
  grace_days: number;
  feature_flags: FeatureFlags;
}

/**
 * Signed license includes the payload + cryptographic signature.
 * This is what gets delivered to the tenant and embedded in GSMFlow.
 */
export interface SignedLicense extends LicensePayload {
  signature: string;
}

/**
 * Revocation record stored in KV for fast global lookups.
 */
export interface RevocationRecord {
  license_id: string;
  revoked_at: number;
  reason: string;
}

/**
 * Tenant status in the authority database.
 */
export type TenantStatus = "active" | "suspended";

export interface Tenant {
  tenant_id: string;
  name: string;
  created_at: number;
  status: TenantStatus;
}
