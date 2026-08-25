import { z } from 'zod'

import { DEFAULT_SITE_ID } from '../constants/index.js'
import { ICONS } from '../constants/icons.js'
import { BUTTON_VARIANTS, LINK_TARGETS, classNameSchema, menuUrlSchema } from './menu.js'
import { emailSchema } from './user.js'

/**
 * `settings` ka contract — 02-ARCHITECTURE §3, spec 004 §3.
 *
 * **Ek instance = ek document** (D-01). Singleton hone ka matlab ye hai ki naya field
 * jodna sasta hai — backfill karne ko ek hi row hoti hai. Isliye yahan sirf wahi fields
 * hain jo **abhi** chahiye; SEO defaults, title templates aur scripts apne-apne screen
 * ke saath aayenge (Phase 4).
 *
 * `siteId` phir bhi day 1 se hai (D-01) — wo uniqueness constraint hai, aur wo baad me
 * jodna mehnga hota hai.
 */

/**
 * Timezone ki poori IANA list 400+ lambi hai aur usme se 99% is client ke kisi kaam ki
 * nahi. Ye chhoti list dono jagah chalti hai — UI ka dropdown aur server ka validation.
 * Client ko aur chahiye to yahan add karo, do jagah nahi.
 */
export const TIMEZONES = Object.freeze(['Asia/Kolkata', 'UTC'])

/** Value wahi token hai jo formatting me jaata hai; label UI banata hai. */
export const DATE_FORMATS = Object.freeze(['d MMM yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'])

export const CURRENCIES = Object.freeze(['INR', 'USD'])

/** Homepage pe kya dikhe — static page ya latest posts. */
export const FRONT_PAGE_TYPE = Object.freeze({ PAGE: 'page', POSTS: 'posts' })
export const FRONT_PAGE_TYPES = Object.freeze(Object.values(FRONT_PAGE_TYPE))

/**
 * Khaali chhoda ja sakne wala text.
 *
 * `.trim()` pehle chalta hai (wahi galti jo `emailSchema` me pakdi gayi thi) — warna
 * sirf spaces wali value "bhari hui" gin li jaati hai.
 */
const optionalText = (max) => z.string().trim().max(max).default('')

/** Social link — khaali ya poora URL. Aadha-adhoora "instagram.com/x" reject hota hai. */
const socialUrl = z.union([
  z.literal(''),
  z.string().trim().url('Enter the full address, starting with https://'),
])

/**
 * Social links — **order bhi contract ka hissa hai**, sirf list nahi.
 *
 * Footer aur admin dono isi order me render karte hain, isliye reference ka order yahi
 * rakha gaya hai (f · instagram · youtube · X). Pehle theme `Object.entries(social)` pe
 * ghoomti thi — wo Mongo document ki key order pe chalta hai, yaani order ek din
 * chup-chaap badal sakta tha.
 *
 * `x` 25 Aug ko juda (reference ke footer me hai). Naya key jodna sasta hai — settings
 * singleton hai (D-01) aur default `''` schema se aata hai, isliye koi migration nahi.
 */
export const SOCIAL_KEYS = Object.freeze(['facebook', 'instagram', 'youtube', 'x'])

/** Teenon keys ek hi jagah se — do list rakhne se ek din wo alag ho jaati hain. */
const socialShape = (value) => Object.fromEntries(SOCIAL_KEYS.map((key) => [key, value]))

const socialSchema = z.object(socialShape(socialUrl.default('')))

/**
 * Update ke liye har link **optional** hai, default wala nahi.
 *
 * Ye farq asli hai aur test ne pakda tha: default wale shape me
 * `{ social: { instagram: 'x' } }` parse hote hi facebook aur youtube `''` ban jaate
 * the — yaani ek link badalne se **baaki do chup-chaap ud jaate**. Service dot-notation
 * theek use kar rahi thi; schema uski mehnat pehle hi bekaar kar deta tha.
 */
const socialUpdateSchema = z.object(socialShape(socialUrl.optional()))

