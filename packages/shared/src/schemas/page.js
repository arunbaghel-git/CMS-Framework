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
 * **edit screen ek hi** hai, aur layout content editor ke blocks se aata hai.
 *
 * Isliye ye schema dono types pe ek jaisa lagta hai. Jo farak hai wo `content-types.js`
 * me hai (`urlPattern`, `hierarchical`), yahan nahi.
 *
 * ## Blocks HTML me kyun nahi baithe — D-87 ka sabse bada faisla
 *
 * `Package list` block ke apne settings hain (Package Type, Destination, sort, counts).
 * Unhe rakhne ki teen jagah thi, aur do khaarij hui:
 *
 * | Raasta | Kyun nahi |
 * | --- | --- |
 * | `data-*` attribute | `sanitize-html.js` ka `COMMON_ATTRS` sirf `class·id·style·title·dir·lang` deta hai. `data-*` kholna matlab sanitizer ka daayra **har** profile pe badhana (Overview, FAQ answer, itinerary din, cancellation policy…) — R20 ka ulta |
 * | class name me encode | Nazuk aur padhne me bura; per-duration count jaisi nested setting isme aati hi nahi |
 *
 * Jo chuna gaya: block ko **`id`** do (`id` sanitizer me pehle se allowed hai), aur
 * settings entry ke `fields.blocks[id]` me rakho. Do faayde: **sanitizer ko haath nahi
 * lagta**, aur shape `block.js` ke FROZEN `{id, type, props}` se hi aata hai — yaani
 * Phase 5 ka asli block registry aane pe takrav nahi hoga.
 *
 * ⚠️ **Iski ek keemat hai jo maan leni chahiye:** settings do jagah hain — HTML me
 * `<div id="blk-a1b2">` aur `fields.blocks['blk-a1b2']`. Client editor me wo `div` delete kar
 * de to `fields` me entry **bachi reh jaati hai** (orphan). Wo apne aap galat kuch nahi
 * karta — renderer sirf wahi blocks banata hai jo HTML me hain — par safai service layer
 * ka kaam hai, aur wo `pruneOrphanBlocks()` me hoti hai.
 */

/**
 * Block ki `id` — `blk-` + 4 se 12 lowercase alphanumeric.
 *
 * Ye ek **HTML `id`** hai, isliye wo hona chahiye jo HTML me valid ho aur sanitizer se
 * bach kar nikle. Pattern sakht jaan-boojh kar hai: client apne haath se `id` likh kar
 * do blocks ko ek hi settings pe point nahi kar sakta.
 */
export const BLOCK_ID_RE = /^blk-[a-z0-9]{4,12}$/

export const blockIdSchema = z.string().regex(BLOCK_ID_RE, 'Invalid block id')

/**
 * Jo blocks aaj bante hain — client ne 7 Sep ko **chaar** maange (faisla #4).
 *
 * ⚠️ Ye `packages/blocks` ka registry **nahi** hai. Wo file abhi khaali hai (`export {}`)
 * aur Phase 5 me bharegi. Chaar block ke liye poora registry khada karna aaj ka kaam nahi
 * hai — par shape wahin se liya gaya hai taaki us din inhe todna na pade.
 */
export const PAGE_BLOCK_TYPES = Object.freeze(['twoColumn', 'cards', 'packageList', 'faqs'])

/**
 * `Two column` — do khaane, aur unke beech ka anupaat.
 *
 * Andar ka **content props me nahi hai** — wo HTML me hi rehta hai, do
 * `contenteditable` khaanon me. Yahi is poore model ka tark: jo cheez client type karta
 * hai wo content hai, aur jo cheez wo chunta hai wo setting.
 */
export const twoColumnPropsSchema = z.object({
  ratio: z.enum(['50-50', '60-40', '40-60']).default('50-50'),
  /** Mobile pe daayan khaana pehle aaye — reference me kuch jagah ulta kram hai. */
  reverseOnMobile: z.boolean().default(false),
})

/** `Cards` ka ek card. Client ke faisle #5 se: alag panel nahi, editor ke andar hi. */
export const cardSchema = z.object({
  id: z.string().min(1).optional(),
  /**
   * Icon ek **enum** hai, koi SVG string nahi.
   *
   * Wahi tark jo footer column ki `width` pe hai (D-44): non-technical client se SVG
   * type karwana wahi bojh hai jise ye CMS hataane ke liye bana hai, aur free SVG ka
   * matlab hota sanitizer me ek naya raasta.
   */
  icon: z.enum(['none', 'shield', 'pin', 'doc', 'star', 'clock', 'check']).default('none'),
  title: z.string().trim().max(120).default(''),
  text: inlineHtmlSchema.pipe(z.string().max(600)).default(''),
  href: z.string().trim().max(500).default(''),
})

export const cardsPropsSchema = z.object({
  columns: z.number().int().min(2).max(4).default(3),
  items: z.array(cardSchema).max(12).default([]),
})

/**
 * `Package list` — page ka asli maal (`.prows` + `.fbar`).
 *
 * ⚠️ **Ye list yahan store nahi hoti.** Props sirf batate hain ki kaunse packages
 * chunne hain; asli cards server pe `resolve` ke payload me bante hain, `similar[]` ki
 * tarah. Naya endpoint jaan-boojh kar nahi banaya — usse `path:` cache tag aur ISR
 * dono muft me mil jaate hain (D-52, D-83).
 */
