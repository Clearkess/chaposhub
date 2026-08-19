// Chapo'sHub API client - talks to the Hono/D1 backend at /api/*
(function () {
  const TOKEN_KEY = 'chapo_token';

  class APIError extends Error {
    constructor(message, status, details) {
      super(message);
      this.status = status;
      this.details = details;
    }
  }

  class APIService {
    constructor(baseUrl) {
      this.baseUrl = baseUrl || '/api';
    }

    getToken() {
      try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
    }

    setToken(token) {
      try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      } catch (e) {}
    }

    isAuthenticated() {
      return !!this.getToken();
    }

    async request(path, options = {}) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
      const token = this.getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;

      let res;
      try {
        res = await fetch(this.baseUrl + path, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined
        });
      } catch (networkErr) {
        throw new APIError('Network error - please check your connection', 0, null);
      }

      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }

      if (!res.ok) {
        const msg = (data && (data.error || data.details)) || ('Request failed (' + res.status + ')');
        if (res.status === 401) {
          this.setToken(null);
        }
        throw new APIError(msg, res.status, data && data.details);
      }
      return data;
    }

    // --- Auth ---
    async register(username, email, password) {
      const data = await this.request('/auth/register', { method: 'POST', body: { username, email, password } });
      if (data.token) this.setToken(data.token);
      return data;
    }

    async login(email, password) {
      const data = await this.request('/auth/login', { method: 'POST', body: { email, password } });
      if (data.token) this.setToken(data.token);
      return data;
    }

    logout() {
      this.setToken(null);
    }

    async getMe() {
      const data = await this.request('/auth/me');
      return data.user;
    }

    // --- Receipts ---
    async createReceipt(payload) {
      return this.request('/receipts', { method: 'POST', body: payload });
    }

    async getReceipts() {
      return this.request('/receipts');
    }

    async deleteReceipt(id) {
      return this.request('/receipts/' + id, { method: 'DELETE' });
    }

    // --- Points ---
    async getPointsBalance() {
      return this.request('/points/balance');
    }

    async deductPoints(amount, action, description) {
      return this.request('/points/deduct', { method: 'POST', body: { amount, action, description } });
    }

    async purchasePoints(packageId) {
      return this.request('/points/purchase', { method: 'POST', body: { packageId } });
    }

    // --- AI ---
    async generateAIReply(message, tone) {
      return this.request('/ai/reply', { method: 'POST', body: { message, tone } });
    }

    // Generalized Chapo'sHub AI Hub endpoint (content, social, product,
    // email, rewrite, chat, longform, code). opts may include tone,
    // platform, style, language depending on the tool.
    async generateAIContent(tool, input, opts) {
      return this.request('/ai/generate', { method: 'POST', body: Object.assign({ tool, input }, opts || {}) });
    }

    // --- OPay dedicated receipt service ---
    async generateOpayReceipt(payload) {
      return this.request('/services/opay/generate', { method: 'POST', body: payload });
    }

    async getOpayHistory() {
      return this.request('/services/opay/history');
    }

    async getOpayReceipt(id) {
      return this.request('/services/opay/receipt/' + id);
    }

    // --- Real bank data (Paystack passthrough, for the OPay Bank Transfer tab) ---
    async getBanks() {
      return this.request('/banks');
    }
    async resolveBankAccount(payload) {
      return this.request('/banks/resolve', { method: 'POST', body: payload });
    }

    // --- OPay wallet-app demo (private per-user simulated wallet) ---
    async getOpayWallet() {
      return this.request('/services/opay/wallet');
    }
    async getOpayTransactions(limit) {
      return this.request('/services/opay/transactions' + (limit ? '?limit=' + limit : ''));
    }
    async opaySendMoney(payload) {
      return this.request('/services/opay/send', { method: 'POST', body: payload });
    }
    async opayBankTransfer(payload) {
      return this.request('/services/opay/transfer', { method: 'POST', body: payload });
    }

    // --- Email ---
    async sendReceiptEmail(to, subject, receiptData) {
      return this.request('/email/send-receipt', { method: 'POST', body: { to, subject, receiptData } });
    }

    // --- Users ---
    async getProfile() {
      return this.request('/users/profile');
    }

    async updateProfile(fields) {
      return this.request('/users/profile', { method: 'PATCH', body: fields });
    }

    async getHistory() {
      return this.request('/users/history');
    }

    // --- Analytics ---
    async getDashboard() {
      return this.request('/analytics/dashboard');
    }

    // --- Scripts Marketplace ---
    async getMarketplaceListings(opts) {
      const q = new URLSearchParams();
      if (opts && opts.category) q.set('category', opts.category);
      if (opts && opts.search) q.set('search', opts.search);
      const qs = q.toString();
      return this.request('/marketplace/listings' + (qs ? '?' + qs : ''));
    }
    async getMarketplaceListing(id) {
      return this.request('/marketplace/listings/' + id);
    }
    async getMyMarketplaceListings() {
      return this.request('/marketplace/my-listings');
    }
    async createMarketplaceListing(payload) {
      return this.request('/marketplace/listings', { method: 'POST', body: payload });
    }
    async updateMarketplaceListing(id, payload) {
      return this.request('/marketplace/listings/' + id, { method: 'PATCH', body: payload });
    }
    async deleteMarketplaceListing(id) {
      return this.request('/marketplace/listings/' + id, { method: 'DELETE' });
    }
    // Raw binary upload (not JSON) - bypasses the JSON-stringify request() helper.
    async uploadMarketplaceFile(id, file) {
      const token = this.getToken();
      const headers = { 'x-file-name': file.name || 'template.zip' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      let res;
      try {
        res = await fetch(this.baseUrl + '/marketplace/listings/' + id + '/upload', {
          method: 'POST', headers, body: file
        });
      } catch (e) {
        throw new APIError('Network error - please check your connection', 0, null);
      }
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok) throw new APIError((data && data.error) || 'Upload failed', res.status, data && data.details);
      return data;
    }
    async purchaseMarketplaceListing(id) {
      return this.request('/marketplace/listings/' + id + '/purchase', { method: 'POST' });
    }
    async getMarketplacePurchases() {
      return this.request('/marketplace/purchases');
    }
    async getMarketplaceSales() {
      return this.request('/marketplace/sales');
    }
    // Downloads a purchased file as a Blob (auth header can't be set on a
    // plain <a href> download, so we fetch it as a blob and trigger a
    // client-side save via a temporary object URL).
    async downloadMarketplaceFile(purchaseId) {
      const token = this.getToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(this.baseUrl + '/marketplace/download/' + purchaseId, { headers });
      if (!res.ok) {
        let data = null;
        try { data = await res.json(); } catch (e) {}
        throw new APIError((data && data.error) || 'Download failed', res.status, null);
      }
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : 'template.zip';
      const blob = await res.blob();
      return { blob, filename };
    }
    async getMarketplaceAdminPending() {
      return this.request('/marketplace/admin/pending');
    }
    async approveMarketplaceListing(id) {
      return this.request('/marketplace/admin/listings/' + id + '/approve', { method: 'POST' });
    }
    async rejectMarketplaceListing(id, reason) {
      return this.request('/marketplace/admin/listings/' + id + '/reject', { method: 'POST', body: { reason } });
    }
  }

  window.APIError = APIError;
  window.api = new APIService('/api');
})();
