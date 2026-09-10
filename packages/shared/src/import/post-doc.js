import {
  byLongestFirst,
  emptyValue,
  FAQ_LABELS,
  FAQ_SECTION_LABELS,
  isEmptyBlock,
  matchLabel,
  pushValue,
  splitBlocks,
  textOf,
} from './doc-parse.js'

/**
 * Client ke Google Doc se blog post ka data nikaalna — Bulk Upload for blog (spec 008).
 *
 * ## Labels client ke apne hain, mere gadhe hue nahi
 *
 * Ye naksha `10yI-7aa…` doc me se **padha** gaya hai — client ne template khud likha tha aur
 * usme labels pehle se the (`Blog title`, `Blog heading`, `Content`, `Faq:`). Naam badal kar
 * "behtar" karne ka koi matlab nahi tha: doc client ki team bharegi, aur label hi wo contract
 * hai. R15 wahi kehta hai jo design pe kehta hai.
 *
 * ⚠️ **`Blog URL` ek hi cheez hai jo maine jodi**, aur wo D-86 ki wajah se hai. Uske bina slug
 * `Blog title` se banta, aur jis din client title thoda sa badalta, us doc ka agla import
 * purane post ko pehchanta hi nahi aur ek **doosra live post** bana deta. Wo failure poori
 * tarah chup hoti: dono live, dono theek dikhte.
 *
 * ## Package ke parser se teen farak
 *
 * | | Package | Post |
 * | --- | --- | --- |
 * | Beech ka bada hissa | `Day N` ke blocks | ek hi `Content`, jismein sab kuch hai |
 * | Sections | top · itinerary · faqs | top · faqs |
 * | FAQ ka heading | hai hi nahi | `Faq:` ke turant baad `Heading` |
 *
 * Baaki sab — blocks me kaatna, label pehchanna, value jodna — `doc-parse.js` se aata hai.
 *
 * ⚠️ **Yahan koi safai nahi hoti.** Ise `cleanGoogleHtml()` se guzri HTML milti hai. Safai ka
 * bharosa `packages/shared` pe rakhna hi wo galti hai jisse XSS aata hai (D-80).
 */

/**
 * Doc ke upar wale khaane. Key wahi naam hai jo `values` me milega.
 *
 * ⚠️ `blog title` aur `blog heading` **do alag cheezein hain**, aur ye D-90/spec 008 ka faisla
 * hai: `title` slug · breadcrumb · admin list · SEO · card ke liye hai, aur `heading` wo `<h1>`
 * hai jo page pe chhapta hai. Client ke shabd: _"blog ki heading aur slug alag rahenge jisse
 * breadcrumb bhi thik ho jayega"_.
 *
 * ⚠️ `byLongestFirst` yahan zaroori hai: `blog title` aur `blog heading` dono `blog` se shuru
 * hote hain, aur `blog url` bhi. Chhota label pehle dekha jaata to wo teenon ko kha jaata.
 */
export const POST_DOC_LABELS = Object.freeze({
  'meta title': 'metaTitle',
  'meta description': 'metaDescription',
  'blog title': 'title',
  'post title': 'title',
  'blog url': 'slug',
  'post url': 'slug',
  'blog heading': 'heading',
  'post heading': 'heading',
  excerpt: 'excerpt',
  'short description': 'excerpt',
  category: 'category',
  categories: 'category',
  'banner image url': 'bannerImage',
  'banner image': 'bannerImage',
  content: 'content',
  article: 'content',
  body: 'content',
})

/**
 * Hisse badalne wale labels — post me sirf **ek** hai.
 *
 * Package me `Day wise Itinerary` bhi tha; blog ka poora article ek hi `Content` me hai,
 * isliye yahan sirf FAQ ka marker bachta hai — aur wo `doc-parse.js` se aata hai, dobara
 * likha nahi jaata.
 *
 * ⚠️ Iska ek nateeja jaan-boojh kar liya gaya hai: article ke andar likha `Frequently asked
 * questions` (bina kisi aur text ke) FAQ section **shuru kar dega**. Wo sahi bhi hai — wahi to
 * FAQ section hai — par uske neeche `Question`/`answer` na likhe hon to wo poora hissa
 * **chhoot** jaayega, ek warning ke saath. Guide me team ko yahi likha gaya hai.
 */
const SECTION_LABELS = Object.freeze({ ...FAQ_SECTION_LABELS })

