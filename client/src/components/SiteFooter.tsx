import React from 'react'

// Shared rich footer for the landing page + all static marketing subpages.
// Ported from src/lib/site-chrome.ts siteFooter().
const CONTACT = {
  whatsappDisplay: '+234 705 660 6129',
  whatsappHref: 'https://wa.me/2347056606129',
  email: 'support@chaposhub.com'
}

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div>
          <div className="site-footer-brand">
            <img src="/images/logo-mark.png" alt="Chapo'sHub logo" width={28} height={28} className="brand-logo-img" />
            Chapo'sHub
          </div>
          <p className="site-footer-tagline">
            A trusted points-based hub for generating branded receipts and digital tools. Simplify your workflow
            today.
          </p>
        </div>
        <div className="site-footer-col">
          <div className="site-footer-col-title">Resources</div>
          <a href="/help">Help Center</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Conditions</a>
        </div>
        <div className="site-footer-col">
          <div className="site-footer-col-title">Company</div>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
        </div>
        <div className="site-footer-col">
          <div className="site-footer-col-title">Contact Us</div>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer">
            WhatsApp: {CONTACT.whatsappDisplay}
          </a>
        </div>
      </div>
      <div className="site-footer-bottom">
        © 2026 Chapo'sHub. Receipts are simulated records for personal/demo use, not official proof of payment.
      </div>
    </footer>
  )
}
