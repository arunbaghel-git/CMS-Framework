import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  cheapestPricing,
  isPubliclyVisible,
  nightsByStay,
  normalizePath,
  pricedCategories,
  pricingSchema,
  resolveSectionLabels,
  routeStrip,
} from '@cms/shared'

import { Entry } from '../entries/model.js'
import { getPublicPackageForm } from '../forms/service.js'
import { AddOn, Hotel, Review, Transfer } from '../master-lists/model.js'
import { Media } from '../media/model.js'
import { toPublicMedia } from '../media/service.js'
import { getPublicMenuById } from '../menus/service.js'
import { ensurePackageDefaults } from '../package-defaults/service.js'
import { findRedirect } from '../redirects/service.js'
import { getSettings } from '../settings/service.js'
import { Taxonomy } from '../taxonomies/model.js'

/**
 * Public read ka business logic — R1.
 *
 * Ye module admin API se **jaan-boojh kar alag** hai (02-ARCHITECTURE §10): public
 * read-only hai aur bina auth ke hai, isliye uska projection bhi alag hona chahiye.
 * Ek hi controller dono ko serve karta to kabhi na kabhi ek admin-only field bahar chala
 * jaata.
 */

/**
 * Media ki id se ek render karne laayak image — **ya `null`**.
 *
 * `getMedia` throw karti hai; yahan throw karna galat hoga. Header ke liye "logo nahi
 * mila" ek normal state hai (naya instance, ya admin ne hata diya), error nahi.
 *
 * **D-42 §2 ka locked invariant yahin enforce hota hai:** media resolve na ho to `null`
 * jaata hai, koi aadha-adhoora object nahi — taaki theme ke paas kabhi aisa `src` pahunche
 * hi na jo 404 de.
 *
 * @param {string | null} mediaId
 * @param {string} [preferredVariant]
 */
export async function toDisplayImage(
  mediaId,
  preferredVariant = 'medium',
  siteId = DEFAULT_SITE_ID,
) {
  if (!mediaId) return null

  // `findOne` bina ObjectId cast ke throw karti hai agar id ka shape galat ho — aur
  // galat shape wali id yahan aana bilkul possible hai (purana data, manual edit).
  const doc = await Media.findOne({ _id: mediaId, siteId, deletedAt: null })
    .lean()
    .catch(() => null)

  if (!doc) return null

  const media = toPublicMedia(doc)
  const variant =
    media.variants.find((v) => v.key === preferredVariant) ??
    media.variants.find((v) => v.key === 'large') ??
    media.variants[0]

  // Variant hi na bane hon to bhi kuch mat bhejo — "original kabhi serve mat karo" (D-41)
  if (!variant?.url) return null

  return {
    url: variant.url,
    width: variant.w ?? media.width ?? null,
    height: variant.h ?? media.height ?? null,
    alt: media.alt || '',
  }
}

/**
 * Ek footer column ko **render karne laayak** shape me badlo — D-44.
 *
 * Do kaam yahan hote hain, theme me nahi (wahi soch jo `headerButtons` pe hai):
 *
 * 1. **`type` ka filter yahin lagta hai.** `type: 'text'` wale column ka `menuId` DB me
 *    bacha rehta hai (taaki client switch kar ke wapas aa sake), par public payload me
 *    wo menu jaata hi nahi. `type` khud bhi bahar nahi jaata — theme ko sirf ye pata
 *    hona chahiye ki uske paas kya hai, ye nahi ki admin ne kya chuna tha.
 * 2. **Adhoore text blocks chhant-te hain.** Jis block me na label hai na text, wo ek
 *    khaali `<li>` ban kar footer me bemaani gap banata.
 *
 * @param {any} column
 * @param {string} siteId
 */
async function toPublicFooterColumn(column, siteId) {
  const showsMenu = column.type === 'menu' || column.type === 'both'
  const showsText = column.type === 'text' || column.type === 'both'

  const menu = showsMenu ? await getPublicMenuById(column.menuId, siteId) : null

  const textBlocks = showsText
    ? (column.textBlocks ?? [])
        .filter((b) => b.label || b.text)
        .map(({ id, icon, label, text }) => ({ id, icon, label, text }))
    : []

  return {
    id: column.id,
    heading: column.heading,
    width: column.width,
    textBlocks,
    /** Menu ka `key` bahar nahi jaata — wo admin ka identifier hai, content nahi. */
    menu: menu ? { name: menu.name, items: menu.items } : null,
  }
}

