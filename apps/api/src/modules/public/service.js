import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  LONG_STAY_FROM,
  POST_LIST_CAP,
  TOC_MIN_HEADINGS,
  cheapestPricing,
  durationBucket,
  extractBlockText,
  htmlToText,
  isEmptyHtml,
  isPubliclyVisible,
  nightsByStay,
  normalizePath,
  pricedCategories,
  pricingSchema,
  readingMinutes,
  resolveSectionLabels,
  routeStrip,
  withHeadingIds,
} from '@cms/shared'

import { env } from '../../core/env.js'
import { Entry } from '../entries/model.js'
import { getPublicFormById, getPublicPackageForm } from '../forms/service.js'
import { AddOn, Hotel, Review, Transfer } from '../master-lists/model.js'
import { Media } from '../media/model.js'
import { toPublicMedia } from '../media/service.js'
import { getPublicMenuById } from '../menus/service.js'
import { ensurePackageDefaults } from '../package-defaults/service.js'
import { findRedirect } from '../redirects/service.js'
import { getSettings } from '../settings/service.js'
import { getSidebarWidgets } from '../sidebars/service.js'
import { Taxonomy } from '../taxonomies/model.js'
/** Byline ka author — sirf `name`, aur wo bhi D-87 ke faisle #9 ke liye (R10). */
import { User } from '../users/model.js'

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
    srcset: toSrcset(media.variants),
  }
}

/**
 * `srcset` — **teenon variant ek hi string me**, theme ke liye ready.
 *
 * Yahan tak `url` ek hi variant ki jaati thi, aur wo har jagah ek jaisi thi: phone pe bhi
 * 800px wali `medium`, jabki similar card ka slot 150px ka hai. Browser ko chunne ka mauka
 * hi nahi mila tha — aur chunna wahi sabse achha kar sakta hai, kyunki DPR aur asli layout
 * width sirf usi ko pata hai.
 *
 * String yahan (server pe) banti hai, theme me nahi. Wajah wahi hai jo `toSectionLabels()`
 * (D-65) pe thi: variant ka URL kaise banta hai ye media module ka bhed hai, aur theme ko wo
 * jodna sikhaane ka matlab hota ki kal variant ka naam badle to do repo badalne padein.
 *
 * ⚠️ **Width se dedupe zaroori hai.** `generateWebpVariants` me `withoutEnlargement: true`
 * hai — yaani 500px chaudi original pe `medium` aur `large` **dono** 500px bante hain. Bina
 * dedupe ke `srcset` me ek hi width do baar jaati, jo galat to nahi par bemaani hai.
 *
 * @param {{ url?: string, w?: number }[]} variants
 * @returns {string | null} `null` jab jodne laayak ek se kam variant ho
 */
function toSrcset(variants) {
  const seen = new Set()
  const parts = []

  for (const v of variants ?? []) {
    if (!v?.url || !v?.w || seen.has(v.w)) continue

    seen.add(v.w)
    parts.push(`${v.url} ${v.w}w`)
  }

  // Ek hi variant pe `srcset` dena bekaar hai — `src` wahi kaam kar deta hai
  return parts.length > 1 ? parts.join(', ') : null
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

    /**
     * Hero ke neeche ki trust line — `.vhero__trust`, `Settings ▸ Tour settings` se (D-87 #11).
     *
     * **`settings` me hai kyunki client ne ise global kaha** — wahi lakeer jo `ctaSection`
     * (D-67) pe hai. Isiliye ye page ke payload me **nahi** jaata: hero package page pe bhi
     * hai, aur dono jagah bhejne ka matlab hota ek hi cheez do jagah.
     *
     * Filter yahan lagta hai, theme me nahi — bina text wala badge ek khaali `<span>` banata
     * hai jiske dono taraf separator dikhte hain (wahi soch jo `headerButtons` pe hai).
     */
    trustBadges: (settings.tourSettings?.trustBadges ?? [])
      .filter((badge) => badge?.text)
      .map(({ id, icon, text }) => ({ id, icon, text })),

    /**
     * Blog ka author — `Settings ▸ Blog settings` (spec 008).
     *
     * ⚠️ **Yahan hai, post ke card pe nahi.** Har post pe wahi ek naam hai; use 60 cards pe
     * dohraana payload me fizool hai, aur do jagah rakhne ka matlab hota ki ek din wo alag ho
     * jaayein (D-86). Post ke apne payload me wo phir bhi jaata hai — wahan `bio` bhi chahiye
     * hoti hai (`.authorbox`), jo listing pe kabhi nahi dikhti.
     *
     * ⚠️ **`showToc` aur `postSidebarId` yahan NAHI hain** — wo faisle server pe lag chuke
     * hote hain (`toPublicPost()` khaali `toc[]` bhejti hai, aur sidebar resolve karke). Theme
     * ko koi niyam yaad nahi rakhna chahiye; wahi tark jo `sidebarId` pe D-88 me tha.
     */
    blogAuthor: settings.blogSettings?.author?.name
      ? {
          name: settings.blogSettings.author.name,
          role: settings.blogSettings.author.role ?? '',
        }
      : null,

    /**
     * Site ka apna pata — **structured data aur share links dono ko chahiye** (spec 008).
     *
     * ⚠️ **Ye pehle se maan liya gaya tha, par bhejta koi nahi tha.** `TourSchema.jsx` 8 Sep se
     * `process.env.NEXT_PUBLIC_SITE_URL ?? settings?.siteUrl` padh raha hai — aur us `??` ka
     * daayan hissa **kabhi chala hi nahi**, kyunki ye key payload me thi hi nahi. Yaani jis
     * instance pe `NEXT_PUBLIC_SITE_URL` set nahi hai, wahan schema ke saare absolute URL
     * chup-chaap `undefined` ho kar gir jaate the.
     *
     * Wahi shakl jo D-89 me baar-baar mili: bana hua, par juda nahi — aur uska lakshan sirf
     * "kuch na hona".
     *
     * ⚠️ **`env.SITE_URL` se, koi naya var nahi.** Wo pehle se required hai (revalidate ka
     * target). Doosra var banane ka matlab hota ek hi pata do jagah, aur ek din wo alag ho
     * jaate (D-86).
     */
    siteUrl: env.SITE_URL,

    /**
     * Hero ka button — `.vhero__cta` (client, 8 Sep).
     *
     * ⚠️ **Adhoora button `null` ban jaata hai, aur wo chhaanti yahan hoti hai, theme me nahi.**
     * Bina `url` ke wo ek aisa button hai jo click pe kuch nahi karta, aur bina `label` ke ek
     * khaali dabba. Dono soorat me wo dikhna hi nahi chahiye (D-30) — wahi rok jo D-67 ke
     * khaali URL wale button pe hai.
     *
     * ⚠️ WhatsApp wala doosra button yahan **nahi** hai: uska number `whatsapp` me upar pehle se
     * jaata hai (Settings ▸ General). Ek hi number do jagah bhejne ka matlab hota ki ek din wo
     * alag ho jaate — 2 Sep ko `settings.contactEmail` pe theek yahi palta gaya tha.
     */
    heroButton:
      settings.tourSettings?.heroButton?.label && settings.tourSettings?.heroButton?.url
        ? {
            label: settings.tourSettings.heroButton.label,
            url: settings.tourSettings.heroButton.url,
          }
        : null,

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

  /**
   * Type ke hisaab se do alag projection — D-87.
   *
   * ⚠️ **Pehle ye branch thi hi nahi**, aur `toPublicEntry()` har type pe chalti thi. Wo poori
   * tarah package-shaped hai: ek `page` resolve karne pe bhi chaar taxonomy query, ek
   * `Transfer.find()` aur `resolveSimilarPackages()` ka poora daur chalta tha — sirf khaali
   * arrays banane ke liye. Aaj tak wo chhupa raha kyunki `page` ka koi template hi nahi tha
   * (A-9), to us payload ko koi padhta hi nahi tha.
   *
   * Naye types ke liye `PAGE_TYPES` me jodna hai — `type === 'page'` jaisa check har jagah
   * bikhraana wahi hardcoding hai jise D-09 ne mana kiya tha.
   */
  /**
   * ⚠️ **`post` ki apni branch hai, `PAGE_TYPES` me nahi** (spec 008). Uske paas prev/next,
   * related aur TOC hain jo kisi page ke paas nahi — poora tark `toPublicPost()` ke sar pe.
   */
  const entryPayload =
    entry.type === 'post'
      ? await toPublicPost(entry, siteId, locale)
      : PAGE_TYPES.has(entry.type)
        ? await toPublicPage(entry, siteId, locale)
        : await toPublicEntry(entry, siteId, locale)

  return { kind: 'entry', entry: entryPayload }
}

