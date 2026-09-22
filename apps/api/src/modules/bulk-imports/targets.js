import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  IMPORT_TARGET,
  IMPORT_TARGET_LABEL,
  normalizeName,
  parsePackageDoc,
  parsePageDoc,
  parsePostDoc,
  seoRowsFromSheet,
  TAXONOMY_TYPE,
} from '@cms/shared'

import { allEntryTitles } from '../entries/service.js'
import { allItemNames } from '../master-lists/service.js'
import { allSidebarNames } from '../sidebars/service.js'
import { allTaxonomyNames } from '../taxonomies/service.js'
import { toEntryInput } from './mapper.js'
import { toPageEntryInput } from './page-mapper.js'
import { toPostEntryInput } from './post-mapper.js'

/**
 * Import kis cheez ka ho raha hai — package ya blog post (spec 008).
 *
 * ## Ek hi module, do target — do module nahi
 *
 * Bulk Upload ka **85% hissa** target se bilkul bemutalliq hai: sheet ka CSV padhna, Google se
 * fetch, sign-in page pehchanna, SSRF guard, run + rows ka model, claim loop, atki hui rows
 * wapas laana, purane run hataana, New/Existing ka assertion, publish ke do niyam, admin ki
 * screens aur polling — sab ek jaise.
 *
 * Sirf **teen** cheezein alag hain, aur wahi is file me hain: doc kaise padha jaaye, uska
 * payload kaise bane, aur kaunsi master lists chahiye.
 *
 * Ek doosra module banane ka matlab hota do copies — aur is repo me uska nateeja teen baar dekha
 * ja chuka hai: `bestFor` similar cards pe chhoot gaya tha (D-87), `htmlToText` do jagah bani
 * thi, aur D-86 me dhoondhne aur save karne ka slug alag ho gaya tha. Kal SSRF guard ya
 * stuck-row wala fix ek jagah lagta aur doosri jagah nahi.
 */

/**
 * Ek list ko `naam → entries[]` me badlo.
 *
 * ⚠️ Value **array** hai, ek object nahi — kyunki ek hi naam do baar aa sakta hai. Taxonomy ki
 * uniqueness `slug` pe hai, `name` pe nahi, aur master lists pe to koi uniqueness hai hi nahi.
 * Aise me chup-chaap pehla utha lena **galat hotel live page pe** daal deta hai. Array rakhne se
 * mapper wo haalat dekh kar blocker laga sakta hai.
 */
const nameMap = (items) => {
  const map = new Map()

  for (const item of items) {
    const key = normalizeName(item.name)
    if (!key) continue

    map.set(key, [...(map.get(key) ?? []), item])
  }

  return map
}

/**
 * Package ke chaaron reference ek baar — poore import ke liye.
 *
 * Har reference ko alag query karne ka matlab hota 20 package × ~20 reference = **400 query**.
 * Ye **paanch** hain.
 */
async function packageRefs(siteId, locale) {
  const [destinations, packageTypes, hotels, addOns, transfers] = await Promise.all([
    allTaxonomyNames(TAXONOMY_TYPE.DESTINATION, siteId, locale),
    allTaxonomyNames(TAXONOMY_TYPE.PACKAGE_TYPE, siteId, locale),
    allItemNames('hotel', siteId),
    allItemNames('addOn', siteId),
    allItemNames('transfer', siteId),
  ])

  return {
    destinations: nameMap(destinations),
    packageTypes: nameMap(packageTypes),
    hotels: nameMap(hotels),
    addOns: nameMap(addOns),
    transfers: nameMap(transfers),
  }
}

/**
 * Post ko sirf **ek** list chahiye.
 *
 * ⚠️ Yahi wo faayda hai jo `buildRefMaps()` ko target-aware karne se mila: pehle wo hamesha
 * paanchon list uthati thi. Blog ka import hotels aur transfers ki poori list DB se laata —
 * sirf unhe phenkne ke liye. Wahi soch jo `toPublicPage()` pe D-87 Slice B me lagi thi, jahan
 * ek `page` resolve karne pe `resolveSimilarPackages()` ka poora daur chal jaata tha.
 */
