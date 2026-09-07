// Shared config ported from public/static/js/app.js CONFIG / platforms /
// allServices constants.

export const CONFIG = {
  points: {
    download: 5, print: 3, email: 10, link: 2, ai: 3, support: 15,
    ai_content: 5, ai_social: 3, ai_product: 4, ai_email: 5,
    ai_rewrite: 3, ai_chat: 2, ai_longform: 10, ai_code: 6,
    opay_wallet_send: 6, opay_bank_transfer: 10
  } as Record<string, number>,
  app: { name: "Chapo'sHub", version: '2.0.0' }
}

export interface ReceiptItem {
  description: string
  quantity: number
  price: number
}

// `skin` selects which pixel-styled receipt template renders this platform's
// preview/export (see ReceiptSkin.tsx). `badgeDark` = true means the badge
// pill uses dark text (for light/bright brand colors like Binance gold or
// Bybit orange). `logoGlyph` is the 1-2 char text mark shown in the round
// brand icon (kept text-based, matching the existing service-icon
// convention elsewhere in the app — no third-party logo image assets).
export type ReceiptSkin = 'thermal' | 'crypto' | 'paypal' | 'cashapp' | 'walletcard'

export interface PlatformPreset {
  name: string
  color: string
  badge: string
  taxRate: number
  currency: string
  items: ReceiptItem[]
  skin: ReceiptSkin
  badgeDark?: boolean
  logoGlyph?: string
  darkBg?: string // for the `crypto` skin: the app's real dark-mode surface color
}

export const platforms: Record<string, PlatformPreset> = {
  generic: {
    name: 'FreshMart', color: '#2c2c2c', badge: 'RECEIPT', taxRate: 8.25, currency: '$',
    skin: 'thermal',
    items: [
      { description: 'Organic Avocado', quantity: 2, price: 2.49 },
      { description: 'Whole Wheat Bread', quantity: 1, price: 3.79 },
      { description: 'Almond Milk 1L', quantity: 1, price: 4.29 }
    ]
  },
  binance: {
    name: 'Binance', color: '#f0b90b', badge: 'BINANCE', taxRate: 0, currency: '$',
    skin: 'crypto', badgeDark: true, logoGlyph: 'B', darkBg: '#1e2026',
    items: [
      { description: 'BTC Purchase', quantity: 0.0025, price: 28450 },
      { description: 'Network Fee', quantity: 1, price: 2.5 }
    ]
  },
  bybit: {
    name: 'Bybit', color: '#f7a600', badge: 'BYBIT', taxRate: 0, currency: '$',
    skin: 'crypto', badgeDark: true, logoGlyph: 'B', darkBg: '#101014',
    items: [
      { description: 'ETH/USDT Perp', quantity: 0.5, price: 1850 },
      { description: 'Trading Fee', quantity: 1, price: 1.85 }
    ]
  },
  coinbase: {
    name: 'Coinbase', color: '#0052ff', badge: 'COINBASE', taxRate: 0, currency: '$',
    skin: 'crypto', logoGlyph: 'C', darkBg: '#0a0b0d',
    items: [
      { description: 'ETH Purchase', quantity: 0.1, price: 1850 },
      { description: 'Coinbase Fee', quantity: 1, price: 18.5 }
    ]
  },
  paypal: {
    name: 'PayPal', color: '#003087', badge: 'PAYPAL', taxRate: 0, currency: '$',
    skin: 'paypal', logoGlyph: 'P',
    items: [
      { description: 'Payment Received', quantity: 1, price: 150 },
      { description: 'PayPal Fee', quantity: 1, price: -4.65 }
    ]
  },
  cashapp: {
    name: 'Cash App', color: '#00d632', badge: 'CASHAPP', taxRate: 0, currency: '$',
    skin: 'cashapp', logoGlyph: '$',
    items: [
      { description: 'Cash Transfer', quantity: 1, price: 75 },
      { description: 'Instant Fee', quantity: 1, price: -1.5 }
    ]
  },
  crypto: {
    name: 'Crypto.com', color: '#002d72', badge: 'CRYPTO', taxRate: 0, currency: '$',
    skin: 'crypto', logoGlyph: 'C', darkBg: '#0b1339',
    items: [
      { description: 'CRO Stake', quantity: 1000, price: 0.065 },
      { description: 'Card Fee', quantity: 1, price: 0 }
    ]
  },
  opay: {
    name: 'OPay', color: '#1dc677', badge: 'OPAY', taxRate: 0, currency: '₦',
    skin: 'walletcard', logoGlyph: 'O',
    items: [
      { description: 'Airtime Purchase', quantity: 1, price: 1000 },
      { description: 'Cashback', quantity: 1, price: -50 }
    ]
  },
  kuda: {
    name: 'Kuda', color: '#40196d', badge: 'KUDA', taxRate: 0, currency: '₦',
    skin: 'walletcard', logoGlyph: 'K',
    items: [
      { description: 'Transfer Sent', quantity: 1, price: 5000 },
      { description: 'Transfer Fee', quantity: 1, price: 10 }
    ]
  },
  zelle: {
    name: 'Zelle', color: '#6d1ed4', badge: 'ZELLE', taxRate: 0, currency: '$',
    skin: 'walletcard', logoGlyph: 'Z',
    items: [{ description: 'Payment Sent', quantity: 1, price: 200 }]
  },
  venmo: {
    name: 'Venmo', color: '#008CFF', badge: 'VENMO', taxRate: 0, currency: '$',
    skin: 'walletcard', logoGlyph: 'V',
    items: [{ description: 'Payment', quantity: 1, price: 45 }]
  },
  trustwallet: {
    name: 'Trust Wallet', color: '#3375BB', badge: 'TRUST', taxRate: 0, currency: '$',
    skin: 'crypto', logoGlyph: 'T', darkBg: '#0b1626',
    items: [{ description: 'BNB Purchase', quantity: 1, price: 300 }]
  },
  wise: {
    name: 'Wise', color: '#00b9ff', badge: 'WISE', taxRate: 0, currency: '$',
    skin: 'walletcard', logoGlyph: 'W',
    items: [{ description: 'International Transfer', quantity: 1, price: 500 }]
  }
}

