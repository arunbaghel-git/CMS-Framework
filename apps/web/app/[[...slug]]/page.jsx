import { notFound, permanentRedirect, redirect } from 'next/navigation'

import PostPage from '../../components/blog/PostPage.jsx'
import PackagePage from '../../components/package/PackagePage.jsx'
import TourPage from '../../components/tour/TourPage.jsx'
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
     * Teen alag fetch, teen alag cache tag — `path:` (entry), `type:package` (defaults)
     * aur `settings`.
     *
     * Inhe ek payload me mila dene ka matlab hota ki "What is included" badalne pe har
     * package ka apna tag alag-alag saaf karna padta, aur phone number badalne pe bhi.
     */
    const [defaults, settings] = await Promise.all([getPackageDefaults(), getSettings()])

    return <PackagePage entry={entry} defaults={defaults} settings={settings} />
  }

  if (entry.type === 'post') {
    /**
     * Blog post — `blog-detail-v1.html` (spec 008, Slice D).
     *
     * ⚠️ **Ye branch se pehle post neeche wale fallback pe girta tha, jahan sirf `<h1>` chhapta
     * hai.** Yaani Slice A–C ka bhara hua sab kuch — TOC, prev/next, related, sidebar — public
     * site pe **dikhta hi nahi tha**. Theek wahi haalat jo 8 Sep tak `tourPage` ki thi
     * (D-87 §11), aur wahi lakshan: koi error nahi, bas kuch na hona.
     *
     * `getPackageDefaults()` yahan nahi aata — wo `sectionLabels`, pricing note aur hotels hai,
     * sab package page ki cheezein. Ek aur fetch ka matlab hota ek aur cache tag aur ek aur
     * round trip, us data ke liye jise ye page chhoota bhi nahi.
     */
    const settings = await getSettings()

    return <PostPage entry={entry} settings={settings} />
  }

  if (entry.type === 'page' || entry.type === 'tourPage') {
    /**
     * Dono ka payload ek hi hai (`toPublicPage()`) aur field set bhi ek hi constant (D-87 §1) —
     * alag type sirf isliye hai ki menu, list aur URL teenon alag maange gaye the. Render me
     * unme koi farak nahi.
     *
     * ⚠️ `page` ki screens abhi bani nahi hain (A-9), yaani aaj practically sirf `tourPage`
     * yahan aata hai. Branch phir bhi dono pe hai — jis din Pages ka kaam aayega, yahan kuch
     * nahi badlega.
     *
     * ⚠️ **`getPackageDefaults()` yahan nahi aata.** Wo `sectionLabels`, pricing note, hotels
     * aur booking steps hai — sab package page ki cheezein. Ek aur fetch ka matlab hota ek aur
     * cache tag aur ek aur round trip, us data ke liye jise ye page chhoota bhi nahi.
     */
    const settings = await getSettings()

    return <TourPage entry={entry} settings={settings} />
  }

  /**
   * Bache hue types — aaj **`blogPage`**, jiska template Slice D2 me banega (spec 008).
   *
   * ⚠️ Pehle yahan `post` likha tha; wo Slice D me apni branch pe chala gaya. Ye comment us
   * din update nahi hota to wo ek jhootha ishaara chhod jaata — theek wahi cheez jo D-89 me
   * do baar mili (byline aur `.blk` pe reference dekhe bina maan liya gaya tha).
   *
   * Yahan `notFound()` **nahi** hai: entry sach me maujood hai aur publish bhi ho chuki
   * hai; 404 dena jhooth hota. Ek saada render se kam se kam title dikh jaata hai.
   */
  return (
    <main className="wrap" style={{ padding: '48px 0' }}>
      <h1>{entry.title}</h1>
      {entry.fields?.shortDescription && <p>{entry.fields.shortDescription}</p>}
    </main>
  )
}
