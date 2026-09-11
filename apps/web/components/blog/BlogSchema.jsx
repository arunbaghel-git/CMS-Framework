import { htmlToText } from '@cms/shared'

/**
 * Blog post ka structured data — `BreadcrumbList` + `BlogPosting` + `FAQPage` (spec 008).
 *
 * ⚠️ **Na package wala `Schema.jsx`, na `TourSchema`.** Package wala poori tarah package-shaped
 * hai (`TouristTrip` · `Product` · `AggregateRating`) aur ek article pe wo bhejna wahi
 * _"misleading structured data"_ hai jise D-87 §11 me rok gaya tha. `TourSchema` ke paas
 * `BlogPosting` hai hi nahi — aur wahi is page ka asli node hai.
 *
 * ⚠️ **Saare `faqs` blocks milaa kar EK `FAQPage`** — wahi niyam jo `TourSchema` pe hai. Ek page
 * pe do `FAQPage` node bhejne se Google saaf mana karta hai.
 *
 * ⚠️ D-82 ka sabak: structured data **live chala kar** verify hoti hai. Us din ki teenon
 * galtiyaan (`aggregateRating` galat node pe, har din ek `subTrip`, `stripTags` ka chipkane wala
 * bug) sirf asli page pe hi mili thin, test pe nahi.
 */

/**
 * `</script>` se breakout na ho — `JSON.stringify` `<` ko waise hi chhod deta hai.
 *
 * ⚠️ Ye teesri copy hai (`Schema.jsx` aur `TourSchema.jsx` me bhi hai), aur `TourSchema` ke sar
 * pe uski wajah likhi hai: import ka matlab hota ek page ka poora schema module doosre pe
 * utarna. Teen line ke liye wo mehnga sauda hai, aur ye line kabhi badalti nahi.
 */
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

const absolute = (siteUrl, path) => {
  if (!siteUrl) return undefined

  return `${siteUrl.replace(/\/$/, '')}${path}`
}

/** `2026-08-12T09:00:00.000Z` → `2026-08-12`. Schema ko date chahiye, timestamp nahi. */
const isoDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : undefined)

export default function BlogSchema({ entry, settings }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings?.siteUrl
  const graph = []

  // ── breadcrumb ───────────────────────────────────────────────────────────────
  const crumbs = [...(entry.breadcrumbs ?? []), { name: entry.title, path: entry.path }]

  if (crumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: absolute(siteUrl, crumb.path),
      })),
    })
  }

  // ── BlogPosting ──────────────────────────────────────────────────────────────
  /**
   * `wordCount` aur `articleSection` dono **derive** hote hain — koi field nahi.
   *
   * `readMinutes` payload me pehle se hai aur wo 200 shabd/minute pe bani hai, to shabd wapas
   * usi se nikalte hain. Alag se ginne ka matlab hota ek hi cheez ke do hisaab, aur ek din
   * `readMinutes` 6 kahe aur `wordCount` 300 — do jagah, do sach (D-86).
   */
  const posting = {
    '@type': 'BlogPosting',
    headline: entry.title,
    description: entry.seo?.description || entry.excerpt || undefined,
    image: entry.banner?.url ? absolute(siteUrl, entry.banner.url) : undefined,
    datePublished: isoDate(entry.publishedAt),
    dateModified: isoDate(entry.updatedAt ?? entry.publishedAt),
    wordCount: entry.readMinutes ? entry.readMinutes * 200 : undefined,
    /** Saari categories (D-93) — schema.org `articleSection` kai text le sakta hai. */
    articleSection: entry.categories?.length ? entry.categories.map((c) => c.name) : undefined,
    mainEntityOfPage: siteUrl
      ? { '@type': 'WebPage', '@id': absolute(siteUrl, entry.path) }
      : undefined,
  }

  /**
   * ⚠️ **Author `blogSettings` se hai, kisi admin user se nahi** — aur khaali naam pe wo node
   * bhejta hi nahi. Ek `BlogPosting` bina `author` ke bilkul valid hai; khaali naam wala
   * `Person` bhejna Google ko ek aisa lekhak batana hota jiska naam hai hi nahi.
   */
  if (entry.author?.name) {
    posting.author = { '@type': 'Organization', name: entry.author.name, url: siteUrl }
  }

  if (settings?.siteName) {
    posting.publisher = { '@type': 'Organization', name: settings.siteName }
  }

  graph.push(posting)

  // ── FAQs — saare blocks ek hi node me ────────────────────────────────────────
  const faqs = (entry.blocks ?? [])
    .filter((block) => block?.type === 'faqs')
    .flatMap((block) => block.props?.items ?? [])
    .filter((faq) => faq?.question && faq?.answer)

  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        /** Jawab HTML hai (D-80) — bina `htmlToText()` ke schema me `<p>…</p>` chhap jaata. */
        acceptedAnswer: { '@type': 'Answer', text: htmlToText(faq.answer) },
      })),
    })
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJson({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  )
}
