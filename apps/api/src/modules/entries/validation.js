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
    /**
     * `public` | `private` — design ke Publish panel ka "Visibility".
     *
     * Ye koi naya field **nahi** hai: `private` spec 002 se hi ek status hai (published,
     * par sirf logged-in user ko dikhta hai). Ise yahan rakha gaya hai kyunki visibility
     * publish ka hi ek hissa hai — alag endpoint banane ka matlab hota do jagah se ek hi
     * field likhna, aur ek din wo do alag ho jaate.
     */
    visibility: z.enum(['public', 'private']).optional(),
    /** Optimistic concurrency yahan bhi — publish ek write hai (R7). */
    version: z.number().int().nonnegative().optional(),
  })
  .strict()

/**
 * Bulk action — list screen ke "Bulk actions" dropdown se (design ka `s-packages`).
 *
 * `purge` yahan **nahi** hai. Permanent delete ek-ek karke hi hota hai, Trash screen ke
 * andar se (R12) — 50 rows ek click me hamesha ke liye mitane ka koi undo nahi hai, aur is
 * CMS ka target user non-technical hai.
 */
export const bulkEntrySchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(100),
    action: z.enum(['trash', 'restore', 'feature', 'unfeature']),
  })
  .strict()

/** Counts ki query — sirf type, kyunki tabs ek hi type ke andar hote hain. */
export const entryCountsQuerySchema = z.object({
  type: z.string().min(1),
})

/**
 * Dashboard ke cards (A-54) — `?types=package,post,tourPage`. Har naam saada camelCase
 * shabd, warna 400 (R9) — `$ne` jaisa kuch query tak pahunch hi na sake.
 */
export const entryStatsQuerySchema = z.object({
  types: z
    .string()
    .transform((value) => [...new Set(value.split(',').map((type) => type.trim()))])
    .pipe(
      z
        .array(z.string().regex(/^[a-zA-Z]+$/))
        .min(1)
        .max(10),
    ),
})

/** Har query param Zod se (R9) — `req.query` kabhi seedha Mongoose tak nahi jaata. */
export const revisionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
