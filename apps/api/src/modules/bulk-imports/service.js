import {
  csvCell,
  DEFAULT_SITE_ID,
  docUrlsFromSheet,
  ENTRY_STATUS,
  IMPORT_MODE,
  IMPORT_ROW_STATUS,
  IMPORT_RUN_STATUS,
  IMPORT_TARGET,
  MAX_IMPORT_ROWS,
  parseCsv,
  pathFromUrl,
  SEO_COLUMN,
  slugify,
} from '@cms/shared'

import { env } from '../../core/env.js'
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
import { listContentTypes } from '../content-types/service.js'
import {
  allEntriesForSeo,
  createEntry,
  findEntryByPath,
  findEntryBySlug,
  publishEntry,
  updateEntry,
} from '../entries/service.js'
import { createMediaFromUpload, mediaExists } from '../media/service.js'
import { getRolePermissions } from '../roles/service.js'
import { User } from '../users/model.js'
import { importInlineImages, mediaIdFromUrl } from './inline-images.js'
import { hasBlocker } from './mapper.js'
import { ImportRun } from './model.js'
import { toSeoUpdate } from './seo-mapper.js'
import { buildRefMaps, targetOf } from './targets.js'

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

/**
 * Past imports me kitne run bache rahenge — client, 4 Sep (_"i need only 20 past import"_).
 *
 * ⚠️ **Screen pehle se sirf 20 dikhati thi; wo hissa theek tha.** Asli dikkat neeche thi: purane
 * run DB me **hamesha** pade rehte the. Har run apni saari rows aur unke issues apne andar rakhta
 * hai (subdocument), yaani ek 20-package wala run kai sau KB ka ho sakta hai. Saal bhar chalne
 * ke baad wo collection bina kisi wajah ke bhaari ho jaati — aur uska koi padhne wala hi nahi
 * hota, kyunki list 20 se aage jaati hi nahi.
 *
 * Isliye naya run banate waqt 20 se puraane hata diye jaate hain.
 *
 * ⚠️ **20 har type ke, dono ke milaa kar nahi** (client, 11 Sep). Pehle ginti ek saath thi, yaani
 * blog ke 20 import lagataar chalte hi package ka **poora** itihaas chup-chaap mit jaata — aur
 * Past imports ka `Packages` filter khaali dikhta.
 */
const MAX_KEPT_RUNS = 20

/**
 * Ek type ke run pakadne ki shart.
 *
 * ⚠️ **Package me wo run bhi aate hain jinme `target` hai hi nahi.** 10 Sep se pehle ke run is
 * field ke bina bane the, aur wo sab package ke the (`targetOf()` bhi unhe package hi maanta hai).
 * Mongo me `null` ki shart ghaayab field ko bhi pakadti hai. Iske bina `Packages` filter purane
 * run chup-chaap chhod deta, aur safai unhe **kabhi** na ginti — wo hamesha pade rehte.
 */
const runsOfTarget = (target) =>
  target === IMPORT_TARGET.PACKAGE ? { $in: [IMPORT_TARGET.PACKAGE, null] } : target

/* ── sheet → rows ─────────────────────────────────────────────────────────── */

/**
 * Doc wale target ki rows — sheet me sirf link hote hain (D-81).
 *
 * ⚠️ Ek hi doc do baar likha ho to doosri baar **skip** — dono ko chalane ka matlab hota ki
 * doosra pehle ko update karta aur client ko lagta ki kuch gadbad hai.
 */
function docRowSeeds({ urls, warnings }) {
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

  return { rows, warnings, total: urls.length }
}

/**
 * SEO wale target ki rows — maal row me hi hai (D-107).
 *
 * Yahan row ki pehchaan `docId` nahi, **`path`** hai (R10). Isliye duplicate bhi usi se ginta
 * hai: ek hi page do baar likha ho to doosri baar skip — warna doosri row pehli ka kaam chup-chaap
 * palat deti aur client ko sirf "kuch to hua" dikhta.
 *
 * ⚠️ Do haalat yahin ruk jaati hain, worker tak jaati hi nahi: bina URL wali row (wo hamesha
 * client ki galti hai) aur wo row jiske **dono** khaane khaali hain. Doosri ko `pending` rakhna
 * bemaani hota — client ka faisla ye hai ki khaali cell kuch badalta hi nahi, to us row ka poora
 * matlab hi "kuch mat karo" hai. Use chupchaap chhod dena bhi galat hota: Past imports me uski
 * ginti `Skipped` me dikhni chahiye, warna client sochta rahega ki wo page kyun nahi badla.
 */
