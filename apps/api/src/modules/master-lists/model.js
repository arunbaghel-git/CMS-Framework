import mongoose from 'mongoose'

import { DEFAULT_SITE_ID, HOTEL_CATEGORIES } from '@cms/shared'

/**
 * `hotels`, `addOns`, `transfers` aur `reviews` — spec 007 §1.3, §1.4, §1.6 aur §7.
 *
 * **Chaaron ek hi module me hain, chaar alag module nahi.** Wajah wahi hai jo `menus` +
 * `menuLocations` ke ek saath hone ki thi, par ek kadam aage: teenon ka lifecycle bilkul
 * ek jaisa hai — flat CRUD, koi publish nahi, koi trash nahi, koi path nahi. Teen alag
 * module ka matlab hota list/pagination/scope wala **wahi code teen jagah**, aur is repo
 * ne do baar dekha hai ki do jagah rakhi hui ek cheez ek din alag ho jaati hai (D-43 §4,
 * D-44 §5). Service me ek registry hai, aur teenon usi pe chalti hain.
 *
 * Routes phir bhi teen alag hain (`/api/hotels`, `/api/add-ons`, `/api/transfers`) —
 * client ke liye ye teen alag screens hain, aur unki permissions bhi alag hain.
 *
 * Shape ka source of truth `packages/shared` ka `master-lists.js` hai (R8). Indexes
 * migration 010 me hain.
 */

const hotelSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /** Destination taxonomy ki id — service write pe check karti hai ki wo maujood hai. */
    destinationId: { type: String, required: true },

    /** Chaar fixed categories — code me constant, master list nahi (spec 007 §1.3). */
    category: { type: String, enum: HOTEL_CATEGORIES, required: true },

    name: { type: String, required: true },

    /** `Deluxe, twin sharing`. Hotel pe hai ya package pe — spec 007 §9 #3 abhi khula hai. */
    room: { type: String, default: '' },

    /** Hotel ki ek chhoti line — public table ka Note column, aur catbar ka card (D-57). */
    note: { type: String, default: '' },
  },
  { timestamps: true, collection: 'hotels', minimize: false },
)

const addOnSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    name: { type: String, required: true },

    /**
     * **String hai, Number nahi** — `₹3,500 – ₹4,500 pp` aur `₹2,500 per couple` dono
     * likhe jaate hain (spec 007 §1.4). Number field me ye likhe hi nahi ja sakte.
     */
    price: { type: String, default: '' },

    /** Jagah — isme din ka zikr nahi hota, wo package ka hai (§1.4). */
    where: { type: String, default: '' },
  },
  { timestamps: true, collection: 'addOns', minimize: false },
)

const transferSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    name: { type: String, required: true },

    /** Free string, enum nahi — icon ka set theme ka faisla hai, core ka nahi (D-17 jaisa). */
    icon: { type: String, default: '' },
  },
  { timestamps: true, collection: 'transfers', minimize: false },
)

/**
 * Traveller reviews — **universal** (client, 1 Sep).
 *
 * Baaki teen liston se ek baat me alag: package inme se kuch **chunta nahi**. Hotels aur
 * add-ons har package apne chunta hai; reviews har package ke neeche wahi ki wahi chhapti
 * hain. Isliye `entries` pe koi `reviews[]` field nahi bani — spec 007 §7 me wo
 * per-package socha gaya tha, client ne ulta chuna (wahi faisla jo `goodToKnow[]` pe hua,
 * D-68).
 *
 * ⚠️ Rating (`4.9` / `412 trips`) yahan **nahi** hai — wo in reviews se gini nahi jaati
 * (§9 #8 ka jawab: haath se) aur `packageDefaults.rating` me baithti hai.
 */
const reviewSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /** Poore taare — 1 se 5. Aadha nahi; design me sirf bhare/khaali taare hain. */
    rating: { type: Number, required: true },

    /**
     * `2026-03` — **string hai, Date nahi**.
     *
     * Admin me `<input type="month">` hai aur wo isi shape me value deta hai. `Date` banate
     * hi timezone ka sawaal aa jaata: 1 taareekh ki raat ko wo pichhla mahina ban sakti
     * hai, aur card pe galat mahina chhap jaata. Sort bhi is string pe theek chalti hai —
     * `YYYY-MM` ka lexical kram aur chronological kram ek hi hai.
     */
    month: { type: String, default: '' },

    text: { type: String, required: true },

    name: { type: String, required: true },

    /** `Travelled 5N / 6D · verified booking` — free text, derive nahi hoti. */
    lastLine: { type: String, default: '' },
  },
  { timestamps: true, collection: 'reviews', minimize: false },
)

/**
 * Video reviews — home ka `Customer reviews` (client, 15 Sep, D-96 §13).
 *
 * ⚠️ `reviews` se **alag collection** — poora tark `videoReviewSchema` (shared) ke upar. Index migration
 * 025 me. Model me koi field chhoot gaya to Mongoose `strict` use chup-chaap gira deta (D-86).
 */
const videoReviewSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },
    imageId: { type: String, default: null },
    videoUrl: { type: String, required: true },
    /** UI me "Title" — `name` isliye ki list ka search aur delete confirm isi field pe hain. */
    name: { type: String, required: true },
    packageName: { type: String, default: '' },
  },
  { timestamps: true, collection: 'videoReviews', minimize: false },
)

export const Hotel = mongoose.model('Hotel', hotelSchema)
export const AddOn = mongoose.model('AddOn', addOnSchema)
export const Transfer = mongoose.model('Transfer', transferSchema)
export const Review = mongoose.model('Review', reviewSchema)
export const VideoReview = mongoose.model('VideoReview', videoReviewSchema)
