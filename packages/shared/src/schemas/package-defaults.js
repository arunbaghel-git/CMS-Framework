import { z } from 'zod'

import { DEFAULT_SITE_ID, PACKAGE_SECTIONS, sectionHasDescription } from '../constants/index.js'

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

/** Ek line — "Accommodation on twin sharing with daily breakfast". */
const lineSchema = z.string().max(500)

/**
 * "How booking works" ka ek step — spec 007 §2.1.
 *
 * Page pe ye `Tell us your dates → Get the day-by-day plan → Confirm with 25% →
 * Travel with a local on call` ki tarah dikhta hai. Har package pe same hai, isliye yahan.
 */
export const bookingStepSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  text: z.string().max(1000).default(''),
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
 * 1000 se 3000 (client, 31 Aug — D-68).
 *
 * Pehle ye ek intro **line** ke naap ka tha. Ab "Good to know before you book" ka poora
 * content isi box me jaata hai (spec ka `goodToKnow[]` field banaya hi nahi gaya, kyunki
 * wo content har package pe same rehta hai), aur wo do-teen paragraph ka hota hai.
 *
 * `cancellationText` pehle se 5000 pe hai — usi shreni ka content hai, isliye 1000 wahan
 * bhi kam hi lagta.
 */
const descriptionSchema = z.string().trim().max(3000).default('')

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

  bookingSteps: z.array(bookingStepSchema).max(20).default([]),

  /*
   * `priceNote` **hata diya gaya** (client, 27 Aug — Q-9). Wo line har package pe, har
   * category pe bilkul wahi thi, isliye ab theme me static hai (`PRICE_NOTE`,
   * `components/package/Pricing.jsx`) — admin me uske liye ek aur jagah dena bina wajah tha.
   */

  /** "Cancellations more than 30 days before travel…" — spec 007 §2.1. */
  cancellationText: z.string().max(5000).default(''),

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
    bookingSteps: [],
    cancellationText: '',
    /**
     * Khaali — yaani naye instance pe theme ke apne headings chhapte hain. Yahan aaj ka
     * text copy **nahi** kiya jaata: copy karne pe wo DB me jam jaata, aur theme ka default
     * kabhi sudhre to purane instances usse kabhi nahi paate.
     */
    sectionLabels: {},
  }
}
