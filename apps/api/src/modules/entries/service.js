import { randomUUID } from 'node:crypto'

import mongoose from 'mongoose'

import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  ENTRY_STATUS,
  PERMISSION,
  TAXONOMY_REF_KEYS,
  TAXONOMY_TYPE,
  TAXONOMY_TYPE_BY_REF_KEY,
  extractBlockText,
  faqsSchema,
  itinerarySchema,
  packageAddOnsSchema,
  packageHotelsSchema,
  durationQuery,
  parseBlockProps,
  pricingSchema,
  ratingSchema,
  pageHeadingSchema,
  sidebarIdSchema,
  sidebarPositionSchema,
  statRailSchema,
  isReservedSlug,
  rebasePath,
  normalizePath,
  resolvePath,
  slugify,
  suffixSlug,
} from '@cms/shared'

import { conflict, forbidden, notFound, unprocessable } from '../../core/errors.js'
import { revalidateTags } from '../../core/revalidate.js'
import { sanitizeContent, sanitizeEntryFields } from '../../core/sanitize-html.js'
import { ContentType } from '../content-types/model.js'
import { requireContentType } from '../content-types/service.js'
/**
 * ⚠️ **Settings ka model, uski service nahi.** `settings/service.js` yahan se `syncPostUrlPattern`
 * import karti hai — service import karne se wo cycle ban jaata. Yahan sirf ek `findOne` chahiye.
 */
import { Settings } from '../settings/model.js'
import { recordAutoRedirect, removeRedirectsTo } from '../redirects/service.js'
/**
 * ⚠️ **Ye import circular hai** — `taxonomies/service.js` yahan se
 * `countEntriesUsingTaxonomy` leti hai (delete rokne ke liye).
 *
 * Wahi tark jo baaki teen jodiyon pe likha hai: dono taraf sirf `export async function`
 * declarations hain, aur koi bhi module load ke waqt doosre ko call nahi karta.
 */
/**
 * ⚠️ **Ye import bhi circular hai** — `master-lists/service.js` `taxonomies` se hoti hui
 * wapas yahan aati hai. Wahi tark: dono taraf sirf `export async function`, aur load ke
 * waqt koi kisi ko call nahi karta.
 */
import { findItemsByIds } from '../master-lists/service.js'
import { taxonomyExists } from '../taxonomies/service.js'
import { Entry, Revision } from './model.js'

/**
 * Entries ka business logic — R1. Poora Content Core yahan hai (D-46, spec 007 Slice 1).
 *
 * **Har write yahan se hota hai, model ke hook se kabhi nahi.** Ye module lagbhag har
 * jagah `findOneAndUpdate` use karta hai, aur wo `save` hooks chalata hi nahi — hook me
 * rakhi hui `path` calculation ya revision snapshot chup-chaap kabhi na chalne wali line
 * ban jaati.
 */

const scope = (siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) => ({ siteId, locale })

/**
 * Har entry pe kitni revisions rakhein.
 *
 * Cap zaroori hai: bina iske ek autosave-heavy page saal bhar me hazaaron snapshot bana
 * deta hai, aur har snapshot poora document hai. Ye number badalna safe hai — purani
 * revisions agle write pe khud prune ho jaati hain.
 */
const REVISION_RETENTION = 30

/** Slug collision pe kitni baar `-2`, `-3` try karein. */
const MAX_SLUG_ATTEMPTS = 50

/** Parent chain kitni gehri ja sakti hai — cycle aur bina-matlab ke gehre tree dono se bachav. */
const MAX_DEPTH = 10

/** `searchText` ki hadd — text index ko bina wajah bhaari karne se bachne ke liye. */
const MAX_SEARCH_TEXT = 20_000

function toApi(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

/** Regex me daalne se pehle path ke special characters escape — `.` aur `-` sabse aam hain. */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ── permissions ──────────────────────────────────────────────────────────────

/**
 * `.own` wale permissions ka asli check — spec 001 ke mutabik ye **service** ka kaam hai,
 * middleware ka nahi: `authorId` compare karne ke liye document chahiye, jo middleware ke
 * paas hota hi nahi.
 *
 * Route pe `requireAnyPermission(broad, own)` lagti hai (yaani "andar aane do"), aur asli
 * faisla yahan hota hai.
 *
 * @param {{ user: any, permissions: string[] }} actor
 * @param {{ authorId?: string|null }} entry
 * @param {string} broad  jaise `entry.update`
 * @param {string} own    jaise `entry.update.own`
 */
function assertCan(actor, entry, broad, own) {
  const permissions = actor?.permissions ?? []
  if (permissions.includes(broad)) return

  const actorId = actor?.user?._id ? String(actor.user._id) : null
  if (permissions.includes(own) && actorId && entry?.authorId === actorId) return

  throw forbidden('You can only do this to your own content')
}

// ── search text ──────────────────────────────────────────────────────────────

/**
 * `fields` me se saara text — package ka asli content isi me rehta hai (D-46).
 *
 * Recursive isliye ki `fields` me nested arrays/objects hote hain (itinerary ke din,
 * pricing ki categories). Sirf top level padhne ka matlab hota ki admin apne hi likhe
 * itinerary text ko search me na dhoondh paaye.
 */
function collectText(value, out, depth = 0) {
  if (depth > 12) return
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) out.push(trimmed)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, out, depth + 1)
    return
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectText(item, out, depth + 1)
  }
}

/**
 * Denormalized search text — title + excerpt + blocks + custom fields.
 *
 * MongoDB ek collection pe sirf **EK** text index deta hai, aur wo nested block tree ko
 * cover nahi karta. Iske bina admin ka search page ke body me kuch dhoondh hi nahi paata,
 * aur wo failure bilkul chup rehti hai — koi error nahi, bas "kuch nahi mila".
 */
function buildSearchText(entry) {
  const parts = [entry.title, entry.excerpt, extractBlockText(entry.content?.blocks ?? [])]
  collectText(entry.fields, parts)

  return parts.filter(Boolean).join(' ').slice(0, MAX_SEARCH_TEXT)
}

// ── fields ───────────────────────────────────────────────────────────────────

/**
 * `fields` ko contentType ke declare kiye hue shape se milaata hai.
 *
 * ⚠️ **Ye abhi poora field-DSL validator nahi hai.** `fields` `Mixed` hai (D-46) aur har
 * field type ka apna schema Phase 6 (content-type builder) ke saath aayega. Abhi sirf
 * `itinerary` validate hoti hai, aur uski wajah saaf hai: wo is package ka **sabse bada
 * structured hissa** hai (spec 007 §3), public page ka aadha render usi se banta hai, aur
 * uske andar reference hain (destination ids, transfer ids). Baaki fields aaj plain text
 * aur numbers hain — unpe garbage aane ka nateeja ek galat dikhta hua field hai, tooti hui
 * page nahi.
 *
 * **Har din ko stable `id` yahin milti hai**, model ke hook me nahi: writes
 * `findOneAndUpdate` se hote hain aur wo `save` hooks chalata hi nahi (R1). Hook me rakhne
 * ka nateeja hota ki ids chup-chaap assign hi na hon — aur phir reorder pe collapse state
 * galat din pe chipak jaati (D-43 §5).
 *
 * Maujood `id` **kabhi overwrite nahi hoti** — wo reorder ke aar-paar stable rehni chahiye.
 */
