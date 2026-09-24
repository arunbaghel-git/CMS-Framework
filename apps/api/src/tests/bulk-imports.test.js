import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { DEFAULT_SITE_ID, ENTRY_STATUS } from '@cms/shared'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { ContentType } from '../modules/content-types/model.js'
import { ensureBuiltInContentTypes } from '../modules/content-types/service.js'
import { ImportRun } from '../modules/bulk-imports/model.js'
import { processImportQueue } from '../modules/bulk-imports/service.js'
import { Entry } from '../modules/entries/model.js'
import { AddOn, Hotel, Transfer } from '../modules/master-lists/model.js'
import { Media } from '../modules/media/model.js'
import { PackageDefaults } from '../modules/package-defaults/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { Settings } from '../modules/settings/model.js'
import { updateSettings } from '../modules/settings/service.js'
import { Sidebar } from '../modules/sidebars/model.js'
import { Taxonomy } from '../modules/taxonomies/model.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'
import { connectTestDb, disconnectTestDb } from './db.js'

/**
 * Bulk Upload ka integration test (D-81).
 *
 * ## Network yahan chhua hi nahi jaata — **fetch inject hota hai**
 *
 * Is repo me HTTP mocking ka koi pattern nahi hai. Sabse kareeb `createMediaFromUpload(input,
 * { storage = getStorageDriver() })` hai: dependency **argument** se aati hai, taaki test use
 * badal sake. Wahi shakl yahan hai — `startImport()` aur `processImportQueue()` `deps.fetchImpl`
 * lete hain.
 *
 * `vi.stubGlobal('fetch')` jaan-boojh kar nahi: wo global badal deta hai aur uska risaav doosri
 * test files tak jaata hai, jabki ye tareeka usi convention pe chalta hai jo pehle se hai.
 *
 * ## Worker khud call hota hai
 *
 * Asli timer `index.js` me hai, jise tests load hi nahi karti (warna har file apna timer chalu
 * kar deti aur vitest kabhi khatam na hota). Isliye test `processImportQueue()` ko **loop me**
 * khud chalati hai — theek jaise `entries.test.js` `publishDueEntries()` ko chalati hai.
 *
 * Chalane se pehle: `pnpm db:up`
 */

const PASSWORD = 'ek-lamba-sa-passphrase'
const app = createApp()

const SHEET_ID = 'SHEET1'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`

function cookieJar(res) {
  const jar = {}
  for (const raw of res.headers['set-cookie'] ?? []) {
    const [pair] = raw.split(';')
    const idx = pair.indexOf('=')
    const value = pair.slice(idx + 1)
    if (value) jar[pair.slice(0, idx)] = value
  }
  return jar
}

const asHeader = (jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD })
  return cookieJar(res)
}

function authed(method, url, jar) {
  const req = request(app)[method](url).set('Cookie', asHeader(jar))
  return jar[COOKIE.CSRF] ? req.set(CSRF_HEADER, jar[COOKIE.CSRF]) : req
}

/* ── Google ka naqli jawab ────────────────────────────────────────────────── */

/** Ek doc ka HTML — usi shakl me jaisa Google bhejta hai (bold class se, tag se nahi). */
const doc = (body) =>
  `<html><head><style type="text/css">.c2{font-weight:400}.c4{font-weight:700}</style></head>` +
  `<body class="c3">${body}</body></html>`

const p = (text) => `<p class="c0"><span class="c2">${text}</span></p>`

/** Ek poora package — sab kuch resolve hota hua. */
const goodDoc = (name, slug) =>
  doc(
    [
      p('Package Name'),
      p(name),
      p('Package URL'),
      p(`https://site.com/packages/${slug}`),
      p('Meta Title'),
      p(`${name} | 5N`),
      p('Night'),
      p('5 Nights'),
      p('Day'),
      p('6'),
      p('Destinations'),
      p('Port Blair, Havelock'),
      p('Package Type'),
      p('Honeymoon'),
      p('Add Ons'),
      p('Snorkelling'),
      p('Standard Hotel'),
      p('City hotel'),
      p('Standard Price'),
      p('&#8377;24,999'),
      p('Short Description'),
      p('Kids &lt; 5 years free.'),
      p('Overview'),
      `<p class="c0"><span class="c2">Covers </span><span class="c4">Port Blair</span>.</p>`,
      p('Day wise Itinerary'),
      p('Day 1'),
      p('Day Title'),
      p('Arrive Port Blair'),
      p('Overnight Stay'),
      p('port blair'),
      p('Meals'),
      p('Breakfast, Dinner'),
      p('Transfer'),
      p('Private AC Sedan'),
      p('Day Description'),
      p('Land and rest.'),
    ].join(''),
  )

/** Wahi package, par destination ki spelling galat — publish rukna chahiye. */
const typoDoc = doc(
  [
    p('Package Name'),
    p('Typo Trip'),
    p('Package URL'),
    p('typo-trip'),
    p('Destinations'),
    p('Havelok'),
  ].join(''),
)

/** Naam hi nahi — package ban hi nahi sakta. */
const namelessDoc = doc([p('Meta Title'), p('No name here')].join(''))

/**
 * Naqli Google.
 *
 * `docs` me jo id hai wahi milti hai; baaki har id pe 404 — yaani "doc hai hi nahi" wala case
 * bhi asli jaisa chalta hai.
 */
function fakeFetch(docs, sheetCsv) {
  return async (url) => {
    if (url.includes('/spreadsheets/')) {
      return {
        ok: true,
        status: 200,
        url,
        headers: new Map([['content-type', 'text/csv']]),
        arrayBuffer: async () => Buffer.from(sheetCsv, 'utf8'),
      }
    }

    const id = url.match(/document\/d\/([^/]+)/)?.[1]
    const html = docs[id]

    return {
      ok: Boolean(html),
      status: html ? 200 : 404,
      url,
      headers: new Map([['content-type', 'text/html']]),
      arrayBuffer: async () => Buffer.from(html ?? 'not found', 'utf8'),
    }
  }
}

/** `headers.get()` chahiye — `Map` ke paas wo pehle se hai, bas `?? ''` ka dhyaan. */
const csvOf = (ids) =>
  [
    'Doc File,Status,Published URL',
    ...ids.map((id) => `https://docs.google.com/document/d/${id}/edit,,`),
  ].join('\n')

let adminJar
let editorJar

/** Jab tak kaam bacha ho, worker chalao. */
async function drain(deps) {
  for (let i = 0; i < 50; i += 1) {
    const { processed } = await processImportQueue(deps)
    if (!processed) return
  }

  throw new Error('Worker 50 baar chalne ke baad bhi khatam nahi hua')
}

async function runImport(
  docs,
  ids = Object.keys(docs),
  mode = undefined,
  target = undefined,
  extraDeps = {},
) {
  /** `extraDeps` — D-116 ke image tests: naqli `mediaPort` aur image ka fetch. */
  const deps = { fetchImpl: fakeFetch(docs, csvOf(ids)), ...extraDeps }
  if (extraDeps.wrapFetch) deps.fetchImpl = extraDeps.wrapFetch(deps.fetchImpl)

  /**
   * `startImport()` ko service se seedha bulaya jaata hai kyunki HTTP route ke paas
   * `deps` bhejne ka koi raasta nahi hai — aur hona bhi nahi chahiye, warna koi request
   * fetch badal sakti.
   */
  const { startImport } = await import('../modules/bulk-imports/service.js')
  const user = await User.findOne({ email: 'admin@test.com' }).lean()
  /** `deps` chautha argument hai — teesra `siteId` hai, isliye wo bhi saaf likhna padta hai. */
  const run = await startImport(
    { sheetUrl: SHEET_URL, ...(mode ? { mode } : {}), ...(target ? { target } : {}) },
    { user, permissions: [] },
    DEFAULT_SITE_ID,
    deps,
  )

  await drain(deps)

  return ImportRun.findById(run.id).lean()
}

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    RefreshToken.deleteMany({}),
    ContentType.deleteMany({}),
    ImportRun.deleteMany({}),
    Entry.deleteMany({}),
    Media.deleteMany({}),
    Taxonomy.deleteMany({}),
    Hotel.deleteMany({}),
    AddOn.deleteMany({}),
    Transfer.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()
  /**  content type DB se padhta hai — bina iske har row "Unknown content type" pe girti hai. */
  await ensureBuiltInContentTypes()

  for (const [username, email, role] of [
    ['boss', 'admin@test.com', 'admin'],
    ['ed', 'ed@test.com', 'editor'],
  ]) {
    await createUser({ username, name: username, email, role, password: PASSWORD })
  }

  adminJar = await loginAs('admin@test.com')
  editorJar = await loginAs('ed@test.com')

  const [portBlair] = await Taxonomy.create([
    { type: 'destination', name: 'Port Blair', slug: 'port-blair' },
    { type: 'destination', name: 'Havelock', slug: 'havelock' },
    { type: 'packageType', name: 'Honeymoon', slug: 'honeymoon' },
    { type: 'category', name: 'Trip planning', slug: 'trip-planning' },
  ])

  await Hotel.create({ name: 'City hotel', destinationId: portBlair._id, category: 'standard' })
  await AddOn.create({ name: 'Snorkelling' })
  await Transfer.create({ name: 'Private AC Sedan' })
})

describe('permissions', () => {
  it('bina login ke 401', async () => {
    await request(app).get('/api/bulk-imports').expect(401)
  })

  it('tools.import na ho to 403 — editor bhi nahi', async () => {
    // `tools.import` sirf admin pe hai; editor ko ye screen dikhni hi nahi chahiye
    await authed('get', '/api/bulk-imports', editorJar).expect(403)
  })

  it('admin ke liye khula hai', async () => {
    await authed('get', '/api/bulk-imports', adminJar).expect(200)
  })

  it('import shuru karna POST hai, GET nahi (R13)', async () => {
    // State-changing GET har refresh aur har prefetch pe chal jaata
    await authed('get', '/api/bulk-imports/start', adminJar).expect(404)
  })
})

describe('sheet ki jaanch', () => {
  it('galat link pe 422 turant milta hai — poll ka intezaar nahi', async () => {
    const res = await authed('post', '/api/bulk-imports', adminJar).send({
      sheetUrl: 'https://example.com/not-a-sheet',
    })

    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('Google Sheet')
    expect(await ImportRun.countDocuments()).toBe(0)
  })
})

