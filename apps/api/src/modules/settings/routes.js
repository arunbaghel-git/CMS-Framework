import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import multer from 'multer'
import rateLimit from 'express-rate-limit'

import { isProd } from '../../core/env.js'
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
 * Settings ▸ Email / SMTP — site ka mail account (D-108).
 *
 * ⚠️ **Read `settings.read` pe hai, write `settings.update` pe** — wahi saancha jo baaki saari
 * settings screens ka hai (andar aane do, badalne ki rok alag). Padhne me password jaata hi nahi
 * (`getMailSettings()` sirf `hasPassword` deta hai), isliye editor ka is screen ko dekh lena kisi
 * credential ko nahi kholta.
 *
 * ⚠️ **Yahan `integrations` jaisi alag permission (`settings.scripts.update`) jaan-boojh kar NAHI
 * hai.** Wo ek privilege boundary isliye hai ki `<script>` **visitor ke browser me chalta hai** —
 * yaani us field se admin ka session churaya ja sakta hai. SMTP creds wo nahi karte; unse site ke
 * naam pe mail bheja ja sakta hai, jo bura hai par ek alag aur chhota darja hai. Naya permission
 * banane ka matlab hota spec 001 badalna aur roles sync karna — bina kisi asli faayde ke.
 */
settingsRoutes.get(
  '/mail',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_READ),
  controller.getMail,
)

settingsRoutes.patch(
  '/mail',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_UPDATE),
  controller.updateMail,
)

/**
 * `Send Test Email` ka apna limiter — **ye poore system ka ekmatra route hai jo bahar kuch
 * bhejta hai**, aur wahi use baaki settings routes se alag banata hai.
 *
 * Bina iske ek loop is button ko dabata rahe to do cheezein hoti hain: provider ka daily quota
 * khatam (aur uske baad **asli** enquiry notification girna shuru), ya us provider pe account
 * spam ke liye suspend. Dono ka lakshan wahi hai jo is repo me baar-baar aata hai — "mail aana
 * band ho gaya", bina kisi error ke.
 *
 * ⚠️ Global limiter is jagah kaam nahi aata: wo test me band hai (`isTest`, D-87) aur 1000/min pe
 * hai, jo mail ke liye bahut dheela hai. Wahi tark jo `loginLimiter` pe hai.
 *
 * Key sirf IP se — ye button ek hi logged-in admin dabata hai, `loginLimiter` wali email-wali
 * jodi ki zaroorat nahi.
 */
const testMailLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: isProd ? 5 : 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many test emails. Try again in a few minutes.',
    },
  },
})

/** POST hai, GET nahi — ye bahar mail bhejta hai, yaani state-changing (R13). */
settingsRoutes.post(
  '/mail/test',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_UPDATE),
  testMailLimiter,
  controller.sendTestMail,
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
