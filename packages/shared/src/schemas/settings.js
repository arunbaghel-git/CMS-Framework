import { z } from 'zod'

import { DEFAULT_SITE_ID, POST_URL_MODES } from '../constants/index.js'
import { ICONS } from '../constants/icons.js'
import { BUTTON_VARIANTS, LINK_TARGETS, classNameSchema, menuUrlSchema } from './menu.js'
/**
 * ⚠️ Sidebar ke do field **`page.js` se udhaar** liye ja rahe hain, dobara likhe nahi —
 * `blogSettings.postSidebar` bilkul wahi cheez hai jo `page`/`tourPage` ke `fields.sidebar`
 * pe hai, sirf uski jagah alag hai (entry ke bajaye settings). Dobara likhne ka matlab hota
 * ki ek din unke enum alag ho jaayein — wahi jaal jo `menu.location` pe pakda gaya tha.
 */
import { heroButtonSchema, sidebarIdSchema, sidebarPositionSchema } from './page.js'
import { htmlSchema, inlineHtmlSchema } from './rich-html.js'
import { emailSchema } from './user.js'
import {
  HEX_COLOR_RE,
  THEME_ADVANCED_COLOR_KEYS,
  THEME_COLOR_DEFAULTS,
  THEME_HEADING_KEYS,
} from '../theme-colors.js'
import {
  BUTTON_SHAPES,
  CORNER_STYLES,
  SHADOW_STYLES,
  THEME_LAYOUT_DEFAULTS,
  THEME_LAYOUT_LIMITS,
} from '../theme-layout.js'
import {
  DEFAULT_FONT_FAMILY,
  FONT_FAMILY_RE,
  FONT_FILE_URL_RE,
  FONT_SCALE_STEPS,
  FONT_SIZE_LIMITS,
  FONT_SOURCES,
  FONT_STYLES,
  FONT_WEIGHTS,
} from '../theme-fonts.js'

const themeHexSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_RE, 'Use a colour like #1668ae')
  .transform((v) => v.toLowerCase())

/**
 * **Settings ▸ Colours** (client, 17 Sep) — 6 rang + Advanced. Poora hisaab `theme-colors.js` me.
 *
 * Advanced me **sirf wahi key** hoti hai jiska Auto hataya gaya; key ka na hona = Auto. `headings`
 * sirf `perHeading` on pe maana jaata hai. `.strict()` — anjaan key chup-chaap na gire (D-43 §3).
 */
/**
 * **Settings ▸ Layout** (client, 17 Sep) — hadd `THEME_LAYOUT_LIMITS` se, default aaj ki site.
 * Hadd ke bahar ka number 400 hai, chup-chaap clamp nahi — admin ko pata chale.
 */
const layoutNumber = (key) => {
  const [min, max] = THEME_LAYOUT_LIMITS[key]
  return z.coerce
    .number()
    .int('Use whole pixels')
    .min(min, `Must be at least ${min}`)
    .max(max, `Must be at most ${max}`)
    .default(THEME_LAYOUT_DEFAULTS[key])
}

export const themeLayoutSchema = z
  .object({
    ...Object.fromEntries(Object.keys(THEME_LAYOUT_LIMITS).map((k) => [k, layoutNumber(k)])),
    corners: z.enum(CORNER_STYLES).default(THEME_LAYOUT_DEFAULTS.corners),
    shadow: z.enum(SHADOW_STYLES).default(THEME_LAYOUT_DEFAULTS.shadow),
    btnShape: z.enum(BUTTON_SHAPES).default(THEME_LAYOUT_DEFAULTS.btnShape),
    sticky: z.boolean().default(THEME_LAYOUT_DEFAULTS.sticky),
    footLogoCard: z.boolean().default(THEME_LAYOUT_DEFAULTS.footLogoCard),
  })
  .strict()

/**
 * **Settings ▸ Fonts** (client, 17 Sep). `faces` server bharta hai (Google download) — admin ka bheja
 * hua `faces` maana nahi jaata, isliye yahan uski shape bas dheeli hai.
 */
const fontFamilyName = z
  .string()
  .trim()
  .max(61)
  .refine(
    (v) => v === '' || FONT_FAMILY_RE.test(v),
    'Font name can only use letters, numbers and spaces',
  )

const fontFileSchema = z
  .object({
    url: z.string().regex(FONT_FILE_URL_RE, 'Upload the font file again'),
    name: z.string().max(120).default(''),
    weight: z.enum(FONT_WEIGHTS).default('400'),
    style: z.enum(FONT_STYLES).default('normal'),
  })
  .strict()

