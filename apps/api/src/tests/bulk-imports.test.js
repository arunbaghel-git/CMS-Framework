import { DEFAULT_SITE_ID, ENTRY_STATUS } from '@cms/shared'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
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

async function runImport(docs, ids = Object.keys(docs)) {
  const deps = { fetchImpl: fakeFetch(docs, csvOf(ids)) }

  /**
   * `startImport()` ko service se seedha bulaya jaata hai kyunki HTTP route ke paas
   * `deps` bhejne ka koi raasta nahi hai — aur hona bhi nahi chahiye, warna koi request
   * fetch badal sakti.
   */
  const { startImport } = await import('../modules/bulk-imports/service.js')
  const user = await User.findOne({ email: 'admin@test.com' }).lean()
  /** `deps` chautha argument hai — teesra `siteId` hai, isliye wo bhi saaf likhna padta hai. */
  const run = await startImport(
    { sheetUrl: SHEET_URL },
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
    expect(entry.fields.itinerary[0].meals).toEqual(['breakfast', 'dinner'])
  })

  it('naam match na kare to draft rehta hai — content phir bhi aata hai', async () => {
    const run = await runImport({ B: typoDoc })

    expect(run.rows[0].status).toBe('draft')
    expect(run.rows[0].entryId).toBeTruthy()

    const blocker = run.rows[0].issues.find((issue) => issue.level === 'blocker')

    expect(blocker.value).toBe('Havelok')
    expect(blocker.message).toContain('Destinations list')

    const entry = await Entry.findById(run.rows[0].entryId).lean()
    expect(entry.status).toBe(ENTRY_STATUS.DRAFT)
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

  it('media library me wo image na ho to saaf blocker deta hai', async () => {
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

    expect(run.rows[0].status).toBe('draft')
    expect(banner.level).toBe('blocker')
    expect(banner.message).toContain('no longer in the Media library')
  })
})

describe('dobara chalana', () => {
  it('duplicate package nahi banta — wahi update hota hai', async () => {
    const docs = { A: goodDoc('Andaman Escape', 'andaman-escape') }

    await runImport(docs)
    expect(await Entry.countDocuments()).toBe(1)

    const second = await runImport(docs)

    /** Yahi wo bug hai jisse bachna tha: har run pe naya `-2` wala page ban jaana */
    expect(await Entry.countDocuments()).toBe(1)
    expect(second.rows[0].action).toBe('updated')
    expect(second.rows[0].status).toBe('published')
  })

  it('pehle se published page dobara publish nahi hota', async () => {
    const docs = { A: goodDoc('Andaman Escape', 'andaman-escape') }

    const first = await runImport(docs)
    const before = await Entry.findById(first.rows[0].entryId).lean()

    await runImport(docs)
    const after = await Entry.findById(first.rows[0].entryId).lean()

    /**
     * Dobara publish karne se `publishAt` aaj pe reset ho jaata — yaani bees package ki
     * "Published on" har import pe badal jaati.
     */
    expect(after.publishAt.getTime()).toBe(before.publishAt.getTime())
  })

  it('draft theek ho jaane pe agla run use publish kar deta hai', async () => {
    const first = await runImport({ B: typoDoc })
    expect(first.rows[0].status).toBe('draft')

    /** Client master list me naam theek karta hai — spelling ab milti hai */
    await Taxonomy.create({ type: 'destination', name: 'Havelok', slug: 'havelok' })

    const second = await runImport({ B: typoDoc })

    expect(second.rows[0].status).toBe('published')
    expect(second.rows[0].action).toBe('updated')
    expect(await Entry.countDocuments()).toBe(1)
  })

  it('live page naye blocker ki wajah se neeche nahi aata', async () => {
    const good = { A: goodDoc('Andaman Escape', 'andaman-escape') }
    const first = await runImport(good)

    /** Ab hotel hata do — agle run me wo blocker banega */
    await Hotel.deleteMany({})

    const second = await runImport(good)
    const entry = await Entry.findById(first.rows[0].entryId).lean()

    /** Ek hotel ke naam ki galti bees live page utaar de — wo aapdaa hoti */
    expect(entry.status).toBe(ENTRY_STATUS.PUBLISHED)
    expect(second.rows[0].issues.some((issue) => issue.level === 'blocker')).toBe(true)
  })
})