/**
 * Header ka ek button.
 *
 * `label`/`url` **required nahi** hain — admin type karte waqt aadhi row bacha kar Save
 * kar sakta hai, aur usse block karna badtameezi hoti. Adhoora button public payload me
 * jaata hi nahi (`getPublicSettings`), isliye site pe kabhi toota link nahi banta.
 *
 * `enabled` ek asli field hai, "dono khaali kar do" ka substitute nahi: seasonal button ko
 * uska poora config bachaate hue ek mahine ke liye band kiya ja sake.
 */
/**
 * Button ke icons — ab **shared `ICONS` registry** se (D-44).
 *
 * Pehle ye apni alag list thi. Footer ke text blocks ko bhi icons chahiye the, aur do
 * alag list rakhne ka nateeja wahi hota jo `menu.location` pe hua tha — ek din wo alag
 * ho jaatin. Ab dono ek hi registry padhte hain: `constants/icons.js`.
 *
 * Naam wahi ke wahi hain, isliye stored data pe koi asar nahi (R4).
 */
export const BUTTON_ICONS = ICONS

const headerButtonSchema = z.object({
  label: z.string().trim().max(60).default(''),
  // Khaali chalega; bhara ho to menu wale hi rules (relative, anchor, https, mailto, tel)
  url: z.union([z.literal(''), menuUrlSchema]).default(''),
  target: z.enum(/** @type {[string, ...string[]]} */ (LINK_TARGETS)).default('_self'),
  variant: z.enum(/** @type {[string, ...string[]]} */ (BUTTON_VARIANTS)).default('outline'),
  /**
   * Chhoti screen pe sirf icon dikhe, label nahi.
   *
   * Client ke design me "Awards" mobile pe yahi banta hai — neela square, sirf trophy.
   * "Get quote" poora label ke saath rehta hai.
   *
   * Pehle ye teen-value ka enum tha (`show`/`icon`/`hide`). `hide` hata diya gaya (25 Aug) —
   * ek boolean padhne me saaf hai, aur "mobile pe bilkul mat dikhao" ki zaroorat abhi tak
   * asli use case me nahi aayi. Zaroorat pade to wapas enum banaya ja sakta hai.
   */
  iconOnlyOnMobile: z.boolean().default(false),
  /** Sirf **extra** styling ke liye — look `variant` se aata hai (R18). */
  className: classNameSchema,
  /** Label ke pehle dikhne wala icon. `none` = koi icon nahi. */
  icon: z.enum(/** @type {[string, ...string[]]} */ (BUTTON_ICONS)).default('none'),
  enabled: z.boolean().default(true),
})

/**
 * Footer ke ek column me kya dikhe.
 *
 * **Structural discriminator hai, look ka nahi** (wahi rule jo `menuType` pe hai, D-43).
 * `text` chunne se menu ka reference **mitta nahi** — wo bacha rehta hai, bas render
 * nahi hota. Isse client bina data khoye aage-peeche switch kar sakta hai; `enabled`
 * flag ke peeche bhi wahi soch hai (`headerButtons`).
 */
export const FOOTER_COLUMN_TYPES = Object.freeze(['menu', 'text', 'both'])

/**
 * Column ki chaudai — `normal` ya `wide` (D-44).
 *
 * `wide` normal se chauda hota hai; **kitna** chauda, wo theme tay karti hai (aaj 1.5x,
 * reference ke `1.5fr 1fr 1fr 1fr` se). Ye ginti data me nahi hai aur nahi honi chahiye —
 * warna theme badalne pe har client ka stored number galat ho jaata.
 *
 * Ye **enum hai, koi free number nahi**:
 * non-technical client se percentage type karwana wahi bojh hai jise ye CMS hataane ke
 * liye bana hai, aur free number ka matlab hota ki koi 90% daal kar layout tod de.
 *
 * Default sab `normal` — yaani bina kuch chhue wahi barabar layout jo pehle tha.
 */
export const FOOTER_COLUMN_WIDTHS = Object.freeze(['normal', 'wide'])

