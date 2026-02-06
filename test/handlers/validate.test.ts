import { describe, it, expect, beforeAll } from 'vitest';
import { LicenseService } from '../../src/services/license-service';
import { DatabaseClient } from '../../src/db/client';
import { RevocationCache } from '../../src/cache/revocations';
import { generateKeyPair } from '../../src/crypto/keys';
import { createLicensePayload } from '../../src/license/payload';

// Mock implementations
class MockDatabaseClient extends DatabaseClient {
  constructor() {
    super(null as unknown as D1Database);
  }

  async getLicense() {
    return null;
  }
}

class MockRevocationCache extends RevocationCache {
  private revokedLicenses: string[] = [];

  constructor() {
    super(null as unknown as KVNamespace);
  }

  async isRevoked(licenseId: string) {
    return this.revokedLicenses.includes(licenseId);
  }

  async addRevocation(licenseId: string) {
    this.revokedLicenses.push(licenseId);
  }
}

describe('License Service - Validate License', () => {
  let licenseService: LicenseService;
  let mockCache: MockRevocationCache;
  let keyPair: { privateKey: string; publicKey: string };

  beforeAll(async () => {
    keyPair = await generateKeyPair();
    
    const mockDb = new MockDatabaseClient();
    mockCache = new MockRevocationCache();
    
    licenseService = new LicenseService(
      mockDb,
      mockCache,
      keyPair.privateKey,
      keyPair.publicKey
    );
  }, 10000);

  it('should validate valid license', async () => {
    const payload = await createLicensePayload({
      license_id: 'test-license-id',
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
    }, keyPair.privateKey);

    const result = await licenseService.validateLicense(payload, 'example.com');

    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should reject revoked license', async () => {
    const payload = await createLicensePayload({
      license_id: 'revoked-license-id',
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
    }, keyPair.privateKey);

    // Mark as revoked
    await mockCache.addRevocation('revoked-license-id');

    const result = await licenseService.validateLicense(payload, 'example.com');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('License revoked');
  });

  it('should reject license with invalid domain', async () => {
    const payload = await createLicensePayload({
      license_id: 'test-license-id-2',
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
    }, keyPair.privateKey);

    const result = await licenseService.validateLicense(payload, 'invalid-domain.com');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Domain not allowed');
  });

  it('should reject expired license', async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
    const payload = await createLicensePayload({
      license_id: 'expired-license-id',
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['example.com'],
      expires_at: pastTimestamp,
      grace_days: 0, // No grace period
      feature_flags: { automation: true, multi_tenant: false },
    }, keyPair.privateKey);

    const result = await licenseService.validateLicense(payload, 'example.com');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('License expired');
  });

  it('should accept license within grace period', async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
    const payload = await createLicensePayload({
      license_id: 'grace-period-license-id',
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['example.com'],
      expires_at: pastTimestamp,
      grace_days: 7, // 7 day grace period
      feature_flags: { automation: true, multi_tenant: false },
    }, keyPair.privateKey);

    const result = await licenseService.validateLicense(payload, 'example.com');

    expect(result.valid).toBe(true);
  });

  it('should validate wildcard domains', async () => {
    const payload = await createLicensePayload({
      license_id: 'wildcard-license-id',
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['*.example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
    }, keyPair.privateKey);

    const result = await licenseService.validateLicense(payload, 'sub.example.com');

    expect(result.valid).toBe(true);
  });
});