/**
 * API endpoint to list all configured namespaces
 * GET /api/namespaces
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { store, type NamespaceConfig } from '$lib/server/store';

type RequestHandler = (event: RequestEvent) => Promise<Response> | Response;

/**
 * GET /api/namespaces
 * Returns a list of all configured namespaces
 */
export const GET: RequestHandler = async () => {
	const configs = store.getAllConfigs();

	return json({
		count: configs.length,
		namespaces: configs.map((config: NamespaceConfig) => ({
			namespace: config.namespace,
			targetHost: config.targetHost,
			createdAt: config.createdAt.toISOString(),
			activeConnections: store.getSubscriberCount(config.namespace)
		}))
	});
};