/**
 * Footer me isse zyada column physically fit nahi hote — server aur admin ek hi number.
 *
 * 6 pe theme abhi bhi theek dikhti hai: 1280px ke wrap me chhe column ko ~172px milte
 * hain, aur `.ft__col` ka `min-width` 140px hai. Isse aage badhane se columns wrap ho
 * kar 6+1 jaisi tedhi row banane lagenge — cap uthane se pehle wo naap lena.
 */
export const MAX_FOOTER_COLUMNS = 6

/** Ek column me itne se zyada text block padhne laayak nahi rehte. */
export const MAX_FOOTER_TEXT_BLOCKS = 6

/**
 * Column ka ek text block — `icon + label + text`.
 *
 * Reference ka footer isi shape ka hai: 📞 CUSTOMER SUPPORT / +91 …, ✉ EMAIL / info@… ,
 * 📍 HEAD OFFICE / poora pata. Teenon hisse **optional** hain, isliye ek plain paragraph
 * bhi yahi block hai — bas `icon: 'none'` aur khaali `label`.
 *
 * `text` me line breaks **jaan-boojh kar** allowed hain aur theme unhe preserve karti hai.
 * Ye rich text nahi hai: koi HTML nahi, koi markup nahi. Rich text Phase 1 ke `richText`
 * block ke saath aayega — usko yahan aadha-adhoora banane ka matlab hota do editor
 * maintain karna.
 *
 * `.strict()` yahan wahi kaam karta hai jo `leafItemSchema` pe (D-43 §3): Zod default me
 * anjaan keys **chup-chaap hata deta hai**, aur uske bina ek typo wali key bina error ke
 * gayab ho jaati — admin Save karta, "ho gaya" dikhta, aur wo field kahin nahi hoti.
 */
export const footerTextBlockSchema = z
  .object({
    /**
     * Client-side id. `headerButtons` me ye nahi hai aur wahan zaroorat bhi nahi thi —
     * yahan blocks **drag-drop se reorder** hote hain, aur index ko React key banane se
     * drag ke baad state galat row pe chipak jaati hai (D-43 ke admin iterations ka #5).
     */
    id: z.string().trim().min(1).max(64),
    icon: z.enum(/** @type {[string, ...string[]]} */ (ICONS)).default('none'),
    label: z.string().trim().max(60).default(''),
    text: z.string().trim().max(500).default(''),
  })
  .strict()

/**
 * Footer ka ek column.
 *
 * Heading **apni field hai**, menu ke naam se nahi aati (D-44 §3). D-43 me wo menu ke
 * naam se aati thi — par ab column text-only ho sakta hai, jahan koi menu hai hi nahi.
 * Migration 008 purane columns ki heading me menu ka naam bhar deti hai, isliye kisi ke
 * footer se heading gayab nahi hoti.
 */
export const footerColumnSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    heading: z.string().trim().max(60).default(''),
    type: z.enum(/** @type {[string, ...string[]]} */ (FOOTER_COLUMN_TYPES)).default('menu'),
    width: z.enum(/** @type {[string, ...string[]]} */ (FOOTER_COLUMN_WIDTHS)).default('normal'),
    /**
     * Kaunsa menu is column me render ho.
     *
     * Ye pehle `menuLocations` ka kaam tha. Yahan aane se ek naya farz banta hai: menu
     * delete hone pe ye reference **saaf** hona chahiye, warna column ek marey hue menu
     * ko point karta reh jaata. Wo `menus` service ke `remove()` me hota hai — bilkul
     * waise hi jaise wo location assignments clear karti thi.
     */
    menuId: z.string().nullable().default(null),
    textBlocks: z.array(footerTextBlockSchema).max(MAX_FOOTER_TEXT_BLOCKS).default([]),
  })
  .strict()

