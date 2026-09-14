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
 * Client ke Google Doc se saade page (`page`) ka data — Bulk Upload for pages (D-95, 14 Sep).
 *
 * ## Labels kahan se aaye
 *
 * Client ka apna template (`1AtY5YIu…`) ye labels le kar aaya tha: `Meta Title` ·
 * `Meta Description` · `Page title` · `Page URL` · `Banner Image URL` · `Stat Rail` · `Content` ·
 * `Faq:` (`Heading` · `Question` · `answer`). Unke upar client ne teen aur chune (14 Sep):
 * **`Sub heading`**, **`Button label` / `Button link`** aur **`Parent page`**. Sidebar doc me
 * nahi hai — import hua page apne aap `Pages Sidebar` ke saath right pe banta hai (mapper me).
 *
 * ## Post ke parser se ek farak — `Stat Rail` ka apna hissa
 *
 * | Hissa | Kaise shuru | Andar ke labels |
 * | --- | --- | --- |
 * | top | doc ki shuruat | upar wale |
 * | stats | `Stat Rail` | `Value` · `Suffix` · `Label` · `Highlight` — har `Value` naya card |
 * | faqs | `Faq:` | `Heading` · `Question` · `answer` |
 *
 * Client ne Stat Rail ke liye **har card ke chaaron khaane alag label** chune (14 Sep) — ek line
 * me `Value | Suffix | Label` nahi. Wo optional hai: doc me na ho to page pe rail nahi aati.
 *
 * ⚠️ `stats` se nikalna kisi bhi **top label** pe hota hai (asli doc me `Content`). Isliye stats
 * me pehle stat ke label dekhe jaate hain, phir top ke — kram ulta hota to `Label` jaisi line
 * top ke kisi label se takra sakti thi.
 *
 * ⚠️ **Yahan koi safai nahi hoti** — ise `cleanGoogleHtml()` se guzri HTML milti hai (D-80).
 */

/**
 * Doc ke upar wale khaane. Key wahi naam hai jo `values` me milega.
 *
 * ⚠️ `byLongestFirst` zaroori hai: `page title` · `page url` dono `page` se shuru hote hain, aur
 * `button label` · `button link` dono `button` se.
 */
export const PAGE_DOC_LABELS = Object.freeze({
  'meta title': 'metaTitle',
  'meta description': 'metaDescription',
  'page title': 'title',
  'page url': 'slug',
  'parent page': 'parent',
  parent: 'parent',
  'sub heading': 'subheading',
  subheading: 'subheading',
  'banner image url': 'bannerImage',
  'banner image': 'bannerImage',
  'button label': 'buttonLabel',
  'button link': 'buttonLink',
  'button url': 'buttonLink',
  /**
   * `On this page: Yes` — sidebar ki TOC ka checkbox, doc se (client ne 14 Sep ko doc me joda).
   *
   * ⚠️ **Iske bina ye line pichhle khaane me jud jaati thi** — client ke doc me ye `Parent page` ke
   * theek baad hai, to parent `"Andaman Beaches\nOn this page: Yes"` ban kar **nahi milta** tha aur
   * page draft reh jaata. Anjaan label ka lakshan hamesha pados ke khaane ka bigadna hai.
   */
  'on this page': 'showToc',
  content: 'content',
})

/** Hisse badalne wale labels — FAQ saanjha hai, `Stat Rail` page ka apna. */
const SECTION_LABELS = Object.freeze({
  ...FAQ_SECTION_LABELS,
  'stat rail': 'statsStart',
  stats: 'statsStart',
})

/** Ek stat card ke chaar khaane. `Value` hi naya card shuru karta hai (FAQ ke `Question` jaisa). */
export const PAGE_STAT_LABELS = Object.freeze({
  value: 'value',
  suffix: 'suffix',
  label: 'label',
  highlight: 'highlight',
})

/** FAQ ka section heading page pe bhi hai — post jaisa (`post-doc.js` me poora tark). */
export const PAGE_FAQ_LABELS = Object.freeze({ ...FAQ_LABELS, heading: 'heading' })

