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
 * `settings.scripts.update` **is route pe nahi hai** — wo alag permission hai kyunki
 * `<script>` inject karna role escalation hai, settings field nahi.
 *
 * ✅ **22 Sep — wo screen ab ban gayi** (`Settings ▸ Integrations`, D-106) aur uska apna route
 * neeche hai. Ye line pehle "Wo Scripts screen ke saath aayegi (Phase 4)" kehti thi.
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
 * Settings ▸ Integrations — teesre tools ka code (D-106, client 22 Sep).
 *
 * ⚠️ **Alag route hone ki wajah permission hai, suvidha nahi.** `PATCH /` `settings.update`
 * maangta hai, ye `settings.scripts.update` — spec 001 me wo ek **privilege boundary** hai.
 *
 * ⚠️ **Aaj ye rok kuch nahi badalti, aur wo baat saaf likhi honi chahiye:** `settings.update` bhi
 * abhi **sirf admin** ke paas hai (editor settings padh sakta hai, badal nahi sakta — spec 001).
 * Alag rakhne ki wajah **aage** hai: Phase 7 ka custom-role builder kisi ko "settings sambhalo" dega,
 * aur us din `<script>` inject karna usme **apne aap** nahi aana chahiye. Spec 001 (19 Aug) ne ise
 * isiliye `privilege boundary` likha tha, "settings field" nahi.
 *
 * Doosra taala schema me hai — `updateSettingsSchema` me se `integrations` hata hua hai, isliye
 * upar wale route se wo likha hi nahi ja sakta.
 */
settingsRoutes.patch(
  '/integrations',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_SCRIPTS_UPDATE),
  controller.updateIntegrations,
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
