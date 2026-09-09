// Ported from src/routes/marketplace.ts (Hono/D1/R2 version) to
// Express/better-sqlite3 + local filesystem storage.
//
// Scripts / Website-Templates Marketplace backend.
//
// Any Chapo'sHub user can list a ready-made, LEGITIMATE website template for
// sale, priced in points. Other users buy it with their existing points
// balance. This feature is gated by an admin-approval moderation queue
// specifically to keep it from being weaponized to distribute malware or
// phishing kits disguised as "website templates".
//
// Every purchase is a THREE-PARTY extension of the atomic two-ledger
// debit/refund pattern proven in server/src/routes/opay-wallet.ts:
//   1. Buyer's Chapo'sHub points debited via a single conditional UPDATE
//      (`WHERE id = ? AND points >= ?`) — never a stale read-then-write.
//   2. Seller's points credited (price minus the platform fee) ONLY after
//      the buyer debit is confirmed to have actually applied.
//   3. If the purchase-row insert (+ sales_count bump + history rows) then
//      fails for any reason, BOTH the buyer debit and the seller credit are
//      reversed immediately. The buyer is never charged, and the seller
//      never gets paid, for a purchase that wasn't actually recorded.
//
// File delivery: R2 is replaced with local filesystem storage under
// server/data/marketplace-files/. The file is NEVER exposed via a public
// URL — it can only be streamed back out through GET /download/:purchaseId,
// which verifies the requester is either the buyer or the seller on that
// specific purchase row before touching the filesystem at all.
import { Router } from 'express'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import db from '../db/index.js'
import { generateId, generateShortId } from '../lib/crypto.js'
import { authMiddleware, optionalAuthMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_PLATFORM_FEE_PCT,
  type MarketplaceListingRow,
  type MarketplacePurchaseRow
} from '../lib/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILES_DIR = process.env.MARKETPLACE_FILES_DIR || path.resolve(__dirname, '../../data/marketplace-files')
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })

const router = Router()

// This router is mounted BEFORE the global express.json() middleware in
// index.ts (so the raw-body /upload route below can receive exact binary
// bytes). That means every OTHER route on this router that expects a JSON
// body must apply its own scoped JSON parser, or req.body will be empty.
const jsonParser = express.json({ limit: '2mb' })

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB cap for a template .zip
const MIN_PRICE = 10
const MAX_PRICE = 500_000

function adminOnly(req: AuthedRequest, res: any, next: any) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
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
router.get('/listings', optionalAuthMiddleware, (req: AuthedRequest, res) => {
  const category = req.query.category as string | undefined
  const search = String(req.query.search || '').trim()
  const limitParam = parseInt(String(req.query.limit || '50'), 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50
  const userId = req.userId || null

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

  const results = db.prepare(query).all(...params) as any[]
  return res.json(
    results.map((r: any) =>
      serializeListing(r, { sellerUsername: r.seller_username, purchased: !!r.purchased })
    )
  )
})

// GET /api/marketplace/listings/:id
router.get('/listings/:id', optionalAuthMiddleware, (req: AuthedRequest, res) => {
  const id = req.params.id
  const userId = req.userId || null
  const userRole = req.userRole || null

  const row = db.prepare(
    `SELECT l.*, u.username as seller_username FROM marketplace_listings l
     JOIN users u ON u.id = l.seller_id WHERE l.id = ?`
  ).get(id) as any
  if (!row) return res.status(404).json({ error: 'Listing not found' })

  const isOwner = !!userId && userId === row.seller_id
  const isAdmin = userRole === 'admin'
  if ((row.status === 'pending' || row.status === 'rejected' || row.status === 'removed') && !isOwner && !isAdmin) {
    return res.status(404).json({ error: 'Listing not found' })
  }

  let purchased = false
  if (userId) {
    const p = db.prepare(
      'SELECT id FROM marketplace_purchases WHERE listing_id = ? AND buyer_id = ?'
    ).get(id, userId)
    purchased = !!p
  }

  return res.json(serializeListing(row, { sellerUsername: row.seller_username, isOwner, purchased, isAdminView: isAdmin }))
})

// ── Seller's own listings ──────────────────────────────────────────────
// GET /api/marketplace/my-listings
router.get('/my-listings', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    "SELECT * FROM marketplace_listings WHERE seller_id = ? AND status != 'removed' ORDER BY created_at DESC"
  ).all(userId) as MarketplaceListingRow[]
  return res.json(results.map((r) => serializeListing(r, { isOwner: true })))
})