function seoRowSeeds({ rows: values, warnings }) {
  const seen = new Set()

  const rows = values.slice(0, MAX_IMPORT_ROWS).map((value) => {
    const path = pathFromUrl(value.url)
    const seed = { docUrl: '', docId: null, path, values: value }

    if (!path) {
      return { ...seed, status: IMPORT_ROW_STATUS.FAILED, error: 'This row has no page address' }
    }

    if (seen.has(path)) {
      return { ...seed, status: IMPORT_ROW_STATUS.SKIPPED, error: 'This page is listed twice' }
    }

    seen.add(path)

    const empty = !String(value.title ?? '').trim() && !String(value.description ?? '').trim()

    return empty
      ? { ...seed, status: IMPORT_ROW_STATUS.SKIPPED, error: 'Both cells were empty' }
      : { ...seed, status: IMPORT_ROW_STATUS.PENDING }
  })

  return { rows, warnings, total: values.length }
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
  const target = targetOf(input.target)

  /**
   * Sheet ko row me badalne ke **do** tareeke hain, aur target batata hai kaunsa (D-107).
   *
   * Teen purane target me sheet sirf **Google Doc ke link** rakhti hai; SEO wale target me
   * poora maal row me hi hota hai. Isiliye `sheetRows` wala target apni sheet khud padhta hai.
   */
  const { rows, warnings, total } = target.sheetRows
    ? seoRowSeeds(target.sheetRows(parseCsv(csv)))
    : docRowSeeds(docUrlsFromSheet(parseCsv(csv)))

  if (rows.length === 0) {
    throw unprocessable(
      warnings[0] ??
        (target.sheetRows
          ? 'No rows were found in that sheet'
          : 'No document links were found in that sheet'),
    )
  }

  if (total > MAX_IMPORT_ROWS) {
    warnings.push(`Only the first ${MAX_IMPORT_ROWS} rows were taken from the sheet`)
  }

  const run = await ImportRun.create({
    siteId,
    sheetUrl: input.sheetUrl,
    sheetId,
    mode: input.mode,
    target: input.target,
    startedBy: actor.user._id,
    warnings,
    rows,
    status: rows.some((row) => row.status === IMPORT_ROW_STATUS.PENDING)
      ? IMPORT_RUN_STATUS.QUEUED
      : IMPORT_RUN_STATUS.DONE,
  })

  /** `run.target`, `input.target` nahi — schema ka default wahin laga hota hai. */
  await pruneOldRuns(siteId, run.target)

  return toApi(run)
}

/**
 * Isi type ke 20 se puraane run hata do — doosre type ko chhua nahi jaata.
 *
 * ⚠️ **Sirf khatam ho chuke run** hatte hain. Ek chalta hua run (`queued`/`running`) is ginti me
 * to aata hai par hataya kabhi nahi jaayega — use hataane ka matlab hota ki worker ke haath se
 * uska record beech me hi gayab ho jaaye, aur wo rows wahin ruk jaayein jahan thi.
 *
 * Fail-soft: safai na ho paaye to import phir bhi chalna chahiye. Ye kaam sirf jagah bachaata
 * hai, aur uske liye ek chalta hua import rok dena galat sauda hai.
 */