const fontSlotSchema = z
  .object({
    source: z.enum(FONT_SOURCES).default('google'),
    google: fontFamilyName.default(DEFAULT_FONT_FAMILY),
    family: fontFamilyName.default(''),
    files: z.array(fontFileSchema).max(12).default([]),
    faces: z.array(z.object({}).passthrough()).max(40).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.source === 'google' && !v.google) {
      ctx.addIssue({ code: 'custom', path: ['google'], message: 'Type a Google font name' })
    }
    if (v.source === 'custom' && v.files.length && !v.family) {
      ctx.addIssue({
        code: 'custom',
        path: ['family'],
        message: 'Give the custom font a family name',
      })
    }
  })

const [sizeMin, sizeMax] = FONT_SIZE_LIMITS.size
const [lhMin, lhMax] = FONT_SIZE_LIMITS.lh
const [lsMin, lsMax] = FONT_SIZE_LIMITS.ls
const fontStepSchema = (d) =>
  z
    .object({
      size: z.coerce.number().min(sizeMin).max(sizeMax).default(d.size),
      sizeTablet: z.coerce.number().min(sizeMin).max(sizeMax).default(d.sizeTablet),
      sizeMobile: z.coerce.number().min(sizeMin).max(sizeMax).default(d.sizeMobile),
      weight: z.enum(FONT_WEIGHTS).default(d.weight),
      lh: z.coerce.number().min(lhMin).max(lhMax).default(d.lh),
      ls: z.coerce.number().min(lsMin).max(lsMax).default(d.ls),
    })
    .strict()

export const themeFontsSchema = z
  .object({
    heading: fontSlotSchema.default({}),
    body: fontSlotSchema.default({}),
    scale: z
      .object(
        Object.fromEntries(
          FONT_SCALE_STEPS.map((s) => [s.key, fontStepSchema(s.defaults).default({})]),
        ),
      )
      .strict()
      .default({}),
  })
  .strict()

export const themeColorsSchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(THEME_COLOR_DEFAULTS).map(([k, v]) => [k, themeHexSchema.default(v)]),
    ),
    perHeading: z.boolean().default(false),
    headings: z
      .object(Object.fromEntries(THEME_HEADING_KEYS.map((h) => [h, themeHexSchema.optional()])))
      .strict()
      .default({}),
    advanced: z
      .object(
        Object.fromEntries(THEME_ADVANCED_COLOR_KEYS.map((k) => [k, themeHexSchema.optional()])),
      )
      .strict()
      .default({}),
  })
  .strict()

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

/**
 * Header button kahan baithe — client, 11 Sep (D-94).
 *
 * - `left` — nav ke **theek pehle**, nav ke saath beech me (logo ke paas nahi — client ne trial
 *   dekh kar _"nav ke pass me thik hai"_ kaha)
 * - `right` — header ke aakhir me, jaisa 25 Aug se hota aaya hai
 *
 * Tablet/mobile pe nav chhup jaata hai; tab dono taraf ke button **ek saath** daayein aate hain.
 * `right` default hai — purane buttons bina kuch kiye wahin rehte hain, migration nahi.
 */
export const HEADER_BUTTON_POSITIONS = Object.freeze(['left', 'right'])

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
  /** Nav ke pehle (`left`) ya header ke aakhir (`right`) — `HEADER_BUTTON_POSITIONS` (D-94). */
  position: z.enum(/** @type {[string, ...string[]]} */ (HEADER_BUTTON_POSITIONS)).default('right'),
  enabled: z.boolean().default(true),
})

/** Page ke aakhri CTA card ka ek button — do se zyada nahi (D-67). */
const ctaButtonSchema = z.object({
  label: z.string().trim().max(60).default(''),
  /**
   * ⚠️ Ye field is poore section ki wajah hai.
   *
   * Design me "Get this itinerary" `#enquiry` pe jaata hai — aur wo form abhi bana hi nahi
   * (Enquiries, Q-2). Client ne kaha: _"button to form par hi jata hai par abhi bana nahi
   * hai to abhi fields bana do jisse bad me bhej sake."_ Yaani jis din form bane, sirf ye
   * ek value badlegi — koi code change nahi. D-30 ka hi precedent: connection point abhi,
   * data baad me.
   *
   * Khaali URL pe button page pe **dikhta hi nahi** — adhoora control dikhane se behtar hai
   * na dikhana (D-30: "khaali cheez khaali dikhe, tooti hui nahi").
   */
  url: z.union([z.literal(''), menuUrlSchema]).default(''),
  target: z.enum(/** @type {[string, ...string[]]} */ (LINK_TARGETS)).default('_self'),
  /** Look `variant` se aata hai, className se nahi (R18) — wahi teen jo header pe hain. */
  variant: z.enum(/** @type {[string, ...string[]]} */ (BUTTON_VARIANTS)).default('accent'),
  enabled: z.boolean().default(true),
})

