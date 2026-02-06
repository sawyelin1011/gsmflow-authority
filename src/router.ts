/**
 * API Router
 * Handles all HTTP requests and routes them to appropriate handlers
 */

import { LicenseService } from './services/license-service';
import { AuthMiddleware } from './middleware/auth';
import { RateLimiter } from './middleware/rate-limit';
import { SecurityMiddleware } from './middleware/security';
import { DatabaseClient } from './db/client';
import { RevocationCache } from './cache/revocations';

/**
 * API Router Configuration
 */
export interface RouterConfig {
  authSharedSecret: string;
  rateLimitRequestsPerMinute: number;
  privateKeyBase64: string;
  publicKeyBase64: string;
}

/**
 * API Router
 */
export class Router {
  private auth: AuthMiddleware;
  private rateLimiter: RateLimiter;
  private security: SecurityMiddleware;
  private licenseService: LicenseService;

  constructor(
    private db: DatabaseClient,
    private cache: RevocationCache,
    private config: RouterConfig
  ) {
    this.auth = new AuthMiddleware({ 
      sharedSecret: config.authSharedSecret 
    });
    
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: config.rateLimitRequestsPerMinute,
      kv: this.getKvFromEnv(),
    });
    
    this.security = new SecurityMiddleware();
    
    this.licenseService = new LicenseService(
      db,
      cache,
      config.privateKeyBase64,
      config.publicKeyBase64
    );
  }

  /**
   * Get KV namespace from environment (helper for testing)
   */
  private getKvFromEnv(): KVNamespace {
    // In a real implementation, this would come from the environment
    // For now, we'll use a mock approach
    return {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
    } as unknown as KVNamespace;
  }

  /**
   * Handle health check endpoint
   * @param request - Request
   * @returns Response
   */
  async handleHealthCheck(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: 'healthy' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle license issuance endpoint
   * @param request - Request
   * @returns Response
   */
  async handleIssueLicense(request: Request): Promise<Response> {
    // Authenticate
    const authenticatedRequest = await this.auth.authenticate(request);
    if (!authenticatedRequest) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const rateLimitResult = await this.rateLimiter.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (rateLimitResult.retryAfter) {
        headers['Retry-After'] = rateLimitResult.retryAfter.toString();
      }
      
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers,
      });
    }

    try {
      // Parse request body
      const body: any = await request.json();
      
      // Validate required fields
      if (!body.tenant_id || !body.plan_id || !body.allowed_domains || !body.expires_at) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Issue license
      const license = await this.licenseService.issueLicense({
        tenant_id: body.tenant_id,
        plan_id: body.plan_id,
        allowed_domains: body.allowed_domains,
        expires_at: body.expires_at,
        grace_days: body.grace_days || 7,
        feature_flags: body.feature_flags || { automation: false, multi_tenant: false },
      });

      // Add security headers
      const response = new Response(JSON.stringify(license), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      return this.security.addSecurityHeaders(response);
    } catch (error) {
      console.error('Error issuing license:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handle license validation endpoint
   * @param request - Request
   * @returns Response
   */
  async handleValidateLicense(request: Request): Promise<Response> {
    // Authenticate
    const authenticatedRequest = await this.auth.authenticate(request);
    if (!authenticatedRequest) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const rateLimitResult = await this.rateLimiter.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (rateLimitResult.retryAfter) {
        headers['Retry-After'] = rateLimitResult.retryAfter.toString();
      }
      
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers,
      });
    }

    try {
      // Parse request body
      const body: any = await request.json();
      
      // Validate required fields
      if (!body.license || !body.domain) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate license
      const result = await this.licenseService.validateLicense(body.license, body.domain);

      // Add security headers
      const response = new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      return this.security.addSecurityHeaders(response);
    } catch (error) {
      console.error('Error validating license:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handle license revocation endpoint
   * @param request - Request
   * @returns Response
   */
  async handleRevokeLicense(request: Request): Promise<Response> {
    // Authenticate
    const authenticatedRequest = await this.auth.authenticate(request);
    if (!authenticatedRequest) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const rateLimitResult = await this.rateLimiter.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (rateLimitResult.retryAfter) {
        headers['Retry-After'] = rateLimitResult.retryAfter.toString();
      }
      
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers,
      });
    }

    try {
      // Parse request body
      const body: any = await request.json();
      
      // Validate required fields
      if (!body.license_id || !body.reason) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Revoke license
      await this.licenseService.revokeLicense(
        body.license_id,
        body.reason,
        body.revoked_by || 'system'
      );

      // Add security headers
      const response = new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      return this.security.addSecurityHeaders(response);
    } catch (error) {
      console.error('Error revoking license:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handle public key endpoint
   * @param request - Request
   * @returns Response
   */
  async handleGetPublicKey(request: Request): Promise<Response> {
    try {
      // Get public key
      const publicKey = await this.licenseService.getPublicKey();

      // Add security headers
      const response = new Response(publicKey, {
        headers: { 'Content-Type': 'text/plain' },
      });
      
      return this.security.addSecurityHeaders(response);
    } catch (error) {
      console.error('Error getting public key:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Route request to appropriate handler
   * @param request - Request to route
   * @returns Response
   */
  async route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Generate request ID and log
    const requestId = this.security.generateRequestId();
    this.security.logRequest(request, requestId, `Request to ${path}`);

    // Route based on path
    switch (path) {
      case '/health':
        return await this.handleHealthCheck(request);
      
      case '/authority/issue':
        return await this.handleIssueLicense(request);
        
      case '/authority/validate':
        return await this.handleValidateLicense(request);
        
      case '/authority/revoke':
        return await this.handleRevokeLicense(request);
        
      case '/authority/public-key':
        return await this.handleGetPublicKey(request);
        
      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  }

  /**
   * Create router instance
   * @param db - Database client
   * @param cache - Revocation cache
   * @param config - Router configuration
   * @returns Router instance
   */
  static create(
    db: DatabaseClient,
    cache: RevocationCache,
    config: RouterConfig
  ): Router {
    return new Router(db, cache, config);
  }
}