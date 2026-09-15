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

  /**
   * `Sea-facing on Havelock` — hotel ki ek chhoti line, **optional** (client, 27 Aug — D-57).
   *
   * Do jagah dikhti hai: public page ki hotels table ka Note column, aur catbar ke card ki
   * beech wali line (jahan us category ke **pehle** hotel ka note aata hai).
   *
   * ⚠️ Pehle ye `categoryPricing[].note` thi, yaani har package apna likhta (D-53 §2).
   * Client ne use hotel ke record pe bheja: hotel ki khaasiyat hotel ki apni baat hai, aur
   * ek baar likhne se har package me wahi chalti hai — wahi tark jo `room` pe laga tha
   * (D-53 §3).
   */
  note: z.string().max(200).default(''),

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

// ── reviews ──────────────────────────────────────────────────────────────────

/**
 * Traveller reviews — **universal**, per-package nahi (client, 1 Sep).
 *
 * Ye baaki teen lists jaisi hi hai — flat CRUD, koi URL nahi, koi publish nahi — par ek
 * baat me alag hai: package inme se kuch **chunta nahi**. Hotels aur Add-ons har package
 * apne chunta hai; reviews har package ke neeche wahi ki wahi chhapti hain.
 *
 * Isliye `entries` pe koi `reviews[]` field nahi bani. Spec 007 §7 me wo per-package
 * socha gaya tha; client ne 1 Sep ko ulta chuna — "universal hogi, koi chunaw nahi". Wahi
 * faisla `goodToKnow[]` pe bhi hua tha (D-68).
 *
 * ⚠️ Rating (`4.9 average from 412 trips`) yahan **nahi** hai — wo in reviews se **gini
 * nahi jaati** (spec 007 §9 #8 ka jawab, client 1 Sep: haath se). Wo ek global jodi hai aur
 * `packageDefaults.rating` me baithti hai. Ginne se wo page pe teen review ka average
 * dikhata — 412 trips ka nahi.
 */
export const reviewSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  /**
   * Taare — **1 se 5, aadhe ke saath** (`1.5` · `2.5` · `3.5` · `4.5`) — client, 11 Sep (D-93).
   *
   * 1 Sep se 11 Sep tak yahan sirf poore taare the, kyunki design (`itinerary-v3.html`) me
   * sirf bhare/khaali glyph hain. Client ne aadhe maange; card pe aadha taara `starParts()` se
   * banta hai (khaali `☆` ke upar aadha bhara `★`), text jagah pe `starString()` number ke saath.
   *
   * `multipleOf(0.5)` — `4.3` jaisi value dropdown se aa hi nahi sakti, par API se aaye to
   * ruk jaaye. Warna card pe kaunsa taara aadha dikhe, ye andaza ban jaata.
   *
   * ⚠️ Ye **card ka** rating hai. Page ke upar wala `4.9` isse alag hai aur wo dashmalav me
   * hai — wo `packageDefaults.rating.value` hai.
   */
  rating: z.coerce.number().min(1).max(5).multipleOf(0.5),

  /**
   * Kab gaye the — `2026-03`. Din nahi, sirf **mahina aur saal** (client, 1 Sep).
   *
   * Admin me `<input type="month">` hai, aur wo isi shape me value deta hai. Date object
   * jaan-boojh kar nahi: din us picker me hai hi nahi, aur `Date` banate hi timezone ka
   * sawaal aa jaata — 1 taareekh ki raat ko wo pichhla mahina ban sakti hai.
   *
   * Page pe ye `March 2026` ban kar chhapta hai (theme me format hota hai, stored nahi).
   */
  month: z
    .string()
    .regex(/^($|\d{4}-(0[1-9]|1[0-2])$)/, 'Month must look like 2026-03')
    .default(''),

  /** Card ka do-teen line ka text — design me isi lambai pe card ki height baithti hai. */
  text: z.string().min(1).max(2000),

  /** `Guest name` — card ke neeche mota naam. */
  name: z.string().min(1).max(200),

  /**
   * Naam ke neeche ki chhoti line — design me `Travelled 5N / 6D · verified booking`.
   *
   * **Free text hai**, derive nahi hoti. Ye review kis package pe thi wo yahan store nahi
   * hai (reviews universal hain), to `5N / 6D` kahin se nikaala nahi ja sakta — aur client
   * usme `verified booking` jaisi baat bhi likhta hai jo kisi field se aa hi nahi sakti.
   */
  lastLine: z.string().max(300).default(''),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createReviewSchema = reviewSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial({ siteId: true })

export const updateReviewSchema = createReviewSchema.partial()

// ── video reviews ────────────────────────────────────────────────────────────

