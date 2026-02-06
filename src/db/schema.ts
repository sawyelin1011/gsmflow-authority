/**
 * Database Schema Definitions
 * TypeScript interfaces for all database entities
 */

export interface License {
  id: string;
  tenant_id: string;
  plan_id: 'starter' | 'pro' | 'enterprise';
  allowed_domains: string[];
  issued_at: number;
  expires_at: number;
  grace_days: number;
  feature_flags: {
    automation: boolean;
    multi_tenant: boolean;
  };
  signature: string;
  created_at: number;
  updated_at: number;
}

export interface Revocation {
  id: string;
  license_id: string;
  reason: string;
  revoked_at: number;
  revoked_by: string;
}

export interface AuditLog {
  id: string;
  action: 'LICENSE_ISSUED' | 'LICENSE_REVOKED' | 'LICENSE_VALIDATED' | 'AUTH_FAILURE';
  entity_id: string;
  entity_type: 'license' | 'revocation';
  performed_by: string;
  performed_at: number;
  metadata: Record<string, unknown>;
}

export interface LicensePayload {
  license_id: string;
  tenant_id: string;
  plan_id: 'starter' | 'pro' | 'enterprise';
  allowed_domains: string[];
  issued_at: number;
  expires_at: number;
  grace_days: number;
  feature_flags: {
    automation: boolean;
    multi_tenant: boolean;
  };
  signature: string;
}