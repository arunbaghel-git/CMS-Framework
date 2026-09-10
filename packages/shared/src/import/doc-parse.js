/**
 * Google Doc padhne ki saanjhi machinery — Bulk Upload (D-81, spec 008).
 *
 * ## Ye file kyun bani
 *
 * Ye poora hissa pehle `package-doc.js` ke andar tha, jahan wo theek bhi tha — ek hi parser
 * tha. Blog ke aane pe do parser ho gaye (`package-doc.js` aur `post-doc.js`), aur dono ko
 * bilkul yahi cheezein chahiye: blocks me kaatna, label pehchanna, aur value padhna.
 *
 * Do copies rakhna is repo me **pehchani hui galti** hai — `bestFor` similar cards pe chhoot
 * gaya tha (D-87), `htmlToText` do jagah bani thi, aur D-86 me to dhoondhne aur save karne ka
 * slug hi alag ho gaya tha, jisse har import duplicate banata raha. Isliye jo dono ka hai wo
 * yahan hai, aur jo apna-apna hai (labels ka naksha) wo apni file me.
 *
 * ⚠️ **Yahan koi safai nahi hoti.** Ise **saaf** HTML milti hai — `cleanGoogleHtml()`
 * (`apps/api/src/core/google-html.js`) pehle Google ke `class`/`style`/`<span>` hata chuka
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
 * `Destinations ` me aakhir me space hai; `Standard Hotel : ` me dono. Blog ke doc me `Faq:`
 * hai aur `answer` chhote akshar me. Isliye har label pe wahi normalization chalti hai:
 * **trim → andar ke space ek → lowercase → aakhri `:` hatao**.
 */

/**
 * Wo tags jo apni ek "line" banate hain.
 *
 * `<li>` yahan **jaan-boojh kar nahi** hai: wo apni `<ul>` ke andar rehta hai, aur poori list
 * ek block hai. Wahi `<ul>` ke andar `<ul>` (sub-bullet) ko bhi sahi rakhta hai — neeche depth
 * gini jaati hai, isliye andar wali list se bahar wali band nahi hoti.
 *
 * ⚠️ `table` yahan **hai**, aur wo blog ke saath juda (spec 008). Bina uske client ki table ka
 * har cell ek alag block ban jaata aur poori table label-matching se guzarti — yaani ek cell me
 * likha `Content` section badal deta. Table ek hi block honi chahiye.
 */
const BLOCK_TAGS = new Set([
  'p',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'table',
  'figure',
])

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

/**
 * Ek block ka padha jaane wala text.
 *
 * ⚠️ `</td>`/`</th>` ke baad bhi space chahiye. Bina uske table ka har row ek chipka hua
 * shabd ban jaata hai — `Makruzz90 minutes₹1,400` — aur wahi galti D-82 me `stripTags` pe
 * pakdi gayi thi.
 */
const textOf = (html) =>
  decodeEntities(
    String(html ?? '')
      .replace(/<\/(p|li|ul|ol|h[1-6]|blockquote|td|th|tr|caption|figcaption)>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()

export { textOf }

/**
 * HTML ko top-level blocks me kaato — **depth gin kar, regex se nahi**.
 *
 * `/<ul>([\s\S]*?)<\/ul>/` jaisa non-greedy regex sub-bullet pe tootta hai: wo pehli
 * `</ul>` pe ruk jaata hai, jo andar wali list ki hoti hai, aur bahar wali list aadhi kat
 * jaati hai. Google Docs sub-bullets aksar bhejta hai, isliye ye ginti zaroori hai.
 *
 * ⚠️ Yahi ginti table ko bhi bachati hai: `<table>` ke andar `<p>` hote hain, aur depth 0 pe
 * hi block band hone se poori table ek block rehti hai.
 */
export function splitBlocks(html) {
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
 * Lambe label pehle — warna `transfer` chhota hone ki wajah se `transfer duration` ko kha
 * jaata, aur har din ka duration `transfer` me chala jaata.
 */
export const byLongestFirst = (map) => Object.keys(map).sort((a, b) => b.length - a.length)

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
export function matchLabel(plain, order, map) {
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
export const isEmptyBlock = (html) => !textOf(html) && !/<(img|br|hr|table)\b/i.test(html)

/**
 * Ek khaana — do shakl me, kyunki dono chahiye.
 *
 * `text` un khaanon ke liye jo plain string hain (`Best For`, `Transfer Duration`), aur
 * `html` un ke liye jinme formatting bachni chahiye (`Overview`, `Day Description`, blog ka
 * poora `Content`). Dono ek saath rakhne se mapper ko dobara parse nahi karna padta.
 */
export const emptyValue = () => ({ text: '', html: '' })

export function pushValue(bucket, key, { text, html }) {
  const slot = (bucket[key] ??= emptyValue())

  if (text) slot.text = slot.text ? `${slot.text}\n${text}` : text
  if (html) slot.html += html
}

/**
 * FAQ ke andar ke khaane — client ka faisla (4 Sep): **`Question` / `Answer` ki jodi**.
 *
 * Numbering nahi hai (`Day 1` jaisi): har `Question` khud hi naya FAQ shuru kar deta hai.
 * Client ko har sawaal pe ginti likhna ek aur cheez hoti jo galat ho sakti thi.
 *
 * ⚠️ Ye package aur post **dono** ka hai. Blog ke doc me client ne `answer` chhote akshar me
 * likha hai — `normalizeLabel()` uska khayaal rakhta hai.
 *
 * ⚠️ **Isme sirf sawaal-jawab ki jodi hai.** Blog ke doc me FAQ section ka apna `Heading` bhi
 * hai, par wo yahan **jaan-boojh kar nahi** hai: use yahan jodne ka matlab hota ki package ka
 * parser bhi achaanak `Heading` ko ek label maanne lage, jabki uske FAQ me aisa kuch hai hi
 * nahi. Har parser apne extra labels khud jodta hai (`post-doc.js` dekho).
 */
export const FAQ_LABELS = Object.freeze({
  question: 'question',
  q: 'question',
  answer: 'answer',
  a: 'answer',
  ans: 'answer',
})

/**
 * FAQ ka section marker — **dono parser ise pehchante hain**.
 *
 * ⚠️ Alag constant isliye hai ki dono parser apni `SECTION_LABELS` banate hain (package me
 * itinerary bhi hai, post me nahi). Do jagah haath se likhne ka matlab hota ki kal koi ek
 * synonym ek parser me jude aur doosre me nahi — aur uska lakshan "FAQ aayi hi nahi" hota,
 * koi error nahi.
 *
 * Client ke blog doc me ye `Faq:` hai, jo `normalizeLabel()` ke baad `faq` ban jaata hai.
 */
export const FAQ_SECTION_LABELS = Object.freeze({
  faqs: 'faqStart',
  faq: 'faqStart',
  questions: 'faqStart',
  'frequently asked questions': 'faqStart',
})

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
 * URL se slug.
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
