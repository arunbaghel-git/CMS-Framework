import { DEFAULT_SITE_ID, TAXONOMY_TYPE } from '@cms/shared'

import { notFound, unprocessable } from '../../core/errors.js'
/**
 * ⚠️ **Ye import circular hai** — `taxonomies/service.js` yahan se
 * `countHotelsForDestination` leti hai (destination delete rokne ke liye).
 *
 * Wahi tark jo `menus` ↔ `settings` aur `entries` ↔ `content-types` pe likha hai: dono
 * taraf sirf `export async function` declarations hain (ESM me hoist hoti hain), aur koi
 * bhi module **load ke waqt** doosre ko call nahi karta.
 *
 * Wajah ye rakhne ki: hotel ka destination sach hai ya nahi — ye sirf `taxonomies` jaanti
 * hai; aur destination par kitne hotel latke hain — ye sirf `master-lists` jaanti hai.
 * Dono taraf ek-ek sawaal, dono apne ghar me.
 */
import { taxonomyExists } from '../taxonomies/service.js'
import { AddOn, Hotel, Transfer } from './model.js'

/**
 * Master lists ka business logic — R1.
 *
 * **Ek registry, teen lists.** Sab kuch generic hai except do cheezein: kaunse fields
 * search/filter hote hain, aur write se pehle kya check karna hai. Wo dono registry me
 * hain, teen jagah copy-paste nahi.
 */

const scope = (siteId = DEFAULT_SITE_ID) => ({ siteId })

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function toApi(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

/**
 * Hotel ka destination sach me maujood hai?
 *
 * Reference save hone se **pehle** check hoti hai — wahi invariant jo D-42 §2 ne media pe
 * lagaya tha: koi reference kisi aisi cheez pe na baithe jo hai hi nahi. Bina iske hotel
 * list me ek row dikhti rehti jiska Destination column khaali hota, aur wajah kahin nahi
 * likhi hoti.
 */
async function assertDestination(input, siteId) {
  if (input.destinationId === undefined) return

  const exists = await taxonomyExists(input.destinationId, TAXONOMY_TYPE.DESTINATION, siteId)
  if (!exists) throw unprocessable('The selected destination could not be found')
}

/**
 * Teen lists ka registry.
 *
 * `label` sirf error messages ke liye hai — UI me internal naam kabhi nahi dikhta (R11),
 * aur "Hotel not found" "hotels document not found" se behtar padha jaata hai.
 */
const LISTS = {
  hotel: {
    Model: Hotel,
    label: 'Hotel',
    sort: { name: 1 },
    /** Hotels screen pehle Destination se filter hoti hai, phir Category se (§1.3). */
    filters: ['destinationId', 'category'],
    beforeWrite: assertDestination,
  },
  addOn: {
    Model: AddOn,
    label: 'Add-on',
    sort: { name: 1 },
    filters: [],
    beforeWrite: null,
  },
  transfer: {
    Model: Transfer,
    label: 'Transfer',
    sort: { name: 1 },
    filters: [],
    beforeWrite: null,
  },
}

function listOf(key) {
  const list = LISTS[key]
  // Ye kabhi user input se nahi aata — routes hi key deti hain. Isliye ye programmer
  // error hai, 4xx nahi.
  if (!list) throw new Error(`Unknown master list: ${key}`)

  return list
}

// ── reads ────────────────────────────────────────────────────────────────────

/**
 * List — server-side pagination day 1 se (R14).
 *
 * Hotels wahi list hai jo sabse pehle badi hogi: har destination pe chaar category.
 * "Abhi to kam hain" har list pe kaha jaata hai aur baad me kisi ek pe galat nikalta hai.
 */
export async function listItems(key, query, siteId = DEFAULT_SITE_ID) {
  const { Model, sort, filters } = listOf(key)
  const { page, limit, q } = query

  const filter = scope(siteId)
  if (q) filter.name = new RegExp(escapeRegex(q), 'i')

  // Sirf wahi filters jo is list ke registry me hain — `req.query` kabhi seedha
  // Mongoose query me spread nahi hoti (R9)
  for (const field of filters) {
    if (query[field] !== undefined) filter[field] = query[field]
  }

  const [docs, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
  ])

  return { items: docs.map(toApi), meta: { page, limit, total } }
}

export async function getItem(key, id, siteId = DEFAULT_SITE_ID) {
  const { Model, label } = listOf(key)

  const doc = await Model.findOne({ _id: id, ...scope(siteId) }).lean()
  if (!doc) throw notFound(`${label} not found`)

  return toApi(doc)
}

/**
 * Ek destination pe kitne hotel latke hain.
 *
 * `taxonomies` service isse destination delete karne se pehle bulati hai. Bina iske
 * destination mit jaata aur uske hotels ka `destinationId` kisi aisi id ko point karta
 * jo hai hi nahi — list me Destination column khaali, aur koi error kahin nahi.
 */
export async function countHotelsForDestination(destinationId, siteId = DEFAULT_SITE_ID) {
  return Hotel.countDocuments({ ...scope(siteId), destinationId: String(destinationId) })
}

// ── writes ───────────────────────────────────────────────────────────────────

export async function createItem(key, input, siteId = DEFAULT_SITE_ID) {
  const { Model, beforeWrite } = listOf(key)

  if (beforeWrite) await beforeWrite(input, siteId)

  const doc = await Model.create({ ...input, ...scope(siteId) })

  return toApi(doc)
}

export async function updateItem(key, id, input, siteId = DEFAULT_SITE_ID) {
  const { Model, label, beforeWrite } = listOf(key)

  const current = await Model.findOne({ _id: id, ...scope(siteId) }).lean()
  if (!current) throw notFound(`${label} not found`)

  if (beforeWrite) await beforeWrite(input, siteId)

  const updated = await Model.findOneAndUpdate({ _id: id }, { $set: input }, { new: true })

  return toApi(updated)
}

/**
 * Delete — **permanent**, kyunki master list content nahi hai (D-25 ka trash content pe
 * lagta hai, client ki vocabulary pe nahi).
 *
 * ⚠️ **"Kya koi package ise use kar raha hai" wala guard abhi nahi hai.** Packages
 * add-ons aur hotels ko `entries.fields` me chunte hain, aur wo wiring **Slice 3-5** me
 * hoti hai. Aaj koi package hai hi nahi jo inhe use kare. `09-OPEN-ITEMS.md` A-7 me
 * tracked hai — wahan tay hote hi ye guard yahan judega, bilkul waise hi jaise
 * destination pe hotels ka guard neeche juda hua hai.
 */
export async function deleteItem(key, id, siteId = DEFAULT_SITE_ID) {
  const { Model, label } = listOf(key)

  const current = await Model.findOne({ _id: id, ...scope(siteId) }).lean()
  if (!current) throw notFound(`${label} not found`)

  await Model.deleteOne({ _id: id })

  return { id: String(id) }
}
