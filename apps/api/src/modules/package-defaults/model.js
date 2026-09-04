import mongoose from 'mongoose'

import { DEFAULT_SITE_ID } from '@cms/shared'

/**
 * `packageDefaults` — Packages ke apne globals (spec 007 §1.8, D-46).
 *
 * **Singleton** — wahi pattern jo `settings` ka hai (D-40): `{siteId}` pe unique index
 * (migration 010), koi `:id` route nahi.
 *
 * **`settings` me kyun nahi:** `settings` **site** ki settings hai — naam, logo, timezone,
 * footer. Usme package ka maal daalne ka matlab hai ki kal Pages aur Posts ka maal bhi
 * wahin jaayega, aur ek din `settings` ek kachra-peti ban jaayegi.
 *
 * Shape ka source of truth `packages/shared` ka `packageDefaultsSchema` hai (R8).
 */

const packageDefaultsSchema = new mongoose.Schema(
  {
    /**
     * `unique` yahan **nahi** hai — wo migration 010 me hai.
     *
     * Model me `unique: true` likhne ka matlab hai Mongoose ka autoIndex use apne naam se
     * (`siteId_1`) bana dega, aur phir migration apne naam wali same index nahi bana paati:
     * "Index already exists with a different name". Production me autoIndex off hota hai,
     * to ye failure sirf dev me dikhti hai — aur deploy pe index chup-chaap banti hi nahi.
     */
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /**
     * "What's included" ka do-column block — **poori tarah global** (spec 007 §1.5).
     *
     * Package editor me iska koi panel nahi hai; admin design ka "Inclusions & Exclusions"
     * panel isiliye hata diya gaya. `Inclusion/Exclusion` isi block ka doosra naam hai
     * (spec 007 §9 #2 abhi khula hai — ek hi maana ja raha hai).
     */
    whatsIncluded: {
      included: { type: [String], default: () => [] },
      excluded: { type: [String], default: () => [] },
    },

    /**
     * Itinerary Images ka global pool — media ids (spec 007 §1.7).
     *
     * URL nahi, **ids** (D-41): media ka URL badal sakta hai (variants, S3 pe move), aur
     * stored URL us din chup-chaap 404 ban jaata.
     */
    itineraryImages: { type: [String], default: () => [] },

    /**
     * "How booking works" ke steps.
     *
     * `Mixed` isliye ki har step ek object hai (`id`, `title`, `text`) aur wo write pe
     * poora Zod se guzarta hai (R8). Ye kabhi kisi query me nahi jaata, to R9 wala
     * injection khatra yahan nahi hai — wahi tark jo `menus.items` pe likha hai.
     */
    bookingSteps: { type: mongoose.Schema.Types.Mixed, default: () => [] },

    cancellationText: { type: String, default: '' },

    /**
     * `4.9 average from 412 trips` — site ki ek hi jodi (client, 1 Sep).
     *
     * Reviews se **derive nahi hoti** (spec 007 §9 #8 ka jawab). `0` ka matlab hai "rating
     * dikhani hi nahi" — hero aur reviews section, dono se line gayab ho jaati hai.
     */
    rating: {
      value: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    /**
     * Page ke section headings + unke neeche ki lines — Q-9 (client, 31 Aug).
     *
     * `Mixed` wahi tark se jo `bookingSteps` pe hai: har value ek object hai
     * (`{heading, description}`), write pe poora Zod se guzarta hai (R8), aur ye kabhi
     * kisi query me nahi jaata — isliye R9 wala injection khatra yahan nahi hai.
     *
     * Khaali `{}` ka matlab "theme ke apne headings" (`PACKAGE_SECTION_DEFAULTS`), isliye
     * purane documents ko koi migration nahi chahiye — unpe aaj bhi wahi chhapega jo kal
     * chhapta tha.
     */
    sectionLabels: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /** Structured data on/off — ab site-level (D-82). Default on. */
    seoSchema: { type: Boolean, default: true },

    /**
     * Similar itineraries ke do number. Shape ka source `packages/shared` hai (R8);
     * yahan sirf default, taaki purane document padhte waqt undefined na aaye.
     */
    similar: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ total: 12, perPage: 3 }),
    },
  },
  { timestamps: true, collection: 'packageDefaults', minimize: false },
)

export const PackageDefaults = mongoose.model('PackageDefaults', packageDefaultsSchema)
