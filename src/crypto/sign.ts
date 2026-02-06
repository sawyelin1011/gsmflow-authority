/**
 * ED25519 Signing for License Payloads
 * Creates cryptographic signatures for license data
 */

import { bytesToBase64 } from './utils';
import { importPrivateKey } from './keys';

/**
 * Sign data with ED25519 private key
 * @param data - Data to sign (stringified)
 * @param privateKeyBase64 - Base64 encoded private key
 * @returns Promise resolving to base64 encoded signature
 */
export async function signData(data: string, privateKeyBase64: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  
  const privateKey = await importPrivateKey(privateKeyBase64);
  
  const signature = await crypto.subtle.sign(
    {
      name: 'Ed25519',
    },
    privateKey,
    dataBytes
  );

  return bytesToBase64(new Uint8Array(signature));
}

/**
 * Sign data with derived key from environment secret
 * @param data - Data to sign (stringified)
 * @param secret - Environment secret for key derivation
 * @returns Promise resolving to base64 encoded signature
 */
export async function signDataWithSecret(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  
  const privateKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('gsmflow-license-authority-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    ),
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    {
      name: 'Ed25519',
    },
    privateKey,
    dataBytes
  );

  return bytesToBase64(new Uint8Array(signature));
}