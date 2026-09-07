// Ported from src/routes/opay.ts (Hono/D1 version) to Express/better-sqlite3.
// D1 `env.DB.batch([...])` becomes a `db.transaction(() => {...})()` call.
// D1's conditional-UPDATE + `.run().meta.changes` becomes better-sqlite3's
// `.run().changes` — same atomic race-safe semantics.
import { Router } from 'express'
import db from '../db/index.js'
import { generateId, generateShortId } from '../lib/crypto.js'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'
import { POINTS_COSTS, type OpayReceiptRow } from '../lib/types.js'

const router = Router()

const COST = POINTS_COSTS.opay_receipt
const VALID_STATUSES = ['Successful', 'Pending', 'Failed']
const VALID_TEMPLATES = ['classic', 'modern', 'minimal']
// E.164-ish loose phone check: digits, spaces, +, -, () — 7-20 chars
const PHONE_RE = /^[+0-9\s()-]{7,20}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function serialize(r: OpayReceiptRow) {
  return {
    id: r.id,
    senderName: r.sender_name,
    senderPhone: r.sender_phone,
    recipientName: r.recipient_name,
    recipientPhone: r.recipient_phone,
    amount: r.amount,
    reference: r.reference,
    transactionDate: r.transaction_date,
    transactionTime: r.transaction_time,
    note: r.note,
    status: r.status,
    template: r.template,
    pointsCharged: r.points_charged,
    createdAt: r.created_at
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/services/opay/generate
//
// Credit protection: the balance check + deduction happens via a single
// CONDITIONAL UPDATE (`WHERE id = ? AND points >= ?`), not a naive
// read-then-write, so two concurrent requests from the same account cannot
// both pass a stale balance check (the classic "check-then-act" race). Only
// after the deduction is confirmed to have actually applied do we insert the
// receipt row; if that insert fails for any reason (e.g. a colliding
// reference), the deducted points are refunded immediately. The browser
// never gets a say in whether/how many points are spent — it only ever
// sees the final result.
// ─────────────────────────────────────────────────────────────────────────
router.post('/generate', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const {
    senderName, senderPhone, recipientName, recipientPhone,
    amount, reference, transactionDate, transactionTime,
    note, status, template
  } = body

  // --- Validation (all server-side; never trust client formatting) ---
  const errors: string[] = []
  if (!senderName || typeof senderName !== 'string' || !senderName.trim() || senderName.length > 60) errors.push('senderName is required (max 60 chars)')
  if (!senderPhone || typeof senderPhone !== 'string' || !PHONE_RE.test(senderPhone)) errors.push('senderPhone is invalid')
  if (!recipientName || typeof recipientName !== 'string' || !recipientName.trim() || recipientName.length > 60) errors.push('recipientName is required (max 60 chars)')
  if (!recipientPhone || typeof recipientPhone !== 'string' || !PHONE_RE.test(recipientPhone)) errors.push('recipientPhone is invalid')
  const amt = typeof amount === 'number' ? amount : parseFloat(amount)
  if (!Number.isFinite(amt) || amt <= 0 || amt > 100_000_000) errors.push('amount must be a positive number')
  if (reference !== undefined && reference !== null && reference !== '' && (typeof reference !== 'string' || reference.length > 40)) errors.push('reference must be a string (max 40 chars)')
  const txDate = transactionDate && DATE_RE.test(transactionDate) ? transactionDate : null
  if (!txDate) errors.push('transactionDate must be in YYYY-MM-DD format')
  const txTime = transactionTime && TIME_RE.test(transactionTime) ? transactionTime : null
  if (!txTime) errors.push('transactionTime must be in HH:MM format')
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 200)) errors.push('note must be a string (max 200 chars)')
  const finalStatus = status && VALID_STATUSES.includes(status) ? status : 'Successful'
  const finalTemplate = template && VALID_TEMPLATES.includes(template) ? template : 'classic'

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors.join('; ') })
  }

  // --- Check user exists (distinguish 404 from insufficient-balance 402) ---
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined
  if (!user) return res.status(404).json({ error: 'User not found' })

  // --- Atomic, race-safe deduction: only succeeds if balance is still sufficient ---
  const deduction = db.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).run(COST, userId, COST)

  if (deduction.changes === 0) {
    return res.status(402).json({ error: 'Insufficient points', points: user.points, required: COST })
  }

  // --- Deduction confirmed applied. Now create the receipt + audit trail. ---
  const receiptId = generateId('opr')
  const finalReference = reference && String(reference).trim()
    ? String(reference).trim()
    : 'OPAY' + generateShortId(10).toUpperCase()
  const now = new Date().toISOString()

  try {
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO opay_receipts (id, user_id, sender_name, sender_phone, recipient_name, recipient_phone, amount, reference, transaction_date, transaction_time, note, status, template, points_charged, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        receiptId, userId, senderName.trim(), senderPhone.trim(), recipientName.trim(), recipientPhone.trim(),
        amt, finalReference, txDate, txTime, (note || '').trim() || null, finalStatus, finalTemplate, COST, now, now
      )
      db.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, 'opay_receipt', ?)`
      ).run(generateId('ptx'), userId, -COST, userId, `OPay receipt #${finalReference}`, now)
      db.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'opay', 'OPay Receipt', ?, 'fa-solid fa-wallet', 'rgba(29,198,119,0.15)', ?)`
      ).run(generateId('act'), userId, `#${finalReference} · ₦${amt.toLocaleString()}`, now)
    })
    tx()
  } catch (e: any) {
    // Refund immediately — the user must never be charged for a receipt
    // that wasn't actually created (e.g. duplicate reference collision).
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(COST, userId)
    if (String(e.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Reference already exists, please use a different reference' })
    }
    return res.status(500).json({ error: 'Failed to generate receipt, points refunded' })
  }

  const finalUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined

  return res.status(201).json({
    id: receiptId,
    reference: finalReference,
    pointsCharged: COST,
    remainingPoints: finalUser?.points ?? null,
    message: 'OPay receipt generated successfully'
  })
})

// GET /api/services/opay/history — the authenticated user's own receipts
router.get('/history', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    'SELECT * FROM opay_receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(userId) as OpayReceiptRow[]

  return res.json(results.map(serialize))
})

// GET /api/services/opay/receipt/:id — owner-only (contains phone numbers)
router.get('/receipt/:id', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id
  const receipt = db.prepare('SELECT * FROM opay_receipts WHERE id = ?').get(id) as OpayReceiptRow | undefined

  if (!receipt) return res.status(404).json({ error: 'Receipt not found' })
  if (receipt.user_id !== userId) return res.status(403).json({ error: 'Not authorized' })

  return res.json(serialize(receipt))
})

export default router
