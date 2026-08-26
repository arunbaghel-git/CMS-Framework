import { existsSync } from 'node:fs'

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
import { mediaRoutes } from './modules/media/routes.js'
import { menuLocationRoutes, menuRoutes } from './modules/menus/routes.js'
import { contentTypeRoutes } from './modules/content-types/routes.js'
import { entryRoutes } from './modules/entries/routes.js'
import { taxonomyRoutes } from './modules/taxonomies/routes.js'
import { addOnRoutes, hotelRoutes, transferRoutes } from './modules/master-lists/routes.js'
import { packageDefaultsRoutes } from './modules/package-defaults/routes.js'
import { publicRoutes } from './modules/public/routes.js'
import { getStorageDriver } from './modules/media/storage/index.js'

/**
 * Express app banata hai. Server start karna `index.js` ka kaam hai —
 * isse test me app ko bina listen kiye use kiya ja sakta hai.
 */
export function createApp() {
  // Media storage config ko boot pe touch karo: `s3` selected ho aur support na ho to
  // clear failure mile, local pe silent fallback kabhi nahi (D-41).
  const storage = getStorageDriver()

  const app = express()

  // Reverse proxy ke peeche chalta hai — sahi client IP ke liye zaroori
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(pinoHttp({ logger }))
  app.use(helmet())
  app.use(compression())

  if (storage.kind === 'local') {
    /**
     * Upload directory ka resolved path **boot pe log hota hai**, aur na hone pe warn.
     *
     * Bina iske ye failure poori tarah chup thi: `UPLOAD_DIR` ki jagah folder gayab ho
     * (ya path galat resolve ho) to `express.static` bas `fallthrough` kar deta hai, har
     * file **404**, aur API `/api/health` pe theek-thaak "ok" bolti rehti hai. Lakshan
     * kahin aur dikhta hai — public site pe logo gayab — aur wahan se yahan tak pahunchne
     * me kaafi der lagti hai.
     *
     * Ye wahi sabak hai jo migration runner pe pehle mil chuka tha: missing directory pe
     * chup-chaap khaali lautana debugging ka sabse mehnga tareeka hai.
     *
     * Driver upload ke waqt `mkdir(recursive)` karta hai, isliye yahan banane ki zaroorat
     * nahi — par batana zaroori hai.
     */
    if (existsSync(storage.root)) {
      logger.info({ uploadDir: storage.root }, 'Media: local storage ready')
    } else {
      logger.warn(
        { uploadDir: storage.root },
        'Media: upload directory maujood nahi hai — pehle upload pe ban jaayegi, par ' +
          'purani media ki saari files 404 dengi. UPLOAD_DIR sahi hai?',
      )
    }

    app.use(
      '/uploads',
      express.static(storage.root, {
        dotfiles: 'deny',
        fallthrough: true,
        index: false,
      }),
    )
  }

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
  app.use('/api/media', mediaRoutes)
  app.use('/api/menus', menuRoutes)
  app.use('/api/menu-locations', menuLocationRoutes)
  app.use('/api/content-types', contentTypeRoutes)
  app.use('/api/entries', entryRoutes)
  app.use('/api/taxonomies', taxonomyRoutes)

  // Packages ki master lists — teenon ek hi module se, par alag routes aur alag
  // permissions (spec 007 §1, Slice 2)
  app.use('/api/hotels', hotelRoutes)
  app.use('/api/add-ons', addOnRoutes)
  app.use('/api/transfers', transferRoutes)
  app.use('/api/package-defaults', packageDefaultsRoutes)

  // Public — read-only, bina auth ke (02-ARCHITECTURE §10)
  app.use('/api/public', publicRoutes)
  // Aage: `/api/public/resolve` (Slice 7 / Phase 3)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
