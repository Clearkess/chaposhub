-- Per-user simulated OPay demo wallet + transaction history.
--
-- Replaces the earlier "shared/anonymous demo wallet" model (as seen in the
-- uploaded OPay Clone UI/UX prototype, which used one hardcoded global
-- wallet-demo-1 record with no auth and no real balance protection).
--
-- Every authenticated Chapo'sHub user gets their OWN private wallet row,
-- auto-provisioned on first access (see getOrCreateWallet() in
-- src/routes/opay-wallet.ts). Sending money or transferring to a bank from
-- this demo wallet costs real Chapo'sHub points (POINTS_COSTS.opay_wallet_send
-- / opay_bank_transfer) AND debits the demo wallet's own balance, both via
-- the same atomic-conditional-UPDATE + refund-on-failure pattern used by
-- opay_receipts (see migrations/0003_opay_service.sql) -- never a naive
-- read-then-write, and the browser never decides whether a transfer is
-- allowed.
--
-- IMPORTANT: this wallet balance is entirely simulated play money. No real
-- OPay account, bank account, or payment rail is touched by these tables.
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
  type TEXT NOT NULL,               -- 'credit' | 'debit'
  category TEXT NOT NULL,           -- 'transfer' (send-money) | 'bank_transfer'
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