export const MAX_CTA_BUTTONS = 2
export const MAX_CTA_BULLETS = 6

/**
 * `Settings ▸ Tour settings` — trust badges aur universal banner (D-87, client 7 Sep).
 *
 * ## `settings` me kyun, `packageDefaults` me nahi
 *
 * Client ne dono ko **global** kaha (faisle #10 aur #11). Wahi lakeer jo `ctaSection` (D-67)
 * pe khinchi thi: jo cheez sirf package ki nahi, wo `settings` me rehti hai. Trust badges
 * hero pe chhapte hain aur wo hero package page pe bhi hai aur tour page pe bhi — unhe
 * `packageDefaults` me daalne ka matlab hota ki tour page apne badges package ke globals se
 * uthaye, jo padhne me ulta lagta.
 *
 * ⚠️ **Tab ka naam client ka hai, aur wo content se thoda tang hai** — badges aur banner
 * dono package page pe bhi chalte hain, sirf Tour pages pe nahi. Naam client ne chuna (R15);
 * ye chetavni isliye hai ki koi ise "sirf tourPage ka" samajh kar wahan gate na laga de.
 */
export const trustBadgeSchema = z.object({
  id: z.string().min(1).optional(),
  /**
   * Icon enum hai, SVG string nahi — wahi tark jo `cards` block ke icon pe hai (D-87) aur
   * footer column ki `width` pe (D-44): non-technical client se SVG type karwana wahi bojh
   * hai jise ye CMS hataane ke liye bana hai.
   *
   * Teen icon reference ke `.vhero__trust` se hi aaye hain — shield, pin, doc.
   */
  icon: z.enum(['none', 'shield', 'pin', 'doc', 'star', 'clock', 'check']).default('none'),
  text: z.string().trim().max(120).default(''),
})

export const MAX_TRUST_BADGES = 6

export const tourSettingsSchema = z.object({
  /**
   * Har page ka default hero banner (faisla #10).
   *
   * ⚠️ **Page ka apna Featured image ise jeet-ta hai.** Client ne yahi kaha: _"Page pe
   * Featured image daali ho to wo use hogi."_ Yaani ye fallback hai, override nahi — wahi
   * shakl jo rating (D-87 §3) aur `sectionLabels` (D-65) pe hai.
   */
  bannerMediaId: z.string().nullable().default(null),

  /** `.vhero__trust` — hero ke neeche ki line. Khaali list pe wo poori line render hi nahi hoti. */
  trustBadges: z.array(trustBadgeSchema).max(MAX_TRUST_BADGES).default([]),

  /**
   * Hero ka **ek** button — reference ka `.vhero__cta` ka pehla (`Get my itinerary & price`).
   *
   * ⚠️ **Sirf ek, do nahi — client ka faisla (8 Sep):** _"only Get my itinerary & price in tour
   * settings, whatsapp to settings ke general se utha lega."_
   *
   * Doosra button WhatsApp ka hai aur uske liye yahan koi field **nahi** hai: number
   * `settings.whatsapp` me pehle se maujood hai (Settings ▸ General). Uske liye ek aur khaana
   * banane ka matlab hota ek hi number do jagah — theek wahi galti jo 2 Sep ko
   * `settings.contactEmail` pe pakdi gayi thi aur palti gayi thi.
   *
   * ⚠️ Number na ho to WhatsApp wala button **render hi nahi hota** (D-30) — wahi rok jo
   * `Planner` pe hai.
   *
   * Khaali `label` pe pehla button bhi nahi dikhta. Ek button ke liye `url` bhi chahiye, warna
   * wo ek aisa button hai jo click pe kuch nahi karta (D-30 ka wahi tark jo D-67 ke khaali URL
   * wale button pe laga tha).
   */
  heroButton: heroButtonSchema,
})

