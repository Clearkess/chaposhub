import React from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

// Ported from src/lib/pages/legal.ts. One shared component renders either
// the Privacy Policy or Terms & Conditions body depending on `kind`.
const CONTACT = {
  whatsappDisplay: '+234 705 660 6129',
  whatsappHref: 'https://wa.me/2347056606129',
  email: 'support@chaposhub.com'
}

function ContactLine() {
  return (
    <p>
      Questions? Reach us at{' '}
      <a href={`mailto:${CONTACT.email}`} style={{ color: 'var(--accent-light)' }}>
        {CONTACT.email}
      </a>{' '}
      or via WhatsApp at{' '}
      <a href={CONTACT.whatsappHref} style={{ color: 'var(--accent-light)' }}>
        {CONTACT.whatsappDisplay}
      </a>
      .
    </p>
  )
}

export default function Legal({ kind, onSignIn }: { kind: 'privacy' | 'terms'; onSignIn: () => void }) {
  return (
    <div className="landing-page">
      <SiteHeader onSignIn={onSignIn} />

      <main className="subpage" role="main">
        <section className="subpage-hero">
          <div className="subpage-eyebrow">Legal</div>
          <h1 className="subpage-title">{kind === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}</h1>
        </section>

        <section className="subpage-section legal-content">
          <div className="legal-updated">Last updated: August 2026</div>

          {kind === 'privacy' ? (
            <>
              <h2>1. Information We Collect</h2>
              <p>
                When you create an account, we collect your email address, a username, and a securely hashed
                password. We do not store your password in plain text.
              </p>
              <p>
                When you use the receipt generator, support page builder, or AI reply assistant, we store the
                content you enter (store names, line items, amounts, generated receipts, and AI reply history) so
                you can access your history and re-download past receipts.
              </p>
              <p>
                Points can be bought directly from other Chapo'sHub users through our peer-to-peer (P2P)
                marketplace. Payment for these orders happens directly between buyer and vendor, off-platform
                (e.g. WhatsApp or bank transfer) — we do not process, receive, or store any card or payment
                details ourselves. We only record the order status and the points transferred once a vendor
                confirms payment.
              </p>

              <h2>2. How We Use Your Information</h2>
              <ul>
                <li>To operate your account, points balance, and receipt/history features.</li>
                <li>To credit your account when a points purchase is completed.</li>
                <li>To respond to support requests you send us via WhatsApp, email, or the contact form.</li>
                <li>To maintain the security and integrity of the platform (e.g. detecting abuse).</li>
              </ul>
              <p>We do not sell your personal information to third parties.</p>

              <h2>3. Data Storage</h2>
              <p>Account and receipt data is stored securely. All traffic between your browser and our servers is encrypted with SSL/TLS.</p>

              <h2>4. Third-Party Services</h2>
              <p>Points purchases happen directly between users on our peer-to-peer marketplace — we do not use a third-party payment processor. Any coordination between buyer and vendor (e.g. via WhatsApp) is governed by those services' own terms and privacy policies, not ours.</p>

              <h2>5. Your Rights</h2>
              <p>You may delete individual receipts from your History page at any time. To request full account deletion or a copy of your stored data, contact us using the details below.</p>

              <h2>6. Contact</h2>
              <ContactLine />
            </>
          ) : (
            <>
              <h2>1. What Chapo'sHub Is</h2>
              <p>
                Chapo'sHub is a points-based toolkit for generating branded, simulated receipts, drafting
                AI-assisted customer replies, and building branded support pages. It is a personal productivity and
                demonstration tool.
              </p>

              <h2>2. Acceptable Use — Receipts Are Not Proof of Payment</h2>
              <p>
                Receipts generated on Chapo'sHub are simulated records styled to resemble the branding of platforms
                like PayPal, Binance, Cash App, and others. They are <strong>not issued by, affiliated with, or
                endorsed by</strong> those platforms.
              </p>
              <p>
                <strong>You may not use a Chapo'sHub receipt to:</strong>
              </p>
              <ul>
                <li>Misrepresent to another person or business that a payment was made when it was not.</li>
                <li>Submit as official proof of payment to a bank, merchant, marketplace, or any third party in a dispute or transaction.</li>
                <li>Commit fraud, deception, or any illegal act.</li>
              </ul>
              <p>Violating this section may result in immediate account termination and, where required by law, cooperation with law enforcement.</p>

              <h2>3. Points &amp; Purchases</h2>
              <p>
                New accounts receive 245 free points. Points are consumed when you use certain actions (download,
                print, email, generate a short link, AI reply, or support page). Points purchased via our payment
                partner are non-refundable except where required by law, and do not expire.
              </p>

              <h2>4. Account Responsibility</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>

              <h2>5. Service Availability</h2>
              <p>We aim for high availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue features at any time.</p>

              <h2>6. Limitation of Liability</h2>
              <p>Chapo'sHub is provided "as is." We are not liable for any misuse of generated content by you or any third party, including any use of receipts in violation of Section 2 above.</p>

              <h2>7. Changes to These Terms</h2>
              <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>

              <h2>8. Contact</h2>
              <ContactLine />
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
