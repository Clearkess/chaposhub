// Chapo'sHub app logic - adapted from the monolithic prototype, wired to the real API.
// === CONFIG ===
const CONFIG = {
  points: {
    download: 5, print: 3, email: 10, link: 2, ai: 3, support: 15,
    // Chapo'sHub AI Hub tools (Step 7)
    ai_content: 5, ai_social: 3, ai_product: 4, ai_email: 5,
    ai_rewrite: 3, ai_chat: 2, ai_longform: 10, ai_code: 6,
    // OPay wallet-app demo (send money / transfer to bank)
    opay_wallet_send: 6, opay_bank_transfer: 10
  },
  app: { name: "Chapo'sHub", version: '2.0.0' }
};
// Real Whop-hosted checkout links. Only 'starter' has a live Whop plan today;
// pro/enterprise packages are shown as "coming soon" in the UI until their
// own Whop plans + WHOP_..._PLAN_ID bindings exist (see src/routes/webhooks.ts).
const WHOP_CHECKOUT_URLS = {
  starter: 'https://whop.com/checkout/plan_DZtaB5bXDuHOm'
};
// === END CONFIG ===

// Server-backed user/points/history state (populated after auth)
const user = { username: '', email: '', points: 0, country: 'KE', referralCode: '' };

// Local-only draft state for the receipt builder (not persisted server-side)
const state = {
  platform: 'generic', storeName: 'FreshMart', dateTime: new Date(), orderId: 'FR-20260718-0042',
  taxRate: 8.25, currency: '$',
  items: [
    { description: 'Organic Avocado', quantity: 2, price: 2.49 },
    { description: 'Whole Wheat Bread', quantity: 1, price: 3.79 },
    { description: 'Almond Milk 1L', quantity: 1, price: 4.29 }
  ]
};

// === DRAFT PERSISTENCE (local only - receipt builder draft, not account data) ===
function saveDraft() { try { localStorage.setItem('chapo_draft', JSON.stringify({ storeName: state.storeName, platform: state.platform, orderId: state.orderId, taxRate: state.taxRate, currency: state.currency, items: state.items })); } catch (e) {} }
function loadDraft() { try { const saved = localStorage.getItem('chapo_draft'); if (saved) { const data = JSON.parse(saved); Object.assign(state, data); return true; } } catch (e) {} return false; }
// === END DRAFT PERSISTENCE ===

function updatePointsDisplay() {
  const pts = user.points || 0;
  const badge = document.getElementById('topBadge');
  const bal = document.getElementById('balanceAmount');
  const ptsAmt = document.getElementById('pointsAmount');
  if (badge) badge.innerHTML = '💎 ' + pts + 'pts';
  if (bal) bal.innerHTML = pts + ' <span>pts</span>';
  if (ptsAmt) ptsAmt.textContent = pts;
}

function updateUserDisplay() {
  const userEl = document.getElementById('topUser');
  const welcomeEl = document.getElementById('welcomeName');
  const name = user.username || 'guest';
  if (userEl) userEl.innerHTML = name + '<span>' + (user.country || 'KE') + '</span>';
  if (welcomeEl) welcomeEl.textContent = name + ' 👋';
}

async function refreshUserAndPoints() {
  try {
    const u = await window.api.getMe();
    user.username = u.username;
    user.email = u.email;
    user.points = u.points;
    user.country = u.country;
    user.referralCode = u.referralCode;
    updatePointsDisplay();
    updateUserDisplay();
  } catch (err) {
    handleAuthFailure(err);
  }
}

async function refreshHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;
  try {
    const items = await window.api.getHistory();
    if (!items.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🕐</div><div class="empty-state-title">No activity yet</div><div class="empty-state-desc">Your actions will show up here.</div></div>';
      return;
    }
    list.innerHTML = items.map(h => `<div class="history-item"><div class="history-icon" style="background:${h.color}">${h.icon}</div><div class="history-info"><div class="history-title">${escHtml(h.title)}</div><div class="history-desc">${escHtml(h.desc)}</div></div><div class="history-time">${relativeTime(h.time)}</div></div>`).join('');
  } catch (err) {
    handleAuthFailure(err);
  }
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
  return Math.floor(diffSec / 86400) + 'd ago';
}

function handleAuthFailure(err) {
  if (err && err.status === 401) {
    window.ChapoAuth.showAuthModal();
  } else {
    showToast('❌ ' + (err && err.message ? err.message : 'Something went wrong'), 'error');
  }
}

// === FORM VALIDATION ===
function validateForm() {
  const store = document.getElementById('storeName');
  const order = document.getElementById('orderId');
  const tax = document.getElementById('taxRate');
  if (!store.value.trim()) { showToast('❌ Store name required', 'error'); store.focus(); return false; }
  if (!order.value.trim()) { showToast('❌ Order ID required', 'error'); order.focus(); return false; }
  if (tax.value === '' || tax.value < 0 || tax.value > 100) { showToast('❌ Tax rate must be 0-100', 'error'); tax.focus(); return false; }
  if (state.items.length === 0 || !state.items.some(i => i.description.trim())) { showToast('❌ Add at least one item', 'error'); return false; }
  return true;
}
function validateEmail(email) { return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email); }
// === END VALIDATION ===

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const el = document.activeElement;
    if (el && el.getAttribute('role') === 'button') { e.preventDefault(); el.click(); }
  }
});

