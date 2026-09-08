import { htmlToText } from '@cms/shared'

/**
 * Tour / Page ka structured data — `BreadcrumbList` + `FAQPage` (Slice D).
 *
 * ⚠️ **Package wala `Schema.jsx` yahan use nahi hota, aur wo soch kar hai.** Wo poori tarah
 * package-shaped hai: `TouristTrip`, `Product`, `AggregateOffer`, `AggregateRating`, route ka
 * `ItemList` — sab ek itinerary ke bharose. Tour page ek **listing** hai; uspe koi ek trip,
 * koi ek daam aur koi ek rating hai hi nahi. Wo node yahan bhejne ka matlab hota Google ko wo
 * batana jo page pe dikh hi nahi raha — _"misleading structured data"_, jo manual penalty wali
 * shreni hai. Yahi chetavni `Schema.jsx` ke sar pe likhi hai.
 *
 * ⚠️ **Saare FAQ blocks milaa kar EK `FAQPage`** (client, 8 Sep). Ek page pe kai FAQs block ho
 * sakte hain — har ek ka apna `FAQPage` bhejna ek hi page pe do-teen `FAQPage` node bana deta,
 * aur Google uske liye saaf mana karta hai (ek page, ek `FAQPage`).
 */

/**
 * `</script>` se breakout na ho.
 *
 * `JSON.stringify` `<` ko waise hi chhod deta hai, aur agar kisi FAQ ke jawab me `</script>`
 * likha ho to wo tag yahin band ho jaata aur uske aage ka sab **HTML** ban jaata — stored XSS ka
 * seedha raasta.
 *
 * ⚠️ Ye `Schema.jsx` me bhi hai. Do copies ke bajaye use wahan se import karna behtar hota, par
 * wo file `'use client'` nahi hai aur na ye — dono server pe chalti hain; import ka matlab hota
 * package page ke poore schema ka module tour page pe bhi utarna. Teen line ke liye wo mehnga
 * sauda hai, aur ye line kabhi badalti nahi.
 */
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

/** Relative path → absolute URL, jab site ka pata configured ho. */
const absolute = (siteUrl, path) => {
  if (!siteUrl) return undefined

  return `${siteUrl.replace(/\/$/, '')}${path}`
}

export default function TourSchema({ entry, settings }) {
  /**
   * Set na ho to absolute URL wale khaane **chhoot** jaate hain, poora schema nahi. Aadha sahi
   * schema kisi bhi galat schema se behtar hai, aur dev me ye var aksar set nahi hota.
   */
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings?.siteUrl
  const graph = []

  // ── breadcrumb ───────────────────────────────────────────────────────────────
  const crumbs = [
    ...(entry.breadcrumbs ?? []),
    /** Page khud bhi ek kadam hai — wo `.vcrumb` me bhi aakhri me dikhta hai. */
    { name: entry.title, path: entry.path },
  ]

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
        /**
         * ⚠️ **Tags yahan hat-te hain** — jawab HTML hai (D-80), aur bina iske schema me
         * `<p>…</p>` chhapne lagta hai. Structured data ka kaam maloomat dena hai, dikhawa nahi.
         */
        acceptedAnswer: { '@type': 'Answer', text: htmlToText(faq.answer) },
      })),
    })
  }

  if (!graph.length) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJson({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  )
}
