import { CACHE_TAG_ALL } from '@cms/shared'

import { AppError } from '../../core/errors.js'
import { logger } from '../../core/logger.js'
import { revalidateTags } from '../../core/revalidate.js'

/**
 * Topbar ka ⟳ Cache — poori public site ka cache ek click me saaf (client, 24 Sep, A-53).
 *
 * Aam haalat me iski zaroorat nahi: har Save apne tag khud saaf karta hai (D-14). Ye tab ke liye
 * hai jab koi tag chhoot gaya ho (A-26 sidebar, A-29 hotels) ya DB seedha badla ho (migration).
 *
 * ⚠️ **Poori site pe ek minute me ek baar** — ek click ke baad har page ka pehla visitor dheere
 * khulta hai, aur button teen role ke paas hai (admin · editor · author). Rok site ki hai, user ki
 * nahi: cache ek hi hai, to kisi ke abhi dabane ke baad doosre ka dabana waise bhi bemaani hai.
 *
 * ⚠️ Waqt **memory me** hai, DB me nahi — API ek hi process hai. Restart pe rok khul jaati hai, jo
 * theek hai (nuksaan ek extra flush ka hai, kuch tootta nahi).
 */
export const FLUSH_COOLDOWN_MS = 60_000

let lastFlushAt = 0

/** Sirf tests ke liye — har test apni rok se shuru ho. */
export function resetFlushCooldown() {
  lastFlushAt = 0
}

export async function flushCache(user, now = Date.now()) {
  if (now - lastFlushAt < FLUSH_COOLDOWN_MS) {
    throw new AppError(
      429,
      'CACHE_RECENTLY_CLEARED',
      'The cache was cleared less than a minute ago. Try again in a moment.',
    )
  }

  const result = await revalidateTags([CACHE_TAG_ALL])

  /**
   * ⚠️ **Fail hone pe jhootha "Cleared" nahi.** `revalidateTags()` baaki jagah fail-soft hai (Save
   * nahi rukna chahiye), par yahan button ka **ekmatra kaam** yahi call hai — uska fail hona user ko
   * dikhna chahiye. Aam wajah: site band hai, ya `REVALIDATE_SECRET` dono taraf alag hai.
   */
  if (!result.ok) {
    throw new AppError(
      502,
      'CACHE_FLUSH_FAILED',
      'The website could not be reached, so its cache was not cleared.',
    )
  }

  lastFlushAt = now
  logger.info({ userId: String(user?._id ?? '') }, 'Public site cache cleared from the admin bar')

  return { clearedAt: new Date(now).toISOString() }
}
