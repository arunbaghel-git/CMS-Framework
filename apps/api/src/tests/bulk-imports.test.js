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

async function runImport(docs, ids = Object.keys(docs), mode = undefined, target = undefined) {
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

  it('Package URL na ho to package banta hai par draft rukta hai', async () => {
    const { rows } = await runImport({ A: noUrlDoc })

    expect(rows[0].status).toBe('draft')
    expect(rows[0].action).toBe('created')
    /** Address naam se bana — kaam khota nahi, sirf publish rukta hai. */
    expect(rows[0].path).toBe('/packages/andaman-tour')
    expect(rows[0].issues.some((i) => i.label === 'Package URL' && i.level === 'blocker')).toBe(
      true,
    )
  })

  it('Package URL na ho to bhi dobara chalane pe duplicate nahi banta', async () => {
    const docs = { A: noUrlDoc }

    await runImport(docs)
    expect(await Entry.countDocuments()).toBe(1)

    /**
     * Lookup ab naam se bane slug pe hota hai — wahi jo `resolveSlugAndPath()` banata hai.
     * Pehle yahan lookup hota hi nahi tha (`slug ? … : null`) aur har run naya page banata tha.
     */
    const second = await runImport(docs, undefined, 'existing')

    expect(await Entry.countDocuments()).toBe(1)
    expect(second.rows[0].action).toBe('updated')
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

  it('slug pe suffix lagna pade to publish rukta hai', async () => {
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

    expect(rows[0].path).toBe('/packages/uploads-2')
    expect(rows[0].status).toBe('draft')
    expect(rows[0].issues.some((i) => /already uses the address/i.test(i.message))).toBe(true)
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

  it('draft theek ho jaane pe agla run use publish kar deta hai', async () => {
    const first = await runImport({ B: typoDoc })
    expect(first.rows[0].status).toBe('draft')

    /** Client master list me naam theek karta hai — spelling ab milti hai */
    await Taxonomy.create({ type: 'destination', name: 'Havelok', slug: 'havelok' })

    const second = await runImport({ B: typoDoc }, undefined, 'existing')

    expect(second.rows[0].status).toBe('published')
    expect(second.rows[0].action).toBe('updated')
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

  const FULL = postDoc([
    'Meta Title',
    'Andaman ferry booking 2026',
    'Meta Description',
    'Timings, prices and how to book.',
    'Blog title',
    'Andaman ferry booking',
    'Blog URL',
    'andaman-ferry-booking',
    'Blog heading',
    'Everything you need before you sail',
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
  ])

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

  it('title, heading aur excerpt teen alag jagah jaate hain', async () => {
    const run = await runImport({ d1: FULL }, ['d1'], undefined, 'post')
    const entry = await Entry.findById(run.rows[0].entryId).lean()

    /** ⚠️ D-90 ka batwara — `title` slug/breadcrumb ke liye, `heading` page ka `<h1>`. */
    expect(entry.fields.heading).toBe('Everything you need before you sail')
    expect(entry.excerpt).toMatch(/^Three operators/)
    expect(entry.seo.title).toBe('Andaman ferry booking 2026')
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

  it('category na mile to post banta hai par draft rukta hai', async () => {
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

    expect(run.rows[0].status).toBe('draft')
    expect(run.rows[0].issues[0].value).toBe('Trip Planing')

    /** ⚠️ Content phir bhi jaata hai — sirf publish rukta hai. */
    const entry = await Entry.findById(run.rows[0].entryId).lean()
    expect(entry.content.blocks[0].props.html).toMatch(/Body text here/)
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
