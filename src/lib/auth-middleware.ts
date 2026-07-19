import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { Bindings, AppVariables } from './types'

export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: AppVariables }>,
  next: Next
) {
  const authHeader = c.req.header('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required' }, 401)
  }
  const token = authHeader.slice(7)
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('userId', payload.userId as string)
    c.set('userRole', (payload.role as string) || 'user')
    await next()
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// Optional auth: attaches user if valid token present, doesn't reject otherwise
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Bindings; Variables: AppVariables }>,
  next: Next
) {
  const authHeader = c.req.header('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
      c.set('userId', payload.userId as string)
      c.set('userRole', (payload.role as string) || 'user')
    } catch {
      // ignore invalid token for optional auth
    }
  }
  await next()
}
