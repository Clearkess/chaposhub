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

## URLs
- **Production**: https://chaposhub.pages.dev *(deployment currently being re-verified — see Deployment section below)*
- **GitHub**: _not yet connected in this session_

## Data Architecture
- **Data Models**: `users` (auth + points balance + referral code), `receipts`/orders history, `activity_log` (points-consuming actions), `sessions`/JWT-based auth — see `migrations/` for exact schema.
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