describe('import chalana', () => {
  it('sab resolve ho to package publish ho jaata hai', async () => {
    const run = await runImport({ A: goodDoc('Andaman Escape', 'andaman-escape') })

    expect(run.status).toBe('done')
    expect(run.rows[0].status).toBe('published')
    expect(run.rows[0].action).toBe('created')
    expect(run.rows[0].path).toBe('/packages/andaman-escape')

    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.status).toBe(ENTRY_STATUS.PUBLISHED)
    expect(entry.title).toBe('Andaman Escape')
    /** Bold class se aaya tha — semantic tag ban kar bachna chahiye */
    expect(entry.content.blocks[0].props.html).toContain('<strong>Port Blair</strong>')
    /** `&#8377;24,999` → 24999, na ki 837724999 */
    expect(entry.fields.pricing.categoryPricing[0].priceFrom).toBe(24999)
    /** `Kids < 5 years` adhoora nahi katna chahiye */
    expect(entry.fields.shortDescription).toBe('Kids < 5 years free.')
    /** D-104 — meals free text hain, to doc ka bada akshar waisa ka waisa bachta hai */
    expect(entry.fields.itinerary[0].meals).toEqual(['Breakfast', 'Dinner'])
  })

  /**
   * ⚠️ D-116 (client, 23 Sep): import me **sirf Published ya Failed** — pehle yahan package draft
   * banta tha. Ab blocker = Failed, aur kuch save nahi hota.
   */
  it('naam match na kare to row Failed — package banta hi nahi', async () => {
    const run = await runImport({ B: typoDoc })

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].entryId).toBeNull()

    const blocker = run.rows[0].issues.find((issue) => issue.level === 'blocker')

    expect(blocker.value).toBe('Havelok')
    expect(blocker.message).toContain('Destinations list')
    /** Ek hi blocker — to wahi `error` bhi hai (Past imports ka hover) */
    expect(run.rows[0].error).toContain('Destinations list')
    expect(await Entry.countDocuments()).toBe(0)
  })

  /** Pehle blocker ke saath bhi live package ka content update ho jaata tha (bina hotel ke). */
  it('live package pe blocker aaye to use haath nahi lagta', async () => {
    const first = await runImport({ A: goodDoc('Live One', 'live-one') })
    const before = await Entry.findById(first.rows[0].entryId).lean()

    const broken = goodDoc('Live One CHANGED', 'live-one').replace(
      'Port Blair, Havelock',
      'Havelok',
    )
    const second = await runImport({ A: broken }, ['A'], 'existing')

    expect(second.rows[0].status).toBe('failed')

    const after = await Entry.findById(before._id).lean()
    expect(after.title).toBe('Live One')
    expect(after.version).toBe(before.version)
    expect(after.status).toBe(ENTRY_STATUS.PUBLISHED)
  })

  it('naam hi na ho to row failed hai — package banta hi nahi', async () => {
    const run = await runImport({ C: namelessDoc })

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].entryId).toBeNull()
    expect(run.rows[0].error).toContain('Package Name')
    expect(await Entry.countDocuments()).toBe(0)
  })

  it('ek doc ka fail hona baaki ko nahi rokta', async () => {
    const run = await runImport({
      A: goodDoc('Andaman Escape', 'andaman-escape'),
      C: namelessDoc,
      D: goodDoc('Neil Special', 'neil-special'),
    })

    const byStatus = run.rows.map((row) => row.status)

    expect(byStatus.filter((s) => s === 'published')).toHaveLength(2)
    expect(byStatus.filter((s) => s === 'failed')).toHaveLength(1)
  })

  it('doc na khule to us row ka saaf message aata hai', async () => {
    const run = await runImport({ A: goodDoc('X', 'x') }, ['A', 'MISSING'])

    const failed = run.rows.find((row) => row.docId === 'MISSING')

    expect(failed.status).toBe('failed')
    expect(failed.error).toContain('does not exist')
  })

  it('ek hi doc do baar likha ho to doosri baar skip hota hai', async () => {
    const run = await runImport({ A: goodDoc('X', 'x') }, ['A', 'A'])

    expect(run.rows.map((row) => row.status)).toEqual(['published', 'skipped'])
    expect(await Entry.countDocuments()).toBe(1)
  })
})

describe('result ka payload', () => {
  /**
   * ⚠️ Ye bug asli import pe pakda gaya (4 Sep).
   *
   * Result screen pehle `row.path` ko seedha `href` me daalti thi. Admin `:5173` pe chalta hai,
   * to browser `/packages/…` ko **admin ka hi** pata samajh leta tha aur ek khaali page khulta
   * tha. Public site alag origin pe hai, isliye poora URL **server se** aana chahiye — usi ke
   * paas `SITE_URL` hai.
   */
  it('page ka poora URL bhejta hai, sirf path nahi', async () => {
    const run = await runImport({ A: goodDoc('Url Test', 'url-test') })
    const { getImportRun } = await import('../modules/bulk-imports/service.js')
    const api = await getImportRun(String(run._id))

    expect(api.rows[0].path).toBe('/packages/url-test')
    expect(api.rows[0].url).toBe('http://localhost:3000/packages/url-test')
  })

  it('page hi na bana ho to URL null rehta hai', async () => {
    const run = await runImport({ C: namelessDoc })
    const { getImportRun } = await import('../modules/bulk-imports/service.js')
    const api = await getImportRun(String(run._id))

    expect(api.rows[0].url).toBeNull()
  })
})

describe('banner image', () => {
  /**
   * ⚠️ Ye case asli import pe pakda gaya (4 Sep).
   *
   * Client ne admin me apni image ka "File URL" copy kiya aur doc me chipka diya — wo
   * `http://localhost:5173/uploads/…` tha. Importer use bahar ka URL samajh kar download karne
   * gaya, aur SSRF guard ne `localhost` ko theek hi roka. Package draft reh gaya aur client ko
   * ek aisa error mila jo uski galti jaisa lagta tha — jabki usne bilkul sahi image chuni thi.
   *
   * Download karna waise bhi galat tha: wo image pehle se Media me hai, aur har run uska ek
   * **naya** record bana deta.
   */
  it('apni hi media ka URL ho to download nahi, wahi media use hoti hai', async () => {
    const media = await Media.create({
      filename: 'banner.webp',
      mime: 'image/webp',
      size: 1234,
      width: 1600,
      height: 900,
      uploadedBy: (await User.findOne({ email: 'admin@test.com' }).lean())._id,
      variants: [],
    })

    const id = String(media._id)
    const withBanner = doc(
      [
        p('Package Name'),
        p('Banner Test'),
        p('Package URL'),
        p('banner-test'),
        p('Banner Image URL'),
        p(`http://localhost:5173/uploads/sites/default/media/2026/09/${id}/large.webp`),
      ].join(''),
    )

    const run = await runImport({ E: withBanner })
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.fields.bannerImage).toBe(id)
    /** Naya media record **nahi** banna chahiye — wahi ek jo pehle se tha */
    expect(await Media.countDocuments()).toBe(1)
    expect(run.rows[0].status).toBe('published')
  })

  it('media library me wo image na ho to row Failed, saaf wajah ke saath', async () => {
    const withBanner = doc(
      [
        p('Package Name'),
        p('Ghost Banner'),
        p('Package URL'),
        p('ghost-banner'),
        p('Banner Image URL'),
        p(
          'http://localhost:5173/uploads/sites/default/media/2026/09/aaaaaaaaaaaaaaaaaaaaaaaa/large.webp',
        ),
      ].join(''),
    )

    const run = await runImport({ F: withBanner })

    const banner = run.rows[0].issues.find((issue) => issue.label === 'Banner Image URL')

    expect(run.rows[0].status).toBe('failed')
    expect(await Entry.countDocuments()).toBe(0)
    expect(banner.level).toBe('blocker')
    expect(banner.message).toContain('no longer in the Media library')
  })
})

describe('slug ki pehchaan (D-86)', () => {
  /** Wahi doc jo client ka tha — `Package URL` me bada akshar. */
  const capsDoc = doc(
    [p('Package Name'), p('Andaman Tour'), p('Package URL'), p('Andaman-Tour-Package')].join(''),
  )

  /** `Package URL` hai hi nahi — address naam se banega. */
  const noUrlDoc = doc([p('Package Name'), p('Andaman Tour')].join(''))

  it('Package URL me bade akshar ho to bhi duplicate nahi banta', async () => {
    const docs = { A: capsDoc }

    const first = await runImport(docs)
    expect(first.rows[0].path).toBe('/packages/andaman-tour-package')
    expect(await Entry.countDocuments()).toBe(1)

    /**
     * ⚠️ Yahi wo asli bug tha: dhoondha `Andaman-Tour-Package` se jaata tha (jaisa doc me
     * likha hai) aur save `andaman-tour-package` hota tha. Mongo case-sensitive hai, to
     * lookup hamesha khaali aata aur har run ek naya `-2`, `-3` … bana deta tha. Asli data
     * me ye `-7` tak pahunch gaya tha.
     */
    const second = await runImport(docs, undefined, 'existing')

    expect(await Entry.countDocuments()).toBe(1)
    expect(second.rows[0].action).toBe('updated')
  })

  it('new mode me wahi doc dobara chalane pe ab saaf rukta hai', async () => {
    const docs = { A: capsDoc }

    await runImport(docs)
    const second = await runImport(docs)

    /** Pehle ye chup-chaap ek naya page bana deta tha. */
    expect(second.rows[0].status).toBe('failed')
    expect(second.rows[0].error).toMatch(/already exists/i)
    expect(await Entry.countDocuments()).toBe(1)
  })

  /** D-116: pehle yahan package draft banta tha (address naam se). Ab Failed, kuch nahi banta. */
  it('Package URL na ho to row Failed — package banta hi nahi', async () => {
    const { rows } = await runImport({ A: noUrlDoc })

    expect(rows[0].status).toBe('failed')
    expect(rows[0].action).toBeNull()
    expect(rows[0].issues.some((i) => i.label === 'Package URL' && i.level === 'blocker')).toBe(
      true,
    )
    expect(await Entry.countDocuments()).toBe(0)
  })

  it('Package URL na ho to har run Failed — kabhi duplicate nahi', async () => {
    const docs = { A: noUrlDoc }

    await runImport(docs)
    await runImport(docs)

    expect(await Entry.countDocuments()).toBe(0)
  })

  it('Trash me pada package ab sach me pakda jaata hai', async () => {
    const docs = { A: capsDoc }

    const first = await runImport(docs)
    await Entry.updateOne({ _id: first.rows[0].entryId }, { $set: { deletedAt: new Date() } })

    /**
     * ⚠️ Ye guard `importRow` me shuru se likha tha par **kabhi chala hi nahi** — lookup ke
     * case wale bug ki wajah se `existing` hamesha `null` aata tha.
     */
    const second = await runImport(docs, undefined, 'existing')

    expect(second.rows[0].status).toBe('failed')
    expect(second.rows[0].error).toMatch(/Trash/i)
  })

  it('slug pe suffix lagna pade to row Failed — kuch save nahi', async () => {
    /**
     * `uploads` ek **reserved slug** hai (`RESERVED_SLUGS`), isliye `resolveSlugAndPath()`
     * use chhod kar `uploads-2` pe chala jaata hai.
     *
     * Ye un gine-chune raaston me se ek hai jahan suffix ab bhi lag sakta hai — lookup wala fix
     * lag jaane ke baad ek jaise slug wali soorat mode guard pe hi ruk jaati hai. Guard yahin ke
     * liye hai: kisi ne `uploads-2` maanga nahi tha, aur wo chup-chaap live nahi hona chahiye.
     */
    const { rows } = await runImport({
      A: doc([p('Package Name'), p('Trip One'), p('Package URL'), p('uploads')].join('')),
    })

    /** D-116: jaanch save se **pehle** (`previewEntryAddress()`) — `uploads-2` kabhi banta hi nahi */
    expect(rows[0].status).toBe('failed')
    expect(rows[0].issues.some((i) => /already uses the address/i.test(i.message))).toBe(true)
    expect(await Entry.countDocuments()).toBe(0)
  })
})

