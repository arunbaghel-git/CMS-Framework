import { createHash, randomBytes } from 'node:crypto'

import bcrypt from 'bcryptjs'
import {
  PASSWORD_RESET_TTL_MINUTES,
  ROLE,
  USER_STATUS,
  escapeHtml,
  toPublicUser,
} from '@cms/shared'

import { adminUrl } from '../../core/env.js'
import { logger } from '../../core/logger.js'
import { sendMail } from '../../core/mailer.js'
import { notFound, unauthorized, unprocessable } from '../../core/errors.js'
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
import { ensureSettings, getMailConfig } from '../settings/service.js'
import { PasswordReset, RefreshToken } from './model.js'

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

// ── password reset — sirf administrator (D-110) ─────────────────────────────

/**
 * Link ke token ka hash — DB me sirf yahi jaata hai (`PasswordReset` ka comment).
 *
 * @param {string} token
 */
const hashResetToken = (token) => createHash('sha256').update(String(token)).digest('hex')

/** Galat, expire ya istemaal ho chuka link — teeno ka ek hi message, koi farq batane ki zaroorat nahi. */
const invalidResetLink = () =>
  unprocessable('This reset link has expired or was already used. Ask for a new one.')

/** Mail ke upar site ka naam — `Settings ▸ General ▸ Site title`. */
async function siteName() {
  const settings = await ensureSettings()
  return settings?.siteName || 'your website'
}

/**
 * `Lost your password?` — **kabhi batata nahi ki email kiska hai.**
 *
 * Teen haalat hain aur teeno ka jawab **bilkul ek** hai (controller hamesha 200 + wahi message):
 * email kisi ka nahi · kisi Editor/Author ka hai · kisi active administrator ka hai. Sirf aakhri pe
 * mail jaati hai.
 *
 * Kyun ek jaisa: warna koi bhi ek-ek email daal kar pata laga leta ki **kaun administrator hai** —
 * aur wahi account kisi bhi hamle ka pehla nishana hota hai. Login ka `loginFailed()` bhi isi soch pe
 * hai.
 *
 * ⚠️ **Mail ka intezaar nahi kiya jaata** — SMTP 1–10 second leta hai. Intezaar hota to jawab ka
 * **time** hi bata deta ki mail gayi (admin) ya nahi (koi aur) — wahi leak jo `login()` dummy bcrypt
 * se rokta hai. Wahi saancha jo `notifyEnquiry()` pe hai (D-109).
 *
 * ⚠️ **Sirf administrator kyun** (client, 23 Sep): baaki har user ka password admin `Users ▸ Edit
 * User` se badal deta hai. Kami sirf tab thi jab admin khud bhool jaaye — tab uska password badalne
 * wala koi bacha hi nahi tha.
 *
 * @param {{ email: string }} input `forgotPasswordSchema` se guzra hua (lowercase, trimmed)
 * @param {any} [req]
 * @returns {Promise<{ sent: boolean }>} `sent` sirf tests ke liye — controller use kabhi nahi bhejta
 */
export async function requestPasswordReset({ email }, req) {
  const user = await User.findOne({ email }).lean()

  if (!user || user.role !== ROLE.ADMIN || user.status === USER_STATUS.INACTIVE) {
    logger.info({ email }, 'Password reset asked for a non-admin or unknown email — nothing sent')
    return { sent: false }
  }

  const token = randomBytes(32).toString('base64url')

  /** Naya link maangte hi purane sab band — inbox me pade purane link ab kisi kaam ke nahi. */
  await PasswordReset.deleteMany({ userId: user._id })
  await PasswordReset.create({
    userId: user._id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
    ip: req?.ip ?? null,
  })

  /**
   * Token **`#` ke baad** — query (`?token=`) me nahi. Fragment browser se bahar kabhi nahi jaata:
   * na server ke access log me, na `Referer` header me, na kisi analytics script ke paas. Query me hota
   * to wo har us jagah likha jaata aur 30 minute tak kisi ke bhi haath me chalne wali chaabi hota.
   */
  const link = `${adminUrl()}/reset-password#token=${token}`

  void sendResetMail(user, link)

  return { sent: true }
}

