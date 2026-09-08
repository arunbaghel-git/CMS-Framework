import { z } from 'zod'

import { faqSchema } from './faq.js'
import { htmlSchema, inlineHtmlSchema } from './rich-html.js'

/**
 * Page aur Tour Page ka content shape — **D-87** (client, 7 Sep).
 *
 * ## Ek edit screen, do content type
 *
 * Client ne 7 Sep ko do baar palta. Pehle "do template" (Text article + Package archive)
 * tay hua tha, phir wo poora rad hua: ab **koi template hai hi nahi**. `Pages` aur
 * `Tour Pages` do content type isliye hain ki unka **menu, list aur URL alag** hai — unka
 * **edit screen ek hi** hai.
 *
 * ## Content ek block list hai — §7 (7 Sep, shaam)
 *
 * ⚠️ **Ye §2 ka palan nahi, uska palat hai.** Pehle tay hua tha ki layout ek hi HTML field
 * me rahega aur blocks uske andar `<div id="blk-a1b2">` ki tarah baithenge, settings alag
 * `fields.blocks{}` me. Client ne wo demo me dekh kar mana kiya:
 *
 * > _"Two column / Cards wala poora panel hoga, ye nahi ki content editor ke andar hi bana
 * > diya. Add kar sake ki 2 column chahiye — dropdown se."_
 *
 * Ab **`content.blocks[]` hi kram hai**. Har block apna panel hai, dropdown se judta hai,
 * grip se reorder hota hai. **Normal likhai bhi ek block hai** (`richText`) — ek page pe kai
 * ho sakte hain.
 *
 * Ye zaroori hai, sirf UI ki pasand nahi: reference page (`tour-v3.html`) me blocks content
 * ke **beech** me aate hain — `h2 → package list → h2 → cards → h2 → FAQs`. "Ek content
 * editor + neeche alag panels" us page ko bana hi nahi sakta tha.
 *
 * ## Jo is palat se apne aap khatam ho gaya
 *
 * | §2 ki keemat | Ab |
 * | --- | --- |
 * | settings do jagah (HTML me `id`, `fields` me props) | **ek hi jagah** — block ke apne `props` |
 * | orphan blocks (`pruneOrphanBlocks()`) | ban hi nahi sakte |
 * | `collectBlockIdsFromHtml()` ka regex | zaroorat nahi |
 * | sanitizer me `data-*` ka poora sawaal | uthta hi nahi |
 * | TinyMCE me `contenteditable=false` wrapper | har Text block ka apna saada editor |
 *
 * Aur sabse badi baat: ye **`block.js` ka wahi FROZEN `{id, type, props}`** hai jo spec 002
 * me Phase 1 se maujood hai. Yaani hum framework ke apne block model par hain, uske aas-paas
 * ki jugaad par nahi — aur Phase 5 ka builder yahi data utha lega.
 */

/**
 * Jo blocks aaj bante hain — client ne chaar maange, aur `richText` pehle se tha.
 *
 * `richText` yahan **jaan-boojh kar** hai: wo Phase 1 se maujood hai (`contentFromRichText()`)
 * aur ab wo "Text" block hai jise client dropdown se jodta hai. Use is list se bahar rakhne
 * ka matlab hota ki wo ek alag darje ki cheez lage, jabki editor me wo baaki jaisa hi ek
 * panel hai.
 *
 * ⚠️ Ye `packages/blocks` ka registry **nahi** hai. Wo file abhi khaali hai (`export {}`) aur
 * Phase 5 me bharegi. Paanch block ke liye poora registry khada karna aaj ka kaam nahi hai —
 * par shape wahin se liya gaya hai taaki us din inhe todna na pade.
 */
export const PAGE_BLOCK_TYPES = Object.freeze([
  'richText',
  'twoColumn',
  'cards',
  'packageList',
  'faqs',
])

/** `richText` — "Text" block. Poora content ek HTML string me, jaisa D-80 se hai. */
export const richTextPropsSchema = z.object({
  html: htmlSchema,
})

/**
 * `Two column` — do khaane aur unke beech ka anupaat.
 *
 * ⚠️ Dono khaanon ka content **props me hai** (`left`/`right`), aur ye §2 se ulta hai. Wahan
 * content ek hi HTML me tha aur block sirf uske andar ka wrapper; ab block apna panel hai,
 * to uske do editor uske apne hain. Ek hi HTML me rakhne ka matlab hota ki panel ko wapas
 * usme se apna hissa kaat kar nikaalna pade — theek wahi jugaad jise client ne mana kiya.
 */
