/**
 * D1 Database Client
 * Wrapper around Cloudflare D1 database operations
 */

import { License, Revocation, AuditLog } from './schema';

export class DatabaseClient {
  constructor(private db: D1Database) {}

  /**
   * Execute a prepared statement
   * @param query - SQL query
   * @param params - Query parameters
   * @returns Promise resolving to query result
   */
  async execute(query: string, params: unknown[] = []): Promise<D1Result> {
    return await this.db.prepare(query).bind(...params).run();
  }

  /**
   * Execute in transaction
   * @param queries - Array of { query, params } to execute
   * @returns Promise resolving to array of results
   */
  async transaction(queries: Array<{ query: string; params: unknown[] }>): Promise<D1Result[]> {
    const results: D1Result[] = [];
    
    try {
      for (const { query, params } of queries) {
        const result = await this.execute(query, params);
        results.push(result);
      }
      return results;
    } catch (error) {
      // Transaction failed - rollback by throwing
      throw error;
    }
  }

  /**
   * Get license by ID
   * @param licenseId - License ID
   * @returns Promise resolving to License or null
   */
  async getLicense(licenseId: string): Promise<License | null> {
    const result = await this.execute(
      'SELECT * FROM licenses WHERE id = ?',
      [licenseId]
    );
    
    if (result.results.length === 0) {
      return null;
    }
    
    return result.results[0] as unknown as License;
  }

  /**
   * Create new license
   * @param license - License data
   * @returns Promise resolving to created license
   */
  async createLicense(license: Omit<License, 'created_at' | 'updated_at'>): Promise<License> {
    const now = Math.floor(Date.now() / 1000);
    const createdLicense = { ...license, created_at: now, updated_at: now };
    
    await this.execute(
      `INSERT INTO licenses (
        id, tenant_id, plan_id, allowed_domains, issued_at, expires_at, 
        grace_days, feature_flags, signature, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createdLicense.id,
        createdLicense.tenant_id,
        createdLicense.plan_id,
        JSON.stringify(createdLicense.allowed_domains),
        createdLicense.issued_at,
        createdLicense.expires_at,
        createdLicense.grace_days,
        JSON.stringify(createdLicense.feature_flags),
        createdLicense.signature,
        createdLicense.created_at,
        createdLicense.updated_at,
      ]
    );
    
    return createdLicense;
  }

  /**
   * Update license
   * @param license - License data
   * @returns Promise resolving to updated license
   */
  async updateLicense(license: License): Promise<License> {
    const now = Math.floor(Date.now() / 1000);
    const updatedLicense = { ...license, updated_at: now };
    
    await this.execute(
      `UPDATE licenses SET
        tenant_id = ?,
        plan_id = ?,
        allowed_domains = ?,
        issued_at = ?,
        expires_at = ?,
        grace_days = ?,
        feature_flags = ?,
        signature = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        updatedLicense.tenant_id,
        updatedLicense.plan_id,
        JSON.stringify(updatedLicense.allowed_domains),
        updatedLicense.issued_at,
        updatedLicense.expires_at,
        updatedLicense.grace_days,
        JSON.stringify(updatedLicense.feature_flags),
        updatedLicense.signature,
        updatedLicense.updated_at,
        updatedLicense.id,
      ]
    );
    
    return updatedLicense;
  }

  /**
   * Get revocation by license ID
   * @param licenseId - License ID
   * @returns Promise resolving to Revocation or null
   */
  async getRevocation(licenseId: string): Promise<Revocation | null> {
    const result = await this.execute(
      'SELECT * FROM revocations WHERE license_id = ?',
      [licenseId]
    );
    
    if (result.results.length === 0) {
      return null;
    }
    
    return result.results[0] as unknown as Revocation;
  }

  /**
   * Create revocation
   * @param revocation - Revocation data
   * @returns Promise resolving to created revocation
   */
  async createRevocation(revocation: Omit<Revocation, 'revoked_at'>): Promise<Revocation> {
    const now = Math.floor(Date.now() / 1000);
    const createdRevocation = { ...revocation, revoked_at: now };
    
    await this.execute(
      'INSERT INTO revocations (id, license_id, reason, revoked_at, revoked_by) VALUES (?, ?, ?, ?, ?)',
      [
        createdRevocation.id,
        createdRevocation.license_id,
        createdRevocation.reason,
        createdRevocation.revoked_at,
        createdRevocation.revoked_by,
      ]
    );
    
    return createdRevocation;
  }

  /**
   * Get all revocations
   * @returns Promise resolving to array of revocations
   */
  async getAllRevocations(): Promise<Revocation[]> {
    const result = await this.execute('SELECT * FROM revocations');
    return result.results as unknown as Revocation[];
  }

  /**
   * Create audit log entry
   * @param log - Audit log data
   * @returns Promise resolving to created audit log
   */
  async createAuditLog(log: Omit<AuditLog, 'performed_at'>): Promise<AuditLog> {
    const now = Math.floor(Date.now() / 1000);
    const createdLog = { ...log, performed_at: now };
    
    await this.execute(
      'INSERT INTO audit_logs (id, action, entity_id, entity_type, performed_by, performed_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        createdLog.id,
        createdLog.action,
        createdLog.entity_id,
        createdLog.entity_type,
        createdLog.performed_by,
        createdLog.performed_at,
        JSON.stringify(createdLog.metadata),
      ]
    );
    
    return createdLog;
  }

  /**
   * Get audit logs for entity
   * @param entityId - Entity ID
   * @param entityType - Entity type
   * @returns Promise resolving to array of audit logs
   */
  async getAuditLogs(entityId: string, entityType: string): Promise<AuditLog[]> {
    const result = await this.execute(
      'SELECT * FROM audit_logs WHERE entity_id = ? AND entity_type = ? ORDER BY performed_at DESC',
      [entityId, entityType]
    );
    
    return result.results as unknown as AuditLog[];
  }
}