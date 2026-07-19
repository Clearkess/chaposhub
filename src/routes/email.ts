import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables } from '../lib/types'

const email = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function generateEmailTemplate(data: any): string {
  const items = Array.isArray(data.items) ? data.items : []
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6366f1;">${data.storeName || 'Receipt'}</h2>
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
email.post('/send-receipt', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { to, subject, receiptData } = body

  if (!to || !EMAIL_RE.test(to)) {
    return c.json({ error: 'Validation failed', details: 'Valid recipient email required' }, 400)
  }
  if (!subject || typeof subject !== 'string' || subject.length === 0 || subject.length > 200) {
    return c.json({ error: 'Validation failed', details: 'subject is required (max 200 chars)' }, 400)
  }
  if (!receiptData || typeof receiptData !== 'object') {
    return c.json({ error: 'Validation failed', details: 'receiptData is required' }, 400)
  }

  if (!c.env.RESEND_API_KEY) {
    return c.json({
      success: true,
      message: 'Email queued (email provider not configured in dev mode)',
      to,
      mock: true
    })
  }

  try {
    const html = generateEmailTemplate(receiptData)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Chapo'sHub <${c.env.FROM_EMAIL || 'noreply@chaposhub.com'}>`,
        to,
        subject,
        html
      })
    })
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}))
      return c.json({ error: 'Failed to send email', details: err.message }, 500)
    }
    return c.json({ success: true, message: 'Email sent successfully', to })
  } catch (error: any) {
    return c.json({ error: 'Failed to send email', details: error.message }, 500)
  }
})

export default email
