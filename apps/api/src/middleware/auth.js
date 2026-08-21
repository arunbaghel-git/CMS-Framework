import { USER_STATUS } from '@cms/shared'

import { forbidden, unauthorized } from '../core/errors.js'
import { COOKIE, verifyAccessToken } from '../core/tokens.js'
import { User } from '../modules/users/model.js'
import { getRolePermissions } from '../modules/roles/service.js'

/**
 * Authentication + RBAC — spec 001, architecture §8.3.
 *
 * Har admin route pe `requirePermission('...')`. Role string ka check
 * (`if (user.role === 'admin')`) kabhi nahi — usse custom roles (Phase 7) impossible
 * ho jaate hain aur permission logic poore codebase me bikhar jaata hai.
 */

/**
 * Token se user nikaalta hai. **Reject nahi karta** — wo `requireAuth` ka kaam hai.
 *
 * Har request pe user DB se aata hai (role cached hai, user nahi). Ye ek query ki
 * keemat pe ek zaroori guarantee deta hai: deactivate kiya gaya user **agli hi
 * request pe** bahar ho jaata hai, 15 minute baad nahi jab uska access token expire ho.
 */
export async function attachUser(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE.ACCESS]
    if (!token) return next()

    const payload = verifyAccessToken(token)
    if (!payload?.sub) return next()

    const user = await User.findById(payload.sub).lean()
    if (!user || user.status !== USER_STATUS.ACTIVE) return next()

    req.user = user
    req.permissions = await getRolePermissions(user.role)

    next()
  } catch (err) {
    next(err)
  }
}

/** Login zaroori — bina iske 401. */
export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized())
  next()
}

/**
 * Permission check. String leta hai, 403 deta hai.
 *
 * `.own` variants (`entry.update.own`) yahan **nahi** handle hote — wo service layer
 * ka kaam hai, kyunki authorId compare karne ke liye document chahiye jo yahan hai
 * hi nahi (spec 001, implementation notes).
 *
 * @param {string} permission
 */
export function requirePermission(permission) {
  return function permissionGuard(req, _res, next) {
    if (!req.user) return next(unauthorized())
    if (!req.permissions?.includes(permission)) {
      return next(forbidden(`Missing permission: ${permission}`))
    }
    next()
  }
}

/**
 * Do me se koi ek permission kaafi ho — jaise `entry.update` YA `entry.update.own`.
 * Asli `.own` check phir bhi service me hota hai.
 *
 * @param {...string} permissions
 */
export function requireAnyPermission(...permissions) {
  return function anyPermissionGuard(req, _res, next) {
    if (!req.user) return next(unauthorized())
    if (!permissions.some((p) => req.permissions?.includes(p))) {
      return next(forbidden(`Missing permission: ${permissions.join(' or ')}`))
    }
    next()
  }
}
