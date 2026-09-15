import { z } from 'zod'

import { DEFAULT_SITE_ID, TAXONOMY_TYPES } from '../constants/index.js'

/**
 * `contentTypes` ka contract — spec 007 / D-46.
 *
 * Ye wo collection hai jo "Sab kuch content hai" (D-04) ko sach me chalati hai: `entries`
 * ek hi engine hai, aur har `type` ka apna field set, apna URL pattern aur apna archive
 * yahan se aata hai. Package, Page aur Post teenon isi ke row hain (D-46).
 *
 * Field DSL **ek hi hai** (D-24, spec 005) — `fields[]` ka har item wahi shape leta hai
 * jo block ka properties panel leta hai, sirf context alag hai (`content`).
 */

/**
 * Entry ke wo hisse jo ek type ke liye on/off ho sakte hain.
 *
 * `supports` ek **list** hai, alag-alag boolean fields nahi — naya support jodne pe har
 * document me naya field backfill nahi karna padta (schema-change §1).
 */
export const ENTRY_SUPPORT = Object.freeze({
  TITLE: 'title',
  EDITOR: 'editor',
  EXCERPT: 'excerpt',
  FEATURED_IMAGE: 'featuredImage',
  SEO: 'seo',
  REVISIONS: 'revisions',
  /** Manual ordering — nested pages aur menu-jaisi liston ke liye. */
  ORDER: 'order',
  AUTHOR: 'author',
})

/**
 * ⚠️ `taxonomies` **support nahi hai** — wo `taxonomyTypes[]` hai (neeche).
 *
 * Pehle yahan ek `taxonomies` flag tha. Uske saath `taxonomyTypes` rakhne ka matlab hota
 * ek hi baat do jagah: "kya ye type taxonomies use karta hai" aur "kaunsi". Wo do jagah ek
 * din alag ho jaatin — khaali `taxonomyTypes` ke saath `supports: ['taxonomies']`, aur
 * admin ek khaali section dikhata rehta.
 */

export const ENTRY_SUPPORTS = Object.freeze(Object.values(ENTRY_SUPPORT))

/**
 * contentType ki `key` — yahi `entries.type` me store hoti hai.
 *
 * camelCase, kyunki ye **stored data** hai aur `entries` ke har document me baithi hai.
 * Rename karna matlab har entry pe migration (wahi rule jo block `type` pe hai — R4).
 */
export const contentTypeKeySchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-zA-Z0-9]*$/, 'contentType key camelCase honi chahiye, jaise blogPost')

/**
 * URL pattern — `resolvePath()` ka input.
 *
 * `{slug}` **zaroori** hai. Uske bina ek type ke saare entries ek hi path pe resolve
 * karenge, aur `{siteId, locale, path}` unique index doosri entry pe hi fail ho jaayega —
 * admin ko "duplicate key" dikhega aur wajah kahin nahi likhi hogi.
 *
 * ⚠️ Built-in `homePage` (`/`) is niyam ka **apwaad** hai (D-96) — wo seed se aata hai, is schema
 * se nahi guzarta, aur uski "ek hi entry" wali rok service me hai (`hasFixedPath()`). Custom type
 * pe ye rok waisi ki waisi hai.
 */
export const urlPatternSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^\/[a-z0-9/{}-]*$/, 'URL pattern `/` se shuru ho, lowercase ho')
  .refine((p) => p.includes('{slug}'), { message: 'URL pattern me {slug} hona zaroori hai' })

/**
 * Ek custom field ki definition — spec 005 ka DSL, `content` context.
 *
 * `.passthrough()` jaan-boojh kar: har field type ke apne extra keys hote hain
 * (`options` select pe, `min`/`max` number pe, `fields` repeater pe). Unhe yahan dobara
 * likhna matlab DSL do jagah rakhna — aur wo do jagah ek din alag ho jaati hain (D-43 §2).
 */
export const contentFieldSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-zA-Z0-9]*$/, 'Field key camelCase honi chahiye'),
    type: z.string().min(1),
    label: z.string().min(1).max(120),
    required: z.boolean().default(false),
    help: z.string().max(500).optional(),
  })
  .passthrough()

/** Poori stored shape — DB me contentType aisa dikhta hai. */
export const contentTypeSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  key: contentTypeKeySchema,

  /** UI me hamesha yahi dikhta hai, `key` kabhi nahi (R11). */
  label: z.string().min(1).max(120),
  labelPlural: z.string().min(1).max(120),
  icon: z.string().max(60).default(''),

  fields: z.array(contentFieldSchema).max(200).default([]),

  /**
   * `true` = page builder khulega, `false` = classic rich text editor.
   *
   * Dono **ek hi** `content.blocks` shape likhte hain (02-ARCHITECTURE §6.7), isliye
   * type ko builder pe switch karna non-destructive hai.
   */
  hasBuilder: z.boolean().default(false),

  /**
   * Path parent chain se banega ya `urlPattern` se.
   *
   * Ye field isliye hai ki warna `resolvePath()` ko type ka **naam** dekhna padta
   * (`type === 'page'`) — aur usi hardcoding ko D-09 ne mana kiya tha. Client ka banaya
   * hua custom type bhi hierarchical ho sakta hai.
   */
  hierarchical: z.boolean().default(false),

  urlPattern: urlPatternSchema,

  /** Archive ka base — `hasArchive: false` pe iska koi matlab nahi. */
  archiveBase: z.string().max(100).nullable().default(null),
  hasArchive: z.boolean().default(false),

  supports: z.array(z.enum(ENTRY_SUPPORTS)).default([]),

  /**
   * Ye type kaunsi taxonomies use karta hai — `['destination', 'packageType']`.
   *
   * Khaali array = koi nahi. Ye do kaam karta hai: admin ko batata hai kaunse picker
   * dikhane hain, aur server ko batata hai ki entry pe **kaunsi** taxonomy keys allowed
   * hain. Bina iske ek Post pe destinations set ki ja sakti thin — save ho jaatin, aur
   * galti kisi archive pe pakdi jaati.
   */
  taxonomyTypes: z.array(z.enum(TAXONOMY_TYPES)).default([]),

  /**
   * Built-in types **code-owned** hain — wahi model jo built-in roles pe hai (D-36).
   * Seed inhe har deploy pe sync karta hai, isliye inka field set badalna migration nahi
   * maangta.
   */
  isBuiltIn: z.boolean().default(false),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

/**
 * Create — `key` badla nahi ja sakta isliye wo yahan zaroori hai.
 *
 * `isBuiltIn` API se **kabhi** set nahi hota: wo code ka faisla hai (D-36). Admin usse
 * `true` kar paata to wo type seed ke agle run pe overwrite ho jaata, aur uska kaam
 * chup-chaap mit jaata.
 */
export const createContentTypeSchema = contentTypeSchema
  .omit({ isBuiltIn: true, createdAt: true, updatedAt: true })
  .partial({ siteId: true })

/**
 * Update — `key` yahan **nahi** hai.
 *
 * `key` `entries.type` me stored hai; badalne ka matlab har entry pe migration hai
 * (R4 wali baat, block `type` jaisi).
 */
export const updateContentTypeSchema = contentTypeSchema
  .omit({ key: true, siteId: true, isBuiltIn: true, createdAt: true, updatedAt: true })
  .partial()

/** Admin list query — har param Zod se (R9). */
export const contentTypeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/**
 * Kya is type pe ye cheez chalti hai?
 *
 * @param {{ supports?: string[] }} contentType
 * @param {string} support
 */
export function typeSupports(contentType, support) {
  return Boolean(contentType?.supports?.includes(support))
}
