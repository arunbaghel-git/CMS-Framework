import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/redirects` — admin side, authed.
 *
 * D-49 me sirf read + delete the (redirect apne aap bante the). 17 Sep se create + update bhi —
 * `Settings ▸ 301 Redirects` (D-97). Permissions pehle se `redirect.*` me thin.
 */
export const redirectRoutes = Router()

redirectRoutes.get('/', requireAuth, requirePermission(PERMISSION.REDIRECT_READ), controller.list)

redirectRoutes.post(
  '/',
  requireAuth,
  requirePermission(PERMISSION.REDIRECT_CREATE),
  controller.create,
)

redirectRoutes.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.REDIRECT_UPDATE),
  controller.update,
)

redirectRoutes.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.REDIRECT_DELETE),
  controller.remove,
)
