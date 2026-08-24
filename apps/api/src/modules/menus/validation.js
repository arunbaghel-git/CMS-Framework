import { z } from 'zod'

import { createMenuSchema, updateMenuSchema } from '@cms/shared'

/** Menu ka shape `packages/shared` me hai (R8) — admin ka form aur API ek hi schema pe. */
export { createMenuSchema, updateMenuSchema }

/**
 * Har query param Mongoose tak pahunchne se **pehle** Zod se guzarta hai (R9) —
 * `req.query` ko seedha query me spread karna NoSQL injection ka raasta hai.
 */
export const listMenusQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Locations ek saath set hoti hain, ek-ek karke nahi — admin ka panel poora form save
 * karta hai. `menuId: null` "Not assigned" hai aur wo ek valid choice hai.
 *
 * `location` ki validity yahan enum se nahi, service me theme registry se check hoti hai
 * (D-17) — core me location ka enum rakhna hi wo cheez hai jise D-17 ne mana kiya tha.
 */
export const setMenuLocationsSchema = z
  .object({
    locations: z
      .array(
        z
          .object({
            location: z.string().trim().min(1).max(60),
            menuId: z.string().trim().min(1).nullable().default(null),
          })
          .strict(),
      )
      .max(20),
  })
  .strict()
