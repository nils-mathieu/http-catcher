/**
 * Server-Sent Events (SSE) endpoint for real-time request/response streaming
 * GET /api/<namespace>/events
 */

import type { RequestEvent } from '@sveltejs/kit';
import { store } from '$lib/server/store';

type RequestHandler = (event: RequestEvent) => Promise<Response> | Response;

export const GET: RequestHandler = async ({ params }: RequestEvent) => {
	const { namespace } = params as { namespace: string };

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			// Send initial connection message
			const encoder = new TextEncoder();
			const sendEvent = (event: string, data: any) => {
				const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			sendEvent('connected', {
				namespace,
				timestamp: new Date().toISOString()
			});

			// Subscribe to store events
			const unsubscribe = store.subscribe(namespace, (event) => {
				try {
					sendEvent(event.type, event.data);
				} catch (error) {
					console.error('Error sending SSE event:', error);
				}
			});

			// Keep-alive ping every 30 seconds
			const keepAliveInterval = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keep-alive\n\n'));
				} catch (error) {
					clearInterval(keepAliveInterval);
				}
			}, 30000);

			// Cleanup on close
			return () => {
				clearInterval(keepAliveInterval);
				unsubscribe();
			};
		},
		cancel() {
			// Cleanup happens in the return function above
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable buffering in nginx
		}
	});
};
