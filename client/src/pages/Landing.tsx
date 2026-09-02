import React from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

// Marketing landing page, ported verbatim from the `landingPage` markup in
// src/lib/app-html.ts. Shown when the visitor is not authenticated.
export default function Landing({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <div className="landing-page">
      <SiteHeader onSignIn={onSignIn} />

      <section className="landing-hero">
        <div className="landing-hero-badge">
          <span className="landing-hero-badge-pulse" /> Trusted by sellers worldwide
        </div>
        <h1 className="landing-hero-title">Stop losing time on messy receipts and slow customer replies</h1>
        <p className="landing-hero-sub">
          Generate branded receipts for 13+ platforms, draft AI-powered customer replies in seconds, and pay only
          for what you use — no subscriptions, no card required to start.
        </p>
        <div className="landing-hero-cta">
          <button className="landing-cta-primary" onClick={onSignUp}>
            🚀 Start My Free Account
          </button>
          <button className="landing-cta-secondary" onClick={onSignIn}>
            Sign In
          </button>
        </div>
        <div className="landing-hero-note">No credit card required · 245 free points on signup</div>
        <div className="landing-trust" aria-label="Trust indicators">
          <div className="landing-trust-item">
            <span className="trust-icon">🔒</span> SSL Encrypted
          </div>
          <div className="landing-trust-item">
            <span className="trust-icon">⚡</span> Instant Delivery
          </div>
          <div className="landing-trust-item">
            <span className="trust-icon">🌍</span> Available Worldwide
          </div>
        </div>
      </section>

      <section className="landing-stats" aria-label="Platform stats">
        <div className="landing-stats-grid">
          <div className="landing-stat">
            <div className="landing-stat-num">1,250,000+</div>
            <div className="landing-stat-label">Receipts Generated</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-num">50,000+</div>
            <div className="landing-stat-label">Active Sellers</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-num">890,000+</div>
            <div className="landing-stat-label">AI Replies Sent</div>
          </div>
        </div>
      </section>

      <section className="landing-platforms" aria-label="Supported platforms">
        <div className="landing-platforms-label">Supported Platforms</div>
        <div className="landing-platform-grid">
          {PLATFORM_ICONS.map((p) => (
            <div className="landing-platform-item" key={p.name}>
              <div className="landing-platform-icon" dangerouslySetInnerHTML={{ __html: p.svg }} />
              <span className="landing-platform-name">{p.name}</span>
            </div>
          ))}
          <div className="landing-platform-item">
            <div className="landing-platform-more">+3</div>
            <span className="landing-platform-name">More</span>
          </div>
        </div>
      </section>

      <section className="landing-problem" aria-label="Problems we solve">
        <h2 className="landing-section-title">Sound familiar?</h2>
        <div className="landing-problem-grid">
          <div className="landing-problem-card">
            <div className="landing-problem-pain">😩 "It takes forever to format a receipt every time I make a sale."</div>
            <div className="landing-problem-fix">
              → Pick a platform preset, fill in the amount, download a branded receipt in under a minute.
            </div>
          </div>
          <div className="landing-problem-card">
            <div className="landing-problem-pain">😩 "I never know how to word a reply to an annoyed customer."</div>
            <div className="landing-problem-fix">→ Paste their message, pick a tone, get a ready-to-send AI reply instantly.</div>
          </div>
          <div className="landing-problem-card">
            <div className="landing-problem-pain">😩 "I'm paying for tools I barely use."</div>
            <div className="landing-problem-fix">
              → Points-based pricing — top up when you need it, never pay a recurring fee for idle time.
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" aria-label="Features">
        <h2 className="landing-section-title">Everything in one hub</h2>
        <div className="landing-feature-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🧾</div>
            <div className="landing-feature-text">
              <div className="landing-feature-title">Receipt Management</div>
              <div className="landing-feature-desc">
                Create polished, branded receipts for PayPal, Binance, Cash App, OPay, Zelle and more — download,
                print, email, or share a short link in seconds.
              </div>
            </div>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">💎</div>
            <div className="landing-feature-text">
              <div className="landing-feature-title">Points Economy</div>
              <div className="landing-feature-desc">
                Pay-as-you-go points power every action. Top up anytime with crypto, card, or bank transfer — no
                subscriptions, no waste.
              </div>
            </div>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🤖</div>
            <div className="landing-feature-text">
              <div className="landing-feature-title">AI Reply Assistant</div>
              <div className="landing-feature-desc">
                Paste any customer message and get a smart, tone-matched reply instantly — professional, friendly,
                casual, urgent, or apologetic.
              </div>
            </div>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🛟</div>
            <div className="landing-feature-text">
              <div className="landing-feature-title">Support Page Builder</div>
              <div className="landing-feature-desc">
                Spin up a branded support contact page with your colors, WhatsApp, Telegram and email in one click.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-how" id="landing-how-it-works" aria-label="How it works">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-how-steps">
          <div className="landing-how-step">
            <div className="landing-how-num">1</div>
            <div className="landing-how-title">Pick a platform &amp; enter details</div>
            <div className="landing-how-desc">Choose from 13+ presets or go generic, then add your store name, items and amounts.</div>
          </div>
          <div className="landing-how-step">
            <div className="landing-how-num">2</div>
            <div className="landing-how-title">Preview instantly</div>
            <div className="landing-how-desc">Watch your branded receipt render live, complete with barcode and QR code.</div>
          </div>
          <div className="landing-how-step">
            <div className="landing-how-num">3</div>
            <div className="landing-how-title">Download, print, email or share</div>
            <div className="landing-how-desc">Export as PNG, print directly, email it, or generate a short shareable link.</div>
          </div>
        </div>
      </section>

      <section className="landing-pricing" id="landing-pricing-section" aria-label="Pricing">
        <h2 className="landing-section-title">Simple, transparent pricing</h2>
        <p className="landing-pricing-sub">No subscriptions. Every new account starts with 245 free points.</p>
        <div className="landing-pricing-table">
          <div className="landing-pricing-row landing-pricing-head">
            <span>Action</span>
            <span>Points Cost</span>
          </div>
          <div className="landing-pricing-row">
            <span>Download receipt</span>
            <span>5 pts</span>
          </div>
          <div className="landing-pricing-row">
            <span>Print receipt</span>
            <span>3 pts</span>
          </div>
          <div className="landing-pricing-row">
            <span>Email receipt</span>
            <span>10 pts</span>
          </div>
          <div className="landing-pricing-row">
            <span>Short link</span>
            <span>2 pts</span>
          </div>
          <div className="landing-pricing-row">
            <span>AI reply</span>
            <span>3 pts</span>
          </div>
          <div className="landing-pricing-row">
            <span>Support page</span>
            <span>15 pts</span>
          </div>
        </div>
        <div className="landing-pricing-packages">
          <div className="landing-package-card">
            <div className="landing-package-points">1,000 pts</div>
            <div className="landing-package-price">$10</div>
            <div className="landing-package-desc">Starter</div>
          </div>
          <div className="landing-package-card">
            <div className="landing-package-tag">COMING SOON</div>
            <div className="landing-package-points">5,000 pts</div>
            <div className="landing-package-price">$45</div>
            <div className="landing-package-desc">Pro</div>
          </div>
          <div className="landing-package-card">
            <div className="landing-package-tag">COMING SOON</div>
            <div className="landing-package-points">10,000 pts</div>
            <div className="landing-package-price">$80</div>
            <div className="landing-package-desc">Enterprise</div>
          </div>
        </div>
      </section>

      <section className="landing-faq" id="landing-faq-section" aria-label="Frequently asked questions">
        <h2 className="landing-section-title">Frequently asked questions</h2>
        <details className="landing-faq-item">
          <summary>What are these receipts for?</summary>
          <p>
            Chapo'sHub receipts are simulated, branded records for personal bookkeeping, invoicing your own
            customers, and demo/testing purposes. They are not issued by PayPal, Binance, or any platform they're
            styled after, and are not intended to be submitted as official proof of payment to a third party.
          </p>
        </details>
        <details className="landing-faq-item">
          <summary>Do I need a credit card to sign up?</summary>
          <p>No. Every new account gets 245 free points instantly, no card required. You only pay if/when you want to top up points.</p>
        </details>
        <details className="landing-faq-item">
          <summary>Can I customize the receipt branding?</summary>
          <p>Yes — pick a platform preset for instant styling, or use the generic template and set your own store name, currency, tax rate, and line items.</p>
        </details>
        <details className="landing-faq-item">
          <summary>How does the points system work?</summary>
          <p>
            Every account starts with 245 free points. Actions like downloading, printing, emailing, or generating
            an AI reply each cost a small number of points (shown in the pricing table above). Top up anytime —
            points never expire and there's no recurring subscription.
          </p>
        </details>
        <details className="landing-faq-item">
          <summary>What does the AI reply tool do?</summary>
          <p>
            Paste in a customer's message, choose a tone (professional, friendly, casual, urgent, or apologetic),
            and get an instantly generated reply you can copy and send.
          </p>
        </details>
      </section>

      <section className="landing-final-cta">
        <h2>Ready to get started?</h2>
        <p>Create your free account and get 245 points instantly — no card required.</p>
        <button className="landing-cta-primary" onClick={onSignUp}>
          Start My Free Account
        </button>
      </section>

      <SiteFooter />
    </div>
  )
}

