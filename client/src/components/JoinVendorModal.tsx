import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

// Real "Join Vendor" flow (replaces the old showToast('coming soon!')
// placeholder). Becoming a vendor requires a WhatsApp number on file —
// it's used to coordinate P2P order payment off-platform, matching the
// "Used for vendor order notifications only" convention from the reference
// Settings design. Reused by both Home.tsx's Quick Actions and the Sell tab
// on the Points (P2P) page.
export default function JoinVendorModal({
  open,
  onClose,
  onSuccess
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setWhatsapp((user?.whatsapp as string) || '')
      setError('')
    }
  }, [open, user])

  if (!open) return null

  async function submit() {
    setError('')
    const trimmed = whatsapp.trim()
    if (!trimmed || trimmed.length < 7 || !/^\+?[0-9\s-]{7,20}$/.test(trimmed)) {
      setError('Enter a valid WhatsApp number (e.g. +2348012345678)')
      return
    }
    setSubmitting(true)
    try {
      await api.applyForVendor(trimmed)
      await refreshUser()
      showToast("You're now a Chapo'sHub vendor! ✓", 'success')
      onClose()
      onSuccess?.()
    } catch (err: any) {
      setError(err.details || err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="mkt-form-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mkt-form-sheet">
        <div className="mkt-form-header">
          <span>
            <i className="fa-solid fa-store" style={{ marginRight: '.4rem', color: 'var(--accent)' }}></i>
            Join as a Vendor
          </span>
          <button className="mkt-form-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Vendors can list Chapo'sHub Points for sale on the P2P marketplace at their own NGN-per-point
          rate. Buyers pay you directly off-platform (bank transfer / WhatsApp), and once you confirm
          payment, points transfer automatically.
        </p>
        <div className="form-field">
          <label>WhatsApp Number</label>
          <input
            type="tel"
            placeholder="+2348012345678"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginTop: '.35rem' }}>
            Used for vendor order notifications only.
          </div>
        </div>
        {error && (
          <div className="auth-error show" style={{ marginBottom: '.8rem' }}>
            {error}
          </div>
        )}
        <button className="action-btn primary" style={{ width: '100%' }} onClick={submit} disabled={submitting}>
          {submitting ? <span className="spinner"></span> : 'Become a Vendor'}
        </button>
      </div>
    </div>
  )
}