/** Column jo kuch bhi render nahi karega, wo grid me ek khaali khaana ban jaata hai. */
const columnHasContent = (c) => Boolean(c.heading || c.textBlocks.length || c.menu?.items?.length)

/**
 * Public site ko jaane wali settings.
 *
 * **Allowlist hai, blocklist nahi** — `toPublicSettings` poora document deta hai aur usme
 * se kuch hatane ka matlab hota ki kal koi naya field apne aap public ho jaaye. Yahan
 * naya field tabhi bahar jaata hai jab koi use jaan-boojh kar likhe.
 *
 * `adminEmail` bahar **nahi** jaata — wo notification address hai, site ka content nahi.
 */
export async function getPublicSettings(siteId = DEFAULT_SITE_ID) {
  const settings = await getSettings(siteId)

  const [logo, favicon, footerLogo] = await Promise.all([
    toDisplayImage(settings.logoMediaId, 'medium', siteId),
    toDisplayImage(settings.faviconMediaId, 'thumb', siteId),
    /**
     * **Fallback yahan hai, theme me nahi** (D-44 §4).
     *
     * Footer aur drawer gehre background pe hain, jahan aksar inverted logo chahiye hota
     * hai — par har client ke paas do logo nahi hote. Khaali chhoda to header wala hi
     * chalta hai.
     *
     * Ye theme me rakhna ek din do jagah alag ho jaata (footer ne fallback kiya, drawer
     * ne nahi), aur wahi bug payload dekh kar samajh nahi aata. Yahan ek hi jagah tay
     * hota hai, aur D-42 §2 waise ka waisa rehta hai: dono na mile to `null`.
     */
    toDisplayImage(settings.footerLogoMediaId ?? settings.logoMediaId, 'medium', siteId),
  ])

  const footerColumns = (
    await Promise.all((settings.footerColumns ?? []).map((c) => toPublicFooterColumn(c, siteId)))
  ).filter(columnHasContent)

  return {
    siteName: settings.siteName,
    tagline: settings.tagline,

    /** Resolved image ya `null` — theme ko kabhi media id resolve nahi karni padti. */
    logo,
    favicon,

    phone: settings.phone,
    whatsapp: settings.whatsapp,
    address: settings.address,
    social: settings.social,

    /**
     * Header ke buttons — **filter yahan lagta hai, theme me nahi.**
     *
     * Do cheezein chhanti hain: `enabled: false` wale, aur wo jinka label ya URL adhoora
     * hai. Aadha-adhoora button ek toota hua link hai, aur admin use type karte waqt Save
     * kar sakta hai (schema use block nahi karta) — isliye rok yahan zaroori hai.
     *
     * `enabled` bahar **nahi** jaata: theme ko sirf wahi milte hain jo dikhne hain.
     */
    headerButtons: (settings.headerButtons ?? [])
      .filter((b) => b.enabled && b.label && b.url)
      .map(({ label, url, target, variant, className, icon, iconOnlyOnMobile }) => ({
        label,
        url,
        target,
        variant,
        className,
        icon,
        /**
         * Icon-only bina icon ke bemaani hai — button poori tarah khaali ho jaata.
         *
         * Ye guard yahan hai, theme me nahi: admin checkbox tick kar ke icon `none` chhod
         * sakta hai, aur us combination ko har theme me alag se sambhalna padta.
         */
        iconOnlyOnMobile: Boolean(iconOnlyOnMobile) && Boolean(icon) && icon !== 'none',
      })),

    /**
     * Footer ka poora structure — columns, unke text blocks aur unke menu items.
     *
     * Ye `/api/public/menus/:location` se **alag** raasta hai, aur jaan-boojh kar: ek
     * column me text aur menu dono ho sakte hain, to unhe do request me todne ka matlab
     * hota theme me unhe wapas jodna — us jodne me hi column ka order ya width galat
     * hone ki gunjaish banti.
     *
     * Header aur footer dono har page pe hain, isliye ek hi request dono ko serve karti
     * hai — aur cache me ek hi `settings` tag rakhti hai (D-44 §5).
     */
    /**
     * Page ka aakhri CTA card — D-67.
     *
     * **Filter yahan lagta hai, theme me nahi** — wahi soch jo `headerButtons` pe hai
     * (upar). Do cheezein chhanti hain: `enabled: false` wale button, aur wo jinka label
     * ya URL adhoora hai. Adhoora button ek toota hua link hai, aur admin use type karte
     * waqt Save kar sakta hai (schema use block nahi karta) — isliye rok yahan zaroori hai.
     *
     * ⚠️ Yahi wo jagah hai jahan "form abhi bana nahi" wali baat khud-ba-khud sambhal jaati
     * hai: jab tak URL khaali hai, button payload me jaata hi nahi aur page pe dikhta nahi.
     * Form banne pe sirf ek value bharni hai (D-30).
     *
     * `enabled` bahar nahi jaata — theme ko sirf wahi milta hai jo dikhna hai.
     */
    ctaSection: settings.ctaSection?.enabled
      ? {
          badge: settings.ctaSection.badge ?? '',
          heading: settings.ctaSection.heading ?? '',
          bullets: (settings.ctaSection.bullets ?? []).filter(Boolean),
          boxTitle: settings.ctaSection.boxTitle ?? '',
          boxNote: settings.ctaSection.boxNote ?? '',
          buttons: (settings.ctaSection.buttons ?? [])
            .filter((b) => b.enabled && b.label && b.url)
            .map(({ label, url, target, variant }) => ({ label, url, target, variant })),
        }
      : null,

    footerColumns,
    footerLogo,
    footerCopyright: settings.footerCopyright,
    footerNote: settings.footerNote,
    footerDisclaimer: settings.footerDisclaimer,

    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
    currency: settings.currency,

    /**
     * Ye public payload me isliye hai ki iska **kaam hi public rendering hai** — theme
     * isse `<meta name="robots" content="noindex">` nikalta hai. Rendered HTML me ye
     * waise bhi dikh jaata hai, isliye chhupane se kuch milta nahi aur SSR toot-ta hai.
     */
    searchEngineVisible: settings.searchEngineVisible,
  }
}

