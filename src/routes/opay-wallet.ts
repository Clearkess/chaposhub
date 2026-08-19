import { Hono } from 'hono'
import { generateId, generateShortId } from '../lib/crypto'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, OpayDemoWalletRow, OpayDemoTransactionRow } from '../lib/types'
import { POINTS_COSTS } from '../lib/types'

// ─────────────────────────────────────────────────────────────────────────
// OPay Wallet-App Demo backend.
//
// This replaces the uploaded prototype's anonymous, unauthenticated,
// globally-shared `wallet-demo-1` / `tables/*` data layer with real,
// per-user, auth-gated Hono/D1 endpoints:
//   - GET  /wallet            -> the caller's own wallet (auto-provisioned)
//   - GET  /transactions      -> the caller's own transaction history
//   - POST /send              -> "Send Money" (peer-to-peer demo transfer)
//   - POST /transfer          -> "Transfer To Bank" demo transfer
//
// Every send/transfer action is charged in TWO independent, atomic,
// race-safe ledgers, exactly mirroring the pattern proven in
// src/routes/opay.ts (opay_receipt):
//   1. The user's own simulated demo wallet balance (opay_demo_wallets) -
//      "can this demo wallet actually afford this transfer?"
//   2. The user's real Chapo'sHub points balance (users.points) -
//      "can the user afford to use this feature at all?"
//
// Both checks use a single CONDITIONAL UPDATE (`WHERE ... AND balance/points
// >= ?`), never a read-then-write, so concurrent requests cannot both pass a
// stale check. If the wallet-debit succeeds but the points-debit then fails
// (insufficient points), the wallet debit is refunded immediately. If both
// debits succeed but the transaction-row insert then fails for any reason
// (e.g. a colliding reference), BOTH are refunded immediately. The browser
// never gets a say in whether/how much is deducted from either ledger - it
// only ever reflects the server's final result.
//
// Nothing here touches a real OPay account, bank account, or payment rail.
// The wallet balance is simulated play money for demo/UX purposes only.
// ─────────────────────────────────────────────────────────────────────────

const wallet = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

const SEND_COST = POINTS_COSTS.opay_wallet_send
const TRANSFER_COST = POINTS_COSTS.opay_bank_transfer
const DEFAULT_BALANCE = 245830.5
const PHONE_RE = /^[+0-9\s()-]{4,20}$/
const ACCOUNT_NUMBER_RE = /^\d{10}$/

function serializeWallet(w: OpayDemoWalletRow) {
  return { id: w.id, balance: w.balance, currency: w.currency, updatedAt: w.updated_at }
}

function serializeTxn(t: OpayDemoTransactionRow) {
  return {
    id: t.id,
    type: t.type,
    category: t.category,
    amount: t.amount,
    counterpartyName: t.counterparty_name,
    counterpartyPhone: t.counterparty_phone,
    bankName: t.bank_name,
    accountNumber: t.account_number,
    note: t.note,
    status: t.status,
    balanceAfter: t.balance_after,
    pointsCharged: t.points_charged,
    reference: t.reference,
    createdAt: t.created_at
  }
}

// Auto-provision: create the caller's wallet on first access with the
// default demo starting balance, without clobbering an existing one.
async function getOrCreateWallet(db: D1Database, userId: string): Promise<OpayDemoWalletRow> {
  const existing = await db.prepare('SELECT * FROM opay_demo_wallets WHERE user_id = ?')
    .bind(userId).first<OpayDemoWalletRow>()
  if (existing) return existing

  const id = generateId('odw')
  const now = new Date().toISOString()
  try {
    await db.prepare(
      `INSERT INTO opay_demo_wallets (id, user_id, balance, currency, created_at, updated_at)
       VALUES (?, ?, ?, 'NGN', ?, ?)`
    ).bind(id, userId, DEFAULT_BALANCE, now, now).run()
  } catch {
    // Lost a race with a concurrent auto-provision request - fall through to re-read.
  }
  const row = await db.prepare('SELECT * FROM opay_demo_wallets WHERE user_id = ?')
    .bind(userId).first<OpayDemoWalletRow>()
  return row as OpayDemoWalletRow
}

