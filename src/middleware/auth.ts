import { errorResponse } from '../utils/response';

export function extractBearerToken(request: Request): string | null {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	return authHeader.substring(7);
}

export async function requireAuth(request: Request, env: Env): Promise<Response | null> {
	const token = extractBearerToken(request);

	if (!token) {
		return errorResponse('Unauthorized: Missing or invalid token', 401);
	}

	// TODO: Implement actual token validation
	// This could involve:
	// - JWT validation
	// - API key lookup in KV/D1
	// - OAuth token verification

	return null; // null means authentication passed
}
