import React, { useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

// Ported from src/lib/pages/contact.ts
const CONTACT = {
  whatsappDisplay: '+234 705 660 6129',
  whatsappHref: 'https://wa.me/2347056606129',
  email: 'support@chaposhub.com'
}

export default function Contact({ onSignIn }: { onSignIn: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = `From: ${name} (${email})\n\n${message}`
    const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      `[Chapo'sHub] ${subject}`
    )}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  return (
    <div className="landing-page">
      <SiteHeader onSignIn={onSignIn} />

      <main className="subpage" role="main">
        <section className="subpage-hero">
          <div className="subpage-eyebrow">Contact</div>
          <h1 className="subpage-title">We'd love to hear from you</h1>
          <p className="subpage-sub">
            Have a question, feedback, or need support? Reach out through any of the channels below — we're here to
            help.
          </p>
        </section>

        <section className="subpage-section" aria-label="Contact channels">
          <div className="contact-channels">
            <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className="contact-channel-card">
              <div className="contact-channel-icon"><i className="fa-brands fa-telegram"></i></div>
              <div>
                <div className="contact-channel-tag">Instant</div>
                <div className="contact-channel-title">WhatsApp</div>
                <div className="contact-channel-value">{CONTACT.whatsappDisplay}</div>
              </div>
            </a>
            <a href={`mailto:${CONTACT.email}`} className="contact-channel-card">
              <div className="contact-channel-icon"><i className="fa-solid fa-envelope"></i></div>
              <div>
                <div className="contact-channel-tag">Email</div>
                <div className="contact-channel-title">Support Email</div>
                <div className="contact-channel-value">{CONTACT.email}</div>
              </div>
            </a>
          </div>
        </section>

        <section className="subpage-section" aria-label="Send a message">
          <h2>Send a Message</h2>
          <p>Fill out the form and we'll open your email client with the details pre-filled.</p>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="contactName">Name</label>
              <input
                type="text"
                id="contactName"
                required
                maxLength={60}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="contactEmail">Email</label>
              <input
                type="email"
                id="contactEmail"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="contactSubject">Subject</label>
              <input
                type="text"
                id="contactSubject"
                required
                maxLength={120}
                placeholder="What's this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="contactMessage">Message</label>
              <textarea
                id="contactMessage"
                required
                maxLength={1000}
                placeholder="Include your username or order ID if this is about an existing account/purchase..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <button type="submit" className="action-btn primary" style={{ width: '100%' }}>
              <i className="fa-solid fa-paper-plane"></i> Send Message
            </button>
          </form>

          <div className="contact-tips">
            <strong style={{ fontSize: '.9rem' }}>Before You Reach Out</strong>
            <ol>
              <li>
                Check our{' '}
                <a href="/help" style={{ color: 'var(--accent-light)' }}>
                  Help Center
                </a>{' '}
                for instant answers to common questions.
              </li>
              <li>Include your username or order ID for faster support.</li>
              <li>For urgent issues, use WhatsApp for the quickest response.</li>
            </ol>
          </div>

          <div className="response-times">
            <div className="response-time-item">
              <div className="response-time-val">&lt; 1 hour</div>
              <div className="response-time-label">WhatsApp</div>
            </div>
            <div className="response-time-item">
              <div className="response-time-val">&lt; 24 hours</div>
              <div className="response-time-label">Email</div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
