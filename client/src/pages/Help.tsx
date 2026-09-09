import React, { useMemo, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

// Ported from src/lib/pages/help.ts
const FAQS: { q: string; a: string }[] = [
  {
    q: 'What are these receipts for?',
    a: "Chapo'sHub receipts are simulated, branded records for personal bookkeeping, invoicing your own customers, and demo/testing purposes. They are not issued by PayPal, Binance, or any platform they're styled after, and are not intended to be submitted as official proof of payment to a third party."
  },
  {
    q: 'Do I need a credit card to sign up?',
    a: 'No. Every new account gets 245 free points instantly, no card required. You only pay if/when you want to top up points.'
  },
  {
    q: 'Can I customize the receipt branding?',
    a: 'Yes — pick a platform preset for instant styling, or use the generic template and set your own store name, currency, tax rate, and line items.'
  },
  {
    q: 'How does the points system work?',
    a: "Every account starts with 245 free points. Actions like downloading, printing, emailing, or generating an AI reply each cost a small number of points. Top up anytime — points never expire and there's no recurring subscription."
  },
  {
    q: 'What does the AI reply tool do?',
    a: "Paste in a customer's message, choose a tone (professional, friendly, casual, urgent, or apologetic), and get an instantly generated reply you can copy and send."
  },
  {
    q: 'How do I buy points?',
    a: "Open the Points page and switch to the Buy tab to browse vendors selling points at their own NGN-per-point rate. Place an order, pay the vendor directly off-platform (WhatsApp or bank transfer), and once the vendor confirms your payment, the points transfer to your account automatically."
  },
  {
    q: "I paid a vendor but didn't receive my points — what do I do?",
    a: "First check the Orders tab on the Points page — the vendor needs to confirm your payment before points transfer. If it's been a while and the vendor hasn't confirmed, contact support with your order ID and we'll help you sort it out."
  },
  {
    q: 'What is the Support Page Builder?',
    a: 'It lets you generate a branded contact page with your own company name, brand color, and contact channels (email, WhatsApp, Telegram) in one click — useful for giving customers a clean place to reach you.'
  },
  {
    q: 'Is my data secure?',
    a: "All traffic is SSL encrypted, and your account data is stored securely. We never store your password in plain text."
  },
  {
    q: 'Can I delete my account or receipts?',
    a: 'Yes — you can delete individual receipts from your History page. For full account deletion, contact support and we\'ll process the request.'
  }
]

export default function Help({ onSignIn }: { onSignIn: () => void }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQS
    return FAQS.filter((f) => (f.q + ' ' + f.a).toLowerCase().includes(q))
  }, [query])

  return (
    <div className="landing-page">
      <SiteHeader onSignIn={onSignIn} />

      <main className="subpage" role="main">
        <section className="subpage-hero">
          <div className="subpage-eyebrow">Help Center</div>
          <h1 className="subpage-title">How can we help you?</h1>
          <p className="subpage-sub">Find answers to common questions below, or reach out to our support team directly.</p>
        </section>

        <section className="subpage-section" aria-label="Frequently asked questions">
          <div className="help-search">
            <input
              type="text"
              placeholder="Search the help center..."
              aria-label="Search FAQs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            {filtered.map((f, i) => (
              <details className="landing-faq-item" key={i}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="help-faq-empty">
              No results found. Try a different search, or{' '}
              <a href="/contact" style={{ color: 'var(--accent-light)' }}>
                contact us
              </a>{' '}
              directly.
            </div>
          )}
        </section>

        <section className="subpage-section" style={{ textAlign: 'center' }}>
          <h2>Still need help?</h2>
          <p>Our support team is ready to assist you via WhatsApp or email.</p>
          <a className="landing-cta-primary" style={{ margin: '0 auto', display: 'inline-block' }} href="/contact">
            Contact Support
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
