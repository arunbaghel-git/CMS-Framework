import { z } from 'zod'
import {
  AVAILABILITIES,
  AVAILABILITY,
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  ENTRY_STATUSES,
  RESERVED_SLUGS,
  TAXONOMY_REF_KEYS,
} from '../constants/index.js'
import { contentSchema, emptyContent } from './content.js'
import { emptySeo, seoSchema } from './seo.js'

/**
 * Entry schema — spec 002. Poora system isi pe khada hai.
 *
 * "Sab kuch content hai" (D-04): pages, posts aur custom types sab ek hi collection
 * me hain, `type` field se alag. UI me `entries` shabd kabhi nahi dikhta (R11).
 */

/** Sirf lowercase, digits aur hyphen. Slug URL ka hissa banta hai. */
export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug me sirf chhote letters, numbers aur hyphen')
  .refine((s) => !RESERVED_SLUGS.includes(s), {
    message: `Ye slug reserved hai: ${RESERVED_SLUGS.join(', ')}`,
  })

/**
 * Stored public path — routing ka **single source of truth** (D-09).
 *
 * `{siteId, locale, path}` unique hai. Iske bina ek `page` "about" aur ek `service`
 * "about" dono `/about` pe resolve kar sakte hain, aur `{siteId, type, slug}` unique
 * hone ke baawajood ye collision pakda hi nahi jaata.
 */
export const pathSchema = z
  .string()
  .min(1)
  .max(1000)
  .regex(
    /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/,
    'Path `/` se shuru ho, lowercase ho',
  )

/**
 * Entry kaunsi taxonomies me hai — **type ke hisaab se ek key** (A-7, D-49).
 *
 * Pehle ye `{ categories, tags }` tha — do hardcoded keys. Packages ko Destinations aur
 * Package Type chahiye the, aur unhe `fields` me daalne ka matlab hota ki ek hi cheez
 * (taxonomy reference) do jagah, do tareeke se rehti: `tax:{id}` cache tag, taxonomy
 * archive aur "kya koi entry ise use kar rahi hai" wala delete guard — teenon sirf aadhe
 * types pe kaam karte.
 *
 * `categories` aur `tags` ab bhi hamesha maujood hain (default `[]`), isliye jo code
 * unhe seedha padhta hai wo waise ka waisa chalta hai.
 *
 * Keys `TAXONOMY_REF_KEY` se aati hain — nayi taxonomy type jodne pe yahan kuch nahi
 * badalta.
 */
export const taxonomyRefsSchema = z
  .object(
    Object.fromEntries(TAXONOMY_REF_KEYS.map((key) => [key, z.array(z.string()).default([])])),
  )
  /**
   * `.strict()` **zaroori** hai. Zod default me anjaan keys chup-chaap **hata deta hai** —
   * uske bina `taxonomies: { destination: [...] }` (singular, galat key) bina kisi error ke
   * gayab ho jaata: admin Save karta, "ho gaya" dikhta, aur uska chuna hua destination
   * kahin nahi hota. Ye bilkul wahi trap hai jo spec 006 me `leafItemSchema` pe pakda gaya
   * tha (D-43 §3).
   */
  .strict()

/** Khaali refs — har key ek khaali array. */
export function emptyTaxonomyRefs() {
  return Object.fromEntries(TAXONOMY_REF_KEYS.map((key) => [key, []]))
}

