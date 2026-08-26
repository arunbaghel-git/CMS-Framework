import mongoose from 'mongoose'

import { DEFAULT_SITE_ID } from '@cms/shared'

/**
 * `contentTypes` — D-46, spec 007.
 *
 * Shape ka source of truth `packages/shared` ka `contentTypeSchema` hai (R8). Yahan sirf
 * storage ka shape hai — **koi business logic nahi** (R1).
 *
 * Indexes yahan **nahi** hain, migration 009 me hain — `autoIndex` production me off
 * rehta hai aur index build deploy-time ka kaam hai.
 */

const contentTypeSchema = new mongoose.Schema(
  {
    /** Day 1 se reserve (D-01). */
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /**
     * `locale` yahan jaan-boojh kar **nahi** hai.
     *
     * Content type site ka **structure** hai, uska content nahi — `package` har language
     * me `package` hi rehta hai. Translate `label` hoti hai, `key` nahi. Isliye
     * uniqueness `{siteId, key}` hai, `{siteId, locale, key}` nahi (migration 009).
     */
    key: { type: String, required: true },

    /** UI me hamesha yahi dikhta hai, `key` kabhi nahi (R11). */
    label: { type: String, required: true },
    labelPlural: { type: String, required: true },
    icon: { type: String, default: '' },

    /**
     * Custom fields — spec 005 ka DSL (`content` context).
     *
     * `Mixed` isliye ki har field type ke apne extra keys hote hain (`options` select pe,
     * `fields` repeater pe). Use Mongoose me dobara likhna matlab DSL do jagah rakhna.
     *
     * **R9 wala NoSQL-injection khatra yahan nahi hai** — `fields` kabhi kisi query me
     * nahi jaata; ye sirf store aur render hota hai, aur write pe poora Zod se guzarta
     * hai. (Wahi tark jo `menus.items` pe likha hai.)
     */
    fields: { type: mongoose.Schema.Types.Mixed, default: () => [] },

    hasBuilder: { type: Boolean, default: false },

    /** Path parent chain se banega ya `urlPattern` se — `resolvePath()` isse padhta hai (D-09). */
    hierarchical: { type: Boolean, default: false },

    urlPattern: { type: String, required: true },
    archiveBase: { type: String, default: null },
    hasArchive: { type: Boolean, default: false },

    supports: { type: [String], default: () => [] },

    /**
     * Ye type kaunsi taxonomies use karta hai — `['destination', 'packageType']`.
     *
     * Do kaam karta hai: admin ko batata hai kaunse picker dikhane hain, aur server ko
     * batata hai ki entry pe kaunsi taxonomy keys allowed hain. Bina iske ek Post pe
     * destinations set ki ja sakti thin — save ho jaatin, aur galti kisi archive pe
     * pakdi jaati (D-49).
     */
    taxonomyTypes: { type: [String], default: () => [] },

    /**
     * Built-in types **code-owned** hain (D-46, D-36 ka hi model). Seed inhe har deploy
     * pe sync karta hai, isliye ye flag API se kabhi set nahi hota — sirf seed se.
     */
    isBuiltIn: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'contentTypes', minimize: false },
)

export const ContentType = mongoose.model('ContentType', contentTypeSchema)