// ── resolve ──────────────────────────────────────────────────────────────────

/**
 * Ek path pe kya hai — **poore public site ka ekmatra entry point** (D-09, R10).
 *
 * `apps/web` me sirf ek catch-all route hai; wo har URL ke liye yahi poochta hai. Koi
 * per-type hardcoded route nahi hai, kyunki `urlPattern` client badal sakta hai
 * (`contentTypes`) — aur us din hardcoded route jhooth bol raha hota.
 *
 * Teen jawab ho sakte hain:
 *
 * | `kind` | Kab | Web kya kare |
 * | --- | --- | --- |
 * | `redirect` | slug badal chuka hai (D-49) | `301` |
 * | `entry` | page maujood aur publicly visible hai | render |
 * | `null` | kuch nahi | `404` |
 *
 * **Redirect entry se PEHLE dekha jaata hai.** Ulta karne ka matlab hota ki purana path
 * pehle 404 khaaye aur redirect kabhi chale hi na — aur wo tabhi pata chalta jab kisi ka
 * share kiya hua link toota mile.
 */
export async function resolvePublicPath(
  rawPath,
  siteId = DEFAULT_SITE_ID,
  locale = DEFAULT_LOCALE,
) {
  const path = normalizePath(rawPath)

  const redirect = await findRedirect(path, siteId, locale)
  if (redirect) {
    return { kind: 'redirect', to: redirect.to, statusCode: redirect.statusCode }
  }

  const entry = await Entry.findOne({ siteId, locale, path }).lean()

  /**
   * `isPubliclyVisible` `scheduled && publishAt <= now` ko bhi published maanti hai —
   * isse cron band ho jaaye to bhi site sahi rehti hai (R2, self-healing).
   *
   * `private` yahan **nahi** dikhta: wo published hai par sirf logged-in user ke liye
   * (02-ARCHITECTURE §5), aur ye endpoint bina auth ke hai.
   */
  if (!isPubliclyVisible(entry)) return null

  return { kind: 'entry', entry: await toPublicEntry(entry, siteId, locale) }
}

/**
 * Mongo id ka shape sahi hai? `$in` me bekaar string CastError phenkti hai, aur wo public
 * page pe **500** ban jaati — jabki wo sirf ek purana reference hai.
 */
const isObjectId = (v) => /^[0-9a-f]{24}$/i.test(String(v))

/** Taxonomy ids → `{ id, name, slug }` — ek query me, ek-ek karke nahi. */
async function resolveTaxonomies(ids, siteId, locale) {
  const unique = [...new Set((ids ?? []).filter(Boolean))]
  if (unique.length === 0) return []

  const docs = await Taxonomy.find({ _id: { $in: unique }, siteId, locale })
    .select('name slug type')
    .lean()
    .catch(() => [])

  const byId = new Map(docs.map((d) => [String(d._id), d]))

  // Order wahi rakho jo entry me tha — client ne unhe us kram me chuna hai
  return unique
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((d) => ({ id: String(d._id), name: d.name, slug: d.slug }))
}

