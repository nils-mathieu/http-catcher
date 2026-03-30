# HTTP Proxy Catcher 🌐

A real-time HTTP proxy server built with SvelteKit that lets you intercept, inspect, and debug HTTP requests with a beautiful web interface.

## Features

- 🔄 **HTTP Proxy** - Forward requests to any target host while maintaining full transparency
- ⚡ **Real-Time Streaming** - See requests and responses instantly using Server-Sent Events (SSE)
- 🔍 **Full Inspection** - View all request/response details: headers, bodies, status codes, and timing
- 🎨 **JSON Pretty Printing** - Automatic JSON formatting and syntax highlighting for request/response bodies
- 🏷️ **Isolated Namespaces** - Each namespace is completely independent with its own configuration and logs
- 💾 **Client-Side Storage** - No server-side logging - all request history stays in your browser
- 🎯 **All HTTP Methods** - Support for GET, POST, PUT, DELETE, PATCH, and all other HTTP methods
- 🚀 **Built with SvelteKit** - Modern, fast, and reactive

## How It Works

1. **Choose a Namespace** - Enter a unique namespace identifier to create your isolated proxy environment
2. **Configure Target Host** - Set the destination server URL where requests should be forwarded
3. **Send Requests** - Make HTTP requests to `/<namespace>/<path>` and watch them flow through
4. **Inspect in Real-Time** - View requests, responses, headers, and bodies as they happen in the panel

## Quick Start

### Installation

```bash
# Install dependencies
bun install
# or
npm install
```

### Run Development Server

```bash
bun run dev
# or
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
bun run build
# or
npm run build
```

## Deployment

### Deploy to Vercel

The project is configured for easy deployment to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your Git repository to Vercel Dashboard for automatic deployments.

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.**

⚠️ **Important**: Add authentication and rate limiting before deploying to production! See security considerations below.

## Usage

### 1. Open the Application

Navigate to `http://localhost:5173` in your browser.

### 2. Choose a Namespace

On the home page, enter a namespace (e.g., `my-api`) and click "Go to Panel →"

### 3. Configure Target Host

In the panel at `/panel/my-api`, enter your target host URL:

```
Target Host: https://api.example.com
```

Click "Save Configuration"

### 4. Send Requests Through the Proxy

Now you can send HTTP requests to your namespace path:

```bash
# Example: Proxy GET request
curl http://localhost:5173/my-api/users/123

# Example: Proxy POST request
curl -X POST http://localhost:5173/my-api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe"}'

# Example: Proxy with query parameters
curl http://localhost:5173/my-api/search?q=hello&limit=10
```

The request will be forwarded to:
- `https://api.example.com/users/123`
- `https://api.example.com/users`
- `https://api.example.com/search?q=hello&limit=10`

### 5. View Real-Time Logs

The panel automatically updates with each request and response, showing:
- HTTP method and path
- Request/response headers
- Request/response bodies (with automatic JSON pretty printing and syntax highlighting)
- Status codes
- Response duration
- Timestamps

## API Endpoints

### Configuration API

#### Get Namespace Configuration
```http
GET /api/<namespace>
```

Returns the current configuration for a namespace.

**Response:**
```json
{
  "namespace": "my-api",
  "targetHost": "https://api.example.com",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Set Namespace Configuration
```http
POST /api/<namespace>
Content-Type: application/json

{
  "targetHost": "https://api.example.com"
}
```

Sets or updates the target host for a namespace.

**Response:**
```json
{
  "namespace": "my-api",
  "targetHost": "https://api.example.com",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "message": "Configuration saved successfully"
}
```

#### Delete Namespace Configuration
```http
DELETE /api/<namespace>
```

Deletes the configuration for a namespace.

### Event Stream API

#### Subscribe to Real-Time Events
```http
GET /api/<namespace>/events
```

Opens a Server-Sent Events (SSE) connection to receive real-time request/response logs.

**Events:**
- `connected` - Connection established
- `request` - New request received
- `response` - Response received
- `error` - Error occurred

### Proxy API

#### Proxy Any Request
```http
<METHOD> /<namespace>/<path>
```

Proxies the request to the configured target host. All HTTP methods are supported.

## Architecture

```
┌─────────────┐
│   Browser   │
│  (Panel UI) │
└──────┬──────┘
       │ SSE Connection
       ├──────────────────┐
       │                  │
┌──────▼──────┐     ┌─────▼─────┐
│  Configure  │     │  Watch    │
│  Namespace  │     │  Logs     │
└──────┬──────┘     └───────────┘
       │
┌──────▼────────────────────────┐
│      SvelteKit Server         │
│  ┌─────────────────────────┐  │
│  │  In-Memory Store        │  │
│  │  - Namespace Configs    │  │
│  │  - SSE Subscribers      │  │
│  └─────────────────────────┘  │
│                                │
│  ┌─────────────────────────┐  │
│  │  Proxy Handler          │  │
│  │  - Forward requests     │  │
│  │  - Emit events to SSE   │  │
│  └─────────────────────────┘  │
└───────────────┬───────────────┘
                │
         ┌──────▼──────┐
         │   Target    │
         │   Server    │
         └─────────────┘
