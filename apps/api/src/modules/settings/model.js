import mongoose from 'mongoose'
import { DEFAULT_SITE_ID } from '@cms/shared'

/**
 * `settings` — **ek instance me ek hi document** (D-01).
 *
 * Shape ka source of truth `packages/shared` ka `settingsSchema` hai (R8). Yahan sirf
 * storage ka shape hai: defaults, aur kuch bhi normalize karne ki zaroorat ho to wo —
 * **koi business logic nahi** (R1).
 *
 * Indexes yahan **nahi** hain, migration 005 me hain — `autoIndex` production me off
 * rehta hai aur index build deploy-time ka kaam hai.
 */
const settingsSchema = new mongoose.Schema(
  {
    /** Aaj hamesha `default` hai. Reserve day 1 se, taaki multi-site kabhi aaye to
     * bade data pe index rebuild na karna pade (D-01). */
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    siteName: { type: String, default: 'My Site' },
    tagline: { type: String, default: '' },
    adminEmail: { type: String, default: '' },
    logoMediaId: { type: String, default: null },
    faviconMediaId: { type: String, default: null },

    timezone: { type: String, default: 'Asia/Kolkata' },
    dateFormat: { type: String, default: 'd MMM yyyy' },
    currency: { type: String, default: 'INR' },

    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    address: { type: String, default: '' },
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },

    frontPageType: { type: String, default: 'page' },
    homepageEntryId: { type: String, default: null },
    postsPageEntryId: { type: String, default: null },
    postsPerPage: { type: Number, default: 10 },

    /** Staging pe safe default — spec 004 §3. Launch pe manually on hota hai. */
    searchEngineVisible: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'settings',
    /**
     * `minimize: false` — warna Mongoose khaali object (`social: {}`) **hata deta hai**,
     * aur read pe wo field `undefined` aati hai. Uske baad admin form `social.instagram`
     * pe crash karta hai. Default rakhne ka matlab hi tab khatam ho jaata hai.
     */
    minimize: false,
  },
)

export const Settings = mongoose.model('Settings', settingsSchema)
