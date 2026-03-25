import express from 'express'
import cors from 'cors'
import path from 'path'
import { Bonjour } from 'bonjour-service'
import { requireAuth } from './middleware/auth'
import authRouter from './routes/auth'
import employeesRouter from './routes/employees'
import leaveRequestsRouter from './routes/leave-requests'
import leaveBalancesRouter from './routes/leave-balances'
import leaveTypesRouter from './routes/leave-types'
import settingsRouter from './routes/settings'
import setupRouter from './routes/setup'
import importRouter from './routes/import'
import scrumsRouter from './routes/scrums'

export const PORT = 8888

export function createServer() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // 인증 불필요
  app.use('/api/setup', setupRouter)
  app.use('/api/auth', authRouter)

  // All other API routes require JWT
  app.use('/api/employees', requireAuth, employeesRouter)
  app.use('/api/leave-requests', requireAuth, leaveRequestsRouter)
  app.use('/api/leave-balances', requireAuth, leaveBalancesRouter)
  app.use('/api/leave-types', requireAuth, leaveTypesRouter)
  app.use('/api/settings', requireAuth, settingsRouter)
  app.use('/api/import', requireAuth, importRouter)
  app.use('/api/scrums', requireAuth, scrumsRouter)

  // Serve React static files (production build)
  const distPath = path.join(__dirname, '../../dist')
  app.use(express.static(distPath))

  // SPA fallback — all non-API routes serve index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })

  return app
}

export function startServer(): Promise<void> {
  const app = createServer()
  return new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] HR running on http://0.0.0.0:${PORT}`)

      try {
        const bonjour = new Bonjour()
        const svc = bonjour.publish({ name: 'LocalSass HR', type: 'http', port: PORT, host: 'localsass.local' })
        svc.on('error', () => {})
        console.log(`[mDNS] Advertised as http://localsass.local:${PORT}`)
      } catch { /* mDNS 충돌 무시 */ }
      resolve()
    })
  })
}
