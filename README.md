# Chapo'sHub

## Project Overview
- **Name**: Chapo'sHub
- **Goal**: A points-based hub for generating branded (simulated) receipts across popular payment platforms, building support pages, and drafting AI-powered customer replies — pay-as-you-go, no subscriptions.
- **Features**:
  - Marketing landing page (public, unauthenticated) explaining the product, pricing, and FAQ
  - Email/password auth (login + register) via a modal triggered from the landing page
  - Receipt generator with 13+ platform presets (PayPal, Binance, Cash App, OPay, Zelle, Venmo, Wise, Coinbase, etc.), barcode + QR code rendering, download/print/email/short-link actions
  - Points economy: every account starts with 245 free points; actions (download, print, email, short link, AI reply, support page) each cost a small number of points; users top up via package purchases
  - **Chapo'sHub AI Hub**: 9 AI tools in one page (tab/chip selector) — 💬 Customer Reply, ✍️ Content Generator, 📱 Social-Media Captions, 🛍️ Product Descriptions, 📧 Email Generator, 🔄 Rewrite/Improve Text, 🧠 General AI Chat, 📄 Long-Form Content, 💻 Coding Assistant — each powered by NoMask/Nemotron 3 Ultra (falls back to OpenAI, then a canned template, if unconfigured), each consuming its own point cost per generation
  - Support page builder (branded contact page)
  - Referral link system
  - Points/activity history and basic analytics dashboard
  - **Whop payment webhook** (`POST /api/webhooks/whop`, see below): a $10 Whop "Starter" plan purchase auto-credits 1,000 points to the matching Chapo'sHub account — ⚠️ **built and tested locally, not yet deployed to production** (pending Cloudflare secret setup, see Deployment section)
  - **OPay Wallet Demo** (`/services/opay`, see below): a full wallet-app-style demo experience (dashboard, Send Money, To Bank, History) — gated behind Chapo'sHub login, with each user getting their own private simulated wallet balance + transaction history, and every send/transfer costing real Chapo'sHub points via an atomic two-ledger deduction with automatic refund-on-failure. Includes an optional **real** Nigerian bank list + account-name lookup via Paystack for the To Bank flow — ⚠️ **built and tested locally (all API paths verified via curl), not yet deployed to production** (pending Cloudflare D1 migration + optional `PAYSTACK_SECRET_KEY` secret, see Deployment section)
  - **Static marketing subpages** with a persistent header/footer nav (Home/Help/About/Contact/Sign In, matching the pattern used by comparable receipt-generator sites like SlipCraft): `/about`, `/help` (searchable FAQ), `/contact` (WhatsApp + email + contact form), `/privacy-policy`, `/terms`
  - **Dark/light theme toggle**, persisted in `localStorage`, working on the landing page, dashboard, and every static subpage
  - **Scripts Marketplace** (`/services/marketplace`, see below): sell/buy ready-made legitimate website templates and scripts between users, with a 10% platform fee, R2-hosted purchase-gated file delivery, and an admin moderation queue for new/edited listings

## URLs
- **Production**: https://chaposhub.pages.dev — ✅ verified live 2026-08-18, deployed via GitHub → Cloudflare Pages git integration (`/api/health` returns `{"status":"ok"}`, all marketing subpages + D1-backed API confirmed working)
- **GitHub**: https://github.com/Clearkess/chaposhub (connected to Cloudflare Pages — every push to `main` auto-deploys to production)

## Data Architecture
- **Data Models**: `users` (auth + points balance + referral code), `receipts`/orders history, `activity_log` (points-consuming actions), `sessions`/JWT-based auth, `webhook_events` + `whop_payments` (Whop webhook idempotency/audit trail, added `migrations/0002_whop_webhooks.sql`), `opay_receipts` (dedicated OPay receipt records, added `migrations/0003_opay_service.sql`) — see `migrations/` for exact schema.
- **Storage Services**: Cloudflare D1 (SQLite) for all persistent data; local development uses `--local` D1 via Wrangler.
- **Data Flow**: Frontend (`public/static/js/*.js`) calls JSON API routes under `/api/*` (Hono, `src/routes/*.ts`) which read/write D1. The monolithic app-shell markup lives in `src/lib/app-html.ts`; static marketing subpages live in `src/lib/pages/*.ts` and share chrome via `src/lib/site-chrome.ts`. All routed by `src/index.tsx`.

