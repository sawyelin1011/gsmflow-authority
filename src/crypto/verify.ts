/**
 * ED25519 Signature Verification
 * Validates cryptographic signatures for license data
 */

import { base64ToBytes } from './utils';
import { importPublicKey } from './keys';

/**
 * Verify ED25519 signature
 * @param data - Original data (stringified)
 * @param signatureBase64 - Base64 encoded signature
 * @param publicKeyBase64 - Base64 encoded public key
 * @returns Promise resolving to boolean (true if valid)
 */
export async function verifySignature(
  data: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const signatureBytes = base64ToBytes(signatureBase64);
  
  const publicKey = await importPublicKey(publicKeyBase64);
  
  try {
    const isValid = await crypto.subtle.verify(
      {
        name: 'Ed25519',
      },
      publicKey,
      signatureBytes,
      dataBytes
    );
    
    return isValid;
  } catch (error) {
    // Verification failed
    return false;
  }
}

/**
 * Verify signature and throw if invalid
 * @param data - Original data (stringified)
 * @param signatureBase64 - Base64 encoded signature
 * @param publicKeyBase64 - Base64 encoded public key
 * @throws Will throw if signature is invalid
 */
export async function verifySignatureOrThrow(
  data: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<void> {
  const isValid = await verifySignature(data, signatureBase64, publicKeyBase64);
  
  if (!isValid) {
    throw new Error('Invalid signature');
  }
}