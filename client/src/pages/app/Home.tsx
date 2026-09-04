import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { usePage } from '../../contexts/PageContext'
import { useToast } from '../../contexts/ToastContext'
import { allServices } from '../../lib/config'
import JoinVendorModal from '../../components/JoinVendorModal'

// Originally ported 1:1 from `#page-dashboard` in src/lib/app-html.ts +
// renderAllServices() in public/static/js/app.js. Restructured into a
// "SlipCraft-inspired Chapo'sHub 2.0" layout: compact pill header -> compact
// referral pill -> greeting -> simplified balance card -> Quick Actions
// (moved above the fold) -> Featured (AI Reply) -> a single consolidated
// "All Services" grid (the old duplicate 3-card Articles/Support/Opay grid
// was folded into this one list to reduce visual weight/redundancy).
// Green identity, points system, dark mode toggle and referral system are
// all preserved — only the density/hierarchy changed.
export default function Home() {
  const { user } = useAuth()
  const { toggle } = useTheme()
  const { goTo, goToReceiptsWithPlatform } = usePage()
  const { showToast } = useToast()
  const [vendorModalOpen, setVendorModalOpen] = useState(false)

  const points = user?.points ?? 0
  const name = user?.username || 'guest'
  const country = user?.country || 'KE'
  const isVendor = !!user?.isVendor

  function serviceNavAction(s: (typeof allServices)[number]) {
    if (s.dedicated) goTo(s.key as any)
    else goToReceiptsWithPlatform(s.key)
  }

  function copyRefLink() {
    const code = user?.referralCode || user?.username || 'guest'
    const link = 'https://chaposhub.link/ref/' + code
    navigator.clipboard
      .writeText(link)
      .then(() => showToast('📋 Referral link copied!', 'success'))
      .catch(() => showToast('📋 Ref: ' + link))
  }

  return (
    <div className="page active" role="main" aria-label="Dashboard">
      <div className="top-bar">
        <div className="top-left">
          <div className="top-avatar">
            <img src="/images/logo-mark.png" alt="Chapo'sHub" width={36} height={36} />
          </div>
          <div className="top-user">
            {name}
            <span>{country}</span>
          </div>
        </div>
        <div className="top-right">
          <div className="top-badge">
            <i className="fa-solid fa-gem"></i> {points}pts
          </div>
          <div
            className="top-icon-btn"
            onClick={toggle}
            role="button"
            tabIndex={0}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <i className="fa-solid fa-moon"></i>
          </div>
        </div>
      </div>

      {/* Compact referral pill — replaces the old full-width .ref-bar.
          NOTE: "Referred" count is a static placeholder. The backend schema
          has a `referred_by` column but nothing populates it on signup and
          no endpoint counts referrals yet, so there's no real number to
          show here — flagged to the user, not silently fabricated. */}
      <div className="ref-pill-row">
        <div className="ref-pill" title="Referral program">
          <i className="fa-solid fa-user-group" aria-hidden="true"></i> Referred: <strong>0</strong>
        </div>
        <button className="ref-pill-btn" onClick={copyRefLink}>
          Copy Ref
        </button>
      </div>

      <div className="welcome">
        <div className="welcome-text">
          Welcome back,
          <br />
          <strong>
            {name} <i className="fa-solid fa-hand-peace"></i>
          </strong>
        </div>
        <button
          className="welcome-add-btn"
          onClick={() => goTo('points')}
          aria-label="Buy Chapo'sHub Points"
          title="Buy Chapo'sHub Points"
        >
          +
        </button>
      </div>

      <div className="balance-card compact">
        <div className="balance-label">
          <i className="fa-solid fa-credit-card"></i> TOTAL BALANCE
        </div>
        <div className="balance-amount">
          {points} <span>pts</span>
        </div>
        <div className="balance-actions">
          <div className="balance-action" onClick={() => goTo('services')}>
            <div className="balance-action-icon">
              <i className="fa-solid fa-arrow-right"></i>
            </div>
            <div className="balance-action-label">Services</div>
          </div>
          <div className="balance-action" onClick={() => goTo('orders')}>
            <div className="balance-action-icon">
              <i className="fa-solid fa-cart-shopping"></i>
            </div>
            <div className="balance-action-label">Orders</div>
          </div>
          <div className="balance-action" onClick={() => goTo('history')}>
            <div className="balance-action-icon">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div className="balance-action-label">History</div>
          </div>
        </div>
      </div>

      {/* Quick Actions moved directly under the balance card so it's
          immediately visible above the fold (was previously buried lower
          on the page). */}
      <div className="section-title">Quick Actions</div>
      <div className="quick-actions">
        <div className="quick-action orange" onClick={() => goTo('points')}>
          <span className="quick-action-icon">
            <i className="fa-solid fa-link"></i>
          </span>{' '}
          Buy Points
        </div>
        <div
          className="quick-action"
          onClick={() => (isVendor ? goTo('points') : setVendorModalOpen(true))}
        >
          <span className="quick-action-icon">
            <i className="fa-solid fa-store"></i>
          </span>{' '}
          {isVendor ? 'Vendor Dashboard' : 'Join Vendor'}
        </div>
      </div>

      <JoinVendorModal open={vendorModalOpen} onClose={() => setVendorModalOpen(false)} />

      <div className="section-title">Featured</div>
      <div className="featured-card" onClick={() => goTo('ai')}>
        <div className="featured-icon">
          <i className="fa-solid fa-robot"></i>
        </div>
        <div className="featured-content">
          <div className="featured-title">
            AI Reply <span className="featured-badge">NEW</span>
          </div>
          <div className="featured-desc">Smart AI-powered replies for any conversation</div>
        </div>
        <div className="featured-arrow">
          <i className="fa-solid fa-bolt"></i>
        </div>
      </div>

      {/* Single consolidated service-discovery section (the old duplicate
          3-card "popular services" grid was folded in here — it repeated
          Opay/Support which already live in the full list below, and was
          one of the "competing green elements" cluttering the hierarchy).
          Dashboard shows a 5-icon preview; "View All ->" goes to the full
          Services page which lists every entry in `allServices`. */}
      <div className="section-title">
        All Services{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            goTo('services')
          }}
        >
          View All <i className="fa-solid fa-arrow-right"></i>
        </a>
      </div>
      <div className="all-services-grid">
        {allServices.slice(0, 5).map((s) => (
          <div className="all-service" key={s.key} onClick={() => serviceNavAction(s)}>
            <div className="all-service-logo" style={{ background: s.color || 'var(--bg-card)', color: 'white' }}>
              {s.icon}
            </div>
            <div className="all-service-name">{s.name}</div>
            {s.new && <div className="all-service-new">New</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
