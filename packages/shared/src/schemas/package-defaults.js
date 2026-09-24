import { z } from 'zod'

import {
  DEFAULT_IMAGE_POOL_MAX,
  DEFAULT_SITE_ID,
  PACKAGE_SECTIONS,
  sectionHasDescription,
} from '../constants/index.js'
import { emptyHtml, htmlSchema, inlineHtmlSchema } from './rich-html.js'

/**
 * `packageDefaults` — Packages ke apne globals (spec 007 §1.8).
 *
 * Kuch cheezein har package pe **bilkul same** chhapti hain. Wo kisi ek package ka data
 * nahi hain, par site ki setting bhi nahi hain.
 *
 * **`settings` me kyun nahi:** technically wahan daalna sasta tha (wo bhi singleton hai).
 * Par `settings` **site** ki settings hai — naam, logo, timezone, footer. Usme package ka
 * maal daalne ka matlab hai ki kal Pages aur Posts ka maal bhi wahin jaayega, aur ek din
 * `settings` ek kachra-peti ban jaayegi jise koi khol kar padh na sake.
 *
 * Singleton ka pattern wahi hai jo `settings` ka hai (D-40): `{siteId}` pe unique index,
 * koi `:id` route nahi, aur `ensurePackageDefaults()` use pehli baar bana deta hai.
 */

/**
 * `4.9 ★ 412 trips` — rating ki jodi.
 *
 * **Do jagah lagti hai, aur wo D-87 ka badlaav hai:** `packageDefaults.rating` (site ki
 * default) aur `entry.fields.rating` (ek package ki apni).
 *
 * ## D-70 kyun palta
 *
 * 1 Sep ko client ne kaha tha ki rating **universal** hai — poori site pe ek hi jodi, haath
 * se likhi hui. Wo faisla us waqt sirf **package detail page** ko dekh kar liya gaya tha,
 * jahan wo do jagah chhapti hai aur dono jagah wahi number theek lagta hai.
 *
 * 7 Sep ko `tour-v3.html` aayi — ek **listing** page, jahan chaudah package ek doosre ke
 * neeche khade hain. Wahan har card pe ek hi `4.9 ★ 412 trips` chhapna sirf galat nahi
 * dikhta, wo **jhootha** dikhta hai: teen alag package, teen alag safar, ek hi ginti. Isliye
 * D-70 ab **Superseded by D-87** hai.
 *
 * ## Khaali ka matlab yahan alag hai
 *
 * ⚠️ D-70 me khaali `value` (0) ka matlab tha **"rating dikhani hi nahi"**. Per-package field
 * pe wo matlab nahi chalta: paanchon live package pe aaj `fields.rating` hai hi nahi, aur us
 * matlab ka nateeja hota ki deploy karte hi paanchon page se rating **gayab** ho jaaye —
 * jabki client ne wo `packageDefaults` me likhi hui hai aur wo aaj chhap rahi hai.
 *
 * Isliye niyam ye hai: **khaali `value` par `packageDefaults.rating` chalti hai.** Package ka
 * apna number usko *override* karta hai, mitata nahi. Dono khaali hon tabhi line gayab hoti
 * hai — yaani D-70 wala "khaali = gayab" ab site-level pe hai, package pe nahi.
 *
 * ⚠️ Iska ek nateeja maan lena chahiye: client "is package ki rating **mat** dikhao" nahi keh
 * sakta jab tak site-level wali khaali na ho. Wo aaj kisi ne maanga nahi hai; jis din maange,
 * uske liye `value: -1` jaisa sentinel **mat** banana — ek alag `hideRating` toggle sasta aur
 * padhne me saaf rahega.
 */
export const ratingSchema = z
  .object({
    value: z.coerce.number().min(0).max(5).default(0),
    /** `412 trips` — trips ki ginti, likhi hui reviews ki nahi. */
    count: z.coerce.number().int().min(0).default(0),
  })
  .default({ value: 0, count: 0 })