function normalizeFields(fields, contentType) {
  if (!fields) return fields

  const declares = (key) => contentType?.fields?.some((f) => f.key === key)
  const has = (key) => fields[key] !== undefined && declares(key)

  const out = { ...fields }

  if (has('itinerary')) {
    const days = itinerarySchema.parse(fields.itinerary)
    out.itinerary = days.map((day) => ({ ...day, id: day.id || randomUUID() }))
  }

  /**
   * Pricing (spec 007 §4) — yahan validate hone ki wajah itinerary wali hi hai, par ek
   * darja upar: iska galat hona ek galat dikhta hua field nahi, **galat daam** hai.
   *
   * `.parse()` defaults bhi bhar deta hai, isliye adhoora bhara hua pricing bhi page pe
   * poore shape me pahunchta hai — theme ko `?? 0` har jagah nahi likhna padta.
   */
  if (has('pricing')) out.pricing = pricingSchema.parse(fields.pricing)

  /** Har hotel row ki apni stable `id` — wahi wajah jo itinerary ke din pe hai. */
  if (has('hotels')) {
    const rows = packageHotelsSchema.parse(fields.hotels)
    out.hotels = rows.map((row) => ({ ...row, id: row.id || randomUUID() }))
  }

  /** Duplicate ids gir jaati hain — ek add-on do baar chunne ka koi matlab nahi. */
  if (has('addOns')) out.addOns = [...new Set(packageAddOnsSchema.parse(fields.addOns))]

  /** FAQ ki apni stable `id` — wahi wajah jo itinerary ke din pe hai (D-43 §5). */
  if (has('faqs')) {
    const faqs = faqsSchema.parse(fields.faqs)
    out.faqs = faqs.map((faq) => ({ ...faq, id: faq.id || randomUUID() }))
  }

  /**
   * Package ki apni rating (D-87). Khaali chhodne pe `packageDefaults.rating` chalti hai —
   * wo fallback **payload banate waqt** lagta hai, yahan nahi: store wahi hona chahiye jo
   * client ne likha, warna default badalne pe purane packages usi purani value pe atke
   * rehte. Wahi tark jo `sectionLabels` ke resolve pe hai (D-65).
   */
  if (has('rating')) out.rating = ratingSchema.parse(fields.rating)

  /** `.vrail` ke chaar cards — har card ki apni stable `id` (D-43 §5 wali wajah). */
  if (has('statRail')) {
    const stats = statRailSchema.parse(fields.statRail)
    out.statRail = stats.map((stat) => ({ ...stat, id: stat.id || randomUUID() }))
  }

  /**
   * Sidebar — `none` · `left` · `right` (D-87, client 8 Sep).
   *
   * Ek chhota enum hai, par parse phir bhi zaroori: theme isse seedha class me badalti hai
   * (`.pgl--sideleft`), aur bina rok ke koi bhi string wahan pahunch sakti hai.
   */
  /**
   * Page ka dikhne wala `<h1>` (client, 9 Sep).
   *
   * ⚠️ **Parse yahan zaroori hai** kyunki ye HTML hai: `pageHeadingSchema` `inlineHtmlSchema` pe
   * khada hai, yaani block tags (`<p>`, `<h2>`, `<table>`) is field me aa hi nahi sakte. Safai
   * `sanitizeEntryFields()` me alag se hoti hai — wo iske **baad** chalti hai (aakhri me), to
   * dono milkar poora pehra bana dete hain.
   */
  if (has('heading')) out.heading = pageHeadingSchema.parse(fields.heading)

  if (has('sidebar')) out.sidebar = sidebarPositionSchema.parse(fields.sidebar)

  /**
   * Kaunsa sidebar — `sidebars` collection ki id (D-88, client 8 Sep).
   *
   * ⚠️ **`sidebar: 'none'` hone par bhi ye value mitti nahi** — client left/right toggle
   * karke wapas aayega. Aur yahan id ka **maujood hona verify nahi** hota, jaan-boojh kar:
   * sidebar delete hamesha chalta hai (D-79), isliye ek dangling id bilkul aam haalat hai.
   * Uska jawab payload me hai — resolve na ho to sidebar render hi nahi hota (D-42 §2).
   */
  if (has('sidebarId')) out.sidebarId = sidebarIdSchema.parse(fields.sidebarId)

  /*
   * ⚠️ **`blocks` yahan **nahi** hai — 7 Sep ko badla (D-87 §7).**
   *
   * Kuch ghante ke liye yahan `fields.blocks` ka normalization tha. Client ne demo dekh kar
   * model palta: blocks ab `content.blocks[]` me hain, aur unka normalization
   * `normalizeContent()` me hai — `normalizeFields()` me nahi.
   */

  /**
   * ⚠️ **HTML ki safai sabse aakhir me — aur ye kram jaan-boojh kar hai** (D-80).
   *
   * `itinerary[].description` aur `faqs[].answer` ab HTML hain. Safai pehle likhi gayi thi,
   * aur wo **chup-chaap bekaar** thi: upar ke `has(...)` blocks `fields.*` (asli input) se
   * dobara parse karke `out.*` ko overwrite kar dete hain, yaani saaf ki hui value phir se
   * gandi value se badal jaati.
   *
   * Aakhir me rakhne se koi bhi naya `has(...)` block ise bypass nahi kar sakta — safai
   * hamesha jo bhi bana hai **uske upar** lagti hai.
   */
  return sanitizeEntryFields(out)
}

/**
 * `content.blocks[]` ka normalization — D-87 §7.
 *
 * Page ka content ab blocks ki **ek list** hai: `richText` (Text), `twoColumn`, `cards`,
 * `packageList`, `faqs`. Kram wahi hai jo array ka hai — admin drag se badalta hai.
 *
 * Yahan teen kaam hote hain, aur teenon wahi hain jo `normalizeFields()` package ke fields pe
 * karta hai:
 *
 * 1. **Props apne type ke schema se validate** — `parseBlockProps()`. Anjaan type ke props
 *    chhoot jaate hain, girte nahi (spec 002 ka Phase 5 escape hatch).
 * 2. **Har block ko stable `id`** — bina uske React ki key index ban jaati hai aur reorder pe
 *    khula hua panel galat block pe chipak jaata (D-43 §5).
 * 3. **Andar ke repeaters ko bhi id** — cards ke card, FAQs ka sawaal.
 *
 * ⚠️ HTML ki safai yahan **nahi** hai — wo `sanitizeContent()` me hai, aur wo is function ke
 * **baad** chalti hai. Wahi kram jo `normalizeFields()` pe hai aur usi wajah se: pehle safai
 * likhne se koi bhi naya parse step use chup-chaap overwrite kar deta.
 *
 * @param {any} content
 */
function normalizeContent(content) {
  if (!content?.blocks?.length) return content

  return {
    ...content,
    blocks: content.blocks.map((block) => {
      if (!block?.type) return block

      const props = parseBlockProps(block.type, block.props)
      const withIds =
        block.type === 'cards' || block.type === 'faqs'
          ? {
              ...props,
              items: (props.items ?? []).map((item) => ({ ...item, id: item.id || randomUUID() })),
            }
          : props

      return { ...block, id: block.id || randomUUID(), props: withIds }
    }),
  }
}

// ── taxonomy refs ────────────────────────────────────────────────────────────

/**
 * Har taxonomy id write se **pehle** verify hoti hai — maujood bhi ho, aur **sahi type**
 * ki bhi.
 *
 * Type ka check utna hi zaroori hai jitna maujoodgi ka: bina uske ek Package Type ki id
 * `destinations` me baithayi ja sakti hai. Wo save ho jaati, list me kuch galat nahi
 * dikhta, aur galti tab pakdi jaati jab public page pe breadcrumb ulta-seedha banta hai.
 *
 * Ye wahi invariant hai jo D-42 §2 ne media pe lagaya tha: asli bachav reference **banne**
 * se pehle hai, render pe nahi.
 */
async function assertTaxonomyRefs(taxonomies, contentType, siteId, locale) {
  if (!taxonomies) return

  for (const key of TAXONOMY_REF_KEYS) {
    const ids = taxonomies[key]
    if (!ids?.length) continue

    const type = TAXONOMY_TYPE_BY_REF_KEY[key]

    /**
     * Ye type wo taxonomy use karta bhi hai?
     *
     * Bina iske ek Post pe `destinations` set ki ja sakti hai — wo save ho jaati, list me
     * kuch galat nahi dikhta, aur galti tab pakdi jaati jab destination delete karne pe
     * ek aisi Post use rok deti hai jiska usse koi lena-dena hi nahi tha.
     */
    if (!contentType.taxonomyTypes?.includes(type)) {
      throw unprocessable(`${contentType.label} does not use ${type} items`)
    }

    for (const id of ids) {
      if (!(await taxonomyExists(id, type, siteId, locale))) {
        throw unprocessable(`One of the selected ${type} items could not be found`)
      }
    }
  }
}

// ── package refs (spec 007 §4, Slice 5) ──────────────────────────────────────

/**
 * Pricing aur hotels ke andar ke reference — write se **pehle** verify hote hain.
 *
 * Wahi invariant jo taxonomy refs pe upar hai aur jo D-42 §2 ne media pe lagaya tha:
 * bachav reference **banne** se pehle hai, render pe nahi. Yahan uski keemat sabse zyada
 * hai — ek toota hua `hotelId` public page ki hotels table me ek khaali row banata hai,
 * aur wo customer ko dikhta hai.
 *
 * Teen cheezein dekhi jaati hain, aur teenon Zod se nahi ho saktin (dono ko DB chahiye ya
 * poori list ek saath):
 *
 * 1. `hotelId` aur `addOns[]` ki ids sach me maujood hain
 * 2. `destinationId` sach me ek **Destination** hai — koi aur taxonomy nahi
 * 3. ek hi category (ya destination × category) do baar nahi aayi
 */
