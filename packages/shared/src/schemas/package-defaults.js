import { z } from 'zod'

import { DEFAULT_SITE_ID } from '../constants/index.js'

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

  /**
   * `per person on twin sharing, daily breakfast included` — daam ke saath wali line
   * (client, 27 Aug — D-57).
   *
   * Page pe **do jagah** chhapti hai: hero me daam ke neeche, aur hotels table ke neeche
   * wali patti me (`Deluxe category — ₹29,499 <yahi line>`).
   *
   * **Yahan isliye hai ki ye har package pe bilkul same hai** — wahi lakeer jo What's
   * Included pe hai (§1.5). Pehle iska aadha hissa `pricing.priceBasis` se derive hota tha;
   * client ne wo field hata di, par line design me hai aur dikhni chahiye (R15) — to wo ab
   * poori tarah client ke likhe hue shabd hain, na ki aadhi derived aadhi likhi hui.
   */
  priceNote: z.string().max(300).default(''),

  /** "Cancellations more than 30 days before travel…" — spec 007 §2.1. */
  cancellationText: z.string().max(5000).default(''),

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
    priceNote: '',
    cancellationText: '',
  }
}
