/**
 * Shared constants. Admin aur API dono yahan se import karte hain.
 */

export * from './icons.js'
export * from './package-sections.js'
export * from './permissions.js'
export * from './theme-colors.js'
export * from './theme-locations.js'

export const DEFAULT_SITE_ID = 'default'
export const DEFAULT_LOCALE = 'en'

/**
 * Entry statuses. `trash` yahan NAHI hai — wo `deletedAt` field hai (D-25),
 * taaki restore pe entry apni purani state me wapas aa sake.
 */
export const ENTRY_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
  PRIVATE: 'private',
})

export const ENTRY_STATUSES = Object.freeze(Object.values(ENTRY_STATUS))

/** Paanch roles — `subscriber` nahi (D-26), `salesAgent` add hua (D-29). */
export const ROLE = Object.freeze({
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  CONTRIBUTOR: 'contributor',
  /** Enquiries handle karta hai, content nahi (D-29). Permissions Phase 7b me. */
  SALES_AGENT: 'salesAgent',
})

export const ROLES = Object.freeze(Object.values(ROLE))

/**
 * Built-in roles ke labels — **UI me yahi dikhta hai, key kabhi nahi** (R4).
 *
 * Yahan isliye hain ki built-in roles **code-owned** hain (D-36): unka content code se
 * aata hai aur har deploy pe DB me sync hota hai. Seed inhe likhta hai aur admin inhe
 * padhta hai — do jagah rakhne se theek wahi drift hoti hai jo hui thi: DB me label
 * "Administrator" tha, par Profile screen key se bana kar "Admin" dikha rahi thi.
 *
 * **Custom roles (Phase 7) yahan nahi honge** — unke labels admin khud banata hai aur wo
 * sirf DB me rehte hain. Unke liye `GET /api/roles` hi source hai.
 */
export const ROLE_LABEL = Object.freeze({
  [ROLE.ADMIN]: 'Administrator',
  [ROLE.EDITOR]: 'Editor',
  [ROLE.AUTHOR]: 'Author',
  [ROLE.CONTRIBUTOR]: 'Contributor',
  [ROLE.SALES_AGENT]: 'Sales Agent',
})

/**
 * User ka lifecycle. Users pe `deletedAt` nahi hai (D-25 content ke liye hai) —
 * user hataya nahi jaata, **deactivate** hota hai, taaki uska likha content aur
 * activity log orphan na ho jaaye.
 */
export const USER_STATUS = Object.freeze({
  /** Login kar sakta hai. */
  ACTIVE: 'active',
  /** Invite bheja gaya, abhi tak password set nahi kiya. */
  INVITED: 'invited',
  /** Login band, par record aur uska content bacha hua hai. */
  INACTIVE: 'inactive',
})

export const USER_STATUSES = Object.freeze(Object.values(USER_STATUS))

/**
 * Taxonomy ke kism — ek hi `taxonomies` collection, `type` field se alag (02-ARCH §3).
 *
 * Wahi soch jo `entries` pe hai: alag collection banane ka matlab hota hierarchy, slug,
 * uniqueness aur archive ka engine har baar dobara likhna.
 */
export const TAXONOMY_TYPE = Object.freeze({
  CATEGORY: 'category',
  TAG: 'tag',
  /** Packages ki Destinations — hierarchical (India → Kerala → Munnar). spec 007 §1.1 */
  DESTINATION: 'destination',
  /** Packages ka "Theme" — flat. spec 007 §1.2 */
  PACKAGE_TYPE: 'packageType',
})

export const TAXONOMY_TYPES = Object.freeze(Object.values(TAXONOMY_TYPE))

/** UI me yahi dikhta hai, `type` key kabhi nahi (R11). */
export const TAXONOMY_LABEL = Object.freeze({
  [TAXONOMY_TYPE.CATEGORY]: 'Category',
  [TAXONOMY_TYPE.TAG]: 'Tag',
  [TAXONOMY_TYPE.DESTINATION]: 'Destination',
  [TAXONOMY_TYPE.PACKAGE_TYPE]: 'Package Type',
})

