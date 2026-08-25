import { DEFAULT_SITE_ID } from '@cms/shared'

import { Media } from '../media/model.js'
import { toPublicMedia } from '../media/service.js'
import { getPublicMenuById } from '../menus/service.js'
import { getSettings } from '../settings/service.js'

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
async function toDisplayImage(mediaId, preferredVariant = 'medium', siteId = DEFAULT_SITE_ID) {
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
