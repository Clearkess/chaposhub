import React from 'react'

// Footer for the new ChaposHub gold-luxury homepage (Landing.tsx only).
// 5-column layout: brand+tagline / Product / Company / Resources / Legal.
export default function GoldFooter() {
  return (
    <footer className="gh-footer">
      <div className="gh-container">
        <div className="gh-footer-grid">
          <div>
            <div className="gh-footer-brand">
              <img src="/images/logo-mark.png" alt="ChaposHub logo" width={30} height={30} />
              ChaposHub
            </div>
            <p className="gh-footer-tagline">The All-in-One Digital Services Platform</p>
          </div>

          <div>
            <div className="gh-footer-col-title">Product</div>
            <div className="gh-footer-col">
              <a href="#gh-dashboard-preview">Dashboard</a>
              <a href="#gh-features">Receipt Generator</a>
              <a href="#gh-features">Flash Email</a>
              <a href="#gh-features">Support Pages</a>
              <a href="#gh-features">Login Pages</a>
              <a href="#gh-features">Instant Generation</a>
            </div>
          </div>

          <div>
            <div className="gh-footer-col-title">Company</div>
            <div className="gh-footer-col">
              <a href="/about">About</a>
              <a href="#gh-features">Features</a>
              <a href="#gh-pricing">Pricing</a>
              <a href="/contact">Contact</a>
              <a href="/help">Support</a>
            </div>
          </div>

          <div>
            <div className="gh-footer-col-title">Resources</div>
            <div className="gh-footer-col">
              <a href="/help">Help Center</a>
              <a href="/help">Documentation</a>
              <a href="#gh-faq">FAQ</a>
              <a href="/help">Status</a>
            </div>
          </div>

          <div>
            <div className="gh-footer-col-title">Legal</div>
            <div className="gh-footer-col">
              <a href="/terms">Terms</a>
              <a href="/privacy-policy">Privacy</a>
              <a href="/privacy-policy">Refund Policy</a>
              <a href="/terms">Acceptable Use</a>
            </div>
          </div>
        </div>

        <div className="gh-footer-bottom">© 2026 ChaposHub. All rights reserved.</div>
      </div>
    </footer>
  )
}
