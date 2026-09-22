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
 * Cache ki umr — **tags ke saath, unki jagah nahi** (D-83).
 *
 * Asli invalidation `tags` se hoti hai aur wo turant hai: admin me kuch badalta hai, API
 * `POST /api/revalidate` maarti hai, aur wahi tag saaf ho jaata hai. Ye number us par bharosa
 * **nahi** karta — wo call jaan-boojh kar fail-soft hai (`core/revalidate.js` girne pe sirf
 * `logger.warn` karta hai, publish nahi rokta).
 *
 * Bina is number ke ek chhooti hui revalidate call ka matlab hota ki wo page **hamesha ke
 * liye** purana reh jaaye — aur wo failure poori tarah chup hoti: admin me naya content dikhta
 * hai, site pe purana, aur kahin koi error nahi.
 *
 * Ek ghanta isliye ki wo dono taraf sasta hai: normal haalat me tag pehle hi saaf kar chuka
 * hota hai (yaani ye kabhi lagta hi nahi), aur webhook toota ho to nuksaan ek ghante tak seemit
 * rehta hai.
 */
const CACHE_SECONDS = 3600

/**
 * @param {string} path `/public/...` se shuru
 * @param {string[]} tags is response ke cache tags
 */
async function getJson(path, tags) {
  try {
    /**
     * ⚠️ **`revalidate` ke bina ye poora cache system chalta hi nahi tha.**
     *
     * Next **15** me `fetch` ka default `no-store` hai (14 me `force-cache` tha). Yahan sirf
     * `{ next: { tags } }` likha tha — aur wo akela **cache karta hi nahi**, wo sirf tag
     * chipkaata hai. Nateeja: har page load pe chaaron call API tak jaati thi, har baar.
     *
     * Aur ye failure sabse chup thi: `revalidate` ka poora dhaancha bana hua tha — route,
     * `tagsFor()`, `path:` tag (D-52), path badalne pe purane tag ka bhejna — sab. Bas jo
     * cheez cache hi nahi hui, use invalidate karne ka koi matlab nahi tha. D-14 kaagaz pe
     * likha raha aur ek din bhi chala nahi.
     */
    const res = await fetch(`${API_BASE}/api${path}`, {
      next: { tags, revalidate: CACHE_SECONDS },
    })
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

/**
 * Site ki settings — **popup ke bina**.
 *
 * ⚠️ **`popup` yahan se jaan-boojh kar nikala jaata hai** (21 Sep, D-103 — live check pe pakda).
 *
 * `settings` ka poora object teen client components ko jaata hai (`MobileNav` header me, yaani
 * **har page pe**, aur `MobileBar`/`TourSchema`). Client component ke props RSC flight data me
 * serialize hote hain — matlab popup ka poora maal, **resolved form ke saare fields samet**, har
 * page ke HTML me chala jaata, un pages pe bhi jahan popup kabhi dikhta hi nahi.
 *
 * Popup `getPopup()` se alag milta hai. **Ye doosra round trip nahi hai** — dono wahi ek cached
 * fetch padhte hain (`settings` tag), isliye cache ka poora faayda waisa ka waisa rehta hai.
 *
 * ⚠️ Baaki settings ab bhi poori jaati hai. Use chhaant-na alag kaam hai (A-36) — `MobileNav`
 * ko sirf chaar-paanch field chahiye, poora object nahi.
 */
export async function getSettings() {
  const data = await getJson('/public/settings', ['settings'])
  if (!data?.settings) return null

  /**
   * ⚠️ `popup` aur `integrations` yahan se **nikale jaate hain** — dono har page ke HTML me
   * bemaani bhaar hain.
   *
   * `MobileNav` (header, har page pe) poora `settings` object prop me leta hai, aur client
   * component ke props RSC flight data me serialize hote hain. `popup` pe ye bug **live chalane
   * pe** pakda gaya tha (D-103 §7); `integrations` pe wahi galti dobara na ho, isliye wo pehle
   * din se yahan hai (A-36).
   */
  const { popup: _popup, integrations: _integrations, ...rest } = data.settings
  return rest
}

/**
 * Sirf popup — `Enquiries ▸ Popup` (D-103), server pe pehle se resolved (form + images).
 *
 * Wahi cached fetch jo `getSettings()` padhti hai, isliye koi naya round trip nahi aur koi naya
 * cache tag nahi (D-83 wala hi tark jo `resolve` pe liya gaya tha).
 */
export async function getPopup() {
  const data = await getJson('/public/settings', ['settings'])

  return data?.settings?.popup ?? null
}

/**
 * Sirf Integrations — `Settings ▸ Integrations` (D-106).
 *
 * Wahi cached fetch jo `getSettings()` padhti hai, isliye koi naya round trip nahi aur koi naya
 * cache tag nahi — `getPopup()` wala hi tark.
 */
export async function getIntegrations() {
  const data = await getJson('/public/settings', ['settings'])

  return data?.settings?.integrations ?? null
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
  /**
   * `type:tourPage` bhi (D-97 §6) — breadcrumb ka beech wala kadam chune hue Tour page ka title/path
   * hai. Uske badalne pe ye payload saaf na ho to breadcrumb ek ghanta purana naam dikhata.
   */
  const data = await getJson('/public/package-defaults', ['type:package', 'type:tourPage'])

  return data?.packageDefaults ?? null
}
