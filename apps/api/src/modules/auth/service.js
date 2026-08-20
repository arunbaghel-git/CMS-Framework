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

/** bcrypt cost. 12 ≈ 250ms — brute force mehnga, login abhi bhi turant. */
const BCRYPT_ROUNDS = 12

/**
 * Login fail hone pe **hamesha yahi** error. "Email galat hai" aur "password galat
 * hai" alag batane se koi bhi email enumerate kar sakta hai ki kaunse accounts hain.
 */
const loginFailed = () => unauthorized('Email ya password galat hai')

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

/**
 * Ek naya session banata hai (login) ya chalu session ko aage badhata hai (refresh).
 *
 * @param {{ user: any, familyId?: string, req?: any }} input
 */
async function issueSession({ user, familyId = newFamilyId(), req }) {
  const userId = String(user._id ?? user.id)

  const refresh = signRefreshToken({ id: userId, familyId })

  await RefreshToken.create({
    jti: refresh.jti,
    familyId,
    userId,
    expiresAt: refresh.expiresAt,
    userAgent: req?.get?.('user-agent') ?? null,
    ip: req?.ip ?? null,
  })

  return {
    accessToken: signAccessToken({ id: userId, role: user.role }),
    refreshToken: refresh.token,
    csrfToken: newCsrfToken(),
    expiresAt: refresh.expiresAt,
  }
}

/**
 * @param {{ email: string, password: string }} credentials
 * @param {any} [req]
 */
export async function login({ email, password }, req) {
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
    throw unauthorized('Ye account band kar diya gaya hai. Administrator se baat karein.')
  }

  const tokens = await issueSession({ user, req })

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
  if (!payload?.jti) throw unauthorized('Session expire ho gaya. Dobara login karein.')

  const stored = await RefreshToken.findOne({ jti: payload.jti })

  /**
   * Record hi nahi mila — token forge kiya gaya hai, ya TTL cleanup ke baad aaya hai.
   * Dono me session khatam.
   */
  if (!stored) throw unauthorized('Session expire ho gaya. Dobara login karein.')

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
    throw unauthorized('Security ke liye session band kar diya gaya. Dobara login karein.')
  }

  if (stored.expiresAt <= new Date()) {
    throw unauthorized('Session expire ho gaya. Dobara login karein.')
  }

  const user = await User.findById(stored.userId)
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    await revokeFamily(stored.familyId)
    throw unauthorized('Ye account ab active nahi hai.')
  }

  // Naya token pehle banao, phir purana band karo — beech me fail hua to user ke paas
  // kaam karta hua purana token bacha rehta hai
  const tokens = await issueSession({ user, familyId: stored.familyId, req })

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
 * Apna password badalna.
 *
 * @param {string} userId
 * @param {{ currentPassword: string, newPassword: string }} input
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash')
  if (!user) throw unauthorized()

  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) throw unprocessable('Abhi ka password galat hai')

  user.passwordHash = await hashPassword(newPassword)
  user.mustChangePassword = false
  await user.save()

  await revokeAllSessions(userId)

  return { ok: true }
}

/** Expire ho chuke records hatana. TTL index bhi yahi karta hai — ye manual backup hai. */
export async function pruneExpiredTokens() {
  const result = await RefreshToken.deleteMany({ expiresAt: { $lte: new Date() } })
  return { deleted: result.deletedCount }
}

export { REFRESH_TTL_MS }
