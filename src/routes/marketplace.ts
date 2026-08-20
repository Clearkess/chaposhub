import { Hono } from 'hono'
import { generateId, generateShortId } from '../lib/crypto'
import { authMiddleware, optionalAuthMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, MarketplaceListingRow, MarketplacePurchaseRow } from '../lib/types'
import { MARKETPLACE_CATEGORIES, MARKETPLACE_PLATFORM_FEE_PCT } from '../lib/types'

// ─────────────────────────────────────────────────────────────────────────
// Scripts / Website-Templates Marketplace backend.
//
// Any Chapo'sHub user can list a ready-made, LEGITIMATE website template for
// sale, priced in points. Other users buy it with their existing points
// balance. This is the opposite of the SlipCraft-style "Scripts" marketplace
// that was flagged and refused (that one appeared to sell investment/HYIP
// scam templates) — this feature only exists for real, useful templates, and
// is gated by an admin-approval moderation queue specifically to keep it
// from being weaponized to distribute malware or phishing kits disguised as
// "website templates" (see migrations/0005_marketplace.sql for the full
// rationale, matching the README's existing refusal of a "Login Page
// Builder").
//
// Every purchase is a THREE-PARTY extension of the atomic two-ledger
// debit/refund pattern proven in src/routes/opay-wallet.ts:
//   1. Buyer's Chapo'sHub points debited via a single conditional UPDATE
//      (`WHERE id = ? AND points >= ?`) — never a stale read-then-write.
//   2. Seller's points credited (price minus the platform fee) ONLY after
//      the buyer debit is confirmed to have actually applied.
//   3. If the purchase-row insert (+ sales_count bump + history rows) then
//      fails for any reason, BOTH the buyer debit and the seller credit are
//      reversed immediately. The buyer is never charged, and the seller
//      never gets paid, for a purchase that wasn't actually recorded.
//
// File delivery: sellers upload the actual template as a .zip to the
// MARKETPLACE_BUCKET R2 bucket. The file is NEVER exposed via a public URL —
// it can only be streamed back out through GET /download/:purchaseId, which
// verifies the requester is either the buyer or the seller on that specific
// purchase row before touching R2 at all.
// ─────────────────────────────────────────────────────────────────────────

const marketplace = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB cap for a template .zip
const MIN_PRICE = 10
const MAX_PRICE = 500_000

const adminOnly = async (c: any, next: any) => {
  if (c.get('userRole') !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }
  await next()
}

function isValidCategory(cat: unknown): cat is (typeof MARKETPLACE_CATEGORIES)[number] {
  return typeof cat === 'string' && (MARKETPLACE_CATEGORIES as readonly string[]).includes(cat)
}

