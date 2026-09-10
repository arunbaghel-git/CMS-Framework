import { MEALS } from '../schemas/itinerary.js'
import {
  byLongestFirst,
  emptyValue,
  FAQ_LABELS,
  FAQ_SECTION_LABELS,
  isEmptyBlock,
  matchLabel,
  normalizeName,
  parseNameList,
  pushValue,
  splitBlocks,
  textOf,
} from './doc-parse.js'

/**
 * Client ke Google Doc se package ka data nikaalna — Bulk Upload ka dil (D-81).
 *
 * ## Ye file `packages/shared` me kyun hai
 *
 * Ye poore feature ka sabse nazuk hissa hai, aur ise **bina network aur bina DB ke** test
 * hona chahiye: ek fixture HTML andar, ek object bahar. `apps/api` me rakhne se har test ko
 * Express aur Mongo uthana padta — aur tab wo test parser ka nahi, poore stack ka hota.
 *
 * Yahi tark `resolvePath`/`slugify` (Slice 1) aur `deriveEnquiryColumns` (D-75) pe pehle bhi
 * lag chuka hai.
 *
 * ## Saanjhi machinery `doc-parse.js` me hai
 *
 * Blocks me kaatna, label pehchanna, value padhna — wo sab wahan hai, kyunki `post-doc.js`
 * ko bilkul wahi chahiye. Yahan sirf wo hai jo **package ka apna** hai: uske labels ka
 * naksha, din ka block, aur meals.
 *
 * ⚠️ `Day :` (ginti) aur `Day 1` (din ka block) alag cheezein hain. Normalize hone ke baad wo
 * `day` aur `day 1` hain, aur din ka block apne regex se pehchana jaata hai — takrav nahi hai.
 */

/** `Day 1` · `Day 2 :` — din ka block shuru. */
const DAY_NUMBER_RE = /^day\s*(\d+)\s*:?$/i

/**
 * Doc ke upar wale khaane. Key wahi naam hai jo `values` me milega.
 *
 * ⚠️ Chaar `… Price` labels client 3 Sep ko template me jod raha hai. Wo abhi doc me nahi hain
 * aur **hone bhi nahi chahiye** — na milne pe wo category page se gayab rehti hai (D-56), jo
 * theek wahi matlab hai: "ye category is package pe milti hi nahi".
 */
export const DOC_LABELS = Object.freeze({
  'meta title': 'metaTitle',
  'meta description': 'metaDescription',
  day: 'days',
  night: 'nights',
  nights: 'nights',
  'best season': 'bestSeason',
  destinations: 'destinations',
  destination: 'destinations',
  'package type': 'packageType',
  'add ons': 'addOns',
  'add-ons': 'addOns',
  'best for': 'bestFor',
  ferries: 'ferries',
  'banner image url': 'bannerImage',
  'banner image': 'bannerImage',
  'standard hotel': 'standardHotel',
  'deluxe hotel': 'deluxeHotel',
  'premium hotel': 'premiumHotel',
  'luxury hotel': 'luxuryHotel',
  'standard price': 'standardPrice',
  'deluxe price': 'deluxePrice',
  'premium price': 'premiumPrice',
  'luxury price': 'luxuryPrice',
  'package name': 'packageName',
  'package url': 'packageUrl',
  'short description': 'shortDescription',
  overview: 'overview',
})

/**
 * Hisse badalne wale labels — ye **har** hisse me pehchane jaate hain.
 *
 * ⚠️ Alag list isliye hai ki itinerary ke baad `FAQs` likha ho to wo ek din ka label samajh
 * liya jaata (ya kuch bhi nahi) aur poori FAQ list itinerary me chali jaati — chup-chaap.
 *
 * ⚠️ FAQ wale marker `doc-parse.js` se aate hain, yahan dobara likhe nahi jaate — post ka
 * parser bhi wahi list padhta hai. Do jagah likhne ka matlab hota ki kal ek synonym ek parser
 * me jude aur doosre me nahi, aur uska lakshan "FAQ aayi hi nahi" hota.
 */
const SECTION_LABELS = Object.freeze({
  'day wise itinerary': 'itineraryStart',
  'daywise itinerary': 'itineraryStart',
  itinerary: 'itineraryStart',
  ...FAQ_SECTION_LABELS,
})

/** `Day N` block ke andar ke khaane. */
export const DAY_LABELS = Object.freeze({
  'day title': 'title',
  'overnight stay': 'overnightStay',
  meals: 'meals',
  transfer: 'transfer',
  'transfer duration': 'transferDuration',
  'day tag': 'dayTag',
  notes: 'notes',
  note: 'notes',
  'day description': 'description',
})

const TOP_LABEL_ORDER = byLongestFirst(DOC_LABELS)
const DAY_LABEL_ORDER = byLongestFirst(DAY_LABELS)
const FAQ_LABEL_ORDER = byLongestFirst(FAQ_LABELS)
const SECTION_ORDER = byLongestFirst(SECTION_LABELS)

/**
 * Google Doc ka saaf HTML → package ka kaccha data.
 *
 * @param {string} html `sanitizeImportedHtml()` se guzri hui HTML
 * @returns {{
 *   values: Record<string, { text: string, html: string }>,
 *   days: Array<{ number: number, fields: Record<string, { text: string, html: string }> }>,
 *   faqs: Array<Record<string, { text: string, html: string }>>,
 *   warnings: string[],
 * }}
 */
