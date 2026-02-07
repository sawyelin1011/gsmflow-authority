/**
 * Cryptographic Key Management
 * 
 * Handles ED25519 keypair generation, import, and export.
 * Private keys are stored as Cloudflare Secrets.
 * Public keys are stored in KV and embedded in GSMFlow.
 */

/**
 * Generate a new ED25519 keypair for license signing.
 * 
 * This should be run ONCE during initial setup, not in production.
 * Store the private key as a Cloudflare Secret.
 * Store the public key in KV and embed in GSMFlow.
 */
export async function generateKeypair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const keypair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true, // extractable
    ["sign", "verify"]
  );

  // Export private key as PKCS8 format
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keypair.privateKey);
  const privateKey = bufferToBase64(privateKeyBuffer);

  // Export public key as SPKI format
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keypair.publicKey);
  const publicKey = bufferToBase64(publicKeyBuffer);

  return { privateKey, publicKey };
}

/**
 * Import private key from base64-encoded PKCS8 format.
 * Used to load the signing key from Cloudflare Secrets.
 */
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(base64Key);
  
  return await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "Ed25519" },
    false, // not extractable in production
    ["sign"]
  );
}

/**
 * Import public key from base64-encoded SPKI format.
 * Used for signature verification (though GSMFlow does this, not the authority).
 */
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(base64Key);
  
  return await crypto.subtle.importKey(
    "spki",
    keyBuffer,
    { name: "Ed25519" },
    true,
    ["verify"]
  );
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

/**
 * Convert base64 string to ArrayBuffer.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
