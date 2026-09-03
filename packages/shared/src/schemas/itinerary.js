import { z } from 'zod'

import { htmlSchema } from './rich-html.js'

/**
 * Itinerary ka contract — spec 007 §3, Slice 4.
 *
 * Ye `entries.fields.itinerary[]` me rehta hai (D-46) — package ka sabse bada hissa, aur
 * public page ka bhi.
 *
 * **Din ka `id` stable hota hai.** Wo drag-reorder ke aar-paar bacha rehna chahiye: bina
 * uske React ki key index ban jaati hai, aur reorder pe collapse state galat row pe chipak
 * jaati hai — theek wahi bug jo Slice 0 me menu builder pe pakda gaya tha (D-43 §5).
 */

export const MEALS = Object.freeze(['breakfast', 'lunch', 'dinner'])

export const MEAL_LABEL = Object.freeze({
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
})

export const itineraryDaySchema = z.object({
  id: z.string().min(1).optional(),

  title: z.string().min(1).max(300),

  /**
   * Us raat kahan rukna hai — **Destinations taxonomy ki id**, free text nahi
   * (client ne 26 Aug ko badla).
   *
   * Isi se route strip banti hai (§3.1). Free text hone pe "Havelock" aur "Havelock
   * Island" do alag jagah ban jaate aur strip do card dikhati — wahi wajah thi ki client
   * ne ise list se bandha.
   *
   * Aakhri din (departure) pe khaali rehta hai.
   */
  overnightStayId: z.string().nullable().default(null),

  /**
   * Din ka poora text — paragraph **aur** list, dono isi me (client, 27 Aug — D-64).
   *
   * Pehle `highlights[]` alag field thi. Client ne kaha alag row nahi chahiye, list yahin
   * likh denge — aur wo theek hai: dono ek hi din ki baat kehte the, aur do field bharwane
   * ka matlab tha ki client har din do jagah jaaye.
   *
   * **Niyam ek hi hai: `-` se shuru hone wali line bullet banti hai, baaki paragraph.**
   * Sirf bullets likho to sirf bullets aayenge; paragraph + list dono chaho to wo bhi.
   * Purana `highlights` data migration 014 me isi shape me aa chuka hai.
   *
   * ⚠️ Ab ye **HTML** hai — D-80 (client, 3 Sep). Pehle yahan likha tha:
   *
   * > ~~Ye rich text nahi hai, aur wo jaan-boojh kar: har din ka apna block tree matlab uska
   * > versioning aur Phase 5 me uski migration — ek paragraph aur chaar bullet ke liye.~~
   *
   * Wo daam ab lagta hi nahi — rich text ek saada HTML string hai, koi block tree nahi.
   *
   * ⚠️ **`-` wala niyam ab data me nahi hai.** D-64 me `-` se shuru hone wali line bullet
   * banti thi (migration 014 ne purana `highlights[]` isi shape me daala tha), aur theme us
   * niyam ko render pe lagata tha. Migration 020 ne wo lines asli `<ul><li>` me badal di
   * hain — ab wo convention sirf `textToHtml()` me zinda hai, jahan naya plain text aata hai.
   */
  description: htmlSchema.pipe(z.string().max(8000)),

  meals: z.array(z.enum(MEALS)).max(3).default([]),

  /** Transfer list ki id — `Private cab`, `Ferry`, `Airport drop`. */
  transferId: z.string().nullable().default(null),

  /**
   * `90 min` · `2 hrs` — us **din** ka transfer kitna lamba hai.
   *
   * Ye Transfer ke record pe **nahi** ho sakta, aur ye data se hi saaf hai: reference me
   * ek hi `Ferry` teen alag duration pe chalti hai (90 min · 40 min · 2 hrs). Record pe
   * rakhne ka matlab hota har route ke liye ek alag "Ferry" banana. (spec 007 §9 #4 ka
   * bacha hua aadha — D-51 §2)
   *
   * Free text hai, number nahi: `90 min`, `2 hrs` aur `overnight` teenon likhe jaate hain.
   */
  transferNote: z.string().max(60).default(''),

  /** Din ke card pe chhota label — `Arrival day`, `Departure`. */
  dayTag: z.string().max(60).default(''),

  /**
   * Ek free-text line jo din ke card pe ek chip banti hai — `Approx. 4 hrs sightseeing`,
   * `Add-ons priced below` (spec 007 §9 #10, D-51 §1).
   *
   * Baaki saari chips **structured data se** banti hain (stay, transfer, meals). Ye do
   * kisi field se nahi aatin — isliye ek free line. Khaali ho to chip dikhti hi nahi.
   *
   * Icon fixed hai, client nahi chunta: ek line ke liye do field bharwana bhaari hai.
   */
  note: z.string().max(200).default(''),

  /*
   * `hotelCategory` **hata diya gaya** (client, 27 Aug — D-64).
   *
   * Wo D-51 me client ke hi kehne pe aaya tha: "ek hi package me kuch raatein alag darje ke
   * hotel me ho sakti hain." Live dekhne ke baad unhe wo column bemaani laga — pricing
   * package-level pe hai (§4) aur hotels ki table usi se banti hai, to din pe ek aur category
   * chunna ek aisa sawaal tha jiska jawab page pe kahin dikhta hi nahi tha.
   */
})

