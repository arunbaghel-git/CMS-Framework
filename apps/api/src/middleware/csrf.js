import { badRequest } from '../core/errors.js'
import { COOKIE, safeEqual } from '../core/tokens.js'

/**
 * Double-submit CSRF — architecture §8.1.
 *
 * Cookie me ek random token hai (`httpOnly` nahi), aur client ko wahi token
 * `X-CSRF-Token` header me bhejna hota hai. Dusra origin cookie **bhej** to sakta hai
 * par **padh** nahi sakta, isliye wo header match nahi kara paata.
 *
 * Ye `SameSite=Lax` ke upar hai, uski jagah nahi — defence in depth.
 */
export const CSRF_HEADER = 'x-csrf-token'

/** GET/HEAD/OPTIONS pe check nahi — kyunki state-changing GET hota hi nahi (R13). */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next()

  const cookieToken = req.cookies?.[COOKIE.CSRF]
  const headerToken = req.get(CSRF_HEADER)

  /**
   * Cookie hi nahi hai matlab logged-in session hai hi nahi — ise CSRF failure
   * batane ka koi fayda nahi, aage 401 waise hi aayega.
   */
  if (!cookieToken) return next()

  if (!headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(badRequest('CSRF token match nahi hua. Page refresh karke dobara koshish karein.'))
  }

  next()
}
