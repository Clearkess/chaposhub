// Ported from src/routes/opay-wallet.ts (Hono/D1 version) to Express/better-sqlite3.
//
// OPay Wallet-App Demo backend.
//
// Real, per-user, auth-gated endpoints:
//   - GET  /wallet            -> the caller's own wallet (auto-provisioned)
//   - GET  /transactions      -> the caller's own transaction history
//   - POST /send              -> "Send Money" (peer-to-peer demo transfer)
//   - POST /transfer          -> "Transfer To Bank" demo transfer
//
// Every send/transfer action is charged in TWO independent, atomic,
// race-safe ledgers, exactly mirroring the pattern proven in
// server/src/routes/opay.ts (opay_receipt):
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
import { Router } from 'express'
import db from '../db/index.js'
import { generateId, generateShortId } from '../lib/crypto.js'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'
import { POINTS_COSTS, type OpayDemoWalletRow, type OpayDemoTransactionRow } from '../lib/types.js'

const router = Router()

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
function getOrCreateWallet(userId: string): OpayDemoWalletRow {
  const existing = db.prepare('SELECT * FROM opay_demo_wallets WHERE user_id = ?').get(userId) as OpayDemoWalletRow | undefined
  if (existing) return existing

  const id = generateId('odw')
  const now = new Date().toISOString()
  try {
    db.prepare(
      `INSERT INTO opay_demo_wallets (id, user_id, balance, currency, created_at, updated_at)
       VALUES (?, ?, ?, 'NGN', ?, ?)`
    ).run(id, userId, DEFAULT_BALANCE, now, now)
  } catch {
    // Lost a race with a concurrent auto-provision request - fall through to re-read.
  }
  const row = db.prepare('SELECT * FROM opay_demo_wallets WHERE user_id = ?').get(userId) as OpayDemoWalletRow
  return row
}

// GET /api/services/opay/wallet
router.get('/wallet', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const w = getOrCreateWallet(userId)
  return res.json(serializeWallet(w))
})

// GET /api/services/opay/transactions
router.get('/transactions', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const limitParam = parseInt(String(req.query.limit || '100'), 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100
  const results = db.prepare(
    'SELECT * FROM opay_demo_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit) as OpayDemoTransactionRow[]
  return res.json(results.map(serializeTxn))
})

// Shared core: attempts the two-ledger debit + transaction insert, with
// full refund-on-failure at every step. Returns the created row + points
// info, or an { error, status, body } style result the route handler maps
// to an HTTP response.
function performDebit(
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
  getOrCreateWallet(userId)

  // --- Step 1: atomic, race-safe demo-wallet balance debit ---
  const walletDebit = db.prepare(
    'UPDATE opay_demo_wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ? AND balance >= ?'
  ).run(amount, new Date().toISOString(), userId, amount)

  if (walletDebit.changes === 0) {
    const w = db.prepare('SELECT balance FROM opay_demo_wallets WHERE user_id = ?').get(userId) as { balance: number } | undefined
    return { error: 'insufficient_wallet_balance' as const, status: 402, body: { error: 'Insufficient demo wallet balance', balance: w?.balance ?? 0, required: amount } }
  }

  // --- Step 2: atomic, race-safe Chapo'sHub points debit ---
  const pointsDebit = db.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).run(cost, userId, cost)

  if (pointsDebit.changes === 0) {
    // Refund the wallet debit immediately - the demo balance must never
    // drop for a transfer that didn't actually happen.
    db.prepare('UPDATE opay_demo_wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?')
      .run(amount, new Date().toISOString(), userId)
    const u = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined
    return { error: 'insufficient_points' as const, status: 402, body: { error: 'Insufficient points', points: u?.points ?? 0, required: cost } }
  }

  // --- Both debits confirmed applied. Record the transaction. ---
  const txnId = generateId('odt')
  const reference = 'OPWA' + generateShortId(10).toUpperCase()
  const now = new Date().toISOString()
  const finalWallet = db.prepare('SELECT balance FROM opay_demo_wallets WHERE user_id = ?').get(userId) as { balance: number } | undefined
  const balanceAfter = finalWallet?.balance ?? 0

  try {
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO opay_demo_transactions
           (id, user_id, type, category, amount, counterparty_name, counterparty_phone, bank_name, account_number, note, status, balance_after, points_charged, reference, created_at)
         VALUES (?, ?, 'debit', ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)`
      ).run(
        txnId, userId, category, amount,
        counterpartyName ?? null, counterpartyPhone ?? null, bankName ?? null, accountNumber ?? null,
        note ?? null, balanceAfter, cost, reference, now
      )
      db.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, ?, ?)`
      ).run(generateId('ptx'), userId, -cost, userId, `OPay demo ${category === 'bank_transfer' ? 'bank transfer' : 'send'} #${reference}`, category === 'bank_transfer' ? 'opay_bank_transfer' : 'opay_wallet_send', now)
      db.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'opay_wallet', ?, ?, '🟢', 'rgba(29,198,119,0.15)', ?)`
      ).run(generateId('act'), userId, category === 'bank_transfer' ? 'OPay Bank Transfer' : 'OPay Send Money', `#${reference} · ₦${amount.toLocaleString()}`, now)
    })
    tx()
  } catch (e: any) {
    // Refund BOTH ledgers immediately - the user must never be charged
    // (in points or demo balance) for a transfer that wasn't recorded.
    db.prepare('UPDATE opay_demo_wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?')
      .run(amount, new Date().toISOString(), userId)
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(cost, userId)
    return { error: 'insert_failed' as const, status: 500, body: { error: 'Transfer failed, all charges refunded' } }
  }

  const finalUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined
  const finalTxn = db.prepare('SELECT * FROM opay_demo_transactions WHERE id = ?').get(txnId) as OpayDemoTransactionRow

  return {
    error: null,
    body: {
      transaction: serializeTxn(finalTxn),
      pointsCharged: cost,
      remainingPoints: finalUser?.points ?? null,
      walletBalance: balanceAfter
    }
  }
}

