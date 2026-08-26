import { z } from 'zod'

import { entryCreateSchema, entryListQuerySchema, entryUpdateSchema } from '@cms/shared'

/**
 * Entry ka shape `packages/shared` me hai (R8) — admin ka form aur API ek hi schema pe.
 *
 * Yahan sirf wo schemas hain jo **actions** ke liye hain (publish, revisions) — wo
 * admin ke form ka hissa nahi hain, isliye shared me rakhne ka koi fayda nahi.
 */
export { entryCreateSchema, entryListQuerySchema, entryUpdateSchema }

/**
 * Publish ka body — sab optional.
 *
 * `publishAt` future me ho to entry `scheduled` banti hai, `published` nahi. Ye faisla
 * service leti hai, client nahi: client ko `status` bhejne dena matlab wo `scheduled`
 * bhej kar `publishAt` khaali chhod sakta hai, aur wo entry na kabhi publish hoti na
 * kabhi draft rehti — bas atki reh jaati.
 */
export const publishEntrySchema = z
  .object({
    publishAt: z.coerce.date().nullable().optional(),
    /** Optimistic concurrency yahan bhi — publish ek write hai (R7). */
    version: z.number().int().nonnegative().optional(),
  })
  .strict()

/** Har query param Zod se (R9) — `req.query` kabhi seedha Mongoose tak nahi jaata. */
export const revisionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
