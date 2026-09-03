import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  docUrlsFromSheet,
  ENTRY_STATUS,
  IMPORT_ROW_STATUS,
  IMPORT_RUN_STATUS,
  MAX_IMPORT_ROWS,
  normalizeName,
  parseCsv,
  parsePackageDoc,
  TAXONOMY_TYPE,
} from '@cms/shared'

import { notFound, unprocessable } from '../../core/errors.js'
import {
  docIdFromUrl,
  fetchDocHtml,
  fetchImage,
  fetchSheetCsv,
  sheetIdFromUrl,
} from '../../core/google-fetch.js'
import { cleanGoogleHtml } from '../../core/google-html.js'
import { logger } from '../../core/logger.js'
import { createEntry, findEntryBySlug, publishEntry, updateEntry } from '../entries/service.js'
import { allItemNames } from '../master-lists/service.js'
import { createMediaFromUpload } from '../media/service.js'
import { getRolePermissions } from '../roles/service.js'
import { allTaxonomyNames } from '../taxonomies/service.js'
import { User } from '../users/model.js'
import { hasBlocker, toEntryInput } from './mapper.js'
import { ImportRun } from './model.js'

/**
 * Bulk Upload ka business logic (D-81).
 *
 * ## Kaam ek request me kyun nahi hota
 *
 * Naapa gaya: ek doc ~0.5s me aata hai. 20 doc = ~10s sirf laane me, uske upar har package ka
 * create + publish + revalidate, aur banner image ki sharp processing (CPU pe 1-3s). Asli kul
 * **30-120 second**.
 *
 * Ek HTTP request itni der nahi ruk sakti — production ka reverse proxy 60s pe kaat deta hai,
 * aur admin ke axios pe koi timeout hai hi nahi, to browser tab tak latka rehta hai. Sabse
 * bura hissa ye hai ki us waqt tak **kuch import ho chuka hota hai** aur client ko pata hi
 * nahi chalta ki kya bana aur kya nahi.
 *
 * Isliye: run DB me banta hai aur turant laut jaata hai; rows ek-ek karke chalti hain; admin
 * poll karta hai. Client ko history bhi chahiye thi, aur wo isi se mil jaati hai.
 *
 * ## Rows ek saath kyun nahi chalti
 *
 * Teen wajah, teenon asli:
 *
 * 1. `resolveSlugAndPath()` **padho-phir-likho** hai. Do row ek saath chalein aur dono ka slug
 *    ek ho, to dono ko `-2` khaali dikhta hai aur duplicate ban jaate hain.
 * 2. Google anonymous export pe throttle karta hai.
 * 3. `sharp` CPU pe chalti hai aur wahi process admin ko bhi serve kar raha hai.
 *
 * 20 × ~3s = ~60s, aur us dauraan table row-by-row bharti dikhti hai — jo ek chalte hue kaam
 * jaisa lagta hai, atke hue jaisa nahi.
 */

/** Atki hui row itni der baad wapas `pending` — process mar gaya to run phansa na rahe. */
const STUCK_AFTER_MS = 5 * 60 * 1000

/** Ek row kitni baar koshish kare — iske baad wo `failed` hai, warna wo hamesha ghoomti rahegi. */
const MAX_ATTEMPTS = 2

/* ── naam se id ka naksha ─────────────────────────────────────────────────── */

/**
 * Ek list ko `naam → entries[]` me badlo.
 *
 * ⚠️ Value **array** hai, ek object nahi — kyunki ek hi naam do baar aa sakta hai. Taxonomy ki
 * uniqueness `slug` pe hai, `name` pe nahi, aur master lists pe to koi uniqueness hai hi nahi.
 * Aise me chup-chaap pehla utha lena **galat hotel live page pe** daal deta hai. Array rakhne se
 * mapper wo haalat dekh kar blocker laga sakta hai.
 */
const nameMap = (items) => {
  const map = new Map()

  for (const item of items) {
    const key = normalizeName(item.name)
    if (!key) continue

    map.set(key, [...(map.get(key) ?? []), item])
  }

  return map
}

/**
 * Chaaron list ek baar — poore import ke liye.
 *
 * Har reference ko alag query karne ka matlab hota 20 package × ~20 reference = **400 query**.
 * Ye **paanch** hain.
 */
export async function buildRefMaps(siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const [destinations, packageTypes, hotels, addOns, transfers] = await Promise.all([
    allTaxonomyNames(TAXONOMY_TYPE.DESTINATION, siteId, locale),
    allTaxonomyNames(TAXONOMY_TYPE.PACKAGE_TYPE, siteId, locale),
    allItemNames('hotel', siteId),
    allItemNames('addOn', siteId),
    allItemNames('transfer', siteId),
  ])

  return {
    destinations: nameMap(destinations),
    packageTypes: nameMap(packageTypes),
    hotels: nameMap(hotels),
    addOns: nameMap(addOns),
    transfers: nameMap(transfers),
  }
}

