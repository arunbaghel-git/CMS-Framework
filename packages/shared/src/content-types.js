import { ENTRY_SUPPORT } from './schemas/content-type.js'

/**
 * Built-in content types — **code-owned** (D-46, wahi model jo built-in roles pe hai, D-36).
 *
 * Inka content code se aata hai aur seed har deploy pe DB me sync karta hai. Isliye
 * `package` ka field set badalna ek **code change** hai, migration nahi — jo Phase 1 ke
 * dauraan bilkul zaroori hai, kyunki spec 007 ke khule sawaal me se kai theek isi field
 * set ko chhoote hain (§9).
 *
 * **Custom types (Phase 6) yahan nahi honge** — wo admin banata hai aur wo sirf DB me
 * rehte hain. Unke liye `contentTypes` collection hi source hai.
 *
 * ⚠️ `key` **stored data** hai — `entries.type` me baithi hoti hai. Rename karna matlab
 * har entry pe migration (R4 wali baat, block `type` jaisi). Field ki `key` bhi wahi
 * cheez hai: wo `entries.fields` me baithti hai.
 */

const S = ENTRY_SUPPORT

/**
 * Package ka field set — spec 007 §2, Slice 3.
 *
 * **Yahan sirf wo hai jo Slice 3 me chahiye.** Itinerary (§3), pricing (§4), hotels,
 * FAQs, goodToKnow aur reviews Slice 4-6 me judenge — unme se kai spec 007 §9 ke khule
 * sawaalon pe ruke hue hain, aur unhe abhi likhna un sawaalon ka jawab maan lena hota.
 *
 * `destinations` aur `packageTypes` yahan **nahi** hain — wo `entry.taxonomies` me hain
 * (D-49), aur kaunsi taxonomies chalti hain wo `taxonomyTypes` batata hai.
 *
 * **`overview` bhi yahan nahi hai** — wo entry ka `content` hai, ek `richText` block ke
 * andar. D-46 §3 me yahi likha tha; use ek alag field banane ka matlab hota ek hi cheez
 * do jagah: `content` versioned hai, revisions me jaata hai aur `searchText` bharta hai,
 * aur `fields.overview` inme se kuch nahi karta.
 */
const PACKAGE_FIELDS = [
  {
    key: 'shortDescription',
    type: 'textarea',
    label: 'Short description',
    help: 'Ek line jo title ke neeche dikhti hai',
  },
  { key: 'nights', type: 'number', label: 'Nights' },
  { key: 'days', type: 'number', label: 'Days' },
  { key: 'bannerImage', type: 'media', label: 'Banner image' },
  { key: 'bestSeason', type: 'text', label: 'Best season', help: 'Jaise: Oct – May' },
  {
    key: 'bestFor',
    type: 'tags',
    label: 'Best for',
    help: 'Chhoti chips — Couples, First-timers, 5–7 days',
  },
  {
    key: 'featured',
    type: 'toggle',
    label: 'Featured',
    help: 'Homepage aur listings me upar dikhta hai',
  },
  {
    key: 'seoSchema',
    type: 'toggle',
    label: 'Emit Product + Trip schema',
    help: 'Search engines ke liye structured data',
  },
]

/** @type {ReadonlyArray<import('./types.js').ContentTypeSeed>} */
export const BUILT_IN_CONTENT_TYPES = Object.freeze([
  {
    key: 'package',
    label: 'Package',
    labelPlural: 'Packages',
    icon: 'package',

    /**
     * Package ka content **rich text** hai, blocks nahi (spec 007 "Scope me kya NAHI hai").
     * Phir bhi wo `content.blocks` me hi jaata hai — ek `richText` block ke andar. Ye
     * Phase 1 ka documented trap hai: aaj shortcut lene ka matlab Phase 5 me migration.
     */
    hasBuilder: false,

    /** Packages nested nahi hote — har package ek flat `/packages/{slug}` pe. */
    hierarchical: false,
    urlPattern: '/packages/{slug}',
    archiveBase: 'packages',
    hasArchive: true,

    supports: [
      S.TITLE,
      S.EDITOR,
      S.EXCERPT,
      S.FEATURED_IMAGE,
      S.SEO,
      S.REVISIONS,
      /** Sold Out ek availability hai, status nahi (D-50). */
      S.AVAILABILITY,
    ],

    /** Destinations + Package Type — dono `taxonomies` collection me hain (spec 007 §1). */
    taxonomyTypes: ['destination', 'packageType'],

    fields: PACKAGE_FIELDS,
  },

  {
    key: 'page',
    label: 'Page',
    labelPlural: 'Pages',
    icon: 'page',

    /** Pages hi wo type hain jinke liye page builder bana hai (Phase 5). */
    hasBuilder: true,

    /** `/about/team` — parent chain se path banta hai (D-09). */
    hierarchical: true,
    urlPattern: '/{slug}',
    archiveBase: null,
    hasArchive: false,

    supports: [S.TITLE, S.EDITOR, S.FEATURED_IMAGE, S.SEO, S.REVISIONS, S.ORDER],

    /** Pages classify nahi hote — unka structure parent chain se aata hai. */
    taxonomyTypes: [],

    fields: [],
  },

  {
    key: 'post',
    label: 'Post',
    labelPlural: 'Posts',
    icon: 'post',

    hasBuilder: false,
    hierarchical: false,
    urlPattern: '/blog/{slug}',
    archiveBase: 'blog',
    hasArchive: true,

    supports: [S.TITLE, S.EDITOR, S.EXCERPT, S.FEATURED_IMAGE, S.SEO, S.REVISIONS, S.AUTHOR],

    taxonomyTypes: ['category', 'tag'],

    fields: [],
  },
])

export const BUILT_IN_CONTENT_TYPE_KEYS = Object.freeze(BUILT_IN_CONTENT_TYPES.map((t) => t.key))

/** @param {string} key */
export function isBuiltInContentType(key) {
  return BUILT_IN_CONTENT_TYPE_KEYS.includes(key)
}
