import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GSMFlow Authority Worker', () => {
	describe('Health Check', () => {
		it('responds with health status (unit style)', async () => {
			const request = new IncomingRequest('http://example.com/health');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('status', 'ok');
			expect(data).toHaveProperty('service', 'gsmflow-authority');
			expect(data).toHaveProperty('timestamp');
		});

		it('responds with health status (integration style)', async () => {
			const response = await SELF.fetch('https://example.com/health');
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('status', 'ok');
		});
	});

	describe('Version Endpoint', () => {
		it('returns API version', async () => {
			const request = new IncomingRequest('http://example.com/api/v1/version');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('version');
			expect(data).toHaveProperty('service', 'gsmflow-authority');
		});
	});

	describe('License Validation', () => {
		it('validates license with key', async () => {
			const request = new IncomingRequest('http://example.com/api/v1/license/validate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					licenseKey: 'TEST-1234-5678-ABCD',
				}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('valid');
		});

		it('returns error when licenseKey is missing', async () => {
			const request = new IncomingRequest('http://example.com/api/v1/license/validate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty('error');
		});
	});

	describe('License Issuance', () => {
		it('issues license with valid request', async () => {
			const request = new IncomingRequest('http://example.com/api/v1/license/issue', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: 'user123',
					plan: 'premium',
				}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('success');
		});

		it('returns error when userId is missing', async () => {
			const request = new IncomingRequest('http://example.com/api/v1/license/issue', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					plan: 'premium',
				}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty('error');
		});
	});

	describe('License Revocation', () => {
		it('revokes license by key', async () => {
			const request = new IncomingRequest('http://example.com/api/v1/license/TEST-1234', {
				method: 'DELETE',
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('success');
		});
	});

	describe('404 Handler', () => {
		it('returns 404 for unknown routes', async () => {
			const request = new IncomingRequest('http://example.com/unknown');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty('error', 'Not Found');
		});
	});
});
