import mongoose from 'mongoose'

import { DEFAULT_SITE_ID, HOTEL_CATEGORIES } from '@cms/shared'

/**
 * `hotels`, `addOns` aur `transfers` — spec 007 §1.3, §1.4, §1.6.
 *
 * **Teenon ek hi module me hain, teen alag module nahi.** Wajah wahi hai jo `menus` +
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

export const Hotel = mongoose.model('Hotel', hotelSchema)
export const AddOn = mongoose.model('AddOn', addOnSchema)
export const Transfer = mongoose.model('Transfer', transferSchema)
