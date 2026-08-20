import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'

import { env } from './env.js'

/**
 * JWT + cookie layer — architecture §8.1.
 *
 * Token localStorage me kabhi nahi jaata. CMS me user rich text aur embed HTML daalta
 * hai, isliye XSS surface bada hai — `httpOnly` cookie hi ekmatra safe jagah hai.
 */

/**
 * `__Host-` prefix cookie ko origin se chipka deta hai — koi subdomain use overwrite
 * nahi kar sakta. Par uski shart hai `Secure` + `Path=/` + **koi `Domain` nahi**.
 *
 * Plain HTTP dev me `Secure` cookie set hi nahi hoti, isliye naam env-conditional hai.
 * Naam badalna safe hai: purani cookie bas match nahi karegi aur user dobara login
 * kar lega.
 */
const canUseHostPrefix = env.COOKIE_SECURE && !env.COOKIE_DOMAIN
const prefix = canUseHostPrefix ? '__Host-' : ''

export const COOKIE = Object.freeze({
  ACCESS: `${prefix}cms_at`,
  REFRESH: `${prefix}cms_rt`,
  /** Double-submit CSRF token — ye jaan-boojh kar `httpOnly` NAHI hai (niche dekho). */
  CSRF: `${prefix}cms_csrf`,
})

/**
 * `15m` · `7d` · `900` jaisi TTL string ko milliseconds me badalta hai.
 * @param {string|number} ttl
 * @returns {number}
 */
export function ttlToMs(ttl) {
  if (typeof ttl === 'number') return ttl * 1000

  const match = /^(\d+)\s*([smhd])?$/.exec(String(ttl).trim())
  if (!match) throw new Error(`TTL samajh nahi aayi: ${ttl}`)

  const value = Number(match[1])
  const unit = match[2] ?? 's'
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]

  return value * factor
}

export const ACCESS_TTL_MS = ttlToMs(env.ACCESS_TOKEN_TTL)
export const REFRESH_TTL_MS = ttlToMs(env.REFRESH_TOKEN_TTL)

const baseCookie = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  /**
   * `Lax` chuna gaya hai kyunki admin same-origin hai (architecture §8.1 ki table).
   * Iska protection tabhi tak hai jab tak **koi state-changing GET na ho** (R13) —
   * Lax top-level GET navigation pe cookie bhejta hai.
   */
  sameSite: 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN && !canUseHostPrefix ? { domain: env.COOKIE_DOMAIN } : {}),
}

/**
 * Access token — chhoti umr, har request pe jaata hai.
 * @param {{ id: string, role: string }} user
 */
export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, typ: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  })
}

/**
 * Refresh token. `jti` aur `familyId` iske andar hain — reuse detection inhi do se
 * chalti hai (`refreshTokens` collection).
 *
 * @param {{ id: string, familyId: string, jti?: string }} input
 */
export function signRefreshToken({ id, familyId, jti = randomUUID() }) {
  const token = jwt.sign({ sub: id, familyId, jti, typ: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL,
  })

  return { token, jti, familyId, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) }
}

/**
 * Verify karta hai. **Throw nahi karta** — invalid token normal case hai (expire hua
 * access token har 15 min me aata hai), exception nahi.
 *
 * @returns {any|null}
 */
export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
    return payload?.typ === 'access' ? payload : null
  } catch {
    return null
  }
}

/** @returns {any|null} */
export function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET)
    return payload?.typ === 'refresh' ? payload : null
  } catch {
    return null
  }
}

export function newFamilyId() {
  return randomUUID()
}

export function newCsrfToken() {
  return randomBytes(32).toString('hex')
}

/**
 * Do strings ko **constant time** me compare karta hai.
 *
 * Normal `===` alag-alag time leta hai depending on kitne characters match hue —
 * usse attacker token ek-ek character karke guess kar sakta hai.
 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false

  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  // timingSafeEqual alag lambai pe throw karta hai, isliye lambai pehle check —
  // lambai leak karna secret leak karne se bahut kam khatarnaak hai.
  if (bufA.length !== bufB.length) return false

  return timingSafeEqual(bufA, bufB)
}

/**
 * Login / refresh ke baad teenon cookies set karta hai.
 *
 * @param {import('express').Response} res
 * @param {{ accessToken: string, refreshToken: string, csrfToken: string, persistent?: boolean }} tokens
 */
export function setAuthCookies(res, { accessToken, refreshToken, csrfToken, persistent = false }) {
  res.cookie(COOKIE.ACCESS, accessToken, { ...baseCookie, maxAge: ACCESS_TTL_MS })

  /**
   * "Remember me" off ho to refresh cookie **session cookie** banti hai — browser band
   * hone pe chali jaati hai. JWT ki apni expiry phir bhi lagti hai; ye uske upar hai,
   * uski jagah nahi.
   */
  res.cookie(COOKIE.REFRESH, refreshToken, {
    ...baseCookie,
    ...(persistent ? { maxAge: REFRESH_TTL_MS } : {}),
  })

  /**
   * CSRF cookie `httpOnly` **nahi** hai — double-submit pattern me JS ko ise padh ke
   * header me bhejna hota hai. Ye leak nahi hai: iski poori security is baat pe hai
   * ki dusra origin ise **padh nahi sakta** (same-origin policy), bhale bhej sakta ho.
   */
  res.cookie(COOKIE.CSRF, csrfToken, {
    ...baseCookie,
    httpOnly: false,
    ...(persistent ? { maxAge: REFRESH_TTL_MS } : {}),
  })
}

/** Logout — teenon cookies wahi flags ke saath clear hoti hain jinse set hui thi. */
export function clearAuthCookies(res) {
  for (const name of [COOKIE.ACCESS, COOKIE.REFRESH, COOKIE.CSRF]) {
    res.clearCookie(name, { ...baseCookie, httpOnly: name !== COOKIE.CSRF })
  }
}
