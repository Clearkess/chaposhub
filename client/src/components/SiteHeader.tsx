import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

// Shared header for the landing page + all static marketing subpages.
// Ported from src/lib/site-chrome.ts siteHeader().
export default function SiteHeader({ onSignIn }: { onSignIn?: () => void }) {
  const { theme, toggle } = useTheme()
  const location = useLocation()

  function NavLink({ to, label }: { to: string; label: string }) {
    return (
      <Link to={to} aria-current={location.pathname === to ? 'page' : undefined}>
        {label}
      </Link>
    )
  }

  return (
    <header className="landing-header">
      <Link to="/" className="landing-logo" style={{ textDecoration: 'none' }}>
        <img src="/images/logo-mark.png" alt="Chapo'sHub logo" width={32} height={32} className="brand-logo-img" />
        Chapo'sHub
      </Link>
      <nav className="landing-nav" aria-label="Site navigation">
        <NavLink to="/help" label="Help" />
        <NavLink to="/about" label="About" />
        <NavLink to="/contact" label="Contact" />
      </nav>
      <div className="landing-header-right">
        <button
          className="landing-theme-btn"
          onClick={toggle}
          aria-label="Toggle dark/light theme"
          title="Toggle theme"
        >
          {theme === 'light' ? '☀️' : '🌙'}
        </button>
        <button className="landing-signin-btn" onClick={onSignIn}>
          Sign In
        </button>
      </div>
    </header>
  )
}