export const settingsSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  // ── Site identity ───────────────────────────────────────────────────────────
  siteName: z.string().trim().min(1, 'Site title is required').max(120).default('My Site'),
  tagline: optionalText(200),
  /**
   * Notification aur "from" address ke liye. Ye admin **user** ke email se alag hai:
   * user badal sakta hai, site ka contact address wahi rehta hai.
   */
  adminEmail: z.union([z.literal(''), emailSchema]).default(''),
  /** Media Phase 2 me aayega — jagah abhi, data baad me (D-30). */
  logoMediaId: z.string().nullable().default(null),
  faviconMediaId: z.string().nullable().default(null),

  // ── Locale & currency ───────────────────────────────────────────────────────
  timezone: z.enum(/** @type {[string, ...string[]]} */ (TIMEZONES)).default('Asia/Kolkata'),
  dateFormat: z.enum(/** @type {[string, ...string[]]} */ (DATE_FORMATS)).default('d MMM yyyy'),
  currency: z.enum(/** @type {[string, ...string[]]} */ (CURRENCIES)).default('INR'),

  // ── Contact & social ────────────────────────────────────────────────────────
  phone: optionalText(40),
  whatsapp: optionalText(40),
  address: optionalText(500),
  social: socialSchema.default({}),

  // ── Header ──────────────────────────────────────────────────────────────────
  /**
   * Header ke buttons — D-27 ke Slice 0 scope me "CTA button" hai.
   *
   * **List hai, ek field nahi.** Client ke behaviour reference me header ke daayen do
   * cheezein hain (ek badge, ek "Get quote"), aur ye generic bhi hai — dental clinic ko
   * "Book appointment" + "Call us" chahiye hoga.
   *
   * Cap **4** pe hai: header me isse zyada physically fit nahi hota, aur bina limit ke
   * koi 10 daal kar layout tod dega.
   *
   * Ye buttons **menu items nahi hain, aur jaan-boojh kar nahi hain.** Reference me ye
   * `<nav>` ke bahar baithte hain aur mobile pe **dikhte rehte hain**, jabki menu items
   * drawer me chale jaate hain. Inhe `menuType` banane se ye drawer me chale jaate — ek
   * conversion button ke liye ulta. Jise nav ke **andar** button chahiye wo kisi bhi menu
   * item pe `className: nav-cta` laga sakta hai (D-17).
   *
   * `10-REFERENCE-DESIGN.md` ka awards badge, support line aur sticky mobile CTA bar
   * yahan **nahi** hain: wo us doc ke proposals hain, koi approved decision nahi.
   */
  headerButtons: z.array(headerButtonSchema).max(4).default([]),

  // ── Footer ──────────────────────────────────────────────────────────────────
  /**
   * Footer ka poora structure — **D-44**, spec 006 §7.3.
   *
   * D-43 me footer ke columns `menuLocations` me the (`footerColumn1..4`). Wo ab yahan
   * hai. Wajah: column sirf menu nahi rehta — usme text blocks bhi ho sakte hain, uski
   * apni heading aur width hoti hai, aur unki **ginti** admin chunta hai. Ek fixed set of
   * theme locations wo teenon cheezein express hi nahi kar sakta.
   *
   * **Ginti = array ki length.** Koi alag `columnCount` field jaan-boojh kar nahi hai —
   * D-43 §1 me mega ke `columnCount` × `columns[]` pe wahi do-source wali dikkat aa
   * chuki hai, aur wahan use **validation se** barabar rakhna padta hai. Yahan wo problem
   * banne hi nahi di gayi. Admin ka "Number of columns" dropdown array ko grow/shrink
   * karta hai, apni koi state nahi rakhta.
   */
  footerColumns: z.array(footerColumnSchema).max(MAX_FOOTER_COLUMNS).default([]),

  /**
   * Footer aur mobile drawer ka logo — header wale se **alag** ho sakta hai (D-44).
   *
   * Footer ka background gehra hota hai; wahan aksar safed/inverted logo chahiye hota
   * hai. Isko `logoMediaId` se alag rakhne ka matlab ye **nahi** hai ki client ko do
   * logo upload karne hi padenge — khaali chhoda to theme header wale pe fallback karti
   * hai (D-44 §4). Do logo tab hi chahiye jab wo sach me alag hon.
   *
   * Drawer isko isliye use karta hai ki wo bhi gehre background pe khulta hai.
   */
  footerLogoMediaId: z.string().nullable().default(null),

  /**
   * `{year}` placeholder theme replace karta hai, taaki har 1 January ko client ko
   * copyright line haath se badalni na pade.
   */
  footerCopyright: optionalText(300),

  /**
   * Bottom bar ke beech me chhoti si line — reference me yahan membership/registration
   * text hai ("Enlisted with the Ministry of Tourism… Member IATO, TAAI…").
   *
   * Ye copyright se **alag field** hai, uska hissa nahi: bar me teen alag jagah hain
   * (copyright baayen, ye beech me, social daayen) aur teenon ka apna alignment hai. Ek
   * hi field me dono daalne se client ko layout line breaks se banana padta.
   */
  footerNote: optionalText(400),

  /**
   * Sabse neeche ki fine print — reference me pricing/availability ka disclaimer.
   *
   * Har industry me kuch aisa hota hai (travel me pricing, clinic me medical advice,
   * finance me risk), isliye ye framework me hai, kisi ek client ke liye nahi. Bar ke
   * neeche poori chaudai me, halke rang me.
   */
  footerDisclaimer: optionalText(1000),

  // ── Homepage & archives ─────────────────────────────────────────────────────
  frontPageType: z
    .enum(/** @type {[string, ...string[]]} */ (FRONT_PAGE_TYPES))
    .default(FRONT_PAGE_TYPE.PAGE),
  /** Dono Phase 1 me judenge — `entries` collection abhi hai hi nahi (D-30). */
  homepageEntryId: z.string().nullable().default(null),
  postsPageEntryId: z.string().nullable().default(null),
  postsPerPage: z.coerce.number().int().min(1).max(100).default(10),

  /**
   * **Default `false` jaan-boojh kar** (spec 004 §3).
   *
   * Naya instance hamesha staging hota hai. `true` default rakhne ka matlab hota ki
   * har naya client ka adhoora site Google me index ho jaaye, aur wo live site se
   * compete kare. Launch pe ise manually on karna padta hai.
   *
   * Iska UI Phase 4 (SEO screen) me aayega; field aaj se maujood hai taaki public site
   * bante hi wo isse padh sake.
   */
  searchEngineVisible: z.boolean().default(false),
})

