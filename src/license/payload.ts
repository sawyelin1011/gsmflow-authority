/**
 * License Payload Construction
 * Creates signed license payloads for issuance
 */

import { LicensePayload } from '../db/schema';
import { signData } from '../crypto/sign';
import { getCurrentTimestamp } from '../crypto/utils';

/**
 * Create license payload
 * @param params - License parameters
 * @param privateKeyBase64 - Base64 encoded private key for signing
 * @returns Promise resolving to signed license payload
 */
export async function createLicensePayload(
  params: {
    license_id: string;
    tenant_id: string;
    plan_id: 'starter' | 'pro' | 'enterprise';
    allowed_domains: string[];
    expires_at: number;
    grace_days: number;
    feature_flags: {
      automation: boolean;
      multi_tenant: boolean;
    };
  },
  privateKeyBase64: string
): Promise<LicensePayload> {
  const issued_at = getCurrentTimestamp();
  
  // Create payload without signature
  const payloadWithoutSignature: Omit<LicensePayload, 'signature'> = {
    license_id: params.license_id,
    tenant_id: params.tenant_id,
    plan_id: params.plan_id,
    allowed_domains: params.allowed_domains,
    issued_at,
    expires_at: params.expires_at,
    grace_days: params.grace_days,
    feature_flags: params.feature_flags,
  };
  
  // Sign the payload
  const payloadString = JSON.stringify(payloadWithoutSignature);
  const signature = await signData(payloadString, privateKeyBase64);
  
  // Return complete payload with signature
  return {
    ...payloadWithoutSignature,
    signature,
  };
}

/**
 * Create license payload with secret-based signing
 * @param params - License parameters
 * @param secret - Environment secret for key derivation
 * @returns Promise resolving to signed license payload
 */
export async function createLicensePayloadWithSecret(
  params: {
    license_id: string;
    tenant_id: string;
    plan_id: 'starter' | 'pro' | 'enterprise';
    allowed_domains: string[];
    expires_at: number;
    grace_days: number;
    feature_flags: {
      automation: boolean;
      multi_tenant: boolean;
    };
  },
  secret: string
): Promise<LicensePayload> {
  const issued_at = getCurrentTimestamp();
  
  // Create payload without signature
  const payloadWithoutSignature: Omit<LicensePayload, 'signature'> = {
    license_id: params.license_id,
    tenant_id: params.tenant_id,
    plan_id: params.plan_id,
    allowed_domains: params.allowed_domains,
    issued_at,
    expires_at: params.expires_at,
    grace_days: params.grace_days,
    feature_flags: params.feature_flags,
  };
  
  // Sign the payload using secret-based signing
  const payloadString = JSON.stringify(payloadWithoutSignature);
  const signature = await signData(payloadString, secret);
  
  // Return complete payload with signature
  return {
    ...payloadWithoutSignature,
    signature,
  };
}