async function assertPackageRefs(fields, contentType, siteId, locale) {
  if (!fields) return

  const declares = (key) => contentType?.fields?.some((f) => f.key === key)

  // ── pricing: ek category ek hi baar, aur kaata hua daam asli se bada ──────
  if (fields.pricing !== undefined && declares('pricing')) {
    const rows = fields.pricing?.categoryPricing ?? []
    const seen = new Set()

    for (const row of rows) {
      /**
       * Duplicate category chup-chaap sabse bura hai: catbar me ek hi tab do baar aata
       * hai, aur `cheapestPricing()` unme se ek chun leta hai — page pe daam har build pe
       * badalta hua dikhta.
       */
      if (seen.has(row.category)) {
        throw unprocessable(
          `Each hotel category can only be priced once — ${row.category} is repeated`,
        )
      }
      seen.add(row.category)

      /**
       * Kaata hua daam asli se **bada** hona chahiye. Ye schema me nahi hai jaan-boojh kar
       * (`pricing.js`): wahan lagane ka matlab hota ki aadha bhara hua form save hi na ho.
       * Yahan wo poore document pe dekha jaata hai, jab dono number saamne hote hain.
       *
       * `priceFrom` khaali ho to kuch nahi dekha jaata — wo category is package pe milti hi
       * nahi, aur uske adhoore khaano pe error dena editor me chaaron rows bharwa dega.
       */
      if (row.priceFrom != null && row.strikePrice !== null && row.strikePrice <= row.priceFrom) {
        throw unprocessable('The struck-through price must be higher than the actual price')
      }
    }
  }

  // ── hotels: har id sach ho, aur ek jodi do baar na aaye ──────────────────
  if (fields.hotels !== undefined && declares('hotels')) {
    const rows = fields.hotels ?? []

    if (rows.length) {
      const hotels = await findItemsByIds(
        'hotel',
        rows.map((r) => r.hotelId),
        siteId,
      )
      const pairs = new Set()

      for (const row of rows) {
        if (!hotels.has(String(row.hotelId))) {
          throw unprocessable('One of the selected hotels could not be found')
        }

        if (!(await taxonomyExists(row.destinationId, TAXONOMY_TYPE.DESTINATION, siteId, locale))) {
          throw unprocessable('One of the selected destinations could not be found')
        }

        /**
         * Ek destination pe ek category ka ek hi hotel — warna public table me us island
         * ki do row aati hain aur customer ko pata hi nahi chalta ki wo kaunse hotel me
         * ruk raha hai.
         */
        const pair = `${row.destinationId}:${row.category}`
        if (pairs.has(pair)) {
          throw unprocessable('That destination already has a hotel for this category')
        }
        pairs.add(pair)
      }
    }
  }

  // ── add-ons: chune hue sab maujood hon ───────────────────────────────────
  if (fields.addOns !== undefined && declares('addOns')) {
    const ids = fields.addOns ?? []

    if (ids.length) {
      const addOns = await findItemsByIds('addOn', ids, siteId)

      if (addOns.size !== new Set(ids.map(String)).size) {
        throw unprocessable('One of the selected add-ons could not be found')
      }
    }
  }
}

/**
 * Kitni entries is taxonomy ko use kar rahi hain — trash waali bhi ginti me.
 *
 * `taxonomies` service isse delete se pehle bulati hai. Trashed bhi isliye gini jaati
 * hain ki wo restore ho sakti hain; unhe chhod dena matlab taxonomy mit jaana aur restore
 * pe entry ka reference kisi aisi id pe baithe rehna jo hai hi nahi.
 *
 * `$or` isliye ki id kisi bhi key me ho sakti hai — ek hi query me chaaron dekhi jaati
 * hain, chaar alag queries se nahi.
 */
export async function countEntriesUsingTaxonomy(taxonomyId, siteId = DEFAULT_SITE_ID) {
  return Entry.countDocuments({
    siteId,
    $or: TAXONOMY_REF_KEYS.map((key) => ({ [`taxonomies.${key}`]: String(taxonomyId) })),
  })
}

/**
 * Kai taxonomies ka usage ek saath — `{ [taxonomyId]: count }`.
 *
 * Taxonomy list screen har row pe "Packages" ka number dikhati hai. Har row ke liye alag
 * query karna N+1 hai: 40 destinations ki list = 41 requests. Ek aggregate me poori page
 * ka jawab aa jaata hai.
 *
 * Trashed entries yahan **nahi** gini jaatin — ye number client ko dikhta hai ("is
 * destination pe 12 packages hain"), aur trash me padi cheez uske liye maujood nahi hai.
 * Delete ka guard iske alawa hai aur wo trash ko bhi ginta hai (`countEntriesUsingTaxonomy`).
 *
 * @param {string[]} ids
 * @param {string} refKey `destinations` jaisi key
 */
export async function countEntriesByTaxonomy(ids, refKey, siteId = DEFAULT_SITE_ID) {
  if (!ids?.length || !TAXONOMY_REF_KEYS.includes(refKey)) return {}

  const field = `taxonomies.${refKey}`
  /**
   * Aggregate me field ka reference "$" se shuru hota hai (`$taxonomies.destinations`),
   * jabki `$match` ki key bina "$" ke hoti hai. Ye do alag cheezein hain aur inhe ek hi
   * template me likhna aasaan galti hai — Mongo ka message tab bilkul saaf hota hai
   * ("path option to $unwind stage should be prefixed with a $"), par sirf tab jab wo
   * chal jaaye.
   */
  const fieldRef = '$' + field

  const rows = await Entry.aggregate([
    { $match: { siteId, deletedAt: null, [field]: { $in: ids } } },
    { $unwind: fieldRef },
    { $match: { [field]: { $in: ids } } },
    { $group: { _id: fieldRef, count: { $sum: 1 } } },
  ])

  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]))
}

// ── slug + path ──────────────────────────────────────────────────────────────

/**
 * Parent ka path — hierarchical types ke liye.
 *
 * Non-hierarchical type pe parent ka koi matlab nahi hai, isliye wahan `/` lautta hai aur
 * `resolvePath()` `urlPattern` wala raasta leta hai.
 */
async function parentPathOf(parentId, contentType, siteId, locale) {
  if (!contentType.hierarchical || !parentId) return '/'

  if (!mongoose.isValidObjectId(parentId)) throw unprocessable('The selected parent is not valid')

  const parent = await Entry.findOne({
    _id: parentId,
    ...scope(siteId, locale),
    deletedAt: null,
  }).lean()

  if (!parent) throw unprocessable('The selected parent could not be found')

  /**
   * Parent ka type wahi hona chahiye. Alag type ka parent lene ka matlab hota ki bachche
   * ka path parent ke `urlPattern` se banta — yaani `/blog/x/child` jaisa URL jise koi
   * archive ya template samajh hi nahi paata.
   */
  if (parent.type !== contentType.key) {
    throw unprocessable('The parent must be of the same content type')
  }

  return parent.path
}

/**
 * Naye parent se cycle to nahi ban rahi? — `A → B → A`.
 *
 * Cycle ka nateeja chup-chaap hota hai: `parentPathOf` chalta rehta hai, par path banate
 * waqt walk kabhi khatam nahi hoti. Isliye check parent **set karte waqt** hai, padhte
 * waqt nahi.
 */
async function assertNoCycle(entryId, parentId, siteId, locale) {
  let current = parentId
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (!current) return
    if (String(current) === String(entryId)) {
      throw unprocessable('An item cannot be placed inside itself')
    }

    const parent = await Entry.findOne({ _id: current, ...scope(siteId, locale) })
      .select('parentId')
      .lean()

    if (!parent) return
    current = parent.parentId
  }

  throw unprocessable(`Items can only be nested ${MAX_DEPTH} levels deep`)
}

/**
 * Free slug aur uska path dhoondhta hai — collision pe `-2`, `-3`.
 *
 * **Dono uniqueness ek saath check hoti hain**, kyunki wo do alag constraints hain:
 * `{siteId, type, slug}` aur `{siteId, locale, path}`. Sirf slug check karne ka matlab
 * hota ki ek `page` "about" aur ek custom type "about" dono `/about` claim karte, aur
 * failure Mongo ke duplicate-key error ke roop me aati — admin ko "E11000" dikhta.
 *
 * ⚠️ **Trashed entries bhi apna slug aur path pakde rehti hain** — is query me
 * `deletedAt: null` jaan-boojh kar nahi hai. Warna trash me padi entry restore hone pe
 * kisi doosri entry se takra jaati, aur wo failure restore ke waqt aati — us waqt jab
 * user ko sabse kam umeed hoti hai.
 */
async function resolveSlugAndPath({
  slug,
  title,
  type,
  parentId,
  excludeId,
  contentType,
  siteId,
  locale,
}) {
  const base = slugify(slug || title)

  if (!base) {
    throw unprocessable(
      'This title cannot be turned into a link automatically. Please enter the URL slug yourself.',
    )
  }

  const parentPath = await parentPathOf(parentId, contentType, siteId, locale)

  for (let n = 1; n <= MAX_SLUG_ATTEMPTS; n++) {
    const candidate = suffixSlug(base, n)

    /**
     * Reserved slug pe rukte nahi, **aage badhte hain** — `/media` maangne wale ko
     * `/media-2` mil jaata hai. Error dena bhi sahi hota, par ye wahi vyavhaar hai jo
     * collision pe pehle se hai, aur non-technical user ke liye ek hi jaisa rehta hai.
     */
    if (isReservedSlug(candidate)) continue

    const path = resolvePath({ slug: candidate, parentPath }, contentType)

    const clash = await Entry.findOne({
      ...scope(siteId, locale),
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      $or: [{ type, slug: candidate }, { path }],
    })
      .select('_id')
      .lean()

    if (!clash) return { slug: candidate, path }
  }

  throw conflict('Could not find a free URL for this item. Please choose a different slug.')
}

