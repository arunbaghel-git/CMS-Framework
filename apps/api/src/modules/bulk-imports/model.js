import {
  DEFAULT_SITE_ID,
  IMPORT_MODE,
  IMPORT_MODES,
  IMPORT_ROW_STATUS,
  IMPORT_RUN_STATUS,
  IMPORT_RUN_STATUSES,
} from '@cms/shared'
import mongoose from 'mongoose'

/**
 * `importRuns` — har Bulk Upload ka poora hisaab (D-81).
 *
 * Client ne sheet me wapas likhne se mana kar diya (_"mat likho wapas uspe, apne admin me hi
 * status show karte jao"_), isliye status ka ghar yahi hai. Ye sheet se behtar bhi nikla:
 * screen band karke wapas aao to bhi list bani rehti hai, aur har package ka URL clickable
 * hota hai.
 *
 * ## Rows subdocument hain, alag collection nahi
 *
 * Ek run me 20 row hoti hain, 200 se zyada kabhi nahi (`MAX_IMPORT_ROWS`). Wo hamesha apne run
 * ke saath hi padhi jaati hain aur kabhi akele query nahi hoti. Alag collection ka matlab hota
 * har screen pe ek join — bina kisi faayde ke.
 *
 * ⚠️ Subdoc hone se har row ko apni `_id` milti hai, aur wahi row ko wapas likhne ke liye
 * chahiye: claim ke waqt positional `$` se, aur uske baad `rows._id` se.
 *
 * Indexes migration 021 me hain — `model.js` me nahi, kyunki production `autoIndex: false` pe
 * chalti hai.
 */

/**
 * Ek issue — kya chhoota, doc me kya likha tha, aur kya karna hai.
 *
 * `Mixed` isliye ki shape ka source of truth `packages/shared` ka `issueSchema` hai (R8), aur
 * use do jagah likhne ka matlab hota ki ek din wo alag ho jaayein.
 */
const issue = { type: mongoose.Schema.Types.Mixed }

const rowSchema = new mongoose.Schema(
  {
    docUrl: { type: String, required: true },
    docId: { type: String, default: null },

    status: {
      type: String,
      required: true,
      enum: Object.values(IMPORT_ROW_STATUS),
      default: IMPORT_ROW_STATUS.PENDING,
    },

    /** Package naya bana ya pehle se tha — client ka "duplicate to nahi bana?" ka jawab. */
    action: { type: String, default: null },

    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entry', default: null },
    title: { type: String, default: '' },
    path: { type: String, default: '' },

    issues: { type: [issue], default: [] },
    error: { type: String, default: null },

    /**
     * ⚠️ Ye do sirf **atki hui row** wapas laane ke liye hain.
     *
     * Process beech me mar jaaye to row `processing` pe hamesha ke liye baithi reh jaati hai
     * aur run kabhi khatam nahi hota — admin me spinner chalta rehta hai. `claimedAt` purana ho
     * jaane pe use wapas `pending` kar diya jaata hai, aur `attempts` use hamesha ke liye
     * loop me ghoomne se rokta hai.
     */
    claimedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  { _id: true, timestamps: false },
)

const importRunSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    sheetUrl: { type: String, required: true },
    sheetId: { type: String, required: true },

    /**
     * Naye package banane aaye the ya purane update karne — client ka apna elaan (D-81).
     *
     * Ye filter nahi, **assertion** hai: jo row is baat se alag nikle wo Failed hoti hai.
     * Bina iske ek purana URL galti se nayi sheet me reh jaaye to wo ek live package ko
     * chup-chaap overwrite kar deta.
     */
    mode: { type: String, enum: IMPORT_MODES, default: IMPORT_MODE.NEW },

    status: {
      type: String,
      required: true,
      enum: IMPORT_RUN_STATUSES,
      default: IMPORT_RUN_STATUS.QUEUED,
    },

    /**
     * Kisne chalaya — **aur ye sirf hisaab ke liye nahi hai**.
     *
     * Worker ke paas koi request nahi hoti, par `createEntry()`/`publishEntry()` ko `actor`
     * chahiye aur `createMediaFromUpload()` ko `uploadedBy` (required ObjectId). Dono isi se
     * bante hain.
     */
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /** Sheet ke apne masle — jaise "Doc File column nahi mila". Row ke issues se alag. */
    warnings: { type: [String], default: [] },
    error: { type: String, default: null },

    rows: { type: [rowSchema], default: [] },

    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export const ImportRun = mongoose.models.ImportRun ?? mongoose.model('ImportRun', importRunSchema)