/** Poori stored shape — DB me entry aisi dikhti hai. */
export const entrySchema = z.object({
  // Multi-site insurance — aaj koi query isse filter nahi karti (§3.2)
  siteId: z.string().default(DEFAULT_SITE_ID),
  // Multi-language insurance — feature baad me, field day 1 se
  locale: z.string().default(DEFAULT_LOCALE),

  type: z
    .string()
    .min(1)
    .regex(/^[a-z][a-zA-Z0-9]*$/, 'contentType key camelCase hona chahiye'),

  title: z.string().min(1).max(300),
  slug: slugSchema,
  path: pathSchema,

  status: z.enum(ENTRY_STATUSES).default('draft'),

  /**
   * Bikri khuli hai ya band — `status` se **alag** (D-50).
   *
   * Top-level hai, `fields` me nahi: ye publishing lifecycle ki cheez hai (design ke
   * Publish panel me `status` ke bagal me baithti hai), content ka data nahi. Aur
   * `fields` `Mixed` hai — wahan ise typed enum nahi mil sakta, aur list ka "Sold Out"
   * tab ek unvalidated field pe filter karta.
   *
   * Jin types ke `supports` me `availability` nahi hai, unpe ye hamesha `open` rehta hai.
   */
  availability: z.enum(AVAILABILITIES).default(AVAILABILITY.OPEN),
  /** `scheduled` status ke saath zaroori. Cron atomic claim isi index pe chalti hai. */
  publishAt: z.coerce.date().nullable().default(null),

  authorId: z.string().nullable().default(null),
  templateId: z.string().nullable().default(null),
  parentId: z.string().nullable().default(null),
  featuredImageId: z.string().nullable().default(null),

  content: contentSchema.default(emptyContent),
  /** contentType ke custom fields. Mixed rehta hai (D-21) — validation contentType se. */
  fields: z.record(z.unknown()).default({}),
  seo: seoSchema.default(emptySeo),
  taxonomies: taxonomyRefsSchema.default(emptyTaxonomyRefs),

  excerpt: z.string().max(1000).optional(),
  order: z.number().int().default(0),

  /** Flattened text — Mongo ek hi text index deta hai, isliye ye denormalized hai. */
  searchText: z.string().default(''),

  /** Optimistic concurrency. Mismatch pe API 409 deta hai. */
  version: z.number().int().nonnegative().default(0),

  /**
   * Trash. `status: 'trash'` NAHI (D-25) — status chhua nahi jaata, isliye restore pe
   * entry apni purani state me wapas aati hai (published thi to published hi).
   *
   * Har list query me `deletedAt: null` filter zaroori hai — service layer ka default
   * ho, controller ka nahi.
   */
  deletedAt: z.coerce.date().nullable().default(null),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

/** API pe create ke waqt kya accept hota hai. Server `path`, `version`, `searchText` khud likhta hai. */
export const entryCreateSchema = entrySchema
  .omit({
    path: true,
    version: true,
    searchText: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial({
    slug: true, // title se auto-generate ho jaayega
    siteId: true,
    locale: true,
  })

/**
 * Update — sab optional, par `version` **zaroori** hai.
 *
 * Bina version ke: 30s autosave + do editor = silent lost update. Isliye client
 * apna version bhejta hai aur mismatch pe 409 milta hai.
 */
export const entryUpdateSchema = entrySchema
  .omit({ path: true, searchText: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({ version: z.number().int().nonnegative() })

/** Admin list query. Har param validated — kuch bhi seedha Mongoose query me nahi jaata (R9). */
export const entryListQuerySchema = z.object({
  type: z.string().optional(),
  status: z.enum(ENTRY_STATUSES).optional(),
  /** List ka "Sold Out" tab isi pe filter karta hai (D-50). */
  availability: z.enum(AVAILABILITIES).optional(),
  q: z.string().max(200).optional(),
  authorId: z.string().optional(),
  /**
   * Taxonomy filters — param ka naam wahi hai jo storage key ka hai
   * (`?destinations=<id>`, `?categories=<id>`).
   *
   * Do naam rakhne (`category` param par `categories` field) ka matlab hota ek mapping
   * jise har naye type pe yaad rakhna padta. Ek hi naam se wo galti ho hi nahi sakti.
   */
  ...Object.fromEntries(TAXONOMY_REF_KEYS.map((key) => [key, z.string().optional()])),
  parentId: z.string().optional(),
  trashed: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['updatedAt', 'createdAt', 'title', 'publishAt', 'order']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Public site pe entry dikhni chahiye ya nahi.
 *
 * `scheduled && publishAt <= now` ko bhi published maanta hai — isse cron band ho
 * jaaye to bhi site sahi rehti hai (self-healing, R2).
 *
 * @param {{ status: string, publishAt?: Date|null, deletedAt?: Date|null }} entry
 * @param {Date} [now]
 */
export function isPubliclyVisible(entry, now = new Date()) {
  if (!entry || entry.deletedAt) return false
  if (entry.status === 'published') return true
  if (entry.status === 'scheduled' && entry.publishAt && new Date(entry.publishAt) <= now)
    return true
  return false
}
