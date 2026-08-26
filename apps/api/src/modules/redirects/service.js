import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '@cms/shared'

import { notFound } from '../../core/errors.js'
import { logger } from '../../core/logger.js'
import { Redirect } from './model.js'

/**
 * Redirects ka business logic — R1.
 *
 * Slice 3 me sirf **auto** wala hissa hai: entry ka path badle to purana URL zinda rahe.
 * Haath se redirect banana aur unka manager Phase 4 me hai.
 */

const scope = (siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) => ({ siteId, locale })

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function toApi(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

/**
 * Path badla — purane URL pe 301 bana do.
 *
 * **Teen kaam ek saath hote hain**, aur teenon zaroori hain (`cache-invalidation` skill,
 * "Slug change ka special case"):
 *
 * 1. **Chain flatten** — jo redirects pehle se `from` pe aa rahe the, wo ab seedha naye
 *    path pe jaayein. Bina iske `/a → /b → /c` ban jaata hai: har hop ek extra round-trip
 *    hai, aur teen hop ke baad Google follow karna hi band kar deta hai.
 * 2. **Naya redirect** — `from → to`.
 * 3. **Loop se bachav** — naya path khud kabhi redirect ka `from` nahi ho sakta. Aisa
 *    hota hai jab slug wapas purane naam pe le jaaya jaaye (`/a → /b`, phir `/b → /a`);
 *    us row ko hata na dein to page apne aap pe redirect karta rehta hai.
 *
 * **Fail-soft hai.** Redirect na ban paane ka matlab hai "purana link toot gaya" — bura
 * hai, par uske liye admin ka Save fail karna usse bhi bura hai. Error log hota hai,
 * kyunki warna wajah kahin dikhti hi nahi.
 *
 * @param {string} from purana path
 * @param {string} to naya path
 */
export async function recordAutoRedirect(
  from,
  to,
  siteId = DEFAULT_SITE_ID,
  locale = DEFAULT_LOCALE,
) {
  if (!from || !to || from === to) return null

  try {
    // 1. Chain flatten — jo bhi purane path pe aa raha tha, ab seedha naye pe jaaye
    await Redirect.updateMany({ ...scope(siteId, locale), to: from }, { $set: { to } })

    // 3. Loop se bachav — naya path khud kisi redirect ka `from` na bacha rahe
    await Redirect.deleteOne({ ...scope(siteId, locale), from: to })

    // 2. Naya redirect. `upsert` isliye ki wahi `from` pehle bhi badla ho sakta hai —
    //    us case me sabse naya `to` hi sahi hai
    const doc = await Redirect.findOneAndUpdate(
      { ...scope(siteId, locale), from },
      { $set: { to, statusCode: 301, isAuto: true }, $setOnInsert: { hits: 0 } },
      { new: true, upsert: true },
    )

    return toApi(doc)
  } catch (err) {
    logger.error({ err, from, to }, 'Auto-redirect ban nahi paaya — purana link toot jaayega')
    return null
  }
}

/**
 * Ek path pe kaunsa redirect lagta hai — public resolve isse use karega (Phase 3).
 *
 * `hits` yahan **nahi** badhta: ye ek read hai, aur state-changing read banane ka matlab
 * hai ki har cache warm-up bhi counter ghuma de. Counting Phase 4 ke manager ke saath
 * aayegi, jab uska koi dekhne wala hoga.
 */
export async function findRedirect(from, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!from) return null

  return toApi(await Redirect.findOne({ ...scope(siteId, locale), from }).lean())
}

/** Admin ki list — server-side pagination day 1 se (R14). */
export async function listRedirects(query, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const { page, limit, q, isAuto } = query

  const filter = scope(siteId, locale)
  if (q) filter.from = new RegExp(escapeRegex(q), 'i')
  if (isAuto !== undefined) filter.isAuto = isAuto

  const [docs, total] = await Promise.all([
    Redirect.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Redirect.countDocuments(filter),
  ])

  return { redirects: docs.map(toApi), meta: { page, limit, total } }
}

/**
 * Delete — permanent.
 *
 * Ye Slice 3 me isliye hai (create ke bina) ki auto-redirects apne aap bante hain, aur ek
 * galat bane hue redirect ko hatane ka koi raasta na hona matlab admin ko us URL pe
 * hamesha ke liye phansa dena.
 */
export async function deleteRedirect(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Redirect.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!current) throw notFound('Redirect not found')

  await Redirect.deleteOne({ _id: id })

  return { id: String(id) }
}

/**
 * Entry hamesha ke liye mit gayi — uspe aane wale redirects bhi hata do.
 *
 * Bina iske wo redirects ek 404 pe point karte rehte hain: user ko ek hop milta hai aur
 * phir bhi "page nahi mila". Seedha 404 dena us se saaf hai.
 */
export async function removeRedirectsTo(path, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!path) return { deleted: 0 }

  const result = await Redirect.deleteMany({ ...scope(siteId, locale), to: path })

  return { deleted: result.deletedCount ?? 0 }
}
