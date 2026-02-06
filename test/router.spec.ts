import { describe, it, expect } from 'vitest';
import { Router } from '../src/router';

describe('Router', () => {
	it('routes GET requests correctly', async () => {
		const router = new Router();
		let called = false;

		router.get('/test', async () => {
			called = true;
			return new Response('OK');
		});

		const request = new Request('http://example.com/test');
		const response = await router.handle(request);

		expect(called).toBe(true);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('OK');
	});

	it('routes POST requests correctly', async () => {
		const router = new Router();
		let called = false;

		router.post('/test', async () => {
			called = true;
			return new Response('Created', { status: 201 });
		});

		const request = new Request('http://example.com/test', { method: 'POST' });
		const response = await router.handle(request);

		expect(called).toBe(true);
		expect(response.status).toBe(201);
	});

	it('extracts path parameters', async () => {
		const router = new Router();
		let capturedId: string | undefined;

		router.get('/users/:id', async (request, params) => {
			capturedId = params.id;
			return new Response('OK');
		});

		const request = new Request('http://example.com/users/123');
		await router.handle(request);

		expect(capturedId).toBe('123');
	});

	it('handles multiple parameters', async () => {
		const router = new Router();
		let capturedParams: Record<string, string> = {};

		router.get('/users/:userId/posts/:postId', async (request, params) => {
			capturedParams = params;
			return new Response('OK');
		});

		const request = new Request('http://example.com/users/123/posts/456');
		await router.handle(request);

		expect(capturedParams.userId).toBe('123');
		expect(capturedParams.postId).toBe('456');
	});

	it('returns 404 for unmatched routes', async () => {
		const router = new Router();

		router.get('/test', async () => {
			return new Response('OK');
		});

		const request = new Request('http://example.com/unknown');
		const response = await router.handle(request);

		expect(response.status).toBe(404);
	});

	it('matches wildcard routes', async () => {
		const router = new Router();
		let called = false;

		router.all('.*', async () => {
			called = true;
			return new Response('Catch all');
		});

		const request = new Request('http://example.com/anything');
		await router.handle(request);

		expect(called).toBe(true);
	});

	it('respects route method matching', async () => {
		const router = new Router();

		router.get('/test', async () => {
			return new Response('GET');
		});

		router.post('/test', async () => {
			return new Response('POST');
		});

		const getRequest = new Request('http://example.com/test');
		const getResponse = await router.handle(getRequest);
		expect(await getResponse.text()).toBe('GET');

		const postRequest = new Request('http://example.com/test', { method: 'POST' });
		const postResponse = await router.handle(postRequest);
		expect(await postResponse.text()).toBe('POST');
	});
});
