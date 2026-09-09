// Ported from src/routes/receipts.ts (Hono/D1 version) to Express/better-sqlite3.
import { Router } from 'express'
import db from '../db/index.js'
import { generateId, generateShortId } from '../lib/crypto.js'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'
import { PLATFORMS, type ReceiptRow, type ReceiptItem } from '../lib/types.js'

const router = Router()

function calcTotals(items: ReceiptItem[], taxRate: number) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const tax = subtotal * (taxRate / 100)
  return { subtotal, tax, total: subtotal + tax }
}

function serializeReceipt(r: ReceiptRow) {
  return {
    id: r.id,
    userId: r.user_id,
    storeName: r.store_name,
    platform: r.platform,
    orderId: r.order_id,
    items: JSON.parse(r.items),
    taxRate: r.tax_rate,
    currency: r.currency,
    subtotal: r.subtotal,
    tax: r.tax,
    total: r.total,
    shortUrl: r.short_url,
    recipientEmail: r.recipient_email,
    createdAt: r.created_at
  }
}

// Create receipt
router.post('/', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const { storeName, platform, orderId, items, taxRate, currency, recipientEmail } = body

  if (!storeName || typeof storeName !== 'string' || storeName.trim().length === 0 || storeName.length > 50) {
    return res.status(400).json({ error: 'Validation failed', details: 'storeName is required (max 50 chars)' })
  }
  if (!platform || !(PLATFORMS as readonly string[]).includes(platform)) {
    return res.status(400).json({ error: 'Validation failed', details: 'Invalid platform' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Validation failed', details: 'At least one item required' })
  }
  for (const it of items) {
    if (!it.description || typeof it.quantity !== 'number' || typeof it.price !== 'number') {
      return res.status(400).json({ error: 'Validation failed', details: 'Invalid item format' })
    }
  }
  const tRate = typeof taxRate === 'number' ? taxRate : parseFloat(taxRate) || 0
  if (tRate < 0 || tRate > 100) {
    return res.status(400).json({ error: 'Validation failed', details: 'taxRate must be 0-100' })
  }
  if (!currency || String(currency).length > 3) {
    return res.status(400).json({ error: 'Validation failed', details: 'Invalid currency' })
  }

  const receiptId = generateId('rcpt')
  const finalOrderId = orderId && String(orderId).trim() ? String(orderId).trim() : generateShortId(10).toUpperCase()
  const { subtotal, tax, total } = calcTotals(items, tRate)
  const shortUrl = `chaposhub.link/r/${receiptId.slice(5, 13)}`
  const now = new Date().toISOString()

  try {
    db.prepare(
      `INSERT INTO receipts (id, user_id, store_name, platform, order_id, items, tax_rate, currency, subtotal, tax, total, short_url, recipient_email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      receiptId, userId, storeName.trim(), platform, finalOrderId,
      JSON.stringify(items), tRate, currency, subtotal, tax, total,
      shortUrl, recipientEmail || null, now, now
    )
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Order ID already exists' })
    }
    throw e
  }

  db.prepare('UPDATE users SET receipts_generated = receipts_generated + 1 WHERE id = ?').run(userId)

  db.prepare(
    `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
     VALUES (?, ?, 'receipt', ?, ?, 'fa-solid fa-receipt', 'rgba(249,115,22,0.15)', ?)`
  ).run(generateId('act'), userId, `${storeName} Receipt`, `#${finalOrderId} · ${currency}${total.toFixed(2)}`, now)

  return res.status(201).json({
    id: receiptId,
    orderId: finalOrderId,
    shortUrl,
    total,
    message: 'Receipt created successfully'
  })
})

// List user's receipts
router.get('/', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    'SELECT * FROM receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(userId) as ReceiptRow[]

  return res.json(results.map(serializeReceipt))
})

// Get receipt by ID (public - for shared links)
router.get('/:id', async (req, res) => {
  const id = req.params.id
  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as ReceiptRow | undefined

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' })
  }
  return res.json(serializeReceipt(receipt))
})

// Delete receipt
router.delete('/:id', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id

  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as ReceiptRow | undefined

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' })
  }
  if (receipt.user_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  db.prepare('DELETE FROM receipts WHERE id = ?').run(id)
  return res.json({ message: 'Receipt deleted' })
})

export default router
