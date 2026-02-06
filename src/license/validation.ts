/**
 * License Validation
 * Validates license payloads and checks revocation status
 */

import { LicensePayload } from '../db/schema';
import { verifySignature } from '../crypto/verify';
import { getCurrentTimestamp } from '../crypto/utils';

/**
 * Validate license payload structure
 * @param payload - License payload to validate
 * @throws Will throw if payload structure is invalid
 */
export function validatePayloadStructure(payload: LicensePayload): void {
  if (!payload.license_id || typeof payload.license_id !== 'string') {
    throw new Error('Invalid license_id');
  }

  if (!payload.tenant_id || typeof payload.tenant_id !== 'string') {
    throw new Error('Invalid tenant_id');
  }

  if (!payload.plan_id || !['starter', 'pro', 'enterprise'].includes(payload.plan_id)) {
    throw new Error('Invalid plan_id');
  }

  if (!payload.allowed_domains || !Array.isArray(payload.allowed_domains)) {
    throw new Error('Invalid allowed_domains');
  }

  if (!payload.issued_at || typeof payload.issued_at !== 'number') {
    throw new Error('Invalid issued_at');
  }

  if (!payload.expires_at || typeof payload.expires_at !== 'number') {
    throw new Error('Invalid expires_at');
  }

  if (!payload.grace_days || typeof payload.grace_days !== 'number' || payload.grace_days < 0) {
    throw new Error('Invalid grace_days');
  }

  if (!payload.feature_flags || typeof payload.feature_flags !== 'object') {
    throw new Error('Invalid feature_flags');
  }

  if (!payload.signature || typeof payload.signature !== 'string') {
    throw new Error('Invalid signature');
  }
}

/**
 * Validate domain against allowed domains
 * @param domain - Domain to validate
 * @param allowedDomains - Allowed domains
 * @returns Promise resolving to boolean
 */
export function validateDomain(domain: string, allowedDomains: string[]): boolean {
  // Normalize domain
  const normalizedDomain = domain.toLowerCase().trim();

  // Check exact matches
  if (allowedDomains.includes(normalizedDomain)) {
    return true;
  }

  // Check wildcard matches (e.g., *.example.com)
  for (const allowedDomain of allowedDomains) {
    if (allowedDomain.startsWith('*.')) {
      const wildcardPattern = allowedDomain.substring(2); // Remove *. prefix
      
      // Check if domain ends with the wildcard pattern
      if (normalizedDomain.endsWith(wildcardPattern)) {
        // Ensure it's a subdomain match (not exact match)
        const domainWithoutPattern = normalizedDomain.slice(0, -wildcardPattern.length);
        if (domainWithoutPattern.endsWith('.')) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Validate license expiration
 * @param issuedAt - License issue timestamp
 * @param expiresAt - License expiration timestamp
 * @param graceDays - Grace period in days
 * @returns Promise resolving to boolean
 */
export function validateExpiration(issuedAt: number, expiresAt: number, graceDays: number): boolean {
  const currentTimestamp = getCurrentTimestamp();
  
  // Check if license is valid (issued_at <= current <= expires_at + grace_period)
  const gracePeriodSeconds = graceDays * 24 * 60 * 60;
  const effectiveExpiry = expiresAt + gracePeriodSeconds;
  
  return currentTimestamp >= issuedAt && currentTimestamp <= effectiveExpiry;
}

/**
 * Validate license signature
 * @param payload - License payload
 * @param publicKeyBase64 - Base64 encoded public key
 * @returns Promise resolving to boolean
 */
export async function validateSignature(payload: LicensePayload, publicKeyBase64: string): Promise<boolean> {
  // Reconstruct payload without signature for verification
  const { signature, ...payloadWithoutSignature } = payload;
  const payloadString = JSON.stringify(payloadWithoutSignature);
  
  return await verifySignature(payloadString, signature, publicKeyBase64);
}

/**
 * Complete license validation
 * @param payload - License payload
 * @param domain - Domain to validate against
 * @param publicKeyBase64 - Base64 encoded public key
 * @param isRevoked - Whether license is revoked
 * @returns Promise resolving to validation result
 */
export async function validateLicense(
  payload: LicensePayload,
  domain: string,
  publicKeyBase64: string,
  isRevoked: boolean
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  try {
    // 1. Validate payload structure
    validatePayloadStructure(payload);
    
    // 2. Validate signature
    const signatureValid = await validateSignature(payload, publicKeyBase64);
    if (!signatureValid) {
      return { valid: false, reason: 'Invalid signature' };
    }
    
    // 3. Check revocation status
    if (isRevoked) {
      return { valid: false, reason: 'License revoked' };
    }
    
    // 4. Validate domain
    const domainValid = validateDomain(domain, payload.allowed_domains);
    if (!domainValid) {
      return { valid: false, reason: 'Domain not allowed' };
    }
    
    // 5. Validate expiration
    const expirationValid = validateExpiration(
      payload.issued_at,
      payload.expires_at,
      payload.grace_days
    );
    if (!expirationValid) {
      return { valid: false, reason: 'License expired' };
    }
    
    // All validations passed
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Validation failed' };
  }
}