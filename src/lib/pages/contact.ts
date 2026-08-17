import { siteHead, siteHeader, siteFooter, CONTACT } from '../site-chrome'

export function contactPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${siteHead({
  title: "Contact Us — Chapo'sHub",
  description: "Get in touch with the Chapo'sHub team via WhatsApp or email. We're here to help with receipts, points, and account questions.",
  path: '/contact'
})}
</head>
<body class="landing-mode">
${siteHeader('/contact')}

<main class="subpage" role="main">
  <section class="subpage-hero">
    <div class="subpage-eyebrow">Contact</div>
    <h1 class="subpage-title">We'd love to hear from you</h1>
    <p class="subpage-sub">Have a question, feedback, or need support? Reach out through any of the channels below — we're here to help.</p>
  </section>

  <section class="subpage-section" aria-label="Contact channels">
    <div class="contact-channels">
      <a href="${CONTACT.whatsappHref}" target="_blank" rel="noopener" class="contact-channel-card">
        <div class="contact-channel-icon">💬</div>
        <div>
          <div class="contact-channel-tag">Instant</div>
          <div class="contact-channel-title">WhatsApp</div>
          <div class="contact-channel-value">${CONTACT.whatsappDisplay}</div>
        </div>
      </a>
      <a href="mailto:${CONTACT.email}" class="contact-channel-card">
        <div class="contact-channel-icon">📧</div>
        <div>
          <div class="contact-channel-tag">Email</div>
          <div class="contact-channel-title">Support Email</div>
          <div class="contact-channel-value">${CONTACT.email}</div>
        </div>
      </a>
    </div>
  </section>

  <section class="subpage-section" aria-label="Send a message">
    <h2>Send a Message</h2>
    <p>Fill out the form and we'll open your email client with the details pre-filled.</p>
    <form class="contact-form" id="contactForm">
      <div class="form-field">
        <label for="contactName">Name</label>
        <input type="text" id="contactName" required maxlength="60" placeholder="Your name">
      </div>
      <div class="form-field">
        <label for="contactEmail">Email</label>
        <input type="email" id="contactEmail" required placeholder="you@example.com">
      </div>
      <div class="form-field">
        <label for="contactSubject">Subject</label>
        <input type="text" id="contactSubject" required maxlength="120" placeholder="What's this about?">
      </div>
      <div class="form-field">
        <label for="contactMessage">Message</label>
        <textarea id="contactMessage" required maxlength="1000" placeholder="Include your username or order ID if this is about an existing account/purchase..."></textarea>
      </div>
      <button type="submit" class="action-btn primary" style="width:100%">📨 Send Message</button>
    </form>

    <div class="contact-tips">
      <strong style="font-size:.9rem">Before You Reach Out</strong>
      <ol>
        <li>Check our <a href="/help" style="color:var(--accent-light)">Help Center</a> for instant answers to common questions.</li>
        <li>Include your username or order ID for faster support.</li>
        <li>For urgent issues, use WhatsApp for the quickest response.</li>
      </ol>
    </div>

    <div class="response-times">
      <div class="response-time-item">
        <div class="response-time-val">&lt; 1 hour</div>
        <div class="response-time-label">WhatsApp</div>
      </div>
      <div class="response-time-item">
        <div class="response-time-val">&lt; 24 hours</div>
        <div class="response-time-label">Email</div>
      </div>
    </div>
  </section>
</main>

${siteFooter()}
<script>
document.getElementById('contactForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var name = document.getElementById('contactName').value;
  var email = document.getElementById('contactEmail').value;
  var subject = document.getElementById('contactSubject').value;
  var message = document.getElementById('contactMessage').value;
  var body = 'From: ' + name + ' (' + email + ')\\n\\n' + message;
  var mailto = 'mailto:${CONTACT.email}?subject=' + encodeURIComponent('[Chapo\\'sHub] ' + subject) + '&body=' + encodeURIComponent(body);
  window.location.href = mailto;
});
</script>
</body>
</html>`
}