## Landing Page
The public landing page (`src/lib/app-html.ts`, styles in `public/static/css/app.css`) is shown before login and covers, in order:
1. Hero (problem-first headline + "Start My Free Account" / "Sign In" CTAs, no-card-required note) + trust badges (SSL Encrypted / Instant Delivery / Available Worldwide — real, verifiable claims)
2. Growth stats bar ("1,250,000+ Receipts Generated", "50,000+ Active Sellers", "890,000+ AI Replies Sent") — **aspirational placeholder figures**, not audited/real numbers; swap in real data once available
3. Supported platforms strip with real brand SVG icons (Binance, Bybit, Coinbase, PayPal, Crypto.com, Cash App, OPay, Kuda, Wise, Venmo, Zelle, Remitly, Stripe)
4. Problem → solution cards
5. Feature grid (Receipts, Points, AI Replies, Support Pages)
6. How it works (3 steps)
7. Transparent pricing (real per-action point costs + real package pricing pulled from `CONFIG.points` and `buyPoints()`, with an honest "COMING SOON" tag on the Pro/Enterprise packages that aren't purchasable yet)
8. FAQ (including an explicit, honest disclaimer that receipts are simulated records, not official proof of payment)
9. Final CTA + rich footer (Resources/Company/Contact link columns)

**Design v2 merge (2026-08-20)**: the user supplied a redesigned landing-page mockup (`chaposhub_v2.html`) with a green accent theme, a polished gradient logo mark, real platform-brand SVG icons, and a growth-stats bar. Per explicit user direction, both changes were adopted **site-wide** (not landing-page-only):
- **Color theme**: swapped the global `--accent`/`--accent-light`/`--accent-glow` CSS variables (and all hardcoded indigo hex/rgba literals across `app.css`, `app.js`, `app-html.ts`, and the receipt-email template) from indigo (`#6366f1`) to green (`#22c55e`), for both dark and light themes. This affects the landing page, dashboard, receipts, points, AI hub, marketplace, auth modal, and static subpages uniformly. The OPay Wallet Demo already used its own scoped mint-green palette (`--ow-mint`), so it needed no change and is now naturally consistent with the rest of the app.
- **Stats bar**: added as aspirational placeholder copy per explicit user approval — flagged in-repo as not-yet-real numbers.

**Intentionally not included**, per product/ethics review: fabricated testimonials or trust stats (no real users yet), and SEO content pages targeting "receipt generator" search intent (risk of facilitating payment-proof fraud).

Sticky header nav (`#landing-how-it-works`, `#landing-pricing-section`, plus persistent links to `/help`, `/about`, `/contact`) appears on desktop widths; smooth-scrolls to in-page anchor sections, respecting `prefers-reduced-motion`.

## Marketing Subpages & Design Inspiration
A competitive review of **SlipCraft** (slipcraft.net — a comparable points-based receipt-generator product) informed a set of legitimate UX/structure upgrades, implemented in `src/lib/site-chrome.ts` (shared header/footer) and `src/lib/pages/*.ts`:
- **`/about`** — mission, "who we serve," and 4 value cards (Speed/Security/Accessibility/Honesty)
- **`/help`** — expanded, client-side-searchable FAQ (10 questions) with a "still need help → contact" CTA
- **`/contact`** — real WhatsApp (`+234 705 660 6129`, `wa.me` deep link) and email contact channels, a `mailto:`-based contact form, and honest response-time expectations
- **`/privacy-policy`** and **`/terms`** — real policy pages (previously referenced nowhere and didn't exist — a genuine gap for a site that takes payments); Terms includes an explicit clause prohibiting using generated receipts as real proof of payment
- **Persistent header/footer** (Home/Help/About/Contact/Sign In nav + Resources/Company/Contact footer columns) shared across landing + all subpages via `siteHeader()`/`siteFooter()`
- **Working dark/light theme toggle** (`public/static/js/theme.js`, `localStorage`-persisted `chapo_theme`), replacing a dead "coming soon" button on both the landing page and the dashboard app shell
- **Trust badge row** (SSL Encrypted / Instant Delivery / Available Worldwide) — all true today, unlike inflated stats

**Deliberately NOT replicated from SlipCraft**, per the same ethics standard already applied to the landing page:
- **Fabricated usage stats and testimonials** (e.g. "335,221+ users," scripted customer quotes) — dishonest, no real numbers exist yet
- **"Login Page Builder"** — SlipCraft frames this as "phishing awareness testing," but it's a fake-login-page generator; SlipCraft itself is called out in public search results and social posts as a tool used to create fraudulent bank/payment screenshots. Building this would turn Chapo'sHub into a phishing kit — out of scope, permanently.

## Chapo'sHub AI Hub (NoMask / Nemotron 3 Ultra)
`POST /api/ai/reply` (auth required, `src/routes/ai.ts`) generates the AI Reply Assistant's message. It tries providers in this order, never exposing any key to the browser — the frontend only ever calls this one same-origin endpoint:

1. **NoMask (Nemotron 3 Ultra)** — used if `NOMASK_API_KEY` is set. Calls `https://nomask.ai/api/v1/chat/completions` (OpenAI-compatible chat-completions format) with `model: "nemotron-3-ultra_free"`, `Authorization: Bearer ${NOMASK_API_KEY}`.
2. **OpenAI** — used if NoMask isn't configured, or its call fails/returns something unexpected. Calls `https://api.openai.com/v1/chat/completions` with `model: "gpt-3.5-turbo"`, `Authorization: Bearer ${OPENAI_API_KEY}`.
3. **Canned template** — used if neither key is configured, or both calls fail. Returns a static tone-matched reply so the feature always works, even fully unconfigured.

Response shape is identical across all three sources: `{ reply, tone, source, tokensUsed }`, where `source` is `"nomask"`, `"openai"`, `"template"`, or `"template-fallback"` — useful for confirming in production which provider actually served a given reply.

- **Required Cloudflare env var** (Workers & Pages → chaposhub → Settings → Variables and Secrets):
  - `NOMASK_API_KEY` = *(your NoMask API key from the Playground → Keys tab)* — **must be added as a Secret**, never a plain variable, so it isn't readable from the dashboard UI after saving and never ends up in any client-side bundle.
- **Local dev**: add `NOMASK_API_KEY=...` to `.dev.vars` (already gitignored, never committed) to test the real NoMask call locally with `npm run build && pm2 start ecosystem.config.cjs`.
- **Security note**: this key is only ever read server-side via `c.env.NOMASK_API_KEY` inside the Hono route running on Cloudflare's edge — it is never sent to or readable by the browser, matching the same pattern already used for `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, and `WHOP_WEBHOOK_SECRET`.
- **Status**: ✅ **Live and confirmed working in production** (2026-08-18) — both `/api/ai/reply` and the new `/api/ai/generate` AI Hub tools return `source: "nomask"` with real Nemotron 3 Ultra-generated output. Verified via live production requests for `content` (Content Generator), `social` (Social Captions), and `code` (Coding Assistant), plus a full points-deduction round trip (`POST /api/points/deduct` with the new `ai_content`/etc. action keys) — all confirmed working end-to-end on https://chaposhub.pages.dev.
- **Not yet wired**: point-deduction-*before*-AI-call race protection (currently the frontend deducts points via a separate `/api/points/deduct` call after receiving the AI reply, so a request could theoretically fail the AI call after deduction — low risk since the template fallback always succeeds, but worth tightening if usage volume grows).

### AI Hub tools (`POST /api/ai/generate`)
Beyond the original tone-based `/api/ai/reply` endpoint, Chapo'sHub AI now exposes a generalized `POST /api/ai/generate` route (auth required, `src/routes/ai.ts`) that powers 8 additional tools, all sharing the exact same NoMask → OpenAI → canned-template fallback chain described above (via a shared `callAIProvider()` helper):

| Tool (`tool` value) | UI label | Point cost | Extra option(s) sent |
|---|---|---|---|
| `content` | ✍️ Content Generator | 5 | `tone` |
| `social` | 📱 Social-Media Captions | 3 | `platform` |
| `product` | 🛍️ Product Descriptions | 4 | — |
| `email_gen` | 📧 Email Generator | 5 | `tone` |
| `rewrite` | 🔄 Rewrite/Improve Text | 3 | `style` |
| `chat` | 🧠 General AI Chat | 2 | — |
| `longform` | 📄 Long-Form Content | 10 | `tone` |
| `code` | 💻 Coding Assistant | 6 | `language` |

(The original `reply` tool — 💬 Customer Reply, 3 points, `tone` — still uses the dedicated `/api/ai/reply` endpoint and tone-based templates; all 9 tools share one page in the UI via a tool-chip switcher.)

Request shape: `POST /api/ai/generate { tool, input, tone?, platform?, style?, language? }` → `{ reply, tool, source, tokensUsed }`, where `source` is `"nomask"`, `"openai"`, `"template"`, or `"template-fallback"` (same semantics as `/api/ai/reply`).

**Credit flow (per the original Step 7 plan)**: for every tool, the frontend (`generateAIContent()` in `public/static/js/app.js`) checks the user has enough points client-side, calls the AI endpoint, then calls `POST /api/points/deduct` with the tool's dedicated action key (e.g. `ai_content`, `ai_social`, ...) which is validated server-side against `POINTS_COSTS` (`src/lib/types.ts`) before decrementing the balance and logging an activity row — mirroring the existing `ai`/download/print/email/link/support action pattern, just with 8 new action keys.

## OPay Wallet Demo (`/services/opay`)
A wallet-app-style demo experience — dashboard, Send Money, To Bank, and History — replacing the original form-based OPay receipt generator as the `/services/opay` page. Built as an original implementation on Chapo'sHub's real Hono/D1/Workers stack (never copying the foreign "Table API" data layer from the reference UI/UX prototype that inspired the visual design). Deliberately kept non-transactional: it is a **private, per-user play-money simulation**, not a real OPay account, bank account, or payment rail.

### Access model
- **Gated behind Chapo'sHub login**: every wallet/send/transfer/history endpoint requires a valid Chapo'sHub session (`authMiddleware`) — unauthenticated requests get `401 Authentication required`. In the UI, the wallet page is also only reachable after the app-shell itself is unlocked by login (the SPA hides the whole app shell until authenticated).
- **Private per-user wallet + history**: each authenticated user gets their own isolated `opay_demo_wallets` row (auto-provisioned on first access, default balance ₦245,830.50) and their own `opay_demo_transactions` rows — never a shared/global demo wallet. Verified: two different accounts each see their own distinct wallet balance and transaction list with zero crossover.

### Endpoints (`src/routes/opay-wallet.ts`, mounted at `/api/services/opay`, all auth required)
| Endpoint | Purpose |
|---|---|
| `GET /wallet` | Returns the caller's own demo wallet, auto-creating it on first call |
| `GET /transactions` | The caller's own demo transaction history, newest first (`?limit=` up to 200) |
| `POST /send` | Send Money to a name/phone recipient — debits wallet + points atomically |
| `POST /transfer` | Transfer To Bank (optionally after a real Paystack account-name verification) — debits wallet + points atomically |

**Sending money costs points — atomic two-ledger deduction with refund-on-failure**: every send/transfer debits BOTH the simulated wallet balance (`opay_demo_wallets.balance`) and the user's real Chapo'sHub points (`users.points`), each via its own single conditional `UPDATE ... WHERE ... AND balance/points >= ?` — never a read-then-write race. If the wallet debit succeeds but the points debit fails (insufficient points), the wallet debit is refunded immediately and a `402 Insufficient points` is returned. If both debits succeed but writing the transaction record then fails, **both** debits are refunded before returning an error. Point costs: **Send Money = 6 points**, **To Bank transfer = 10 points** (`opay_wallet_send` / `opay_bank_transfer` in `POINTS_COSTS`, `src/lib/types.ts`). All four failure/success paths (successful send, insufficient points w/ wallet refund verified, insufficient wallet balance w/ no points touched, successful bank transfer) have been verified locally via direct API testing.

**Ethical guardrail (unchanged)**: nothing in this feature is ever presented as proof of a real financial transaction — the wallet balance, transaction history, and transfer receipts are all clearly-labeled simulations, and no real payment rail is ever touched.

### Real bank list + account-name resolution (Paystack passthrough) — used by the To Bank flow
A **hybrid model**: only the bank data is real, the transfer itself stays simulated.

| Component | Behavior |
|---|---|
| Wallet / transfer / receipt | Simulated (unchanged) |
| Bank dropdown + bank codes | **Real**, live from Paystack |
| Account number | User input |
| Account name | **Real** provider lookup (Paystack) |
| Actual bank transfer | **Not enabled** — no transfer capability exists anywhere in this app |

- `GET /api/banks` (`src/routes/banks.ts`, auth required, unchanged from Phase 2) — fetches Nigeria's current active bank list from Paystack, filters to `active && !is_deleted`, returns `{ name, code, slug }` per bank. Verified live: returns **278 real active Nigerian banks**.
- `POST /api/banks/resolve` (auth required, unchanged from Phase 2) — resolves `{ account_number, bank_code }` to a real account name via Paystack. Server-side validation: `account_number` must be exactly 10 digits (NUBAN format).
- On the To Bank view, the bank dropdown + account-number field + Verify button call these same endpoints unchanged; a successful lookup fills in the confirmed account name before the transfer can proceed.
- **Required Cloudflare env var**: `PAYSTACK_SECRET_KEY` (Secret, never plain text) — optional; if unset, `/api/banks`/`/api/banks/resolve` return `500 Bank service is not configured.` and the bank dropdown shows "Unable to load banks," but Send Money, dashboard, and History still work fully without it.
- **Local dev**: add `PAYSTACK_SECRET_KEY=sk_test_...` to `.dev.vars` (gitignored).
- **Status**: ✅ Built and verified locally (all four wallet/send/transfer/transactions endpoints, both refund-on-failure paths, auth-gating, and per-user isolation all confirmed via direct API testing) — ⚠️ not yet deployed to production (pending the new `0004_opay_wallet_demo.sql` D1 migration + optional `PAYSTACK_SECRET_KEY` secret, see Deployment section).

### Legacy OPay receipt-generator backend (dormant — kept intentionally, per product decision)
The original form-based receipt-generator backend from Phase 1 (`src/routes/opay.ts` — `POST /generate`, `GET /history`, `GET /receipt/:id`, backed by the `opay_receipts` table) is still mounted at the same `/api/services/opay` prefix (on disjoint sub-paths, so it can't conflict with the new wallet routes) but is **no longer reachable from any UI element** — the page it used to power has been fully replaced by the wallet demo above. **Decision: kept dormant** rather than deleted, in case a future "download a receipt for a wallet transaction" feature wants to reuse it.

### History view — full feature parity with the reference design
The History view was built out to match the uploaded ZIP's fuller reference implementation (`history.html` / `js/history.js` / `js/common.js`), not just a flat transaction list:
- **Summary row**: Total In / Total Out totals (computed client-side from the loaded transaction list, split by `type`/`status`).
- **Filter chips**: All, Money In, Money Out, Send, Bank Transfer, Completed, Pending, Failed.
- **Live search box**: filters by counterparty name, bank name, or note.
- **Date grouping**: transactions grouped under Today / Yesterday / Earlier headings.
- **Tap-to-view receipt**: tapping any transaction opens a bottom-sheet modal with the full transaction detail (amount, status, counterparty/bank/account, category, date, note, points charged, reference) — mirroring the ZIP's `openTxnReceipt()`.

All of this reads from the same `GET /transactions` endpoint already described above — no backend changes were needed, the richer UI is purely a frontend build-out (`OpayWallet` module in `app.js` + new `.ow-summary-*`/`.ow-filter-chip`/`.ow-modal-*` CSS).

## Scripts Marketplace (`/services/marketplace`)
A peer-to-peer marketplace for buying and selling **ready-made, legitimate website templates and scripts** — a legitimate, non-deceptive alternative use case for the "template marketplace" concept (explicitly scoped this way; a scam-template marketplace was correctly refused before this feature was proposed).

### Model
- **Listings**: any authenticated user can create a listing (title, description, category, price in points, external preview-image URL, uploaded file). New listings — and any subsequent edit to an approved listing — start in `pending` status and are invisible in public Browse until an admin approves them. This re-moderation-on-edit rule prevents a seller from silently swapping in different content after approval.
- **Categories**: simple text filter chips across 7 categories (`src/lib/types.ts` → `MARKETPLACE_CATEGORIES`).
- **File delivery**: uploaded files are stored in a dedicated R2 bucket (binding `MARKETPLACE_BUCKET`, 25MB cap) and are **never** exposed via a public R2 URL — they can only be streamed through the authenticated `GET /api/marketplace/download/:purchaseId` route, which verifies the requester is the buyer or seller on that exact purchase row.
- **Purchase flow**: a single atomic three-party operation (buyer debit → seller credit 90% → 10% platform fee retained → purchase row inserted), with full reversal on any failure at any step — the same conditional `UPDATE ... WHERE points >= ?` pattern proven in the OPay Wallet's debit/refund logic (never read-then-write). Self-purchase, double-purchase, and insufficient-balance are all explicitly rejected with zero side effects.
- **Admin moderation**: `role='admin'` users get a Review Queue tab to approve/reject pending listings (with a reason on rejection). Soft-delete (owner-only) hard-deletes the R2 file only if the listing has zero sales, to avoid breaking past buyers' downloads.

### Endpoints (`src/routes/marketplace.ts`, mounted at `/api/marketplace`)
| Endpoint | Purpose |
|---|---|
| `GET /listings` | Public browse, with category + search filter (optional-auth, adds a `purchased` flag if logged in) |
| `GET /listings/:id` | Listing detail |
| `GET /my-listings` | Current user's own listings (any status) |
| `POST /listings` | Create a listing (starts `pending`) |
| `PATCH /listings/:id` | Edit a listing (re-enters `pending` moderation) |
| `DELETE /listings/:id` | Soft-delete (owner-only) |
| `POST /listings/:id/upload` | Upload the deliverable file to R2 (raw binary, 25MB cap; blocked once `sales_count > 0`) |
| `POST /listings/:id/purchase` | Atomic 3-party purchase (buyer debit / seller 90% credit / platform 10% fee) |
| `GET /purchases` | Current user's purchase history |
| `GET /sales` | Current user's sales history |
| `GET /download/:purchaseId` | Purchase-gated file stream (buyer or seller only) |
| `GET /admin/pending` | Admin-only: listings awaiting moderation |
| `POST /admin/listings/:id/approve` | Admin-only: approve a pending listing |
| `POST /admin/listings/:id/reject` | Admin-only: reject with a reason |

### Frontend
New `page-marketplace` in the app shell with Browse / My Listings / My Purchases / Review Queue tabs, category chip scroll, search box, and create/edit + detail/purchase modal overlays (`public/static/js/app.js` → `Marketplace` module, `public/static/js/api-client.js` → marketplace API surface, `public/static/css/app.css` → `.mkt-*` classes).

### Status
✅ Backend, frontend, and migration (`migrations/0005_marketplace.sql`) built and verified end-to-end locally via an extensive curl test suite (listing CRUD, upload cap enforcement, admin approve/reject, exact 90/10 purchase split, double-purchase/insufficient-points/self-purchase rejection with zero side effects, purchase-gated download 200/403, category filter, search, edit-triggers-re-moderation, soft-delete). Code committed (`4d4ae10`) and pushed to `origin/main`. ⚠️ **Production readiness for this feature specifically is unconfirmed** — see the "Marketplace production setup" note under Deployment below.

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
- **Status**: ✅ **OPay Wallet Demo fully live in production** (2026-08-19) — code pushed to `main` (`e52bc6b..19f1c54`), auto-deployed via the GitHub → Cloudflare Pages git integration, and the `opay_demo_wallets`/`opay_demo_transactions` tables were created directly in the production D1 console. Verified against `https://chaposhub.pages.dev` with real registered accounts: wallet auto-provisioning, Send Money (debits wallet + 6 points), Bank Transfer (debits wallet + 10 points), transaction history, insufficient-wallet-balance rejection (402, confirmed no side effects), and auth-gating (401 when unauthenticated) all match the local test suite exactly.
- **⚠️ One remaining optional item**: `PAYSTACK_SECRET_KEY` is still not set as a Cloudflare Secret in production, so `GET /api/banks` returns `{"success":false,"message":"Bank service is not configured."}` — the To Bank view's bank dropdown will show "Unable to load banks" until this is added. **Everything else works fully without it**: dashboard, Send Money, Bank Transfer (once an account name is entered manually), and History are all unaffected. Add the secret via Workers & Pages → chaposhub → Settings → Variables and Secrets to enable the real bank list + account-name lookup.
- The dormant `opay_receipts` migration (`0003_opay_service.sql`, legacy receipt-generator backend, kept intentionally per product decision — see above) has not been applied to production either, but since that backend is unreachable from the UI this has no user-facing effect.
- **Tech Stack**: Hono + TypeScript + Vite + Wrangler, vanilla JS frontend, Cloudflare D1 + R2
- **Local dev**: `npm run build && pm2 start ecosystem.config.cjs` (serves on port 3000 via `wrangler pages dev --d1=chaposhub-production --r2=MARKETPLACE_BUCKET --local`)
- **Marketplace production setup (⚠️ not independently re-verified)**: the user was asked to (1) create a plain **R2 Object Storage** bucket named `chaposhub-marketplace` (note: a screenshot the user shared showed Cloudflare's separate "R2 Data Catalog" feature page instead — a different product surface from the plain object-storage bucket the `wrangler.jsonc` `r2_buckets` binding actually needs; this distinction was flagged but not confirmed resolved), (2) apply `migrations/0005_marketplace.sql` to the production D1 database via the console, and (3) grant their own account `role='admin'` via a D1 console `UPDATE`. The user replied "All done" but gave no per-step confirmation. **A full production smoke test of the marketplace feature (listing → upload → approve → browse → purchase → download against `https://chaposhub.pages.dev`) has not yet been performed** and should be done before relying on this feature in production.
- **Last Updated**: 2026-08-20 — Added the **Scripts Marketplace** feature (see dedicated section above) and merged a user-supplied landing-page redesign: switched the entire site's accent color theme from indigo to green, added real platform-brand SVG icons and a polished gradient logo mark to the landing page, and added an aspirational growth-stats bar (explicitly flagged as placeholder, not audited figures) per user approval. Previous entry: 2026-08-19 — Replaced the OPay receipt-generator UI with a full **OPay Wallet Demo** (`/services/opay`): dashboard, Send Money, To Bank, and a fully-featured History view (summary totals, filter chips, search, date grouping, tap-to-view receipt modal), gated behind Chapo'sHub login, each user with their own private simulated wallet + transaction history, every send/transfer costing real points via an atomic two-ledger deduction with automatic refund-on-failure. The existing Paystack real bank-list/resolve endpoints were reused unchanged for the To Bank flow. The legacy receipt-generator backend was intentionally kept dormant (not deleted) for potential future reuse.
