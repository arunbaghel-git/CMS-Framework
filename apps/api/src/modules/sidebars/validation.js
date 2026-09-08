import { z } from 'zod'

import { createSidebarSchema, sidebarListQuerySchema, updateSidebarSchema } from '@cms/shared'

/** Sidebar ka shape `packages/shared` me hai (R8) — admin ka form aur API ek hi schema pe. */
export { createSidebarSchema, sidebarListQuerySchema }

/**
 * Update pe `version` bhi aa sakta hai — optimistic concurrency ka token.
 *
 * Ye `sidebarSchema` me **nahi** hai kyunki wo document ka shape hai, aur `version` server
 * ka hisaab hai. Client jo padh kar aaya tha wahi wapas bhejta hai; badal chuka ho to `409`.
 */
export const updateSidebarBodySchema = updateSidebarSchema.extend({
  version: z.number().int().min(0).optional(),
})