const platforms = { generic: { name: 'FreshMart', color: '#2c2c2c', badge: 'RECEIPT', taxRate: 8.25, currency: '$', items: [{ description: 'Organic Avocado', quantity: 2, price: 2.49 }, { description: 'Whole Wheat Bread', quantity: 1, price: 3.79 }, { description: 'Almond Milk 1L', quantity: 1, price: 4.29 }] }, binance: { name: 'Binance', color: '#f0b90b', badge: 'BINANCE', taxRate: 0, currency: '$', items: [{ description: 'BTC Purchase', quantity: 0.0025, price: 28450 }, { description: 'Network Fee', quantity: 1, price: 2.5 }] }, bybit: { name: 'Bybit', color: '#f7a600', badge: 'BYBIT', taxRate: 0, currency: '$', items: [{ description: 'ETH/USDT Perp', quantity: 0.5, price: 1850 }, { description: 'Trading Fee', quantity: 1, price: 1.85 }] }, coinbase: { name: 'Coinbase', color: '#0052ff', badge: 'COINBASE', taxRate: 0, currency: '$', items: [{ description: 'ETH Purchase', quantity: 0.1, price: 1850 }, { description: 'Coinbase Fee', quantity: 1, price: 18.5 }] }, paypal: { name: 'PayPal', color: '#003087', badge: 'PAYPAL', taxRate: 0, currency: '$', items: [{ description: 'Payment Received', quantity: 1, price: 150 }, { description: 'PayPal Fee', quantity: 1, price: -4.65 }] }, cashapp: { name: 'Cash App', color: '#00d632', badge: 'CASHAPP', taxRate: 0, currency: '$', items: [{ description: 'Cash Transfer', quantity: 1, price: 75 }, { description: 'Instant Fee', quantity: 1, price: -1.5 }] }, crypto: { name: 'Crypto.com', color: '#002d72', badge: 'CRYPTO', taxRate: 0, currency: '$', items: [{ description: 'CRO Stake', quantity: 1000, price: 0.065 }, { description: 'Card Fee', quantity: 1, price: 0 }] }, opay: { name: 'OPay', color: '#1dc677', badge: 'OPAY', taxRate: 0, currency: '₦', items: [{ description: 'Airtime Purchase', quantity: 1, price: 1000 }, { description: 'Cashback', quantity: 1, price: -50 }] }, kuda: { name: 'Kuda', color: '#40196d', badge: 'KUDA', taxRate: 0, currency: '₦', items: [{ description: 'Transfer Sent', quantity: 1, price: 5000 }, { description: 'Transfer Fee', quantity: 1, price: 0 }] }, wise: { name: 'Wise', color: '#00b9ff', badge: 'WISE', taxRate: 0, currency: '€', items: [{ description: 'Transfer to EUR', quantity: 1, price: 500 }, { description: 'Wise Fee', quantity: 1, price: -3.75 }] }, venmo: { name: 'Venmo', color: '#008CFF', badge: 'VENMO', taxRate: 0, currency: '$', items: [{ description: 'Payment Sent', quantity: 1, price: 50 }, { description: 'Venmo Fee', quantity: 1, price: 0 }] }, trustwallet: { name: 'Trust Wallet', color: '#3375BB', badge: 'TRUST', taxRate: 0, currency: '$', items: [{ description: 'BNB Swap', quantity: 1, price: 250 }, { description: 'Network Fee', quantity: 1, price: 0.5 }] }, zelle: { name: 'Zelle', color: '#6d1ed4', badge: 'ZELLE', taxRate: 0, currency: '$', items: [{ description: 'Transfer Sent', quantity: 1, price: 200 }, { description: 'Zelle Fee', quantity: 1, price: 0 }] } };
// `dedicated: true` routes the card to its own full-service page (showPage('opay'))
// instead of the generic multi-platform receipt builder (showPage('receipts')).
const allServices = [{ key: 'crypto', name: 'Crypto Receipts', icon: '📄', new: true }, { key: 'paypal', name: 'Paypal', icon: 'P', color: '#003087' }, { key: 'kuda', name: 'Kuda', icon: 'K', color: '#40196d' }, { key: 'cashapp', name: 'Cash App', icon: '$', color: '#00d632' }, { key: 'zelle', name: 'Zelle', icon: 'Z', color: '#6d1ed4', new: true }, { key: 'venmo', name: 'Venmo', icon: 'V', color: '#008CFF', new: true }, { key: 'trustwallet', name: 'Trust Wallet', icon: 'T', color: '#3375BB', new: true }, { key: 'wise', name: 'Wise', icon: 'W', color: '#00b9ff', new: true }, { key: 'opay', name: 'OPay', icon: 'O', color: '#1dc677', dedicated: true }, { key: 'binance', name: 'Binance', icon: 'B', color: '#f0b90b' }];

function formatDate(date) { return date.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); }
function formatCurrency(val) { return state.currency + parseFloat(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function generateRandomOrderId() { const prefix = state.storeName.substring(0, 3).toUpperCase().replace(/\s/g, ''); const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); const rand = Math.floor(Math.random() * 9000 + 1000); return prefix + '-' + dateStr + '-' + rand; }
function recalcTotals() { const subtotal = state.items.reduce((sum, it) => sum + (it.price * it.quantity), 0); const tax = subtotal * (state.taxRate / 100); const total = subtotal + tax; return { subtotal, tax, total }; }

function showToast(msg, kind) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

function escHtml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const newPage = document.getElementById('page-' + pageId);
  newPage.classList.add('active');
  window.scrollTo(0, 0);
  document.querySelectorAll('.nav-item-btm').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
  let idx = -1;
  if (pageId === 'dashboard') idx = 2; else if (pageId === 'services') idx = 1;
  if (idx >= 0) { const btn = document.querySelectorAll('.nav-item-btm')[idx]; btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }
  if (pageId === 'history') refreshHistory();
  if (pageId === 'opay') { OpayWallet.openDashboard(); }
}

function serviceNavAction(s) { return s.dedicated ? `showPage('${s.key}')` : `showPage('receipts');setPlatform('${s.key}')`; }
function renderAllServices() { const grid = document.getElementById('allServicesGrid'); grid.innerHTML = allServices.map(s => `<div class="all-service" onclick="${serviceNavAction(s)}"><div class="all-service-logo" style="background:${s.color || 'var(--bg-card)'};color:white">${s.icon}</div><div class="all-service-name">${s.name}</div>${s.new ? '<div class="all-service-new">New</div>' : ''}</div>`).join(''); }
function renderPlatformChips() { const scroll = document.getElementById('platformScroll'); const platformKeys = Object.keys(platforms); scroll.innerHTML = platformKeys.map(key => { const p = platforms[key]; const isDark = key === 'binance' || key === 'bybit'; return `<div class="platform-chip ${key === state.platform ? 'active' : ''}" data-platform="${key}" onclick="setPlatform('${key}')"><div class="chip-logo" style="background:${p.color};color:${isDark ? '#1a1a1a' : 'white'}">${key === 'generic' ? '🛒' : p.name[0]}</div>${p.name}</div>`; }).join(''); }
function renderServicesGrid() { const grid = document.getElementById('servicesGrid'); grid.innerHTML = `<div class="service-grid">` + allServices.map(s => `<div class="service-card" onclick="${serviceNavAction(s)}"><div class="service-logo" style="background:${s.color || 'linear-gradient(135deg,#f97316,#fb923c)'};color:white">${s.icon}</div><div class="service-name">${s.name}</div>${s.new ? '<div class="service-new">New</div>' : ''}</div>`).join('') + `</div>`; }

function setPlatform(platformKey) {
  state.platform = platformKey;
  const p = platforms[platformKey];
  if (!p) return;
  state.storeName = p.name; state.taxRate = p.taxRate; state.currency = p.currency; state.orderId = generateRandomOrderId();
  if (p.items) state.items = JSON.parse(JSON.stringify(p.items));
  document.querySelectorAll('.platform-chip').forEach(chip => { chip.classList.toggle('active', chip.dataset.platform === platformKey); });
  refreshUI(false);
  showToast('🔄 ' + p.name);
}

