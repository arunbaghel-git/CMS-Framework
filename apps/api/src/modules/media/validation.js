import { z } from 'zod'

/**
 * Har query param Mongoose tak pahunchne se **pehle** Zod se guzarta hai (R9) —
 * `req.query` ko seedha query me spread karna NoSQL injection ka raasta hai.
 */
export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  folderId: z.string().trim().min(1).optional(),
  search: z.string().trim().max(100).optional(),

  /**
   * Upload ki tareekh ka range — `YYYY-MM-DD` (client, 3 Sep).
   *
   * Design me yahan ek month dropdown hai (`All dates` / `August 2026`). Range isliye chuna
   * gaya ki wo month ko bhi cover karta hai (1 se 31) **aur** "pichle hafte ki" jaisi baat
   * bhi — aur Enquiries pe client ne abhi wahi shakl approve ki hai (D-76). Admin me do
   * screens do tarah ke date filter dena, wo khud ek dikkat hai.
   *
   * ⚠️ `to` **poore din** ko pakadta hai (service usme +1 din karti hai) — wahi wajah jo
   * enquiries pe likhi hai: "3 tarikh tak" ka matlab "3 tarikh ki raat 12 baje tak" nahi.
   */
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  sort: z.enum(['createdAt', 'filename', 'size']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Foundation me sirf metadata edit hota hai. Upload/replace/crop/delete full Media phase.
 */
export const updateMediaSchema = z
  .object({
    alt: z.string().trim().max(250).optional(),
    title: z.string().trim().max(120).optional(),
    caption: z.string().trim().max(500).optional(),
  })
  .strict()