/**
 * Parent ka path badla — saare descendants ka path rebase karo.
 *
 * Ye sirf hierarchical types pe chalta hai. Bina iske `/about` → `/company` karne pe
 * `/about/team` wahin pada rehta: uska stored path ek aise parent ko point karta jo ab
 * hai hi nahi, aur wo entry sirf apne purane URL pe milti — jab tak koi use haath se
 * dobara save na kare.
 *
 * **Purane path pe 301 bhi banta hai** — har descendant pe alag (A-6, D-49). Wo kaam
 * `redirects` service karti hai; yahan sirf purani aur nayi jodi nikaali jaati hai.
 *
 * Isiliye ye function `{ oldPath, newPath }` lautata hai, sirf documents nahi: caller ko
 * dono chahiye, aur update ke **baad** purana path kahin bacha hi nahi rehta.
 */
async function cascadeDescendantPaths(oldPath, newPath, siteId, locale) {
  if (oldPath === newPath) return []

  const descendants = await Entry.find({
    ...scope(siteId, locale),
    path: new RegExp(`^${escapeRegex(oldPath)}/`),
  })
    .select('_id path type taxonomies')
    .lean()

  if (descendants.length === 0) return []

  const moved = descendants.map((child) => ({
    ...child,
    oldPath: child.path,
    path: rebasePath(child.path, oldPath, newPath),
  }))

  await Entry.bulkWrite(
    moved.map((child) => ({
      updateOne: { filter: { _id: child._id }, update: { $set: { path: child.path } } },
    })),
  )

  // Har descendant ka purana URL bhi kisi ne share kiya ho sakta hai — sirf parent pe
  // redirect banane ka matlab hai ki bachche ke saare link chup-chaap mar jaate hain
  for (const child of moved) {
    await recordAutoRedirect(child.oldPath, child.path, siteId, locale)
  }

  /**
   * Descendants ka `version` jaan-boojh kar **nahi** badhta: unka content badla hi nahi,
   * sirf unka path. Version badhane ka matlab hota ki jis editor ne bachcha page khol
   * rakha hai, use save pe bina wajah 409 mile.
   */
  return moved
}

// ── cache ────────────────────────────────────────────────────────────────────

/**
 * Ek entry ke stale tags — `cache-invalidation` skill ka dependency map.
 *
 * Ye ek **graph** hai, ek path nahi: entry ka apna page, uske type ki list aur archive,
 * har taxonomy archive jisme wo hai, sitemap, aur post pe RSS. `revalidatePath()` in me
 * se sirf pehla saaf karta — baaki chup-chaap purane rehte.
 */
function tagsFor(entry) {
  if (!entry) return []

  return [
    `entry:${entry._id ?? entry.id}`,
    `type:${entry.type}`,
    /**
     * **Path ka apna tag** — bina iske public page kabhi saaf hi nahi hota.
     *
     * `apps/web` ka resolve fetch `path:` se tag hota hai, kyunki fetch se **pehle** id
     * pata hi nahi hoti (aur 404 wale raaste pe to hoti hi nahi). Sirf `entry:{id}`
     * bhejne ka matlab tha ki wo tag kisi fetch pe laga hi nahi hai — yaani publish ke
     * baad bhi purana page cache me baitha rehta.
     *
     * Ye theek wahi failure hai jiski chetavni `cache-invalidation` skill deti hai:
     * "publish kiya par site update nahi hui". Aur uska hi sabak: tag wahan se lo jahan
     * fetch sach me hota hai.
     */
    entry.path ? `path:${entry.path}` : null,
    /**
     * **Har** taxonomy key, sirf categories/tags nahi (A-7, D-49).
     *
     * Pehle ye do keys hardcoded thin. Destinations `fields` me chali jaatin to ye tag
     * unke liye banta hi nahi — destination archive publish ke baad bhi purana dikhta
     * rehta, aur wajah kahin dikhti nahi. Yahi D-43 §4 wali galti ka agla roop hota.
     */
    ...TAXONOMY_REF_KEYS.flatMap((key) => (entry.taxonomies?.[key] ?? []).map((id) => `tax:${id}`)),
    'sitemap',
    entry.type === 'post' ? 'feed' : null,
  ].filter(Boolean)
}

/**
 * Blog listing pages ke `path:` tag — **spec 008**.
 *
 * ## ⚠️ Ye kyun zaroori hai: `type:post` ko koi padhta hi nahi
 *
 * `tagsFor()` `type:${entry.type}` pehle se bhejta hai, par `apps/web` me use **koi fetch
 * nahi lagati**. `lib/cms.js` ka resolve sirf `path:` se tag hota hai — yaani blog listing ka
 * cache `path:/blog` pe hai, aur naya post publish hone pe wo **saaf hota hi nahi**. Post
 * dikhta CACHE_SECONDS ke baad, aur uski koi error kahin nahi aati.
 *
 * Ye bilkul D-83 wali shakl hai: revalidate ka poora dhaancha khada tha aur ek din chala nahi.
 * Aur blog pe ye zyada chubhta hai kyunki `postList` **query se** chalta hai (spec 008) —
 * "publish karo, turant dikhe" hi uska poora point hai.
 *
 * ## Ilaaj: tag wahan se lo jahan fetch sach me hota hai
 *
 * Wahi niyam jo `tagsFor()` ke `path:` wale comment me likha hai. Listing pages dhoondh kar
 * unka apna `path:` bheja jaata hai — wahi tag jispe unka cache sach me baitha hai.
 *
 * ⚠️ **`resolvePath()` me `type:post` jodna ilaaj NAHI tha** — wo fetch **har** URL pe chalti
 * hai (fetch se pehle type pata hi nahi hota), to ek post publish poori site ka cache uda
 * deta.
 *
 * ⚠️ Sirf `post` pe query chalti hai. Baaki har type pe ye function bina Mongo chhue lauta
 * jaata hai.
 */
async function blogListingTags(entries) {
  const posts = entries.filter((e) => e?.type === 'post')
  if (!posts.length) return []

  const siteIds = [...new Set(posts.map((e) => e.siteId).filter(Boolean))]

  const pages = await Entry.find({
    ...(siteIds.length ? { siteId: { $in: siteIds } } : {}),
    type: 'blogPage',
    deletedAt: null,
    /** Jis listing page pe `postList` hai hi nahi, uspe post ka koi asar nahi. */
    'content.blocks.type': 'postList',
  })
    .select('path')
    .lean()

  return pages.map((p) => (p.path ? `path:${p.path}` : null)).filter(Boolean)
}

/**
 * Post ke URL ki shakl badalna — `/blog/{slug}` ↔ `/{slug}` (spec 008, client 10 Sep).
 *
 * ## ⚠️ Ye ek "setting save" nahi hai, ek **bulk rename** hai
 *
 * `contentTypes.post.urlPattern` badalne se **har post ka path** badalta hai. `content-types`
 * service is raaste ko jaan-boojh kar band rakhti hai (`updateContentType()` entries hone par
 * `urlPattern` badalne se mana kar deti hai), aur uske comment me wajah likhi hai:
 *
 * > _"Har entry ka path dobara likhna ek alag, bulk operation hai ('convert URL pattern'), aur
 * > wo abhi nahi bana. Us tak ye raasta band hai, kyunki **aadha kiya gaya rename hi wo case
 * > hai jisme link chup-chaap 404 hone lagte hain**."_
 *
 * Ye function wahi bulk operation hai. Isliye teen kaam **ek saath** hote hain aur teenon
 * zaroori hain: pattern badlo, har path dobara likho, aur **har purane path se 301 banao**.
 * Teesra chhoot jaye to client ke share kiye hue aur Google me index ho chuke saare blog link
 * mar jaate hain — aur wo bilkul chup failure hoti.
 *
 * ## ⚠️ `hierarchical` se ye kaam kyun nahi ho sakta
 *
 * Pehli soch yahi thi ki `nested` mode me `post.hierarchical = true` kar do aur path parent
 * chain se bane. Wo **chalta nahi**: `ensureBuiltInContentTypes()` `hierarchical` ko **har seed
 * pe** wapas seed ki value pe le aata hai (uska comment: _"`fields` `supports` `taxonomyTypes`
 * `hasBuilder` `hierarchical` → hamesha"_). Agla `pnpm seed` setting chup-chaap palat deta.
 * `urlPattern` sirf create pe set hota hai, isliye wahi ek bacha hua raasta hai.
 *
 * ## Prefix blog page ke slug se aata hai
 *
 * ⚠️ **Hardcoded `/blog` nahi.** Client ka listing page ek aam entry hai; uska slug `guides` bhi
 * ho sakta hai. Admin me dropdown ka label _"Under the blog page"_ kehta hai — to prefix us page
 * ka apna slug hona chahiye, warna label jhooth bolta. Listing page bana hi na ho to `blog` pe
 * gir jaata hai (wahi jo `post` type me shuru se hai).
 *
 * @returns {Promise<{ changed: boolean, pattern: string, moved: number }>}
 */
