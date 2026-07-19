import { Hono } from 'hono'
import { generateId } from '../lib/crypto'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, UserRow } from '../lib/types'
import { POINTS_COSTS } from '../lib/types'

const points = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

const VALID_ACTIONS = Object.keys(POINTS_COSTS)

const PACKAGES: Record<string, { points: number; price: number; currency: string }> = {
  starter: { points: 1000, price: 10, currency: 'usd' },
  pro: { points: 5000, price: 45, currency: 'usd' },
  enterprise: { points: 10000, price: 80, currency: 'usd' }
}

// Get points balance
points.get('/balance', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?')
    .bind(userId).first<{ points: number }>()

  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ points: user.points, currency: 'USD' })
})

// Deduct points for action
points.post('/deduct', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { amount, action } = body

  if (!Number.isInteger(amount) || amount < 1) {
    return c.json({ error: 'Validation failed', details: 'amount must be a positive integer' }, 400)
  }
  if (!action || !VALID_ACTIONS.includes(action)) {
    return c.json({ error: 'Validation failed', details: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, 400)
  }

  const user = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?')
    .bind(userId).first<{ points: number }>()

  if (!user) return c.json({ error: 'User not found' }, 404)
  if (user.points < amount) {
    return c.json({ error: 'Insufficient points', points: user.points }, 402)
  }

  const newBalance = user.points - amount
  const now = new Date().toISOString()

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET points = ? WHERE id = ?').bind(newBalance, userId),
    c.env.DB.prepare(
      `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
       VALUES (?, ?, 'deduction', ?, ?, ?, ?, ?)`
    ).bind(generateId('ptx'), userId, -amount, newBalance, `${amount} points deducted for ${action}`, action, now)
  ])

  return c.json({
    success: true,
    deducted: amount,
    action,
    remaining: newBalance,
    message: `${amount} points deducted for ${action}`
  })
})

// Purchase points (Stripe integration, mock if not configured)
points.post('/purchase', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { packageId } = body

  const pkg = PACKAGES[packageId]
  if (!pkg) {
    return c.json({ error: 'Invalid package' }, 400)
  }

  if (!c.env.STRIPE_SECRET_KEY) {
    // Mock mode: credit points immediately for dev/demo
    const user = await c.env.DB.prepare('SELECT points FROM users WHERE id = ?')
      .bind(userId).first<{ points: number }>()
    if (!user) return c.json({ error: 'User not found' }, 404)

    const newBalance = user.points + pkg.points
    const now = new Date().toISOString()

    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE users SET points = ? WHERE id = ?').bind(newBalance, userId),
      c.env.DB.prepare(
        `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, created_at)
         VALUES (?, ?, 'purchase', ?, ?, ?, 'purchase', 'stripe', ?)`
      ).bind(generateId('ptx'), userId, pkg.points, newBalance, `Purchased ${pkg.points} points ($${pkg.price})`, now),
      c.env.DB.prepare(
        `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
         VALUES (?, ?, 'purchase', 'Points Purchase', ?, '💎', 'rgba(249,115,22,0.15)', ?)`
      ).bind(generateId('act'), userId, `${pkg.points.toLocaleString()} pts · $${pkg.price}`, now)
    ])

    return c.json({
      success: true,
      mock: true,
      package: pkg,
      newBalance,
      message: 'Payment intent created (mock mode - Stripe not configured)'
    })
  }

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        amount: String(pkg.price * 100),
        currency: pkg.currency,
        'metadata[userId]': userId,
        'metadata[packageId]': packageId,
        'metadata[points]': String(pkg.points)
      })
    })
    const data: any = await stripeRes.json()
    if (!stripeRes.ok) {
      return c.json({ error: 'Payment intent creation failed', details: data.error?.message }, 500)
    }
    return c.json({
      success: true,
      clientSecret: data.client_secret,
      paymentIntentId: data.id,
      package: pkg
    })
  } catch (error: any) {
    return c.json({ error: 'Payment intent creation failed', details: error.message }, 500)
  }
})

export default points