export const twoColumnPropsSchema = z.object({
  ratio: z.enum(['50-50', '60-40', '40-60']).default('50-50'),
  left: htmlSchema,
  right: htmlSchema,
  /** Mobile pe daayan khaana pehle aaye — reference me kuch jagah ulta kram hai. */
  reverseOnMobile: z.boolean().default(false),
})

/** `Cards` ka ek card — demo ke teen khaane: title, text, aur ek chhota tag. */
export const cardSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().max(120).default(''),
  text: inlineHtmlSchema.pipe(z.string().max(600)).default(''),
  /**
   * `Short break`, `Best for first-timers` — card ke neeche ki chhoti line.
   *
   * ⚠️ Pehle yahan ek `icon` enum banaya gaya tha. Wo **mera andaza tha, design nahi** —
   * `admin-design-v3.html` me har card pe `Tag (optional)` likha hai, icon kahin nahi hai.
   * Design frozen hai (R15), isliye tag rakha gaya.
   */
  tag: z.string().trim().max(60).default(''),
  href: z.string().trim().max(500).default(''),
})

export const cardsPropsSchema = z.object({
  columns: z.number().int().min(2).max(4).default(3),
  items: z.array(cardSchema).max(12).default([]),
})

/**
 * Duration ke buckets — `.fbar` ke pills.
 *
 * `d2`…`d7` ek-ek raat ke liye, `d8plus` aath aur usse lambi ke liye. Aakhri bucket
 * reference se aaya hai: `tour-v3.html` me literally `data-f="d8,d9,d12"` likha hai. Bina
 * uske ek 8N, ek 9N aur ek 12N package teen alag pills bana dete aur bar lambi hoti chali
 * jaati.
 */
export const DURATION_BUCKETS = Object.freeze(['d2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8plus'])

/** Jis raat se aage sab ek hi bucket me — `8N and longer`. */
export const LONG_STAY_FROM = 8

/**
 * Nights se uska bucket. `null` un packages ke liye jinpe nights likhi hi nahi.
 *
 * @param {number | null | undefined} nights
 */
export function durationBucket(nights) {
  if (nights == null) return null
  if (nights >= LONG_STAY_FROM) return 'd8plus'
  return DURATION_BUCKETS.includes(`d${nights}`) ? `d${nights}` : null
}

/**
 * Bucket se Mongo ka filter — `entries` list ke `duration` param ke liye.
 *
 * ⚠️ **Yahi jagah bucket ka matlab tay karti hai, dono taraf ke liye.** `durationBucket()`
 * padhne ka raasta hai (nights → bucket) aur ye likhne ka (bucket → query). Do jagah likhne ka
 * matlab hota ki kal `LONG_STAY_FROM` badle aur ek taraf 8 rah jaaye — theek wahi shakl jo D-86
 * ke slug pe thi, jahan dhoondhne aur save karne ka tareeka alag ho gaya tha.
 *
 * @param {string | null | undefined} bucket
 * @returns {object | null} `fields.nights` ka filter, ya `null` jab bucket hi galat ho
 */
export function durationQuery(bucket) {
  if (!bucket || !DURATION_BUCKETS.includes(bucket)) return null
  if (bucket === 'd8plus') return { 'fields.nights': { $gte: LONG_STAY_FROM } }

  return { 'fields.nights': Number(bucket.slice(1)) }
}

/**
 * **Do alag filter hain, aur unka kaam bilkul alag hai** (client, 8 Sep — doosra pass).
 *
 * Pehle ek hi radio tha jo dono kaam karta tha: admin me list chhoti karta tha, **aur** page pe
 * pills laata tha. Client ne wo alag karwaya:
 *
 * > _"Jo filter abhi admin me hai wo **only left side ke liye** rahega. Ab right side me bhi ek
 * > checkbox ka filter lagao jo single check kar sake, **for showing filtered packages on
 * > frontend**."_
 *
 * | | Kahan | Kiske liye | Store hota hai? |
 * | --- | --- | --- | --- |
 * | `browseBy` | picker ka **baayan** column | **admin** — package dhoondhne ke liye | haan, taaki agli baar wahi chunav khula mile |
 * | `pageFilter` | picker ka **daayan** column | **visitor** — page pe filter bar | haan, wo page ka hissa hai |
 *
 * ⚠️ Ye lakeer zaroori thi. Ek hi control se dono kaam karwane ka matlab tha ki client ko
 * "Honeymoon" chunna pade **sirf** isliye ki wo Honeymoon packages dhoondh raha hai — aur uska
 * side-effect page pe chala jaata.
 */

