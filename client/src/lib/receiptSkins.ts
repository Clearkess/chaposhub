// Small helpers used by <ReceiptSkin/> to make the pixel-styled per-platform
// receipt templates feel authentic without requiring new form fields —
// derives display-only details (network name, wallet/payment-method label,
// fee detection) purely from the platform key + item descriptions that
// already exist in the receipt builder's data model.

export function networkForPlatform(key: string): string {
  switch (key) {
    case 'binance':
      return 'BNB Smart Chain (BEP20)'
    case 'bybit':
      return 'Ethereum (ERC20)'
    case 'coinbase':
      return 'Ethereum'
    case 'crypto':
      return 'Cronos'
    case 'trustwallet':
      return 'BNB Smart Chain'
    default:
      return 'Mainnet'
  }
}

export function walletForPlatform(key: string): string {
  switch (key) {
    case 'binance':
      return 'Spot Wallet'
    case 'bybit':
      return 'Funding Account'
    case 'coinbase':
      return 'Coinbase Wallet'
    case 'crypto':
      return 'Crypto.com App'
    case 'trustwallet':
      return 'Trust Wallet'
    default:
      return 'Wallet'
  }
}

export function paymentMethodForPlatform(key: string): string {
  switch (key) {
    case 'opay':
      return 'OPay Wallet'
    case 'kuda':
      return 'Kuda Bank Account'
    case 'zelle':
      return 'Bank Account'
    case 'venmo':
      return 'Venmo Balance'
    case 'wise':
      return 'Wise Balance'
    default:
      return 'Balance'
  }
}

export function isFeeItem(description: string): boolean {
  return /fee/i.test(description)
}

// FNV-1a string hash (32-bit) — used as the core of pseudoHash below.
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

// Deterministic pseudo tx-hash / address so re-renders of the same draft
// don't flicker with a new random value — derived from the order ID.
// Hashes `seed + index` independently for every output character (via
// FNV-1a + Math.imul for correct 32-bit wraparound) so the result looks
// like real hex noise instead of a short repeating LCG cycle or an
// all-zero string (both of which plain `*`/simple-LCG approaches produced).
export function pseudoHash(seed: string, len = 34): string {
  const chars = '0123456789abcdef'
  let out = '0x'
  for (let i = 0; i < len; i++) {
    const h = fnv1a(seed + '#' + i)
    out += chars[h % chars.length]
  }
  return out
}

export function truncateMiddle(str: string, head = 6, tail = 6): string {
  if (str.length <= head + tail + 3) return str
  return str.slice(0, head) + '…' + str.slice(-tail)
}