const TOP_ORDER = byLongestFirst(PAGE_DOC_LABELS)
const STAT_ORDER = byLongestFirst(PAGE_STAT_LABELS)
const FAQ_ORDER = byLongestFirst(PAGE_FAQ_LABELS)
const SECTION_ORDER = byLongestFirst(SECTION_LABELS)

/**
 * Google Doc ka saaf HTML → page ka kaccha data.
 *
 * @param {string} html `cleanGoogleHtml()` se guzri hui HTML
 * @returns {{
 *   values: Record<string, { text: string, html: string }>,
 *   stats: Array<Record<string, { text: string, html: string }>>,
 *   faqHeading: string,
 *   faqs: Array<Record<string, { text: string, html: string }>>,
 *   warnings: string[],
 * }}
 */
export function parsePageDoc(html) {
  const blocks = splitBlocks(html)
  const values = {}
  const stats = []
  const faqs = []
  const warnings = []

  let section = 'top'
  let currentKey = null
  let currentStat = null
  let currentFaq = null
  let faqHeading = ''
  let matchedAny = false

  for (const block of blocks) {
    if (isEmptyBlock(block)) continue

    const plain = textOf(block)

    /**
     * Label dhoondhne ka kram hisse pe tay hota hai:
     *
     * - `faqs` — sirf FAQ ke label. FAQ ke andar doosra section marker bemaani hai, aur asli
     *   heading _"Frequently asked questions"_ khud ek marker hai (post pe 10 Sep ka bug)
     * - `stats` — pehle stat ke label, phir top ke (jo stats se bahar le jaate hain), phir marker
     * - `top` — top ke label, phir marker
     */
    let hit = null
    let hitSection = section

    if (section === 'faqs') {
      hit = matchLabel(plain, FAQ_ORDER, PAGE_FAQ_LABELS)
    } else {
      if (section === 'stats') hit = matchLabel(plain, STAT_ORDER, PAGE_STAT_LABELS)

      if (!hit) {
        hit = matchLabel(plain, TOP_ORDER, PAGE_DOC_LABELS)
        if (hit) hitSection = 'top'
      }

      if (!hit) hit = matchLabel(plain, SECTION_ORDER, SECTION_LABELS)
    }

    if (hit) {
      matchedAny = true

      if (hit.key === 'faqStart') {
        section = 'faqs'
        currentKey = null
        continue
      }

      if (hit.key === 'statsStart') {
        section = 'stats'
        currentKey = null
        currentStat = null
        continue
      }

      section = hitSection

      if (section === 'faqs' && hit.key === 'heading') {
        currentKey = 'faqHeading'
        if (hit.value) faqHeading = hit.value
        continue
      }

      /** Har `Value` ek naya card, har `Question` ek naya FAQ — numbering ki zaroorat nahi. */
      if (section === 'stats' && hit.key === 'value') {
        currentStat = {}
        stats.push(currentStat)
      }

      if (section === 'faqs' && hit.key === 'question') {
        currentFaq = {}
        faqs.push(currentFaq)
      }

      currentKey = hit.key
      const bucket = section === 'faqs' ? currentFaq : section === 'stats' ? currentStat : values

      if (!bucket) {
        warnings.push(
          section === 'stats'
            ? `"${plain}" came before any "Value" in the Stat Rail, so it was skipped`
            : `"${plain}" came before any "Question", so it was skipped`,
        )
        currentKey = null
        continue
      }

      pushValue(bucket, currentKey, emptyValue())
      if (hit.value) pushValue(bucket, currentKey, { text: hit.value, html: `<p>${hit.value}</p>` })
      continue
    }

    if (!currentKey) continue

    if (currentKey === 'faqHeading') {
      faqHeading = faqHeading ? `${faqHeading} ${plain}` : plain
      continue
    }

    const bucket = section === 'faqs' ? currentFaq : section === 'stats' ? currentStat : values
    if (bucket) pushValue(bucket, currentKey, { text: plain, html: block })
  }

  if (!matchedAny) {
    warnings.push('No known labels were found in this document — check that it uses the template')
  }

  return { values, stats, faqHeading, faqs, warnings }
}