// POST /api/services/opay/send — Send Money (peer-to-peer demo transfer)
router.post('/send', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const { recipientName, recipientPhone, amount, note } = body

  const errors: string[] = []
  if (!recipientName || typeof recipientName !== 'string' || !recipientName.trim() || recipientName.length > 60) errors.push('recipientName is required (max 60 chars)')
  if (!recipientPhone || typeof recipientPhone !== 'string' || !PHONE_RE.test(recipientPhone)) errors.push('recipientPhone is invalid')
  const amt = typeof amount === 'number' ? amount : parseFloat(amount)
  if (!Number.isFinite(amt) || amt <= 0 || amt > 100_000_000) errors.push('amount must be a positive number')
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 200)) errors.push('note must be a string (max 200 chars)')
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors.join('; ') })

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined
  if (!user) return res.status(404).json({ error: 'User not found' })

  const result = performDebit(userId, {
    cost: SEND_COST,
    amount: amt,
    category: 'transfer',
    counterpartyName: recipientName.trim(),
    counterpartyPhone: recipientPhone.trim(),
    note: (note || '').trim() || null
  })

  if (result.error) return res.status(result.status).json(result.body)
  return res.status(201).json(result.body)
})

// POST /api/services/opay/transfer — Transfer To Bank (demo transfer)
router.post('/transfer', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const { bankName, accountNumber, accountName, amount, note } = body

  const errors: string[] = []
  if (!bankName || typeof bankName !== 'string' || !bankName.trim() || bankName.length > 80) errors.push('bankName is required')
  if (!accountNumber || typeof accountNumber !== 'string' || !ACCOUNT_NUMBER_RE.test(accountNumber)) errors.push('accountNumber must be exactly 10 digits')
  if (!accountName || typeof accountName !== 'string' || !accountName.trim() || accountName.length > 80) errors.push('accountName is required (verify the account first)')
  const amt = typeof amount === 'number' ? amount : parseFloat(amount)
  if (!Number.isFinite(amt) || amt <= 0 || amt > 100_000_000) errors.push('amount must be a positive number')
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 200)) errors.push('note must be a string (max 200 chars)')
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors.join('; ') })

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined
  if (!user) return res.status(404).json({ error: 'User not found' })

  const result = performDebit(userId, {
    cost: TRANSFER_COST,
    amount: amt,
    category: 'bank_transfer',
    counterpartyName: accountName.trim(),
    bankName: bankName.trim(),
    accountNumber: accountNumber.trim(),
    note: (note || '').trim() || null
  })

  if (result.error) return res.status(result.status).json(result.body)
  return res.status(201).json(result.body)
})

export default router
