import { randomUUID } from 'node:crypto'

import { DEFAULT_SITE_ID, emptyPackageDefaults, resolveSectionLabels } from '@cms/shared'

import { unprocessable } from '../../core/errors.js'
import { revalidateTags } from '../../core/revalidate.js'
import { sanitizePackageDefaults } from '../../core/sanitize-html.js'
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

  return {
    ...rest,
    /**
     * Admin ko bhi **resolved** labels milte hain, raw stored nahi — wahi jo public payload
     * me jaate hain (D-65).
     *
     * Wajah: admin ka form wahi dikhana chahiye jo page pe sach me chhap raha hai. Raw
     * bhejne pe admin ko khud fallback lagana padta, aur wo shart phir do jagah likhi hoti
     * — API me aur admin me. Do jagah wahi shart ek din alag ho jaati hai.
     *
     * Isse "save karne pe kuch badal gaya" wala confusion bhi nahi hota: form me jo dikh
     * raha tha, Save uske alawa kuch likhta hi nahi.
     */
    sectionLabels: resolveSectionLabels(rest.sectionLabels),
  }
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

  /**
   * ⚠️ **Ye whitelist hai — naya field yahan jodna bhool jaana ek chup bug hai.**
   *
   * Zod use pass kar deta hai, API 200 deti hai, admin "Saved." dikhata hai, aur value DB
   * tak pahunchti hi nahi. Rating ke saath theek yahi hua aur test ne pakda (1 Sep) — wahi
   * shakl jo D-64 (transfer duration), D-65 (`cancellationText`) aur D-68 (section guard)
   * ki thi: dono taraf ka code sahi dikhta hai, beech me field chhoot jaata hai.
   *
   * Whitelist phir bhi hai, `...input` nahi: `req.body` ko seedha `$set` me kholna wahi
   * raasta hai jispe R9 likha gaya hai.
   */
  /**
   * ⚠️ **HTML ki safai sabse pehle, ek hi jagah** (D-80).
   *
   * Chaar field ab HTML rakhte hain — `whatsIncluded` ki lines (inline), `cancellationText`,
   * `bookingSteps[].text` aur `sectionLabels[].description`. Kaunsa field HTML hai, iska
   * jawab `sanitize-html.js` me hai; yahan sirf use guzarna hai.
   *
   * Neeche wali whitelist `clean` se padhti hai, `input` se nahi — warna ek line bhi `input`
   * se uthate hi wo field bina safai ke DB me chala jaata, aur wo bhoolna chup hota.
   */
  const clean = sanitizePackageDefaults(input)
  const $set = {}

  if (clean.whatsIncluded !== undefined) $set.whatsIncluded = clean.whatsIncluded
  if (clean.cancellationText !== undefined) $set.cancellationText = clean.cancellationText
  if (clean.bookingSteps !== undefined) $set.bookingSteps = withIds(clean.bookingSteps)
  if (clean.sectionLabels !== undefined) $set.sectionLabels = clean.sectionLabels
  /** `4.9 average from 412 trips` — hero aur reviews section dono isse chhapte hain. */
  if (input.rating !== undefined) $set.rating = input.rating

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