function renderItemInputs() {
  const container = document.getElementById('itemsContainer');
  container.innerHTML = state.items.map((item, idx) => `<div style="display:grid;grid-template-columns:2fr 1fr 1.2fr 36px;gap:.4rem;align-items:end;margin-bottom:.5rem"><input type="text" placeholder="Item" value="${escHtml(item.description)}" data-idx="${idx}" class="item-desc" style="padding:.6rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.85rem"><input type="number" placeholder="Qty" value="${item.quantity}" step="any" min="0" data-idx="${idx}" class="item-qty" style="padding:.6rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.85rem"><input type="number" placeholder="Price" value="${item.price}" step="0.01" min="0" data-idx="${idx}" class="item-price" style="padding:.6rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.85rem"><button onclick="removeItem(${idx})" style="background:transparent;border:none;color:var(--text-dim);font-size:1.1rem;cursor:pointer;padding:.2rem">✕</button></div>`).join('');
}

function updateReceipt() {
  const { storeName, dateTime, orderId, taxRate, items, platform } = state;
  const totals = recalcTotals();
  const p = platforms[platform] || platforms.generic;
  const dateFormatted = formatDate(dateTime);
  let itemsHtml = '';
  items.forEach(it => { const linePrice = it.price * it.quantity; itemsHtml += `<tr><td>${escHtml(it.description)}</td><td class="qty">${it.quantity}</td><td class="price">${formatCurrency(linePrice)}</td></tr>`; });
  const receiptDiv = document.getElementById('receipt');
  receiptDiv.innerHTML = `<div style="text-align:center;margin-bottom:6px"><span class="platform-badge" style="background:${p.color};color:${platform === 'binance' || platform === 'bybit' ? '#1a1a1a' : 'white'}">${p.badge}</span></div><h2>${escHtml(storeName)}</h2><p class="meta">${dateFormatted}</p><p class="meta">Order #${escHtml(orderId)}</p><hr><table><thead><tr><th>Item</th><th class="qty">Qty</th><th class="price">Price</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><div class="totals"><p>Subtotal: <strong>${formatCurrency(totals.subtotal)}</strong></p><p>Tax (${taxRate}%): <strong>${formatCurrency(totals.tax)}</strong></p><p class="total-line">Total: <strong>${formatCurrency(totals.total)}</strong></p></div><hr><div class="barcode-area"><svg id="barcode"></svg></div><div class="qr-area" id="qrArea"></div><p class="footer-note">Thank you for using ${escHtml(storeName)}! 🛍️</p><p class="footer-note" style="font-size:8px;color:#888">This is a simulated receipt.</p>`;
  try { JsBarcode("#barcode", orderId, { format: "CODE128", width: 1.5, height: 40, displayValue: false, margin: 10 }); } catch (e) {}
  try { const qrDiv = document.getElementById('qrArea'); qrDiv.innerHTML = ''; new QRCode(qrDiv, { text: `https://verify.receipt/${orderId}`, width: 70, height: 70, colorDark: '#222', colorLight: '#fffdf7', correctLevel: QRCode.CorrectLevel.M }); } catch (e) {}
}

function syncStateFromUI() {
  state.storeName = document.getElementById('storeName').value.trim() || 'Store';
  state.dateTime = new Date(document.getElementById('receiptDate').value);
  if (isNaN(state.dateTime.getTime())) state.dateTime = new Date();
  state.orderId = document.getElementById('orderId').value.trim() || generateRandomOrderId();
  state.taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
  state.currency = document.getElementById('currency').value;
  const descInputs = document.querySelectorAll('.item-desc');
  const qtyInputs = document.querySelectorAll('.item-qty');
  const priceInputs = document.querySelectorAll('.item-price');
  const newItems = [];
  for (let i = 0; i < descInputs.length; i++) {
    const desc = descInputs[i].value.trim();
    const qty = parseFloat(qtyInputs[i].value) || 0;
    const price = parseFloat(priceInputs[i].value) || 0;
    if (desc) newItems.push({ description: desc, quantity: qty, price: price });
  }
  state.items = newItems.length ? newItems : [{ description: 'Item', quantity: 1, price: 0 }];
}

function refreshUI(keepState) {
  if (keepState) syncStateFromUI();
  saveDraft();
  document.getElementById('storeName').value = state.storeName;
  document.getElementById('receiptDate').value = state.dateTime.toISOString().slice(0, 16);
  document.getElementById('orderId').value = state.orderId;
  document.getElementById('taxRate').value = state.taxRate;
  document.getElementById('currency').value = state.currency;
  renderItemInputs();
  updateReceipt();
}

function addItem() { syncStateFromUI(); state.items.push({ description: 'New Item', quantity: 1, price: 0 }); refreshUI(false); setTimeout(() => { const inputs = document.querySelectorAll('.item-desc'); if (inputs.length) inputs[inputs.length - 1].focus(); }, 50); }
function removeItem(idx) { state.items.splice(idx, 1); refreshUI(false); syncStateFromUI(); refreshUI(true); }
function randomizeId() { state.orderId = generateRandomOrderId(); document.getElementById('orderId').value = state.orderId; updateReceipt(); showToast('🎲 Order ID randomized'); }

// === API-BACKED ACTIONS ===

async function persistReceipt() {
  const totals = recalcTotals();
  try {
    const res = await window.api.createReceipt({
      storeName: state.storeName,
      platform: state.platform,
      orderId: state.orderId,
      items: state.items,
      taxRate: state.taxRate,
      currency: state.currency,
      recipientEmail: document.getElementById('recipientEmail').value.trim() || undefined
    });
    return res;
  } catch (err) {
    // Duplicate order id is non-fatal - the receipt likely already exists from a prior action
    if (err.status === 409) return null;
    throw err;
  }
}

async function downloadReceipt() {
  if (!validateForm()) return;
  if ((user.points || 0) < CONFIG.points.download) { showToast('❌ Need ' + CONFIG.points.download + ' points to download', 'error'); return; }
  const element = document.getElementById('receipt');
  try {
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fffdf7' });
    const link = document.createElement('a');
    link.download = 'receipt_' + state.orderId.replace(/[^a-z0-9]/gi, '_') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    await persistReceipt();
    await window.api.deductPoints(CONFIG.points.download, 'download', '#' + state.orderId + ' · ' + formatCurrency(recalcTotals().total));
    await refreshUserAndPoints();
    showToast('📸 Receipt downloaded! (-' + CONFIG.points.download + ' pts)', 'success');
  } catch (err) {
    handleAuthFailure(err);
    if (!(err && err.status)) showToast('❌ Download failed', 'error');
  }
}

