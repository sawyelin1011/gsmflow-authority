/**
 * Cryptographic utilities for the License Authority
 * Includes base64 encoding/decoding, UUID generation, and timestamp helpers
 */

/**
 * Convert a byte array to base64 string
 * @param bytes - Uint8Array to encode
 * @returns Base64 encoded string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 string to byte array
 * @param base64 - Base64 encoded string
 * @returns Uint8Array decoded bytes
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a UUID v4
 * @returns Random UUID string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get current Unix timestamp in seconds
 * @returns Current timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Convert timestamp to ISO string
 * @param timestamp - Unix timestamp in seconds
 * @returns ISO formatted date string
 */
export function timestampToISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}