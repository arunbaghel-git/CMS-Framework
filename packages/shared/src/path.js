import { RESERVED_SLUGS } from './constants/index.js'

/**
 * Slug aur path banane wale **pure** functions — D-09.
 *
 * Ye `packages/shared` me isliye hain, `apps/api` me nahi: admin editor me permalink ka
 * live preview dikhta hai ("Permalink: /packages/andaman-5-nights"), aur wo preview server
 * ke likhe hue `path` se **bilkul** match karna chahiye.
 *
 * Do jagah rakhne ka nateeja is repo me pehle dekha ja chuka hai (D-43 §2): dono copies
 * ek din alag ho jaati hain, aur admin ek path dikhata rehta hai jabki DB me doosra hota
 * hai — yaani "preview me sahi tha, live pe 404".
 */

/**
 * Title se slug.
 *
 * Diacritics `NFD` se hatte hain, taaki "Café" → "cafe" bane, "caf" nahi. Devanagari
 * jaisi non-Latin script poori tarah gir jaati hai — us case me caller ko slug haath se
 * bharna padega. Ye jaan-boojh kar hai: transliteration ka koi ek sahi jawab nahi hota,
 * aur galat transliteration ek permanent URL me baith jaati hai.
 *
 * @param {string} input
 * @returns {string} khaali string agar kuch bacha hi na ho
 */
export function slugify(input) {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
    .replace(/-+$/g, '')
}

/**
 * Reserved slug hai? — `/admin`, `/api`, `/_next`, `/media`, `/uploads`.
 *
 * Ye sirf **pehle segment** pe lagta hai: `/about/media` bilkul theek hai, `/media` nahi.
 * Nested path pe rok lagana bina wajah client ka raasta band karna hai — collision sirf
 * top level pe hoti hai.
 *
 * @param {string} slug
 */
export function isReservedSlug(slug) {
  return RESERVED_SLUGS.includes(slug)
}

/**
 * Slug pe `-2`, `-3` suffix — collision pe.
 *
 * @param {string} slug
 * @param {number} n
 */
export function suffixSlug(slug, n) {
  if (n <= 1) return slug
  const suffix = `-${n}`
  // 200 char ki hadd slug schema me hai — suffix ke liye jagah kaat kar rakho, warna
  // lamba title collision pe validation fail karega aur wajah bilkul saaf nahi hogi
  return `${slug.slice(0, 200 - suffix.length).replace(/-+$/g, '')}${suffix}`
}

/**
 * Entry ka stored `path` — routing ka **single source of truth** (D-09, R10).
 *
 * Do raaste hain, aur kaunsa chalega ye contentType ka `hierarchical` batata hai,
 * type ka **naam** nahi:
 *
 *   hierarchical  → parent chain se     /about, /about/team
 *   baaki sab     → urlPattern se       /blog/{slug}, /packages/{slug}
 *
 * Naam pe switch karna (`type === 'page'`) wahi hardcoding hai jise D-09 ne mana kiya
 * tha — client ka banaya custom type bhi nested ho sakta hai.
 *
 * @param {{ slug: string, parentPath?: string|null }} entry
 * @param {{ urlPattern: string, hierarchical?: boolean }} contentType
 * @returns {string} hamesha `/` se shuru, kabhi trailing slash nahi
 */
export function resolvePath(entry, contentType) {
  const slug = String(entry?.slug ?? '').trim()
  if (!slug) throw new Error('resolvePath: slug zaroori hai')
  if (!contentType?.urlPattern) throw new Error('resolvePath: contentType.urlPattern zaroori hai')

  if (contentType.hierarchical) {
    const parent = normalizePath(entry.parentPath ?? '')
    // Root-level page ka parent `/` hota hai — us par `//about` na ban jaaye
    return normalizePath(`${parent === '/' ? '' : parent}/${slug}`)
  }

  return normalizePath(contentType.urlPattern.replace(/\{slug\}/g, slug))
}

