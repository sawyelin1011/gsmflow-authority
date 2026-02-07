/**
 * HTTP Response Helpers
 * 
 * Standardized response formatting for the API.
 */

import type { ErrorResponse } from "../types/api";

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function errorResponse(
  error: string,
  code: string,
  status = 400,
  details?: unknown
): Response {
  const body: ErrorResponse = { error, code, details };
  return jsonResponse(body, status);
}

export function unauthorizedResponse(message = "Unauthorized"): Response {
  return errorResponse(message, "UNAUTHORIZED", 401);
}

export function forbiddenResponse(message = "Forbidden"): Response {
  return errorResponse(message, "FORBIDDEN", 403);
}

export function notFoundResponse(message = "Not found"): Response {
  return errorResponse(message, "NOT_FOUND", 404);
}

export function methodNotAllowedResponse(): Response {
  return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405);
}

export function rateLimitResponse(): Response {
  return errorResponse("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429);
}

export function internalErrorResponse(message = "Internal server error"): Response {
  return errorResponse(message, "INTERNAL_ERROR", 500);
}