/**
 * Pricing, hotels aur add-ons — sab **resolve ho kar** jaate hain (spec 007 §4, Slice 5).
 *
 * Theme ko yahan se sidha render karne laayak data milta hai: hotel ka naam aur room,
 * destination ka naam, aur har destination pe kitni raatein. Ye teenon teen alag jagah
 * rehte hain (`hotels` master list · `taxonomies` · itinerary), aur unhe theme me jodne ka
 * matlab hota ki har theme apna lookup likhe (R10 wali soch).
 *
 * **`nights` yahan derive hoti hai, store kahin nahi hai** — `nightsByStay()` se, wahi
 * function jo admin ka preview chalata hai. Isiliye itinerary badalte hi table ki raatein
 * apne aap theek ho jaati hain.
 *
 * ⚠️ Jis row ka hotel ya destination resolve na ho, wo **payload me aati hi nahi**. Yahi
 * D-42 §2 wala invariant hai, ek darja aage: adhoori row bhejne ka matlab hota public
 * table me ek khaali cell — aur wo customer ko dikhta hai.
 */
async function resolvePackageExtras(fields, days, siteId, locale) {
  /**
   * `fields.hotels[]` **override** hai, chunav nahi (D-60).
   *
   * Default har row ka apne aap nikalta hai — us destination aur us category ka jo hotel
   * master list me hai. Ye map tab kaam aata hai jab client ne kisi ek package ke liye koi
   * doosra hotel joda ho.
   */
  const addOnIds = Array.isArray(fields.addOns) ? fields.addOns : []

  const overrides = new Map(
    (Array.isArray(fields.hotels) ? fields.hotels : []).map((row) => [
      String(row.destinationId) + ':' + row.category,
      String(row.hotelId),
    ]),
  )

  /**
   * **Rows itinerary se banti hain** (D-58) — jahan raat rukni hai, wahi jagah, usi kram me.
   *
   * Ek jagah do baar aa sakti hai (Port Blair raat 1 aur raat 5) par hotel ek hi hai, isliye
   * row bhi ek. Yahi farq route strip se hai (D-51).
   */
  const stayIds = []
  for (const day of days) {
    const id = day?.overnightStayId
    if (id && !stayIds.includes(String(id))) stayIds.push(String(id))
  }

  const [hotelDocs, addOnDocs, stays] = await Promise.all([
    stayIds.length
      ? Hotel.find({ destinationId: { $in: stayIds }, siteId })
          .select('name room note destinationId category')
          .sort({ name: 1 })
          .lean()
          .catch(() => [])
      : [],
    addOnIds.length
      ? AddOn.find({ _id: { $in: addOnIds.filter(isObjectId) }, siteId })
          .select('name price where')
          .lean()
          .catch(() => [])
      : [],
    resolveTaxonomies(stayIds, siteId, locale),
  ])

  const addOnById = new Map(addOnDocs.map((d) => [String(d._id), d]))

  const stayById = new Map(stays.map((st) => [st.id, st]))
  const nights = nightsByStay(days)

  /**
   * `pricingSchema.parse()` yahan **dobara** chalti hai, jabki service write pe bhi chalti
   * hai. Ye bekaar nahi hai: Slice 5 se pehle ke package documents me `pricing` hai hi
   * nahi, aur parse unhe poore shape me badal deta hai. Theme ko phir `?? 0` har jagah
   * nahi likhna padta.
   */
  const pricing = pricingSchema.parse(fields.pricing ?? {})
  const categories = pricedCategories(pricing).map((row) => row.category)

  /**
   * Ek jagah aur ek category ka hotel — pehle override, warna master list se.
   *
   * Master list me ek hi jodi pe do hotel ho sakte hain. Us soorat me **naam ke kram me
   * pehla** chunte hain (query `sort({ name: 1 })` pe hai) — koi bhi rule chahiye tha, aur
   * ye kam se kam sthir hai: list me row jodne se doosre packages ka page nahi badalta.
   * Jab client ko wo pasand na ho, wahi ek jagah hai jahan override kaam aata hai.
   */
  const pickHotel = (destinationId, category) => {
    const overrideId = overrides.get(`${destinationId}:${category}`)
    if (overrideId) {
      const chosen = hotelDocs.find((h) => String(h._id) === overrideId)
      if (chosen) return chosen
    }

    return hotelDocs.find(
      (h) => String(h.destinationId) === destinationId && h.category === category,
    )
  }

  const hotels = []
  for (const category of categories) {
    for (const destinationId of stayIds) {
      const destination = stayById.get(destinationId)
      const hotel = pickHotel(destinationId, category)

      /**
       * Jis jodi ka koi hotel hai hi nahi, uski row table me nahi aati — na khaali cell, na
       * "TBD". Wahi invariant jo D-42 §2 ne media pe lagaya tha.
       */
      if (!destination || !hotel) continue

      hotels.push({
        id: `${destinationId}:${category}`,
        category,
        destination,
        /** Nights itinerary se derive hoti hai, store kahin nahi (`nightsByStay()`). */
        nights: nights[destinationId] ?? 0,
        name: hotel.name,
        room: hotel.room ?? '',
        /** Table ka Note column, aur catbar ke card ki beech wali line (D-57 §2). */
        note: hotel.note ?? '',
      })
    }
  }

  return {
    pricing: {
      /**
       * **Sirf wo categories jinka daam bhara hua hai**, sasti se mehngi ke kram me.
       *
       * Jiska daam khaali hai wo category is package pe milti hi nahi (D-57), isliye wo
       * payload me aati hi nahi — theme ko har jagah `priceFrom != null` likhne ki zaroorat
       * na pade, aur ek jagah chhoot jaane pe bina daam ka card na dikhe.
       */
      categoryPricing: pricedCategories(pricing),

      /** Page ke upar ka daam — sabse sasti category (§6). Theme ise derive nahi karta. */
      from: cheapestPricing(pricing),
    },

    hotels,

    /**
     * Kram wahi jo client ne chuna tha — list ka apna sort yahan nahi lagta.
     *
     * Ye `packageDefaults` me **nahi** hai (wahan D-61 me thoda waqt raha tha): ab ye har
     * package ka apna chunav hai, aur uska cache tag bhi usi entry ka hai.
     */
    addOns: addOnIds
      .map((id) => addOnById.get(String(id)))
      .filter(Boolean)
      .map((d) => ({
        id: String(d._id),
        name: d.name,
        price: d.price ?? '',
        where: d.where ?? '',
      })),
  }
}

