import { Hono } from 'hono'
import { generateId, generateShortId } from '../lib/crypto'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, OpayReceiptRow } from '../lib/types'
import { POINTS_COSTS } from '../lib/types'

const opay = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

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
opay.post('/generate', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
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
    return c.json({ error: 'Validation failed', details: errors.join('; ') }, 400)
  }

  // --- Check user exists (distinguish 404 from insufficient-balance 402) ---
  const user = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?')
    .bind(userId).first<{ points: number }>()
  if (!user) return c.json({ error: 'User not found' }, 404)

  // --- Atomic, race-safe deduction: only succeeds if balance is still sufficient ---
  const deduction = await c.env.DB.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).bind(COST, userId, COST).run()

  if (!deduction.meta || deduction.meta.changes === 0) {
    return c.json({ error: 'Insufficient points', points: user.points, required: COST }, 402)
  }

  // --- Deduction confirmed applied. Now create the receipt + audit trail. ---
  const receiptId = generateId('opr')
  const finalReference = reference && String(reference).trim()
    ? String(reference).trim()
    : 'OPAY' + generateShortId(10).toUpperCase()
  const now = new Date().toISOString()

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO opay_receipts (id, user_id, sender_name, sender_phone, recipient_name, recipient_phone, amount, reference, transaction_date, transaction_time, note, status, template, points_charged, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        receiptId, userId, senderName.trim(), senderPhone.trim(), recipientName.trim(), recipientPhone.trim(),
        amt, finalReference, txDate, txTime, (note || '').trim() || null, finalStatus, finalTemplate, COST, now, now
      ),
      c.env.DB.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, 'opay_receipt', ?)`
      ).bind(generateId('ptx'), userId, -COST, userId, `OPay receipt #${finalReference}`, now),
      c.env.DB.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'opay', 'OPay Receipt', ?, '🟢', 'rgba(29,198,119,0.15)', ?)`
      ).bind(generateId('act'), userId, `#${finalReference} · ₦${amt.toLocaleString()}`, now)
    ])
  } catch (e: any) {
    // Refund immediately — the user must never be charged for a receipt
    // that wasn't actually created (e.g. duplicate reference collision).
    await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(COST, userId).run()
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ error: 'Reference already exists, please use a different reference' }, 409)
    }
    return c.json({ error: 'Failed to generate receipt, points refunded' }, 500)
  }

  const finalUser = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?')
    .bind(userId).first<{ points: number }>()

  return c.json({
    id: receiptId,
    reference: finalReference,
    pointsCharged: COST,
    remainingPoints: finalUser?.points ?? null,
    message: 'OPay receipt generated successfully'
  }, 201)
})

// GET /api/services/opay/history — the authenticated user's own receipts
opay.get('/history', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM opay_receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).bind(userId).all<OpayReceiptRow>()

  return c.json(results.map(serialize))
})

// GET /api/services/opay/receipt/:id — owner-only (contains phone numbers)
opay.get('/receipt/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const receipt = await c.env.DB.prepare('SELECT * FROM opay_receipts WHERE id = ?')
    .bind(id).first<OpayReceiptRow>()

  if (!receipt) return c.json({ error: 'Receipt not found' }, 404)
  if (receipt.user_id !== userId) return c.json({ error: 'Not authorized' }, 403)

  return c.json(serialize(receipt))
})

export default opay