/**
 * Wo types jinka payload page-shaped hai, package-shaped nahi (D-87).
 *
 * ⚠️ `blogPage` spec 008 me juda — wo `tourPage` jaisa hi hai, bas uske blocks me
 * `packageList` ki jagah `postList` hota hai. `post` yahan **nahi** hai: uska payload dono se
 * alag hai (`toPublicPost()`).
 */
const PAGE_TYPES = new Set(['page', 'tourPage', 'blogPage'])

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
async function resolveSimilarPackages(doc, siteId, locale, limit, defaultRating) {
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
    .limit(limit)
    .lean()

  if (!docs.length) return []

  return toPackageCards(docs, siteId, locale, defaultRating)
}

/**
 * Package docs ki list → listing cards (`.prow`).
 *
 * ⚠️ **Ye `resolveSimilarPackages` ke andar se nikaala gaya hai** (D-87). Wahan ye inline tha
 * aur theek chalta tha — par tour page ka `Package list` block **bilkul wahi card** chahta
 * hai, aur do copies rakhne ka matlab hota ki kal koi ek jagah `bestFor` jode aur doosri
 * jagah bhool jaaye. Theek wahi ho chuka hai: `bestFor` similar cards pe **chhoot gaya tha**
 * aur 2 Sep ko alag se jodna pada.
 *
 * Stays aur types **ek-ek query me** aate hain, har card ke liye alag nahi — wahi tark jo
 * `findItemsByIds()` pe likha hai.
 */
async function toPackageCards(docs, siteId, locale, defaultRating) {
  if (!docs.length) return []

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

        /**
         * `4.8 ★ 214 reviews` — package ki apni, warna site wali (D-87 §3).
         *
         * Fallback **yahan** lagta hai, write pe nahi: store wahi hota hai jo client ne likha,
         * warna default badalne pe purane package apni purani value pe atke rehte (D-65).
         */
        rating: resolveRating(fields.rating, defaultRating),
      }
    }),
  )
}

/**
 * Package ki apni rating, warna site wali — D-87 §3.
 *
 * ⚠️ **Khaali `value` (0) "mat dikhao" nahi hai, "site wali chalao" hai.** D-70 me wo "mat
 * dikhao" tha, aur wo matlab per-package field pe nahi chal sakta: paanchon live package pe
 * `fields.rating` hai hi nahi, aur us matlab ka nateeja hota ki deploy karte hi paanchon page
 * se rating gayab ho jaaye. Dono khaali hon tabhi line gayab hoti hai.
 */
function resolveRating(own, fallback) {
  const value = Number(own?.value) || 0
  if (value > 0) return { value, count: Number(own?.count) || 0 }

  return { value: Number(fallback?.value) || 0, count: Number(fallback?.count) || 0 }
}

// ── blog (spec 008) ──────────────────────────────────────────────────────────

/**
 * Ek published post ki shart — **teen jagah wahi ek**.
 *
 * ⚠️ `status: 'published'` akela **galat** hai: ek scheduled post jiska waqt aa chuka hai wo
 * bhi public hai (R2 ka self-healing — cron use baad me `published` karti hai, par wo tab tak
 * live hai). Sirf `published` maangne se aisa post listing se, prev/next ki chain se aur
 * related se **gayab** ho jaata, aur wo failure bilkul chup hoti.
 *
 * `resolvePackageListBlock()` ye pehle se karta hai; yahan wo ek jagah nikaal di gayi hai
 * kyunki blog me isi shart ki **chaar** jagah zaroorat hai (list · prev · next · related).
 */
const publiclyVisibleQuery = (now = new Date()) => ({
  deletedAt: null,
  $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: now } }],
})

/**
 * Post docs → listing cards (`.bp` aur `.fcard`, dono reference pages pe).
 *
 * ⚠️ **Ek hi card builder, teen jagah** — `postList` ki grid, `Start here` ke featured, aur
 * `Related reading`. `toPackageCards()` ke sar pe likha hua sabak yahan pehle se laga hua hai:
 * do copies ka nateeja ho chuka hai (`bestFor` similar cards pe chhoot gaya tha, aur `Similar`
 * har card pe ek hi global rating dikhata tha).
 *
 * ⚠️ **Author card pe nahi jaata.** Wo `blogSettings.author` se aata hai aur har post pe wahi
 * hai — 60 cards pe wahi string dohraana payload me fizool hai, aur do jagah rakhne ka matlab
 * hota ki ek din wo alag ho jaayein (D-86). Theme use `settings` se ek baar padhti hai.
 *
 * Categories **ek query me** aati hain, har card ke liye alag nahi — wahi tark jo
 * `toPackageCards()` ke stays/types pe hai.
 */
async function toPostCards(docs, siteId, locale) {
  if (!docs.length) return []

  const categories = await resolveTaxonomies(
    docs.flatMap((d) => d.taxonomies?.categories ?? []),
    siteId,
    locale,
  )
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return Promise.all(
    docs.map(async (d) => ({
      id: String(d._id),
      title: d.title,
      path: d.path,
      excerpt: d.excerpt ?? '',

      /** `medium` — card ka thumbnail hai, hero nahi. */
      banner: await toDisplayImage(d.featuredImageId, 'medium', siteId),

      /**
       * Image ke upar ka badge — **pehli** category (`.bcat`).
       *
       * ⚠️ Badge ka **rang** payload me nahi hai. Reference me chaar variant hain
       * (`bcat--b`/`--g`/`--d`/plain) aur wo presentation hai — theme use category ki id se
       * deterministically chunegi, taaki ek category ka rang har jagah wahi rahe. Uske liye
       * taxonomy pe ek `color` field banana client ko ek aisa faisla dena hota jo uska nahi
       * hai (wahi tark jo `showBadges` pe laga tha).
       */
      category: categoryById.get((d.taxonomies?.categories ?? [])[0]) ?? null,

      /**
       * ⚠️ **`publishAt`, `createdAt` nahi.** `publishEntry()` publish pe wo hamesha bharta
       * hai, aur blog ka poora kram (list · prev/next · `datePublished`) isi ek field pe hai.
       * Do alag tareekhein dikhaane ka matlab hota ki card kuch kahe aur schema kuch aur.
       */
      publishedAt: d.publishAt ?? null,
      updatedAt: d.updatedAt ?? null,

      /** `8 min read` — 200 shabd/minute, poore content se (FAQ blocks samet). */
      readMinutes: readingMinutes(htmlToText(extractBlockText(d.content?.blocks ?? []))),
    })),
  )
}

