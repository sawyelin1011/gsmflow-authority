/**
 * Input Validation Utilities
 * 
 * Validates API requests before processing.
 * Fail-fast with clear error messages.
 */

import type { PlanId } from "../types/license";

// Accept any valid UUID format (not just v4)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN_REGEX = /^(\*\.)?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain);
}

export function isValidPlanId(planId: string): planId is PlanId {
  return ["starter", "pro", "enterprise"].includes(planId);
}

export function validateDomains(domains: string[]): void {
  if (!Array.isArray(domains) || domains.length === 0) {
    throw new Error("allowed_domains must be a non-empty array");
  }
  
  for (const domain of domains) {
    if (!isValidDomain(domain)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }
  }
}

export function validateTimestamp(timestamp: number, fieldName: string): void {
  if (!Number.isInteger(timestamp) || timestamp <= 0) {
    throw new Error(`${fieldName} must be a positive integer timestamp`);
  }
  
  // Sanity check: not too far in the past or future
  const now = Math.floor(Date.now() / 1000);
  const oneYearAgo = now - (365 * 24 * 60 * 60);
  const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60);
  
  if (timestamp < oneYearAgo || timestamp > tenYearsFromNow) {
    throw new Error(`${fieldName} is outside reasonable range`);
  }
}
