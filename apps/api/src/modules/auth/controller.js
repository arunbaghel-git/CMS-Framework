import { clearAuthCookies, COOKIE, setAuthCookies } from '../../core/tokens.js'
import { unauthorized } from '../../core/errors.js'
import * as authService from './service.js'
import { changePasswordSchema, loginSchema } from './validation.js'

/**
 * Patla controller — validate → service → response (R1).
 * Cookie set/clear yahan hota hai kyunki wo HTTP ki baat hai, business logic nahi.
 */

export async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body)
    const { user, tokens } = await authService.login(input, req)

    setAuthCookies(res, { ...tokens, persistent: input.rememberMe })

    res.json({ data: { user, csrfToken: tokens.csrfToken } })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE.REFRESH]
    if (!token) throw unauthorized('Session nahi mila. Dobara login karein.')

    const { user, tokens } = await authService.refresh(token, req)

    /**
     * Refresh pe cookie hamesha persistent set hoti hai. "Remember me" off wale user
     * ki refresh cookie session cookie thi — browser band hone pe wo chali gayi,
     * isliye yahan tak pahunchne ka matlab hai session abhi chalu hai.
     */
    setAuthCookies(res, { ...tokens, persistent: true })

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
    await authService.changePassword(String(req.user._id), input)

    // Saare sessions revoke ho chuke — is browser ko bhi dobara login karna hoga
    clearAuthCookies(res)

    res.json({ data: { ok: true, message: 'Password badal gaya. Dobara login karein.' } })
  } catch (err) {
    next(err)
  }
}
