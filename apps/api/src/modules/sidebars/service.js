import { randomUUID } from 'node:crypto'

import mongoose from 'mongoose'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '@cms/shared'

import { conflict, notFound } from '../../core/errors.js'
import { revalidateTags } from '../../core/revalidate.js'
import { sanitizeSidebarWidgets } from '../../core/sanitize-html.js'
import { Sidebar } from './model.js'

/**
 * Sidebars ka business logic — R1. Controller sirf validate karke yahan bhejta hai.
 */

const scope = (siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) => ({ siteId, locale })

// ── ids ──────────────────────────────────────────────────────────────────────

/**
 * Har widget ko ek stable `id` deta hai.
 *
 * Ye **normalization** hai, business logic nahi — par phir bhi service me hai, model ke hook
 * me nahi: `findOneAndUpdate` `save` hooks chalata hi nahi (R1), aur sidebar hamesha
 * `findOneAndUpdate` se likhti hai. Hook me rakhne ka nateeja hota ki ids chup-chaap assign
 * hi na hon — aur uske baad React ki key index ban jaati, jisse reorder pe panel ka khula/band
 * hona doosre widget pe chipak jaata.
 *
 * Maujooda id **kabhi overwrite nahi hoti** — wo reorder ke aar-paar stable rehni chahiye.
 * Wahi jodi jo `blockSchema`, `faqs[]` aur `itinerary[]` pe pehle se hai: input me optional,
 * DB me hamesha maujood.
 */
const withIds = (widgets = []) => widgets.map((w) => ({ ...w, id: w.id || randomUUID() }))

// ── cache ────────────────────────────────────────────────────────────────────

/**
 * Sidebar badli — jin types ke page usme se chunte hain, un sabko revalidate karo.
 *
 * ⚠️ **Yahan `sidebar:<id>` jaisa apna tag jaan-boojh kar nahi hai.** Ek page ka payload
 * `path:` tag pe cache hota hai, aur us tag ka register hone wala jagah resolve endpoint hai —
 * sidebar ki apni id kisi page ke tag me hai hi nahi. Ek naya tag banane ka matlab hota ya to
 * har page pe uska registration jodna, ya ek reverse-lookup rakhna (kaun-kaunsa page is
 * sidebar ko use karta hai) — aur wo doosra ek **ref-count** hai, jise D-79 ne media pe
 * jaan-boojh kar mana kiya tha.
 *
 * Isliye wahi rasta liya gaya jo `forms` pe pehle se chalta hai (`public/service.js`): jis type
 * ke payload me ye data ja sakta hai, uska type tag revalidate ho jaata hai.
 *
 * ⚠️ `package` yahan **nahi** hai — package ka sidebar hardcoded hai (D-88 #7), usme se koi
 * sidebar chuni hi nahi jaati. Jis din wo badle, ye line bhi badlegi.
 */
const invalidate = () => revalidateTags(['type:page', 'type:tourPage'])

// ── read ─────────────────────────────────────────────────────────────────────

/**
 * Admin ko jaane wala shape.
 *
 * `version` yahan zaroori hai — uske bina admin optimistic concurrency ka token wapas nahi
 * bhej sakta.
 */
function toAdminSidebar(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

/**
 * Admin ki list — R14, pagination day 1 se.
 *
 * Sidebars aaj gine-chune hongi, par "abhi to kam hain" har list pe kaha jaata hai aur baad
 * me kisi ek pe galat nikalta hai.
 */
export async function listSidebars(query, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const { page, limit, q } = query
  const filter = { ...scope(siteId, locale), deletedAt: null }

  /**
   * ⚠️ `q` ko regex me daalne se pehle escape hota hai. Bina iske client ka `(` ya `*` ek
   * invalid regex banata aur list **500** deti — aur wo failure "search toot gaya" jaisi nahi,
   * "server gir gaya" jaisi dikhti hai.
   */
  if (q?.trim())
    filter.name = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }

  const [docs, total] = await Promise.all([
    Sidebar.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Sidebar.countDocuments(filter),
  ])

  return { sidebars: docs.map(toAdminSidebar), meta: { page, limit, total } }
}

export async function getSidebar(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Sidebar not found')

  const doc = await Sidebar.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null })
  if (!doc) throw notFound('Sidebar not found')

  return toAdminSidebar(doc)
}

