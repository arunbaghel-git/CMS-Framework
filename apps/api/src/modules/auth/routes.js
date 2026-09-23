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

/**
 * `Lost your password?` ki rok — D-110. **IP + email** pe, ghante me 5 (dev/test me 50).
 *
 * Link ka token 256 bit ka hai, use guess karna waise hi namumkin hai — ye rok us cheez ke liye hai
 * jo guess se sasti hai: kisi admin ke inbox pe reset mails ki baarish, aur hamare SMTP account ka
 * spam ke liye istemaal (provider account band kar deta hai, aur tab enquiry ki mail bhi rukti).
 *
 * `skipSuccessfulRequests` jaan-boojh kar **nahi** — yahan har request "successful" hai (hamesha
 * 200), to wo rok ko bekaar kar deta.
 */
const forgotLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: isProd ? 5 : 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${req.ip}:${String(req.body?.email ?? '')
      .trim()
      .toLowerCase()}`,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many reset requests. Try again in an hour.',
    },
  },
})

/** Naya password rakhne ki rok — sirf IP pe (token guess karne ki koshish ke liye doosra pehra). */
const resetLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: isProd ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Try again in 15 minutes.',
    },
  },
})

authRoutes.post('/login', loginLimiter, controller.login)
authRoutes.post('/forgot-password', forgotLimiter, controller.forgotPassword)
authRoutes.post('/reset-password', resetLimiter, controller.resetPassword)
authRoutes.post('/refresh', controller.refresh)
authRoutes.post('/logout', controller.logout)
authRoutes.post('/change-password', requireAuth, controller.changePassword)

// `GET/PATCH /api/me` auth me nahi, users module me hai (architecture §9) — wo profile
// hai, session nahi.
