import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, AppVariables } from './lib/types'
import { APP_HTML } from './lib/app-html'

import auth from './routes/auth'
import receipts from './routes/receipts'
import points from './routes/points'
import ai from './routes/ai'
import email from './routes/email'
import users from './routes/users'
import analytics from './routes/analytics'
import webhooks from './routes/webhooks'

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

// CORS for all API routes
app.use('/api/*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'chaposhub', time: new Date().toISOString() })
})

// Monolithic frontend app (chaposhub_fixed.html port, wired to real API)
app.get('/', (c) => {
  return c.html(APP_HTML)
})

// Mount feature routes
app.route('/api/auth', auth)
app.route('/api/receipts', receipts)
app.route('/api/points', points)
app.route('/api/ai', ai)
app.route('/api/email', email)
app.route('/api/users', users)
app.route('/api/analytics', analytics)
app.route('/api/webhooks', webhooks)

// Note: static frontend assets in public/ (index.html, /static/*) are served
// automatically by Cloudflare Pages' built-in asset handler per _routes.json
// (exclude: /static/*). No serveStatic middleware needed/compatible here.

export default app
