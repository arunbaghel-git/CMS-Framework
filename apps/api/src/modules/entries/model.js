import mongoose from 'mongoose'

import {
  AVAILABILITIES,
  AVAILABILITY,
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  ENTRY_STATUS,
  ENTRY_STATUSES,
  emptyTaxonomyRefs,
} from '@cms/shared'

/**
 * `entries` aur `revisions` — D-46, spec 007 Slice 1.
 *
 * "Sab kuch content hai" (D-04): Package, Page aur Post teenon isi collection me hain,
 * `type` field se alag. UI me `entries` shabd kabhi nahi dikhta (R11).
 *
 * Shape ka source of truth `packages/shared` ka `entrySchema` hai (R8). Yahan sirf
 * storage ka shape hai — **koi business logic nahi, koi hook nahi** (R1). Ye rule yahan
 * sabse zyada maayne rakhta hai: is module ka lagbhag har write `findOneAndUpdate` se
 * hota hai, aur wo `save` hooks chalata hi nahi. Ek hook me rakhi hui line yahan
 * chup-chaap kabhi na chalne wali line hai.
 *
 * Indexes yahan **nahi** hain — `entries` ke migration 001 me, `revisions` ke 009 me.
 */

const entrySchema = new mongoose.Schema(
  {
    /** Day 1 se reserve (D-01, §3.1). */
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },
    /** Day 1 se reserve — uniqueness `{siteId, locale, path}` hai (§3.1). */
    locale: { type: String, required: true, default: DEFAULT_LOCALE },

    /** `contentTypes.key` — `package` | `page` | `post` | client ka apna (D-46). */
    type: { type: String, required: true },

    title: { type: String, required: true },
    slug: { type: String, required: true },

    /**
     * Routing ka **single source of truth** (D-09, R10).
     *
     * Ye computed hai — `resolvePath()` ise likhta hai, koi aur nahi. `{siteId, locale,
     * path}` unique hai, isliye do entries kabhi ek hi URL claim nahi kar sakti.
     */
    path: { type: String, required: true },

    status: { type: String, enum: ENTRY_STATUSES, default: ENTRY_STATUS.DRAFT },

    /**
     * Bikri khuli hai ya band — `status` se **alag** (D-50).
     *
     * Sold-out package ka page live rehta hai: URL zinda, SEO zinda, sirf ek badge lagta
     * hai. `status` me jodne ka matlab hota ki season khatam hote hi page hi gayab, aur
     * agle season me ranking dobara banani padti.
     *
     * Jin types ke `supports` me `availability` nahi hai, unpe ye hamesha `open` rehta
     * hai — service wahan uska write hi nahi hone deti.
     */
    availability: { type: String, enum: AVAILABILITIES, default: AVAILABILITY.OPEN },

    /**
     * `scheduled` ke saath zaroori. Cron ka atomic claim isi pe chalta hai (R2) —
     * `setTimeout` kabhi nahi, wo process restart pe gayab ho jaata hai.
     */
    publishAt: { type: Date, default: null },

    authorId: { type: String, default: null },
    templateId: { type: String, default: null },

    /** Hierarchical types me path isi chain se banta hai. */
    parentId: { type: String, default: null },
    featuredImageId: { type: String, default: null },

    /**
     * Page builder ka tree — `{ version, blocks[] }` (spec 002).
     *
     * **Rich text bhi yahin rehta hai**, ek `richText` block ke andar. Aaj shortcut
     * lene (plain HTML string store karne) ka matlab Phase 5 me migration hai — ye
     * `05-BUILD-PLAN.md` ka documented trap hai.
     *
     * `Mixed` isliye ki ye recursive tree hai; use Mongoose me dobara likhna matlab
     * schema do jagah rakhna. Write pe poora Zod se guzarta hai (R8), aur ye kabhi
     * kisi query me nahi jaata — to R9 wala injection khatra yahan nahi hai.
     */
    content: { type: mongoose.Schema.Types.Mixed, default: () => ({ version: 1, blocks: [] }) },

    /**
     * contentType ke custom fields — package ka saara maal yahan (D-46).
     *
     * ⚠️ Ye **Mixed** hai, aur yahi wajah hai ki R9 is codebase me itna sakht hai:
     * `Entry.find({ ...req.query })` likhne pe `?fields[$ne]=null` jaisa param seedha
     * query me pahunch jaata hai. Har list param Zod se hi guzarta hai.
     */
    fields: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    seo: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /**
     * Entry kaunsi taxonomies me hai — **type ke hisaab se ek key** (A-7, D-49):
     * `{ categories, tags, destinations, packageTypes }`, har ek ids ka array.
     *
     * `Mixed` isliye ki keys `TAXONOMY_REF_KEY` se aati hain, aur nayi taxonomy type
     * jodne pe yahan kuch nahi badalna chahiye. Write pe poora Zod se guzarta hai (R8),
     * aur har id service me verify hoti hai ki wo maujood bhi hai aur sahi type ki bhi.
     *
     * ⚠️ Ye query me **jaata hai** (`taxonomies.destinations` pe filter), par sirf
     * validated ids ke saath — `req.query` yahan kabhi spread nahi hoti (R9).
     */
    taxonomies: { type: mongoose.Schema.Types.Mixed, default: emptyTaxonomyRefs },

    excerpt: { type: String, default: '' },
    order: { type: Number, default: 0 },

    /**
     * Flattened text — title + excerpt + blocks ka text.
     *
     * Denormalized isliye hai ki MongoDB ek collection pe sirf **EK** text index deta
     * hai. `{title, seo.description}` pe index banane ka matlab hota ki page ke body me
     * search kuch dhoondhti hi nahi — aur wo failure bilkul chup rehti.
     */
    searchText: { type: String, default: '' },

    /**
     * Optimistic concurrency. Client apna padha hua version wapas bhejta hai; mismatch
     * pe `409`.
     *
     * Iske bina 30s autosave + do editor = kisi ka poora kaam chup-chaap mit jaana.
     */
    version: { type: Number, required: true, default: 0 },

    /**
     * Trash — `status: 'trash'` **nahi** (D-25).
     *
     * `status` chhua nahi jaata, isliye restore pe entry apni purani state me wapas
     * aati hai: published thi to published hi. Har list query me `deletedAt: null`
     * filter service ka default hai, controller ka nahi.
     */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'entries', minimize: false },
)

