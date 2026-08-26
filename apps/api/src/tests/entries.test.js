import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { ContentType } from '../modules/content-types/model.js'
import { ensureBuiltInContentTypes } from '../modules/content-types/service.js'
import { Entry, Revision } from '../modules/entries/model.js'
import { publishDueEntries } from '../modules/entries/service.js'
import { Redirect } from '../modules/redirects/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { Taxonomy } from '../modules/taxonomies/model.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Content Core ka integration test — asli Mongo pe (D-46, spec 007 Slice 1).
 *
 * Chaar cheezein jo yahan sabse zyada maayne rakhti hain, kyunki inki failure **chup**
 * hoti hai:
 *
 *   1. **path** — routing ka single source of truth (D-09). Galat path = 404 ya duplicate URL
 *   2. **cascade** — parent ka slug badle to descendants ka path bhi badle
 *   3. **trash** — `deletedAt`, `status` nahi (D-25). Restore pe purani state wapas
 *   4. **optimistic concurrency** — do editor ka kaam ek doosre ko mitaye nahi
 *
 * Chalane se pehle: `pnpm db:up`
 */

const PASSWORD = 'ek-lamba-sa-passphrase'
const app = createApp()

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

let adminJar
let editorJar
let authorJar
let contributorJar

/** Sabse aam kaam — ek package banao. */
async function createEntry(jar, body) {
  return authed('post', '/api/entries', jar).send({ type: 'package', ...body })
}

async function createPage(jar, body) {
  return authed('post', '/api/entries', jar).send({ type: 'page', ...body })
}

const pathOf = async (id) => (await Entry.findById(id).lean()).path

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
    Entry.deleteMany({}),
    Revision.deleteMany({}),
    Redirect.deleteMany({}),
    Taxonomy.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()
  await ensureBuiltInContentTypes()

  for (const [username, email, role] of [
    ['boss', 'admin@test.com', 'admin'],
    ['ed', 'ed@test.com', 'editor'],
    ['auth', 'author@test.com', 'author'],
    ['contrib', 'contrib@test.com', 'contributor'],
  ]) {
    await createUser({ username, name: username, email, role, password: PASSWORD })
  }

  adminJar = await loginAs('admin@test.com')
  editorJar = await loginAs('ed@test.com')
  authorJar = await loginAs('author@test.com')
  contributorJar = await loginAs('contrib@test.com')
})

// ── content types ────────────────────────────────────────────────────────────

describe('built-in content types', () => {
  it('seed teenon types banata hai — package, page, post (D-46)', async () => {
    const res = await authed('get', '/api/content-types', adminJar)
    const keys = res.body.data.contentTypes.map((t) => t.key).sort()

    expect(res.status).toBe(200)
    expect(keys).toEqual(['package', 'page', 'post'])
  })

  it('dobara chalne pe duplicate nahi banta — seed idempotent hai', async () => {
    const result = await ensureBuiltInContentTypes()

    expect(await ContentType.countDocuments({})).toBe(3)
    expect(result.every((r) => r.action === 'up-to-date')).toBe(true)
  })

  it('built-in type delete nahi hota — seed use wapas bana dega', async () => {
    const pkg = await ContentType.findOne({ key: 'package' }).lean()
    const res = await authed('delete', `/api/content-types/${pkg._id}`, adminJar)

    expect(res.status).toBe(400)
  })

  it('jis type ki entries hain uska URL pattern nahi badal sakta', async () => {
    // Warna har entry ka link chup-chaap badal jaata aur purane link 404 dene lagte
    await createEntry(adminJar, { title: 'Andaman' })

    const pkg = await ContentType.findOne({ key: 'package' }).lean()
    const res = await authed('patch', `/api/content-types/${pkg._id}`, adminJar).send({
      urlPattern: '/tours/{slug}',
    })

    expect(res.status).toBe(422)
  })

  it('content type ki write sirf admin ke paas hai, editor ke paas nahi', async () => {
    const res = await authed('post', '/api/content-types', editorJar).send({
      key: 'service',
      label: 'Service',
      labelPlural: 'Services',
      urlPattern: '/services/{slug}',
    })

    expect(res.status).toBe(403)
  })
})

// ── create ───────────────────────────────────────────────────────────────────

describe('POST /api/entries', () => {
  it('title se slug aur contentType ke pattern se path banata hai', async () => {
    const res = await createEntry(adminJar, { title: 'Andaman 5 Nights' })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.slug).toBe('andaman-5-nights')
    expect(res.body.data.entry.path).toBe('/packages/andaman-5-nights')
    expect(res.body.data.entry.version).toBe(0)
  })

  it('hierarchical page ka path parent chain se banta hai, pattern se nahi', async () => {
    const parent = await createPage(adminJar, { title: 'About' })
    const child = await createPage(adminJar, {
      title: 'Team',
      parentId: parent.body.data.entry.id,
    })

    expect(parent.body.data.entry.path).toBe('/about')
    expect(child.body.data.entry.path).toBe('/about/team')
  })

  it('same slug dobara aaye to -2 lagta hai', async () => {
    await createEntry(adminJar, { title: 'Andaman' })
    const res = await createEntry(adminJar, { title: 'Andaman' })

    expect(res.body.data.entry.slug).toBe('andaman-2')
    expect(res.body.data.entry.path).toBe('/packages/andaman-2')
  })

  it('reserved slug claim nahi hota — /media maangne pe media-2 milta hai', async () => {
    const res = await createPage(adminJar, { title: 'Media' })

    expect(res.body.data.entry.slug).toBe('media-2')
  })

  it('anjaan type pe 422 — engine chup-chaap entry nahi banata', async () => {
    const res = await authed('post', '/api/entries', adminJar).send({
      type: 'doesNotExist',
      title: 'X',
    })

    expect(res.status).toBe(422)
  })

  it('create se publish nahi ho sakta — status draft pe utarta hai', async () => {
    // Bina iske contributor `status: 'published'` bhej kar poora publish flow bypass
    // kar leta: na permission check hoti, na revision banti
    const res = await createEntry(contributorJar, { title: 'Sneaky', status: 'published' })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.status).toBe('draft')
  })

  it('bina login ke 401', async () => {
    const res = await request(app).post('/api/entries').send({ type: 'package', title: 'X' })

    expect(res.status).toBe(401)
  })
})

