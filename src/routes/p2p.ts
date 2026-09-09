import { Hono } from 'hono'
import { generateId } from '../lib/crypto'
import { authMiddleware, optionalAuthMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, P2pListingRow, P2pOrderRow, UserRow } from '../lib/types'
import {
  P2P_MIN_RATE_NGN,
  P2P_MAX_RATE_NGN,
  P2P_MIN_LISTING_POINTS,
  P2P_MAX_LISTING_POINTS,
  P2P_VENDOR_FEE_POINTS
} from '../lib/types'

// ─────────────────────────────────────────────────────────────────────────
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
// failure pattern as src/routes/marketplace.ts:
//   1. Vendor's points debited via `UPDATE users SET points = points - ?
//      WHERE id = ? AND points >= ?` — never a stale read-then-write.
//   2. Buyer's points credited ONLY after that debit is confirmed.
//   3. If the order-completion write then fails, both ledgers are reversed.
// ─────────────────────────────────────────────────────────────────────────

const p2p = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

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
p2p.get('/vendor/status', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT is_vendor, whatsapp, points FROM users WHERE id = ?')
    .bind(userId).first<{ is_vendor: number; whatsapp: string | null; points: number }>()
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({
    isVendor: !!user.is_vendor,
    whatsapp: user.whatsapp,
    vendorFeePoints: P2P_VENDOR_FEE_POINTS,
    points: user.points
  })
})

// POST /api/p2p/vendor/apply  { whatsapp }
// Real "Join Vendor" flow — becoming a vendor requires a WhatsApp number on
// file (buyer/vendor payment coordination happens over WhatsApp), AND a
// one-time P2P_VENDOR_FEE_POINTS onboarding fee, deducted atomically the
// same way any other points spend is (conditional UPDATE ... WHERE points
// >= ?, never a stale read-then-write), with a matching points_transactions
// + activities record on success.
p2p.post('/vendor/apply', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : ''

  if (!whatsapp || whatsapp.length < 7 || whatsapp.length > 20) {
    return c.json({ error: 'Validation failed', details: 'A valid WhatsApp number is required' }, 400)
  }
  if (!/^\+?[0-9\s-]{7,20}$/.test(whatsapp)) {
    return c.json({ error: 'Validation failed', details: 'WhatsApp number format looks invalid' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT is_vendor, points FROM users WHERE id = ?')
    .bind(userId).first<{ is_vendor: number; points: number }>()
  if (!existing) return c.json({ error: 'User not found' }, 404)

  // Already a vendor — just let them update their WhatsApp number, no
  // second fee charge.
  if (existing.is_vendor) {
    await c.env.DB.prepare('UPDATE users SET whatsapp = ?, updated_at = ? WHERE id = ?')
      .bind(whatsapp, new Date().toISOString(), userId).run()
    return c.json({ success: true, isVendor: true, whatsapp, feeCharged: 0 })
  }

  if (existing.points < P2P_VENDOR_FEE_POINTS) {
    return c.json({
      error: 'Insufficient point balance',
      details: `Becoming a vendor requires a one-time fee of ${P2P_VENDOR_FEE_POINTS.toLocaleString()} points`,
      required: P2P_VENDOR_FEE_POINTS,
      points: existing.points
    }, 402)
  }

  // Atomic, race-safe fee debit — never a stale read-then-write.
  const debit = await c.env.DB.prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?')
    .bind(P2P_VENDOR_FEE_POINTS, userId, P2P_VENDOR_FEE_POINTS).run()
  if (!debit.meta || debit.meta.changes === 0) {
    return c.json({
      error: 'Insufficient point balance',
      details: `Becoming a vendor requires a one-time fee of ${P2P_VENDOR_FEE_POINTS.toLocaleString()} points`,
      required: P2P_VENDOR_FEE_POINTS
    }, 402)
  }

  const now = new Date().toISOString()
  try {
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE users SET is_vendor = 1, whatsapp = ?, updated_at = ? WHERE id = ?')
        .bind(whatsapp, now, userId),
      c.env.DB.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, 'p2p_vendor_fee', 'points', ?)`
      ).bind(generateId('ptx'), userId, -P2P_VENDOR_FEE_POINTS, userId, `Vendor onboarding fee (${P2P_VENDOR_FEE_POINTS.toLocaleString()} pts)`, now),
      c.env.DB.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'p2p', 'Became a Vendor', ?, 'fa-solid fa-store', 'rgba(34,197,94,0.15)', ?)`
      ).bind(generateId('act'), userId, `Paid ${P2P_VENDOR_FEE_POINTS.toLocaleString()} pts onboarding fee`, now)
    ])
  } catch (err) {
    // Refund the fee if the follow-up writes fail, so a half-applied vendor
    // upgrade never leaves the user charged with no benefit.
    await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?')
      .bind(P2P_VENDOR_FEE_POINTS, userId).run()
    return c.json({ error: 'Vendor signup failed, fee refunded' }, 500)
  }

  return c.json({ success: true, isVendor: true, whatsapp, feeCharged: P2P_VENDOR_FEE_POINTS })
})

