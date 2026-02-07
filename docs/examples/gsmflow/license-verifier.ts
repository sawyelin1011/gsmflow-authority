/**
 * License Verifier for GSMFlow Self-Hosted (Edge Runtime Compatible)
 * 
 * Works with: Cloudflare Workers, Vercel Edge, Deno Deploy, Bun, Node.js
 * Copy this to: src/lib/license-verifier.ts
 */

const AUTHORITY_PUBLIC_KEY = "MCowBQYDK2VwAyEAcbf2x04rbkZCYzr07Eog2wkTX1i9VTuUos2MJD4gLRM=";

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

export class LicenseVerifier {
  private license: License | null = null;

  async initialize(): Promise<void> {
    // Load license from environment
    const licenseBase64 = process.env.GSMFLOW_LICENSE || (globalThis as any).GSMFLOW_LICENSE;
    if (!licenseBase64) {
      throw new Error("GSMFLOW_LICENSE environment variable not set");
    }

    // Decode license
    const licenseJson = atob(licenseBase64);
    this.license = JSON.parse(licenseJson);

    // Verify signature
    const isValid = await this.verifySignature();
    if (!isValid) {
      throw new Error("Invalid license signature - license may be tampered");
    }

    // Check expiry
    this.checkExpiry();

    // Check domain
    this.checkDomain();

    console.log("✅ License verified successfully");
    console.log(`   Plan: ${this.license!.plan_id}`);
    console.log(`   Expires: ${new Date(this.license!.expires_at * 1000).toISOString()}`);
  }

  private async verifySignature(): Promise<boolean> {
    if (!this.license) return false;

    try {
      const { signature, ...payload } = this.license;

      // Create canonical JSON (sorted keys)
      const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
      const payloadBytes = new TextEncoder().encode(payloadJson);

      // Decode signature and public key
      const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      const publicKeyBytes = Uint8Array.from(atob(AUTHORITY_PUBLIC_KEY), c => c.charCodeAt(0));

      // Import public key
      const publicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyBytes,
        { name: "Ed25519" },
        false,
        ["verify"]
      );

      // Verify signature
      return await crypto.subtle.verify(
        { name: "Ed25519" },
        publicKey,
        signatureBytes,
        payloadBytes
      );
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  private checkExpiry(): void {
    if (!this.license) throw new Error("License not loaded");

    const now = Math.floor(Date.now() / 1000);
    const gracePeriod = this.license.grace_days * 24 * 60 * 60;

    // Hard fail after grace period
    if (now > this.license.expires_at + gracePeriod) {
      throw new Error(
        `License expired on ${new Date(this.license.expires_at * 1000).toISOString()}`
      );
    }

    // Warn if in grace period
    if (now > this.license.expires_at) {
      const daysInGrace = Math.floor((now - this.license.expires_at) / 86400);
      console.warn(
        `⚠️  License in grace period (${daysInGrace}/${this.license.grace_days} days) - renewal required`
      );
    }

    // Warn if expiring soon (7 days)
    const daysUntilExpiry = Math.floor((this.license.expires_at - now) / 86400);
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      console.warn(`⚠️  License expires in ${daysUntilExpiry} days`);
    }
  }

  private checkDomain(): void {
    if (!this.license) throw new Error("License not loaded");

    // Get domain from environment or request
    const currentDomain = process.env.DOMAIN || 
                         (globalThis as any).DOMAIN || 
                         "localhost";

    const isAllowed = this.license.allowed_domains.some((pattern) => {
      // Wildcard subdomain matching
      if (pattern.startsWith("*.")) {
        const baseDomain = pattern.substring(1); // Remove "*"
        return currentDomain.endsWith(baseDomain);
      }

      // Exact match
      return currentDomain === pattern;
    });

    if (!isAllowed) {
      throw new Error(
        `Domain "${currentDomain}" not allowed by license. Allowed: ${this.license.allowed_domains.join(", ")}`
      );
    }
  }

  hasFeature(feature: keyof License["feature_flags"]): boolean {
    if (!this.license) return false;
    return this.license.feature_flags[feature] || false;
  }

  getPlan(): string {
    if (!this.license) return "unknown";
    return this.license.plan_id;
  }

  getTenantId(): string {
    if (!this.license) return "";
    return this.license.tenant_id;
  }

  getLicenseId(): string {
    if (!this.license) return "";
    return this.license.license_id;
  }

  getLicenseInfo() {
    if (!this.license) return null;

    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > this.license.expires_at;
    const isInGracePeriod =
      isExpired && now <= this.license.expires_at + this.license.grace_days * 86400;

    return {
      license_id: this.license.license_id,
      tenant_id: this.license.tenant_id,
      plan_id: this.license.plan_id,
      issued_at: new Date(this.license.issued_at * 1000),
      expires_at: new Date(this.license.expires_at * 1000),
      is_expired: isExpired,
      is_in_grace_period: isInGracePeriod,
      features: this.license.feature_flags,
    };
  }
}

// Singleton instance
export const licenseVerifier = new LicenseVerifier();

