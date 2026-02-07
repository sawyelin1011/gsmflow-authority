/**
 * Feature Gating for GSMFlow (Edge Runtime Compatible)
 * 
 * Framework-agnostic feature gating.
 * Works with: Cloudflare Workers, Vercel Edge, Deno Deploy, any edge runtime
 */

import { licenseVerifier } from "./license-verifier";

type FeatureName = "automation" | "multi_tenant" | "api_access" | "custom_branding" | "advanced_analytics" | "priority_support";

/**
 * Check if feature is enabled
 */
export function hasFeature(feature: FeatureName): boolean {
  return licenseVerifier.hasFeature(feature);
}

/**
 * Require feature or return error response
 */
export function requireFeature(feature: FeatureName): Response | null {
  if (!hasFeature(feature)) {
    return Response.json(
      {
        error: `Feature "${feature}" not enabled in your license`,
        plan: licenseVerifier.getPlan(),
        upgrade_required: true,
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Check if plan meets minimum requirement
 */
export function requirePlan(minPlan: "starter" | "pro" | "enterprise"): Response | null {
  const planHierarchy = { starter: 1, pro: 2, enterprise: 3 };
  const currentPlan = licenseVerifier.getPlan() as keyof typeof planHierarchy;
  const currentLevel = planHierarchy[currentPlan] || 0;
  const requiredLevel = planHierarchy[minPlan];

  if (currentLevel < requiredLevel) {
    return Response.json(
      {
        error: `This feature requires ${minPlan} plan or higher`,
        current_plan: currentPlan,
        required_plan: minPlan,
        upgrade_required: true,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get license info for response headers or body
 */
export function getLicenseHeaders(): Record<string, string> {
  const info = licenseVerifier.getLicenseInfo();
  if (!info) return {};

  return {
    "X-License-Plan": info.plan_id,
    "X-License-Tenant": info.tenant_id,
    "X-License-Expires": info.expires_at.toISOString(),
  };
}

/**
 * Example usage in edge runtime:
 * 
 * export default {
 *   async fetch(request: Request): Promise<Response> {
 *     const url = new URL(request.url);
 *     
 *     // Check feature
 *     if (url.pathname === "/api/automation") {
 *       const error = requireFeature("automation");
 *       if (error) return error;
 *       
 *       // Handle automation request
 *       return Response.json({ message: "Automation enabled" });
 *     }
 *     
 *     // Check plan
 *     if (url.pathname === "/api/enterprise") {
 *       const error = requirePlan("enterprise");
 *       if (error) return error;
 *       
 *       return Response.json({ message: "Enterprise feature" });
 *     }
 *     
 *     return Response.json({ error: "Not found" }, { status: 404 });
 *   }
 * };
 */

/**
 * Middleware wrapper for frameworks that support it
 */
export function createFeatureMiddleware(feature: FeatureName) {
  return async (_request: Request, next: () => Promise<Response>) => {
    const error = requireFeature(feature);
    if (error) return error;
    return next();
  };
}

/**
 * Helper to add license info to response
 */
export function withLicenseHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  const licenseHeaders = getLicenseHeaders();
  
  Object.entries(licenseHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

