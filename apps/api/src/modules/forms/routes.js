import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import { enquiryController, formController } from './controller.js'

const isProd = process.env.NODE_ENV === 'production'

/**
 * `/api/forms` — admin side, sab authed.
 *
 * **Delete permanent hai, isliye DELETE** — form content nahi hai, uska trash nahi hota
 * (D-25 content pe lagta hai). Par jis form pe enquiries aa chuki hain wo delete hota hi
 * nahi; service 422 deti hai aur "Draft kar do" kehti hai.
 *
 * **Read `contributor` ke paas bhi hai** — package editor me aage "Enable enquiry form"
 * wala chunav aayega, aur uske bina wo dropdown khaali rehta. Khaali dropdown "kuch nahi
 * mila" jaisa dikhta hai, "aapko permission nahi" jaisa nahi.
 */
export const formRoutes = Router()

formRoutes.get('/', requireAuth, requirePermission(PERMISSION.FORM_READ), formController.list)
formRoutes.get('/:id', requireAuth, requirePermission(PERMISSION.FORM_READ), formController.get)
formRoutes.post('/', requireAuth, requirePermission(PERMISSION.FORM_CREATE), formController.create)
formRoutes.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.FORM_UPDATE),
  formController.update,
)
formRoutes.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.FORM_DELETE),
  formController.remove,
)

/**
 * `/api/enquiries` — inbox (3 Sep). Sab authed, `submission.*` permissions pe.
 *
 * Enquiries ka apna module **nahi** hai: wo `forms` module me hi rehti hain, wahi tark jo
 * `menus` + `menuLocations` pe hai — enquiry form ke bina bemaani hai.
 *
 * ⚠️ **Export `GET` hai aur wo theek hai** — wo kuch badalta nahi, sirf padh kar CSV deta
 * hai. R13 (`state-changing GET kabhi nahi`) method ka niyam hai, download ka nahi.
 *
 * ⚠️ **`delete` sirf admin ke paas hai** — `submission.delete` editor ko nahi mili. Wahi
 * lakeer jo `entry.purge` pe hai: enquiry kisi asli grahak ka record hai.
 */
export const enquiryRoutes = Router()

enquiryRoutes.get(
  '/',
  requireAuth,
  requirePermission(PERMISSION.SUBMISSION_READ),
  enquiryController.list,
)
/**
 * Sirf ginti — topbar ka ✉ badge (A-53, 24 Sep). Poori list ka call har route badalne pe
 * aur har minute chalana bekaar bojh hota.
 *
 * ⚠️ `/:id` se **pehle** — warna `counts` ek enquiry ki id samjha jaata.
 */
enquiryRoutes.get(
  '/counts',
  requireAuth,
  requirePermission(PERMISSION.SUBMISSION_READ),
  enquiryController.counts,
)
/** Dashboard ka ✉ card + "last 7 days" ke bars (A-54). Wahi pehra — `/:id` se pehle. */
enquiryRoutes.get(
  '/stats',
  requireAuth,
  requirePermission(PERMISSION.SUBMISSION_READ),
  enquiryController.stats,
)
enquiryRoutes.get(
  '/export',
  requireAuth,
  requirePermission(PERMISSION.SUBMISSION_EXPORT),
  enquiryController.exportCsv,
)
enquiryRoutes.post(
  '/bulk',
  requireAuth,
  requirePermission(PERMISSION.SUBMISSION_UPDATE),
  enquiryController.bulk,
)
enquiryRoutes.get(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.SUBMISSION_READ),
  enquiryController.get,
)
enquiryRoutes.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.SUBMISSION_UPDATE),
  enquiryController.update,
)

/**
 * Enquiry submit pe apni alag rate limit — global 120/min yahan bahut dheeli hai.
 *
 * Ye endpoint **bina auth ke** hai aur seedha DB me likhta hai: 120 per minute se ek bot
 * ek ghante me 7,200 kachra enquiries daal sakta hai, aur unhe haath se saaf karna client ka
 * kaam ban jaata. Paanch per 10 minute asli user ke liye kaafi hai — koi ek page se do-teen
 * baar se zyada enquiry nahi bhejta.
 *
 * Key sirf IP se hai. Login wali key me email bhi thi (taaki ek office ke users ek doosre
 * ko lock na karein), par yahan wo ulta hota: bot har baar naya email bhej kar limit se
 * nikal jaata.
 *
 * ⚠️ Ye honeypot ke **saath** hai, uski jagah nahi. Honeypot bina soche bharne wale bots
 * rokta hai, rate limit unhe jo soch kar bharte hain.
 */
const submitLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: isProd ? 5 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many enquiries from this connection. Try again in a few minutes.',
    },
  },
})

/**
 * `POST /api/public/enquiries` — public module se mount hoti hai.
 *
 * Ye **state badalti hai**, isliye POST — R13 (`state-changing GET kabhi nahi`). Baaki
 * `/api/public/*` sab read-only hai; ye us niyam ka apwaad nahi hai, wo niyam method ka
 * hai, path ka nahi.
 */
export const publicEnquiryRoutes = Router()

publicEnquiryRoutes.post('/', submitLimiter, enquiryController.submit)