async function sendResetMail(user, link) {
  try {
    const name = await siteName()
    const result = await sendMail({
      to: user.email,
      subject: `Reset your password — ${name}`,
      text:
        `Hi ${user.name || user.username},\n\n` +
        `Someone asked to reset the password for your administrator account on ${name}.\n\n` +
        `Open this link to choose a new password:\n${link}\n\n` +
        `The link works once and expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.\n\n` +
        `If you did not ask for this, you can ignore this email — your password will not change.`,
      html:
        `<p>Hi ${escapeHtml(user.name || user.username)},</p>` +
        `<p>Someone asked to reset the password for your administrator account on <strong>${escapeHtml(name)}</strong>.</p>` +
        `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#2271b1;color:#fff;text-decoration:none;border-radius:4px">Choose a new password</a></p>` +
        `<p style="color:#646970;font-size:13px">The link works once and expires in ${PASSWORD_RESET_TTL_MINUTES} minutes. ` +
        `If the button does not work, copy this into your browser:<br>${escapeHtml(link)}</p>` +
        `<p style="color:#646970;font-size:13px">If you did not ask for this, you can ignore this email — your password will not change.</p>`,
      mail: await getMailConfig(),
    })

    if (!result.ok) {
      logger.warn(
        { userId: String(user._id), skipped: result.skipped },
        'Password reset email not sent',
      )
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Password reset email failed')
  }
}

/**
 * Mail ke link se naya password.
 *
 * Kram jaan-boojh kar aisa hai:
 *
 * 1. Link ko **atomic** tareeke se "used" karo — `usedAt: null` ki shart ke saath. Do tab me ek saath
 *    khula link ek hi baar chalta hai; doosre ko `null` milta hai
 * 2. User **abhi bhi** active administrator hai? Link maangne ke baad role badal gaya ya account band
 *    hua to link bekaar
 * 3. Password badlo, `mustChangePassword` utaaro, **saare session band** — kisi aur ke haath me pada
 *    session (jiski wajah se shayad reset hua) wahin khatam
 * 4. "Password changed" ki mail — kisi aur ne badla ho to asli admin ko turant pata chale
 *
 * ⚠️ Yahan **login nahi karwaya jaata** — user ko login screen pe bheja jaata hai. Reset ke saath
 * session dena matlab mail ka link = poora session; ek kadam zyada sasta hai.
 *
 * @param {{ token: string, newPassword: string }} input
 * @param {any} [req]
 */
export async function resetPassword({ token, newPassword }, req) {
  const record = await PasswordReset.findOneAndUpdate(
    { tokenHash: hashResetToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true },
  )
  if (!record) throw invalidResetLink()

  const user = await User.findById(record.userId).select('+passwordHash')
  if (!user || user.role !== ROLE.ADMIN || user.status === USER_STATUS.INACTIVE) {
    throw invalidResetLink()
  }

  user.passwordHash = await hashPassword(newPassword)
  user.mustChangePassword = false
  await user.save()

  await revokeAllSessions(user._id)
  /** Us user ke baaki link bhi — ek naya password aa gaya, purane raaste band. */
  await PasswordReset.deleteMany({ userId: user._id, _id: { $ne: record._id } })

  void sendPasswordChangedMail(user, req?.ip)

  return { ok: true }
}

async function sendPasswordChangedMail(user, ip) {
  try {
    const name = await siteName()
    const when = new Date().toUTCString()

    await sendMail({
      to: user.email,
      subject: `Your password was changed — ${name}`,
      text:
        `Hi ${user.name || user.username},\n\n` +
        `The password for your administrator account on ${name} was just changed using a reset link ` +
        `(${when}${ip ? `, from ${ip}` : ''}). You have been signed out everywhere.\n\n` +
        `If this was you, there is nothing else to do.\n\n` +
        `If it was NOT you, ask for a new reset link from the login page right away, and check who ` +
        `can read this mailbox.\n\n${adminUrl()}/login`,
      html:
        `<p>Hi ${escapeHtml(user.name || user.username)},</p>` +
        `<p>The password for your administrator account on <strong>${escapeHtml(name)}</strong> was just changed using a reset link ` +
        `(${escapeHtml(when)}${ip ? `, from ${escapeHtml(ip)}` : ''}). You have been signed out everywhere.</p>` +
        `<p>If this was you, there is nothing else to do.</p>` +
        `<p><strong>If it was not you</strong>, ask for a new reset link from the <a href="${escapeHtml(adminUrl())}/login">login page</a> right away, and check who can read this mailbox.</p>`,
      mail: await getMailConfig(),
    })
  } catch (err) {
    logger.warn({ err: err.message }, 'Password changed email failed')
  }
}

/**
 * Server pe chalne wala aakhri raasta — `pnpm cms reset-password <email>` (D-110 §5).
 *
 * Mail wala reset tab kaam nahi karta jab SMTP hi toot jaaye (App Password badla, account band) ya
 * admin ka mailbox na rahe. Tab bhi koi andar aa sake — par **sirf wahi jiske paas server ka access
 * hai**. Isiliye ye koi route nahi, sirf CLI hai.
 *
 * Temporary password deta hai aur `mustChangePassword: true` lagata hai — agle login pe admin ko
 * naya password rakhna hi padta hai (`ChangePassword forced`, seed wala hi gate). Terminal ki history
 * me pada password isliye der tak kaam ka nahi rehta.
 *
 * Kisi bhi role pe chalta hai — server wala banda waise bhi sab kuch kar sakta hai; yahan role ki rok
 * sirf ek jhootha pehra hoti.
 *
 * @param {string} email
 * @returns {Promise<{ email: string, role: string, password: string }>}
 */
export async function issueTemporaryPassword(email) {
  const user = await User.findOne({
    email: String(email ?? '')
      .trim()
      .toLowerCase(),
  }).select('+passwordHash')
  if (!user) throw notFound(`No user with the email ${email}`)

  /** 18 akshar base64url ≈ 108 bit — `passwordSchema` (10+) se lamba, aur type karne layak. */
  const password = randomBytes(14).toString('base64url').slice(0, 18)

  user.passwordHash = await hashPassword(password)
  user.mustChangePassword = true
  /** Band account pe temporary password bekaar hota — login `disabled` pe rukta. Server wala chalu karta hai. */
  user.status = USER_STATUS.ACTIVE
  await user.save()

  await revokeAllSessions(user._id)
  await PasswordReset.deleteMany({ userId: user._id })

  return { email: user.email, role: user.role, password }
}

/** Expire ho chuke records hatana. TTL index bhi yahi karta hai — ye manual backup hai. */
export async function pruneExpiredTokens() {
  const result = await RefreshToken.deleteMany({ expiresAt: { $lte: new Date() } })
  return { deleted: result.deletedCount }
}

export { REFRESH_TTL_MS }
