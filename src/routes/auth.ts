import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { hashPassword, verifyPassword, generateId, generateReferralCode } from '../lib/crypto'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, UserRow } from '../lib/types'

const auth = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

async function generateToken(userId: string, role: string, secret: string) {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    { userId, role, iat: now, exp: now + 7 * 24 * 60 * 60 }, // 7 days
    secret
  )
}

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
    memberSince: u.created_at
  }
}

// Register
auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { username, email, password } = body

  if (!username || !USERNAME_RE.test(username)) {
    return c.json({ error: 'Validation failed', details: 'Username must be 3-20 alphanumeric/underscore characters' }, 400)
  }
  if (!email || !EMAIL_RE.test(email)) {
    return c.json({ error: 'Validation failed', details: 'Valid email required' }, 400)
  }
  if (!password || password.length < 8) {
    return c.json({ error: 'Validation failed', details: 'Password must be at least 8 characters' }, 400)
  }

  const normalizedEmail = String(email).toLowerCase().trim()

  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ? OR username = ?'
  ).bind(normalizedEmail, username).first()

  if (existing) {
    return c.json({ error: 'Email or username already registered' }, 409)
  }

  const userId = generateId('user')
  const passwordHash = await hashPassword(password)
  const referralCode = generateReferralCode(username)
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO users (id, username, email, password_hash, points, country, role, referral_code, last_login, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(userId, username, normalizedEmail, passwordHash, 245, 'KE', 'user', referralCode, now, now, now).run()

  await c.env.DB.prepare(
    `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, created_at)
     VALUES (?, ?, 'bonus', 245, 245, 'Welcome bonus', ?)`
  ).bind(generateId('ptx'), userId, now).run()

  await c.env.DB.prepare(
    `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
     VALUES (?, ?, 'login', 'Account Created', 'Welcome to Chapo''sHub!', '🎉', 'rgba(34,197,94,0.15)', ?)`
  ).bind(generateId('act'), userId, now).run()

  const token = await generateToken(userId, 'user', c.env.JWT_SECRET)

  return c.json({
    token,
    user: { id: userId, username, email: normalizedEmail, points: 245, country: 'KE', role: 'user', referralCode }
  }, 201)
})

// Login
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { email, password } = body

  if (!email || !EMAIL_RE.test(email)) {
    return c.json({ error: 'Validation failed', details: 'Valid email required' }, 400)
  }
  if (!password) {
    return c.json({ error: 'Validation failed', details: 'Password required' }, 400)
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(normalizedEmail).first<UserRow>()

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  await c.env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
    .bind(new Date().toISOString(), user.id).run()

  const token = await generateToken(user.id, user.role, c.env.JWT_SECRET)

  return c.json({ token, user: publicUser(user) })
})

// Current user
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId).first<UserRow>()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ user: publicUser(user) })
})

export default auth