async function pruneOldRuns(siteId, target) {
  const scope = { siteId, target: runsOfTarget(target) }

  try {
    const keep = await ImportRun.find(scope)
      .sort({ createdAt: -1 })
      .limit(MAX_KEPT_RUNS)
      .select('_id')
      .lean()

    if (keep.length < MAX_KEPT_RUNS) return

    const { deletedCount } = await ImportRun.deleteMany({
      ...scope,
      _id: { $nin: keep.map((run) => run._id) },
      status: { $in: [IMPORT_RUN_STATUS.DONE, IMPORT_RUN_STATUS.FAILED] },
    })

    if (deletedCount > 0) logger.info({ deletedCount }, 'Old import runs removed')
  } catch (err) {
    logger.warn({ err }, 'Old import runs saaf nahi ho paaye')
  }
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
 * Ek sheet row → ek maujooda page ka SEO (D-107).
 *
 * Yahan koi doc fetch nahi hoti — maal `row.values` me pehle se hai — isliye ye function sirf
 * teen kaam karta hai: page dhoondho, `seo` merge karo, likh do.
 *
 * ⚠️ **`updateEntry()` se hi jaata hai, seedha Mongo se nahi.** Uske andar `path:` cache tag ki
 * safai aur revision dono hain. Seedha `$set` karne ka matlab hota ki badla hua SEO site pe
 * **ek ghante tak** na dikhe — bilkul wahi lakshan jo D-83 (ISR inert) aur A-26 (sidebar) pe
 * mila tha, aur jise client hamesha _"save hi nahi hua"_ samajhta hai.
 *
 * ⚠️ **Page ka `status` kabhi nahi chhua jaata.** Draft page draft hi rehta hai aur live page
 * dobara publish nahi hota. `publishEntry()` yahan bulana `publishAt` ko aaj ki tareekh pe
 * reset kar deta — 40 page ka SEO theek karne ke badle unki "Published on" udd jaati.
 */
async function importSeoRow(run, row, actor) {
  const siteId = run.siteId
  const path = row.path

  const existing = await findEntryByPath(path, siteId)

  if (!existing) {
    throw new Error(
      `No page with the address "${path}" was found. Export the current SEO to see the exact addresses.`,
    )
  }

  if (existing.deletedAt) {
    throw new Error(`The page at "${path}" is in the Trash. Restore it, then import again.`)
  }

  const { seo, changed, issues } = toSeoUpdate(row.values, existing)

  if (changed.length === 0) {
    return {
      status: IMPORT_ROW_STATUS.SKIPPED,
      action: null,
      entryId: existing._id,
      title: existing.title ?? '',
      path: existing.path ?? path,
      issues,
      error: 'Both cells were empty',
    }
  }

  /** `version` abhi padha jaata hai — run lamba hota hai aur beech me koi save kar sakta hai. */
  const entry = await updateEntry(
    String(existing._id),
    { seo, version: existing.version },
    actor,
    siteId,
  )

  /**
   * Row ka status page ki **apni** haalat batata hai, import ke nateeje ki nahi.
   *
   * Yahan "published" ka matlab hai _"ye badlaav abhi live hai"_, aur "draft" ka _"page abhi
   * live nahi hai, isliye ye SEO bhi kisi ko nahi dikhega"_. Doosra hissa client ke liye
   * zaroori hai — warna wo ek draft page ka SEO bhar kar Google me dhoondhta rehta.
   */
  return {
    status:
      entry.status === ENTRY_STATUS.PUBLISHED
        ? IMPORT_ROW_STATUS.PUBLISHED
        : IMPORT_ROW_STATUS.DRAFT,
    action: 'updated',
    entryId: entry.id ?? entry._id,
    title: entry.title ?? existing.title ?? '',
    path: entry.path ?? path,
    issues,
    error: null,
  }
}

/**
 * Ek doc → ek package.
 *
 * Yahan har `throw` ek **row** ko giraata hai, poore run ko nahi. Ek doc ka private ho jaana
 * baaki unnees ko rok de — ye sabse bekaar behaviour hota.
 */
async function importRow(run, row, refs, actor, deps) {
  const siteId = run.siteId

  /**
   * Target se **teen** cheezein aati hain — doc kaise padha jaaye, payload kaise bane, aur
   * `img` khule ya nahi. Baaki poora function dono ke liye ek jaisa hai (spec 008).
   */
  const target = targetOf(run.target)

  /**
   * SEO wala target neeche ka poora daur chalta hi nahi (D-107).
   *
   * Neeche jo kuch hai — doc fetch, inline images, parse, map, banner, create/publish — wo sab
   * **ek page banane** ka kaam hai. SEO import koi page banata hi nahi; wo ek maujooda page ke
   * do khaane badalta hai. Us raaste pe use bhejne ka matlab hota ki har `if (target.seo)` uske
   * andar ghusta jaaye, aur wahi jodna D-81 ke module ko dheere-dheere do modules ka mix bana
   * deta.
   */
  if (target.updatesSeoOnly) return importSeoRow(run, row, actor)

  let html = cleanGoogleHtml(await fetchDocHtml(row.docId, deps), {
    allowImages: target.allowImages,
  })

  /**
   * Images Media library me utaaro — **parse karne se pehle, poori doc HTML par**.
   *
   * ⚠️ **Kram yahan sabse zaroori cheez hai, aur ye live chalane pe hi pakda gaya (10 Sep).**
   *
   * Pehle ye mapper ke baad chalti thi, block-by-block. Wo galat tha aur uska nateeja poori
   * tarah chup tha: Google har image ko **`data:` URI me** bhejta hai (~100KB ki), do image
   * yaani ~200KB ka article. Mapper `Content` ko `htmlSchema` ki hadd (40,000) pe kaat_ta hai —
   * aur wo kaat **base64 ke beech** padti thi. Us toote hue HTML ko write pe sanitizer poora
   * phenk deta tha.
   *
   * Asli run me nateeja ye tha: article **7 character** ka bacha, na koi heading, na table, na
   * image — aur row ne phir bhi **"Published"** kaha. Theek wahi lakshan jo D-86 aur D-89 me
   * baar-baar mila.
   *
   * Images pehle utar jaane se wahi article ~4KB ka reh jaata hai aur hadd ka sawaal hi nahi
   * uthta.
   *
   * ⚠️ **Poori doc HTML pe, sirf article pe nahi** — isse FAQ ke jawab aur baaki har khaane ki
   * image bhi apne aap sambhal jaati hai. Block-by-block chalane me har naya HTML wala block
   * yaad rakhna padta, aur bhoolne ka lakshan wahi "kuch hafte baad toot jaana" hota.
   */
  const imageIssues = []

  if (target.allowImages) {
    const result = await importInlineImages(html, { actor, siteId, deps })

    html = result.html
    imageIssues.push(...result.issues)
  }

  const parsed = target.parse(html)
  const mapped = target.map(parsed, refs)
  const { input, issues, slug, bannerUrl } = mapped

  issues.push(...imageIssues)

  if (!input.title) throw new Error(target.missingTitle)

  /**
   * ⚠️ **Dhoondhne ka slug wahi hona chahiye jo save karne ka slug hai** — D-86.
   *
   * Ye do jagah do alag tarah se ban raha tha, aur usi khaayi se har import pe duplicate ban
   * rahe the:
   *
   * | | Pehle | Ab |
   * | --- | --- | --- |
   * | save (`resolveSlugAndPath`) | `slugify(Package URL \|\| Package Name)` | wahi |
   * | dhoondhna (yahan) | `parseSlug(Package URL)` — na `slugify`, na title ka fallback | wahi jo save karta hai |
   *
   * Isi ek farak se **teen** cheezein toot rahi thi:
   *
   * 1. `Package URL` me ek bada akshar (`Andaman-tour-…`) — Mongo case-sensitive hai, to lookup
   *    khaali aata tha aur `createEntry` slugify karke lowercase me save kar deta tha. Asli
   *    data me ye `…-2` se `…-7` tak pahunch gaya tha
   * 2. `Package URL` doc me hai hi nahi — tab lookup hota hi nahi tha (`slug ? … : null`), aur
   *    har run ek naya page bana deta tha
   * 3. Neeche wala Trash wala guard **kabhi chala hi nahi** — `existing` hamesha `null` jo
   *    aata tha
   *
   * `slugify()` wahi function hai jo `resolveSlugAndPath()` use karta hai. Use yahan dobara
   * likhne ka matlab hota ki kal wo badle aur ye peeche reh jaaye.
   */
  const lookupSlug = slugify(slug || input.title)
  const existing = lookupSlug ? await findEntryBySlug(target.entryType, lookupSlug, siteId) : null

  if (existing?.deletedAt) {
    throw new Error(
      `A ${target.label} with the URL "${slug}" is in the Trash. Restore it or empty the trash, then import again.`,
    )
  }

  /**
   * Mode se mel na khaaye to row **yahin** rukti hai (client, 4 Sep).
   *
   * ⚠️ Ye jaanch `createEntry`/`updateEntry` se **pehle** honi chahiye, warna nuksaan ho chuka
   * hota hai: "new" chuna ho aur sheet me galti se ek purana URL reh gaya ho, to us live
   * package ka poora content overwrite ho jaata — chup-chaap, kyunki technically wo ek sahi
   * update hai.
   *
   * Dono taraf ek hi niyam hai, aur wo jaan-boojh kar hai: mode ek elaan hai, aur ek taraf use
   * maanna aur doosri taraf nazarandaz karna client ko wahi bharosa nahi deta.
   */
  if (run.mode === IMPORT_MODE.NEW && existing) {
    throw new Error(
      `A ${target.label} with the URL "${slug}" already exists. This import was set to "New ${target.labelPlural}" — choose "Existing ${target.labelPlural}" to update it.`,
    )
  }

  if (run.mode === IMPORT_MODE.EXISTING && !existing) {
    throw new Error(
      `No ${target.label} with the URL "${slug}" exists yet. This import was set to "Existing ${target.labelPlural}" — choose "New ${target.labelPlural}" to create it.`,
    )
  }

  /**
   * Target ka apna aakhri milaap, purane entry ko jaan lene ke baad — aaj sirf page ke paas hai
   * (`fields` merge + naye page ki sidebar, D-95). Package/post pe ye hota hi nahi.
   */
  if (target.prepare) issues.push(...target.prepare(input, existing, mapped))

  /** Blocker ho to publish nahi hoga — banner ke bina bhi package ban jaana chahiye. */
  if (bannerUrl) {
    try {
      const ownMediaId = mediaIdFromUrl(bannerUrl)

      if (ownMediaId) {
        /** Hamari apni image — download nahi, seedha uthao. Par pehle dekh lo ki wo hai. */
        if (!(await mediaExists(ownMediaId, siteId))) {
          throw new Error('That image is no longer in the Media library')
        }

        target.setImage(input, ownMediaId)
      } else {
        /** Pehle se banner ho to dobara download nahi — warna har run naye media bana deta hai. */
        target.setImage(
          input,
          target.getImage(existing) ?? (await importBanner(bannerUrl, actor, siteId, deps)),
        )
      }
    } catch (err) {
      issues.push({
        level: 'blocker',
        label: 'Banner Image URL',
        value: bannerUrl,
        message: err.message,
      })
    }
  }

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
   * **Import me suffix lagna hamesha ek galti ka nishaan hai** — D-86.
   *
   * `resolveSlugAndPath()` slug ka takrav dekh kar chup-chaap `-2` laga deta hai. Admin me
   * haath se page banate waqt wo behaviour theek hai (do page ka naam sach me ek jaisa ho
   * sakta hai), par import me kabhi nahi: yahan ya to purana package update hona tha, ya sach
   * me naya banna tha. Beech ka `…-7` kisi ne nahi maanga hota.
   *
   * Asli data me yahi hua tha — ek hi doc `…-2` se `…-7` tak saat live page bana chuka tha,
   * aur har run "Published" bolta raha. Upar wale lookup ka fix us ek wajah ko band karta hai;
   * ye guard un wajahon ke liye hai **jo abhi hume dikhi hi nahi** — jaise kisi doosre type ke
   * page ka wahi `path` ghere baithna.
   *
   * Blocker hai, `throw` nahi: package ban chuka hai aur uska content bacha rehna chahiye —
   * wahi niyam jo baaki har blocker pe hai.
   */
  if (entry.slug && lookupSlug && entry.slug !== lookupSlug) {
    issues.push({
      level: 'blocker',
      label: target.slugLabel,
      value: lookupSlug,
      message: `Another ${target.label} already uses the address "${lookupSlug}", so this one was saved as "${entry.slug}". Set a different ${target.slugLabel}, or run this again in "Existing ${target.labelPlural}" mode to update the original.`,
    })
  }

  const blocked = hasBlocker(issues)

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
 * Ek pending row uthao — **atomic**, aur bata do ki **kaunsi** uthayi.
 *
 * Filter hi lock hai: claim wali `findOneAndUpdate` ek hi row ko `processing` kar paati hai,
 * chahe do instance ek saath chal rahe hon. Wahi pattern jo `publishDueEntries()` me hai (R2),
 * aur wahi wajah — DB sach ka ghar hai, process ki memory nahi.
 *
 * ⚠️ **Do kadam isliye hain ki ek kadam ye nahi bata sakta ki kaunsi row mili.** Pehle ye ek hi
 * `findOneAndUpdate` tha, aur caller phir `rows.find(status === 'processing')` se row dhoondhta
 * tha — yaani **pehli** processing row, zaroori nahi ki wahi jo abhi claim hui. Do worker saath
 * chal jaayein (ya ek purana process abhi zinda ho) to dono ek hi row pe kaam karte the aur
 * doosri row **anaath** `processing` pe padi reh jaati thi. Uska lakshan client ko **theek 5
 * minute ka intezaar** dikhta tha (`STUCK_AFTER_MS`), aur asli import 2 second ka hota tha.
 * Ye 22 Sep ko SEO ke import pe pakda gaya — 28 row ka import **305 second** le raha tha.
 *
 * Pehla kadam sirf **padhta** hai (kaunsi row chahiye), doosra usi `_id` pe `status: pending`
 * ki shart ke saath likhta hai — yaani beech me koi aur wahi row le gaya to ye khaali haath
 * lautta hai aur agla tick agli row uthata hai. `$elemMatch` ke saath positional `$` usi element
 * pe lagta hai.
 *
 * @returns {Promise<{ run: object, row: object }|null>}
 */
async function claimRow(now) {
  const candidate = await ImportRun.findOne(
    {
      status: { $in: [IMPORT_RUN_STATUS.QUEUED, IMPORT_RUN_STATUS.RUNNING] },
      'rows.status': IMPORT_ROW_STATUS.PENDING,
    },
    { rows: { $elemMatch: { status: IMPORT_ROW_STATUS.PENDING } } },
  )
    .sort({ createdAt: 1 })
    .lean()

  const rowId = candidate?.rows?.[0]?._id
  if (!rowId) return null

  const run = await ImportRun.findOneAndUpdate(
    {
      _id: candidate._id,
      rows: { $elemMatch: { _id: rowId, status: IMPORT_ROW_STATUS.PENDING } },
    },
    {
      $set: {
        status: IMPORT_RUN_STATUS.RUNNING,
        'rows.$.status': IMPORT_ROW_STATUS.PROCESSING,
        'rows.$.claimedAt': now,
      },
      $inc: { 'rows.$.attempts': 1 },
    },
    { new: true },
  )

  if (!run) return null

  const row = run.rows.find((entry) => String(entry._id) === String(rowId))

  return row ? { run, row } : null
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
 * Row claim to ho gayi thi, par kaam **shuru hi nahi ho paaya** — use wapas kataar me daal do.
 *
 * ⚠️ Ye `importRow()` ke fail hone se **alag** cheez hai. Wahan doc ya row me kuch galat hota
 * hai (naam nahi mila, URL nahi mila) — wo hamesha galat rahega, isliye row seedha `failed`
 * hoti hai aur dobara koshish bemaani hai. Yahan galti **row ki nahi** hai: actor nahi ban paaya
 * ya master lists nahi aayi, yaani Mongo ki ek hichki. Aisi row ko `failed` kehna jhooth hai.
 *
 * Pehle aisi galti `processImportQueue()` se **bahar nikal jaati thi** (`actorFor` `try` ke bahar
 * tha), aur row `processing` pe padi reh jaati thi — agli koshish `reclaimStuckRows()` ke bharose,
 * yaani **paanch minute** baad. Ab wo agle tick pe hoti hai, **do second** me.
 *
 * `attempts` claim ke waqt hi badh chuka hai, isliye `MAX_ATTEMPTS` yahan bhi lagta hai — warna
 * ek lagataar girta hua actor row ko hamesha ke liye kataar me ghumata rehta.
 */
async function releaseRow(run, row, err) {
  logger.warn(
    { err, runId: String(run._id), rowId: String(row._id), attempts: row.attempts },
    'Bulk import row shuru hi nahi ho payi — wapas kataar me',
  )

  if (row.attempts >= MAX_ATTEMPTS) {
    await finishRow(run._id, row._id, {
      status: IMPORT_ROW_STATUS.FAILED,
      error: `This row could not be started: ${String(err?.message ?? 'something went wrong')}`.slice(
        0,
        500,
      ),
    })

    return
  }

  /** `finishRow()` se hi — wo run ko band karne ka hisaab bhi rakhti hai (yahan band nahi hoga). */
  await finishRow(run._id, row._id, { status: IMPORT_ROW_STATUS.PENDING, claimedAt: null })
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
  const claimed = await claimRow(new Date())
  if (!claimed) return { processed: 0 }

  const { run, row } = claimed

  /**
   * ⚠️ **Ye do line `try` ke andar hain, aur wo jaan-boojh kar hai.**
   *
   * Pehle `actorFor()` bahar tha. Uska ek throw poore tick ko le doobta tha aur row `processing`
   * pe chhoot jaati thi — paanch minute ke intezaar ke saath. Ab wo `releaseRow()` se turant
   * wapas kataar me aati hai.
   */
  let actor
  let refs

  try {
    actor = await actorFor(run.startedBy)
    refs = deps.refs ?? (await buildRefMaps(run.target, run.siteId))
  } catch (err) {
    await releaseRow(run, row, err)

    return { processed: 1 }
  }

  if (!actor) {
    await finishRow(run._id, row._id, {
      status: IMPORT_ROW_STATUS.FAILED,
      error: 'The user who started this import no longer exists',
    })

    return { processed: 1 }
  }

  try {
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
  mode: run.mode ?? IMPORT_MODE.NEW,
  target: run.target ?? IMPORT_TARGET.PACKAGE,
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

    /**
     * Page ka **poora** pata — admin ise seedha kholta hai.
     *
     * ⚠️ Sirf `path` bhejna ek chup bug tha: admin `:5173` pe chalta hai, to browser
     * `/packages/…` ko **admin ka hi** pata samajh leta hai aur khaali page khulta hai. Public
     * site alag origin pe hai.
     *
     * `env.SITE_URL` se judta hai, kisi setting se nahi — wahi pattern jo
     * `settings/controller.js` me hai (`withReadOnly`), aur wahi jagah jahan revalidate bhi
     * jaata hai. Deployment ki config ka ghar wahi ek hona chahiye.
     */
    url: row.path ? `${env.SITE_URL.replace(/\/$/, '')}${row.path}` : null,

    issues: row.issues ?? [],
    error: row.error ?? null,
  })),
})