async function printReceipt() {
  if (!validateForm()) return;
  if ((user.points || 0) < CONFIG.points.print) { showToast('❌ Need ' + CONFIG.points.print + ' points to print', 'error'); return; }
  const printWindow = window.open('', '_blank');
  if (!printWindow) { showToast('❌ Pop-up blocked', 'error'); return; }
  const doc = printWindow.document;
  const html = doc.createElement('html');
  const head = doc.createElement('head');
  const title = doc.createElement('title');
  title.textContent = 'Receipt ' + state.orderId;
  head.appendChild(title);
  const style = doc.createElement('style');
  style.textContent = "body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f0}.receipt{width:300px;background:#fffdf7;padding:24px 20px;font-family:'Courier New',monospace;font-size:13px;line-height:1.5;border:1px dashed #bbb}";
  head.appendChild(style);
  html.appendChild(head);
  const body = doc.createElement('body');
  const receiptDiv = doc.createElement('div');
  receiptDiv.className = 'receipt';
  receiptDiv.innerHTML = document.getElementById('receipt').innerHTML;
  body.appendChild(receiptDiv);
  html.appendChild(body);
  doc.appendChild(html);
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  try {
    await window.api.deductPoints(CONFIG.points.print, 'print', '#' + state.orderId + ' · Printed');
    await refreshUserAndPoints();
    showToast('🖨️ Print dialog opened (-' + CONFIG.points.print + ' pts)', 'success');
  } catch (err) { handleAuthFailure(err); }
}

async function sendEmailReceipt() {
  if (!validateForm()) return;
  if ((user.points || 0) < CONFIG.points.email) { showToast('❌ Need ' + CONFIG.points.email + ' points to email', 'error'); return; }
  const email = document.getElementById('recipientEmail').value.trim();
  if (!email || !validateEmail(email)) { showToast('❌ Enter a valid email', 'error'); return; }
  const totals = recalcTotals();
  try {
    await window.api.sendReceiptEmail(email, `Your receipt from ${state.storeName}`, {
      storeName: state.storeName, orderId: state.orderId, dateTime: state.dateTime.toISOString(),
      items: state.items, total: formatCurrency(totals.total)
    });
    await window.api.deductPoints(CONFIG.points.email, 'email', 'To: ' + email);
    await refreshUserAndPoints();
    showToast('📧 Email receipt sent! (-' + CONFIG.points.email + ' pts)', 'success');
  } catch (err) { handleAuthFailure(err); }
}

async function generateShortLink() {
  if (!validateForm()) return;
  if ((user.points || 0) < CONFIG.points.link) { showToast('❌ Need ' + CONFIG.points.link + ' points for link', 'error'); return; }
  try {
    const res = await persistReceipt();
    const shortUrl = (res && res.shortUrl) || ('chaposhub.link/r/' + Math.random().toString(36).slice(2, 8));
    await window.api.deductPoints(CONFIG.points.link, 'link', shortUrl);
    await refreshUserAndPoints();
    showToast('🔗 ' + shortUrl + ' (-' + CONFIG.points.link + ' pts)', 'success');
  } catch (err) { handleAuthFailure(err); }
}

// === CHAPO'SHUB AI HUB (Step 7) ===
// Each tool defines: id, icon/label for the chip, the placeholder + prompt
// label shown above the textarea, the input char limit, the point-cost key
// (matches CONFIG.points / server POINTS_COSTS), the button label, and an
// optional set of "extra" fields (tone/platform/style/language selects)
// rendered above the Generate button.
const AI_TOOLS = {
  reply: {
    icon: '💬', label: 'Customer Reply', prompt: '💬 Paste a customer message to get a smart reply',
    placeholder: "e.g. 'Hey, did you send me that payment? I haven't received it yet.'",
    maxLen: 500, costKey: 'ai', btnLabel: '✨ Generate Reply',
    extras: [{ id: 'aiTone', type: 'select', options: ['professional', 'friendly', 'casual', 'urgent', 'apologetic'] }]
  },
  content: {
    icon: '✍️', label: 'Content Generator', prompt: '✍️ Describe the topic or brief for your content',
    placeholder: "e.g. 'Write a short intro paragraph about the benefits of online shopping.'",
    maxLen: 500, costKey: 'ai_content', btnLabel: '✨ Generate Content',
    extras: [{ id: 'aiTone2', type: 'select', options: ['professional', 'friendly', 'casual', 'persuasive', 'informative'] }]
  },
  social: {
    icon: '📱', label: 'Social Captions', prompt: '📱 What is the post about?',
    placeholder: "e.g. 'New summer collection just dropped, 20% off this weekend.'",
    maxLen: 300, costKey: 'ai_social', btnLabel: '✨ Generate Caption',
    extras: [{ id: 'aiPlatform', type: 'select', options: ['Instagram', 'Twitter/X', 'TikTok', 'Facebook', 'LinkedIn'] }]
  },
  product: {
    icon: '🛍️', label: 'Product Descriptions', prompt: '🛍️ Describe the product (name, features, materials, etc.)',
    placeholder: "e.g. 'Handmade leather wallet, slim design, RFID-blocking, 6 card slots.'",
    maxLen: 400, costKey: 'ai_product', btnLabel: '✨ Generate Description',
    extras: []
  },
  email_gen: {
    icon: '📧', label: 'Email Generator', prompt: '📧 What should the email say?',
    placeholder: "e.g. 'Follow up with a customer whose order shipped late, apologize and offer 10% off.'",
    maxLen: 500, costKey: 'ai_email', btnLabel: '✨ Generate Email',
    extras: [{ id: 'aiTone3', type: 'select', options: ['professional', 'friendly', 'apologetic', 'formal'] }]
  },
  rewrite: {
    icon: '🔄', label: 'Rewrite / Improve', prompt: '🔄 Paste the text you want rewritten or improved',
    placeholder: "Paste any text here and AI will improve clarity, grammar, and flow.",
    maxLen: 2000, costKey: 'ai_rewrite', btnLabel: '✨ Rewrite Text',
    extras: [{ id: 'aiStyle', type: 'select', options: ['clear and polished', 'more concise', 'more formal', 'more casual', 'more persuasive'] }]
  },
  chat: {
    icon: '🧠', label: 'General Chat', prompt: '🧠 Ask me anything',
    placeholder: "e.g. 'What are some good ideas for a small business loyalty program?'",
    maxLen: 1000, costKey: 'ai_chat', btnLabel: '✨ Ask AI',
    extras: []
  },
  longform: {
    icon: '📄', label: 'Long-Form Content', prompt: '📄 Describe the article or blog post topic',
    placeholder: "e.g. 'Write a blog post about how small businesses can improve customer retention.'",
    maxLen: 500, costKey: 'ai_longform', btnLabel: '✨ Generate Article',
    extras: [{ id: 'aiTone4', type: 'select', options: ['professional', 'friendly', 'informative', 'persuasive'] }]
  },
  code: {
    icon: '💻', label: 'Coding Assistant', prompt: '💻 Describe what you need help coding',
    placeholder: "e.g. 'Write a JavaScript function that validates an email address.'",
    maxLen: 2000, costKey: 'ai_code', btnLabel: '✨ Generate Code',
    extras: [{ id: 'aiLanguage', type: 'select', options: ['JavaScript', 'Python', 'TypeScript', 'HTML/CSS', 'SQL', 'Other'] }]
  }
};

