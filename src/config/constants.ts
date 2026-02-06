export const API_VERSION = '1.0.0';
export const SERVICE_NAME = 'gsmflow-authority';

export const LICENSE_KEY_FORMAT = {
	SEGMENTS: 4,
	SEGMENT_LENGTH: 4,
	SEPARATOR: '-',
	CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
};

export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
	MISSING_LICENSE_KEY: 'Missing licenseKey',
	MISSING_USER_ID: 'Missing userId or plan',
	UNAUTHORIZED: 'Unauthorized: Missing or invalid token',
	NOT_FOUND: 'Not Found',
	INTERNAL_ERROR: 'Internal Server Error',
} as const;
