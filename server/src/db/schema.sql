-- Chapo'sHub SQLite schema (Node/Express port of Cloudflare D1 migrations 0001-0005)
-- Ported near-verbatim; D1/SQLite syntax is already compatible with better-sqlite3.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 245,
  country TEXT NOT NULL DEFAULT 'KE',
  role TEXT NOT NULL DEFAULT 'user',
  is_verified INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT REFERENCES users(id),
  receipts_generated INTEGER NOT NULL DEFAULT 0,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  store_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  items TEXT NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  short_url TEXT UNIQUE,
  recipient_email TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON receipts(order_id);

CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  description TEXT NOT NULL,
  action TEXT,
  receipt_id TEXT REFERENCES receipts(id),
  payment_method TEXT,
  payment_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_points_tx_user_created ON points_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT NOT NULL DEFAULT 'rgba(99,102,241,0.15)',
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whop_payments (
  id TEXT PRIMARY KEY,
  whop_payment_id TEXT UNIQUE NOT NULL,
  whop_plan_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  buyer_email TEXT NOT NULL,
  amount_total REAL,
  currency TEXT,
  points_credited INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_whop_payments_email ON whop_payments(buyer_email);

CREATE TABLE IF NOT EXISTS opay_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  transaction_date TEXT NOT NULL,
  transaction_time TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Successful',
  template TEXT NOT NULL DEFAULT 'classic',
  points_charged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_opay_receipts_user_created ON opay_receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opay_receipts_reference ON opay_receipts(reference);

CREATE TABLE IF NOT EXISTS opay_demo_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  balance REAL NOT NULL DEFAULT 245830.50,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opay_demo_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  counterparty_name TEXT,
  counterparty_phone TEXT,
  bank_name TEXT,
  account_number TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  balance_after REAL NOT NULL,
  points_charged INTEGER NOT NULL DEFAULT 0,
  reference TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_opay_demo_txn_user_created ON opay_demo_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opay_demo_txn_reference ON opay_demo_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_opay_demo_wallets_user ON opay_demo_wallets(user_id);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  price_points INTEGER NOT NULL,
  preview_image_url TEXT,
  file_key TEXT,
  file_name TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
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
  price_points INTEGER NOT NULL,
  seller_earned_points INTEGER NOT NULL,
  platform_fee_points INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(listing_id, buyer_id)
);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer ON marketplace_purchases(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_seller ON marketplace_purchases(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_listing ON marketplace_purchases(listing_id);
