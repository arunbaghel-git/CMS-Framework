import { applyTitleTemplate, DEFAULT_ROBOTS_TXT, DEFAULT_TITLE_TEMPLATE } from '@cms/shared'

/**
 * `Settings ▸ SEO & Schema` ke niyam — client, 24 Sep. `generateMetadata()` aur `/robots.txt`
 * dono yahin se padhte hain.
 *
 * ⚠️ **JSX ke bahar, apne test ke saath** — jo sirf render pe chalta hai uska test page ke andar
 * likha hi nahi ja sakta (D-92 §11 wala sabak).
 */

/**
 * Page ka `<title>`.
 *
 * - SEO Title likha hai → **jaisa likha, waisa** (client). Meta upload ki sheet wala title bhi yahi
 * - khaali → Title Template (`%title% | %sitename%`), page ke Title pe
 *
 * ⚠️ `seo` na aaye (purana API) to bhi aaj wala hi look — `DEFAULT_TITLE_TEMPLATE`.
 */
export function pageTitle(entry, settings) {
  const custom = entry?.seo?.title?.trim()
  if (custom) return custom

  const template = settings?.seo?.titleTemplate ?? DEFAULT_TITLE_TEMPLATE

  return applyTitleTemplate(template, {
    title: entry?.title ?? '',
    sitename: settings?.siteName ?? '',
    tagline: settings?.tagline ?? '',
  })
}

/** SEO description → short description → excerpt → `Default Meta Description`. */
export function pageDescription(entry, settings) {
  return (
    entry?.seo?.description ||
    entry?.fields?.shortDescription ||
    entry?.excerpt ||
    settings?.seo?.defaultDescription ||
    undefined
  )
}

/** Page ki banner/featured image → `Default OG Image` → kuch nahi (toota link kabhi nahi, D-42 §2). */
export function pageOgImages(entry, settings) {
  const image = entry?.banner?.url ? entry.banner : settings?.seo?.defaultOgImage
  if (!image?.url) return undefined

  return [
    {
      url: image.url,
      ...(image.width ? { width: image.width } : {}),
      ...(image.height ? { height: image.height } : {}),
    },
  ]
}

/**
 * Page ka `robots` meta — site ka switch pehle, phir page ka apna `noindex`.
 *
 * ⚠️ Settings na milein (`null`) to **kuch nahi** — ek pal ki API galti ISR cache me `noindex` wala
 * page na baitha de (`robotsTxt()` wala hi tark).
 */
export function pageRobots(entry, settings) {
  if (settings && !settings.searchEngineVisible) return { index: false, follow: false }
  if (entry?.seo?.noindex) return { index: false, follow: !entry.seo.nofollow }
  return undefined
}

/**
 * `/robots.txt` ka text.
 *
 * ⚠️ **`searchEngineVisible` band ho to admin ka likha text NAHI jaata** — `Disallow: /` jaata hai.
 * Staging site ka Google me aana agency ka sabse mehnga routine accident hai (spec 004 §3), aur
 * wo rok ek textarea ke peeche nahi chhupni chahiye.
 *
 * ⚠️ Settings hi na milein (API band) to `null` — route **503** deta hai, `Disallow` nahi. Google
 * robots.txt ~24 ghante cache karta hai; ek pal ki API galti poori site ko index se nikaal deti.
 * 5xx pe wo purani file pe chalta hai aur dobara poochhta hai.
 */
export function robotsTxt(settings) {
  if (!settings) return null
  if (!settings.searchEngineVisible) return 'User-agent: *\nDisallow: /\n'

  const text = (settings.seo?.robotsTxt ?? DEFAULT_ROBOTS_TXT).trim() || DEFAULT_ROBOTS_TXT
  return `${text}\n`
}