export async function syncPostUrlPattern(siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const settings = await Settings.findOne({ siteId }).lean()
  const mode = settings?.blogSettings?.postUrlMode ?? 'nested'

  /** Wahi kasauti jo `blogListingTags()` aur `resolveBlogPath()` ki hai — ek hi listing page. */
  const listing = await Entry.findOne({
    ...scope(siteId, locale),
    type: 'blogPage',
    deletedAt: null,
    'content.blocks.type': 'postList',
  })
    .sort({ createdAt: 1 })
    .select('slug')
    .lean()

  const prefix = listing?.slug || 'blog'
  const pattern = mode === 'root' ? '/{slug}' : `/${prefix}/{slug}`

  /**
   * ⚠️ **`scope()` yahan use NAHI kiya ja sakta — wo `locale` bhi bhejta hai.**
   *
   * `contentTypes` me `locale` hai hi nahi (`model.js`: _"uniqueness `{siteId, key}` hai,
   * `{siteId, locale, key}` nahi"_). `scope()` ka default `locale: 'en'` query me chala jaata
   * aur us collection me kuch match hi nahi hota — yaani switch **chup-chaap kuch na karta**.
   *
   * ⚠️ Ye asli DB pe **chal raha tha aur test pe fail** — kyunki purane instance ke document me
   * ek legacy `locale` field pada hai. Yahi wo kism ka farak hai jise sirf test pakadta hai.
   */
  const contentType = await ContentType.findOne({ siteId, key: 'post' })
  if (!contentType) return { changed: false, pattern, moved: 0 }
  if (contentType.urlPattern === pattern) return { changed: false, pattern, moved: 0 }

  await ContentType.updateOne({ _id: contentType._id }, { $set: { urlPattern: pattern } })

  /**
   * ⚠️ **Trash ke post bhi** — unka path unke document me pada hai aur restore hone pe wahi
   * wapas live ho jaata. Unhe chhodne ka matlab hota ki restore ke baad wo purane pattern pe
   * baithe rahein, jise ab koi route nahi janta.
   */
  /**
   * `type` aur `siteId` bhi — `blogListingTags()` inhi se post pehchanta hai aur listing page
   * dhoondhta hai. Inke bina wo khaali lautata aur listing ka cache phir chhoot jaata.
   */
  const posts = await Entry.find({ ...scope(siteId, locale), type: 'post' })
    .select('_id slug path type siteId')
    .lean()

  const moved = posts
    .map((post) => ({ ...post, newPath: normalizePath(pattern.replace('{slug}', post.slug)) }))
    .filter((post) => post.newPath !== post.path)

  let tags = []

  if (moved.length) {
    await Entry.bulkWrite(
      moved.map((post) => ({
        updateOne: { filter: { _id: post._id }, update: { $set: { path: post.newPath } } },
      })),
    )

    /**
     * ⚠️ **Har post ka apna 301** — D-49 ka wahi tark jo `cascadeDescendantPaths()` pe likha
     * hai: sirf listing page pe redirect banane ka matlab hai ki har post ka link chup-chaap
     * mar jaaye. `recordAutoRedirect()` khud chain flatten aur loop se bachav karti hai.
     */
    for (const post of moved) {
      await recordAutoRedirect(post.path, post.newPath, siteId, locale)
    }

    /**
     * ⚠️ Purane **aur** naye dono path ke tag saaf hote hain. Sirf naya bhejne ka matlab hota
     * ki purana URL cache me 200 deta rahe jabki ab wahan 301 hona chahiye.
     *
     * ⚠️ **Aur listing page ka bhi** — `blogListingTags()`, wahi jo `invalidate()` use karta hai.
     * Ye 11 Sep ko A-21 ki jaanch me pakda gaya (production build pe): iske bina `/blog` ke card
     * **ek ghante tak** (`CACHE_SECONDS`) purane URL pe link karte the. `type:post` akela kuch
     * nahi karta — web me use koi fetch lagati hi nahi.
     */
    tags = [
      ...moved.flatMap((post) => [`path:${post.path}`, `path:${post.newPath}`]),
      ...(await blogListingTags(moved)),
      'type:post',
      'sitemap',
      'feed',
    ]

    await revalidateTags(tags)
  }

  /** `tags` isliye lautte hain ki test dekh sake **kaunse** tags gaye — wahi hissa jo chup tha. */
  return { changed: true, pattern, moved: moved.length, tags }
}

/** Entry + uske cascade hue descendants, sab ek hi call me. */
async function invalidate(entry, descendants = []) {
  const all = [entry, ...descendants].filter(Boolean)

  await revalidateTags([
    ...tagsFor(entry),
    ...descendants.flatMap(tagsFor),
    ...(await blogListingTags(all)),
  ])
}

// ── revisions ────────────────────────────────────────────────────────────────

/**
 * Snapshot — **save pe aur publish pe dono** (R7).
 *
 * Dono isliye ki wo do alag sawaalon ke jawab hain: "maine aadhe ghante pehle kya likha
 * tha" aur "live pe abhi kya hai". Sirf publish pe rakhne se draft ka kaam kabhi recover
 * nahi hota.
 *
 * @param {any} entry poora document jo store hua
 * @param {string|null} createdBy
 * @param {'save'|'publish'} kind
 */
async function createRevision(entry, createdBy, kind) {
  const plain = typeof entry.toObject === 'function' ? entry.toObject() : entry
  const { _id, __v, ...snapshot } = plain

  await Revision.create({ entryId: String(_id), snapshot, createdBy, kind })

  /**
   * Retention cap — sabse purani revisions hata do.
   *
   * `skip()` ke saath isliye ki hume "31 se aage waali sab" chahiye, "N din se purani"
   * nahi: ek page jo roz edit hota hai aur ek jo saal me ek baar, dono ko ek jaisi
   * history milni chahiye.
   */
  const stale = await Revision.find({ entryId: String(_id) })
    .sort({ createdAt: -1 })
    .skip(REVISION_RETENTION)
    .select('_id')
    .lean()

  if (stale.length > 0) {
    await Revision.deleteMany({ _id: { $in: stale.map((r) => r._id) } })
  }
}

// ── reads ────────────────────────────────────────────────────────────────────

/**
 * Kisi type ki kitni entries hain — trash waali bhi ginti me.
 *
 * `content-types` service isse do jagah bulati hai: URL pattern badalne se pehle, aur
 * type delete karne se pehle. Trashed bhi isliye gini jaati hain ki wo restore ho sakti
 * hain — unhe chhod dena matlab type delete ho jaana aur restore pe orphan entry milna.
 */
export async function countEntriesOfType(type, siteId = DEFAULT_SITE_ID) {
  return Entry.countDocuments({ siteId, type })
}

/**
 * Admin ki list — server-side pagination day 1 se (R14).
 *
 * Har param `entryListQuerySchema` se guzar chuka hai (R9). `req.query` ko yahan spread
 * karna is codebase ka sabse seedha NoSQL-injection raasta hai, kyunki `fields` Mixed hai.
 */
export async function listEntries(query, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const { page, limit, sort, order, trashed, q, ...filters } = query

  const filter = {
    ...scope(siteId, locale),
    // Trash ek alag view hai, list ka filter nahi — dono ek saath kabhi nahi dikhte (R12)
    deletedAt: trashed ? { $ne: null } : null,
  }

  for (const key of ['type', 'status', 'authorId', 'parentId']) {
    if (filters[key] !== undefined) filter[key] = filters[key]
  }
  /**
   * Taxonomy filters — param ka naam wahi hai jo storage key ka hai
   * (`?destinations=<id>`). Sirf known keys, isliye `req.query` yahan bhi kabhi seedha
   * query me nahi jaati (R9).
   */
  for (const key of TAXONOMY_REF_KEYS) {
    if (filters[key]) filter[`taxonomies.${key}`] = filters[key]
  }

  /**
   * Duration ka bucket — `fields.nights` pe (D-87, client 8 Sep).
   *
   * ⚠️ Query ka shape `durationQuery()` banati hai, yahan nahi. Bucket ka matlab (khaas kar
   * `d8plus` = 8 aur usse zyada) ek hi jagah likha hona chahiye — dono taraf likhne ka matlab
   * hota ki kal `LONG_STAY_FROM` badle aur ek taraf purana 8 rah jaaye.
   */
  Object.assign(filter, durationQuery(filters.duration) ?? {})

  /**
   * `All dates` — ek mahine ke post (client, 10 Sep).
   *
   * ⚠️ **Range se, `$expr`/`$month` se nahi.** `$expr` har document pe date todta hai, yaani
   * index ka koi faayda nahi milta; range `{siteId, type, status, publishAt: -1}` wale
   * maujooda index (migration 001) pe seedha chalti hai.
   *
   * ⚠️ Mahina **UTC** me kaata gaya hai, kyunki `publishAt` UTC me store hoti hai. Local time
   * me kaatne se mahine ke pehle/aakhri din ke post kabhi idhar kabhi udhar chale jaate —
   * wahi jaal jo D-41 ke storage key pe likha hua hai.
   */
  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number)
    filter.publishAt = {
      $gte: new Date(Date.UTC(year, month - 1, 1)),
      $lt: new Date(Date.UTC(year, month, 1)),
    }
  }

  /**
   * Search `searchText` pe chalti hai, `$text` pe nahi.
   *
   * `$text` poore document ka text index use karta par usse `type`/`status` filter ke
   * saath sort karna Mongo pe mehnga aur anpredictable ho jaata hai. Admin ki list
   * hamesha kisi ek type ke andar dhoondhti hai, isliye prefix-friendly regex kaafi hai.
   */
  if (q) filter.searchText = new RegExp(escapeRegex(q), 'i')

  const [docs, total] = await Promise.all([
    Entry.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Entry.countDocuments(filter),
  ])

  return { entries: docs.map(toApi), meta: { page, limit, total } }
}