const countsOf = (rows) => {
  /**
   *  aur  client ki maang hai (4 Sep) — Past imports me do naye khaane.
   *
   * Ye `row.action` se aate hain, `run.mode` se nahi: mode wo tha jo client ne **kaha**, action
   * wo hai jo sach me **hua**. Dono ek hi hone chahiye, aur alag ho jaayein to wahi dikhna
   * chahiye — ginti ko mode se banana us farak ko chhupa deta.
   */
  const counts = {
    total: rows.length,
    published: 0,
    draft: 0,
    failed: 0,
    pending: 0,
    created: 0,
    updated: 0,
  }

  for (const row of rows) {
    if (row.status === IMPORT_ROW_STATUS.PUBLISHED) counts.published += 1
    else if (row.status === IMPORT_ROW_STATUS.DRAFT) counts.draft += 1
    else if (row.status === IMPORT_ROW_STATUS.FAILED) counts.failed += 1
    else if (row.status !== IMPORT_ROW_STATUS.SKIPPED) counts.pending += 1

    if (row.action === 'created') counts.created += 1
    else if (row.action === 'updated') counts.updated += 1
  }

  return counts
}

/** Ek run me fail hone ki alag-alag wajah — Past imports ke hover ke liye. */
const MAX_REASONS = 5