/**
 * Public entry payload — **admin ka shape nahi** (02-ARCHITECTURE §10).
 *
 * Yahan se `version`, `deletedAt`, `searchText`, `authorId` aur `templateId` bahar nahi
 * jaate. Ye sirf safai nahi hai: `searchText` me poora page ka flattened text hota hai,
 * yaani wo payload ko lagbhag do guna kar deta hai aur render me kabhi use nahi hota.
 *
 * **References resolve ho kar jaate hain** (R10) — theme ko kabhi id se naam dhoondhne
 * ki zaroorat nahi padni chahiye, warna har theme apna lookup likhta hai.
 */
/**
 * Similar itineraries — spec 007 §9 #15 ka jawab: **apne aap chunte hain** (client, 1 Sep).
 *
 * Niyam ek line ka hai: _wahi package jinke `nights` **aur** `days` dono is package jaise
 * hain, khud ko chhod kar._ Client ne dono maange (`5N/6D = 5N/6D`), sirf days nahi — 5N/6D
 * aur 4N/6D ek jaise nahi hain, aur "same days" wali list me wo ghus jaata.
 *
 * Yahan **koi naya field nahi bana**. Wahi soch jo route strip (D-51) aur hotels table
 * (D-58/D-60) pe hai: jo package pe pehle se hai use dobara mat poochho. Client ko "similar
 * packages" chunne ka koi kaam nahi karna padta, aur naya package jodte hi wo apne aap
 * purane packages ke page pe aa jaata hai.
 *
 * ## Card ka poora maal derived hai
 *
 * Route stays se, chips nights/days + transfers + meals se, daam sabse sasti category se.
 * Ek bhi cheez alag se stored nahi hai.
 *
 * ## Cap 12 kyun
 *
 * Theme teen-teen ke page banata hai (client: "1, 2, 3 button pagination"). 12 pe wo chaar
 * page ban jaate hain — itni same-duration packages waise hi kam hoti hain, par cap ke bina
 * ek din 60 package wali site pe har package ka payload chup-chaap dus guna ho jaata. Wahi
 * soch jo `itineraryImages` aur `reviews` ke cap pe hai.
 *
 * ⚠️ `status` ka filter yahan **query me** hai, `isPubliclyVisible()` se nahi: wo ek
 * document pe chalti hai, aur yahan list chahiye. Dono ka matlab ek hi rakha gaya hai —
 * `published`, ya `scheduled` jiska waqt aa chuka (R2 wala self-healing).
 */
