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

/**
 * Ek din ka meal jo `Breakfast` mana jaaye — listing card ka `Breakfast` chip isi se banta
 * hai (`hasBreakfast`, `public/service.js`).
 *
 * ⚠️ **Ye matcher yahan hai, wahan nahi.** Meals 21 Sep se **free text** hain (client): doc me
 * comma se alag karke kitne bhi likhe ja sakte hain, kyunki `Evening tea` jaise meal bhi hote
 * hain — A-38 me wahi chup-chaap gir gaya tha. Free text ho jaane ka matlab hai ki "is package
 * me breakfast hai ya nahi" ab **shabd dekh kar** tay hota hai, aur wo faisla ek hi jagah rehna
 * chahiye: do jagah likha jaata to ek din card ka chip aur page ka chip alag baat kehte (wahi
 * sabak jo D-43 §2 aur D-65 pe mila).
 */
const BREAKFAST = 'breakfast'

/**
 * Kisi bhi din ka meal `Breakfast` se shuru hota hai?
 *
 * `startsWith` isliye, poora milaan nahi: client `Breakfast (buffet)` ya `Breakfast at hotel`
 * likhta hai aur teenon ek hi baat kehte hain. Yahi udaar niyam purana `parseMeals()` enum ke
 * saath lagata tha — wo chala gaya, niyam bacha hai.
 */
export function hasBreakfast(meals = []) {
  return (Array.isArray(meals) ? meals : []).some((meal) =>
    String(meal ?? '')
      .trim()
      .toLowerCase()
      .startsWith(BREAKFAST),
  )
}

/**
 * Din ke text khaanon ki lambai ki hadd — **yahan se, aur sirf yahan se**.
 *
 * ⚠️ Ye constants Bulk Upload (D-81) ke liye nikaale gaye. Importer ko yahi hadd **pehle se**
 * pata honi chahiye, taaki wo lambi line ko **kaat kar warning** de sake. Bina iske Zod poori
 * row phenk deta hai aur client ko sirf `String must contain at most 60 character(s)` dikhta
 * hai — jisse ye pata hi nahi chalta ki galti kis din ke kis khaane me hai.
 *
 * Number do jagah likhne ka matlab hota ki ek din wo alag ho jaayein aur importer chup-chaap
 * galat jagah kaatne lage. Isliye schema bhi inhi ko padhta hai.
 */
export const ITINERARY_LIMITS = Object.freeze({
  title: 300,
  description: 8000,
  transferNote: 60,
  dayTag: 60,
  /** Ek meal ka naam — `Breakfast`, `Evening tea at the jetty`. */
  meal: 60,
  /** Ek din me kitne meal — chip ek hi line me chhapti hai, list nahi. */
  meals: 10,
})

export const itineraryDaySchema = z.object({
  id: z.string().min(1).optional(),

  title: z.string().min(1).max(ITINERARY_LIMITS.title),

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
  description: htmlSchema.pipe(z.string().max(ITINERARY_LIMITS.description)),

  /**
   * Us din ke meals — **free text**, comma se alag (client, 21 Sep).
   *
   * ⚠️ Pehle ye `z.enum(['breakfast','lunch','dinner'])` tha, yaani sirf teen. Client ke asli
   * doc me `Evening tea` likha tha aur wo importer me chup-chaap **gir** jaata tha (A-38) —
   * enum ke bahar ka shabd row ke issues me to aata tha, par us din ka meal page pe kabhi nahi
   * pahunchta. Client ka faisla: teen se zyada ho sakte hain, isliye ginti ki koi hadd hi mat
   * rakho.
   *
   * **Array hi rahi, string nahi** — chip `Breakfast, Evening tea included` banti hai, aur
   * `Breakfast` ka pata bhi har item pe alag se lagana hota hai (`hasBreakfast()`). Ek hi
   * string rakhne par dono jagah comma dobara todni padti, do alag jagah.
   */
  meals: z
    .array(z.string().trim().min(1).max(ITINERARY_LIMITS.meal))
    .max(ITINERARY_LIMITS.meals)
    .default([]),

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
  transferNote: z.string().max(ITINERARY_LIMITS.transferNote).default(''),

  /** Din ke card pe chhota label — `Arrival day`, `Departure`. */
  dayTag: z.string().max(ITINERARY_LIMITS.dayTag).default(''),

  /*
   * `note` **hata diya gaya** (client, 21 Sep — D-104).
   *
   * Wo din ke card pe ek chip banti thi (`Approx. 4 hrs sightseeing`, spec 007 §9 #10,
   * D-51 §1). Client ne uski jagah package-level **Notes section** maanga (Popular add-ons
   * ke theek upar, `fields.notes`), aur saath hi kaha ki phir ye din wala khaana rehna hi
   * nahi chahiye — ek hi cheez ke do ghar hone ka nateeja is repo me pehle dekha ja chuka hai
   * (D-86).
   *
   * Asli wajah A-38 me dikhi: client Day 3 ke `Notes` me poora paragraph likh raha tha aur wo
   * **200 akshar pe kat** jaata tha, kyunki ye khaana ek chip ke liye bana tha. Section usi
   * text ki sahi jagah hai.
   *
   * ⚠️ Purana data migration 027 ne DB se **hata** diya hai (client ka faisla).
   */

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
