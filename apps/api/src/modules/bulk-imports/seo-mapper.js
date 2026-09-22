import { SEO_COLUMN } from '@cms/shared'

/**
 * Sheet ki ek row → entry ka naya `seo` object (D-107).
 *
 * Ye file **poori tarah pure** hai — na DB, na fetch. Wahi wajah jo `mapper.js`,
 * `post-mapper.js` aur `page-mapper.js` pe hai, aur wahi jo D-92 §11 me mehngi pad chuki thi:
 * jo logic sirf chalte hue code ke andar rehta hai uska test likha hi nahi ja sakta, aur wahi
 * hissa do baar galat nikla tha.
 */

/**
 * `seoSchema` (`packages/shared/src/schemas/seo.js`) ki apni hadd.
 *
 * ⚠️ Yahan **kaat kar note** lagta hai, Zod se girne nahi diya jaata. Zod se 400 aata aur poori
 * row `Failed` ho jaati — yaani ek lambi Meta Description ki wajah se client ka **Title bhi**
 * na lagta. Wahi niyam jo `page-mapper.js` ke `LIMITS` pe hai.
 */
export const SEO_LIMITS = Object.freeze({ title: 200, description: 500 })

/**
 * Ek khaana — `null` (column hai hi nahi) aur `''` (cell khaali hai) **dono ka matlab ek hi
 * hai: is field ko chhedo mat.**
 *
 * ⚠️ Ye client ka faisla hai (21 Sep) aur ye D-65 wale _"khaali ke do matlab"_ ka ulta sira hai.
 * Wahan khaali `description` line ko **hata** deti thi; yahan khaali cell kuch nahi karta.
 * Dono baar faisla client ka tha, aur dono baar wajah ek hi: jo **nuksaan wapas na ho sake**
 * wo default kabhi nahi banta. Aadhi bhari sheet se poori site ka SEO udd jaana yahan wahi
 * nuksaan hota.
 */
const filled = (value) => typeof value === 'string' && value.trim() !== ''

/**
 * @param {{ url?: string, title?: string|null, description?: string|null }} values
 * @param {{ seo?: object }|null} existing
 * @returns {{ seo: object, changed: string[], issues: object[] }}
 */
export function toSeoUpdate(values, existing) {
  /**
   * ⚠️ **Purana `seo` pehle, uske upar nayi value — aur ye chup nuksaan se bachne wala hissa hai.**
   *
   * `updateEntry()` ka `$set` poora `seo` object **replace** karta hai (`entries/service.js`).
   * Sirf `{title, description}` bhejne ka matlab hota ki us page ka `canonical`, `noindex`,
   * `ogTitle`, `twitterCard` aur `schemaType` — sab chup-chaap mit jaayein. Koi error nahi
   * aata, wo bas agle page load pe gayab hote.
   *
   * Yahi shakl `updatePackageDefaults()` ke whitelist wale jaal ki hai, aur `page` target ke
   * `prepare` hook ki bhi (D-95) — wahan `fields` isi tarah merge hote hain.
   */
  const seo = { ...(existing?.seo ?? {}) }
  const changed = []
  const issues = []

  const apply = (key, label, raw) => {
    if (!filled(raw)) return

    const text = raw.trim()
    const limit = SEO_LIMITS[key]

    if (text.length > limit) {
      issues.push({
        level: 'note',
        label,
        value: text.slice(0, 120),
        message: `This was ${text.length} characters, so it was shortened to ${limit}`,
      })
    }

    seo[key] = text.slice(0, limit)
    changed.push(label)
  }

  apply('title', SEO_COLUMN.TITLE, values?.title)
  apply('description', SEO_COLUMN.DESCRIPTION, values?.description)

  return { seo, changed, issues }
}
