/**
 * GSMFlow License Verification Example
 * 
 * This code should be integrated into GSMFlow to verify licenses offline.
 * No network requests required for verification (only periodic revocation sync).
 */

// Embed the public key from the License Authority
const AUTHORITY_PUBLIC_KEY = "MCowBQYDK2VwAyEA..."; // Replace with actual key

interface License {
  license_id: string;
  tenant_id: string;
  plan_id: "starter" | "pro" | "enterprise";
  allowed_domains: string[];
  issued_at: number;
  expires_at: number;
  grace_days: number;
  feature_flags: {
    automation: boolean;
    multi_tenant: boolean;
    api_access: boolean;
    custom_branding: boolean;
    advanced_analytics: boolean;
    priority_support: boolean;
  };
  signature: string;
}

/**
 * Load and verify license from environment variable.
 */
export async function loadLicense(): Promise<License> {
  const licenseBase64 = process.env.GSMFLOW_LICENSE;
  
  if (!licenseBase64) {
    throw new Error("GSMFLOW_LICENSE environment variable not set");
  }

  // Decode base64
  const licenseJson = atob(licenseBase64);
  const license = JSON.parse(licenseJson) as License;

  // Verify signature
  const isValid = await verifySignature(license);
  if (!isValid) {
    throw new Error("Invalid license signature - license may be tampered");
  }

  // Check expiry (including grace period)
  const now = Math.floor(Date.now() / 1000);
  const gracePeriod = license.grace_days * 24 * 60 * 60;
  
  if (now > license.expires_at + gracePeriod) {
    throw new Error("License expired");
  }

  return license;
}

/**
 * Verify license signature using ED25519.
 */
async function verifySignature(license: License): Promise<boolean> {
  try {
    // Import public key
    const publicKeyBuffer = base64ToBuffer(AUTHORITY_PUBLIC_KEY);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    // Extract payload (everything except signature)
    const { signature, ...payload } = license;

    // Serialize payload to canonical JSON (sorted keys)
    const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
    const payloadBytes = new TextEncoder().encode(payloadJson);

    // Decode signature
    const signatureBuffer = base64ToBuffer(signature);

    // Verify signature
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signatureBuffer,
      payloadBytes
    );
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

/**
 * Verify current domain is allowed by license.
 */
export function verifyDomain(license: License, currentDomain: string): boolean {
  return license.allowed_domains.some(pattern => {
    // Wildcard subdomain matching
    if (pattern.startsWith("*.")) {
      const baseDomain = pattern.substring(1); // Remove "*"
      return currentDomain.endsWith(baseDomain);
    }
    
    // Exact match
    return currentDomain === pattern;
  });
}

/**
 * Check if license is in warning period (near expiry).
 */
export function isInWarningPeriod(license: License, warningDays = 7): boolean {
  const now = Math.floor(Date.now() / 1000);
  const warningPeriod = warningDays * 24 * 60 * 60;
  
  return now > license.expires_at - warningPeriod && now <= license.expires_at;
}

/**
 * Check if license is in grace period (expired but still functional).
 */
export function isInGracePeriod(license: License): boolean {
  const now = Math.floor(Date.now() / 1000);
  const gracePeriod = license.grace_days * 24 * 60 * 60;
  
  return now > license.expires_at && now <= license.expires_at + gracePeriod;
}

/**
 * Background task: Check if license has been revoked.
 * Run this every hour in a background worker.
 */
export async function checkRevocation(license: License): Promise<boolean> {
  try {
    const response = await fetch(
      `https://gsmflow-authority.workers.dev/authority/revocations/sync?license_id=${license.license_id}`,
      { signal: AbortSignal.timeout(5000) } // 5 second timeout
    );

    if (!response.ok) {
      console.error("Revocation check failed:", response.status);
      return false; // Fail open (don't lock on network errors)
    }

    const data = await response.json();
    return data.revoked;
  } catch (error) {
    console.error("Revocation check error:", error);
    return false; // Fail open (offline operation)
  }
}

/**
 * Middleware: Verify license on every request.
 */
export async function licenseMiddleware(request: Request): Promise<Response | null> {
  try {
    // Load and verify license
    const license = await loadLicense();

    // Verify domain
    const currentDomain = new URL(request.url).hostname;
    if (!verifyDomain(license, currentDomain)) {
      return new Response("License not valid for this domain", { status: 403 });
    }

    // Check if in grace period (show warning)
    if (isInGracePeriod(license)) {
      console.warn("License is in grace period - renewal required");
    }

    // Check if in warning period
    if (isInWarningPeriod(license)) {
      console.warn("License expiring soon - renewal recommended");
    }

    // License valid - continue
    return null;
  } catch (error) {
    console.error("License verification failed:", error);
    return new Response("Invalid or missing license", { status: 403 });
  }
}

/**
 * Helper: Convert base64 to ArrayBuffer.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Example usage in GSMFlow:
 */
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // Verify license
    const licenseError = await licenseMiddleware(request);
    if (licenseError) {
      return licenseError;
    }

    // Load license for feature flags
    const license = await loadLicense();

    // Check feature flags
    if (request.url.includes("/api/") && !license.feature_flags.api_access) {
      return new Response("API access not enabled in license", { status: 403 });
    }

    // Continue with normal request handling
    return new Response("GSMFlow is running with valid license");
  },
};

/**
 * Example: Background revocation check (run every hour)
 */
export async function startRevocationChecker() {
  const license = await loadLicense();

  setInterval(async () => {
    const isRevoked = await checkRevocation(license);
    
    if (isRevoked) {
      console.error("LICENSE REVOKED - Shutting down");
      process.exit(1); // Or implement graceful shutdown
    }
  }, 3600000); // 1 hour
}
