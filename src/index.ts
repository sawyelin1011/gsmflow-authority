import { Router } from './router';
import { errorResponse, jsonResponse } from './utils/response';
import { LicenseService } from './services/license-service';

export default {
    async fetch(request, env, ctx): Promise<Response> {
        try {
            const router = new Router();
            const licenseService = new LicenseService(env);

            // Health check endpoint
            router.get('/health', async () => {
                return jsonResponse({
                    status: 'ok',
                    service: 'gsmflow-authority',
                    timestamp: new Date().toISOString(),
                });
            });

            // API version endpoint
            router.get('/api/v1/version', async () => {
                return jsonResponse({
                    version: '1.0.0',
                    service: 'gsmflow-authority',
                });
            });

            // License validation endpoint
            router.post('/api/v1/license/validate', async (request) => {
                const body = await request.json() as { licenseKey?: string };

                if (!body.licenseKey) {
                    return errorResponse('Missing licenseKey', 400);
                }

                const result = await licenseService.validateLicense(body.licenseKey);
                return jsonResponse(result);
            });

            // License issuance endpoint
            router.post('/api/v1/license/issue', async (request) => {
                const body = await request.json() as {
                    userId?: string;
                    plan?: string;
                    expiresAt?: string;
                    metadata?: Record<string, unknown>;
                };

                if (!body.userId || !body.plan) {
                    return errorResponse('Missing userId or plan', 400);
                }

                const result = await licenseService.issueLicense({
                    userId: body.userId,
                    plan: body.plan,
                    expiresAt: body.expiresAt,
                    metadata: body.metadata,
                });

                return jsonResponse(result);
            });

            // License revocation endpoint
            router.delete('/api/v1/license/:licenseKey', async (request, params) => {
                const { licenseKey } = params;

                if (!licenseKey) {
                    return errorResponse('Missing licenseKey', 400);
                }

                const result = await licenseService.revokeLicense(licenseKey);
                return jsonResponse(result);
            });

            // Default 404 handler
            router.all('.*', async () => {
                return errorResponse('Not Found', 404);
            });

            return await router.handle(request);
        } catch (error) {
            console.error('Unhandled error:', error);
            return errorResponse('Internal Server Error', 500);
        }
    },
} satisfies ExportedHandler<Env>;
