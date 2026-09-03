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
   * Kism ka filter — design ke pehle dropdown se (`All media items · Images · Videos ·
   * Documents (PDF)`).
   *
   * ⚠️ Aaj `MEDIA_MIME` sirf JPG/PNG/WebP leta hai, to `video` aur `document` **khaali**
   * aayenge. Wo jaan-boojh kar hai: design me ye chaar vikalp hain, aur unhe hata dena
   * design badalna hota (R15). Jis din wo kismein upload hone lagengi, ye filter pehle se
   * tayyar milega.
   */
  type: z.enum(['image', 'video', 'document']).optional(),

  /**
   * Upload ka mahina — `YYYY-MM` (design ka doosra dropdown: `All dates` / `August 2026`).
   *
   * Mahina hi, range nahi — design me yahi hai. Vikalpon ki list bhi banayi nahi jaati:
   * `mediaMonths()` sirf wahi mahine deta hai jinme sach me kuch upload hua hai.
   */
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
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