```

## Project Structure

```
http-catcher/
├── src/
│   ├── lib/
│   │   └── server/
│   │       ├── store.ts        # In-memory namespace store
│   │       └── proxy.ts        # Proxy logic
│   ├── routes/
│   │   ├── +page.svelte        # Home page
│   │   ├── api/
│   │   │   └── [namespace]/
│   │   │       ├── +server.ts  # Config API
│   │   │       └── events/
│   │   │           └── +server.ts  # SSE endpoint
│   │   ├── panel/
│   │   │   └── [namespace]/
│   │   │       └── +page.svelte    # Panel UI
│   │   └── [namespace]/
│   │       └── [...path]/
│   │           └── +server.ts  # Proxy handler
│   └── app.html
├── package.json
├── svelte.config.js
├── vercel.json              # Vercel deployment config
├── DEPLOYMENT.md            # Deployment guide
└── README.md
```

## Key Features Explained

### Namespace Isolation

Each namespace operates independently:
- Has its own target host configuration
- Has its own event stream
- Logs are stored separately in each browser tab

### Real-Time Updates

Uses Server-Sent Events (SSE) for efficient, unidirectional streaming from server to browser:
- Low latency
- Automatic reconnection
- No polling overhead

### Stateless Server

The server doesn't store any request/response logs:
- Only configuration is stored in memory
- All request/response data is streamed to connected clients
- Restarts clear all configurations

### Request/Response Logging

Captures complete request/response details:
- Full headers (both request and response)
- Body content (up to 1MB limit)
- Automatic JSON detection and pretty printing
- Syntax highlighting for JSON bodies
- Timing information
- Error details

### Header Handling

The proxy automatically handles headers to ensure proper forwarding:

**Request Headers Updated:**
- `Host` - Set to target server's host
- `Origin` - Updated to target server's origin (if present)
- `Referer` - Updated to point to target server (if present)
- `X-Forwarded-Proto` - Original request protocol (http/https)
- `X-Forwarded-Host` - Original proxy host
- `X-Forwarded-For` - Client IP chain
- `X-Real-IP` - Client IP address

**Headers Removed:**
- Hop-by-hop headers (Connection, Keep-Alive, etc.)
- These are regenerated by the proxy

**Response Headers:**
- All headers from target server are forwarded
- Hop-by-hop headers are removed for clean forwarding

### JSON Pretty Printing

Automatically detects and formats JSON in request/response bodies:
- Pretty prints with 2-space indentation
- Syntax highlighting with color coding
- Works with `application/json` content-type
- Auto-detects JSON even without content-type

## Use Cases

- **API Development** - Debug your API calls in real-time
- **Testing** - Inspect requests from your application
- **Debugging** - See exactly what's being sent and received
- **Learning** - Understand HTTP communication better
- **Integration Testing** - Monitor third-party API interactions

## Limitations

- **In-Memory Storage** - Configurations are lost on server restart
- **No Authentication** - Anyone can access any namespace (add auth if needed)
- **Body Size Limit** - Request/response bodies are limited to 1MB for logging
- **Single Instance** - Not designed for distributed deployment (would need external storage)

## Security Considerations

⚠️ **This is a development/debugging tool. Do not expose it to the public internet without proper security measures:**

- No authentication by default
- No rate limiting
- Sensitive data may be logged (headers, tokens, etc.)
- Anyone with access can configure namespaces
- SSRF vulnerability (can proxy to any host)

### Recommended Security Measures for Production:

1. **Add Authentication** - Implement user login and session management
2. **Add Authorization** - Restrict namespace access to owners
3. **Add Rate Limiting** - Prevent abuse
4. **Validate Target Hosts** - Whitelist allowed domains
5. **Sanitize Logs** - Remove sensitive headers (Authorization, Cookie, etc.)
6. **Use HTTPS** - Always use SSL/TLS in production
7. **Set CORS Policies** - Restrict cross-origin access

See [DEVELOPMENT.md](./DEVELOPMENT.md) for implementation details.

## Future Enhancements

- [ ] Persistent storage (database)
- [ ] Authentication and authorization
- [ ] Request filtering and search
- [ ] Export logs to file
- [ ] Request replay functionality
- [ ] WebSocket proxying
- [ ] Request/response modification
- [ ] Multiple target hosts per namespace
- [ ] Rate limiting

## Technologies Used

- **SvelteKit** - Full-stack framework
- **TypeScript** - Type safety
- **Server-Sent Events** - Real-time streaming
- **Fetch API** - HTTP proxying
- **Svelte 5** - Reactive UI with runes

## Documentation

- [README.md](./README.md) - This file
- [QUICKSTART.md](./QUICKSTART.md) - 5-minute tutorial
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Developer guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [COMPLETION.md](./COMPLETION.md) - Project summary

## Testing

Run the example test scripts:

```bash
# Unix/Mac/Linux
./test-example.sh

# Windows
test-example.bat
```

## License

MIT

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Built with ❤️ using SvelteKit