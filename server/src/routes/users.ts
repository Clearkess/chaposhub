// Ported from src/routes/users.ts (Hono/D1 version) to Express/better-sqlite3.
import { Router } from 'express'
import db from '../db/index.js'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'
import type { UserRow, ActivityRow } from '../lib/types.js'

const router = Router()

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined

  if (!user) return res.status(404).json({ error: 'User not found' })

  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    points: user.points,
    country: user.country,
    receiptsGenerated: user.receipts_generated,
    memberSince: user.created_at,
    referralCode: user.referral_code,
    whatsapp: user.whatsapp,
    isVendor: !!user.is_vendor
  })
})

// Update profile
router.patch('/profile', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const { username, country, whatsapp } = body

  const updates: string[] = []
  const values: any[] = []

  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 20) {
      return res.status(400).json({ error: 'Validation failed', details: 'username must be 3-20 chars' })
    }
    updates.push('username = ?')
    values.push(username.trim())
  }
  if (country !== undefined) {
    if (typeof country !== 'string' || country.length !== 2) {
      return res.status(400).json({ error: 'Validation failed', details: 'country must be a 2-letter code' })
    }
    updates.push('country = ?')
    values.push(country.toUpperCase())
  }
  // WhatsApp number — used for P2P vendor/buyer order-coordination
  // notifications only. Blank string clears it; omit the field to leave
  // it untouched.
  if (whatsapp !== undefined) {
    const trimmed = typeof whatsapp === 'string' ? whatsapp.trim() : ''
    if (trimmed && !/^\+?[0-9\s-]{7,20}$/.test(trimmed)) {
      return res.status(400).json({ error: 'Validation failed', details: 'WhatsApp number format looks invalid' })
    }
    updates.push('whatsapp = ?')
    values.push(trimmed || null)
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(userId)

  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already taken' })
    }
    throw e
  }

  return res.json({ success: true, message: 'Profile updated' })
})

// Get user history (activity feed)
router.get('/history', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const results = db.prepare(
    'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(userId) as ActivityRow[]

  return res.json(results.map((a) => ({
    type: a.type,
    title: a.title,
    desc: a.description,
    icon: a.icon,
    color: a.color,
    time: a.created_at
  })))
})

export default router
