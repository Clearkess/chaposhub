import { siteHead, siteHeader, siteFooter } from '../site-chrome'

export function aboutPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${siteHead({
  title: "About Us — Chapo'sHub",
  description: "Chapo'sHub is a points-based hub for generating branded receipts, AI-powered customer replies, and support pages — pay only for what you use, no subscriptions.",
  path: '/about'
})}
</head>
<body class="landing-mode">
${siteHeader('/about')}

<main class="subpage" role="main">
  <section class="subpage-hero">
    <div class="subpage-eyebrow">About Chapo'sHub</div>
    <h1 class="subpage-title">Digital tools for people who move fast</h1>
    <p class="subpage-sub">Chapo'sHub is a points-based hub where you generate branded receipts, draft AI-powered customer replies, and build support pages — all from one dashboard, with pay-as-you-go pricing instead of a subscription.</p>
  </section>

  <section class="subpage-section" aria-label="Our mission">
    <h2>Our Mission</h2>
    <p>To provide a fast, reliable suite of everyday business tools under one roof — receipts, replies, and support pages — without the complexity or recurring cost of a dozen separate subscriptions.</p>
  </section>

  <section class="subpage-section" aria-label="Who we serve">
    <h2>Who We Serve</h2>
    <p>Freelancers documenting sales, small sellers who need a quick branded receipt for a customer, and anyone who wants a faster way to draft a reply to a tricky message. Chapo'sHub scales from one-off use to regular, ongoing needs — you only pay in points for what you actually use.</p>
  </section>

  <section class="subpage-section" aria-label="What we stand for">
    <h2>What We Stand For</h2>
    <div class="subpage-values">
      <div class="subpage-value-card">
        <div class="subpage-value-icon">⚡</div>
        <div class="subpage-value-title">Speed</div>
        <div class="subpage-value-desc">Every tool is built for instant results — generate a receipt or an AI reply in seconds, not minutes.</div>
      </div>
      <div class="subpage-value-card">
        <div class="subpage-value-icon">🔒</div>
        <div class="subpage-value-title">Security</div>
        <div class="subpage-value-desc">SSL encrypted end to end, with account data stored securely in Cloudflare's distributed infrastructure.</div>
      </div>
      <div class="subpage-value-card">
        <div class="subpage-value-icon">🌍</div>
        <div class="subpage-value-title">Accessibility</div>
        <div class="subpage-value-desc">Available worldwide, 24/7, from any device — no installs, no app store required.</div>
      </div>
      <div class="subpage-value-card">
        <div class="subpage-value-icon">✨</div>
        <div class="subpage-value-title">Honesty</div>
        <div class="subpage-value-desc">We're upfront that receipts are simulated records for personal/demo use — not official proof of payment for a third party.</div>
      </div>
    </div>
  </section>

  <section class="subpage-section" style="text-align:center">
    <h2>Ready to get started?</h2>
    <p>Create your free account and get 245 points instantly — no card required.</p>
    <button class="landing-cta-primary" style="margin:0 auto" onclick="location.href='/?auth=register'">Start My Free Account</button>
  </section>
</main>

${siteFooter()}
</body>
</html>`
}