/* ── run shuru karna ──────────────────────────────────────────────────────── */

/**
 * Sheet padho aur run bana do.
 *
 * ⚠️ Sheet **abhi**, isi request me padhi jaati hai (wo ek chhoti fetch hai). Wajah UX ki hai:
 * sabse aam galti "galat ya un-shared sheet ka link" hai, aur uska jawab client ko **turant**
 * milna chahiye — ek 422 ke roop me, na ki poll karte-karte 30 second baad.
 */
export async function startImport(input, actor, siteId = DEFAULT_SITE_ID, deps = {}) {
  const sheetId = sheetIdFromUrl(input.sheetUrl)

  if (!sheetId) {
    throw unprocessable(
      'That does not look like a Google Sheet link. Open the sheet, copy the address bar, and paste it here.',
    )
  }

  const csv = await fetchSheetCsv(sheetId, deps)
  const { urls, warnings } = docUrlsFromSheet(parseCsv(csv))

  if (urls.length === 0) {
    throw unprocessable(warnings[0] ?? 'No document links were found in that sheet')
  }

  /**
   * Ek hi doc do baar likha ho to doosri baar **skip** — dono ko chalane ka matlab hota ki
   * doosra pehle ko update karta aur client ko lagta ki kuch gadbad hai.
   */
  const seen = new Set()
  const rows = urls.slice(0, MAX_IMPORT_ROWS).map((docUrl) => {
    const docId = docIdFromUrl(docUrl)
    const duplicate = docId && seen.has(docId)
    if (docId) seen.add(docId)

    if (!docId) {
      return {
        docUrl,
        docId: null,
        status: IMPORT_ROW_STATUS.FAILED,
        error: 'This is not a Google Doc link',
      }
    }

    return duplicate
      ? { docUrl, docId, status: IMPORT_ROW_STATUS.SKIPPED, error: 'This document is listed twice' }
      : { docUrl, docId, status: IMPORT_ROW_STATUS.PENDING }
  })

  if (urls.length > MAX_IMPORT_ROWS) {
    warnings.push(`Only the first ${MAX_IMPORT_ROWS} rows were taken from the sheet`)
  }

  const run = await ImportRun.create({
    siteId,
    sheetUrl: input.sheetUrl,
    sheetId,
    startedBy: actor.user._id,
    warnings,
    rows,
    status: rows.some((row) => row.status === IMPORT_ROW_STATUS.PENDING)
      ? IMPORT_RUN_STATUS.QUEUED
      : IMPORT_RUN_STATUS.DONE,
  })

  return toApi(run)
}

/* ── ek row chalana ───────────────────────────────────────────────────────── */

/**
 * Worker ke paas request nahi hoti, to actor haath se banana padta hai.
 *
 * `createEntry`/`publishEntry` ko `{ user, permissions }` chahiye, aur
 * `createMediaFromUpload` ko `uploadedBy` (required ObjectId). Dono run ke `startedBy` se
 * bante hain — yaani import usi ke naam pe hota hai jisne use chalaya tha.
 */
async function actorFor(userId) {
  const user = await User.findById(userId).lean()

  if (!user) return null

  return { user, permissions: await getRolePermissions(user.role) }
}

/** Banner image laa kar media me daalo — **fail ho to sirf image fail ho, package nahi**. */
async function importBanner(url, actor, siteId, deps) {
  const { bytes, mime, filename } = await fetchImage(url, deps)

  const media = await createMediaFromUpload(
    {
      filename,
      declaredMime: mime,
      size: bytes.length,
      bytes,
      uploadedBy: actor.user._id,
    },
    { siteId },
  )

  return media.id
}

/**
 * Ek doc → ek package.
 *
 * Yahan har `throw` ek **row** ko giraata hai, poore run ko nahi. Ek doc ka private ho jaana
 * baaki unnees ko rok de — ye sabse bekaar behaviour hota.
 */
