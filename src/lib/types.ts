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
  support: 15
}
