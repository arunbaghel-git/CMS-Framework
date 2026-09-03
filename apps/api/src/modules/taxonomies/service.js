import mongoose from 'mongoose'

import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  TAXONOMY_REF_KEY,
  TAXONOMY_TYPE,
  isHierarchicalTaxonomy,
  slugify,
  suffixSlug,
} from '@cms/shared'

import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { revalidateTags } from '../../core/revalidate.js'
/**
 * ⚠️ **Ye import circular hai** — `master-lists/service.js` yahan se `taxonomyExists`
 * leti hai (hotel ka destination check karne ke liye).
 *
 * Wahi tark jo `menus` ↔ `settings` aur `entries` ↔ `content-types` pe likha hai: dono
 * taraf sirf `export async function` declarations hain (ESM me hoist hoti hain), aur koi
 * bhi module load ke waqt doosre ko call nahi karta.
 *
 * Do sawaal, dono apne ghar me: "ye destination sach hai?" sirf yahan pata hai, aur
 * "is destination pe kitne hotel hain?" sirf wahan.
 */
import { countEntriesByTaxonomy, countEntriesUsingTaxonomy } from '../entries/service.js'
import { countHotelsForDestination } from '../master-lists/service.js'
import { Taxonomy } from './model.js'

/**
 * Taxonomies ka business logic — R1.
 *
 * Client ke liye ye "Destinations" aur "Package Type" hain (R11) — `taxonomies` shabd UI
 * me kabhi nahi dikhta.
 */

const scope = (siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) => ({ siteId, locale })

/** Nesting kitni gehri — `India → Kerala → Munnar` ke liye 3 kaafi hai, hadd 5 rakhi hai. */
const MAX_DEPTH = 5

const MAX_SLUG_ATTEMPTS = 50

