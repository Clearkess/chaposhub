import React from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

// Ported from src/lib/pages/about.ts
export default function About({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <div className="landing-page">
      <SiteHeader onSignIn={onSignIn} />

      <main className="subpage" role="main">
        <section className="subpage-hero">
          <div className="subpage-eyebrow">About Chapo'sHub</div>
          <h1 className="subpage-title">Digital tools for people who move fast</h1>
          <p className="subpage-sub">
            Chapo'sHub is a points-based hub where you generate branded receipts, draft AI-powered customer replies,
            and build support pages — all from one dashboard, with pay-as-you-go pricing instead of a subscription.
          </p>
        </section>

        <section className="subpage-section" aria-label="Our mission">
          <h2>Our Mission</h2>
          <p>
            To provide a fast, reliable suite of everyday business tools under one roof — receipts, replies, and
            support pages — without the complexity or recurring cost of a dozen separate subscriptions.
          </p>
        </section>

        <section className="subpage-section" aria-label="Who we serve">
          <h2>Who We Serve</h2>
          <p>
            Freelancers documenting sales, small sellers who need a quick branded receipt for a customer, and anyone
            who wants a faster way to draft a reply to a tricky message. Chapo'sHub scales from one-off use to
            regular, ongoing needs — you only pay in points for what you actually use.
          </p>
        </section>

        <section className="subpage-section" aria-label="What we stand for">
          <h2>What We Stand For</h2>
          <div className="subpage-values">
            <div className="subpage-value-card">
              <div className="subpage-value-icon"><i className="fa-solid fa-bolt"></i></div>
              <div className="subpage-value-title">Speed</div>
              <div className="subpage-value-desc">
                Every tool is built for instant results — generate a receipt or an AI reply in seconds, not minutes.
              </div>
            </div>
            <div className="subpage-value-card">
              <div className="subpage-value-icon"><i className="fa-solid fa-lock"></i></div>
              <div className="subpage-value-title">Security</div>
              <div className="subpage-value-desc">
                SSL encrypted end to end, with account data stored securely in a managed database.
              </div>
            </div>
            <div className="subpage-value-card">
              <div className="subpage-value-icon"><i className="fa-solid fa-earth-americas"></i></div>
              <div className="subpage-value-title">Accessibility</div>
              <div className="subpage-value-desc">Available worldwide, 24/7, from any device — no installs, no app store required.</div>
            </div>
            <div className="subpage-value-card">
              <div className="subpage-value-icon"><i className="fa-solid fa-sparkles"></i></div>
              <div className="subpage-value-title">Honesty</div>
              <div className="subpage-value-desc">
                We're upfront that receipts are simulated records for personal/demo use — not official proof of
                payment for a third party.
              </div>
            </div>
          </div>
        </section>

        <section className="subpage-section" style={{ textAlign: 'center' }}>
          <h2>Ready to get started?</h2>
          <p>Create your free account and get 245 points instantly — no card required.</p>
          <button className="landing-cta-primary" style={{ margin: '0 auto' }} onClick={onSignUp}>
            Start My Free Account
          </button>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
