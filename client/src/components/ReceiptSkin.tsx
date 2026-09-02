import React from 'react'
import type { PlatformPreset, ReceiptItem } from '../lib/config'
import {
  networkForPlatform,
  walletForPlatform,
  paymentMethodForPlatform,
  isFeeItem,
  pseudoHash,
  truncateMiddle
} from '../lib/receiptSkins'

export interface ReceiptSkinProps {
  platformKey: string
  preset: PlatformPreset
  storeName: string
  orderId: string
  dateTime: string
  items: ReceiptItem[]
  taxRate: number
  currency: string
  formatCurrency: (v: number) => string
  formatDate: (d: Date) => string
  totals: { subtotal: number; tax: number; total: number }
  barcodeRef: React.RefObject<SVGSVGElement>
  qrRef: React.RefObject<HTMLDivElement>
}

// Renders one of five pixel-styled receipt templates depending on
// `preset.skin`. `thermal` is the original generic-store paper-receipt
// look (kept as-is for the "FreshMart"/custom-store use case); the other
// four (crypto / paypal / cashapp / walletcard) are new, purpose-built
// layouts that mirror the real apps' transaction-success screens closely
// enough for demo/testing screenshots while staying clearly labeled as
// simulated. All five render inside the *same* outer ref element so
// html2canvas export / print / etc. keep working unchanged.
export default function ReceiptSkin(props: ReceiptSkinProps) {
  switch (props.preset.skin) {
    case 'crypto':
      return <CryptoSkin {...props} />
    case 'paypal':
      return <PaypalSkin {...props} />
    case 'cashapp':
      return <CashAppSkin {...props} />
    case 'walletcard':
      return <WalletCardSkin {...props} />
    default:
      return <ThermalSkin {...props} />
  }
}

function itemSplit(items: ReceiptItem[]) {
  const main = items.filter((it) => !isFeeItem(it.description))
  const fees = items.filter((it) => isFeeItem(it.description))
  const mainAmount = main.reduce((s, it) => s + it.price * it.quantity, 0)
  const feeAmount = fees.reduce((s, it) => s + it.price * it.quantity, 0)
  return { main, fees, mainAmount, feeAmount }
}