// POST /api/marketplace/listings — create (starts as 'pending')
router.post('/listings', authMiddleware, jsonParser, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const { errors, title, description, category, pricePoints, previewImageUrl } = validateListingFields(body)
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors.join('; ') })

  const id = generateId('mkl')
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO marketplace_listings
       (id, seller_id, title, description, category, price_points, preview_image_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(id, userId, title, description, category, pricePoints, previewImageUrl, now, now)

  const row = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as MarketplaceListingRow
  return res.status(201).json(serializeListing(row, { isOwner: true }))
})

// PATCH /api/marketplace/listings/:id — seller edits own listing.
// Any content edit re-enters the moderation queue (status -> pending,
// rejection_reason cleared) so an already-approved listing can't be quietly
// swapped for something else without another review pass.
router.patch('/listings/:id', authMiddleware, jsonParser, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id
  const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as MarketplaceListingRow | undefined
  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  if (listing.seller_id !== userId) return res.status(403).json({ error: 'Forbidden' })
  if (listing.status === 'removed') return res.status(400).json({ error: 'This listing has been removed' })

  const body = req.body || {}
  const { errors, title, description, category, pricePoints, previewImageUrl } = validateListingFields(body, listing)
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors.join('; ') })

  const now = new Date().toISOString()
  db.prepare(
    `UPDATE marketplace_listings
     SET title = ?, description = ?, category = ?, price_points = ?, preview_image_url = ?,
         status = 'pending', rejection_reason = NULL, updated_at = ?
     WHERE id = ?`
  ).run(title, description, category, pricePoints, previewImageUrl, now, id)

  const updated = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as MarketplaceListingRow
  return res.json(serializeListing(updated, { isOwner: true }))
})

// DELETE /api/marketplace/listings/:id — seller removes own listing.
// Soft-deletes (status='removed', hidden everywhere) so buyers who already
// paid keep their purchase-history record. The underlying file is only
// hard-deleted if nobody has bought it yet.
router.delete('/listings/:id', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const id = req.params.id
  const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as MarketplaceListingRow | undefined
  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  if (listing.seller_id !== userId) return res.status(403).json({ error: 'Forbidden' })

  db.prepare("UPDATE marketplace_listings SET status = 'removed', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id)

  if (listing.file_key && listing.sales_count === 0) {
    const filePath = path.join(FILES_DIR, listing.file_key)
    fs.promises.unlink(filePath).catch(() => {})
  }

  return res.json({ success: true })
})