describe('dobara chalana', () => {
  it('duplicate package nahi banta — wahi update hota hai', async () => {
    const docs = { A: goodDoc('Andaman Escape', 'andaman-escape') }

    await runImport(docs)
    expect(await Entry.countDocuments()).toBe(1)

    /** ⚠️ Doosra run 'existing' me — 'new' mode ab purane package ko jaan-boojh kar rokta hai. */
    const second = await runImport(docs, undefined, 'existing')

    /** Yahi wo bug hai jisse bachna tha: har run pe naya `-2` wala page ban jaana */
    expect(await Entry.countDocuments()).toBe(1)
    expect(second.rows[0].action).toBe('updated')
    expect(second.rows[0].status).toBe('published')
  })

  it('pehle se published page dobara publish nahi hota', async () => {
    const docs = { A: goodDoc('Andaman Escape', 'andaman-escape') }

    const first = await runImport(docs)
    const before = await Entry.findById(first.rows[0].entryId).lean()

    await runImport(docs, undefined, 'existing')
    const after = await Entry.findById(first.rows[0].entryId).lean()

    /**
     * Dobara publish karne se `publishAt` aaj pe reset ho jaata — yaani bees package ki
     * "Published on" har import pe badal jaati.
     */
    expect(after.publishAt.getTime()).toBe(before.publishAt.getTime())
  })

  /**
   * D-116: Failed row me kuch bana hi nahi, to agla run **wahi mode** (New) me chalta hai — Past
   * imports ka `Retry again` isi liye pichhla mode bhi bharta hai.
   */
  it('Failed row theek hone pe agla run (New) use publish kar deta hai', async () => {
    const first = await runImport({ B: typoDoc })
    expect(first.rows[0].status).toBe('failed')

    /** Client master list me naam theek karta hai — spelling ab milti hai */
    await Taxonomy.create({ type: 'destination', name: 'Havelok', slug: 'havelok' })

    const second = await runImport({ B: typoDoc })

    expect(second.rows[0].status).toBe('published')
    expect(second.rows[0].action).toBe('created')
    expect(await Entry.countDocuments()).toBe(1)
  })

  it('live page naye blocker ki wajah se neeche nahi aata', async () => {
    const good = { A: goodDoc('Andaman Escape', 'andaman-escape') }
    const first = await runImport(good)

    /** Ab hotel hata do — agle run me wo blocker banega */
    await Hotel.deleteMany({})

    const second = await runImport(good, undefined, 'existing')
    const entry = await Entry.findById(first.rows[0].entryId).lean()

    /** Ek hotel ke naam ki galti bees live page utaar de — wo aapdaa hoti */
    expect(entry.status).toBe(ENTRY_STATUS.PUBLISHED)
    expect(second.rows[0].issues.some((issue) => issue.level === 'blocker')).toBe(true)
  })
})

/**
 * New / Existing mode — client ka faisla (4 Sep).
 *
 * ⚠️ Ye ek **elaan** hai, filter nahi. Bina iske ek purana Package URL galti se nayi sheet me
 * reh jaaye to wo ek **live package ko chup-chaap overwrite** kar deta — technically ek sahi
 * update, par client ke iraade ke bilkul ulta.
 */
describe('new / existing mode', () => {
  const docs = { A: goodDoc('Mode Test', 'mode-test') }

  async function runWithMode(mode, fixtures = docs) {
    const deps = { fetchImpl: fakeFetch(fixtures, csvOf(Object.keys(fixtures))) }
    const { startImport } = await import('../modules/bulk-imports/service.js')
    const user = await User.findOne({ email: 'admin@test.com' }).lean()
    const run = await startImport(
      { sheetUrl: SHEET_URL, mode },
      { user, permissions: [] },
      DEFAULT_SITE_ID,
      deps,
    )

    await drain(deps)

    return ImportRun.findById(run.id).lean()
  }

  it('default new hai — mode bheje bina bhi', async () => {
    const run = await runImport(docs)

    expect(run.mode).toBe('new')
    expect(run.rows[0].action).toBe('created')
  })

  it('new mode me purana package rukta hai — live content overwrite nahi hota', async () => {
    await runWithMode('new')
    const before = await Entry.findOne({ slug: 'mode-test' }).lean()

    const second = await runWithMode('new')

    expect(second.rows[0].status).toBe('failed')
    expect(second.rows[0].error).toContain('already exists')
    /** Sabse zaroori: purana package chhua tak nahi gaya */
    const after = await Entry.findOne({ slug: 'mode-test' }).lean()
    expect(after.version).toBe(before.version)
  })

  it('existing mode me naya doc rukta hai', async () => {
    const run = await runWithMode('existing')

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].error).toContain('exists yet')
    expect(await Entry.countDocuments({ type: 'package' })).toBe(0)
  })

  it('existing mode purane ko update karta hai', async () => {
    await runWithMode('new')
    const run = await runWithMode('existing')

    expect(run.rows[0].status).toBe('published')
    expect(run.rows[0].action).toBe('updated')
    expect(await Entry.countDocuments({ type: 'package' })).toBe(1)
  })

  it('mile-jule sheet me sirf galat row rukti hai, baaki chalti hain', async () => {
    // Client ka scenario 4: 1 purana + 1 naya, mode = new
    await runWithMode('new', { A: goodDoc('Mode Test', 'mode-test') })

    const mixed = await runWithMode('new', {
      A: goodDoc('Mode Test', 'mode-test'),
      B: goodDoc('Brand New', 'brand-new'),
    })

    const byDoc = Object.fromEntries(mixed.rows.map((row) => [row.docId, row]))

    expect(byDoc.A.status).toBe('failed')
    expect(byDoc.B.status).toBe('published')
  })

  it('counts me created aur updated alag alag aate hain', async () => {
    await runWithMode('new')
    const run = await runWithMode('existing')

    const { getImportRun } = await import('../modules/bulk-imports/service.js')
    const api = await getImportRun(String(run._id))

    expect(api.counts.created).toBe(0)
    expect(api.counts.updated).toBe(1)
  })
})

describe('Past imports — sirf 20 bachte hain (client, 4 Sep)', () => {
  it('21 va run banne pe sabse purana hat jaata hai', async () => {
    const docs = { A: goodDoc('Prune Test', 'prune-test') }

    /**
     * 20 run seedha DB me — inhe chalane ki zaroorat nahi, sirf ginti chahiye. Har run ko
     * `done` rakhna zaroori hai: `pruneOldRuns()` chalte hue run ko jaan-boojh kar nahi hataata.
     */
    const user = await User.findOne({ email: 'admin@test.com' }).lean()
    for (let i = 0; i < 20; i += 1) {
      await ImportRun.create({
        sheetUrl: `https://docs.google.com/spreadsheets/d/OLD${i}/edit`,
        sheetId: `OLD${i}`,
        startedBy: user._id,
        status: 'done',
        rows: [],
        createdAt: new Date(2020, 0, i + 1),
      })
    }

    expect(await ImportRun.countDocuments()).toBe(20)

    const oldest = await ImportRun.findOne({ sheetId: 'OLD0' }).lean()
    await runImport(docs)

    expect(await ImportRun.countDocuments()).toBe(20)
    /** Sabse purana gaya, naya aaya */
    expect(await ImportRun.findById(oldest._id).lean()).toBeNull()
  })

  it('chalta hua run kabhi nahi hataya jaata', async () => {
    const user = await User.findOne({ email: 'admin@test.com' }).lean()

    /** Ek atka hua run, sabse purani tareekh pe — safai ise chhod deni chahiye */
    const running = await ImportRun.create({
      sheetUrl: 'https://docs.google.com/spreadsheets/d/BUSY/edit',
      sheetId: 'BUSY',
      startedBy: user._id,
      status: 'running',
      rows: [],
      createdAt: new Date(2019, 0, 1),
    })

    for (let i = 0; i < 20; i += 1) {
      await ImportRun.create({
        sheetUrl: `https://docs.google.com/spreadsheets/d/D${i}/edit`,
        sheetId: `D${i}`,
        startedBy: user._id,
        status: 'done',
        rows: [],
        createdAt: new Date(2020, 0, i + 1),
      })
    }

    await runImport({ A: goodDoc('Keep Running', 'keep-running') })

    // Worker ke haath se uska record beech me gayab nahi hona chahiye
    expect(await ImportRun.findById(running._id).lean()).toBeTruthy()
  })
})