// ---------------------------------------------------------------------
// THERMAL — original dashed-border paper-receipt look, used for the
// generic/custom store platform + as the structural baseline.
// ---------------------------------------------------------------------
function ThermalSkin({
  preset, storeName, orderId, dateTime, items, taxRate, formatCurrency, formatDate, totals, barcodeRef, qrRef
}: ReceiptSkinProps) {
  const isDarkBadge = preset.badgeDark
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <span className="platform-badge" style={{ background: preset.color, color: isDarkBadge ? '#1a1a1a' : 'white' }}>
          {preset.badge}
        </span>
      </div>
      <h2>{storeName}</h2>
      <p className="meta">{formatDate(new Date(dateTime))}</p>
      <p className="meta">Order #{orderId}</p>
      <hr />
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="qty">Qty</th>
            <th className="price">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>{it.description}</td>
              <td className="qty">{it.quantity}</td>
              <td className="price">{formatCurrency(it.price * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div className="totals">
        <p>
          Subtotal: <strong>{formatCurrency(totals.subtotal)}</strong>
        </p>
        <p>
          Tax ({taxRate}%): <strong>{formatCurrency(totals.tax)}</strong>
        </p>
        <p className="total-line">
          Total: <strong>{formatCurrency(totals.total)}</strong>
        </p>
      </div>
      <hr />
      <div className="barcode-area">
        <svg ref={barcodeRef} />
      </div>
      <div className="qr-area" ref={qrRef} />
      <p className="footer-note">Thank you for using {storeName}! 🛍️</p>
      <p className="footer-note" style={{ fontSize: 8, color: '#888' }}>
        This is a simulated receipt.
      </p>
    </>
  )
}

// ---------------------------------------------------------------------
// CRYPTO — dark exchange-app transaction-success screen (Binance, Bybit,
// Coinbase, Crypto.com, Trust Wallet). Big amount + green check, then a
// key/value details list (Network, Wallet, From/To hashes, Txn ID, Date).
// ---------------------------------------------------------------------
function CryptoSkin({
  platformKey, preset, storeName, orderId, dateTime, items, formatCurrency, formatDate, totals
}: ReceiptSkinProps) {
  const from = truncateMiddle(pseudoHash(orderId + '-from'))
  const to = truncateMiddle(pseudoHash(orderId + '-to'))
  const txid = truncateMiddle(pseudoHash(orderId + '-tx'), 8, 8)
  return (
    <div className="rc" role="img" aria-label={`${storeName} transaction receipt`}>
      <div className="rc-brand">
        <span className="rc-brand-logo" style={{ background: preset.color, color: preset.badgeDark ? '#1a1a1a' : '#fff' }}>
          {preset.logoGlyph}
        </span>
        <span className="rc-brand-name">{storeName}</span>
      </div>
      <div className="rc-label">Amount</div>
      <div className="rc-amount">{formatCurrency(totals.total)}</div>
      <div className="rc-status">
        <span className="rc-check">✓</span> Completed
      </div>
      <div className="rc-disclaimer">
        Funds transferred out of {storeName}. Network delays may affect arrival time.
      </div>
      <div className="rc-rows">
        <div className="rc-row">
          <span className="rc-l">Network</span>
          <span className="rc-v">{networkForPlatform(platformKey)}</span>
        </div>
        <div className="rc-row">
          <span className="rc-l">Wallet</span>
          <span className="rc-v">{walletForPlatform(platformKey)}</span>
        </div>
        <div className="rc-row">
          <span className="rc-l">From</span>
          <span className="rc-v rc-mono">{from}</span>
        </div>
        <div className="rc-row">
          <span className="rc-l">To</span>
          <span className="rc-v rc-mono">{to}</span>
        </div>
        {items.map((it, i) => (
          <div className={`rc-row ${isFeeItem(it.description) ? 'rc-row-fee' : ''}`} key={i}>
            <span className="rc-l">{it.description}</span>
            <span className="rc-v">{formatCurrency(it.price * it.quantity)}</span>
          </div>
        ))}
        <div className="rc-row">
          <span className="rc-l">Txn ID</span>
          <span className="rc-v rc-mono">{txid} 📋</span>
        </div>
        <div className="rc-row">
          <span className="rc-l">Date</span>
          <span className="rc-v">{formatDate(new Date(dateTime))}</span>
        </div>
        <div className="rc-row rc-row-total">
          <span className="rc-l">Total</span>
          <span className="rc-v">{formatCurrency(totals.total)}</span>
        </div>
      </div>
      <div className="rc-footer">
        Order #{orderId} · This is a simulated receipt for demo/testing purposes only.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// PAYPAL — white card, blue checkmark, "You sent a payment" hero text.
// ---------------------------------------------------------------------
function PaypalSkin({ preset, storeName, orderId, dateTime, items, formatCurrency, formatDate, totals }: ReceiptSkinProps) {
  const { fees, mainAmount, feeAmount } = itemSplit(items)
  return (
    <div className="rp" role="img" aria-label={`${storeName} PayPal receipt`}>
      <div className="rp-brand">
        Pay<span>Pal</span>
      </div>
      <div className="rp-check-wrap">
        <div className="rp-check">✓</div>
      </div>
      <div className="rp-title">You sent {formatCurrency(mainAmount)}</div>
      <div className="rp-sub">to {storeName}</div>
      <hr className="rp-hr" />
      <div className="rp-rows">
        <div className="rp-row">
          <span className="rp-l">Transaction ID</span>
          <span className="rp-v rp-mono">{orderId}</span>
        </div>
        <div className="rp-row">
          <span className="rp-l">Date</span>
          <span className="rp-v">{formatDate(new Date(dateTime))}</span>
        </div>
        <div className="rp-row">
          <span className="rp-l">Payment Method</span>
          <span className="rp-v">PayPal Balance</span>
        </div>
        {fees.length > 0 && (
          <div className="rp-row rp-row-fee">
            <span className="rp-l">PayPal Fee</span>
            <span className="rp-v">{formatCurrency(feeAmount)}</span>
          </div>
        )}
        <div className="rp-row">
          <span className="rp-l">Status</span>
          <span className="rp-v rp-status-pill">Completed</span>
        </div>
        <div className="rp-row rp-row-total">
          <span className="rp-l">Total</span>
          <span className="rp-v">{formatCurrency(totals.total)}</span>
        </div>
      </div>
      <div className="rp-footer">
        Thanks for using PayPal! · This is a simulated receipt for demo/testing purposes only.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// CASH APP — ultra-minimal white screen, huge green checkmark ring,
// giant amount, "Payment Sent" + cashtag line.
// ---------------------------------------------------------------------
function CashAppSkin({ storeName, orderId, dateTime, items, formatCurrency, formatDate, totals }: ReceiptSkinProps) {
  const { fees, mainAmount, feeAmount } = itemSplit(items)
  const cashtag = '$' + (storeName.replace(/[^a-zA-Z0-9]/g, '') || 'CashApp')
  const memo = items.find((it) => !isFeeItem(it.description))?.description || 'Payment'
  return (
    <div className="rca" role="img" aria-label={`${storeName} Cash App receipt`}>
      <div className="rca-check-wrap">
        <div className="rca-check">✓</div>
      </div>
      <div className="rca-amount">{formatCurrency(mainAmount)}</div>
      <div className="rca-status">Payment Sent</div>
      <div className="rca-to">to {cashtag}</div>
      <hr className="rca-dash" />
      <div className="rca-rows">
        <div className="rca-row">
          <span className="rca-l">For</span>
          <span className="rca-v">{memo}</span>
        </div>
        <div className="rca-row">
          <span className="rca-l">From</span>
          <span className="rca-v">Cash Balance</span>
        </div>
        {fees.length > 0 && (
          <div className="rca-row">
            <span className="rca-l">Instant Fee</span>
            <span className="rca-v">{formatCurrency(feeAmount)}</span>
          </div>
        )}
        <div className="rca-row">
          <span className="rca-l">Date</span>
          <span className="rca-v">{formatDate(new Date(dateTime))}</span>
        </div>
        <div className="rca-row">
          <span className="rca-l">Transaction ID</span>
          <span className="rca-v rca-mono">{orderId}</span>
        </div>
        <div className="rca-row rca-row-total">
          <span className="rca-l">Total Debited</span>
          <span className="rca-v">{formatCurrency(totals.total)}</span>
        </div>
      </div>
      <div className="rca-footer">This is a simulated receipt for demo/testing purposes only.</div>
    </div>
  )
}

// ---------------------------------------------------------------------
// WALLET CARD — used for OPay / Kuda / Zelle / Venmo / Wise: a compact
// branded card with a colored round logo, big debit amount, and a
// key/value details list, echoing the app's own existing OPay-wallet
// receipt-modal style (`.ow-receipt-*`) but themed per-platform.
// ---------------------------------------------------------------------
function WalletCardSkin({
  platformKey, preset, storeName, orderId, dateTime, items, formatCurrency, formatDate, totals
}: ReceiptSkinProps) {
  const { fees, mainAmount, feeAmount } = itemSplit(items)
  return (
    <div className="wc" role="img" aria-label={`${storeName} receipt`} style={{ ['--wc-color' as any]: preset.color }}>
      <div className="wc-icon" style={{ background: preset.color }}>
        {preset.logoGlyph}
      </div>
      <div className="wc-amount">-{formatCurrency(mainAmount)}</div>
      <div className="wc-status">
        <span className="wc-dot" /> Completed
      </div>
      <div className="wc-rows">
        <div className="wc-row">
          <span className="wc-l">Recipient</span>
          <span className="wc-v">{storeName}</span>
        </div>
        <div className="wc-row">
          <span className="wc-l">Payment Method</span>
          <span className="wc-v">{paymentMethodForPlatform(platformKey)}</span>
        </div>
        {fees.length > 0 && (
          <div className="wc-row wc-row-fee">
            <span className="wc-l">Fee</span>
            <span className="wc-v">{formatCurrency(feeAmount)}</span>
          </div>
        )}
        <div className="wc-row">
          <span className="wc-l">Reference</span>
          <span className="wc-v wc-mono">{orderId}</span>
        </div>
        <div className="wc-row">
          <span className="wc-l">Date</span>
          <span className="wc-v">{formatDate(new Date(dateTime))}</span>
        </div>
        <div className="wc-row wc-row-total">
          <span className="wc-l">Total Debited</span>
          <span className="wc-v">{formatCurrency(totals.total)}</span>
        </div>
      </div>
      <div className="wc-footer">This is a simulated receipt for demo/testing purposes only.</div>
    </div>
  )
}