function serializeListing(
  row: any,
  opts: { sellerUsername?: string; isOwner?: boolean; purchased?: boolean; isAdminView?: boolean } = {}
) {
  const { sellerUsername, isOwner, purchased, isAdminView } = opts
  const out: Record<string, any> = {
    id: row.id,
    sellerId: row.seller_id,
    sellerUsername: sellerUsername ?? row.seller_username ?? undefined,
    title: row.title,
    description: row.description,
    category: row.category,
    pricePoints: row.price_points,
    previewImageUrl: row.preview_image_url,
    hasFile: !!row.file_key,
    fileName: row.file_name,
    fileSize: row.file_size,
    salesCount: row.sales_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  if (isOwner || isAdminView) {
    out.status = row.status
    out.rejectionReason = row.rejection_reason
  } else {
    out.status = 'approved'
  }
  if (purchased !== undefined) out.purchased = purchased
  return out
}

function validateListingFields(body: any, existing?: MarketplaceListingRow) {
  const title = body.title !== undefined ? String(body.title).trim() : existing?.title ?? ''
  const description = body.description !== undefined ? String(body.description).trim() : existing?.description ?? ''
  const category =
    body.category !== undefined ? String(body.category).trim().toLowerCase() : existing?.category ?? ''
  const rawPrice = body.pricePoints !== undefined ? body.pricePoints : existing?.price_points
  const pricePoints = typeof rawPrice === 'number' ? rawPrice : parseInt(rawPrice, 10)
  const rawPreview =
    body.previewImageUrl !== undefined ? body.previewImageUrl : existing?.preview_image_url ?? null
  const previewImageUrl = rawPreview ? String(rawPreview).trim() : null

  const errors: string[] = []
  if (!title || title.length > 100) errors.push('title is required (max 100 chars)')
  if (!description || description.length > 2000) errors.push('description is required (max 2000 chars)')
  if (!isValidCategory(category)) errors.push('category must be one of: ' + MARKETPLACE_CATEGORIES.join(', '))
  if (!Number.isFinite(pricePoints) || !Number.isInteger(pricePoints) || pricePoints < MIN_PRICE || pricePoints > MAX_PRICE) {
    errors.push(`pricePoints must be a whole number between ${MIN_PRICE} and ${MAX_PRICE}`)
  }
  if (previewImageUrl && (!/^https?:\/\//i.test(previewImageUrl) || previewImageUrl.length > 500)) {
    errors.push('previewImageUrl must be a valid http(s) URL')
  }

  return { errors, title, description, category, pricePoints, previewImageUrl }
}

// ── Public browse ──────────────────────────────────────────────────────
// GET /api/marketplace/listings?category=&search=&limit=
marketplace.get('/listings', optionalAuthMiddleware, async (c) => {
  const category = c.req.query('category')
  const search = (c.req.query('search') || '').trim()
  const limitParam = parseInt(c.req.query('limit') || '50', 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50
  const userId = c.get('userId') || null

  let query = `SELECT l.*, u.username as seller_username,
      EXISTS(SELECT 1 FROM marketplace_purchases p WHERE p.listing_id = l.id AND p.buyer_id = ?) as purchased
    FROM marketplace_listings l
    JOIN users u ON u.id = l.seller_id
    WHERE l.status = 'approved'`
  const params: any[] = [userId]

  if (category && isValidCategory(category)) {
    query += ' AND l.category = ?'
    params.push(category)
  }
  if (search) {
    query += ' AND (l.title LIKE ? OR l.description LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY l.created_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await c.env.DB.prepare(query).bind(...params).all<any>()
  return c.json(
    results.map((r: any) =>
      serializeListing(r, { sellerUsername: r.seller_username, purchased: !!r.purchased })
    )
  )
})

// GET /api/marketplace/listings/:id
marketplace.get('/listings/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId') || null
  const userRole = c.get('userRole') || null

  const row = await c.env.DB.prepare(
    `SELECT l.*, u.username as seller_username FROM marketplace_listings l
     JOIN users u ON u.id = l.seller_id WHERE l.id = ?`
  ).bind(id).first<any>()
  if (!row) return c.json({ error: 'Listing not found' }, 404)

  const isOwner = !!userId && userId === row.seller_id
  const isAdmin = userRole === 'admin'
  if ((row.status === 'pending' || row.status === 'rejected' || row.status === 'removed') && !isOwner && !isAdmin) {
    return c.json({ error: 'Listing not found' }, 404)
  }

  let purchased = false
  if (userId) {
    const p = await c.env.DB.prepare(
      'SELECT id FROM marketplace_purchases WHERE listing_id = ? AND buyer_id = ?'
    ).bind(id, userId).first()
    purchased = !!p
  }

  return c.json(serializeListing(row, { sellerUsername: row.seller_username, isOwner, purchased, isAdminView: isAdmin }))
})

// ── Seller's own listings ──────────────────────────────────────────────
// GET /api/marketplace/my-listings
marketplace.get('/my-listings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM marketplace_listings WHERE seller_id = ? AND status != 'removed' ORDER BY created_at DESC"
  ).bind(userId).all<MarketplaceListingRow>()
  return c.json(results.map((r) => serializeListing(r, { isOwner: true })))
})

// POST /api/marketplace/listings — create (starts as 'pending')
marketplace.post('/listings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { errors, title, description, category, pricePoints, previewImageUrl } = validateListingFields(body)
  if (errors.length > 0) return c.json({ error: 'Validation failed', details: errors.join('; ') }, 400)

  const id = generateId('mkl')
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO marketplace_listings
       (id, seller_id, title, description, category, price_points, preview_image_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(id, userId, title, description, category, pricePoints, previewImageUrl, now, now).run()

  const row = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first<MarketplaceListingRow>()
  return c.json(serializeListing(row, { isOwner: true }), 201)
})