export function parsePackageDoc(html) {
  const blocks = splitBlocks(html)
  const values = {}
  const days = []
  const faqs = []
  const warnings = []

  /**
   * Doc teen hisson me bantа hai, aur label ka matlab hisse pe nirbhar karta hai.
   *
   * ⚠️ Bina iske `Question` aur `Answer` upar wale khaanon se takra sakte the, aur `Day Title`
   * FAQ ke beech me bhi label ban jaata. Section marker (`Day wise Itinerary`, `FAQs`) hi tay
   * karta hai ki abhi kaunsi label list padhi jaaye.
   *
   * Kram tay **nahi** hai — client FAQs pehle likhe ya baad me, dono chalta hai.
   */
  let section = 'top'
  let currentDay = null
  let currentFaq = null
  let currentKey = null
  let matchedAny = false
  let sawItinerary = false

  /** Abhi ke hisse ka khaana kahan jaa raha hai. */
  const bucketOf = () =>
    section === 'itinerary' ? currentDay?.fields : section === 'faqs' ? currentFaq : values

  for (const block of blocks) {
    const plain = textOf(block)

    if (isEmptyBlock(block)) continue

    /** Din ka naya block — iske baad ke labels usi din ke hain. */
    const dayNumber = section === 'itinerary' && plain.match(DAY_NUMBER_RE)
    if (dayNumber) {
      currentDay = { number: Number(dayNumber[1]), fields: {} }
      days.push(currentDay)
      currentKey = null
      continue
    }

    const [order, map] =
      section === 'itinerary'
        ? [DAY_LABEL_ORDER, DAY_LABELS]
        : section === 'faqs'
          ? [FAQ_LABEL_ORDER, FAQ_LABELS]
          : [TOP_LABEL_ORDER, DOC_LABELS]

    /**
     * Section marker har hisse me pehchana jaana chahiye — warna itinerary ke baad `FAQs`
     * likha ho to wo ek din ka label samajh liya jaata aur poori FAQ list itinerary me chali
     * jaati.
     */
    const hit = matchLabel(plain, order, map) ?? matchLabel(plain, SECTION_ORDER, SECTION_LABELS)

    if (hit) {
      matchedAny = true

      if (hit.key === 'itineraryStart' || hit.key === 'faqStart') {
        section = hit.key === 'faqStart' ? 'faqs' : 'itinerary'
        if (section === 'itinerary') sawItinerary = true
        currentKey = null
        continue
      }

      /** Har `Question` ek naya FAQ shuru karta hai — numbering ki zaroorat hi nahi. */
      if (section === 'faqs' && hit.key === 'question') {
        currentFaq = {}
        faqs.push(currentFaq)
      }

      currentKey = hit.key
      const bucket = bucketOf()

      if (!bucket) {
        warnings.push(
          section === 'faqs'
            ? `"${plain}" came before any "Question", so it was skipped`
            : `"${plain}" is inside the itinerary but no "Day N" heading came before it`,
        )
        continue
      }

      pushValue(bucket, currentKey, emptyValue())
      /** Ek hi line me `Label : value` likha ho to wo value abhi hi le lo. */
      if (hit.value) pushValue(bucket, currentKey, { text: hit.value, html: `<p>${hit.value}</p>` })
      continue
    }

    /** Label nahi hai — to ye pichhle label ki value ka hissa hai. */
    if (!currentKey) continue

    const bucket = bucketOf()
    if (bucket) pushValue(bucket, currentKey, { text: plain, html: block })
  }

  /**
   * Ek bhi label na mila — ye "doc khaali hai" nahi, "format badal gaya" hai.
   *
   * Google ka export endpoint documented nahi hai; wo kal shakl badal sakta hai. Us din ye
   * warning saaf failure banegi, chup-chaap aadha-adhoora package nahi.
   */
  if (!matchedAny) {
    warnings.push('No known labels were found in this document — check that it uses the template')
  }

  if (!sawItinerary) {
    warnings.push('No "Day wise Itinerary" heading was found, so no days were imported')
  }

  return { values, days, faqs, warnings }
}

/**
 * `Breakfast, Dinner` → `['breakfast', 'dinner']`, aur jo na samajh aaye wo alag se.
 *
 * ⚠️ **Anjaan shabd chup-chaap girta nahi** — wo `unknown` me lautta hai taaki row ke issues
 * me likha ja sake. Client ne `Brunch` likha ho to use ye pata chalna chahiye, na ki us din
 * ka meal chup-chaap gayab ho jaana chahiye.
 *
 * Ek akshar wale (`B`, `L`, `D`) jaan-boojh kar nahi pehchane jaate: `D` ko `Dinner` maanna
 * andaza hai, aur is importer ka poora niyam yahi hai ki wo andaza na lagaye.
 */
export function parseMeals(text) {
  const meals = []
  const unknown = []

  for (const token of parseNameList(text)) {
    const found = MEALS.find((meal) => normalizeName(token).startsWith(meal))

    if (found) {
      if (!meals.includes(found)) meals.push(found)
      continue
    }

    unknown.push(token)
  }

  return { meals, unknown }
}
