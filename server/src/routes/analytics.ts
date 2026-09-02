// Ported from src/routes/analytics.ts (Hono/D1 version) to Express/better-sqlite3.
// better-sqlite3 is synchronous, so the Promise.all([...]) fan-out from the
// original is kept for structural parity but each query resolves instantly.
import { Router } from 'express'
import type { Response, NextFunction } from 'express'
import db from '../db/index.js'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'

const router = Router()

function adminOnly(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// User analytics dashboard
router.get('/dashboard', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!

  const user = db.prepare('SELECT points, receipts_generated, created_at FROM users WHERE id = ?')
    .get(userId) as { points: number; receipts_generated: number; created_at: string } | undefined

  const receiptStats = db.prepare(
    'SELECT COUNT(*) as total, SUM(total) as totalValue, AVG(total) as avgValue FROM receipts WHERE user_id = ?'
  ).get(userId) as { total: number; totalValue: number; avgValue: number } | undefined

  const pointsStatsRows = db.prepare(
    'SELECT type, COUNT(*) as count, SUM(amount) as totalAmount FROM points_transactions WHERE user_id = ? GROUP BY type'
  ).all(userId) as { type: string; count: number; totalAmount: number }[]

  const recentActivity = db.prepare(
    'SELECT type, title, description, created_at FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(userId)

  const platformBreakdown = db.prepare(
    'SELECT platform, COUNT(*) as count, SUM(total) as totalValue FROM receipts WHERE user_id = ? GROUP BY platform ORDER BY count DESC'
  ).all(userId) as { platform: string; count: number; totalValue: number }[]

  const pointsTx = pointsStatsRows.reduce((acc: any, curr) => {
    acc[curr.type] = { count: curr.count, total: curr.totalAmount }
    return acc
  }, {})

  return res.json({
    user: {
      points: user?.points || 0,
      receiptsGenerated: user?.receipts_generated || 0,
      memberSince: user?.created_at
    },
    receipts: {
      total: receiptStats?.total || 0,
      totalValue: receiptStats?.totalValue || 0,
      avgValue: receiptStats?.avgValue || 0
    },
    points: { transactions: pointsTx },
    recentActivity,
    platformBreakdown
  })
})

// Weekly activity chart data
router.get('/activity-chart', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const results = db.prepare(
    `SELECT strftime('%Y-%m-%d', created_at) as date, type, COUNT(*) as count
     FROM activities
     WHERE user_id = ? AND created_at >= ?
     GROUP BY date, type
     ORDER BY date ASC`
  ).all(userId, thirtyDaysAgo) as { date: string; type: string; count: number }[]

  const dates = [...new Set(results.map((r) => r.date))]
  const types = [...new Set(results.map((r) => r.type))]

  const datasets = types.map((type) => ({
    label: type,
    data: dates.map((date) => {
      const found = results.find((r) => r.date === date && r.type === type)
      return found ? found.count : 0
    })
  }))

  return res.json({ labels: dates, datasets })
})

// Admin analytics (platform-wide)
router.get('/admin/stats', authMiddleware, adminOnly, async (_req: AuthedRequest, res) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const totalUsers = db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }
  const totalReceipts = db.prepare('SELECT COUNT(*) as n FROM receipts').get() as { n: number }
  const totalPointsPurchased = db.prepare(`SELECT SUM(amount) as n FROM points_transactions WHERE type = 'purchase'`).get() as { n: number }
  const activeToday = db.prepare('SELECT COUNT(*) as n FROM users WHERE last_login >= ?').get(oneDayAgo) as { n: number }

  const estimatedRevenue = ((totalPointsPurchased?.n || 0) * 0.01)

  return res.json({
    totalUsers: totalUsers?.n || 0,
    totalReceipts: totalReceipts?.n || 0,
    totalPointsPurchased: totalPointsPurchased?.n || 0,
    activeToday: activeToday?.n || 0,
    estimatedRevenue
  })
})

export default router