// GET /api/services/opay/wallet
wallet.get('/wallet', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const w = await getOrCreateWallet(c.env.DB, userId)
  return c.json(serializeWallet(w))
})

// GET /api/services/opay/transactions
wallet.get('/transactions', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const limitParam = parseInt(c.req.query('limit') || '100', 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM opay_demo_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(userId, limit).all<OpayDemoTransactionRow>()
  return c.json(results.map(serializeTxn))
})

// Shared core: attempts the two-ledger debit + transaction insert, with
// full refund-on-failure at every step. Returns the created row + points
// info, or throws a { status, body } style error the route handler maps
// to an HTTP response.
async function performDebit(
  db: D1Database,
  userId: string,
  opts: {
    cost: number
    amount: number
    category: 'transfer' | 'bank_transfer'
    counterpartyName?: string | null
    counterpartyPhone?: string | null
    bankName?: string | null
    accountNumber?: string | null
    note?: string | null
  }
) {
  const { cost, amount, category, counterpartyName, counterpartyPhone, bankName, accountNumber, note } = opts

  // Ensure wallet exists first (auto-provision) so the conditional UPDATE
  // below always targets a real row.
  await getOrCreateWallet(db, userId)

  // --- Step 1: atomic, race-safe demo-wallet balance debit ---
  const walletDebit = await db.prepare(
    'UPDATE opay_demo_wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ? AND balance >= ?'
  ).bind(amount, new Date().toISOString(), userId, amount).run()

  if (!walletDebit.meta || walletDebit.meta.changes === 0) {
    const w = await db.prepare('SELECT balance FROM opay_demo_wallets WHERE user_id = ?').bind(userId).first<{ balance: number }>()
    return { error: 'insufficient_wallet_balance' as const, status: 402, body: { error: 'Insufficient demo wallet balance', balance: w?.balance ?? 0, required: amount } }
  }

  // --- Step 2: atomic, race-safe Chapo'sHub points debit ---
  const pointsDebit = await db.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).bind(cost, userId, cost).run()

  if (!pointsDebit.meta || pointsDebit.meta.changes === 0) {
    // Refund the wallet debit immediately - the demo balance must never
    // drop for a transfer that didn't actually happen.
    await db.prepare('UPDATE opay_demo_wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?')
      .bind(amount, new Date().toISOString(), userId).run()
    const u = await db.prepare('SELECT points FROM users WHERE id = ?').bind(userId).first<{ points: number }>()
    return { error: 'insufficient_points' as const, status: 402, body: { error: 'Insufficient points', points: u?.points ?? 0, required: cost } }
  }

  // --- Both debits confirmed applied. Record the transaction. ---
  const txnId = generateId('odt')
  const reference = 'OPWA' + generateShortId(10).toUpperCase()
  const now = new Date().toISOString()
  const finalWallet = await db.prepare('SELECT balance FROM opay_demo_wallets WHERE user_id = ?').bind(userId).first<{ balance: number }>()
  const balanceAfter = finalWallet?.balance ?? 0

  try {
    await db.batch([
      db.prepare(
        `INSERT INTO opay_demo_transactions
           (id, user_id, type, category, amount, counterparty_name, counterparty_phone, bank_name, account_number, note, status, balance_after, points_charged, reference, created_at)
         VALUES (?, ?, 'debit', ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)`
      ).bind(
        txnId, userId, category, amount,
        counterpartyName ?? null, counterpartyPhone ?? null, bankName ?? null, accountNumber ?? null,
        note ?? null, balanceAfter, cost, reference, now
      ),
      db.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, ?, ?)`
      ).bind(generateId('ptx'), userId, -cost, userId, `OPay demo ${category === 'bank_transfer' ? 'bank transfer' : 'send'} #${reference}`, category === 'bank_transfer' ? 'opay_bank_transfer' : 'opay_wallet_send', now),
      db.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'opay_wallet', ?, ?, '🟢', 'rgba(29,198,119,0.15)', ?)`
      ).bind(generateId('act'), userId, category === 'bank_transfer' ? 'OPay Bank Transfer' : 'OPay Send Money', `#${reference} · ₦${amount.toLocaleString()}`, now)
    ])
  } catch (e: any) {
    // Refund BOTH ledgers immediately - the user must never be charged
    // (in points or demo balance) for a transfer that wasn't recorded.
    await db.prepare('UPDATE opay_demo_wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?')
      .bind(amount, new Date().toISOString(), userId).run()
    await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(cost, userId).run()
    return { error: 'insert_failed' as const, status: 500, body: { error: 'Transfer failed, all charges refunded' } }
  }

  const finalUser = await db.prepare('SELECT points FROM users WHERE id = ?').bind(userId).first<{ points: number }>()
  const finalTxn = await db.prepare('SELECT * FROM opay_demo_transactions WHERE id = ?').bind(txnId).first<OpayDemoTransactionRow>()

  return {
    error: null as const,
    body: {
      transaction: serializeTxn(finalTxn as OpayDemoTransactionRow),
      pointsCharged: cost,
      remainingPoints: finalUser?.points ?? null,
      walletBalance: balanceAfter
    }
  }
}

