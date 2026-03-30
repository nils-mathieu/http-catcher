<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';

	interface ProxyRequest {
		id: string;
		timestamp: string;
		method: string;
		path: string;
		headers: Record<string, string>;
		body?: string;
		query?: string;
	}

	interface ProxyResponse {
		id: string;
		requestId: string;
		timestamp: string;
		status: number;
		statusText: string;
		headers: Record<string, string>;
		body?: string;
		duration: number;
	}

	interface ProxyError {
		requestId: string;
		message: string;
		timestamp: string;
	}

	interface LogEntry {
		id: string;
		request: ProxyRequest;
		response?: ProxyResponse;
		error?: ProxyError;
	}

	const namespace = $page.params.namespace;

	let targetHost = $state('');
	let isConfigured = $state(false);
	let isLoading = $state(false);
	let configError = $state('');
	let configSuccess = $state('');
	let logs = $state<LogEntry[]>([]);
	let selectedLog = $state<LogEntry | null>(null);
	let eventSource: EventSource | null = null;
	let isConnected = $state(false);
	let filterMethod = $state('');
	let filterPath = $state('');

	// Load existing configuration
	onMount(async () => {
		await loadConfig();
		connectToEventStream();
	});

	onDestroy(() => {
		disconnectEventStream();
	});

	async function loadConfig() {
		try {
			const response = await fetch(`/api/${namespace}`);
			if (response.ok) {
				const data = await response.json();
				targetHost = data.targetHost;
				isConfigured = true;
			}
		} catch (error) {
			console.error('Failed to load config:', error);
		}
	}

	async function saveConfig() {
		configError = '';
		configSuccess = '';
		isLoading = true;

		try {
			const response = await fetch(`/api/${namespace}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ targetHost })
			});

			const data = await response.json();

			if (response.ok) {
				isConfigured = true;
				configSuccess = 'Configuration saved successfully!';
				setTimeout(() => {
					configSuccess = '';
				}, 3000);
			} else {
				configError = data.message || 'Failed to save configuration';
			}
		} catch (error) {
			configError = 'Network error: Failed to save configuration';
		} finally {
			isLoading = false;
		}
	}

	function connectToEventStream() {
		eventSource = new EventSource(`/api/${namespace}/events`);

		eventSource.addEventListener('connected', (e: MessageEvent) => {
			isConnected = true;
			console.log('Connected to event stream:', e.data);
		});

		eventSource.addEventListener('request', (e: MessageEvent) => {
			const request = JSON.parse(e.data) as ProxyRequest;
			logs = [
				{
					id: request.id,
					request
				},
				...logs
			];
		});

		eventSource.addEventListener('response', (e: MessageEvent) => {
			const response = JSON.parse(e.data) as ProxyResponse;
			logs = logs.map((log) => {
				if (log.request.id === response.requestId) {
					return { ...log, response };
				}
				return log;
			});
		});

		eventSource.addEventListener('error', (e: MessageEvent) => {
			const error = JSON.parse(e.data) as ProxyError;
			logs = logs.map((log) => {
				if (log.request.id === error.requestId) {
					return { ...log, error };
				}
				return log;
			});
		});

		eventSource.onerror = () => {
			isConnected = false;
			console.error('EventSource error, reconnecting...');
		};
	}

	function disconnectEventStream() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
			isConnected = false;
		}
	}

	function clearLogs() {
		logs = [];
		selectedLog = null;
	}

	function selectLog(log: LogEntry) {
		selectedLog = log;
	}

	function getStatusColor(status?: number): string {
		if (!status) return 'gray';
		if (status >= 200 && status < 300) return 'green';
		if (status >= 300 && status < 400) return 'blue';
		if (status >= 400 && status < 500) return 'orange';
		return 'red';
	}

	function formatTimestamp(timestamp: string): string {
		return new Date(timestamp).toLocaleTimeString();
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}

	function formatBody(body: string, contentType?: string): string {
		// Check if content type suggests JSON
		const isJson =
			contentType?.toLowerCase().includes('application/json') ||
			contentType?.toLowerCase().includes('application/ld+json');

		if (isJson || (!contentType && body.trim().startsWith('{')) || body.trim().startsWith('[')) {
			try {
				const parsed = JSON.parse(body);
				return JSON.stringify(parsed, null, 2);
			} catch {
				// If parsing fails, return original
				return body;
			}
		}
		return body;
	}

	function highlightJSON(body: string, contentType?: string): string {
		const formatted = formatBody(body, contentType);

		// Check if it's JSON
		const isJson =
			contentType?.toLowerCase().includes('application/json') ||
			contentType?.toLowerCase().includes('application/ld+json') ||
			formatted.trim().startsWith('{') ||
			formatted.trim().startsWith('[');

		if (!isJson) {
			return formatted;
		}

		try {
			// Apply syntax highlighting
			return formatted.replace(
				/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
				(match) => {
					let cls = 'json-number';
					if (/^"/.test(match)) {
						if (/:$/.test(match)) {
							cls = 'json-key';
						} else {
							cls = 'json-string';
						}
					} else if (/true|false/.test(match)) {
						cls = 'json-boolean';
					} else if (/null/.test(match)) {
						cls = 'json-null';
					}
					return `<span class="${cls}">${match}</span>`;
				}
			);
		} catch {
			return formatted;
		}
	}

	// Filtered logs
	const filteredLogs = $derived(
		logs.filter((log) => {
			if (filterMethod && log.request.method !== filterMethod) return false;
			if (filterPath && !log.request.path.toLowerCase().includes(filterPath.toLowerCase()))
				return false;
			return true;
		})
	);
</script>

<svelte:head>
	<title>Panel - {namespace}</title>
</svelte:head>

<div class="container">
	<header>
		<h1>HTTP Proxy Panel</h1>
		<div class="namespace-badge">
			<span class="label">Namespace:</span>
			<code>{namespace}</code>
		</div>
		<div class="status">
			<div class="status-indicator" class:connected={isConnected}></div>
			<span>{isConnected ? 'Connected' : 'Disconnected'}</span>
		</div>
	</header>

	<!-- Configuration Section -->
	<section class="config-section">
		<h2>Configuration</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				saveConfig();
			}}
		>
			<div class="form-group">
				<label for="targetHost">Target Host URL</label>
				<input
					type="text"
					id="targetHost"
					bind:value={targetHost}
					placeholder="https://api.example.com"
					required
				/>
				<small>All requests to /{namespace}/* will be proxied to this host</small>
			</div>

			{#if configError}
				<div class="alert alert-error">{configError}</div>
			{/if}

			{#if configSuccess}
				<div class="alert alert-success">{configSuccess}</div>
			{/if}

			<button type="submit" disabled={isLoading}>
				{isLoading ? 'Saving...' : 'Save Configuration'}
			</button>
		</form>

		{#if isConfigured}
			<div class="proxy-info">
				<h3>Proxy Endpoint</h3>
				<code class="endpoint">
					{window.location.origin}/{namespace}/&lt;path&gt;
				</code>
				<button
					class="btn-copy"
					onclick={() => copyToClipboard(`${window.location.origin}/${namespace}/`)}
				>
					Copy
				</button>
			</div>
		{/if}
	</section>

	<!-- Logs Section -->
	<section class="logs-section">
		<div class="logs-header">
			<h2>Request/Response Logs</h2>
			<div class="logs-actions">
				<span class="log-count">{filteredLogs.length} entries</span>
				<button class="btn-secondary" onclick={clearLogs}>Clear Logs</button>
			</div>
		</div>

		<!-- Filters -->
		<div class="filters">
			<select bind:value={filterMethod}>
				<option value="">All Methods</option>
				<option value="GET">GET</option>
				<option value="POST">POST</option>
				<option value="PUT">PUT</option>
				<option value="DELETE">DELETE</option>
				<option value="PATCH">PATCH</option>
			</select>
			<input
				type="text"
				bind:value={filterPath}
				placeholder="Filter by path..."
				class="filter-input"
			/>
		</div>

		<div class="logs-container">
			<!-- Log List -->
			<div class="log-list">
				{#if filteredLogs.length === 0}
					<div class="empty-state">
						<p>No requests yet</p>
						<small>Requests will appear here as they are proxied</small>
					</div>
				{:else}
					{#each filteredLogs as log (log.id)}
						<button
							class="log-item"
							class:selected={selectedLog?.id === log.id}
							onclick={() => selectLog(log)}
							type="button"
						>
							<div class="log-item-header">
								<span
									class="method-badge"
									class:method-get={log.request.method === 'GET'}
									class:method-post={log.request.method === 'POST'}
									class:method-put={log.request.method === 'PUT'}
									class:method-delete={log.request.method === 'DELETE'}
								>
									{log.request.method}
								</span>
								<span class="path">{log.request.path}</span>
								{#if log.response}
									<span
										class="status-badge"
										style="--status-color: {getStatusColor(log.response.status)}"
									>
										{log.response.status}
									</span>
								{:else if log.error}
									<span class="status-badge error">ERROR</span>
								{:else}
									<span class="status-badge pending">...</span>
								{/if}
							</div>
							<div class="log-item-meta">
								<span class="timestamp">{formatTimestamp(log.request.timestamp)}</span>
								{#if log.response}
									<span class="duration">{log.response.duration}ms</span>
								{/if}
							</div>
						</button>
					{/each}
				{/if}
			</div>

			<!-- Log Details -->
			<div class="log-details">
				{#if selectedLog}
					<div class="details-content">
						<h3>Request</h3>
						<div class="detail-section">
							<div class="detail-row">
								<strong>Method:</strong>
								{selectedLog.request.method}
							</div>
							<div class="detail-row">
								<strong>Path:</strong>
								{selectedLog.request.path}
							</div>
							<div class="detail-row">
								<strong>Timestamp:</strong>
								{new Date(selectedLog.request.timestamp).toLocaleString()}
							</div>
						</div>

						<h4>Headers</h4>
						<div class="headers">
							{#each Object.entries(selectedLog.request.headers) as [key, value]}
								<div class="header-row">
									<span class="header-key">{key}:</span>
									<span class="header-value">{value}</span>
								</div>
							{/each}
						</div>

						{#if selectedLog.request.body}
							<h4>Body</h4>
							<pre class="body">{@html highlightJSON(
									selectedLog.request.body,
									selectedLog.request.headers['content-type']
								)}</pre>
						{/if}

						{#if selectedLog.response}
							<h3>Response</h3>
							<div class="detail-section">
								<div class="detail-row">
									<strong>Status:</strong>
									<span style="color: var(--status-{getStatusColor(selectedLog.response.status)})">
										{selectedLog.response.status}
										{selectedLog.response.statusText}
									</span>
								</div>
								<div class="detail-row">
									<strong>Duration:</strong>
									{selectedLog.response.duration}ms
								</div>
								<div class="detail-row">
									<strong>Timestamp:</strong>
									{new Date(selectedLog.response.timestamp).toLocaleString()}
								</div>
							</div>

							<h4>Headers</h4>
							<div class="headers">
								{#each Object.entries(selectedLog.response.headers) as [key, value]}
									<div class="header-row">
										<span class="header-key">{key}:</span>
										<span class="header-value">{value}</span>
									</div>
								{/each}
							</div>

							{#if selectedLog.response.body}
								<h4>Body</h4>
								<pre class="body">{@html highlightJSON(
										selectedLog.response.body,
										selectedLog.response.headers['content-type']
									)}</pre>
							{/if}
						{:else if selectedLog.error}
							<h3>Error</h3>
							<div class="alert alert-error">
								{selectedLog.error.message}
							</div>
						{:else}
							<div class="pending-response">
								<p>Waiting for response...</p>
							</div>
						{/if}
					</div>
				{:else}
					<div class="empty-details">
						<p>Select a request to view details</p>
					</div>
				{/if}
			</div>
		</div>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #f5f5f5;
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		display: flex;
		align-items: center;
		gap: 2rem;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e0e0e0;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		color: #333;
	}

	.namespace-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #f0f0f0;
		border-radius: 4px;
	}

	.namespace-badge .label {
		font-size: 0.875rem;
		color: #666;
	}

	.namespace-badge code {
		font-size: 1rem;
		font-weight: 600;
		color: #0066cc;
		background: white;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
	}

	.status {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #666;
	}

	.status-indicator {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ccc;
		transition: background 0.3s;
	}

	.status-indicator.connected {
		background: #4caf50;
		box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
	}

	.config-section {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		color: #333;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	input[type='text'] {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		font-family: 'Courier New', monospace;
	}

	input[type='text']:focus {
		outline: none;
		border-color: #0066cc;
	}

	small {
		display: block;
		margin-top: 0.5rem;
		color: #666;
		font-size: 0.875rem;
	}

	button {
		padding: 0.75rem 1.5rem;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	button:hover:not(:disabled) {
		background: #0052a3;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: #666;
	}

	.btn-secondary:hover {
		background: #555;
	}

	.btn-copy {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		margin-left: 1rem;
	}

	.alert {
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.alert-error {
		background: #ffebee;
		color: #c62828;
		border: 1px solid #ef5350;
	}

	.alert-success {
		background: #e8f5e9;
		color: #2e7d32;
		border: 1px solid #66bb6a;
	}

	.proxy-info {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid #e0e0e0;
	}

	h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		color: #333;
	}

	.endpoint {
		display: inline-block;
		padding: 0.75rem 1rem;
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
	}

	.logs-section {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.logs-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.logs-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.log-count {
		color: #666;
		font-size: 0.875rem;
	}

	.filters {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	select,
	.filter-input {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.filter-input {
		flex: 1;
	}

	.logs-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		min-height: 500px;
		max-height: 70vh;
	}

	.log-list {
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow-y: auto;
	}

	.empty-state {
		padding: 3rem;
		text-align: center;
		color: #999;
	}

	.empty-state p {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
	}

	.log-item {
		width: 100%;
		text-align: left;
		padding: 1rem;
		border: none;
		border-bottom: 1px solid #e0e0e0;
		background: white;
		cursor: pointer;
		transition: background 0.2s;
	}

	.log-item:hover {
		background: #f9f9f9;
	}

	.log-item.selected {
		background: #e3f2fd;
		border-left: 3px solid #0066cc;
	}

	.log-item-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.method-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		background: #666;
	}

	.method-get {
		background: #4caf50;
	}

	.method-post {
		background: #2196f3;
	}

	.method-put {
		background: #ff9800;
	}

	.method-delete {
		background: #f44336;
	}

	.path {
		flex: 1;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--status-color, #ccc);
		color: white;
	}

	.status-badge.error {
		background: #f44336;
	}

	.status-badge.pending {
		background: #9e9e9e;
	}

	.log-item-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: #999;
	}

	.log-details {
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow-y: auto;
		background: #fafafa;
	}

	.details-content {
		padding: 1.5rem;
	}

	.empty-details {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #999;
	}

	h4 {
		margin: 1.5rem 0 0.75rem 0;
		font-size: 1rem;
		color: #555;
	}

	.detail-section {
		background: white;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.detail-row {
		padding: 0.5rem 0;
		border-bottom: 1px solid #f0f0f0;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.headers {
		background: white;
		padding: 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.header-row {
		padding: 0.5rem 0;
		border-bottom: 1px solid #f0f0f0;
		display: grid;
		grid-template-columns: 150px 1fr;
		gap: 1rem;
	}

	.header-row:last-child {
		border-bottom: none;
	}

	.header-key {
		font-weight: 600;
		color: #555;
	}

	.header-value {
		font-family: 'Courier New', monospace;
		color: #333;
		word-break: break-all;
	}

	.body {
		background: #1e1e1e;
		color: #d4d4d4;
		padding: 1rem;
		border-radius: 4px;
		border: 1px solid #e0e0e0;
		overflow-x: auto;
		font-size: 0.875rem;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		margin: 0;
		white-space: pre;
		line-height: 1.5;
		tab-size: 2;
	}

	/* JSON Syntax Highlighting */
	:global(.body .json-key) {
		color: #9cdcfe;
	}

	:global(.body .json-string) {
		color: #ce9178;
	}

	:global(.body .json-number) {
		color: #b5cea8;
	}

	:global(.body .json-boolean) {
		color: #569cd6;
	}

	:global(.body .json-null) {
		color: #569cd6;
	}

	.pending-response {
		padding: 3rem;
		text-align: center;
		color: #999;
	}

	/* Status colors */
	:global(:root) {
		--status-green: #4caf50;
		--status-blue: #2196f3;
		--status-orange: #ff9800;
		--status-red: #f44336;
		--status-gray: #9e9e9e;
	}
</style>
