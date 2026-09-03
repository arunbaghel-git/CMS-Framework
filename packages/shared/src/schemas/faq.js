import { z } from 'zod'

import { htmlSchema } from './rich-html.js'

/**
 * FAQs — spec 007 §2, page ka "Questions about this package".
 *
 * Ye `entries.fields.faqs[]` me rehti hain (D-46). Design me iska panel **"FAQs & Policies"**
 * tha; client ne 27 Aug ko sirf **FAQs** maanga — policies wahin rahengi jahan wo pehle se
 * hain (`packageDefaults.cancellationText`, §2.1), kyunki wo har package pe same hain aur
 * FAQs nahi.
 *
 * **Har FAQ ka `id` stable hota hai** — wahi wajah jo itinerary ke din pe hai (D-43 §5):
 * bina uske React ki key index ban jaati hai, aur reorder pe khuli hui row galat FAQ pe
 * chipak jaati hai.
 */

export const faqSchema = z.object({
  id: z.string().min(1).optional(),

  question: z.string().min(1).max(300),

  /**
   * Jawab ab **HTML** hai — D-80 (client, 3 Sep).
   *
   * > ~~Jawab plain text hai, rich text nahi. Reference me har jawab ek hi paragraph hai
   * > (`.faq p`)… ise TipTap pe le jaane ka matlab hota ek aur block tree, uska versioning,
   * > aur us sab ka Phase 5 me migration — ek paragraph ke liye.~~ **(D-59, superseded)**
   *
   * Wo tark us waqt theek tha kyunki rich text ka matlab **ek aur block tree** tha. Ab wo
   * daam nahi lagta: rich text ek saada HTML string hai, aur client ne editor har prose
   * field pe maanga. Ek paragraph ke liye alag shape rakhne ka ab koi kaaran nahi bacha.
   */
  answer: htmlSchema.pipe(z.string().max(8000)),
})

export const faqsSchema = z.array(faqSchema).max(50).default([])