// PATCH /api/marketplace/listings/:id — seller edits own listing.
// Any content edit re-enters the moderation queue (status -> pending,
// rejection_reason cleared) so an already-approved listing can't be quietly
// swapped for something else without another review pass.
marketplace.patch('/listings/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first<MarketplaceListingRow>()
  if (!listing) return c.json({ error: 'Listing not found' }, 404)
  if (listing.seller_id !== userId) return c.json({ error: 'Forbidden' }, 403)
  if (listing.status === 'removed') return c.json({ error: 'This listing has been removed' }, 400)

  const body = await c.req.json().catch(() => ({}))
  const { errors, title, description, category, pricePoints, previewImageUrl } = validateListingFields(body, listing)
  if (errors.length > 0) return c.json({ error: 'Validation failed', details: errors.join('; ') }, 400)

  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `UPDATE marketplace_listings
     SET title = ?, description = ?, category = ?, price_points = ?, preview_image_url = ?,
         status = 'pending', rejection_reason = NULL, updated_at = ?
     WHERE id = ?`
  ).bind(title, description, category, pricePoints, previewImageUrl, now, id).run()

  const updated = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first<MarketplaceListingRow>()
  return c.json(serializeListing(updated, { isOwner: true }))
})

// DELETE /api/marketplace/listings/:id — seller removes own listing.
// Soft-deletes (status='removed', hidden everywhere) so buyers who already
// paid keep their purchase-history record. The underlying R2 file is only
// hard-deleted if nobody has bought it yet.
marketplace.delete('/listings/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first<MarketplaceListingRow>()
  if (!listing) return c.json({ error: 'Listing not found' }, 404)
  if (listing.seller_id !== userId) return c.json({ error: 'Forbidden' }, 403)

  await c.env.DB.prepare("UPDATE marketplace_listings SET status = 'removed', updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), id).run()

  if (listing.file_key && listing.sales_count === 0) {
    await c.env.MARKETPLACE_BUCKET.delete(listing.file_key).catch(() => {})
  }

  return c.json({ success: true })
})

