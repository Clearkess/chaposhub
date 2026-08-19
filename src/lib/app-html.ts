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
    <div class="landing-logo">🧾 Chapo'sHub</div>
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
    <div class="landing-hero-badge">✨ Receipts · Points · AI</div>
    <h1 class="landing-hero-title">Stop losing time on messy receipts and slow customer replies</h1>
    <p class="landing-hero-sub">Generate branded receipts for 13+ platforms, draft AI-powered customer replies in seconds, and pay only for what you use — no subscriptions, no card required to start.</p>
    <div class="landing-hero-cta">
      <button class="landing-cta-primary" onclick="window.ChapoAuth.showAuthModal('register')">🚀 Start My Free Account</button>
      <button class="landing-cta-secondary" onclick="window.ChapoAuth.showAuthModal('login')">Sign In</button>
    </div>
    <div class="landing-hero-note">No credit card required · 245 free points on signup</div>
  </section>

  <!-- Trust badges: SSL/instant/worldwide — all real, verifiable claims -->
  <section class="landing-trust" aria-label="Trust indicators">
    <div class="landing-trust-item"><span class="trust-icon">🔒</span> SSL Encrypted</div>
    <div class="landing-trust-item"><span class="trust-icon">⚡</span> Instant Delivery</div>
    <div class="landing-trust-item"><span class="trust-icon">🌍</span> Available Worldwide</div>
  </section>

  <!-- 2. Platform support strip (real, verifiable fact — not a fabricated stat) -->
  <section class="landing-platforms" aria-label="Supported platforms">
    <div class="landing-platforms-label">Generate branded receipts for</div>
    <div class="landing-platforms-strip">
      <span class="landing-platform-chip">PayPal</span>
      <span class="landing-platform-chip">Binance</span>
      <span class="landing-platform-chip">Cash App</span>
      <span class="landing-platform-chip">OPay</span>
      <span class="landing-platform-chip">Zelle</span>
      <span class="landing-platform-chip">Venmo</span>
      <span class="landing-platform-chip">Wise</span>
      <span class="landing-platform-chip">Coinbase</span>
      <span class="landing-platform-chip">+5 more</span>
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
<div class="service-card" onclick="showToast('Articles coming soon!')" role="button" tabindex="0" aria-label="Articles"><div class="service-logo" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:1.2rem">📖</div><div class="service-name">Articles(FMT)</div><div class="service-desc">Buy & read</div></div>
<div class="service-card" onclick="showPage('support')" role="button" tabindex="0" aria-label="Support sites"><div class="service-logo" style="background:linear-gradient(135deg,#3b82f6,#60a5fa);color:white;font-size:1.2rem">🎧</div><div class="service-name">Support Sites</div><div class="service-desc">Build pages</div></div>
<div class="service-card" onclick="showPage('opay')" role="button" tabindex="0" aria-label="OPay receipts"><div class="service-logo" style="background:#1dc677;color:white">O</div><div class="service-name">Opay</div><div class="service-desc">Bank slips</div></div>
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

<div class="page" id="page-opay" role="main" aria-label="OPay Receipt Service">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🟢 OPay Transaction Receipt</div></div>
<div class="opay-disclaimer">⚠️ <strong>Sample/simulated receipt only.</strong> This tool creates a formatted receipt from the details you enter — it does not verify, initiate, or confirm any real OPay transaction. Do not present a generated receipt as proof of an actual payment.</div>
<div class="form-section">
<div class="form-field"><label>Sender Name</label><input type="text" id="opaySenderName" placeholder="e.g. John Doe" required maxlength="60"></div>
<div class="form-field"><label>Sender Phone</label><input type="tel" id="opaySenderPhone" placeholder="e.g. 0803 123 4567" required maxlength="20"></div>
<div class="form-field"><label>Recipient Name</label><input type="text" id="opayRecipientName" placeholder="e.g. Jane Smith" required maxlength="60"></div>
<div class="form-field"><label>Recipient Phone</label><input type="tel" id="opayRecipientPhone" placeholder="e.g. 0810 987 6543" required maxlength="20"></div>
<div class="opay-bank-lookup" id="opayBankLookup">
<div class="opay-bank-lookup-title">🏦 Verify Recipient Bank Account <span class="opay-real-badge">REAL LOOKUP</span></div>
<div class="opay-bank-lookup-note">Optional. Pulls today's actual Nigerian bank list and confirms the account name via Paystack — this check is real, but no money moves and no OPay wallet is touched.</div>
<div class="form-field"><label>Recipient Bank</label><select id="opayBank"><option value="">Loading banks…</option></select></div>
<div class="form-row"><div class="form-field"><label>Account Number</label><input type="text" id="opayAccountNumber" placeholder="10-digit NUBAN" maxlength="10" inputmode="numeric"></div><div class="form-field" style="display:flex;align-items:flex-end"><button type="button" class="action-btn secondary" id="opayVerifyBtn" onclick="resolveOpayBankAccount()" style="width:100%">🔍 Verify Account</button></div></div>
<div id="opayResolvedAccount" class="opay-resolved-account" style="display:none"></div>
</div>
<div class="form-row"><div class="form-field"><label>Amount (₦)</label><input type="number" id="opayAmount" placeholder="10000" min="1" step="0.01" required></div><div class="form-field"><label>Status</label><select id="opayStatus"><option value="Successful">Successful</option><option value="Pending">Pending</option><option value="Failed">Failed</option></select></div></div>
<div class="form-row"><div class="form-field"><label>Transaction Date</label><input type="date" id="opayDate"></div><div class="form-field"><label>Transaction Time</label><input type="time" id="opayTime"></div></div>
<div class="form-field"><label>Reference (optional)</label><input type="text" id="opayReference" placeholder="Auto-generated if left blank" maxlength="40"></div>
<div class="form-field"><label>Note (optional)</label><textarea id="opayNote" placeholder="Add a short description" maxlength="200"></textarea></div>
<div class="form-field"><label>Receipt Template</label><select id="opayTemplate"><option value="classic">Classic</option><option value="modern">Modern</option><option value="minimal">Minimal</option></select></div>
</div>
<div class="receipt-preview-card" role="region" aria-label="OPay receipt preview"><div style="font-size:.8rem;font-weight:700;color:var(--text-muted);margin-bottom:.8rem;text-align:center">👁️ Live Preview</div><div id="opayReceiptPreview" class="opay-receipt" role="img" aria-label="Generated OPay receipt preview"></div></div>
<div class="action-buttons" role="group" aria-label="OPay receipt actions"><button class="action-btn primary" id="opayGenerateBtn" onclick="generateOpayReceipt()">🚀 Generate Receipt</button><button class="action-btn secondary" onclick="downloadOpayReceipt()">📸 Download</button></div>
<div class="section-title" style="margin-top:1.5rem">My OPay Receipts <a href="#" onclick="refreshOpayHistory();return false;">↻ Refresh</a></div>
<div class="opay-history-list" id="opayHistoryList"></div>
<div style="height:20px"></div>
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
