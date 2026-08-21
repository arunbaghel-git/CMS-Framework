import { z } from 'zod'

import { DEFAULT_SITE_ID } from '../constants/index.js'
import { emailSchema } from './user.js'

/**
 * `settings` ka contract — 02-ARCHITECTURE §3, spec 004 §3.
 *
 * **Ek instance = ek document** (D-01). Singleton hone ka matlab ye hai ki naya field
 * jodna sasta hai — backfill karne ko ek hi row hoti hai. Isliye yahan sirf wahi fields
 * hain jo **abhi** chahiye; SEO defaults, title templates aur scripts apne-apne screen
 * ke saath aayenge (Phase 4).
 *
 * `siteId` phir bhi day 1 se hai (D-01) — wo uniqueness constraint hai, aur wo baad me
 * jodna mehnga hota hai.
 */

/**
 * Timezone ki poori IANA list 400+ lambi hai aur usme se 99% is client ke kisi kaam ki
 * nahi. Ye chhoti list dono jagah chalti hai — UI ka dropdown aur server ka validation.
 * Client ko aur chahiye to yahan add karo, do jagah nahi.
 */
export const TIMEZONES = Object.freeze([
  'Asia/Kolkata',
  'UTC',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
])

/** Value wahi token hai jo formatting me jaata hai; label UI banata hai. */
export const DATE_FORMATS = Object.freeze(['d MMM yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'])

export const CURRENCIES = Object.freeze(['INR', 'USD', 'EUR', 'GBP'])

/** Homepage pe kya dikhe — static page ya latest posts. */
export const FRONT_PAGE_TYPE = Object.freeze({ PAGE: 'page', POSTS: 'posts' })
export const FRONT_PAGE_TYPES = Object.freeze(Object.values(FRONT_PAGE_TYPE))

/**
 * Khaali chhoda ja sakne wala text.
 *
 * `.trim()` pehle chalta hai (wahi galti jo `emailSchema` me pakdi gayi thi) — warna
 * sirf spaces wali value "bhari hui" gin li jaati hai.
 */
const optionalText = (max) => z.string().trim().max(max).default('')

/** Social link — khaali ya poora URL. Aadha-adhoora "instagram.com/x" reject hota hai. */
const socialUrl = z.union([
  z.literal(''),
  z.string().trim().url('Enter the full address, starting with https://'),
])

export const SOCIAL_KEYS = Object.freeze(['instagram', 'facebook', 'youtube'])

/** Teenon keys ek hi jagah se — do list rakhne se ek din wo alag ho jaati hain. */
const socialShape = (value) => Object.fromEntries(SOCIAL_KEYS.map((key) => [key, value]))

const socialSchema = z.object(socialShape(socialUrl.default('')))

/**
 * Update ke liye har link **optional** hai, default wala nahi.
 *
 * Ye farq asli hai aur test ne pakda tha: default wale shape me
 * `{ social: { instagram: 'x' } }` parse hote hi facebook aur youtube `''` ban jaate
 * the — yaani ek link badalne se **baaki do chup-chaap ud jaate**. Service dot-notation
 * theek use kar rahi thi; schema uski mehnat pehle hi bekaar kar deta tha.
 */
const socialUpdateSchema = z.object(socialShape(socialUrl.optional()))

export const settingsSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  // ── Site identity ───────────────────────────────────────────────────────────
  siteName: z.string().trim().min(1, 'Site title is required').max(120).default('My Site'),
  tagline: optionalText(200),
  /**
   * Notification aur "from" address ke liye. Ye admin **user** ke email se alag hai:
   * user badal sakta hai, site ka contact address wahi rehta hai.
   */
  adminEmail: z.union([z.literal(''), emailSchema]).default(''),
  /** Media Phase 2 me aayega — jagah abhi, data baad me (D-30). */
  logoMediaId: z.string().nullable().default(null),
  faviconMediaId: z.string().nullable().default(null),

  // ── Locale & currency ───────────────────────────────────────────────────────
  timezone: z.enum(/** @type {[string, ...string[]]} */ (TIMEZONES)).default('Asia/Kolkata'),
  dateFormat: z.enum(/** @type {[string, ...string[]]} */ (DATE_FORMATS)).default('d MMM yyyy'),
  currency: z.enum(/** @type {[string, ...string[]]} */ (CURRENCIES)).default('INR'),

  // ── Contact & social ────────────────────────────────────────────────────────
  phone: optionalText(40),
  whatsapp: optionalText(40),
  address: optionalText(500),
  social: socialSchema.default({}),

  // ── Homepage & archives ─────────────────────────────────────────────────────
  frontPageType: z
    .enum(/** @type {[string, ...string[]]} */ (FRONT_PAGE_TYPES))
    .default(FRONT_PAGE_TYPE.PAGE),
  /** Dono Phase 1 me judenge — `entries` collection abhi hai hi nahi (D-30). */
  homepageEntryId: z.string().nullable().default(null),
  postsPageEntryId: z.string().nullable().default(null),
  postsPerPage: z.coerce.number().int().min(1).max(100).default(10),

  /**
   * **Default `false` jaan-boojh kar** (spec 004 §3).
   *
   * Naya instance hamesha staging hota hai. `true` default rakhne ka matlab hota ki
   * har naya client ka adhoora site Google me index ho jaaye, aur wo live site se
   * compete kare. Launch pe ise manually on karna padta hai.
   *
   * Iska UI Phase 4 (SEO screen) me aayega; field aaj se maujood hai taaki public site
   * bante hi wo isse padh sake.
   */
  searchEngineVisible: z.boolean().default(false),
})

/**
 * Admin jo badal sakta hai.
 *
 * `siteId` yahan **nahi** hai — wo instance ki pehchaan hai, setting nahi.
 * `.pick()`/`.omit()` se list banane ka fayda yahi hai: kal koi naya field jodega to wo
 * apne aap editable nahi ho jaayega.
 */
export const updateSettingsSchema = settingsSchema
  .omit({ siteId: true })
  .partial()
  // `.partial()` sirf upar wale level pe lagti hai — nested `social` ko alag se batana padta hai
  .extend({ social: socialUpdateSchema.partial().optional() })

/** Naye instance ke defaults — seed aur test dono yahi use karte hain. */
export function defaultSettings(overrides = {}) {
  return settingsSchema.parse({ ...overrides })
}

/**
 * Client ko settings ka **yahi** shape jaata hai.
 *
 * `toPublicUser` wali wajah se: ek hi jagah se banta hai, taaki koi naya endpoint galti
 * se poora Mongoose document na bhej de. Yahan `passwordHash` jaisa koi secret to nahi
 * hai, par `_id` aur `__v` bhejne ka bhi koi matlab nahi — aur kal koi internal field
 * jud gaya to wo apne aap bahar nahi jaayega.
 *
 * @param {any} doc Mongoose settings document ya plain object
 */
export function toPublicSettings(doc) {
  if (!doc) return null

  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  // `createdAt` bahar isliye hai ki wo client ke kisi kaam ka nahi — `updatedAt` hai
  const { _id, __v, createdAt: _createdAt, ...rest } = plain

  return { ...settingsSchema.parse(rest), updatedAt: plain.updatedAt ?? null }
}
