import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/package-defaults` — admin side, authed.
 *
 * **Ek document hai, isliye koi `:id` nahi** — wahi shape jo `/api/settings` ka hai (D-40).
 *
 * Read `contributor` ke paas bhi hai: package editor "What's included" dikhata hai (bhale
 * hi edit na kare), aur bina read ke wo section chup-chaap khaali rehta.
 *
 * Write `editor` aur upar — ye data site ke **har** package pe chhapta hai, isliye wo wahi
 * boundary hai jo `taxonomy.*` aur baaki master lists pe hai.
 */
export const packageDefaultsRoutes = Router()

packageDefaultsRoutes.get(
  '/',
  requireAuth,
  requirePermission(PERMISSION.PACKAGE_DEFAULTS_READ),
  controller.get,
)

packageDefaultsRoutes.patch(
  '/',
  requireAuth,
  requirePermission(PERMISSION.PACKAGE_DEFAULTS_UPDATE),
  controller.update,
)
