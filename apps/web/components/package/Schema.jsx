import { HOTEL_CATEGORY_LABEL, htmlToText } from '@cms/shared'

/**
 * Package page ka structured data — reference (`itinerary-v3.html`) ke `@graph` se.
 *
 * Client ne "FAQ ka json scheme" maanga tha (1 Sep); design me uske saath teen aur node
 * pehle se likhe hue the, aur unka saara data hamare paas ab maujood hai — daam
 * (`categoryPricing`), rating (`packageDefaults.rating`), route (itinerary se) aur provider
 * (settings). Sirf FAQ nikaal kar baaki chhod dena aadha kaam hota: SEO ka asli faayda
 * `AggregateOffer` + `aggregateRating` se aata hai, FAQ se nahi.
 *
 * ## Kya kis shart pe chhapta hai
 *
 * | Node | Kab |
 * | --- | --- |
 * | `BreadcrumbList` | hamesha — wo page pe dikh bhi raha hai |
 * | `FAQPage` | jab package ke apne FAQs hon |
 * | `TouristTrip` + `Product` | jab **Packages ▸ Itinerary Settings ▸ Emit Product + Trip schema** on ho |
 *
 * ⚠️ Teesra gate pehle **har package pe** tha (`entry.fields.seoSchema`, Slice 3 se). Wo 4 Sep
 * ko site-level ho gaya (D-82), aur uski wajah data se aayi: paanchon package pe wo `false`
 * mila — yaani ek bana-banaya feature kabhi on hua hi nahi. Aur ye per-package faisla hai bhi
 * nahi: site ya to structured data bhejti hai ya nahi.
 *
 * ⚠️ **Structured data wahi kehna chahiye jo page pe dikh raha hai.** Isiliye har number
 * usi source se aata hai jo page render karta hai — rating `packageDefaults.rating` se
 * (gini hui nahi), daam `categoryPricing` se, route itinerary se. Do alag source rakhne ka
 * matlab hota ki ek din schema kuch aur kehta aur page kuch aur dikhata, aur wo Google ki
 * nazar me "misleading structured data" hai — manual penalty wali shreni.
 */

/**
 * `</script>` se breakout na ho.
 *
 * `JSON.stringify` `<` ko waise hi chhod deta hai, aur agar kisi FAQ ke jawab me
 * `</script>` likha ho to wo tag yahin band ho jaata aur uske aage ka sab **HTML** ban
 * jaata — stored XSS ka seedha raasta. `\\u003c` JSON me wahi character hai, par parser ke
 * bahar wo `<` jaisa dikhta hi nahi.
 *
 * Wahi lakeer jo `RichTextDoc` pe hai (D-69): admin se aayi cheez kabhi HTML ban kar na
 * nikle.
 */
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

/**
 * HTML se plain text — structured data ke liye (D-80).
 *
 * ⚠️ **Ye ab `packages/shared` me hai** (`htmlToText`, D-87). Pehle iski poori copy yahin
 * theme ke andar thi; D-87 me read time ke liye server pe bhi wahi chahiye tha, aur do
 * copies rakhna theek wahi galti hoti jo `sectionLabels` (D-65), route strip (D-51) aur
 * hotels table (D-58) pe pehle ho chuki hai. D-82 wala "block tag ki jagah ek space" fix
 * bhi wahin chala gaya hai.
 */
const stripTags = htmlToText

/** Relative path → absolute URL, jab site ka pata configured ho. */
const absolute = (siteUrl, path) => {
  if (!siteUrl) return undefined

  return `${siteUrl.replace(/\/$/, '')}${path}`
}