/**
 * Pattern me `{slug}` hai hi nahi — yaani type ka URL **ek hi, tay** hai (D-96).
 *
 * Aaj sirf `homePage` (`/`) aisa hai. Uska slug phir bhi banta hai (`{siteId, type, slug}`
 * unique hai aur admin list use dikhati hai), par path pe uska koi asar nahi — `resolvePath()`
 * upar wale `replace` se hi `/` lautata hai.
 *
 * ⚠️ Iska matlab ye bhi hai ki aise type ki **ek hi entry** ho sakti hai: `{siteId, locale, path}`
 * unique hai. Wo rok DB me hai, aur service ise pehle se pakad kar saaf message deti hai.
 *
 * @param {{ urlPattern?: string, hierarchical?: boolean }} contentType
 */
export function hasFixedPath(contentType) {
  return Boolean(
    contentType?.urlPattern &&
      !contentType.hierarchical &&
      !contentType.urlPattern.includes('{slug}'),
  )
}

/**
 * Path ko canonical banata hai — double slash hatao, trailing slash hatao.
 *
 * Trailing slash yahin ek hi jagah tay hoti hai. Do variants store ho jaayein to
 * `{siteId, locale, path}` unique index unhe alag maanta hai aur ek hi page do URL pe
 * live ho jaata hai — duplicate content, aur SEO ka seedha nuksaan (§7.3).
 *
 * @param {string} path
 */
export function normalizePath(path) {
  const cleaned = `/${String(path ?? '')}`.replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  return cleaned === '' ? '/' : cleaned
}

/**
 * Parent ka path badla — bachche ka naya path.
 *
 * Cascade isi se chalta hai: `/about` → `/company` hone pe `/about/team` ko
 * `/company/team` banana hai. String replace **prefix pe hi** lagta hai, warna
 * `/about/about-us` galat jagah se kat jaata.
 *
 * @param {string} childPath
 * @param {string} oldParentPath
 * @param {string} newParentPath
 */
export function rebasePath(childPath, oldParentPath, newParentPath) {
  const child = normalizePath(childPath)
  const oldBase = normalizePath(oldParentPath)
  const newBase = normalizePath(newParentPath)

  if (child !== oldBase && !child.startsWith(`${oldBase}/`)) return child

  return normalizePath(`${newBase}${child.slice(oldBase.length)}`)
}

/**
 * Client ke likhe hue kisi bhi URL se site ka apna `path` — SEO ka bulk import (D-107).
 *
 * Sheet me client teen me se kuch bhi likh sakta hai, aur teenon ek hi page hain:
 *
 * ```
 * https://andamantourism.org/Packages/Discover-Andaman/
 * /packages/discover-andaman
 * packages/discover-andaman?utm_source=sheet#top
 * ```
 *
 * ⚠️ **Lowercase karna yahan ek zaroorat hai, safai nahi.** `path` hamesha `slugify()` se
 * banta hai yaani lowercase hota hai, aur Mongo case-sensitive hai. **D-86 theek yahi galti
 * thi**: client ne `Package URL` bade akshar me likha tha, lookup hamesha khaali aata tha,
 * aur har import ek naya duplicate page bana deta tha — bina kisi error ke. Us waqt teen
 * guard is ek `null` se chup-chaap mar gaye the.
 *
 * `?query` aur `#hash` isliye girte hain ki wo page ki pehchaan ka hissa nahi hain —
 * client aksar analytics wala poora link copy karke chipka deta hai.
 *
 * @param {string} value
 * @returns {string} `/` se shuru hota path, ya khaali string agar kuch bacha hi na ho
 */
export function pathFromUrl(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  /** Origin sirf tab hatta hai jab wo sach me ek URL ho — `//` wala protocol-relative bhi. */
  const withoutOrigin = raw.replace(/^([a-z][a-z0-9+.-]*:)?\/\/[^/]+/i, '')
  const withoutQuery = withoutOrigin.split('#')[0].split('?')[0]
  const trimmed = withoutQuery.trim()

  /** `https://site.com` akela — yaani home page. */
  if (!trimmed) return raw === withoutOrigin ? '' : '/'

  return normalizePath(trimmed.toLowerCase())
}
