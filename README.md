# Chapo'sHub

## Project Overview
- **Name**: Chapo'sHub
- **Goal**: A points-based hub for generating branded (simulated) receipts across popular payment platforms, building support pages, and drafting AI-powered customer replies — pay-as-you-go, no subscriptions.
- **Features**:
  - Marketing landing page (public, unauthenticated) explaining the product, pricing, and FAQ
  - Email/password auth (login + register) via a modal triggered from the landing page
  - Receipt generator with 13+ platform presets (PayPal, Binance, Cash App, OPay, Zelle, Venmo, Wise, Coinbase, etc.), barcode + QR code rendering, download/print/email/short-link actions
  - Points economy: every account starts with 245 free points; actions (download, print, email, short link, AI reply, support page) each cost a small number of points; users top up via package purchases
  - AI Reply Assistant: paste a customer message, pick a tone, get an instant reply
  - Support page builder (branded contact page)
  - Referral link system
  - Points/activity history and basic analytics dashboard
  - **Whop payment webhook** (`POST /api/webhooks/whop`, see below): a $10 Whop "Starter" plan purchase auto-credits 1,000 points to the matching Chapo'sHub account — ⚠️ **built and tested locally, not yet deployed to production** (pending Cloudflare secret setup, see Deployment section)

## URLs
- **Production**: https://chaposhub.pages.dev *(deployment currently being re-verified — see Deployment section below)*
- **GitHub**: _not yet connected in this session_

## Data Architecture
- **Data Models**: `users` (auth + points balance + referral code), `receipts`/orders history, `activity_log` (points-consuming actions), `sessions`/JWT-based auth, `webhook_events` + `whop_payments` (Whop webhook idempotency/audit trail, added `migrations/0002_whop_webhooks.sql`) — see `migrations/` for exact schema.
- **Storage Services**: Cloudflare D1 (SQLite) for all persistent data; local development uses `--local` D1 via Wrangler.
- **Data Flow**: Frontend (`public/static/js/*.js`) calls JSON API routes under `/api/*` (Hono, `src/routes/*.ts`) which read/write D1. The monolithic frontend markup lives in `src/lib/app-html.ts` and is served by `src/index.tsx`.

## Landing Page
The public landing page (`src/lib/app-html.ts`, styles in `public/static/css/app.css`) is shown before login and covers, in order:
1. Hero (problem-first headline + "Start My Free Account" / "Sign In" CTAs, no-card-required note)
2. Supported platforms strip (real platform list, not a fabricated stat)
3. Problem → solution cards
4. Feature grid (Receipts, Points, AI Replies, Support Pages)
5. How it works (3 steps)
6. Transparent pricing (real per-action point costs + real package pricing pulled from `CONFIG.points` and `buyPoints()`)
7. FAQ (including an explicit, honest disclaimer that receipts are simulated records, not official proof of payment)
8. Final CTA + footer disclaimer

**Intentionally not included**, per product/ethics review: fabricated testimonials or trust stats (no real users yet), and SEO content pages targeting "receipt generator" search intent (risk of facilitating payment-proof fraud).

Sticky header nav (`#landing-how-it-works`, `#landing-pricing-section`, `#landing-faq-section`) appears on desktop widths; smooth-scrolls to sections, respecting `prefers-reduced-motion`.

## Whop Payment Webhook
`POST /api/webhooks/whop` (public, unauthenticated — verified via HMAC signature instead of a login session) receives Whop's `payment.succeeded` event and, on a successful `$10` / `plan_DZtaB5bXDuHOm` ("Starter") purchase, credits **1,000 points** to the Chapo'sHub account whose email matches the Whop buyer's email.

