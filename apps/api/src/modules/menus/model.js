import mongoose from 'mongoose'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '@cms/shared'

/**
 * `menus` aur `menuLocations` — D-43, spec 006.
 *
 * Shape ka source of truth `packages/shared` ka `menuSchema` hai (R8). Yahan sirf storage
 * ka shape hai — **koi business logic nahi** (R1).
 *
 * Indexes yahan **nahi** hain, migration 007 me hain — `autoIndex` production me off
 * rehta hai aur index build deploy-time ka kaam hai.
 */

const menuSchema = new mongoose.Schema(
  {
    /** Day 1 se reserve (D-01). */
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },
    /**
     * Day 1 se reserve. Uniqueness `{siteId, locale, key}` hai — multi-language kabhi aaya
     * to unique index badalna live data pe sabse mehnga kaam hota (02-ARCHITECTURE §3.1).
     */
    locale: { type: String, required: true, default: DEFAULT_LOCALE },

    key: { type: String, required: true },
    name: { type: String, required: true },

    /**
     * Menu ka poora tree — `menuItemSchema` (packages/shared) isko write pe validate
     * karta hai (R8).
     *
     * `Mixed` isliye hai ki ye ek **discriminated recursive tree** hai (link / dropdown /
     * mega → columns → groups → links). Use Mongoose me dobara likhna matlab do jagah
     * schema rakhna — aur wo do jagah ek din alag ho jaati hain.
     *
     * **R9 wala NoSQL-injection wala khatra yahan nahi hai:** wo rule query *banane* ke
     * baare me hai (`find({ ...req.query })`). `items` kabhi kisi query me nahi jaata —
     * ye sirf store aur render hota hai, aur write pe poora Zod se guzarta hai.
     */
    items: { type: mongoose.Schema.Types.Mixed, default: () => [] },

    /** Optimistic concurrency — do admin ek saath save karein to `409` (spec 006 O-4). */
    version: { type: Number, required: true, default: 0 },

    /** Soft delete (R12). Trash/restore screen Slice 0 me nahi hai — spec 006 §9.3. */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'menus', minimize: false },
)

/**
 * `menuLocations` — assignment menu se **alag** hai (D-17).
 *
 * Fixed `main|footer` keys ka matlab hota ki client ko doosra footer column chahiye to
 * code change karna pade. Location ki list theme declare karta hai
 * (`THEME_MENU_LOCATIONS`), core yahan koi enum nahi rakhta.
 */
const menuLocationSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },
    locale: { type: String, required: true, default: DEFAULT_LOCALE },

    /** Free string — core isko enum nahi karta (D-17). */
    location: { type: String, required: true },

    /** `null` = "Not assigned". Ye ek valid state hai, missing row bhi valid hai. */
    menuId: { type: String, default: null },
  },
  { timestamps: true, collection: 'menuLocations', minimize: false },
)

export const Menu = mongoose.model('Menu', menuSchema)
export const MenuLocation = mongoose.model('MenuLocation', menuLocationSchema)
