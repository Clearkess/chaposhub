import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables } from '../lib/types'

const banks = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

// ─────────────────────────────────────────────────────────────────────────
// Real Paystack bank list + account-name resolution for the OPay demo's
// "Bank Transfer" tab. This ONLY powers the dropdown + account-name lookup —
// it never moves money and never touches wallet balances. Those stay fully
// simulated (see src/routes/opay.ts). The Paystack secret key is read
// server-side only (c.env.PAYSTACK_SECRET_KEY, a Cloudflare Secret) and is
// never sent to or readable by the browser, matching the NOMASK_API_KEY /
// WHOP_WEBHOOK_SECRET pattern already used elsewhere in this app.
//
// Both endpoints require a logged-in Chapo'sHub user (authMiddleware) so an
// anonymous visitor can't spend the project's Paystack call budget.
// ─────────────────────────────────────────────────────────────────────────

const PAYSTACK_BASE = 'https://api.paystack.co'
const ACCOUNT_NUMBER_RE = /^\d{10}$/ // NUBAN - Nigerian bank accounts are 10 digits
const BANK_CODE_RE = /^\d{1,6}$/

// GET /api/banks — list of active Nigerian banks (name, code, slug only)
banks.get('/', authMiddleware, async (c) => {
  const secretKey = c.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return c.json({ success: false, message: 'Bank service is not configured.' }, 500)
  }

  try {
    const url = `${PAYSTACK_BASE}/bank?country=nigeria&currency=NGN&perPage=100`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json'
      }
    })

    if (!res.ok) {
      return c.json({ success: false, message: 'Unable to retrieve banks.' }, 503)
    }

    const result: any = await res.json().catch(() => null)
    if (!result) {
      return c.json({ success: false, message: 'Unable to retrieve banks.' }, 503)
    }

    const list: any[] = Array.isArray(result.data) ? result.data : []
    const activeBanks = list
      .filter((bank) => (bank?.active ?? false) && !(bank?.is_deleted ?? false))
      .map((bank) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug ?? null
      }))

    return c.json({ success: true, data: activeBanks })
  } catch (error: any) {
    console.error('Unable to retrieve banks:', error?.message || error)
    return c.json({ success: false, message: 'Bank service is temporarily unavailable.' }, 503)
  }
})

// POST /api/banks/resolve — resolve an account number + bank code to a real
// account name via Paystack. Free endpoint on Paystack's side, but requires
// a live secret key with resolution enabled (test keys often 403 here).
banks.post('/resolve', authMiddleware, async (c) => {
  const secretKey = c.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return c.json({ success: false, message: 'Bank service is not configured.' }, 500)
  }

  const body = await c.req.json().catch(() => ({}))
  const accountNumber = typeof body.account_number === 'string' ? body.account_number.trim() : ''
  const bankCode = typeof body.bank_code === 'string' ? body.bank_code.trim() : String(body.bank_code || '').trim()

  if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
    return c.json({ success: false, message: 'account_number must be exactly 10 digits' }, 400)
  }
  if (!BANK_CODE_RE.test(bankCode)) {
    return c.json({ success: false, message: 'bank_code is required and must be numeric' }, 400)
  }

  try {
    const url = `${PAYSTACK_BASE}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json'
      }
    })

    const result: any = await res.json().catch(() => null)

    if (!res.ok || !result?.status) {
      // Surface Paystack's own message where possible (e.g. "Could not
      // resolve account name" / key-permission errors) rather than a
      // generic failure, so misconfiguration is easy to diagnose.
      const message = result?.message || 'Unable to resolve account. Please check the account number and bank.'
      return c.json({ success: false, message }, res.status === 401 || res.status === 403 ? 502 : 400)
    }

    const data = result.data || {}
    return c.json({
      success: true,
      data: {
        account_number: data.account_number,
        account_name: data.account_name,
        bank_id: data.bank_id ?? null
      }
    })
  } catch (error: any) {
    console.error('Unable to resolve bank account:', error?.message || error)
    return c.json({ success: false, message: 'Bank service is temporarily unavailable.' }, 503)
  }
})

export default banks
