import { z } from 'zod'

import { ICONS } from '../constants/icons.js'
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
  'postList',
])

/**
 * Kis content type pe dropdown me kaunse blocks — **spec 008** (Blog).
 *
 * ⚠️ **Ye sirf UI ki rok hai, server ki nahi.** Server pe per-type block allowlist hai hi
 * nahi: `parseBlockProps()` type dekh kar props validate karta hai, par "ye block is type pe
 * chalega ya nahi" wo nahi poochta. `packageList` pe bhi aaj yahi haal hai.
 *
 * Ye likha ja raha hai taaki koi baad me server guard **dhoondhe nahi** — wo hai hi nahi, aur
 * uski zaroorat bhi nahi: block galat page pe pahunch bhi jaaye to uska renderer wahan kuch
 * nahi banata (D-30).
 */
export const POST_BLOCK_TYPES = Object.freeze(['richText', 'faqs'])

/**
 * `blogPage` ka dropdown — listing page.
 *
 * ⚠️ `packageList` yahan **nahi** hai: blog listing pe packages ki list bemaani hai, aur
 * `postList` uska joda hai. Client ne blog ke liye teen cheez maangi thin — featured teen,
 * latest ki grid, aur topic filter — teenon `postList` ke andar hain.
 */
export const BLOG_PAGE_BLOCK_TYPES = Object.freeze(['richText', 'postList', 'faqs'])

/**
 * `homePage` ke sections — **client ek-ek karke bata raha hai** (15 Sep, D-96).
 *
 * Poora page ek saath nahi banega; jo section maanga gaya wahi yahan hai. Reference ke comment
 * wale number (`3. HERO`, `5. COUNTERS`…) kram nahi hain — kram client drag se lagata hai.
 */
export const HOME_PAGE_BLOCK_TYPES = Object.freeze([
  'heroForm',
  'infoCards',
  'imageCards',
  'faqs',
  'videoReviews',
  'testimonials',
])

/**
 * Section ka background — **koi bhi rang, picker se** (client, 15 Sep, D-96).
 *
 * ⚠️ D-08/D-20 ka niyam "sirf theme ke rang" tha. Client ne saaf picker maanga (R15), aur D-93
 * (`taxonomies.color`) me free hex pehle se chal raha hai. Rok sirf **shape** pe hai: `#rrggbb`,
 * aur kuch nahi. Gradient, `url()` ya `;` wali string yahan se guzar hi nahi sakti — ye value
 * theme me inline `style` me jaati hai.
 *
 * Khaali = section ka apna default rang (hero ka gehra neela).
 */