export interface ServiceDef {
  key: string
  name: string
  icon: string
  color?: string
  new?: boolean
  dedicated?: boolean
}

// `icon` is either a FontAwesome class string (e.g. "fa-solid fa-receipt",
// rendered as <i className={icon}>) or a plain 1-char brand-letter glyph
// (e.g. 'P', 'K', '$' — kept as literal text marks, matching the existing
// service-icon convention of text-based brand marks with no logo images).
export const allServices: ServiceDef[] = [
  { key: 'crypto', name: 'Crypto Receipts', icon: 'fa-solid fa-file-invoice-dollar', new: true },
  { key: 'paypal', name: 'Paypal', icon: 'P', color: '#003087' },
  { key: 'kuda', name: 'Kuda', icon: 'K', color: '#40196d' },
  { key: 'cashapp', name: 'Cash App', icon: '$', color: '#00d632' },
  { key: 'zelle', name: 'Zelle', icon: 'Z', color: '#6d1ed4', new: true },
  { key: 'venmo', name: 'Venmo', icon: 'V', color: '#008CFF', new: true },
  { key: 'trustwallet', name: 'Trust Wallet', icon: 'T', color: '#3375BB', new: true },
  { key: 'wise', name: 'Wise', icon: 'W', color: '#00b9ff', new: true },
  { key: 'opay', name: 'OPay', icon: 'O', color: '#1dc677', dedicated: true },
  {
    key: 'support', name: 'Support Sites', icon: 'fa-solid fa-headset',
    color: 'linear-gradient(135deg,#3b82f6,#60a5fa)', dedicated: true
  },
  { key: 'binance', name: 'Binance', icon: 'B', color: '#f0b90b' },
  {
    key: 'marketplace', name: 'Scripts Marketplace', icon: 'fa-solid fa-cart-shopping',
    color: 'linear-gradient(135deg,#22c55e,#4ade80)', dedicated: true, new: true
  }
]

// True when a ServiceDef/AITool `icon` value is a FontAwesome class string
// (vs. a plain brand-letter glyph like 'P' or '$').
export function isFaIcon(icon: string): boolean {
  return icon.startsWith('fa-')
}

export function escHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago'
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago'
  return Math.floor(diffSec / 86400) + 'd ago'
}

export interface AIToolExtra {
  id: string
  type: 'select'
  options: string[]
}

export interface AITool {
  icon: string
  label: string
  prompt: string
  placeholder: string
  maxLen: number
  costKey: string
  btnLabel: string
  extras: AIToolExtra[]
}

