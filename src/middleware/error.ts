/**
 * Error Handling Middleware
 * 
 * Catches and formats errors consistently.
 * Never exposes internal details in production.
 */

import { internalErrorResponse, errorResponse } from "../utils/response";

/**
 * Wrap handler with error catching.
 */
export function withErrorHandling(
  handler: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>
) {
  return async (request: Request, env: any, ctx: ExecutionContext): Promise<Response> => {
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      console.error("Handler error:", error);

      // Known validation errors
      if (error instanceof Error && error.message.includes("Invalid")) {
        return errorResponse(error.message, "VALIDATION_ERROR", 400);
      }

      // Generic internal error (don't leak details)
      return internalErrorResponse();
    }
  };
}
