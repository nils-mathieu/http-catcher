/**
 * Proxy utility functions for forwarding HTTP requests
 */

import type { RequestEvent } from '@sveltejs/kit';
import { store } from './store';

export interface ProxyOptions {
	namespace: string;
	requestEvent: RequestEvent;
	path: string;
}

/**
 * Generate a unique ID for tracking requests
 */
export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert Headers object to plain object
 */
function headersToObject(headers: Headers): Record<string, string> {
	const obj: Record<string, string> = {};
	headers.forEach((value, key) => {
		obj[key] = value;
	});
	return obj;
}

/**
 * Read request body as text with size limit
 */
async function readRequestBody(request: Request): Promise<string | undefined> {
	const contentType = request.headers.get('content-type');

	// Skip body for methods that typically don't have one
	if (request.method === 'GET' || request.method === 'HEAD') {
		return undefined;
	}

	try {
		// Clone the request to avoid consuming the body
		const cloned = request.clone();
		const text = await cloned.text();

		// Limit body size to 1MB for logging
		if (text.length > 1_000_000) {
			return `[Body too large: ${text.length} bytes]`;
		}

		return text || undefined;
	} catch (error) {
		return `[Error reading body: ${error}]`;
	}
}

/**
 * Read response body as text with size limit
 */
async function readResponseBody(response: Response): Promise<string | undefined> {
	const contentType = response.headers.get('content-type');

	try {
		// Clone the response to avoid consuming the body
		const cloned = response.clone();
		const text = await cloned.text();

		// Limit body size to 1MB for logging
		if (text.length > 1_000_000) {
			return `[Body too large: ${text.length} bytes]`;
		}

		return text || undefined;
	} catch (error) {
		return `[Error reading body: ${error}]`;
	}
}

/**
 * Proxy an HTTP request to the configured target host
 */
