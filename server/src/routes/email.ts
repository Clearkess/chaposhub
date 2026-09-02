// Ported from src/routes/email.ts (Hono/Workers version) to Express/Node.
import { Router } from 'express'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'

const router = Router()

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function generateEmailTemplate(data: any): string {
  const items = Array.isArray(data.items) ? data.items : []
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #16a34a;">${data.storeName || 'Receipt'}</h2>
      <p><strong>Order ID:</strong> ${data.orderId || ''}</p>
      <p><strong>Date:</strong> ${data.dateTime ? new Date(data.dateTime).toLocaleString() : new Date().toLocaleString()}</p>
      <hr>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><th style="text-align: left;">Item</th><th>Qty</th><th style="text-align: right;">Price</th></tr>
        ${items.map((i: any) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td style="text-align: right;">$${(i.price * i.quantity).toFixed(2)}</td></tr>`).join('')}
      </table>
      <hr>
      <p style="text-align: right;"><strong>Total: ${data.total}</strong></p>
      <p style="color: #888; font-size: 12px; margin-top: 30px;">This receipt was generated with Chapo'sHub</p>
    </div>
  `
}

// Send receipt email (via Resend REST API, mock fallback)
router.post('/send-receipt', authMiddleware, async (req: AuthedRequest, res) => {
  const body = req.body || {}
  const { to, subject, receiptData } = body

  if (!to || !EMAIL_RE.test(to)) {
    return res.status(400).json({ error: 'Validation failed', details: 'Valid recipient email required' })
  }
  if (!subject || typeof subject !== 'string' || subject.length === 0 || subject.length > 200) {
    return res.status(400).json({ error: 'Validation failed', details: 'subject is required (max 200 chars)' })
  }
  if (!receiptData || typeof receiptData !== 'object') {
    return res.status(400).json({ error: 'Validation failed', details: 'receiptData is required' })
  }

  if (!process.env.RESEND_API_KEY) {
    return res.json({
      success: true,
      message: 'Email queued (email provider not configured in dev mode)',
      to,
      mock: true
    })
  }

  try {
    const html = generateEmailTemplate(receiptData)
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Chapo'sHub <${process.env.FROM_EMAIL || 'noreply@chaposhub.com'}>`,
        to,
        subject,
        html
      })
    })
    if (!resendRes.ok) {
      const err: any = await resendRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Failed to send email', details: err.message })
    }
    return res.json({ success: true, message: 'Email sent successfully', to })
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to send email', details: error.message })
  }
})

export default router
