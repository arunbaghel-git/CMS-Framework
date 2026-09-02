import mongoose from 'mongoose'

import { DEFAULT_SITE_ID } from '@cms/shared'

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

    /** ⚠️ Abhi sirf store hota hai — SMTP Phase 0 se blocked hai. */
    emailTo: { type: String, default: '' },

    afterSubmit: {
      mode: { type: String, default: 'message' },
      value: { type: String, default: '' },
    },

    /** Button ke neeche ki chhoti line — thank-you se alag: ye submit se **pehle** dikhti hai. */
    footnote: { type: String, default: '' },

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

    /** `new` se aage ka lifecycle inbox ke saath aayega. */
    status: { type: String, default: 'new' },
  },
  { timestamps: true, collection: 'enquiries', minimize: false },
)

export const Form = mongoose.model('Form', formSchema)
export const Enquiry = mongoose.model('Enquiry', enquirySchema)
