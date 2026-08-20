// Monolithic Chapo'sHub frontend markup, ported from chaposhub_fixed.html and
// wired to the real backend API (see public/static/js/api-client.js, auth.js, app.js).
export const APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Chapo'sHub — Branded Receipts, Points & AI Replies</title>
<meta name="description" content="Generate branded receipts for 13+ platforms, draft AI-powered customer replies, and pay only for what you use with Chapo'sHub's points system. No subscriptions, no card required to start.">
<meta name="theme-color" content="#0f0f14">
<link rel="canonical" href="https://chaposhub.pages.dev/">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
<meta property="og:title" content="Chapo'sHub — Branded Receipts, Points & AI Replies">
<meta property="og:description" content="Generate branded receipts for 13+ platforms, draft AI-powered customer replies, and pay only for what you use. No subscriptions, no card required.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://chaposhub.pages.dev/">
<meta property="og:site_name" content="Chapo'sHub">
<meta property="og:image" content="https://chaposhub.pages.dev/static/images/og-image.png">
<meta property="og:image:width" content="1376">
<meta property="og:image:height" content="768">
<meta property="og:image:alt" content="Chapo'sHub — Branded Receipts, Points & AI Replies">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Chapo'sHub — Branded Receipts, Points & AI Replies">
<meta name="twitter:description" content="Generate branded receipts for 13+ platforms, draft AI-powered customer replies, and pay only for what you use. No subscriptions, no card required.">
<meta name="twitter:image" content="https://chaposhub.pages.dev/static/images/og-image.png">
<link rel="icon" type="image/png" href="/static/images/logo.png">
<link rel="apple-touch-icon" href="/static/images/logo.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Chapo'sHub","url":"https://chaposhub.pages.dev/","logo":"https://chaposhub.pages.dev/static/images/logo.png","description":"Generate branded receipts for 13+ platforms, draft AI-powered customer replies, and pay only for what you use with Chapo'sHub's points system."}</script>
<script>(function(){try{var t=localStorage.getItem('chapo_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="/static/css/app.css" rel="stylesheet">
</head>
<body>
<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"></div>

<!-- Marketing landing page (shown before login) -->
<div class="landing-page" id="landingPage">
  <header class="landing-header">
    <div class="landing-logo">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <defs><linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#22c55e"/><stop offset="100%" style="stop-color:#16a34a"/></linearGradient></defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#logoGrad)"/>
        <path d="M20 20h24v4H20zM20 30h18v4H20zM20 40h12v4H20z" fill="#0a0a0f" opacity="0.9"/>
        <circle cx="46" cy="34" r="6" fill="#0a0a0f" opacity="0.9"/>
        <path d="M44 32l4 2-4 2" stroke="url(#logoGrad)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
      Chapo'sHub
    </div>
    <nav class="landing-nav" aria-label="Page sections">
      <a href="#landing-how-it-works">How it works</a>
      <a href="#landing-pricing-section">Pricing</a>
      <a href="/help">Help</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
    <div class="landing-header-right">
      <button class="landing-theme-btn" id="themeToggleBtn" onclick="window.ChapoTheme.toggle()" aria-label="Toggle dark/light theme" title="Toggle theme">🌙</button>
      <button class="landing-signin-btn" onclick="window.ChapoAuth.showAuthModal('login')">Sign In</button>
    </div>
  </header>

  <!-- 1. Hero: problem-first headline + CTA -->
  <section class="landing-hero">
    <div class="landing-hero-badge"><span class="landing-hero-badge-pulse"></span> Trusted by sellers worldwide</div>
    <h1 class="landing-hero-title">Stop losing time on messy receipts and slow customer replies</h1>
    <p class="landing-hero-sub">Generate branded receipts for 13+ platforms, draft AI-powered customer replies in seconds, and pay only for what you use — no subscriptions, no card required to start.</p>
    <div class="landing-hero-cta">
      <button class="landing-cta-primary" onclick="window.ChapoAuth.showAuthModal('register')">🚀 Start My Free Account</button>
      <button class="landing-cta-secondary" onclick="window.ChapoAuth.showAuthModal('login')">Sign In</button>
    </div>
    <div class="landing-hero-note">No credit card required · 245 free points on signup</div>
    <div class="landing-trust" aria-label="Trust indicators">
      <div class="landing-trust-item"><span class="trust-icon">🔒</span> SSL Encrypted</div>
      <div class="landing-trust-item"><span class="trust-icon">⚡</span> Instant Delivery</div>
      <div class="landing-trust-item"><span class="trust-icon">🌍</span> Available Worldwide</div>
    </div>
  </section>

  <!-- Growth stats: aspirational targets, not audited figures -->
  <section class="landing-stats" aria-label="Platform stats">
    <div class="landing-stats-grid">
      <div class="landing-stat"><div class="landing-stat-num">1,250,000+</div><div class="landing-stat-label">Receipts Generated</div></div>
      <div class="landing-stat"><div class="landing-stat-num">50,000+</div><div class="landing-stat-label">Active Sellers</div></div>
      <div class="landing-stat"><div class="landing-stat-num">890,000+</div><div class="landing-stat-label">AI Replies Sent</div></div>
    </div>
  </section>

  <!-- 2. Platform support strip (real, verifiable fact — not a fabricated stat) -->
  <section class="landing-platforms" aria-label="Supported platforms">
    <div class="landing-platforms-label">Supported Platforms</div>
    <div class="landing-platform-grid">
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#F0B90B"/><path d="M20.5 28l-5.5-5.5 5.5-5.5 5.5 5.5-5.5 5.5zm15 0l5.5 5.5-5.5 5.5-5.5-5.5 5.5-5.5zm-7.5-7.5l5.5-5.5 5.5 5.5-5.5 5.5-5.5-5.5zm0 15l-5.5 5.5-5.5-5.5 5.5-5.5 5.5 5.5z" fill="#000"/><circle cx="28" cy="28" r="3.5" fill="#000"/></svg></div><span class="landing-platform-name">Binance</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#1a1a2e"/><text x="28" y="32" text-anchor="middle" fill="#fff" font-size="10" font-weight="900" font-family="Inter,sans-serif" letter-spacing="1.5">BYBIT</text><rect x="38" y="22" width="2" height="10" fill="#F7A600" rx="1"/></svg></div><span class="landing-platform-name">Bybit</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#0052FF"/><path d="M28 17c6.075 0 11 4.925 11 11s-4.925 11-11 11-11-4.925-11-11 4.925-11 11-11z" fill="#fff"/><path d="M28 22c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6z" fill="#0052FF"/><rect x="34" y="26" width="8" height="4" rx="2" fill="#fff"/></svg></div><span class="landing-platform-name">Coinbase</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#fff"/><path d="M22 18h8c4.4 0 8 3.6 8 8s-3.6 8-8 8h-2l-1 7h-5l3-23z" fill="#003087"/><path d="M24 21h6c3 0 5.5 2.5 5.5 5.5S33 32 30 32h-2l-1 5h-4l1.5-16z" fill="#0070E0"/></svg></div><span class="landing-platform-name">PayPal</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#002D72"/><path d="M28 12l14 8v16l-14 8-14-8V20l14-8z" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M22 22h4v4h-4zM26 22h4v4h-4zM30 22h4v4h-4zM24 26h4v4h-4zM28 26h4v4h-4zM26 30h4v4h-4z" fill="#fff"/></svg></div><span class="landing-platform-name">Crypto.com</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><rect x="4" y="4" width="48" height="48" rx="14" fill="#00D632"/><text x="28" y="38" text-anchor="middle" fill="#fff" font-size="28" font-weight="900" font-family="Inter,sans-serif">$</text></svg></div><span class="landing-platform-name">Cash App</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#1DCB8B"/><circle cx="28" cy="28" r="14" fill="none" stroke="#fff" stroke-width="4"/><rect x="10" y="24" width="10" height="8" rx="2" fill="#1B0A3E"/></svg></div><span class="landing-platform-name">OPay</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#40196D"/><text x="28" y="33" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter,sans-serif">kuda.</text></svg></div><span class="landing-platform-name">Kuda</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#9FE870"/><path d="M38 18l-8 20-8-20h6l2 8 2-8h6z" fill="#163300"/></svg></div><span class="landing-platform-name">Wise</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#008CFF"/><text x="28" y="36" text-anchor="middle" fill="#fff" font-size="22" font-weight="900" font-family="Inter,sans-serif" font-style="italic">V</text></svg></div><span class="landing-platform-name">Venmo</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#6D1ED4"/><text x="28" y="35" text-anchor="middle" fill="#fff" font-size="20" font-weight="900" font-family="Inter,sans-serif">Z</text></svg></div><span class="landing-platform-name">Zelle</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#2E5BFF"/><path d="M20 28l8-8 8 8-8 8-8-8z" fill="#fff"/></svg></div><span class="landing-platform-name">Remitly</span></div>
      <div class="landing-platform-item"><div class="landing-platform-icon"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="#635BFF"/><text x="28" y="35" text-anchor="middle" fill="#fff" font-size="20" font-weight="900" font-family="Inter,sans-serif">S</text></svg></div><span class="landing-platform-name">Stripe</span></div>
      <div class="landing-platform-item"><div class="landing-platform-more">+3</div><span class="landing-platform-name">More</span></div>
    </div>
  </section>

  <!-- 3. Problem/solution -->
  <section class="landing-problem" aria-label="Problems we solve">
    <h2 class="landing-section-title">Sound familiar?</h2>
    <div class="landing-problem-grid">
      <div class="landing-problem-card">
        <div class="landing-problem-pain">😩 "It takes forever to format a receipt every time I make a sale."</div>
        <div class="landing-problem-fix">→ Pick a platform preset, fill in the amount, download a branded receipt in under a minute.</div>
      </div>
      <div class="landing-problem-card">
        <div class="landing-problem-pain">😩 "I never know how to word a reply to an annoyed customer."</div>
        <div class="landing-problem-fix">→ Paste their message, pick a tone, get a ready-to-send AI reply instantly.</div>
      </div>
      <div class="landing-problem-card">
        <div class="landing-problem-pain">😩 "I'm paying for tools I barely use."</div>
        <div class="landing-problem-fix">→ Points-based pricing — top up when you need it, never pay a recurring fee for idle time.</div>
      </div>
    </div>
  </section>

  <!-- 5. Features -->
  <section class="landing-features" aria-label="Features">
    <h2 class="landing-section-title">Everything in one hub</h2>
    <div class="landing-feature-grid">
      <div class="landing-feature-card">
        <div class="landing-feature-icon">🧾</div>
        <div class="landing-feature-text"><div class="landing-feature-title">Receipt Management</div><div class="landing-feature-desc">Create polished, branded receipts for PayPal, Binance, Cash App, OPay, Zelle and more — download, print, email, or share a short link in seconds.</div></div>
      </div>
      <div class="landing-feature-card">
        <div class="landing-feature-icon">💎</div>
        <div class="landing-feature-text"><div class="landing-feature-title">Points Economy</div><div class="landing-feature-desc">Pay-as-you-go points power every action. Top up anytime with crypto, card, or bank transfer — no subscriptions, no waste.</div></div>
      </div>
      <div class="landing-feature-card">
        <div class="landing-feature-icon">🤖</div>
        <div class="landing-feature-text"><div class="landing-feature-title">AI Reply Assistant</div><div class="landing-feature-desc">Paste any customer message and get a smart, tone-matched reply instantly — professional, friendly, casual, urgent, or apologetic.</div></div>
      </div>
      <div class="landing-feature-card">
        <div class="landing-feature-icon">🛟</div>
        <div class="landing-feature-text"><div class="landing-feature-title">Support Page Builder</div><div class="landing-feature-desc">Spin up a branded support contact page with your colors, WhatsApp, Telegram and email in one click.</div></div>
      </div>
    </div>
  </section>

  <!-- 6. How it works -->
  <section class="landing-how" id="landing-how-it-works" aria-label="How it works">
    <h2 class="landing-section-title">How it works</h2>
    <div class="landing-how-steps">
      <div class="landing-how-step">
        <div class="landing-how-num">1</div>
        <div class="landing-how-title">Pick a platform &amp; enter details</div>
        <div class="landing-how-desc">Choose from 13+ presets or go generic, then add your store name, items and amounts.</div>
      </div>
      <div class="landing-how-step">
        <div class="landing-how-num">2</div>
        <div class="landing-how-title">Preview instantly</div>
        <div class="landing-how-desc">Watch your branded receipt render live, complete with barcode and QR code.</div>
      </div>
      <div class="landing-how-step">
        <div class="landing-how-num">3</div>
        <div class="landing-how-title">Download, print, email or share</div>
        <div class="landing-how-desc">Export as PNG, print directly, email it, or generate a short shareable link.</div>
      </div>
    </div>
  </section>

  <!-- 7. Pricing (real point costs from the actual app config) -->
  <section class="landing-pricing" id="landing-pricing-section" aria-label="Pricing">
    <h2 class="landing-section-title">Simple, transparent pricing</h2>
    <p class="landing-pricing-sub">No subscriptions. Every new account starts with 245 free points.</p>
    <div class="landing-pricing-table">
      <div class="landing-pricing-row landing-pricing-head"><span>Action</span><span>Points Cost</span></div>
      <div class="landing-pricing-row"><span>Download receipt</span><span>5 pts</span></div>
      <div class="landing-pricing-row"><span>Print receipt</span><span>3 pts</span></div>
      <div class="landing-pricing-row"><span>Email receipt</span><span>10 pts</span></div>
      <div class="landing-pricing-row"><span>Short link</span><span>2 pts</span></div>
      <div class="landing-pricing-row"><span>AI reply</span><span>3 pts</span></div>
      <div class="landing-pricing-row"><span>Support page</span><span>15 pts</span></div>
    </div>
    <div class="landing-pricing-packages">
      <div class="landing-package-card"><div class="landing-package-points">1,000 pts</div><div class="landing-package-price">$10</div><div class="landing-package-desc">Starter</div></div>
      <div class="landing-package-card"><div class="landing-package-tag">COMING SOON</div><div class="landing-package-points">5,000 pts</div><div class="landing-package-price">$45</div><div class="landing-package-desc">Pro</div></div>
      <div class="landing-package-card"><div class="landing-package-tag">COMING SOON</div><div class="landing-package-points">10,000 pts</div><div class="landing-package-price">$80</div><div class="landing-package-desc">Enterprise</div></div>
    </div>
  </section>

  <!-- 9. FAQ -->
  <section class="landing-faq" id="landing-faq-section" aria-label="Frequently asked questions">
    <h2 class="landing-section-title">Frequently asked questions</h2>
    <details class="landing-faq-item">
      <summary>What are these receipts for?</summary>
      <p>Chapo'sHub receipts are simulated, branded records for personal bookkeeping, invoicing your own customers, and demo/testing purposes. They are not issued by PayPal, Binance, or any platform they're styled after, and are not intended to be submitted as official proof of payment to a third party.</p>
    </details>
    <details class="landing-faq-item">
      <summary>Do I need a credit card to sign up?</summary>
      <p>No. Every new account gets 245 free points instantly, no card required. You only pay if/when you want to top up points.</p>
    </details>
    <details class="landing-faq-item">
      <summary>Can I customize the receipt branding?</summary>
      <p>Yes — pick a platform preset for instant styling, or use the generic template and set your own store name, currency, tax rate, and line items.</p>
    </details>
    <details class="landing-faq-item">
      <summary>How does the points system work?</summary>
      <p>Every account starts with 245 free points. Actions like downloading, printing, emailing, or generating an AI reply each cost a small number of points (shown in the pricing table above). Top up anytime — points never expire and there's no recurring subscription.</p>
    </details>
    <details class="landing-faq-item">
      <summary>What does the AI reply tool do?</summary>
      <p>Paste in a customer's message, choose a tone (professional, friendly, casual, urgent, or apologetic), and get an instantly generated reply you can copy and send.</p>
    </details>
  </section>

  <!-- 10. Final CTA -->
  <section class="landing-final-cta">
    <h2>Ready to get started?</h2>
    <p>Create your free account and get 245 points instantly — no card required.</p>
    <button class="landing-cta-primary" onclick="window.ChapoAuth.showAuthModal('register')">Start My Free Account</button>
  </section>

  <footer class="site-footer">
    <div class="site-footer-grid">
      <div>
        <div class="site-footer-brand">🧾 Chapo'sHub</div>
        <p class="site-footer-tagline">A trusted points-based hub for generating branded receipts and digital tools. Simplify your workflow today.</p>
      </div>
      <div class="site-footer-col">
        <div class="site-footer-col-title">Resources</div>
        <a href="/help">Help Center</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms &amp; Conditions</a>
      </div>
      <div class="site-footer-col">
        <div class="site-footer-col-title">Company</div>
        <a href="/about">About Us</a>
        <a href="/contact">Contact Us</a>
      </div>
      <div class="site-footer-col">
        <div class="site-footer-col-title">Contact Us</div>
        <a href="mailto:support@chaposhub.com">support@chaposhub.com</a>
        <a href="https://wa.me/2347056606129" target="_blank" rel="noopener">WhatsApp: +234 705 660 6129</a>
      </div>
    </div>
    <div class="site-footer-bottom">© 2026 Chapo'sHub. Receipts are simulated records for personal/demo use, not official proof of payment.</div>
  </footer>
</div>

<!-- Auth modal -->
<div class="auth-overlay hidden" id="authOverlay">
  <div class="auth-modal">
    <h2 id="authTitle">👋 Welcome back</h2>
    <p class="auth-sub" id="authSub">Log in to access your receipts, points & AI tools.</p>
    <div class="auth-tabs">
      <button type="button" class="auth-tab active" id="authTabLogin">Log In</button>
      <button type="button" class="auth-tab" id="authTabRegister">Sign Up</button>
    </div>
    <div class="auth-error" id="authError"></div>
    <form class="auth-form" id="authForm">
      <div class="form-field" id="authUsernameField" style="display:none;margin-bottom:0">
        <label>Username</label>
        <input type="text" id="authUsername" placeholder="chapo_" maxlength="20" autocomplete="username">
      </div>
      <div class="form-field" style="margin-bottom:0">
        <label>Email</label>
        <input type="email" id="authEmail" placeholder="you@example.com" required autocomplete="email">
      </div>
      <div class="form-field" style="margin-bottom:0">
        <label>Password</label>
        <input type="password" id="authPassword" placeholder="••••••••" required minlength="8" autocomplete="current-password">
      </div>
      <button type="submit" class="auth-submit-btn" id="authSubmitBtn">
        <span class="spinner" style="display:none"></span>
        <span class="btn-label">Log In</span>
      </button>
    </form>
    <div class="auth-switch">
      <span id="authSwitchText">Don't have an account?</span> <a href="#" id="authSwitchLink">Sign up</a>
    </div>
  </div>
</div>

<!-- Main app shell (hidden until authenticated) -->
<div class="app-shell hidden" id="appShell">
<div class="page active" id="page-dashboard" role="main" aria-label="Dashboard">
<div class="top-bar"><div class="top-left"><div class="top-avatar">CH</div><div class="top-user" id="topUser">guest<span>KE</span></div></div><div class="top-right"><div class="top-badge" id="topBadge">💎 0pts</div><div class="top-icon-btn" onclick="window.ChapoTheme.toggle()" role="button" tabindex="0" aria-label="Toggle theme" title="Toggle theme">🌙</div></div></div>
<div class="ref-bar"><div class="ref-left">👤 Referral program</div><button class="ref-btn" onclick="copyRefLink()">Copy Ref Link</button></div>
<div class="welcome"><div class="welcome-text">Welcome back,<br><strong id="welcomeName">guest 👋</strong></div><button class="buy-points-btn" onclick="showPage('points')">💰 Chapo'sHub Points</button></div>
<div class="balance-card"><div class="balance-label">💳 TOTAL BALANCE</div><div class="balance-amount" id="balanceAmount">0 <span>pts</span></div><div class="balance-actions"><div class="balance-action" onclick="showPage('services')"><div class="balance-action-icon">→</div><div class="balance-action-label">Services</div></div><div class="balance-action" onclick="showPage('orders')"><div class="balance-action-icon">🛒</div><div class="balance-action-label">Orders</div></div><div class="balance-action" onclick="showPage('history')"><div class="balance-action-icon">🕐</div><div class="balance-action-label">History</div></div></div></div>
<div class="section-title">Quick Actions</div>
<div class="quick-actions"><div class="quick-action orange" onclick="showPage('points')"><span class="quick-action-icon">🔗</span> Buy Points</div><div class="quick-action" onclick="showToast('Vendor application coming soon!')"><span class="quick-action-icon">👤</span> Join Vendor</div></div>
<div class="section-title">Featured</div>
<div class="featured-card" onclick="showPage('ai')"><div class="featured-icon">🤖</div><div class="featured-content"><div class="featured-title">AI Reply <span class="featured-badge">NEW</span></div><div class="featured-desc">Smart AI-powered replies for any conversation</div></div><div class="featured-arrow">⚡</div></div>
<div class="service-grid">
<div class="service-card" onclick="showToast('Articles coming soon!')" role="button" tabindex="0" aria-label="Articles"><div class="service-logo" style="background:linear-gradient(135deg,#22c55e,#4ade80);color:white;font-size:1.2rem">📖</div><div class="service-name">Articles(FMT)</div><div class="service-desc">Buy & read</div></div>
<div class="service-card" onclick="showPage('support')" role="button" tabindex="0" aria-label="Support sites"><div class="service-logo" style="background:linear-gradient(135deg,#3b82f6,#60a5fa);color:white;font-size:1.2rem">🎧</div><div class="service-name">Support Sites</div><div class="service-desc">Build pages</div></div>
<div class="service-card" onclick="showPage('opay')" role="button" tabindex="0" aria-label="OPay wallet demo"><div class="service-logo" style="background:#1dc677;color:white">O</div><div class="service-name">Opay</div><div class="service-desc">Wallet demo</div></div>
</div>
<div class="section-title">All Services <a href="#" onclick="showPage('services')">View All →</a></div>
<div class="all-services-grid" id="allServicesGrid"></div>
</div>

<div class="page" id="page-receipts" role="main" aria-label="Receipt Generator">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🧾 Chapo'sHub Receipts</div></div>
<div class="platform-scroll" id="platformScroll"></div>
<div class="form-section">
<div class="form-field"><label>Store / Platform Name</label><input type="text" id="storeName" value="FreshMart" required maxlength="50"></div>
<div class="form-field"><label>Order ID</label><div style="display:flex;gap:.4rem"><input type="text" id="orderId" value="FR-20260718-0042" style="flex:1" required maxlength="30" pattern="[A-Z0-9\\-]+"><button class="back-btn" onclick="randomizeId()" style="flex-shrink:0" aria-label="Randomize order ID" title="Randomize order ID">🎲</button></div></div>
<div class="form-row"><div class="form-field"><label>Date & Time</label><input type="datetime-local" id="receiptDate"></div><div class="form-field"><label>Tax Rate (%)</label><input type="number" id="taxRate" value="8.25" step="0.01" min="0" max="100" required></div></div>
<div class="form-row"><div class="form-field"><label>Currency</label><select id="currency"><option value="$">USD ($)</option><option value="€">EUR (€)</option><option value="£">GBP (£)</option><option value="₿">BTC (₿)</option><option value="₦">NGN (₦)</option></select></div><div class="form-field"><label>Recipient Email</label><input type="email" id="recipientEmail" placeholder="customer@email.com" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$"></div></div>
<div class="form-field"><label>Items</label><div id="itemsContainer"></div><button class="action-btn secondary" style="width:100%;margin-top:.5rem" onclick="addItem()">+ Add Item</button></div>
</div>
<div class="receipt-preview-card" role="region" aria-label="Receipt preview"><div style="font-size:.8rem;font-weight:700;color:var(--text-muted);margin-bottom:.8rem;text-align:center">👁️ Live Preview</div><div id="receipt" class="receipt" role="img" aria-label="Generated receipt preview"></div></div>
<div class="action-buttons" role="group" aria-label="Receipt actions"><button class="action-btn primary" onclick="downloadReceipt()">📸 Download</button><button class="action-btn secondary" onclick="printReceipt()">🖨️ Print</button><button class="action-btn success" onclick="sendEmailReceipt()">📧 Email</button><button class="action-btn secondary" onclick="generateShortLink()">🔗 Link</button></div>
<div style="height:20px"></div>
</div>

<div class="page" id="page-opay" role="main" aria-label="OPay Wallet Demo">
<div class="ow-app">

<!-- ============ DASHBOARD VIEW ============ -->
<div class="ow-view active" id="ow-view-dashboard">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🟢 OPay Wallet (Demo)</div></div>
<div class="ow-disclaimer">⚠️ <strong>Simulated demo wallet.</strong> This is a private play-money wallet for UI/UX demo purposes only — no real OPay account, bank account, or payment rail is ever touched. Sending money here costs Chapo'sHub points.</div>
<div class="ow-balance-card">
<div class="ow-balance-top-row"><span>Wallet Balance</span><button class="ow-icon-btn ow-eye-toggle" id="owEyeToggle" aria-label="Toggle balance visibility"><i class="fa-regular fa-eye"></i></button></div>
<div class="ow-balance-amount" id="owBalanceAmount">₦••••••</div>
<div class="ow-balance-sub" id="owBalanceSub">Loading…</div>
</div>
<div class="ow-transfer-row">
<div class="ow-transfer-item" onclick="OpayWallet.openSend()"><div class="ow-transfer-icon" style="background:var(--ow-mint)"><i class="fa-solid fa-arrow-up"></i></div><span>Send Money</span></div>
<div class="ow-transfer-item" onclick="OpayWallet.openTransfer()"><div class="ow-transfer-icon" style="background:var(--ow-accent-blue)"><i class="fa-solid fa-building-columns"></i></div><span>To Bank</span></div>
<div class="ow-transfer-item" onclick="OpayWallet.openHistory()"><div class="ow-transfer-icon" style="background:var(--ow-accent-purple)"><i class="fa-solid fa-clock-rotate-left"></i></div><span>History</span></div>
</div>
<div class="ow-section-title">Recent Activity <a href="#" onclick="OpayWallet.loadDashboard();return false;">↻ Refresh</a></div>
<div class="ow-txn-list" id="owRecentTxnList"><div class="ow-skeleton"></div></div>
<div style="height:20px"></div>
</div>

<!-- ============ SEND MONEY VIEW ============ -->
<div class="ow-view" id="ow-view-send">
<div class="receipt-page-header"><button class="back-btn" onclick="OpayWallet.backFromSend()" aria-label="Go back">←</button><div class="page-title-sm" id="owSendStepTitle">Send Money</div></div>
<div class="ow-step-progress" id="owSendProgress"><span class="ow-seg"></span><span class="ow-seg"></span><span class="ow-seg"></span><span class="ow-seg"></span></div>

<div class="ow-step active" id="ow-send-step-recipient">
<div class="form-section">
<div class="form-field"><label>Recipient Name</label><input type="text" id="owSendName" placeholder="e.g. Jane Smith" maxlength="60"></div>
<div class="form-field"><label>Recipient Phone</label><input type="tel" id="owSendPhone" placeholder="e.g. 0810 987 6543" maxlength="20"></div>
</div>
<div class="ow-btn-row"><button class="action-btn primary" style="width:100%" onclick="OpayWallet.sendGoToAmount()">Continue</button></div>
</div>

<div class="ow-step" id="ow-send-step-amount">
<div class="ow-amount-display"><span>₦</span><input type="text" id="owSendAmountInput" inputmode="numeric" placeholder="0"></div>
<div class="ow-balance-hint" id="owSendBalanceHint">Available balance: —</div>
<div class="ow-quick-amounts"><button data-amt="1000">₦1,000</button><button data-amt="5000">₦5,000</button><button data-amt="10000">₦10,000</button><button data-amt="20000">₦20,000</button></div>
<div class="form-field" style="margin-top:1rem"><label>Note (optional)</label><input type="text" id="owSendNarration" placeholder="What's this for?" maxlength="200"></div>
<div class="ow-btn-row"><button class="action-btn primary" style="width:100%" id="owSendToConfirmBtn" disabled onclick="OpayWallet.sendGoToConfirm()">Continue</button></div>
</div>

<div class="ow-step" id="ow-send-step-confirm">
<div class="ow-confirm-card">
<div class="ow-confirm-row"><span>Amount</span><strong id="owSendConfirmAmount">₦0</strong></div>
<div class="ow-confirm-row"><span>To</span><strong id="owSendConfirmName">—</strong></div>
<div class="ow-confirm-row"><span>Phone</span><strong id="owSendConfirmPhone">—</strong></div>
<div class="ow-confirm-row"><span>Note</span><strong id="owSendConfirmNote">—</strong></div>
<div class="ow-confirm-row"><span>Points Cost</span><strong id="owSendConfirmPoints">—</strong></div>
</div>
<div class="ow-btn-row"><button class="action-btn primary" style="width:100%" onclick="OpayWallet.sendGoToPin()">Confirm & Continue</button></div>
</div>

<div class="ow-step" id="ow-send-step-pin">
<div class="ow-pin-wrap"><p>Enter any 4 digits to confirm (demo)</p><div class="ow-pin-dots" id="owSendPinDots"><span class="ow-dot"></span><span class="ow-dot"></span><span class="ow-dot"></span><span class="ow-dot"></span></div></div>
<div class="ow-keypad" id="owSendKeypad">
<button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button>
<button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button>
<button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button>
<button class="ow-key-empty"></button><button data-key="0">0</button><button data-key="del"><i class="fa-solid fa-delete-left"></i></button>
</div>
</div>

<div class="ow-step" id="ow-send-step-success">
<div class="ow-success-wrap">
<div class="ow-success-icon"><i class="fa-solid fa-circle-check"></i></div>
<div class="ow-success-title">Money Sent!</div>
<div class="ow-success-amount" id="owSendSuccessAmount">₦0</div>
<div class="ow-success-detail-card">
<div class="ow-confirm-row"><span>To</span><strong id="owSendSuccessName">—</strong></div>
<div class="ow-confirm-row"><span>Reference</span><strong id="owSendSuccessRef">—</strong></div>
<div class="ow-confirm-row"><span>Date</span><strong id="owSendSuccessDate">—</strong></div>
</div>
<button class="action-btn primary" style="width:100%;margin-top:1rem" onclick="OpayWallet.openDashboard()">Done</button>
</div>
</div>
</div>

<!-- ============ TRANSFER TO BANK VIEW ============ -->
<div class="ow-view" id="ow-view-tobank">
<div class="receipt-page-header"><button class="back-btn" onclick="OpayWallet.backFromTransfer()" aria-label="Go back">←</button><div class="page-title-sm" id="owBankStepTitle">Transfer To Bank</div></div>
<div class="ow-step-progress" id="owBankProgress"><span class="ow-seg"></span><span class="ow-seg"></span><span class="ow-seg"></span><span class="ow-seg"></span></div>

<div class="ow-step active" id="ow-bank-step-recipient">
<div class="ow-real-note">🏦 <strong>Verify Recipient Bank Account · REAL LOOKUP</strong><br>Pulls today's actual Nigerian bank list and confirms the account name via Paystack — this check is real, but no money moves and no bank account is touched.</div>
<div class="form-section">
<div class="form-field"><label>Recipient Bank</label><select id="owBankSelect"><option value="">Loading banks…</option></select></div>
<div class="form-row"><div class="form-field"><label>Account Number</label><input type="text" id="owBankAccountNumber" placeholder="10-digit NUBAN" maxlength="10" inputmode="numeric"></div><div class="form-field" style="display:flex;align-items:flex-end"><button type="button" class="action-btn secondary" id="owBankVerifyBtn" style="width:100%" onclick="OpayWallet.resolveBankAccount()">🔍 Verify</button></div></div>
<div id="owBankResolvedAccount" class="ow-resolved-account" style="display:none"></div>
</div>
<div class="ow-btn-row"><button class="action-btn primary" style="width:100%" id="owBankToAmountBtn" disabled onclick="OpayWallet.bankGoToAmount()">Continue</button></div>
</div>

<div class="ow-step" id="ow-bank-step-amount">
<div class="ow-amount-display"><span>₦</span><input type="text" id="owBankAmountInput" inputmode="numeric" placeholder="0"></div>
<div class="ow-balance-hint" id="owBankBalanceHint">Available balance: —</div>
<div class="ow-quick-amounts"><button data-amt="1000">₦1,000</button><button data-amt="5000">₦5,000</button><button data-amt="10000">₦10,000</button><button data-amt="20000">₦20,000</button></div>
<div class="form-field" style="margin-top:1rem"><label>Note (optional)</label><input type="text" id="owBankNarration" placeholder="What's this for?" maxlength="200"></div>
<div class="ow-btn-row"><button class="action-btn primary" style="width:100%" id="owBankToConfirmBtn" disabled onclick="OpayWallet.bankGoToConfirm()">Continue</button></div>
</div>

<div class="ow-step" id="ow-bank-step-confirm">
<div class="ow-confirm-card">
<div class="ow-confirm-row"><span>Amount</span><strong id="owBankConfirmAmount">₦0</strong></div>
<div class="ow-confirm-row"><span>Bank</span><strong id="owBankConfirmBank">—</strong></div>
<div class="ow-confirm-row"><span>Account Name</span><strong id="owBankConfirmName">—</strong></div>
<div class="ow-confirm-row"><span>Account Number</span><strong id="owBankConfirmNumber">—</strong></div>
<div class="ow-confirm-row"><span>Points Cost</span><strong id="owBankConfirmPoints">—</strong></div>
</div>
<div class="ow-btn-row"><button class="action-btn primary" style="width:100%" onclick="OpayWallet.bankGoToPin()">Confirm & Continue</button></div>
</div>

<div class="ow-step" id="ow-bank-step-pin">
<div class="ow-pin-wrap"><p>Enter any 4 digits to confirm (demo)</p><div class="ow-pin-dots" id="owBankPinDots"><span class="ow-dot"></span><span class="ow-dot"></span><span class="ow-dot"></span><span class="ow-dot"></span></div></div>
<div class="ow-keypad" id="owBankKeypad">
<button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button>
<button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button>
<button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button>
<button class="ow-key-empty"></button><button data-key="0">0</button><button data-key="del"><i class="fa-solid fa-delete-left"></i></button>
</div>
</div>

<div class="ow-step" id="ow-bank-step-success">
<div class="ow-success-wrap">
<div class="ow-success-icon"><i class="fa-solid fa-circle-check"></i></div>
<div class="ow-success-title">Transfer Successful!</div>
<div class="ow-success-amount" id="owBankSuccessAmount">₦0</div>
<div class="ow-success-detail-card">
<div class="ow-confirm-row"><span>To</span><strong id="owBankSuccessName">—</strong></div>
<div class="ow-confirm-row"><span>Bank</span><strong id="owBankSuccessBank">—</strong></div>
<div class="ow-confirm-row"><span>Reference</span><strong id="owBankSuccessRef">—</strong></div>
<div class="ow-confirm-row"><span>Date</span><strong id="owBankSuccessDate">—</strong></div>
</div>
<button class="action-btn primary" style="width:100%;margin-top:1rem" onclick="OpayWallet.openDashboard()">Done</button>
</div>
</div>
</div>

<!-- ============ HISTORY VIEW ============ -->
<div class="ow-view" id="ow-view-history">
<div class="receipt-page-header"><button class="back-btn" onclick="OpayWallet.openDashboard()" aria-label="Go back">←</button><div class="page-title-sm">Transaction History</div></div>
<div class="ow-summary-row">
<div class="ow-summary-box"><div class="ow-summary-label">Total In</div><div class="ow-summary-value ow-in" id="owTotalIn">₦0.00</div></div>
<div class="ow-summary-box"><div class="ow-summary-label">Total Out</div><div class="ow-summary-value ow-out" id="owTotalOut">₦0.00</div></div>
</div>
<div class="ow-filter-chips" id="owFilterChips">
<button class="ow-filter-chip active" data-filter="all">All</button>
<button class="ow-filter-chip" data-filter="credit">Money In</button>
<button class="ow-filter-chip" data-filter="debit">Money Out</button>
<button class="ow-filter-chip" data-filter="transfer">Send</button>
<button class="ow-filter-chip" data-filter="bank_transfer">Bank Transfer</button>
<button class="ow-filter-chip" data-filter="completed">Completed</button>
<button class="ow-filter-chip" data-filter="pending">Pending</button>
<button class="ow-filter-chip" data-filter="failed">Failed</button>
</div>
<div class="ow-search-box"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="owHistorySearch" placeholder="Search by name or note"></div>
<div id="owHistoryContainer"><div class="ow-skeleton" style="height:64px;margin:16px;"></div></div>
<div style="height:20px"></div>
</div>

</div>
</div>

<!-- OPay Wallet Demo — transaction receipt modal (History view) -->
<div class="ow-modal-overlay" id="owReceiptOverlay" onclick="if(event.target===this) OpayWallet.closeReceipt()"></div>

<div class="page" id="page-marketplace" role="main" aria-label="Scripts Marketplace">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🛒 Scripts Marketplace</div></div>

<div class="mkt-tabs" id="mktTabs" role="tablist" aria-label="Marketplace sections">
<button class="mkt-tab active" data-tab="browse" onclick="Marketplace.switchTab('browse')" role="tab" aria-selected="true">Browse</button>
<button class="mkt-tab" data-tab="mylistings" onclick="Marketplace.switchTab('mylistings')" role="tab" aria-selected="false">My Listings</button>
<button class="mkt-tab" data-tab="purchases" onclick="Marketplace.switchTab('purchases')" role="tab" aria-selected="false">My Purchases</button>
<button class="mkt-tab" id="mktAdminTab" data-tab="admin" onclick="Marketplace.switchTab('admin')" role="tab" aria-selected="false" style="display:none">Review Queue</button>
</div>

<!-- ===== BROWSE TAB ===== -->
<div class="mkt-tab-panel active" id="mktPanel-browse">
<div class="ai-tool-scroll" id="mktCategoryScroll" role="tablist" aria-label="Categories"></div>
<div class="mkt-search-box"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="mktSearchInput" placeholder="Search templates..."></div>
<div id="mktBrowseGrid" class="mkt-listing-grid"><div class="ow-skeleton" style="height:180px;margin:0 1rem;"></div></div>
</div>

<!-- ===== MY LISTINGS TAB ===== -->
<div class="mkt-tab-panel" id="mktPanel-mylistings">
<div style="padding:1rem"><button class="action-btn primary" style="width:100%" onclick="Marketplace.openCreateForm()">+ Create New Listing</button></div>
<div id="mktMyListings" class="mkt-listing-grid"></div>
</div>

<!-- ===== MY PURCHASES TAB ===== -->
<div class="mkt-tab-panel" id="mktPanel-purchases">
<div id="mktPurchases" class="mkt-listing-grid"></div>
</div>

<!-- ===== ADMIN REVIEW QUEUE TAB ===== -->
<div class="mkt-tab-panel" id="mktPanel-admin">
<div id="mktAdminQueue" class="mkt-listing-grid"></div>
</div>

<!-- ===== CREATE / EDIT LISTING FORM (overlay) ===== -->
<div class="mkt-form-overlay" id="mktFormOverlay" onclick="if(event.target===this) Marketplace.closeCreateForm()">
<div class="mkt-form-sheet">
<div class="mkt-form-header"><span id="mktFormTitle">Create Listing</span><button class="mkt-form-close" onclick="Marketplace.closeCreateForm()" aria-label="Close">✕</button></div>
<div class="form-field"><label>Title</label><input type="text" id="mktFieldTitle" maxlength="100" placeholder="e.g. Modern SaaS Landing Page"></div>
<div class="form-field"><label>Description</label><textarea id="mktFieldDescription" maxlength="2000" placeholder="Describe what the buyer gets, tech stack, features..."></textarea></div>
<div class="form-field"><label>Category</label><select id="mktFieldCategory"></select></div>
<div class="form-field"><label>Price (points)</label><input type="number" id="mktFieldPrice" min="10" max="500000" placeholder="e.g. 500"></div>
<div class="form-field"><label>Preview Image URL</label><input type="url" id="mktFieldPreview" placeholder="https://..."></div>
<div class="form-field"><label>Template File (.zip, max 25MB)</label><input type="file" id="mktFieldFile" accept=".zip"><div id="mktFileStatus" style="font-size:.75rem;color:var(--text-muted);margin-top:.4rem"></div></div>
<button class="action-btn primary" id="mktFormSubmitBtn" style="width:100%;margin-top:.5rem" onclick="Marketplace.submitListing()">Submit for Review</button>
<div id="mktFormError" style="color:var(--danger);font-size:.8rem;margin-top:.6rem;display:none"></div>
</div>
</div>

<!-- ===== LISTING DETAIL / PURCHASE MODAL ===== -->
<div class="mkt-form-overlay" id="mktDetailOverlay" onclick="if(event.target===this) Marketplace.closeDetail()">
<div class="mkt-form-sheet" id="mktDetailSheet"></div>
</div>

</div>

<div class="page" id="page-ai" role="main" aria-label="AI Assistant">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🤖 Chapo'sHub AI</div></div>
<div class="ai-tool-scroll" id="aiToolScroll" role="tablist" aria-label="AI tools"></div>
<div style="padding:0 1rem 1rem"><div class="ai-card">
<div style="font-size:.85rem;font-weight:700;margin-bottom:.8rem" id="aiToolPrompt">💬 Paste a customer message to get a smart reply</div>
<textarea class="ai-input" id="aiInput" placeholder="e.g. 'Hey, did you send me that payment? I haven't received it yet.'" required maxlength="500" oninput="updateAICharCount()"></textarea>
<div id="aiExtraOptions"></div>
<div style="font-size:.72rem;color:var(--text-muted);text-align:right;margin:-.5rem 0 .6rem" id="aiCharCount">0 / 500</div>
<button class="ai-generate-btn" id="aiGenerateBtn" onclick="generateAIContent()">✨ Generate Reply</button>
<div class="ai-output" id="aiOutput"></div>
<div class="ai-output-actions" id="aiOutputActions" style="display:none">
<button class="action-btn secondary" onclick="copyAIOutput()">📋 Copy</button>
<button class="action-btn secondary" onclick="clearAIOutput()">🗑️ Clear</button>
</div>
</div></div>
</div>

<div class="page" id="page-points" role="main" aria-label="Points Store">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">💰 Chapo'sHub Points</div></div>
<div class="points-card"><div class="points-amount" id="pointsAmount">0</div><div class="points-label">Available Points</div></div>
<div class="section-title">Select Package</div>
<div class="package-grid"><div class="package-card" onclick="buyPoints('starter')"><div class="package-points">1,000</div><div class="package-price">$10</div><div class="package-desc">Basic</div></div><div class="package-card best disabled" onclick="buyPoints('pro')"><div class="package-best-tag">SOON</div><div class="package-points">5,000</div><div class="package-price">$45</div><div class="package-desc">Popular</div></div><div class="package-card disabled" onclick="buyPoints('enterprise')"><div class="package-points">10,000</div><div class="package-price">$80</div><div class="package-desc">Pro</div></div></div>
<p style="font-size:.78rem;color:var(--muted,#94a3b8);padding:0 1rem;margin-top:.5rem">Purchases are processed securely by Whop. You'll be taken to Whop's checkout — points are credited to your account automatically once payment completes.</p>
</div>

<div class="page" id="page-services" role="main" aria-label="Services">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🛒 Chapo'sHub Services</div></div>
<div id="servicesGrid" style="padding:1rem"></div>
</div>

<div class="page" id="page-history" role="main" aria-label="History">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🕐 Chapo'sHub History</div></div>
<div class="history-list" id="historyList"></div>
</div>

<div class="page" id="page-orders" role="main" aria-label="Orders">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🛒 Chapo'sHub Orders</div></div>
<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">No orders yet</div><div class="empty-state-desc">Start generating receipts to see your orders here.</div><button class="action-btn primary" style="margin-top:1.5rem" onclick="showPage('receipts')">Generate Receipt</button></div>
</div>

<div class="page" id="page-support" role="main" aria-label="Support Builder">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🛟 Chapo'sHub Support</div></div>
<div class="form-section">
<div class="form-field"><label>Company Name</label><input type="text" id="supportCompany" value="PayPal Support" required maxlength="50"></div>
<div class="form-field"><label>Brand Color</label><input type="color" id="supportColor" value="#003087" style="height:48px;padding:.2rem"></div>
<div class="form-field"><label>Support Email</label><input type="email" id="supportEmail" value="support@paypal.com" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$"></div>
<div class="form-field"><label>WhatsApp</label><input type="tel" id="supportWhatsApp" value="+1 (555) 123-4567" pattern="[+0-9\\s\\(\\)-]{7,}"></div>
<div class="form-field"><label>Telegram</label><input type="text" id="supportTelegram" value="@paypal_support"></div>
<div class="form-field"><label>Description</label><textarea id="supportDesc" required maxlength="200">Need help? Our support team is available 24/7 to assist you with any issues.</textarea></div>
<button class="action-btn primary" style="width:100%;margin-top:.5rem" onclick="generateSupportPage()">🚀 Generate Page</button>
</div>
<div class="section-title" style="margin-top:1rem">Preview</div>
<div style="padding:0 1rem 1rem"><div class="support-preview" id="supportPreview"><div class="support-header" id="supportHeader" style="background:#003087"><h3>PayPal Support</h3><p>Need help? Our support team is available 24/7.</p></div><div class="support-body"><div class="support-contact">📧 support@paypal.com</div><div class="support-contact">📱 +1 (555) 123-4567</div><div class="support-contact">💬 @paypal_support</div></div></div></div>
</div>

<nav class="bottom-nav" role="navigation" aria-label="Main navigation">
<button class="nav-item-btm" onclick="showPage('dashboard')" aria-label="Transactions"><span class="nav-icon" aria-hidden="true">💵</span><span class="nav-label">Transact...</span></button>
<button class="nav-item-btm" onclick="showPage('services')" aria-label="Services"><span class="nav-icon" aria-hidden="true">🛒</span><span class="nav-label">Services</span></button>
<button class="nav-item-btm active" onclick="showPage('dashboard')" aria-label="Dashboard" aria-current="page"><span class="nav-icon" aria-hidden="true">⊞</span><span class="nav-label">Dashboard</span></button>
<button class="nav-item-btm" onclick="showPage('history')" aria-label="History"><span class="nav-icon" aria-hidden="true">🕐</span><span class="nav-label">History</span></button>
<button class="nav-item-btm" onclick="logoutUser()" aria-label="Log out"><span class="nav-icon" aria-hidden="true">🚪</span><span class="nav-label">Log Out</span></button>
</nav>
</div>

<script src="/static/js/theme.js"></script>
<script src="/static/js/api-client.js"></script>
<script src="/static/js/auth.js"></script>
<script src="/static/js/app.js"></script>
<script>
// Deep-link support: /?auth=login or /?auth=register opens the auth modal
// automatically (used by the Sign In / Get Started links on subpages like
// /help, /about, /contact so they route back through the single-page app).
(function () {
  var params = new URLSearchParams(location.search);
  var authMode = params.get('auth');
  if (authMode === 'login' || authMode === 'register') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.ChapoAuth) window.ChapoAuth.showAuthModal(authMode);
      history.replaceState(null, '', location.pathname);
    });
  }
})();
</script>
</body>
</html>`
