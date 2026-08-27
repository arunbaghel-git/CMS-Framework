import { z } from 'zod'

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
   * Jawab **plain text** hai, rich text nahi.
   *
   * Reference me har jawab ek hi paragraph hai (`.faq p`), aur usme koi heading, list ya
   * link nahi. Ise TipTap pe le jaane ka matlab hota ek aur block tree, uska versioning,
   * aur us sab ka Phase 5 me migration — ek paragraph ke liye.
   */
  answer: z.string().max(5000).default(''),
})

export const faqsSchema = z.array(faqSchema).max(50).default([])
