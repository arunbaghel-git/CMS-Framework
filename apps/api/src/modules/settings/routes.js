import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import multer from 'multer'

import { badRequest } from '../../core/errors.js'
import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/settings` — ek hi document, isliye koi `:id` nahi.
 *
 * Read aur update ki permissions **alag** hain: `editor` settings padh sakta hai (uske
 * bina wo date format ya site title jaise cheezein dekh hi nahi paata) par badal nahi
 * sakta (spec 001).
 *
 * `settings.scripts.update` yahan **nahi** hai — wo alag permission hai kyunki
 * `<script>` inject karna role escalation hai, settings field nahi. Wo Scripts screen
 * ke saath aayegi (Phase 4).
 */
export const settingsRoutes = Router()

settingsRoutes.get('/', requireAuth, requirePermission(PERMISSION.SETTINGS_READ), controller.get)

// PATCH hai, POST nahi — partial update hi asli behaviour hai
settingsRoutes.patch(
  '/',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_UPDATE),
  controller.update,
)

/**
 * Settings ▸ Fonts ▸ Custom font upload (client, 17 Sep). Memory me, 2MB tak — asli jaanch (magic bytes)
 * `fonts.js` me. Media Library me nahi jaata: font image nahi hai, aur Library ka har hissa image maanta hai.
 */
const fontUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 2 * 1024 * 1024 },
})

function parseFontUpload(req, res, next) {
  fontUpload.single('file')(req, res, (err) => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      return next(
        badRequest(
          err.code === 'LIMIT_FILE_SIZE' ? 'Font file is too large (max 2MB)' : err.message,
        ),
      )
    }
    return next(err)
  })
}

settingsRoutes.post(
  '/fonts',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_UPDATE),
  parseFontUpload,
  controller.uploadFont,
)
