/**
 * Rate Limiting Middleware
 * KV-based distributed rate limiting with sliding window algorithm
 */

import { getCurrentTimestamp } from '../crypto/utils';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  requestsPerMinute: number;
  kv: KVNamespace;
}

/**
 * Rate limit state for a key
 */
interface RateLimitState {
  windowStart: number; // Start of current window (Unix timestamp in seconds)
  requestCount: number; // Number of requests in current window
}

/**
 * Rate Limiting Middleware
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Get rate limit key from request
   * @param request - Request to get key for
   * @returns Rate limit key
   */
  private getRateLimitKey(request: Request): string {
    // Use X-Auth-Token header as key if available
    const token = request.headers.get('X-Auth-Token');
    if (token) {
      return `rate_limit:${token}`;
    }

    // Fallback to IP address
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    return `rate_limit:${ip}`;
  }

  /**
   * Get current rate limit state
   * @param key - Rate limit key
   * @returns Promise resolving to current state
   */
  private async getCurrentState(key: string): Promise<RateLimitState> {
    try {
      const currentTimestamp = getCurrentTimestamp();
      const stateJson = await this.config.kv.get(key, 'json');
      
      if (!stateJson) {
        // No existing state - create new window
        return {
          windowStart: currentTimestamp,
          requestCount: 0,
        };
      }

      const state = stateJson as RateLimitState;
      
      // Check if we're in a new window
      if (currentTimestamp - state.windowStart >= 60) {
        // New window - reset count
        return {
          windowStart: currentTimestamp,
          requestCount: 0,
        };
      }

      return state;
    } catch (error) {
      // KV might not be available - allow request
      return {
        windowStart: getCurrentTimestamp(),
        requestCount: 0,
      };
    }
  }

  /**
   * Update rate limit state
   * @param key - Rate limit key
   * @param state - New state
   * @returns Promise resolving when state is updated
   */
  private async updateState(key: string, state: RateLimitState): Promise<void> {
    try {
      // Calculate TTL to align with window end
      const currentTimestamp = getCurrentTimestamp();
      const windowEnd = state.windowStart + 60;
      const ttl = windowEnd - currentTimestamp;
      
      await this.config.kv.put(key, JSON.stringify(state), {
        expirationTtl: Math.max(ttl, 1), // At least 1 second
      });
    } catch (error) {
      // KV might not be available - fail silently
      console.error('Failed to update rate limit state:', error);
    }
  }

  /**
   * Check rate limit for request
   * @param request - Request to check
   * @returns Promise resolving to { allowed: boolean, retryAfter?: number }
   */
  async checkRateLimit(request: Request): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = this.getRateLimitKey(request);
    const currentState = await this.getCurrentState(key);
    
    if (currentState.requestCount >= this.config.requestsPerMinute) {
      // Rate limit exceeded
      const windowEnd = currentState.windowStart + 60;
      const currentTimestamp = getCurrentTimestamp();
      const retryAfter = Math.max(0, windowEnd - currentTimestamp);
      
      return { allowed: false, retryAfter };
    }

    // Increment count and update state
    currentState.requestCount++;
    await this.updateState(key, currentState);
    
    return { allowed: true };
  }

  /**
   * Create rate limiting middleware function
   * @param config - Rate limit configuration
   * @returns Middleware function
   */
  static createMiddleware(config: RateLimitConfig): (request: Request) => Promise<{ allowed: boolean; retryAfter?: number }> {
    const limiter = new RateLimiter(config);
    return async (request: Request) => limiter.checkRateLimit(request);
  }
}