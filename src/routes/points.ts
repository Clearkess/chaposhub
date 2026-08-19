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

const ACTION_META: Record<string, { icon: string; color: string; type: string; title: string }> = {
  download: { icon: '🧾', color: 'rgba(249,115,22,0.15)', type: 'receipt', title: 'Receipt Downloaded' },
  print: { icon: '🖨️', color: 'rgba(34,197,94,0.15)', type: 'receipt', title: 'Receipt Printed' },
  email: { icon: '📧', color: 'rgba(34,197,94,0.15)', type: 'email', title: 'Email Sent' },
  link: { icon: '🔗', color: 'rgba(59,130,246,0.15)', type: 'link', title: 'Short Link' },
  ai: { icon: '🤖', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Reply' },
  support: { icon: '🛟', color: 'rgba(59,130,246,0.15)', type: 'support', title: 'Support Page' },
  ai_content: { icon: '✍️', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Content' },
  ai_social: { icon: '📱', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Social Caption' },
  ai_product: { icon: '🛍️', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Product Description' },
  ai_email: { icon: '📧', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Email' },
  ai_rewrite: { icon: '🔄', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Rewrite' },
  ai_chat: { icon: '🧠', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Chat' },
  ai_longform: { icon: '📄', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Long-Form Content' },
  ai_code: { icon: '💻', color: 'rgba(139,92,246,0.15)', type: 'ai', title: 'AI Coding Assistant' },
  opay_receipt: { icon: '🟢', color: 'rgba(29,198,119,0.15)', type: 'opay', title: 'OPay Receipt' }
}

// Deduct points for action
points.post('/deduct', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { amount, action, description } = body

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
  const meta = ACTION_META[action] || { icon: '📋', color: 'rgba(99,102,241,0.15)', type: action, title: action }

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET points = ? WHERE id = ?').bind(newBalance, userId),
    c.env.DB.prepare(
      `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
       VALUES (?, ?, 'deduction', ?, ?, ?, ?, ?)`
    ).bind(generateId('ptx'), userId, -amount, newBalance, `${amount} points deducted for ${action}`, action, now),
    c.env.DB.prepare(
      `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(generateId('act'), userId, meta.type, meta.title, description || `-${amount} pts`, meta.icon, meta.color, now)
  ])

  return c.json({
    success: true,
    deducted: amount,
    action,
    remaining: newBalance,
    message: `${amount} points deducted for ${action}`
  })
})

// Purchase points via Stripe (legacy/optional path). Real purchases go
// through the Whop checkout links (see WHOP_CHECKOUT_URLS on the frontend)
// and are credited by /api/webhooks/whop, NOT this endpoint.
//
// IMPORTANT: this endpoint intentionally does NOT have a "mock mode" that
// credits points without a real payment. It previously did (dev/demo
// convenience), which meant any authenticated user could call this route
// directly and receive free points with zero payment. That branch has been
// removed. If STRIPE_SECRET_KEY is not configured, this route is simply
// disabled rather than silently granting free points.
points.post('/purchase', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const { packageId } = body

  const pkg = PACKAGES[packageId]
  if (!pkg) {
    return c.json({ error: 'Invalid package' }, 400)
  }

  if (!c.env.STRIPE_SECRET_KEY) {
    return c.json({
      error: 'Card checkout is not available right now. Please use the Whop checkout link instead.',
    }, 501)
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
