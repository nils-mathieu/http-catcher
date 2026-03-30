<script lang="ts">
	import { onMount } from 'svelte';

	interface NamespaceInfo {
		namespace: string;
		targetHost: string;
		createdAt: string;
		activeConnections: number;
	}

	let namespaceInput = $state('');
	let activeNamespaces = $state<NamespaceInfo[]>([]);
	let isLoading = $state(false);

	onMount(async () => {
		await loadNamespaces();
	});

	async function loadNamespaces() {
		isLoading = true;
		try {
			const response = await fetch('/api/namespaces');
			if (response.ok) {
				const data = await response.json();
				activeNamespaces = data.namespaces;
			}
		} catch (error) {
			console.error('Failed to load namespaces:', error);
		} finally {
			isLoading = false;
		}
	}

	function goToPanel(namespace?: string) {
		const ns = namespace || namespaceInput.trim();
		if (ns) {
			window.location.href = `/panel/${ns}`;
		}
	}
</script>

<svelte:head>
	<title>HTTP Proxy Catcher</title>
</svelte:head>

<div class="container">
	<header>
		<h1>🌐 HTTP Proxy Catcher</h1>
		<p class="subtitle">Intercept, inspect, and debug HTTP requests in real-time</p>
	</header>

	<main>
		<section class="intro">
			<h2>How it works</h2>
			<div class="steps">
				<div class="step">
					<div class="step-number">1</div>
					<div class="step-content">
						<h3>Choose a Namespace</h3>
						<p>Enter a unique namespace identifier to create your isolated proxy environment</p>
					</div>
				</div>
				<div class="step">
					<div class="step-number">2</div>
					<div class="step-content">
						<h3>Configure Target Host</h3>
						<p>Set the destination server URL where requests should be forwarded</p>
					</div>
				</div>
				<div class="step">
					<div class="step-number">3</div>
					<div class="step-content">
						<h3>Send Requests</h3>
						<p>
							Make HTTP requests to <code>/{'{namespace}'}/{'{path}'}</code> and watch them flow through
						</p>
					</div>
				</div>
				<div class="step">
					<div class="step-number">4</div>
					<div class="step-content">
						<h3>Inspect in Real-Time</h3>
						<p>View requests, responses, headers, and bodies as they happen in the panel</p>
					</div>
				</div>
			</div>
		</section>

		<section class="quick-start">
			<h2>Get Started</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					goToPanel();
				}}
			>
				<div class="input-group">
					<label for="namespace">Enter a namespace:</label>
					<div class="input-row">
						<input
							type="text"
							id="namespace"
							bind:value={namespaceInput}
							placeholder="my-project"
							pattern="[a-zA-Z0-9\-_]+"
							title="Only alphanumeric characters, hyphens, and underscores allowed"
							required
						/>
						<button type="submit">Go to Panel →</button>
					</div>
				</div>
			</form>
		</section>

		<section class="features">
			<h2>Features</h2>
			<div class="feature-grid">
				<div class="feature">
					<div class="feature-icon">🔄</div>
					<h3>HTTP Proxy</h3>
					<p>Forward requests to any target host while maintaining full transparency</p>
				</div>
				<div class="feature">
					<div class="feature-icon">⚡</div>
					<h3>Real-Time Streaming</h3>
					<p>See requests and responses instantly as they flow through the proxy</p>
				</div>
				<div class="feature">
					<div class="feature-icon">🔍</div>
					<h3>Full Inspection</h3>
					<p>View all request/response details: headers, bodies, status codes, and timing</p>
				</div>
				<div class="feature">
					<div class="feature-icon">🎨</div>
					<h3>JSON Pretty Printing</h3>
					<p>Automatic JSON formatting and syntax highlighting for easy reading</p>
				</div>
				<div class="feature">
					<div class="feature-icon">🏷️</div>
					<h3>Isolated Namespaces</h3>
					<p>Each namespace is completely independent with its own configuration and logs</p>
				</div>
				<div class="feature">
					<div class="feature-icon">💾</div>
					<h3>Client-Side Storage</h3>
					<p>No server-side logging - all request history stays in your browser</p>
				</div>
				<div class="feature">
					<div class="feature-icon">🎯</div>
					<h3>All HTTP Methods</h3>
					<p>Support for GET, POST, PUT, DELETE, PATCH, and all other HTTP methods</p>
				</div>
			</div>
		</section>

		<section class="examples">
			<h2>Example Usage</h2>
			<div class="example">
				<h4>1. Configure your namespace</h4>
				<code>Target Host: https://api.example.com</code>
			</div>
			<div class="example">
				<h4>2. Send requests through the proxy</h4>
				<code>curl http://localhost:5173/my-project/users/123</code>
			</div>
			<div class="example">
				<h4>3. Watch in the panel</h4>
				<code>Open: http://localhost:5173/panel/my-project</code>
			</div>
		</section>

		{#if activeNamespaces.length > 0}
			<section class="active-namespaces">
				<h2>Active Namespaces</h2>
				<div class="namespace-list">
					{#each activeNamespaces as ns}
						<div class="namespace-card">
							<div class="namespace-header">
								<h3>{ns.namespace}</h3>
								{#if ns.activeConnections > 0}
									<span class="live-badge">🟢 {ns.activeConnections} live</span>
								{/if}
							</div>
							<div class="namespace-target">
								<strong>Target:</strong>
								<code>{ns.targetHost}</code>
							</div>
							<div class="namespace-footer">
								<span class="namespace-date">
									Created {new Date(ns.createdAt).toLocaleString()}
								</span>
								<button class="btn-panel" onclick={() => goToPanel(ns.namespace)}>
									Open Panel →
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</main>

	<footer>
		<p>Built with SvelteKit • No data is stored on the server</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		text-align: center;
		padding: 3rem 0;
		color: white;
	}

	h1 {
		font-size: 3.5rem;
		margin: 0;
		font-weight: 700;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.subtitle {
		font-size: 1.5rem;
		margin: 1rem 0 0 0;
		opacity: 0.95;
	}

	main {
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		overflow: hidden;
	}

	section {
		padding: 3rem;
		border-bottom: 1px solid #e0e0e0;
	}

	section:last-child {
		border-bottom: none;
	}

	h2 {
		margin: 0 0 2rem 0;
		font-size: 2rem;
		color: #333;
	}

	.steps {
		display: grid;
		gap: 2rem;
	}

	.step {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
	}

	.step-number {
		width: 50px;
		height: 50px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		flex-shrink: 0;
	}

	.step-content h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #333;
	}

	.step-content p {
		margin: 0;
		color: #666;
		line-height: 1.6;
	}

	.step-content code {
		background: #f5f5f5;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-size: 0.9em;
	}

	.quick-start {
		background: #f8f9fa;
	}

	.input-group {
		max-width: 600px;
		margin: 0 auto;
	}

	label {
		display: block;
		margin-bottom: 1rem;
		font-size: 1.125rem;
		font-weight: 500;
		color: #333;
	}

	.input-row {
		display: flex;
		gap: 1rem;
	}

	input[type='text'] {
		flex: 1;
		padding: 1rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1.125rem;
		font-family: 'Courier New', monospace;
		transition: border-color 0.2s;
	}

	input[type='text']:focus {
		outline: none;
		border-color: #667eea;
	}

	button {
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1.125rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
	}

	.feature {
		text-align: center;
		padding: 1.5rem;
	}

	.feature-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.feature h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.25rem;
		color: #333;
	}

	.feature p {
		margin: 0;
		color: #666;
		line-height: 1.6;
	}

	.examples {
		background: #f8f9fa;
	}

	.example {
		margin-bottom: 1.5rem;
	}

	.example:last-child {
		margin-bottom: 0;
	}

	.example h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: #555;
	}

	.example code {
		display: block;
		padding: 1rem;
		background: #2d2d2d;
		color: #f8f8f2;
		border-radius: 6px;
		font-family: 'Courier New', monospace;
		overflow-x: auto;
	}

	footer {
		text-align: center;
		padding: 2rem;
		color: white;
		opacity: 0.9;
	}

	footer p {
		margin: 0;
	}

	.active-namespaces {
		background: #f8f9fa;
	}

	.namespace-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.namespace-card {
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.namespace-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: #667eea;
	}

	.namespace-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.namespace-card h3 {
		margin: 0;
		font-size: 1.25rem;
		color: #333;
		font-family: 'Courier New', monospace;
	}

	.live-badge {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		background: #e8f5e9;
		color: #2e7d32;
		border-radius: 12px;
		font-weight: 600;
	}

	.namespace-target {
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.namespace-target strong {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		color: #666;
	}

	.namespace-target code {
		font-size: 0.875rem;
		color: #667eea;
		word-break: break-all;
	}

	.namespace-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.namespace-date {
		font-size: 0.75rem;
		color: #999;
	}

	.btn-panel {
		padding: 0.5rem 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.btn-panel:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
	}
</style>