const PLATFORM_ICONS = [
  {
    name: 'Binance',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#F0B90B"/><path d="M20.5 28l-5.5-5.5 5.5-5.5 5.5 5.5-5.5 5.5zm15 0l5.5 5.5-5.5 5.5-5.5-5.5 5.5-5.5zm-7.5-7.5l5.5-5.5 5.5 5.5-5.5 5.5-5.5-5.5zm0 15l-5.5 5.5-5.5-5.5 5.5-5.5 5.5 5.5z" fill="#000"/><circle cx="28" cy="28" r="3.5" fill="#000"/></svg>`
  },
  {
    name: 'Bybit',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#1a1a2e"/><text x="28" y="32" text-anchor="middle" fill="#fff" font-size="10" font-weight="900" font-family="Inter,sans-serif" letter-spacing="1.5">BYBIT</text><rect x="38" y="22" width="2" height="10" fill="#F7A600" rx="1"/></svg>`
  },
  {
    name: 'Coinbase',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#0052FF"/><path d="M28 17c6.075 0 11 4.925 11 11s-4.925 11-11 11-11-4.925-11-11 4.925-11 11-11z" fill="#fff"/><path d="M28 22c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6z" fill="#0052FF"/><rect x="34" y="26" width="8" height="4" rx="2" fill="#fff"/></svg>`
  },
  {
    name: 'PayPal',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#fff"/><path d="M22 18h8c4.4 0 8 3.6 8 8s-3.6 8-8 8h-2l-1 7h-5l3-23z" fill="#003087"/><path d="M24 21h6c3 0 5.5 2.5 5.5 5.5S33 32 30 32h-2l-1 5h-4l1.5-16z" fill="#0070E0"/></svg>`
  },
  {
    name: 'Crypto.com',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#002D72"/><path d="M28 12l14 8v16l-14 8-14-8V20l14-8z" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M22 22h4v4h-4zM26 22h4v4h-4zM30 22h4v4h-4zM24 26h4v4h-4zM28 26h4v4h-4zM26 30h4v4h-4z" fill="#fff"/></svg>`
  },
  {
    name: 'Cash App',
    svg: `<svg viewBox="0 0 56 56"><rect x="4" y="4" width="48" height="48" rx="14" fill="#00D632"/><text x="28" y="38" text-anchor="middle" fill="#fff" font-size="28" font-weight="900" font-family="Inter,sans-serif">$</text></svg>`
  },
  {
    name: 'OPay',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#1DCB8B"/><circle cx="28" cy="28" r="14" fill="none" stroke="#fff" stroke-width="4"/><rect x="10" y="24" width="10" height="8" rx="2" fill="#1B0A3E"/></svg>`
  },
  {
    name: 'Kuda',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#40196D"/><text x="28" y="33" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter,sans-serif">kuda.</text></svg>`
  },
  {
    name: 'Wise',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#9FE870"/><path d="M38 18l-8 20-8-20h6l2 8 2-8h6z" fill="#163300"/></svg>`
  },
  {
    name: 'Venmo',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#008CFF"/><text x="28" y="36" text-anchor="middle" fill="#fff" font-size="22" font-weight="900" font-family="Inter,sans-serif" font-style="italic">V</text></svg>`
  },
  {
    name: 'Zelle',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#6D1ED4"/><text x="28" y="35" text-anchor="middle" fill="#fff" font-size="20" font-weight="900" font-family="Inter,sans-serif">Z</text></svg>`
  },
  {
    name: 'Remitly',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#2E5BFF"/><path d="M20 28l8-8 8 8-8 8-8-8z" fill="#fff"/></svg>`
  },
  {
    name: 'Stripe',
    svg: `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#635BFF"/><text x="28" y="35" text-anchor="middle" fill="#fff" font-size="20" font-weight="900" font-family="Inter,sans-serif">S</text></svg>`
  }
]
