/**
 * In-memory store for namespace configurations and active SSE connections
 */

export interface NamespaceConfig {
	namespace: string;
	targetHost: string;
	createdAt: Date;
}

export interface ProxyRequest {
	id: string;
	timestamp: Date;
	method: string;
	path: string;
	headers: Record<string, string>;
	body?: string;
	query?: string;
}

export interface ProxyResponse {
	id: string;
	requestId: string;
	timestamp: Date;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body?: string;
	duration: number;
}

export interface ProxyEvent {
	type: 'request' | 'response' | 'error';
	data: ProxyRequest | ProxyResponse | { requestId: string; message: string; timestamp: Date };
}

type EventCallback = (event: ProxyEvent) => void;

class Store {
	private configs = new Map<string, NamespaceConfig>();
	private eventSubscribers = new Map<string, Set<EventCallback>>();

	/**
	 * Set target host for a namespace
	 */
	setNamespaceConfig(namespace: string, targetHost: string): NamespaceConfig {
		const config: NamespaceConfig = {
			namespace,
			targetHost,
			createdAt: new Date()
		};
		this.configs.set(namespace, config);
		return config;
	}

	/**
	 * Get target host for a namespace
	 */
	getNamespaceConfig(namespace: string): NamespaceConfig | undefined {
		return this.configs.get(namespace);
	}

	/**
	 * Get all namespace configurations
	 */
	getAllConfigs(): NamespaceConfig[] {
		return Array.from(this.configs.values());
	}

	/**
	 * Delete a namespace configuration
	 */
	deleteNamespaceConfig(namespace: string): boolean {
		return this.configs.delete(namespace);
	}

	/**
	 * Subscribe to events for a namespace
	 */
	subscribe(namespace: string, callback: EventCallback): () => void {
		if (!this.eventSubscribers.has(namespace)) {
			this.eventSubscribers.set(namespace, new Set());
		}

		this.eventSubscribers.get(namespace)!.add(callback);

		// Return unsubscribe function
		return () => {
			const subscribers = this.eventSubscribers.get(namespace);
			if (subscribers) {
				subscribers.delete(callback);
				if (subscribers.size === 0) {
					this.eventSubscribers.delete(namespace);
				}
			}
		};
	}

	/**
	 * Emit an event to all subscribers of a namespace
	 */
	emit(namespace: string, event: ProxyEvent): void {
		const subscribers = this.eventSubscribers.get(namespace);
		if (subscribers) {
			subscribers.forEach((callback) => {
				try {
					callback(event);
				} catch (error) {
					console.error('Error in event subscriber:', error);
				}
			});
		}
	}

	/**
	 * Get subscriber count for a namespace
	 */
	getSubscriberCount(namespace: string): number {
		return this.eventSubscribers.get(namespace)?.size ?? 0;
	}
}

// Singleton instance
export const store = new Store();
