// Monolithic Chapo'sHub frontend markup, ported from chaposhub_fixed.html and
// wired to the real backend API (see public/static/js/api-client.js, auth.js, app.js).
export const APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Chapo'sHub</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="/static/css/app.css" rel="stylesheet">
</head>
<body>
<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"></div>

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

<div class="page active" id="page-dashboard" role="main" aria-label="Dashboard">
<div class="top-bar"><div class="top-left"><div class="top-avatar">CH</div><div class="top-user" id="topUser">guest<span>KE</span></div></div><div class="top-right"><div class="top-badge" id="topBadge">💎 0pts</div><div class="top-icon-btn" onclick="showToast('Theme toggle coming soon')" role="button" tabindex="0" aria-label="Toggle theme" title="Toggle theme">🌙</div></div></div>
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
<div class="service-card" onclick="showPage('receipts');setPlatform('opay')" role="button" tabindex="0" aria-label="OPay receipts"><div class="service-logo" style="background:#1dc677;color:white">O</div><div class="service-name">Opay</div><div class="service-desc">Bank slips</div></div>
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

<div class="page" id="page-ai" role="main" aria-label="AI Assistant">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">🤖 Chapo'sHub AI</div></div>
<div style="padding:1rem"><div class="ai-card"><div style="font-size:.85rem;font-weight:700;margin-bottom:.8rem">✨ Paste a message to get a smart reply</div><textarea class="ai-input" id="aiInput" placeholder="e.g. 'Hey, did you send me that payment? I haven't received it yet.'" required maxlength="500"></textarea><select class="ai-tone-select" id="aiTone"><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="casual">Casual</option><option value="urgent">Urgent</option><option value="apologetic">Apologetic</option></select><button class="ai-generate-btn" onclick="generateAIReply()">✨ Generate Reply</button><div class="ai-output" id="aiOutput"></div></div></div>
</div>

<div class="page" id="page-points" role="main" aria-label="Points Store">
<div class="receipt-page-header"><button class="back-btn" onclick="showPage('dashboard')" aria-label="Go back">←</button><div class="page-title-sm">💰 Chapo'sHub Points</div></div>
<div class="points-card"><div class="points-amount" id="pointsAmount">0</div><div class="points-label">Available Points</div></div>
<div class="section-title">Select Package</div>
<div class="package-grid"><div class="package-card" onclick="buyPoints('starter')"><div class="package-points">1,000</div><div class="package-price">$10</div><div class="package-desc">Basic</div></div><div class="package-card best" onclick="buyPoints('pro')"><div class="package-best-tag">BEST</div><div class="package-points">5,000</div><div class="package-price">$45</div><div class="package-desc">Popular</div></div><div class="package-card" onclick="buyPoints('enterprise')"><div class="package-points">10,000</div><div class="package-price">$80</div><div class="package-desc">Pro</div></div></div>
<div class="section-title">Payment Methods</div>
<div class="payment-methods"><div class="payment-method" onclick="showToast('Bitcoin payment selected')"><span class="payment-method-icon">₿</span> Bitcoin (BTC)</div><div class="payment-method" onclick="showToast('Ethereum payment selected')"><span class="payment-method-icon">Ξ</span> Ethereum (ETH)</div><div class="payment-method" onclick="showToast('USDT payment selected')"><span class="payment-method-icon">💵</span> USDT (TRC20)</div><div class="payment-method" onclick="showToast('P2P transfer selected')"><span class="payment-method-icon">🏦</span> P2P Transfer</div><div class="payment-method" onclick="showToast('Bank transfer selected')"><span class="payment-method-icon">💳</span> Bank Transfer</div></div>
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

<script src="/static/js/api-client.js"></script>
<script src="/static/js/auth.js"></script>
<script src="/static/js/app.js"></script>
</body>
</html>`
