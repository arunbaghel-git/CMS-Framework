import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/taxonomies` — admin side, sab authed.
 *
 * **Ek hi routes file chaaron vocabularies ko serve karti hai** (Categories, Tags,
 * Destinations, Package Type) — `?type=` se. Alag route prefix banane ka matlab hota
 * chaar baar wahi CRUD, aur `type` ka enum do jagah.
 *
 * Read `taxonomy.read` pe hai jo `contributor` ke paas bhi hai — bina uske package edit
 * karte waqt Destinations ka dropdown khaali rehta. Write `editor` aur upar.
 *
 * **Delete permanent hai, isliye DELETE** — taxonomy content nahi hai, uska trash nahi
 * hota (D-25 content pe lagta hai).
 */
export const taxonomyRoutes = Router()

taxonomyRoutes.get('/', requireAuth, requirePermission(PERMISSION.TAXONOMY_READ), controller.list)
taxonomyRoutes.get('/:id', requireAuth, requirePermission(PERMISSION.TAXONOMY_READ), controller.get)

taxonomyRoutes.post(
  '/',
  requireAuth,
  requirePermission(PERMISSION.TAXONOMY_CREATE),
  controller.create,
)

taxonomyRoutes.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.TAXONOMY_UPDATE),
  controller.update,
)

taxonomyRoutes.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.TAXONOMY_DELETE),
  controller.remove,
)
