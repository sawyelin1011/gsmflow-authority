/**
 * Authentication Middleware
 * 
 * Verifies HMAC signatures on protected endpoints.
 * Fail-closed: any auth failure returns 401.
 */

import { verifyHMAC } from "../crypto/hmac";
import { unauthorizedResponse } from "../utils/response";
import type { Env } from "../types/env";

/**
 * Authenticate request using HMAC-SHA256.
 * 
 * Returns null if authenticated, or an error Response if not.
 */
export async function authenticate(
  request: Request,
  env: Env
): Promise<Response | null> {
  const authHeader = request.headers.get("Authorization");
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  // Read body for HMAC verification
  // Clone request to avoid consuming the body
  const clonedRequest = request.clone();
  const body = method !== "GET" ? await clonedRequest.text() : "";

  const isValid = await verifyHMAC(
    authHeader,
    method,
    path,
    body,
    env.HMAC_SECRET
  );

  if (!isValid) {
    return unauthorizedResponse("Invalid or missing HMAC signature");
  }

  return null;
}