export const packageListPropsSchema = z.object({
  /** Khaali = sab package types. Taxonomy ki `id`, uska naam nahi (D-49). */
  packageTypeId: z.string().nullable().default(null),
  destinationId: z.string().nullable().default(null),

  sort: z.enum(['featured', 'price-asc', 'price-desc', 'recent', 'duration']).default('featured'),

  /** Kitne cards. 0 ka matlab "sab" nahi hai — wo `max` par ruk jaata hai. */
  limit: z.number().int().min(1).max(60).default(14),

  /** `.fbar` — Duration ke pills. Band karne pe poori bar render hi nahi hoti. */
  showFilters: z.boolean().default(true),

  /**
   * `2N / 3D [3]` — har duration pill pe uski apni ginti (client, faisla #8).
   *
   * ⚠️ Ginti **derive hoti hai, store nahi** — wahi niyam jo hotels table (D-58) aur
   * upar ke daam (D-56) pe hai. Store karne ka matlab hota ki naya package publish karte
   * hi har page ka number jhootha ho jaaye.
   */
  showCounts: z.boolean().default(true),
})

/**
 * `FAQs` block — aur uska structured data (client, faisla #7).
 *
 * FAQ ka shape `faq.js` se hi aata hai, dobara likha nahi gaya: package page ka
 * `Questions about this package` aur ye ek hi cheez hain, sirf jagah alag hai.
 *
 * ⚠️ `emitSchema` **is block pe** hai, site-level toggle pe nahi. Wajah D-82 ki ulti
 * hai: `seoSchema` per-package tha aur wo galat tha kyunki site ya to structured data
 * bhejti hai ya nahi. Yahan sawaal alag hai — **ek page pe do FAQ block** ho sakte hain
 * (jaise "Booking FAQs" aur "Ferry FAQs"), aur Google ko ek page pe ek hi `FAQPage`
 * chahiye. To ye "kaunsa block schema deta hai" ka faisla hai, "site schema deti hai ya
 * nahi" ka nahi.
 */
export const faqsPropsSchema = z.object({
  items: z.array(faqSchema).max(50).default([]),
  emitSchema: z.boolean().default(true),
})

/**
 * Ek block ka poora record — `block.js` ke FROZEN `{id, type, props}` ka hi shape.
 *
 * `style` aur `children` yahan nahi hain: aaj layout HTML se aata hai, block tree se
 * nahi. Phase 5 me jab asli registry aayegi tab wo dono is envelope me pehle se maujood
 * hain — isiliye ye file un naamon se takrati nahi.
 */
export const pageBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('twoColumn'), props: twoColumnPropsSchema.default({}) }),
  z.object({ type: z.literal('cards'), props: cardsPropsSchema.default({}) }),
  z.object({ type: z.literal('packageList'), props: packageListPropsSchema.default({}) }),
  z.object({ type: z.literal('faqs'), props: faqsPropsSchema.default({}) }),
])

/**
 * `fields.blocks` — block id se uske settings tak ka naksha.
 *
 * `record` isliye hai, array nahi: **kram HTML me hai**, yahan nahi. Array rakhne ka
 * matlab hota do jagah kram — aur wo do din me alag ho jaate. Yahi wajah hai ki orphan
 * bhi apne aap galat kuch nahi karta: renderer HTML padhta hai, is naksha ko sirf
 * lookup ki tarah.
 */
export const pageBlocksSchema = z.record(blockIdSchema, pageBlockSchema).default({})

/**
 * Stat rail — reference ka `.vrail` (chaar cards, pehla `--p` yaani highlighted).
 *
 * Pehla card reference me daam dikhata hai (`₹11,499` + `/ person`), baaki teen saade
 * number hain (`40+ Itineraries`). Isliye `value` aur `suffix` do alag field hain: bina
 * `suffix` ke client ko `₹11,499/ person` ek hi line me likhna padta aur wo chhota
 * italic hissa apna style kho deta.
 *
 * ⚠️ Ye **haath se likha jaata hai, derive nahi hota** — wahi faisla jo `ferriesNote`
 * (D-53) aur rating (D-70) pe hai. "40+ Itineraries" jaisi baat ginti se nikaalna ja to
 * sakta tha, par "Local team in Port Blair" jaisi nahi; aadha derived aadha likha hua
 * rail sabse buri shakl hoti.
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
 * `eyebrow` **per-page** hai (faisla #13), par breadcrumb ka label **nahi** — wo parent
 * se auto banta hai (faisla #12). Do alag cheezein hain jo dikhne me ek jaisi lagti hain.
 */
export const eyebrowSchema = z.string().trim().max(120).default('')

/** Sub heading ek asli editor hai, plain text nahi (faisla #3) — isliye HTML. */
export const subheadingSchema = htmlSchema.pipe(z.string().max(2000)).default('')

/**
 * HTML me se un blocks ki ids nikaalta hai jo **sach me maujood** hain.
 *
 * D-87 ka model do jagah rakhta hai — layout `content` ki HTML me, settings
 * `fields.blocks` me. Sach ka source **HTML hai**: renderer wahi padhta hai. Ye function
 * usi sach ko padhne ka ek hi tareeka hai, taaki service aur theme dono ek hi jawab par
 * chalein.
 *
 * ⚠️ Regex se padhna yahan theek hai aur wo soch kar chuna gaya hai: ye HTML **sanitizer se
 * guzar chuki** hoti hai (R20, write pe), yaani `id` ka shape pehle se seemit hai aur
 * `<script>` jaisa kuch bacha hi nahi. Ek poora DOM parser server pe khada karna is ek
 * lookup ke liye mehnga hai. Dono quote allow hain kyunki client "Text tab" me apne haath se
 * bhi likh sakta hai (D-80).
 *
 * @param {string} html
 * @returns {Set<string>}
 */
export function collectBlockIdsFromHtml(html) {
  const ids = new Set()
  for (const match of String(html ?? '').matchAll(/\bid=["'](blk-[a-z0-9]{4,12})["']/g)) {
    ids.add(match[1])
  }
  return ids
}
