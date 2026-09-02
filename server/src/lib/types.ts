// Ported from src/lib/types.ts (Cloudflare Workers version).
// Env vars replace Hono `Bindings`; DB is a better-sqlite3 instance (see db/index.ts).
// Request augmentation (userId/userRole) replaces Hono `AppVariables` — see auth-middleware.ts.

export interface ReceiptItem {
  description: string
  quantity: number
  price: number
}

export interface UserRow {
  id: string
  username: string
  email: string
  password_hash: string
  points: number
  country: string
  role: string
  is_verified: number
  referral_code: string | null
  referred_by: string | null
  receipts_generated: number
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface ReceiptRow {
  id: string
  user_id: string
  store_name: string
  platform: string
  order_id: string
  items: string
  tax_rate: number
  currency: string
  subtotal: number
  tax: number
  total: number
  short_url: string | null
  recipient_email: string | null
  metadata: string | null
  created_at: string
  updated_at: string
}

export interface OpayReceiptRow {
  id: string
  user_id: string
  sender_name: string
  sender_phone: string
  recipient_name: string
  recipient_phone: string
  amount: number
  reference: string
  transaction_date: string
  transaction_time: string
  note: string | null
  status: string
  template: string
  points_charged: number
  created_at: string
  updated_at: string
}

export interface OpayDemoWalletRow {
  id: string
  user_id: string
  balance: number
  currency: string
  created_at: string
  updated_at: string
}

export interface OpayDemoTransactionRow {
  id: string
  user_id: string
  type: string
  category: string
  amount: number
  counterparty_name: string | null
  counterparty_phone: string | null
  bank_name: string | null
  account_number: string | null
  note: string | null
  status: string
  balance_after: number
  points_charged: number
  reference: string
  created_at: string
}

export interface PointsTransactionRow {
  id: string
  user_id: string
  type: string
  amount: number
  balance: number
  description: string
  action: string | null
  receipt_id: string | null
  payment_method: string | null
  payment_id: string | null
  created_at: string
}

export interface MarketplaceListingRow {
  id: string
  seller_id: string
  title: string
  description: string
  category: string
  price_points: number
  preview_image_url: string | null
  file_key: string | null
  file_name: string | null
  file_size: number | null
  status: string
  rejection_reason: string | null
  sales_count: number
  created_at: string
  updated_at: string
}

export interface MarketplacePurchaseRow {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  price_points: number
  seller_earned_points: number
  platform_fee_points: number
  created_at: string
}

export interface ActivityRow {
  id: string
  user_id: string
  type: string
  title: string
  description: string
  icon: string
  color: string
  metadata: string | null
  created_at: string
}

export const MARKETPLACE_CATEGORIES = ['business', 'portfolio', 'ecommerce', 'landing', 'saas', 'blog', 'other'] as const
export const MARKETPLACE_PLATFORM_FEE_PCT = 10

export const PLATFORMS = [
  'generic', 'binance', 'bybit', 'coinbase', 'paypal', 'cashapp', 'crypto',
  'opay', 'kuda', 'wise', 'venmo', 'trustwallet', 'zelle'
] as const

export const POINTS_COSTS: Record<string, number> = {
  download: 5,
  print: 3,
  email: 10,
  link: 2,
  ai: 3,
  support: 15,
  ai_content: 5,
  ai_social: 3,
  ai_product: 4,
  ai_email: 5,
  ai_rewrite: 3,
  ai_chat: 2,
  ai_longform: 10,
  ai_code: 6,
  opay_receipt: 8,
  opay_wallet_send: 6,
  opay_bank_transfer: 10
}