async function resolveSimilarPackages(doc, siteId, locale) {
  const { nights, days } = doc.fields ?? {}

  /**
   * Jis package pe nights/days likhe hi nahi, uske liye "same duration" ka koi matlab nahi.
   * Bina is guard ke `null === null` sab adhoore packages ko ek doosre ka similar bana deta.
   */
  if (nights == null || days == null) return []

  const now = new Date()
  const docs = await Entry.find({
    siteId,
    locale,
    type: doc.type,
    deletedAt: null,
    _id: { $ne: doc._id },
    'fields.nights': nights,
    'fields.days': days,
    $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: now } }],
  })
    .sort({ updatedAt: -1 })
    .limit(12)
    .lean()

  if (!docs.length) return []

  /**
   * Saare candidates ke stays **ek query me** — har card ke liye alag call ka matlab hota
   * bara round trip ek page render pe. Wahi tark jo `findItemsByIds()` pe likha hai.
   */
  const allStayIds = docs.flatMap((d) =>
    (Array.isArray(d.fields?.itinerary) ? d.fields.itinerary : []).map(
      (day) => day.overnightStayId,
    ),
  )
  /** Har candidate ka pehla Package Type — image ke upar wala badge (client, 2 Sep). */
  const allTypeIds = docs.flatMap((d) => d.taxonomies?.packageTypes ?? [])

  const [stays, types] = await Promise.all([
    resolveTaxonomies(allStayIds, siteId, locale),
    resolveTaxonomies(allTypeIds, siteId, locale),
  ])
  const stayById = new Map(stays.map((s) => [s.id, s]))
  const typeById = new Map(types.map((t) => [t.id, t]))

  return Promise.all(
    docs.map(async (d) => {
      const fields = d.fields ?? {}
      const itinerary = Array.isArray(fields.itinerary) ? fields.itinerary : []
      const pricing = pricingSchema.parse(fields.pricing ?? {})

      return {
        id: String(d._id),
        title: d.title,
        path: d.path,
        /** `medium` — card ka thumbnail hai, hero nahi. */
        banner: await toDisplayImage(fields.bannerImage, 'medium', siteId),
        nights: fields.nights,
        days: fields.days,
        /** Route — reference ka `Port Blair → Havelock → Neil`, stays ke kram me. */
        route: routeStrip(itinerary)
          .map((leg) => stayById.get(leg.stayId)?.name)
          .filter(Boolean),
        /**
         * `Ferry` ka chip **`ferriesNote` bhare hone pe** aata hai (client, 2 Sep) — itinerary
         * ke transfers se nahi.
         *
         * ⚠️ Pehle ye transfers se banta tha, aur wo galat tha. Transfer ek **free list** hai
         * (client `Private cab`, `Catamaran`, kuch bhi likh sakta hai), to "ye ferry hai" wahan
         * se pehchanna bharosemand nahi. `ferriesNote` (`3 legs, included`) client ka saaf
         * jawab hai ki is package me ferry hai ya nahi — wahi D-53 wali wajah jiske liye wo
         * field banaya gaya tha.
         *
         * Note ka **text** card pe nahi jaata — wo poora vaakya hai aur chip me nahi bharta.
         * Yahan bas "hai ya nahi" chahiye.
         */
        hasFerries: Boolean(fields.ferriesNote?.trim()),

        /** `Breakfast` ka chip — itinerary ke kisi bhi din breakfast ho to. */
        hasBreakfast: itinerary.some((day) =>
          (Array.isArray(day.meals) ? day.meals : []).includes('breakfast'),
        ),

        /** Image ke upar ka badge — pehla Package Type (`HONEYMOON`, `2 DIVES`). */
        tag: typeById.get((d.taxonomies?.packageTypes ?? [])[0])?.name ?? '',

        /**
         * `first-timers on a short break` — route ke neeche wali line (client, 2 Sep).
         *
         * Ye field D-55 me isi kaam ke liye bana tha ("ye **listing card** pe dikhta hai,
         * package page pe nahi") — par similar cards bhi wahi listing card hain, aur wahan
         * ye chhoot gaya tha.
         */
        bestFor: fields.bestFor ?? '',
        /** Sabse sasti category — wahi jo us package ke apne page ke upar chhapta hai. */
        from: cheapestPricing(pricing),
      }
    }),
  )
}

