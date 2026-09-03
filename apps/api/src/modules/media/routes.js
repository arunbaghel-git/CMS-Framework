import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'
import { parseSingleMediaUpload } from './upload-middleware.js'

/**
 * `/api/media` foundation — list, upload, ek item, aur metadata update.
 *
 * Delete/trash/restore/purge, usage, folders, crop/rotate aur replace **jaan-boojh kar
 * yahan nahi hain** (D-41 §7). Delete ka raasta `mediaRefs` ke bina live page pe toota
 * hua image bana sakta hai, isliye wo route usage tracking ke saath hi khulega.
 */
export const mediaRoutes = Router()

mediaRoutes.get('/', requireAuth, requirePermission(PERMISSION.MEDIA_READ), controller.list)
mediaRoutes.post(
  '/',
  requireAuth,
  requirePermission(PERMISSION.MEDIA_UPLOAD),
  parseSingleMediaUpload,
  controller.create,
)
mediaRoutes.get('/:id', requireAuth, requirePermission(PERMISSION.MEDIA_READ), controller.getOne)
mediaRoutes.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.MEDIA_UPDATE),
  controller.update,
)

/**
 * Delete = **trash** (R12) — file disk pe rehti hai, sirf `deletedAt` lagta hai.
 *
 * Permanent delete (`media.purge`) ka koi route abhi nahi hai, aur wo jaan-boojh kar hai:
 * `mediaRefs` backlink index bana hi nahi, to "ye image kahan lagi hai" ka jawab kisi ke paas
 * nahi. Bina us jawab ke file mitana ek chup toot hai.
 */
mediaRoutes.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.MEDIA_DELETE),
  controller.remove,
)