async function importRow(run, row, refs, actor, deps) {
  const siteId = run.siteId
  const html = cleanGoogleHtml(await fetchDocHtml(row.docId, deps))
  const parsed = parsePackageDoc(html)
  const { input, issues, slug, bannerUrl } = toEntryInput(parsed, refs)

  if (!input.title) {
    throw new Error('This document has no "Package Name", so no package could be created')
  }

  /**
   * ⚠️ Slug ka pehle se milna **zaroori** hai, warna dobara chalane pe duplicate ban jaate hain.
   *
   * `resolveSlugAndPath()` slug ka takrav dekh kar chup-chaap `-2` laga deta hai — aur trash me
   * padi entry bhi slug pakde rehti hai. Us `-2` wale page ko agla run phir nahi pehchanta, aur
   * har run ek aur duplicate banata hai.
   */
  const existing = slug ? await findEntryBySlug('package', slug, siteId) : null

  if (existing?.deletedAt) {
    throw new Error(
      `A package with the URL "${slug}" is in the Trash. Restore it or empty the trash, then import again.`,
    )
  }

  /** Blocker ho to publish nahi hoga — banner ke bina bhi package ban jaana chahiye. */
  if (bannerUrl) {
    try {
      /** Pehle se banner ho to dobara download nahi — warna har run naye media bana deta hai. */
      input.fields.bannerImage = existing?.fields?.bannerImage
        ? existing.fields.bannerImage
        : await importBanner(bannerUrl, actor, siteId, deps)
    } catch (err) {
      issues.push({
        level: 'blocker',
        label: 'Banner Image URL',
        value: bannerUrl,
        message: err.message,
      })
    }
  }

  const blocked = hasBlocker(issues)

  let entry
  let action

  if (existing) {
    /** `version` abhi padha jaata hai — run lamba hota hai aur beech me koi save kar sakta hai. */
    entry = await updateEntry(
      String(existing._id),
      { ...input, version: existing.version },
      actor,
      siteId,
    )
    action = 'updated'
  } else {
    entry = await createEntry(input, actor, siteId)
    action = 'created'
  }

  /**
   * Publish ke do niyam:
   *
   * 1. Blocker ho to publish **nahi** — client ka faisla ("rok do publish mat karo").
   * 2. Pehle se published ho to **dobara publish nahi** — wo `version` phir badha deta, ek aur
   *    revision likhta, aur `publishAt` ko aaj ki tareekh pe reset kar deta. Yaani bees
   *    package ki "Published on" har import pe badal jaati.
   *
   * ⚠️ Aur ek baat: pehle se live page ko blocker ki wajah se **neeche nahi laaya jaata**. Ek
   * hotel ke naam ki typo bees live page utaar de — wo aapdaa hoti.
   */
  const alreadyLive = existing?.status === ENTRY_STATUS.PUBLISHED

  if (!blocked && !alreadyLive) {
    entry = await publishEntry(String(entry.id ?? entry._id), {}, actor, siteId)
  }

  const published = alreadyLive || (!blocked && entry.status === ENTRY_STATUS.PUBLISHED)

  return {
    status: published ? IMPORT_ROW_STATUS.PUBLISHED : IMPORT_ROW_STATUS.DRAFT,
    action,
    entryId: entry.id ?? entry._id,
    title: input.title,
    path: entry.path ?? '',
    issues,
    error: null,
  }
}

/* ── worker ───────────────────────────────────────────────────────────────── */

/**
 * Ek pending row uthao — **atomic**.
 *
 * Filter hi lock hai: `findOneAndUpdate` ek hi row ko `processing` kar paata hai, chahe do
 * instance ek saath chal rahe hon. Wahi pattern jo `publishDueEntries()` me hai (R2), aur wahi
 * wajah — DB sach ka ghar hai, process ki memory nahi.
 */
async function claimRow(now) {
  return ImportRun.findOneAndUpdate(
    {
      status: { $in: [IMPORT_RUN_STATUS.QUEUED, IMPORT_RUN_STATUS.RUNNING] },
      'rows.status': IMPORT_ROW_STATUS.PENDING,
    },
    {
      $set: {
        status: IMPORT_RUN_STATUS.RUNNING,
        'rows.$.status': IMPORT_ROW_STATUS.PROCESSING,
        'rows.$.claimedAt': now,
      },
      $inc: { 'rows.$.attempts': 1 },
    },
    { new: true, sort: { createdAt: 1 } },
  )
}

/** Row ka nateeja wapas usi jagah likho, aur run khatam hua ho to use band kar do. */
async function finishRow(runId, rowId, result) {
  await ImportRun.updateOne(
    { _id: runId, 'rows._id': rowId },
    {
      $set: Object.fromEntries(
        Object.entries(result).map(([key, value]) => [`rows.$.${key}`, value]),
      ),
    },
  )

  const run = await ImportRun.findById(runId)
  if (!run) return

  const busy = run.rows.some((row) =>
    [IMPORT_ROW_STATUS.PENDING, IMPORT_ROW_STATUS.PROCESSING].includes(row.status),
  )

  if (!busy) {
    run.status = IMPORT_RUN_STATUS.DONE
    run.finishedAt = new Date()
    await run.save()
  }
}

/**
 * Atki hui rows wapas laao.
 *
 * ⚠️ **Iske bina ek crash poore run ko hamesha ke liye phansa deta hai.** Row `processing` pe
 * baithi reh jaati, run kabhi `done` nahi hota, aur admin me *"Importing 12 of 20…"* anant tak
 * chalta rehta — bina kisi error ke. Ye wo hissa hai jo sabse aasaani se chhoot jaata hai.
 */
