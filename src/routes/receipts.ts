import { Hono } from 'hono'
import { generateId, generateShortId } from '../lib/crypto'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, ReceiptRow, ReceiptItem } from '../lib/types'
import { PLATFORMS } from '../lib/types'

const receipts = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

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
receipts.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { storeName, platform, orderId, items, taxRate, currency, recipientEmail } = body

  if (!storeName || typeof storeName !== 'string' || storeName.trim().length === 0 || storeName.length > 50) {
    return c.json({ error: 'Validation failed', details: 'storeName is required (max 50 chars)' }, 400)
  }
  if (!platform || !PLATFORMS.includes(platform)) {
    return c.json({ error: 'Validation failed', details: 'Invalid platform' }, 400)
  }
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Validation failed', details: 'At least one item required' }, 400)
  }
  for (const it of items) {
    if (!it.description || typeof it.quantity !== 'number' || typeof it.price !== 'number') {
      return c.json({ error: 'Validation failed', details: 'Invalid item format' }, 400)
    }
  }
  const tRate = typeof taxRate === 'number' ? taxRate : parseFloat(taxRate) || 0
  if (tRate < 0 || tRate > 100) {
    return c.json({ error: 'Validation failed', details: 'taxRate must be 0-100' }, 400)
  }
  if (!currency || String(currency).length > 3) {
    return c.json({ error: 'Validation failed', details: 'Invalid currency' }, 400)
  }

  const receiptId = generateId('rcpt')
  const finalOrderId = orderId && String(orderId).trim() ? String(orderId).trim() : generateShortId(10).toUpperCase()
  const { subtotal, tax, total } = calcTotals(items, tRate)
  const shortUrl = `chaposhub.link/r/${receiptId.slice(5, 13)}`
  const now = new Date().toISOString()

  try {
    await c.env.DB.prepare(
      `INSERT INTO receipts (id, user_id, store_name, platform, order_id, items, tax_rate, currency, subtotal, tax, total, short_url, recipient_email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      receiptId, userId, storeName.trim(), platform, finalOrderId,
      JSON.stringify(items), tRate, currency, subtotal, tax, total,
      shortUrl, recipientEmail || null, now, now
    ).run()
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ error: 'Order ID already exists' }, 409)
    }
    throw e
  }

  await c.env.DB.prepare('UPDATE users SET receipts_generated = receipts_generated + 1 WHERE id = ?')
    .bind(userId).run()

  await c.env.DB.prepare(
    `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
     VALUES (?, ?, 'receipt', ?, ?, '🧾', 'rgba(249,115,22,0.15)', ?)`
  ).bind(generateId('act'), userId, `${storeName} Receipt`, `#${finalOrderId} · ${currency}${total.toFixed(2)}`, now).run()

  return c.json({
    id: receiptId,
    orderId: finalOrderId,
    shortUrl,
    total,
    message: 'Receipt created successfully'
  }, 201)
})

// List user's receipts
receipts.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).bind(userId).all<ReceiptRow>()

  return c.json(results.map(serializeReceipt))
})

// Get receipt by ID (public - for shared links)
receipts.get('/:id', async (c) => {
  const id = c.req.param('id')
  const receipt = await c.env.DB.prepare('SELECT * FROM receipts WHERE id = ?')
    .bind(id).first<ReceiptRow>()

  if (!receipt) {
    return c.json({ error: 'Receipt not found' }, 404)
  }
  return c.json(serializeReceipt(receipt))
})

// Delete receipt
receipts.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const receipt = await c.env.DB.prepare('SELECT * FROM receipts WHERE id = ?')
    .bind(id).first<ReceiptRow>()

  if (!receipt) {
    return c.json({ error: 'Receipt not found' }, 404)
  }
  if (receipt.user_id !== userId) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  await c.env.DB.prepare('DELETE FROM receipts WHERE id = ?').bind(id).run()
  return c.json({ message: 'Receipt deleted' })
})

export default receipts
