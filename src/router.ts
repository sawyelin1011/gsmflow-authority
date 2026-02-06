type RouteHandler = (
	request: Request,
	params: Record<string, string>
) => Promise<Response>;

interface Route {
	method: string;
	pattern: RegExp;
	handler: RouteHandler;
	paramNames: string[];
}

export class Router {
	private routes: Route[] = [];

	private addRoute(method: string, path: string, handler: RouteHandler): void {
		const paramNames: string[] = [];
		const regexPath = path
			.replace(/\*/g, '.*')
			.replace(/:([^/]+)/g, (_, paramName) => {
				paramNames.push(paramName);
				return '([^/]+)';
			});

		const pattern = new RegExp(`^${regexPath}$`);

		this.routes.push({
			method,
			pattern,
			handler,
			paramNames,
		});
	}

	get(path: string, handler: RouteHandler): void {
		this.addRoute('GET', path, handler);
	}

	post(path: string, handler: RouteHandler): void {
		this.addRoute('POST', path, handler);
	}

	put(path: string, handler: RouteHandler): void {
		this.addRoute('PUT', path, handler);
	}

	delete(path: string, handler: RouteHandler): void {
		this.addRoute('DELETE', path, handler);
	}

	patch(path: string, handler: RouteHandler): void {
		this.addRoute('PATCH', path, handler);
	}

	all(path: string, handler: RouteHandler): void {
		this.addRoute('*', path, handler);
	}

	async handle(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;

		for (const route of this.routes) {
			if (route.method !== '*' && route.method !== method) {
				continue;
			}

			const match = url.pathname.match(route.pattern);
			if (match) {
				const params: Record<string, string> = {};
				route.paramNames.forEach((name, index) => {
					params[name] = match[index + 1];
				});

				return await route.handler(request, params);
			}
		}

		return new Response('Not Found', { status: 404 });
	}
}