/**
 * Video review — `home-nav-v3.html` ka `11. VIDEO CUSTOMER REVIEWS` (client, 15 Sep, D-96 §13).
 *
 * ## ⚠️ Alag collection, `reviews` me `kind` nahi
 *
 * Text reviews package page pe **saare** jaate hain (`getPublicPackageDefaults()` — koi filter nahi,
 * D-70). Ek hi collection me `kind: 'video'` rakhne ka matlab hota ki us query ko (aur har aane wali
 * query ko) filter yaad rakhna pade — ek jagah bhoolte hi video wale khaali text card package page pe
 * chhap jaate. Alag collection me wo galti ban hi nahi sakti. Admin me dono **ek hi screen** ke do tab.
 *
 * Permission wahi `review.*` — client ke liye ye ek hi cheez hai ("Reviews"), aur nayi permission ka
 * matlab hota roles ki migration.
 *
 * | Field | Card pe |
 * | --- | --- |
 * | `imageId` | 9:14 thumbnail (`.vr img`) |
 * | `videoUrl` | tile pe click → popup me video (YouTube/Vimeo), baaki link naye tab me |
 * | `name` | `Sneha & family` — UI me **Title**. Naam `name` isliye ki list ka search aur delete ka confirm isi pe chalte hain |
 * | `packageName` | `6N Blissful Andaman` — **haath se** (client), package se juda nahi |
 */
export const videoReviewSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  imageId: z.string().trim().max(60).nullable().default(null),

  /** Sirf `https` — `javascript:` jaisa link card ke `<a href>` me pahunch hi na sake. */
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .url('Paste the full video link, e.g. https://youtu.be/…')
    .refine((v) => v.startsWith('https://'), 'The video link must start with https://'),

  name: z.string().trim().min(1, 'Give the review a title').max(120),
  packageName: z.string().trim().max(120).default(''),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createVideoReviewSchema = videoReviewSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial({ siteId: true })

export const updateVideoReviewSchema = createVideoReviewSchema.partial()

/**
 * Video link → popup me chalne laayak embed URL — **ya `null`** (D-96 §13).
 *
 * YouTube (`watch?v=` · `youtu.be/` · `shorts/` · `embed/`) aur Vimeo (`vimeo.com/123`). Baaki kuch bhi
 * (Instagram reel, Facebook, Drive) iframe me chalta hi nahi ya embed code maangta hai — un pe `null`,
 * aur theme link **naye tab** me kholti hai. Galat andaza lagane se behtar hai khaali popup na dikhe.
 *
 * `youtube-nocookie.com` — visitor ke browser me YouTube ki tracking cookie tab tak nahi jab tak wo play
 * na kare. Shared me isliye ki server payload banata hai aur test ise seedha pakad sake.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function videoEmbedUrl(url) {
  let parsed
  try {
    parsed = new URL(String(url ?? ''))
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null

  const host = parsed.hostname.replace(/^www\.|^m\./, '')
  const ID = /^[\w-]{6,20}$/

  let youtubeId = null
  if (host === 'youtu.be') youtubeId = parsed.pathname.slice(1).split('/')[0]
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [first, second] = parsed.pathname.split('/').filter(Boolean)
    youtubeId =
      first === 'watch'
        ? parsed.searchParams.get('v')
        : ['shorts', 'embed', 'live'].includes(first)
          ? second
          : null
  }
  if (youtubeId && ID.test(youtubeId)) {
    return `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeoId = parsed.pathname
      .split('/')
      .filter(Boolean)
      .find((part) => /^\d{5,12}$/.test(part))
    if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
  }

  return null
}

/**
 * `★★★★☆` — review card ka rating.
 *
 * **Admin aur theme dono yahi bulate hain.** Do jagah likhne ka matlab hota ki ek din admin
 * ki list kuch dikhati aur page pe kuch aur chhapta — wahi sabak jo `PACKAGE_SECTIONS` ke
 * fallback pe likha hai (D-65).
 *
 * Text me aadha taara nahi ban sakta (uska glyph har font me nahi hota), isliye yahan wo
 * **khaali** gina jaata hai — `4.5` → `★★★★☆`. Jahan ye text dikhta hai wahan number saath
 * likho (admin ki list aur dropdown). Card pe aadha taara `starParts()` se banta hai.
 *
 * ⚠️ Pehle yahan `Math.round` tha — `4.5` **paanch** bhare taare ban jaata, yaani review
 * asli se behtar dikhta.
 */
export function starString(rating) {
  const { full } = starParts(rating)

  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

/**
 * `4.5` → `{ full: 4, half: true, empty: 0 }` — card ke taare (client, 11 Sep, D-93).
 *
 * Theme isse teen hisse banati hai: bhare, ek aadha, aur khaali. Hisaab yahan hai taaki admin
 * aur theme ek hi niyam padhein (D-65 wala tark).
 */
export function starParts(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0))
  const full = Math.floor(value)
  const half = value - full >= 0.5

  return { full, half, empty: 5 - full - (half ? 1 : 0) }
}

/**
 * `2026-03` → `March 2026`.
 *
 * Stored value `YYYY-MM` hai (dekho `reviewSchema.month`); format **yahan** hota hai, DB me
 * nahi — wahi tark jo `formatPrice()` pe hai.
 *
 * `Date` jaan-boojh kar `Date.UTC` se banti hai. Local time se banane pe timezone shift
 * mahina badal deta hai: `new Date('2026-03-01')` UTC padha jaata hai aur IST se peeche
 * wale timezone me wo `February` chhap jaata — ek bug jo sirf kuch users ko dikhta.
 *
 * Khaali ya galat value pe `''` — theme use render hi nahi karta (D-30).
 */
export function formatReviewMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month ?? ''))) return ''

  const [year, m] = String(month).split('-').map(Number)

  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

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
