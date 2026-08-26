import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/content-types` — admin side, sab authed.
 *
 * **Read ki permission `contentType.read` hai, aur wo `editor` ke paas bhi hai**
 * (spec 001): entry editor ko har save pe type ka field set aur URL pattern chahiye,
 * to bina read ke wo screen khul hi nahi sakti.
 *
 * **Write sirf `admin` ke paas hai** — `contentType.create/update/delete` `ROLE_PERMISSIONS`
 * me sirf admin ko mile hain. Wajah wahi hai jo `settings.scripts.update` pe likhi hai:
 * `urlPattern` badalna poori site ke URL badal deta hai, aur naya type banana admin ke
 * nav me nayi screen jodta hai. Ye configuration hai, content nahi.
 *
 * Content-type **builder ki UI Phase 6** me hai. Ye routes abhi isliye hain ki engine
 * ko inki zaroorat hai (D-46) — Slice 1 me inhe seed hi bharta hai.
 */
export const contentTypeRoutes = Router()

contentTypeRoutes.get(
  '/',
  requireAuth,
  requirePermission(PERMISSION.CONTENT_TYPE_READ),
  controller.list,
)

contentTypeRoutes.get(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.CONTENT_TYPE_READ),
  controller.get,
)

contentTypeRoutes.post(
  '/',
  requireAuth,
  requirePermission(PERMISSION.CONTENT_TYPE_CREATE),
  controller.create,
)

contentTypeRoutes.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.CONTENT_TYPE_UPDATE),
  controller.update,
)

/**
 * Permanent delete hai (soft nahi) — isliye `contentType.delete`, jo sirf admin ke paas
 * hai. Ye `entry.purge` / `media.purge` wala hi rule hai: jo kaam wapas nahi ho sakta,
 * uski permission ek hi role ke paas rehti hai.
 */
contentTypeRoutes.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.CONTENT_TYPE_DELETE),
  controller.remove,
)
