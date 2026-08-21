import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import pinoHttp from 'pino-http'
import mongoose from 'mongoose'

import { env, isProd } from './core/env.js'
import { logger } from './core/logger.js'
import { errorHandler, notFoundHandler } from './core/errors.js'
import { checkPending } from './core/migrations/runner.js'
import { attachUser } from './middleware/auth.js'
import { csrfProtection } from './middleware/csrf.js'
import { authRoutes } from './modules/auth/routes.js'
import { meRoutes, userRoutes } from './modules/users/routes.js'
import { roleRoutes } from './modules/roles/routes.js'
import { settingsRoutes } from './modules/settings/routes.js'

/**
 * Express app banata hai. Server start karna `index.js` ka kaam hai —
 * isse test me app ko bina listen kiye use kiya ja sakta hai.
 */
export function createApp() {
  const app = express()

  // Reverse proxy ke peeche chalta hai — sahi client IP ke liye zaroori
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(pinoHttp({ logger }))
  app.use(helmet())
  app.use(compression())

  // CORS allowlist — wildcard kabhi nahi (D-12).
  // Same-origin setup me ye sirf dev ke liye kaam aata hai.
  const allowedOrigins = [env.SITE_URL, env.ADMIN_URL].filter(Boolean)
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
        cb(new Error(`CORS: origin allowed nahi hai — ${origin}`))
      },
      credentials: true,
    }),
  )

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(cookieParser())

  // Dono cookies padhte hain, isliye cookieParser ke BAAD hi lag sakte hain
  app.use(csrfProtection)
  app.use(attachUser)

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: isProd ? 120 : 1000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        error: { code: 'RATE_LIMITED', message: 'Bahut zyada requests. Thodi der baad.' },
      },
    }),
  )

  // Health — load balancer, uptime check, aur admin ka Site Health card
  app.get('/api/health', async (req, res) => {
    const dbUp = mongoose.connection.readyState === 1
    const migrations = dbUp ? await checkPending() : { pending: 0, modified: 0, missing: 0 }

    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'connected' : 'disconnected',
      migrations,
      uptime: Math.round(process.uptime()),
    })
  })

  // Modules
  app.use('/api/auth', authRoutes)
  app.use('/api/me', meRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/roles', roleRoutes)
  app.use('/api/settings', settingsRoutes)
  // Aage: entries, media, menus, taxonomies, settings…

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