export async function proxyRequest(options: ProxyOptions): Promise<Response> {
	const { namespace, requestEvent, path } = options;
	const { request } = requestEvent;

	// Get namespace configuration
	const config = store.getNamespaceConfig(namespace);
	if (!config) {
		return new Response(
			JSON.stringify({
				error: 'Namespace not configured',
				namespace,
				message: `No target host configured for namespace "${namespace}". Please configure it in /panel/${namespace}`
			}),
			{
				status: 404,
				headers: {
					'content-type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			}
		);
	}

	const requestId = generateId();
	const startTime = Date.now();

	// Build target URL
	const targetHost = config.targetHost.replace(/\/$/, ''); // Remove trailing slash
	const targetPath = path.startsWith('/') ? path : `/${path}`;
	const searchParams = requestEvent.url.searchParams.toString();
	const queryString = searchParams ? `?${searchParams}` : '';
	const targetUrl = `${targetHost}${targetPath}${queryString}`;

	// Read request body for logging
	const requestBody = await readRequestBody(request);

	// Emit request event
	store.emit(namespace, {
		type: 'request',
		data: {
			id: requestId,
			timestamp: new Date(),
			method: request.method,
			path: `${targetPath}${queryString}`,
			headers: headersToObject(request.headers),
			body: requestBody,
			query: queryString
		}
	});

	try {
		// Prepare headers for proxying
		const proxyHeaders = new Headers(request.headers);

		// Remove hop-by-hop headers
		const hopByHopHeaders = [
			'connection',
			'keep-alive',
			'proxy-authenticate',
			'proxy-authorization',
			'te',
			'trailers',
			'transfer-encoding',
			'upgrade'
		];
		hopByHopHeaders.forEach((header) => proxyHeaders.delete(header));

		// Parse target URL for header updates
		const targetUrlObj = new URL(targetUrl);
		const originalHost = request.headers.get('host');
		const originalOrigin = request.headers.get('origin');
		const originalReferer = request.headers.get('referer');

		// Update Host header to target host
		proxyHeaders.set('host', targetUrlObj.host);

		// Update Origin header if present
		if (originalOrigin) {
			const originUrl = new URL(originalOrigin);
			proxyHeaders.set('origin', `${targetUrlObj.protocol}//${targetUrlObj.host}`);
		}

		// Update Referer header if present
		if (originalReferer) {
			try {
				const refererUrl = new URL(originalReferer);
				// Replace the host in referer with target host
				refererUrl.host = targetUrlObj.host;
				refererUrl.protocol = targetUrlObj.protocol.replace(':', '');
				proxyHeaders.set('referer', refererUrl.toString());
			} catch {
				// If referer is not a valid URL, just update to target origin
				proxyHeaders.set('referer', `${targetUrlObj.protocol}//${targetUrlObj.host}${targetPath}`);
			}
		}

		// Add X-Forwarded headers
		const forwardedProto = requestEvent.url.protocol.replace(':', '');
		const forwardedHost = originalHost || requestEvent.url.host;
		const forwardedFor = request.headers.get('x-forwarded-for');
		const clientIp = requestEvent.getClientAddress();

		proxyHeaders.set('x-forwarded-proto', forwardedProto);
		proxyHeaders.set('x-forwarded-host', forwardedHost);

		// Append to x-forwarded-for chain
		if (forwardedFor) {
			proxyHeaders.set('x-forwarded-for', `${forwardedFor}, ${clientIp}`);
		} else {
			proxyHeaders.set('x-forwarded-for', clientIp);
		}

		// Add X-Real-IP if not present
		if (!proxyHeaders.has('x-real-ip')) {
			proxyHeaders.set('x-real-ip', clientIp);
		}

		// Forward the request
		const proxyRequestInit: RequestInit = {
			method: request.method,
			headers: proxyHeaders,
			redirect: 'manual' // Don't follow redirects automatically
		};

		// Add body for methods that support it
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			// Clone the request to get a fresh body
			const bodyClone = request.clone();
			proxyRequestInit.body = await bodyClone.arrayBuffer();
		}

		const proxyResponse = await fetch(targetUrl, proxyRequestInit);
		const duration = Date.now() - startTime;

		// Read response body for logging
		const responseBody = await readResponseBody(proxyResponse);

		// Emit response event
		store.emit(namespace, {
			type: 'response',
			data: {
				id: generateId(),
				requestId,
				timestamp: new Date(),
				status: proxyResponse.status,
				statusText: proxyResponse.statusText,
				headers: headersToObject(proxyResponse.headers),
				body: responseBody,
				duration
			}
		});

		// Prepare response headers
		const responseHeaders = new Headers(proxyResponse.headers);

		// Remove hop-by-hop headers from response
		hopByHopHeaders.forEach((header) => responseHeaders.delete(header));

		// Clone the response to send to client
		const responseClone = proxyResponse.clone();
		const responseArrayBuffer = await responseClone.arrayBuffer();

		return new Response(responseArrayBuffer, {
			status: proxyResponse.status,
			statusText: proxyResponse.statusText,
			headers: responseHeaders
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		// Emit error event
		store.emit(namespace, {
			type: 'error',
			data: {
				requestId,
				message: errorMessage,
				timestamp: new Date()
			}
		});

		// Detailed error response
		const errorDetails: Record<string, any> = {
			error: 'Proxy error',
			message: errorMessage,
			targetUrl,
			duration,
			namespace,
			path: targetPath,
			method: request.method
		};

		// Add more context for common errors
		if (errorMessage.includes('fetch failed') || errorMessage.includes('ENOTFOUND')) {
			errorDetails.hint =
				'Target host is unreachable. Check if the URL is correct and the server is online.';
		} else if (errorMessage.includes('ECONNREFUSED')) {
			errorDetails.hint = 'Connection refused. The target server is not accepting connections.';
		} else if (errorMessage.includes('timeout')) {
			errorDetails.hint = 'Request timed out. The target server took too long to respond.';
		} else if (errorMessage.includes('certificate')) {
			errorDetails.hint =
				'SSL/TLS certificate error. The target server may have an invalid certificate.';
		}

		// Add stack trace in development
		if (process.env.NODE_ENV === 'development' && errorStack) {
			errorDetails.stack = errorStack;
		}

		return new Response(JSON.stringify(errorDetails, null, 2), {
			status: 502,
			headers: {
				'content-type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	}
}