// ── update + concurrency ─────────────────────────────────────────────────────

describe('PATCH /api/entries/:id', () => {
  it('purana version bhejne pe 409 — doosre ka kaam mit-ta nahi', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 0, title: 'Pehla' })
    const second = await authed('patch', `/api/entries/${id}`, adminJar).send({
      version: 0,
      title: 'Doosra',
    })

    expect(second.status).toBe(409)
    expect((await Entry.findById(id).lean()).title).toBe('Pehla')
  })

  it('draft ka title badle to slug bhi badalta hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    const res = await authed('patch', `/api/entries/${id}`, adminJar).send({
      version: 0,
      title: 'Andaman Deluxe',
    })

    expect(res.body.data.entry.path).toBe('/packages/andaman-deluxe')
  })

  it('published item ka title badle to URL nahi badalta', async () => {
    // Live page ka URL title edit karne se badal jaana wo accident hai jo SEO ko
    // chup-chaap le doobta hai
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})
    const current = await Entry.findById(id).lean()

    await authed('patch', `/api/entries/${id}`, adminJar).send({
      version: current.version,
      title: 'Andaman Deluxe',
    })

    expect(await pathOf(id)).toBe('/packages/andaman')
  })

  it('type badalna mana hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const res = await authed('patch', `/api/entries/${created.body.data.entry.id}`, adminJar).send({
      version: 0,
      type: 'post',
    })

    expect(res.status).toBe(422)
  })
})

// ── path cascade ─────────────────────────────────────────────────────────────

describe('path cascade', () => {
  it('parent ka slug badle to saare descendants ka path rebase hota hai', async () => {
    const about = (await createPage(adminJar, { title: 'About' })).body.data.entry
    const team = (await createPage(adminJar, { title: 'Team', parentId: about.id })).body.data.entry
    const leads = (await createPage(adminJar, { title: 'Leads', parentId: team.id })).body.data
      .entry

    await authed('patch', `/api/entries/${about.id}`, adminJar).send({
      version: 0,
      slug: 'company',
    })

    expect(await pathOf(about.id)).toBe('/company')
    expect(await pathOf(team.id)).toBe('/company/team')
    expect(await pathOf(leads.id)).toBe('/company/team/leads')
  })

  it('milta-julta naam wala sibling cascade me nahi khichta', async () => {
    // `/about-us` `/about` se shuru hota hai par uska bachcha nahi hai. Plain string
    // replace yahin galat jawab deta hai
    const about = (await createPage(adminJar, { title: 'About' })).body.data.entry
    const aboutUs = (await createPage(adminJar, { title: 'About Us' })).body.data.entry

    await authed('patch', `/api/entries/${about.id}`, adminJar).send({
      version: 0,
      slug: 'company',
    })

    expect(await pathOf(aboutUs.id)).toBe('/about-us')
  })

  it('item ko apne hi andar nahi daala ja sakta', async () => {
    const about = (await createPage(adminJar, { title: 'About' })).body.data.entry
    const res = await authed('patch', `/api/entries/${about.id}`, adminJar).send({
      version: 0,
      parentId: about.id,
    })

    expect(res.status).toBe(422)
  })

  it('alag type ka parent nahi chun sakte', async () => {
    const pkg = (await createEntry(adminJar, { title: 'Andaman' })).body.data.entry
    const res = await authed('post', '/api/entries', adminJar).send({
      type: 'page',
      title: 'Child',
      parentId: pkg.id,
    })

    expect(res.status).toBe(422)
  })
})

// ── trash ────────────────────────────────────────────────────────────────────

describe('trash aur restore', () => {
  it('trash deletedAt set karta hai, status ko haath nahi lagata (D-25)', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})
    await authed('post', `/api/entries/${id}/trash`, adminJar).send({})

    const doc = await Entry.findById(id).lean()
    expect(doc.deletedAt).toBeTruthy()
    expect(doc.status).toBe('published')
  })

  it('restore pe entry apni purani state me wapas aati hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})
    await authed('post', `/api/entries/${id}/trash`, adminJar).send({})
    const res = await authed('post', `/api/entries/${id}/restore`, adminJar).send({})

    expect(res.status).toBe(200)
    expect(res.body.data.entry.status).toBe('published')
    expect(res.body.data.entry.deletedAt).toBeNull()
  })

  it('trash me padi entry apna slug pakde rehti hai — restore pe takraav nahi hota', async () => {
    const first = (await createEntry(adminJar, { title: 'Andaman' })).body.data.entry
    await authed('post', `/api/entries/${first.id}/trash`, adminJar).send({})

    // Wahi title dobara — trashed entry ka slug bacha hua hai, to isse -2 milna chahiye
    const second = (await createEntry(adminJar, { title: 'Andaman' })).body.data.entry
    expect(second.slug).toBe('andaman-2')

    const restored = await authed('post', `/api/entries/${first.id}/restore`, adminJar).send({})
    expect(restored.status).toBe(200)
    expect(restored.body.data.entry.slug).toBe('andaman')
  })

  it('bachche wale item ko trash me nahi daala ja sakta', async () => {
    const about = (await createPage(adminJar, { title: 'About' })).body.data.entry
    await createPage(adminJar, { title: 'Team', parentId: about.id })

    const res = await authed('post', `/api/entries/${about.id}/trash`, adminJar).send({})
    expect(res.status).toBe(422)
  })

  it('trash list alag view hai — normal list me trashed nahi aati', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    await authed('post', `/api/entries/${created.body.data.entry.id}/trash`, adminJar).send({})

    const normal = await authed('get', '/api/entries', adminJar)
    const trashed = await authed('get', '/api/entries?trashed=true', adminJar)

    expect(normal.body.data.entries).toHaveLength(0)
    expect(trashed.body.data.entries).toHaveLength(1)
  })

  it('permanent delete sirf Trash ke andar se hota hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    // Seedha purge — trash me daale bina
    expect((await authed('delete', `/api/entries/${id}`, adminJar)).status).toBe(422)

    await authed('post', `/api/entries/${id}/trash`, adminJar).send({})
    expect((await authed('delete', `/api/entries/${id}`, adminJar)).status).toBe(200)
    expect(await Entry.findById(id).lean()).toBeNull()
  })

  it('permanent delete editor ke paas nahi hai — sirf admin (D-26)', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry
    await authed('post', `/api/entries/${id}/trash`, adminJar).send({})

    expect((await authed('delete', `/api/entries/${id}`, editorJar)).status).toBe(403)
  })
})