async function toPublicEntry(doc, siteId, locale) {
  const fields = doc.fields ?? {}
  const days = Array.isArray(fields.itinerary) ? fields.itinerary : []

  const [destinations, packageTypes, banner, transfers] = await Promise.all([
    resolveTaxonomies(doc.taxonomies?.destinations, siteId, locale),
    resolveTaxonomies(doc.taxonomies?.packageTypes, siteId, locale),
    toDisplayImage(fields.bannerImage, 'large', siteId),
    Transfer.find({ siteId })
      .select('name icon')
      .lean()
      .catch(() => []),
  ])

  const stayIds = days.map((d) => d.overnightStayId)
  const [stays, extras, similar] = await Promise.all([
    resolveTaxonomies(stayIds, siteId, locale),
    resolvePackageExtras(fields, days, siteId, locale),
    resolveSimilarPackages(doc, siteId, locale),
  ])
  const stayById = new Map(stays.map((s) => [s.id, s]))
  const transferById = new Map(
    transfers.map((t) => [String(t._id), { id: String(t._id), name: t.name, icon: t.icon }]),
  )

  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    slug: doc.slug,
    path: doc.path,
    excerpt: doc.excerpt ?? '',
    content: doc.content ?? { version: 1, blocks: [] },
    seo: doc.seo ?? {},
    updatedAt: doc.updatedAt ?? null,

    banner,
    destinations,
    packageTypes,

    fields: {
      shortDescription: fields.shortDescription ?? '',
      nights: fields.nights ?? null,
      days: fields.days ?? null,
      bestSeason: fields.bestSeason ?? '',
      bestFor: fields.bestFor ?? '',
      ferriesNote: fields.ferriesNote ?? '',
      featured: Boolean(fields.featured),
      seoSchema: Boolean(fields.seoSchema),
    },

    /** Har din ke references resolve ho kar jaate hain — theme ko lookup nahi karna padta. */
    itinerary: days.map((day) => ({
      id: day.id,
      title: day.title,
      description: day.description ?? '',
      meals: day.meals ?? [],
      dayTag: day.dayTag ?? '',
      note: day.note ?? '',
      transferNote: day.transferNote ?? '',
      stay: stayById.get(day.overnightStayId) ?? null,
      transfer: transferById.get(day.transferId) ?? null,
    })),

    /**
     * Route strip **server pe** banti hai, theme me nahi.
     *
     * `routeStrip()` `packages/shared` me hai aur admin ka preview bhi wahi chalata hai —
     * do jagah rakhne ka matlab hota ki admin kuch aur dikhaye aur live page kuch aur
     * (D-43 §2, D-51).
     */
    routeStrip: routeStrip(days).map((leg) => ({
      ...leg,
      stay: stayById.get(leg.stayId) ?? null,
    })),

    /**
     * FAQs — jaisi ki waisi (spec 007 §2). Isme koi reference nahi hai, isliye yahan
     * resolve karne ko kuch nahi; sirf khaali sawaal gir jaate hain.
     *
     * Khaali `question` wali row page pe ek aisa accordion banati jo khulta to hai par
     * usme kuch likha hi nahi hota.
     */
    faqs: (Array.isArray(fields.faqs) ? fields.faqs : [])
      .filter((faq) => faq?.question)
      .map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer ?? '' })),

    /**
     * Pricing · hotels · add-ons — teenon resolve ho kar (spec 007 §4).
     *
     * `fields` ke andar **nahi** rakhe gaye, jaan-boojh kar: `fields` wo hai jo entry pe
     * jaisa ka waisa likha hai, aur ye teen us se alag hain — inme dusri collections ka
     * data ghula hua hai (hotel ka naam, destination, derived nights). Ek jagah milaane ka
     * matlab hota ki theme ko pata hi na chale ki kya stored hai aur kya banaya gaya.
     */
    pricing: extras.pricing,
    hotels: extras.hotels,
    addOns: extras.addOns,

    /**
     * Similar itineraries — poori tarah derived, koi field nahi (spec 007 §9 #15).
     *
     * `fields` ke bahar hai, wahi wajah jo upar teen pe likhi hai: ye entry pe stored nahi
     * hai, banaya gaya hai.
     *
     * ⚠️ Iska cache tag `entry:{id}` hai — yaani naya package publish hone pe purane
     * packages ke page tab tak stale rehte hain jab tak unka apna tag saaf na ho. Aaj
     * `type:package` bhi revalidate hota hai (entries service publish pe), isliye ye theek
     * chalta hai; agar kabhi wo tag hata to ye section peeche reh jaayega.
     */
    similar,
  }
}

/**
 * Packages ke globals — har package page pe wahi (spec 007 §1.8).
 *
 * Alag call isliye nahi ki ye entry ke saath hi chahiye — par iska **cache tag alag** hai
 * (`type:package`, kisi ek entry ka nahi). Ise entry ke payload me ghusa dene ka matlab
 * hota ki ek package ka `entry:{id}` tag saaf karne pe ye stale hi rehta.
 */
