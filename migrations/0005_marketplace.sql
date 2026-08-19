-- Scripts / Website Templates Marketplace.
--
-- Lets any Chapo'sHub user list a ready-made, legitimate website template for
-- sale, priced in points. Other users buy it with their existing points
-- balance; the seller receives 90% of the listed price in points (a 10%
-- platform fee), credited only after a successful purchase. The buyer then
-- gets a private, purchase-gated download link to the seller-uploaded file
-- (stored in R2, streamed through an authenticated API route — never a
-- public URL) so a listing can't be downloaded by someone who hasn't paid.
--
-- Moderation: every new listing starts life as 'pending' and is invisible to
-- the public marketplace browse/search until an admin (role='admin' on the
-- users table) approves it. This exists specifically to keep a
-- template-upload feature from being used to smuggle in malware or phishing
-- kits disguised as "website templates" — the same ethical bar already
-- applied elsewhere in this app (see the OPay wallet's simulated-only design
-- and the explicit refusal to build a "Login Page Builder" clone, README).
--
-- Purchases follow the same atomic-conditional-UPDATE + refund-on-failure
-- pattern used throughout this app (opay_receipts, opay_demo_wallets):
--   1. Buyer's points debited via `UPDATE users SET points = points - ?
--      WHERE id = ? AND points >= ?` — never a stale read-then-write.
--   2. Seller's points credited (listed_price - platform fee) only after the
--      buyer debit succeeds.
--   3. If the purchase-row insert then fails, both the buyer debit and the
--      seller credit are refunded/reversed immediately.
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',      -- 'business' | 'portfolio' | 'ecommerce' | 'landing' | 'saas' | 'blog' | 'other'
  price_points INTEGER NOT NULL,
  preview_image_url TEXT,                      -- external image URL (no upload pipeline for previews)
  file_key TEXT,                                -- R2 object key for the actual .zip template file
  file_name TEXT,                               -- original filename, shown to buyers after purchase
  file_size INTEGER,                            -- bytes, shown in the listing card
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending' | 'approved' | 'rejected'
  rejection_reason TEXT,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);

CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  price_points INTEGER NOT NULL,       -- what the buyer paid
  seller_earned_points INTEGER NOT NULL, -- price_points minus the platform fee
  platform_fee_points INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(listing_id, buyer_id)         -- a buyer can't be charged twice for the same listing
);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer ON marketplace_purchases(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_seller ON marketplace_purchases(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_listing ON marketplace_purchases(listing_id);
