import mongoose from 'mongoose'
import { DEFAULT_SITE_ID } from '@cms/shared'

import { env } from '../../core/env.js'
import { notFound } from '../../core/errors.js'
import { generateWebpVariants } from './image-processing.js'
import { Media } from './model.js'
import { getStorageDriver } from './storage/index.js'
import { validateUploadFile } from './upload-validation.js'

/**
 * Media metadata ka public shape. Original file kabhi expose nahi hoti — bahar sirf
 * variant URLs jaati hain (D-41 §1).
 *
 * @param {any} doc
 */
export function toPublicMedia(doc) {
  const media = typeof doc.toObject === 'function' ? doc.toObject() : doc

  return {
    id: String(media._id),
    siteId: media.siteId,
    filename: media.filename,
    mime: media.mime,
    size: media.size,
    width: media.width,
    height: media.height,
    folderId: media.folderId ?? null,
    variants: media.variants ?? [],
    alt: media.alt ?? '',
    title: media.title ?? '',
    caption: media.caption ?? '',
    uploadedBy: media.uploadedBy ? String(media.uploadedBy) : null,
    createdAt: media.createdAt ?? null,
    updatedAt: media.updatedAt ?? null,
  }
}

/**
 * D-41 storage key scheme.
 *
 * @param {{ siteId: string, mediaId: string, date?: Date, variantKey: string }} input
 */
export function buildMediaVariantKey({ siteId, mediaId, date = new Date(), variantKey }) {
  const yyyy = String(date.getUTCFullYear())
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')

  return `sites/${siteId}/media/${yyyy}/${mm}/${mediaId}/${variantKey}.webp`
}

/**
 * Upload ka orchestration — validate, variants banao, storage me likho, phir DB.
 *
 * Multipart parsing yahan **jaan-boojh kar nahi** hai; wo `upload-middleware.js` ka kaam
 * hai. Service ko sirf bytes + declared metadata milte hain, taaki ye HTTP ke bina bhi
 * test ho sake (R1).
 *
 * Koi variant likhne ke baad kuch fail ho to pehle likhi hui files wapas hata di jaati
 * hain — warna storage me aisi files reh jaatin jinka koi DB record hi nahi.
 *
 * @param {{ filename: string, declaredMime: string, size: number, bytes: Buffer|Uint8Array, uploadedBy: string, alt?: string, title?: string, caption?: string }} input
 * @param {{ siteId?: string, storage?: any, maxUploadMb?: number, now?: Date }} [options]
 */
export async function createMediaFromUpload(
  input,
  {
    siteId = DEFAULT_SITE_ID,
    storage = getStorageDriver(),
    maxUploadMb = env.MAX_UPLOAD_MB,
    now = new Date(),
  } = {},
) {
  const file = validateUploadFile({
    filename: input.filename,
    declaredMime: input.declaredMime,
    size: input.size,
    bytes: input.bytes,
    maxUploadMb,
  })

  const processed = await generateWebpVariants(input.bytes)
  const media = new Media({
    siteId,
    filename: file.filename,
    mime: file.mime,
    size: file.size,
    width: processed.original.width,
    height: processed.original.height,
    alt: input.alt ?? '',
    title: input.title ?? '',
    caption: input.caption ?? '',
    uploadedBy: input.uploadedBy,
  })

  const writtenKeys = []

  try {
    for (const variant of processed.variants) {
      const key = buildMediaVariantKey({
        siteId,
        mediaId: String(media._id),
        date: now,
        variantKey: variant.key,
      })

      const stored = await storage.putObject({
        key,
        body: variant.buffer,
        contentType: variant.mime,
        cacheControl: 'public, max-age=31536000, immutable',
      })
      writtenKeys.push(key)

      media.variants.push({
        key: variant.key,
        url: stored?.url ?? storage.publicUrl(key),
        w: variant.w,
        h: variant.h,
      })
    }

    await media.save()
  } catch (err) {
    await Promise.allSettled(writtenKeys.map((key) => storage.deleteObject?.({ key })))
    throw err
  }

  return toPublicMedia(media)
}

/**
 * Server-side pagination day 1 se (R14).
 *
 * @param {object} query `listMediaQuerySchema` se pass hua hua
 * @param {string} [siteId]
 */
