import { z } from 'zod'

import { HOTEL_CATEGORIES } from '../constants/index.js'

/**
 * Pricing aur package ke hotels — spec 007 §4, Slice 5.
 *
 * Ye teen cheezein `entries.fields` me baithti hain (D-46): `pricing{}`, `hotels[]` aur
 * `addOns[]` — spec §2 me teenon alag likhi hain, isliye yahan bhi alag hain.
 *
 * **Public page ka sabse mehnga hissa yahi hai** — page ke upar ka `₹31,999 → ₹24,999`,
 * category ka catbar, hotels ki table aur booking form ka dropdown, chaaron isi data se
 * bante hain (§6). Isiliye ye itinerary ki tarah **validate hota hai**, baaki plain fields
 * ki tarah nahi: yahan galat data ka nateeja ek galat dikhta hua field nahi, galat **daam**
 * hai.
 */

/**
 * **Basis, GST aur advance package pe nahi hain** — client ka faisla, 27 Aug (D-57).
 *
 * Pricing panel me ek row thi: `Price Basis · GST % · Advance to Book %`. Client ne poori
 * row hata di. Uske saath `PRICE_BASIS` ka poora set bhi gaya — uska koi caller nahi bacha,
 * aur ek constant jiska koi user na ho wo sirf sadta hai (wahi tark jo `tags` field type pe
 * laga tha, D-55).
 *
 * Page pe `per person on twin sharing, daily breakfast included` wali line phir bhi dikhti
 * hai — wo ab `packageDefaults.priceNote` se aati hai, ek baar likhi jaati hai aur har
 * package pe wahi chhapti hai.
 */

/**
 * Ek category ka daam — spec §4.
 *
 * **Chaaron category ki row hamesha hoti hai** (client, 27 Aug — D-57). Editor me "＋ Add
 * category" jaisa kuch nahi hai: categories fix hain (§1.3), to unhe ek-ek karke jodna ek
 * bana-banaya sach dobara bharwana tha.
 *
 * `category` yahan **key** hai — ek category do baar nahi aa sakti (service check karti hai).
 * Array isliye hai, `Record` nahi: kram maayne rakhta hai (sasta se mehnga), aur array ka
 * kram apne aap likha hua rehta hai.
 */
export const categoryPricingSchema = z.object({
  category: z.enum(HOTEL_CATEGORIES),

  /**
   * Jo asli me lena hai. Page pe ye **bada** number hai.
   *
   * **Khaali ho sakta hai** — aur wahi is package pe "ye category milti hi nahi" kehne ka
   * tareeka hai (client, 27 Aug — D-57). Chaaron rows hamesha editor me hoti hain; jiska
   * daam nahi bhara, wo public page ke catbar aur hotels tabs dono me **aati hi nahi**.
   *
   * Isi wajah se koi alag "ye category on hai" toggle nahi hai: wo ek hi baat do jagah
   * likhna hota, aur dono ke alag hone pe daam ke bina card dikh jaata.
   *
   * `.int()` hai — paisa/cent yahan kabhi nahi aata: page pe har daam poora rupee hai
   * (`₹24,999`), aur decimal aate hi har jagah rounding ka sawaal khada hota.
   */
  priceFrom: z.number().int().min(0).max(100_000_000).nullable().default(null),

  /**
   * Kaata hua daam (`₹31,999`) — **optional**, aur `priceFrom` se bada hona chahiye.
   *
   * `null` ka matlab hai "koi discount nahi dikhana" — page pe phir sirf ek number aata
   * hai. Wo check service me hai, schema me nahi: yahan lagane ka matlab hota ki adhoora
   * bhara hua form save hi na ho (`strikePrice` pehle bhar diya, `priceFrom` abhi baaki).
   */
  strikePrice: z.number().int().min(0).max(100_000_000).nullable().default(null),

  /*
   * `note` yahan **nahi** hai (client, 27 Aug — D-57). Wo ab hotel ke apne record pe hai
   * (`hotels.note`), aur catbar ka card us category ke pehle hotel ka note dikhata hai.
   */
})

