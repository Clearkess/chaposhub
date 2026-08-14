import { Hono } from 'hono'
import { generateId } from '../lib/crypto'
import type { Bindings, AppVariables, UserRow } from '../lib/types'

const webhooks = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

// Maximum allowed skew (seconds) between webhook-timestamp and "now",
// per Whop/Standard-Webhooks replay-attack guidance.
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60

// Plan -> points mapping. Only WHOP_STARTER_PLAN_ID is wired for now;
// add more `env.WHOP_..._PLAN_ID` bindings + entries here as new plans ship.
function resolvePlanPoints(planId: string | undefined, env: Bindings): number {
  if (!planId) return 0
  if (env.WHOP_STARTER_PLAN_ID && planId === env.WHOP_STARTER_PLAN_ID) return 1000
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
  // base64-encode the raw signature bytes
  let binary = ''
  const bytes = new Uint8Array(sigBuf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
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

async function logWebhookEvent(
  env: Bindings,
  webhookId: string,
  eventType: string,
  status: 'processed' | 'ignored' | 'error',
  detail: string
) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO webhook_events (id, source, event_type, status, detail, received_at)
     VALUES (?, 'whop', ?, ?, ?, ?)`
  ).bind(webhookId, eventType, status, detail, new Date().toISOString()).run()
}

// POST /api/webhooks/whop
// Public endpoint (no JWT) — authenticity is established via the Whop
// Standard-Webhooks HMAC signature instead of a bearer token.
webhooks.post('/whop', async (c) => {
  const env = c.env

  if (!env.WHOP_WEBHOOK_SECRET) {
    // Misconfiguration: don't 200 (Whop would treat that as delivered/fine),
    // but don't leak details either.
    console.error('WHOP_WEBHOOK_SECRET is not configured')
    return c.json({ error: 'Webhook not configured' }, 500)
  }

  const webhookId = c.req.header('webhook-id')
  const webhookTimestamp = c.req.header('webhook-timestamp')
  const webhookSignature = c.req.header('webhook-signature')

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return c.json({ error: 'Missing webhook headers' }, 400)
  }

  // Replay protection: reject requests whose timestamp has drifted too far
  // from "now" (in either direction) before doing any signature math.
  const tsNum = parseInt(webhookTimestamp, 10)
  if (!Number.isFinite(tsNum)) {
    return c.json({ error: 'Invalid webhook-timestamp' }, 400)
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - tsNum) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return c.json({ error: 'Webhook timestamp outside allowed tolerance' }, 400)
  }

  // Must verify against the RAW body bytes — reading as text (not parsing
  // JSON first) preserves exact byte-for-byte content for the HMAC check.
  const rawBody = await c.req.text()

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const expectedSig = await hmacSha256Base64(env.WHOP_WEBHOOK_SECRET, signedContent)

  // webhook-signature can contain multiple space-delimited "v1,<base64>"
  // entries (for zero-downtime secret rotation) — accept if ANY match.
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
    return c.json({ error: 'Signature verification failed' }, 401)
  }

  let payload: WhopWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  // Idempotency: Whop redelivers the same webhook-id on retry. If we've
  // already recorded this id, acknowledge without redoing any work.
  const existing = await env.DB.prepare('SELECT id FROM webhook_events WHERE id = ?')
    .bind(webhookId).first()
  if (existing) {
    return c.json({ received: true, duplicate: true }, 200)
  }

  if (payload.type !== 'payment.succeeded') {
    await logWebhookEvent(env, webhookId, payload.type || 'unknown', 'ignored', 'Event type not handled')
    return c.json({ received: true, handled: false }, 200)
  }

  const data = payload.data
  const whopPaymentId = data?.id
  const planId = data?.plan?.id
  const buyerEmailRaw = data?.user?.email
  const amountTotal = typeof data?.total === 'number' ? data.total : (typeof data?.subtotal === 'number' ? data.subtotal : null)
  const currency = data?.currency || null

  if (!whopPaymentId || !buyerEmailRaw) {
    await logWebhookEvent(env, webhookId, payload.type, 'error', 'Missing payment id or buyer email in payload')
    return c.json({ received: true, handled: false, error: 'Malformed payment payload' }, 200)
  }

  const buyerEmail = buyerEmailRaw.toLowerCase().trim()
  const pointsToCredit = resolvePlanPoints(planId, env)

  // Reserve the payment id FIRST via a unique-constraint insert. This is
  // the authoritative double-credit guard: if two requests for the same
  // Whop payment race, only one INSERT can win.
  const whopPaymentRowId = generateId('whoppay')
  try {
    await env.DB.prepare(
      `INSERT INTO whop_payments (id, whop_payment_id, whop_plan_id, buyer_email, amount_total, currency, points_credited, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?)`
    ).bind(whopPaymentRowId, whopPaymentId, planId || 'unknown', buyerEmail, amountTotal, currency, new Date().toISOString()).run()
  } catch (err: any) {
    // UNIQUE constraint violation on whop_payment_id => already processed.
    await logWebhookEvent(env, webhookId, payload.type, 'ignored', `Duplicate payment ${whopPaymentId}`)
    return c.json({ received: true, duplicate: true }, 200)
  }

  if (pointsToCredit <= 0) {
    await env.DB.prepare('UPDATE whop_payments SET status = ? WHERE id = ?')
      .bind('unknown_plan', whopPaymentRowId).run()
    await logWebhookEvent(env, webhookId, payload.type, 'ignored', `Unrecognized plan id: ${planId || 'none'}`)
    return c.json({ received: true, handled: false, reason: 'unrecognized_plan' }, 200)
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(buyerEmail).first<UserRow>()

  if (!user) {
    await env.DB.prepare('UPDATE whop_payments SET status = ? WHERE id = ?')
      .bind('unmatched_email', whopPaymentRowId).run()
    await logWebhookEvent(env, webhookId, payload.type, 'processed', `Payment succeeded for ${buyerEmail} but no matching Chapo'sHub account exists`)
    return c.json({ received: true, handled: false, reason: 'no_matching_account' }, 200)
  }

  const newBalance = user.points + pointsToCredit
  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare('UPDATE users SET points = ? WHERE id = ?').bind(newBalance, user.id),
    env.DB.prepare(
      `INSERT INTO points_transactions (id, user_id, type, amount, balance, description, action, payment_method, payment_id, created_at)
       VALUES (?, ?, 'purchase', ?, ?, ?, 'purchase', 'whop', ?, ?)`
    ).bind(generateId('ptx'), user.id, pointsToCredit, newBalance, `Purchased ${pointsToCredit.toLocaleString()} points via Whop`, whopPaymentId, now),
    env.DB.prepare(
      `INSERT INTO activities (id, user_id, type, title, description, icon, color, created_at)
       VALUES (?, ?, 'purchase', 'Points Purchase', ?, '💎', 'rgba(249,115,22,0.15)', ?)`
    ).bind(generateId('act'), user.id, `${pointsToCredit.toLocaleString()} pts via Whop`, now),
    env.DB.prepare('UPDATE whop_payments SET user_id = ?, points_credited = ?, status = ? WHERE id = ?')
      .bind(user.id, pointsToCredit, 'credited', whopPaymentRowId)
  ])

  await logWebhookEvent(env, webhookId, payload.type, 'processed', `Credited ${pointsToCredit} points to user ${user.id} (${buyerEmail})`)

  return c.json({ received: true, handled: true, creditedPoints: pointsToCredit }, 200)
})

export default webhooks
