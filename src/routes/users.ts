import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, UserRow, ActivityRow } from '../lib/types'

const users = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

// Get user profile
users.get('/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId).first<UserRow>()

  if (!user) return c.json({ error: 'User not found' }, 404)

  return c.json({
    id: user.id,
    username: user.username,
    email: user.email,
    points: user.points,
    country: user.country,
    receiptsGenerated: user.receipts_generated,
    memberSince: user.created_at,
    referralCode: user.referral_code
  })
})

// Update profile
users.patch('/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { username, country } = body

  const updates: string[] = []
  const values: any[] = []

  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 20) {
      return c.json({ error: 'Validation failed', details: 'username must be 3-20 chars' }, 400)
    }
    updates.push('username = ?')
    values.push(username.trim())
  }
  if (country !== undefined) {
    if (typeof country !== 'string' || country.length !== 2) {
      return c.json({ error: 'Validation failed', details: 'country must be a 2-letter code' }, 400)
    }
    updates.push('country = ?')
    values.push(country.toUpperCase())
  }

  if (updates.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400)
  }

  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(userId)

  try {
    await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values).run()
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ error: 'Username already taken' }, 409)
    }
    throw e
  }

  return c.json({ success: true, message: 'Profile updated' })
})

// Get user history (activity feed)
users.get('/history', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(userId).all<ActivityRow>()

  return c.json(results.map((a) => ({
    type: a.type,
    title: a.title,
    desc: a.description,
    icon: a.icon,
    color: a.color,
    time: a.created_at
  })))
})

export default users