// POST /api/marketplace/listings/:id/upload — seller uploads the template
// .zip. Streams the request body straight into R2 (no full in-memory
// buffering) and never accepts a re-upload once the listing has sales
// (buyers who already paid must keep getting exactly what they bought).
marketplace.post('/listings/:id/upload', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first<MarketplaceListingRow>()
  if (!listing) return c.json({ error: 'Listing not found' }, 404)
  if (listing.seller_id !== userId) return c.json({ error: 'Forbidden' }, 403)
  if (listing.status === 'removed') return c.json({ error: 'This listing has been removed' }, 400)
  if (listing.sales_count > 0) {
    return c.json({ error: 'Cannot replace the file after a listing has sales — create a new listing instead' }, 400)
  }

  const fileNameHeader = c.req.header('x-file-name') || 'template.zip'
  const fileName = fileNameHeader.replace(/[/\\]/g, '_').slice(0, 150)
  if (!/\.zip$/i.test(fileName)) return c.json({ error: 'Only .zip files are accepted' }, 400)

  const contentLength = parseInt(c.req.header('content-length') || '0', 10)
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return c.json({ error: 'Missing or invalid Content-Length header' }, 400)
  }
  if (contentLength > MAX_FILE_SIZE) {
    return c.json({ error: `File too large (max ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)}MB)` }, 400)
  }

  const body = c.req.raw.body
  if (!body) return c.json({ error: 'Empty file' }, 400)

  const fileKey = `marketplace/${id}/${generateShortId(10)}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const putResult = await c.env.MARKETPLACE_BUCKET.put(fileKey, body, {
    httpMetadata: { contentType: 'application/zip' }
  })

  // Clean up the previous file (if any) now that the new one is safely stored.
  if (listing.file_key && listing.file_key !== fileKey) {
    await c.env.MARKETPLACE_BUCKET.delete(listing.file_key).catch(() => {})
  }

  const fileSize = putResult?.size ?? contentLength
  await c.env.DB.prepare(
    'UPDATE marketplace_listings SET file_key = ?, file_name = ?, file_size = ?, updated_at = ? WHERE id = ?'
  ).bind(fileKey, fileName, fileSize, new Date().toISOString(), id).run()

  return c.json({ fileName, fileSize })
})

// ── Purchases ───────────────────────────────────────────────────────────
// POST /api/marketplace/listings/:id/purchase
marketplace.post('/listings/:id/purchase', authMiddleware, async (c) => {
  const buyerId = c.get('userId')
  const listingId = c.req.param('id')

  const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(listingId).first<MarketplaceListingRow>()
  if (!listing || listing.status !== 'approved') return c.json({ error: 'Listing not found' }, 404)
  if (!listing.file_key) return c.json({ error: 'This listing has no downloadable file yet' }, 400)
  if (listing.seller_id === buyerId) return c.json({ error: 'You cannot buy your own listing' }, 400)

  const already = await c.env.DB.prepare(
    'SELECT id FROM marketplace_purchases WHERE listing_id = ? AND buyer_id = ?'
  ).bind(listingId, buyerId).first<{ id: string }>()
  if (already) return c.json({ error: 'You already own this listing', purchaseId: already.id }, 409)

  const price = listing.price_points
  const platformFee = Math.floor((price * MARKETPLACE_PLATFORM_FEE_PCT) / 100)
  const sellerEarned = price - platformFee

  // --- Step 1: atomic, race-safe buyer points debit ---
  const debit = await c.env.DB.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).bind(price, buyerId, price).run()

  if (!debit.meta || debit.meta.changes === 0) {
    const u = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(buyerId).first<{ points: number }>()
    return c.json({ error: 'Insufficient points', points: u?.points ?? 0, required: price }, 402)
  }

  // --- Step 2: credit the seller, ONLY now that the buyer debit is confirmed ---
  const credit = await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?')
    .bind(sellerEarned, listing.seller_id).run()

  if (!credit.meta || credit.meta.changes === 0) {
    // Seller row vanished mid-purchase — refund the buyer immediately.
    await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(price, buyerId).run()
    return c.json({ error: 'Purchase failed, all charges refunded' }, 500)
  }

  // --- Both ledgers moved. Record the purchase + sales bump + history rows. ---
  const purchaseId = generateId('mkp')
  const now = new Date().toISOString()
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO marketplace_purchases
           (id, listing_id, buyer_id, seller_id, price_points, seller_earned_points, platform_fee_points, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(purchaseId, listingId, buyerId, listing.seller_id, price, sellerEarned, platformFee, now),
      c.env.DB.prepare('UPDATE marketplace_listings SET sales_count = sales_count + 1, updated_at = ? WHERE id = ?')
        .bind(now, listingId),
      c.env.DB.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, 'marketplace_purchase', ?)`
      ).bind(generateId('ptx'), buyerId, -price, buyerId, `Bought "${listing.title}" on Scripts Marketplace`, now),
      c.env.DB.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'bonus', ?, (SELECT points FROM users WHERE id = ?), ?, 'marketplace_sale', ?)`
      ).bind(generateId('ptx'), listing.seller_id, sellerEarned, listing.seller_id, `Sold "${listing.title}" on Scripts Marketplace`, now),
      c.env.DB.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'marketplace', ?, ?, '🛒', 'rgba(34,197,94,0.15)', ?)`
      ).bind(generateId('act'), buyerId, 'Marketplace Purchase', `Bought "${listing.title}"`, now),
      c.env.DB.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'marketplace', ?, ?, '💰', 'rgba(34,197,94,0.15)', ?)`
      ).bind(generateId('act'), listing.seller_id, 'Marketplace Sale', `Sold "${listing.title}" (+${sellerEarned} pts)`, now)
    ])
  } catch {
    // Reverse BOTH ledgers immediately — the purchase never actually recorded.
    await c.env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(price, buyerId).run()
    await c.env.DB.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(sellerEarned, listing.seller_id).run()
    return c.json({ error: 'Purchase failed, all charges refunded' }, 500)
  }

  const buyer = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(buyerId).first<{ points: number }>()
  return c.json(
    {
      purchaseId,
      listingId,
      title: listing.title,
      pricePaid: price,
      remainingPoints: buyer?.points ?? null
    },
    201
  )
})

// GET /api/marketplace/purchases — buyer's own purchase history
marketplace.get('/purchases', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, l.title, l.category, l.preview_image_url, l.file_name, l.file_size, u.username as seller_username
     FROM marketplace_purchases p
     JOIN marketplace_listings l ON l.id = p.listing_id
     JOIN users u ON u.id = p.seller_id
     WHERE p.buyer_id = ? ORDER BY p.created_at DESC`
  ).bind(userId).all<any>()

  return c.json(
    results.map((r: any) => ({
      id: r.id,
      listingId: r.listing_id,
      title: r.title,
      category: r.category,
      previewImageUrl: r.preview_image_url,
      fileName: r.file_name,
      fileSize: r.file_size,
      sellerUsername: r.seller_username,
      pricePaid: r.price_points,
      createdAt: r.created_at
    }))
  )
})

