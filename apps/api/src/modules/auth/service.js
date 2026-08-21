import bcrypt from 'bcryptjs'
import { USER_STATUS, toPublicUser } from '@cms/shared'

import { logger } from '../../core/logger.js'
import { unauthorized, unprocessable } from '../../core/errors.js'
import {
  REFRESH_TTL_MS,
  newCsrfToken,
  newFamilyId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../core/tokens.js'
import { User } from '../users/model.js'
import { getRolePermissions } from '../roles/service.js'
import { RefreshToken } from './model.js'

/**
 * Auth ka saara business logic — R1. Controller sirf req/res karta hai.
 *
 * Architecture §8.1 ke teen zaroori hisse yahan hain:
 *   1. rotation — har refresh naya token deta hai, purana usi waqt mar jaata hai
 *   2. reuse detection — mara hua token dobara aaya = chori = poori family revoke
 *   3. family = ek login session
 */

/**
 * bcrypt cost.
 *
 * 12 asli value hai — brute force mehnga, login abhi bhi turant.
 *
 * Test me 4: `bcryptjs` pure JavaScript hai aur cost 12 pe ek hash ~600ms leta hai.
 * Ek integration test jo 7 users banata hai wo akela 4 second kha jaata tha aur timeout
 * ho jaata. Cost sirf **kitna mehnga hai** ye badalta hai, **kya sahi/galat hai** wo nahi
 * — isliye test ki value production ki security ko chhooti nahi.
 */
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12

/**
 * Login fail hone pe **hamesha yahi** error. "Email galat hai" aur "password galat
 * hai" alag batane se koi bhi email enumerate kar sakta hai ki kaunse accounts hain.
 */
const loginFailed = () => unauthorized('Email or password is incorrect')

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

/**
 * Ek naya session banata hai (login) ya chalu session ko aage badhata hai (refresh).
 *
 * `remember` yahan se **record me** jaata hai, taaki agli rotation use padh sake.
 * Caller ko wo khud yaad rakhne ki zaroorat na pade (D-38).
 *
 * @param {{ user: any, familyId?: string, req?: any, remember?: boolean }} input
 */
async function issueSession({ user, familyId = newFamilyId(), req, remember = false }) {
  const userId = String(user._id ?? user.id)

  const refresh = signRefreshToken({ id: userId, familyId, remember })

  await RefreshToken.create({
    jti: refresh.jti,
    familyId,
    userId,
    remember,
    expiresAt: refresh.expiresAt,
    userAgent: req?.get?.('user-agent') ?? null,
    ip: req?.ip ?? null,
  })

  return {
    accessToken: signAccessToken({ id: userId, role: user.role }),
    refreshToken: refresh.token,
    csrfToken: newCsrfToken(),
    remember,
    expiresAt: refresh.expiresAt,
  }
}

/**
 * @param {{ email: string, password: string }} credentials
 * @param {any} [req]
 */
export async function login({ email, password, rememberMe = false }, req) {
  // passwordHash `select: false` hai — yahan explicitly maangna padta hai
  const user = await User.findOne({ email }).select('+passwordHash')

  /**
   * User na milne pe bhi bcrypt chalate hain (dummy hash pe). Warna "email exist
   * karta hai" ka jawab response ke **time** se leak ho jaata — missing user turant
   * lautta, existing user 250ms me.
   */
  if (!user) {
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva')
    throw loginFailed()
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) throw loginFailed()

  if (user.status === USER_STATUS.INACTIVE) {
    throw unauthorized('This account has been disabled. Contact your administrator.')
  }

  const tokens = await issueSession({ user, req, remember: rememberMe })

  // R1: ye service ka kaam hai, model hook ka nahi — `updateOne` hook chalata hi nahi
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

  const permissions = await getRolePermissions(user.role)

  return {
    user: toPublicUser({ ...user.toObject(), lastLoginAt: new Date() }, permissions),
    tokens,
  }
}

/**
 * Refresh + rotation + reuse detection.
 *
 * @param {string} token cookie se aaya refresh token
 * @param {any} [req]
 */
export async function refresh(token, req) {
  const payload = verifyRefreshToken(token)
  if (!payload?.jti) throw unauthorized('Your session has expired. Please sign in again.')

  const stored = await RefreshToken.findOne({ jti: payload.jti })

  /**
   * Record hi nahi mila — token forge kiya gaya hai, ya TTL cleanup ke baad aaya hai.
   * Dono me session khatam.
   */
  if (!stored) throw unauthorized('Your session has expired. Please sign in again.')

  /**
   * **Reuse detection.** Ye token pehle hi rotate/revoke ho chuka hai par phir bhi
   * aaya — matlab kisi ne purana token chura liya hai. Ab ye nahi pata chal sakta ki
   * asli user kaun hai (chor bhi valid token pesh kar raha hai), isliye **poori
   * family** mar jaati hai aur sabko dobara login karna padta hai.
   */
  if (stored.revokedAt) {
    await revokeFamily(stored.familyId)
    logger.warn(
      { userId: String(stored.userId), familyId: stored.familyId },
      'Refresh token reuse pakda gaya — poori family revoke ki',
    )
    throw unauthorized('This session was closed for security. Please sign in again.')
  }

  if (stored.expiresAt <= new Date()) {
    throw unauthorized('Your session has expired. Please sign in again.')
  }

  const user = await User.findById(stored.userId)
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    await revokeFamily(stored.familyId)
    throw unauthorized('This account is no longer active.')
  }

  // Naya token pehle banao, phir purana band karo — beech me fail hua to user ke paas
  // kaam karta hua purana token bacha rehta hai
  /**
   * `remember` **record se** aata hai, is request se nahi (D-38).
   *
   * Pehle refresh hamesha persistent cookie set kar deta tha. Nateeja: "Remember me"
   * bina tick kiye login karo, 15 min baad ek auto-refresh chale, aur aapka session
   * chup-chaap persistent ho jaata — browser band karne pe bhi logout na hota.
   */
  const tokens = await issueSession({
    user,
    familyId: stored.familyId,
    req,
    remember: Boolean(stored.remember),
  })

  const next = verifyRefreshToken(tokens.refreshToken)
  stored.revokedAt = new Date()
  stored.replacedByJti = next?.jti ?? null
  await stored.save()

  const permissions = await getRolePermissions(user.role)

  return { user: toPublicUser(user, permissions), tokens }
}