function failedReasonsOf(rows = []) {
  const seen = []

  for (const row of rows) {
    if (row.status !== IMPORT_ROW_STATUS.FAILED || !row.error) continue
    if (!seen.includes(row.error)) seen.push(row.error)
    if (seen.length === MAX_REASONS) break
  }

  return seen
}

export async function listImportRuns(query, siteId = DEFAULT_SITE_ID) {
  const { page, limit, target } = query
  const filter = target ? { siteId, target: runsOfTarget(target) } : { siteId }

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
    /**
     * ⚠️ **`rows` list me nahi jaati, par fail hone ki wajah jaati hai.**
     *
     * Rows isliye giraayi jaati hain ki 20 run × 20 row × unke issues ka payload bina wajah
     * bhaari hai — us screen pe koi row dikhti hi nahi. Par phir `Failed` ke saamne sirf ek
     * number rehta tha aur client ko wajah dekhne ke liye har run kholna padta.
     *
     * Isliye sirf **wajah** jaati hai: alag-alag, aur zyada se zyada paanch. Ek hi wajah se das
     * row fail hon to wo ek hi line hai — client ko das baar wahi vaakya padhna nahi chahiye.
     */
    runs: docs.map((run) => ({
      ...toApi(run),
      rows: [],
      failedReasons: failedReasonsOf(run.rows),
    })),
    meta: { page, limit, total },
  }
}

