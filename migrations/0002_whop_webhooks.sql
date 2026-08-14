-- Whop webhook support: idempotency + audit trail for processed webhook
-- deliveries, and a durable record of credited payments.

-- Every verified webhook delivery we've acted on, keyed by Whop's
-- `webhook-id` header. Whop redelivers the same id on retry, so this table
-- is the primary duplicate-delivery guard (belt-and-suspenders alongside
-- the unique payment_id guard on whop_payments below).
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,             -- Whop's webhook-id (e.g. msg_xxx)
  source TEXT NOT NULL,            -- 'whop'
  event_type TEXT NOT NULL,        -- e.g. payment.succeeded
  status TEXT NOT NULL,            -- 'processed' | 'ignored' | 'error'
  detail TEXT,                     -- short human-readable note (e.g. reason ignored)
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per Whop payment we've credited points for. The UNIQUE constraint
-- on whop_payment_id is the authoritative guard against double-crediting
-- the same payment even if webhook_events is ever bypassed or cleared.
CREATE TABLE IF NOT EXISTS whop_payments (
  id TEXT PRIMARY KEY,
  whop_payment_id TEXT UNIQUE NOT NULL, -- Whop's data.id (pay_xxx)
  whop_plan_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),    -- NULL if no matching Chapo'sHub account was found
  buyer_email TEXT NOT NULL,
  amount_total REAL,
  currency TEXT,
  points_credited INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,             -- 'credited' | 'unmatched_email' | 'unknown_plan'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_whop_payments_email ON whop_payments(buyer_email);