export const sectionBackgroundSchema = z
  .string()
  .trim()
  .regex(/^(#[0-9a-fA-F]{6})?$/, 'Background must be a colour like #0b2b4a')
  .transform((v) => v.toLowerCase())
  .default('')

/**
 * Hero ka ek number — reference ka `.hero__stats .stat` (`17 yrs` / `Operating from Port Blair`).
 *
 * ⚠️ `statSchema` reuse **nahi** kiya: uske `suffix` aur `highlight` Tour ke `.vrail` ki cheezein
 * hain, aur is design me dono hain hi nahi. Admin me do khaali khaane padey rehna wahi sawaal
 * paida karta jiska koi jawab nahi (D-30).
 */
export const heroStatSchema = z.object({
  id: z.string().min(1).optional(),
  value: z.string().trim().max(40).default(''),
  label: z.string().trim().max(120).default(''),
})

/**
 * `Hero with form` — reference ka `3. HERO` (`.hero`): background image, baayein title +
 * description + chaar number, daayein enquiry form ka card (client, 15 Sep).
 *
 * ## Form **seedha chuna jaata hai**, sidebar se nahi
 *
 * Sidebar ek widget **list** hai; hero me sirf ek form card ki jagah hai. Named sidebar beech me
 * rakhne ka matlab hota ki home ka form badalne ke liye client Appearance ▸ Sidebar jaaye. Shape
 * wahi hai jo `enquiryForm` widget ka hai (`formId` + heading + description), taaki server pe
 * form ek hi raaste se resolve ho (`getPublicFormById()`).
 */
export const heroFormPropsSchema = z.object({
  background: sectionBackgroundSchema,

  /**
   * Do image — desktop aur mobile. Mobile khaali ho to desktop wali (theme ka `<picture>`).
   *
   * Media ki `id`, URL nahi (D-41) — resolve server pe hota hai, aur media na mile to `null`
   * (D-42 §2): tab sirf background ka rang dikhta hai.
   */
  imageId: z.string().trim().max(60).nullable().default(null),
  mobileImageId: z.string().trim().max(60).nullable().default(null),

  /**
   * Page ka `<h1>`. **Italic** wala hissa accent rang me — Tour page jaisa (client, 15 Sep;
   * reference me `<span>` hai). Inline profile, taaki block tags `<h1>` me ghus hi na sakein
   * (wahi tark jo `pageHeadingSchema` pe hai).
   */
  title: inlineHtmlSchema.pipe(z.string().max(300)).default(''),
  description: htmlSchema.pipe(z.string().max(2000)).default(''),

  /** Reference me chaar hain. Khaali `value` wale page pe nahi aate. */
  stats: z.array(heroStatSchema).max(4).default([]),

  /**
   * Card ke upar ki hari patti — `Free · No obligation` (client: _"admin field chahiye"_).
   * Khaali ho to patti nahi banti.
   */
  ribbon: z.string().trim().max(60).default(''),

  formId: z.string().trim().max(60).default(''),
  formHeading: z.string().trim().max(200).default(''),
  formDescription: htmlSchema.pipe(z.string().max(1000)).default(''),
})

/** Card ya accent ka rang — wahi hex rok jo section ke background pe hai, alag naam sirf padhne ke liye. */
const colourSchema = sectionBackgroundSchema

/** Ek section me kitne card — reference ke har section me chaar hain; 12 teen line ki chhat hai. */
export const INFO_CARDS_MAX = 12

/**
 * Info cards ka ek card — icon · label · title · description · link (client, 15 Sep, D-96 §11).
 *
 * | Field | Reference me |
 * | --- | --- |
 * | `icon` / `imageId` | `.achc__i` · `.certc__i` · `.whyc h3 svg` · `.art__i` |
 * | `label` | `.art__t` — `BLOG` / `ARTICLE` (client: _"haath se"_) |
 * | `text` | `p` — Achievements me saal **bold**, Why us me `Contact us` **link** (client: chhota editor) |
 * | `url` | `a.art` — poora card link; khaali pe saada card, bina hover (client) |
 *
 * ⚠️ **`imageId` `icon` ke upar jeet-ta hai** (client: _"icon list + upload"_). Image jaisi hai waisi
 * dikhti hai — `iconColor` us pe nahi lagta.
 */
export const infoCardSchema = z.object({
  id: z.string().min(1).optional(),
  icon: z.enum(/** @type {[string, ...string[]]} */ (ICONS)).default('none'),
  imageId: z.string().trim().max(60).nullable().default(null),
  label: z.string().trim().max(40).default(''),
  title: z.string().trim().max(160).default(''),
  /** Inline profile — bold, italic, link. Card ki ek-do line hai; `<p>`/list layout todte. */
  text: inlineHtmlSchema.pipe(z.string().max(800)).default(''),
  url: z.string().trim().max(500).default(''),
})

/** Card ka border — reference ke chaar look ke teen alag border + "none". */
export const INFO_CARD_BORDERS = Object.freeze(['none', 'full', 'top', 'left'])

/**
 * `Info cards` — reference ke chaar sections ka **ek** section (client, 15 Sep, D-96 §11).
 *
 * `7. ACHIEVEMENTS` · `21. CERTIFIED BY` · `25. WHY US` · `19. POPULAR ARTICLES` — charon ka grid aur card ka
 * dhaancha ek hai (icon → label → title → text), farak sirf **look** ka. Isliye chaar block type nahi,
 * look ki settings. (Admin ka "Start from" 15 Sep ko hata — preset ke naam ek site ke the, §15.)
 *
 * ⚠️ Tour ka `cards` block reuse **nahi** kiya — uska look `tour-v3.html` ka hai aur usme label/link
 * nahi. Use badalna Tour page ka design badalta.
 *
 * ⚠️ Look **poore section ka ek** hai, har card ka nahi — reference me bhi ek section ke card ek jaise.
 *
 * Khaali rang = theme ka default (neela accent, halka neela icon box) — hex rok `sectionBackgroundSchema` wali.
 */
export const infoCardsPropsSchema = z.object({
  background: sectionBackgroundSchema,

  heading: z.string().trim().max(200).default(''),
  description: htmlSchema.pipe(z.string().max(1000)).default(''),
  /** Certified by / Why us: center. Popular articles: left + daayein `View all →`. */
  headingAlign: z.enum(['center', 'left']).default('center'),
  /** `.viewall` — dono chahiye, warna link nahi (D-30). Sirf `left` pe dikhta hai — center me jagah nahi. */
  linkLabel: z.string().trim().max(80).default(''),
  linkUrl: z.string().trim().max(500).default(''),

  /** Desktop ke column. Tablet pe 2, phone pe 1 — reference ka hi niyam, admin ka chunav nahi. */
  columns: z.coerce.number().int().min(2).max(4).default(4),
  border: z.enum(INFO_CARD_BORDERS).default('full'),
  /** `top`/`left` wali 3px patti ka rang. */
  accentColor: colourSchema,
  /** `above` — icon upar (Achievements/Certified/Articles). `inline` — title ki line me (Why us). */
  iconPosition: z.enum(['above', 'inline']).default('above'),
  /** Icon ke peeche rangeen dabba (Why us me nahi hai). */
  iconBox: z.boolean().default(true),
  iconBg: colourSchema,
  iconColor: colourSchema,
  textAlign: z.enum(['left', 'center']).default('left'),

  items: z.array(infoCardSchema).max(INFO_CARDS_MAX).default([]),
})

/** Customer reviews section me kitne video — reference ki rail me chhe hain; rail scroll hoti hai. */
export const VIDEO_REVIEWS_MAX = 20

/**
 * `Customer reviews` — reference ka `11. VIDEO CUSTOMER REVIEWS` (client, 15 Sep, D-96 §13).
 *
 * Video reviews **Reviews ▸ Video reviews** me bante hain; section unme se **chunta** hai aur kram
 * isi array ka hai (client: _"section me chunein, kram drag se"_) — `packageIds[]` wala hi model.
 * Id, naam nahi; jo review delete ho gaya wo payload me chup-chaap gir jaata hai (D-42 §2).
 *
 * Heading reference me **left** hai, daayein `All video reviews →` — isliye default `left`.
 */
/** Image cards ki shape — card ki chaudai : oonchai (D-96 §14). */
export const IMAGE_CARD_SHAPES = Object.freeze(['square', 'portrait', 'tall', 'landscape', 'wide'])

/** Ek section me kitne image cards — Places to visit me das hain; 24 chaar line ki chhat hai. */
export const IMAGE_CARDS_MAX = 24

/**
 * Image card — background image, title, aur do optional chhoti line (client, 15 Sep, D-96 §14).
 *
 * | Field | Reference me |
 * | --- | --- |
 * | `imageId` | `.isl img` · `.pt img` — poore card pe, upar gehra parda |
 * | `title` | `Havelock` · `Radhanagar Beach` |
 * | `subtitle` | `Swaraj Dweep` · `Havelock` (beach ke neeche `<small>`) — optional |
 * | `tag` | `Radhanagar · Scuba` — islands ki chip (`.isl__b em`) — optional |
 * | `url` | `a.isl` / `a.pt` — poora card link, optional |
 *
 * Saare plain text — koi HTML nahi, isliye card `<a>` ho sakta hai (andar link nahi ban sakta).
 */
export const imageCardSchema = z.object({
  id: z.string().min(1).optional(),
  imageId: z.string().trim().max(60).nullable().default(null),
  title: z.string().trim().max(120).default(''),
  subtitle: z.string().trim().max(120).default(''),
  tag: z.string().trim().max(80).default(''),
  url: z.string().trim().max(500).default(''),
})

/**
 * `Image cards` — reference ke **Andaman's best islands · Popular beaches · Places to visit** ka **ek**
 * section (client, 15 Sep, D-96 §14).
 *
 * Teenon me card ek hi cheez hai (image + parda + neeche text), farak shape, column aur chhoti lines ka.
 * Wahi soch jo Info cards (§11) pe: kai block type nahi, look ki settings.
 *
 * | Look | Shape | Columns | Lines |
 * | --- | --- | --- | --- |
 * | Best islands | `wide` (`.isl` ~170px oonchi) | 4 | subtitle + tag |
 * | Popular beaches | `square` (`.pt`) | 4, phone pe 2 | subtitle |
 * | Places to visit | `square` | 5, phone pe 2 | sirf title |
 *
 * ⚠️ Islands ke `Top islands` / `Offbeat islands` (`.subh`) — do section se bante hain, doosra bina
 * heading ke. Ek section ke andar group rakhna ek aur dhaancha hota jo abhi kisi ne maanga nahi.
 */
export const imageCardsPropsSchema = z.object({
  background: sectionBackgroundSchema,
  heading: z.string().trim().max(200).default(''),
  description: htmlSchema.pipe(z.string().max(1000)).default(''),
  /** Reference me teeno `left` + daayein `All beaches →` / `All places →` / `Explore on the map →`. */
  headingAlign: z.enum(['center', 'left']).default('left'),
  linkLabel: z.string().trim().max(80).default(''),
  linkUrl: z.string().trim().max(500).default(''),

  /** `square` 1:1 · `portrait` 3:4 · `tall` 9:14 · `landscape` 4:3 · `wide` 16:9 */
  shape: z.enum(IMAGE_CARD_SHAPES).default('square'),
  /** Desktop. Tablet pe 3 (ya kam), phone pe `mobileColumns`. */
  columns: z.coerce.number().int().min(2).max(6).default(4),
  /** Reference ka `.g--tiles` — beaches/places phone pe 2, islands 1. */
  mobileColumns: z.coerce.number().int().min(1).max(2).default(2),
  textAlign: z.enum(['left', 'center']).default('left'),
  /** Text card ke neeche (reference) ya beech me. */
  textPosition: z.enum(['bottom', 'middle']).default('bottom'),

  items: z.array(imageCardSchema).max(IMAGE_CARDS_MAX).default([]),
})

/** Testimonials section me kitne review — reference me chaar; 20 paanch line ki chhat. */
export const TESTIMONIALS_MAX = 20

/**
 * `Testimonials` — reference ka `22. TESTIMONIALS` (client, 15 Sep, D-96 §16).
 *
 * **Maujooda text reviews se** — `reviews` collection me koi field nahi juda. Card pe `text` · `name` ·
 * `lastLine`, avatar ke initials naam se (theme). Taare aur mahina **nahi** — reference me nahi (client).
 *
 * Client ke faisle: reviews **section me chune, kram drag se** (`testimonialIds`, Customer reviews jaisa) ·
 * quote icon **fixed**, sirf rang section se (`iconColor`) · avatar **initials** · columns **fixed** (4 →
 * tablet 2 → phone 1).
 *
 * ⚠️ Naam `testimonialIds`, `reviewIds` nahi — `reviewIds` video reviews ka hai, aur cache ki query
 * (`pathTagsForBlockRef`) field naam se chalti hai. Ek naam do collection ki ids pe = D-86 wala jaal.
 */
export const testimonialsPropsSchema = z.object({
  background: sectionBackgroundSchema,
  heading: z.string().trim().max(200).default(''),
  description: htmlSchema.pipe(z.string().max(1000)).default(''),
  /** Reference me heading beech me (`.sh--center`). */
  headingAlign: z.enum(['center', 'left']).default('center'),
  linkLabel: z.string().trim().max(80).default(''),
  linkUrl: z.string().trim().max(500).default(''),
  /** Quote icon ka rang — khaali pe reference ka halka neela (`--blue-100`). */
  iconColor: sectionBackgroundSchema,
  testimonialIds: z.array(z.string().trim().min(1).max(60)).max(TESTIMONIALS_MAX).default([]),
})

export const videoReviewsPropsSchema = z.object({
  background: sectionBackgroundSchema,
  heading: z.string().trim().max(200).default(''),
  description: htmlSchema.pipe(z.string().max(1000)).default(''),
  headingAlign: z.enum(['center', 'left']).default('left'),
  linkLabel: z.string().trim().max(80).default(''),
  linkUrl: z.string().trim().max(500).default(''),
  reviewIds: z.array(z.string().trim().min(1).max(60)).max(VIDEO_REVIEWS_MAX).default([]),
})

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
  /**
   * Section ka heading aur uske neeche ki line — **8 Sep me jude** (D-88 §9, client).
   *
   * Poora tark `cardsPropsSchema` ke upar likha hai: har layout block **apna poora section**
   * hai, isliye uska heading uske apne panel me hai. Bina iske admin ka ek panel aur page ka
   * ek dabba mel nahi khaate the.
   */
  heading: z.string().trim().max(200).default(''),
  description: htmlSchema.pipe(z.string().max(2000)).default(''),

  /**
   * Do khaanon ka **look** — `plain`, ya reference ka `Included / Not included` (`.inx`).
   *
   * ⚠️ **Ye ek chunav hai, andaza nahi.** Design me wo do rangeen dabbe hain: baayan halka neela
   * hara heading ke saath, daayan halka gulaabi laal heading ke saath (`.inx__c` / `.inx__c.no`).
   * Theme ko kaise pata chalta ki kaunsa khaana "not included" hai? Content se andaza lagana —
   * jaise heading me "Not" dhoondhna — bhasha pe nirbhar hota aur chup-chaap galat hota.
   *
   * Client ne 8 Sep ko ye dropdown chuna. Doosra khaana hamesha "not included" hai — wahi kram
   * reference me hai.
   *
   * ⚠️ `includedExcluded` pe **`ratio` lagta hi nahi** — `.inx` hamesha `1fr 1fr` hai. Design me
   * wo do dabbe barabar hi hain, aur unhe 60/40 karne ka koi matlab nahi banta.
   */
  style: z.enum(['plain', 'includedExcluded']).default('plain'),

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

/**
 * `Cards`.
 *
 * ⚠️ **`heading` aur `description` 8 Sep me jude** (D-88 §9, client) — aur ye design se
 * **chhata farak** hai: `admin-design-v3.html:906` ke Cards panel me sirf `Columns` hai.
 *
 * Wajah: design me heading aur uske neeche ki prose **upar wale Text block** ki maani gayi
 * thin — reference me teenon ek hi `.blk` ke andar hain (`tour-v3.html:1683`). Par hamare
 * model me Text apna block hai, yaani admin me **do panel** hote aur page pe **ek dabba** —
 * aur wo mismatch client ko bug jaisa dikhta.
 *
 * Do raaste the: theme render pe blocks ko sections me **group** kare (jaadu, jo admin me
 * dikhta hi nahi), ya block apna heading khud rakhe. Client ne doosra chuna, aur wo **zyada
 * consistent** bhi hai — `faqsPropsSchema` aur `packageListPropsSchema` dono ke paas ye
 * pehle se hain. Cards aur Two column hi apwaad the.
 *
 * ✅ Isse reference ke **dono** cards section ek-ek block se ban jaate hain:
 * `tour-v3.html:1683` (heading + description + cards) aur `:1789` (heading + cards).
 *
 * ⚠️ Ab client heading yahan bhi likh sakta hai **aur** upar Text block me `<h2>` bhi — tab
 * do heading dikhengi. Ye risk `faqs` aur `packageList` pe pehle se hai aur aaj tak problem
 * nahi bani, isliye iske liye koi rok nahi lagayi gayi.
 *
 * **Koi migration nahi** — dono field `.default('')` pe hain, to purane cards blocks waise ke
 * waise parse hote hain.
 */
export const cardsPropsSchema = z.object({
  heading: z.string().trim().max(200).default(''),
  description: htmlSchema.pipe(z.string().max(2000)).default(''),

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
   * Heading ke daayein wala link — reference ka `.viewall`
   * (`tour-v3.html:1436`: _"Need something custom? →"_). Client, 9 Sep.
   *
   * ⚠️ **Text bhi field hai, sirf URL nahi** — client ka chunav. Theme me likh dene ka matlab
   * hota ki wo har client ki site pe wahi rahe aur admin se badla hi na ja sake; wahi Q-9 wala
   * kaanta jo `TAB_NOTE` pe abhi tak khula hai.
   *
   * **Dono chahiye** — ek bhi khaali ho to link render nahi hota (D-30). Aadha link ek aisa
   * button hai jo click pe kuch nahi karta; wahi rok `heroButton` aur D-67 ke CTA button pe hai.
   */
  linkLabel: z.string().trim().max(120).default(''),
  linkUrl: z.string().trim().max(500).default(''),

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
  /**
   * Section ka background — **sirf home pe** kaam aata hai (D-96 §12, client 15 Sep). Home ka FAQ naya
   * block type nahi, yahi `faqs` hai (schema, safai, editor, FAQPage sab muft). Tour/Page/Post pe
   * admin ye khaana dikhata hi nahi aur theme padhti nahi; khaali default purane data pe koi asar nahi.
   */
  background: sectionBackgroundSchema,
  /** Poora section — heading aur list — beech me ya baayein (client, 15 Sep, D-96 §12). Sirf home pe. */
  align: z.enum(['center', 'left']).default('center'),

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
 * ⚠️ **Payload me kitne post tak jaayenge — `postList` ki chhat** (spec 008).
 *
 * Blog listing ka filter aur pagination **dono client-side** hain (client, 9 Sep): saare post
 * ek hi baar payload me jaate hain, phir JS unhe filter aur page karta hai. Isi se pills aur
 * sidebar ke Topics ka do-tarfa sync **muft** milta hai — dono ek hi state ke do control hain.
 *
 * Wo model 60 post tak theek hai (~45 KB). Usse aage raasta URL wala hai (`?topic=&page=`),
 * aur uski keemat **poore page ki ISR** hai — `searchParams` Next 15 me route ko dynamic kar
 * deta hai, yaani D-83 ka jeeta hua faayda wapas chala jaata.
 *
 * ⚠️ Ye `PACKAGE_LIST_SCAN_CAP` jaisa hi pehra hai, par wajah ulti hai: wahan chhat **query**
 * pe thi (sort JS me hota hai), yahan **payload** pe hai.
 */
export const POST_LIST_CAP = 60

/** Ek page pe kitne card — reference (`blog-v1.html`) me nau hain. */
export const POST_LIST_PER_PAGE_DEFAULT = 9

/** `Start here` — ek bada aur do chhote card (`.fcard--lg` + `.feat__side`). */
export const POST_LIST_MAX_FEATURED = 3

/**
 * `Post list` — blog listing page ka asli maal (`.feat` + `.bfilter` + `.bpg` + `.pager`).
 *
 * ## ⚠️ Source **query** hai, chunav nahi — aur ye `packageList` se jaan-boojh kar ulta hai
 *
 * `packageList` me client **har package haath se chunta hai** (`packageIds[]`), aur D-87 §8 ne
 * uska nateeja saaf likha tha: naya package publish hone pe wo apne aap kisi tour page pe
 * **nahi** aayega. Package ke liye wo theek tha — wo paanch hain aur curated hain.
 *
 * **Blog pe wahi niyam galat hoga.** Blog ka poora point hi "publish karo, turant dikhe" hai;
 * har naye post ke liye client ko listing page kholna padta to wo ek din bhool jaata aur post
 * kahin dikhta hi nahi — theek wahi "kuch na hona" wala lakshan jo D-86 aur D-89 me baar-baar
 * mila.
 *
 * Isliye yahan sirf **featured teen** haath se chunte hain; baaki list `publishAt` desc se
 * apne aap banti hai.
 *
 * ⚠️ **Cards yahan store nahi hote** — props batate hain kya chahiye, cards server pe
 * `resolve` ke payload me bante hain (`similar[]` aur `packageList` ki tarah).
 */
export const postListPropsSchema = z.object({
  /** Reference me ye `Start here` / `Latest articles` wale `.sh` ke do hisse hain. */
  heading: z.string().trim().max(200).default(''),
  subheading: z.string().trim().max(300).default(''),

  /**
   * Heading ke daayein wala link — `.viewall` (`All articles →`).
   *
   * **Dono chahiye** — ek bhi khaali ho to link render nahi hota (D-30). Aadha link ek aisa
   * button hai jo click pe kuch nahi karta; wahi rok `packageList` (D-90) aur `heroButton`
   * pe hai.
   */
  linkLabel: z.string().trim().max(120).default(''),
  linkUrl: z.string().trim().max(500).default(''),

  /**
   * `Start here` ke teen post — **ek bada, do chhote** (`.fcard--lg` + `.feat__side`).
   *
   * Kram **isi array ka** hai; pehla bada card banta hai. Wahi soch jo `content.blocks[]` aur
   * `packageIds[]` pe hai — kram wahin rehta hai jahan cheez rehti hai.
   *
   * ⚠️ **Ye teen neeche ki grid me dobara nahi aate.** Reference me bhi wahi hai: Start here ke
   * teen aur `Latest articles` ke nau, sab alag. Bina is niyam ke wahi card do jagah dikhta.
   *
   * Khaali chhodna theek hai — tab `Start here` ka poora section render hi nahi hota.
   */
  featuredIds: z.array(z.string()).max(POST_LIST_MAX_FEATURED).default([]),

  /**
   * List ko **ek topic pe seemit** karo — khaali matlab saare post.
   *
   * Isi se topic-wise landing page banta hai (`/blog/ferries`): wo bas ek aur `blogPage` entry
   * hai jisme ye bhara ho. **Isiliye category ka koi magic route nahi banaya** — us raaste pe
   * client us page ka heading, hero, sidebar aur SEO kuch bhi na badal paata.
   *
   * Taxonomy ki `id`, uska naam nahi (D-49).
   */
  categoryId: z.string().nullable().default(null),

  /**
   * `.bfilter` ki pills dikhein ya nahi.
   *
   * ⚠️ Ek hi topic wale page pe (`categoryId` bhara hua) filter bemaani hai — wahan ise off
   * karna client ka faisla hai. Facets khud bhi khaali honge, aur tab bar render nahi hoti:
   * D-87 §11 wala sabak yahan pehle se laga hua hai (`facets.length > 0`, `> 1` nahi — us ek
   * galti ne client ka chuna hua filter chup-chaap gayab kar diya tha).
   */
  showFilter: z.boolean().default(true),

  /**
   * Ek page pe kitne card, `.pager` isi se banta hai.
   *
   * ⚠️ **Ye `settings.postsPerPage` NAHI hai** — wo `frontPageType: 'posts'` ka hissa hai
   * (homepage khud blog ho), jo abhi bana hi nahi. Do jagah rakhne ka matlab hota ek hi cheez
   * ke do naam (D-86); jis din wo feature banega, tab tay hoga ki kaun kisko padhta hai.
   */
  perPage: z.coerce.number().int().min(1).max(50).default(POST_LIST_PER_PAGE_DEFAULT),
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
  postList: postListPropsSchema,
  heroForm: heroFormPropsSchema,
  infoCards: infoCardsPropsSchema,
  videoReviews: videoReviewsPropsSchema,
  imageCards: imageCardsPropsSchema,
  testimonials: testimonialsPropsSchema,
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
 * Page ka **dikhne wala** `<h1>` — client, 9 Sep.
 *
 * ⚠️ **`title` ab do kaam nahi karta.** Pehle wahi ek field h1, slug, breadcrumb, admin ki list,
 * SEO title aur schema — sab jagah jaata tha. Client ko h1 me styling chahiye thi (design me
 * `₹11,499 pp` neela hai, wo `<em>` se aata hai), par `title` me HTML daalna har us doosri jagah
 * pe tag chhaap deta — `<title>` tag me `<em>` browser ke tab me literally dikhta.
 *
 * Ab batwara saaf hai:
 *
 * | Kahan | Kaun |
 * | --- | --- |
 * | Page ka `<h1>` | **`fields.heading`** (ye) |
 * | Slug · breadcrumb · admin list · SEO · schema · cards | `title` (plain, jaisa tha) |
 *
 * ⚠️ **`inlineHtmlSchema`, `htmlSchema` nahi** — aur wo poora point hai. Inline profile me block
 * tags (`<p>`, `<h2>`, `<ul>`, `<table>`) allowed hi nahi hain, isliye `<h1>` ke andar wo ghus
 * hi nahi sakte. Client ne 9 Sep ko yahi chuna: _"inline editor — bold · italic · highlight ·
 * link"_.
 *
 * Khaali chhodo to theme `title` pe gir jaati hai — yaani purane pages waise ke waise chalte
 * hain aur is field ko bharna zaroori nahi.
 */
export const pageHeadingSchema = inlineHtmlSchema.pipe(z.string().max(300)).default('')

/**
 * Hero ka ek button — `label` + `url`.
 *
 * Do jagah chalta hai, aur shape **ek hi** hai:
 *
 * | Kahan | Kiske liye |
 * | --- | --- |
 * | `tourSettings.heroButton` | saare Tour pages — ek baar Settings me (client, 8 Sep) |
 * | `page` ka `fields.heroButton` | **har page ka apna** — edit screen me (client, 14 Sep, D-95) |
 *
 * ⚠️ Dono me se kisi ek ka shape badla to doosra usi ke saath badlega — isliye ek constant.
 * Do copy hoti to wo ek din alag ho jaatin (D-86 wala sabak).
 *
 * Khaali `label` **ya** khaali `url` — dono pe button render hi nahi hota. Bina url ka button
 * click pe kuch nahi karta (D-30).
 */
export const heroButtonSchema = z
  .object({
    label: z.string().trim().max(80).default(''),
    url: z.string().trim().max(500).default(''),
  })
  .default({})

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

/**
 * ⚠️ **Pehle iska naam `sidebarSchema` tha — 8 Sep ko badla (D-88).**
 *
 * `schemas/sidebar.js` bana to `sidebarSchema` ka asli haqdaar **sidebar khud** ban gaya
 * (naam + widgets), aur do file `export *` pe takra rahi thin. Naam badalna waise bhi theek
 * tha: ye kabhi "ek sidebar" tha hi nahi, ye "kis taraf" hai.
 *
 * Ye sirf ek JS export ka naam hai — **stored data kuch nahi badla** (R4 wahan lagta hai).
 */
export const sidebarPositionSchema = z.enum(PAGE_SIDEBAR).default('none')

/**
 * Page pe **kaunsa** sidebar — `sidebars` collection ki id (D-88, client 8 Sep).
 *
 * Client ne dono sawaal alag rakhe: **kis taraf** ye field ke padosi `sidebar` me, aur
 * **kaunsa** yahan. Admin me ye dropdown `sidebar` ke `none` chhodne par hi khulta hai.
 *
 * ⚠️ **`sidebar: 'none'` hone par bhi ye value mitti nahi.** Client left/right toggle karke
 * wapas aayega aur uska chunav bacha rehna chahiye — wahi soch jo D-87 §3 ki rating pe hai
 * (override karta hai, mitata nahi).
 *
 * ⚠️ Khaali id, ya aisi id jiska sidebar delete ho chuka — dono par page pe sidebar **render
 * hi nahi hota**. Delete pe koi guard jaan-boojh kar nahi hai (D-79 ka precedent), aur toota
 * hua kuch kabhi render nahi hota (D-42 §2).
 */
export const sidebarIdSchema = z.string().trim().max(60).default('')