// POST /api/services/opay/send — Send Money (peer-to-peer demo transfer)
wallet.post('/send', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { recipientName, recipientPhone, amount, note } = body

  const errors: string[] = []
  if (!recipientName || typeof recipientName !== 'string' || !recipientName.trim() || recipientName.length > 60) errors.push('recipientName is required (max 60 chars)')
  if (!recipientPhone || typeof recipientPhone !== 'string' || !PHONE_RE.test(recipientPhone)) errors.push('recipientPhone is invalid')
  const amt = typeof amount === 'number' ? amount : parseFloat(amount)
  if (!Number.isFinite(amt) || amt <= 0 || amt > 100_000_000) errors.push('amount must be a positive number')
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 200)) errors.push('note must be a string (max 200 chars)')
  if (errors.length > 0) return c.json({ error: 'Validation failed', details: errors.join('; ') }, 400)

  const user = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(userId).first<{ points: number }>()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const result = await performDebit(c.env.DB, userId, {
    cost: SEND_COST,
    amount: amt,
    category: 'transfer',
    counterpartyName: recipientName.trim(),
    counterpartyPhone: recipientPhone.trim(),
    note: (note || '').trim() || null
  })

  if (result.error) return c.json(result.body, result.status as 402 | 500)
  return c.json(result.body, 201)
})

// POST /api/services/opay/transfer — Transfer To Bank (demo transfer)
wallet.post('/transfer', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { bankName, bankCode, accountNumber, accountName, amount, note } = body

  const errors: string[] = []
  if (!bankName || typeof bankName !== 'string' || !bankName.trim() || bankName.length > 80) errors.push('bankName is required')
  if (!accountNumber || typeof accountNumber !== 'string' || !ACCOUNT_NUMBER_RE.test(accountNumber)) errors.push('accountNumber must be exactly 10 digits')
  if (!accountName || typeof accountName !== 'string' || !accountName.trim() || accountName.length > 80) errors.push('accountName is required (verify the account first)')
  const amt = typeof amount === 'number' ? amount : parseFloat(amount)
  if (!Number.isFinite(amt) || amt <= 0 || amt > 100_000_000) errors.push('amount must be a positive number')
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 200)) errors.push('note must be a string (max 200 chars)')
  if (errors.length > 0) return c.json({ error: 'Validation failed', details: errors.join('; ') }, 400)

  const user = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(userId).first<{ points: number }>()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const result = await performDebit(c.env.DB, userId, {
    cost: TRANSFER_COST,
    amount: amt,
    category: 'bank_transfer',
    counterpartyName: accountName.trim(),
    bankName: bankName.trim(),
    accountNumber: accountNumber.trim(),
    note: (note || '').trim() || null
  })

  if (result.error) return c.json(result.body, result.status as 402 | 500)
  return c.json(result.body, 201)
})

export default wallet