export async function getPublicPackageDefaults(siteId = DEFAULT_SITE_ID) {
  const doc = await ensurePackageDefaults(siteId)

  const [images, enquiryForm] = await Promise.all([
    Promise.all((doc.itineraryImages ?? []).map((id) => toDisplayImage(id, 'medium', siteId))),
    getPublicPackageForm(siteId),
  ])

  return {
    whatsIncluded: {
      included: doc.whatsIncluded?.included ?? [],
      excluded: doc.whatsIncluded?.excluded ?? [],
    },
    bookingSteps: doc.bookingSteps ?? [],

    /**
     * ⚠️ Ye payload me **chhoot gaya tha** (31 Aug ko pakda).
     *
     * `PackagePage.jsx` do jagah `defaults.cancellationText` padhta hai — "Good to know"
     * section ki shart me, aur uske andar ki `<p>` me. Par projection ise bhejti hi nahi
     * thi, to client jo cancellation policy admin me likhta tha wo page pe **kabhi nahi**
     * aati thi, aur "Good to know" sirf tab dikhta tha jab booking steps bhi hon.
     *
     * Bilkul wahi shakl jo D-64 wale transfer-duration bug ki thi: admin me text bhara hua
     * dikhta hai, page pe kuch nahi, aur kahin koi error nahi.
     */
    cancellationText: doc.cancellationText ?? '',

    /** Jo media resolve na ho wo gir jaati hai — toota hua `<img>` kabhi nahi (D-42 §2). */
    itineraryImages: images.filter(Boolean),

    sectionLabels: resolveSectionLabels(doc.sectionLabels),

    /**
     * `4.9 average from 412 trips` — client haath se likhta hai (spec 007 §9 #8 ka jawab).
     *
     * Reviews ginn kar **nahi** banti. Ginne ka natija ulta hota: page pe likhi hui teen-chaar
     * review ka average dikhta, jabki asli number saalon ki trips ka hai.
     *
     * `value: 0` ka matlab hai "rating dikhani hi nahi" — theme dono jagah se line hata deta
     * hai (hero aur reviews ka heading). Purane document me ye key hai hi nahi, aur wo bhi
     * yahi natija deta hai — isliye migration 016 ne data ko haath nahi lagaya.
     */
    rating: {
      value: doc.rating?.value ?? 0,
      count: doc.rating?.count ?? 0,
    },

    /**
     * Traveller reviews — **universal**, har package pe wahi (client, 1 Sep).
     *
     * Yahan hain, entry ke payload me nahi: ye kisi ek package ka data nahi hai, aur inka
     * cache tag `type:package` hai — wahi jo baaki globals ka. Entry ke payload me ghusa
     * dene ka matlab hota ki ek review badalne pe har package ka `entry:{id}` tag alag se
     * saaf karna padta.
     *
     * Kram service ke registry se hi aata hai — **nayi trip pehle** (`month` ulta). Theme
     * pehle teen card dikhata hai aur baaki slider me; dono ke liye poori list chahiye.
     *
     * Cap 200 hai: itni reviews aane par bhi payload ~60KB rehta hai, par ek din list badh
     * jaane pe page ka payload chup-chaap 10x nahi hona chahiye. Ye limit `itineraryImages`
     * wali hi soch hai.
     */
    /**
     * Sidebar ka enquiry form — jo form `active` hai aur `packages` pe laga hai.
     *
     * ⚠️ Ye `packageDefaults` ka field **nahi** hai; wo apni `forms` collection me hai. Yahan
     * bhejne ki wajah cache hai: is endpoint ka tag `type:package` hai — theek wahi tag jo
     * form badalne pe revalidate hota hai — aur har package page pe yahi ek form chhapta hai.
     * Ek alag endpoint ka matlab hota har page render pe ek aur round trip, us data ke liye
     * jo isi tag ke saath aata-jaata hai.
     *
     * Koi active form na ho to `null` — theme sidebar me sirf "Talk to a planner" dikhata
     * hai, ek khaali dabba nahi (D-30).
     */
    enquiryForm,

    reviews: (
      await Review.find({ siteId }).sort({ month: -1, createdAt: -1 }).limit(200).lean()
    ).map((r) => ({
      id: String(r._id),
      rating: r.rating,
      month: r.month ?? '',
      text: r.text,
      name: r.name,
      lastLine: r.lastLine ?? '',
    })),
  }
}