export async function reclaimStuckRows(now = new Date()) {
  const cutoff = new Date(now.getTime() - STUCK_AFTER_MS)

  const runs = await ImportRun.find({
    status: IMPORT_RUN_STATUS.RUNNING,
    'rows.status': IMPORT_ROW_STATUS.PROCESSING,
  })

  for (const run of runs) {
    let touched = false

    for (const row of run.rows) {
      if (row.status !== IMPORT_ROW_STATUS.PROCESSING) continue
      if (row.claimedAt && row.claimedAt > cutoff) continue

      touched = true

      if (row.attempts >= MAX_ATTEMPTS) {
        row.status = IMPORT_ROW_STATUS.FAILED
        row.error = 'The import stopped while this row was being processed. Run the import again.'
        continue
      }

      row.status = IMPORT_ROW_STATUS.PENDING
      row.claimedAt = null
    }

    if (touched) await run.save()
  }
}

/**
 * Ek row chalao. Kuch bacha ho to `{ processed: 1 }`, warna `{ processed: 0 }`.
 *
 * Test isse **loop me** khud call karti hai — theek waise jaise `entries.test.js`
 * `publishDueEntries()` ko call karti hai. Timer `index.js` me hai, jo tests load hi nahi
 * karti.
 */
export async function processImportQueue(deps = {}) {
  const run = await claimRow(new Date())
  if (!run) return { processed: 0 }

  const row = run.rows.find((entry) => entry.status === IMPORT_ROW_STATUS.PROCESSING)
  if (!row) return { processed: 0 }

  const actor = await actorFor(run.startedBy)

  if (!actor) {
    await finishRow(run._id, row._id, {
      status: IMPORT_ROW_STATUS.FAILED,
      error: 'The user who started this import no longer exists',
    })

    return { processed: 1 }
  }

  try {
    const refs = deps.refs ?? (await buildRefMaps(run.siteId))

    await finishRow(run._id, row._id, await importRow(run, row, refs, actor, deps))
  } catch (err) {
    /**
     * Ek row ka girna poore tick ko nahi giraana chahiye — warna ek kharaab doc baaki unnees
     * ko bhi rok deta hai.
     */
    logger.warn({ err, runId: String(run._id), docId: row.docId }, 'Bulk import row failed')

    await finishRow(run._id, row._id, {
      status: IMPORT_ROW_STATUS.FAILED,
      error: String(err?.message ?? 'Something went wrong').slice(0, 500),
    })
  }

  return { processed: 1 }
}

/* ── padhne wale raaste ───────────────────────────────────────────────────── */

const toApi = (run) => ({
  id: String(run._id),
  sheetUrl: run.sheetUrl,
  status: run.status,
  warnings: run.warnings ?? [],
  error: run.error ?? null,
  createdAt: run.createdAt,
  finishedAt: run.finishedAt ?? null,
  counts: countsOf(run.rows ?? []),
  rows: (run.rows ?? []).map((row) => ({
    id: String(row._id),
    docUrl: row.docUrl,
    docId: row.docId,
    status: row.status,
    action: row.action ?? null,
    entryId: row.entryId ? String(row.entryId) : null,
    title: row.title ?? '',
    path: row.path ?? '',
    issues: row.issues ?? [],
    error: row.error ?? null,
  })),
})

const countsOf = (rows) => {
  const counts = { total: rows.length, published: 0, draft: 0, failed: 0, pending: 0 }

  for (const row of rows) {
    if (row.status === IMPORT_ROW_STATUS.PUBLISHED) counts.published += 1
    else if (row.status === IMPORT_ROW_STATUS.DRAFT) counts.draft += 1
    else if (row.status === IMPORT_ROW_STATUS.FAILED) counts.failed += 1
    else if (row.status !== IMPORT_ROW_STATUS.SKIPPED) counts.pending += 1
  }

  return counts
}

export async function listImportRuns(query, siteId = DEFAULT_SITE_ID) {
  const { page, limit } = query
  const filter = { siteId }

  const [docs, total] = await Promise.all([
    ImportRun.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ImportRun.countDocuments(filter),
  ])

  /** List pe rows nahi jaati — 20 run × 20 row ka payload bina wajah bhaari hai. */
  return {
    runs: docs.map((run) => ({ ...toApi(run), rows: [] })),
    meta: { page, limit, total },
  }
}

export async function getImportRun(id, siteId = DEFAULT_SITE_ID) {
  const run = await ImportRun.findOne({ _id: id, siteId }).lean()

  if (!run) throw notFound('That import could not be found')

  return toApi(run)
}