// ── publish + schedule ───────────────────────────────────────────────────────

describe('publish', () => {
  it('publish status aur publishAt dono set karta hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const res = await authed(
      'post',
      `/api/entries/${created.body.data.entry.id}/publish`,
      adminJar,
    ).send({})

    expect(res.body.data.entry.status).toBe('published')
    expect(res.body.data.entry.publishAt).toBeTruthy()
  })

  it('future publishAt pe status scheduled banta hai, published nahi', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const res = await authed(
      'post',
      `/api/entries/${created.body.data.entry.id}/publish`,
      adminJar,
    ).send({ publishAt: future })

    expect(res.body.data.entry.status).toBe('scheduled')
  })

  it('cron sirf wahi scheduled uthata hai jinka waqt aa gaya (R2)', async () => {
    const due = (await createEntry(adminJar, { title: 'Due' })).body.data.entry
    const later = (await createEntry(adminJar, { title: 'Later' })).body.data.entry

    await Entry.updateOne(
      { _id: due.id },
      { $set: { status: 'scheduled', publishAt: new Date(Date.now() - 1000) } },
    )
    await authed('post', `/api/entries/${later.id}/publish`, adminJar).send({
      publishAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })

    const { published } = await publishDueEntries()

    expect(published).toEqual([String(due.id)])
    expect((await Entry.findById(due.id).lean()).status).toBe('published')
    expect((await Entry.findById(later.id).lean()).status).toBe('scheduled')
  })

  it('unpublish publishAt saaf karta hai — warna cron use dobara publish kar deti', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})
    const res = await authed('post', `/api/entries/${id}/unpublish`, adminJar).send({})

    expect(res.body.data.entry.status).toBe('draft')
    expect(res.body.data.entry.publishAt).toBeNull()
  })

  it('contributor publish nahi kar sakta, review ke liye bhej sakta hai', async () => {
    const created = await createEntry(contributorJar, { title: 'Mera Draft' })
    const { id } = created.body.data.entry

    expect(
      (await authed('post', `/api/entries/${id}/publish`, contributorJar).send({})).status,
    ).toBe(403)

    const submitted = await authed('post', `/api/entries/${id}/submit-review`, contributorJar).send(
      {},
    )

    expect(submitted.body.data.entry.status).toBe('pending')
  })
})

// ── .own permissions ─────────────────────────────────────────────────────────

describe('.own permissions (service layer)', () => {
  it('author apna item badal sakta hai', async () => {
    const created = await createEntry(authorJar, { title: 'Mera' })
    const res = await authed('patch', `/api/entries/${created.body.data.entry.id}`, authorJar).send(
      {
        version: 0,
        title: 'Mera Naya',
      },
    )

    expect(res.status).toBe(200)
  })

  it('author doosre ka item nahi badal sakta — asli check service me hai', async () => {
    // Middleware ke paas document hota hi nahi, isliye wo `entry.update.own` ko rok
    // nahi sakta. Bina service wale check ke ye 200 de deta
    const created = await createEntry(adminJar, { title: 'Admin Ka' })
    const res = await authed('patch', `/api/entries/${created.body.data.entry.id}`, authorJar).send(
      {
        version: 0,
        title: 'Chura Liya',
      },
    )

    expect(res.status).toBe(403)
  })

  it('author apna item publish kar sakta hai, doosre ka nahi', async () => {
    const mine = (await createEntry(authorJar, { title: 'Mera' })).body.data.entry
    const theirs = (await createEntry(adminJar, { title: 'Unka' })).body.data.entry

    expect(
      (await authed('post', `/api/entries/${mine.id}/publish`, authorJar).send({})).status,
    ).toBe(200)
    expect(
      (await authed('post', `/api/entries/${theirs.id}/publish`, authorJar).send({})).status,
    ).toBe(403)
  })
})

// ── revisions ────────────────────────────────────────────────────────────────

