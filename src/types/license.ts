export interface License {
	licenseKey: string;
	userId: string;
	plan: string;
	status: LicenseStatus;
	issuedAt: string;
	expiresAt: string | null;
	metadata?: Record<string, unknown>;
}

export enum LicenseStatus {
	ACTIVE = 'active',
	EXPIRED = 'expired',
	REVOKED = 'revoked',
	SUSPENDED = 'suspended',
}

export interface LicenseValidationRequest {
	licenseKey: string;
}

export interface LicenseValidationResponse {
	valid: boolean;
	license?: License;
	reason?: string;
}

export interface LicenseIssuanceRequest {
	userId: string;
	plan: string;
	expiresAt?: string;
	metadata?: Record<string, unknown>;
}

export interface LicenseIssuanceResponse {
	success: boolean;
	license?: License;
	message?: string;
}

export interface LicenseRevocationResponse {
	success: boolean;
	message?: string;
}