let currentAITool = 'reply';

function renderAIToolChips() {
  const scroll = document.getElementById('aiToolScroll');
  if (!scroll) return;
  scroll.innerHTML = Object.keys(AI_TOOLS).map(key => {
    const t = AI_TOOLS[key];
    return `<div class="ai-tool-chip ${key === currentAITool ? 'active' : ''}" data-tool="${key}" onclick="setAITool('${key}')" role="tab" aria-selected="${key === currentAITool}">${t.icon} ${t.label}</div>`;
  }).join('');
}

function setAITool(toolKey) {
  const tool = AI_TOOLS[toolKey];
  if (!tool) return;
  currentAITool = toolKey;
  renderAIToolChips();

  document.getElementById('aiToolPrompt').textContent = tool.prompt;
  const input = document.getElementById('aiInput');
  input.placeholder = tool.placeholder;
  input.maxLength = tool.maxLen;
  input.value = '';
  document.getElementById('aiCharCount').textContent = '0 / ' + tool.maxLen;

  const extraWrap = document.getElementById('aiExtraOptions');
  extraWrap.innerHTML = tool.extras.map(f =>
    `<select class="ai-extra-field" id="${f.id}">${f.options.map(o => `<option value="${o}">${o.charAt(0).toUpperCase() + o.slice(1)}</option>`).join('')}</select>`
  ).join('');

  const btn = document.getElementById('aiGenerateBtn');
  const cost = CONFIG.points[tool.costKey] || 0;
  btn.textContent = tool.btnLabel + ' (' + cost + ' pts)';

  clearAIOutput();
}

function updateAICharCount() {
  const tool = AI_TOOLS[currentAITool];
  const input = document.getElementById('aiInput');
  const counter = document.getElementById('aiCharCount');
  if (input && counter && tool) counter.textContent = input.value.length + ' / ' + tool.maxLen;
}

function clearAIOutput() {
  const output = document.getElementById('aiOutput');
  const actions = document.getElementById('aiOutputActions');
  output.textContent = '';
  output.classList.remove('show');
  actions.style.display = 'none';
}

function copyAIOutput() {
  const output = document.getElementById('aiOutput');
  const text = output.textContent || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('📋 Copied to clipboard!', 'success')).catch(() => showToast('❌ Could not copy'));
}

async function generateAIContent() {
  const tool = AI_TOOLS[currentAITool];
  const cost = CONFIG.points[tool.costKey] || 0;
  if ((user.points || 0) < cost) { showToast('❌ Need ' + cost + ' points for ' + tool.label, 'error'); return; }

  const input = document.getElementById('aiInput').value.trim();
  const output = document.getElementById('aiOutput');
  const actions = document.getElementById('aiOutputActions');
  if (!input) { showToast('Please enter some input'); return; }

  const opts = {};
  tool.extras.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    if (f.id.startsWith('aiTone')) opts.tone = el.value;
    else if (f.id === 'aiPlatform') opts.platform = el.value;
    else if (f.id === 'aiStyle') opts.style = el.value;
    else if (f.id === 'aiLanguage') opts.language = el.value;
  });

  const btn = document.getElementById('aiGenerateBtn');
  const originalLabel = btn.textContent;
  try {
    btn.disabled = true; btn.textContent = '✨ Generating...';

    let res;
    let description;
    if (currentAITool === 'reply') {
      res = await window.api.generateAIReply(input, opts.tone || 'professional');
      description = (opts.tone || 'professional').charAt(0).toUpperCase() + (opts.tone || 'professional').slice(1) + ' tone';
    } else {
      res = await window.api.generateAIContent(currentAITool, input, opts);
      description = tool.label;
    }

    output.textContent = res.reply;
    output.classList.add('show');
    actions.style.display = 'flex';

    await window.api.deductPoints(cost, tool.costKey, description);
    await refreshUserAndPoints();
    showToast('✨ ' + tool.label + ' generated! (-' + cost + ' pts)', 'success');
  } catch (err) {
    handleAuthFailure(err);
  } finally {
    btn.disabled = false; btn.textContent = originalLabel;
  }
}


