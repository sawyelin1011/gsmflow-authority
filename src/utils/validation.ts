export function isValidLicenseKey(licenseKey: string): boolean {
	// Basic format validation: XXXX-XXXX-XXXX-XXXX
	const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
	return pattern.test(licenseKey);
}

export function isValidEmail(email: string): boolean {
	const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return pattern.test(email);
}

export function isValidUserId(userId: string): boolean {
	return userId.length > 0 && userId.length <= 255;
}

export function isValidPlan(plan: string): boolean {
	const validPlans = ['free', 'basic', 'premium', 'enterprise'];
	return validPlans.includes(plan.toLowerCase());
}
