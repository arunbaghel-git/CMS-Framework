import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/redirects` — admin side, authed.
 *
 * **Sirf read aur delete.** Slice 3 me redirects apne aap bante hain (slug badalne pe);
 * `redirect.create` aur `redirect.update` ke routes Phase 4 ke manager ke saath aayenge.
 *
 * Delete abhi isliye hai ki ek galat bane hue auto-redirect ko hatane ka koi raasta na
 * hona matlab admin ko us URL pe hamesha ke liye phansa dena.
 */
export const redirectRoutes = Router()

redirectRoutes.get('/', requireAuth, requirePermission(PERMISSION.REDIRECT_READ), controller.list)

redirectRoutes.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.REDIRECT_DELETE),
  controller.remove,
)