/**
 * Prev / Next — padhne ki chain (`.pn`, `blog-detail-v1.html`).
 *
 * ## Kram aur matlab
 *
 * Kram wahi hai jo listing ka hai — `publishAt` desc. **Previous = purana**, **Next = naya**.
 * Sabse naye post pe `next` `null` hota hai aur sabse purane pe `prev` — theme us taraf kuch
 * render nahi karti (D-30, wahi invariant jo logo aur `.wdgl` pe hai). Ek hi post ho to dono
 * `null` aur poora `.pn` gayab.
 *
 * ## ⚠️ Tie ka pehra — ye sirf ek "edge case" nahi hai
 *
 * Do post ka `publishAt` ek hi second pe ho sakta hai (do publish ek saath, ya bulk import).
 * Akela `$lt`/`$gt` un dono ko **chhod deta hai**, yaani chain beech me se toot jaati. Isliye
 * cursor compound hai — `publishAt` barabar ho to `_id` faisla karta hai. Tab kram **total**
 * rehta hai aur do post ke beech loop nahi banta.
 *
 * ⚠️ Do `$or` ek saath hain (visibility ka aur cursor ka), isliye `$and` me lapetna **zaroori**
 * hai — Mongo me doosra `$or` pehle ko chup-chaap overwrite kar deta hai.
 *
 * ## Scan nahi hai
 *
 * Dono taraf ek-ek `findOne` + sort, aur wo maujooda index se chalti hai
 * (`{siteId, type, status, publishAt: -1}`, migration 001). Poori list kabhi nahi uthti —
 * `PACKAGE_LIST_SCAN_CAP` wali problem yahan aati hi nahi.
 */
async function resolvePostNav(doc, siteId, locale) {
  /**
   * `publishAt` na ho to chain me is post ki koi jagah hi nahi. Aisa aam taur pe hota nahi
   * (`publishEntry()` use hamesha bharta hai), par read ko apne bharose pe khada hona chahiye —
   * wahi wajah jo `resolveBreadcrumbs()` ki depth cap pe likhi hai.
   */
  if (!doc.publishAt) return { prev: null, next: null }

  /**
   * `$or` ko alag nikaala gaya hai kyunki neeche uski **doosri** zaroorat hai (cursor), aur
   * ek query me do top-level `$or` nahi ho sakte — doosra pehle ko chup-chaap kha jaata hai.
   */
  const { $or: visible, ...scope } = { siteId, locale, type: 'post', ...publiclyVisibleQuery() }

  const step = (direction) => {
    const op = direction === -1 ? '$lt' : '$gt'

    return Entry.findOne({
      ...scope,
      $and: [
        { $or: visible },
        {
          $or: [
            { publishAt: { [op]: doc.publishAt } },
            { publishAt: doc.publishAt, _id: { [op]: doc._id } },
          ],
        },
      ],
    })
      .sort({ publishAt: direction, _id: direction })
      .select('title path')
      .lean()
  }

  const [prev, next] = await Promise.all([step(-1), step(1)])

  const toLink = (d) => (d ? { id: String(d._id), title: d.title, path: d.path } : null)

  return { prev: toLink(prev), next: toLink(next) }
}

/**
 * `Related reading` — usi category ke post (`blog-detail-v1.html`).
 *
 * **Poori tarah derived, koi field nahi** — wahi model jo `resolveSimilarPackages()` ka hai.
 *
 * ⚠️ **Us category me do hi post hon to do hi aayenge.** Kisi aur category se bhar kar chaar
 * karne ka matlab hota ek "Related reading" jo related hai hi nahi — aur wo chhoti list se
 * bura hai (D-30).
 *
 * ⚠️ Reference me teen card hain, client ne **chaar** kaha (9 Sep) — client jeeta (R15).
 * `.bpg` ka grid `auto-fit` hai, to dono chalte hain.
 */
async function resolveRelatedPosts(doc, siteId, locale, limit) {
  const categoryId = (doc.taxonomies?.categories ?? [])[0]

  /**
   * Bina category wale post ka koi "related" nahi hota. Bina is guard ke `undefined` khud ek
   * kasauti ban jaata aur har bina-category post doosre ka related ban jaata — theek wahi jaal
   * jo `resolveSimilarPackages()` ke `nights == null` guard ne roka tha.
   */
  if (!categoryId) return []

  const docs = await Entry.find({
    siteId,
    locale,
    type: 'post',
    _id: { $ne: doc._id },
    'taxonomies.categories': categoryId,
    ...publiclyVisibleQuery(),
  })
    .sort({ publishAt: -1, _id: -1 })
    .limit(limit)
    .lean()

  return toPostCards(docs, siteId, locale)
}

/**
 * `Package list` block ek baar me kitne packages **dekhta** hai (cards se alag).
 *
 * Cards `props.limit` (max 60) tak hi jaate hain, par facets ki ginti poori filtered list pe
 * honi chahiye — warna `2N / 3D [3]` jhootha ho jaata jab chauthaa package limit se bahar
 * chhoot jaaye. Isliye query pehle sab uthati hai, phir ginti hoti hai, phir slice.
 *
 * 200 ek chhat hai, target nahi: site pe aaj **paanch** package hain. Iske bina ek din
 * 5000-package wali site pe ek page render poora collection memory me le aata.
 */
/**
 * Duration ke pills aur unki ginti — `.fbar`.
 *
 * ⚠️ **Ginti derive hoti hai, store nahi** — wahi niyam jo hotels table (D-58) aur upar ke daam
 * (D-56) pe hai. Store karne ka matlab hota ki client ek package hata de aur number waise ka
 * waisa khada rahe.
 *
 * ⚠️ **`8N and longer` ek hi bucket hai**, aur wo reference se aaya hai — `tour-v3.html` me
 * literally `data-f="d8,d9,d12"` likha hai. Bina is bucket ke ek 8N, ek 9N aur ek 12N package
 * teen alag pills bana dete aur bar lambi hoti chali jaati.
 *
 * Jis package pe `nights` likhi hi nahi wo kisi pill me nahi jaata — wahi guard jo
 * `resolveSimilarPackages()` pe hai: bina uske `null` khud ek bucket ban jaata.
 */
function durationFacets(docs) {
  const buckets = new Map()

  for (const doc of docs) {
    const nights = doc.fields?.nights
    const days = doc.fields?.days
    const key = durationBucket(nights)
    if (!key) continue

    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
      continue
    }

    const long = key === 'd8plus'
    buckets.set(key, {
      key,
      /**
       * ⚠️ Label bucket ke **pehle** package ke days se banta hai. Aam taur pe wo `nights + 1`
       * hota hai (`2N / 3D`), par wo ek niyam nahi hai — client 3N/5D bhi likh sakta hai. Aisi
       * soorat me ek hi pill do alag durations ko dikhati hai, aur wo dikhne wali cheez hai,
       * chhupi hui nahi.
       */
      label: long ? `${LONG_STAY_FROM}N and longer` : `${nights}N / ${days ?? nights + 1}D`,
      nights: long ? null : nights,
      count: 1,
    })
  }

  return [...buckets.values()].sort((a, b) => (a.nights ?? 99) - (b.nights ?? 99))
}

/**
 * Taxonomy ke hisaab se facets — Package Type ya Destination ki pills.
 *
 * ⚠️ **Ek package kai taxonomies me ho sakta hai** (do destinations, do types). Isliye har id
 * apni ginti me judti hai aur `count` ka jod cards ki ginti se **zyada** ho sakta hai. Ye theek
 * hai aur wahi hai jo visitor expect karta hai: "Havelock ke 4" ka matlab hai chaar package
 * Havelock jaate hain, ye nahi ki wo chaar sirf Havelock jaate hain.
 *
 * Kram **taxonomy ke naam se** hai, ginti se nahi — warna ek package publish hote hi pills apni
 * jagah badal leti aur client ko lagta ki bar hil rahi hai.
 */
