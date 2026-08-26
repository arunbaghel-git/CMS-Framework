import mongoose from 'mongoose'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '@cms/shared'

/**
 * `redirects` — A-6, D-49.
 *
 * Collection Phase 4 (SEO) ki hai, par uska **auto wala hissa** Slice 3 me aa gaya: slug
 * badalne pe purana URL zinda rehna chahiye. Manager UI Phase 4 me hi rahegi.
 *
 * Shape ka source of truth `packages/shared` ka `redirectSchema` hai (R8). Indexes
 * migration 011 me hain, model me nahi — `unique: true` yahan likhne ka nateeja D-48 ke
 * aakhir me likha hua hai.
 */

const redirectSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /** Uniqueness ka hissa — `{siteId, locale, from}` (migration 011, D-48 §3 ka test). */
    locale: { type: String, required: true, default: DEFAULT_LOCALE },

    from: { type: String, required: true },
    to: { type: String, required: true },

    statusCode: { type: Number, enum: [301, 302], default: 301 },

    hits: { type: Number, default: 0 },

    /** `true` = system ne banaya, `false` = admin ne haath se (Phase 4). */
    isAuto: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'redirects', minimize: false },
)

export const Redirect = mongoose.model('Redirect', redirectSchema)
