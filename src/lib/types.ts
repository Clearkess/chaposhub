export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  OPENAI_API_KEY?: string
  NOMASK_API_KEY?: string
  STRIPE_SECRET_KEY?: string
  RESEND_API_KEY?: string
  FROM_EMAIL?: string
  // Whop payment webhook integration
  WHOP_WEBHOOK_SECRET?: string   // secret, from Whop dashboard (ws_...)
  WHOP_STARTER_PLAN_ID?: string  // plain var, e.g. plan_DZtaB5bXDuHOm
  // Paystack: real bank list + account-name resolution for the OPay demo's
  // "Bank Transfer" tab (wallet balance / transfer itself remain simulated).
  PAYSTACK_SECRET_KEY?: string   // secret, from Paystack dashboard (sk_live_... / sk_test_...)
}

export type AppVariables = {
  userId: string
  userRole: string
}

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

export const PLATFORMS = [
  'generic', 'binance', 'bybit', 'coinbase', 'paypal', 'cashapp',
  'crypto', 'opay', 'kuda', 'wise', 'venmo', 'trustwallet', 'zelle'
] as const

export const POINTS_COSTS: Record<string, number> = {
  download: 5,
  print: 3,
  email: 10,
  link: 2,
  ai: 3,
  support: 15,
  // Chapo'sHub AI Hub tools (Step 7) - each consumes points before calling
  // the NoMask/Nemotron backend via POST /api/ai/generate.
  ai_content: 5,
  ai_social: 3,
  ai_product: 4,
  ai_email: 5,
  ai_rewrite: 3,
  ai_chat: 2,
  ai_longform: 10,
  ai_code: 6,
  // Dedicated OPay transaction receipt service (/services/opay)
  opay_receipt: 8,
  // OPay wallet-app demo (send money / transfer to bank) - each action costs
  // points on top of debiting the user's own private simulated wallet
  // balance (see opay_demo_wallets). Bank transfer costs slightly more to
  // reflect the extra real Paystack account-resolution step involved.
  opay_wallet_send: 6,
  opay_bank_transfer: 10
}