async function postRefs(siteId, locale) {
  return { categories: nameMap(await allTaxonomyNames(TAXONOMY_TYPE.CATEGORY, siteId, locale)) }
}

/**
 * Page ko do list chahiye — `Parent page` ke liye pages, aur `Pages Sidebar` ke liye sidebars
 * (D-95). Dono ek baar, poore import ke liye.
 */
async function pageRefs(siteId, locale) {
  const [pages, sidebars] = await Promise.all([
    allEntryTitles('page', siteId, locale),
    allSidebarNames(siteId, locale),
  ])

  return { pages, sidebars }
}

/**
 * Har target ka apna teen-cheez ka set.
 *
 * ⚠️ **`allowImages` yahan hai, `cleanGoogleHtml` ke default me nahi.** Google ke image URL
 * signed aur expire hone wale hain, isliye `img` tabhi khulna chahiye jab koi use Media library
 * me utaar bhi raha ho. Package ka import aaj images nahi sambhaalta — uska `false` ek chunav
 * hai, bhool nahi.
 *
 * ⚠️ **`missingTitle` ka message target ka apna hai.** "This document has no Package Name" ek
 * blog doc pe padh kar client seedha galat khaana dhoondhne lagta.
 *
 * ⚠️ **Banner image do alag jagah baithti hai**, isliye `setImage`/`getImage` chahiye:
 * package pe wo `fields.bannerImage` hai (uska apna custom field, spec 007), aur post pe
 * `featuredImageId` — jo `entrySchema` ka top-level field hai aur `S.FEATURED_IMAGE` support
 * se aata hai. Ek hi jagah maan lene se post ki image `fields` me baith jaati, jahan `Mixed`
 * hone ki wajah se Zod use rok bhi nahi paata — wo chup-chaap wahan padi rehti aur page pe
 * kabhi na dikhti.
 */
