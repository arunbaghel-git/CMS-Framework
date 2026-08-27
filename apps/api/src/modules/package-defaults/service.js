import { randomUUID } from 'node:crypto'

import { DEFAULT_SITE_ID, emptyPackageDefaults } from '@cms/shared'

import { unprocessable } from '../../core/errors.js'
import { revalidateTags } from '../../core/revalidate.js'
import { mediaExists } from '../media/service.js'
import { PackageDefaults } from './model.js'

/**
 * packageDefaults ka business logic — R1.
 *
 * Singleton hai, isliye koi `create` ya `delete` nahi — `ensurePackageDefaults()` document
 * bana deta hai aur uske baad sirf `update` hota hai. Wahi shape jo `settings` ka hai
 * (D-40): do document ban hi na sakein, isliye create ka raasta hi nahi rakha.
 */

function toApi(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return rest
}

/** Idempotent — seed aur pehli read dono isse bulati hain. */
export async function ensurePackageDefaults(siteId = DEFAULT_SITE_ID) {
  const existing = await PackageDefaults.findOne({ siteId })
  if (existing) return existing

  return PackageDefaults.create({ siteId, ...emptyPackageDefaults() })
}

export async function getPackageDefaults(siteId = DEFAULT_SITE_ID) {
  return toApi(await ensurePackageDefaults(siteId))
}

/**
 * Har media id write se **pehle** validate hoti hai — D-42 §2 ka invariant.
 *
 * "Toota hua `<img>` kabhi render nahi hoga" sirf render ka rule nahi hai; asli bachav
 * yahan hai, reference **banne** se pehle. Bina iske pool me ek mari hui id baithi rehti
 * hai aur gallery strip me ek khaali khaana aa jaata hai.
 *
 * ⚠️ Aur ek sabak jo D-43 §6 me mila tha: ye invariant **delivery layer pe bhi** toot
 * sakta hai — payload bilkul sahi hone ke baawajood `/uploads/*` ka rewrite chhoot jaaye
 * to image 404 deti hai.
 */
async function assertMediaExists(ids, siteId) {
  for (const id of ids) {
    if (!(await mediaExists(id, siteId))) {
      throw unprocessable('One of the selected images could not be found')
    }
  }
}

/**
 * Booking steps ko stable `id` deta hai.
 *
 * Ye **normalization** hai, business logic nahi — par phir bhi service me hai, model ke
 * hook me nahi: write `findOneAndUpdate` se hota hai aur wo `save` hooks chalata hi nahi
 * (R1). Maujood id kabhi overwrite nahi hoti; wo reorder ke aar-paar stable rehni chahiye,
 * warna admin ka drag-drop galat row pe collapse state chipka deta hai (D-43 ka sabak).
 */
function withIds(steps = []) {
  return steps.map((step) => ({ ...step, id: step.id || randomUUID() }))
}

export async function updatePackageDefaults(input, siteId = DEFAULT_SITE_ID) {
  await ensurePackageDefaults(siteId)

  const $set = {}

  if (input.whatsIncluded !== undefined) $set.whatsIncluded = input.whatsIncluded
  if (input.cancellationText !== undefined) $set.cancellationText = input.cancellationText
  if (input.priceNote !== undefined) $set.priceNote = input.priceNote
  if (input.bookingSteps !== undefined) $set.bookingSteps = withIds(input.bookingSteps)

  if (input.itineraryImages !== undefined) {
    await assertMediaExists(input.itineraryImages, siteId)
    $set.itineraryImages = input.itineraryImages
  }

  const updated = await PackageDefaults.findOneAndUpdate({ siteId }, { $set }, { new: true })

  /**
   * Har package page pe ye data chhapta hai (What's included, booking steps, gallery pool),
   * isliye ek bhi package ka page stale ho jaata hai.
   *
   * `type:package` hi sahi tag hai, `entry:{id}` nahi — badla hua data kisi **ek** entry ka
   * nahi hai. Ye wahi sabak hai jo D-43 §4 me mila tha: tag wahan se lo jahan data sach me
   * rehta hai, wahan se nahi jahan wo dikhta hai.
   */
  await revalidateTags(['type:package', 'sitemap'])

  return toApi(updated)
}
