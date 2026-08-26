import { z } from 'zod'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '../constants/index.js'
import { pathSchema } from './entry.js'

/**
 * `redirects` ka contract — A-6, D-49.
 *
 * Ye collection Phase 4 (SEO) ki hai, par uska **auto wala aadha hissa** yahan Slice 3 me
 * aa gaya: slug badalne pe purane URL ko zinda rakhna. Cascade (descendants ka path
 * rebase) Slice 1 me ban chuka tha; ye uska doosra aadha hai.
 *
 * **Manager UI Phase 4 me hi rahegi** — haath se redirect banana, chain dekhna, hits ka
 * report. Yahan sirf wo hai jo bina UI ke bhi zaroori hai.
 */

export const REDIRECT_STATUS_CODES = Object.freeze([301, 302])

export const redirectSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  /**
   * Day 1 se reserve — aur yahan ye **uniqueness ka hissa** hai (`{siteId, locale, from}`).
   *
   * Wahi test jo D-48 §3 me laga tha: `locale` wahan day 1 se chahiye jahan unique index
   * hai. `02-ARCHITECTURE` §3.3 pehle `{siteId, from}` likhta tha — wo menus wali hi galti
   * ka agla roop hota.
   */
  locale: z.string().default(DEFAULT_LOCALE),

  /** Purana path — yahi wo URL hai jo kisi ne share kar rakha hai. */
  from: pathSchema,
  to: pathSchema,

  /**
   * `301` = permanent (slug badla), `302` = temporary.
   *
   * Auto-redirect hamesha `301` hota hai: slug badalna ek permanent faisla hai, aur `302`
   * bhejne ka matlab hai search engine purana URL index me rakhe rahe.
   */
  statusCode: z.union([z.literal(301), z.literal(302)]).default(301),

  /** Kitni baar chala — Phase 4 ka report isi pe khada hoga. */
  hits: z.number().int().nonnegative().default(0),

  /**
   * `true` = system ne banaya (slug badalne pe), `false` = admin ne haath se.
   *
   * Farq zaroori hai: Phase 4 ka manager admin ke banaye redirects ko kabhi apne aap
   * overwrite nahi karega, par apne banaye hue ko chain flatten karte waqt badal sakta hai.
   */
  isAuto: z.boolean().default(true),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

/** Har query param Zod se (R9). */
export const redirectListQuerySchema = z.object({
  q: z.string().max(1000).optional(),
  isAuto: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