/**
 * Ek line — "Accommodation on twin sharing with daily breakfast".
 *
 * ⚠️ Ab isme **inline HTML** ho sakti hai (D-80): `<b>Daily</b> breakfast`. Block tag yahan
 * nahi chalte, aur wo suraksha se zyada **design** ki baat hai — ye line theme ke `<li>` ke
 * andar chhapti hai (`<li><Tick />{line}</li>`), aur `<li>` ke andar `<p>` line ko uske icon
 * se alag kar deta hai. Rok `sanitize-html.js` ke `inline` profile me lagti hai.
 *
 * ✓/✗ ka icon **theme ka hi rehta hai**, content ka nahi — WordPress bhi yahi karta hai
 * (D-80).
 */
const lineSchema = inlineHtmlSchema.pipe(z.string().max(500))

/**
 * "How booking works" ka ek step — spec 007 §2.1.
 *
 * Page pe ye `Tell us your dates → Get the day-by-day plan → Confirm with 25% →
 * Travel with a local on call` ki tarah dikhta hai. Har package pe same hai, isliye yahan.
 */
export const bookingStepSchema = z.object({
  id: z.string().min(1).optional(),
  /** `title` ek line ka label hai — usme heading ya list ka koi matlab nahi, isliye plain. */
  title: z.string().min(1).max(200),
  /** Step ka text ab **HTML** hai (D-80). */
  text: htmlSchema.pipe(z.string().max(2000)),
})

/**
 * Ek section ka heading + uske neeche ki line — Q-9 ka jawab (client, 31 Aug).
 *
 * **Dono khaali ho sakte hain, aur khaali ka matlab alag-alag hai:**
 *
 * - khaali `heading` → theme ka apna heading chhapega (`PACKAGE_SECTION_DEFAULTS`)
 * - khaali `description` → us section ke neeche **kuch nahi** chhapega
 *
 * Ye farak jaan-boojh kar hai. Heading ke bina section ka koi matlab nahi, isliye wahan
 * fallback chahiye; par line optional hai — aaj saat me se sirf teen sections pe hai, aur
 * baaki chaar pe client chaahe to baad me daal sakta hai.
 *
 * Text **plain** hai, rich text nahi — wahi tark jo FAQs (D-59) aur footer ke text blocks
 * (D-44 §8) pe laga: admin se aayi HTML ko render karna stored XSS ka seedha raasta hai.
 */
const headingSchema = z.string().trim().max(120).default('')
/**
 * Description ab **rich text** hai, plain string nahi — D-69 (client, 1 Sep).
 *
 * Safar: pehle ye ek intro **line** thi (`max(1000)`). D-68 me "Good to know" ka poora
 * content isme aa gaya to cap 3000 hua. Phir client ne wo content likhna shuru kiya aur
 * seedhi baat kahi — _"if I need to style any text how I will style in textarea"_. Textarea
 * me bold, heading ya list ban hi nahi sakti.
 *
 * **Saaton section pe ek jaisa** — chhe pe (Overview pe description hai hi nahi). "Ek jagah
 * rich, baaki plain" wali asymmetry ka koi principled kaaran nahi tha, sirf ye ki aaj
 * zaroorat ek hi jagah dikhi. Client ke senior ne bhi yahi kaha: har jagah editor.
 *
 * `heading` **plain hi hai** — wo ek line ka `<h2>` hai, usme bold ka koi matlab nahi.
 */
const descriptionSchema = htmlSchema.default(emptyHtml)

/**
 * `{ overview: {...}, itinerary: {...}, ... }` — keys `PACKAGE_SECTIONS` se.
 *
 * Shape list se banti hai, haath se nahi likhi jaati: naya section jodne pe sirf
 * `package-sections.js` badlegi, ye schema apne aap saath aa jaayega. Wahi pattern jo
 * `settings.js` ke `socialShape()` pe chal raha hai.
 *
 * ⚠️ **Overview pe sirf `heading` hai.** Uska "text" pehle se `entry.content` (Edit Package
 * ▸ Overview) hai, aur wo per-package hai — client ne 31 Aug ko wahan global line dene se
 * mana kiya. `.strict()` isliye lagta hai ki `description` bhejne pe **400** aaye: bina
 * uske Zod use chup-chaap gira deta aur admin ko "save ho gaya" dikhta.
 */
