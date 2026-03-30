/**
 * Server hooks for handling CORS and global middleware
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Handle OPTIONS preflight requests
	if (event.request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
				'Access-Control-Max-Age': '86400' // 24 hours
			}
		});
	}

	// Resolve the request
	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => {
			// Allow these headers to be sent to the client
			return name === 'content-type' || name === 'cache-control' || name === 'x-custom-header';
		}
	});

	// Add CORS headers to all responses
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
	response.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

	// Special handling for SSE endpoints
	if (event.url.pathname.includes('/events')) {
		response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
		response.headers.set('X-Accel-Buffering', 'no');
	}

	return response;
};
