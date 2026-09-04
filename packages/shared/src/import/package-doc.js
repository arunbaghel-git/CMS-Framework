import { MEALS } from '../schemas/itinerary.js'

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
 * ⚠️ **Yahan koi safai nahi hoti.** Ise **saaf** HTML milti hai — `sanitizeImportedHtml()`
 * (`apps/api/src/core/sanitize-html.js`) pehle Google ke `class`/`style`/`<span>` hata chuka
 * hota hai. Sanitizer server pe hai aur `packages/shared` browser me bhi chalta hai; safai ka
 * bharosa client-side pe rakhna hi wo galti hai jisse XSS aata hai (D-80).
 *
 * ## Parsing label-driven hai, position-driven nahi
 *
 * Google ka export har baar yahi shakl deta hai — **label ka paragraph, phir uski value ke
 * paragraph, agle label tak**:
 *
 * ```html
 * <p>Meta Title</p>
 * <p>Andaman 5 Nights</p>
 * <p>Meta Description :</p>
 * <p>Port Blair, Havelock aur Neil…</p>
 * ```
 *
 * "Teesra paragraph Meta Title hai" maan lena sabse aasaan tha aur sabse jaldi tootta: client
 * ke ek Enter dabate hi poora doc khisak jaata aur **har** field galat jagah chali jaati — bina
 * kisi error ke. Label dhoondhne se ek khaali line se kuch nahi bigadta.
 *
 * ## Labels ek jaise likhe hi nahi hain
 *
 * Asli template padh kar dekha gaya. Usme `Meta Title` hai par `Meta Description :`;
 * `Destinations ` me aakhir me space hai; `Standard Hotel : ` me dono. Isliye har label pe
 * wahi normalization chalti hai: **trim → andar ke space ek → lowercase → aakhri `:` hatao**.
 *
 * ⚠️ `Day :` (ginti) aur `Day 1` (din ka block) alag cheezein hain. Normalize hone ke baad wo
 * `day` aur `day 1` hain, aur din ka block apne regex se pehchana jaata hai — takrav nahi hai.
 */

/**
 * Wo tags jo apni ek "line" banate hain.
 *
 * `<li>` yahan **jaan-boojh kar nahi** hai: wo apni `<ul>` ke andar rehta hai, aur poori list
 * ek block hai. Wahi `<ul>` ke andar `<ul>` (sub-bullet) ko bhi sahi rakhta hai — neeche depth
 * gini jaati hai, isliye andar wali list se bahar wali band nahi hoti.
 */
