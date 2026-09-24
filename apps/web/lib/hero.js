/**
 * Hero mosaic ke paanch tiles chunna — **server pe**, browser me nahi.
 *
 * Client ka faisla (26 Aug) wahi ka wahi hai: _refresh pe main image badalni chahiye_.
 * Badla sirf ye hai ki chunav **kahan** hota hai.
 *
 * ## Pehle browser me hota tha, aur wo LCP ka sabse bada kharcha tha
 *
 * `Gallery` ek `useEffect` me shuffle karti thi. Uska matlab har visit pe ye kram tha:
 *
 * 1. server ka HTML aata hai — usme paanch tiles, browser turant unhe download karta hai
 * 2. JS utarta hai, hydrate hota hai, effect chalta hai
 * 3. `setTiles` paanch **alag** images daal deta hai — aur browser **paanch nayi
 *    download** shuru karta hai
 * 4. LCP wali image inhi me se ek hoti hai, yaani wo tab jaake dikhti hai
 *
 * Lighthouse ne yahi naapa (4 Sep, D-85): LCP ka **929ms** sirf "Load Delay" tha — wo image
 * discover hi 862ms pe hoti thi, jabki pehli paanch 228ms pe ja chuki hoti thi. Poora LCP
 * 6.5s tha.
 *
 * Ek chhupa hua kharcha aur tha: wo DOM badalna `.gal:has(...)` aur `.pkg:has(...)` ko
 * dobara chalata hai (`globals.css`), aur `:has()` ki invalidation poore subtree pe lagti
 * hai — 1320 element wale page pe wo sasta nahi hota.
 *
 * ## Ab kya hota hai
 *
 * Chunav server pe, **har request pe**. Route `ƒ Dynamic` hai (per-request render hota
 * hai), isliye har refresh pe naya hero — client ne jo maanga tha bilkul wahi — par browser
 * ke liye wo **pehle se hi** HTML me hota hai. Koi doosri download nahi, koi DOM badlaav
 * nahi.
 *
 * ✅ **24 Sep: baaki site ISR pe gayi, package page nahi** — uska apna route `app/packages/[slug]`
 * (`force-dynamic`, D-122) isi shuffle ko zinda rakhne ke liye hai (client).
 *
 * ⚠️ **Jis din ye route static/ISR ban jaaye** (`generateStaticParams` ya `force-static`),
 * ye randomness wahin **jam jaayegi** — hero har visitor ko ek jaisa dikhega aur sirf cache
 * refresh pe badlega. Wo apne aap me galat nahi hai, par wo **client ka faisla** hai, isliye
 * us badlaav se pehle poochhna hoga.
 */

/** Fisher–Yates — `sort(() => Math.random() - 0.5)` biased hota hai aur kuch images kabhi nahi aatin. */
function shuffle(items) {
  const out = [...items]

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }

  return out
}

/** Mosaic me kitne tiles — reference ka `.gal` grid paanch ka hai. */
export const HERO_TILES = 5

/**
 * @param {object | null | undefined} banner package ka apna `bannerImage`
 * @param {object[]} images Itinerary Images ka pool
 * @returns {{ tiles: object[], all: object[] }} `tiles` mosaic ke liye, `all` popup ke liye
 */
export function pickHeroTiles(banner, images) {
  /**
   * Banner aur pool ek hi list — dono chunav me jaate hain (client, 26 Aug: bada tile bhi
   * badalna chahiye). Banner sabse aage isliye ki chhote pool me (paanch se kam images) wo
   * hamesha dikhta hai.
   */
  const all = [...(banner ? [banner] : []), ...(images ?? [])]

  return {
    all,
    // Paanch ya kam hon to shuffle ka koi matlab nahi — wahi paanch dikhengi, bas kram badalta
    tiles: all.length <= HERO_TILES ? all : shuffle(all).slice(0, HERO_TILES),
  }
}