export const pricingSchema = z.object({
  categoryPricing: z.array(categoryPricingSchema).max(HOTEL_CATEGORIES.length).default([]),
})

/**
 * Package ke hotels — har destination × category pe ek (spec §4.2).
 *
 * `Nights` yahan **nahi** hai: wo itinerary se derive hota hai (`nightsByStay()`), aur usi
 * ek jagah rehna chahiye. Do jagah rakhne ka matlab hota ki itinerary badalne pe table
 * chup-chaap purani raatein dikhati rahe.
 *
 * `Room` bhi yahan nahi hai — wo hotel ke apne record pe hai (D-53 §3).
 */
export const packageHotelSchema = z.object({
  id: z.string().min(1).optional(),

  /** Destinations taxonomy ki id — wahi jo itinerary ke `overnightStayId` me aati hai. */
  destinationId: z.string().min(1),

  category: z.enum(HOTEL_CATEGORIES),

  /** Hotels master list ki id — service write pe check karti hai ki wo maujood hai. */
  hotelId: z.string().min(1),
})

/**
 * Ek destination pe chaar category = chaar row, aur teen destination = bara. Cap usse
 * upar rakhi hai taaki asli data kabhi na rukey, par ek loop bhi na bhar paaye.
 */
export const packageHotelsSchema = z.array(packageHotelSchema).max(80).default([])

/*
 * `packageAddOnsSchema` **hata diya gaya** (D-61) — add-ons ab global hain, package unme se
 * chunta nahi. Ek schema jiska koi caller na ho wo sirf sadta hai; wahi tark jo `tags` field
 * type (D-55) aur `PRICE_BASIS` (D-57) pe laga tha.
 */

// ── derived ──────────────────────────────────────────────────────────────────

/**
 * Page ke upar ka daam — **sabse sasti category** (spec §6).
 *
 * Ye derive hota hai, koi "featured category" wala field nahi hai: client ko ek aur cheez
 * chunni padti, aur wo daam badalne pe purani reh jaati.
 *
 * @param {{ categoryPricing?: Array<{ category: string, priceFrom: number, strikePrice: number|null, note: string }> }} [pricing]
 */
export function cheapestPricing(pricing) {
  const rows = pricedCategories(pricing)
  if (!rows.length) return null

  return rows.reduce((min, row) => (row.priceFrom < min.priceFrom ? row : min))
}

/**
 * Sirf wo categories jinka daam bhara hua hai — **sasti se mehngi ke kram me**.
 *
 * Public page pe har jagah yahi list chalti hai: catbar ke card, hotels ke tabs, aur upar
 * ka `from` daam. Ek hi jagah hone se teenon kabhi alag nahi ho sakte — bina iske ek jagah
 * chaar card aur doosri jagah teen tab dikhne ka bug bilkul mumkin hai.
 *
 * @param {{ categoryPricing?: Array<{ category: string, priceFrom: number|null }> }} [pricing]
 */
export function pricedCategories(pricing) {
  return (pricing?.categoryPricing ?? [])
    .filter((row) => row?.priceFrom != null)
    .sort((a, b) => a.priceFrom - b.priceFrom)
}

/**
 * Currency ka chinh — currency khud `settings.currency` se aati hai (D-56 §2).
 *
 * `AED` yahan isliye hai ki uska koi ek-akshar ka chinh nahi hota; baaki dono ke saath wo
 * ek hi jagah likha rehta hai.
 */
export const CURRENCY_SYMBOL = Object.freeze({ INR: '₹', USD: '$', AED: 'AED ' })

/**
 * `₹24,999` — daam ka display.
 *
 * `en-IN` grouping jaan-boojh kar hai (`₹31,999`, aur bade number pe `₹1,24,999`) —
 * reference design (`itinerary-v3.html`) me yahi hai. USD/AED pe wo grouping galat hoti,
 * isliye unke liye `en-US`.
 *
 * @param {number} amount
 * @param {string} [currency]
 */
export function formatPrice(amount, currency = 'INR') {
  const symbol = CURRENCY_SYMBOL[currency] ?? ''
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'

  return `${symbol}${Math.round(amount).toLocaleString(locale)}`
}