// GET /api/marketplace/sales — seller's own sales history
marketplace.get('/sales', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, l.title, u.username as buyer_username
     FROM marketplace_purchases p
     JOIN marketplace_listings l ON l.id = p.listing_id
     JOIN users u ON u.id = p.buyer_id
     WHERE p.seller_id = ? ORDER BY p.created_at DESC`
  ).bind(userId).all<any>()

  return c.json(
    results.map((r: any) => ({
      id: r.id,
      listingId: r.listing_id,
      title: r.title,
      buyerUsername: r.buyer_username,
      pricePaid: r.price_points,
      earned: r.seller_earned_points,
      platformFee: r.platform_fee_points,
      createdAt: r.created_at
    }))
  )
})

// GET /api/marketplace/download/:purchaseId — purchase-gated file streaming.
// Never a public R2 URL: this route verifies the requester is the buyer or
// seller on that exact purchase row before touching R2 at all.
marketplace.get('/download/:purchaseId', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const purchaseId = c.req.param('purchaseId')

  const purchase = await c.env.DB.prepare('SELECT * FROM marketplace_purchases WHERE id = ?')
    .bind(purchaseId).first<MarketplacePurchaseRow>()
  if (!purchase) return c.json({ error: 'Purchase not found' }, 404)
  if (purchase.buyer_id !== userId && purchase.seller_id !== userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?')
    .bind(purchase.listing_id).first<MarketplaceListingRow>()
  if (!listing || !listing.file_key) return c.json({ error: 'File no longer available' }, 404)

  const object = await c.env.MARKETPLACE_BUCKET.get(listing.file_key)
  if (!object) return c.json({ error: 'File no longer available' }, 404)

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${(listing.file_name || 'template.zip').replace(/"/g, '')}"`,
      'Content-Length': String(object.size)
    }
  })
})

// ── Admin moderation queue ────────────────────────────────────────────
// GET /api/marketplace/admin/pending
marketplace.get('/admin/pending', authMiddleware, adminOnly, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, u.username as seller_username FROM marketplace_listings l
     JOIN users u ON u.id = l.seller_id WHERE l.status = 'pending' ORDER BY l.created_at ASC`
  ).all<any>()
  return c.json(
    results.map((r: any) => serializeListing(r, { sellerUsername: r.seller_username, isAdminView: true }))
  )
})

// POST /api/marketplace/admin/listings/:id/approve
marketplace.post('/admin/listings/:id/approve', authMiddleware, adminOnly, async (c) => {
  const id = c.req.param('id')
  const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first<MarketplaceListingRow>()
  if (!listing) return c.json({ error: 'Listing not found' }, 404)
  if (!listing.file_key) return c.json({ error: 'Cannot approve a listing with no uploaded file' }, 400)

  await c.env.DB.prepare(
    "UPDATE marketplace_listings SET status = 'approved', rejection_reason = NULL, updated_at = ? WHERE id = ?"
  ).bind(new Date().toISOString(), id).run()
  return c.json({ success: true })
})

// POST /api/marketplace/admin/listings/:id/reject  { reason }
marketplace.post('/admin/listings/:id/reject', authMiddleware, adminOnly, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : ''
  if (!reason) return c.json({ error: 'A rejection reason is required' }, 400)

  const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first<MarketplaceListingRow>()
  if (!listing) return c.json({ error: 'Listing not found' }, 404)

  await c.env.DB.prepare(
    "UPDATE marketplace_listings SET status = 'rejected', rejection_reason = ?, updated_at = ? WHERE id = ?"
  ).bind(reason, new Date().toISOString(), id).run()
  return c.json({ success: true })
})

export default marketplace
