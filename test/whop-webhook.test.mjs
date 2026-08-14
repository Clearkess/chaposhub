// Local test harness for the Whop webhook handler at POST /api/webhooks/whop.
//
// Signs synthetic payloads exactly the way Whop (Standard Webhooks spec) does:
//   signed_content = `${webhookId}.${webhookTimestamp}.${rawBody}`
//   signature      = base64(HMAC_SHA256(secret, signed_content))
//   header value   = `v1,${signature}`
//
// Run with: node test/whop-webhook.test.mjs
// Requires the local dev server running on http://localhost:3000
// and WHOP_WEBHOOK_SECRET in .dev.vars to equal TEST_SECRET below.

import crypto from 'node:crypto'

const BASE_URL = 'http://localhost:3000'
const TEST_SECRET = 'whsec_test_local_dev_only_not_the_real_secret'
const STARTER_PLAN_ID = 'plan_DZtaB5bXDuHOm'

let passed = 0
let failed = 0

function sign(secret, webhookId, timestamp, rawBody) {
  const signedContent = `${webhookId}.${timestamp}.${rawBody}`
  const sig = crypto.createHmac('sha256', secret).update(signedContent).digest('base64')
  return `v1,${sig}`
}

async function sendWebhook({
  body,
  webhookId = `msg_${crypto.randomUUID()}`,
  timestamp = Math.floor(Date.now() / 1000),
  secret = TEST_SECRET,
  signatureOverride = null,
}) {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body)
  const signature = signatureOverride ?? sign(secret, webhookId, timestamp, rawBody)
  const res = await fetch(`${BASE_URL}/api/webhooks/whop`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': webhookId,
      'webhook-timestamp': String(timestamp),
      'webhook-signature': signature,
    },
    body: rawBody,
  })
  let json = null
  try { json = await res.json() } catch { /* ignore */ }
  return { status: res.status, json, webhookId }
}

function makePaymentPayload({ id, planId = STARTER_PLAN_ID, email = 'buyer@example.com' }) {
  return {
    id: `evt_${crypto.randomUUID()}`,
    type: 'payment.succeeded',
    api_version: '2024-01-01',
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      id,
      total: 10,
      subtotal: 10,
      currency: 'usd',
      plan: { id: planId },
      user: { id: 'whopuser_1', email, username: 'buyer' },
    },
  }
}

function assert(cond, label, extra) {
  if (cond) {
    passed++
    console.log(`  ✅ ${label}`)
  } else {
    failed++
    console.log(`  ❌ ${label}`, extra ?? '')
  }
}

async function run() {
  console.log('\n1) Happy path: known plan + no matching account -> 200 handled:false unmatched_email')
  {
    const email = `nomatch_${Date.now()}@example.com`
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}`, email })
    const { status, json } = await sendWebhook({ body: payload })
    assert(status === 200, 'status 200', status)
    assert(json && json.handled === false, 'handled=false (no account matched)', json)
  }

  console.log('\n2) Bad signature -> 401')
  {
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}` })
    const { status, json } = await sendWebhook({
      body: payload,
      signatureOverride: 'v1,thisIsNotAValidBase64Signature==',
    })
    assert(status === 401, 'status 401', { status, json })
  }

  console.log('\n3) Wrong secret -> 401')
  {
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}` })
    const { status, json } = await sendWebhook({ body: payload, secret: 'whsec_totally_wrong_secret' })
    assert(status === 401, 'status 401', { status, json })
  }

  console.log('\n4) Stale timestamp (10 min old) -> replay rejected (400)')
  {
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}` })
    const staleTs = Math.floor(Date.now() / 1000) - 600
    const { status, json } = await sendWebhook({ body: payload, timestamp: staleTs })
    assert(status === 400, 'status 400 (stale timestamp)', { status, json })
  }

  console.log('\n5) Duplicate delivery (same webhook-id redelivered) -> second call is a no-op duplicate')
  {
    const webhookId = `msg_${crypto.randomUUID()}`
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}` })
    const first = await sendWebhook({ body: payload, webhookId })
    const second = await sendWebhook({ body: payload, webhookId })
    assert(first.status === 200, 'first delivery status 200', first)
    assert(second.status === 200, 'second (duplicate) delivery status 200', second)
    assert(second.json && second.json.duplicate === true, 'second delivery flagged duplicate:true', second.json)
  }

  console.log('\n6) Duplicate payment id (different webhook-id, same data.id) -> UNIQUE constraint short-circuit')
  {
    const paymentId = `pay_${crypto.randomUUID()}`
    const payload = makePaymentPayload({ id: paymentId })
    const first = await sendWebhook({ body: payload })
    const second = await sendWebhook({ body: { ...payload, id: `evt_${crypto.randomUUID()}` } })
    assert(first.status === 200, 'first payment status 200', first)
    assert(second.status === 200, 'second (same payment id) status 200', second)
    assert(second.json && second.json.duplicate === true, 'second flagged duplicate:true', second.json)
  }

  console.log('\n7) Unrecognized plan id -> handled:false reason unrecognized_plan')
  {
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}`, planId: 'plan_totally_unknown' })
    const { status, json } = await sendWebhook({ body: payload })
    assert(status === 200, 'status 200', status)
    assert(json && json.handled === false && json.reason === 'unrecognized_plan', 'reason=unrecognized_plan', json)
  }

  console.log('\n8) Non payment.succeeded event type -> ignored, handled:false')
  {
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}` })
    payload.type = 'payment.failed'
    const { status, json } = await sendWebhook({ body: payload })
    assert(status === 200, 'status 200', status)
    assert(json && json.handled === false, 'handled=false for non-succeeded event', json)
  }

  console.log('\n9) Happy path with a REAL matching account -> credited, handled:true, +1000 points')
  {
    const email = `whop_credit_test_${Date.now()}@example.com`
    const username = `whoptest${Date.now()}`.slice(0, 20)
    // Register a real account first via the existing auth API
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, username, password: 'TestPassword123!' }),
    })
    const registerJson = await registerRes.json().catch(() => null)
    assert(registerRes.status === 200 || registerRes.status === 201, 'test account registered', { status: registerRes.status, registerJson })
    const token = registerJson?.token
    let beforePoints = null
    if (token) {
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })
      const meJson = await meRes.json().catch(() => null)
      beforePoints = meJson?.user?.points ?? meJson?.points ?? 0
    }

    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}`, email })
    const { status, json } = await sendWebhook({ body: payload })
    assert(status === 200, 'webhook status 200', { status, json })
    assert(json && json.handled === true, 'handled=true', json)
    assert(json && json.creditedPoints === 1000, 'creditedPoints=1000', json)

    if (token) {
      const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })
      const meJson2 = await meRes2.json().catch(() => null)
      const afterPoints = meJson2?.user?.points ?? meJson2?.points ?? null
      assert(afterPoints === (beforePoints ?? 0) + 1000, `points balance increased by 1000 (before=${beforePoints}, after=${afterPoints})`, meJson2)
    } else {
      console.log('  ⚠️  skipped balance check: no token from registration response (check /api/auth response shape)')
    }
  }

  console.log('\n10) Missing signature headers -> 400')
  {
    const payload = makePaymentPayload({ id: `pay_${crypto.randomUUID()}` })
    const res = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    assert(res.status === 400, 'status 400 (missing headers)', res.status)
  }

  console.log(`\n===== ${passed} passed, ${failed} failed =====\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Test harness crashed:', err)
  process.exit(1)
})
