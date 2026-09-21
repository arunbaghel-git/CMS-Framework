import { z } from 'zod'

import { htmlSchema } from './rich-html.js'

/**
 * Package page ka **Notes** section — `Popular add-ons` ke theek upar (client, 21 Sep, D-104).
 *
 * ## Ye baaki nau section se alag kyun hai
 *
 * Page ke baaki saare section apna heading `packageDefaults.sectionLabels` se lete hain (D-65) —
 * ek jagah badlo, sab packages pe lag jaaye. **Is section ka heading per-package hai**, aur wo
 * client ka saaf faisla hai (21 Sep): notes har package ke apne hote hain, to unka heading bhi
 * har package ka apna hona chahiye (`Ferry timings` ek package pe, `Permit rules` doosre pe).
 *
 * ⚠️ Isliye ye section **`PACKAGE_SECTIONS` me nahi hai** aur `Section Headings` screen pe uska
 * koi tab bhi nahi. Wahan tab banana do jagah bana deta — aur "khaali ke do matlab" (D-65) is
 * section pe phir se poochhna padta.
 *
 * ## Khaali ka matlab
 *
 * **Dono khaali = section page pe hai hi nahi.** Ye baaki sections se ulta hai (wahan khaali
 * heading pe theme ka default wapas aata hai), aur wo theek hai: ye section optional hai, har
 * package pe hona zaroori nahi. Sirf heading likhi ho to heading chhapta hai, sirf content ho
 * to bina heading ke content — dono soorat client ki likhi hui hain, isliye theme un me se
 * kuch gadhta nahi.
 *
 * Purana per-day `note` isi ne badla hai — poora hisaab `itinerary.js` me us hate hue field
 * ki jagah likha hai.
 */

export const PACKAGE_NOTES_LIMITS = Object.freeze({
  /** Ek section ka heading — `sectionLabels` wali hi hadd (120). */
  heading: 120,
  content: 8000,
})

export const packageNotesSchema = z
  .object({
    /**
     * Plain text, HTML nahi — ye `<h2>` ke andar seedha chhapta hai.
     *
     * `sectionLabels.heading` bhi plain text hai, aur dono ek hi kism ki cheez hain: section ka
     * naam. Yahan editor dene ka matlab hota ki client heading ke andar `<p>` daal de.
     */
    heading: z.string().trim().max(PACKAGE_NOTES_LIMITS.heading).default(''),

    /**
     * Section ka apna text — poora rich HTML (D-80), jaise din ka description.
     *
     * ⚠️ Safai `sanitizeEntryFields()` me hoti hai, render pe kabhi nahi (R20).
     */
    content: htmlSchema.pipe(z.string().max(PACKAGE_NOTES_LIMITS.content)).default(''),
  })
  .default({ heading: '', content: '' })

/** Section page pe dikhega ya nahi — theme aur payload dono isi ko poochhte hain. */
export const hasPackageNotes = (notes) =>
  Boolean(notes?.heading?.trim()) || Boolean(notes?.content?.trim())