export default function Schema({ entry, defaults, settings, breadcrumbs }) {
  /**
   * `NEXT_PUBLIC_SITE_URL` — `06-OPERATIONS.md` §4 me pehle se likha hua naam.
   *
   * Set na ho to absolute URL wale khaane **chhoot** jaate hain, poora schema nahi. Aadha
   * sahi schema kisi bhi galat schema se behtar hai, aur dev me ye var aksar set nahi hota.
   */
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const graph = []

  // ── breadcrumb ─────────────────────────────────────────────────────────────
  if (breadcrumbs?.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: absolute(siteUrl, crumb.path),
      })),
    })
  }

  // ── trip ───────────────────────────────────────────────────────────────────
  if (defaults?.seoSchema !== false) {
    const priced = entry.pricing?.categoryPricing ?? []
    const rating = defaults?.rating

    /**
     * Route ka har padaav — reference me ye `TouristDestination` ki `ItemList` hai.
     *
     * `routeStrip` server pe bani hui aati hai, isliye yahan wahi kram hai jo page pe
     * strip me dikhta hai.
     */
    const stops = (entry.routeStrip ?? []).map((leg) => leg.stay?.name).filter(Boolean)

    const trip = {
      '@type': 'TouristTrip',
      name: entry.title,
      description:
        entry.seo?.description || entry.fields?.shortDescription || entry.excerpt || undefined,
      image: entry.banner?.url ? absolute(siteUrl, entry.banner.url) : undefined,
      url: absolute(siteUrl, entry.path),

      /** Package Type taxonomy — design me ye teen hardcoded strings the. */
      touristType: entry.packageTypes?.length
        ? entry.packageTypes.map((type) => type.name)
        : undefined,

      itinerary: stops.length
        ? {
            '@type': 'ItemList',
            numberOfItems: stops.length,
            itemListElement: stops.map((name, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: { '@type': 'TouristDestination', name },
            })),
          }
        : undefined,

      /**
       * Din-ba-din ka plan — har din ek `subTrip` (client, 4 Sep).
       *
       * ⚠️ `itinerary` aur `subTrip` do alag cheezein hain, aur dono chahiye:
       * `itinerary` **jagah** batata hai (Port Blair → Havelock → Neil), `subTrip` batata hai ki
       * **har din hota kya hai**. Pehle sirf pehla tha, to schema me trip ka asli plan kahin
       * jaata hi nahi tha — jabki wahi page ka sabse bada hissa hai.
       *
       * ⚠️ Description se tags hat-te hain. Yahi niyam FAQ ke jawab pe bhi hai (neeche):
       * structured data ka kaam **maloomat** dena hai, dikhawa nahi — aur `<p>` chhap kar
       * jaana Google ki nazar me kachra hai.
       */
      subTrip: (entry.itinerary ?? []).length
        ? entry.itinerary.map((day, i) => ({
            '@type': 'Trip',
            name: `Day ${i + 1}: ${day.title}`,
            description: stripTags(day.description) || undefined,
          }))
        : undefined,

      /**
       * `AggregateOffer` — sirf wahi categories jinka daam bhara hua hai.
       *
       * `pricing.categoryPricing` public payload me pehle se **sasti se mehngi** ke kram me
       * aati hai (`pricedCategories()`), isliye pehla `lowPrice` hai aur aakhri `highPrice`.
       * Khaali daam ka matlab hai "wo category milti hi nahi" (D-56) — wo yahan bhi nahi
       * aani chahiye, warna schema ek aisa daam bata deta jo page pe kahin nahi hai.
       */
      offers: priced.length
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: settings?.currency ?? 'INR',
            lowPrice: String(priced[0].priceFrom),
            highPrice: String(priced[priced.length - 1].priceFrom),
            offerCount: String(priced.length),
            offers: priced.map((row) => ({
              '@type': 'Offer',
              name: HOTEL_CATEGORY_LABEL[row.category] ?? row.category,
              price: String(row.priceFrom),
              priceCurrency: settings?.currency ?? 'INR',
            })),
          }
        : undefined,

      /*
       * ⚠️ `aggregateRating` yahan **nahi** hai — wo `Product` node pe gaya (client, 4 Sep).
       *
       * Pehle wo yahin tha aur Google ka validator saaf mana kar raha tha:
       * _"The property aggregateRating is not recognised by the schema for an object of type
       * TouristTrip."_ Wo sahi tha — schema.org me `aggregateRating` `Product`, `Offer` aur
       * `Event` jaison pe hai, `Trip` pe hai hi nahi.
       *
       * Neeche `Product` node isi liye juda. Us toggle ka apna naam bhi shuru se
       * **"Emit Product + Trip schema"** tha — Product hissa kabhi bana hi nahi tha.
       */

      provider: settings?.siteName
        ? {
            '@type': 'TravelAgency',
            name: settings.siteName,
            telephone: settings.phone || undefined,
            address: settings.address || undefined,
          }
        : undefined,
    }

    graph.push(trip)

    /**
     * `Product` — daam aur rating ka sahi ghar (client, 4 Sep).
     *
     * ## Ye node kyun chahiye
     *
     * Do wajah, aur dono asli hain:
     *
     * 1. **`aggregateRating` `Trip` pe valid hi nahi hai.** Google ka validator use saaf
     *    thukra deta hai. `Product` pe wo valid hai.
     * 2. **Search me daam aur ⭐ isi se dikhte hain.** `TouristTrip` abhi kisi rich result ko
     *    power nahi karta; `Product` karta hai. Yaani ye node hi wo cheez hai jiske liye poora
     *    toggle banaya gaya tha.
     *
     * Toggle ka naam bhi shuru se **"Emit Product + Trip schema"** tha — Product wala aadha
     * hissa kabhi bana hi nahi tha.
     *
     * ⚠️ **Daam aur rating wahi hain jo `Trip` pe aur page pe hain** — dobara gine nahi jaate.
     * Do node ka ek hi source hona zaroori hai: alag ho jaayein to Google ki nazar me wo
     * "misleading structured data" hai, aur wo manual penalty wali shreni hai.
     */
    if (priced.length || rating?.value) {
      graph.push({
        '@type': 'Product',
        name: entry.title,
        description: trip.description,
        image: trip.image,
        url: trip.url,

        /** Brand = wahi travel agency jo `Trip` ki provider hai. */
        brand: settings?.siteName ? { '@type': 'Brand', name: settings.siteName } : undefined,

        offers: trip.offers,

        /** Wahi jodi jo hero me aur reviews ke heading pe chhapti hai — 0 ho to bilkul nahi. */
        aggregateRating: rating?.value
          ? {
              '@type': 'AggregateRating',
              ratingValue: String(rating.value),
              reviewCount: String(rating.count),
              bestRating: '5',
            }
          : undefined,
      })
    }
  }

  // ── FAQs ───────────────────────────────────────────────────────────────────
  const faqs = (entry.faqs ?? []).filter((faq) => faq.question && faq.answer)
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        /**
         * ⚠️ **Tags yahan hat-te hain** — D-80 me jawab HTML ban gaya, aur bina iske schema me
         * `<p>…</p>` chhapne lagta tha.
         *
         * Google `acceptedAnswer` me kuch HTML allow karta hai, to ye "toota" nahi hota —
         * par structured data ka kaam **maloomat** dena hai, dikhawa nahi. Aur ye baat is
         * page ke apne itihaas se bhi milti hai: schema ka poora tark yahi raha hai ki wo
         * saaf, plain aur bharosemand rahe.
         */
        acceptedAnswer: { '@type': 'Answer', text: stripTags(faq.answer) },
      })),
    })
  }

  if (!graph.length) return null

  return (
    <script
      type="application/ld+json"
      /**
       * `undefined` wali keys `JSON.stringify` khud gira deta hai — isiliye upar har
       * optional khaana `undefined` par set hota hai, `null` ya `''` par nahi. `null`
       * schema me ek asli value hai aur validator use galat batata hai.
       */
      dangerouslySetInnerHTML={{
        __html: safeJson({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  )
}