async function taxonomyFacets(docs, refKey, siteId, locale) {
  const counts = new Map()

  for (const doc of docs) {
    for (const id of doc.taxonomies?.[refKey] ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  if (counts.size === 0) return []

  const resolved = await resolveTaxonomies([...counts.keys()], siteId, locale)

  return resolved
    .map((tax) => ({ key: tax.id, label: tax.name, nights: null, count: counts.get(tax.id) ?? 0 }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Page pe kaunsi filter bar dikhegi — `pageFilter` ke hisaab se (client, 8 Sep).
 *
 * ⚠️ **Ye picker ke baayen wale filter se alag hai.** Wo (`browseBy`) sirf admin me list chhoti
 * karta hai; ye visitor ko milta hai. Client ne dono ko alag karwaya, aur wo theek tha: ek hi
 * control se dono kaam karwane ka matlab tha ki client ko "Honeymoon" chunna pade sirf isliye
 * ki wo Honeymoon packages dhoondh raha hai — aur uska side-effect page pe chala jaata.
 *
 * Facets **chune hue packages me se hi** bunti hain, poore collection se nahi: bar aur cards ek
 * hi set ke do roop hone chahiye, warna ek pill pe click karne pe page khaali ho jaata hai.
 */
async function resolveFacets(pageFilter, docs, siteId, locale) {
  switch (pageFilter) {
    case 'duration':
      return durationFacets(docs)
    case 'packageType':
      return taxonomyFacets(docs, 'packageTypes', siteId, locale)
    case 'destination':
      return taxonomyFacets(docs, 'destinations', siteId, locale)
    default:
      return []
  }
}

/**
 * `Package list` block — page ka asli maal (`.prows` + `.fbar`).
 *
 * ## ⚠️ Ye 8 Sep ko ulta ho gaya — filter se **chunav**
 *
 * Pehle ye block ek *filter* tha: client kasauti chunta tha (Package Type, Destination, sort,
 * duration checkboxes, limit) aur server list banata tha. Client ne wo dekh kar do-column wala
 * picker maanga — baayen saare packages, daayen chune hue, drag se kram.
 *
 * Ab **`props.packageIds` hi list hai, usi kram me**. Sort, `featuredFirst`, `durations` aur
 * `limit` chaaron hat gaye: jab kram aur ginti dono client tay kar raha hai, unka koi matlab
 * nahi bachta.
 *
 * Iske do nateeje hain, dono maan liye gaye:
 *
 * 1. **Naya package apne aap kisi tour page pe nahi aayega** — client ko us page pe jaakar use
 *    chunna padega. Ye keemat hai us control ki jo picker deta hai.
 * 2. **Ek `$in` query, koi scan nahi.** Pehle `PACKAGE_LIST_SCAN_CAP = 200` ki chhat lagti thi
 *    kyunki `price-asc` derived value pe sort karta tha aur uske liye poora set uthana padta
 *    tha. Ab wo poori jamaawat hi nahi hai.
 *
 * ⚠️ **Naya endpoint jaan-boojh kar nahi banaya.** List `resolve` ke payload me hi jaati hai,
 * `similar[]` ki tarah — usse `path:` cache tag (D-52) aur ISR (D-83) dono muft milte hain.
 * Alag endpoint ka matlab hota ki wo call cache ke bahar rehti aur har page load pe API tak
 * jaati — theek wahi bug jo D-83 me teen hafte chhupa raha.
 */
/**
 * `Post list` block ka data — `blog-v1.html` ka poora beech ka hissa.
 *
 * ## ⚠️ Source **query** hai, chunav nahi — `packageList` se ulta
 *
 * `packageList` client ke chune hue ids se chalta hai, aur D-87 §8 ne uska nateeja saaf likha
 * tha: naya package apne aap kisi page pe **nahi** aata. Package ke liye wo theek tha (paanch
 * hain, curated hain).
 *
 * **Blog pe wahi niyam galat hoga.** Blog ka poora point "publish karo, turant dikhe" hai;
 * har naye post ke liye client ko listing page kholna padta, aur ek din wo bhool jaata —
 * theek wahi "kuch na hona" jo D-86 aur D-89 me baar-baar mila.
 *
 * ## Filter aur pagination dono theme me hain
 *
 * Client ka faisla (9 Sep): saare post ek hi baar payload me, phir JS filter aur page karta
 * hai. Isi se pills aur sidebar ke `Topics` ka **do-tarfa sync muft** milta hai — dono ek hi
 * state ke do control ban jaate hain. `perPage` bhi isliye payload me jaata hai, use theme
 * lagati hai.
 *
 * ⚠️ `POST_LIST_CAP` isi model ki keemat hai. Poora tark `schemas/page.js` me uske upar hai.
 *
 * ## Featured neeche wali grid me dobara nahi aate
 *
 * Reference me bhi wahi hai — `Start here` ke teen aur `Latest articles` ke nau, sab alag.
 * Bina is niyam ke wahi card ek hi page pe do jagah dikhta.
 */
async function resolvePostListBlock(props, siteId, locale) {
  const wantedFeatured = (props.featuredIds ?? []).filter(isObjectId)

  const query = {
    siteId,
    locale,
    type: 'post',
    ...publiclyVisibleQuery(),
  }

  /** Taxonomy ki id, uska naam nahi (D-49). Bekaar string `$in`/`$eq` me CastError deti hai. */
  if (props.categoryId && isObjectId(props.categoryId)) {
    query['taxonomies.categories'] = props.categoryId
  }

  const docs = await Entry.find(query).sort({ publishAt: -1, _id: -1 }).limit(POST_LIST_CAP).lean()

  const byId = new Map(docs.map((d) => [String(d._id), d]))

  /**
   * Kram **`featuredIds` ka** hai, Mongo ka nahi — pehla card bada banta hai aur wo chunav
   * client ne drag se kiya hai. Jo id resolve na ho (trash, unpublish) wo chup-chaap gir jaati
   * hai (D-42 §2).
   */
  const featuredDocs = wantedFeatured.map((id) => byId.get(id)).filter(Boolean)
  const featuredIds = new Set(featuredDocs.map((d) => String(d._id)))
  const restDocs = docs.filter((d) => !featuredIds.has(String(d._id)))

  const [featured, cards, facets] = await Promise.all([
    toPostCards(featuredDocs, siteId, locale),
    toPostCards(restDocs, siteId, locale),
    /**
     * ⚠️ **Facets `restDocs` se bunte hain, poore collection se nahi** — bar aur cards ek hi
     * set ke do roop hone chahiye, warna ek pill pe click karne pe grid khaali ho jaata.
     * Wahi niyam jo `resolveFacets()` pe D-87 Slice B me laga tha.
     */
    categoryFacets(restDocs, siteId, locale),
  ])

  return {
    featured,
    cards,
    facets,
    /** `.bfilter__c` — `9 articles`. Ye bina filter wali ginti hai; filter ke baad theme ginti hai. */
    total: cards.length,
    /**
     * ⚠️ Ye batata hai ki chhat lagi ya nahi. Theme ise aaj nahi padhti — ye **hume** batane
     * ke liye hai ki blog cap paar kar gaya aur ab URL wala raasta lena hoga.
     */
    capped: docs.length >= POST_LIST_CAP,
  }
}

/**
 * Categories ki pills aur unki ginti — `.bfilter` aur sidebar ka `Topics`, **dono ek hi jagah se**.
 *
 * ⚠️ Ginti **derive** hoti hai, store nahi — wahi niyam jo `durationFacets()` aur hotels table
 * (D-58) pe hai. Store karne ka matlab hota ki client ek post trash kare aur number waise ka
 * waisa khada rahe.
 */
async function categoryFacets(docs, siteId, locale) {
  const counts = new Map()

  for (const doc of docs) {
    const id = (doc.taxonomies?.categories ?? [])[0]
    if (id) counts.set(String(id), (counts.get(String(id)) ?? 0) + 1)
  }

  if (!counts.size) return []

  const taxonomies = await resolveTaxonomies([...counts.keys()], siteId, locale)

  /** Kram taxonomy ke apne kram ka hai — client use `Posts ▸ Categories` me tay karta hai. */
  return taxonomies.map((t) => ({ ...t, count: counts.get(t.id) ?? 0 }))
}

async function resolvePackageListBlock(props, siteId, locale, defaults) {
  /**
   * `isObjectId` ka pehra zaroori hai: bekaar string `$in` me CastError phenkti hai aur wo
   * public page pe **500** ban jaati, jabki wo sirf ek purana reference hai.
   */
  const wanted = (props.packageIds ?? []).filter(isObjectId)
  if (!wanted.length) return { cards: [], facets: [], total: 0 }

  const now = new Date()
  const docs = await Entry.find({
    _id: { $in: wanted },
    siteId,
    locale,
    type: 'package',
    deletedAt: null,
    /**
     * ⚠️ `status` ka filter **query me** hai, `isPubliclyVisible()` se nahi: wo ek document pe
     * chalti hai, aur yahan list chahiye. Dono ka matlab ek hi rakha gaya hai — `published`,
     * ya `scheduled` jiska waqt aa chuka (R2 wala self-healing).
     */
    $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: now } }],
  }).lean()

  /**
   * **Kram `packageIds` ka hai, Mongo ka nahi.** `$in` apna kram nahi rakhta, aur client ne wo
   * kram drag-and-drop se banaya hai — use query ke jawab pe chhod dena uska poora kaam mita
   * dena hota.
   *
   * Jo id resolve na ho (trash me chali gayi, ya unpublish ho gayi) wo chup-chaap gir jaati
   * hai. Ye theek hai aur jaan-boojh kar hai: page pe ek toota hua card dikhane se behtar hai
   * ki wo card na ho (D-30, aur wahi invariant jo D-42 §2 media pe hai).
   */
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]))
  const ordered = wanted.map((id) => byId.get(id)).filter(Boolean)

  const [cards, facets] = await Promise.all([
    toPackageCards(ordered, siteId, locale, defaults.rating),
    /**
     * ⚠️ **`pageFilter`, `browseBy` nahi.** Wo doosra wala sirf admin ke picker me baayen wali
     * list chhoti karta hai aur page tak pahunchta hi nahi (client, 8 Sep).
     */
    resolveFacets(props.pageFilter, ordered, siteId, locale),
  ])

  return {
    cards,
    facets,
    /** `.fbar__c` — `14 packages`. */
    total: ordered.length,
  }
}