describe('Past imports — type ka filter, aur 20 har type ke (client, 11 Sep)', () => {
  /** `done` run seedha DB me — safai sirf khatam ho chuke run ginti hai. */
  async function seedRuns(target, count, prefix) {
    const user = await User.findOne({ email: 'admin@test.com' }).lean()

    for (let i = 0; i < count; i += 1) {
      await ImportRun.create({
        sheetUrl: `https://docs.google.com/spreadsheets/d/${prefix}${i}/edit`,
        sheetId: `${prefix}${i}`,
        target,
        startedBy: user._id,
        status: 'done',
        rows: [],
        createdAt: new Date(2020, 0, i + 1),
      })
    }
  }

  /**
   * 10 Sep se pehle ka run — `target` field **hai hi nahi**. `collection.insertOne` isliye ki
   * Mongoose ka default use chupke se `package` bhar deta, aur test wo haalat bana hi nahi paata
   * jo asli DB me padi hai.
   */
  async function seedLegacyRun(sheetId) {
    const user = await User.findOne({ email: 'admin@test.com' }).lean()
    const now = new Date(2019, 0, 1)

    await ImportRun.collection.insertOne({
      siteId: DEFAULT_SITE_ID,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      sheetId,
      mode: 'new',
      startedBy: user._id,
      status: 'done',
      warnings: [],
      rows: [],
      createdAt: now,
      updatedAt: now,
    })
  }

  it('?target=post pe sirf post ke run aate hain', async () => {
    await seedRuns('package', 2, 'PKG')
    await seedRuns('post', 3, 'POST')

    const res = await authed('get', '/api/bulk-imports?target=post', adminJar).expect(200)

    expect(res.body.data.runs).toHaveLength(3)
    expect(res.body.data.runs.every((run) => run.target === 'post')).toBe(true)
    expect(res.body.meta.total).toBe(3)
  })

  it('?target=package me bina target wale purane run bhi aate hain', async () => {
    await seedRuns('package', 2, 'PKG')
    await seedRuns('post', 1, 'POST')
    await seedLegacyRun('LEGACY')

    const res = await authed('get', '/api/bulk-imports?target=package', adminJar).expect(200)
    /** API `sheetId` nahi bhejti — `sheetUrl` me wahi id hai. */
    const urls = res.body.data.runs.map((run) => run.sheetUrl).join(' ')

    expect(res.body.data.runs).toHaveLength(3)
    expect(urls).toContain('/LEGACY/')
    expect(urls).not.toContain('/POST0/')
    /** Purana run bhi `package` hi dikhta hai — `toApi()` ka fallback. */
    expect(res.body.data.runs.every((run) => run.target === 'package')).toBe(true)
  })

  it('bina target ke dono type saath — pehle jaisa', async () => {
    await seedRuns('package', 2, 'PKG')
    await seedRuns('post', 2, 'POST')

    const res = await authed('get', '/api/bulk-imports', adminJar).expect(200)

    expect(res.body.data.runs).toHaveLength(4)
  })

  it('All me teeno type ke 20-20 jud kar 60 — pages me, koi gayab nahi (client, 14 Sep)', async () => {
    // Pehle admin sirf page 1 maangta tha, to All me sabse naye 20 hi dikhte the jabki DB me har
    // type ke apne 20 the. Ab total 60 aata hai aur teesre page pe aakhri 20
    await seedRuns('package', 20, 'PKG')
    await seedRuns('post', 20, 'POST')
    await seedRuns('page', 20, 'PAGE')

    const first = await authed('get', '/api/bulk-imports?page=1&limit=20', adminJar).expect(200)
    const third = await authed('get', '/api/bulk-imports?page=3&limit=20', adminJar).expect(200)

    expect(first.body.meta.total).toBe(60)
    expect(first.body.data.runs).toHaveLength(20)
    expect(third.body.data.runs).toHaveLength(20)

    const pageTab = await authed('get', '/api/bulk-imports?target=page', adminJar).expect(200)
    expect(pageTab.body.meta.total).toBe(20)
  })

  it('anjaan target thukraya jaata hai', async () => {
    const res = await authed('get', '/api/bulk-imports?target=hotel', adminJar).expect(400)

    expect(res.body.error.code).toBe('VALIDATION_FAILED')
  })

  it('blog ke import package ka itihaas nahi mitate', async () => {
    /**
     * ⚠️ Yahi asli bug tha — ginti dono type ki milaa kar hoti thi, to 20 package run ke upar ek
     * post import chalte hi sabse purana **package** run chala jaata.
     */
    await seedRuns('package', 20, 'PKG')

    await runImport({ A: goodDoc('Post Run', 'post-run') }, ['A'], undefined, 'post')

    expect(await ImportRun.countDocuments({ target: 'package' })).toBe(20)
    expect(await ImportRun.countDocuments({ target: 'post' })).toBe(1)
  })

  it('21 va post run sabse purana post run hatata hai — package waise ke waise', async () => {
    await seedRuns('post', 20, 'POST')
    await seedRuns('package', 5, 'PKG')

    await runImport({ A: goodDoc('Post Run', 'post-run') }, ['A'], undefined, 'post')

    expect(await ImportRun.countDocuments({ target: 'post' })).toBe(20)
    expect(await ImportRun.findOne({ sheetId: 'POST0' }).lean()).toBeNull()
    expect(await ImportRun.countDocuments({ target: 'package' })).toBe(5)
  })

  it('bina target wale purane run package ki ginti me aate hain', async () => {
    /** Warna wo kabhi gine hi nahi jaate aur hamesha pade rehte. */
    await seedLegacyRun('LEGACY')
    await seedRuns('package', 19, 'PKG')

    await runImport({ A: goodDoc('Pkg Run', 'pkg-run') })

    const total = await ImportRun.countDocuments({ target: { $in: ['package', null] } })
    expect(total).toBe(20)
    expect(await ImportRun.findOne({ sheetId: 'LEGACY' }).lean()).toBeNull()
  })
})

describe('Past imports me fail hone ki wajah (client, 4 Sep)', () => {
  /**
   * List payload rows nahi bhejti (20 run x 20 row ka payload bina wajah bhaari hai), par
   * Failed ke saamne sirf ek number rehne se client ko har run kholna padta tha. Isliye sirf
   * wajah jaati hai — alag-alag, aur zyada se zyada paanch.
   */
  it('list me failedReasons aati hain, par rows nahi', async () => {
    await runImport({ A: goodDoc('Reason Test', 'reason-test') })
    await runImport({ A: goodDoc('Reason Test', 'reason-test') })

    const res = await authed('get', '/api/bulk-imports', adminJar)
    const latest = res.body.data.runs[0]

    expect(latest.rows).toEqual([])
    expect(latest.counts.failed).toBe(1)
    expect(latest.failedReasons).toHaveLength(1)
    expect(latest.failedReasons[0]).toContain('already exists')
  })

  it('ek hi wajah se kai row fail hon to wo ek hi baar aati hai', async () => {
    // Client ko das baar wahi vaakya padhna nahi chahiye
    const docs = {
      A: goodDoc('Dup One', 'dup-one'),
      B: goodDoc('Dup Two', 'dup-two'),
    }

    await runImport(docs)
    await runImport(docs)

    const res = await authed('get', '/api/bulk-imports', adminJar)
    const latest = res.body.data.runs[0]

    expect(latest.counts.failed).toBe(2)
    /** Dono ka message alag hai (alag slug), to do — par dedupe chalti hai */
    expect(new Set(latest.failedReasons).size).toBe(latest.failedReasons.length)
  })

  it('kuch fail na ho to list khaali rehti hai', async () => {
    await runImport({ A: goodDoc('All Fine', 'all-fine') })

    const res = await authed('get', '/api/bulk-imports', adminJar)

    expect(res.body.data.runs[0].failedReasons).toEqual([])
  })
})

/**
 * Blog post ka import — spec 008.
 *
 * ⚠️ Yahan wahi `runImport()` chal raha hai jo package ke tests chalate hain, sirf `target`
 * alag hai. **Yahi is slice ka poora point tha:** sheet padhna, fetch, claim loop, New/Existing
 * ka assertion, publish ke do niyam aur Past imports — sab ek hi code se aate hain. Do module
 * banane ka matlab hota ki kal in me se koi ek fix ek jagah lagta aur doosri jagah nahi.
 */
