/**
 * Authentication Middleware
 * HMAC-SHA256 request signature verification
 */

import { getCurrentTimestamp } from '../crypto/utils';

/**
 * Authentication configuration
 */
interface AuthConfig {
  sharedSecret: string;
  timestampToleranceSeconds: number;
}

/**
 * Default authentication configuration
 */
const DEFAULT_CONFIG: AuthConfig = {
  sharedSecret: '',
  timestampToleranceSeconds: 300, // 5 minutes
};

/**
 * Authentication Middleware
 * Verifies HMAC-SHA256 request signatures
 */
export class AuthMiddleware {
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verify HMAC-SHA256 signature
   * @param request - Request to verify
   * @param secret - Shared secret
   * @returns Promise resolving to boolean
   */
  private async verifyHmacSignature(request: Request, secret: string): Promise<boolean> {
    const signatureHeader = request.headers.get('X-Auth-Signature');
    const timestampHeader = request.headers.get('X-Auth-Timestamp');
    const tokenHeader = request.headers.get('X-Auth-Token');

    if (!signatureHeader || !timestampHeader || !tokenHeader) {
      return false;
    }

    // Validate timestamp
    const requestTimestamp = parseInt(timestampHeader);
    const currentTimestamp = getCurrentTimestamp();
    const timestampDiff = Math.abs(currentTimestamp - requestTimestamp);

    if (timestampDiff > this.config.timestampToleranceSeconds) {
      return false;
    }

    // Validate token (simple check for now)
    if (tokenHeader !== this.config.sharedSecret) {
      return false;
    }

    // Reconstruct the signed data
    const method = request.method;
    const path = new URL(request.url).pathname;
    const body = await request.clone().text();
    
    const signedData = `${method}:${path}:${timestampHeader}:${body}`;

    // Calculate expected signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedData)
    );

    const expectedSignatureBase64 = btoa(
      String.fromCharCode(...new Uint8Array(expectedSignature))
    );

    // Compare signatures
    return signatureHeader === expectedSignatureBase64;
  }

  /**
   * Authenticate request
   * @param request - Request to authenticate
   * @returns Promise resolving to authenticated request or null if failed
   */
  async authenticate(request: Request): Promise<Request | null> {
    try {
      const isValid = await this.verifyHmacSignature(request, this.config.sharedSecret);
      
      if (!isValid) {
        return null;
      }

      return request;
    } catch (error) {
      // Fail-closed on any error
      return null;
    }
  }

  /**
   * Create authentication middleware function
   * @param config - Authentication configuration
   * @returns Middleware function
   */
  static createMiddleware(config: Partial<AuthConfig> = {}): (request: Request) => Promise<Request | null> {
    const auth = new AuthMiddleware(config);
    return async (request: Request) => auth.authenticate(request);
  }
}