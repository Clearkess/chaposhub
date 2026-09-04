// Ported from src/routes/p2p.ts (Hono/D1 version) to Express/better-sqlite3.
//
// Peer-to-peer (P2P) points marketplace — replaces the removed Whop
// card-checkout as the primary way Chapo'sHub users acquire points.
//
// Any user can become a "vendor" (POST /vendor/apply) by adding a WhatsApp
// number — becoming a vendor unlocks selling points. Vendors create
// listings advertising a NGN-per-point rate; buyers place an order against
// a listing, then coordinate payment with the vendor OFF-PLATFORM (bank
// transfer / WhatsApp, exactly like real P2P exchanges such as Binance
// P2P). Chapo'sHub itself never touches real money — only the points
// transfer, which happens atomically once the vendor confirms they were
// paid. This mirrors the ethical "simulated financial rails only" pattern
// already used throughout this app (OPay wallet demo, Scripts Marketplace).
//
// Points transfer uses the same atomic conditional-UPDATE + refund-on-
// failure pattern as server/src/routes/marketplace.ts:
//   1. Vendor's points debited via a single conditional UPDATE
//      (`WHERE id = ? AND points >= ?`) — never a stale read-then-write.
//   2. Buyer's points credited ONLY after that debit is confirmed.
//   3. If the order-completion write then fails, both ledgers are reversed.
import { Router } from 'express'
import db from '../db/index.js'
import { generateId } from '../lib/crypto.js'
import { authMiddleware, optionalAuthMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'
import {
  P2P_MIN_RATE_NGN,
  P2P_MAX_RATE_NGN,
  P2P_MIN_LISTING_POINTS,
  P2P_MAX_LISTING_POINTS,
  type P2pListingRow,
  type P2pOrderRow
} from '../lib/types.js'

const router = Router()

function serializeListing(row: any, opts: { vendorUsername?: string; isOwner?: boolean } = {}) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendorUsername: opts.vendorUsername ?? row.vendor_username ?? undefined,
    rateNgnPerPoint: row.rate_ngn_per_point,
    minPoints: row.min_points,
    maxPoints: row.max_points,
    status: row.status,
    isOwner: !!opts.isOwner,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function serializeOrder(row: any) {
  return {
    id: row.id,
    listingId: row.listing_id,
    vendorId: row.vendor_id,
    vendorUsername: row.vendor_username ?? undefined,
    buyerId: row.buyer_id,
    buyerUsername: row.buyer_username ?? undefined,
    pointsAmount: row.points_amount,
    rateNgnPerPoint: row.rate_ngn_per_point,
    totalNgn: row.total_ngn,
    status: row.status,
    buyerMarkedPaidAt: row.buyer_marked_paid_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// ── Vendor status ─────────────────────────────────────────────────────
// GET /api/p2p/vendor/status
router.get('/vendor/status', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const user = db.prepare('SELECT is_vendor, whatsapp FROM users WHERE id = ?')
    .get(userId) as { is_vendor: number; whatsapp: string | null } | undefined
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ isVendor: !!user.is_vendor, whatsapp: user.whatsapp })
})

// POST /api/p2p/vendor/apply  { whatsapp }
// Real "Join Vendor" flow — becoming a vendor requires a WhatsApp number on
// file, since buyer/vendor payment coordination happens over WhatsApp
// (matches the "Used for vendor order notifications only" convention).
router.post('/vendor/apply', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : ''

  if (!whatsapp || whatsapp.length < 7 || whatsapp.length > 20) {
    return res.status(400).json({ error: 'Validation failed', details: 'A valid WhatsApp number is required' })
  }
  if (!/^\+?[0-9\s-]{7,20}$/.test(whatsapp)) {
    return res.status(400).json({ error: 'Validation failed', details: 'WhatsApp number format looks invalid' })
  }

  db.prepare('UPDATE users SET is_vendor = 1, whatsapp = ?, updated_at = ? WHERE id = ?')
    .run(whatsapp, new Date().toISOString(), userId)

  return res.json({ success: true, isVendor: true, whatsapp })
})

// ── Public browse ──────────────────────────────────────────────────────
// GET /api/p2p/listings — active listings from all vendors (buy side)
router.get('/listings', optionalAuthMiddleware, (_req: AuthedRequest, res) => {
  const results = db.prepare(
    `SELECT l.*, u.username as vendor_username FROM p2p_listings l
     JOIN users u ON u.id = l.vendor_id
     WHERE l.status = 'active' ORDER BY l.rate_ngn_per_point ASC, l.created_at DESC LIMIT 100`
  ).all() as any[]
  return res.json(results.map((r: any) => serializeListing(r, { vendorUsername: r.vendor_username })))
})

// GET /api/p2p/my-listings — vendor's own listings
router.get('/my-listings', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    "SELECT * FROM p2p_listings WHERE vendor_id = ? AND status != 'removed' ORDER BY created_at DESC"
  ).all(userId) as P2pListingRow[]
  return res.json(results.map((r) => serializeListing(r, { isOwner: true })))
})

