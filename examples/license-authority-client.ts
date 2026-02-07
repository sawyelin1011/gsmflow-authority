/**
 * License Authority Client
 * 
 * Secure client library for interacting with the License Authority API.
 * Use this in your backend services (billing, provisioning, etc.)
 * 
 * Features:
 * - HMAC-SHA256 authentication
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Type-safe API
 */

export interface LicenseAuthorityConfig {
  authorityUrl: string;
  hmacSecret: string;
  timeout?: number; // milliseconds, default 10000
  maxRetries?: number; // default 3
}

export interface IssueLicenseRequest {
  tenant_id: string;
  plan_id: "starter" | "pro" | "enterprise";
  allowed_domains: string[];
  expires_at: number;
  grace_days?: number;
  feature_overrides?: {
    automation?: boolean;
    multi_tenant?: boolean;
    api_access?: boolean;
    custom_branding?: boolean;
    advanced_analytics?: boolean;
    priority_support?: boolean;
  };
}

export interface IssueLicenseResponse {
  license: string; // Base64-encoded signed license
  license_id: string;
  issued_at: number;
  expires_at: number;
}

export interface RevokeLicenseRequest {
  license_id: string;
  reason: string;
}

export interface RevokeLicenseResponse {
  revoked: boolean;
  license_id: string;
  revoked_at: number;
}

export interface PublicKeyResponse {
  public_key: string;
  algorithm: "ED25519";
  key_id: string;
}

export interface RevocationSyncResponse {
  revoked: boolean;
  checked_at: number;
  reason?: string;
}

export class LicenseAuthorityClient {
  private config: Required<LicenseAuthorityConfig>;

  constructor(config: LicenseAuthorityConfig) {
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Issue a new license
   */
  async issueLicense(request: IssueLicenseRequest): Promise<IssueLicenseResponse> {
    return this.makeAuthenticatedRequest<IssueLicenseResponse>(
      "POST",
      "/authority/license/issue",
      request
    );
  }

  /**
   * Revoke an existing license
   */
  async revokeLicense(request: RevokeLicenseRequest): Promise<RevokeLicenseResponse> {
    return this.makeAuthenticatedRequest<RevokeLicenseResponse>(
      "POST",
      "/authority/license/revoke",
      request
    );
  }

  /**
   * Get public key for license verification
   */
  async getPublicKey(): Promise<PublicKeyResponse> {
    return this.makeRequest<PublicKeyResponse>(
      "GET",
      "/authority/public-key"
    );
  }

  /**
   * Check if license is revoked
   */
  async checkRevocation(licenseId: string): Promise<RevocationSyncResponse> {
    return this.makeRequest<RevocationSyncResponse>(
      "GET",
      `/authority/revocations/sync?license_id=${licenseId}`
    );
  }

  /**
   * Make authenticated request with HMAC signature
   */
  private async makeAuthenticatedRequest<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const bodyStr = body ? JSON.stringify(body) : "";
    const authHeader = await this.generateHMAC(method, path, bodyStr);

    return this.makeRequestWithRetry<T>(
      method,
      path,
      {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      bodyStr
    );
  }

  /**
   * Make unauthenticated request
   */
  private async makeRequest<T>(
    method: string,
    path: string
  ): Promise<T> {
    return this.makeRequestWithRetry<T>(method, path);
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry<T>(
    method: string,
    path: string,
    headers: Record<string, string> = {},
    body?: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.authorityUrl}${path}`, {
          method,
          headers,
          body: body || undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(`API error (${response.status}): ${error.error || error.message}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (lastError.message.includes("(4")) {
          throw lastError;
        }

        // Exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  private async generateHMAC(
    method: string,
    path: string,
    body: string
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${method}:${path}:${timestamp}:${body}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.hmacSecret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const signatureBase64 = this.bufferToBase64(signature);
    
    return `HMAC-SHA256 ${timestamp}:${signatureBase64}`;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example Usage
 */

// Initialize client
const client = new LicenseAuthorityClient({
  authorityUrl: process.env.LICENSE_AUTHORITY_URL!,
  hmacSecret: process.env.LICENSE_AUTHORITY_SECRET!,
  timeout: 10000,
  maxRetries: 3,
});

// Issue license
async function exampleIssueLicense() {
  try {
    const response = await client.issueLicense({
      tenant_id: "550e8400-e29b-41d4-a716-446655440000",
      plan_id: "pro",
      allowed_domains: ["example.com", "*.example.com"],
      expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
      grace_days: 14,
    });

    console.log("License issued:", response.license_id);
    console.log("License (base64):", response.license);
    
    // Store license in your database
    // await db.licenses.create({ data: response });
    
    return response.license;
  } catch (error) {
    console.error("Failed to issue license:", error);
    throw error;
  }
}

// Revoke license
async function exampleRevokeLicense(licenseId: string) {
  try {
    const response = await client.revokeLicense({
      license_id: licenseId,
      reason: "subscription_cancelled",
    });

    console.log("License revoked:", response.license_id);
    console.log("Revoked at:", new Date(response.revoked_at * 1000));
    
    return response;
  } catch (error) {
    console.error("Failed to revoke license:", error);
    throw error;
  }
}

// Get public key
async function exampleGetPublicKey() {
  try {
    const response = await client.getPublicKey();
    
    console.log("Public key:", response.public_key);
    console.log("Algorithm:", response.algorithm);
    console.log("Key ID:", response.key_id);
    
    return response.public_key;
  } catch (error) {
    console.error("Failed to get public key:", error);
    throw error;
  }
}

// Check revocation
async function exampleCheckRevocation(licenseId: string) {
  try {
    const response = await client.checkRevocation(licenseId);
    
    if (response.revoked) {
      console.log("License is revoked:", response.reason);
    } else {
      console.log("License is active");
    }
    
    return response;
  } catch (error) {
    console.error("Failed to check revocation:", error);
    throw error;
  }
}
