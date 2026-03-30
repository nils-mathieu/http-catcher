/**
 * Catch-all proxy route handler
 * Proxies all HTTP methods to the configured target host
 */

import type { RequestEvent } from '@sveltejs/kit';
import { proxyRequest } from '$lib/server/proxy';

type RequestHandler = (event: RequestEvent) => Promise<Response> | Response;

/**
 * Handle all HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, etc.)
 */
const handler: RequestHandler = async (event: RequestEvent) => {
	const { params } = event;
	const { namespace, path } = params as { namespace: string; path?: string };

	// The path parameter captures everything after the namespace
	const targetPath = path || '';

	return proxyRequest({
		namespace,
		requestEvent: event,
		path: targetPath
	});
};

// Export handlers for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;