describe('blog post ka import (spec 008)', () => {
  const postDoc = (rows) => doc(rows.map(p).join(''))

  const FULL_ROWS = [
    'Meta Title',
    'Andaman ferry booking 2026',
    'Meta Description',
    'Timings, prices and how to book.',
    'Blog title',
    'Andaman ferry booking',
    'Blog URL',
    'andaman-ferry-booking',
    'Excerpt',
    'Three operators, two jetties, one rule.',
    'Category',
    'Trip planning',
    'Content',
    'Ferries are the only practical link between the islands.',
    'Faq:',
    'Heading',
    'Common questions',
    'Question',
    'Can I book after I land?',
    'answer',
    'Only the government ferry, and only if seats are left.',
  ]
  const FULL = postDoc(FULL_ROWS)

  it('post ban kar publish ho jaata hai', async () => {
    const run = await runImport({ d1: FULL }, ['d1'], undefined, 'post')

    expect(run.target).toBe('post')
    expect(run.rows[0].status).toBe('published')
    expect(run.rows[0].issues).toEqual([])

    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.type).toBe('post')
    expect(entry.title).toBe('Andaman ferry booking')
    expect(entry.slug).toBe('andaman-ferry-booking')
    expect(entry.status).toBe(ENTRY_STATUS.PUBLISHED)
  })

  describe('Blog settings ke hisaab se URL aur parent (D-92 §13, client 11 Sep)', () => {
    /**
     * Client: _"bulk upload post current blog setting check kare so that correct Post URLs
     * generate"_. URL pehle se sahi tha (`createEntry()` `urlPattern` se path banata hai); parent
     * nahi — Bulk Upload ka har post bina parent ke bana, yaani breadcrumb setting se alag.
     */
    const makeListing = () =>
      Entry.create({
        siteId: DEFAULT_SITE_ID,
        locale: 'en',
        type: 'blogPage',
        title: 'Andaman travel guide',
        slug: 'blog',
        path: '/blog',
        status: 'published',
        publishAt: new Date(),
        content: { version: 1, blocks: [{ id: 'pl1', type: 'postList', props: {} }] },
      })

    /** ⚠️ Is file ka `beforeEach` Settings saaf nahi karta — mode yahin wapas, warna agle test me leak. */
    afterEach(async () => {
      await Settings.deleteMany({})
    })

    it('/blog/… mode — URL /blog/slug, parent blog page', async () => {
      const listing = await makeListing()

      const run = await runImport({ d1: FULL }, ['d1'], undefined, 'post')
      const entry = await Entry.findById(run.rows[0].entryId).lean()

      expect(entry.path).toBe('/blog/andaman-ferry-booking')
      expect(entry.parentId).toBe(String(listing._id))
    })

    it('/… mode — URL /slug, koi parent nahi', async () => {
      await makeListing()
      await updateSettings({ blogSettings: { postUrlMode: 'root' } })

      const run = await runImport({ d1: FULL }, ['d1'], undefined, 'post')
      const entry = await Entry.findById(run.rows[0].entryId).lean()

      expect(entry.path).toBe('/andaman-ferry-booking')
      expect(entry.parentId).toBeNull()
      /** Nateeje ki screen pe bhi wahi URL — client wahi link kholta hai. */
      expect(run.rows[0].path).toBe('/andaman-ferry-booking')
    })
  })

  it('Blog heading ab kahin nahi jaata — bhara ho to note, publish nahi rukta (D-93)', async () => {
    /**
     * Client, 11 Sep: _"heading will be title now"_. Purane doc me `Blog heading` bhara ho sakta
     * hai — wo `fields.heading` me nahi jaata, `Content` me bhi nahi ghusta, aur client ko ek
     * note milta hai. Chup-chaap girna D-86 wala "kuch na hona" hota.
     */
    const withHeading = postDoc([
      ...FULL_ROWS.slice(0, 8),
      'Blog heading',
      'Everything you need before you sail',
      ...FULL_ROWS.slice(8),
    ])

    const run = await runImport({ d1: withHeading }, ['d1'], undefined, 'post')
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(run.rows[0].status).toBe('published')
    expect(run.rows[0].issues.map((issue) => issue.label)).toContain('Blog heading')
    expect(entry.title).toBe('Andaman ferry booking')
    expect(entry.fields?.heading).toBeUndefined()
    expect(JSON.stringify(entry.content)).not.toContain('Everything you need before you sail')
    expect(entry.excerpt).toMatch(/^Three operators/)
    expect(entry.seo.title).toBe('Andaman ferry booking 2026')
  })

  it('Category me comma se kai — sab judti hain, usi kram me (D-93)', async () => {
    await Taxonomy.create({ type: 'category', name: 'Ferries', slug: 'ferries' })

    const rows = [...FULL_ROWS]
    rows[rows.indexOf('Trip planning')] = 'Trip planning, Ferries'

    const run = await runImport({ d1: postDoc(rows) }, ['d1'], undefined, 'post')
    const entry = await Entry.findById(run.rows[0].entryId).lean()
    const names = await Taxonomy.find({ _id: { $in: entry.taxonomies.categories } }).lean()
    const byId = new Map(names.map((t) => [String(t._id), t.name]))

    expect(entry.taxonomies.categories.map((id) => byId.get(String(id)))).toEqual([
      'Trip planning',
      'Ferries',
    ])
  })

  it('category naam se judti hai', async () => {
    const run = await runImport({ d1: FULL }, ['d1'], undefined, 'post')
    const entry = await Entry.findById(run.rows[0].entryId).lean()
    const category = await Taxonomy.findOne({ type: 'category' }).lean()

    expect(entry.taxonomies.categories.map(String)).toEqual([String(category._id)])
  })

  it('content aur FAQs do block bante hain', async () => {
    const run = await runImport({ d1: FULL }, ['d1'], undefined, 'post')
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.content.blocks.map((b) => b.type)).toEqual(['richText', 'faqs'])
    expect(entry.content.blocks[1].props.heading).toBe('Common questions')
    expect(entry.content.blocks[1].props.items).toHaveLength(1)
  })

  it('category na mile to row Failed — post banta hi nahi (D-116)', async () => {
    const bad = postDoc([
      'Blog title',
      'Ferry guide',
      'Blog URL',
      'ferry-guide',
      'Category',
      'Trip Planing',
      'Content',
      'Body text here.',
    ])

    const run = await runImport({ d1: bad }, ['d1'], undefined, 'post')

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].issues[0].value).toBe('Trip Planing')
    expect(await Entry.countDocuments({ type: 'post' })).toBe(0)
  })

  it('Blog title na ho to post ban hi nahi sakta — aur message post wala hota hai', async () => {
    const run = await runImport(
      { d1: postDoc(['Meta Title', 'Just a title']) },
      ['d1'],
      undefined,
      'post',
    )

    expect(run.rows[0].status).toBe('failed')
    /** ⚠️ "Package Name" wala message blog doc pe padh kar client galat khaana dhoondhta. */
    expect(run.rows[0].error).toMatch(/Blog title/)
  })

  it('dobara chalane pe duplicate nahi banta — wahi post update hota hai', async () => {
    await runImport({ d1: FULL }, ['d1'], undefined, 'post')
    const again = await runImport({ d1: FULL }, ['d1'], 'existing', 'post')

    expect(again.rows[0].action).toBe('updated')
    expect(await Entry.countDocuments({ type: 'post', deletedAt: null })).toBe(1)
  })

  it('mode ka assertion post pe bhi lagta hai, aur uska message post wala hai', async () => {
    await runImport({ d1: FULL }, ['d1'], undefined, 'post')
    const again = await runImport({ d1: FULL }, ['d1'], 'new', 'post')

    expect(again.rows[0].status).toBe('failed')
    expect(again.rows[0].error).toMatch(/A post with the URL/)
    expect(again.rows[0].error).toMatch(/New posts/)
  })

  it('purane run me target na ho to wo package hi mana jaata hai', async () => {
    /**
     * ⚠️ Ye field 10 Sep ko juda; usse pehle bane run me hai hi nahi. Un par `package` maanna
     * sach hai, andaza nahi — us waqt import package ka hi hota tha. Isi wajah se koi migration
     * nahi lagi.
     */
    const run = await runImport({ d1: FULL }, ['d1'], undefined, 'post')

    await ImportRun.updateOne({ _id: run._id }, { $unset: { target: '' } })

    const { getImportRun } = await import('../modules/bulk-imports/service.js')

    expect((await getImportRun(String(run._id))).target).toBe('package')
  })
})

describe('page ka import (D-95, client 14 Sep)', () => {
  /**
   * ⚠️ **Asli Google Doc ka export** — wahi fixture jo `page-doc.test.js` padhta hai. Banner ka URL
   * client ki local media ka hai; test me wo id hai hi nahi, isliye har test apni media bana kar
   * id badal deta hai.
   */
  const TEMPLATE = readFileSync(
    fileURLToPath(
      new URL(
        '../../../../packages/shared/src/import/__fixtures__/page-template.html',
        import.meta.url,
      ),
    ),
    'utf8',
  )
  const TEMPLATE_MEDIA_ID = '6a982cedb298ea0c64eeab4f'

  let pageDoc
  let pagesSidebar
  let parent

  beforeEach(async () => {
    const uploader = await User.findOne({ email: 'admin@test.com' }).lean()
    const media = await Media.create({
      filename: 'banner.webp',
      mime: 'image/webp',
      size: 1234,
      width: 1600,
      height: 900,
      uploadedBy: uploader._id,
      variants: [],
    })

    pageDoc = TEMPLATE.replaceAll(TEMPLATE_MEDIA_ID, String(media._id))

    await Sidebar.deleteMany({})
    pagesSidebar = await Sidebar.create({ name: 'Pages Sidebar', widgets: [] })

    parent = await Entry.create({
      siteId: DEFAULT_SITE_ID,
      locale: 'en',
      type: 'page',
      title: 'Andaman Beaches',
      slug: 'andaman-beaches',
      path: '/andaman-beaches',
      status: ENTRY_STATUS.PUBLISHED,
      content: { version: 1, blocks: [] },
    })
  })

  it('page parent ke neeche ban kar publish hota hai — sirf On this page ka note', async () => {
    const run = await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')

    expect(run.target).toBe('page')
    // Client ke doc me `On this page: Yes` hai — wo setting ab Pages settings me hai (D-95 §12)
    expect(run.rows[0].issues).toEqual([
      expect.objectContaining({ level: 'note', label: 'On this page' }),
    ])
    expect(run.rows[0].status).toBe('published')

    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.type).toBe('page')
    expect(entry.title).toBe('Bharatpur Beach')
    expect(String(entry.parentId)).toBe(String(parent._id))
    expect(entry.path).toBe('/andaman-beaches/bharatpur-beach')
    expect(entry.featuredImageId).toBeTruthy()
    expect(entry.seo.title).toMatch(/^Bharatpur Beach, Neil Island/)
  })

  it('doc ke page wale khaane fields me aate hain', async () => {
    const run = await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')
    const { fields, content } = await Entry.findById(run.rows[0].entryId).lean()

    expect(fields.heroButton).toEqual({ label: 'Plan a trip here', url: '#enquiry' })
    expect(fields.subheading).toContain('the one thing that decides')
    expect(fields.statRail.map((s) => [s.value, s.suffix, s.label, s.highlight])).toEqual([
      ['Free', 'entry', 'Ticket · qualifier', true],
      ['40 min', '', 'From the jetty', false],
      ['Oct – May', '', 'Best season', false],
      ['2–3 hrs', '', 'Time needed', false],
    ])

    expect(content.blocks.map((b) => b.type)).toEqual(['richText', 'faqs'])
    expect(content.blocks[1].props.heading).toBe('Frequently asked questions')
    expect(content.blocks[1].props.items).toHaveLength(3)
  })

  it('naya page Pages Sidebar ke saath right pe banta hai (client, 14 Sep)', async () => {
    const run = await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')
    const { fields } = await Entry.findById(run.rows[0].entryId).lean()

    expect(fields.sidebar).toBe('right')
    expect(fields.sidebarId).toBe(String(pagesSidebar._id))
  })

  it('Pages Sidebar na ho to page bina sidebar ke — note ke saath, publish nahi rukta', async () => {
    await Sidebar.deleteMany({})

    const run = await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')
    const { fields } = await Entry.findById(run.rows[0].entryId).lean()

    expect(fields.sidebar).toBeUndefined()
    expect(run.rows[0].status).toBe('published')
    expect(run.rows[0].issues).toEqual([
      expect.objectContaining({ level: 'note', label: 'On this page' }),
      expect.objectContaining({ level: 'note', label: 'Sidebar' }),
    ])
  })

  it('existing me admin ki chuni sidebar bachti hai — doc ki On this page line kuch nahi likhti', async () => {
    // `updateEntry()` `fields` poora badalta hai. Bina `prepare` ke re-import sidebar mita deta
    const first = await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')
    const id = first.rows[0].entryId

    await Entry.updateOne({ _id: id }, { $set: { 'fields.sidebar': 'left' } })

    const again = await runImport({ P1: pageDoc }, ['P1'], 'existing', 'page')
    const { fields } = await Entry.findById(id).lean()

    expect(again.rows[0].action).toBe('updated')
    expect(fields.sidebar).toBe('left')
    expect(fields.heroButton.label).toBe('Plan a trip here')
    // `On this page` 14 Sep shaam se Pages settings me hai — doc se page pe kuch nahi jaata
    expect(fields).not.toHaveProperty('showToc')
  })

  it('doc me On this page na ho to koi note nahi', async () => {
    // ⚠️ Poora paragraph hatao — Google me `On this page: ` aur `Yes` do alag `<span>` me hain, to
    // `On this page:\s*Yes` jaisa regex kuch pakadta hi nahi aur test chup-chaap doc waisa hi chalata
    const noToc = pageDoc.replace(
      /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*On this page(?:(?!<\/p>)[\s\S])*<\/p>/,
      '',
    )
    expect(noToc).not.toContain('On this page')

    const run = await runImport({ P1: noToc }, ['P1'], undefined, 'page')

    expect(run.rows[0].issues).toEqual([])
    expect(run.rows[0].status).toBe('published')
  })

  it('content ki image Media me utarti hai aur Caption ke saath rehti hai', async () => {
    const run = await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')
    const { content } = await Entry.findById(run.rows[0].entryId).lean()
    const html = content.blocks[0].props.html

    expect(html).not.toContain('data:')
    expect(html).toMatch(/<img[^>]+src="\/uploads\//)
    expect(html).toContain('Caption: The coral shelf sits close to the surface')
  })

  it('Parent page na mile to row Failed — page root pe nahi banta (D-116)', async () => {
    const run = await runImport(
      { P1: pageDoc.replace('Andaman Beaches', 'Andaman Beeches') },
      ['P1'],
      undefined,
      'page',
    )

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].issues.filter((issue) => issue.level === 'blocker')).toEqual([
      expect.objectContaining({ level: 'blocker', label: 'Parent page' }),
    ])
    expect(run.rows[0].entryId).toBeNull()
  })

  it('new mode me wahi doc dobara chalane pe saaf rukta hai', async () => {
    await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')
    const again = await runImport({ P1: pageDoc }, ['P1'], 'new', 'page')

    expect(again.rows[0].status).toBe('failed')
    expect(again.rows[0].error).toMatch(/choose "Existing pages"/)
    expect(await Entry.countDocuments({ type: 'page' })).toBe(2)
  })

  it('Stat Rail doc me na ho to rail khaali — optional', async () => {
    const bare = doc(
      [
        p('Page title'),
        p('Saada Page'),
        p('Page URL'),
        p('saada-page'),
        p('Content'),
        p('Hello.'),
      ].join(''),
    )

    const run = await runImport({ P2: bare }, ['P2'], undefined, 'page')
    const { fields, parentId } = await Entry.findById(run.rows[0].entryId).lean()

    expect(fields.statRail).toEqual([])
    expect(parentId ?? null).toBeNull()
    expect(run.rows[0].status).toBe('published')
  })

  it('Past imports me ?target=page sirf page ke run', async () => {
    await runImport({ P1: pageDoc }, ['P1'], undefined, 'page')
    await runImport({ d1: doc([p('Blog title'), p('X')].join('')) }, ['d1'], undefined, 'post')

    const res = await authed('get', '/api/bulk-imports?target=page', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data.runs.map((r) => r.target)).toEqual(['page'])
  })
})

