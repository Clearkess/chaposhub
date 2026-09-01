// Ported from src/lib/crypto.ts (Cloudflare Workers version).
// Node.js 19+ exposes the same Web Crypto API globally (globalThis.crypto),
// so this ports almost verbatim — same PBKDF2 params, same stored-hash format,
// meaning password hashes created by the old Cloudflare app remain valid here.

const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH = 32 // bytes
const SALT_LENGTH = 16 // bytes

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8
  )
  const hashHex = bufToHex(derivedBits)
  const saltHex = bufToHex(salt)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = parseInt(parts[1], 10)
  const salt = hexToBuf(parts[2])
  const expectedHashHex = parts[3]

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
    KEY_LENGTH * 8
  )
  const computedHashHex = bufToHex(derivedBits)

  if (computedHashHex.length !== expectedHashHex.length) return false
  let diff = 0
  for (let i = 0; i < computedHashHex.length; i++) {
    diff |= computedHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i)
  }
  return diff === 0
}

export function generateId(prefix?: string): string {
  const id = crypto.randomUUID()
  return prefix ? `${prefix}_${id}` : id
}

export function generateShortId(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length]
  return out
}

export function generateReferralCode(username: string): string {
  return `${username}_${generateShortId(6).toUpperCase()}`
}