/**
 * Page ke blocks ka payload — **kram ke saath**, D-87 §7.
 *
 * ⚠️ Ye ek **array** lautata hai, object nahi. Kuch ghante ke liye ye ulta tha: kram HTML me
 * rehta aur ye sirf id se settings ka naksha hota. Client ne wo model palta — ab kram
 * `content.blocks[]` ka hi hai, aur theme use jaise ka waisa chhaap sakti hai.
 *
 * ⚠️ Sirf `packageList` ke liye query lagti hai. Baaki chaar ke props apne aap me poore hain,
 * par wo bhi yahin se guzarte hain — taaki theme ke liye ek hi shape rahe aur use "kaunsa
 * block resolve hua hai" yaad na rakhna pade.
 */
async function resolvePageBlocks(blocks, siteId, locale, defaults) {
  if (!blocks?.length) return []

  return Promise.all(
    blocks.map(async (block) => {
      /**
       * ⚠️ **Naya list-type block jodo to yahan bhi jodo.** Chhoot jaane ka lakshan `500`
       * nahi hota — block render hota hai, bas uske andar kuch hota nahi. Yahi wo "bana hua
       * par juda nahi" shakl hai jo D-89 me 13 me se zyada tar farak ki thi.
       */
      if (block?.type === 'postList') {
        return { ...block, data: await resolvePostListBlock(block.props, siteId, locale) }
      }

      if (block?.type !== 'packageList') return block

      /**
       * `data` `props` ke **saath** jaata hai, uski jagah nahi. Theme ko dono chahiye:
       * `props` batata hai client ne kya chuna (`showFilters` off hai ya nahi), `data` wo hai
       * jo us chunav se nikla.
       */
      return {
        ...block,
        data: await resolvePackageListBlock(block.props, siteId, locale, defaults),
      }
    }),
  )
}

/**
 * Breadcrumb — parent chain se, **server pe** (client ka faisla #12).
 *
 * Client ne per-page "breadcrumb label" wala field **hataya** — wo parent se apne aap banta
 * hai. Yahi `resolvePath()` wala hi tark hai: ek hi cheez do jagah likhne ka matlab hota ki
 * ek din URL kuch aur kahe aur breadcrumb kuch aur.
 *
 * ⚠️ Depth ki chhat 10 hai. Loop `parentId` pe chalta hai, aur ek toota hua chain (A → B → A)
 * bina chhat ke poora page hang kar deta. `entries` service aisa chain banne nahi deti, par
 * wo guard **write** pe hai — ye read hai, aur read ko apne bharose pe khada hona chahiye.
 */
async function resolveBreadcrumbs(doc, siteId, locale) {
  const trail = []
  let current = doc
  let depth = 0

  while (current?.parentId && depth < 10) {
    const parent = await Entry.findOne({
      _id: current.parentId,
      siteId,
      locale,
      deletedAt: null,
    })
      .select('title path parentId')
      .lean()

    if (!parent) break

    trail.unshift({ name: parent.title, path: parent.path })
    current = parent
    depth += 1
  }

  return trail
}

/**
 * Page aur Tour Page ka public payload — D-87.
 *
 * ⚠️ **Ye branch pehle thi hi nahi.** `toPublicEntry()` har type ke liye chalti thi aur wo
 * poori tarah **package-shaped** hai: itinerary, pricing, hotels, add-ons, similar. Ek `page`
 * resolve karne pe wo saara kaam chalta tha aur khaali jawab deta tha — chaar taxonomy query,
 * ek `Transfer.find()`, aur `resolveSimilarPackages()` ka poora daur, sirf khaali arrays
 * banane ke liye.
 */
/**
 * Page ki sidebar — `fields.sidebarId` se widgets tak (D-88).
 *
 * Theme ko **`sidebarId` kabhi nahi jaata**, resolve hua maal jaata hai. Wahi tark jo D-65 pe
 * `sectionLabels` ke resolve pe aur D-84 pe `srcset` pe hai: resolve server pe ho, theme me
 * nahi — warna wo hisaab har theme me dobara likhna padta hai.
 *
 * ⚠️ **Khaali list aur "sidebar hai hi nahi" ek jaise dikhte hain, aur wo theek hai** — dono
 * soorat me theme kuch render nahi karti (D-30). Teen wajah se list khaali aa sakti hai, aur
 * teenon **normal** hain: `sidebarId` khaali ho, wo sidebar delete ho chuki ho (delete hamesha
 * chalta hai — D-79), ya uske saare widget khud gir gaye hon.
 */
