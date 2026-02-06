import { describe, it, expect, beforeAll } from 'vitest';
import { LicenseService } from '../../src/services/license-service';
import { DatabaseClient } from '../../src/db/client';
import { RevocationCache } from '../../src/cache/revocations';
import { generateKeyPair } from '../../src/crypto/keys';

// Mock implementations
class MockDatabaseClient extends DatabaseClient {
  private licenses: any[] = [];
  private revocations: any[] = [];
  private auditLogs: any[] = [];

  constructor() {
    super(null as unknown as D1Database);
  }

  async createLicense(license: any) {
    const createdLicense = { ...license, created_at: Date.now(), updated_at: Date.now() };
    this.licenses.push(createdLicense);
    return createdLicense;
  }

  async getLicense(licenseId: string) {
    return this.licenses.find(l => l.id === licenseId) || null;
  }

  async createRevocation(revocation: any) {
    const createdRevocation = { ...revocation, revoked_at: Date.now() };
    this.revocations.push(createdRevocation);
    return createdRevocation;
  }

  async getAllRevocations() {
    return this.revocations;
  }

  async createAuditLog(log: any) {
    const createdLog = { ...log, performed_at: Date.now() };
    this.auditLogs.push(createdLog);
    return createdLog;
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
    if (!this.revokedLicenses.includes(licenseId)) {
      this.revokedLicenses.push(licenseId);
    }
  }

  async invalidateCache() {
    // Don't clear the list, just ensure it's updated
    // The actual invalidation happens in the real implementation
  }

  async prefetchRevocations(revocations: any[]) {
    this.revokedLicenses = revocations.map(r => r.license_id);
  }
}

describe('License Service - Complete Flow Integration', () => {
  let licenseService: LicenseService;
  let mockDb: MockDatabaseClient;
  let mockCache: MockRevocationCache;
  let keyPair: { privateKey: string; publicKey: string };

  beforeAll(async () => {
    keyPair = await generateKeyPair();
    
    mockDb = new MockDatabaseClient();
    mockCache = new MockRevocationCache();
    
    licenseService = new LicenseService(
      mockDb,
      mockCache,
      keyPair.privateKey,
      keyPair.publicKey
    );
  }, 10000);

  it('should handle complete license lifecycle: issue -> validate -> revoke -> validate-fails', async () => {
    // Step 1: Issue a license
    const expiresAt = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const license = await licenseService.issueLicense({
      tenant_id: 'integration-test-tenant',
      plan_id: 'pro',
      allowed_domains: ['integration.example.com'],
      expires_at: expiresAt,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
    });

    expect(license).toBeDefined();
    expect(license.license_id).toBeTypeOf('string');
    expect(license.signature).toBeTypeOf('string');

    // Step 2: Validate the license (should be valid)
    const validationResult1 = await licenseService.validateLicense(license, 'integration.example.com');
    expect(validationResult1.valid).toBe(true);

    // Step 3: Revoke the license
    await licenseService.revokeLicense(license.license_id, 'Integration test revocation', 'test-system');

    // Step 4: Validate the license again (should be invalid due to revocation)
    const validationResult2 = await licenseService.validateLicense(license, 'integration.example.com');
    expect(validationResult2.valid).toBe(false);
    expect(validationResult2.reason).toBe('License revoked');

    // Verify database state
    const dbLicense = await mockDb.getLicense(license.license_id);
    expect(dbLicense).not.toBeNull();
    expect(dbLicense!.id).toBe(license.license_id);

    const revocations = await mockDb.getAllRevocations();
    expect(revocations.length).toBe(1);
    expect(revocations[0].license_id).toBe(license.license_id);

    const auditLogs = mockDb['auditLogs'];
    expect(auditLogs.length).toBe(2); // LICENSE_ISSUED and LICENSE_REVOKED
    expect(auditLogs[0].action).toBe('LICENSE_ISSUED');
    expect(auditLogs[1].action).toBe('LICENSE_REVOKED');
  });

  it('should handle multiple licenses and selective revocation', async () => {
    // Issue multiple licenses
    const license1 = await licenseService.issueLicense({
      tenant_id: 'tenant-1',
      plan_id: 'starter',
      allowed_domains: ['tenant1.example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: false, multi_tenant: false },
    });

    const license2 = await licenseService.issueLicense({
      tenant_id: 'tenant-2',
      plan_id: 'enterprise',
      allowed_domains: ['tenant2.example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 14,
      feature_flags: { automation: true, multi_tenant: true },
    });

    // Both should be valid initially
    const result1 = await licenseService.validateLicense(license1, 'tenant1.example.com');
    const result2 = await licenseService.validateLicense(license2, 'tenant2.example.com');
    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);

    // Revoke only license1
    await licenseService.revokeLicense(license1.license_id, 'Test revocation', 'test-system');

    // license1 should be invalid, license2 should still be valid
    const result1AfterRevoke = await licenseService.validateLicense(license1, 'tenant1.example.com');
    const result2AfterRevoke = await licenseService.validateLicense(license2, 'tenant2.example.com');
    expect(result1AfterRevoke.valid).toBe(false);
    expect(result2AfterRevoke.valid).toBe(true);
  });

  it('should handle cache invalidation on revocation', async () => {
    // Issue a license
    const license = await licenseService.issueLicense({
      tenant_id: 'cache-test-tenant',
      plan_id: 'pro',
      allowed_domains: ['cache.example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
    });

    // Validate (should be valid)
    let result = await licenseService.validateLicense(license, 'cache.example.com');
    expect(result.valid).toBe(true);

    // Revoke the license
    await licenseService.revokeLicense(license.license_id, 'Cache test', 'test-system');

    // Validate again (should be invalid and use updated cache)
    result = await licenseService.validateLicense(license, 'cache.example.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('License revoked');
  });
});