import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { usePage } from '../contexts/PageContext'

// Default one-time vendor onboarding fee, in points — mirrors
// P2P_VENDOR_FEE_POINTS on the backend (src/lib/types.ts /
// server/src/lib/types.ts). Overwritten by the real value returned from
// GET /p2p/vendor/status as soon as it loads, so this is only the fallback
// shown for the instant before that request resolves.
const DEFAULT_VENDOR_FEE_POINTS = 500

// Real "Join Vendor" flow (replaces the old showToast('coming soon!')
// placeholder). Becoming a vendor requires a WhatsApp number on file — it's
// used to coordinate P2P order payment off-platform — AND a one-time points
// onboarding fee (like a real P2P exchange's merchant signup fee). Reused by
// both Home.tsx's Quick Actions and the Sell tab on the Points (P2P) page.
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
  const { goTo } = usePage()
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feePoints, setFeePoints] = useState(DEFAULT_VENDOR_FEE_POINTS)

  const points = user?.points ?? 0
  const insufficientBalance = points < feePoints

  useEffect(() => {
    if (open) {
      setWhatsapp((user?.whatsapp as string) || '')
      setError('')
      api
        .getVendorStatus()
        .then((s: any) => {
          if (typeof s?.vendorFeePoints === 'number') setFeePoints(s.vendorFeePoints)
        })
        .catch(() => {
          /* keep the default fallback fee if this fails */
        })
    }
  }, [open, user])

  if (!open) return null

  async function submit() {
    setError('')
    if (insufficientBalance) {
      setError(`Insufficient point balance — you need ${feePoints.toLocaleString()} points to become a vendor`)
      return
    }
    const trimmed = whatsapp.trim()
    if (!trimmed || trimmed.length < 7 || !/^\+?[0-9\s-]{7,20}$/.test(trimmed)) {
      setError('Enter a valid WhatsApp number (e.g. +2348012345678)')
      return
    }
    setSubmitting(true)
    try {
      await api.applyForVendor(trimmed)
      await refreshUser()
      showToast("You're now a Chapo'sHub vendor!", 'success')
      onClose()
      onSuccess?.()
    } catch (err: any) {
      setError(err.details || err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function goBuyPoints() {
    onClose()
    goTo('points')
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
        <div
          style={{
            fontSize: '.85rem',
            padding: '.7rem .9rem',
            borderRadius: '10px',
            background: 'rgba(34,197,94,0.1)',
            color: 'var(--accent)',
            fontWeight: 600,
            marginBottom: '1rem'
          }}
        >
          A one-time fee of {feePoints.toLocaleString()} points will be deducted from your point balance.
        </div>
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
        {insufficientBalance && !error && (
          <div className="auth-error show" style={{ marginBottom: '.8rem' }}>
            Insufficient point balance
          </div>
        )}
        {error && (
          <div className="auth-error show" style={{ marginBottom: '.8rem' }}>
            {error}
          </div>
        )}
        {insufficientBalance ? (
          <button className="action-btn primary" style={{ width: '100%' }} onClick={goBuyPoints}>
            Buy Points
          </button>
        ) : (
          <button className="action-btn primary" style={{ width: '100%' }} onClick={submit} disabled={submitting}>
            {submitting ? <span className="spinner"></span> : 'Become a Vendor'}
          </button>
        )}
      </div>
    </div>
  )
}