const BLOCK_TAGS = new Set(['p', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'])

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
 */
const SECTION_LABELS = Object.freeze({
  'day wise itinerary': 'itineraryStart',
  'daywise itinerary': 'itineraryStart',
  itinerary: 'itineraryStart',
  faqs: 'faqStart',
  faq: 'faqStart',
  questions: 'faqStart',
  'frequently asked questions': 'faqStart',
})

/**
 * FAQ ke andar ke khaane — client ka faisla (4 Sep): **`Question` / `Answer` ki jodi**.
 *
 * Numbering nahi hai (`Day 1` jaisi): har `Question` khud hi naya FAQ shuru kar deta hai.
 * Client ko har sawaal pe ginti likhna ek aur cheez hoti jo galat ho sakti thi.
 */
export const FAQ_LABELS = Object.freeze({
  question: 'question',
  q: 'question',
  answer: 'answer',
  a: 'answer',
  ans: 'answer',
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

/**
 * Lambe label pehle — warna `transfer` chhota hone ki wajah se `transfer duration` ko kha
 * jaata, aur har din ka duration `transfer` me chala jaata.
 */
const byLongestFirst = (map) => Object.keys(map).sort((a, b) => b.length - a.length)

const TOP_LABEL_ORDER = byLongestFirst(DOC_LABELS)
const DAY_LABEL_ORDER = byLongestFirst(DAY_LABELS)
const FAQ_LABEL_ORDER = byLongestFirst(FAQ_LABELS)
const SECTION_ORDER = byLongestFirst(SECTION_LABELS)

/** Naam milane ka ekmatra tareeka — case aur extra space maaf, **spelling nahi** (client). */
export const normalizeName = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** Label ki shakl — naam wali normalization + aakhir ka `:`. */
export const normalizeLabel = (value) => normalizeName(value).replace(/\s*:\s*$/, '')

/**
 * HTML entity wapas asli character me.
 *
 * `&nbsp;` ko asli space banana zaroori hai, warna wo character label ke beech baith kar
 * match todta hai.
 *
 * ⚠️ **Numeric entities (`&#8377;`) chhod dena ek chup bug tha.** Google `₹` ko `&#8377;` ki
 * tarah bhejta hai. Bina decode kiye wo text me `&#8377;24,999` reh jaata tha, aur `parseMoney`
 * saare non-digit hata kar `837724999` bana deta — yaani daam ki jagah ek bemaani number, jo
 * `pricingSchema` ki hadd paar kar ke poore package ko gira deta. Iska test hai.
 *
 * `&amp;` sabse aakhir me hai taaki `&amp;#39;` do baar decode na ho jaaye.
 */
const decodeEntities = (text) =>
  String(text ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gi, '&')

/** Ek block ka padha jaane wala text. */
const textOf = (html) =>
  decodeEntities(
    String(html ?? '')
      .replace(/<\/(p|li|ul|ol|h[1-6]|blockquote)>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()

/**
 * HTML ko top-level blocks me kaato — **depth gin kar, regex se nahi**.
 *
 * `/<ul>([\s\S]*?)<\/ul>/` jaisa non-greedy regex sub-bullet pe tootta hai: wo pehli
 * `</ul>` pe ruk jaata hai, jo andar wali list ki hoti hai, aur bahar wali list aadhi kat
 * jaati hai. Google Docs sub-bullets aksar bhejta hai, isliye ye ginti zaroori hai.
 */
function splitBlocks(html) {
  const blocks = []
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g
  let depth = 0
  let start = -1
  let match

  while ((match = tagRe.exec(String(html ?? '')))) {
    const [tag, closing, rawName, selfClose] = match
    const name = rawName.toLowerCase()

    if (!BLOCK_TAGS.has(name) || selfClose) continue

    if (!closing) {
      if (depth === 0) start = match.index
      depth += 1
      continue
    }

    /** Bina khule band tag — toota HTML. Ginti 0 se neeche na jaaye. */
    if (depth === 0) continue

    depth -= 1
    if (depth === 0 && start >= 0) {
      blocks.push(html.slice(start, match.index + tag.length))
      start = -1
    }
  }

  /** Aakhir me koi tag band hi na hua ho to jo bacha hai wo bhi ek block hai. */
  if (depth > 0 && start >= 0) blocks.push(html.slice(start))

  return blocks
}

/**
 * Is block ka text kisi label se shuru hota hai?
 *
 * Do shaklein chalti hain, kyunki client dono likhta hai:
 *
 * ```
 * Package Name :            ← label akela, value agle paragraph me (template)
 * Package Name : Andaman 5N ← label aur value ek hi line me
 * ```
 *
 * ⚠️ Label ke baad kuch bacha ho to `:` **zaroori** hai. Iske bina "Overview of the trip
 * covers…" jaisi asli line label ban jaati aur uske aage ka poora paragraph gayab ho jaata.
 */
function matchLabel(plain, order, map) {
  const lower = normalizeName(plain)

  for (const label of order) {
    if (!lower.startsWith(label)) continue

    let rest = plain.trim().slice(label.length).trim()

    if (rest.startsWith(':')) rest = rest.slice(1).trim()
    else if (rest) continue

    return { key: map[label], value: rest }
  }

  return null
}

/** Khaali `<p></p>` — Google har label ke baad ek chhod deta hai. */
const isEmptyBlock = (html) => !textOf(html) && !/<(img|br|hr|table)\b/i.test(html)

/**
 * Ek khaana — do shakl me, kyunki dono chahiye.
 *
 * `text` un khaanon ke liye jo plain string hain (`Best For`, `Transfer Duration`), aur
 * `html` un do ke liye jinme formatting bachni chahiye (`Overview`, `Day Description`).
 * Dono ek saath rakhne se mapper ko dobara parse nahi karna padta.
 */
const emptyValue = () => ({ text: '', html: '' })

function pushValue(bucket, key, { text, html }) {
  const slot = (bucket[key] ??= emptyValue())

  if (text) slot.text = slot.text ? `${slot.text}\n${text}` : text
  if (html) slot.html += html
}

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

/* ── ek-ek khaane ko padhna ───────────────────────────────────────────────── */

/**
 * `5`, `5 Nights`, `05` → `5`. Kuch na mile to `null`.
 *
 * Pehla poora number liya jaata hai, isliye `5 Nights / 6 Days` se `5` aata hai — aur wo
 * theek hai, kyunki Night aur Day ke apne alag label hain.
 */
export function parseCount(text) {
  const match = String(text ?? '').match(/\d+/)

  return match ? Number(match[0]) : null
}

/**
 * `₹24,999` · `24999` · `Rs. 24,999/-` → `24999`.
 *
 * ⚠️ Saare non-digit hata kar padha jaata hai, isliye `24,999` bilkul theek chalta hai. Paise
 * ka koi khaana nahi hai (`pricing.js` sirf integer leta hai), to dashamlav yahan aata hi nahi.
 */
export function parseMoney(text) {
  const digits = String(text ?? '').replace(/[^\d]/g, '')

  return digits ? Number(digits) : null
}

/**
 * `Port Blair, Havelock` · ek-per-line · `Port Blair · Havelock` → `['Port Blair', 'Havelock']`
 *
 * Teen alag separator isliye ki client teenon likhta hai — comma sabse aam, newline tab jab
 * doc me list banayi ho, aur `·` tab jab kahin se copy kiya ho.
 */
export function parseNameList(text) {
  return String(text ?? '')
    .split(/[,\n·|]/)
    .map((name) => name.trim())
    .filter(Boolean)
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

/**
 * `Package URL` se slug.
 *
 * Client poora URL paste kare (`https://…/packages/andaman-5-nights`) ya sirf slug likhe —
 * dono chalne chahiye. Aakhri hissa hi slug hai; query aur trailing slash hat jaate hain.
 */
export function parseSlug(text) {
  const raw = String(text ?? '')
    .trim()
    .split(/[?#]/)[0]
    .replace(/\/+$/, '')

  return raw.split('/').filter(Boolean).pop() ?? ''
}

/**
 * Lambi line ko hadd me laao, aur **bataao ki kaati gayi**.
 *
 * ⚠️ Bina iske ek 61 character ki `Transfer Duration` poore package ko gira deti hai, aur
 * client ko sirf `String must contain at most 60 character(s)` dikhta — jisse ye pata hi
 * nahi chalta ki galti kis din ke kis khaane me thi. Ek chhoti line ki wajah se poora
 * package rukna galat hai.
 */
export function clamp(text, limit, label, warnings) {
  const value = String(text ?? '').trim()

  if (value.length <= limit) return value

  warnings.push(`${label} was shortened to ${limit} characters`)

  return value.slice(0, limit).trim()
}