// === OPAY WALLET DEMO (/services/opay) ===
// A private, per-user, auth-gated simulated wallet app (dashboard / send
// money / transfer-to-bank / history), replacing the earlier form-based
// OPay receipt generator. Every server call is authenticated (the API
// client always attaches the Chapo'sHub JWT), so wallet/send/history are
// implicitly gated behind login - an unauthenticated visitor never reaches
// showPage('opay') because the whole app-shell stays hidden until sign-in.
// The demo wallet balance AND Chapo'sHub points are both debited
// server-side, atomically, with refund-on-failure (see
// src/routes/opay-wallet.ts) - this frontend never decides whether a
// transfer is allowed, it only reflects the server's final result.
const OpayWallet = (function () {
  let wallet = null;
  let banksCache = null;
  let resolvedAccount = null; // { name, bankCode, bankName }

  const sendState = { amount: 0, name: '', phone: '', note: '', pin: '' };
  const bankState = { amount: 0, note: '', pin: '' };

  function fmtNaira(v) {
    return '₦' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showView(viewId) {
    document.querySelectorAll('#page-opay .ow-view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('ow-view-' + viewId);
    if (el) el.classList.add('active');
  }

  function showStep(prefix, stepName, steps, progressId) {
    steps.forEach(s => {
      const el = document.getElementById(`ow-${prefix}-step-${s}`);
      if (el) el.classList.toggle('active', s === stepName);
    });
    const progress = document.getElementById(progressId);
    if (progress) {
      const idx = steps.indexOf(stepName);
      progress.style.display = stepName === 'success' ? 'none' : 'flex';
      progress.querySelectorAll('.ow-seg').forEach((seg, i) => seg.classList.toggle('done', i <= idx));
    }
  }

  // ---- Dashboard ----
  let balanceVisible = false;

  async function loadDashboard() {
    const subEl = document.getElementById('owBalanceSub');
    try {
      wallet = await window.api.getOpayWallet();
      if (subEl) subEl.textContent = 'OPay Demo Wallet';
      updateBalanceDisplay();
    } catch (err) {
      if (subEl) subEl.textContent = 'Could not load wallet';
      handleAuthFailure(err);
      return;
    }
    const list = document.getElementById('owRecentTxnList');
    if (list) {
      try {
        const txns = await window.api.getOpayTransactions(5);
        renderTxnList(list, txns);
      } catch (err) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Could not load transactions</div></div>';
      }
    }
  }

  function updateBalanceDisplay() {
    const el = document.getElementById('owBalanceAmount');
    if (!el || !wallet) return;
    el.textContent = balanceVisible ? fmtNaira(wallet.balance) : '₦••••••';
  }

  function renderTxnList(container, txns) {
    if (!txns.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-title">No transactions yet</div></div>';
      return;
    }
    container.innerHTML = txns.map(t => {
      const isBank = t.category === 'bank_transfer';
      const icon = isBank ? '🏦' : '👤';
      const title = isBank ? ('To ' + (t.bankName || 'Bank')) : ('To ' + (t.counterpartyName || 'Someone'));
      return `<div class="ow-txn-item"><div class="ow-txn-icon">${icon}</div><div class="ow-txn-info"><div class="ow-txn-title">${escHtml(title)}</div><div class="ow-txn-sub">${escHtml(t.note || t.accountNumber || '')}</div></div><div class="ow-txn-right"><div class="ow-txn-amount out">-${fmtNaira(t.amount)}</div><div class="ow-txn-time">${relativeTime(t.createdAt)}</div></div></div>`;
    }).join('');
  }

  // ---- Navigation ----
  function openDashboard() { showView('dashboard'); loadDashboard(); }

  function openSend() {
    Object.assign(sendState, { amount: 0, name: '', phone: '', note: '', pin: '' });
    document.getElementById('owSendName').value = '';
    document.getElementById('owSendPhone').value = '';
    document.getElementById('owSendAmountInput').value = '';
    document.getElementById('owSendNarration').value = '';
    document.getElementById('owSendStepTitle').textContent = 'Send Money';
    showView('send');
    showStep('send', 'recipient', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owSendProgress');
  }
  function backFromSend() { openDashboard(); }

  function sendGoToAmount() {
    const name = document.getElementById('owSendName').value.trim();
    const phone = document.getElementById('owSendPhone').value.trim();
    if (!name) { showToast('❌ Recipient name required', 'error'); return; }
    if (!phone) { showToast('❌ Recipient phone required', 'error'); return; }
    sendState.name = name; sendState.phone = phone;
    document.getElementById('owSendBalanceHint').textContent = 'Available balance: ' + fmtNaira(wallet ? wallet.balance : 0);
    document.getElementById('owSendStepTitle').textContent = 'Enter Amount';
    showStep('send', 'amount', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owSendProgress');
  }

  function sendGoToConfirm() {
    sendState.note = document.getElementById('owSendNarration').value.trim();
    document.getElementById('owSendConfirmAmount').textContent = fmtNaira(sendState.amount);
    document.getElementById('owSendConfirmName').textContent = sendState.name;
    document.getElementById('owSendConfirmPhone').textContent = sendState.phone;
    document.getElementById('owSendConfirmNote').textContent = sendState.note || '—';
    document.getElementById('owSendConfirmPoints').textContent = CONFIG.points.opay_wallet_send + ' pts';
    document.getElementById('owSendStepTitle').textContent = 'Confirm Transfer';
    showStep('send', 'confirm', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owSendProgress');
  }

  function sendGoToPin() {
    sendState.pin = '';
    updatePinDots('owSendPinDots', '');
    document.getElementById('owSendStepTitle').textContent = 'Enter PIN';
    showStep('send', 'pin', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owSendProgress');
  }

  function updatePinDots(elId, pin) {
    document.querySelectorAll('#' + elId + ' .ow-dot').forEach((dot, i) => dot.classList.toggle('filled', i < pin.length));
  }

  async function processSend() {
    const keypad = document.getElementById('owSendKeypad');
    keypad.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      const res = await window.api.opaySendMoney({
        recipientName: sendState.name,
        recipientPhone: sendState.phone,
        amount: sendState.amount,
        note: sendState.note || undefined
      });
      const txn = res.transaction;
      document.getElementById('owSendSuccessAmount').textContent = fmtNaira(sendState.amount);
      document.getElementById('owSendSuccessName').textContent = sendState.name + ' (' + sendState.phone + ')';
      document.getElementById('owSendSuccessRef').textContent = txn.reference;
      document.getElementById('owSendSuccessDate').textContent = new Date(txn.createdAt).toLocaleString();
      document.getElementById('owSendStepTitle').textContent = 'Success';
      showStep('send', 'success', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owSendProgress');
      await refreshUserAndPoints();
      showToast('🟢 Sent! (-' + res.pointsCharged + ' pts)', 'success');
    } catch (err) {
      if (err && err.status === 402) {
        showToast('❌ ' + (err.message || 'Insufficient balance for this transfer'), 'error');
      } else {
        handleAuthFailure(err);
      }
      sendGoToConfirm();
    } finally {
      keypad.querySelectorAll('button').forEach(b => b.disabled = false);
    }
  }

  // ---- Transfer To Bank ----
  function openTransfer() {
    Object.assign(bankState, { amount: 0, note: '', pin: '' });
    resolvedAccount = null;
    document.getElementById('owBankAccountNumber').value = '';
    document.getElementById('owBankAmountInput').value = '';
    document.getElementById('owBankNarration').value = '';
    clearBankResolvedAccount();
    document.getElementById('owBankToAmountBtn').disabled = true;
    document.getElementById('owBankStepTitle').textContent = 'Transfer To Bank';
    showView('tobank');
    showStep('bank', 'recipient', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owBankProgress');
    loadBanks();
  }
  function backFromTransfer() { openDashboard(); }

  async function loadBanks() {
    const select = document.getElementById('owBankSelect');
    if (!select) return;
    if (banksCache) { renderBankOptions(select, banksCache); return; }
    select.innerHTML = '<option value="">Loading banks…</option>';
    try {
      const res = await window.api.getBanks();
      const list = (res && res.data) || [];
      if (!list.length) throw new Error('empty');
      banksCache = list;
      renderBankOptions(select, list);
    } catch (err) {
      select.innerHTML = '<option value="">Unable to load banks — check Paystack setup</option>';
    }
  }

  function renderBankOptions(select, list) {
    select.innerHTML = '<option value="">Select bank</option>' + list.map(b => `<option value="${escHtml(b.code)}">${escHtml(b.name)}</option>`).join('');
  }

  function clearBankResolvedAccount() {
    resolvedAccount = null;
    const box = document.getElementById('owBankResolvedAccount');
    if (box) { box.style.display = 'none'; box.textContent = ''; box.className = 'ow-resolved-account'; }
    const btn = document.getElementById('owBankToAmountBtn');
    if (btn) btn.disabled = true;
  }

  async function resolveBankAccount() {
    const bankSelect = document.getElementById('owBankSelect');
    const bankCode = bankSelect.value;
    const bankName = bankSelect.options[bankSelect.selectedIndex] ? bankSelect.options[bankSelect.selectedIndex].text : '';
    const accountNumber = document.getElementById('owBankAccountNumber').value.trim();
    const box = document.getElementById('owBankResolvedAccount');
    const btn = document.getElementById('owBankVerifyBtn');

    if (!bankCode) { showToast('❌ Select a bank first', 'error'); return; }
    if (!/^\d{10}$/.test(accountNumber)) { showToast('❌ Enter a valid 10-digit account number', 'error'); return; }

    const originalLabel = btn.textContent;
    try {
      btn.disabled = true; btn.textContent = '🔍 Verifying…';
      const res = await window.api.resolveBankAccount({ bank_code: bankCode, account_number: accountNumber });
      const name = res && res.data && res.data.account_name;
      if (res && res.success && name) {
        resolvedAccount = { name, bankCode, bankName, accountNumber };
        box.className = 'ow-resolved-account success';
        box.textContent = '✓ ' + name;
        box.style.display = 'block';
        document.getElementById('owBankToAmountBtn').disabled = false;
        showToast('✓ Account verified', 'success');
      } else {
        throw new Error((res && res.message) || 'Could not resolve account');
      }
    } catch (err) {
      resolvedAccount = null;
      document.getElementById('owBankToAmountBtn').disabled = true;
      box.className = 'ow-resolved-account error';
      box.textContent = '❌ ' + (err && err.message ? err.message : 'Could not verify account');
      box.style.display = 'block';
    } finally {
      btn.disabled = false; btn.textContent = originalLabel;
    }
  }

  function bankGoToAmount() {
    if (!resolvedAccount) { showToast('❌ Verify the recipient account first', 'error'); return; }
    document.getElementById('owBankBalanceHint').textContent = 'Available balance: ' + fmtNaira(wallet ? wallet.balance : 0);
    document.getElementById('owBankStepTitle').textContent = 'Enter Amount';
    showStep('bank', 'amount', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owBankProgress');
  }

  function bankGoToConfirm() {
    bankState.note = document.getElementById('owBankNarration').value.trim();
    document.getElementById('owBankConfirmAmount').textContent = fmtNaira(bankState.amount);
    document.getElementById('owBankConfirmBank').textContent = resolvedAccount.bankName;
    document.getElementById('owBankConfirmName').textContent = resolvedAccount.name;
    document.getElementById('owBankConfirmNumber').textContent = resolvedAccount.accountNumber;
    document.getElementById('owBankConfirmPoints').textContent = CONFIG.points.opay_bank_transfer + ' pts';
    document.getElementById('owBankStepTitle').textContent = 'Confirm Transfer';
    showStep('bank', 'confirm', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owBankProgress');
  }

  function bankGoToPin() {
    bankState.pin = '';
    updatePinDots('owBankPinDots', '');
    document.getElementById('owBankStepTitle').textContent = 'Enter PIN';
    showStep('bank', 'pin', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owBankProgress');
  }

  async function processBankTransfer() {
    const keypad = document.getElementById('owBankKeypad');
    keypad.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      const res = await window.api.opayBankTransfer({
        bankName: resolvedAccount.bankName,
        bankCode: resolvedAccount.bankCode,
        accountNumber: resolvedAccount.accountNumber,
        accountName: resolvedAccount.name,
        amount: bankState.amount,
        note: bankState.note || undefined
      });
      const txn = res.transaction;
      document.getElementById('owBankSuccessAmount').textContent = fmtNaira(bankState.amount);
      document.getElementById('owBankSuccessName').textContent = resolvedAccount.name;
      document.getElementById('owBankSuccessBank').textContent = resolvedAccount.bankName;
      document.getElementById('owBankSuccessRef').textContent = txn.reference;
      document.getElementById('owBankSuccessDate').textContent = new Date(txn.createdAt).toLocaleString();
      document.getElementById('owBankStepTitle').textContent = 'Success';
      showStep('bank', 'success', ['recipient', 'amount', 'confirm', 'pin', 'success'], 'owBankProgress');
      await refreshUserAndPoints();
      showToast('🟢 Transfer successful! (-' + res.pointsCharged + ' pts)', 'success');
    } catch (err) {
      if (err && err.status === 402) {
        showToast('❌ ' + (err.message || 'Insufficient balance for this transfer'), 'error');
      } else {
        handleAuthFailure(err);
      }
      bankGoToConfirm();
    } finally {
      keypad.querySelectorAll('button').forEach(b => b.disabled = false);
    }
  }

  // ---- History ----
  async function openHistory() {
    showView('history');
    const list = document.getElementById('owHistoryList');
    list.innerHTML = '<div class="ow-skeleton"></div>';
    try {
      const txns = await window.api.getOpayTransactions(200);
      renderTxnList(list, txns);
    } catch (err) {
      handleAuthFailure(err);
    }
  }

  // ---- Wire up amount inputs / quick-amounts / keypads (once, at module load) ----
  function bindOnce() {
    const sendAmt = document.getElementById('owSendAmountInput');
    if (sendAmt) sendAmt.addEventListener('input', () => {
      sendAmt.value = sendAmt.value.replace(/[^0-9]/g, '');
      sendState.amount = parseInt(sendAmt.value || '0', 10);
      const valid = sendState.amount > 0 && wallet && sendState.amount <= Number(wallet.balance || 0);
      document.getElementById('owSendToConfirmBtn').disabled = !valid;
      const hint = document.getElementById('owSendBalanceHint');
      if (wallet && sendState.amount > Number(wallet.balance || 0) && sendState.amount > 0) {
        hint.innerHTML = `<span style="color:var(--danger);font-weight:600">Insufficient balance — available ${fmtNaira(wallet.balance)}</span>`;
      } else {
        hint.textContent = 'Available balance: ' + fmtNaira(wallet ? wallet.balance : 0);
      }
    });
    document.querySelectorAll('#ow-send-step-amount .ow-quick-amounts button').forEach(btn => {
      btn.addEventListener('click', () => { sendAmt.value = btn.dataset.amt; sendAmt.dispatchEvent(new Event('input')); });
    });
    const sendKeypad = document.getElementById('owSendKeypad');
    if (sendKeypad) sendKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-key]');
      if (!btn) return;
      const key = btn.dataset.key;
      if (key === 'del') sendState.pin = sendState.pin.slice(0, -1);
      else if (sendState.pin.length < 4) sendState.pin += key;
      updatePinDots('owSendPinDots', sendState.pin);
      if (sendState.pin.length === 4) setTimeout(processSend, 250);
    });

    const bankAmt = document.getElementById('owBankAmountInput');
    if (bankAmt) bankAmt.addEventListener('input', () => {
      bankAmt.value = bankAmt.value.replace(/[^0-9]/g, '');
      bankState.amount = parseInt(bankAmt.value || '0', 10);
      const valid = bankState.amount > 0 && wallet && bankState.amount <= Number(wallet.balance || 0);
      document.getElementById('owBankToConfirmBtn').disabled = !valid;
      const hint = document.getElementById('owBankBalanceHint');
      if (wallet && bankState.amount > Number(wallet.balance || 0) && bankState.amount > 0) {
        hint.innerHTML = `<span style="color:var(--danger);font-weight:600">Insufficient balance — available ${fmtNaira(wallet.balance)}</span>`;
      } else {
        hint.textContent = 'Available balance: ' + fmtNaira(wallet ? wallet.balance : 0);
      }
    });
    document.querySelectorAll('#ow-bank-step-amount .ow-quick-amounts button').forEach(btn => {
      btn.addEventListener('click', () => { bankAmt.value = btn.dataset.amt; bankAmt.dispatchEvent(new Event('input')); });
    });
    const bankKeypad = document.getElementById('owBankKeypad');
    if (bankKeypad) bankKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-key]');
      if (!btn) return;
      const key = btn.dataset.key;
      if (key === 'del') bankState.pin = bankState.pin.slice(0, -1);
      else if (bankState.pin.length < 4) bankState.pin += key;
      updatePinDots('owBankPinDots', bankState.pin);
      if (bankState.pin.length === 4) setTimeout(processBankTransfer, 250);
    });

    const [bankSelectEl, bankAcctEl] = [document.getElementById('owBankSelect'), document.getElementById('owBankAccountNumber')];
    [bankSelectEl, bankAcctEl].forEach(el => { if (el) { el.addEventListener('change', clearBankResolvedAccount); el.addEventListener('input', clearBankResolvedAccount); } });

    const eyeToggle = document.getElementById('owEyeToggle');
    if (eyeToggle) eyeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      balanceVisible = !balanceVisible;
      updateBalanceDisplay();
      eyeToggle.querySelector('i').className = balanceVisible ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  }

  document.addEventListener('DOMContentLoaded', bindOnce);
  if (document.readyState !== 'loading') bindOnce();

  return {
    openDashboard, loadDashboard,
    openSend, backFromSend, sendGoToAmount, sendGoToConfirm, sendGoToPin,
    openTransfer, backFromTransfer, resolveBankAccount, bankGoToAmount, bankGoToConfirm, bankGoToPin,
    openHistory
  };
})();

function buyPoints(packageId) {
  const checkoutUrl = WHOP_CHECKOUT_URLS[packageId];
  if (!checkoutUrl) {
    showToast('💡 This package is coming soon — grab the Starter pack for now!', 'info');
    return;
  }
  // Prefill + lock the email field on Whop's checkout so the payment's
  // buyer email matches this Chapo'sHub account, letting the webhook
  // (POST /api/webhooks/whop) auto-credit points without any manual match.
  let url = checkoutUrl;
  if (user.email) {
    url += (url.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(user.email) + '&email.disabled=1';
  }
  showToast('💳 Redirecting to secure Whop checkout…');
  window.location.href = url;
}

function copyRefLink() {
  const code = user.referralCode || user.username || 'guest';
  const link = 'https://chaposhub.link/ref/' + code;
  navigator.clipboard.writeText(link).then(() => showToast('📋 Referral link copied!', 'success')).catch(() => showToast('📋 Ref: ' + link));
}

async function generateSupportPage() {
  if ((user.points || 0) < CONFIG.points.support) { showToast('❌ Need ' + CONFIG.points.support + ' points to generate', 'error'); return; }
  const company = document.getElementById('supportCompany').value;
  const color = document.getElementById('supportColor').value;
  const email = document.getElementById('supportEmail').value;
  const whatsapp = document.getElementById('supportWhatsApp').value;
  const telegram = document.getElementById('supportTelegram').value;
  const desc = document.getElementById('supportDesc').value;
  document.getElementById('supportHeader').style.background = color;
  document.getElementById('supportHeader').innerHTML = '<h3>' + escHtml(company) + '</h3><p>' + escHtml(desc) + '</p>';
  const body = document.getElementById('supportPreview').querySelector('.support-body');
  body.innerHTML = '<div class="support-contact">📧 ' + escHtml(email) + '</div><div class="support-contact">📱 ' + escHtml(whatsapp) + '</div><div class="support-contact">💬 ' + escHtml(telegram) + '</div>';
  try {
    await window.api.deductPoints(CONFIG.points.support, 'support', company);
    await refreshUserAndPoints();
    showToast('🚀 Support page generated! (-' + CONFIG.points.support + ' pts)', 'success');
  } catch (err) { handleAuthFailure(err); }
}

function logoutUser() {
  if (confirm('Log out of Chapo\'sHub?')) {
    window.ChapoAuth.logout();
  }
}

let debounceT;
document.addEventListener('input', e => { if (e.target.closest('.form-section')) { clearTimeout(debounceT); debounceT = setTimeout(() => refreshUI(), 200); } });

// === LANDING PAGE / APP SHELL TOGGLE ===
function showLandingPage() {
  const landing = document.getElementById('landingPage');
  const shell = document.getElementById('appShell');
  if (landing) landing.classList.remove('hidden');
  if (shell) shell.classList.add('hidden');
  document.body.classList.add('landing-mode');
}

function showAppShell() {
  const landing = document.getElementById('landingPage');
  const shell = document.getElementById('appShell');
  if (landing) landing.classList.add('hidden');
  if (shell) shell.classList.remove('hidden');
  document.body.classList.remove('landing-mode');
}

// === APP BOOTSTRAP ===
async function initApp() {
  loadDraft();
  renderAllServices();
  renderPlatformChips();
  renderServicesGrid();
  renderAIToolChips();
  setAITool(currentAITool);
  document.getElementById('receiptDate').value = state.dateTime.toISOString().slice(0, 16);
  refreshUI(false);

  if (window.api.isAuthenticated()) {
    await onAuthenticated();
  } else {
    // Not logged in: show the marketing landing page. The auth modal is only
    // triggered explicitly via the landing page's "Get Started" / "Sign In" CTAs.
    showLandingPage();
  }
}

async function onAuthenticated() {
  showAppShell();
  await refreshUserAndPoints();
  await refreshHistory();
}

window.ChapoApp = { onAuthenticated, showLandingPage, showAppShell };

initApp();
