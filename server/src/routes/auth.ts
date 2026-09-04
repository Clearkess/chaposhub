// Ported from src/routes/auth.ts (Hono/D1 version) to Express/better-sqlite3.
import { Router } from 'express'
import db from '../db/index.js'
import { hashPassword, verifyPassword, generateId, generateReferralCode } from '../lib/crypto.js'
import { authMiddleware, generateToken, type AuthedRequest } from '../lib/auth-middleware.js'
import type { UserRow } from '../lib/types.js'

const router = Router()

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    points: u.points,
    country: u.country,
    role: u.role,
    receiptsGenerated: u.receipts_generated,
    referralCode: u.referral_code,
    memberSince: u.created_at,
    whatsapp: u.whatsapp,
    isVendor: !!u.is_vendor
  }
}

// Register
router.post('/register', async (req, res) => {
  const body = req.body || {}
  const { username, email, password } = body

  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Validation failed', details: 'Username must be 3-20 alphanumeric/underscore characters' })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Validation failed', details: 'Valid email required' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Validation failed', details: 'Password must be at least 8 characters' })
  }

  const normalizedEmail = String(email).toLowerCase().trim()

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(normalizedEmail, username)
  if (existing) {
    return res.status(409).json({ error: 'Email or username already registered' })
  }

  const userId = generateId('user')
  const passwordHash = await hashPassword(password)
  const referralCode = generateReferralCode(username)
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, points, country, role, referral_code, last_login, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, username, normalizedEmail, passwordHash, 245, 'KE', 'user', referralCode, now, now, now)

  db.prepare(
    `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, created_at)
     VALUES (?, ?, 'bonus', 245, 245, 'Welcome bonus', ?)`
  ).run(generateId('ptx'), userId, now)

  db.prepare(
    `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
     VALUES (?, ?, 'login', 'Account Created', 'Welcome to Chapo''sHub!', '🎉', 'rgba(34,197,94,0.15)', ?)`
  ).run(generateId('act'), userId, now)

  const token = generateToken(userId, 'user')

  return res.status(201).json({
    token,
    user: { id: userId, username, email: normalizedEmail, points: 245, country: 'KE', role: 'user', referralCode }
  })
})

// Login
router.post('/login', async (req, res) => {
  const body = req.body || {}
  const { email, password } = body

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Validation failed', details: 'Valid email required' })
  }
  if (!password) {
    return res.status(400).json({ error: 'Validation failed', details: 'Password required' })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as UserRow | undefined

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id)

  const token = generateToken(user.id, user.role)

  return res.json({ token, user: publicUser(user) })
})

// Current user
router.get('/me', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  return res.json({ user: publicUser(user) })
})

export default router