describe('revisions', () => {
  it('save pe aur publish pe dono snapshot banti hai (R7)', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 0, title: 'Andaman 2' })
    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})

    const res = await authed('get', `/api/entries/${id}/revisions`, adminJar)
    const kinds = res.body.data.revisions.map((r) => r.kind)

    // create + update + publish
    expect(res.body.meta.total).toBe(3)
    expect(kinds).toContain('publish')
    expect(kinds).toContain('save')
  })

  it('list me snapshot nahi jaata — wo poora document hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const res = await authed(
      'get',
      `/api/entries/${created.body.data.entry.id}/revisions`,
      adminJar,
    )

    expect(res.body.data.revisions[0].snapshot).toBeUndefined()
  })

  it('restore purana content wapas laata hai par URL nahi badalta', async () => {
    const created = await createEntry(adminJar, { title: 'Pehla Title' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({
      version: 0,
      title: 'Doosra Title',
    })

    const list = await authed('get', `/api/entries/${id}/revisions`, adminJar)
    const oldest = list.body.data.revisions.at(-1)

    const pathBefore = await pathOf(id)
    const res = await authed(
      'post',
      `/api/entries/${id}/revisions/${oldest.id}/restore`,
      adminJar,
    ).send({})

    expect(res.body.data.entry.title).toBe('Pehla Title')
    // Purana path wapas laane ka matlab hota live URL chup-chaap badal jaana
    expect(await pathOf(id)).toBe(pathBefore)
  })

  it('restore khud ek revision banata hai — uska bhi undo bacha rehta hai', async () => {
    const created = await createEntry(adminJar, { title: 'Pehla' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 0, title: 'Doosra' })
    const before = await Revision.countDocuments({ entryId: String(id) })

    const list = await authed('get', `/api/entries/${id}/revisions`, adminJar)
    await authed(
      'post',
      `/api/entries/${id}/revisions/${list.body.data.revisions.at(-1).id}/restore`,
      adminJar,
    ).send({})

    expect(await Revision.countDocuments({ entryId: String(id) })).toBe(before + 1)
  })

  it('purge revisions bhi le jaata hai — orphan snapshot nahi bachte', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/trash`, adminJar).send({})
    await authed('delete', `/api/entries/${id}`, adminJar)

    expect(await Revision.countDocuments({ entryId: String(id) })).toBe(0)
  })
})

// ── duplicate + search ───────────────────────────────────────────────────────

describe('duplicate', () => {
  it('copy hamesha draft banti hai, chahe original published ho', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry
    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})

    const res = await authed('post', `/api/entries/${id}/duplicate`, adminJar).send({})

    expect(res.status).toBe(201)
    expect(res.body.data.entry.status).toBe('draft')
    expect(res.body.data.entry.title).toBe('Andaman (copy)')
    expect(res.body.data.entry.path).not.toBe('/packages/andaman')
  })
})

describe('search', () => {
  it('searchText me custom fields ka text bhi jaata hai', async () => {
    // Package ka asli content `fields` me rehta hai (D-46) — sirf title index karne ka
    // matlab hota ki admin apna hi likha itinerary text na dhoondh paaye
    await createEntry(adminJar, {
      title: 'Andaman',
      fields: { itinerary: [{ title: 'Day 1', description: 'Radhanagar Beach sunset' }] },
    })

    const res = await authed('get', '/api/entries?q=Radhanagar', adminJar)

    expect(res.body.data.entries).toHaveLength(1)
  })

  it('list pe pagination day 1 se hai (R14)', async () => {
    for (const n of [1, 2, 3]) await createEntry(adminJar, { title: `Package ${n}` })

    const res = await authed('get', '/api/entries?limit=2&page=1', adminJar)

    expect(res.body.data.entries).toHaveLength(2)
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 })
  })
})

// ── taxonomy references (A-7, D-49) ──────────────────────────────────────────

describe('taxonomy references', () => {
  async function createTaxonomy(type, name) {
    const res = await authed('post', '/api/taxonomies', adminJar).send({ type, name })
    return res.body.data.taxonomy
  }

  it('package apni destinations aur packageTypes rakh sakta hai', async () => {
    const goa = await createTaxonomy('destination', 'Goa')
    const honeymoon = await createTaxonomy('packageType', 'Honeymoon')

    const res = await createEntry(adminJar, {
      title: 'Goa Honeymoon',
      taxonomies: { destinations: [goa.id], packageTypes: [honeymoon.id] },
    })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.taxonomies.destinations).toEqual([goa.id])
    expect(res.body.data.entry.taxonomies.packageTypes).toEqual([honeymoon.id])
    // Purani do keys ab bhi hamesha maujood — jo code unhe seedha padhta hai wo chalta rahe
    expect(res.body.data.entry.taxonomies.categories).toEqual([])
  })

  it('anjaan taxonomy id pe 422', async () => {
    const res = await createEntry(adminJar, {
      title: 'Nowhere',
      taxonomies: { destinations: ['64b7f3f3f3f3f3f3f3f3f3f3'] },
    })

    expect(res.status).toBe(422)
  })

  it('galat type ki id galat key me nahi ja sakti', async () => {
    // Bina type ke check ke ek Package Type ki id destinations me baith jaati: save ho
    // jaati, list me kuch galat nahi dikhta, aur galti public page ke breadcrumb pe
    // pakdi jaati
    const honeymoon = await createTaxonomy('packageType', 'Honeymoon')

    const res = await createEntry(adminJar, {
      title: 'Wrong Vocabulary',
      taxonomies: { destinations: [honeymoon.id] },
    })

    expect(res.status).toBe(422)
  })

  it('list destination se filter hoti hai', async () => {
    const goa = await createTaxonomy('destination', 'Goa')
    const kerala = await createTaxonomy('destination', 'Kerala')

    await createEntry(adminJar, { title: 'Goa Trip', taxonomies: { destinations: [goa.id] } })
    await createEntry(adminJar, { title: 'Kerala Trip', taxonomies: { destinations: [kerala.id] } })

    const res = await authed('get', `/api/entries?destinations=${goa.id}`, adminJar)

    expect(res.body.data.entries).toHaveLength(1)
    expect(res.body.data.entries[0].title).toBe('Goa Trip')
  })

  it('jise koi entry use kar rahi hai wo taxonomy delete nahi hoti', async () => {
    const goa = await createTaxonomy('destination', 'Goa')
    await createEntry(adminJar, { title: 'Goa Trip', taxonomies: { destinations: [goa.id] } })

    const res = await authed('delete', `/api/taxonomies/${goa.id}`, adminJar)
    expect(res.status).toBe(422)
  })

  it('trash me padi entry bhi taxonomy ko rok-ti hai — wo restore ho sakti hai', async () => {
    const goa = await createTaxonomy('destination', 'Goa')
    const entry = (
      await createEntry(adminJar, { title: 'Goa Trip', taxonomies: { destinations: [goa.id] } })
    ).body.data.entry

    await authed('post', `/api/entries/${entry.id}/trash`, adminJar).send({})

    const res = await authed('delete', `/api/taxonomies/${goa.id}`, adminJar)
    expect(res.status).toBe(422)
  })
})

// ── auto redirects (A-6, D-49) ───────────────────────────────────────────────

describe('auto redirects', () => {
  const redirectFor = (from) => Redirect.findOne({ from }).lean()

  it('slug badalne pe purane path se 301 banta hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 0, slug: 'andaman-5n' })

    const redirect = await redirectFor('/packages/andaman')
    expect(redirect.to).toBe('/packages/andaman-5n')
    expect(redirect.statusCode).toBe(301)
    expect(redirect.isAuto).toBe(true)
  })

  it('descendants ke purane URL bhi zinda rehte hain', async () => {
    // Sirf parent pe redirect banane ka matlab hai ki bachche ke saare share kiye hue
    // link chup-chaap mar jaate hain
    const about = (await createPage(adminJar, { title: 'About' })).body.data.entry
    await createPage(adminJar, { title: 'Team', parentId: about.id })

    await authed('patch', `/api/entries/${about.id}`, adminJar).send({
      version: 0,
      slug: 'company',
    })

    expect((await redirectFor('/about')).to).toBe('/company')
    expect((await redirectFor('/about/team')).to).toBe('/company/team')
  })

  it('chain flatten hoti hai — /a → /b → /c kabhi nahi banta', async () => {
    // Har hop ek extra round-trip hai, aur teen hop ke baad Google follow karna hi band
    // kar deta hai
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 0, slug: 'andaman-b' })
    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 1, slug: 'andaman-c' })

    expect((await redirectFor('/packages/andaman')).to).toBe('/packages/andaman-c')
    expect((await redirectFor('/packages/andaman-b')).to).toBe('/packages/andaman-c')
    expect(await Redirect.countDocuments({ to: '/packages/andaman-b' })).toBe(0)
  })

  it('purane naam pe wapas jaane pe loop nahi banta', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 0, slug: 'andaman-b' })
    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 1, slug: 'andaman' })

    // Live path khud kabhi redirect ka source nahi bacha rehna chahiye — warna page
    // apne aap pe redirect karta rehta hai
    expect(await redirectFor('/packages/andaman')).toBeNull()
    expect(await Redirect.countDocuments({ from: '/packages/andaman' })).toBe(0)
  })

  it('permanent delete uspe aane wale redirects bhi le jaata hai', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('patch', `/api/entries/${id}`, adminJar).send({ version: 0, slug: 'andaman-5n' })
    expect(await redirectFor('/packages/andaman')).not.toBeNull()

    await authed('post', `/api/entries/${id}/trash`, adminJar).send({})
    await authed('delete', `/api/entries/${id}`, adminJar)

    // Warna redirect ek 404 pe point karta rehta — ek hop, aur phir bhi "page nahi mila"
    expect(await redirectFor('/packages/andaman')).toBeNull()
  })

  it('title badalne se (path wahi rehne pe) bekaar redirect nahi banta', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})
    const current = await Entry.findById(id).lean()

    await authed('patch', `/api/entries/${id}`, adminJar).send({
      version: current.version,
      title: 'Andaman Deluxe',
    })

    expect(await Redirect.countDocuments({})).toBe(0)
  })

  it('editor redirects dekh aur hata sakta hai, author nahi (spec 001)', async () => {
    const created = await createEntry(adminJar, { title: 'Andaman' })
    await authed('patch', `/api/entries/${created.body.data.entry.id}`, adminJar).send({
      version: 0,
      slug: 'andaman-5n',
    })

    const list = await authed('get', '/api/redirects', adminJar)
    expect(list.body.data.redirects).toHaveLength(1)

    const { id } = list.body.data.redirects[0]

    // `redirect.*` editor ke paas hai — redirects SEO ka kaam hain, aur wo editor ka
    // hissa hai (spec 001). Author ke paas nahi.
    expect((await authed('delete', `/api/redirects/${id}`, authorJar)).status).toBe(403)
    expect((await authed('delete', `/api/redirects/${id}`, editorJar)).status).toBe(200)
    expect(await Redirect.countDocuments({})).toBe(0)
  })
})

// ── package ka field set + availability (Slice 3, D-50) ──────────────────────

describe('package content type ka shape', () => {
  const typeByKey = async (key) => ContentType.findOne({ key }).lean()

  it('Slice 3 ke fields register ho chuke hain', async () => {
    const pkg = await typeByKey('package')
    const keys = pkg.fields.map((f) => f.key)

    // `overview` yahan JAAN-BOOJH KAR nahi hai — wo entry ka `content` hai, ek richText
    // block ke andar (D-46 §3). Use ek alag field banana matlab ek hi cheez do jagah:
    // `content` versioned hai, revisions me jaata hai aur searchText bharta hai
    expect(keys).toEqual([
      'shortDescription',
      'nights',
      'days',
      'bannerImage',
      'itinerary',
      'bestSeason',
      'bestFor',
      'featured',
      'seoSchema',
    ])
    expect(keys).not.toContain('overview')
  })

  it('bestFor chips hai — tags field type (spec 007 §9 #7)', async () => {
    const pkg = await typeByKey('package')
    const bestFor = pkg.fields.find((f) => f.key === 'bestFor')

    expect(bestFor.type).toBe('tags')
  })

  it('package Destinations aur Package Type use karta hai, Pages koi nahi', async () => {
    expect((await typeByKey('package')).taxonomyTypes).toEqual(['destination', 'packageType'])
    expect((await typeByKey('post')).taxonomyTypes).toEqual(['category', 'tag'])
    expect((await typeByKey('page')).taxonomyTypes).toEqual([])
  })

  it('availability sirf package pe hai, Page aur Post pe nahi', async () => {
    expect((await typeByKey('package')).supports).toContain('availability')
    expect((await typeByKey('page')).supports).not.toContain('availability')
    expect((await typeByKey('post')).supports).not.toContain('availability')
  })
})

describe('availability (D-50)', () => {
  it('sold out package published hi rehta hai — page live rehta hai', async () => {
    // Isse status me jodne ka matlab hota ki season khatam hote hi page hi gayab,
    // aur agle season me ranking dobara banani padti
    const created = await createEntry(adminJar, { title: 'Andaman' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})
    const current = await Entry.findById(id).lean()

    const res = await authed('patch', `/api/entries/${id}`, adminJar).send({
      version: current.version,
      availability: 'soldOut',
    })

    expect(res.body.data.entry.availability).toBe('soldOut')
    expect(res.body.data.entry.status).toBe('published')
    expect(res.body.data.entry.path).toBe('/packages/andaman')
  })

  it('naya package default open hota hai', async () => {
    const res = await createEntry(adminJar, { title: 'Andaman' })

    expect(res.body.data.entry.availability).toBe('open')
  })

  it('jo type support nahi karta wahan chup-chaap open rehti hai', async () => {
    // Error nahi — admin ka form Page pe wo control dikhata hi nahi, aur ek purana
    // client jo field bhej de use rokne ka koi fayda nahi. Galat data phir bhi nahi banta
    const res = await createPage(adminJar, { title: 'About', availability: 'soldOut' })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.availability).toBe('open')
  })

  it('list "Sold Out" tab availability pe filter karti hai', async () => {
    const open = (await createEntry(adminJar, { title: 'Open Trip' })).body.data.entry
    const sold = (await createEntry(adminJar, { title: 'Sold Trip' })).body.data.entry

    await authed('patch', `/api/entries/${sold.id}`, adminJar).send({
      version: 0,
      availability: 'soldOut',
    })

    const res = await authed('get', '/api/entries?type=package&availability=soldOut', adminJar)

    expect(res.body.data.entries).toHaveLength(1)
    expect(res.body.data.entries[0].id).toBe(sold.id)
    expect(res.body.data.entries[0].id).not.toBe(open.id)
  })

  it('availability ke bahar ki value 400 deti hai', async () => {
    const res = await createEntry(adminJar, { title: 'X', availability: 'maybe' })

    expect(res.status).toBe(400)
  })
})

describe('taxonomyTypes ka gate (D-49)', () => {
  async function createTaxonomy(type, name) {
    const res = await authed('post', '/api/taxonomies', adminJar).send({ type, name })
    return res.body.data.taxonomy
  }

  it('post pe destinations nahi lag sakti — wo us type ki vocabulary nahi hai', async () => {
    // Bina is gate ke wo save ho jaati, list me kuch galat nahi dikhta, aur galti tab
    // pakdi jaati jab destination delete karne pe ek aisi Post use rok deti hai jiska
    // usse koi lena-dena hi nahi tha
    const goa = await createTaxonomy('destination', 'Goa')

    const res = await authed('post', '/api/entries', adminJar).send({
      type: 'post',
      title: 'Blog post',
      taxonomies: { destinations: [goa.id] },
    })

    expect(res.status).toBe(422)
  })

  it('package pe categories nahi lag sakti', async () => {
    const news = await createTaxonomy('category', 'News')

    const res = await createEntry(adminJar, {
      title: 'Andaman',
      taxonomies: { categories: [news.id] },
    })

    expect(res.status).toBe(422)
  })

  it('post pe categories lag sakti hain', async () => {
    const news = await createTaxonomy('category', 'News')

    const res = await authed('post', '/api/entries', adminJar).send({
      type: 'post',
      title: 'Blog post',
      taxonomies: { categories: [news.id] },
    })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.taxonomies.categories).toEqual([news.id])
  })
})

describe('package ke custom fields', () => {
  it('bestFor ek list ki tarah save hota hai aur search me aata hai', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        shortDescription: 'Beaches aur ferries',
        nights: 5,
        days: 6,
        bestSeason: 'Oct – May',
        bestFor: ['Couples', 'First-timers'],
      },
    })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.fields.bestFor).toEqual(['Couples', 'First-timers'])

    // searchText custom fields ka text bhi uthata hai — admin apne likhe shabd dhoondh sake
    const found = await authed('get', '/api/entries?q=First-timers', adminJar)
    expect(found.body.data.entries).toHaveLength(1)
  })
})

// ── list ke tabs ke counts (Slice 3) ─────────────────────────────────────────

describe('GET /api/entries/counts', () => {
  it('paanchon tab ke number ek hi call me deta hai', async () => {
    // Paanch alag requests ka matlab hota paanch alag waqt ke jawab: ek tab 58 dikhata
    // aur doosra 57, aur wo farq kabhi samajh nahi aata
    const a = (await createEntry(adminJar, { title: 'Published One' })).body.data.entry
    const b = (await createEntry(adminJar, { title: 'Sold One' })).body.data.entry
    const c = (await createEntry(adminJar, { title: 'Trashed One' })).body.data.entry
    await createEntry(adminJar, { title: 'Draft One' })

    await authed('post', `/api/entries/${a.id}/publish`, adminJar).send({})
    await authed('patch', `/api/entries/${b.id}`, adminJar).send({
      version: 0,
      availability: 'soldOut',
    })
    await authed('post', `/api/entries/${c.id}/trash`, adminJar).send({})

    const res = await authed('get', '/api/entries/counts?type=package', adminJar)
    const { counts } = res.body.data

    // all me trash NAHI hai — "All (64)" ke baad "Trash (1)" 64 ko 65 nahi banata
    expect(counts.all).toBe(3)
    expect(counts.published).toBe(1)
    expect(counts.draft).toBe(2)
    expect(counts.soldOut).toBe(1)
    expect(counts.trash).toBe(1)
  })

  it('counts sirf maange gaye type ke hote hain', async () => {
    await createEntry(adminJar, { title: 'Package' })
    await createPage(adminJar, { title: 'Page' })

    const res = await authed('get', '/api/entries/counts?type=package', adminJar)

    expect(res.body.data.counts.all).toBe(1)
  })

  it('type ke bina 400', async () => {
    expect((await authed('get', '/api/entries/counts', adminJar)).status).toBe(400)
  })
})

// ── bulk actions (Slice 3) ───────────────────────────────────────────────────

describe('POST /api/entries/bulk', () => {
  it('chuni hui rows ko sold out kar deta hai', async () => {
    const a = (await createEntry(adminJar, { title: 'One' })).body.data.entry
    const b = (await createEntry(adminJar, { title: 'Two' })).body.data.entry

    const res = await authed('post', '/api/entries/bulk', adminJar).send({
      ids: [a.id, b.id],
      action: 'soldOut',
    })

    expect(res.body.data.updated).toBe(2)
    expect((await Entry.findById(a.id).lean()).availability).toBe('soldOut')
    expect((await Entry.findById(b.id).lean()).availability).toBe('soldOut')
  })

  it('featured set aur remove dono karta hai', async () => {
    const a = (await createEntry(adminJar, { title: 'One' })).body.data.entry

    await authed('post', '/api/entries/bulk', adminJar).send({ ids: [a.id], action: 'feature' })
    expect((await Entry.findById(a.id).lean()).fields.featured).toBe(true)

    await authed('post', '/api/entries/bulk', adminJar).send({ ids: [a.id], action: 'unfeature' })
    expect((await Entry.findById(a.id).lean()).fields.featured).toBe(false)
  })

  it('fail-soft hai — ek row ka fail hona baaki ko nahi rokta', async () => {
    // Bachche wale page ka trash rukta hai (D-47 §5). All-or-nothing rakhne ka matlab
    // hota ki uski wajah se poora bulk chup-chaap kuch na kare
    const about = (await createPage(adminJar, { title: 'About' })).body.data.entry
    await createPage(adminJar, { title: 'Team', parentId: about.id })
    const solo = (await createPage(adminJar, { title: 'Contact' })).body.data.entry

    const res = await authed('post', '/api/entries/bulk', adminJar).send({
      ids: [about.id, solo.id],
      action: 'trash',
    })

    expect(res.body.data.updated).toBe(1)
    expect(res.body.data.failed).toHaveLength(1)
    expect(res.body.data.failed[0].id).toBe(String(about.id))
    expect((await Entry.findById(solo.id).lean()).deletedAt).toBeTruthy()
    expect((await Entry.findById(about.id).lean()).deletedAt).toBeNull()
  })

  it('bulk permission ka shortcut nahi hai — author sirf apne items badal paata hai', async () => {
    const mine = (await createEntry(authorJar, { title: 'Mera' })).body.data.entry
    const theirs = (await createEntry(adminJar, { title: 'Unka' })).body.data.entry

    const res = await authed('post', '/api/entries/bulk', authorJar).send({
      ids: [mine.id, theirs.id],
      action: 'soldOut',
    })

    expect(res.body.data.updated).toBe(1)
    expect(res.body.data.failed).toHaveLength(1)
    expect((await Entry.findById(theirs.id).lean()).availability).toBe('open')
  })

  it('trash se restore bhi bulk hota hai', async () => {
    const a = (await createEntry(adminJar, { title: 'One' })).body.data.entry
    await authed('post', `/api/entries/${a.id}/trash`, adminJar).send({})

    const res = await authed('post', '/api/entries/bulk', adminJar).send({
      ids: [a.id],
      action: 'restore',
    })

    expect(res.body.data.updated).toBe(1)
    expect((await Entry.findById(a.id).lean()).deletedAt).toBeNull()
  })

  it('purge bulk se nahi hota — permanent delete ek-ek karke hi', async () => {
    // 50 rows ek click me hamesha ke liye mitane ka koi undo nahi hai
    const a = (await createEntry(adminJar, { title: 'One' })).body.data.entry

    const res = await authed('post', '/api/entries/bulk', adminJar).send({
      ids: [a.id],
      action: 'purge',
    })

    expect(res.status).toBe(400)
  })
})

// ── visibility (design ka Publish panel) ─────────────────────────────────────

describe('visibility', () => {
  it('private publish karne pe status private hota hai — koi naya field nahi', async () => {
    // spec 007 §2: "Visibility ka koi naya field nahi hai" — wo status: 'private' hi hai
    const created = await createEntry(adminJar, { title: 'Staging Package' })

    const res = await authed(
      'post',
      `/api/entries/${created.body.data.entry.id}/publish`,
      adminJar,
    ).send({ visibility: 'private' })

    expect(res.body.data.entry.status).toBe('private')
  })

  it('public par wapas laaya ja sakta hai', async () => {
    const created = await createEntry(adminJar, { title: 'Staging Package' })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({ visibility: 'private' })
    const res = await authed('post', `/api/entries/${id}/publish`, adminJar).send({
      visibility: 'public',
    })

    expect(res.body.data.entry.status).toBe('published')
  })

  it('future publishAt ke saath visibility ignore hoti hai — scheduled hi rehta hai', async () => {
    // Schedule ka poora point hai "us waqt public ho jaana"; private + scheduled ka koi
    // matlab nahi banta
    const created = await createEntry(adminJar, { title: 'Later' })

    const res = await authed(
      'post',
      `/api/entries/${created.body.data.entry.id}/publish`,
      adminJar,
    ).send({
      publishAt: new Date(Date.now() + 3600_000).toISOString(),
      visibility: 'private',
    })

    expect(res.body.data.entry.status).toBe('scheduled')
  })
})

// ── taxonomy list ka usage count (Slice 2 ki screen ke liye) ─────────────────

describe('taxonomy list ka usageCount', () => {
  it('har row pe batata hai kitni entries use kar rahi hain', async () => {
    // Ye aggregate pe chalta hai, N+1 queries pe nahi. Pehli baar likhte waqt `$unwind`
    // ka field reference bina `$` ke chala gaya tha aur poori list 500 deti thi — is
    // test ke bina wo sirf screen kholne pe pakda jaata
    const goa = (
      await authed('post', '/api/taxonomies', adminJar).send({
        type: 'destination',
        name: 'Goa',
      })
    ).body.data.taxonomy

    const kerala = (
      await authed('post', '/api/taxonomies', adminJar).send({
        type: 'destination',
        name: 'Kerala',
      })
    ).body.data.taxonomy

    await createEntry(adminJar, { title: 'Goa One', taxonomies: { destinations: [goa.id] } })
    await createEntry(adminJar, { title: 'Goa Two', taxonomies: { destinations: [goa.id] } })

    const res = await authed('get', '/api/taxonomies?type=destination', adminJar)
    const byId = Object.fromEntries(res.body.data.taxonomies.map((t) => [t.id, t.usageCount]))

    expect(res.status).toBe(200)
    expect(byId[goa.id]).toBe(2)
    expect(byId[kerala.id]).toBe(0)
  })

  it('trash me padi entry usageCount me nahi ginti', async () => {
    // Ye number client ko dikhta hai ("is destination pe 2 packages hain") — trash me
    // padi cheez uske liye maujood nahi hai. Delete ka guard alag hai aur wo trash bhi
    // ginta hai
    const goa = (
      await authed('post', '/api/taxonomies', adminJar).send({
        type: 'destination',
        name: 'Goa',
      })
    ).body.data.taxonomy

    const entry = (
      await createEntry(adminJar, { title: 'Goa One', taxonomies: { destinations: [goa.id] } })
    ).body.data.entry

    await authed('post', `/api/entries/${entry.id}/trash`, adminJar).send({})

    const res = await authed('get', '/api/taxonomies?type=destination', adminJar)

    expect(res.body.data.taxonomies[0].usageCount).toBe(0)
  })
})

// ── itinerary (Slice 4) ──────────────────────────────────────────────────────

describe('itinerary', () => {
  async function makeDestination(name) {
    const res = await authed('post', '/api/taxonomies', adminJar).send({
      type: 'destination',
      name,
    })
    return res.body.data.taxonomy
  }

  it('din save hote hain aur har din ko stable id milti hai', async () => {
    // Client ids na bheje to bhi zaroori hain — bina unke reorder pe collapse state
    // galat din pe chipak jaati hai (D-43 §5)
    const pb = await makeDestination('Port Blair')

    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        itinerary: [
          { title: 'Arrive Port Blair', overnightStayId: pb.id, meals: ['dinner'] },
          { title: 'Departure' },
        ],
      },
    })

    const days = res.body.data.entry.fields.itinerary

    expect(res.status).toBe(201)
    expect(days).toHaveLength(2)
    expect(days[0].id).toBeTruthy()
    expect(days[1].id).toBeTruthy()
    expect(days[0].id).not.toBe(days[1].id)
  })

  it('client ki bheji hui id kabhi overwrite nahi hoti', async () => {
    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { itinerary: [{ id: 'day-one', title: 'Arrive' }] },
    })

    expect(created.body.data.entry.fields.itinerary[0].id).toBe('day-one')

    const updated = await authed(
      'patch',
      `/api/entries/${created.body.data.entry.id}`,
      adminJar,
    ).send({
      version: 0,
      fields: { itinerary: [{ id: 'day-one', title: 'Arrive Kochi' }] },
    })

    expect(updated.body.data.entry.fields.itinerary[0].id).toBe('day-one')
  })

  it('defaults bhar jaate hain — sirf title zaroori hai', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { itinerary: [{ title: 'Day one' }] },
    })

    const day = res.body.data.entry.fields.itinerary[0]

    expect(day.meals).toEqual([])
    expect(day.highlights).toEqual([])
    expect(day.overnightStayId).toBeNull()
    expect(day.hotelCategory).toBeNull()
    expect(day.note).toBe('')
  })

  it('galat itinerary 400 deti hai — Mixed hone ke baawajood', async () => {
    // `fields` Mixed hai, par itinerary package ka sabse bada structured hissa hai aur
    // public page ka aadha render usi se banta hai
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { itinerary: [{ title: 'Day one', meals: ['brunch'] }] },
    })

    expect(res.status).toBe(400)
  })

  it('bina title ke din reject hota hai', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { itinerary: [{ overnightStayId: null }] },
    })

    expect(res.status).toBe(400)
  })

  it('itinerary ka text searchText me jaata hai', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        itinerary: [{ title: 'Radhanagar Beach sunset', highlights: ['Cellular Jail'] }],
      },
    })

    expect(res.status).toBe(201)

    for (const q of ['Radhanagar', 'Cellular']) {
      const found = await authed('get', `/api/entries?q=${q}`, adminJar)
      expect(found.body.data.entries).toHaveLength(1)
    }
  })

  it('baaki fields itinerary ke saath mit-te nahi', async () => {
    // `nights`/`days` bhi package ke fields hain — normalize karte waqt unhe chhoona
    // nahi chahiye
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { nights: 5, days: 6, itinerary: [{ title: 'Day one' }] },
    })

    expect(res.body.data.entry.fields.nights).toBe(5)
    expect(res.body.data.entry.fields.days).toBe(6)
  })

  it('jo type itinerary declare nahi karta wahan wo waise ki waisi jaati hai', async () => {
    // Page ka field set khaali hai — uspe itinerary ka validator nahi chalna chahiye
    const res = await createPage(adminJar, {
      title: 'About',
      fields: { itinerary: 'kuch bhi' },
    })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.fields.itinerary).toBe('kuch bhi')
  })
})