/**
 * Logout — sirf **is** session ko band karta hai, baaki devices chalte rehte hain.
 * @param {string} [token]
 */
export async function logout(token) {
  if (!token) return { revoked: 0 }

  const payload = verifyRefreshToken(token)
  if (!payload?.familyId) return { revoked: 0 }

  return revokeFamily(payload.familyId)
}

/** Ek login session (family) ke saare tokens band. */
export async function revokeFamily(familyId) {
  const result = await RefreshToken.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  )
  return { revoked: result.modifiedCount }
}

/**
 * Is session pe "Remember me" chuna gaya tha ya nahi.
 *
 * Cookie me ye likha hi nahi hota — sirf `refreshTokens` record jaanta hai (D-38).
 * Token na mile ya na pehchana jaaye to `false`: default hamesha **kam** persistence
 * ki taraf jhukna chahiye.
 *
 * @param {string} [token] cookie se aaya refresh token
 */
async function sessionRemember(token) {
  if (!token) return false

  const payload = verifyRefreshToken(token)
  if (!payload?.jti) return false

  const stored = await RefreshToken.findOne({ jti: payload.jti }).lean()
  return Boolean(stored?.remember)
}

/**
 * User ke **saare** sessions band — password change aur deactivate pe zaroori.
 *
 * Password badalne pe purane sessions zinda rakhna sabse aam auth bug hai: user
 * password isliye badalta hai ki kisi ke paas access aa gaya tha, aur wo access
 * chalta rehta hai.
 */
export async function revokeAllSessions(userId) {
  const result = await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  )
  return { revoked: result.modifiedCount }
}

/**
 * Apna password badalna — **har user ke liye khula** (D-37).
 *
 * D-35 me ye raasta band tha: password sirf administrator set karta tha. Client ne wo
 * palat diya — ab har user apni Profile screen se apna password badal sakta hai.
 * Admin ka reset field bhi rehta hai (users service): SMTP na hone tak bhoole hue
 * password ka ekmatra recovery wahi hai.
 *
 * **Current password kyun maanga jaata hai:** iske bina kisi ka khula chhoda hua
 * session mil jaana seedha *account takeover* ban jaata — jise session mila wo password
 * badal kar asli user ko hamesha ke liye bahar kar deta. Current password maangne se
 * chura hua session sirf apne expire hone tak chalta hai.
 *
 * **Purane saare sessions marte hain, phir ek naya milta hai.** Pehla hissa isliye ki
 * password aksar isiliye badla jaata hai ki kisi aur ke paas access aa gaya tha — us
 * access ka zinda rehna poore kaam ko bekaar kar deta hai. Doosra hissa isliye ki
 * warna user apna hi password badal kar khud logout ho jaata.
 *
 * @param {string} userId
 * @param {{ currentPassword: string, newPassword: string }} input
 * @param {{ req?: any, currentRefreshToken?: string }} [options]
 */
export async function changePassword(userId, { currentPassword, newPassword }, options = {}) {
  const { req, currentRefreshToken } = options
  const user = await User.findById(userId).select('+passwordHash')
  if (!user) throw unauthorized()

  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) throw unprocessable('Current password is incorrect')

  user.passwordHash = await hashPassword(newPassword)
  // Gate ab utar gaya — chahe wo seed wala forced flow ho ya normal profile change
  user.mustChangePassword = false
  await user.save()

  // Purani choice revoke se pehle padh lo — naya session bhi wahi persistence rakhega
  const remember = await sessionRemember(currentRefreshToken)

  // Pehle sab band, **phir** naya. Ulta karne pe naya token bhi usi sweep me mar jaata
  await revokeAllSessions(userId)
  const tokens = await issueSession({ user, req, remember })

  const permissions = await getRolePermissions(user.role)

  return { user: toPublicUser(user, permissions), tokens }
}

/** Expire ho chuke records hatana. TTL index bhi yahi karta hai — ye manual backup hai. */
export async function pruneExpiredTokens() {
  const result = await RefreshToken.deleteMany({ expiresAt: { $lte: new Date() } })
  return { deleted: result.deletedCount }
}

export { REFRESH_TTL_MS }