/**
 * SEO ka bulk upload (D-107, client 21 Sep).
 *
 * ⚠️ Ye target baaki teen se **alag kism ka** hai, aur yahi teen baatein test bhi karti hain:
 * koi page banta nahi, sheet me doc ke link nahi hote, aur ek hi run me har type ke page aate
 * hain.
 */
describe('SEO ka bulk upload (D-107)', () => {
  /** Sheet me ab doc ke link nahi — data row me hi hota hai. */
  const seoCsv = (rows) => ['Page URL,Type,SEO Title,Meta Description', ...rows].join('\n')

  async function runSeoImport(csv) {
    const deps = { fetchImpl: fakeFetch({}, csv) }
    const { startImport } = await import('../modules/bulk-imports/service.js')
    const user = await User.findOne({ email: 'admin@test.com' }).lean()

    const run = await startImport(
      { sheetUrl: SHEET_URL, target: 'seo' },
      { user, permissions: [] },
      DEFAULT_SITE_ID,
      deps,
    )

    await drain(deps)

    return ImportRun.findById(run.id).lean()
  }

  const makeEntry = (over = {}) =>
    Entry.create({
      siteId: DEFAULT_SITE_ID,
      locale: 'en',
      type: 'page',
      title: 'About us',
      slug: 'about-us',
      path: '/about-us',
      status: ENTRY_STATUS.PUBLISHED,
      content: { version: 1, blocks: [] },
      ...over,
    })

  it('maujooda page ka SEO badalta hai — page banta nahi', async () => {
    const page = await makeEntry()
    const before = await Entry.countDocuments({})

    const run = await runSeoImport(seoCsv(['/about-us,Page,New title,New description']))

    expect(run.target).toBe('seo')
    expect(run.rows[0].status).toBe('published')
    expect(run.rows[0].action).toBe('updated')
    expect(await Entry.countDocuments({})).toBe(before)

    const after = await Entry.findById(page._id).lean()

    expect(after.seo.title).toBe('New title')
    expect(after.seo.description).toBe('New description')
  })

  /**
   * ⚠️ Sabse zaroori test — `updateEntry()` ka `$set` poora `seo` replace karta hai, isliye
   * bina merge ke `canonical`/`noindex` chup-chaap udd jaate.
   */
  it('canonical aur noindex bache rehte hain', async () => {
    const page = await makeEntry({
      seo: { title: 'Old', canonical: 'https://site.com/x', noindex: true },
    })

    await runSeoImport(seoCsv(['/about-us,Page,New title,']))

    const after = await Entry.findById(page._id).lean()

    expect(after.seo).toMatchObject({
      title: 'New title',
      canonical: 'https://site.com/x',
      noindex: true,
    })
  })

  it('khaali cell us khaane ko chhoota hi nahi', async () => {
    const page = await makeEntry({ seo: { title: 'Old title', description: 'Old description' } })

    await runSeoImport(seoCsv(['/about-us,Page,,Only the description']))

    const after = await Entry.findById(page._id).lean()

    expect(after.seo.title).toBe('Old title')
    expect(after.seo.description).toBe('Only the description')
  })

  it('dono cell khaali ho to row Skipped — DB chhua hi nahi jaata', async () => {
    const page = await makeEntry({ seo: { title: 'Old title' } })

    const run = await runSeoImport(seoCsv(['/about-us,Page,,']))

    expect(run.rows[0].status).toBe('skipped')
    expect((await Entry.findById(page._id).lean()).version).toBe(page.version)
  })

  /** D-86 wali jad: bade akshar, poora URL aur aakhir ka slash — teenon wahi page hain. */
  it('bade akshar wala poora URL bhi wahi page dhoondhta hai', async () => {
    const page = await makeEntry()

    const run = await runSeoImport(seoCsv(['https://site.example/About-Us/,Page,Matched,']))

    expect(run.rows[0].status).toBe('published')
    expect((await Entry.findById(page._id).lean()).seo.title).toBe('Matched')
  })

  it('URL na mile to row Failed — kuch banta nahi', async () => {
    const before = await Entry.countDocuments({})

    const run = await runSeoImport(seoCsv(['/kahin-nahi,Page,T,D']))

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].error).toMatch(/No page with the address/)
    expect(await Entry.countDocuments({})).toBe(before)
  })

  it('Trash wala page saaf message deta hai', async () => {
    await makeEntry({ deletedAt: new Date() })

    const run = await runSeoImport(seoCsv(['/about-us,Page,T,D']))

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].error).toMatch(/is in the Trash/)
  })

  it('ek hi page do baar likha ho to doosri row Skipped', async () => {
    await makeEntry()

    const run = await runSeoImport(seoCsv(['/about-us,Page,First,', '/about-us,Page,Second,']))

    expect(run.rows.map((r) => r.status)).toEqual(['published', 'skipped'])
    expect(run.rows[1].error).toBe('This page is listed twice')
    expect((await Entry.findOne({ path: '/about-us' }).lean()).seo.title).toBe('First')
  })

  it('bina URL wali row Failed hoti hai', async () => {
    const run = await runSeoImport(seoCsv([',Page,Orphan title,']))

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].error).toBe('This row has no page address')
  })

  /** D-116: bulk me sirf Published / Failed — draft page ki baat ab ek note hai. */
  it('draft page ka SEO lagta hai, row Published, aur note ki page live nahi hai', async () => {
    const page = await makeEntry({ status: ENTRY_STATUS.DRAFT })

    const run = await runSeoImport(seoCsv(['/about-us,Page,Draft title,']))

    expect(run.rows[0].status).toBe('published')
    expect(run.rows[0].issues.some((i) => /not published yet/.test(i.message))).toBe(true)
    expect((await Entry.findById(page._id).lean()).seo.title).toBe('Draft title')
  })

  it('published page dobara publish nahi hota — publishAt waisa hi rehta hai', async () => {
    const publishAt = new Date('2026-01-01T00:00:00.000Z')
    const page = await makeEntry({ publishAt })

    await runSeoImport(seoCsv(['/about-us,Page,New title,']))

    const after = await Entry.findById(page._id).lean()

    expect(after.status).toBe(ENTRY_STATUS.PUBLISHED)
    expect(after.publishAt.toISOString()).toBe(publishAt.toISOString())
  })

  it('Page URL ka column hi na ho to import shuru hi nahi hota', async () => {
    const deps = { fetchImpl: fakeFetch({}, 'SEO Title,Meta Description\nT,D') }
    const { startImport } = await import('../modules/bulk-imports/service.js')
    const user = await User.findOne({ email: 'admin@test.com' }).lean()

    await expect(
      startImport(
        { sheetUrl: SHEET_URL, target: 'seo' },
        { user, permissions: [] },
        DEFAULT_SITE_ID,
        deps,
      ),
    ).rejects.toThrow(/No "Page URL" column/)
  })

  it('har type ka page ek hi run me — package, post aur home saath', async () => {
    await makeEntry({ type: 'package', slug: 'x', path: '/packages/x', title: 'X' })
    await makeEntry({ type: 'post', slug: 'y', path: '/blog/y', title: 'Y' })
    await makeEntry({ type: 'homePage', slug: 'home', path: '/', title: 'Home' })

    const run = await runSeoImport(
      seoCsv(['/packages/x,Package,PT,', '/blog/y,Blog post,BT,', '/,Home,HT,']),
    )

    expect(run.rows.map((r) => r.status)).toEqual(['published', 'published', 'published'])
    expect((await Entry.findOne({ path: '/packages/x' }).lean()).seo.title).toBe('PT')
    expect((await Entry.findOne({ path: '/blog/y' }).lean()).seo.title).toBe('BT')
    expect((await Entry.findOne({ path: '/' }).lean()).seo.title).toBe('HT')
  })

  /**
   * ⚠️ Ek row ka girna doosri ko nahi rokta — aur ye test live check ke baad juda.
   * Baaki har SEO test me **ek hi** row thi, to "pehli chali, doosri giri" wala raasta kisi test
   * se guzarta hi nahi tha.
   */
  it('pehli row chalti hai aur doosri Failed hoti hai — doosri atakti nahi', async () => {
    await makeEntry()

    const run = await runSeoImport(seoCsv(['/about-us,Page,Good,', '/kahin-nahi-hai,Page,Bad,']))

    expect(run.rows.map((r) => r.status)).toEqual(['published', 'failed'])
  })

  it('Past imports me ?target=seo sirf SEO ke run', async () => {
    await makeEntry()
    await runSeoImport(seoCsv(['/about-us,Page,T,']))

    const res = await authed('get', '/api/bulk-imports?target=seo', adminJar).expect(200)

    expect(res.body.data.runs.map((r) => r.target)).toEqual(['seo'])
  })
})