// POST /api/p2p/listings — vendor creates a sell listing
router.post('/listings', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const user = db.prepare('SELECT is_vendor, points FROM users WHERE id = ?')
    .get(userId) as { is_vendor: number; points: number } | undefined
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.is_vendor) return res.status(403).json({ error: 'Join as a vendor before creating a sell listing' })

  const body = req.body || {}
  const rate = Number(body.rateNgnPerPoint)
  const minPoints = Number.isFinite(Number(body.minPoints)) ? parseInt(body.minPoints, 10) : P2P_MIN_LISTING_POINTS
  const maxPoints = Number.isFinite(Number(body.maxPoints)) ? parseInt(body.maxPoints, 10) : P2P_MIN_LISTING_POINTS * 10

  const errors: string[] = []
  if (!Number.isFinite(rate) || rate < P2P_MIN_RATE_NGN || rate > P2P_MAX_RATE_NGN) {
    errors.push(`rateNgnPerPoint must be between ${P2P_MIN_RATE_NGN} and ${P2P_MAX_RATE_NGN}`)
  }
  if (!Number.isInteger(minPoints) || minPoints < P2P_MIN_LISTING_POINTS) {
    errors.push(`minPoints must be a whole number >= ${P2P_MIN_LISTING_POINTS}`)
  }
  if (!Number.isInteger(maxPoints) || maxPoints > P2P_MAX_LISTING_POINTS || maxPoints < minPoints) {
    errors.push('maxPoints must be a whole number >= minPoints and within the allowed cap')
  }
  if (maxPoints > user.points) {
    errors.push(`maxPoints (${maxPoints}) cannot exceed your current balance (${user.points})`)
  }
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors.join('; ') })

  const id = generateId('p2pl')
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO p2p_listings (id, vendor_id, rate_ngn_per_point, min_points, max_points, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
  ).run(id, userId, rate, minPoints, maxPoints, now, now)

  const row = db.prepare('SELECT * FROM p2p_listings WHERE id = ?').get(id) as P2pListingRow
  return res.status(201).json(serializeListing(row, { isOwner: true }))
})

// PATCH /api/p2p/listings/:id — vendor pauses/resumes/edits own listing
router.patch('/listings/:id', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id
  const listing = db.prepare('SELECT * FROM p2p_listings WHERE id = ?').get(id) as P2pListingRow | undefined
  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  if (listing.vendor_id !== userId) return res.status(403).json({ error: 'Forbidden' })

  const body = req.body || {}
  const updates: string[] = []
  const values: any[] = []

  if (body.status !== undefined) {
    if (!['active', 'paused', 'removed'].includes(body.status)) {
      return res.status(400).json({ error: 'Validation failed', details: 'status must be active, paused, or removed' })
    }
    updates.push('status = ?')
    values.push(body.status)
  }
  if (body.rateNgnPerPoint !== undefined) {
    const rate = Number(body.rateNgnPerPoint)
    if (!Number.isFinite(rate) || rate < P2P_MIN_RATE_NGN || rate > P2P_MAX_RATE_NGN) {
      return res.status(400).json({ error: 'Validation failed', details: 'Invalid rateNgnPerPoint' })
    }
    updates.push('rate_ngn_per_point = ?')
    values.push(rate)
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' })
  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.prepare(`UPDATE p2p_listings SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  const updated = db.prepare('SELECT * FROM p2p_listings WHERE id = ?').get(id) as P2pListingRow
  return res.json(serializeListing(updated, { isOwner: true }))
})

// ── Orders ───────────────────────────────────────────────────────────
// POST /api/p2p/orders  { listingId, pointsAmount } — buyer places an order
router.post('/orders', authMiddleware, (req: AuthedRequest, res) => {
  const buyerId = req.userId!
  const body = req.body || {}
  const listingId = body.listingId
  const pointsAmount = parseInt(body.pointsAmount, 10)

  const listing = db.prepare('SELECT * FROM p2p_listings WHERE id = ?').get(listingId) as P2pListingRow | undefined
  if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not found' })
  if (listing.vendor_id === buyerId) return res.status(400).json({ error: 'You cannot buy from your own listing' })
  if (!Number.isInteger(pointsAmount) || pointsAmount < listing.min_points || pointsAmount > listing.max_points) {
    return res.status(400).json({
      error: 'Validation failed',
      details: `pointsAmount must be between ${listing.min_points} and ${listing.max_points}`
    })
  }

  const vendor = db.prepare('SELECT points FROM users WHERE id = ?').get(listing.vendor_id) as { points: number } | undefined
  if (!vendor || vendor.points < pointsAmount) {
    return res.status(409).json({ error: 'Vendor no longer has enough points available for this order' })
  }

  const totalNgn = Math.round(pointsAmount * listing.rate_ngn_per_point * 100) / 100
  const id = generateId('p2po')
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO p2p_orders (id, listing_id, vendor_id, buyer_id, points_amount, rate_ngn_per_point, total_ngn, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`
  ).run(id, listingId, listing.vendor_id, buyerId, pointsAmount, listing.rate_ngn_per_point, totalNgn, now, now)

  const row = db.prepare('SELECT * FROM p2p_orders WHERE id = ?').get(id) as P2pOrderRow
  return res.status(201).json(serializeOrder(row))
})

