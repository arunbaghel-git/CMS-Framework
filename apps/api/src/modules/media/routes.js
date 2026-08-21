import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'
import { parseSingleMediaUpload } from './upload-middleware.js'

/**
 * `/api/media` foundation.
 *
 * Upload, storage drivers, delete/trash/restore/purge, usage, folders, crop/rotate and
 * replace are intentionally not here yet (D-41). This route only exposes existing media
 * metadata once upload support starts creating records.
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
mediaRoutes.patch('/:id', requireAuth, requirePermission(PERMISSION.MEDIA_UPDATE), controller.update)