// ── Public browse ──────────────────────────────────────────────────────
// GET /api/p2p/listings — active listings from all vendors (buy side)
p2p.get('/listings', optionalAuthMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, u.username as vendor_username FROM p2p_listings l
     JOIN users u ON u.id = l.vendor_id
     WHERE l.status = 'active' ORDER BY l.rate_ngn_per_point ASC, l.created_at DESC LIMIT 100`
  ).all<any>()
  return c.json(results.map((r: any) => serializeListing(r, { vendorUsername: r.vendor_username })))
})

// GET /api/p2p/my-listings — vendor's own listings
p2p.get('/my-listings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM p2p_listings WHERE vendor_id = ? AND status != 'removed' ORDER BY created_at DESC"
  ).bind(userId).all<P2pListingRow>()
  return c.json(results.map((r) => serializeListing(r, { isOwner: true })))
})

// POST /api/p2p/listings — vendor creates a sell listing
p2p.post('/listings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT is_vendor, points FROM users WHERE id = ?')
    .bind(userId).first<{ is_vendor: number; points: number }>()
  if (!user) return c.json({ error: 'User not found' }, 404)
  if (!user.is_vendor) return c.json({ error: 'Join as a vendor before creating a sell listing' }, 403)

  const body = await c.req.json().catch(() => ({}))
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
  if (errors.length > 0) return c.json({ error: 'Validation failed', details: errors.join('; ') }, 400)

  const id = generateId('p2pl')
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO p2p_listings (id, vendor_id, rate_ngn_per_point, min_points, max_points, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
  ).bind(id, userId, rate, minPoints, maxPoints, now, now).run()

  const row = await c.env.DB.prepare('SELECT * FROM p2p_listings WHERE id = ?').bind(id).first<P2pListingRow>()
  return c.json(serializeListing(row, { isOwner: true }), 201)
})

// PATCH /api/p2p/listings/:id — vendor pauses/resumes/edits own listing
p2p.patch('/listings/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const listing = await c.env.DB.prepare('SELECT * FROM p2p_listings WHERE id = ?').bind(id).first<P2pListingRow>()
  if (!listing) return c.json({ error: 'Listing not found' }, 404)
  if (listing.vendor_id !== userId) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const updates: string[] = []
  const values: any[] = []

  if (body.status !== undefined) {
    if (!['active', 'paused', 'removed'].includes(body.status)) {
      return c.json({ error: 'Validation failed', details: 'status must be active, paused, or removed' }, 400)
    }
    updates.push('status = ?')
    values.push(body.status)
  }
  if (body.rateNgnPerPoint !== undefined) {
    const rate = Number(body.rateNgnPerPoint)
    if (!Number.isFinite(rate) || rate < P2P_MIN_RATE_NGN || rate > P2P_MAX_RATE_NGN) {
      return c.json({ error: 'Validation failed', details: 'Invalid rateNgnPerPoint' }, 400)
    }
    updates.push('rate_ngn_per_point = ?')
    values.push(rate)
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields to update' }, 400)
  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  await c.env.DB.prepare(`UPDATE p2p_listings SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
  const updated = await c.env.DB.prepare('SELECT * FROM p2p_listings WHERE id = ?').bind(id).first<P2pListingRow>()
  return c.json(serializeListing(updated, { isOwner: true }))
})

// ── Orders ───────────────────────────────────────────────────────────
// POST /api/p2p/orders  { listingId, pointsAmount } — buyer places an order
p2p.post('/orders', authMiddleware, async (c) => {
  const buyerId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const listingId = body.listingId
  const pointsAmount = parseInt(body.pointsAmount, 10)

  const listing = await c.env.DB.prepare('SELECT * FROM p2p_listings WHERE id = ?').bind(listingId).first<P2pListingRow>()
  if (!listing || listing.status !== 'active') return c.json({ error: 'Listing not found' }, 404)
  if (listing.vendor_id === buyerId) return c.json({ error: 'You cannot buy from your own listing' }, 400)
  if (!Number.isInteger(pointsAmount) || pointsAmount < listing.min_points || pointsAmount > listing.max_points) {
    return c.json({ error: 'Validation failed', details: `pointsAmount must be between ${listing.min_points} and ${listing.max_points}` }, 400)
  }

  const vendor = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(listing.vendor_id).first<{ points: number }>()
  if (!vendor || vendor.points < pointsAmount) {
    return c.json({ error: 'Vendor no longer has enough points available for this order' }, 409)
  }

  const totalNgn = Math.round(pointsAmount * listing.rate_ngn_per_point * 100) / 100
  const id = generateId('p2po')
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO p2p_orders (id, listing_id, vendor_id, buyer_id, points_amount, rate_ngn_per_point, total_ngn, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`
  ).bind(id, listingId, listing.vendor_id, buyerId, pointsAmount, listing.rate_ngn_per_point, totalNgn, now, now).run()

  const row = await c.env.DB.prepare('SELECT * FROM p2p_orders WHERE id = ?').bind(id).first<P2pOrderRow>()
  return c.json(serializeOrder(row), 201)
})

// GET /api/p2p/orders/buying — buyer's own orders
p2p.get('/orders/buying', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT o.*, uv.username as vendor_username FROM p2p_orders o
     JOIN users uv ON uv.id = o.vendor_id
     WHERE o.buyer_id = ? ORDER BY o.created_at DESC`
  ).bind(userId).all<any>()
  return c.json(results.map(serializeOrder))
})

