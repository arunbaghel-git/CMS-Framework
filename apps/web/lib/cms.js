/**
 * Public API se data — sab server pe, tag-based cache ke saath.
 *
 * **Next ISR hi ekmatra cache authority hai** (D-14): yahan koi apna TTL cache nahi hai,
 * sirf `next.tags`. Admin me kuch badalta hai to API `POST /api/revalidate` maar kar wahi
 * tag saaf karta hai (`apps/api/src/core/revalidate.js`).
 *
 * Fetch **server-side** hai isliye seedha API ka base URL use hota hai — browser wala
 * `/api` rewrite (`next.config.js`) sirf client ke liye hai.
 */

const API_BASE = process.env.API_URL ?? 'http://localhost:4000'

/**
 * @param {string} path `/public/...` se shuru
 * @param {string[]} tags is response ke cache tags
 */
async function getJson(path, tags) {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { next: { tags } })
    if (!res.ok) return null

    const body = await res.json()
    return body?.data ?? null
  } catch {
    /**
     * API down hone pa poora page 500 dena galat hai — header/footer har page pe hain,
     * yaani ek API blip poori site ko le doobta. `null` par caller khaali render karta
     * hai: khaali cheez khaali dikhe, tooti hui nahi (D-30).
     */
    return null
  }
}

export async function getSettings() {
  const data = await getJson('/public/settings', ['settings'])

  return data?.settings ?? null
}

/** @param {string} location theme ki declared location — `header`, `footerColumn1`… */
export async function getMenu(location) {
  const data = await getJson(`/public/menus/${location}`, [`menu:${location}`])

  return data ?? { location, menu: null, items: [] }
}
