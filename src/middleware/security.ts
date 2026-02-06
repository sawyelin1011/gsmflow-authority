/**
 * Security Middleware
 * Adds security headers and request logging
 */

import { generateUUID, getCurrentTimestamp } from '../crypto/utils';

/**
 * Security Headers Configuration
 */
interface SecurityHeadersConfig {
  csp?: string;
  hstsMaxAge?: number;
  frameOptions?: string;
  contentTypeOptions?: string;
}

/**
 * Default Security Headers Configuration
 */
const DEFAULT_HEADERS_CONFIG: SecurityHeadersConfig = {
  csp: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
  hstsMaxAge: 31536000, // 1 year
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
};

/**
 * Security Middleware
 */
export class SecurityMiddleware {
  private headersConfig: SecurityHeadersConfig;

  constructor(config: Partial<SecurityHeadersConfig> = {}) {
    this.headersConfig = { ...DEFAULT_HEADERS_CONFIG, ...config };
  }

  /**
   * Add security headers to response
   * @param response - Response to add headers to
   * @returns Response with security headers
   */
  addSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    
    // Content Security Policy
    if (this.headersConfig.csp) {
      headers.set('Content-Security-Policy', this.headersConfig.csp);
    }

    // HTTP Strict Transport Security
    if (this.headersConfig.hstsMaxAge) {
      headers.set(
        'Strict-Transport-Security',
        `max-age=${this.headersConfig.hstsMaxAge}; includeSubDomains; preload`
      );
    }

    // X-Frame-Options
    if (this.headersConfig.frameOptions) {
      headers.set('X-Frame-Options', this.headersConfig.frameOptions);
    }

    // X-Content-Type-Options
    if (this.headersConfig.contentTypeOptions) {
      headers.set('X-Content-Type-Options', this.headersConfig.contentTypeOptions);
    }

    // X-XSS-Protection
    headers.set('X-XSS-Protection', '0');

    // Referrer-Policy
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy
    headers.set(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()'
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
  }

  /**
   * Generate request ID
   * @returns Request ID string
   */
  generateRequestId(): string {
    return generateUUID();
  }

  /**
   * Log request (audit-safe, no sensitive data)
   * @param request - Request to log
   * @param requestId - Request ID
   * @param action - Action being performed
   */
  logRequest(request: Request, requestId: string, action: string): void {
    const timestamp = getCurrentTimestamp();
    const method = request.method;
    const path = new URL(request.url).pathname;
    
    // Log in structured format (could be sent to logging service)
    const logEntry = {
      requestId,
      timestamp,
      action,
      method,
      path,
      userAgent: request.headers.get('User-Agent') || 'unknown',
    };
    
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Create security middleware function
   * @param config - Security headers configuration
   * @returns Middleware function
   */
  static createMiddleware(config: Partial<SecurityHeadersConfig> = {}): {
    addSecurityHeaders: (response: Response) => Response;
    generateRequestId: () => string;
    logRequest: (request: Request, requestId: string, action: string) => void;
  } {
    const security = new SecurityMiddleware(config);
    return {
      addSecurityHeaders: (response: Response) => security.addSecurityHeaders(response),
      generateRequestId: () => security.generateRequestId(),
      logRequest: (request: Request, requestId: string, action: string) => 
        security.logRequest(request, requestId, action),
    };
  }
}