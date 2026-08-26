import { ENTRY_SUPPORT } from './schemas/content-type.js'

/**
 * Built-in content types — **code-owned** (D-46, wahi model jo built-in roles pe hai, D-36).
 *
 * Inka content code se aata hai aur seed har deploy pe DB me sync karta hai. Isliye
 * `package` ka field set badalna ek **code change** hai, migration nahi — jo Phase 1 ke
 * dauraan bilkul zaroori hai, kyunki spec 007 ke 15 khule sawaal me se kai theek isi
 * field set ko chhoote hain (§9).
 *
 * **Custom types (Phase 6) yahan nahi honge** — wo admin banata hai aur wo sirf DB me
 * rehte hain. Unke liye `contentTypes` collection hi source hai.
 *
 * ⚠️ `key` **stored data** hai — `entries.type` me baithi hoti hai. Rename karna matlab
 * har entry pe migration (R4 wali baat, block `type` jaisi).
 */

const S = ENTRY_SUPPORT

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
      /** Destinations + Package Type dono `taxonomies` me hain (spec 007 §1.1, §1.2). */
      S.TAXONOMIES,
    ],

    /**
     * **Slice 1 me jaan-boojh kar khaali.**
     *
     * Package ka asli field set (shortDescription, nights/days, itinerary, pricing,
     * hotels…) Slice 3-5 me bharega — spec 007 §2. Abhi unhe likhna matlab un sawaalon
     * ke jawab maan lena jo abhi client ke paas hain (§9 #6, #7, #9), aur wahi galti
     * hai jise D-41/D-42 ne pakda tha: pehle contract, phir code.
     */
    fields: [],
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

    supports: [
      S.TITLE,
      S.EDITOR,
      S.EXCERPT,
      S.FEATURED_IMAGE,
      S.SEO,
      S.REVISIONS,
      S.TAXONOMIES,
      S.AUTHOR,
    ],
    fields: [],
  },
])

export const BUILT_IN_CONTENT_TYPE_KEYS = Object.freeze(BUILT_IN_CONTENT_TYPES.map((t) => t.key))

/** @param {string} key */
export function isBuiltInContentType(key) {
  return BUILT_IN_CONTENT_TYPE_KEYS.includes(key)
}
