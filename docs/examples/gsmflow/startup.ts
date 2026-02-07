/**
 * Application Startup with License Verification
 * 
 * Framework-agnostic example for edge runtimes.
 * Works with: Cloudflare Workers, Vercel Edge, Deno Deploy, Bun, Node.js
 */

import { licenseVerifier } from "./license-verifier";
import { licenseSync } from "./license-sync";

/**
 * Initialize license verification
 * Call this before handling any requests
 */
export async function initializeLicense() {
  console.log("🔐 Verifying license...");
  
  try {
    await licenseVerifier.initialize();
    console.log("✅ License verified");
    console.log(`   Plan: ${licenseVerifier.getPlan()}`);
    console.log(`   Tenant: ${licenseVerifier.getTenantId()}`);
    
    return true;
  } catch (error: any) {
    console.error("❌ License verification failed:", error.message);
    return false;
  }
}

/**
 * Main request handler (edge runtime compatible)
 */
export default {
  async fetch(request: Request, _env?: any, _ctx?: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        license: licenseVerifier.getLicenseInfo(),
      });
    }
    
    // Feature-gated endpoints
    if (url.pathname === "/api/automation") {
      if (!licenseVerifier.hasFeature("automation")) {
        return Response.json(
          { error: "Automation not enabled in license", plan: licenseVerifier.getPlan() },
          { status: 403 }
        );
      }
      return Response.json({ message: "Automation endpoint" });
    }
    
    if (url.pathname === "/api/analytics") {
      if (!licenseVerifier.hasFeature("advanced_analytics")) {
        return Response.json(
          { error: "Advanced analytics not enabled", plan: licenseVerifier.getPlan() },
          { status: 403 }
        );
      }
      return Response.json({ message: "Analytics endpoint" });
    }
    
    if (url.pathname === "/api/tenants") {
      if (!licenseVerifier.hasFeature("multi_tenant")) {
        return Response.json(
          { error: "Multi-tenant not enabled", plan: licenseVerifier.getPlan() },
          { status: 403 }
        );
      }
      return Response.json({ message: "Multi-tenant endpoint" });
    }
    
    return Response.json({ error: "Not found" }, { status: 404 });
  },
};

/**
 * For Node.js/Bun servers:
 */
export async function startServer() {
  const isValid = await initializeLicense();
  if (!isValid) {
    console.error("Cannot start without valid license");
    process.exit(1);
  }
  
  // Start background sync
  licenseSync.start();
  
  // Cleanup on shutdown
  process.on("SIGTERM", () => {
    licenseSync.stop();
    process.exit(0);
  });
  
  // Your server code here
  console.log("✅ Server started");
}

/**
 * For Cloudflare Workers:
 * Just export the default handler above
 */

/**
 * For Vercel Edge Functions:
 */
export const config = {
  runtime: "edge",
};

/**
 * For Deno Deploy:
 */
// Deno.serve(async (request) => {
//   const handler = { fetch: ... };
//   return handler.fetch(request, {}, {});
// });