/**
 * FAQ ke andar ke khaane — sawaal-jawab ki jodi, **aur section ka apna heading**.
 *
 * `heading` sirf yahan hai, saanjhe `FAQ_LABELS` me nahi: wo blog ka apna hai (client ke doc
 * me `Faq:` ke turant baad likha hai) aur use saanjha karne ka matlab hota ki package ka
 * parser bhi achaanak `Heading` ko label maanne lage.
 *
 * ⚠️ `heading` ek **hi** hota hai, har `Question` ki tarah dohraata nahi. Wo `faqs` block ke
 * `heading` prop me jaata hai (`faqsPropsSchema`), kisi FAQ item me nahi.
 */
export const POST_FAQ_LABELS = Object.freeze({ ...FAQ_LABELS, heading: 'heading' })

const TOP_LABEL_ORDER = byLongestFirst(POST_DOC_LABELS)
const FAQ_LABEL_ORDER = byLongestFirst(POST_FAQ_LABELS)
const SECTION_ORDER = byLongestFirst(SECTION_LABELS)

/**
 * Google Doc ka saaf HTML → post ka kaccha data.
 *
 * @param {string} html `cleanGoogleHtml()` se guzri hui HTML
 * @returns {{
 *   values: Record<string, { text: string, html: string }>,
 *   faqHeading: string,
 *   faqs: Array<Record<string, { text: string, html: string }>>,
 *   warnings: string[],
 * }}
 */
export function parsePostDoc(html) {
  const blocks = splitBlocks(html)
  const values = {}
  const faqs = []
  const warnings = []

  let section = 'top'
  let currentFaq = null
  let currentKey = null
  let matchedAny = false
  let faqHeading = ''

  for (const block of blocks) {
    const plain = textOf(block)

    if (isEmptyBlock(block)) continue

    const [order, map] =
      section === 'faqs' ? [FAQ_LABEL_ORDER, POST_FAQ_LABELS] : [TOP_LABEL_ORDER, POST_DOC_LABELS]

    /**
     * Section marker dono hisson me pehchana jaata hai.
     *
     * ⚠️ Kram ye hai: **pehle hisse ka apna label, phir section marker**. Ulta karne pe blog ka
     * `Content` theek chalta, par package wale parser me `FAQs` ek din ka label ban jaata —
     * wahi jaal jo D-81 me likha hai. Dono parser ek hi kram pe rakhe gaye hain.
     */
    const hit = matchLabel(plain, order, map) ?? matchLabel(plain, SECTION_ORDER, SECTION_LABELS)

    if (hit) {
      matchedAny = true

      if (hit.key === 'faqStart') {
        section = 'faqs'
        currentKey = null
        continue
      }

      /**
       * ⚠️ FAQ ka `Heading` kisi item me nahi jaata — wo poore block ka heading hai.
       *
       * Ise `currentFaq` me daalne ka matlab hota ki ya to wo pehle sawaal ke saath chipak
       * jaata, ya (agar wo `Question` se pehle aaya, jaisa client ke doc me hai) "koi Question
       * nahi mila" wali warning de kar **chup-chaap gir jaata**.
       */
      if (section === 'faqs' && hit.key === 'heading') {
        currentKey = 'faqHeading'
        if (hit.value) faqHeading = hit.value
        continue
      }

      /** Har `Question` ek naya FAQ shuru karta hai — numbering ki zaroorat hi nahi. */
      if (section === 'faqs' && hit.key === 'question') {
        currentFaq = {}
        faqs.push(currentFaq)
      }

      currentKey = hit.key
      const bucket = section === 'faqs' ? currentFaq : values

      if (!bucket) {
        warnings.push(`"${plain}" came before any "Question", so it was skipped`)
        continue
      }

      pushValue(bucket, currentKey, emptyValue())
      /** Ek hi line me `Label : value` likha ho to wo value abhi hi le lo. */
      if (hit.value) pushValue(bucket, currentKey, { text: hit.value, html: `<p>${hit.value}</p>` })
      continue
    }

    /** Label nahi hai — to ye pichhle label ki value ka hissa hai. */
    if (!currentKey) continue

    /** FAQ ka heading plain text hai; uske neeche ki line bhi usi me judti hai. */
    if (currentKey === 'faqHeading') {
      faqHeading = faqHeading ? `${faqHeading} ${plain}` : plain
      continue
    }

    const bucket = section === 'faqs' ? currentFaq : values
    if (bucket) pushValue(bucket, currentKey, { text: plain, html: block })
  }

  /**
   * Ek bhi label na mila — ye "doc khaali hai" nahi, "format badal gaya" hai.
   *
   * Google ka export endpoint documented nahi hai; wo kal shakl badal sakta hai. Us din ye
   * warning saaf failure banegi, chup-chaap aadha-adhoora post nahi.
   */
  if (!matchedAny) {
    warnings.push('No known labels were found in this document — check that it uses the template')
  }

  return { values, faqHeading, faqs, warnings }
}
