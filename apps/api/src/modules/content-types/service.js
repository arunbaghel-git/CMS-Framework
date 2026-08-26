import { BUILT_IN_CONTENT_TYPES, DEFAULT_SITE_ID, isBuiltInContentType } from '@cms/shared'

import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
/**
 * ⚠️ **Ye import circular hai** — `entries/service.js` yahan se `requireContentType`
 * leti hai (har entry write pe path resolve karne ke liye).
 *
 * Wahi tark jo `menus` ↔ `settings` pe likha hai: dono taraf sirf `export async function`
 * declarations hain (ESM me hoist hoti hain), aur koi bhi module **load ke waqt** doosre
 * ko call nahi karta — sirf request handle karte waqt. Cycle tab toot-ti jab koi
 * top-level pe doosre ka export use kare; yahan wo kahin nahi hota.
 *
 * Wajah ye rakhne ki: "is type ki koi entry hai kya" ka jawab sirf `entries` ke paas hai,
 * aur delete rokna `contentTypes` ka farz hai.
 */
import { countEntriesOfType } from '../entries/service.js'
import { ContentType } from './model.js'

/**
 * Content types ka business logic — R1.
 *
 * Ye collection `entries` engine ki **configuration** hai: har type ka URL pattern,
 * field set aur archive yahan se aata hai (D-46).
 */

const scope = (siteId = DEFAULT_SITE_ID) => ({ siteId })

