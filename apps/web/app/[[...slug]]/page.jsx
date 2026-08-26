import { notFound, permanentRedirect, redirect } from 'next/navigation'

import PackagePage from '../../components/package/PackagePage.jsx'
import { getPackageDefaults, getSettings, resolvePath } from '../../lib/cms.js'

/**
 * **Poore public site ka ekmatra route** — D-09, R10.
 *
 * Yahan koi per-type route nahi hai (`app/packages/[slug]` jaisa kuch nahi), aur ye
 * jaan-boojh kar hai: kis type ka URL kaisa dikhta hai wo `contentTypes.urlPattern` se aata
 * hai aur client use badal sakta hai. Hardcoded route us din jhooth bol raha hota.
 *
 * Har URL ke liye ek hi sawaal jaata hai — `GET /api/public/resolve?path=…` — aur uska
 * jawab teen me se ek hota hai: redirect, entry, ya kuch nahi.
 */

/** `['packages', 'andaman']` → `/packages/andaman`. Root pe `/`. */
const toPath = (slug) => `/${(slug ?? []).join('/')}`.replace(/\/+$/, '') || '/'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const result = await resolvePath(toPath(slug))

  if (result?.kind !== 'entry') return {}

  const { entry } = result
  const settings = await getSettings()

  /**
   * Fallback chain — architecture §7.3: entry ka SEO → uska apna title/excerpt.
   *
   * `titleTemplates` aur `defaultSeo` abhi settings me nahi hain (D-40 me PLANNED hain),
   * isliye wo do kadam abhi chhoote hue hain. Jab wo aayenge to yahi jagah badlegi.
   */
  const title = entry.seo?.title || entry.title
  const description = entry.seo?.description || entry.fields?.shortDescription || entry.excerpt

  return {
    title: settings?.siteName ? `${title} | ${settings.siteName}` : title,
    description,
    alternates: entry.seo?.canonical ? { canonical: entry.seo.canonical } : undefined,
    openGraph: {
      title: entry.seo?.ogTitle || title,
      description: entry.seo?.ogDescription || description,
      images: entry.banner ? [{ url: entry.banner.url }] : undefined,
    },
    /**
     * Entry ka apna `noindex` site ke kill-switch **ke upar** nahi jaata — layout pehle se
     * `searchEngineVisible` dekh kar poori site ko noindex kar deta hai. Yahan sirf ek
     * page ka apna faisla hai.
     */
    robots: entry.seo?.noindex ? { index: false, follow: !entry.seo?.nofollow } : undefined,
  }
}

export default async function CatchAllPage({ params }) {
  const { slug } = await params
  const path = toPath(slug)

  const result = await resolvePath(path)

  if (!result) notFound()

  if (result.kind === 'redirect') {
    /**
     * `301` aur `302` do alag cheezein hain aur Next me unke do alag helper hain.
     *
     * Auto-redirects hamesha `301` hote hain (D-49) — slug badalna permanent faisla hai.
     * `302` bhejne ka matlab hota search engine purana URL index me rakhe rahe.
     */
    if (result.statusCode === 301) permanentRedirect(result.to)
    redirect(result.to)
  }

  const { entry } = result

  if (entry.type === 'package') {
    /**
     * `packageDefaults` alag fetch hai — uska cache tag `type:package` hai, kisi ek entry
     * ka nahi. Ise entry ke payload me ghusa dene ka matlab hota ki "What's included"
     * badalne pe har package ka `entry:{id}` alag-alag saaf karna padta.
     */
    const defaults = await getPackageDefaults()

    return <PackagePage entry={entry} defaults={defaults} />
  }

  /**
   * Baaki types (page, post) ke template abhi nahi bane — wo Phase 3 me aayenge.
   *
   * Yahan `notFound()` **nahi** hai: entry sach me maujood hai aur publish bhi ho chuki
   * hai; 404 dena jhooth hota. Ek saada render se kam se kam title aur content dikhta hai.
   */
  return (
    <main className="wrap" style={{ padding: '48px 0' }}>
      <h1>{entry.title}</h1>
      {entry.fields?.shortDescription && <p>{entry.fields.shortDescription}</p>}
    </main>
  )
}
