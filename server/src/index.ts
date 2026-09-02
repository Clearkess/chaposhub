// Main Express entry point — mounts every ported route module, matching
// the route-mounting layout of the original src/index.tsx (Hono/Workers).
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRouter from './routes/auth.js'
import receiptsRouter from './routes/receipts.js'
import pointsRouter from './routes/points.js'
import aiRouter from './routes/ai.js'
import emailRouter from './routes/email.js'
import usersRouter from './routes/users.js'
import analyticsRouter from './routes/analytics.js'
import webhooksRouter from './routes/webhooks.js'
import opayRouter from './routes/opay.js'
import opayWalletRouter from './routes/opay-wallet.js'
import banksRouter from './routes/banks.js'
import marketplaceRouter from './routes/marketplace.js'

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787

app.use(cors())

// NOTE: webhooksRouter defines its own express.text({type:'*/*'}) raw-body
// parser scoped to POST /whop specifically, so the global JSON parser below
// must NOT run for that route (HMAC verification needs the exact raw bytes).
// Mounting webhooksRouter before the global json() middleware, combined with
// Express matching sub-routers by path, keeps /api/webhooks/* routes as the
// first (and only) body parser to touch that request.
app.use('/api/webhooks', webhooksRouter)

// Marketplace file-upload route defines its own express.raw() body parser
// scoped to POST /listings/:id/upload; mount before the global json()
// middleware for the same reason as webhooks above.
app.use('/api/marketplace', marketplaceRouter)

// Global JSON body parser for all other JSON API routes.
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'chaposhub', time: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/receipts', receiptsRouter)
app.use('/api/points', pointsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/email', emailRouter)
app.use('/api/users', usersRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/services/opay', opayRouter)
app.use('/api/services/opay', opayWalletRouter)
app.use('/api/banks', banksRouter)

app.listen(PORT, () => {
  console.log(`chaposhub API server listening on http://0.0.0.0:${PORT}`)
})

export default app