// `icon` here is always a FontAwesome class string (rendered as
// <i className={icon}>). `btnLabel` intentionally has no leading icon text —
// the sparkle/generate icon is rendered separately in AIHub.tsx's button JSX.
export const AI_TOOLS: Record<string, AITool> = {
  reply: {
    icon: 'fa-solid fa-comments', label: 'Customer Reply', prompt: 'Paste a customer message to get a smart reply',
    placeholder: "e.g. 'Hey, did you send me that payment? I haven't received it yet.'",
    maxLen: 500, costKey: 'ai', btnLabel: 'Generate Reply',
    extras: [{ id: 'aiTone', type: 'select', options: ['professional', 'friendly', 'casual', 'urgent', 'apologetic'] }]
  },
  content: {
    icon: 'fa-solid fa-pen-nib', label: 'Content Generator', prompt: 'Describe the topic or brief for your content',
    placeholder: "e.g. 'Write a short intro paragraph about the benefits of online shopping.'",
    maxLen: 500, costKey: 'ai_content', btnLabel: 'Generate Content',
    extras: [{ id: 'aiTone2', type: 'select', options: ['professional', 'friendly', 'casual', 'persuasive', 'informative'] }]
  },
  social: {
    icon: 'fa-solid fa-mobile-screen', label: 'Social Captions', prompt: 'What is the post about?',
    placeholder: "e.g. 'New summer collection just dropped, 20% off this weekend.'",
    maxLen: 300, costKey: 'ai_social', btnLabel: 'Generate Caption',
    extras: [{ id: 'aiPlatform', type: 'select', options: ['Instagram', 'Twitter/X', 'TikTok', 'Facebook', 'LinkedIn'] }]
  },
  product: {
    icon: 'fa-solid fa-bag-shopping', label: 'Product Descriptions', prompt: 'Describe the product (name, features, materials, etc.)',
    placeholder: "e.g. 'Handmade leather wallet, slim design, RFID-blocking, 6 card slots.'",
    maxLen: 400, costKey: 'ai_product', btnLabel: 'Generate Description',
    extras: []
  },
  email_gen: {
    icon: 'fa-solid fa-envelope', label: 'Email Generator', prompt: 'What should the email say?',
    placeholder: "e.g. 'Follow up with a customer whose order shipped late, apologize and offer 10% off.'",
    maxLen: 500, costKey: 'ai_email', btnLabel: 'Generate Email',
    extras: [{ id: 'aiTone3', type: 'select', options: ['professional', 'friendly', 'apologetic', 'formal'] }]
  },
  rewrite: {
    icon: 'fa-solid fa-arrows-rotate', label: 'Rewrite / Improve', prompt: 'Paste the text you want rewritten or improved',
    placeholder: 'Paste any text here and AI will improve clarity, grammar, and flow.',
    maxLen: 2000, costKey: 'ai_rewrite', btnLabel: 'Rewrite Text',
    extras: [{ id: 'aiStyle', type: 'select', options: ['clear and polished', 'more concise', 'more formal', 'more casual', 'more persuasive'] }]
  },
  chat: {
    icon: 'fa-solid fa-brain', label: 'General Chat', prompt: 'Ask me anything',
    placeholder: "e.g. 'What are some good ideas for a small business loyalty program?'",
    maxLen: 1000, costKey: 'ai_chat', btnLabel: 'Ask AI',
    extras: []
  },
  longform: {
    icon: 'fa-solid fa-file-lines', label: 'Long-Form Content', prompt: 'Describe the article or blog post topic',
    placeholder: "e.g. 'Write a blog post about how small businesses can improve customer retention.'",
    maxLen: 500, costKey: 'ai_longform', btnLabel: 'Generate Article',
    extras: [{ id: 'aiTone4', type: 'select', options: ['professional', 'friendly', 'informative', 'persuasive'] }]
  },
  code: {
    icon: 'fa-solid fa-laptop-code', label: 'Coding Assistant', prompt: 'Describe what you need help coding',
    placeholder: "e.g. 'Write a JavaScript function that validates an email address.'",
    maxLen: 2000, costKey: 'ai_code', btnLabel: 'Generate Code',
    extras: [{ id: 'aiLanguage', type: 'select', options: ['JavaScript', 'Python', 'TypeScript', 'HTML/CSS', 'SQL', 'Other'] }]
  }
}
