import { z } from 'zod'

/**
 * Query params validated before they reach Mongoose (R9).
 */
export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  folderId: z.string().trim().min(1).optional(),
  search: z.string().trim().max(100).optional(),
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
