/**
 * Rate Limiting Middleware
 * 
 * Protects endpoints from abuse using simple in-memory tracking.
 * For production, consider Cloudflare Rate Limiting API.
 */

import { rateLimitResponse } from "../utils/response";

// Simple in-memory rate limiter (resets on Worker restart)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a given key.
 * 
 * Returns null if allowed, or an error Response if rate limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Response | null {
  const now = Math.floor(Date.now() / 1000);
  const entry = requestCounts.get(key);

  if (!entry || now >= entry.resetAt) {
    // New window
    requestCounts.set(key, {
      count: 1,
      resetAt: now + windowSeconds,
    });
    return null;
  }

  if (entry.count >= maxRequests) {
    return rateLimitResponse();
  }

  entry.count++;
  return null;
}

/**
 * Extract rate limit key from request.
 * Uses IP address or tenant ID.
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  return `${prefix}:${ip}`;
}