/**
 * List screen ke tabs ke counts — All · Published · Drafts · Sold Out · Trash.
 *
 * **Ek call me sab**, paanch alag requests se nahi: tabs ek saath render hote hain, aur
 * paanch requests ka matlab hai paanch alag waqt ke jawab — ek tab 58 dikhata aur doosra
 * 57, aur wo farq kabhi samajh nahi aata.
 *
 * `all` me trash **nahi** hai. WordPress se yahi ummeed hai, aur "All (64)" ke baad
 * "Trash (1)" dikhna hi tab wo 64 ko 65 nahi banata.
 */
export async function entryCounts(type, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const base = { ...scope(siteId, locale), type }
  const live = { ...base, deletedAt: null }

  const [all, published, draft, pending, scheduled, isPrivate, trash] = await Promise.all([
    Entry.countDocuments(live),
    Entry.countDocuments({ ...live, status: ENTRY_STATUS.PUBLISHED }),
    Entry.countDocuments({ ...live, status: ENTRY_STATUS.DRAFT }),
    Entry.countDocuments({ ...live, status: ENTRY_STATUS.PENDING }),
    Entry.countDocuments({ ...live, status: ENTRY_STATUS.SCHEDULED }),
    Entry.countDocuments({ ...live, status: ENTRY_STATUS.PRIVATE }),
    Entry.countDocuments({ ...base, deletedAt: { $ne: null } }),
  ])

  /**
   * `All dates` dropdown ki list — jin mahinon me sach me post hain (client, 10 Sep).
   *
   * ⚠️ **Yahan banti hai, list endpoint pe nahi** — wo ek page hi deta hai, aur uske 20 rows
   * se banaya gaya dropdown har page pe badal jaata. Ye tabs ki ginti ke saath aata hai, jo
   * waise bhi poore collection pe chalti hai.
   *
   * Trash ke post isme nahi hain (`live`) — wo list me dikhte hi nahi.
   */
  const months = await Entry.aggregate([
    { $match: { ...live, publishAt: { $ne: null } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$publishAt' } } } },
    { $sort: { _id: -1 } },
    { $limit: 120 },
  ])

  return {
    all,
    published,
    draft,
    pending,
    scheduled,
    private: isPrivate,
    trash,
    months: months.map((m) => m._id),
  }
}

/** Ek entry — trash me padi ho to bhi milti hai, taaki Trash screen use dikha sake. */
export async function getEntry(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const doc = await Entry.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!doc) throw notFound('Item not found')

  return toApi(doc)
}

// ── writes ───────────────────────────────────────────────────────────────────

export async function createEntry(input, actor, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const contentType = await requireContentType(input.type, siteId)

  await assertTaxonomyRefs(input.taxonomies, contentType, siteId, locale)
  await assertPackageRefs(input.fields, contentType, siteId, locale)

  const { slug, path } = await resolveSlugAndPath({
    slug: input.slug,
    title: input.title,
    type: input.type,
    parentId: input.parentId,
    contentType,
    siteId,
    locale,
  })

  /**
   * `status` create pe client se aata hai par **publish yahan se nahi hota**.
   *
   * Naya item hamesha draft/pending pe utarta hai; live karne ka ek hi raasta hai —
   * `publishEntry()`, jahan permission check aur revision dono hote hain. Bina iske
   * `contributor` create ke waqt `status: 'published'` bhej kar poora publish flow
   * bypass kar leta.
   */
  const requested = input.status ?? ENTRY_STATUS.DRAFT
  const status = requested === ENTRY_STATUS.PENDING ? ENTRY_STATUS.PENDING : ENTRY_STATUS.DRAFT

  /**
   * ⚠️ **Kram: pehle normalize, phir safai** (D-87 §7).
   *
   * Ulta karne ka matlab hota ki `parseBlockProps()` saaf ki hui HTML ko phir se input wali
   * gandi value se badal de — theek wahi jaal jo `normalizeFields()` ke aakhir me likha hai
   * (D-80).
   */
  const content = sanitizeContent(normalizeContent(input.content))

  const doc = await Entry.create({
    ...input,
    ...scope(siteId, locale),
    slug,
    path,
    status,
    /** Overview ka rich text — HTML hai, isliye write pe saaf (D-80). */
    content,
    fields: normalizeFields(input.fields, contentType) ?? {},
    publishAt: null,
    authorId: actor?.user?._id ? String(actor.user._id) : null,
    version: 0,
    searchText: buildSearchText(input),
  })

  await createRevision(doc, doc.authorId, 'save')

  return toApi(doc)
}

/**
 * Update — `version` mismatch pe `409`.
 *
 * Autosave har 30s chalti hai aur do editor ek hi page pe aam baat hai. Bina version ke
 * "last write wins" chup-chaap kisi ka poora kaam mita deta hai; client apna padha hua
 * version wapas bhejta hai aur badal chuka ho to use bataya jaata hai.
 */
export async function updateEntry(
  id,
  input,
  actor,
  siteId = DEFAULT_SITE_ID,
  locale = DEFAULT_LOCALE,
) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!current) throw notFound('Item not found')

  assertCan(actor, current, PERMISSION.ENTRY_UPDATE, PERMISSION.ENTRY_UPDATE_OWN)

  if (input.version !== current.version) {
    throw conflict('Someone else changed this item while you were editing')
  }

  const contentType = await requireContentType(current.type, siteId)

  await assertTaxonomyRefs(input.taxonomies, contentType, siteId, locale)
  await assertPackageRefs(input.fields, contentType, siteId, locale)

  const next = { ...current, ...input }
  const $set = { version: current.version + 1 }

  for (const key of [
    'title',
    'excerpt',
    'content',
    'fields',
    'seo',
    'taxonomies',
    'templateId',
    'featuredImageId',
    'order',
  ]) {
    if (input[key] !== undefined) $set[key] = input[key]
  }

  /** Upar wale loop ne `content` set kiya hai — usme HTML hai, isliye yahan saaf (D-80). */
  if (input.content !== undefined) {
    $set.content = sanitizeContent(normalizeContent(input.content))
  }

  if (input.fields !== undefined) $set.fields = normalizeFields(input.fields, contentType)

  /**
   * `type` badalna allowed nahi.
   *
   * Type badalne ka matlab hai naya `urlPattern`, naya field set aur naya archive — yaani
   * path rebuild aur purane URL pe redirect. Wo ek alag, soch-samajh kar banaya jaane wala
   * operation hai ("convert to"), chupke se PATCH me nahi.
   */
  if (input.type !== undefined && input.type !== current.type) {
    throw unprocessable('The content type of an existing item cannot be changed')
  }

  const parentChanged = input.parentId !== undefined && input.parentId !== current.parentId
  const slugChanged = input.slug !== undefined && input.slug !== current.slug
  const titleChanged = input.title !== undefined && input.title !== current.title

  let descendants = []

  /**
   * Path sirf tab dobara banta hai jab uska koi input badla ho.
   *
   * Title badalne se slug **apne aap nahi** badalta — sirf tab jab slug pehle se auto-
   * generated ho aur entry abhi tak draft ho. Published page ka URL title edit karne se
   * badal jaana wo tarah ka accident hai jo SEO ko chup-chaap le doobta hai.
   */
  const autoSlug = current.slug === slugify(current.title)
  const shouldReslug =
    slugChanged ||
    parentChanged ||
    (titleChanged && autoSlug && current.status === ENTRY_STATUS.DRAFT)

  if (shouldReslug) {
    if (parentChanged) await assertNoCycle(id, input.parentId, siteId, locale)

    const resolved = await resolveSlugAndPath({
      slug: slugChanged ? input.slug : titleChanged && autoSlug ? '' : current.slug,
      title: next.title,
      type: current.type,
      parentId: parentChanged ? input.parentId : current.parentId,
      excludeId: id,
      contentType,
      siteId,
      locale,
    })

    $set.slug = resolved.slug
    $set.path = resolved.path
    if (parentChanged) $set.parentId = input.parentId

    descendants = await cascadeDescendantPaths(current.path, resolved.path, siteId, locale)

    /**
     * Entry ka apna purana URL — yahi wo link hai jo client ne share kiya hota hai.
     *
     * Redirect **path badalne pe** banta hai, publish state dekhe bina: ek draft ka URL
     * kisi ke paas nahi hota, par usi entry ka publish hone ke baad slug badalna aam baat
     * hai, aur us waqt "kya ye pehle published thi" ka hisaab rakhna ek aur state hai jo
     * galat ho sakti hai. Ek bekaar redirect ki keemat ek toote hue link se kam hai.
     */
    await recordAutoRedirect(current.path, resolved.path, siteId, locale)

    /**
     * **Purana path bhi stale hai** — ab wahan 301 lagna chahiye, aur uska pehle wala
     * (200 wala) jawab cache me pada hai. Naye path ka tag `invalidate()` khud laga deta
     * hai; purana yahan se jaata hai, kyunki uske baad wo entry pe bacha hi nahi.
     *
     * Descendants ke purane paths bhi — unke bhi redirect bane hain.
     */
    await revalidateTags([
      `path:${current.path}`,
      ...descendants.map((child) => `path:${child.oldPath}`),
    ])
  } else if (parentChanged) {
    $set.parentId = input.parentId
  }

  $set.searchText = buildSearchText({ ...next, ...$set })

  const updated = await Entry.findOneAndUpdate({ _id: id }, { $set }, { new: true })

  await createRevision(updated, actor?.user?._id ? String(actor.user._id) : null, 'save')
  await invalidate(updated, descendants)

  /**
   * ⚠️ **Blog listing page ka slug badla to post ke URL bhi badalne chahiye** (spec 008).
   *
   * `nested` mode me post ka prefix us page ke slug se aata hai, aur admin ka dropdown kehta
   * hai _"Under the blog page"_. Bina is hook ke wo label ek din jhooth bolta: page `/guides`
   * pe chala jaata aur post `/blog/…` pe padey rehte.
   *
   * ⚠️ **Path-prefix cascade akela kaafi NAHI hai.** `cascadeDescendantPaths()` post ke `path`
   * badal deta hai, par `contentTypes.post.urlPattern` purana reh jaata — aur agle save pe
   * `resolveSlugAndPath()` path wapas purane pattern pe le aata. Yaani ek adha-badla naam,
   * jo save karte hi chup-chaap palat jaata.
   *
   * `syncPostUrlPattern()` khud dekh leta hai ki kuch badla bhi hai ya nahi.
   */
  /**
   * ⚠️ `slugChanged` **nahi** — wo sirf haath se badle gaye slug ko pakadta hai. Title badalne
   * pe bhi slug apne aap badal jaata hai (`autoSlug`), aur wo bhi utna hi badlaav hai.
   */
  if (updated.type === 'blogPage' && updated.slug !== current.slug) {
    await syncPostUrlPattern(siteId, locale)
  }

  return toApi(updated)
}

