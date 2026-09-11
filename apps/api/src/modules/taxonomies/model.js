import mongoose from 'mongoose'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID, TAXONOMY_TYPES } from '@cms/shared'

/**
 * `taxonomies` — spec 007 §1.1, §1.2.
 *
 * **Ek collection, `type` field se alag** — Categories, Tags, Destinations aur Package
 * Type chaaron yahin. Wahi soch jo `entries` pe hai (D-04, D-46).
 *
 * Shape ka source of truth `packages/shared` ka `taxonomySchema` hai (R8). Yahan sirf
 * storage ka shape hai — **koi business logic nahi, koi hook nahi** (R1).
 *
 * Indexes yahan **nahi** hain, migration 010 me hain.
 */

const taxonomySchema = new mongoose.Schema(
  {
    /** Day 1 se reserve (D-01). */
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /**
     * Day 1 se reserve — aur yahan ye **uniqueness ka hissa** hai:
     * `{siteId, locale, type, slug}` (migration 010). Menus pe ye pehle chhoot gaya tha
     * aur D-43 me theek karna pada.
     */
    locale: { type: String, required: true, default: DEFAULT_LOCALE },

    type: { type: String, enum: TAXONOMY_TYPES, required: true },

    name: { type: String, required: true },
    slug: { type: String, required: true },

    /** Sirf hierarchical types pe (`category`, `destination`). Flat pe hamesha `null`. */
    parentId: { type: String, default: null },

    description: { type: String, default: '' },

    /** Destination ka banner — media id, URL nahi (D-41). */
    bannerMediaId: { type: String, default: null },

    /** Category ke badge ka rang — `#rrggbb` ya khaali (D-93). Khaali = theme ka apna rang. */
    color: { type: String, default: '' },

    /**
     * "Uncategorized" jaisa — delete nahi hota.
     *
     * API se set nahi hota, sirf seed se: agar admin kisi bhi row ko default bana sake to
     * wo purani default ko delete-able bana deta hai, aur ek din koi default bachta hi
     * nahi — phir khaali entry ke paas girne ki koi jagah nahi hoti.
     */
    isDefault: { type: Boolean, default: false },

    order: { type: Number, default: 0 },

    seo: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'taxonomies', minimize: false },
)

export const Taxonomy = mongoose.model('Taxonomy', taxonomySchema)
