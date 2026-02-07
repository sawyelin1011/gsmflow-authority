/**
 * KV Storage Operations
 * 
 * Handles revocation list and public key storage.
 * KV provides fast global reads with eventual consistency.
 */

import type { RevocationRecord } from "../types/license";

/**
 * Add license to revocation list.
 */
export async function addRevocation(
  kv: KVNamespace,
  licenseId: string,
  reason: string
): Promise<void> {
  const record: RevocationRecord = {
    license_id: licenseId,
    revoked_at: Math.floor(Date.now() / 1000),
    reason,
  };

  await kv.put(`revocations:${licenseId}`, JSON.stringify(record), {
    // Cache for 1 year (revocations are permanent)
    expirationTtl: 365 * 24 * 60 * 60,
  });
}

/**
 * Check if license is revoked.
 */
export async function isRevoked(
  kv: KVNamespace,
  licenseId: string
): Promise<RevocationRecord | null> {
  const value = await kv.get(`revocations:${licenseId}`, "text");
  
  if (!value) {
    return null;
  }

  return JSON.parse(value) as RevocationRecord;
}

/**
 * Store public key in KV.
 */
export async function storePublicKey(
  kv: KVNamespace,
  publicKey: string,
  keyId: string
): Promise<void> {
  await kv.put(`public_key:${keyId}`, publicKey);
}

/**
 * Get public key from KV.
 */
export async function getPublicKey(
  kv: KVNamespace,
  keyId: string
): Promise<string | null> {
  return await kv.get(`public_key:${keyId}`, "text");
}
