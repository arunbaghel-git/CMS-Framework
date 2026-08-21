import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { isProd } from '../../core/env.js'
import { requireAuth } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/auth` — architecture §9.
 * Saare routes POST hain: state badalne wala GET kabhi nahi (R13).
 */
export const authRoutes = Router()

/**
 * Login pe apni alag, kaafi sakht rate limit.
 *
 * Global limiter (120/min) password guessing ke liye bahut dheela hai — 120 tries
 * per minute se common passwords ki list ghanton me nikal jaati hai.
 * Key IP + email dono se banti hai, taaki ek IP se ek account ko target karna ruke
 * par ek office ke saare users ek dusre ko lock na kar dein.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: isProd ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
  // Sahi password pe counter nahi badhta — asli user ko lock karne ka koi matlab nahi
  skipSuccessfulRequests: true,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many sign-in attempts. Try again in 15 minutes.',
    },
  },
})

authRoutes.post('/login', loginLimiter, controller.login)
authRoutes.post('/refresh', controller.refresh)
authRoutes.post('/logout', controller.logout)
authRoutes.post('/change-password', requireAuth, controller.changePassword)

// `GET/PATCH /api/me` auth me nahi, users module me hai (architecture §9) — wo profile
// hai, session nahi.
