import React from 'react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { WHOP_CHECKOUT_URLS } from '../../lib/config'

// Ported from `#page-points` + buyPoints() in public/static/js/app.js.
export default function Points() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const points = user?.points ?? 0

  function buyPoints(packageId: string) {
    const checkoutUrl = WHOP_CHECKOUT_URLS[packageId]
    if (!checkoutUrl) {
      showToast("💡 This package is coming soon — grab the Starter pack for now!")
      return
    }
    let url = checkoutUrl
    if (user?.email) {
      url += (url.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(user.email) + '&email.disabled=1'
    }
    showToast('💳 Redirecting to secure Whop checkout…')
    window.location.href = url
  }

  return (
    <div className="page active" role="main" aria-label="Points Store">
      <PageHeader title="💰 Chapo'sHub Points" />
      <div className="points-card">
        <div className="points-amount">{points}</div>
        <div className="points-label">Available Points</div>
      </div>
      <div className="section-title">Select Package</div>
      <div className="package-grid">
        <div className="package-card" onClick={() => buyPoints('starter')}>
          <div className="package-points">1,000</div>
          <div className="package-price">$10</div>
          <div className="package-desc">Basic</div>
        </div>
        <div className="package-card best disabled" onClick={() => buyPoints('pro')}>
          <div className="package-best-tag">SOON</div>
          <div className="package-points">5,000</div>
          <div className="package-price">$45</div>
          <div className="package-desc">Popular</div>
        </div>
        <div className="package-card disabled" onClick={() => buyPoints('enterprise')}>
          <div className="package-points">10,000</div>
          <div className="package-price">$80</div>
          <div className="package-desc">Pro</div>
        </div>
      </div>
      <p style={{ fontSize: '.78rem', color: 'var(--muted,#94a3b8)', padding: '0 1rem', marginTop: '.5rem' }}>
        Purchases are processed securely by Whop. You'll be taken to Whop's checkout — points are credited to your
        account automatically once payment completes.
      </p>
    </div>
  )
}