/**
 * Taxonomy type → `entry.taxonomies` me uski key (A-7, D-49).
 *
 * Keys **plural** hain kyunki har ek ids ka array rakhti hai. Ye map hi wo ek jagah hai
 * jahan se dono taraf ka naam aata hai — server ka filter, admin ka form, cache tag aur
 * delete guard sab isi se chalte hain. Do jagah rakhne ka nateeja is repo me pehle dekha
 * ja chuka hai (D-43 §2).
 */
export const TAXONOMY_REF_KEY = Object.freeze({
  category: 'categories',
  tag: 'tags',
  destination: 'destinations',
  packageType: 'packageTypes',
})

export const TAXONOMY_REF_KEYS = Object.freeze(Object.values(TAXONOMY_REF_KEY))

/** Ulta map — `destinations` kis type ki key hai. Delete guard aur write validation isse use karte hain. */
export const TAXONOMY_TYPE_BY_REF_KEY = Object.freeze(
  Object.fromEntries(Object.entries(TAXONOMY_REF_KEY).map(([type, key]) => [key, type])),
)

/** Kaunsi taxonomy nested ho sakti hai — spec 007 §1.1, §1.2. */
export const HIERARCHICAL_TAXONOMY_TYPES = Object.freeze([
  TAXONOMY_TYPE.CATEGORY,
  TAXONOMY_TYPE.DESTINATION,
])

/**
 * Hotel ki category — **ginti fix hai, chaar** (client ka faisla, spec 007 §1.3).
 *
 * Ye jaan-boojh kar code me constant hai, master list nahi: pricing ke chaar tab isi pe
 * bane hain (§4), aur category jodne ka matlab poore pricing model ka badalna hai — wo
 * ek client faisla hai, ek list me row jodna nahi.
 */
export const HOTEL_CATEGORY = Object.freeze({
  STANDARD: 'standard',
  DELUXE: 'deluxe',
  PREMIUM: 'premium',
  LUXURY: 'luxury',
})

export const HOTEL_CATEGORIES = Object.freeze(Object.values(HOTEL_CATEGORY))

export const HOTEL_CATEGORY_LABEL = Object.freeze({
  [HOTEL_CATEGORY.STANDARD]: 'Standard',
  [HOTEL_CATEGORY.DELUXE]: 'Deluxe',
  [HOTEL_CATEGORY.PREMIUM]: 'Premium',
  [HOTEL_CATEGORY.LUXURY]: 'Luxury',
})

/** Public paths jo koi entry claim nahi kar sakti. */
/**
 * Post ka URL kis shakl me bane — `Settings ▸ Blog settings` (spec 008, client 10 Sep).
 *
 * | Mode | Post ka URL | Kab |
 * | --- | --- | --- |
 * | `nested` | `/blog/how-to-plan` | blog page ek **section** hai (default) |
 * | `root` | `/how-to-plan` | post site ke top level pe |
 *
 * ⚠️ **Breadcrumb dono me ek jaisa rehta hai** — `Home › Andaman Travel Guide › Post`. Wo
 * `parentId` se banta hai, URL se nahi; blog page phir bhi post ka section hai. Yahi
 * WordPress bhi karta hai.
 *
 * ⚠️ **Ye value `contentTypes.post.urlPattern` chalati hai**, aur wo badalne se **har post ka
 * path** badalta hai. Isliye badalne pe har purane path se 301 banti hai (D-49) — bina uske
 * saare shared aur indexed blog link chup-chaap mar jaate.
 */
export const POST_URL_MODES = Object.freeze(['nested', 'root'])

export const RESERVED_SLUGS = Object.freeze(['admin', 'api', '_next', 'media', 'uploads'])

/** Responsive breakpoints — inhi teenon pe style store hoti hai. */
export const BREAKPOINT = Object.freeze({ DESKTOP: 'desktop', TABLET: 'tablet', MOBILE: 'mobile' })

/**
 * Bulk Upload ki default images ka pool — package (`packageDefaults.defaultBannerImages`) aur blog
 * (`blogSettings.defaultFeaturedImages`) dono ki hadd (client, 24 Sep). Doc me image na ho to
 * import yahan se ek chunta hai. Client ne "5–6" kaha; 20 isliye ki pool badhane pe dobara code na
 * chhoona pade, aur itni ids settings ke payload ko bhaari nahi karti.
 */
export const DEFAULT_IMAGE_POOL_MAX = 20
