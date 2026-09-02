import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { usePage } from '../../contexts/PageContext'
import { useToast } from '../../contexts/ToastContext'
import { allServices } from '../../lib/config'

// Ported from `#page-dashboard` in src/lib/app-html.ts + renderAllServices()
// in public/static/js/app.js.
export default function Home() {
  const { user } = useAuth()
  const { toggle } = useTheme()
  const { goTo, goToReceiptsWithPlatform } = usePage()
  const { showToast } = useToast()

  const points = user?.points ?? 0
  const name = user?.username || 'guest'
  const country = user?.country || 'KE'

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
          <div className="top-badge">💎 {points}pts</div>
          <div
            className="top-icon-btn"
            onClick={toggle}
            role="button"
            tabIndex={0}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            🌙
          </div>
        </div>
      </div>

      <div className="ref-bar">
        <div className="ref-left">👤 Referral program</div>
        <button className="ref-btn" onClick={copyRefLink}>
          Copy Ref Link
        </button>
      </div>

      <div className="welcome">
        <div className="welcome-text">
          Welcome back,
          <br />
          <strong>{name} 👋</strong>
        </div>
        <button className="buy-points-btn" onClick={() => goTo('points')}>
          💰 Chapo'sHub Points
        </button>
      </div>

      <div className="balance-card">
        <div className="balance-label">💳 TOTAL BALANCE</div>
        <div className="balance-amount">
          {points} <span>pts</span>
        </div>
        <div className="balance-actions">
          <div className="balance-action" onClick={() => goTo('services')}>
            <div className="balance-action-icon">→</div>
            <div className="balance-action-label">Services</div>
          </div>
          <div className="balance-action" onClick={() => goTo('orders')}>
            <div className="balance-action-icon">🛒</div>
            <div className="balance-action-label">Orders</div>
          </div>
          <div className="balance-action" onClick={() => goTo('history')}>
            <div className="balance-action-icon">🕐</div>
            <div className="balance-action-label">History</div>
          </div>
        </div>
      </div>

      <div className="section-title">Quick Actions</div>
      <div className="quick-actions">
        <div className="quick-action orange" onClick={() => goTo('points')}>
          <span className="quick-action-icon">🔗</span> Buy Points
        </div>
        <div className="quick-action" onClick={() => showToast('Vendor application coming soon!')}>
          <span className="quick-action-icon">👤</span> Join Vendor
        </div>
      </div>

      <div className="section-title">Featured</div>
      <div className="featured-card" onClick={() => goTo('ai')}>
        <div className="featured-icon">🤖</div>
        <div className="featured-content">
          <div className="featured-title">
            AI Reply <span className="featured-badge">NEW</span>
          </div>
          <div className="featured-desc">Smart AI-powered replies for any conversation</div>
        </div>
        <div className="featured-arrow">⚡</div>
      </div>

      <div className="service-grid">
        <div
          className="service-card"
          onClick={() => showToast('Articles coming soon!')}
          role="button"
          tabIndex={0}
          aria-label="Articles"
        >
          <div
            className="service-logo"
            style={{ background: 'linear-gradient(135deg,#22c55e,#4ade80)', color: 'white', fontSize: '1.2rem' }}
          >
            📖
          </div>
          <div className="service-name">Articles(FMT)</div>
          <div className="service-desc">Buy & read</div>
        </div>
        <div className="service-card" onClick={() => goTo('support')} role="button" tabIndex={0} aria-label="Support sites">
          <div
            className="service-logo"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', color: 'white', fontSize: '1.2rem' }}
          >
            🎧
          </div>
          <div className="service-name">Support Sites</div>
          <div className="service-desc">Build pages</div>
        </div>
        <div className="service-card" onClick={() => goTo('opay')} role="button" tabIndex={0} aria-label="OPay wallet demo">
          <div className="service-logo" style={{ background: '#1dc677', color: 'white' }}>
            O
          </div>
          <div className="service-name">Opay</div>
          <div className="service-desc">Wallet demo</div>
        </div>
      </div>

      <div className="section-title">
        All Services{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            goTo('services')
          }}
        >
          View All →
        </a>
      </div>
      <div className="all-services-grid">
        {allServices.map((s) => (
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