/**
 * Baayen column ko chhota karne ke tareeke.
 *
 * ⚠️ `duration` yahan **wapas aaya hai** (client, 8 Sep). Pehle use nikaal diya gaya tha kyunki
 * `nights` `fields` ke andar baithi hai aur list endpoint uspe filter nahi karta tha — yaani wo
 * radio dabaane pe kuch hota hi nahi.
 *
 * Client ne poochha ki use hataya kyun; aur wo theek tha — **option hatane ki jagah use chalana
 * chahiye tha.** Ab `entryListQuerySchema` me `duration` param hai aur service bucket ko Mongo
 * filter me badalti hai (`durationQuery()`).
 */
export const PACKAGE_BROWSE_FILTERS = Object.freeze([
  'all',
  'packageType',
  'destination',
  'duration',
])

/**
 * Page pe visitor ko kaunsi filter bar milegi — **ek hi, ya koi nahi**.
 *
 * Client ne checkbox maange (radio nahi) par shart wahi rakhi: _"single check kar sake, not
 * multiple"_. Isliye UI checkbox hai aur behaviour radio ka — dusra chunte hi pehla khul jaata
 * hai. Wo `none` pe wapas aane ka raasta bhi de deta hai, jo radio nahi deta.
 */
export const PACKAGE_PAGE_FILTERS = Object.freeze([
  'none',
  'packageType',
  'destination',
  'duration',
])

/**
 * `Package list` — page ka asli maal (`.prows` + `.fbar`).
 *
 * ⚠️ **Cards yahan store nahi hote.** Props sirf batate hain ki kaunse packages, kis kram me;
 * asli cards server pe `resolve` ke payload me bante hain, `similar[]` ki tarah. Naya endpoint
 * jaan-boojh kar nahi banaya — usse `path:` cache tag (D-52) aur ISR (D-83) dono muft mil jaate
 * hain.
 */
export const packageListPropsSchema = z.object({
  /** Design me ye do field block ke sabse upar hain — section ka heading aur uske neeche ki line. */
  heading: z.string().trim().max(200).default(''),
  subheading: z.string().trim().max(300).default(''),

  /**
   * **Sirf admin ke picker ke liye** — baayen wali list kis kasauti se chhoti ho.
   *
   * ⚠️ Iska page pe **koi asar nahi** hai. Page pe wahi packages jaate hain jo `packageIds` me
   * hain, aur unpe kaunsi filter bar dikhegi wo `pageFilter` tay karta hai.
   */
  browseBy: z.enum(PACKAGE_BROWSE_FILTERS).default('all'),

  /** `browseBy` ki value. Taxonomy ki `id`, uska naam nahi (D-49). */
  packageTypeId: z.string().nullable().default(null),
  destinationId: z.string().nullable().default(null),
  /** `browseBy: 'duration'` ki value — bucket ki key (`d2` … `d8plus`). */
  browseDuration: z.enum(DURATION_BUCKETS).nullable().default(null),

  /**
   * **Page pe visitor ko kaunsi filter bar milegi** — `.fbar`.
   *
   * Facets chune hue packages me se hi bunti hain, poore collection se nahi: bar aur cards ek
   * hi set ke do roop hone chahiye, warna ek pill pe click karne pe page khaali ho jaata hai.
   */
  pageFilter: z.enum(PACKAGE_PAGE_FILTERS).default('none'),

  /*
   * ⚠️ **`showBadges` hata diya gaya** (client, 8 Sep): _"rating aur discount badge wala
   * checkbox hatao — default package me hoga to automatically aayega hi."_
   *
   * Wo theek tha. Rating aur discount **derived** hain — rating `fields.rating` ya
   * `packageDefaults.rating` se aati hai, discount `strikePrice` se. Jo cheez hai wo dikhegi,
   * jo nahi hai wo apne aap gayab hai. Uske upar ek toggle rakhne ka matlab tha **do jagah se
   * "nahi dikhana"** — aur do me se ek hi yaad rehta.
   *
   * Wahi soch jo pricing (D-56) aur stat rail pe hai: khaali daam = wo category milti hi nahi;
   * koi alag "ye category chhupao" wala switch nahi hai.
   */

  /**
   * **Is page pe kaunse packages, aur kis kram me** — client ka faisla (8 Sep).
   *
   * ⚠️ **Ye poora model 7 Sep se ulta hai.** Pehle block ek *filter* tha: client kasauti
   * chunta tha aur server list banata tha (sort, limit, featured-first, duration checkboxes).
   * Client ne wo dekh kar do-column wala picker maanga — baayen saare packages, daayen chune
   * hue, drag se kram.
   *
   * Isliye purane chaaron filter (`sort`, `featuredFirst`, `durations`, `limit`) **hata diye
   * gaye**: jab kram aur ginti dono client khud tay kar raha hai, unka koi matlab nahi bachta.
   *
   * ⚠️ **Ek nateeja maan liya gaya hai:** naya package publish hone pe wo apne aap kisi tour
   * page pe **nahi** aayega — client ko us page pe jaakar use chunna padega. Pehle ulta tha.
   * Ye keemat hai us control ki jo do-column picker deta hai.
   *
   * Kram **isi array ka** hai. Wahi soch jo `content.blocks[]` pe hai (D-87 §7): kram wahin
   * rehta hai jahan cheez rehti hai, kisi alag `order` field me nahi.
   */
  packageIds: z.array(z.string()).max(60).default([]),
})

