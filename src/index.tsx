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
import opay from './routes/opay'
import opayWallet from './routes/opay-wallet'
import banks from './routes/banks'
import marketplace from './routes/marketplace'
import p2p from './routes/p2p'

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

// CORS for all API routes
app.use('/api/*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'chaposhub', time: new Date().toISOString() })
})

// robots.txt / sitemap.xml — served directly by this Worker rather than as
// static files under public/, since Cloudflare Pages' _routes.json only
// excludes the static asset paths from Worker routing (root-level public/
// files not covered by _routes.json would otherwise 404 with no matching
// route here).
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

// Mount feature API routes (unchanged Hono/D1 implementations, already live
// in production — see server/src/routes/* for the parallel Express/
// better-sqlite3 port used by the local Node dev environment).
app.route('/api/auth', auth)
app.route('/api/receipts', receipts)
app.route('/api/points', points)
app.route('/api/ai', ai)
app.route('/api/email', email)
app.route('/api/users', users)
app.route('/api/analytics', analytics)
app.route('/api/services/opay', opay)
app.route('/api/services/opay', opayWallet)
app.route('/api/banks', banks)
app.route('/api/marketplace', marketplace)
app.route('/api/p2p', p2p)

// --- React SPA (client/) ---
// The React app is built separately (client/npm run build) and its output
// (index.html + /assets/* + /images/*) is copied into public/ by
// `npm run build` at the repo root (see scripts/copy-client-dist.mjs) before
// Cloudflare Pages' own build step runs. Cloudflare Pages' built-in static
// asset handler serves those files directly per _routes.json (they never
// reach this Worker). Any request that *isn't* a static asset match falls
// through to this catch-all, which serves the SPA shell so client-side
// routing (react-router-dom, e.g. /about, /help, /contact, /privacy-policy,
// /terms, and 404s) works correctly on hard refresh / direct link.
app.get('*', async (c) => {
  const asset = await c.env.ASSETS?.fetch(new Request(new URL('/index.html', c.req.url)))
  if (asset) return asset
  return c.text('Not found', 404)
})

export default app