/**
 * `Pages ▸ Pages settings` — saade pages (`page`) ki site-level settings (client, 14 Sep, D-95 §12).
 *
 * ⚠️ **Usi din subah ke do faisle palte:** subah `On this page` ka checkbox **har page pe** tha aur
 * Featured image na ho to **koi banner nahi**. Shaam ko client ne dono yahan maange — ek hi jagah,
 * sab pages ke liye. `tourSettings`/`blogSettings` wala hi saancha.
 */
/**
 * **Enquiries ▸ Popup** — poori site ka ek popup form (client, 21 Sep).
 *
 * ## Data `settings` me hai, screen `Enquiries` me — aur ye jaan-boojh kar hai
 *
 * Client ne kaha _"popup enquiries me banega as a submenu"_, aur saath hi _"single popup only
 * and single setting for all pages"_. Yaani ye ek **singleton** hai, list nahi — isliye iska
 * ghar `settings` hai. Screen ki jagah data ki jagah tay nahi karti: bilkul yahi `blogSettings`
 * pe hai, jo `settings` me rehti hai par screen `Posts ▸ Blog settings` me hai (D-93).
 *
 * ⚠️ **`settings` me hone ka ek asli faayda hai** — `updateSettings()` pehle se
 * `revalidateTags(['settings'])` bhejti hai, yaani popup badlo aur wo **turant** site pe.
 * Agar ye home ka section hota to badlaav ek ghante tak na dikhta (A-26/A-29 wala bug).
 */
export const POPUP_FREQUENCIES = Object.freeze(['session', 'once', 'days', 'always'])

/**
 * Kin page types pe popup aaye — client ne **type ke checkbox** chune, per-page list nahi.
 *
 * ⚠️ Wajah client ke kaam ki hai: naya page banega to wo apne type ka niyam **khud** le lega.
 * Per-page list me naya page apne aap nahi judta aur use yaad rakh kar jodna padta — aur
 * bhoolna hi is repo ki sabse aam galti hai (D-86, D-89).
 *
 * ⚠️ Ye wahi chhe type hain jo theme ki catch-all branch me hain. **Naya page type jodo to
 * yahan bhi jodo** — warna us type pe popup chup-chaap kabhi nahi aayega.
 */
export const POPUP_PAGE_TYPES = Object.freeze([
  'homePage',
  'package',
  'tourPage',
  'post',
  'blogPage',
  'page',
])

/**
 * ⚠️ **`.strict()` jaan-boojh kar** — anjaan key pe 400, chup-chaap gir jaana nahi.
 *
 * Bina iske `showOn: { tourPages: true }` (ek `s` zyada) 200 deta hai, "Saved." dikhta hai, aur
 * popup un pages pe **kabhi nahi** aata. Wo bug dhoondhne me ghante lagte hain kyunki har taraf
 * ka code sahi dikhta hai — theek wahi shakl jo D-86 aur D-102 me thi. Ek page type ka naam
 * galat likhna sabse aasan galti hai, isliye rok yahin.
 */
const popupShowOnSchema = z
  .object(Object.fromEntries(POPUP_PAGE_TYPES.map((type) => [type, z.boolean().default(false)])))
  .strict()