// ── lifecycle ────────────────────────────────────────────────────────────────

/**
 * Publish — ya `publishAt` future me ho to **schedule**.
 *
 * Scheduling DB-based hai (R2): status `scheduled` + indexed `publishAt`. `setTimeout`
 * kabhi nahi — wo process restart pe gayab ho jaata hai aur us page ka publish hamesha
 * ke liye ruk jaata hai, bina kisi error ke.
 */
export async function publishEntry(
  id,
  input,
  actor,
  siteId = DEFAULT_SITE_ID,
  locale = DEFAULT_LOCALE,
) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!current) throw notFound('Item not found')

  assertCan(actor, current, PERMISSION.ENTRY_PUBLISH, PERMISSION.ENTRY_PUBLISH_OWN)

  if (input.version !== undefined && input.version !== current.version) {
    throw conflict('Someone else changed this item while you were editing')
  }

  const publishAt = input.publishAt ? new Date(input.publishAt) : null
  const isFuture = publishAt && publishAt.getTime() > Date.now()

  /**
   * `private` = published, par sirf logged-in user ko dikhta hai (02-ARCHITECTURE §5).
   *
   * Scheduled + private ek saath ka koi matlab nahi banta: schedule ka poora point hai
   * "us waqt public ho jaana". Isliye future `publishAt` ke saath visibility ignore hoti
   * hai — wo schedule ke din ki baat hai.
   */
  const publishedStatus =
    input.visibility === 'private' ? ENTRY_STATUS.PRIVATE : ENTRY_STATUS.PUBLISHED

  const updated = await Entry.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: isFuture ? ENTRY_STATUS.SCHEDULED : publishedStatus,
        publishAt: publishAt ?? new Date(),
        version: current.version + 1,
      },
    },
    { new: true },
  )

  await createRevision(updated, actor?.user?._id ? String(actor.user._id) : null, 'publish')
  await invalidate(updated)

  return toApi(updated)
}

/**
 * Unpublish — wapas draft. `publishAt` saaf hota hai, warna cron use dobara publish kar deti.
 *
 * Yahan koi `.own` check **nahi** hai: `entry.unpublish` ka koi `.own` variant hai hi nahi
 * (spec 001). Wajah seedhi hai — jo cheez live hai wo poori site ki zimmedari hai, aur use
 * utaarne ka faisla `editor` ka hai, uske likhne wale ka nahi. Route ki permission hi
 * poora guard hai.
 */
export async function unpublishEntry(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!current) throw notFound('Item not found')

  const updated = await Entry.findOneAndUpdate(
    { _id: id },
    {
      $set: { status: ENTRY_STATUS.DRAFT, publishAt: null, version: current.version + 1 },
    },
    { new: true },
  )

  await invalidate(updated)

  return toApi(updated)
}

/**
 * "Submit for review" — `contributor` ka "mera kaam ho gaya".
 *
 * `pending` optional status nahi hai (02-ARCHITECTURE §5): jo user publish nahi kar sakta,
 * uske paas iske bina koi state hi nahi bachti jo editor ko bataye ki dekhna hai.
 */
export async function submitForReview(
  id,
  actor,
  siteId = DEFAULT_SITE_ID,
  locale = DEFAULT_LOCALE,
) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!current) throw notFound('Item not found')

  assertCan(actor, current, PERMISSION.ENTRY_UPDATE, PERMISSION.ENTRY_UPDATE_OWN)

  if (current.status === ENTRY_STATUS.PUBLISHED) {
    throw unprocessable('This item is already published')
  }

  const updated = await Entry.findOneAndUpdate(
    { _id: id },
    { $set: { status: ENTRY_STATUS.PENDING, version: current.version + 1 } },
    { new: true },
  )

  return toApi(updated)
}

/**
 * Scheduled entries jinka waqt aa gaya — cron har minute ise bulati hai.
 *
 * **Atomic claim** zaroori hai: do instance ek saath chal sakte hain, aur dono ek hi entry
 * uthaayein to do publish revision banti hain aur cache do baar invalidate hoti hai.
 * `findOneAndUpdate` ka filter khud hi lock hai — jo pehle status badal deta hai, doosre
 * ko wo entry milti hi nahi.
 *
 * Public read query khud bhi `scheduled && publishAt <= now` ko published maanti hai
 * (`isPubliclyVisible`), isliye cron band ho jaaye to bhi site sahi rehti hai — ye
 * self-healing hai, cron pe nirbhar nahi.
 */
export async function publishDueEntries(now = new Date()) {
  const published = []

  for (;;) {
    const claimed = await Entry.findOneAndUpdate(
      { status: ENTRY_STATUS.SCHEDULED, publishAt: { $lte: now }, deletedAt: null },
      { $set: { status: ENTRY_STATUS.PUBLISHED }, $inc: { version: 1 } },
      { new: true, sort: { publishAt: 1 } },
    )

    if (!claimed) break

    await createRevision(claimed, null, 'publish')
    await invalidate(claimed)
    published.push(String(claimed._id))
  }

  return { published }
}

// ── trash ────────────────────────────────────────────────────────────────────

/**
 * Trash — `deletedAt` set hota hai, `status` chhua **nahi** jaata (D-25, R12).
 *
 * Isi wajah se restore pe entry apni purani state me wapas aati hai: published thi to
 * published hi. `status: 'trash'` karne pe ye info hamesha ke liye kho jaati.
 */
export async function trashEntry(id, actor, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!current) throw notFound('Item not found')

  assertCan(actor, current, PERMISSION.ENTRY_DELETE, PERMISSION.ENTRY_DELETE_OWN)

  /**
   * Bachche wale item ko trash me daalna mana hai.
   *
   * Warna bachchon ka `path` ek aise parent ko point karta rehta jo list me hai hi nahi —
   * aur wo tab tak nahi dikhta jab tak koi unhe khole. Pehle bachche hataao ya unka
   * parent badlo.
   */
  const childCount = await Entry.countDocuments({
    ...scope(siteId, locale),
    parentId: String(id),
    deletedAt: null,
  })

  if (childCount > 0) {
    throw unprocessable(
      `This item has ${childCount} item(s) inside it. Move or delete those first.`,
    )
  }

  const updated = await Entry.findOneAndUpdate(
    { _id: id },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )

  await invalidate(updated)

  return { id: String(id) }
}

/**
 * Restore — `deletedAt: null`, status jaisa tha waisa.
 *
 * Slug aur path dobara resolve hote hain: trash me padi entry ki jagah koi doosri entry
 * wahi slug le chuki ho sakti hai, aur us case me restore Mongo ke duplicate-key error
 * pe fail hota — user ko "E11000" dikhta.
 */