/**
 * `revisions` — har save aur har publish pe snapshot (R7).
 *
 * Ye `entries` ke saath usi module me hai, alag module nahi — bilkul wahi wajah jo
 * `menuLocations` ke `menus` ke saath hone ki hai: **entry ke bina revision ka koi
 * matlab hi nahi**. Uski apni koi screen, apna koi lifecycle aur apni koi permission
 * nahi hai (`entry.revision.read` bhi `entry.*` ke hi neeche hai).
 *
 * `siteId` yahan nahi hai (02-ARCHITECTURE §3) — revision apne parent entry se scope
 * hoti hai. Wahi rule `refreshTokens` aur `submissions` pe bhi lagta hai.
 */
const revisionSchema = new mongoose.Schema(
  {
    entryId: { type: String, required: true },

    /**
     * Poore entry ka snapshot, `_id` ke bina.
     *
     * Diff nahi, **poora snapshot** — diff store karne ka matlab hai ki purani revision
     * restore karne ke liye saari beech waali revisions replay karni padein, aur beech
     * me se ek retention cap se hat jaaye to poori chain toot jaati hai.
     */
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },

    createdBy: { type: String, default: null },
    label: { type: String, default: '' },

    /** `save` ya `publish` — R7 dono maangta hai, kyunki dono alag sawaal ka jawab hain. */
    kind: { type: String, enum: ['save', 'publish'], default: 'save' },
  },
  { timestamps: true, collection: 'revisions', minimize: false },
)

export const Entry = mongoose.model('Entry', entrySchema)
export const Revision = mongoose.model('Revision', revisionSchema)
