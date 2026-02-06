import { describe, it, expect, beforeAll, vi } from 'vitest';
import { LicenseService } from '../../src/services/license-service';
import { DatabaseClient } from '../../src/db/client';
import { RevocationCache } from '../../src/cache/revocations';
import { generateKeyPair } from '../../src/crypto/keys';

// Mock implementations
class MockDatabaseClient extends DatabaseClient {
  constructor() {
    super(null as unknown as D1Database);
  }

  async createLicense(license: any) {
    return { ...license, id: 'mock-license-id' };
  }

  async createAuditLog(log: any) {
    return log;
  }
}

class MockRevocationCache extends RevocationCache {
  constructor() {
    super(null as unknown as KVNamespace);
  }

  async isRevoked() {
    return false;
  }
}

describe('License Service - Issue License', () => {
  let licenseService: LicenseService;
  let keyPair: { privateKey: string; publicKey: string };

  beforeAll(async () => {
    keyPair = await generateKeyPair();
    
    const mockDb = new MockDatabaseClient();
    const mockCache = new MockRevocationCache();
    
    licenseService = new LicenseService(
      mockDb,
      mockCache,
      keyPair.privateKey,
      keyPair.publicKey
    );
  }, 10000);

  it('should issue a valid license', async () => {
    const license = await licenseService.issueLicense({
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['example.com'],
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
    });

    expect(license).toBeDefined();
    expect(license).toHaveProperty('license_id');
    expect(license).toHaveProperty('tenant_id', 'test-tenant');
    expect(license).toHaveProperty('plan_id', 'pro');
    expect(license).toHaveProperty('allowed_domains');
    expect(license).toHaveProperty('issued_at');
    expect(license).toHaveProperty('expires_at');
    expect(license).toHaveProperty('grace_days', 7);
    expect(license).toHaveProperty('feature_flags');
    expect(license).toHaveProperty('signature');
    expect(license.signature.length).toBeGreaterThan(0);
  });

  it('should create signed license payload', async () => {
    const license = await licenseService.issueLicense({
      tenant_id: 'test-tenant-2',
      plan_id: 'enterprise',
      allowed_domains: ['*.example.com', 'test.com'],
      expires_at: Math.floor(Date.now() / 1000) + 172800,
      grace_days: 14,
      feature_flags: { automation: true, multi_tenant: true },
    });

    expect(license.license_id).toBeTypeOf('string');
    expect(license.signature).toBeTypeOf('string');
    expect(license.signature.length).toBeGreaterThan(0);
  });

  it('should handle different plan types', async () => {
    const plans: ('starter' | 'pro' | 'enterprise')[] = ['starter', 'pro', 'enterprise'];
    
    for (const plan of plans) {
      const license = await licenseService.issueLicense({
        tenant_id: 'test-tenant',
        plan_id: plan,
        allowed_domains: ['example.com'],
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        grace_days: 7,
        feature_flags: { automation: false, multi_tenant: false },
      });

      expect(license.plan_id).toBe(plan);
    }
  });
});