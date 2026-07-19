// Password hashing using Web Crypto API (PBKDF2) - Workers-compatible replacement for bcrypt
const ITERATIONS = 100_000
const KEY_LEN = 32 // bytes
const SALT_LEN = 16 // bytes

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LEN * 8
  )
  return `pbkdf2$${ITERATIONS}$${toHex(salt.buffer as ArrayBuffer)}$${toHex(derivedBits)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterationsStr, saltHex, hashHex] = stored.split('$')
    if (scheme !== 'pbkdf2') return false
    const iterations = parseInt(iterationsStr, 10)
    const salt = fromHex(saltHex)
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      KEY_LEN * 8
    )
    const computedHex = toHex(derivedBits)
    // constant-time-ish compare
    if (computedHex.length !== hashHex.length) return false
    let diff = 0
    for (let i = 0; i < computedHex.length; i++) {
      diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

export function generateId(prefix = ''): string {
  const uuid = crypto.randomUUID()
  return prefix ? `${prefix}_${uuid}` : uuid
}

export function generateShortId(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let id = ''
  for (let i = 0; i < length; i++) id += chars[bytes[i] % chars.length]
  return id
}

export function generateReferralCode(username: string): string {
  return `${username}_${generateShortId(6).toUpperCase()}`
}