async function resolveSidebarWidgets(sidebarId, siteId, locale) {
  const widgets = await getSidebarWidgets(sidebarId, siteId, locale)
  if (!widgets?.length) return []

  /**
   * Form pehle resolve hota hai, kyunki `talkToPlanner` ka email **usi form ke `emailTo`** se
   * aata hai (2 Sep ka faisla — wo pata form me pehle se hai, `settings` me dobara nahi).
   *
   * ⚠️ Ek se zyada `enquiryForm` widget ho to email **pehle wale** se — kram wahi hai jo client
   * ne khud lagaya. Koi bhi niyam chahiye tha; "pehla" wo hai jise client screen pe dekh sakta
   * hai.
   */
  const forms = new Map()
  await Promise.all(
    widgets
      .filter((w) => w?.type === 'enquiryForm' && w.props?.formId)
      .map(async (w) => forms.set(w.props.formId, await getPublicFormById(w.props.formId, siteId))),
  )

  const plannerEmail = [...forms.values()].find((form) => form?.contactEmail)?.contactEmail ?? ''

  const resolved = widgets
    .map((widget) => {
      if (!widget?.type) return null

      switch (widget.type) {
        /**
         * Form na mile — draft ho, delete ho chuka ho, ya chuna hi na gaya ho — to widget
         * **gayab** ho jaata hai. Khaali dabba "abhi nahi bana" nahi lagta, "toota hua" lagta
         * hai (D-30).
         */
        case 'enquiryForm': {
          const form = forms.get(widget.props?.formId) ?? null

          return form
            ? {
                id: widget.id,
                type: 'enquiryForm',
                props: {
                  heading: widget.props?.heading ?? '',
                  description: widget.props?.description ?? '',
                  form,
                },
              }
            : null
        }

        /**
         * Poora content derive hota hai — phone/whatsapp `settings` se, email form se. Ek bhi
         * contact na ho to `Planner.jsx` khud `null` lauta deta hai; wo rok wahin rehni chahiye
         * (ek hi niyam do jagah nahi).
         */
        case 'talkToPlanner':
          return {
            id: widget.id,
            type: 'talkToPlanner',
            props: { heading: widget.props?.heading ?? '', email: plannerEmail },
          }

        /** Khaali HTML pe widget gir jaata hai — heading akela ek khaali card banata (D-30). */
        case 'html': {
          const html = widget.props?.html ?? ''

          return isEmptyHtml(html)
            ? null
            : {
                id: widget.id,
                type: 'html',
                props: {
                  /** Heading ke aage ka icon — shared `ICONS` me se (D-88 §10). */
                  icon: widget.props?.icon ?? 'none',
                  heading: widget.props?.heading ?? '',
                  html,
                },
              }
        }

        /**
         * `Topics` — categories ki list, ginti ke saath (`.cats`).
         *
         * ⚠️ **Yahan ki ginti `.bfilter` ki pills se alag hoti hai, aur wo galti nahi hai.**
         * Reference me sidebar `9 · 6 · 11 · 8 · 5 · 4` (yaani 43) dikhata hai jabki grid pe
         * `9 articles` likha hai — kyunki sidebar **poore blog** ki ginti hai aur pills us
         * page pe dikh rahe set ki. Dono ko ek number pe zabardasti laana design ko todta.
         *
         * Do-tarfa sync **chunav** ka hai, ginti ka nahi: dono taraf category ki wahi `id`
         * jaati hai, isliye theme ek hi state se dono ko active kar sakti hai.
         *
         * Cards ki tarah, ginti bhi **neeche ek hi baar** bharti hai — har widget pe alag
         * query wahi N+1 hota.
         */
        case 'topics':
          return {
            id: widget.id,
            type: 'topics',
            props: {
              icon: widget.props?.icon ?? 'none',
              heading: widget.props?.heading ?? '',
            },
          }

        /**
         * `Post picks` — reference ka `Most read` (`.pop`).
         *
         * ⚠️ **Ginti se kuch nahi banta** — is CMS me view counting hai hi nahi, aur uske liye
         * har page view pe ek write chahiye hota jo ISR aur caching dono tod deta (D-83 abhi
         * theek hua hai). Client khud chunta hai; `Most read` bas wo heading hai jo wo likhta
         * hai (client ka faisla, 9 Sep).
         *
         * Cards yahan **resolve** nahi hote — wo `postPicks` ki ids ke saath jaate hain aur
         * neeche ek hi query me bharte hain. Har widget pe alag query wahi N+1 hota jise
         * `toPackageCards()` ne ek query me badla tha.
         */
        case 'postPicks':
          return {
            id: widget.id,
            type: 'postPicks',
            props: {
              icon: widget.props?.icon ?? 'none',
              heading: widget.props?.heading ?? '',
              postIds: (widget.props?.postIds ?? []).filter(isObjectId),
            },
          }

        /**
         * ⚠️ Anjaan type chup-chaap gir jaata hai, 500 nahi deta. Aisa tab hota hai jab koi
         * type hata diya jaaye par purane sidebars me wo bacha ho — theek wahi haalat jispe
         * package list ka _"bekaar id se 500 nahi aata"_ wala niyam bana tha.
         */
        default:
          return null
      }
    })
    .filter(Boolean)

  return fillBlogWidgets(resolved, siteId, locale)
}

/**
 * `topics` aur `postPicks` ka asli maal — **sab widgets ke liye ek-ek query** (spec 008).
 *
 * ⚠️ Ye `switch` ke andar isliye nahi hai ki wahan har widget apni query chalata — do
 * `postPicks` widget do queries bana dete. Yahi N+1 `toPackageCards()` me stays/types pe roka
 * gaya tha (_"ek-ek query me, har card ke liye alag nahi"_).
 *
 * Dono me se koi widget na ho to **ek bhi query nahi chalti** — package page pe ye function
 * bas list wapas kar deta hai.
 */
async function fillBlogWidgets(widgets, siteId, locale) {
  const needsTopics = widgets.some((w) => w.type === 'topics')
  const pickIds = [
    ...new Set(widgets.flatMap((w) => (w.type === 'postPicks' ? w.props.postIds : []))),
  ]

  if (!needsTopics && !pickIds.length) return widgets

  const [topics, picked] = await Promise.all([
    needsTopics ? allPostCategories(siteId, locale) : [],
    pickIds.length
      ? Entry.find({
          _id: { $in: pickIds },
          siteId,
          locale,
          type: 'post',
          ...publiclyVisibleQuery(),
        })
          .lean()
          .then((docs) => toPostCards(docs, siteId, locale))
      : [],
  ])

  const cardById = new Map(picked.map((c) => [c.id, c]))

  return (
    widgets
      .map((widget) => {
        if (widget.type === 'topics') return { ...widget, props: { ...widget.props, topics } }

        if (widget.type === 'postPicks') {
          /**
           * Kram **client ka** hai, query ka nahi. Jo id resolve na ho (trash, unpublish) wo
           * chup-chaap gir jaati hai — D-42 §2, aur `postIds` payload me nahi jaati (theme ko
           * id se kuch nahi karna).
           */
          const posts = widget.props.postIds.map((id) => cardById.get(id)).filter(Boolean)

          return {
            ...widget,
            props: { icon: widget.props.icon, heading: widget.props.heading, posts },
          }
        }

        return widget
      })
      /** Khaali list wala widget ek khaali dabba hai — wo dikhna nahi chahiye (D-30). */
      .filter((w) => {
        if (w.type === 'topics') return w.props.topics.length > 0
        if (w.type === 'postPicks') return w.props.posts.length > 0
        return true
      })
  )
}