export const popupSettingsSchema = z.object({
  /**
   * ⚠️ Ye toggle `floatingContactSide` (D-102) ke ulta hai — wahan jaan-boojh kar **nahi** rakha
   * gaya tha, kyunki number khaali karna hi "band" ka saaf matlab tha.
   *
   * Yahan wo tark nahi chalta: popup ek **campaign** hai. Client offer khatam hone pe use band
   * karega aur agle offer pe wapas chalu — poora heading, image aur form dobara bharwana galat
   * hota. Isliye yahan switch hai.
   */
  enabled: z.boolean().default(false),

  /**
   * Kaunsa enquiry form — `Enquiries ▸ Enquiry Forms` me se.
   *
   * ⚠️ Popup ke **apne** fields nahi hain, aur ye sabse zaroori faisla hai. Screenshot me jo saat
   * khaane the (Name · Email · Phone · Date of Travel · Trip Duration · Number of People · Message)
   * wo sab `forms` module se aate hain. Popup me unhe dobara banane ka matlab hota ek hi form ki
   * paribhasha **do jagah** — theek wahi galti jo D-86 me `Package URL` ke do naam se hui thi.
   *
   * Khaali `formId` = popup render hi nahi hota, chahe `enabled` kuch bhi ho. Form ke bina wo ek
   * khaali dabba hai (D-30).
   */
  formId: z.string().trim().max(60).default(''),

  /** Image ke upar ki badi line — `Special Offers`. Inline profile: block tags ghus hi na sakein. */
  heading: inlineHtmlSchema.pipe(z.string().max(200)).default(''),

  /** Form ke upar ki chhoti line — `Get Free Quotes`. */
  formHeading: inlineHtmlSchema.pipe(z.string().max(200)).default(''),
  description: htmlSchema.pipe(z.string().max(1000)).default(''),

  /**
   * Kitni image — **client khud chunta hai** (unke shabd: _"if i choose 2 then 2, i choose 1 then
   * one"_). Theme ginti dekh kar layout banati hai: 1 poori chaudai, 2 aadhi-aadhi, 3 teen hisse.
   *
   * ⚠️ Chhat **3** pe hai. Screenshot me teen thin, aur teen se zyada phone pe itni patli ho jaati
   * hain ki unme kuch dikhta hi nahi — ye rok admin me hint se nahi, schema se lagti hai.
   *
   * ⚠️ Media ki id write pe **check nahi** hoti — wahi precedent jo `tourSettings.bannerMediaId`
   * aur `pageSettings` pe hai. Guard D-42 §2 hai: resolve na ho to payload me `null` jaata hai,
   * isliye toota `<img>` banta hi nahi.
   */
  imageIds: z.array(z.string().trim().max(60)).max(3).default([]),

  /**
   * Page khulne ke kitne second baad popup aaye — client: _"admin can handle by enter time"_.
   *
   * `0` ka matlab turant. Chhat 300 (paanch minute) — isse aage koi asli use nahi hai aur bina
   * hadd ke ek typo (`50000`) popup ko hamesha ke liye gayab kar deta.
   */
  delaySeconds: z.number().int().min(0).max(300).default(5),

  /**
   * Dobara kab dikhe — client ke pehle message ke _"session based / 1 time or multitime"_ ka jawab.
   *
   * | Value | Matlab | Kahan yaad rehta hai |
   * | --- | --- | --- |
   * | `session` | tab band hone tak ek baar | `sessionStorage` |
   * | `once` | ek baar dekh liya, kabhi dobara nahi | `localStorage` |
   * | `days` | `frequencyDays` din baad phir | `localStorage` + timestamp |
   * | `always` | har page load pe (testing ke liye) | kuch nahi |
   *
   * ⚠️ **Ye sab sirf browser me rehta hai, server pe nahi** — aur wo majboori hai, chunav nahi.
   * Har page ek hi cached HTML deta hai (ISR), isliye server ko pata ho hi nahi sakta ki kis
   * aadmi ne popup dekha. Nateeja: user apni history saaf kare to popup phir dikhega.
   */
  frequency: z.enum(POPUP_FREQUENCIES).default('session'),
  frequencyDays: z.number().int().min(1).max(365).default(7),

  showOn: popupShowOnSchema.default({}),
})

export const pageSettingsSchema = z.object({
  /** Featured image na ho to hero ka banner. Page ki apni Featured image jeet-ti hai. */
  bannerMediaId: z.string().nullable().default(null),

  /** `On this page` — sab pages pe. `blogSettings.showToc` jaisa, default on. */
  showToc: z.boolean().default(true),
})

/**
 * Blog ki site-level settings — **spec 008** (client, 9 Sep).
 *
 * `tourSettings` ka hi joda: jo cheez har post pe **ek jaisi** hai wo yahan hai, per-post
 * nahi. Client ne khud yahi maanga — _"blog settings me checkbox bana denge **sabke liye**"_.
 */
export const blogAuthorSchema = z.object({
  /**
   * Byline ka naam — `blog-detail-v1.html` ka `Andaman Tourism team`.
   *
   * ⚠️ **Ye `entry.authorId` ko jeet-ta nahi, use replace karta hai.** Public byline ka
   * **ekmatra** source yahi hai. `authorId` andar rehta hai — kisne likha, permissions,
   * admin ki list — par page pe **kabhi nahi** jaata (R10 waise bhi user ka naam/email
   * public payload me nahi jaane deta).
   *
   * Ise "fallback" banane ka matlab hota ek hi cheez ke do source, aur ek din wo alag ho
   * jaate — theek wahi jo 9 Sep ko rating pe hua tha (`toPackageCards()` badla,
   * `PackagePage.jsx` chhoot gaya, client ne kaha _"card me updated hai, page pe purana 412
   * aa raha hai"_).
   *
   * ⚠️ Khaali naam pe byline ka author wala hissa **render hi nahi hota** (D-30) — admin
   * user ka naam wahan kabhi nahi girega.
   */
  name: z.string().trim().max(120).default(''),

  /** Naam ke neeche ki chhoti line — `Planners in Port Blair`. */
  role: z.string().trim().max(160).default(''),

  /**
   * Article ke neeche `.authorbox` ka paragraph.
   *
   * ⚠️ Avatar ke initials (`AT`) **naam se derive** hote hain — uske liye koi field nahi.
   * Do akshar ek naam se hamesha nikaale ja sakte hain; unhe alag se rakhna ek aur jagah
   * hoti jahan wo naam se alag ho jaate.
   */
  bio: z.string().trim().max(1000).default(''),
})