export const TARGET_CONFIG = Object.freeze({
  [IMPORT_TARGET.PACKAGE]: {
    entryType: 'package',
    label: IMPORT_TARGET_LABEL[IMPORT_TARGET.PACKAGE].one,
    labelPlural: IMPORT_TARGET_LABEL[IMPORT_TARGET.PACKAGE].many,
    parse: parsePackageDoc,
    map: toEntryInput,
    buildRefs: packageRefs,
    allowImages: false,
    slugLabel: 'Package URL',
    missingTitle: 'This document has no "Package Name", so no package could be created',
    setImage: (input, mediaId) => {
      input.fields.bannerImage = mediaId
    },
    getImage: (existing) => existing?.fields?.bannerImage ?? null,
  },

  [IMPORT_TARGET.POST]: {
    entryType: 'post',
    label: IMPORT_TARGET_LABEL[IMPORT_TARGET.POST].one,
    labelPlural: IMPORT_TARGET_LABEL[IMPORT_TARGET.POST].many,
    parse: parsePostDoc,
    map: toPostEntryInput,
    buildRefs: postRefs,
    allowImages: true,
    slugLabel: 'Blog URL',
    missingTitle: 'This document has no "Blog title", so no post could be created',
    setImage: (input, mediaId) => {
      input.featuredImageId = mediaId
    },
    getImage: (existing) => existing?.featuredImageId ?? null,
  },

  /**
   * Saade page — `page-template-text.html` (client, 14 Sep, D-95).
   *
   * Banner post jaisa `featuredImageId` me. Ek cheez sirf page ki hai — **`prepare`**.
   */
  [IMPORT_TARGET.PAGE]: {
    entryType: 'page',
    label: IMPORT_TARGET_LABEL[IMPORT_TARGET.PAGE].one,
    labelPlural: IMPORT_TARGET_LABEL[IMPORT_TARGET.PAGE].many,
    parse: parsePageDoc,
    map: toPageEntryInput,
    buildRefs: pageRefs,
    allowImages: true,
    slugLabel: 'Page URL',
    missingTitle: 'This document has no "Page title", so no page could be created',
    setImage: (input, mediaId) => {
      input.featuredImageId = mediaId
    },
    getImage: (existing) => existing?.featuredImageId ?? null,

    /**
     * `fields` ko purane page se **milao** — create/update se theek pehle.
     *
     * ⚠️ `updateEntry()` `fields` ko **poora badalta** hai. Page ke kuch khaane doc me hain hi nahi
     * (`sidebar` · `sidebarId`) — wo admin me chune jaate hain. Bina
     * is milaap ke har re-import unhe chup-chaap mita deta, aur lakshan "sidebar gayab ho gayi"
     * hota, koi error nahi.
     *
     * Naye page pe `Pages Sidebar` right pe (client, 14 Sep). Purane page pe kabhi nahi.
     *
     * @returns {object[]} extra issues
     */
    prepare: (input, existing, mapped) => {
      if (existing) {
        input.fields = { ...(existing.fields ?? {}), ...input.fields }
        return []
      }

      input.fields = { ...mapped.newOnlyFields, ...input.fields }
      return mapped.newOnlyIssues ?? []
    },
  },

  /**
   * SEO ka bulk upload — **teen purane target se alag kism ka** (D-107, client 21 Sep).
   *
   * Upar likha hai ki target se sirf **teen** cheezein badalti hain. Is target ne ek **chauthi**
   * jodi: _sheet kaise padhi jaaye_. Aaj tak sheet me sirf Google Doc ke link hote the
   * (`docUrlsFromSheet`) aur asli maal doc me hota tha; yahan doc hai hi nahi — maal **row me
   * hi** hai. `sheetRows` hone ka matlab hai "ye target apni sheet khud padhta hai".
   *
   * Badle me is target ko teenon purani cheezein **nahi** chahiye: koi doc parse nahi
   * (`parse`/`map` nahi), koi master list nahi (`buildRefs` khaali), koi image nahi
   * (`allowImages: false`), aur koi banner nahi (`setImage`/`getImage` nahi). Yaani ye target
   * baaki teen se **sasta** hai, mehnga nahi.
   *
   * ⚠️ **`entryType` yahan `null` hai, aur wo bhool nahi hai.** Package · post · page · tour ·
   * blog · home — sab isme aate hain. Row `path` se dhoondhi jaati hai, type se nahi (R10:
   * `entries.path` hi ekmatra pehchaan hai).
   *
   * ⚠️ **`New / Existing` is target pe bemaani hai** — SEO Title se koi page banta hi nahi.
   * `updatesSeoOnly` isi wajah se hai: service us elaan wale dono guard ko chhod deti hai aur
   * admin mode ka radio dikhata hi nahi. Us elaan ko yahan "maan" lena (D-81 ka assertion) ek
   * jhootha chunav hota, kyunki dono taraf ka jawab ek hi hai.
   */
  [IMPORT_TARGET.SEO]: {
    entryType: null,
    label: IMPORT_TARGET_LABEL[IMPORT_TARGET.SEO].one,
    labelPlural: IMPORT_TARGET_LABEL[IMPORT_TARGET.SEO].many,
    updatesSeoOnly: true,
    sheetRows: seoRowsFromSheet,
    buildRefs: async () => ({}),
    allowImages: false,
    slugLabel: 'Page URL',
  },
})

/** Anjaan target pe package — purane run me `target` hai hi nahi (default se pehle bane the). */
export const targetOf = (target) => TARGET_CONFIG[target] ?? TARGET_CONFIG[IMPORT_TARGET.PACKAGE]

/**
 * Ek target ke saare reference ek baar.
 *
 * @param {string} target
 * @param {string} [siteId]
 * @param {string} [locale]
 */
export function buildRefMaps(target, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  return targetOf(target).buildRefs(siteId, locale)
}