/**
 * Poore blog ki categories aur unki ginti — sidebar ke `Topics` ke liye.
 *
 * ⚠️ **Ginti derive hoti hai, store nahi** (D-58 wala hi niyam) — aur wo `usageCount` se alag
 * hai: wo **har** entry ginta hai (draft samet, kyunki wo admin ki list ke liye hai), yahan
 * sirf public post chahiye. Ek hi naam ke do matlab banane se bachne ke liye ye alag function
 * hai, `usageCount` ka reuse nahi (D-86).
 */
async function allPostCategories(siteId, locale) {
  const rows = await Entry.aggregate([
    { $match: { siteId, locale, type: 'post', ...publiclyVisibleQuery() } },
    { $unwind: '$taxonomies.categories' },
    { $group: { _id: '$taxonomies.categories', count: { $sum: 1 } } },
  ])

  if (!rows.length) return []

  const counts = new Map(rows.map((r) => [String(r._id), r.count]))
  const taxonomies = await resolveTaxonomies([...counts.keys()], siteId, locale)

  return taxonomies.map((t) => ({ ...t, count: counts.get(t.id) ?? 0 }))
}

/** `Related reading` me kitne card — client, 9 Sep (reference me teen hain). */
const RELATED_POSTS_LIMIT = 4

/**
 * Ek blog post ka public payload — `blog-detail-v1.html` (spec 008).
 *
 * ## ⚠️ `toPublicEntry()` se alag kyun
 *
 * Wo poori tarah **package-shaped** hai — `pricing`, `itinerary`, `hotels`, `addOns`,
 * `similar`, `reviews`. Post ko unme se ek bhi nahi chahiye, aur usme se guzarne ka matlab
 * hota `resolveSimilarPackages()` ka poora daur sirf khaali arrays banane ke liye. Theek yahi
 * D-87 Slice B me `page` pe pakda gaya tha aur usi liye `toPublicPage()` alag hui thi.
 *
 * ## Aur `toPublicPage()` se bhi alag kyun
 *
 * Post ke paas teen cheezein hain jo kisi page ke paas nahi — **prev/next**, **related** aur
 * **TOC** — aur do cheezein nahi hain jo har page ke paas hain (`statRail`, per-page sidebar
 * ka chunav). Ek hi function me dono rakhne ka matlab hota har page pe `type === 'post'` ke
 * chaar `if`, aur wahi bikhraav jise D-09 ne routing pe mana kiya tha.
 */
async function toPublicPost(doc, siteId, locale) {
  const [settings, breadcrumbs, nav, related] = await Promise.all([
    getSettings(siteId),
    resolveBreadcrumbs(doc, siteId, locale),
    resolvePostNav(doc, siteId, locale),
    resolveRelatedPosts(doc, siteId, locale, RELATED_POSTS_LIMIT),
  ])

  const blog = settings.blogSettings ?? {}

  const [banner, categories] = await Promise.all([
    toDisplayImage(doc.featuredImageId, 'large', siteId),
    resolveTaxonomies(doc.taxonomies?.categories ?? [], siteId, locale),
  ])

  /**
   * ⚠️ **Heading ke `id` yahan bharte hain, aur TOC wahin se banti hai** — ek hi pass.
   *
   * Do jagah slug banane ka matlab hota ki TOC ka link aur heading ka anchor ek din alag ho
   * jaayein. Poora tark `packages/shared/src/toc.js` ke sar pe hai.
   *
   * Sirf `richText` blocks — `faqs` ka apna `<details>` accordion hai, uske sawaal TOC me
   * daalne ka matlab hota ki ek 9-sawaal wali FAQ poori TOC nigal jaaye.
   */
  const toc = []
  const blocks = (doc.content?.blocks ?? []).map((block) => {
    if (block?.type !== 'richText') return block

    const { html, toc: found } = withHeadingIds(block.props?.html ?? '')
    toc.push(...found)

    return { ...block, props: { ...block.props, html } }
  })

  /**
   * TOC pe **do** shart hain, aur dono zaroori hain.
   *
   * `showToc` client ka faisla hai (9 Sep — _"blog settings me checkbox bana denge sabke
   * liye"_). `TOC_MIN_HEADINGS` uske saath lagta hai, uske upar nahi: checkbox "dikhao" kehta
   * hai, "zabardasti dikhao" nahi — ek link wali `On this post` khaali dabbe jaisi lagti hai.
   *
   * ⚠️ Faisla **yahan** hota hai, theme me nahi: khaali `toc[]` bhejne se theme ko koi niyam
   * yaad nahi rakhna padta, aur do jagah wo niyam alag nahi ho sakta.
   */
  const showToc = blog.showToc !== false && toc.length >= TOC_MIN_HEADINGS

  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    slug: doc.slug,
    path: doc.path,
    excerpt: doc.excerpt ?? '',
    seo: doc.seo ?? {},
    updatedAt: doc.updatedAt ?? null,
    publishedAt: doc.publishAt ?? null,

    banner,
    breadcrumbs,
    blocks,

    /** `.ahead__cat` — post ki category. Khaali pe badge render hi nahi hota. */
    category: categories[0] ?? null,

    /**
     * Byline — **`blogSettings.author` se, `authorId` se nahi**.
     *
     * ⚠️ Ye `toPublicPage()` ke byline se **jaan-boojh kar alag** hai. Wahan author asli admin
     * user hota hai (D-87 ka faisla #9), aur blog pe wo galat naam hota: page pe `arun` chhap
     * jaata, `Andaman Tourism team` nahi. `authorId` andar rehta hai — kisne likha,
     * permissions, admin ki list — par yahan kabhi nahi aata (R10 waise bhi rokta).
     *
     * ⚠️ Khaali `name` pe theme byline ka author wala hissa render **nahi** karti — koi
     * fallback nahi hai, kyunki fallback ka matlab hota do source (D-86).
     *
     * Avatar ke `AT` initials naam se derive hote hain — uske liye koi field nahi.
     */
    author: {
      name: blog.author?.name ?? '',
      role: blog.author?.role ?? '',
      bio: blog.author?.bio ?? '',
    },

    readMinutes: readingMinutes(htmlToText(extractBlockText(doc.content?.blocks ?? []))),

    /** `On this post` — khaali array ka matlab "mat dikhao", theme ko kuch tay nahi karna. */
    toc: showToc ? toc : [],

    /** `.pn` — dono `null` ho sakte hain (pehla/aakhri post). */
    prev: nav.prev,
    next: nav.next,

    /** `Related reading` — usi category ke, 4 tak. Kam mile to kam. */
    related,

    /**
     * Sidebar — **`blogSettings` se, post pe nahi** (client, 9 Sep).
     *
     * Blog ke saare post ek hi shakl ke hain, isliye ye ek baar chunta hai. Har post pe do
     * dropdown bharwane ka matlab hota ki ek din koi bhool jaaye aur us post pe sidebar
     * chup-chaap gayab ho (D-42 §2).
     */
    sidebar: blog.postSidebar ?? 'none',
    sidebarWidgets:
      (blog.postSidebar ?? 'none') === 'none'
        ? []
        : await resolveSidebarWidgets(blog.postSidebarId, siteId, locale),
  }
}

