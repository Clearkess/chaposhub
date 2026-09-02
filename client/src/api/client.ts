// Chapo'sHub API client — ported from public/static/js/api-client.js to
// TypeScript. Talks to the Express/better-sqlite3 backend at /api/* (proxied
// by Vite in dev, same-origin in production).
const TOKEN_KEY = 'chapo_token'

export class APIError extends Error {
  status: number
  details?: string | null
  constructor(message: string, status: number, details?: string | null) {
    super(message)
    this.status = status
    this.details = details
  }
}

interface RequestOptions {
  method?: string
  body?: any
  headers?: Record<string, string>
}

class APIService {
  baseUrl: string
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api'
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  }

  setToken(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  async request(path: string, options: RequestOptions = {}): Promise<any> {
    const headers: Record<string, string> = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {}
    )
    const token = this.getToken()
    if (token) headers['Authorization'] = 'Bearer ' + token

    let res: Response
    try {
      res = await fetch(this.baseUrl + path, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      })
    } catch {
      throw new APIError('Network error - please check your connection', 0, null)
    }

    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.details)) || `Request failed (${res.status})`
      if (res.status === 401) this.setToken(null)
      throw new APIError(msg, res.status, data && data.details)
    }
    return data
  }

  // --- Auth ---
  async register(username: string, email: string, password: string) {
    const data = await this.request('/auth/register', { method: 'POST', body: { username, email, password } })
    if (data.token) this.setToken(data.token)
    return data
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', { method: 'POST', body: { email, password } })
    if (data.token) this.setToken(data.token)
    return data
  }

  logout() {
    this.setToken(null)
  }

  async getMe() {
    const data = await this.request('/auth/me')
    return data.user
  }

  // --- Receipts ---
  async createReceipt(payload: any) {
    return this.request('/receipts', { method: 'POST', body: payload })
  }
  async getReceipts() {
    return this.request('/receipts')
  }
  async deleteReceipt(id: string) {
    return this.request('/receipts/' + id, { method: 'DELETE' })
  }

  // --- Points ---
  async getPointsBalance() {
    return this.request('/points/balance')
  }
  async deductPoints(amount: number, action: string, description?: string) {
    return this.request('/points/deduct', { method: 'POST', body: { amount, action, description } })
  }
  async purchasePoints(packageId: string) {
    return this.request('/points/purchase', { method: 'POST', body: { packageId } })
  }

  // --- AI ---
  async generateAIReply(message: string, tone?: string) {
    return this.request('/ai/reply', { method: 'POST', body: { message, tone } })
  }
  async generateAIContent(tool: string, input: string, opts?: Record<string, any>) {
    return this.request('/ai/generate', { method: 'POST', body: Object.assign({ tool, input }, opts || {}) })
  }

  // --- OPay dedicated receipt service ---
  async generateOpayReceipt(payload: any) {
    return this.request('/services/opay/generate', { method: 'POST', body: payload })
  }
  async getOpayHistory() {
    return this.request('/services/opay/history')
  }
  async getOpayReceipt(id: string) {
    return this.request('/services/opay/receipt/' + id)
  }

  // --- Real bank data (Paystack passthrough, for OPay Bank Transfer tab) ---
  async getBanks() {
    return this.request('/banks')
  }
  async resolveBankAccount(payload: any) {
    return this.request('/banks/resolve', { method: 'POST', body: payload })
  }

  // --- OPay wallet-app demo ---
  async getOpayWallet() {
    return this.request('/services/opay/wallet')
  }
  async getOpayTransactions(limit?: number) {
    return this.request('/services/opay/transactions' + (limit ? '?limit=' + limit : ''))
  }
  async opaySendMoney(payload: any) {
    return this.request('/services/opay/send', { method: 'POST', body: payload })
  }
  async opayBankTransfer(payload: any) {
    return this.request('/services/opay/transfer', { method: 'POST', body: payload })
  }

  // --- Email ---
  async sendReceiptEmail(to: string, subject: string, receiptData: any) {
    return this.request('/email/send-receipt', { method: 'POST', body: { to, subject, receiptData } })
  }

  // --- Users ---
  async getProfile() {
    return this.request('/users/profile')
  }
  async updateProfile(fields: any) {
    return this.request('/users/profile', { method: 'PATCH', body: fields })
  }
  async getHistory() {
    return this.request('/users/history')
  }

  // --- Analytics ---
  async getDashboard() {
    return this.request('/analytics/dashboard')
  }

  // --- Scripts Marketplace ---
  async getMarketplaceListings(opts?: { category?: string; search?: string }) {
    const q = new URLSearchParams()
    if (opts?.category) q.set('category', opts.category)
    if (opts?.search) q.set('search', opts.search)
    const qs = q.toString()
    return this.request('/marketplace/listings' + (qs ? '?' + qs : ''))
  }
  async getMarketplaceListing(id: string) {
    return this.request('/marketplace/listings/' + id)
  }
  async getMyMarketplaceListings() {
    return this.request('/marketplace/my-listings')
  }
  async createMarketplaceListing(payload: any) {
    return this.request('/marketplace/listings', { method: 'POST', body: payload })
  }
  async updateMarketplaceListing(id: string, payload: any) {
    return this.request('/marketplace/listings/' + id, { method: 'PATCH', body: payload })
  }
  async deleteMarketplaceListing(id: string) {
    return this.request('/marketplace/listings/' + id, { method: 'DELETE' })
  }
  async uploadMarketplaceFile(id: string, file: File) {
    const token = this.getToken()
    const headers: Record<string, string> = { 'x-file-name': file.name || 'template.zip' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    let res: Response
    try {
      res = await fetch(this.baseUrl + '/marketplace/listings/' + id + '/upload', {
        method: 'POST',
        headers,
        body: file
      })
    } catch {
      throw new APIError('Network error - please check your connection', 0, null)
    }
    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    if (!res.ok) throw new APIError((data && data.error) || 'Upload failed', res.status, data && data.details)
    return data
  }
  async purchaseMarketplaceListing(id: string) {
    return this.request('/marketplace/listings/' + id + '/purchase', { method: 'POST' })
  }
  async getMarketplacePurchases() {
    return this.request('/marketplace/purchases')
  }
  async getMarketplaceSales() {
    return this.request('/marketplace/sales')
  }
  async downloadMarketplaceFile(purchaseId: string): Promise<{ blob: Blob; filename: string }> {
    const token = this.getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = 'Bearer ' + token
    const res = await fetch(this.baseUrl + '/marketplace/download/' + purchaseId, { headers })
    if (!res.ok) {
      let data: any = null
      try {
        data = await res.json()
      } catch {
        /* ignore */
      }
      throw new APIError((data && data.error) || 'Download failed', res.status, null)
    }
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="([^"]+)"/)
    const filename = match ? match[1] : 'template.zip'
    const blob = await res.blob()
    return { blob, filename }
  }
  async getMarketplaceAdminPending() {
    return this.request('/marketplace/admin/pending')
  }
  async approveMarketplaceListing(id: string) {
    return this.request('/marketplace/admin/listings/' + id + '/approve', { method: 'POST' })
  }
  async rejectMarketplaceListing(id: string, reason: string) {
    return this.request('/marketplace/admin/listings/' + id + '/reject', { method: 'POST', body: { reason } })
  }
}

export const api = new APIService('/api')
