/**
 * HMAC-SHA256 Service Authentication
 * 
 * Protects internal API endpoints from unauthorized access.
 * Clients must include a valid HMAC signature in the Authorization header.
 */

/**
 * Generate HMAC-SHA256 signature for a request.
 * 
 * Signature format: HMAC-SHA256 <timestamp>:<signature>
 * Signature covers: method + path + timestamp + body
 */
export async function generateHMAC(
  method: string,
  path: string,
  body: string,
  secret: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method}:${path}:${timestamp}:${body}`;
  
  const signature = await computeHMAC(message, secret);
  
  return `HMAC-SHA256 ${timestamp}:${signature}`;
}

/**
 * Verify HMAC-SHA256 signature from Authorization header.
 * 
 * Returns true if signature is valid and not expired.
 */
export async function verifyHMAC(
  authHeader: string | null,
  method: string,
  path: string,
  body: string,
  secret: string
): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith("HMAC-SHA256 ")) {
    return false;
  }

  try {
    const parts = authHeader.substring(12).split(":");
    if (parts.length !== 2) {
      return false;
    }

    const [timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return false;
    }

    // Recompute signature
    const message = `${method}:${path}:${timestamp}:${body}`;
    const expectedSignature = await computeHMAC(message, secret);

    // Constant-time comparison
    return constantTimeEqual(providedSignature, expectedSignature);
  } catch {
    return false;
  }
}

/**
 * Compute HMAC-SHA256 signature.
 */
async function computeHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  
  return bufferToBase64(signature);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Convert ArrayBuffer to base64 string.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
