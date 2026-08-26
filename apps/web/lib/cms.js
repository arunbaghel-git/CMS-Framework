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

/**
 * Ek path pe kya hai — entry, redirect, ya kuch nahi (D-09, R10).
 *
 * **Cache tags do hain:** `path:{path}` aur `entry:{id}`.
 *
 * `path:` isliye zaroori hai ki jab tak fetch na ho jaaye, hume entry ki id pata hi nahi
 * hoti — aur 404 wale raaste pe to id hoti hi nahi. Bina uske ek naya page publish hone pe
 * uska pehle se cache hua 404 kabhi saaf hi na hota.
 *
 * Isliye API bhi har entry ke saath **`path:{path}` bhejti hai** (`tagsFor()`), aur path
 * badalne pe purane path ka tag bhi — warna purana URL apna 200 wala jawab cache me pakde
 * rehta aur uspe naya 301 kabhi lagta hi nahi.
 *
 * @param {string} path
 */
export async function resolvePath(path) {
  const data = await getJson(`/public/resolve?path=${encodeURIComponent(path)}`, [`path:${path}`])

  if (!data) return null

  return data
}

/** Packages ke globals — har package page pe wahi (spec 007 §1.8). */
export async function getPackageDefaults() {
  const data = await getJson('/public/package-defaults', ['type:package'])

  return data?.packageDefaults ?? null
}