function toApi(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

// ── seed ─────────────────────────────────────────────────────────────────────

/**
 * Built-in content types ko DB me sync karta hai — **idempotent** (spec 004).
 *
 * Ye D-36 ka hi model hai jo built-in roles pe chalta hai: content code me hai, DB me
 * sirf uski copy. Bina sync ke code me joda gaya naya field kisi chalu instance tak
 * pahunchta hi nahi, aur wo failure bilkul chup-chaap hoti hai — theek wahi jo
 * `user.delete` permission ke saath hua tha.
 *
 * **Sab kuch sync nahi hota** — teen alag darje hain:
 *
 * - `fields` `supports` `hasBuilder` `hierarchical` → **hamesha**. Ye engine ka
 *   behaviour hai aur code-owned hai (D-46).
 * - `label` `labelPlural` `icon` → **sirf `force` pe**. Client "Packages" ko "Tours"
 *   keh sakta hai; wo uska display faisla hai (R11), code ka nahi.
 * - `urlPattern` `archiveBase` `hasArchive` → **sirf create pe**. Inhe badalna matlab
 *   har entry ka `path` badalna — wo soch-samajh kar liya gaya operation hai, seed ka
 *   side-effect nahi. Seed ko chupke se URL pattern badalne dena matlab ek deploy pe
 *   poori site ke link badal jaayein, bina kisi redirect ke.
 *
 * @param {{ force?: boolean, siteId?: string }} [options]
 */
export async function ensureBuiltInContentTypes({ force = false, siteId = DEFAULT_SITE_ID } = {}) {
  const results = []

  for (const definition of BUILT_IN_CONTENT_TYPES) {
    const existing = await ContentType.findOne({ ...scope(siteId), key: definition.key })

    if (!existing) {
      await ContentType.create({ ...scope(siteId), ...definition, isBuiltIn: true })
      results.push({ key: definition.key, action: 'created' })
      continue
    }

    /**
     * Koi custom type ye key pehle se le chuka hai — uspe code ka shape thopna uska
     * kaam mita dega. Ye seed ka faisla nahi hai, isliye sirf report karo.
     */
    if (!existing.isBuiltIn) {
      results.push({ key: definition.key, action: 'skipped', reason: 'custom type owns this key' })
      continue
    }

    const changes = {}
    for (const field of ['fields', 'supports', 'hasBuilder', 'hierarchical']) {
      if (JSON.stringify(existing[field]) !== JSON.stringify(definition[field])) {
        changes[field] = definition[field]
      }
    }

    if (force) {
      changes.label = definition.label
      changes.labelPlural = definition.labelPlural
      changes.icon = definition.icon
    }

    if (Object.keys(changes).length === 0) {
      results.push({ key: definition.key, action: 'up-to-date' })
      continue
    }

    await ContentType.updateOne({ _id: existing._id }, { $set: changes })
    results.push({ key: definition.key, action: 'synced', changed: Object.keys(changes) })
  }

  return results
}

// ── reads ────────────────────────────────────────────────────────────────────

export async function listContentTypes(query, siteId = DEFAULT_SITE_ID) {
  const { page, limit } = query
  const filter = scope(siteId)

  const [docs, total] = await Promise.all([
    ContentType.find(filter)
      .sort({ isBuiltIn: -1, labelPlural: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ContentType.countDocuments(filter),
  ])

  return { contentTypes: docs.map(toApi), meta: { page, limit, total } }
}

/**
 * Key se content type — **entries engine ka hot path**.
 *
 * Har entry write ise bulati hai, kyunki `resolvePath()` ko `urlPattern` aur
 * `hierarchical` chahiye. Yahan koi cache jaan-boojh kar **nahi** hai: roles wala 60s
 * cache isliye tha ki wo har *authenticated request* pe chalta tha; ye sirf write pe
 * chalta hai, aur ek stale URL pattern ka nateeja galat stored `path` hota hai — jo
 * cache expire hone pe apne aap theek nahi hota.
 *
 * @param {string} key
 * @param {string} [siteId]
 */
export async function getContentTypeByKey(key, siteId = DEFAULT_SITE_ID) {
  const doc = await ContentType.findOne({ ...scope(siteId), key }).lean()
  return toApi(doc)
}

/** Wahi lookup, par na milne pe 422 — entry create/update ka raasta yahin ruk jaata hai. */
export async function requireContentType(key, siteId = DEFAULT_SITE_ID) {
  const contentType = await getContentTypeByKey(key, siteId)
  if (!contentType) throw unprocessable(`Unknown content type: ${key}`)

  return contentType
}

export async function getContentType(id, siteId = DEFAULT_SITE_ID) {
  const doc = await ContentType.findOne({ _id: id, ...scope(siteId) }).lean()
  if (!doc) throw notFound('Content type not found')

  return toApi(doc)
}

// ── writes ───────────────────────────────────────────────────────────────────

export async function createContentType(input, siteId = DEFAULT_SITE_ID) {
  if (isBuiltInContentType(input.key)) {
    throw conflict(`"${input.key}" is a built-in content type`)
  }

  const existing = await ContentType.findOne({ ...scope(siteId), key: input.key })
  if (existing) throw conflict('A content type with this key already exists')

  const doc = await ContentType.create({ ...input, ...scope(siteId), isBuiltIn: false })

  return toApi(doc)
}

/**
 * Update — `key` yahan aata hi nahi (schema me omit hai, kyunki wo `entries.type` me
 * stored hai).
 *
 * `urlPattern` sirf tab badal sakta hai jab is type ki **ek bhi entry na ho**. Uske baad
 * badalne ka matlab hai har entry ka `path` dobara likhna aur purane har URL pe 301 —
 * wo `redirects` module ke saath aayega (Phase 4). Us tak wo raasta band hai, kyunki
 * aadha kiya gaya rename hi wo case hai jisme link chup-chaap 404 hone lagte hain.
 */
export async function updateContentType(id, input, siteId = DEFAULT_SITE_ID) {
  const current = await ContentType.findOne({ _id: id, ...scope(siteId) })
  if (!current) throw notFound('Content type not found')

  if (input.urlPattern !== undefined && input.urlPattern !== current.urlPattern) {
    const count = await countEntriesOfType(current.key, siteId)
    if (count > 0) {
      throw unprocessable(
        `This content type already has ${count} item(s). Changing the URL pattern would ` +
          'change every one of their links, and the old links would stop working.',
      )
    }
  }

  const updated = await ContentType.findOneAndUpdate({ _id: id }, { $set: input }, { new: true })

  return toApi(updated)
}

/**
 * Delete — **permanent**, kyunki content type content nahi hai (D-25 ka trash content pe
 * lagta hai, uski configuration pe nahi).
 *
 * Do guard:
 *
 * 1. Built-in type delete nahi hota — wo code se aata hai (D-46) aur seed use agle run
 *    pe wapas bana dega. Delete hone dena ek aisa button dena hai jo kuch karta hi nahi.
 * 2. Jiski entries hain wo delete nahi hota — warna wo entries orphan ho jaati hain:
 *    unka `type` kisi aise type ko point karta hai jo hai hi nahi, aur unka `path`
 *    dobara resolve hi nahi ho sakta.
 */
export async function deleteContentType(id, siteId = DEFAULT_SITE_ID) {
  const current = await ContentType.findOne({ _id: id, ...scope(siteId) })
  if (!current) throw notFound('Content type not found')

  if (current.isBuiltIn) throw badRequest('Built-in content types cannot be deleted')

  const count = await countEntriesOfType(current.key, siteId)
  if (count > 0) {
    throw unprocessable(
      `This content type still has ${count} item(s). Delete them first, including the Trash.`,
    )
  }

  await ContentType.deleteOne({ _id: id })

  return { id: String(id) }
}
