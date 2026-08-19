import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, AppVariables } from './lib/types'
import { APP_HTML } from './lib/app-html'
import { aboutPageHtml } from './lib/pages/about'
import { helpPageHtml } from './lib/pages/help'
import { contactPageHtml } from './lib/pages/contact'
import { privacyPolicyHtml, termsHtml } from './lib/pages/legal'

import auth from './routes/auth'
import receipts from './routes/receipts'
import points from './routes/points'
import ai from './routes/ai'
import email from './routes/email'
import users from './routes/users'
import analytics from './routes/analytics'
import webhooks from './routes/webhooks'
import opay from './routes/opay'
import opayWallet from './routes/opay-wallet'
import banks from './routes/banks'
import marketplace from './routes/marketplace'

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

// Static marketing subpages (persistent nav/footer via src/lib/site-chrome.ts)
app.get('/about', (c) => c.html(aboutPageHtml()))
app.get('/help', (c) => c.html(helpPageHtml()))
app.get('/contact', (c) => c.html(contactPageHtml()))
app.get('/privacy-policy', (c) => c.html(privacyPolicyHtml()))
app.get('/terms', (c) => c.html(termsHtml()))

// robots.txt / sitemap.xml — served directly by this Worker rather than as
// static files under public/, since Cloudflare Pages' _routes.json only
// excludes /static/* from Worker routing (root-level public/ files still hit
// this app, where they'd otherwise 404 with no matching route).
app.get('/robots.txt', (c) => {
  return c.text('User-agent: *\nAllow: /\n\nSitemap: https://chaposhub.pages.dev/sitemap.xml\n')
})

app.get('/sitemap.xml', (c) => {
  const pages: { loc: string; priority: string }[] = [
    { loc: '/', priority: '1.0' },
    { loc: '/about', priority: '0.7' },
    { loc: '/help', priority: '0.7' },
    { loc: '/contact', priority: '0.6' },
    { loc: '/privacy-policy', priority: '0.3' },
    { loc: '/terms', priority: '0.3' }
  ]
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>https://chaposhub.pages.dev${p.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    )
    .join('\n')
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    200,
    { 'Content-Type': 'application/xml' }
  )
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
app.route('/api/services/opay', opay)
app.route('/api/services/opay', opayWallet)
app.route('/api/banks', banks)
app.route('/api/marketplace', marketplace)

// Note: static frontend assets in public/ (index.html, /static/*) are served
// automatically by Cloudflare Pages' built-in asset handler per _routes.json
// (exclude: /static/*). No serveStatic middleware needed/compatible here.

export default app