export const blogSettingsSchema = z.object({
  author: blogAuthorSchema.default({}),

  /**
   * `On this post` (TOC) dikhe ya nahi — **saare post ke liye ek** (client, 9 Sep):
   * _"On this post to heading se generate hoga aur blog settings me checkbox bana denge
   * sabke liye ki show karna hai ya nahi."_
   *
   * ⚠️ **Maine iske ulta suggest kiya tha aur client ne palta.** Meri salah thi ki koi
   * checkbox na ho aur TOC sidebar ka widget bane (list me hona hi on) — wahi tark jo
   * `showBadges` aur `emitSchema` pe laga tha (8 Sep). Client ne checkbox maanga, aur
   * **R15 kehta hai change client se aata hai, developer se nahi.** Ye yahan likha ja raha
   * hai taaki koi baad me "ye to hamare hi niyam ke khilaf hai" keh kar hata na de.
   *
   * ⚠️ **On hone par bhi TOC har post pe nahi aati** — jis post me 3 se kam `<h2>` hain
   * wahan wo render nahi hoti. Checkbox "dikhao" kehta hai, "zabardasti dikhao" nahi (D-30).
   */
  showToc: z.boolean().default(true),

  /**
   * Post ke page pe sidebar — **kis taraf** aur **kaunsi**, saare post ke liye ek baar.
   *
   * ⚠️ Ye `page`/`tourPage` se alag hai, jahan dono field **entry pe** hain. Wajah: wahan har
   * page apni shakl ka hota hai (ek listing, ek lamba article), par blog ke saare post ek hi
   * shakl ke hain. Har post pe do dropdown bharwane ka matlab hota ki ek din koi bhool jaaye
   * aur us post pe sidebar chup-chaap gayab ho (D-42 §2).
   *
   * ⚠️ **`blogPage` par ye laagu nahi** — listing page apni sidebar apne `fields` se chunta
   * hai. Reference me dono alag hain hi: listing pe `Topics`, detail pe `On this post`.
   */
  postSidebar: sidebarPositionSchema,
  postSidebarId: sidebarIdSchema,

  /**
   * Post ke URL ki shakl — `/blog/{slug}` ya `/{slug}` (client, 10 Sep).
   *
   * ⚠️ **Ye ek saada setting nahi hai** — iske badalne pe server har post ka `path` dobara
   * likhta hai aur har purane path se **301** banata hai. Poora tark
   * `entries/service.js` me `syncPostUrlPattern()` ke upar hai.
   *
   * ⚠️ Default `nested` hai kyunki `post` type shuru se `/blog/{slug}` pe tha — default badalne
   * ka matlab hota ki koi purana instance seed chalate hi apne saare blog URL badal le.
   */
  postUrlMode: z.enum(POST_URL_MODES).default('nested'),
})

/**
 * Page ka aakhri CTA card — design ka `.offer` (`itinerary-v3.html`), D-67.
 *
 * **`settings` me hai, `packageDefaults` me nahi** — client ka faisla: _"dusre pages par
 * bhi use hoga."_ Ye is project ke aam niyam ka **apwaad** hai (package ke domain ka maal
 * `packageDefaults` me jaata hai, D-46) — par wo niyam hi kehta hai ki jo cheez sirf
 * package ki nahi hai wo `settings` me rahegi, aur ye card poore site ka hai.
 *
 * ⚠️ **Poori tarah static — kuch bhi derive nahi hota** (client, 31 Aug). Box ka bada text
 * (`boxTitle`) aur uske neeche ki line (`boxNote`) saade text hain, package ke pricing se
 * nahi aate. Design me wahan `₹24,999` aur `Standard category` derive hote the (`js-px` /
 * `js-cat-name`), par wo raasta band hai: ye card doosre pages pe bhi jaayega jahan koi
 * package hai hi nahi.
 *
 * ⚠️ Iska ek nateeja maan lena chahiye: **ek hi text har package pe dikhega** — ₹24,999
 * wale package pe bhi aur ₹45,000 wale pe bhi. Isiliye `boxTitle` me pakka daam likhna
 * theek nahi hoga; wahan kuch aisa chahiye jo har jagah sach ho.
 */
