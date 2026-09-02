// Ported from src/routes/banks.ts (Hono/Workers version) to Express/Node.
import { Router } from 'express'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'

const router = Router()

const PAYSTACK_BASE = 'https://api.paystack.co'
const ACCOUNT_NUMBER_RE = /^\d{10}$/ // NUBAN - Nigerian bank accounts are 10 digits
const BANK_CODE_RE = /^\d{1,6}$/

// GET /api/banks — list of active Nigerian banks (name, code, slug only)
router.get('/', authMiddleware, async (_req: AuthedRequest, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return res.status(500).json({ success: false, message: 'Bank service is not configured.' })
  }

  try {
    const url = `${PAYSTACK_BASE}/bank?country=nigeria&currency=NGN&perPage=100`
    const psRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json'
      }
    })

    if (!psRes.ok) {
      return res.status(503).json({ success: false, message: 'Unable to retrieve banks.' })
    }

    const result: any = await psRes.json().catch(() => null)
    if (!result) {
      return res.status(503).json({ success: false, message: 'Unable to retrieve banks.' })
    }

    const list: any[] = Array.isArray(result.data) ? result.data : []
    const activeBanks = list
      .filter((bank) => (bank?.active ?? false) && !(bank?.is_deleted ?? false))
      .map((bank) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug ?? null
      }))

    return res.json({ success: true, data: activeBanks })
  } catch (error: any) {
    console.error('Unable to retrieve banks:', error?.message || error)
    return res.status(503).json({ success: false, message: 'Bank service is temporarily unavailable.' })
  }
})

// POST /api/banks/resolve — resolve an account number + bank code to a real
// account name via Paystack.
router.post('/resolve', authMiddleware, async (req: AuthedRequest, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return res.status(500).json({ success: false, message: 'Bank service is not configured.' })
  }

  const body = req.body || {}
  const accountNumber = typeof body.account_number === 'string' ? body.account_number.trim() : ''
  const bankCode = typeof body.bank_code === 'string' ? body.bank_code.trim() : String(body.bank_code || '').trim()

  if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
    return res.status(400).json({ success: false, message: 'account_number must be exactly 10 digits' })
  }
  if (!BANK_CODE_RE.test(bankCode)) {
    return res.status(400).json({ success: false, message: 'bank_code is required and must be numeric' })
  }

  try {
    const url = `${PAYSTACK_BASE}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    const psRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json'
      }
    })

    const result: any = await psRes.json().catch(() => null)

    if (!psRes.ok || !result?.status) {
      const message = result?.message || 'Unable to resolve account. Please check the account number and bank.'
      return res.status(psRes.status === 401 || psRes.status === 403 ? 502 : 400).json({ success: false, message })
    }

    const data = result.data || {}
    return res.json({
      success: true,
      data: {
        account_number: data.account_number,
        account_name: data.account_name,
        bank_id: data.bank_id ?? null
      }
    })
  } catch (error: any) {
    console.error('Unable to resolve bank account:', error?.message || error)
    return res.status(503).json({ success: false, message: 'Bank service is temporarily unavailable.' })
  }
})

export default router