export async function getImportRun(id, siteId = DEFAULT_SITE_ID) {
  const run = await ImportRun.findOne({ _id: id, siteId }).lean()

  if (!run) throw notFound('That import could not be found')

  return toApi(run)
}

/* ── SEO ka export ────────────────────────────────────────────────────────── */

/**
 * Ek file me kitne page — `allEntriesForSeo()` ki chhat.
 *
 * ⚠️ Cap **abhi** rakhi gayi hai, tab nahi jab dikkat aaye. Aaj is site pe ~30 page hain, par
 * ye framework pandrah instance pe chalta hai; ek 5,000-page wali site pe bina cap ke ye query
 * poori collection memory me uthaati aur response bhi utna hi bhaari hota. Wahi soch
 * `PACKAGE_LIST_SCAN_CAP` (D-87 Slice B) aur `MAX_IMPORT_ROWS` pe hai.
 */
export const SEO_EXPORT_MAX = 2000

/**
 * Poori site ka SEO ek CSV me — import ka doosra sira (D-107, client 21 Sep).
 *
 * ⚠️ **Column ke naam `SEO_COLUMN` se aate hain, haath se nahi likhe jaate.** Import wahi
 * constant padhta hai. Do jagah likhne ka nateeja D-86 me dekha ja chuka hai: wahan dhoondhne
 * aur save karne ka slug alag ho gaya tha, aur har import duplicate page bana raha tha — bina
 * kisi error ke. Yahan wo galti "export ne `SEO Title` likha, import `Meta Title` dhoondhta
 * raha" banti, aur uska lakshan bhi wahi hota: **kuch na hona**.
 *
 * ⚠️ **`Type` ka naam DB ki content type se aata hai, hardcoded map se nahi** — R11. `tourPage`
 * ek andar ka naam hai; client ki file me `Tour page` likha hona chahiye, aur agar client us
 * type ka label badal de to file usi din badal jaani chahiye.
 *
 * `Type` sirf padhne ke liye hai — import use dekhta hi nahi, kyunki page ki pehchaan uska
 * `path` hai (R10). Wo file me isliye hai ki client Sheets me type se chhaant sake.
 *
 * @param {string} [siteId]
 * @returns {Promise<string>}
 */
export async function exportSeoCsv(siteId = DEFAULT_SITE_ID) {
  const [entries, { contentTypes }] = await Promise.all([
    allEntriesForSeo(SEO_EXPORT_MAX, siteId),
    listContentTypes({ page: 1, limit: 100 }, siteId),
  ])

  const labelOf = new Map(contentTypes.map((type) => [type.key, type.label]))

  const header = [SEO_COLUMN.URL, SEO_COLUMN.TYPE, SEO_COLUMN.TITLE, SEO_COLUMN.DESCRIPTION]

  const rows = entries.map((entry) => [
    entry.path,
    labelOf.get(entry.type) ?? entry.type,
    entry.seo?.title ?? '',
    entry.seo?.description ?? '',
  ])

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