export const itinerarySchema = z.array(itineraryDaySchema).max(60).default([])

/**
 * Itinerary se **route strip** — spec 007 §3.1.
 *
 * Ye is spec ki sabse zaroori derived cheez hai: client ko iske liye kuch bharna hi nahi
 * padta. **Lagatar din jinka overnight stay same hai wo ek card me judte hain.**
 *
 * ```
 *   Day 1  Port Blair          NIGHTS 1     Port Blair
 *   Day 2  Havelock       →    NIGHTS 2–3   Havelock
 *   Day 3  Havelock            NIGHT  4     Neil Island
 *   Day 4  Neil Island         NIGHT  5     Port Blair
 *   Day 5  Port Blair
 *   Day 6  (departure)
 * ```
 *
 * **Lagatar** hona zaroori hai, sirf "same" nahi: Port Blair yahan do baar aata hai (raat
 * 1 aur raat 5) aur wo **do alag card** hain. Unhe ek me jodne ka matlab hota ki trip ka
 * asli kram hi gayab ho jaaye.
 *
 * Bina `overnightStayId` wale din (departure) strip me nahi aate — us raat koi rukna hai
 * hi nahi.
 *
 * `packages/shared` me isliye hai ki admin ka preview aur public site ka render **bilkul
 * ek jaise** hone chahiye. Do jagah rakhne ka nateeja is repo me pehle dekha ja chuka hai
 * (D-43 §2).
 *
 * @param {Array<{ overnightStayId?: string|null }>} days
 * @returns {Array<{ stayId: string, from: number, to: number, nights: number }>}
 *   `from`/`to` **raat ke number** hain (1 se shuru), din ke index nahi
 */
export function routeStrip(days = []) {
  const strip = []
  let night = 0

  for (const day of days) {
    const stayId = day?.overnightStayId
    if (!stayId) continue

    night += 1
    const last = strip[strip.length - 1]

    if (last && last.stayId === stayId && last.to === night - 1) {
      last.to = night
      last.nights += 1
      continue
    }

    strip.push({ stayId, from: night, to: night, nights: 1 })
  }

  return strip
}

/**
 * Har destination pe kitni raatein — hotel table ka `Nights` column (spec 007 §1.3).
 *
 * Yahan **lagatar** hona zaroori nahi hai: table ek hotel ki row dikhati hai, uska kram
 * nahi. Port Blair ki dono raatein (1 aur 5) ek hi row me `2` banti hain — warna table me
 * ek hi hotel do baar aata.
 *
 * Yahi farq route strip se hai, aur isiliye ye alag function hai.
 *
 * @param {Array<{ overnightStayId?: string|null }>} days
 * @returns {Record<string, number>}
 */
export function nightsByStay(days = []) {
  const nights = {}

  for (const day of days) {
    const stayId = day?.overnightStayId
    if (!stayId) continue

    nights[stayId] = (nights[stayId] ?? 0) + 1
  }

  return nights
}
