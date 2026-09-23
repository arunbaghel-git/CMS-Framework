import mongoose from 'mongoose'

import { DEFAULT_SITE_ID, ENQUIRY_STATUSES } from '@cms/shared'

/**
 * `forms` + `enquiries` — client, 1 Sep (`admin-design-v2.html`).
 *
 * **Do collections, ek module** — wahi tark jo `menus` + `menuLocations` pe hai: enquiry
 * bina form ke bemaani hai, aur dono ka lifecycle ek doosre se bandha hua hai. Alag module
 * banane ka matlab hota ki form delete karte waqt uski enquiries ka sawaal do jagah baith
 * jaata.
 *
 * Shape ka source of truth `packages/shared` ka `form.js` hai (R8). Indexes migration 017
 * me hain.
 */

const formSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    name: { type: String, required: true },

    /** Nayi enquiry ki mail inhi pate(on) pe (D-109). Khaali = mail nahi jaati. */
    emailTo: { type: String, default: '' },

    /**
     * Us mail ka template (D-109). ⚠️ Model me na ho to Mongoose `strict` ise **chup-chaap** gira
     * deta — wahi jaal jo `submitLabel` pe likha hai. Default yahan jaan-boojh kar `''` hai: 23 Sep
     * se pehle ke forms me ye field hai hi nahi, aur khaali ka matlab "default template" hai
     * (`renderEnquiryMail()`), to dono haalat ek hi tarah chalti hain.
     */
    notifyEmail: {
      subject: { type: String, default: '' },
      body: { type: String, default: '' },
    },

    afterSubmit: {
      mode: { type: String, default: 'message' },
      value: { type: String, default: '' },
    },

    /** Button ke neeche ki chhoti line — thank-you se alag: ye submit se **pehle** dikhti hai. */
    footnote: { type: String, default: '' },

    /**
     * Submit button ka text (D-96). ⚠️ Model me na ho to Mongoose `strict` ise **chup-chaap**
     * gira deta — Zod pass, API 200, admin "Saved.", DB me kuch nahi (D-86 wala jaal).
     */
    submitLabel: { type: String, default: '' },

    placement: { type: String, default: 'none' },

    status: { type: String, default: 'draft' },

    /**
     * `Mixed` — har field ek object hai (`key`, `label`, `type`, `show`, `required`,
     * `options`), aur wo write pe poora Zod se guzarta hai (R8).
     *
     * Ye kabhi kisi query me nahi jaata, isliye R9 wala injection khatra yahan nahi hai —
     * wahi tark jo `menus.items` aur `packageDefaults.bookingSteps` pe likha hai.
     */
    fields: { type: mongoose.Schema.Types.Mixed, default: () => [] },
  },
  { timestamps: true, collection: 'forms', minimize: false },
)

/**
 * Ek bhari hui enquiry.
 *
 * ⚠️ **Ise dekhne ki screen abhi nahi hai** — client ne 1 Sep ko sirf Enquiry Forms aur Add
 * New Form maange the. Phir bhi ye collection aaj hi ban rahi hai: ek form jo bhara jaata
 * hai par kahin store nahi hota, wo client ki asli enquiries chup-chaap kho deta hai, aur
 * wo nuksaan wapas nahi aata. Screen baad me ban jaayegi; kho gaya data nahi banta.
 */
const enquirySchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    formId: { type: String, required: true },

    /**
     * Form ka naam **copy** kiya jaata hai, sirf `formId` nahi.
     *
     * Form rename ho jaaye ya delete, tab bhi enquiry ye bata sake ki wo kahan se aayi thi.
     * Wahi soch jo invoice pe hoti hai: us waqt ka sach us record pe likha rehna chahiye.
     */
    formName: { type: String, default: '' },

    /**
     * Kis page se bhari gayi — `/packages/discover-andaman`.
     *
     * ⚠️ Ye payload ke apne khaane se aata hai (`submitEnquirySchema.sourcePath`), form ke
     * kisi field se nahi. Pehle wo `sourcePage` naam ki `hidden` field pe tika tha, aur jis
     * client ne wo field apne form se hata di uski har enquiry pe ye khaali reh gaya (2 Sep).
     */
    sourcePath: { type: String, default: '' },

    /**
     * Bhare hue khaane — `{ fullName: 'Ananya', travellers: 4 }`.
     *
     * `Mixed` hai par usme sirf string/number/boolean pahunchte hain: `submitEnquirySchema`
     * nested object aur array dono reject karta hai. Ye endpoint **bina auth ke** hai,
     * isliye ye rok yahan sabse zyada maayne rakhti hai (R9).
     */
    values: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    /**
     * Lifecycle — inbox ke saath jaag gaya (3 Sep). Values `ENQUIRY_STATUSES` se aati hain,
     * jo design ke Manage panel ka hi kram hai.
     */
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'new' },

    /**
     * ⚠️ Yahan `notes[]` tha (3 Sep subah) — internal notes ka panel. Client ne usi din wo
     * panel hata diya, aur field bhi hatane ko kaha. Migration **019** use purane documents
     * se `$unset` karti hai.
     *
     * Ye D-54 (`availability`) se ulta faisla hai — wahan field Mongo me chhod diya gaya tha.
     * Farak ye hai ki wahan wo **apply ho chuki migration** ka hissa tha aur data me baith
     * chuka tha; yahan notes kabhi kisi ne likhe hi nahi the.
     */

    /**
     * Team ko mail gayi ya nahi (D-109) — Enquiry Detail pe dikhta hai.
     *
     * `sent` · `failed` · `skipped` (SMTP configure nahi). Form pe `emailTo` khaali ho to ye
     * **likha hi nahi jaata** (`null`) — us form pe mail bhejna kabhi tay hi nahi tha, aur use
     * "skipped" kehna ek jhoothi chetavni hoti.
     *
     * ⚠️ Mail fail hone se enquiry **kabhi** nahi girti — ye sirf ek note hai (D-108 §4).
     */
    notification: {
      type: {
        status: { type: String, enum: ['sent', 'failed', 'skipped'] },
        to: { type: [String], default: undefined },
        at: Date,
        error: String,
      },
      default: null,
    },

    /** Delete = trash (R12). Permanent delete ka koi raasta abhi nahi hai. */
    deletedAt: { type: Date, default: null },

    /**
     * Search ke liye `values` ka saara text ek jagah.
     *
     * ⚠️ Iske bina search ka matlab hota `values` (Mixed) pe regex — aur wahi R9 wali sabse
     * khatarnaak jagah hai. Yahan `entries.searchText` wala hi precedent chal raha hai:
     * derived text ek saada string field me, jispe normal index lagta hai.
     */
    searchText: { type: String, default: '' },
  },
  { timestamps: true, collection: 'enquiries', minimize: false },
)

/**
 * `searchText` sirf **pure normalization** hai, isliye hook me hona theek hai (R1).
 *
 * ⚠️ Ye `save()` pe chalta hai. Enquiry sirf submit ke waqt banti hai (`Enquiry.create`),
 * aur uske baad sirf status/notes badalte hain — `values` kabhi update nahi hote. Isliye
 * yahan `findOneAndUpdate` wala jaal nahi hai jo is repo ka sabse aam bug hai.
 */
enquirySchema.pre('validate', function buildSearchText(next) {
  const parts = [this.formName, this.sourcePath]

  for (const value of Object.values(this.values ?? {})) {
    if (value !== null && value !== undefined) parts.push(String(value))
  }

  this.searchText = parts.filter(Boolean).join(' ').slice(0, 4000).toLowerCase()
  next()
})

export const Form = mongoose.model('Form', formSchema)
export const Enquiry = mongoose.model('Enquiry', enquirySchema)
