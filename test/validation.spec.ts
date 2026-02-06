import { describe, it, expect } from 'vitest';
import { isValidLicenseKey, isValidEmail, isValidUserId, isValidPlan } from '../src/utils/validation';

describe('Validation Utilities', () => {
	describe('isValidLicenseKey', () => {
		it('validates correct license key format', () => {
			expect(isValidLicenseKey('ABCD-1234-EFGH-5678')).toBe(true);
			expect(isValidLicenseKey('AAAA-BBBB-CCCC-DDDD')).toBe(true);
			expect(isValidLicenseKey('0000-1111-2222-3333')).toBe(true);
		});

		it('rejects invalid license key formats', () => {
			expect(isValidLicenseKey('ABCD-1234')).toBe(false);
			expect(isValidLicenseKey('ABCD-1234-EFGH')).toBe(false);
			expect(isValidLicenseKey('abcd-1234-efgh-5678')).toBe(false);
			expect(isValidLicenseKey('ABCD_1234_EFGH_5678')).toBe(false);
			expect(isValidLicenseKey('')).toBe(false);
		});
	});

	describe('isValidEmail', () => {
		it('validates correct email format', () => {
			expect(isValidEmail('user@example.com')).toBe(true);
			expect(isValidEmail('test.user@example.co.uk')).toBe(true);
		});

		it('rejects invalid email formats', () => {
			expect(isValidEmail('invalid')).toBe(false);
			expect(isValidEmail('invalid@')).toBe(false);
			expect(isValidEmail('@example.com')).toBe(false);
			expect(isValidEmail('')).toBe(false);
		});
	});

	describe('isValidUserId', () => {
		it('validates correct user IDs', () => {
			expect(isValidUserId('user123')).toBe(true);
			expect(isValidUserId('a')).toBe(true);
		});

		it('rejects invalid user IDs', () => {
			expect(isValidUserId('')).toBe(false);
			expect(isValidUserId('a'.repeat(256))).toBe(false);
		});
	});

	describe('isValidPlan', () => {
		it('validates correct plan names', () => {
			expect(isValidPlan('free')).toBe(true);
			expect(isValidPlan('basic')).toBe(true);
			expect(isValidPlan('premium')).toBe(true);
			expect(isValidPlan('enterprise')).toBe(true);
			expect(isValidPlan('Premium')).toBe(true); // case insensitive
		});

		it('rejects invalid plan names', () => {
			expect(isValidPlan('invalid')).toBe(false);
			expect(isValidPlan('pro')).toBe(false);
			expect(isValidPlan('')).toBe(false);
		});
	});
});
