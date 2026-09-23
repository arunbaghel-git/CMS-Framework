import { clearAuthCookies, COOKIE, setAuthCookies } from '../../core/tokens.js'
import { unauthorized } from '../../core/errors.js'
import * as authService from './service.js'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from './validation.js'

/**
 * Patla controller — validate → service → response (R1).
 * Cookie set/clear yahan hota hai kyunki wo HTTP ki baat hai, business logic nahi.
 */

export async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body)
    const { user, tokens } = await authService.login(input, req)

    // `tokens.remember` service se aata hai (login pe `rememberMe`) — D-38
    setAuthCookies(res, tokens)

    res.json({ data: { user, csrfToken: tokens.csrfToken } })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE.REFRESH]
    if (!token) throw unauthorized('No session found. Please sign in again.')

    const { user, tokens } = await authService.refresh(token, req)

    /**
     * Persistence **session ki apni** hai, is request ki nahi — `refreshTokens` record
     * se aati hai (D-38). Pehle yahan `persistent: true` hardcoded tha, jisse "Remember
     * me" pehle auto-refresh ke baad hi bemaani ho jaata tha.
     */
    setAuthCookies(res, tokens)

    res.json({ data: { user, csrfToken: tokens.csrfToken } })
  } catch (err) {
    // Refresh fail = session khatam. Cookies chhod dena user ko infinite 401 loop me
    // phansa deta hai — wo refresh karta rehta hai aur har baar wahi fail hota hai.
    clearAuthCookies(res)
    next(err)
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.cookies?.[COOKIE.REFRESH])
    clearAuthCookies(res)
    res.json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
}

export async function changePassword(req, res, next) {
  try {
    const input = changePasswordSchema.parse(req.body)
    const { user, tokens } = await authService.changePassword(String(req.user._id), input, {
      req,
      // Cookie padhna HTTP ki baat hai, service ki nahi — isliye lookup ke liye yahan se jaata hai
      currentRefreshToken: req.cookies?.[COOKIE.REFRESH],
    })

    /**
     * Service purane saare sessions maar chuki hai — is browser ko naya dena zaroori
     * hai, warna user apna hi password badal kar logout ho jaata (D-37).
     *
     * Persistence wahi rehti hai jo login pe chuni thi (D-38): password badalna
     * "Remember me" ka faisla badalne ki jagah nahi hai.
     */
    setAuthCookies(res, tokens)

    res.json({ data: { user, csrfToken: tokens.csrfToken } })
  } catch (err) {
    next(err)
  }
}

/**
 * `Lost your password?` — D-110.
 *
 * ⚠️ **Jawab hamesha ek hi** — 200 aur wahi message, chahe email kisi ka ho ya na ho, admin ka ho ya
 * kisi Editor ka. Service ka `sent` yahan se **kabhi bahar nahi jaata**; wahi ek boolean batata ki
 * kaun administrator hai.
 */
export async function forgotPassword(req, res, next) {
  try {
    const input = forgotPasswordSchema.parse(req.body)
    await authService.requestPasswordReset(input, req)

    res.json({
      data: {
        ok: true,
        message:
          'If an administrator account exists for this email, a reset link has been sent. Check your inbox.',
      },
    })
  } catch (err) {
    next(err)
  }
}

/** Mail ke link se naya password — login **nahi** karwata, admin login screen pe jaata hai. */
export async function resetPassword(req, res, next) {
  try {
    const input = resetPasswordSchema.parse(req.body)
    await authService.resetPassword(input, req)

    res.json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
}
