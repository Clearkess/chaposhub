import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, AppVariables } from './lib/types'

import auth from './routes/auth'
import receipts from './routes/receipts'
import points from './routes/points'
import ai from './routes/ai'
import email from './routes/email'
import users from './routes/users'
import analytics from './routes/analytics'

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

// CORS for all API routes
app.use('/api/*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'chaposhub', time: new Date().toISOString() })
})

// Placeholder landing page (full frontend port is a separate pending task)
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chapo'sHub</title>
  <link href="/static/style.css" rel="stylesheet">
  <style>
    body { font-family: -apple-system, Arial, sans-serif; background:#0f172a; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { text-align:center; padding:2rem; }
    h1 { color:#6366f1; }
    code { background:#1e293b; padding:2px 6px; border-radius:4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>&#129378; Chapo'sHub API</h1>
    <p>Backend is live. Frontend UI is under construction.</p>
    <p>Try <code>GET /api/health</code></p>
  </div>
</body>
</html>`)
})

// Mount feature routes
app.route('/api/auth', auth)
app.route('/api/receipts', receipts)
app.route('/api/points', points)
app.route('/api/ai', ai)
app.route('/api/email', email)
app.route('/api/users', users)
app.route('/api/analytics', analytics)

// Note: static frontend assets in public/ (index.html, /static/*) are served
// automatically by Cloudflare Pages' built-in asset handler per _routes.json
// (exclude: /static/*). No serveStatic middleware needed/compatible here.

export default app
