import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  isExternalRedirect,
  isPubliclyVisible,
  normalizePath,
} from '@cms/shared'

import { notFound, unprocessable } from '../../core/errors.js'
import { logger } from '../../core/logger.js'
import { revalidateTags } from '../../core/revalidate.js'
import { Entry } from '../entries/model.js'
import { Redirect } from './model.js'

/**
 * Redirects ka business logic — R1.
 *
 * Do raaste se redirect bante hain:
 *
 * - **auto** (D-49) — entry ka path badle to purana URL zinda rahe
 * - **haath se** (D-97, 17 Sep) — `Settings ▸ 301 Redirects`, jaise `/packages` → listing page
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
    /**
     * Admin ka banaya redirect **jeet-ta hai** (D-97 §4). Us `from` pe unhone soch kar kuch
     * rakha hai; slug badalne wala system use chup-chaap palat de to client ko wajah kabhi pata
     * nahi chalegi.
     */
    const manual = await Redirect.findOne({ ...scope(siteId, locale), from, isAuto: false }).lean()
    if (manual) return toApi(manual)

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

  /**
   * Wahi normalize jo `redirectFromSchema` store karte waqt karta hai — `/Packages/` aaye to bhi
   * `/packages` wala redirect mile (D-97 §2).
   */
  const key = normalizePath(from).toLowerCase()

  return toApi(await Redirect.findOne({ ...scope(siteId, locale), from: key }).lean())
}

/** Admin ki list — server-side pagination day 1 se (R14). */
export async function listRedirects(query, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const { page, limit, q, isAuto } = query

  const filter = scope(siteId, locale)
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ from: pattern }, { to: pattern }]
  }
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
 * Admin ke redirect ke niyam — create aur update dono pe (D-97 §3).
 *
 * 1. **Us path pe koi page na ho.** Resolve page ko redirect se pehle dekhta hai, to aisa redirect
 *    kabhi chalta hi nahi — aur admin ko lagta ki ban gaya. Chup-chaap "kuch na hona" is repo ki
 *    sabse mehngi galti hai (D-86), isliye yahin rok
 * 2. **`from` ek hi baar** — doosra redirect usi URL pe ho to wahi edit karo
 * 3. **Khud pe nahi, aur ghoom kar wapas nahi** — `/a → /b` pehle se ho to `/b → /a` loop hai
 * 4. **Chain nahi bachti** — `to` khud kisi redirect ka `from` ho to seedha uske aakhri `to` pe
 * 5. **`to` Trash ya draft page pe nahi** (client, 17 Sep: _"rokna hai"_) — visitor redirect ho kar 404 pe
 *    girta, aur redirect list me theek dikhta. Wahi "kuch na hona"
 *
 * @returns {Promise<string>} aakhri `to` (chain flatten ke baad)
 */
async function checkManualRedirect({ from, to, excludeId }, siteId, locale) {
  const inScope = scope(siteId, locale)
  const notSelf = excludeId ? { _id: { $ne: excludeId } } : {}

  const page = await Entry.findOne({ ...inScope, path: from, deletedAt: null })
    .select('title')
    .lean()
  if (page) {
    throw unprocessable(
      `"${page.title}" lives at ${from}. Change that page's URL first, or pick another From.`,
    )
  }

  const taken = await Redirect.findOne({ ...inScope, from, ...notSelf }).lean()
  if (taken) throw unprocessable(`${from} already redirects to ${taken.to}. Edit that one instead.`)

  if (isExternalRedirect(to)) return to

  const target = normalizePath(to.split(/[?#]/)[0]).toLowerCase()
  if (target === from) throw unprocessable('From and To are the same page.')

  /**
   * `to` pe koi page hai to wahi aakhri manzil hai — resolve page ko redirect se pehle dekhta hai (§3),
   * isliye us path pe pada koi purana redirect **follow nahi** karna.
   */
  if (await landsOnPage(target, inScope)) return to

  const next = await Redirect.findOne({ ...inScope, from: target, ...notSelf }).lean()
  if (!next) return to
  if (isExternalRedirect(next.to)) return next.to

  const nextTarget = normalizePath(next.to.split(/[?#]/)[0]).toLowerCase()
  if (nextTarget === from) {
    throw unprocessable(`${target} already redirects back to ${from} — that would loop forever.`)
  }

  await landsOnPage(nextTarget, inScope)
  return next.to
}

/**
 * `to` ke path pe page — dikhne wala ho to `true`, koi na ho to `false` (tab chain dekhi jaati hai).
 * Trash ya draft/scheduled ho to **422** (niyam #5): wahan visitor ko 404 milta.
 */
async function landsOnPage(path, inScope) {
  const page = await Entry.findOne({ ...inScope, path })
    .select('title status publishAt deletedAt')
    .lean()
  if (!page) return false
  if (isPubliclyVisible(page)) return true

  const why = page.deletedAt ? 'is in the Trash' : 'is not published'
  throw unprocessable(
    `"${page.title}" at ${path} ${why} — visitors would see a 404. Choose another To.`,
  )
}

/**
 * Jo URL is redirect ke peeche the — unka ISR cache saaf ho.
 *
 * Bina iske `/packages` ka purana 404 ek ghanta (`CACHE_SECONDS`) chalta rehta, aur client kehta
 * "save kiya par kaam nahi kar raha" — A-26 wali shakl.
 */
const invalidatePaths = (paths) => revalidateTags(paths.filter(Boolean).map((p) => `path:${p}`))

/** `Settings ▸ 301 Redirects` ▸ Add (D-97). */
export async function createRedirect(input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const to = await checkManualRedirect(input, siteId, locale)

  const doc = await Redirect.create({
    ...scope(siteId, locale),
    from: input.from,
    to,
    statusCode: 301,
    isAuto: false,
    hits: 0,
  })

  const chained = await flattenChainsInto(input.from, to, siteId, locale)
  await invalidatePaths([input.from, ...chained])

  return toApi(doc)
}

/**
 * Edit — auto wala redirect bhi edit ho sakta hai, aur edit hote hi wo **manual** ban jaata hai
 * (D-97 §4). Admin ne haath lagaya, ab system use nahi badlega.
 */
export async function updateRedirect(id, input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Redirect.findOne({ _id: id, ...scope(siteId, locale) }).lean()
  if (!current) throw notFound('Redirect not found')

  const from = input.from ?? current.from
  const to = await checkManualRedirect(
    { from, to: input.to ?? current.to, excludeId: current._id },
    siteId,
    locale,
  )

  const doc = await Redirect.findOneAndUpdate(
    { _id: current._id },
    { $set: { from, to, statusCode: 301, isAuto: false } },
    { new: true },
  ).lean()

  const chained = await flattenChainsInto(from, to, siteId, locale)
  await invalidatePaths([current.from, from, ...chained])

  return toApi(doc)
}

/**
 * Jo redirects `from` pe aa rahe the, wo ab seedha `to` pe jaayein — auto wala niyam #1, admin
 * ke redirect pe bhi. Badle hue redirects ke `from` lautata hai, taaki unka cache bhi saaf ho.
 */
async function flattenChainsInto(from, to, siteId, locale) {
  const inScope = scope(siteId, locale)
  const chained = await Redirect.find({ ...inScope, to: from })
    .select('from')
    .lean()
  if (chained.length === 0) return []

  await Redirect.updateMany({ ...inScope, to: from }, { $set: { to } })
  return chained.map((r) => r.from)
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
  await invalidatePaths([current.from])

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
