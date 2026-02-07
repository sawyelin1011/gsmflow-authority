/**
 * License Signing and Verification
 * 
 * Core cryptographic operations for license issuance.
 * Uses ED25519 for fast, secure signatures.
 */

import type { LicensePayload, SignedLicense } from "../types/license";
import { importPrivateKey } from "./keys";

/**
 * Sign a license payload with the authority's private key.
 * 
 * The signature covers all fields in the payload.
 * Returns a complete SignedLicense ready for delivery.
 */
export async function signLicense(
  payload: LicensePayload,
  privateKeyBase64: string
): Promise<SignedLicense> {
  // Import the private key
  const privateKey = await importPrivateKey(privateKeyBase64);

  // Serialize payload to canonical JSON (sorted keys for determinism)
  const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
  const payloadBytes = new TextEncoder().encode(payloadJson);

  // Sign with ED25519
  const signatureBuffer = await crypto.subtle.sign(
    { name: "Ed25519" },
    privateKey,
    payloadBytes
  );

  // Convert signature to base64
  const signature = bufferToBase64(signatureBuffer);

  // Return signed license
  return {
    ...payload,
    signature,
  };
}

/**
 * Verify a license signature (for testing purposes).
 * 
 * In production, GSMFlow performs this verification offline.
 * The authority doesn't need to verify licenses.
 */
export async function verifyLicense(
  license: SignedLicense,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    // Import public key
    const publicKeyBuffer = base64ToBuffer(publicKeyBase64);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    // Extract payload (everything except signature)
    const { signature, ...payload } = license;

    // Serialize payload to canonical JSON
    const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
    const payloadBytes = new TextEncoder().encode(payloadJson);

    // Decode signature
    const signatureBuffer = base64ToBuffer(signature);

    // Verify signature
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signatureBuffer,
      payloadBytes
    );
  } catch {
    return false;
  }
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