- **Verification**: implements the [Standard Webhooks](https://www.standardwebhooks.com/) spec Whop uses — HMAC-SHA256 over `{webhook-id}.{webhook-timestamp}.{raw body}`, keyed by `WHOP_WEBHOOK_SECRET`, constant-time compared against each `v1,<sig>` candidate in the `webhook-signature` header (supports secret rotation). Requests older than 5 minutes are rejected (replay protection).
- **Idempotency**: two independent guards — (1) `webhook_events` table short-circuits a redelivered `webhook-id` before any processing; (2) a `UNIQUE` constraint on `whop_payments.whop_payment_id` is the authoritative guard against double-crediting the same payment even across different webhook-ids.
- **Plan mapping**: `WHOP_STARTER_PLAN_ID` env var → 1,000 points (see `resolvePlanPoints()` in `src/routes/webhooks.ts` — extend this map if more Whop plans are added later).
- **Account matching**: by lowercased/trimmed email against `users.email`. If no account matches, the payment is recorded as `unmatched_email` in `whop_payments` (audit trail) but **no points are credited** — this needs manual reconciliation (the buyer likely used a different email than their Chapo'sHub account).
- **Required Cloudflare env vars** (Workers & Pages → Chapo'sHub → Settings → Variables and Secrets):
  - `WHOP_STARTER_PLAN_ID` = `plan_DZtaB5bXDuHOm` — plain variable
  - `WHOP_WEBHOOK_SECRET` = *(Whop's webhook signing secret)* — **must be a Secret**, never plaintext
- **Checkout entry point**: the in-app "Buy Points" screen's Starter card links straight to Whop's hosted checkout (`https://whop.com/checkout/plan_DZtaB5bXDuHOm`), with the logged-in user's email prefilled and locked (`?email=...&email.disabled=1`) so the Whop payment's buyer email matches their Chapo'sHub account automatically. Pro/Enterprise packages are marked "coming soon" — they have no Whop plan or webhook mapping yet, so they're disabled in the UI rather than silently crediting nothing.
- **Status**: ✅ **Deployed and verified in production** (2026-08-14) — signature verification, replay protection, idempotency, and the full webhook payload flow have all been confirmed live via Whop's own test-webhook tool and a real production D1 audit-trail check. Also passing a 21-assertion local test harness (`test/whop-webhook.test.mjs`) covering happy path, bad/wrong signature, replay, duplicate delivery, duplicate payment id, unrecognized plan, non-payment event, missing headers, and real end-to-end point crediting.
- **⚠️ Fixed security issue (2026-08-14)**: `POST /api/points/purchase` previously had a "mock mode" that instantly credited a package's points to *any authenticated user* with no real payment, whenever `STRIPE_SECRET_KEY` was unset (which it always was, since Stripe was never wired up). This let anyone with a valid login call the endpoint directly (or click the in-app Buy button) and get free points for any of the three packages. That mock-crediting branch has been **removed** — the endpoint now returns `501` when Stripe isn't configured, and the app's "Buy Points" screen instead redirects to the real Whop checkout for the one plan that's live (Starter). If you ever see unexplained point balances from before this fix, check `points_transactions` for rows with `payment_method='stripe'` and no matching real charge.

## SEO & Social Sharing
The single-page app (`src/lib/app-html.ts`) is server-rendered by Hono, so all SEO/social metadata lives directly in that file's `<head>` — there's no Next.js `metadata` export or separate `robots.ts`/`sitemap.ts` in this stack.

- **Canonical URL**: `<link rel="canonical" href="https://chaposhub.pages.dev/">` — the app is a single route (`/`), so this always points there.
- **Open Graph + Twitter Card**: `og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`, `og:image` (+ width/height/alt), and matching `twitter:*` tags for `summary_large_image` previews.
- **Social preview image**: `public/static/images/og-image.png` (1376×768, AI-generated to match the app's dark/purple-cyan theme) — served at `/static/images/og-image.png`.
- **Favicon / app icon**: `public/static/images/logo.png` (1024×1024 square mark) used as both `<link rel="icon">` and `apple-touch-icon`, plus as the `logo` field in the JSON-LD block below.
- **Structured data**: an inline `<script type="application/ld+json">` `Organization` schema (name, url, logo, description). Deliberately **not** `LocalBusiness` — Chapo'sHub has no physical storefront, and misusing that schema type is flagged by SEO tools/search engines as inaccurate markup.
- **`robots.txt` / `sitemap.xml`**: served by dedicated Hono routes (`GET /robots.txt`, `GET /sitemap.xml` in `src/index.tsx`), not static files under `public/`. Cloudflare Pages' generated `_routes.json` only excludes `/static/*` from the Worker, so root-level files placed in `public/` would otherwise be shadowed by the Worker's catch-all route and 404 — routing them through Hono directly sidesteps that.
- **No `<img>` content on the page itself**: the visible UI (logo, service icons) is intentionally emoji/text-based, not raster images — this is a deliberate lightweight design choice, not a missing-asset bug. The new PNG assets above exist solely for social-share previews, the favicon, and JSON-LD — not as in-page `<img>` elements.

## User Guide
1. Visit the site — you land on the marketing page.
2. Click **Start My Free Account** to register, or **Sign In** if you already have an account.
3. After authenticating you're dropped into the app shell (dashboard, receipts, points, AI, support, history).
4. Use **Buy Points** to top up; each action's point cost is shown in-app and matches the landing page pricing table.

## Deployment
- **Platform**: Cloudflare Pages (Hono + D1)
- **Status**: ⚠️ Currently being re-verified — the last known-live deployment returned 404s; a fresh deploy is pending resolution of Cloudflare API token access (see project history for details).
- **Tech Stack**: Hono + TypeScript + Vite + Wrangler, vanilla JS frontend, Cloudflare D1
- **Local dev**: `npm run build && pm2 start ecosystem.config.cjs` (serves on port 3000 via `wrangler pages dev`)
- **Last Updated**: 2026-07-23
