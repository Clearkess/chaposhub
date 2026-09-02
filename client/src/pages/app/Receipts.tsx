import React, { useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { usePage } from '../../contexts/PageContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { api, APIError } from '../../api/client'
import { CONFIG, platforms, ReceiptItem } from '../../lib/config'
import ReceiptSkin from '../../components/ReceiptSkin'

const DRAFT_KEY = 'chapo_draft'

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

function generateRandomOrderId(storeName: string): string {
  const prefix = storeName.substring(0, 3).toUpperCase().replace(/\s/g, '')
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return prefix + '-' + dateStr + '-' + rand
}

function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
}

interface DraftState {
  platform: string
  storeName: string
  dateTime: string // ISO
  orderId: string
  taxRate: number
  currency: string
  items: ReceiptItem[]
}

function defaultState(): DraftState {
  return {
    platform: 'generic',
    storeName: 'FreshMart',
    dateTime: new Date().toISOString(),
    orderId: 'FR-20260718-0042',
    taxRate: 8.25,
    currency: '$',
    items: [
      { description: 'Organic Avocado', quantity: 2, price: 2.49 },
      { description: 'Whole Wheat Bread', quantity: 1, price: 3.79 },
      { description: 'Almond Milk 1L', quantity: 1, price: 4.29 }
    ]
  }
}

function loadDraft(): DraftState {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      return { ...defaultState(), ...data }
    }
  } catch {
    /* ignore */
  }
  return defaultState()
}

function saveDraft(s: DraftState) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        storeName: s.storeName,
        platform: s.platform,
        orderId: s.orderId,
        taxRate: s.taxRate,
        currency: s.currency,
        items: s.items
      })
    )
  } catch {
    /* ignore */
  }
}

