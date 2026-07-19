-- Chapo'sHub D1 schema
-- Users
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

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  store_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  items TEXT NOT NULL, -- JSON array of {description, quantity, price}
  tax_rate REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  short_url TEXT UNIQUE,
  recipient_email TEXT,
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON receipts(order_id);

-- Points transactions
CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- purchase | deduction | bonus | refund | referral
  amount INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  description TEXT NOT NULL,
  action TEXT, -- download | print | email | link | ai | support | purchase | referral
  receipt_id TEXT REFERENCES receipts(id),
  payment_method TEXT, -- stripe | crypto | p2p | bank
  payment_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_points_tx_user_created ON points_transactions(user_id, created_at DESC);

-- Activities (activity feed / history)
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- receipt | email | support | link | ai | purchase | login | profile_update
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT NOT NULL DEFAULT 'rgba(99,102,241,0.15)',
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