export async function listMedia(query, siteId = DEFAULT_SITE_ID) {
  const { page, limit, folderId, search, from, to, sort, order } = query

  const filter = { siteId, deletedAt: null }
  if (folderId) filter.folderId = folderId

  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(safe, 'i')
    filter.$or = [{ filename: rx }, { alt: rx }, { title: rx }, { caption: rx }]
  }

  /**
   * Upload ki tareekh ka range (client, 3 Sep).
   *
   * ⚠️ `to` **poore din** ko pakadta hai — `$lt` agla din, `$lte` wo din nahi. `03-09`
   * chunne wala "3 tarikh tak" kehta hai; bina is +1 din ke us din ki saari images chhoot
   * jaati, aur wo galti chup hoti: filter chalta hua dikhta, data gayab.
   */
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`)
    if (to) {
      const next = new Date(`${to}T00:00:00.000Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      filter.createdAt.$lt = next
    }
  }

  const [docs, total] = await Promise.all([
    Media.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Media.countDocuments(filter),
  ])

  return {
    data: docs.map(toPublicMedia),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  }
}

/**
 * "Is id ka media maujood hai?" — sirf haan/naa, throw nahi karta.
 *
 * Ye doosre modules ke liye hai jo media ki id **store** karte hain (aaj
 * `settings.logoMediaId` / `faviconMediaId`, D-42 §1). Wo Mongoose ke `Media` model ko
 * seedha import na karein — media ka data access media module ke andar hi rehna chahiye.
 *
 * Bekaar id (jo ObjectId hai hi nahi) pe `false` milta hai, CastError nahi — caller ke
 * liye "nahi mila" aur "galat shape" ka nateeja ek hi hai.
 *
 * @param {string} id
 * @param {string} [siteId]
 */
export async function mediaExists(id, siteId = DEFAULT_SITE_ID) {
  if (!mongoose.isValidObjectId(id)) return false

  return Boolean(await Media.exists({ _id: id, siteId, deletedAt: null }))
}

/**
 * @param {string} id
 * @param {string} [siteId]
 */
export async function getMedia(id, siteId = DEFAULT_SITE_ID) {
  const media = await Media.findOne({ _id: id, siteId, deletedAt: null }).lean()
  if (!media) throw notFound('Media not found')

  return toPublicMedia(media)
}

/**
 * Sirf metadata update — alt, title, caption. File badalna replace/crop ka kaam hai, aur
 * wo full Media phase me aayega (D-41 §7).
 *
 * @param {string} id
 * @param {{ alt?: string, title?: string, caption?: string }} input
 * @param {string} [siteId]
 */
export async function updateMedia(id, input, siteId = DEFAULT_SITE_ID) {
  const media = await Media.findOneAndUpdate(
    { _id: id, siteId, deletedAt: null },
    { $set: input },
    { new: true, runValidators: true },
  ).lean()

  if (!media) throw notFound('Media not found')

  return toPublicMedia(media)
}

/**
 * Media ko trash me daalo — **file disk se nahi hat-ti** (R12, D-41 §7).
 *
 * `deletedAt` set hota hai, bas. Do wajah, aur dono is repo me mehngi pad chuki hain:
 *
 * 1. **File wapas nahi aati.** Record chhupana ulta ja sakta hai, file mit jaana nahi —
 *    A-16 ka poora sabak yahi tha (3 Sep: `pnpm test` ne client ki images uda di thi).
 * 2. **Kaun use kar raha hai, ye abhi pata nahi chalta.** `mediaRefs` backlink index abhi
 *    bana hi nahi (Phase 2 ka bacha hua hissa). Us waqt tak file mitana ek aisa page tod
 *    sakta hai jispe wo lagi hai — aur wo toot chup hoti (D-42 §2 ki wajah se `<img>`
 *    render hi nahi hota, page bas adhoora dikhta).
 *
 * Client ko ye batakar chuna gaya (3 Sep): delete seedha trash me jaata hai, reference ka
 * koi check nahi. Trash restorable hai, isliye galti ulti ja sakti hai.
 *
 * @param {string} id
 * @param {string} [siteId]
 */
export async function trashMedia(id, siteId = DEFAULT_SITE_ID) {
  const media = await Media.findOneAndUpdate(
    { _id: id, siteId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true },
  ).lean()

  if (!media) throw notFound('Media not found')

  return { id: String(media._id) }
}