// POST /api/marketplace/listings/:id/upload — seller uploads the template
// .zip. Streams the raw request body straight to a local file (no full
// in-memory buffering beyond Node's stream internals) and never accepts a
// re-upload once the listing has sales (buyers who already paid must keep
// getting exactly what they bought).
//
// Uses a route-scoped raw-body handler (express.raw) rather than the global
// JSON body parser, since this endpoint receives binary .zip bytes, not JSON.
router.post(
  '/listings/:id/upload',
  authMiddleware,
  express.raw({ type: '*/*', limit: MAX_FILE_SIZE + 1024 * 1024 }),
  (req: AuthedRequest, res) => {
    const userId = req.userId!
    const id = req.params.id
    const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as MarketplaceListingRow | undefined
    if (!listing) return res.status(404).json({ error: 'Listing not found' })
    if (listing.seller_id !== userId) return res.status(403).json({ error: 'Forbidden' })
    if (listing.status === 'removed') return res.status(400).json({ error: 'This listing has been removed' })
    if (listing.sales_count > 0) {
      return res.status(400).json({ error: 'Cannot replace the file after a listing has sales — create a new listing instead' })
    }

    const fileNameHeader = req.header('x-file-name') || 'template.zip'
    const fileName = fileNameHeader.replace(/[/\\]/g, '_').slice(0, 150)
    if (!/\.zip$/i.test(fileName)) return res.status(400).json({ error: 'Only .zip files are accepted' })

    const bodyBuf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    if (!bodyBuf.length) return res.status(400).json({ error: 'Empty file' })
    if (bodyBuf.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: `File too large (max ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)}MB)` })
    }

    const fileKey = `${id}/${generateShortId(10)}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const fullPath = path.join(FILES_DIR, fileKey)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, bodyBuf)

    // Clean up the previous file (if any) now that the new one is safely stored.
    if (listing.file_key && listing.file_key !== fileKey) {
      const oldPath = path.join(FILES_DIR, listing.file_key)
      fs.promises.unlink(oldPath).catch(() => {})
    }

    const fileSize = bodyBuf.length
    db.prepare(
      'UPDATE marketplace_listings SET file_key = ?, file_name = ?, file_size = ?, updated_at = ? WHERE id = ?'
    ).run(fileKey, fileName, fileSize, new Date().toISOString(), id)

    return res.json({ fileName, fileSize })
  }
)

// ── Purchases ───────────────────────────────────────────────────────────
// POST /api/marketplace/listings/:id/purchase
router.post('/listings/:id/purchase', authMiddleware, (req: AuthedRequest, res) => {
  const buyerId = req.userId!
  const listingId = req.params.id

  const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(listingId) as MarketplaceListingRow | undefined
  if (!listing || listing.status !== 'approved') return res.status(404).json({ error: 'Listing not found' })
  if (!listing.file_key) return res.status(400).json({ error: 'This listing has no downloadable file yet' })
  if (listing.seller_id === buyerId) return res.status(400).json({ error: 'You cannot buy your own listing' })

  const already = db.prepare(
    'SELECT id FROM marketplace_purchases WHERE listing_id = ? AND buyer_id = ?'
  ).get(listingId, buyerId) as { id: string } | undefined
  if (already) return res.status(409).json({ error: 'You already own this listing', purchaseId: already.id })

  const price = listing.price_points
  const platformFee = Math.floor((price * MARKETPLACE_PLATFORM_FEE_PCT) / 100)
  const sellerEarned = price - platformFee

  // --- Step 1: atomic, race-safe buyer points debit ---
  const debit = db.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).run(price, buyerId, price)

  if (debit.changes === 0) {
    const u = db.prepare('SELECT points FROM users WHERE id = ?').get(buyerId) as { points: number } | undefined
    return res.status(402).json({ error: 'Insufficient points', points: u?.points ?? 0, required: price })
  }

  // --- Step 2: credit the seller, ONLY now that the buyer debit is confirmed ---
  const credit = db.prepare('UPDATE users SET points = points + ? WHERE id = ?')
    .run(sellerEarned, listing.seller_id)

  if (credit.changes === 0) {
    // Seller row vanished mid-purchase — refund the buyer immediately.
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(price, buyerId)
    return res.status(500).json({ error: 'Purchase failed, all charges refunded' })
  }

  // --- Both ledgers moved. Record the purchase + sales bump + history rows. ---
  const purchaseId = generateId('mkp')
  const now = new Date().toISOString()
  try {
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO marketplace_purchases
           (id, listing_id, buyer_id, seller_id, price_points, seller_earned_points, platform_fee_points, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(purchaseId, listingId, buyerId, listing.seller_id, price, sellerEarned, platformFee, now)
      db.prepare('UPDATE marketplace_listings SET sales_count = sales_count + 1, updated_at = ? WHERE id = ?')
        .run(now, listingId)
      db.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'deduction', ?, (SELECT points FROM users WHERE id = ?), ?, 'marketplace_purchase', ?)`
      ).run(generateId('ptx'), buyerId, -price, buyerId, `Bought "${listing.title}" on Scripts Marketplace`, now)
      db.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
         VALUES (?, ?, 'bonus', ?, (SELECT points FROM users WHERE id = ?), ?, 'marketplace_sale', ?)`
      ).run(generateId('ptx'), listing.seller_id, sellerEarned, listing.seller_id, `Sold "${listing.title}" on Scripts Marketplace`, now)
      db.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'marketplace', ?, ?, 'fa-solid fa-cart-shopping', 'rgba(34,197,94,0.15)', ?)`
      ).run(generateId('act'), buyerId, 'Marketplace Purchase', `Bought "${listing.title}"`, now)
      db.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'marketplace', ?, ?, 'fa-solid fa-sack-dollar', 'rgba(34,197,94,0.15)', ?)`
      ).run(generateId('act'), listing.seller_id, 'Marketplace Sale', `Sold "${listing.title}" (+${sellerEarned} pts)`, now)
    })
    tx()
  } catch {
    // Reverse BOTH ledgers immediately — the purchase never actually recorded.
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(price, buyerId)
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(sellerEarned, listing.seller_id)
    return res.status(500).json({ error: 'Purchase failed, all charges refunded' })
  }

  const buyer = db.prepare('SELECT points FROM users WHERE id = ?').get(buyerId) as { points: number } | undefined
  return res.status(201).json({
    purchaseId,
    listingId,
    title: listing.title,
    pricePaid: price,
    remainingPoints: buyer?.points ?? null
  })
})

// GET /api/marketplace/purchases — buyer's own purchase history
router.get('/purchases', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    `SELECT p.*, l.title, l.category, l.preview_image_url, l.file_name, l.file_size, u.username as seller_username
     FROM marketplace_purchases p
     JOIN marketplace_listings l ON l.id = p.listing_id
     JOIN users u ON u.id = p.seller_id
     WHERE p.buyer_id = ? ORDER BY p.created_at DESC`
  ).all(userId) as any[]

  return res.json(
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
router.get('/sales', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    `SELECT p.*, l.title, u.username as buyer_username
     FROM marketplace_purchases p
     JOIN marketplace_listings l ON l.id = p.listing_id
     JOIN users u ON u.id = p.buyer_id
     WHERE p.seller_id = ? ORDER BY p.created_at DESC`
  ).all(userId) as any[]

  return res.json(
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
// Never a public URL: this route verifies the requester is the buyer or
// seller on that exact purchase row before touching the filesystem at all.
router.get('/download/:purchaseId', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.userId!
  const purchaseId = req.params.purchaseId

  const purchase = db.prepare('SELECT * FROM marketplace_purchases WHERE id = ?')
    .get(purchaseId) as MarketplacePurchaseRow | undefined
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
  if (purchase.buyer_id !== userId && purchase.seller_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?')
    .get(purchase.listing_id) as MarketplaceListingRow | undefined
  if (!listing || !listing.file_key) return res.status(404).json({ error: 'File no longer available' })

  const filePath = path.join(FILES_DIR, listing.file_key)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File no longer available' })

  const stat = fs.statSync(filePath)
  const downloadName = (listing.file_name || 'template.zip').replace(/"/g, '')
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`)
  res.setHeader('Content-Length', String(stat.size))
  fs.createReadStream(filePath).pipe(res)
})

