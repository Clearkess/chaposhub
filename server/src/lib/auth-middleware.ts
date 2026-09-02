// Ported from src/lib/auth-middleware.ts (Hono/hono-jwt version) to Express
// middleware using the `jsonwebtoken` package. JWT payload shape kept
// identical ({ userId, role, iat, exp }) for parity with the original app.

import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthedRequest extends Request {
  userId?: string
  userRole?: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string }
    req.userId = payload.userId
    req.userRole = payload.role || 'user'
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Optional auth: attaches user if valid token present, doesn't reject otherwise
export function optionalAuthMiddleware(req: AuthedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.header('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string }
      req.userId = payload.userId
      req.userRole = payload.role || 'user'
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next()
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' })
}

export { JWT_SECRET }