export const ctaSectionSchema = z.object({
  /** Band karne pe section page pe render hi nahi hota — wahi flag jo headerButtons pe hai. */
  enabled: z.boolean().default(false),
  /** Upar ka chhota chip — "Planning open for 2026 season". Khaali ho to chip nahi aata. */
  badge: z.string().trim().max(80).default(''),
  heading: z.string().trim().max(200).default(''),
  /** Tick wali list. Khaali list pe `<ul>` banti hi nahi. */
  bullets: z.array(z.string().trim().max(300)).max(MAX_CTA_BULLETS).default([]),
  /** Daayein box ka bada text. Khaali ho to poora box gayab. */
  boxTitle: z.string().trim().max(60).default(''),
  boxNote: z.string().trim().max(200).default(''),
  buttons: z.array(ctaButtonSchema).max(MAX_CTA_BUTTONS).default([]),
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

  /*
   * ⚠️ Yahan ek `contactEmail` bana diya gaya tha (2 Sep) — **bina poochhe**, aur client ne
   * turant palta: wo email settings me nahi, **enquiry form ke `emailTo`** me pehle se hai.
   * Ek hi pata do jagah rakhna hamesha ek din alag ho jaata hai.
   *
   * Sabak: "email kahan se aayega" ek **content ka sawaal** tha, code ka nahi. Naya field
   * banane se pehle poochhna tha.
   */
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
   * Page ka aakhri CTA card — design ka `.offer` (D-67).
   *
   * ⚠️ Ye `settings` me hai kyunki client ne kaha "dusre pages par bhi use hoga". Package
   * ke domain ka maal aam taur pe `packageDefaults` me jaata hai (D-46) — ye uska apwaad
   * nahi, uska palan hai: jo cheez sirf package ki nahi, wo yahin rehni chahiye.
   */
  ctaSection: ctaSectionSchema.default({}),

  /**
   * `Settings ▸ Tour settings` — trust badges + universal banner (D-87, client #10/#11).
   *
   * Poora tark `tourSettingsSchema` ke upar hai. Screen Slice C me banegi; schema pehle isliye
   * hai ki public payload me iska raasta abhi se sach ho — warna wahan ek aisi field padhi
   * jaati jo maujood hi nahi.
   */
  tourSettings: tourSettingsSchema.default({}),

  /**
   * `Settings ▸ Blog settings` — author · TOC · post ki sidebar (spec 008, client 9 Sep).
   *
   * ⚠️ **Model me bhi jodna zaroori hai** (`settings/model.js`). `updateSettings()` ka `$set`
   * generic hai, isliye Zod pass kar dega — par Mongoose `strict` **anjaan path chup-chaap
   * gira deta hai**: API `200` degi, admin `"Saved."` dikhayega, aur DB me kuch nahi hoga.
   * Isi liye iska test **response nahi, DB** padhta hai.
   */
  blogSettings: blogSettingsSchema.default({}),

  /**
   * `Pages ▸ Pages settings` — banner ka fallback + `On this page` (client, 14 Sep, D-95 §12).
   *
   * ⚠️ `blogSettings` wali hi chetavni: **model me bhi** hai (`settings/model.js`), warna Mongoose
   * `strict` ise chup-chaap gira deta aur admin `"Saved."` dikhata.
   */
  pageSettings: pageSettingsSchema.default({}),

  /**
   * `Enquiries ▸ Popup` — poori site ka ek popup form (client, 21 Sep).
   *
   * ⚠️ Wahi chetavni: **model me bhi** hona chahiye (`settings/model.js`), warna Mongoose `strict`
   * ise chup-chaap gira deta aur admin `"Saved."` dikhata. Aur `MERGED_KEYS` me bhi — warna ek
   * adhoora PATCH poora popup uda de.
   */
  popupSettings: popupSettingsSchema.default({}),

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
  /**
   * Mobile ki neeche wali patti ka **Get free quote** kahan le jaaye (client, 16 Sep).
   *
   * Package aur blog pe wo button isi page pe form ki sheet kholta hai (`EnquiryDock`). Home pe client ne
   * saaf mana kiya — _"get free quote ko contact page se link kar denge, popup nahi chahiye"_ — kyunki home
   * ka form hero me pehle se khula baitha hai; ek hi page pe do form ek doosre ko kaat-te.
   *
   * Khaali = patti me wo button hi nahi aata (D-30); Call aur WhatsApp phir bhi rahenge.
   */
  quoteUrl: z.string().trim().max(500).default(''),

  /**
   * Desktop pe chipke hue do gol button — WhatsApp aur phone — kis taraf rahein (client, 21 Sep).
   *
   * Ye reference ka `.float` hai aur wo **saaton site reference me maujood tha** (`home-nav-v3` ·
   * `tour-v3` · `itinerary-v3` · `blog-v1` · `blog-detail-v1` · `contact-us` ·
   * `page-template-text`), bilkul ek hi CSS ke saath — par theme me kabhi bana hi nahi. Yaani ye
   * naya feature nahi, **chhoota hua** hissa hai (R15). Reference me wo hamesha `right` pe hai;
   * `left` client ka maanga hua vikalp hai.
   *
   * ⚠️ **Iska koi on/off toggle jaan-boojh kar nahi hai.** Buttons `phone` aur `whatsapp` se hi
   * bante hain — dono khaali ho to component khud `null` lautata hai (wahi D-30 wala guard jo
   * `.mobar` pe hai). Alag toggle rakhne ka matlab hota "band" ke **do** matlab, aur wo ek din
   * alag ho jaate: number bhara hua par toggle off, ya ulta.
   *
   * ⚠️ 760px se neeche ye dikhte hi nahi — wahan `.mobar` pehle se yahi do kaam karti hai. Dono
   * ek saath dikhna hi is field ka sabse aasan tootna hai, isliye wo rok **CSS me** hai.
   */
  floatingContactSide: z.enum(['right', 'left']).default('right'),

  searchEngineVisible: z.boolean().default(false),

  /**
   * Site ki apni CSS — **Settings ▸ Custom CSS** (client, 16 Sep).
   *
   * `Custom editor` block me client apna HTML likhta hai, par uski CSS wahan likhi hi nahi ja sakti:
   * sanitizer `<style>` ka poora content gira deta hai (R20). Isliye CSS yahan rehti hai aur theme use
   * har page ke `<head>` me ek `<style>` me daalti hai (client ka faisla: _"poori site par"_).
   *
   * ⚠️ **`</style` yahin rok diya jaata hai.** Wo do akshar CSS ke liye bemaani hain, par `<style>` ke
   * andar likhe jaane par wo tag **jaldi band** kar dete hain — uske aage ka sab HTML ban jaata hai.
   * Ye A-27 wali hi baat hai: value jahan render hoti hai, uska vyakaran wahin rokna padta hai.
   * CSS me JavaScript nahi chalti, isliye is ek rok ke baad yahan XSS ka raasta nahi bachta.
   */
  customCss: z
    .string()
    .max(50000)
    .refine((v) => !/<\/style/i.test(v), 'CSS cannot contain "</style"')
    .default(''),

  /** Site ke rang — Settings ▸ Colours (client, 17 Sep). Admin hamesha poora object bhejta hai. */
  themeColors: themeColorsSchema.default({}),

  /** Chaudai, kone, shadow, button, header/logo — Settings ▸ Layout (client, 17 Sep). */
  themeLayout: themeLayoutSchema.default({}),

  /** Heading/Body font + 9 step ki size table — Settings ▸ Fonts (client, 17 Sep). */
  themeFonts: themeFontsSchema.default({}),
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
  .extend({
    social: socialUpdateSchema.partial().optional(),

    /**
     * ⚠️ **`popupSettings` ko bhi alag se `.partial()` chahiye, aur uski wajah ek asli data
     * loss hai** (21 Sep, test se pakdi gayi).
     *
     * `popupSettingsSchema` ke har field pe `.default()` hai. Uske bina `{ enabled: false }`
     * jaisa adhoora PATCH Zod se **poora** object ban kar nikalta hai (`formId: ''`,
     * `heading: ''`…), aur `MERGED_KEYS` wala merge un khaali defaults ko DB pe likh deta hai —
     * yaani ek chhota patch poora popup uda deta hai.
     *
     * Ye theek wahi 10 Sep wala `blogSettings` bug hai, sirf ek kadam pehle: wahan poora object
     * replace ho raha tha, yahan Zod use khud bhar deti hai. **Naya nested object jodo to yahan
     * bhi jodo.**
     */
    popupSettings: popupSettingsSchema.partial().optional(),
  })

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
