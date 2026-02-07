/**
 * Plan Feature Definitions
 * 
 * Each plan has default feature flags. These can be overridden at issuance time
 * for custom enterprise agreements.
 */

import type { PlanId, FeatureFlags } from "../types/license";

export const PLAN_FEATURES: Record<PlanId, FeatureFlags> = {
  starter: {
    automation: false,
    multi_tenant: false,
    api_access: false,
    custom_branding: false,
    advanced_analytics: false,
    priority_support: false,
  },
  pro: {
    automation: true,
    multi_tenant: false,
    api_access: true,
    custom_branding: true,
    advanced_analytics: true,
    priority_support: false,
  },
  enterprise: {
    automation: true,
    multi_tenant: true,
    api_access: true,
    custom_branding: true,
    advanced_analytics: true,
    priority_support: true,
  },
};

/**
 * Get feature flags for a plan with optional overrides.
 * Overrides allow custom enterprise agreements.
 */
export function getPlanFeatures(
  planId: PlanId,
  overrides?: Partial<FeatureFlags>
): FeatureFlags {
  const defaults = PLAN_FEATURES[planId];
  return { ...defaults, ...overrides };
}

/**
 * Default grace period in days.
 */
export const DEFAULT_GRACE_DAYS = 14;