function toApi(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ── slug ─────────────────────────────────────────────────────────────────────

/**
 * Free slug — collision pe `-2`, `-3`.
 *
 * Uniqueness `{siteId, locale, type, slug}` pe hai, isliye ek `destination` "goa" aur ek
 * `packageType` "goa" dono ban sakte hain: wo do alag vocabularies hain, aur unhe ek
 * doosre se takrane dena client ko bina wajah rokna hota.
 */
async function resolveSlug({ slug, name, type, excludeId, siteId, locale }) {
  const base = slugify(slug || name)

  if (!base) {
    throw unprocessable(
      'This name cannot be turned into a link automatically. Please enter the slug yourself.',
    )
  }

  for (let n = 1; n <= MAX_SLUG_ATTEMPTS; n++) {
    const candidate = suffixSlug(base, n)

    const clash = await Taxonomy.findOne({
      ...scope(siteId, locale),
      type,
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select('_id')
      .lean()

    if (!clash) return candidate
  }

  throw conflict('Could not find a free slug. Please choose a different one.')
}

// ── hierarchy ────────────────────────────────────────────────────────────────

/**
 * Parent chun-ne ke teen guard.
 *
 * Teenon ki failure chup hoti hai, isliye teenon yahan hain — model ke hook me nahi,
 * kyunki write `findOneAndUpdate` se hota hai aur wo `save` hooks chalata hi nahi (R1).
 */
async function assertValidParent(id, parentId, type, siteId, locale) {
  if (!parentId) return

  if (!isHierarchicalTaxonomy(type)) {
    throw unprocessable('This list is a flat list — items in it cannot be nested')
  }

  if (!mongoose.isValidObjectId(parentId)) throw unprocessable('The selected parent is not valid')

  if (id && String(parentId) === String(id)) {
    throw unprocessable('An item cannot be placed inside itself')
  }

  const parent = await Taxonomy.findOne({ _id: parentId, ...scope(siteId, locale) }).lean()
  if (!parent) throw unprocessable('The selected parent could not be found')

  /**
   * Parent ka type wahi hona chahiye — ek Destination kisi Package Type ke andar nahi
   * ja sakta. Bina iske do vocabularies ek hi tree me mil jaati hain aur list screen
   * dono dikhane lagti.
   */
  if (parent.type !== type) throw unprocessable('The parent must be in the same list')

  // Cycle: naye parent se upar chalo, apni hi id mili to loop ban rahi hai
  let current = parent.parentId
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (!current) return
    if (id && String(current) === String(id)) {
      throw unprocessable('An item cannot be placed inside one of its own children')
    }

    const next = await Taxonomy.findOne({ _id: current, ...scope(siteId, locale) })
      .select('parentId')
      .lean()

    if (!next) return
    current = next.parentId
  }

  throw unprocessable(`Items can only be nested ${MAX_DEPTH} levels deep`)
}

// ── reads ────────────────────────────────────────────────────────────────────

/**
 * Ek type ki list — server-side pagination day 1 se (R14).
 *
 * `type` query me **zaroori** hai (schema me `.optional()` nahi): saari taxonomies ek hi
 * list me dena matlab Destinations screen pe Package Type ki rows dikhna. Ek collection
 * hone ka matlab ek list hona nahi hai.
 */
export async function listTaxonomies(query, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const { page, limit, sort, order, q, type, parentId } = query

  const filter = { ...scope(siteId, locale), type }
  if (q) filter.name = new RegExp(escapeRegex(q), 'i')
  if (parentId !== undefined) filter.parentId = parentId || null

  const [docs, total] = await Promise.all([
    Taxonomy.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Taxonomy.countDocuments(filter),
  ])

  /**
   * Har row ka usage count — list screen ka "Packages" column.
   *
   * Ek aggregate, N+1 nahi: 40 destinations ki list ke liye 41 request bhejna wahi galti
   * hai jo har admin panel ko dheema karti hai (R14 ki hi soch).
   */
  const usage = await countEntriesByTaxonomy(
    docs.map((d) => String(d._id)),
    TAXONOMY_REF_KEY[type],
    siteId,
  )

  const taxonomies = docs.map((doc) => ({ ...toApi(doc), usageCount: usage[String(doc._id)] ?? 0 }))

  return { taxonomies, meta: { page, limit, total } }
}

export async function getTaxonomy(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const doc = await Taxonomy.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!doc) throw notFound('Item not found')

  return toApi(doc)
}

/**
 * Ek taxonomy maujood hai ya nahi — `mediaExists` / `menuExists` ka taxonomy wala bhai.
 *
 * Hotels service isse tab bulati hai jab admin destination chunta hai (spec 007 §1.3):
 * reference save hone se **pehle** check hoti hai, taaki hotel kisi aise destination ko
 * point na kare jo hai hi nahi.
 *
 * Bekaar id (jo ObjectId hai hi nahi) pe `false` milta hai, CastError nahi.
 */
export async function taxonomyExists(id, type, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!id || !mongoose.isValidObjectId(id)) return false

  return Boolean(await Taxonomy.exists({ _id: id, ...scope(siteId, locale), type }))
}

// ── writes ───────────────────────────────────────────────────────────────────

export async function createTaxonomy(input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  await assertValidParent(null, input.parentId, input.type, siteId, locale)

  const slug = await resolveSlug({
    slug: input.slug,
    name: input.name,
    type: input.type,
    siteId,
    locale,
  })

  const doc = await Taxonomy.create({
    ...input,
    ...scope(siteId, locale),
    slug,
    parentId: input.parentId ?? null,
    isDefault: false,
  })

  await revalidateTags([`tax:${doc._id}`, 'sitemap'])

  return toApi(doc)
}

/**
 * Update — `type` yahan aata hi nahi (schema me omit hai).
 *
 * Slug badalne pe purane URL ka 301 abhi nahi banta — wahi hadd jo entries pe hai
 * (D-47, `09-OPEN-ITEMS.md` A-6). Taxonomy archives abhi bane hi nahi hain, isliye aaj
 * koi URL hai hi nahi jo toote.
 */
export async function updateTaxonomy(id, input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Taxonomy.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!current) throw notFound('Item not found')

  const $set = {}

  for (const key of ['name', 'description', 'bannerMediaId', 'order', 'seo']) {
    if (input[key] !== undefined) $set[key] = input[key]
  }

  if (input.parentId !== undefined) {
    await assertValidParent(id, input.parentId, current.type, siteId, locale)
    $set.parentId = input.parentId || null
  }

  if (input.slug !== undefined || input.name !== undefined) {
    $set.slug = await resolveSlug({
      slug: input.slug ?? current.slug,
      name: input.name ?? current.name,
      type: current.type,
      excludeId: id,
      siteId,
      locale,
    })
  }

  const updated = await Taxonomy.findOneAndUpdate({ _id: id }, { $set }, { new: true })

  await revalidateTags([`tax:${id}`, 'sitemap'])

  return toApi(updated)
}

