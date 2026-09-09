import React, { useState } from 'react'

// Header/nav for the new ChaposHub gold-luxury homepage (Landing.tsx only).
// Uses its own `.gh-*` classes from styles/homepage-gold.css — fully
// isolated from the existing green-themed SiteHeader used by
// About/Contact/Help/Legal.
export default function GoldHeader({
  onSignIn,
  onSignUp
}: {
  onSignIn: () => void
  onSignUp: () => void
}) {
  const [open, setOpen] = useState(false)

  const links: Array<{ href: string; label: string }> = [
    { href: '#top', label: 'Home' },
    { href: '#gh-features', label: 'Features' },
    { href: '#gh-how', label: 'How It Works' },
    { href: '#gh-pricing', label: 'Pricing' },
    { href: '#gh-faq', label: 'FAQ' }
  ]

  function scrollTo(href: string) {
    setOpen(false)
    if (href === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="gh-header" style={{ position: 'relative' }}>
      <div className="gh-header-inner">
        <a
          href="#top"
          className="gh-brand"
          onClick={(e) => {
            e.preventDefault()
            scrollTo('#top')
          }}
        >
          <img src="/images/logo-mark.png" alt="ChaposHub logo" className="gh-brand-logo" width={34} height={34} />
          ChaposHub
        </a>

        <nav className="gh-nav" aria-label="Site navigation">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => {
                e.preventDefault()
                scrollTo(l.href)
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="gh-header-right">
          <a
            href="#"
            className="gh-login-link"
            onClick={(e) => {
              e.preventDefault()
              onSignIn()
            }}
          >
            Log In
          </a>
          <button className="gh-btn gh-btn-primary gh-btn-sm" onClick={onSignUp}>
            Get Started <i className="fa-solid fa-arrow-right"></i>
          </button>
          <button
            className="gh-burger"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-bars"></i>}
          </button>
        </div>
      </div>

      {open && (
        <div className="gh-mobile-menu">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => {
                e.preventDefault()
                scrollTo(l.href)
              }}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setOpen(false)
              onSignIn()
            }}
          >
            Log In
          </a>
          <button
            className="gh-btn gh-btn-primary gh-btn-block"
            onClick={() => {
              setOpen(false)
              onSignUp()
            }}
          >
            Get Started <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      )}
    </header>
  )
}
