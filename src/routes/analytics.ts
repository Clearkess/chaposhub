import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables, UserRow } from '../lib/types'

const analytics = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

const adminOnly = async (c: any, next: any) => {
  if (c.get('userRole') !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }
  await next()
}

// User analytics dashboard
analytics.get('/dashboard', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const [user, receiptStats, pointsStats, recentActivity, platformBreakdown] = await Promise.all([
    c.env.DB.prepare('SELECT points, receipts_generated, created_at FROM users WHERE id = ?')
      .bind(userId).first<{ points: number; receipts_generated: number; created_at: string }>(),

    c.env.DB.prepare(
      'SELECT COUNT(*) as total, SUM(total) as totalValue, AVG(total) as avgValue FROM receipts WHERE user_id = ?'
    ).bind(userId).first<{ total: number; totalValue: number; avgValue: number }>(),

    c.env.DB.prepare(
      'SELECT type, COUNT(*) as count, SUM(amount) as totalAmount FROM points_transactions WHERE user_id = ? GROUP BY type'
    ).bind(userId).all<{ type: string; count: number; totalAmount: number }>(),

    c.env.DB.prepare(
      'SELECT type, title, description, created_at FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(userId).all(),

    c.env.DB.prepare(
      'SELECT platform, COUNT(*) as count, SUM(total) as totalValue FROM receipts WHERE user_id = ? GROUP BY platform ORDER BY count DESC'
    ).bind(userId).all<{ platform: string; count: number; totalValue: number }>()
  ])

  const pointsTx = (pointsStats.results || []).reduce((acc: any, curr) => {
    acc[curr.type] = { count: curr.count, total: curr.totalAmount }
    return acc
  }, {})

  return c.json({
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
    recentActivity: recentActivity.results,
    platformBreakdown: platformBreakdown.results
  })
})

// Weekly activity chart data
analytics.get('/activity-chart', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { results } = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m-%d', created_at) as date, type, COUNT(*) as count
     FROM activities
     WHERE user_id = ? AND created_at >= ?
     GROUP BY date, type
     ORDER BY date ASC`
  ).bind(userId, thirtyDaysAgo).all<{ date: string; type: string; count: number }>()

  const dates = [...new Set(results.map((r) => r.date))]
  const types = [...new Set(results.map((r) => r.type))]

  const datasets = types.map((type) => ({
    label: type,
    data: dates.map((date) => {
      const found = results.find((r) => r.date === date && r.type === type)
      return found ? found.count : 0
    })
  }))

  return c.json({ labels: dates, datasets })
})

// Admin analytics (platform-wide)
analytics.get('/admin/stats', authMiddleware, adminOnly, async (c) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [totalUsers, totalReceipts, totalPointsPurchased, activeToday] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as n FROM receipts').first<{ n: number }>(),
    c.env.DB.prepare(`SELECT SUM(amount) as n FROM points_transactions WHERE type = 'purchase'`).first<{ n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as n FROM users WHERE last_login >= ?').bind(oneDayAgo).first<{ n: number }>()
  ])

  const estimatedRevenue = ((totalPointsPurchased?.n || 0) * 0.01)

  return c.json({
    totalUsers: totalUsers?.n || 0,
    totalReceipts: totalReceipts?.n || 0,
    totalPointsPurchased: totalPointsPurchased?.n || 0,
    activeToday: activeToday?.n || 0,
    estimatedRevenue
  })
})

export default analytics
