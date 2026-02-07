/**
 * D1 Database Operations
 * 
 * Handles tenant registry, license history, and audit logging.
 * D1 provides durable storage with SQL queries.
 */

import type { Tenant, TenantStatus } from "../types/license";

/**
 * Get tenant by ID.
 */
export async function getTenant(db: D1Database, tenantId: string): Promise<Tenant | null> {
  const result = await db
    .prepare("SELECT * FROM tenants WHERE tenant_id = ?")
    .bind(tenantId)
    .first<Tenant>();

  return result || null;
}

/**
 * Create a new tenant.
 */
export async function createTenant(
  db: D1Database,
  tenantId: string,
  name: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare("INSERT INTO tenants (tenant_id, name, created_at, status) VALUES (?, ?, ?, ?)")
    .bind(tenantId, name, now, "active")
    .run();
}

/**
 * Update tenant status.
 */
export async function updateTenantStatus(
  db: D1Database,
  tenantId: string,
  status: TenantStatus
): Promise<void> {
  await db
    .prepare("UPDATE tenants SET status = ? WHERE tenant_id = ?")
    .bind(status, tenantId)
    .run();
}

/**
 * Store issued license in audit trail.
 */
export async function storeLicense(
  db: D1Database,
  licenseId: string,
  tenantId: string,
  planId: string,
  allowedDomains: string[],
  issuedAt: number,
  expiresAt: number
): Promise<void> {
  const domainsJson = JSON.stringify(allowedDomains);
  
  await db
    .prepare(
      "INSERT INTO licenses (license_id, tenant_id, plan_id, allowed_domains, issued_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(licenseId, tenantId, planId, domainsJson, issuedAt, expiresAt)
    .run();
}

/**
 * Mark license as revoked.
 */
export async function revokeLicense(
  db: D1Database,
  licenseId: string,
  revokedAt: number,
  reason: string
): Promise<void> {
  await db
    .prepare("UPDATE licenses SET revoked_at = ?, revocation_reason = ? WHERE license_id = ?")
    .bind(revokedAt, reason, licenseId)
    .run();
}

/**
 * Check if license exists.
 */
export async function licenseExists(db: D1Database, licenseId: string): Promise<boolean> {
  const result = await db
    .prepare("SELECT 1 FROM licenses WHERE license_id = ?")
    .bind(licenseId)
    .first();

  return result !== null;
}

/**
 * Log an audit event.
 */
export async function logAudit(
  db: D1Database,
  action: string,
  actor: string,
  tenantId?: string,
  licenseId?: string,
  details?: unknown
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const detailsJson = details ? JSON.stringify(details) : null;

  await db
    .prepare(
      "INSERT INTO audit_log (timestamp, action, tenant_id, license_id, actor, details) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(timestamp, action, tenantId || null, licenseId || null, actor, detailsJson)
    .run();
}
