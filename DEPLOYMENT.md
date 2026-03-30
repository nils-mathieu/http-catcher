# Deployment Guide - Vercel

This guide will help you deploy the HTTP Proxy Catcher to Vercel.

## Prerequisites

- [Vercel account](https://vercel.com/signup) (free tier works)
- [Vercel CLI](https://vercel.com/cli) (optional, for command-line deployment)
- Git repository (GitHub, GitLab, or Bitbucket)

## Important Considerations

⚠️ **Before Deploying to Production:**

1. **Add Authentication** - The current implementation has no authentication. Anyone with the URL can access and configure namespaces.
2. **Rate Limiting** - Consider adding rate limits to prevent abuse.
3. **CORS Configuration** - You may need to configure CORS for your specific use case.
4. **Environment Variables** - Add any necessary environment variables for production.
5. **Security** - Review the security considerations in `DEVELOPMENT.md`.

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Push to Git

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - HTTP Proxy Catcher"

# Add remote (GitHub example)
git remote add origin https://github.com/yourusername/http-catcher.git

# Push to GitHub
git push -u origin main
```

#### Step 2: Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: SvelteKit (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.svelte-kit` (auto-detected)
   - **Install Command**: `npm install`

#### Step 3: Configure Environment Variables (Optional)

If you've added environment variables:
1. Go to **Settings** → **Environment Variables**
2. Add your variables (e.g., `DATABASE_URL`, `API_KEY`, etc.)

#### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (2-3 minutes)
3. Your app will be live at `https://your-project.vercel.app`

### Method 2: Deploy via Vercel CLI

#### Step 1: Install Vercel CLI

```bash
# Install globally
npm i -g vercel

# Login
vercel login
```

#### Step 2: Deploy

```bash
# Production deployment
vercel --prod

# Preview deployment (for testing)
vercel
```

#### Step 3: Follow Prompts

The CLI will ask:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **http-catcher** (or your choice)
- Directory? **./`**
- Override settings? **No** (uses vercel.json)

#### Step 4: Access Your Deployment

The CLI will provide a URL like:
```
https://http-catcher-xxxxx.vercel.app
```

## Configuration Details

### Adapter Configuration

The project uses `@sveltejs/adapter-vercel` configured in `svelte.config.js`:

```javascript
adapter: adapter({
  runtime: 'nodejs20.x',
  regions: ['iad1'],
  maxDuration: 60
})
```

**Options:**
- `runtime`: Node.js version (20.x recommended)
- `regions`: Deployment regions (see [Vercel Regions](https://vercel.com/docs/edge-network/regions))
- `maxDuration`: Max function execution time in seconds (10s free tier, 60s pro tier)

### Vercel.json Configuration

Key configurations in `vercel.json`:

**Functions:**
- Server functions timeout set to 60 seconds
- Applies to all API routes and server endpoints

**Headers:**
- SSE endpoints configured with proper headers
- Cache control disabled for event streams
- Connection keep-alive enabled

**Regions:**
- Default: `iad1` (Washington D.C.)
- Change to your preferred region(s)

## Available Regions

Choose the region closest to your users:

- **Americas:**
  - `iad1` - Washington, D.C., USA
  - `sfo1` - San Francisco, USA
  - `pdx1` - Portland, USA
  - `gru1` - São Paulo, Brazil

- **Europe:**
  - `fra1` - Frankfurt, Germany
  - `lhr1` - London, UK
  - `ams1` - Amsterdam, Netherlands

- **Asia Pacific:**
  - `hnd1` - Tokyo, Japan
  - `sin1` - Singapore
  - `syd1` - Sydney, Australia

[See full list](https://vercel.com/docs/edge-network/regions)

## Post-Deployment Configuration

### 1. Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-60 minutes)

### 2. Environment Variables

Add production environment variables:

```bash
# Via CLI
vercel env add DATABASE_URL production

# Via Dashboard
Settings → Environment Variables → Add New
```

### 3. CORS Configuration (If Needed)

Add to `src/hooks.server.ts`:

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
};
```

## Monitoring and Logs

### View Logs

**Via Dashboard:**
1. Go to your project
2. Click **"Deployments"**
3. Click on a deployment
4. View **"Logs"** tab

**Via CLI:**
```bash
# Real-time logs
vercel logs

# Filter by function
vercel logs --follow
```

### Analytics

Vercel provides built-in analytics:
1. Go to **Analytics** tab
2. View traffic, performance, and errors
3. Upgrade to Pro for advanced analytics

## Limitations on Vercel

### Free Tier Limitations

- **Function Duration**: 10 seconds max
- **Function Size**: 50MB max
- **Bandwidth**: 100GB/month
- **SSE Connections**: Limited by concurrent function executions
- **No Persistent Storage**: In-memory data lost between requests

### Recommendations

1. **Upgrade to Pro** for:
   - 60-second function duration (better for SSE)
   - More bandwidth
   - Better performance

2. **Add Database** for persistence:
   - Vercel Postgres
   - Vercel KV (Redis)
   - External database (Supabase, PlanetScale, etc.)

3. **Consider Alternatives** for long-running SSE:
   - Railway.app
   - Render.com
   - Fly.io
   - Self-hosted VPS

## Troubleshooting

### SSE Connections Dropping

**Problem**: Server-Sent Events disconnect after 10-60 seconds

**Solutions:**
1. Upgrade to Vercel Pro (60s timeout)
2. Implement reconnection logic in client
3. Use shorter keep-alive intervals
4. Consider alternative hosting for long-lived connections

### Build Failures

**Problem**: Build fails on Vercel

**Solutions:**
```bash
# Test build locally first
npm run build

# Check build logs in Vercel dashboard
# Common issues:
# - TypeScript errors
# - Missing dependencies
# - Environment variable issues
```

### Functions Timing Out

**Problem**: API routes timeout

**Solutions:**
1. Check `maxDuration` setting in `svelte.config.js`
2. Upgrade to Pro tier for 60s timeout
3. Optimize slow operations
4. Use edge functions for faster responses

### Memory Issues

**Problem**: Functions run out of memory

**Solutions:**
1. Reduce body size limits in `proxy.ts`
2. Stream large responses instead of buffering
3. Use edge runtime for lighter operations

## Security Hardening for Production

### 1. Add Authentication

```typescript
// src/hooks.server.ts
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const apiKey = event.request.headers.get('x-api-key');
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    throw error(401, 'Unauthorized');
  }
  
  return resolve(event);
};
```

### 2. Add Rate Limiting

```typescript
// Use Vercel KV or Upstash Redis
import { ratelimit } from '@/lib/ratelimit';

const { success } = await ratelimit.limit(clientId);
if (!success) {
  throw error(429, 'Too Many Requests');
}
```

### 3. Validate Inputs

Already implemented in API routes, but ensure all user inputs are validated.

### 4. Environment Variables

```bash
# Required for production
vercel env add SESSION_SECRET production
vercel env add API_KEY production
vercel env add DATABASE_URL production
```

## Continuous Deployment

Vercel automatically deploys:

- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### Configure Branch Settings

1. Go to **Settings** → **Git**
2. Set production branch (default: `main`)
3. Configure auto-deploy settings

### Deployment Protection

1. Enable **Vercel Password Protection**
2. Add **Deployment Protection** for preview deployments
3. Configure **Branch Protection** rules

## Performance Optimization

### 1. Enable Edge Caching

```typescript
// src/routes/+page.server.ts
export const config = {
  isr: {
    expiration: 60 // Cache for 60 seconds
  }
};
```

### 2. Use Edge Functions

For API routes that don't need SSE:

```typescript
export const config = {
  runtime: 'edge'
};
```

### 3. Optimize Bundle Size

```bash
# Analyze bundle
npm run build
# Check .svelte-kit/output/client for size
```

## Cost Estimation

### Free Tier
- ✅ Perfect for personal use
- ✅ Development and testing
- ⚠️ Limited SSE duration (10s)

### Pro Tier ($20/month)
- ✅ 60-second function duration
- ✅ Better for SSE connections
- ✅ Advanced analytics
- ✅ More bandwidth

### Enterprise
- Custom pricing
- Dedicated support
- Advanced features

## Alternative Deployment Options

If Vercel's limitations don't work for your use case:

1. **Railway.app** - Better for long-running connections
2. **Render.com** - Persistent servers
3. **Fly.io** - Global edge deployment
4. **DigitalOcean App Platform** - Managed container deployment
5. **Self-hosted VPS** - Full control (see `SELF_HOSTING.md`)

## Getting Help

- [Vercel Documentation](https://vercel.com/docs)
- [SvelteKit Deployment Docs](https://svelte.dev/docs/kit/adapter-vercel)
- [Vercel Support](https://vercel.com/support)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

## Quick Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] Repository imported to Vercel
- [ ] Build completed successfully
- [ ] Environment variables configured (if needed)
- [ ] Custom domain added (optional)
- [ ] Authentication added (recommended)
- [ ] Rate limiting implemented (recommended)
- [ ] Tested all features in production
- [ ] Monitoring and alerts configured
- [ ] Documentation updated with production URL

---

**Your HTTP Proxy Catcher is ready for Vercel!** 🚀

For more deployment options, see `SELF_HOSTING.md` (if you need persistent connections or custom infrastructure).