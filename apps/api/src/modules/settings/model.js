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
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
      /** 25 Aug me juda — reference ke footer me hai. Default se aata hai, migration nahi. */
      x: { type: String, default: '' },
    },

    /**
     * Header ke buttons — D-27 ka "CTA button", ab ek list (max 4).
     *
     * `_id: false` — ye plain rows hain, unka apna identity nahi hai. Bina iske Mongoose
     * har row me ek `_id` ghusa deta aur wo public payload tak pahunch jaata.
     */
    headerButtons: {
      type: [
        new mongoose.Schema(
          {
            label: { type: String, default: '' },
            url: { type: String, default: '' },
            target: { type: String, default: '_self' },
            variant: { type: String, default: 'outline' },
            iconOnlyOnMobile: { type: Boolean, default: false },
            className: { type: String, default: '' },
            icon: { type: String, default: 'none' },
            enabled: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: () => [],
    },

    /**
     * Footer ke columns — D-44, spec 006 §7.3.
     *
     * `_id: false` **do** level pe hai: na column ka apna Mongo `_id` chahiye, na block
     * ka. Dono ke paas apni `id` hai jo admin banata hai (drag-drop ki React key), aur
     * Mongoose ka `_id` uske upar ek doosri identity ban kar public payload tak pahunch
     * jaata.
     */
    footerColumns: {
      type: [
        new mongoose.Schema(
          {
            id: { type: String, required: true },
            heading: { type: String, default: '' },
            type: { type: String, default: 'menu' },
            width: { type: String, default: 'normal' },
            menuId: { type: String, default: null },
            textBlocks: {
              type: [
                new mongoose.Schema(
                  {
                    id: { type: String, required: true },
                    icon: { type: String, default: 'none' },
                    label: { type: String, default: '' },
                    text: { type: String, default: '' },
                  },
                  { _id: false },
                ),
              ],
              default: () => [],
            },
          },
          { _id: false },
        ),
      ],
      default: () => [],
    },

    /** Footer aur mobile drawer ka logo — khaali ho to theme `logoMediaId` pe girti hai (D-44). */
    footerLogoMediaId: { type: String, default: null },

    /** Appearance ▸ Footer — spec 006 §7.2. `{year}` theme replace karta hai. */
    footerCopyright: { type: String, default: '' },

    /** Bottom bar ke beech ki line (membership / registration text) — D-44. */
    footerNote: { type: String, default: '' },

    /** Sabse neeche ki fine print (pricing / disclaimer) — D-44. */
    footerDisclaimer: { type: String, default: '' },

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