/**
 * Admin jo badal sakta hai.
 *
 * `siteId` yahan **nahi** hai — wo instance ki pehchaan hai, setting nahi.
 * `.pick()`/`.omit()` se list banane ka fayda yahi hai: kal koi naya field jodega to wo
 * apne aap editable nahi ho jaayega.
 */
export const updateSettingsSchema = settingsSchema
  .omit({ siteId: true })
  .partial()
  // `.partial()` sirf upar wale level pe lagti hai — nested `social` ko alag se batana padta hai
  .extend({ social: socialUpdateSchema.partial().optional() })

/** Naye instance ke defaults — seed aur test dono yahi use karte hain. */
export function defaultSettings(overrides = {}) {
  return settingsSchema.parse({ ...overrides })
}

/**
 * Client ko settings ka **yahi** shape jaata hai.
 *
 * `toPublicUser` wali wajah se: ek hi jagah se banta hai, taaki koi naya endpoint galti
 * se poora Mongoose document na bhej de. Yahan `passwordHash` jaisa koi secret to nahi
 * hai, par `_id` aur `__v` bhejne ka bhi koi matlab nahi — aur kal koi internal field
 * jud gaya to wo apne aap bahar nahi jaayega.
 *
 * @param {any} doc Mongoose settings document ya plain object
 */
export function toPublicSettings(doc) {
  if (!doc) return null

  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  // `createdAt` bahar isliye hai ki wo client ke kisi kaam ka nahi — `updatedAt` hai
  const { _id, __v, createdAt: _createdAt, ...rest } = plain

  return { ...settingsSchema.parse(rest), updatedAt: plain.updatedAt ?? null }
}
