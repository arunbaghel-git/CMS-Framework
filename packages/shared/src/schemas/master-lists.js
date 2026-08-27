import { z } from 'zod'

import { DEFAULT_SITE_ID, HOTEL_CATEGORIES } from '../constants/index.js'

/**
 * Packages ki master lists — spec 007 §1.3, §1.4, §1.6.
 *
 * Client ka poora model yahi hai: **jo cheez dohrayi jaati hai, wo ek baar likhi jaaye aur
 * har package usme se chune.** Isse spelling har jagah ek jaisi rehti hai.
 *
 * Ye teen `entries` me **nahi** hain aur `taxonomies` me bhi nahi — inka apna URL nahi
 * hai, ye publish nahi hoti, inka trash/revision/SEO ka koi matlab nahi (D-46). Lakeer
 * wahi hai: _"iska apna URL aur publish lifecycle hai?"_
 *
 * `locale` in teenon pe jaan-boojh kar **nahi** hai — inpe koi unique index nahi hai,
 * isliye multi-language aane pe field add karna ek saada backfill hai, uniqueness ka
 * badalna nahi (schema-change §1). Taxonomies pe wo test **pass** hota hai, isliye wahan
 * `locale` day 1 se hai.
 */

// ── hotels ───────────────────────────────────────────────────────────────────

export const hotelSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  /** Destination taxonomy ki id — service write pe check karti hai ki wo maujood hai. */
  destinationId: z.string().min(1),

  /**
   * Chaar fixed categories — code me constant, master list nahi (spec 007 §1.3).
   *
   * Pricing ke chaar tab isi pe bane hain (§4); category jodna poore pricing model ka
   * badalna hai, list me ek row jodna nahi.
   */
  category: z.enum(HOTEL_CATEGORIES),

  name: z.string().min(1).max(200),

  /**
   * `Deluxe, twin sharing` — public page ke hotel table ka Room column.
   *
   * **Hotel ke record pe hi rehta hai** — client ka faisla, 26 Aug (D-53 §3). Room hotel ki
   * apni property hai: "City Hotel ka Deluxe room". Package pe le jaane ka matlab hota ki
   * client har package pe har hotel ka room dobara likhe — teen destination × chaar
   * category = bara row, har package pe.
   */
  room: z.string().max(200).default(''),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createHotelSchema = hotelSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial({ siteId: true })

export const updateHotelSchema = createHotelSchema.partial()

// ── add-ons ──────────────────────────────────────────────────────────────────

export const addOnSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  name: z.string().min(1).max(200),

  /**
   * **Free text hai, number nahi** — spec 007 §1.4.
   *
   * Page pe `₹3,500 – ₹4,500 pp` (range) aur `₹2,500 per couple` (alag basis) dono hain.
   * Number field me ye likhe hi nahi ja sakte, aur `amount` + `unit` + `basis` me todne
   * ka matlab hai client se har add-on pe teen sawaal poochna.
   */
  price: z.string().max(120).default(''),

  /**
   * Jagah — `Elephant Beach or Nemo Reef, Havelock`.
   *
   * ⚠️ Isme **din ka zikr nahi** hota. Page pe abhi `— Day 3` likha hai, par wo us package
   * ka hai; global list me wo nahi ja sakta (§1.4).
   */
  where: z.string().max(300).default(''),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createAddOnSchema = addOnSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial({ siteId: true })

export const updateAddOnSchema = createAddOnSchema.partial()

// ── transfers ────────────────────────────────────────────────────────────────

export const transferSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  /** `Private AC Sedan`, `Ferry`, `Tempo Traveller` — pehle ye hardcoded dropdown tha. */
  name: z.string().min(1).max(200),

  /**
   * Din ki chip ka icon — `🚗 Private cab`, `⛴ Ferry` (spec 007 §1.6).
   *
   * Free string hai, enum nahi: icon ka set theme ka faisla hai, core ka nahi — wahi tark
   * jo menu ki theme locations pe hai (D-17). Client `Catamaran` jode to use apna icon
   * chunne ka raasta milna chahiye, code change ke bina.
   *
   * ⚠️ Duration (`90 min`) yahan **nahi** hai — wo har din alag hoti hai, isliye wo
   * itinerary ke din ka field hai (D-51 §2). Reference me ek hi `Ferry` teen alag duration
   * pe chalti hai; record pe rakhne ka matlab hota har route ke liye alag "Ferry" banana.
   */
  icon: z.string().max(60).default(''),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createTransferSchema = transferSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial({ siteId: true })

export const updateTransferSchema = createTransferSchema.partial()

// ── shared list query ────────────────────────────────────────────────────────

/**
 * Teenon liston ki query ek hi hai — R14, pagination day 1 se.
 *
 * "Abhi to kam hain" har list pe kaha jaata hai aur baad me kisi ek pe galat nikalta hai.
 * Hotels wahi list hai jo sabse pehle badi hogi: har destination pe chaar category.
 */
export const masterListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  /** Sirf hotels pe matlab rakhta hai — baaki lists isse ignore karti hain. */
  destinationId: z.string().optional(),
  category: z.enum(HOTEL_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