/**
 * `FAQs` block — aur uska structured data (client ka faisla #7).
 *
 * FAQ ka shape `faq.js` se hi aata hai, dobara likha nahi gaya: package page ka
 * `Questions about this package` aur ye ek hi cheez hain, sirf jagah alag hai.
 *
 * ## ⚠️ `emitSchema` ka toggle hata diya gaya (client, 8 Sep)
 *
 * Client ne poochha: _"do I need this checkbox?"_ — aur jawab **nahi** tha.
 *
 * Wo toggle is dar se bana tha ki ek page pe **do FAQ block** ho sakte hain aur Google ko ek
 * page pe ek hi `FAQPage` chahiye — to client chunta ki kaunsa block schema de. Par wo sawaal
 * hi galat tha: sahi jawab ye hai ki **page ke saare FAQ blocks milaa kar ek hi `FAQPage`**
 * banti hai. Google ko yahi chahiye, aur client ko kuch chunna hi nahi padta.
 *
 * Wahi tark jo `showBadges` pe laga (usi din): **jo cheez apne aap sahi ho sakti hai, uspe
 * toggle rakhna client ko ek aisa faisla dena hai jo uska hai hi nahi.** Aur har toggle ek
 * aisi haalat banata hai jisme koi use band karke bhool jaata hai.
 *
 * ⚠️ Schema banana **Slice D** ka kaam hai (theme). Tab tak ye block sirf content rakhta hai.
 */
export const faqsPropsSchema = z.object({
  heading: z.string().trim().max(200).default(''),

  /**
   * Heading ke neeche ki line — **asli editor**, plain text nahi (client, 8 Sep).
   *
   * Wahi jodi jo `packageDefaults.sectionLabels` pe hai (D-65): har section ka apna heading aur
   * uske neeche apni line. Wahan bhi wo rich text hai (D-69), aur usi wajah se — client ko usme
   * bold aur link chahiye hote hain.
   *
   * ⚠️ **Khaali line poori tarah gayab ho jaati hai**, khaali heading ki tarah fallback pe nahi
   * jaati. Yahi D-65 wala model hai, aur wahan uska tark likha hai: heading ke bina section
   * bemaani lagta hai, par line ke bina bilkul theek dikhta hai.
   */
  description: htmlSchema.pipe(z.string().max(2000)).default(''),

  items: z.array(faqSchema).max(50).default([]),
})

/**
 * Block type se uske props ka schema — **ek hi jagah**.
 *
 * ⚠️ Jis type ka naam yahan nahi hai uske props **chhoot jaate hain, gir nahi jaate**.
 * `blockSchema.props` `z.record(z.unknown())` hai (spec 002, Phase 5 ka escape hatch), aur wo
 * jaan-boojh kar khula hai. Naya block type jodne wale ko yaad rehna chahiye: **is naksha me
 * naam na hone ka matlab hai "koi validation nahi"**, "block nahi ban sakta" nahi.
 */
