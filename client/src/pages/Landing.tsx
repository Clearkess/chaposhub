import React, { useEffect } from 'react'
import '../styles/homepage-gold.css'
import GoldHeader from '../components/GoldHeader'
import GoldFooter from '../components/GoldFooter'
import GoldDashboardMockup from '../components/GoldDashboardMockup'
import CountUp from '../components/CountUp'

// ChaposHub homepage — luxury dark SaaS + gold technology redesign.
// Fully isolated under the `.gh-landing` root + `.gh-*` classes (see
// styles/homepage-gold.css). Does not touch the green `.landing-*` theme
// still used by About/Contact/Help/Legal and the authenticated dashboard.
//
// Branding note: the gold "eJ" logo (which includes a firearm-shaped
// element) is used ONLY at small brand-mark scale — header, footer, and the
// dashboard-mockup topbar/sidebar — never as a large standalone graphic and
// never echoed in feature icons or other UI elements, per explicit request.
export default function Landing({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  // Escape the app shell's mobile-app-style `body{max-width:480px}` rule
  // (app.css @media(min-width:768px)) so this full-bleed marketing page can
  // use the full viewport on desktop. Scoped to just this page's lifetime.
  useEffect(() => {
    document.body.classList.add('gh-body-active')
    return () => document.body.classList.remove('gh-body-active')
  }, [])

  return (
    <div className="gh-landing" id="top">
      <GoldHeader onSignIn={onSignIn} onSignUp={onSignUp} />

      {/* 2. HERO */}
      <section className="gh-hero">
        <div className="gh-container gh-hero-grid">
          <div className="gh-hero-copy">
            <div className="gh-hero-badge">✦ Trusted by 401,212+ users worldwide</div>
            <h1 className="gh-hero-title">
              Everything Digital.
              <span>One Powerful Platform.</span>
            </h1>
            <p className="gh-hero-sub">
              Generate receipts, send emails, build support pages, create login pages, and manage your digital
              workflow — all from one powerful dashboard.
            </p>
            <div className="gh-hero-cta">
              <button className="gh-btn gh-btn-primary" onClick={onSignUp}>
                Get Started Free →
              </button>
              <button
                className="gh-btn gh-btn-secondary"
                onClick={() => document.querySelector('#gh-features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Features
              </button>
            </div>
            <div className="gh-hero-note-row">
              <span className="gh-hero-note">🔒 SSL Encrypted</span>
              <span className="gh-hero-note">⚡ Instant Delivery</span>
              <span className="gh-hero-note">🌍 Worldwide</span>
            </div>
          </div>
          <div className="gh-hero-visual">
            <div className="gh-hero-visual-glow" />
            <GoldDashboardMockup />
          </div>
        </div>
      </section>

      {/* 3. TRUST / STATISTICS */}
      <section className="gh-stats" aria-label="Platform stats">
        <div className="gh-container">
          <div className="gh-stats-title">Built for speed. Trusted worldwide.</div>
          <div className="gh-stats-grid">
            <div>
              <div className="gh-stat-num">
                <CountUp target={806095} suffix="+" />
              </div>
              <div className="gh-stat-label">Activities</div>
            </div>
            <div>
              <div className="gh-stat-num">
                <CountUp target={401212} suffix="+" />
              </div>
              <div className="gh-stat-label">Happy Users</div>
            </div>
            <div>
              <div className="gh-stat-num">
                <CountUp target={595986} suffix="+" />
              </div>
              <div className="gh-stat-label">Emails Sent</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES */}
      <section className="gh-section" id="gh-features" aria-label="Features">
        <div className="gh-container">
          <div className="gh-section-head">
            <span className="gh-eyebrow">Features</span>
            <h2 className="gh-section-title">
              Everything You Need.
              <span>One Platform.</span>
            </h2>
            <p className="gh-section-sub">
              A complete suite of digital tools designed for speed, reliability, and ease of use.
            </p>
          </div>
          <div className="gh-feature-grid">
            {FEATURES.map((f) => (
              <div className="gh-feature-card" key={f.title}>
                <div className="gh-feature-icon">{f.icon}</div>
                <div className="gh-feature-title">{f.title}</div>
                <div className="gh-feature-desc">{f.desc}</div>
                <button className="gh-feature-link" onClick={onSignUp}>
                  {f.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="gh-section" id="gh-how" aria-label="How it works">
        <div className="gh-container">
          <div className="gh-section-head">
            <span className="gh-eyebrow">How It Works</span>
            <h2 className="gh-section-title">From Idea to Result in Three Steps</h2>
          </div>
          <div className="gh-how-steps">
            <div className="gh-how-step">
              <div className="gh-how-num">01</div>
              <div className="gh-how-title">Choose</div>
              <div className="gh-how-desc">Select the ChaposHub tool you need.</div>
            </div>
            <div className="gh-how-step">
              <div className="gh-how-num">02</div>
              <div className="gh-how-title">Customize</div>
              <div className="gh-how-desc">Enter your information and configure your desired result.</div>
            </div>
            <div className="gh-how-step">
              <div className="gh-how-num">03</div>
              <div className="gh-how-title">Generate</div>
              <div className="gh-how-desc">Generate your output instantly and manage it from your dashboard.</div>
            </div>
          </div>
          <div className="gh-how-cta">
            <button className="gh-btn gh-btn-primary" onClick={onSignUp}>
              Start Creating Free →
            </button>
          </div>
        </div>
      </section>

      {/* 6. DASHBOARD PREVIEW */}
      <section className="gh-dash-preview" id="gh-dashboard-preview" aria-label="Dashboard preview">
        <div className="gh-dash-preview-glow" />
        <div className="gh-container gh-dash-preview-inner">
          <div className="gh-section-head">
            <span className="gh-eyebrow">Dashboard</span>
            <h2 className="gh-section-title">Your Entire Digital Workflow. In One Place.</h2>
          </div>
          <div className="gh-dash-preview-mockup">
            <GoldDashboardMockup large />
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS */}
      <section className="gh-section" aria-label="Testimonials">
        <div className="gh-container">
          <div className="gh-section-head">
            <span className="gh-eyebrow">Testimonials</span>
            <h2 className="gh-section-title">Trusted by Users Worldwide</h2>
          </div>
          <div className="gh-testimonial-grid">
            {TESTIMONIALS.map((t, i) => (
              <div className="gh-testimonial-card" key={i}>
                <div className="gh-testimonial-quote">&ldquo;</div>
                <p className="gh-testimonial-text">{t}</p>
                <div className="gh-testimonial-author">
                  <div className="gh-testimonial-avatar">U</div>
                  <div>
                    <div className="gh-testimonial-name">Verified User</div>
                    <div className="gh-testimonial-tag">ChaposHub member</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. PRICING */}
      <section className="gh-section" id="gh-pricing" aria-label="Pricing">
        <div className="gh-container">
          <div className="gh-section-head">
            <span className="gh-eyebrow">Pricing</span>
            <h2 className="gh-section-title">Simple Plans. Powerful Tools.</h2>
          </div>
          <div className="gh-pricing-grid">
            <div className="gh-price-card">
              <div className="gh-price-name">Free</div>
              <div className="gh-price-amount">
                $0<span>/month</span>
              </div>
              <div className="gh-price-desc">Core digital tools</div>
              <ul className="gh-price-features">
                <li>Core digital tools</li>
                <li>Basic receipt generation</li>
                <li>Activity history</li>
                <li>Dashboard access</li>
                <li>Mobile access</li>
              </ul>
              <button className="gh-btn gh-btn-secondary gh-btn-block" onClick={onSignUp}>
                Get Started Free →
              </button>
            </div>

            <div className="gh-price-card gh-price-featured">
              <div className="gh-price-badge">Most Popular</div>
              <div className="gh-price-name">Pro</div>
              <div className="gh-price-amount">
                $9.99<span>/month</span>
              </div>
              <div className="gh-price-desc">For power users</div>
              <ul className="gh-price-features">
                <li>Everything in Free</li>
                <li>Higher usage limits</li>
                <li>Advanced generation</li>
                <li>Extended history</li>
                <li>Priority processing</li>
                <li>Priority support</li>
              </ul>
              <button className="gh-btn gh-btn-primary gh-btn-block" onClick={onSignUp}>
                Upgrade to Pro →
              </button>
            </div>

            <div className="gh-price-card">
              <div className="gh-price-name">Business</div>
              <div className="gh-price-amount">Custom</div>
              <div className="gh-price-desc">For teams and high-volume users.</div>
              <ul className="gh-price-features">
                <li>Everything in Pro</li>
                <li>Higher limits</li>
                <li>Team features</li>
                <li>Advanced management</li>
                <li>Dedicated support</li>
                <li>Custom solutions</li>
              </ul>
              <a href="/contact" className="gh-btn gh-btn-secondary gh-btn-block">
                Contact Us →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="gh-section" id="gh-faq" aria-label="Frequently asked questions">
        <div className="gh-container">
          <div className="gh-section-head">
            <span className="gh-eyebrow">FAQ</span>
            <h2 className="gh-section-title">Frequently Asked Questions</h2>
          </div>
          <div className="gh-faq-list">
            {FAQS.map((f) => (
              <details className="gh-faq-item" key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="gh-final-cta">
        <div className="gh-final-cta-inner">
          <h2>Ready to Build Faster?</h2>
          <div className="gh-final-cta-lede">Everything you need. One ChaposHub.</div>
          <p className="gh-final-cta-desc">
            Join thousands of users using ChaposHub to simplify their digital workflows.
          </p>
          <button className="gh-btn gh-btn-primary" onClick={onSignUp}>
            Get Started Free →
          </button>
          <div className="gh-final-cta-note">
            <span>No complicated setup</span>
            <span>Fast workflows</span>
            <span>Worldwide access</span>
          </div>
        </div>
      </section>

      <GoldFooter />
    </div>
  )
}

const FEATURES = [
  {
    icon: '🧾',
    title: 'Receipt Generator',
    desc: 'Create professional digital receipts in seconds.',
    cta: 'Generate Receipt'
  },
  {
    icon: '⚡',
    title: 'Instant Generation',
    desc: 'Turn your ideas into usable digital assets quickly.',
    cta: 'Generate Now'
  },
  {
    icon: '✉️',
    title: 'Flash Email',
    desc: 'Create and manage fast email workflows from one place.',
    cta: 'Create Email'
  },
  {
    icon: '🛠️',
    title: 'Support Page Builder',
    desc: 'Build professional support pages without complicated setup.',
    cta: 'Build Page'
  },
  {
    icon: '🔐',
    title: 'Login Page Builder',
    desc: 'Create modern authentication pages for your projects.',
    cta: 'Create Login'
  },
  {
    icon: '📊',
    title: 'Activity Management',
    desc: 'Track your generated services and account activity from one dashboard.',
    cta: 'View Activity'
  }
]

const TESTIMONIALS = [
  'ChaposHub gives me everything I need in one place. The dashboard is simple and extremely easy to use.',
  "The generation tools are fast, and I don't have to keep switching between different platforms.",
  'The interface feels modern and professional. ChaposHub has become part of my everyday workflow.'
]

const FAQS = [
  {
    q: 'What is ChaposHub?',
    a: 'ChaposHub is an all-in-one digital services platform that brings multiple digital tools into one dashboard.'
  },
  {
    q: 'Is ChaposHub free?',
    a: 'Yes. Users can get started with the free plan and upgrade when they need additional capabilities.'
  },
  {
    q: 'Can I use ChaposHub on my phone?',
    a: 'Yes. The website and dashboard are designed to work across desktop and mobile devices.'
  },
  {
    q: 'Do I need technical knowledge?',
    a: 'No. ChaposHub is designed around simple workflows that make the tools easy to use.'
  },
  {
    q: 'What tools are available?',
    a: 'ChaposHub can provide receipt generation, email tools, support-page creation, login-page creation, instant generation, and additional digital utilities.'
  },
  {
    q: 'Is ChaposHub secure?',
    a: 'ChaposHub uses HTTPS/SSL and appropriate security practices to protect user accounts and information.'
  }
]
