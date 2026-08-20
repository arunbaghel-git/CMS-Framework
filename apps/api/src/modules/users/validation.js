import { z } from 'zod'
import {
  createUserSchema,
  updateMeSchema,
  updateUserSchema,
  ROLES,
  USER_STATUSES,
} from '@cms/shared'

/** Shape `packages/shared` me hai (R8) — admin ka form aur API ek hi schema pe. */
export { createUserSchema, updateUserSchema, updateMeSchema }

/**
 * List ke query params — R9.
 *
 * `req.query` ko kabhi seedha Mongoose query me mat daalo. `?role[$ne]=null` jaisa
 * input bhej ke koi bhi filter bypass kar sakta hai.
 */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  /** Upper bound zaroori hai — warna `?limit=100000` ek query se poora DB kheench lega. */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(/** @type {[string, ...string[]]} */ (ROLES)).optional(),
  status: z.enum(/** @type {[string, ...string[]]} */ (USER_STATUSES)).optional(),
  /** Naam · email · username me dhoondhta hai. */
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['createdAt', 'name', 'lastLoginAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Delete — content kise dena hai wo saath me aata hai.
 *
 * `reassignToId` abhi optional hai kyunki `entries` collection banī hi nahi (Phase 1).
 * Jab content aayega tab ye required ho jaayega — tab tak field aur UI dono maujood
 * hain, bas peeche transfer karne ko kuch nahi (D-30).
 */
export const deleteUserSchema = z.object({
  reassignToId: z.string().min(1).optional(),
})
