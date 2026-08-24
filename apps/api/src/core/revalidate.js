import { env } from './env.js'
import { logger } from './logger.js'

/**
 * Next ISR ko tag-based invalidation ka signal — D-14.
 *
 * **Next ISR hi ekmatra cache authority hai.** Public API pe koi TTL cache nahi hai, to
 * yahan se bheja gaya tag hi wo ek signal hai jisse live site badalti hai.
 *
 * Shared secret zaroori hai — uske bina ye endpoint ek **public cache-purge endpoint**
 * hai, aur koi bhi use loop me maar kar site ko har request pe rebuild karwa sakta hai
 * (D-14).
 *
 * **Fail soft, par chup nahi.** Revalidate fail hone ka matlab hai "site thodi der purani
 * dikhegi" — uske liye admin ka Save fail karna galat trade hai. Par error log hota hai,
 * warna "publish kiya par site update nahi hui" wala ticket bina kisi surag ke aata hai.
 *
 * @param {string[]} tags jaise `menu:header`, `settings`
 */
export async function revalidateTags(tags) {
  const unique = [...new Set((tags ?? []).filter(Boolean))]
  if (unique.length === 0) return { ok: true, tags: [] }

  /**
   * Test me koi asli network call nahi.
   *
   * Bina iske har settings/menu test ek connection-refused ka intezaar karta aur logs
   * warnings se bhar jaate. Tags phir bhi return hote hain, taaki test ye assert kar sake
   * ki **kaunse** tags invalidate hone chahiye the.
   */
  if (env.NODE_ENV === 'test') return { ok: true, tags: unique, skipped: true }

  const url = `${env.SITE_URL.replace(/\/$/, '')}/api/revalidate`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Header me hai, query me nahi — query string proxy aur access logs me chhap jaati hai
        'x-revalidate-secret': env.REVALIDATE_SECRET,
      },
      body: JSON.stringify({ tags: unique }),
    })

    if (!res.ok) {
      logger.warn({ tags: unique, status: res.status }, 'Revalidate request rejected')
      return { ok: false, tags: unique }
    }

    return { ok: true, tags: unique }
  } catch (err) {
    logger.warn({ err, tags: unique }, 'Revalidate request failed')
    return { ok: false, tags: unique }
  }
}
