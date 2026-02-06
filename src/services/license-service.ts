/**
 * License Service
 * Main business logic for license management
 */

import { LicensePayload } from '../db/schema';
import { DatabaseClient } from '../db/client';
import { RevocationCache } from '../cache/revocations';
import { createLicensePayload } from '../license/payload';
import { validateLicense } from '../license/validation';
import { getCurrentTimestamp } from '../crypto/utils';
import { generateKeyPair, importPublicKey } from '../crypto/keys';

export class LicenseService {
  constructor(
    private db: DatabaseClient,
    private cache: RevocationCache,
    private privateKeyBase64: string,
    private publicKeyBase64: string
  ) {}

  /**
   * Issue a new license
   * @param params - License parameters
   * @returns Promise resolving to issued license
   */
  async issueLicense(params: {
    tenant_id: string;
    plan_id: 'starter' | 'pro' | 'enterprise';
    allowed_domains: string[];
    expires_at: number;
    grace_days: number;
    feature_flags: {
      automation: boolean;
      multi_tenant: boolean;
    };
  }): Promise<LicensePayload> {
    const licenseId = crypto.randomUUID();
    
    // Create signed license payload
    const payload = await createLicensePayload(
      {
        license_id: licenseId,
        tenant_id: params.tenant_id,
        plan_id: params.plan_id,
        allowed_domains: params.allowed_domains,
        expires_at: params.expires_at,
        grace_days: params.grace_days,
        feature_flags: params.feature_flags,
      },
      this.privateKeyBase64
    );
    
    // Save to database
    const licenseToCreate: any = {
      id: licenseId,
      tenant_id: params.tenant_id,
      plan_id: params.plan_id,
      allowed_domains: params.allowed_domains,
      issued_at: payload.issued_at,
      expires_at: params.expires_at,
      grace_days: params.grace_days,
      feature_flags: params.feature_flags,
      signature: payload.signature,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };
    await this.db.createLicense(licenseToCreate);
    
    // Create audit log
    await this.db.createAuditLog({
      id: crypto.randomUUID(),
      action: 'LICENSE_ISSUED',
      entity_id: licenseId,
      entity_type: 'license',
      performed_by: 'system',
      metadata: {
        tenant_id: params.tenant_id,
        plan_id: params.plan_id,
      },
    });
    
    return payload;
  }

  /**
   * Revoke a license
   * @param licenseId - License ID to revoke
   * @param reason - Reason for revocation
   * @param revokedBy - Who revoked the license
   * @returns Promise resolving when revocation is complete
   */
  async revokeLicense(licenseId: string, reason: string, revokedBy: string): Promise<void> {
    // Check if license exists
    const license = await this.db.getLicense(licenseId);
    if (!license) {
      throw new Error('License not found');
    }
    
    // Add to revocations table
    await this.db.createRevocation({
      id: crypto.randomUUID(),
      license_id: licenseId,
      reason,
      revoked_by: revokedBy,
    });
    
    // Invalidate cache
    await this.cache.invalidateCache();
    
    // Create audit log
    await this.db.createAuditLog({
      id: crypto.randomUUID(),
      action: 'LICENSE_REVOKED',
      entity_id: licenseId,
      entity_type: 'license',
      performed_by: revokedBy,
      metadata: {
        reason,
        tenant_id: license.tenant_id,
      },
    });
  }

  /**
   * Validate a license
   * @param payload - License payload to validate
   * @param domain - Domain to validate against
   * @returns Promise resolving to validation result
   */
  async validateLicense(payload: LicensePayload, domain: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check if license is revoked
    const isRevoked = await this.cache.isRevoked(payload.license_id);
    
    // Validate license
    return await validateLicense(payload, domain, this.publicKeyBase64, isRevoked);
  }

  /**
   * Get public key for license verification
   * @returns Promise resolving to public key in PEM format
   */
  async getPublicKey(): Promise<string> {
    // Import the public key
    const publicKey = await importPublicKey(this.publicKeyBase64);
    
    // Export to PEM format
    const exportedKey = await crypto.subtle.exportKey('spki', publicKey);
    
    // Convert to PEM format
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const exportedKeyArray = new Uint8Array(exportedKey as ArrayBuffer);
    const base64Key = btoa(String.fromCharCode(...exportedKeyArray));
    
    // Add line breaks every 64 characters
    const pemBody = base64Key.match(/.{1,64}/g)?.join('\n') || base64Key;
    
    return `${pemHeader}\n${pemBody}\n${pemFooter}`;
  }

  /**
   * Get license by ID
   * @param licenseId - License ID
   * @returns Promise resolving to license or null
   */
  async getLicense(licenseId: string): Promise<LicensePayload | null> {
    const license = await this.db.getLicense(licenseId);
    
    if (!license) {
      return null;
    }
    
    return {
      license_id: license.id,
      tenant_id: license.tenant_id,
      plan_id: license.plan_id,
      allowed_domains: license.allowed_domains,
      issued_at: license.issued_at,
      expires_at: license.expires_at,
      grace_days: license.grace_days,
      feature_flags: license.feature_flags,
      signature: license.signature,
    };
  }

  /**
   * Check if license is revoked
   * @param licenseId - License ID to check
   * @returns Promise resolving to boolean
   */
  async isRevoked(licenseId: string): Promise<boolean> {
    return await this.cache.isRevoked(licenseId);
  }

  /**
   * Prefetch revocations into cache
   * @returns Promise resolving when prefetch is complete
   */
  async prefetchRevocations(): Promise<void> {
    const revocations = await this.db.getAllRevocations();
    await this.cache.prefetchRevocations(revocations);
  }

  /**
   * Generate new key pair
   * @returns Promise resolving to new key pair
   */
  static async generateKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
  }> {
    return await generateKeyPair();
  }
}