export async function restoreEntry(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!current) throw notFound('Item not found')
  if (!current.deletedAt) throw unprocessable('This item is not in the Trash')

  const contentType = await requireContentType(current.type, siteId)

  /**
   * Parent trash me chala gaya ho to bachcha root pe restore hota hai — us parent ke
   * neeche nahi jo khud maujood nahi. Chup-chaap tooti hui chain banane se behtar hai.
   */
  const parentAlive =
    current.parentId &&
    (await Entry.exists({ _id: current.parentId, ...scope(siteId, locale), deletedAt: null }))

  const { slug, path } = await resolveSlugAndPath({
    slug: current.slug,
    title: current.title,
    type: current.type,
    parentId: parentAlive ? current.parentId : null,
    excludeId: id,
    contentType,
    siteId,
    locale,
  })

  const updated = await Entry.findOneAndUpdate(
    { _id: id },
    { $set: { deletedAt: null, slug, path, parentId: parentAlive ? current.parentId : null } },
    { new: true },
  )

  await invalidate(updated)

  return toApi(updated)
}

/**
 * Permanent delete — sirf Trash ke andar se, aur sirf `entry.purge` waale ke paas
 * (yaani admin, D-26 / spec 001).
 *
 * Trash me na hone pe mana hai: ye ek do-kadam ka guard hai. Jo kaam wapas nahi ho sakta,
 * usse ek galat click se hone dena is CMS ke target user ke liye sabse mehngi galti hai.
 */
export async function purgeEntry(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!current) throw notFound('Item not found')

  if (!current.deletedAt) {
    throw unprocessable('Move this item to the Trash before deleting it permanently')
  }

  await Entry.deleteOne({ _id: id })
  await Revision.deleteMany({ entryId: String(id) })

  /**
   * Is path pe aane wale redirects bhi hata do — warna wo ek 404 pe point karte rehte
   * hain: user ko ek hop milta hai aur phir bhi "page nahi mila". Seedha 404 saaf hai.
   */
  await removeRedirectsTo(current.path, siteId, locale)

  await invalidate(current)

  return { id: String(id) }
}

// ── bulk ─────────────────────────────────────────────────────────────────────

/**
 * Bulk action — list screen ke checkbox se chuni hui rows pe.
 *
 * **Fail-soft, per-row.** Ek row ka fail hona baaki 49 ko nahi rokta: jawab me
 * `{ updated, failed[] }` jaata hai aur screen batati hai ki kaunsi row kyun rahi.
 * All-or-nothing rakhne ka matlab hota ki ek bachche wale page ki wajah se poora bulk
 * trash chup-chaap kuch na kare.
 *
 * Har row pe wahi guard chalti hai jo single action pe chalti hai — bulk permission ka
 * shortcut nahi hai. `.own` wala check bhi har row pe alag lagta hai, isliye ek author
 * apne aur doosron ke items ek saath chun le to sirf apne wale badalte hain.
 */
export async function bulkEntries(input, actor, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const { ids, action } = input
  const failed = []
  let updated = 0

  for (const id of ids) {
    try {
      if (action === 'trash') {
        await trashEntry(id, actor, siteId, locale)
      } else if (action === 'restore') {
        await restoreEntry(id, siteId, locale)
      } else {
        const current = await Entry.findOne({
          _id: id,
          ...scope(siteId, locale),
          deletedAt: null,
        }).lean()

        if (!current) throw notFound('Item not found')

        assertCan(actor, current, PERMISSION.ENTRY_UPDATE, PERMISSION.ENTRY_UPDATE_OWN)

        const $set = { version: current.version + 1 }

        $set.fields = { ...(current.fields ?? {}), featured: action === 'feature' }

        const doc = await Entry.findOneAndUpdate({ _id: id }, { $set }, { new: true })
        await invalidate(doc)
      }

      updated += 1
    } catch (err) {
      /**
       * Sirf wo error jo hum khud phenkte hain (`AppError`) user ko dikhane laayak hai.
       * Baaki kuch bhi ho to ek generic line — stack trace kabhi client tak nahi jaata.
       */
      failed.push({ id: String(id), message: err?.status ? err.message : 'Could not update' })
    }
  }

  return { updated, failed }
}

// ── duplicate ────────────────────────────────────────────────────────────────

/**
 * Duplicate — hamesha **draft** banta hai, chahe original published ho.
 *
 * Copy ka live ho jaana kabhi wo nahi hota jo user chahta hai; wo copy edit karne ke
 * liye banata hai. Aur do published pages ka ek jaisa content SEO ke liye seedha nuksaan
 * hai (duplicate content).
 */
export async function duplicateEntry(id, actor, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!current) throw notFound('Item not found')

  const contentType = await requireContentType(current.type, siteId)
  const title = `${current.title} (copy)`

  const { slug, path } = await resolveSlugAndPath({
    slug: current.slug,
    title,
    type: current.type,
    parentId: current.parentId,
    contentType,
    siteId,
    locale,
  })

  // `createdAt`/`updatedAt` copy nahi hote — nayi entry ka apna waqt hai, original ka nahi
  const { _id, __v, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = current

  const doc = await Entry.create({
    ...rest,
    title,
    slug,
    path,
    status: ENTRY_STATUS.DRAFT,
    publishAt: null,
    deletedAt: null,
    version: 0,
    authorId: actor?.user?._id ? String(actor.user._id) : null,
    searchText: buildSearchText({ ...rest, title }),
  })

  return toApi(doc)
}

// ── revisions ────────────────────────────────────────────────────────────────

export async function listRevisions(id, query, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const entry = await Entry.findOne({ _id: id, ...scope(siteId, locale) })
    .select('_id')
    .lean()
  if (!entry) throw notFound('Item not found')

  const { page, limit } = query
  const filter = { entryId: String(id) }

  const [docs, total] = await Promise.all([
    Revision.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      /**
       * `snapshot` list me **nahi** jaata — wo poora document hai, aur 20 revisions ka
       * matlab 20 poore page. List sirf "kab, kisne, kis tarah" dikhati hai; snapshot
       * tab chahiye jab koi ek revision khole.
       */
      .select('-snapshot')
      .lean(),
    Revision.countDocuments(filter),
  ])

  return {
    revisions: docs.map((r) => ({ ...r, id: String(r._id), _id: undefined })),
    meta: { page, limit, total },
  }
}

/**
 * Purani revision wapas — aur **restore khud ek revision banata hai**.
 *
 * Bina uske restore ek destructive operation hoti: jo abhi live tha wo kahin bacha hi
 * nahi rehta, aur galti se restore karne ka koi undo nahi hota.
 *
 * `path`, `slug`, `version` aur `deletedAt` snapshot se **wapas nahi aate** — wo entry ki
 * abhi ki pehchaan hain, uske content ka hissa nahi. Purana path wapas laane ka matlab
 * hota ki live URL chup-chaap badal jaaye.
 */
export async function restoreRevision(
  id,
  revisionId,
  actor,
  siteId = DEFAULT_SITE_ID,
  locale = DEFAULT_LOCALE,
) {
  const current = await Entry.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!current) throw notFound('Item not found')

  assertCan(actor, current, PERMISSION.ENTRY_UPDATE, PERMISSION.ENTRY_UPDATE_OWN)

  const revision = await Revision.findOne({ _id: revisionId, entryId: String(id) }).lean()
  if (!revision) throw notFound('Revision not found')

  const { snapshot } = revision
  const $set = { version: current.version + 1 }

  for (const key of [
    'title',
    'excerpt',
    'content',
    'fields',
    'seo',
    'taxonomies',
    'templateId',
    'featuredImageId',
    'order',
  ]) {
    if (snapshot[key] !== undefined) $set[key] = snapshot[key]
  }

  $set.searchText = buildSearchText({ ...current, ...$set })

  const updated = await Entry.findOneAndUpdate({ _id: id }, { $set }, { new: true })

  await createRevision(updated, actor?.user?._id ? String(actor.user._id) : null, 'save')
  await invalidate(updated)

  return toApi(updated)
}

/**
 * Ek slug pe kaunsi entry hai — Bulk Upload ke liye (D-81).
 *
 * ## Ye importer ke dobara chalne ki poori jaan hai
 *
 * Client wahi sheet dobara chalata hai (doc theek karke, ya naya package jod kar). Har baar
 * naye page banna **bilkul nahi** chahiye. Pehchan slug se hoti hai, aur uske liye ek exact
 * lookup chahiye — `listEntries()` slug pe filter deta hi nahi.
 *
 * ⚠️ **Trashed entry bhi lauti hai, aur wo jaan-boojh kar hai.** `resolveSlugAndPath()` slug ki
 * ginti karte waqt `deletedAt` **nahi** dekhta (wahan uska apna comment hai) — yaani trash me
 * padi `andaman-honeymoon` naye import ko chup-chaap `andaman-honeymoon-2` pe dhakel deti hai.
 * Wo ek naya page hai, jise agla run phir nahi pehchanta, aur har run ek aur duplicate banata
 * hai. Isliye importer ko trash wali entry **dikhni** chahiye taaki wo saaf bata sake:
 * "ye URL Trash me hai, use restore ya khaali karo".
 *
 * @param {string} type
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function findEntryBySlug(
  type,
  slug,
  siteId = DEFAULT_SITE_ID,
  locale = DEFAULT_LOCALE,
) {
  if (!slug) return null

  return Entry.findOne({ ...scope(siteId, locale), type, slug }).lean()
}