// GET /api/p2p/orders/selling — vendor's incoming orders
p2p.get('/orders/selling', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT o.*, ub.username as buyer_username FROM p2p_orders o
     JOIN users ub ON ub.id = o.buyer_id
     WHERE o.vendor_id = ? ORDER BY o.created_at DESC`
  ).bind(userId).all<any>()
  return c.json(results.map(serializeOrder))
})

// POST /api/p2p/orders/:id/mark-paid — buyer confirms they sent payment off-platform
p2p.post('/orders/:id/mark-paid', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT * FROM p2p_orders WHERE id = ?').bind(id).first<P2pOrderRow>()
  if (!order) return c.json({ error: 'Order not found' }, 404)
  if (order.buyer_id !== userId) return c.json({ error: 'Forbidden' }, 403)
  if (order.status !== 'pending_payment') return c.json({ error: `Order is already ${order.status}` }, 400)

  const now = new Date().toISOString()
  await c.env.DB.prepare(
    "UPDATE p2p_orders SET status = 'awaiting_confirmation', buyer_marked_paid_at = ?, updated_at = ? WHERE id = ?"
  ).bind(now, now, id).run()
  return c.json({ success: true, status: 'awaiting_confirmation' })
})

// POST /api/p2p/orders/:id/confirm — vendor confirms payment received; atomically transfers points
p2p.post('/orders/:id/confirm', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT * FROM p2p_orders WHERE id = ?').bind(id).first<P2pOrderRow>()
  if (!order) return c.json({ error: 'Order not found' }, 404)
  if (order.vendor_id !== userId) return c.json({ error: 'Forbidden' }, 403)
  if (order.status !== 'awaiting_confirmation' && order.status !== 'pending_payment') {
    return c.json({ error: `Order is already ${order.status}` }, 400)
  }

  const price = order.points_amount

  // Step 1: atomic, race-safe vendor points debit
  const debit = await c.env.DB.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).bind(price, order.vendor_id, price).run()

  if (!debit.meta || debit.meta.changes === 0) {
    return c.json({ error: 'You do not have enough points remaining to fulfil this order' }, 402)
  }

  // Step 2: credit the buyer, only now that the vendor debit is confirmed
  const credit = await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?')
    .bind(price, order.buyer_id).run()

  if (!credit.meta || credit.meta.changes === 0) {
    await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(price, order.vendor_id).run()
    return c.json({ error: 'Order confirmation failed, all charges reversed' }, 500)
  }

  const now = new Date().toISOString()
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE p2p_orders SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?")
        .bind(now, now, id),
      c.env.DB.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, 'p2p_sale', 'p2p', ?)`
      ).bind(generateId('ptx'), order.vendor_id, -price, order.vendor_id, `Sold ${price.toLocaleString()} pts via P2P`, now),
      c.env.DB.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, created_at)
         VALUES (?, ?, 'purchase', ?, (SELECT points FROM users WHERE id = ?), ?, 'p2p_purchase', 'p2p', ?)`
      ).bind(generateId('ptx'), order.buyer_id, price, order.buyer_id, `Bought ${price.toLocaleString()} pts via P2P`, now),
      c.env.DB.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'p2p', 'P2P Sale', ?, 'fa-solid fa-money-bill-transfer', 'rgba(34,197,94,0.15)', ?)`
      ).bind(generateId('act'), order.vendor_id, `Sold ${price.toLocaleString()} pts (₦${order.total_ngn.toLocaleString()})`, now),
      c.env.DB.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'p2p', 'P2P Purchase', ?, 'fa-solid fa-coins', 'rgba(34,197,94,0.15)', ?)`
      ).bind(generateId('act'), order.buyer_id, `Bought ${price.toLocaleString()} pts (₦${order.total_ngn.toLocaleString()})`, now)
    ])
  } catch {
    await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(price, order.vendor_id).run()
    await c.env.DB.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(price, order.buyer_id).run()
    return c.json({ error: 'Order confirmation failed, all charges reversed' }, 500)
  }

  return c.json({ success: true, status: 'completed' })
})

// POST /api/p2p/orders/:id/cancel — either party cancels before completion
p2p.post('/orders/:id/cancel', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT * FROM p2p_orders WHERE id = ?').bind(id).first<P2pOrderRow>()
  if (!order) return c.json({ error: 'Order not found' }, 404)
  if (order.buyer_id !== userId && order.vendor_id !== userId) return c.json({ error: 'Forbidden' }, 403)
  if (order.status === 'completed' || order.status === 'cancelled') {
    return c.json({ error: `Order is already ${order.status}` }, 400)
  }

  const now = new Date().toISOString()
  await c.env.DB.prepare("UPDATE p2p_orders SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, id).run()
  return c.json({ success: true, status: 'cancelled' })
})

export default p2p
