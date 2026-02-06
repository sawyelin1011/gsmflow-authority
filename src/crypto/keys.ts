/**
 * ED25519 Key Management
 * Handles key generation, import/export, and key derivation
 */

import { bytesToBase64, base64ToBytes } from './utils';

/**
 * Generate ED25519 key pair
 * @returns Promise resolving to { privateKey: string, publicKey: string }
 */
export async function generateKeyPair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true, // extractable
    ['sign', 'verify']
  );

  const privateKey = await crypto.subtle.exportKey('pkcs8', (keyPair as CryptoKeyPair).privateKey);
  const publicKey = await crypto.subtle.exportKey('spki', (keyPair as CryptoKeyPair).publicKey);

  return {
    privateKey: bytesToBase64(new Uint8Array(privateKey as ArrayBuffer)),
    publicKey: bytesToBase64(new Uint8Array(publicKey as ArrayBuffer)),
  };
}

/**
 * Import ED25519 private key from base64
 * @param privateKeyBase64 - Base64 encoded private key
 * @returns CryptoKey for signing
 */
export async function importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const privateKeyBytes = base64ToBytes(privateKeyBase64);
  return await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true, // extractable
    ['sign']
  );
}

/**
 * Import ED25519 public key from base64
 * @param publicKeyBase64 - Base64 encoded public key
 * @returns CryptoKey for verification
 */
export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const publicKeyBytes = base64ToBytes(publicKeyBase64);
  return await crypto.subtle.importKey(
    'spki',
    publicKeyBytes,
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true, // extractable
    ['verify']
  );
}

/**
 * Derive private key from environment secret
 * @param secret - Environment secret string
 * @returns Promise resolving to CryptoKey
 */
export async function derivePrivateKeyFromSecret(secret: string): Promise<CryptoKey> {
  // Use PBKDF2 to derive a key from the secret
  const encoder = new TextEncoder();
  const salt = encoder.encode('gsmflow-license-authority-salt');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true,
    ['sign']
  );

  return derivedKey;
}