export const PAGE_BLOCK_PROP_SCHEMAS = Object.freeze({
  richText: richTextPropsSchema,
  twoColumn: twoColumnPropsSchema,
  cards: cardsPropsSchema,
  packageList: packageListPropsSchema,
  faqs: faqsPropsSchema,
})

/**
 * Ek block ke props validate karo — anjaan type ke props waise ke waise jaate hain.
 *
 * @param {string} type
 * @param {unknown} props
 */
export function parseBlockProps(type, props) {
  const schema = PAGE_BLOCK_PROP_SCHEMAS[type]
  return schema ? schema.parse(props ?? {}) : (props ?? {})
}

/**
 * Stat rail — reference ka `.vrail` (chaar cards, pehla `--p` yaani highlighted).
 *
 * Pehla card reference me daam dikhata hai (`₹11,499` + `/ person`), baaki teen saade number
 * hain (`40+ Itineraries`). Isliye `value` aur `suffix` do alag field hain: bina `suffix` ke
 * client ko `₹11,499/ person` ek hi line me likhna padta aur wo chhota italic hissa apna
 * style kho deta.
 *
 * ⚠️ Ye **haath se likha jaata hai, derive nahi hota** — wahi faisla jo `ferriesNote` (D-53)
 * aur rating (D-70) pe hai. "40+ Itineraries" jaisi baat ginti se nikaali ja sakti thi, par
 * "Local team in Port Blair" jaisi nahi; aadha derived aadha likha hua rail sabse buri shakl
 * hoti.
 */
export const statSchema = z.object({
  id: z.string().min(1).optional(),
  value: z.string().trim().max(40).default(''),
  /** `/ person` — `value` ke saath chhota italic. Khaali ho to render hi nahi hota. */
  suffix: z.string().trim().max(40).default(''),
  label: z.string().trim().max(120).default(''),
  /** Pehla card — `.vrail__c--p`. Reference me ye hamesha ek hi hota hai. */
  highlight: z.boolean().default(false),
})

/** Reference me chaar hain, aur `.vrail__in` ka grid chaar se zyada pe toot-ta hai. */
export const statRailSchema = z.array(statSchema).max(4).default([])

/**
 * Page ka apna prose — title ke upar ki chhoti line, aur uske neeche ka sub heading.
 *
 * `eyebrow` **per-page** hai (faisla #13), par breadcrumb ka label **nahi** — wo parent se
 * auto banta hai (faisla #12). Do alag cheezein hain jo dikhne me ek jaisi lagti hain.
 */
export const eyebrowSchema = z.string().trim().max(120).default('')

/** Sub heading ek asli editor hai, plain text nahi (faisla #3) — isliye HTML. */
export const subheadingSchema = htmlSchema.pipe(z.string().max(2000)).default('')

/**
 * Page pe sidebar — **sirf dikhe ya nahi, aur kis taraf** (client, 8 Sep).
 *
 * ⚠️ **Kaunsa form dikhega, wo yahan tay nahi hota** — client ne wo saaf kiya: _"sidebar me
 * only layout aur visibility tay karega, not kaunsa form; wo to Appearance me alag kaam hai."_
 * Yaani faisla #14 poora palta nahi — wo **do hisson me bat gaya**:
 *
 * | Sawaal | Kahan |
 * | --- | --- |
 * | Sidebar hai ya nahi, aur kis taraf | **page pe** (ye field) |
 * | Usme kya dikhega (form, widgets) | `Appearance ▸ Sidebar` — alag kaam (Slice E) |
 *
 * Ye lakeer theek us jagah hai jahan hona chahiye: **layout page ka apna faisla hai** (ek lambe
 * article pe sidebar chubhta hai, ek listing page pe kaam ka hai), par **content site ka** —
 * har page pe alag form rakhna wahi bikhraav banata jise D-65 ne section labels pe roka tha.
 *
 * ⚠️ `none` default hai, `right` nahi. Reference tour page pe sidebar hai, par default se use
 * daal dene ka matlab hota ki har naya page bina maange ek khaali sidebar le kar aaye —
 * D-30: khaali cheez khaali dikhe, tooti hui nahi.
 */
export const PAGE_SIDEBAR = Object.freeze(['none', 'left', 'right'])

export const sidebarSchema = z.enum(PAGE_SIDEBAR).default('none')
