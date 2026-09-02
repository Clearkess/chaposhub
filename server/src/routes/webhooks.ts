// Ported from src/routes/webhooks.ts (Hono/Workers version) to Express/Node.
// Web Crypto HMAC is available natively in Node 19+ (globalThis.crypto),
// so this ports close to verbatim; only the raw-body capture mechanism
// differs (Express needs an explicit text() body parser for this route so
// the exact byte content is preserved for the signature check).
import { Router } from 'express'
import express from 'express'
import db from '../db/index.js'
import { generateId } from '../lib/crypto.js'
import type { UserRow } from '../lib/types.js'

const router = Router()

// Maximum allowed skew (seconds) between webhook-timestamp and "now",
// per Whop/Standard-Webhooks replay-attack guidance.
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60

// Plan -> points mapping. Only WHOP_STARTER_PLAN_ID is wired for now;
// add more env vars + entries here as new plans ship.
function resolvePlanPoints(planId: string | undefined): number {
  if (!planId) return 0
  if (process.env.WHOP_STARTER_PLAN_ID && planId === process.env.WHOP_STARTER_PLAN_ID) return 1000
  return 0
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  let binary = ''
  const bytes = new Uint8Array(sigBuf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return Buffer.from(binary, 'binary').toString('base64')
}

// Constant-time string comparison to avoid timing side-channels.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

interface WhopPaymentData {
  id: string
  total?: number
  subtotal?: number
  currency?: string
  plan?: { id: string } | null
  user?: { id?: string; email?: string; username?: string } | null
}

interface WhopWebhookPayload {
  id: string
  type: string
  api_version?: string
  timestamp?: string
  company_id?: string
  data: WhopPaymentData
}

function logWebhookEvent(
  webhookId: string,
  eventType: string,
  status: 'processed' | 'ignored' | 'error',
  detail: string
) {
  db.prepare(
    `INSERT OR IGNORE INTO webhook_events (id, source, event_type, status, detail, received_at)
     VALUES (?, 'whop', ?, ?, ?, ?)`
  ).run(webhookId, eventType, status, detail, new Date().toISOString())
}

// POST /api/webhooks/whop
// Public endpoint (no JWT) — authenticity is established via the Whop
// Standard-Webhooks HMAC signature instead of a bearer token.
// text() body parser (rather than the global json() one) preserves the
// exact raw bytes needed for the HMAC check.
router.post('/whop', express.text({ type: '*/*' }), async (req, res) => {
  if (!process.env.WHOP_WEBHOOK_SECRET) {
    console.error('WHOP_WEBHOOK_SECRET is not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  const webhookId = req.header('webhook-id')
  const webhookTimestamp = req.header('webhook-timestamp')
  const webhookSignature = req.header('webhook-signature')

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return res.status(400).json({ error: 'Missing webhook headers' })
  }

  const tsNum = parseInt(webhookTimestamp, 10)
  if (!Number.isFinite(tsNum)) {
    return res.status(400).json({ error: 'Invalid webhook-timestamp' })
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - tsNum) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return res.status(400).json({ error: 'Webhook timestamp outside allowed tolerance' })
  }

  const rawBody = typeof req.body === 'string' ? req.body : ''

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const expectedSig = await hmacSha256Base64(process.env.WHOP_WEBHOOK_SECRET, signedContent)

  const candidates = webhookSignature.split(' ')
  let verified = false
  for (const candidate of candidates) {
    const [version, sig] = candidate.split(',')
    if (version === 'v1' && sig && timingSafeEqual(sig, expectedSig)) {
      verified = true
      break
    }
  }

  if (!verified) {
    return res.status(401).json({ error: 'Signature verification failed' })
  }

  let payload: WhopWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' })
  }

  const existing = db.prepare('SELECT id FROM webhook_events WHERE id = ?').get(webhookId)
  if (existing) {
    return res.status(200).json({ received: true, duplicate: true })
  }

  if (payload.type !== 'payment.succeeded') {
    logWebhookEvent(webhookId, payload.type || 'unknown', 'ignored', 'Event type not handled')
    return res.status(200).json({ received: true, handled: false })
  }

  const data = payload.data
  const whopPaymentId = data?.id
  const planId = data?.plan?.id
  const buyerEmailRaw = data?.user?.email
  const amountTotal = typeof data?.total === 'number' ? data.total : (typeof data?.subtotal === 'number' ? data.subtotal : null)
  const currency = data?.currency || null

  if (!whopPaymentId || !buyerEmailRaw) {
    logWebhookEvent(webhookId, payload.type, 'error', 'Missing payment id or buyer email in payload')
    return res.status(200).json({ received: true, handled: false, error: 'Malformed payment payload' })
  }

  const buyerEmail = buyerEmailRaw.toLowerCase().trim()
  const pointsToCredit = resolvePlanPoints(planId)

  const whopPaymentRowId = generateId('whoppay')
  try {
    db.prepare(
      `INSERT INTO whop_payments (id, whop_payment_id, whop_plan_id, buyer_email, amount_total, currency, points_credited, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?)`
    ).run(whopPaymentRowId, whopPaymentId, planId || 'unknown', buyerEmail, amountTotal, currency, new Date().toISOString())
  } catch {
    logWebhookEvent(webhookId, payload.type, 'ignored', `Duplicate payment ${whopPaymentId}`)
    return res.status(200).json({ received: true, duplicate: true })
  }

  if (pointsToCredit <= 0) {
    db.prepare('UPDATE whop_payments SET status = ? WHERE id = ?').run('unknown_plan', whopPaymentRowId)
    logWebhookEvent(webhookId, payload.type, 'ignored', `Unrecognized plan id: ${planId || 'none'}`)
    return res.status(200).json({ received: true, handled: false, reason: 'unrecognized_plan' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(buyerEmail) as UserRow | undefined

  if (!user) {
    db.prepare('UPDATE whop_payments SET status = ? WHERE id = ?').run('unmatched_email', whopPaymentRowId)
    logWebhookEvent(webhookId, payload.type, 'processed', `Payment succeeded for ${buyerEmail} but no matching Chapo'sHub account exists`)
    return res.status(200).json({ received: true, handled: false, reason: 'no_matching_account' })
  }

  const newBalance = user.points + pointsToCredit
  const now = new Date().toISOString()

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET points = ? WHERE id = ?').run(newBalance, user.id)
    db.prepare(
      `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, payment_id, created_at)
       VALUES (?, ?, 'purchase', ?, ?, ?, 'purchase', 'whop', ?, ?)`
    ).run(generateId('ptx'), user.id, pointsToCredit, newBalance, `Purchased ${pointsToCredit.toLocaleString()} points via Whop`, whopPaymentId, now)
    db.prepare(
      `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
       VALUES (?, ?, 'purchase', 'Points Purchase', ?, '💎', 'rgba(249,115,22,0.15)', ?)`
    ).run(generateId('act'), user.id, `${pointsToCredit.toLocaleString()} pts via Whop`, now)
    db.prepare('UPDATE whop_payments SET user_id = ?, points_credited = ?, status = ? WHERE id = ?')
      .run(user.id, pointsToCredit, 'credited', whopPaymentRowId)
  })
  tx()

  logWebhookEvent(webhookId, payload.type, 'processed', `Credited ${pointsToCredit} points to user ${user.id} (${buyerEmail})`)

  return res.status(200).json({ received: true, handled: true, creditedPoints: pointsToCredit })
})

export default router
