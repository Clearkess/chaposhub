-- P2P Points Marketplace + Vendor status.
--
-- Replaces the removed Whop card-checkout flow as the primary way users
-- acquire Chapo'sHub points. Modeled on real peer-to-peer exchanges
-- (Binance P2P etc.): a "vendor" (any user who opts in) lists some of their
-- own points balance for sale at a rate they set in Naira; buyers place an
-- order, pay the vendor OFF-PLATFORM (bank transfer / WhatsApp-coordinated,
-- matching the existing OPay-demo/marketplace ethical pattern of never
-- touching real payment rails ourselves), then the vendor confirms receipt
-- of payment inside the app, which atomically transfers points from the
-- vendor's balance to the buyer's balance. No money ever moves through
-- Chapo'sHub itself — only a coordination ledger + the points transfer.
--
-- Vendor gating: `users.is_vendor` must be 1 before a user can create P2P
-- sell listings. Becoming a vendor requires a WhatsApp number on file
-- (`users.whatsapp`) since buyer/vendor payment coordination happens over
-- WhatsApp — mirrors the "Used for vendor order notifications only" hint in
-- the Settings page design.
ALTER TABLE users ADD COLUMN whatsapp TEXT;
ALTER TABLE users ADD COLUMN is_vendor INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS p2p_listings (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES users(id),
  rate_ngn_per_point REAL NOT NULL,       -- price the vendor wants per point, in NGN
  min_points INTEGER NOT NULL DEFAULT 100,
  max_points INTEGER NOT NULL DEFAULT 5000,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'paused' | 'removed'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_p2p_listings_status ON p2p_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_listings_vendor ON p2p_listings(vendor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS p2p_orders (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES p2p_listings(id),
  vendor_id TEXT NOT NULL REFERENCES users(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  points_amount INTEGER NOT NULL,
  rate_ngn_per_point REAL NOT NULL,
  total_ngn REAL NOT NULL,
  -- 'pending_payment' -> buyer created the order, hasn't paid yet
  -- 'awaiting_confirmation' -> buyer marked as paid, waiting on vendor
  -- 'completed' -> vendor confirmed, points transferred
  -- 'cancelled' -> either party cancelled before completion
  status TEXT NOT NULL DEFAULT 'pending_payment',
  buyer_marked_paid_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_buyer ON p2p_orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_vendor ON p2p_orders(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_listing ON p2p_orders(listing_id);