// Ported from `#page-receipts` + the receipt-builder logic (state,
// setPlatform, addItem/removeItem, updateReceipt, downloadReceipt,
// printReceipt, sendEmailReceipt, generateShortLink) in public/static/js/app.js.
export default function Receipts() {
  const { user, refreshUser } = useAuth()
  const { consumePendingPlatform } = usePage()
  const { showToast } = useToast()

  const [draft, setDraft] = useState<DraftState>(loadDraft)
  const [recipientEmail, setRecipientEmail] = useState('')
  const receiptRef = useRef<HTMLDivElement>(null)
  const barcodeRef = useRef<SVGSVGElement>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  // Apply pending platform selection when navigated here from a service card.
  useEffect(() => {
    const pending = consumePendingPlatform()
    if (pending && platforms[pending]) {
      applyPlatform(pending)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    saveDraft(draft)
  }, [draft])

  useEffect(() => {
    try {
      if (barcodeRef.current) {
        JsBarcode(barcodeRef.current, draft.orderId, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 10
        })
      }
    } catch {
      /* ignore malformed order id for barcode rendering */
    }
    try {
      if (qrRef.current) {
        qrRef.current.innerHTML = ''
        new QRCode(qrRef.current, {
          text: `https://verify.receipt/${draft.orderId}`,
          width: 70,
          height: 70,
          colorDark: '#222',
          colorLight: '#fffdf7',
          correctLevel: QRCode.CorrectLevel.M
        })
      }
    } catch {
      /* ignore */
    }
  }, [draft])

  function formatCurrency(val: number): string {
    return draft.currency + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  function recalcTotals() {
    const subtotal = draft.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
    const tax = subtotal * (draft.taxRate / 100)
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  function applyPlatform(platformKey: string) {
    const p = platforms[platformKey]
    if (!p) return
    setDraft((prev) => ({
      ...prev,
      platform: platformKey,
      storeName: p.name,
      taxRate: p.taxRate,
      currency: p.currency,
      orderId: generateRandomOrderId(p.name),
      items: JSON.parse(JSON.stringify(p.items))
    }))
    showToast('🔄 ' + p.name)
  }

  function updateItem(idx: number, field: keyof ReceiptItem, value: string) {
    setDraft((prev) => {
      const items = [...prev.items]
      const item = { ...items[idx] }
      if (field === 'description') item.description = value
      else if (field === 'quantity') item.quantity = parseFloat(value) || 0
      else if (field === 'price') item.price = parseFloat(value) || 0
      items[idx] = item
      return { ...prev, items }
    })
  }

  function addItem() {
    setDraft((prev) => ({ ...prev, items: [...prev.items, { description: 'New Item', quantity: 1, price: 0 }] }))
  }

  function removeItem(idx: number) {
    setDraft((prev) => {
      const items = prev.items.filter((_, i) => i !== idx)
      return { ...prev, items: items.length ? items : [{ description: 'Item', quantity: 1, price: 0 }] }
    })
  }

  function randomizeId() {
    setDraft((prev) => ({ ...prev, orderId: generateRandomOrderId(prev.storeName) }))
    showToast('🎲 Order ID randomized')
  }

  function validateForm(): boolean {
    if (!draft.storeName.trim()) {
      showToast('❌ Store name required', 'error')
      return false
    }
    if (!draft.orderId.trim()) {
      showToast('❌ Order ID required', 'error')
      return false
    }
    if (draft.taxRate < 0 || draft.taxRate > 100 || Number.isNaN(draft.taxRate)) {
      showToast('❌ Tax rate must be 0-100', 'error')
      return false
    }
    if (draft.items.length === 0 || !draft.items.some((i) => i.description.trim())) {
      showToast('❌ Add at least one item', 'error')
      return false
    }
    return true
  }

  function handleAuthFailure(err: unknown) {
    if (err instanceof APIError && err.status === 401) {
      showToast('❌ Please log in again', 'error')
    } else {
      showToast('❌ ' + (err instanceof Error ? err.message : 'Something went wrong'), 'error')
    }
  }

  async function persistReceipt() {
    try {
      return await api.createReceipt({
        storeName: draft.storeName,
        platform: draft.platform,
        orderId: draft.orderId,
        items: draft.items,
        taxRate: draft.taxRate,
        currency: draft.currency,
        recipientEmail: recipientEmail.trim() || undefined
      })
    } catch (err) {
      if (err instanceof APIError && err.status === 409) return null
      throw err
    }
  }

  async function downloadReceipt() {
    if (!validateForm()) return
    if ((user?.points || 0) < CONFIG.points.download) {
      showToast(`❌ Need ${CONFIG.points.download} points to download`, 'error')
      return
    }
    const element = receiptRef.current
    if (!element) return
    try {
      // Each skin paints its own full-bleed background (thermal cream paper,
      // dark exchange card, white PayPal/CashApp/wallet card) — let
      // html2canvas read it from the DOM instead of forcing the old
      // thermal-only cream color, so exports match what's on screen.
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: null })
      const link = document.createElement('a')
      link.download = 'receipt_' + draft.orderId.replace(/[^a-z0-9]/gi, '_') + '.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
      await persistReceipt()
      await api.deductPoints(
        CONFIG.points.download,
        'download',
        '#' + draft.orderId + ' · ' + formatCurrency(recalcTotals().total)
      )
      await refreshUser()
      showToast(`📸 Receipt downloaded! (-${CONFIG.points.download} pts)`, 'success')
    } catch (err) {
      handleAuthFailure(err)
    }
  }

  async function printReceipt() {
    if (!validateForm()) return
    if ((user?.points || 0) < CONFIG.points.print) {
      showToast(`❌ Need ${CONFIG.points.print} points to print`, 'error')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('❌ Pop-up blocked', 'error')
      return
    }
    const doc = printWindow.document
    doc.title = 'Receipt ' + draft.orderId
    // Clone every stylesheet/style tag from the app document into the print
    // window's head so ALL receipt skins (thermal / crypto / paypal /
    // cashapp / walletcard) print with their real styling — the old code
    // only hand-wrote thermal-specific CSS here, which left every other
    // skin completely unstyled when printed.
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      doc.head.appendChild(node.cloneNode(true))
    })
    const wrapperStyle = doc.createElement('style')
    wrapperStyle.textContent =
      'body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f0;padding:20px}'
    doc.head.appendChild(wrapperStyle)
    const receiptDiv = doc.createElement('div')
    receiptDiv.className = receiptRef.current ? receiptRef.current.className : 'receipt'
    receiptDiv.innerHTML = receiptRef.current ? receiptRef.current.innerHTML : ''
    doc.body.appendChild(receiptDiv)
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
    try {
      await api.deductPoints(CONFIG.points.print, 'print', '#' + draft.orderId + ' · Printed')
      await refreshUser()
      showToast(`🖨️ Print dialog opened (-${CONFIG.points.print} pts)`, 'success')
    } catch (err) {
      handleAuthFailure(err)
    }
  }

  async function sendEmailReceipt() {
    if (!validateForm()) return
    if ((user?.points || 0) < CONFIG.points.email) {
      showToast(`❌ Need ${CONFIG.points.email} points to email`, 'error')
      return
    }
    const email = recipientEmail.trim()
    if (!email || !validateEmail(email)) {
      showToast('❌ Enter a valid email', 'error')
      return
    }
    const totals = recalcTotals()
    try {
      await api.sendReceiptEmail(email, `Your receipt from ${draft.storeName}`, {
        storeName: draft.storeName,
        orderId: draft.orderId,
        dateTime: draft.dateTime,
        items: draft.items,
        total: formatCurrency(totals.total)
      })
      await api.deductPoints(CONFIG.points.email, 'email', 'To: ' + email)
      await refreshUser()
      showToast(`📧 Email receipt sent! (-${CONFIG.points.email} pts)`, 'success')
    } catch (err) {
      handleAuthFailure(err)
    }
  }

  async function generateShortLink() {
    if (!validateForm()) return
    if ((user?.points || 0) < CONFIG.points.link) {
      showToast(`❌ Need ${CONFIG.points.link} points for link`, 'error')
      return
    }
    try {
      const res = await persistReceipt()
      const shortUrl = (res && (res as any).shortUrl) || 'chaposhub.link/r/' + Math.random().toString(36).slice(2, 8)
      await api.deductPoints(CONFIG.points.link, 'link', shortUrl)
      await refreshUser()
      showToast(`🔗 ${shortUrl} (-${CONFIG.points.link} pts)`, 'success')
    } catch (err) {
      handleAuthFailure(err)
    }
  }

  const totals = recalcTotals()
  const p = platforms[draft.platform] || platforms.generic
  const dateTimeLocal = new Date(draft.dateTime)
  const dateTimeLocalStr = Number.isNaN(dateTimeLocal.getTime())
    ? new Date().toISOString().slice(0, 16)
    : new Date(dateTimeLocal.getTime() - dateTimeLocal.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  return (
    <div className="page active" role="main" aria-label="Receipt Generator">
      <PageHeader title="🧾 Chapo'sHub Receipts" />

      <div className="platform-scroll">
        {Object.keys(platforms).map((key) => {
          const preset = platforms[key]
          return (
            <div
              key={key}
              className={`platform-chip ${key === draft.platform ? 'active' : ''}`}
              onClick={() => applyPlatform(key)}
            >
              <div className="chip-logo" style={{ background: preset.color, color: preset.badgeDark ? '#1a1a1a' : 'white' }}>
                {key === 'generic' ? '🛒' : preset.logoGlyph || preset.name[0]}
              </div>
              {preset.name}
            </div>
          )
        })}
      </div>

      <div className="form-section">
        <div className="form-field">
          <label>Store / Platform Name</label>
          <input
            type="text"
            value={draft.storeName}
            onChange={(e) => setDraft((prev) => ({ ...prev, storeName: e.target.value }))}
            required
            maxLength={50}
          />
        </div>
        <div className="form-field">
          <label>Order ID</label>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <input
              type="text"
              value={draft.orderId}
              onChange={(e) => setDraft((prev) => ({ ...prev, orderId: e.target.value }))}
              style={{ flex: 1 }}
              required
              maxLength={30}
              pattern="[A-Z0-9\-]+"
            />
            <button
              className="back-btn"
              onClick={randomizeId}
              style={{ flexShrink: 0 }}
              aria-label="Randomize order ID"
              title="Randomize order ID"
            >
              🎲
            </button>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Date &amp; Time</label>
            <input
              type="datetime-local"
              value={dateTimeLocalStr}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTime: new Date(e.target.value).toISOString() }))}
            />
          </div>
          <div className="form-field">
            <label>Tax Rate (%)</label>
            <input
              type="number"
              value={draft.taxRate}
              onChange={(e) => setDraft((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              step="0.01"
              min={0}
              max={100}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Currency</label>
            <select value={draft.currency} onChange={(e) => setDraft((prev) => ({ ...prev, currency: e.target.value }))}>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
              <option value="₿">BTC (₿)</option>
              <option value="₦">NGN (₦)</option>
            </select>
          </div>
          <div className="form-field">
            <label>Recipient Email</label>
            <input
              type="email"
              placeholder="customer@email.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
            />
          </div>
        </div>
        <div className="form-field">
          <label>Items</label>
          <div>
            {draft.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1.2fr 36px',
                  gap: '.4rem',
                  alignItems: 'end',
                  marginBottom: '.5rem'
                }}
              >
                <input
                  type="text"
                  placeholder="Item"
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  style={{
                    padding: '.6rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: '.85rem'
                  }}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  step="any"
                  min={0}
                  style={{
                    padding: '.6rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: '.85rem'
                  }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => updateItem(idx, 'price', e.target.value)}
                  step="0.01"
                  min={0}
                  style={{
                    padding: '.6rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: '.85rem'
                  }}
                />
                <button
                  onClick={() => removeItem(idx)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    padding: '.2rem'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button className="action-btn secondary" style={{ width: '100%', marginTop: '.5rem' }} onClick={addItem}>
            + Add Item
          </button>
        </div>
      </div>

      <div className="receipt-preview-card" role="region" aria-label="Receipt preview">
        <div
          style={{
            fontSize: '.8rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            marginBottom: '.8rem',
            textAlign: 'center'
          }}
        >
          👁️ Live Preview
        </div>
        <div
          ref={receiptRef}
          className={`receipt receipt-skin-${p.skin}`}
          style={p.skin === 'crypto' && p.darkBg ? { background: p.darkBg } : undefined}
          role="img"
          aria-label="Generated receipt preview"
        >
          <ReceiptSkin
            platformKey={draft.platform}
            preset={p}
            storeName={draft.storeName}
            orderId={draft.orderId}
            dateTime={draft.dateTime}
            items={draft.items}
            taxRate={draft.taxRate}
            currency={draft.currency}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            totals={totals}
            barcodeRef={barcodeRef}
            qrRef={qrRef}
          />
        </div>
      </div>

      <div className="action-buttons" role="group" aria-label="Receipt actions">
        <button className="action-btn primary" onClick={downloadReceipt}>
          📸 Download
        </button>
        <button className="action-btn secondary" onClick={printReceipt}>
          🖨️ Print
        </button>
        <button className="action-btn success" onClick={sendEmailReceipt}>
          📧 Email
        </button>
        <button className="action-btn secondary" onClick={generateShortLink}>
          🔗 Link
        </button>
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}