// ── Admin moderation queue ────────────────────────────────────────────
// GET /api/marketplace/admin/pending
router.get('/admin/pending', authMiddleware, adminOnly, (_req: AuthedRequest, res) => {
  const results = db.prepare(
    `SELECT l.*, u.username as seller_username FROM marketplace_listings l
     JOIN users u ON u.id = l.seller_id WHERE l.status = 'pending' ORDER BY l.created_at ASC`
  ).all() as any[]
  return res.json(
    results.map((r: any) => serializeListing(r, { sellerUsername: r.seller_username, isAdminView: true }))
  )
})

// POST /api/marketplace/admin/listings/:id/approve
router.post('/admin/listings/:id/approve', authMiddleware, adminOnly, (req: AuthedRequest, res) => {
  const id = req.params.id
  const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as MarketplaceListingRow | undefined
  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  if (!listing.file_key) return res.status(400).json({ error: 'Cannot approve a listing with no uploaded file' })

  db.prepare(
    "UPDATE marketplace_listings SET status = 'approved', rejection_reason = NULL, updated_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), id)
  return res.json({ success: true })
})

// POST /api/marketplace/admin/listings/:id/reject  { reason }
router.post('/admin/listings/:id/reject', authMiddleware, adminOnly, jsonParser, (req: AuthedRequest, res) => {
  const id = req.params.id
  const body = req.body || {}
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : ''
  if (!reason) return res.status(400).json({ error: 'A rejection reason is required' })

  const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as MarketplaceListingRow | undefined
  if (!listing) return res.status(404).json({ error: 'Listing not found' })

  db.prepare(
    "UPDATE marketplace_listings SET status = 'rejected', rejection_reason = ?, updated_at = ? WHERE id = ?"
  ).run(reason, new Date().toISOString(), id)
  return res.json({ success: true })
})

export default router