/**
 * Ek sidebar ke widgets — public payload ke liye.
 *
 * ⚠️ **Yahan `null` lautna ek normal haalat hai, error nahi.** Page pe `sidebarId` bhara ho
 * aur wo sidebar delete ho chuki ho — ye bilkul aam hai, kyunki delete **hamesha chalta hai**
 * (D-79 ka precedent) aur uspe koi guard jaan-boojh kar nahi hai. Aisi soorat me page pe
 * sidebar **render hi nahi hoti** (D-42 §2: toota hua kuch kabhi render nahi hota).
 *
 * Bekaar id (jo ObjectId hai hi nahi) pe bhi `null` — CastError nahi. Wahi niyam jo package
 * list ke tests me pehle se hai: _"bekaar id se 500 nahi aata, wo chup-chaap gir jaati hai"_.
 */
export async function getSidebarWidgets(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!id || !mongoose.isValidObjectId(id)) return null

  const doc = await Sidebar.findOne({
    _id: id,
    ...scope(siteId, locale),
    deletedAt: null,
  }).lean()

  return doc ? (Array.isArray(doc.widgets) ? doc.widgets : []) : null
}

// ── write ────────────────────────────────────────────────────────────────────

export async function createSidebar(input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const doc = await Sidebar.create({
    ...scope(siteId, locale),
    name: input.name,
    widgets: withIds(sanitizeSidebarWidgets(input.widgets ?? [])),
    version: 0,
  })

  return toAdminSidebar(doc)
}

/**
 * Update — `version` mismatch pe `409`.
 *
 * Sidebar ek nested list hai jise ek hi screen se poora likha jaata hai, aur do admin ka ek
 * saath save karna theek wahi case hai jisme "last write wins" chup-chaap kisi ka poora kaam
 * mita deta hai. Wahi rakhwali jo `menus` pe hai.
 */
export async function updateSidebar(id, input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Sidebar not found')

  const current = await Sidebar.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null })
  if (!current) throw notFound('Sidebar not found')

  if (input.version !== undefined && input.version !== current.version) {
    throw conflict('Someone else changed this sidebar while you were editing')
  }

  const $set = { version: current.version + 1 }
  if (input.name !== undefined) $set.name = input.name
  if (input.widgets !== undefined) $set.widgets = withIds(sanitizeSidebarWidgets(input.widgets))

  const updated = await Sidebar.findOneAndUpdate({ _id: id }, { $set }, { new: true })

  await invalidate()

  return toAdminSidebar(updated)
}

/**
 * Soft delete (R12).
 *
 * ⚠️ **Koi "ye sidebar N pages pe lagi hai" wala guard nahi hai, aur wo faisla hai.** D-79 pe
 * client ne media ke liye yahi tay kiya tha — _"delete to kar sakte hai chahe kahin lagi ho ya
 * nahi"_ — aur uske saath ref-counting ka poora dhaancha mar gaya tha. Yahan bhi wahi:
 * `entries.fields.sidebarId` jaan-boojh kar saaf **nahi** ki jaati.
 *
 * Nuksaan halka isliye hai ki dono taraf se failure chup hai: delete soft hai (record
 * `deletedAt` pe jaata hai, wapas laaya ja sakta hai), aur page pe wo sidebar render hi nahi
 * hoti (D-42 §2) — toota hua kuch nahi dikhta.
 */
export async function deleteSidebar(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Sidebar not found')

  const doc = await Sidebar.findOneAndUpdate(
    { _id: id, ...scope(siteId, locale), deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
  if (!doc) throw notFound('Sidebar not found')

  await invalidate()

  return { deleted: true }
}

/**
 * Saari sidebars ke naam — Bulk Upload for pages (D-95) ke liye.
 *
 * Import hua page `Pages Sidebar` naam se sidebar dhoondhta hai (client, 14 Sep). Naam pe
 * uniqueness nahi hai, isliye poori list jaati hai aur mapper do-milne wali haalat khud dekhta
 * hai — `allItemNames()` wali hi shakl.
 */
export async function allSidebarNames(siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const docs = await Sidebar.find({ ...scope(siteId, locale), deletedAt: null }, { name: 1 }).lean()

  return docs.map((doc) => ({ id: String(doc._id), name: doc.name ?? '' }))
}