const sectionLabelsShape = Object.fromEntries(
  PACKAGE_SECTIONS.map((section) => [
    section.key,
    z
      .object(
        sectionHasDescription(section)
          ? { heading: headingSchema, description: descriptionSchema }
          : { heading: headingSchema },
      )
      .strict()
      .default({}),
  ]),
)

export const packageDefaultsSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  /**
   * "What's included" ka do-column block — spec 007 §1.5.
   *
   * **Poori tarah global hai** (client ka faisla): har package pe wahi list chhapti hai,
   * aur package editor me iska koi panel nahi hai. Admin design ka "Inclusions &
   * Exclusions" panel isiliye hata diya gaya.
   *
   * ⚠️ Content ki ek zaroori baat: page ka aaj ka text package-specific hai ("**5 nights**
   * on twin sharing"). Global list me ye lines **generic** likhni padengi. Ye content ka
   * kaam hai, code ka — par pehle se pata hona chahiye.
   *
   * `Inclusion/Exclusion` isi block ka doosra naam hai (spec 007 §9 #2 — abhi ek hi maana
   * ja raha hai).
   */
  whatsIncluded: z
    .object({
      included: z.array(lineSchema).max(100).default([]),
      excluded: z.array(lineSchema).max(100).default([]),
    })
    .default({ included: [], excluded: [] }),

  /**
   * Itinerary Images ka **global pool** — spec 007 §1.7.
   *
   * Client ek baar ~20 image daalta hai; har package page unme se kuch dikhata hai aur
   * **refresh pe badal jaati hain**.
   *
   * Randomness **client-side** hogi: site Next.js ISR pe hai (D-14), to page ek baar bante
   * hi cache ho jaata hai — server pe random karne ka koi matlab nahi, jo pehli baar chuna
   * wahi sabko dikhta rehta. Server saari ids bhejta hai, browser load pe chunta hai.
   */
  itineraryImages: z.array(z.string()).max(200).default([]),

  /**
   * Bulk Upload ki **default banner** images — `Itinerary Settings` me (client, 24 Sep).
   *
   * Doc me `Featured Image` / `Banner Image URL` na ho to import yahan se ek image chun kar package
   * ka `bannerImage` bana deta hai — **import ke waqt, save hoti hai**, page pe har refresh pe nahi
   * badalti. Listing card aur share image banner se hi aate hain; hero ki gallery pehle se
   * `itineraryImages` se bhar jaati thi, card nahi.
   *
   * ⚠️ `itineraryImages` se **alag** pool hai (client ka faisla) — gallery ki 20 image aur card ki
   * banner image alag kaam hain.
   */
  defaultBannerImages: z.array(z.string()).max(DEFAULT_IMAGE_POOL_MAX).default([]),

  bookingSteps: z.array(bookingStepSchema).max(20).default([]),

  /*
   * `priceNote` **hata diya gaya** (client, 27 Aug — Q-9). Wo line har package pe, har
   * category pe bilkul wahi thi, isliye ab theme me static hai (`PRICE_NOTE`,
   * `components/package/Pricing.jsx`) — admin me uske liye ek aur jagah dena bina wajah tha.
   */

  /**
   * "Cancellations more than 30 days before travel…" — spec 007 §2.1.
   *
   * Ab **HTML** hai (D-80) — client ne editor har prose field pe maanga.
   */
  cancellationText: htmlSchema,

  /**
   * `4.9 average from 412 trips` — **site ki default jodi** (client, 1 Sep; D-87 me badli).
   *
   * Ye spec 007 §9 #8 ka jawab hai: rating `reviews[]` se **gini nahi jaati**, client haath
   * se likhta hai. Ginne ka natija ulta hota — page pe teen-chaar likhi hui review ka
   * average dikhta, jabki asli number saalon ki 412 trips ka hai. Jo cheez sach me kahin
   * aur se aati hai use derive karne ka dikhawa karna sabse mehnga jhooth hai.
   *
   * ⚠️ **"Poori site pe ek hi jodi" ab sach nahi hai** — D-87 (7 Sep) ne wo palta. Ye ab
   * **default** hai: jis package pe apni rating likhi ho wo yahan se nahi aati. Poora tark
   * `ratingSchema` ke upar likha hai.
   *
   * Jahan ye chalti hai (jab package ki apni khaali ho):
   *
   * - hero me title ke upar — `4.9 ★ 412 traveller reviews`
   * - reviews section ke heading ke saath — `— 4.9 average from 412 trips`
   * - listing card pe — `4.9 ★ 412 trips`
   *
   * **Khaali `value` (0) yahan bhi "rating dikhani hi nahi"** — par ab wo sirf tab lagta hai
   * jab package ki apni bhi khaali ho. Wahi model jo pricing pe hai: khaali daam = wo
   * category milti hi nahi (D-56). Aur wahi D-30: khaali cheez khaali dikhe, tooti hui
   * nahi — `0.0 ★ 0 reviews` chhapna adhoora page dikhata hai.
   *
   * `value` dashmalav me hai (`4.9`) aur review card ka apna `rating` poora taara (1-5) —
   * do alag cheezein hain, isliye do alag jagah.
   */
  /**
   * Package page ke breadcrumb ka beech wala kadam — `Home › <ye> › Package` (client, 16 Sep).
   *
   * ⚠️ **Pehle ye theme me ek constant tha** (`ARCHIVE_CRUMB = { label: 'Andaman Tour Packages', href:
   * '/andaman-tour-packages/' }`), yaani **code me ek site ka naam**. 26 Aug ko wo jaan-boojh kar hardcode
   * hua tha (archive page tab bana hi nahi tha), par client ne 16 Sep ko theek sawaal poochha: _"kya koi
   * Andaman-specific data hai jo doosri site ka content daalne par bhi Andaman ka naam dega, even in
   * code?"_ — aur ye unme se ek tha.
   *
   * ## 17 Sep — label + link ki jagah **Tour page chuna jaata hai** (D-97 §6)
   *
   * 16 Sep ko yahan `archiveCrumb: { label, url }` tha — haath se likha naam aur link, aur wo
   * `Section Headings` ke har tab ke neeche dikhta tha (jaise har section ka apna ho). Client ne
   * poochha to asli baat nikli: package ka parent **Tour page** hai (`itinerary-v3.html` ka
   * breadcrumb `Home › Andaman Tour Packages › Package`). Haath ka link us page se juda nahi tha —
   * Tour page ka title ya slug badlo, breadcrumb purana hi rehta.
   *
   * Ab sirf page ki id. Naam us page ka **Title** aur link uska **path**, dono server pe
   * (`getPublicPackageDefaults()`). Screen: `Packages ▸ Itinerary Settings`.
   *
   * Khaali, ya chuna hua page draft/trash/delete = breadcrumb me wo kadam hi nahi (`Home › Package`)
   * — D-30: jo cheez nahi hai uski jagah khaali rahe, tooti hui nahi.
   *
   * ⚠️ `archiveCrumb` DB me 17 Sep ko **khaali** tha, isliye koi migration nahi.
   */
  breadcrumbPageId: z.string().trim().max(60).default(''),

  rating: ratingSchema,

  /**
   * Page ke section headings aur unke neeche ki lines — Q-9 (client, 31 Aug).
   *
   * `packageDefaults` me hai, package pe nahi: ye har package pe **bilkul same** chhapte
   * hain. Per-package rakhne ka matlab hota 14 naye field har editor me — theek wahi galti
   * jo D-57/D-58 me pakdi gayi thi.
   */
  /**
   * ⚠️ `.strict()` zaroori hai — Zod default me anjaan keys **chup-chaap hata deta hai**.
   *
   * Uske bina `{ notASection: {...} }` bhejne pe API 200 deti, key gayab ho jaati, aur
   * admin ko "ho gaya" dikhta. Theek wahi bug jo D-43 §3 me `leafItemSchema` pe mila tha —
   * wahan depth-4 ke `children` bina kisi error ke gaayab ho rahe the. Test ne yahan bhi
   * pehli hi baar pakda.
   */
  sectionLabels: z.object(sectionLabelsShape).strict().default({}),

  /**
   * SEO ka structured data on/off — **ab ek jagah, har package pe nahi** (client, 4 Sep).
   *
   * Pehle ye `entry.fields.seoSchema` tha, yaani har package pe ek checkbox. Live dekhne pe
   * uski do dikkatein saaf hui:
   *
   * 1. **Default `false` tha, to wo kabhi on hua hi nahi.** Paanchon package pe `false` mila —
   *    yaani ek bana-banaya feature teen din bekaar pada raha.
   * 2. **Ye per-package faisla hai hi nahi.** Site ya to structured data bhejti hai ya nahi;
   *    "is package pe bhejo, us pe mat bhejo" ka koi matlab nahi banta.
   *
   * ⚠️ Default ab **`true`** hai. Ise off rakhne ka koi kaaran hi nahi milta, aur off rehne ki
   * wajah se hi wo feature itne din so raha tha.
   */
  seoSchema: z.boolean().default(true),

  /**
   * "Similar itineraries" ke card — kitne dhoondhe jaayein aur ek page pe kitne dikhein.
   *
   * Dono number pehle **code me gade hue** the: API `limit(12)` pe aur theme `PER_PAGE = 3` pe.
   * Client ko ye badalne the (_"i put 10 and i want to show 5 then pagination"_), aur uske liye
   * do alag file chhoona padta.
   *
   * ⚠️ Defaults wahi hain jo aaj ka vyavhaar hai (12 aur 3) — is field ke aane bhar se kisi
   * chalte hue page ka look badalna nahi chahiye.
   *
   * `total` par cap zaroori hai: uske bina ek din 60-package wali site pe har package ka
   * payload chup-chaap dus guna ho jaata. Wahi soch jo `itineraryImages` aur `reviews` pe hai.
   */
  similar: z
    .object({
      total: z.number().int().min(0).max(60).default(12),
      perPage: z.number().int().min(1).max(12).default(3),
    })
    .strict()
    .default({}),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

/**
 * Update — sab optional, aur `siteId` client se kabhi nahi aata.
 *
 * Koi `create` schema nahi hai: singleton hai, `ensurePackageDefaults()` use bana deta hai.
 * Wahi shape jo `settings` ka hai (D-40) — do document ban hi na sakein, isliye create ka
 * raasta hi nahi rakha.
 */
export const updatePackageDefaultsSchema = packageDefaultsSchema
  .omit({ siteId: true, createdAt: true, updatedAt: true })
  .partial()

/** Naye instance ka khaali document. */
export function emptyPackageDefaults() {
  return {
    whatsIncluded: { included: [], excluded: [] },
    itineraryImages: [],
    defaultBannerImages: [],
    bookingSteps: [],
    cancellationText: '',
    /** Khaali — naye instance pe rating ki line dono jagah se gayab rehti hai. */
    rating: { value: 0, count: 0 },
    /**
     * Khaali — yaani naye instance pe theme ke apne headings chhapte hain. Yahan aaj ka
     * text copy **nahi** kiya jaata: copy karne pe wo DB me jam jaata, aur theme ka default
     * kabhi sudhre to purane instances usse kabhi nahi paate.
     */
    sectionLabels: {},
  }
}
