import mongoose from 'mongoose'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '@cms/shared'

/**
 * `sidebars` — D-88.
 *
 * Shape ka source of truth `packages/shared` ka `sidebarSchema` hai (R8). Yahan sirf
 * storage ka shape hai — **koi business logic nahi** (R1).
 *
 * Indexes yahan **nahi** hain, migration 023 me hain — `autoIndex` production me off
 * rehta hai aur index build deploy-time ka kaam hai.
 *
 * ⚠️ **Collection ka naam yahan pin kiya gaya hai.** Mongoose khud `sidebars` hi banata,
 * par A-18 wala `importRuns` / `importruns` ka jodwa isi ek line ke na hone se bana tha:
 * service ek naam pe likhti thi, migration doosre pe index banati thi, aur asli data bina
 * index ke chalta raha. Naam ek jagah likha ho to wo do nahi ho sakta.
 */
const sidebarSchema = new mongoose.Schema(
  {
    /** Day 1 se reserve (D-01). */
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /**
     * Day 1 se reserve. Uniqueness kabhi lagi to wo `{siteId, locale, …}` pe hi lagegi —
     * multi-language aane ke baad unique index badalna live data pe sabse mehnga kaam hai
     * (02-ARCHITECTURE §3.1).
     */
    locale: { type: String, required: true, default: DEFAULT_LOCALE },

    /**
     * Client ise **khud padhta hai** — page ke "Which sidebar" dropdown me yahi naam aata
     * hai. Isliye yahan `menu.key` jaisa slug nahi hai, seedha naam hai.
     */
    name: { type: String, required: true },

    /**
     * Widgets ki ordered list — `{ id, type, props }`.
     *
     * `Mixed` isliye ki ye ek **discriminated union** hai (enquiryForm / talkToPlanner /
     * html), aur use Mongoose me dobara likhne ka matlab hota do jagah schema rakhna. Write
     * pe poora `sidebarWidgetSchema` (Zod) se guzarta hai (R8).
     *
     * **R9 wala NoSQL-injection ka khatra yahan nahi hai:** wo rule query *banane* ke baare
     * me hai. `widgets` kabhi kisi query me nahi jaata — sirf store aur render hota hai.
     */
    widgets: { type: mongoose.Schema.Types.Mixed, default: () => [] },

    /** Optimistic concurrency — do admin ek saath save karein to `409`. */
    version: { type: Number, required: true, default: 0 },

    /** Soft delete (R12). */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'sidebars', minimize: false },
)

export const Sidebar = mongoose.model('Sidebar', sidebarSchema)