describe('SEO ka export (D-107)', () => {
  const publish = (over) =>
    Entry.create({
      siteId: DEFAULT_SITE_ID,
      locale: 'en',
      type: 'page',
      status: ENTRY_STATUS.PUBLISHED,
      content: { version: 1, blocks: [] },
      ...over,
    })

  it('published page CSV me aate hain, draft nahi', async () => {
    await publish({
      title: 'Live page',
      slug: 'live',
      path: '/live',
      seo: { title: 'Live SEO', description: 'Live description' },
    })
    await publish({
      title: 'Draft page',
      slug: 'draft',
      path: '/draft',
      status: ENTRY_STATUS.DRAFT,
      seo: { title: 'Draft SEO' },
    })

    const res = await authed('get', '/api/bulk-imports/export/seo', adminJar).expect(200)

    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="seo-/)
    expect(res.text).toContain('"Page URL","Type","SEO Title","Meta Description"')
    expect(res.text).toContain('"/live","Page","Live SEO","Live description"')
    expect(res.text).not.toContain('/draft')
  })

  /**
   * ⚠️ Export ka header **wahi** hona chahiye jo import dhoondhta hai. Do jagah likhne ka
   * nateeja D-86 me dekha ja chuka hai, aur uska lakshan yahan "kuch na hona" hota.
   */
  it('export ka header wahi hai jo import padhta hai', async () => {
    await publish({ title: 'Round trip', slug: 'round-trip', path: '/round-trip' })

    const res = await authed('get', '/api/bulk-imports/export/seo', adminJar).expect(200)
    const { parseCsv, seoRowsFromSheet } = await import('@cms/shared')
    const { rows, warnings } = seoRowsFromSheet(parseCsv(res.text))

    expect(warnings).toEqual([])
    expect(rows).toContainEqual({ url: '/round-trip', title: '', description: '' })
  })

  it('CSV injection se bacha hua hai — formula wali value quote hoti hai', async () => {
    await publish({ title: 'Evil', slug: 'evil', path: '/evil', seo: { title: '=1+1' } })

    const res = await authed('get', '/api/bulk-imports/export/seo', adminJar).expect(200)

    expect(res.text).toContain('"\'=1+1"')
  })

  it('bina permission ke 403', async () => {
    await authed('get', '/api/bulk-imports/export/seo', editorJar).expect(403)
  })
})

/**
 * Worker ka claim aur release (22 Sep — live pe pakda gaya).
 *
 * Client ka 28-row wala SEO import **305 second** le raha tha, jabki asli kaam 2 second ka tha.
 * Wajah: ek row claim hone ke baad `processing` pe anaath chhoot gayi thi, aur use
 * `reclaimStuckRows()` ne **theek 5 minute** baad uthaya. Dono raaste yahan test hote hain.
 *
 * ⚠️ Ye bug SEO target ka nahi tha — wo **D-81 ke worker** me tha aur teeno purane import pe
 * lagta hai. SEO ne use sirf **dikhaya**, kyunki uski row 200ms ki hoti hai, to 5 minute ka
 * intezaar chhupta nahi. Doc wale import me har row khud ~3 second leti hai aur wahan ye farak
 * "thoda slow hai" jaisa lagta tha.
 */
describe('worker — row ka claim aur release (22 Sep)', () => {
  const seoCsv = (rows) => ['Page URL,SEO Title,Meta Description', ...rows].join('\n')

  const makeEntry = (over = {}) =>
    Entry.create({
      siteId: DEFAULT_SITE_ID,
      locale: 'en',
      type: 'page',
      title: 'About us',
      slug: 'about-us',
      path: '/about-us',
      status: ENTRY_STATUS.PUBLISHED,
      content: { version: 1, blocks: [] },
      ...over,
    })

  /** Run bana do par worker mat chalao — har test apna tick khud chalata hai. */
  async function queueRun(csv) {
    const deps = { fetchImpl: fakeFetch({}, csv) }
    const { startImport } = await import('../modules/bulk-imports/service.js')
    const user = await User.findOne({ email: 'admin@test.com' }).lean()

    const run = await startImport(
      { sheetUrl: SHEET_URL, target: 'seo' },
      { user, permissions: [] },
      DEFAULT_SITE_ID,
      deps,
    )

    return { runId: run.id, deps }
  }

  it('doosre worker ki pakdi hui row agli row ko nahi rokti', async () => {
    await makeEntry()
    await makeEntry({ slug: 'x', path: '/x', title: 'X' })

    const { runId, deps } = await queueRun(seoCsv(['/about-us,A,', '/x,B,']))

    /**
     * Pehli row ko "koi aur worker" pakad leta hai — theek wahi haalat jo do process saath
     * chalne pe banti hai (ya jab ek purana process abhi zinda ho).
     */
    await ImportRun.updateOne(
      { _id: runId },
      {
        $set: {
          status: 'running',
          'rows.0.status': 'processing',
          'rows.0.claimedAt': new Date(),
        },
      },
    )

    expect((await processImportQueue(deps)).processed).toBe(1)

    const run = await ImportRun.findById(runId).lean()

    /** Pehli row doosre ke paas hi rahi — hum uspe dobara kaam nahi karte. */
    expect(run.rows[0].status).toBe('processing')
    /** ⚠️ Pehle yahi row anaath reh jaati thi — tick pehli wali ko dobara chala deta tha. */
    expect(run.rows[1].status).toBe('published')
    expect((await Entry.findOne({ path: '/x' }).lean()).seo.title).toBe('B')
  })

  it('shuru hi na ho paane wali row wapas kataar me aati hai — failed nahi hoti', async () => {
    await makeEntry()

    const { runId, deps } = await queueRun(seoCsv(['/about-us,Retry me,']))

    /** Mongo ki hichki jaisi galti — row ki apni koi kharaabi nahi. */
    const brokenDeps = { fetchImpl: deps.fetchImpl }
    Object.defineProperty(brokenDeps, 'refs', {
      get() {
        throw new Error('mongo hichki')
      },
    })

    expect((await processImportQueue(brokenDeps)).processed).toBe(1)

    let run = await ImportRun.findById(runId).lean()

    expect(run.rows[0].status).toBe('pending')
    expect(run.rows[0].claimedAt).toBeNull()
    expect(run.rows[0].attempts).toBe(1)
    expect(run.status).toBe('running')

    /** Agla tick — **do second baad**, paanch minute baad nahi. */
    expect((await processImportQueue(deps)).processed).toBe(1)

    run = await ImportRun.findById(runId).lean()

    expect(run.rows[0].status).toBe('published')
    expect(run.status).toBe('done')
    expect((await Entry.findOne({ path: '/about-us' }).lean()).seo.title).toBe('Retry me')
  })

  it('baar-baar na chal paane wali row MAX_ATTEMPTS pe Failed ho jaati hai', async () => {
    await makeEntry()

    const { runId, deps } = await queueRun(seoCsv(['/about-us,Never,']))

    const brokenDeps = { fetchImpl: deps.fetchImpl }
    Object.defineProperty(brokenDeps, 'refs', {
      get() {
        throw new Error('mongo hichki')
      },
    })

    await processImportQueue(brokenDeps)
    await processImportQueue(brokenDeps)

    const run = await ImportRun.findById(runId).lean()

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].error).toMatch(/could not be started/)
    /** Run band ho jaana chahiye — warna admin me "Importing…" anant tak chalta. */
    expect(run.status).toBe('done')
  })
})

/**
 * D-116 (client, 23 Sep) — blog ki **Featured Image** aur doc ki images Media me, aur **Published Date**.
 *
 * ⚠️ Media ka naqli ghar (`mediaPort`) — asli disk pe likhne se `media.test.js` ki safai ke saath race
 * hoti (A-11). Wahi convention jo `inline-images.test.js` me hai.
 */