async function toPublicPage(doc, siteId, locale) {
  const fields = doc.fields ?? {}

  const [defaults, settings, author, breadcrumbs] = await Promise.all([
    ensurePackageDefaults(siteId),
    getSettings(siteId),
    /**
     * Byline ka author — **poori tarah automatic** (client ka faisla #9), koi field nahi.
     *
     * ⚠️ Sirf `name` jaata hai. Email, username aur role public payload me kabhi nahi ja
     * sakte (R10) — wahi wajah jiske liye ye module admin API se alag hai (§10).
     */
    doc.authorId
      ? User.findById(doc.authorId)
          .select('name')
          .lean()
          .catch(() => null)
      : null,
    resolveBreadcrumbs(doc, siteId, locale),
  ])

  /**
   * Hero ka banner — page ka apna Featured image **jeet-ta hai** (client ka faisla #10).
   *
   * Settings wala universal banner sirf fallback hai. Wahi shakl jo rating (D-87 §3) aur
   * `sectionLabels` (D-65) pe hai: site ki default niche, page ka apna upar.
   */
  const banner =
    (await toDisplayImage(doc.featuredImageId, 'large', siteId)) ??
    (await toDisplayImage(settings.tourSettings?.bannerMediaId, 'large', siteId))

  const blocks = await resolvePageBlocks(doc.content?.blocks, siteId, locale, defaults)

  /**
   * ⚠️ Sidebar tabhi resolve hoti hai jab page ne use **maanga** ho (`sidebar` `none` na ho).
   *
   * `sidebarId` `none` par bhi bhara reh sakta hai — wo jaan-boojh kar mitaya nahi jaata
   * (D-88 §3), taaki client left/right toggle karke wapas aaye to uska chunav bacha rahe.
   * Bina is check ke hum ek aisi sidebar ke widgets resolve karte jo page pe dikhni hi nahi —
   * theek wahi fizool kaam jo Slice B me `toPublicEntry()` pe pakda gaya tha, jahan har `page`
   * resolve pe `resolveSimilarPackages()` ka poora daur chalta tha.
   */
  const sidebarWidgets =
    (fields.sidebar ?? 'none') === 'none'
      ? []
      : await resolveSidebarWidgets(fields.sidebarId, siteId, locale)

  /**
   * Read time content ke **saare** rich text se ginti hai, sirf pehle block se nahi —
   * `extractBlockText()` poore tree se text nikalta hai (wahi jo `searchText` bharta hai).
   */
  const readMinutes = readingMinutes(htmlToText(extractBlockText(doc.content?.blocks ?? [])))

  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    slug: doc.slug,
    path: doc.path,
    excerpt: doc.excerpt ?? '',
    seo: doc.seo ?? {},
    updatedAt: doc.updatedAt ?? null,

    /**
     * ⚠️ **`content` yahan jaan-boojh kar nahi hai** — `blocks` hi wo hai (D-87 §7).
     *
     * `blocks` `content.blocks[]` se hi banta hai, sirf `packageList` uske andar apna `data`
     * le kar aata hai. Dono bhejne ka matlab hota ek hi cheez do shakl me — aur theme ek din
     * galti se kachcha wala padh leti, jisme cards hote hi nahi.
     *
     * Package payload me `content` abhi bhi hai, aur wo theek hai: wahan wo ek hi `richText`
     * block hai (D-46 §3) aur usme resolve karne ko kuch hai hi nahi.
     */
    banner,
    breadcrumbs,

    fields: {
      /**
       * Page ka dikhne wala `<h1>` (client, 9 Sep).
       *
       * ⚠️ Khaali pe theme `entry.title` pe girti hai — wo fallback **theme me** hai, yahan nahi.
       * Yahan bhar dene ka matlab hota ki payload me do jagah wahi text ho, aur ek din wo alag
       * ho jaayein (D-65 wali `sectionLabels` pe yahi tark ulta tha: wahan resolve server pe hai
       * kyunki wahan default **server ka** hai; yahan default `title` hai, jo payload me pehle se
       * hai).
       */
      heading: fields.heading ?? '',
      eyebrow: fields.eyebrow ?? '',
      subheading: fields.subheading ?? '',
      /** Khaali `value` wale cards gir jaate hain — khaali cheez khaali dikhe, tooti hui nahi (D-30). */
      statRail: (Array.isArray(fields.statRail) ? fields.statRail : []).filter((s) => s?.value),
    },

    /**
     * Sidebar — `none` · `left` · `right` (client, 8 Sep).
     *
     * ⚠️ Yahan sirf **layout** hai — usme kya dikhega wo `sidebarWidgets` me hai.
     *
     * `fields` ke bahar hai kyunki theme iska istemaal page ke **wrapper** pe karti hai
     * (`.pgl--sideleft`), kisi section ke andar nahi.
     */
    sidebar: fields.sidebar ?? 'none',

    /**
     * Sidebar me kya dikhega — `Appearance ▸ Sidebar` se resolve hua (D-88).
     *
     * ⚠️ **`sidebarId` yahan jaan-boojh kar nahi hai.** Theme ke paas id ka koi kaam nahi —
     * usse render kuch nahi hota, aur bhejne ka matlab hota ek din koi uspe alag call likh de.
     * Wahi wajah jis se `content` `blocks` ke saath payload me nahi jaata (D-87 §7).
     *
     * `sidebar: 'none'` par ye hamesha khaali hai — do jagah check karne ki zaroorat nahi.
     */
    sidebarWidgets,

    /**
     * Byline — teenon hisse derive hote hain, ek bhi field nahi (client ka faisla #9).
     */
    byline: {
      author: author?.name ?? '',
      updatedAt: doc.updatedAt ?? null,
      readMinutes,
    },

    /**
     * ⚠️ **Trust badges yahan jaan-boojh kar nahi hain** — wo `getPublicSettings()` me hain.
     *
     * Wo global hain (client ka faisla #11) aur hero package page pe bhi hai. Dono payload me
     * bhejne ka matlab hota ek hi cheez do jagah, aur ek din wo do alag ho jaate — theek wahi
     * jo `sectionLabels` aur route strip pe hone se bachaya gaya tha (D-65, D-51).
     */
    blocks,
  }
}

async function toPublicEntry(doc, siteId, locale) {
  const fields = doc.fields ?? {}
  const days = Array.isArray(fields.itinerary) ? fields.itinerary : []

  const [destinations, packageTypes, banner, transfers, defaults] = await Promise.all([
    resolveTaxonomies(doc.taxonomies?.destinations, siteId, locale),
    resolveTaxonomies(doc.taxonomies?.packageTypes, siteId, locale),
    toDisplayImage(fields.bannerImage, 'large', siteId),
    Transfer.find({ siteId })
      .select('name icon')
      .lean()
      .catch(() => []),
    /**
     * "Similar itineraries" ka cap `packageDefaults` se aata hai (D-82) — pehle wo yahin
     * `limit(12)` me gada hua tha. Isi Promise.all me hai taaki ek aur round trip na lage.
     */
    ensurePackageDefaults(siteId),
  ])

  const stayIds = days.map((d) => d.overnightStayId)
  const [stays, extras, similar] = await Promise.all([
    resolveTaxonomies(stayIds, siteId, locale),
    resolvePackageExtras(fields, days, siteId, locale),
    resolveSimilarPackages(doc, siteId, locale, defaults.similar?.total ?? 12, defaults.rating),
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
    },

    /**
     * Rating — package ki apni, warna `packageDefaults` wali (D-87 §3).
     *
     * `fields` ke **bahar** hai, jaan-boojh kar: `fields` wo hai jo entry pe jaisa ka waisa
     * likha hai, aur ye us se alag hai — isme site ki default ghuli hui ho sakti hai. Wahi
     * lakeer jo `pricing`/`hotels`/`similar` pe khinchi hai.
     */
    rating: resolveRating(fields.rating, defaults.rating),

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

    /** Structured data on/off — ab site-level, har package pe nahi (D-82). */
    seoSchema: doc.seoSchema !== false,

    /** Similar cards — kitne page pe (theme) aur kitne kul (upar limit me). */
    similar: { total: doc.similar?.total ?? 12, perPage: doc.similar?.perPage ?? 3 },

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