// GET /api/p2p/orders/buying — buyer's own orders
router.get('/orders/buying', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    `SELECT o.*, uv.username as vendor_username FROM p2p_orders o
     JOIN users uv ON uv.id = o.vendor_id
     WHERE o.buyer_id = ? ORDER BY o.created_at DESC`
  ).all(userId) as any[]
  return res.json(results.map(serializeOrder))
})

// GET /api/p2p/orders/selling — vendor's incoming orders
router.get('/orders/selling', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    `SELECT o.*, ub.username as buyer_username FROM p2p_orders o
     JOIN users ub ON ub.id = o.buyer_id
     WHERE o.vendor_id = ? ORDER BY o.created_at DESC`
  ).all(userId) as any[]
  return res.json(results.map(serializeOrder))
})

// POST /api/p2p/orders/:id/mark-paid — buyer confirms they sent payment off-platform
router.post('/orders/:id/mark-paid', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id
  const order = db.prepare('SELECT * FROM p2p_orders WHERE id = ?').get(id) as P2pOrderRow | undefined
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.buyer_id !== userId) return res.status(403).json({ error: 'Forbidden' })
  if (order.status !== 'pending_payment') return res.status(400).json({ error: `Order is already ${order.status}` })

  const now = new Date().toISOString()
  db.prepare(
    "UPDATE p2p_orders SET status = 'awaiting_confirmation', buyer_marked_paid_at = ?, updated_at = ? WHERE id = ?"
  ).run(now, now, id)
  return res.json({ success: true, status: 'awaiting_confirmation' })
})

// POST /api/p2p/orders/:id/confirm — vendor confirms payment received; atomically transfers points
router.post('/orders/:id/confirm', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id
  const order = db.prepare('SELECT * FROM p2p_orders WHERE id = ?').get(id) as P2pOrderRow | undefined
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.vendor_id !== userId) return res.status(403).json({ error: 'Forbidden' })
  if (order.status !== 'awaiting_confirmation' && order.status !== 'pending_payment') {
    return res.status(400).json({ error: `Order is already ${order.status}` })
  }

  const price = order.points_amount

  // Step 1: atomic, race-safe vendor points debit
  const debit = db.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).run(price, order.vendor_id, price)

  if (debit.changes === 0) {
    return res.status(402).json({ error: 'You do not have enough points remaining to fulfil this order' })
  }

  // Step 2: credit the buyer, only now that the vendor debit is confirmed
  const credit = db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(price, order.buyer_id)

  if (credit.changes === 0) {
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(price, order.vendor_id)
    return res.status(500).json({ error: 'Order confirmation failed, all charges reversed' })
  }

  const now = new Date().toISOString()
  try {
    const tx = db.transaction(() => {
      db.prepare("UPDATE p2p_orders SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?")
        .run(now, now, id)
      db.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, 'p2p_sale', 'p2p', ?)`
      ).run(generateId('ptx'), order.vendor_id, -price, order.vendor_id, `Sold ${price.toLocaleString()} pts via P2P`, now)
      db.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, created_at)
         VALUES (?, ?, 'purchase', ?, (SELECT points FROM users WHERE id = ?), ?, 'p2p_purchase', 'p2p', ?)`
      ).run(generateId('ptx'), order.buyer_id, price, order.buyer_id, `Bought ${price.toLocaleString()} pts via P2P`, now)
      db.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'p2p', 'P2P Sale', ?, 'fa-solid fa-money-bill-transfer', 'rgba(34,197,94,0.15)', ?)`
      ).run(generateId('act'), order.vendor_id, `Sold ${price.toLocaleString()} pts (\u20a6${order.total_ngn.toLocaleString()})`, now)
      db.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'p2p', 'P2P Purchase', ?, 'fa-solid fa-coins', 'rgba(34,197,94,0.15)', ?)`
      ).run(generateId('act'), order.buyer_id, `Bought ${price.toLocaleString()} pts (\u20a6${order.total_ngn.toLocaleString()})`, now)
    })
    tx()
  } catch {
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(price, order.vendor_id)
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(price, order.buyer_id)
    return res.status(500).json({ error: 'Order confirmation failed, all charges reversed' })
  }

  return res.json({ success: true, status: 'completed' })
})

// POST /api/p2p/orders/:id/cancel — either party cancels before completion
router.post('/orders/:id/cancel', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id
  const order = db.prepare('SELECT * FROM p2p_orders WHERE id = ?').get(id) as P2pOrderRow | undefined
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.buyer_id !== userId && order.vendor_id !== userId) return res.status(403).json({ error: 'Forbidden' })
  if (order.status === 'completed' || order.status === 'cancelled') {
    return res.status(400).json({ error: `Order is already ${order.status}` })
  }

  const now = new Date().toISOString()
  db.prepare("UPDATE p2p_orders SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, id)
  return res.json({ success: true, status: 'cancelled' })
})

export default router