describe('blog — Featured Image, doc ki images, Published Date (D-116)', () => {
  const REMOTE_FEATURED = 'https://lh7-rt.googleusercontent.com/docsz/featured-ferry.jpg'
  const REMOTE_INLINE = 'https://lh7-rt.googleusercontent.com/docsz/inline-map.webp'
  const PNG = Buffer.from('89504e470d0a1a0a', 'hex')

  function mediaPort() {
    const rows = []

    return {
      rows,
      async findByFilenames(filenames) {
        return rows.find((row) => filenames.includes(row.filename)) ?? null
      },
      async create(input) {
        const id = String(rows.length + 1).padStart(24, 'a')
        const row = {
          id,
          filename: `${input.filename}.png`,
          variants: [
            {
              key: 'large',
              url: `/uploads/sites/default/media/2026/09/${id}/large.webp`,
              w: 800,
              h: 600,
            },
          ],
        }
        rows.push(row)
        return row
      },
    }
  }

  /** Image ke URL pe PNG, baaki sab asli naqli Google pe. */
  const wrapFetch =
    (inner) =>
    async (url, ...rest) =>
      url.includes('googleusercontent.com')
        ? {
            ok: true,
            status: 200,
            url,
            headers: new Map([['content-type', 'image/png']]),
            arrayBuffer: async () => PNG,
          }
        : inner(url, ...rest)

  const postDoc = (rows) => doc(rows.map(p).join(''))

  const rows = (extra = []) => [
    'Blog title',
    'Ferry guide',
    'Blog URL',
    'ferry-guide',
    'Category',
    'Trip planning',
    'Featured Image',
    REMOTE_FEATURED,
    ...extra,
    'Content',
    'Intro.',
    REMOTE_INLINE,
    'More text.',
  ]

  it('bahar ki Featured Image download hokar Media me — post pe wahi id', async () => {
    const port = mediaPort()
    const run = await runImport({ d1: postDoc(rows()) }, ['d1'], undefined, 'post', {
      mediaPort: port,
      wrapFetch,
    })

    expect(run.rows[0].status).toBe('published')

    const entry = await Entry.findById(run.rows[0].entryId).lean()
    const featured = port.rows.find((row) => entry.featuredImageId === row.id)

    expect(featured).toBeTruthy()
  })

  it('article me alag line ka image URL bhi Media me — hamara URL lagta hai', async () => {
    const port = mediaPort()
    const run = await runImport({ d1: postDoc(rows()) }, ['d1'], undefined, 'post', {
      mediaPort: port,
      wrapFetch,
    })

    const entry = await Entry.findById(run.rows[0].entryId).lean()
    const html = entry.content.blocks[0].props.html

    expect(html).toMatch(/<img[^>]+src="\/uploads\/sites\/default\/media\//)
    expect(html).not.toContain('googleusercontent')
    /** Featured Image article me nahi aati — wo apni jagah (banner) hai */
    expect(port.rows).toHaveLength(2)
  })

  it('Published Date doc se — 9 Sept 2026', async () => {
    const run = await runImport(
      { d1: postDoc(rows(['Published Date', '9 Sept 2026'])) },
      ['d1'],
      undefined,
      'post',
      { mediaPort: mediaPort(), wrapFetch },
    )

    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.status).toBe(ENTRY_STATUS.PUBLISHED)
    expect(entry.publishAt.toISOString().slice(0, 10)).toBe('2026-09-09')
  })

  /** Client: _"jo doc me ho use to 100% uthao"_ — aage ki date pe bhi post abhi live, scheduled nahi. */
  it('aage ki Published Date — post phir bhi Published, date wahi', async () => {
    const run = await runImport(
      { d1: postDoc(rows(['Published Date', '9 Sept 2030'])) },
      ['d1'],
      undefined,
      'post',
      { mediaPort: mediaPort(), wrapFetch },
    )

    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(run.rows[0].status).toBe('published')
    expect(entry.status).toBe(ENTRY_STATUS.PUBLISHED)
    expect(entry.publishAt.toISOString().slice(0, 10)).toBe('2030-09-09')
  })

  it('Published Date na ho to publish ke din ki date', async () => {
    const before = Date.now()
    const run = await runImport({ d1: postDoc(rows()) }, ['d1'], undefined, 'post', {
      mediaPort: mediaPort(),
      wrapFetch,
    })

    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.publishAt.getTime()).toBeGreaterThanOrEqual(before - 1000)
  })

  it('padhi na ja sake aisi date — row Failed, post nahi banta', async () => {
    const run = await runImport(
      { d1: postDoc(rows(['Published Date', 'next week'])) },
      ['d1'],
      undefined,
      'post',
      { mediaPort: mediaPort(), wrapFetch },
    )

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].error).toContain('Published Date')
    expect(await Entry.countDocuments({ type: 'post' })).toBe(0)
  })

  it('Featured Image download na ho to row Failed — post nahi banta', async () => {
    const run = await runImport({ d1: postDoc(rows()) }, ['d1'], undefined, 'post', {
      mediaPort: mediaPort(),
      wrapFetch:
        (inner) =>
        async (url, ...rest) =>
          url.includes('featured-ferry')
            ? {
                ok: false,
                status: 404,
                url,
                headers: new Map(),
                arrayBuffer: async () => Buffer.alloc(0),
              }
            : wrapFetch(inner)(url, ...rest),
    })

    expect(run.rows[0].status).toBe('failed')
    expect(run.rows[0].issues.some((i) => i.label === 'Featured Image')).toBe(true)
    expect(await Entry.countDocuments({ type: 'post' })).toBe(0)
  })

  /** Pura doc import ho jaane ke baad koi draft na bache — client: _"koi bhi draft page nahi banega"_. */
  it('bulk upload se kabhi draft entry nahi banti', async () => {
    await runImport({ d1: postDoc(rows()) }, ['d1'], undefined, 'post', {
      mediaPort: mediaPort(),
      wrapFetch,
    })
    await runImport({ B: typoDoc })
    await runImport({ C: namelessDoc })

    expect(await Entry.countDocuments({ status: ENTRY_STATUS.DRAFT })).toBe(0)
  })
})

/**
 * Client, 24 Sep — doc me image na ho to **default pool** se: package ke liye
 * `Itinerary Settings ▸ Default banner images`, blog ke liye `Blog settings ▸ Default featured images`.
 * Pehle se image ho to wahi rahe; doc me URL ho par na aaye to Failed (pool se nahi).
 */
describe('default images — doc me image na ho to pool se (client, 24 Sep)', () => {
  async function makeMedia(name) {
    const user = await User.findOne({ email: 'admin@test.com' }).lean()
    const media = await Media.create({
      filename: `${name}.webp`,
      mime: 'image/webp',
      size: 1234,
      width: 1600,
      height: 900,
      uploadedBy: user._id,
      variants: [],
    })

    return String(media._id)
  }

  /** Is file ka `beforeEach` `packageDefaults`/Settings saaf nahi karta — pool yahin set, yahin saaf. */
  async function setPools({ banner = [], featured = [] } = {}) {
    await PackageDefaults.updateOne(
      { siteId: DEFAULT_SITE_ID },
      { $set: { defaultBannerImages: banner } },
      { upsert: true },
    )
    await Settings.updateOne(
      { siteId: DEFAULT_SITE_ID },
      { $set: { 'blogSettings.defaultFeaturedImages': featured } },
      { upsert: true },
    )
  }

  afterEach(async () => {
    await setPools()
  })

  const bannerNote = (row) => row.issues.find((issue) => issue.message.includes('default images'))

  it('package: bina image wale doc ko pool ki image, note ke saath', async () => {
    const pool = [await makeMedia('p1'), await makeMedia('p2')]
    await setPools({ banner: pool })

    const run = await runImport({ A: goodDoc('Pool One', 'pool-one') })
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(run.rows[0].status).toBe('published')
    expect(pool).toContain(entry.fields.bannerImage)
    expect(bannerNote(run.rows[0]).level).toBe('note')
    expect(bannerNote(run.rows[0]).message).toContain('Itinerary Settings')
  })

  it('package: kai doc — pool ki images ghoom kar baant-ti hain', async () => {
    const pool = [await makeMedia('p1'), await makeMedia('p2'), await makeMedia('p3')]
    await setPools({ banner: pool })

    const docs = Object.fromEntries(
      ['A', 'B', 'C'].map((id) => [id, goodDoc(`Pool ${id}`, `pool-${id.toLowerCase()}`)]),
    )
    await runImport(docs)

    const banners = (await Entry.find({ type: 'package' }).lean()).map((e) => e.fields.bannerImage)
    expect(banners).toHaveLength(3)
    expect(new Set(banners).size).toBe(3)
  })

  it('package: pool khaali ho to pehle jaisa — bina image, koi note nahi', async () => {
    const run = await runImport({ A: goodDoc('No Pool', 'no-pool') })
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(run.rows[0].status).toBe('published')
    expect(entry.fields.bannerImage ?? null).toBeNull()
    expect(bannerNote(run.rows[0])).toBeUndefined()
  })

  it('package: Media se hat chuki pool ki image kabhi nahi chuni jaati', async () => {
    await setPools({ banner: ['aaaaaaaaaaaaaaaaaaaaaaaa'] })

    const run = await runImport({ A: goodDoc('Dead Pool', 'dead-pool') })
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.fields.bannerImage ?? null).toBeNull()
  })

  /**
   * ⚠️ Ye test pool ke bina bhi ek asli bug pakadta hai: `updateEntry()` `fields` ko poora badalta
   * hai, to Existing mode me bina image wala doc package ka purana banner **uda deta** tha.
   */
  it('package, Existing mode: pehle se banner ho to wahi rehta hai, pool se nahi badalta', async () => {
    const own = await makeMedia('own')
    await setPools({ banner: [await makeMedia('p1')] })

    const first = await runImport({ A: goodDoc('Keep Me', 'keep-me') })
    await Entry.updateOne({ _id: first.rows[0].entryId }, { $set: { 'fields.bannerImage': own } })

    const again = await runImport({ A: goodDoc('Keep Me', 'keep-me') }, ['A'], 'existing')
    const entry = await Entry.findById(first.rows[0].entryId).lean()

    expect(again.rows[0].status).toBe('published')
    expect(entry.fields.bannerImage).toBe(own)
    expect(bannerNote(again.rows[0])).toBeUndefined()
  })

  it('package: doc me URL ho par image na mile to Failed — pool se nahi bharta', async () => {
    await setPools({ banner: [await makeMedia('p1')] })

    const withBanner = goodDoc('Broken Banner', 'broken-banner').replace(
      p('Day wise Itinerary'),
      `${p('Banner Image URL')}${p('http://localhost:5173/uploads/sites/default/media/2026/09/bbbbbbbbbbbbbbbbbbbbbbbb/large.webp')}${p('Day wise Itinerary')}`,
    )
    const run = await runImport({ A: withBanner })

    expect(run.rows[0].status).toBe('failed')
    expect(await Entry.countDocuments({ type: 'package' })).toBe(0)
  })

  it('blog: bina Featured Image wale post ko Blog settings ke pool se', async () => {
    const pool = [await makeMedia('b1')]
    await setPools({ featured: pool })

    const postDoc = doc(
      [
        'Blog title',
        'Pool Post',
        'Blog URL',
        'pool-post',
        'Category',
        'Trip planning',
        'Content',
        'Body.',
      ]
        .map(p)
        .join(''),
    )
    const run = await runImport({ d1: postDoc }, ['d1'], undefined, 'post')
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(run.rows[0].status).toBe('published')
    expect(String(entry.featuredImageId)).toBe(pool[0])
    expect(bannerNote(run.rows[0]).message).toContain('Blog settings')
  })

  it('package ka pool blog pe nahi lagta (aur ulta)', async () => {
    await setPools({ banner: [await makeMedia('p1')] })

    const postDoc = doc(
      [
        'Blog title',
        'Other Post',
        'Blog URL',
        'other-post',
        'Category',
        'Trip planning',
        'Content',
        'Body.',
      ]
        .map(p)
        .join(''),
    )
    const run = await runImport({ d1: postDoc }, ['d1'], undefined, 'post')
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    expect(entry.featuredImageId ?? null).toBeNull()
  })
})
