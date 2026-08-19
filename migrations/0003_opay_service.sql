-- Dedicated OPay Transaction Receipt service (/services/opay).
--
-- This is intentionally a SEPARATE table from the generic `receipts` table
-- (used by the free-form multi-platform receipt builder). The OPay service
-- is a structured, single-purpose product with its own field set (sender/
-- recipient/reference/status) and its own credit cost, matching how a real
-- "service" would be modeled if/when more dedicated per-platform services
-- are added later (e.g. opay_receipts, kuda_receipts, ...).
--
-- IMPORTANT: these are SIMULATED/sample receipts for legitimate testing,
-- mockups, and demos. They are not verified against any real OPay
-- transaction and must never be represented as proof of an actual payment
-- (see the in-app disclaimer + README).
CREATE TABLE IF NOT EXISTS opay_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  transaction_date TEXT NOT NULL,   -- YYYY-MM-DD, as entered/displayed on the receipt
  transaction_time TEXT NOT NULL,   -- HH:MM, as entered/displayed on the receipt
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Successful',
  template TEXT NOT NULL DEFAULT 'classic',
  points_charged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_opay_receipts_user_created ON opay_receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opay_receipts_reference ON opay_receipts(reference);
