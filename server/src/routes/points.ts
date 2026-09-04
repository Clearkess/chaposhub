// Ported from src/routes/points.ts (Hono/D1 version) to Express/better-sqlite3.
// D1 `env.DB.batch([...])` becomes a `db.transaction(() => {...})()` call.
import { Router } from 'express'
import db from '../db/index.js'
import { generateId } from '../lib/crypto.js'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'
import { POINTS_COSTS } from '../lib/types.js'

const router = Router()

const VALID_ACTIONS = Object.keys(POINTS_COSTS)

const PACKAGES: Record<string, { points: number; price: number; currency: string }> = {
  starter: { points: 1000, price: 10, currency: 'usd' },
  pro: { points: 5000, price: 45, currency: 'usd' },
  enterprise: { points: 10000, price: 80, currency: 'usd' }
}

// Get points balance
router.get('/balance', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined

  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ points: user.points, currency: 'USD' })
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
router.post('/deduct', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const { amount, action, description } = body

  if (!Number.isInteger(amount) || amount < 1) {
    return res.status(400).json({ error: 'Validation failed', details: 'amount must be a positive integer' })
  }
  if (!action || !VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'Validation failed', details: `action must be one of: ${VALID_ACTIONS.join(', ')}` })
  }

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined

  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.points < amount) {
    return res.status(402).json({ error: 'Insufficient points', points: user.points })
  }

  const newBalance = user.points - amount
  const now = new Date().toISOString()
  const meta = ACTION_META[action] || { icon: '📋', color: 'rgba(34,197,94,0.15)', type: action, title: action }

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET points = ? WHERE id = ?').run(newBalance, userId)
    db.prepare(
      `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, created_at)
       VALUES (?, ?, 'deduction', ?, ?, ?, ?, ?)`
    ).run(generateId('ptx'), userId, -amount, newBalance, `${amount} points deducted for ${action}`, action, now)
    db.prepare(
      `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(generateId('act'), userId, meta.type, meta.title, description || `-${amount} pts`, meta.icon, meta.color, now)
  })
  tx()

  return res.json({
    success: true,
    deducted: amount,
    action,
    remaining: newBalance,
    message: `${amount} points deducted for ${action}`
  })
})

// Purchase points via Stripe (legacy/optional card-checkout path — not
// currently wired to a live Stripe account). The primary way to buy points
// is now the peer-to-peer marketplace (see server/src/routes/p2p.ts), where
// any vendor can sell points directly to another user at a rate they set.
//
// IMPORTANT: this endpoint intentionally does NOT have a "mock mode" that
// credits points without a real payment. If STRIPE_SECRET_KEY is not
// configured, this route is simply disabled rather than silently granting
// free points.
router.post('/purchase', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const body = req.body || {}
  const { packageId } = body

  const pkg = PACKAGES[packageId]
  if (!pkg) {
    return res.status(400).json({ error: 'Invalid package' })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({
      error: 'Card checkout is not available right now. Please use the P2P points marketplace instead.'
    })
  }

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
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
      return res.status(500).json({ error: 'Payment intent creation failed', details: data.error?.message })
    }
    return res.json({
      success: true,
      clientSecret: data.client_secret,
      paymentIntentId: data.id,
      package: pkg
    })
  } catch (error: any) {
    return res.status(500).json({ error: 'Payment intent creation failed', details: error.message })
  }
})

export default router
