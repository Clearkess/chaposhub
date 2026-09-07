import React, { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { CONFIG } from '../../lib/config'
import { api, APIError } from '../../api/client'

// Ported from `#page-support` + generateSupportPage() in public/static/js/app.js.
export default function Support() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [company, setCompany] = useState('PayPal Support')
  const [color, setColor] = useState('#003087')
  const [email, setEmail] = useState('support@paypal.com')
  const [whatsapp, setWhatsapp] = useState('+1 (555) 123-4567')
  const [telegram, setTelegram] = useState('@paypal_support')
  const [desc, setDesc] = useState('Need help? Our support team is available 24/7 to assist you with any issues.')
  // Snapshot of the fields actually "generated" into the preview (mirrors the
  // original which only updates the preview DOM once the button is clicked).
  const [preview, setPreview] = useState({ company, color, email, whatsapp, telegram, desc })

  async function generateSupportPage() {
    const cost = CONFIG.points.support
    if ((user?.points || 0) < cost) {
      showToast(`Need ${cost} points to generate`, 'error')
      return
    }
    setPreview({ company, color, email, whatsapp, telegram, desc })
    try {
      await api.deductPoints(cost, 'support', company)
      await refreshUser()
      showToast(`Support page generated! (-${cost} pts)`, 'success')
    } catch (err) {
      if (err instanceof APIError && err.status === 401) {
        showToast('Please log in again', 'error')
      } else {
        showToast(err instanceof Error ? err.message : 'Something went wrong', 'error')
      }
    }
  }

  return (
    <div className="page active" role="main" aria-label="Support Builder">
      <PageHeader title="Chapo'sHub Support" icon="fa-solid fa-headset" />
      <div className="form-section">
        <div className="form-field">
          <label>Company Name</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={50} />
        </div>
        <div className="form-field">
          <label>Brand Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ height: 48, padding: '.2rem' }}
          />
        </div>
        <div className="form-field">
          <label>Support Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
          />
        </div>
        <div className="form-field">
          <label>WhatsApp</label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            pattern="[+0-9\s()-]{7,}"
          />
        </div>
        <div className="form-field">
          <label>Telegram</label>
          <input type="text" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} required maxLength={200} />
        </div>
        <button className="action-btn primary" style={{ width: '100%', marginTop: '.5rem' }} onClick={generateSupportPage}>
          <i className="fa-solid fa-rocket"></i> Generate Page
        </button>
      </div>
      <div className="section-title" style={{ marginTop: '1rem' }}>
        Preview
      </div>
      <div style={{ padding: '0 1rem 1rem' }}>
        <div className="support-preview">
          <div className="support-header" style={{ background: preview.color }}>
            <h3>{preview.company}</h3>
            <p>{preview.desc}</p>
          </div>
          <div className="support-body">
            <div className="support-contact"><i className="fa-solid fa-envelope"></i> {preview.email}</div>
            <div className="support-contact"><i className="fa-solid fa-mobile-screen"></i> {preview.whatsapp}</div>
            <div className="support-contact"><i className="fa-brands fa-telegram"></i> {preview.telegram}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
