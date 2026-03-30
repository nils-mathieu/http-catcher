/**
 * API endpoint for namespace configuration
 * GET - Get namespace configuration
 * POST - Set/update namespace configuration
 * DELETE - Delete namespace configuration
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { store } from '$lib/server/store';

type RequestHandler = (event: RequestEvent) => Promise<Response> | Response;

/**
 * GET /api/<namespace>
 * Returns the current configuration for a namespace
 */
export const GET: RequestHandler = async ({ params }: RequestEvent) => {
	const { namespace } = params as { namespace: string };

	const config = store.getNamespaceConfig(namespace);

	if (!config) {
		return json(
			{
				error: 'Not found',
				message: `Namespace "${namespace}" is not configured`
			},
			{ status: 404 }
		);
	}

	return json({
		namespace: config.namespace,
		targetHost: config.targetHost,
		createdAt: config.createdAt.toISOString()
	});
};

/**
 * POST /api/<namespace>
 * Sets or updates the target host for a namespace
 * Body: { targetHost: string }
 */
export const POST: RequestHandler = async ({ params, request }: RequestEvent) => {
	const { namespace } = params as { namespace: string };

	let body;
	try {
		body = await request.json();
	} catch (error) {
		return json(
			{
				error: 'Invalid JSON',
				message: 'Request body must be valid JSON'
			},
			{ status: 400 }
		);
	}

	const { targetHost } = body;

	if (!targetHost || typeof targetHost !== 'string') {
		return json(
			{
				error: 'Invalid request',
				message: 'targetHost is required and must be a string'
			},
			{ status: 400 }
		);
	}

	// Validate URL format
	try {
		new URL(targetHost);
	} catch (error) {
		return json(
			{
				error: 'Invalid URL',
				message: 'targetHost must be a valid URL (e.g., https://example.com)'
			},
			{ status: 400 }
		);
	}

	const config = store.setNamespaceConfig(namespace, targetHost);

	return json(
		{
			namespace: config.namespace,
			targetHost: config.targetHost,
			createdAt: config.createdAt.toISOString(),
			message: 'Configuration saved successfully'
		},
		{ status: 200 }
	);
};

/**
 * DELETE /api/<namespace>
 * Deletes the configuration for a namespace
 */
export const DELETE: RequestHandler = async ({ params }: RequestEvent) => {
	const { namespace } = params as { namespace: string };

	const deleted = store.deleteNamespaceConfig(namespace);

	if (!deleted) {
		return json(
			{
				error: 'Not found',
				message: `Namespace "${namespace}" is not configured`
			},
			{ status: 404 }
		);
	}

	return json({
		message: `Configuration for namespace "${namespace}" deleted successfully`
	});
};
