import { describe, it, expect, beforeAll, vi } from 'vitest';
import { DatabaseClient } from '../../src/db/client';
import { License, Revocation, AuditLog } from '../../src/db/schema';

// Mock D1Database
class MockD1Database {
  prepare(query: string) {
    return {
      bind: (...params: unknown[]) => ({
        run: async () => ({
          results: [],
          success: true,
          meta: {},
        }),
      }),
    };
  }
}

describe('Database Client', () => {
  let db: DatabaseClient;
  let mockD1: MockD1Database;

  beforeAll(() => {
    mockD1 = new MockD1Database();
    db = new DatabaseClient(mockD1 as unknown as D1Database);
  });

  it('should be created with D1 database', () => {
    expect(db).toBeInstanceOf(DatabaseClient);
  });

  it('should have methods for license operations', () => {
    expect(typeof db.getLicense).toBe('function');
    expect(typeof db.createLicense).toBe('function');
    expect(typeof db.updateLicense).toBe('function');
  });

  it('should have methods for revocation operations', () => {
    expect(typeof db.getRevocation).toBe('function');
    expect(typeof db.createRevocation).toBe('function');
    expect(typeof db.getAllRevocations).toBe('function');
  });

  it('should have methods for audit log operations', () => {
    expect(typeof db.createAuditLog).toBe('function');
    expect(typeof db.getAuditLogs).toBe('function');
  });

  it('should have transaction method', () => {
    expect(typeof db.transaction).toBe('function');
    expect(typeof db.execute).toBe('function');
  });

  it('should handle license creation with proper structure', async () => {
    const testLicense: Omit<License, 'created_at' | 'updated_at'> = {
      id: 'test-license-id',
      tenant_id: 'test-tenant',
      plan_id: 'pro',
      allowed_domains: ['example.com'],
      issued_at: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      grace_days: 7,
      feature_flags: { automation: true, multi_tenant: false },
      signature: 'test-signature',
    };

    // This will fail because we're using a mock, but we can test the structure
    await expect(db.createLicense(testLicense)).resolves.toBeDefined();
  });
});