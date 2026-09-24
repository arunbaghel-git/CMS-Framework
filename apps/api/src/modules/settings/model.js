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
            /**
             * `left` (nav ke pehle) ya `right` (aakhir) — D-94. ⚠️ Ye nested schema **strict** hai:
             * yahan na hota to Zod pass karta aur Mongoose field chup-chaap gira deta.
             */
            position: { type: String, default: 'right' },
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
    /**
     * Page ka aakhri CTA card — D-67.
     *
     * `Mixed` wahi tark se jo `packageDefaults.bookingSteps` pe hai: andar ek nested object
     * hai, write pe poora Zod se guzarta hai (R8), aur ye kabhi kisi query me nahi jaata —
     * isliye R9 wala injection khatra yahan nahi hai.
     *
     * Nested `Schema` na lene ki ek aur wajah: uske andar `buttons[]` aur `bullets[]` dono
     * hain, aur Mongoose har row me apna `_id` ghusa deta (wahi dikkat jo `headerButtons`
     * pe `_id: false` se roki gayi thi) — teen level pe wo teen jagah likhna padta.
     */
    ctaSection: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /** `Settings ▸ Tour settings` — trust badges + universal banner (D-87). */
    tourSettings: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /**
     * `Settings ▸ Blog settings` — author · TOC · post ki sidebar (spec 008).
     *
     * ⚠️ **Ye line hi wo jagah hai jahan chook chup-chaap hoti hai.** `updateSettings()` ka
     * `$set` generic loop hai, to Zod-validated field wahan pahunch to jaata hai — par
     * Mongoose `strict` un paths ko **bina kuch kahe gira deta hai** jo schema me nahi hain.
     * Nateeja: API `200`, admin `"Saved."`, aur DB me purani value. Wahi shakl jo
     * `updatePackageDefaults()` ke whitelist wale jaal ki hai (CLAUDE.md — chaar baar laga).
     */
    blogSettings: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /** `Pages ▸ Pages settings` — banner ka fallback + `On this page` (D-95 §12). Upar wali chetavni yahan bhi. */
    pageSettings: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /** `Settings ▸ SEO & Schema` — title template, default description/OG image, robots.txt (24 Sep). Upar wali chetavni yahan bhi. */
    seoSettings: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /** `Enquiries ▸ Popup` — poori site ka ek popup form (D-103). Upar wali chetavni yahan bhi. */
    popupSettings: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

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

    /** Mobile patti ka Get free quote link — khaali to wo button nahi aata (client, 16 Sep). */
    quoteUrl: { type: String, default: '' },

    /** Desktop ke do floating button kis taraf — `right` (reference) ya `left` (client, 21 Sep). */
    floatingContactSide: { type: String, default: 'right' },

    /** Staging pe safe default — spec 004 §3. Launch pe manually on hota hai. */
    searchEngineVisible: { type: Boolean, default: false },

    /** Site ki apni CSS — Settings ▸ Custom CSS (client, 16 Sep). Har page ke <head> me jaati hai. */
    customCss: { type: String, default: '' },

    /**
     * Settings ▸ Integrations — teesre tools ka code (D-106).
     *
     * ⚠️ **Yahan aane wali HTML sanitize NAHI hoti** — poora tark
     * `packages/shared/src/schemas/settings.js` me `integrations` ke upar likha hai. Chhota roop:
     * is field ka kaam hi `<script>` chalana hai, aur uski suraksha safai se nahi
     * `settings.scripts.update` permission se aati hai (sirf admin).
     */
    integrations: {
      header: { type: String, default: '' },
      body: { type: String, default: '' },
      footer: { type: String, default: '' },
    },

    /**
     * Settings ▸ Email / SMTP — site ka mail account (D-108).
     *
     * ⚠️ **Ye field `settingsSchema` (Zod) me jaan-boojh kar NAHI hai**, sirf yahan hai.
     * `toPublicSettings()` us schema se parse karta hai aur Zod anjaan keys strip kar deti
     * hai — yaani `mail` kisi bhi aam settings response me **ja hi nahi sakta**. Poora
     * tark `packages/shared/src/schemas/settings.js` me `mailSettingsSchema` ke upar hai.
     *
     * ⚠️ **`passwordEnc` — naam me `Enc` isliye hai ki wo padhne wale ko rok de.** Isme
     * plaintext kabhi nahi jaata; `core/secrets.js` ka `encryptSecret()` `v1:…` blob banata
     * hai. Koi seedha `mail.password` likhne ki koshish kare to wo field yahan hai hi nahi,
     * aur Mongoose use chup-chaap gira dega — wahi structural rok, ek aur jagah.
     */
    mail: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      user: { type: String, default: '' },
      passwordEnc: { type: String, default: '' },
      fromName: { type: String, default: '' },
      fromEmail: { type: String, default: '' },
    },

    /**
     * Site ke rang — Settings ▸ Colours (client, 17 Sep). Shape `themeColorsSchema` (R8).
     * Khaali `{}` = theme ke apne rang — is site pe koi CSS variable nahi jaata.
     */
    themeColors: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /** Settings ▸ Layout (client, 17 Sep). Shape `themeLayoutSchema`. Khaali = aaj ki site. */
    themeLayout: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /** Settings ▸ Fonts (client, 17 Sep). Shape `themeFontsSchema`; `faces` server bharta hai. */
    themeFonts: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
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