/**
 * Delete — **permanent**, kyunki taxonomy content nahi hai (D-25 ka trash content pe hai).
 *
 * Do guard:
 *
 * 1. **Default row delete nahi hoti** — "Uncategorized" jaisi. Wo wo jagah hai jahan
 *    bina category wali entry girti hai; use hata dene ka matlab hai ki ek din koi jagah
 *    bachti hi nahi.
 * 2. **Jiske bachche hain wo delete nahi hoti** — warna bachche ek aise parent ko point
 *    karte rehte jo hai hi nahi, aur wo list me kahin dikhte hi nahi. Wahi guard jo
 *    entries ke trash pe hai (D-47 §5).
 *
 * 3. **Jis destination pe hotel hain, wo delete nahi hoti** — warna un hotels ka
 *    `destinationId` ek aisi id ko point karta rehta jo hai hi nahi: Hotels list me
 *    Destination column khaali, aur wajah kahin likhi nahi hoti. Ye wahi invariant hai
 *    jo D-42 §2 ne media pe lagaya tha.
 *
 * 4. **Jise koi entry use kar rahi hai wo delete nahi hoti** — trash me padi entry bhi
 *    ginti me hai, kyunki wo restore ho sakti hai. Ye guard A-7 ke faisle ke baad juda
 *    (D-49): ab har taxonomy type ek hi jagah reference hoti hai, isliye ek hi query
 *    chaaron ko cover karti hai.
 */
export async function deleteTaxonomy(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Taxonomy.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!current) throw notFound('Item not found')

  if (current.isDefault) throw badRequest('The default item cannot be deleted')

  const childCount = await Taxonomy.countDocuments({
    ...scope(siteId, locale),
    parentId: String(id),
  })

  if (childCount > 0) {
    throw unprocessable(
      `This item has ${childCount} item(s) inside it. Move or delete those first.`,
    )
  }

  if (current.type === TAXONOMY_TYPE.DESTINATION) {
    const hotelCount = await countHotelsForDestination(id, siteId)
    if (hotelCount > 0) {
      throw unprocessable(
        `${hotelCount} hotel(s) are linked to this destination. Move or delete those first.`,
      )
    }
  }

  const entryCount = await countEntriesUsingTaxonomy(id, siteId)
  if (entryCount > 0) {
    throw unprocessable(
      `${entryCount} item(s) are using this. Remove it from them first, including the Trash.`,
    )
  }

  await Taxonomy.deleteOne({ _id: id })

  await revalidateTags([`tax:${id}`, 'sitemap'])

  return { id: String(id) }
}

/**
 * Ek taxonomy type ke saare naam aur id — Bulk Upload ke liye (D-81).
 *
 * `listTaxonomies({ q })` yahan kaam nahi karta: uska `q` **substring** hai (`Havelock` se
 * `Havelock Island` bhi milta hai) aur uska `limit` 200 pe capped hai. Importer ko exact
 * match chahiye aur poori list chahiye — client ka niyam yahi hai: case aur space maaf,
 * spelling nahi.
 *
 * ⚠️ Naam ki uniqueness **hai hi nahi** — uniqueness `{siteId, locale, type, slug}` pe hai.
 * Isliye ek hi naam do baar aa sakta hai, aur ye list use chhupati nahi. Aage `buildRefMaps()`
 * usi par blocker lagata hai, kyunki chup-chaap pehla utha lena galat hotel live kar deta hai.
 *
 * @param {string} type `destination` · `packageType` · `category` · `tag`
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */
export async function allTaxonomyNames(type, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const docs = await Taxonomy.find({ ...scope(siteId, locale), type }, { name: 1 })
    .sort({ name: 1 })
    .lean()

  return docs.map((doc) => ({ id: String(doc._id), name: doc.name ?? '' }))
}
