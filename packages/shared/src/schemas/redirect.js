import { z } from 'zod'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '../constants/index.js'
import { normalizePath } from '../path.js'

/**
 * `redirects` ka contract — A-6, D-49, aur haath wala hissa D-97 (client, 17 Sep).
 *
 * D-49 me sirf **auto** wala aadha bana tha: slug badalne pe purana URL zinda rahe. 17 Sep ko
 * `/packages/` pe 404 mila aur client ne WordPress ke Redirection plugin jaisa screen maanga —
 * `Settings ▸ 301 Redirects`. Ab admin khud `from → to` bana sakta hai.
 */

export const REDIRECT_STATUS_CODES = Object.freeze([301, 302])

const statusCodeSchema = z.union([z.literal(301), z.literal(302)])

/**
 * Kahan se — hamesha **isi site ka path** (D-97 §2).
 *
 * `pathSchema` (entries wala) yahan **nahi** lagta: wo sirf lowercase slug maanta hai, aur
 * redirect ka sabse bada kaam purane site ke URL pakadna hai — `/Old-Page.html`, `/tour_2019`.
 * Wo shape rok diya to wahi URL redirect ho hi nahi sakte jinke liye screen bani hai.
 *
 * Normalize hota hai (trailing slash hata, lowercase) — `findRedirect()` bhi lookup se pehle
 * yahi karta hai. Dono taraf ek hi niyam, warna `/Packages/` likha hua redirect kabhi match hi
 * na hota aur koi error bhi na aata.
 *
 * ⚠️ `/` **mana hai** — home pe redirect ka matlab poori site ka pehla page gayab.
 */
export const redirectFromSchema = z
  .string()
  .trim()
  .min(1, 'From is required')
  .max(1000)
  .refine(
    (v) => v.startsWith('/') && !v.startsWith('//'),
    'From must start with / — e.g. /packages',
  )
  .refine((v) => !/[\s?#]/.test(v), 'From is a path only — no spaces, ? or #')
  .transform((v) => normalizePath(v).toLowerCase())
  .refine((v) => v !== '/', 'The home page cannot be redirected')

/**
 * Kahan ko — site ka path **ya** bahar ka `https://` URL (D-97 §2).
 *
 * Bahar wala isliye ki `/whatsapp` → `https://wa.me/…` jaise chhote link brochure pe chhapte hain.
 * Sirf `https:` — `javascript:`/`data:` yahan kabhi nahi aane chahiye (wo Location header se
 * browser tak jaate), aur `http:` ka koi asli kaam nahi bacha.
 *
 * Path pe `?`/`#` **allowed** hai (`/contact?from=brochure`) — `from` pe nahi, kyunki resolve query
 * string dekhta hi nahi.
 */
export const redirectToSchema = z
  .string()
  .trim()
  .min(1, 'To is required')
  .max(1000)
  .refine((v) => !/\s/.test(v), 'To cannot contain spaces')
  .refine((v) => {
    if (v.startsWith('/')) return !v.startsWith('//')
    try {
      return new URL(v).protocol === 'https:'
    } catch {
      return false
    }
  }, 'To must be a path on this site (/tour-packages) or a full https:// link')
  .transform((v) => {
    if (!v.startsWith('/')) return v
    const cut = v.search(/[?#]/)
    return cut === -1 ? normalizePath(v) : `${normalizePath(v.slice(0, cut))}${v.slice(cut)}`
  })

/** `to` bahar ka link hai? — chain flatten aur loop ki jaanch sirf site ke path pe lagti hai. */
export const isExternalRedirect = (to) => !String(to ?? '').startsWith('/')

export const redirectSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  /**
   * Day 1 se reserve — aur yahan ye **uniqueness ka hissa** hai (`{siteId, locale, from}`).
   *
   * Wahi test jo D-48 §3 me laga tha: `locale` wahan day 1 se chahiye jahan unique index
   * hai. `02-ARCHITECTURE` §3.3 pehle `{siteId, from}` likhta tha — wo menus wali hi galti
   * ka agla roop hota.
   */
  locale: z.string().default(DEFAULT_LOCALE),

  /** Purana path — yahi wo URL hai jo kisi ne share kar rakha hai. */
  from: redirectFromSchema,
  to: redirectToSchema,

  /**
   * `301` = permanent (slug badla), `302` = temporary.
   *
   * Auto-redirect hamesha `301` hota hai: slug badalna ek permanent faisla hai, aur `302`
   * bhejne ka matlab hai search engine purana URL index me rakhe rahe.
   */
  statusCode: statusCodeSchema.default(301),

  /**
   * Kitni baar chala — ⚠️ **abhi koi nahi ginta** (D-97 §5). Resolve ISR ke peeche hai, to
   * ginti jhoothi aati, aur GET me likhna R13 todta.
   */
  hits: z.number().int().nonnegative().default(0),

  /**
   * `true` = system ne banaya (slug badalne pe), `false` = admin ne haath se.
   *
   * Farq zaroori hai: auto-redirect admin ke banaye redirect ko **kabhi overwrite nahi karta**
   * (`recordAutoRedirect()`), aur admin kisi auto wale ko edit kare to wo manual ban jaata hai.
   */
  isAuto: z.boolean().default(true),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

/** Admin ka banaya redirect — `Settings ▸ 301 Redirects` (D-97). */
export const createRedirectSchema = z
  .object({
    from: redirectFromSchema,
    to: redirectToSchema,
    statusCode: statusCodeSchema.default(301),
  })
  .strict()

export const updateRedirectSchema = z
  .object({
    from: redirectFromSchema.optional(),
    to: redirectToSchema.optional(),
    statusCode: statusCodeSchema.optional(),
  })
  .strict()

/** Har query param Zod se (R9). */
export const redirectListQuerySchema = z.object({
  q: z.string().max(1000).optional(),
  /**
   * ⚠️ `z.coerce.boolean()` **nahi** — `Boolean('false') === true` hai, yaani "Manual" filter
   * chupke se "Automatic" dikhata. Wahi bug jo 20 Aug ko `COOKIE_SECURE` pe mila tha.
   */
  isAuto: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
