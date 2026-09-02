import React from 'react'
import { PageProvider, usePage } from '../../contexts/PageContext'
import { useAuth } from '../../contexts/AuthContext'
import Home from './Home'
import Receipts from './Receipts'
import OpayWallet from './OpayWallet'
import Marketplace from './Marketplace'
import AIHub from './AIHub'
import Points from './Points'
import Services from './Services'
import History from './History'
import Orders from './Orders'
import Support from './Support'

// Top-level authenticated app shell: client-side page-switcher (no browser
// routing — mirrors the original single-page #appShell behaviour) + a
// shared bottom nav. Ported from the #appShell markup in
// src/lib/app-html.ts and showPage()/initApp()/onAuthenticated() in
// public/static/js/app.js. Each page component (Home, Receipts, etc.) owns
// its own header chrome, matching the original markup where only the
// dashboard page has the top-bar/ref-bar/welcome/balance-card block and
// every other page has its own `.receipt-page-header` back-button bar.
function BottomNav() {
  const { page, goTo } = usePage()
  const { logout } = useAuth()

  function handleLogout() {
    if (window.confirm("Log out of Chapo'sHub?")) {
      logout()
    }
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      <button className="nav-item-btm" onClick={() => goTo('dashboard')} aria-label="Transactions">
        <span className="nav-icon" aria-hidden="true">
          💵
        </span>
        <span className="nav-label">Transactions</span>
      </button>
      <button
        className={`nav-item-btm ${page === 'services' ? 'active' : ''}`}
        onClick={() => goTo('services')}
        aria-label="Services"
        aria-current={page === 'services' ? 'page' : undefined}
      >
        <span className="nav-icon" aria-hidden="true">
          🛒
        </span>
        <span className="nav-label">Services</span>
      </button>
      <button
        className={`nav-item-btm ${page === 'dashboard' ? 'active' : ''}`}
        onClick={() => goTo('dashboard')}
        aria-label="Home"
        aria-current={page === 'dashboard' ? 'page' : undefined}
      >
        <span className="nav-icon" aria-hidden="true">
          ⊞
        </span>
        <span className="nav-label">Home</span>
      </button>
      <button
        className={`nav-item-btm ${page === 'history' ? 'active' : ''}`}
        onClick={() => goTo('history')}
        aria-label="History"
        aria-current={page === 'history' ? 'page' : undefined}
      >
        <span className="nav-icon" aria-hidden="true">
          🕐
        </span>
        <span className="nav-label">History</span>
      </button>
      <button className="nav-item-btm" onClick={handleLogout} aria-label="Logout">
        <span className="nav-icon" aria-hidden="true">
          🚪
        </span>
        <span className="nav-label">Logout</span>
      </button>
    </nav>
  )
}

function PageSwitcher() {
  const { page } = usePage()
  switch (page) {
    case 'dashboard':
      return <Home />
    case 'receipts':
      return <Receipts />
    case 'opay':
      return <OpayWallet />
    case 'marketplace':
      return <Marketplace />
    case 'ai':
      return <AIHub />
    case 'points':
      return <Points />
    case 'services':
      return <Services />
    case 'history':
      return <History />
    case 'orders':
      return <Orders />
    case 'support':
      return <Support />
    default:
      return <Home />
  }
}

function ShellInner() {
  return (
    <div className="app-shell">
      <PageSwitcher />
      <BottomNav />
    </div>
  )
}

export default function Dashboard() {
  return (
    <PageProvider>
      <ShellInner />
    </PageProvider>
  )
}
