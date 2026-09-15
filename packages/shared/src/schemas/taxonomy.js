import { z } from 'zod'

import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  HIERARCHICAL_TAXONOMY_TYPES,
  TAXONOMY_TYPES,
} from '../constants/index.js'
import { slugSchema } from './entry.js'
import { emptySeo, seoSchema } from './seo.js'

/**
 * `taxonomies` ka contract — spec 007 §1.1, §1.2.
 *
 * **Ek collection, `type` field se alag** — bilkul wahi soch jo `entries` pe hai (D-04).
 * Categories, Tags, Destinations aur Package Type chaaron yahin hain. Alag collection
 * banane ka matlab hota hierarchy, slug uniqueness aur archive ka engine har baar dobara
 * likhna — aur wahi galti D-46 me package pe pakdi gayi thi.
 *
 * UI me `taxonomies` shabd kabhi nahi dikhta (R11) — client ko "Destinations" aur
 * "Package Type" dikhta hai.
 */

export const taxonomySchema = z.object({
  /** Day 1 se reserve (D-01). */
  siteId: z.string().default(DEFAULT_SITE_ID),

  /**
   * Day 1 se reserve — aur yahan ye **uniqueness ka hissa** hai.
   *
   * Uniqueness `{siteId, locale, type, slug}` hai, `{siteId, type, slug}` nahi. Multi-language
   * kabhi aaya to unique index badalna live data pe sabse mehnga kaam hota (§3.1). Menus pe
   * ye pehle chhoot gaya tha aur D-43 me theek karna pada — wahi galti dobara nahi.
   */
  locale: z.string().default(DEFAULT_LOCALE),

  type: z.enum(TAXONOMY_TYPES),

  /** UI me yahi dikhta hai. */
  name: z.string().min(1).max(200),
  slug: slugSchema,

  /**
   * Sirf hierarchical types pe (`category`, `destination`) — spec 007 §1.1.
   *
   * Flat type pe `null` rehta hai. Field khud sab pe hai kyunki ek type ka flat/hierarchical
   * hona badal sakta hai (spec 007 §9 #5 abhi khula hai), aur tab field add karna live data
   * pe migration maangta.
   */
  parentId: z.string().nullable().default(null),

  description: z.string().max(2000).default(''),

  /** Destinations ka banner — spec 007 §1.1. Media id, URL nahi (D-41). */
  bannerMediaId: z.string().nullable().default(null),

  /**
   * Category ke badge ka rang — `#rrggbb`, ya khaali (client, 11 Sep, D-93).
   *
   * Khaali ka matlab hai **"theme apna rang chune"** — reference ke chaar variant me se, category
   * ki id se (`categoryClass()`), jo 10 Sep se hota aaya hai. Isliye purani categories bina kuch
   * kiye waisi hi dikhti hain.
   *
   * **Package Type pe bhi** (client, 15 Sep, D-96 §20) — package card ke badge ka rang. Wahan khaali ka matlab
   * theme ka default narangi (koi rotation nahi). Destination ki screen pe control nahi hai.
   */
  color: z
    .string()
    .regex(/^(#[0-9a-fA-F]{6})?$/, 'Colour must look like #1a73e8')
    .default(''),

  /** "Uncategorized" jaisa — delete nahi hota, aur khaali entry isi pe girti hai. */
  isDefault: z.boolean().default(false),

  order: z.number().int().default(0),

  seo: seoSchema.default(emptySeo),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

/** Create — `slug` khaali ho to server `name` se bana lega. */
export const createTaxonomySchema = taxonomySchema
  .omit({ isDefault: true, createdAt: true, updatedAt: true })
  .partial({ slug: true, siteId: true, locale: true })

/**
 * Update — `type` yahan **nahi** hai.
 *
 * Type badalne ka matlab hai ek Destination ka chup-chaap Package Type ban jaana: uske
 * saare references galat list me chale jaate, aur hierarchy (jo sirf Destination pe hoti
 * hai) orphan ho jaati. Wo ek "move" operation hai, PATCH ka field nahi.
 */
export const updateTaxonomySchema = taxonomySchema
  .omit({
    type: true,
    siteId: true,
    locale: true,
    isDefault: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial()

/** Har query param Zod se (R9). */
export const taxonomyListQuerySchema = z.object({
  type: z.enum(TAXONOMY_TYPES),
  q: z.string().max(200).optional(),
  parentId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(['name', 'createdAt', 'order']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

/**
 * Kya is type me nesting allowed hai?
 *
 * Ye check ek hi jagah hai — server aur admin dono isse use karte hain. Do jagah rakhne
 * ka nateeja is repo me pehle dekha ja chuka hai (D-43 §2): admin parent dropdown dikhata
 * rehta hai aur server har save pe use reject karta hai.
 *
 * @param {string} type
 */
export function isHierarchicalTaxonomy(type) {
  return HIERARCHICAL_TAXONOMY_TYPES.includes(type)
}
