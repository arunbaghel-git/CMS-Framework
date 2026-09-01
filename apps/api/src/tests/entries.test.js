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
import { AddOn, Hotel, Review, Transfer } from '../modules/master-lists/model.js'
import { PackageDefaults } from '../modules/package-defaults/model.js'
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
    /*
     * ⚠️ Master lists aur `packageDefaults` pehle **saaf hote hi nahi the** — ye file unhe
     * banati thi (add-ons, hotels) par kabhi hataati nahi thi, aur wo test se test tak bache
     * rehte the.
     *
     * Aaj tak wo chhupa raha kyunki har test sirf apne banaye hue item pe assert karta tha.
     * Reviews ke saath wo tootta: unka test **poori list** ka kram dekhta hai, aur rating ka
     * test dekhta hai ki kabhi na likhi gayi rating zero aati hai — pichhle test ki likhi hui
     * 4.9 wahan bachi rehti to wo test kabhi-kabhi fail hota, aur wajah bilkul dikhti nahi.
     */
    Hotel.deleteMany({}),
    AddOn.deleteMany({}),
    Transfer.deleteMany({}),
    Review.deleteMany({}),
    PackageDefaults.deleteMany({}),
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

// ── package ka field set (Slice 3, D-50 — `availability` D-54 me hata) ───────

describe('package content type ka shape', () => {
  const typeByKey = async (key) => ContentType.findOne({ key }).lean()

  it('package ke fields register ho chuke hain — Slice 3 se 5 tak', async () => {
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
      'pricing',
      'hotels',
      'addOns',
      'faqs',
      'bestFor',
      'ferriesNote',
      'featured',
      'seoSchema',
    ])
    expect(keys).not.toContain('overview')
  })

  it('bestFor ek line hai — chips nahi (D-55)', async () => {
    // Listing card pe wo `Best for <b>first-timers on a short break</b>` ki tarah dikhta
    // hai — ek line, chips nahi
    const pkg = await typeByKey('package')

    expect(pkg.fields.find((f) => f.key === 'bestFor').type).toBe('text')
  })

  it('package Destinations aur Package Type use karta hai, Pages koi nahi', async () => {
    expect((await typeByKey('package')).taxonomyTypes).toEqual(['destination', 'packageType'])
    expect((await typeByKey('post')).taxonomyTypes).toEqual(['category', 'tag'])
    expect((await typeByKey('page')).taxonomyTypes).toEqual([])
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
  it('bestFor save hota hai aur search me aata hai', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        shortDescription: 'Beaches aur ferries',
        nights: 5,
        days: 6,
        bestSeason: 'Oct – May',
        bestFor: 'first-timers on a short break',
      },
    })

    expect(res.status).toBe(201)
    expect(res.body.data.entry.fields.bestFor).toBe('first-timers on a short break')

    // searchText custom fields ka text bhi uthata hai — admin apne likhe shabd dhoondh sake
    const found = await authed('get', '/api/entries?q=first-timers', adminJar)
    expect(found.body.data.entries).toHaveLength(1)
  })
})

// ── list ke tabs ke counts (Slice 3) ─────────────────────────────────────────

describe('GET /api/entries/counts', () => {
  it('chaaron tab ke number ek hi call me deta hai', async () => {
    // Alag-alag requests ka matlab hota alag-alag waqt ke jawab: ek tab 58 dikhata aur
    // doosra 57, aur wo farq kabhi samajh nahi aata
    const a = (await createEntry(adminJar, { title: 'Published One' })).body.data.entry
    const c = (await createEntry(adminJar, { title: 'Trashed One' })).body.data.entry
    await createEntry(adminJar, { title: 'Draft One' })

    await authed('post', `/api/entries/${a.id}/publish`, adminJar).send({})
    await authed('post', `/api/entries/${c.id}/trash`, adminJar).send({})

    const res = await authed('get', '/api/entries/counts?type=package', adminJar)
    const { counts } = res.body.data

    // all me trash NAHI hai — "All (64)" ke baad "Trash (1)" 64 ko 65 nahi banata
    expect(counts.all).toBe(2)
    expect(counts.published).toBe(1)
    expect(counts.draft).toBe(1)
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
  it('chuni hui saari rows pe chalta hai', async () => {
    const a = (await createEntry(adminJar, { title: 'One' })).body.data.entry
    const b = (await createEntry(adminJar, { title: 'Two' })).body.data.entry

    const res = await authed('post', '/api/entries/bulk', adminJar).send({
      ids: [a.id, b.id],
      action: 'feature',
    })

    expect(res.body.data.updated).toBe(2)
    expect((await Entry.findById(a.id).lean()).fields.featured).toBe(true)
    expect((await Entry.findById(b.id).lean()).fields.featured).toBe(true)
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
      action: 'feature',
    })

    expect(res.body.data.updated).toBe(1)
    expect(res.body.data.failed).toHaveLength(1)
    expect((await Entry.findById(theirs.id).lean()).fields?.featured).toBeFalsy()
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
    expect(day.overnightStayId).toBeNull()
    expect(day.note).toBe('')

    // `hotelCategory` aur `highlights` dono D-64 me hate — bheje jaayein to bhi nahi bachte
    expect(day.hotelCategory).toBeUndefined()
    expect(day.highlights).toBeUndefined()
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

// ── public resolve (Slice 7 ki shuruaat) ─────────────────────────────────────

describe('pricing + hotels (Slice 5)', () => {
  async function makeDestination(name) {
    const res = await authed('post', '/api/taxonomies', adminJar).send({
      type: 'destination',
      name,
    })
    return res.body.data.taxonomy
  }

  async function makeHotel(
    destinationId,
    category,
    name,
    room = 'Deluxe, twin sharing',
    note = '',
  ) {
    const res = await authed('post', '/api/hotels', adminJar).send({
      destinationId,
      category,
      name,
      room,
      note,
    })
    return res.body.data.item
  }

  it('pricing save hoti hai aur defaults khud bhar jaate hain', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { pricing: { categoryPricing: [{ category: 'standard', priceFrom: 24999 }] } },
    })

    const pricing = res.body.data.entry.fields.pricing

    expect(res.status).toBe(201)
    expect(pricing.categoryPricing[0].strikePrice).toBeNull()
    // Basis, GST, advance aur per-category note — chaaron hata diye gaye (D-57)
    expect(pricing.priceBasis).toBeUndefined()
    expect(pricing.gstPercent).toBeUndefined()
    expect(pricing.categoryPricing[0].note).toBeUndefined()
  })

  it('khaali daam wali category save hoti hai, par public page pe nahi jaati', async () => {
    // Chaaron rows editor me hamesha hoti hain; khaali chhodna hi "ye category is package
    // pe milti hi nahi" kehne ka tareeka hai (D-57)
    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        pricing: {
          categoryPricing: [
            { category: 'standard', priceFrom: 24999 },
            { category: 'deluxe' },
            { category: 'premium', priceFrom: null },
          ],
        },
      },
    })

    expect(created.status).toBe(201)
    expect(created.body.data.entry.fields.pricing.categoryPricing).toHaveLength(3)

    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')
    const { categoryPricing } = res.body.data.entry.pricing

    expect(categoryPricing).toHaveLength(1)
    expect(categoryPricing[0].category).toBe('standard')
  })

  it('public categoryPricing sasti se mehngi ke kram me aati hai', async () => {
    // Theme ko sort nahi karna padta — aur upar ka "from" daam aur pehla tab hamesha ek
    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        pricing: {
          categoryPricing: [
            { category: 'luxury', priceFrom: 49999 },
            { category: 'standard', priceFrom: 24999 },
            { category: 'deluxe', priceFrom: 29499 },
          ],
        },
      },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')

    expect(res.body.data.entry.pricing.categoryPricing.map((r) => r.category)).toEqual([
      'standard',
      'deluxe',
      'luxury',
    ])
  })

  it('currency aur basis package pe hain hi nahi — bheje jaayein to bhi (D-56, D-57)', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        pricing: {
          currency: 'USD',
          priceBasis: 'perCouple',
          advancePercent: 25,
          categoryPricing: [],
        },
      },
    })

    expect(res.body.data.entry.fields.pricing).toEqual({ categoryPricing: [] })
  })

  it('ek category do baar price nahi ho sakti', async () => {
    // Duplicate ka nateeja chup hota hai: catbar me ek hi tab do baar, aur page ka "from"
    // daam un dono me se ek chun leta hai
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        pricing: {
          categoryPricing: [
            { category: 'deluxe', priceFrom: 29499 },
            { category: 'deluxe', priceFrom: 31999 },
          ],
        },
      },
    })

    expect(res.status).toBe(422)
  })

  it('khaali daam wali row pe strike-through ka check nahi lagta', async () => {
    // Warna chaaron rows me se ek adhoori bhari ho to poora package save hi na ho
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { pricing: { categoryPricing: [{ category: 'deluxe', strikePrice: 35999 }] } },
    })

    expect(res.status).toBe(201)
  })

  it('kaata hua daam asli daam se bada hona chahiye', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        pricing: {
          categoryPricing: [{ category: 'standard', priceFrom: 24999, strikePrice: 19999 }],
        },
      },
    })

    expect(res.status).toBe(422)
  })

  it('galat category 400 deti hai — fields Mixed hone ke baawajood', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { pricing: { categoryPricing: [{ category: 'gold', priceFrom: 100 }] } },
    })

    expect(res.status).toBe(400)
  })

  it('har hotel row ko stable id milti hai', async () => {
    const pb = await makeDestination('Port Blair')
    const hotel = await makeHotel(pb.id, 'standard', 'City Hotel')

    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { hotels: [{ destinationId: pb.id, category: 'standard', hotelId: hotel.id }] },
    })

    expect(res.body.data.entry.fields.hotels[0].id).toBeTruthy()
  })

  it('anjaan hotel ki id save nahi hoti', async () => {
    const pb = await makeDestination('Port Blair')

    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        hotels: [
          { destinationId: pb.id, category: 'standard', hotelId: '507f1f77bcf86cd799439011' },
        ],
      },
    })

    expect(res.status).toBe(422)
  })

  it('destination ki jagah kisi aur taxonomy ki id nahi chal sakti', async () => {
    // Wahi invariant jo taxonomy refs pe hai — bachav reference BANNE se pehle
    const pb = await makeDestination('Port Blair')
    const hotel = await makeHotel(pb.id, 'standard', 'City Hotel')

    const honeymoon = (
      await authed('post', '/api/taxonomies', adminJar).send({
        type: 'packageType',
        name: 'Honeymoon',
      })
    ).body.data.taxonomy

    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        hotels: [{ destinationId: honeymoon.id, category: 'standard', hotelId: hotel.id }],
      },
    })

    expect(res.status).toBe(422)
  })

  it('ek destination pe ek category ka ek hi hotel', async () => {
    const pb = await makeDestination('Port Blair')
    const a = await makeHotel(pb.id, 'standard', 'City Hotel')
    const b = await makeHotel(pb.id, 'standard', 'Bay Hotel')

    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        hotels: [
          { destinationId: pb.id, category: 'standard', hotelId: a.id },
          { destinationId: pb.id, category: 'standard', hotelId: b.id },
        ],
      },
    })

    expect(res.status).toBe(422)
  })

  it('guard update pe bhi lagta hai, sirf create pe nahi', async () => {
    const pb = await makeDestination('Port Blair')
    const created = await createEntry(adminJar, { title: 'Andaman' })

    const res = await authed('patch', `/api/entries/${created.body.data.entry.id}`, adminJar).send({
      version: 0,
      fields: {
        hotels: [
          { destinationId: pb.id, category: 'standard', hotelId: '507f1f77bcf86cd799439011' },
        ],
      },
    })

    expect(res.status).toBe(422)
  })

  it('hotels table apne aap bharti hai — package pe kuch chuna hi na ho to bhi', async () => {
    // D-60: rows itinerary se, categories pricing se, aur hotel master list se. Panel me
    // kuch na karo to bhi page pe table poori bharti hai
    const pb = await makeDestination('Port Blair')
    const hav = await makeDestination('Havelock')
    await makeHotel(pb.id, 'standard', 'City Hotel', 'Deluxe, twin sharing')
    await makeHotel(hav.id, 'standard', 'Symphony Palms', 'Sea view')

    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        itinerary: [
          { title: 'Day 1', overnightStayId: pb.id },
          { title: 'Day 2', overnightStayId: hav.id },
        ],
        pricing: { categoryPricing: [{ category: 'standard', priceFrom: 24999 }] },
        // hotels[] jaan-boojh kar khaali — kuch chuna hi nahi gaya
      },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')
    const { hotels } = res.body.data.entry

    expect(hotels.map((h) => h.name)).toEqual(['City Hotel', 'Symphony Palms'])
    expect(hotels[0].room).toBe('Deluxe, twin sharing')
  })

  it('package ka override us jagah ka auto hotel hata deta hai', async () => {
    const pb = await makeDestination('Port Blair')
    // Naam ke kram me "Bay Hotel" pehle aata hai, isliye auto wahi chunega
    await makeHotel(pb.id, 'standard', 'Bay Hotel')
    const city = await makeHotel(pb.id, 'standard', 'City Hotel')

    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        itinerary: [{ title: 'Day 1', overnightStayId: pb.id }],
        pricing: { categoryPricing: [{ category: 'standard', priceFrom: 24999 }] },
        hotels: [{ destinationId: pb.id, category: 'standard', hotelId: city.id }],
      },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')
    const { hotels } = res.body.data.entry

    expect(hotels).toHaveLength(1)
    expect(hotels[0].name).toBe('City Hotel')
  })

  it('jis jagah package rukta hi nahi, uski row table me nahi aati', async () => {
    // Rows itinerary se banti hain (D-58) — Neil ka hotel master list me hai, par package
    // wahan rukta hi nahi
    const pb = await makeDestination('Port Blair')
    const neil = await makeDestination('Neil Island')
    await makeHotel(pb.id, 'standard', 'City Hotel')
    await makeHotel(neil.id, 'standard', 'Beach Resort')

    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        itinerary: [{ title: 'Day 1', overnightStayId: pb.id }],
        pricing: { categoryPricing: [{ category: 'standard', priceFrom: 24999 }] },
      },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')
    const { hotels } = res.body.data.entry

    expect(hotels).toHaveLength(1)
    expect(hotels[0].destination.name).toBe('Port Blair')
  })

  it('jis category ka daam nahi bhara, uski table bhi nahi banti', async () => {
    // Categories pricing se aati hain (D-57 §1) — Deluxe ka hotel maujood hone ke baawajood
    const pb = await makeDestination('Port Blair')
    await makeHotel(pb.id, 'standard', 'City Hotel')
    await makeHotel(pb.id, 'deluxe', 'Marine Hill Hotel')

    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        itinerary: [{ title: 'Day 1', overnightStayId: pb.id }],
        pricing: { categoryPricing: [{ category: 'standard', priceFrom: 24999 }] },
      },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')
    const { hotels } = res.body.data.entry

    expect(hotels.map((h) => h.category)).toEqual(['standard'])
  })

  it('public payload me daam aur hotel resolve ho kar jaate hain', async () => {
    const pb = await makeDestination('Port Blair')
    const hav = await makeDestination('Havelock')
    const cityHotel = await makeHotel(
      pb.id,
      'standard',
      'City Hotel',
      'Deluxe, twin sharing',
      'Near Aberdeen Bazaar',
    )
    const palms = await makeHotel(hav.id, 'standard', 'Symphony Palms', 'Sea view, twin')

    const created = await createEntry(adminJar, {
      title: 'Andaman 5 Nights',
      fields: {
        // Port Blair do baar — raat 1 aur raat 4. Table me wo EK row hai, do nahi
        itinerary: [
          { title: 'Day 1', overnightStayId: pb.id },
          { title: 'Day 2', overnightStayId: hav.id },
          { title: 'Day 3', overnightStayId: hav.id },
          { title: 'Day 4', overnightStayId: pb.id },
          { title: 'Day 5' },
        ],
        pricing: {
          categoryPricing: [
            { category: 'deluxe', priceFrom: 29499, strikePrice: 35999 },
            { category: 'standard', priceFrom: 24999, strikePrice: 31999 },
          ],
        },
        hotels: [
          { destinationId: pb.id, category: 'standard', hotelId: cityHotel.id },
          { destinationId: hav.id, category: 'standard', hotelId: palms.id },
        ],
        // `deluxe` ka koi hotel master list me nahi hai — us category ki table nahi banti
      },
    })

    await authed('post', '/api/entries/' + created.body.data.entry.id + '/publish', adminJar).send(
      {},
    )

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman-5-nights')
    const { entry } = res.body.data

    // Page ke upar ka daam sabse SASTI category se aata hai, list ke kram se nahi
    expect(entry.pricing.from.category).toBe('standard')
    expect(entry.pricing.from.priceFrom).toBe(24999)

    // Nights itinerary se derive hoti hai, store kahin nahi hoti
    const portBlair = entry.hotels.find((h) => h.destination.name === 'Port Blair')
    expect(portBlair.nights).toBe(2)
    expect(portBlair.name).toBe('City Hotel')
    // Room hotel ke apne record se aata hai (D-53 §3)
    expect(portBlair.room).toBe('Deluxe, twin sharing')
    // Note bhi hotel ke record se — pehle wo har package pe likha jaata tha (D-57)
    expect(portBlair.note).toBe('Near Aberdeen Bazaar')
  })

  it('hotel delete ho jaaye to us row ka khaali cell public page pe nahi jaata', async () => {
    // D-42 §2 wala invariant, ek darja aage: adhoori row payload me aati hi nahi
    const pb = await makeDestination('Port Blair')
    const hotel = await makeHotel(pb.id, 'standard', 'City Hotel')

    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        itinerary: [{ title: 'Day 1', overnightStayId: pb.id }],
        pricing: { categoryPricing: [{ category: 'standard', priceFrom: 24999 }] },
        hotels: [{ destinationId: pb.id, category: 'standard', hotelId: hotel.id }],
      },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    await authed('delete', `/api/hotels/${hotel.id}`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')

    expect(res.status).toBe(200)
    expect(res.body.data.entry.hotels).toEqual([])
  })
})

describe('packageDefaults ka payload', () => {
  it('priceNote ab payload me nahi jaata — wo line theme me static hai (Q-9)', async () => {
    // Pehle ye `packageDefaults.priceNote` thi (D-57 §3). Client ne field hata diya kyunki
    // wo har package pe, har category pe bilkul wahi rehti hai. Ye test isliye hai ki wo
    // key chupke se wapas na aa jaaye — tab theme me static line aur payload ki line do
    // alag source ban jaate, aur ek din wo alag ho jaate
    const res = await request(app).get('/api/public/package-defaults')

    expect(res.status).toBe(200)
    expect(res.body.data.packageDefaults.priceNote).toBeUndefined()
  })

  /**
   * Reviews aur rating dono yahin se aate hain, entry ke payload se nahi — wo **universal**
   * hain (client, 1 Sep) aur unka cache tag `type:package` hai.
   *
   * ⚠️ Ye teen test us bug class ke liye hain jo is repo me teen baar ho chuki hai: field
   * ban jaata hai, admin me bhara dikhta hai, aur **payload me jaata hi nahi** — page pe
   * kuch nahi aata aur kahin koi error nahi (D-64 ka transfer duration, D-65 ka
   * `cancellationText`, aur D-68 ka section guard).
   */
  it('reviews public payload me jaati hain — nayi trip pehle', async () => {
    for (const month of ['2025-11', '2026-06']) {
      await authed('post', '/api/reviews', adminJar).send({
        rating: 5,
        month,
        text: 'Ferries sorted before we landed.',
        name: month,
      })
    }

    const res = await request(app).get('/api/public/package-defaults')
    const { reviews } = res.body.data.packageDefaults

    expect(reviews.map((r) => r.month)).toEqual(['2026-06', '2025-11'])
    expect(reviews[0]).toMatchObject({ rating: 5, name: '2026-06' })
  })

  it('rating payload me jaati hai — reviews se gini nahi jaati (§9 #8)', async () => {
    // 412 trips ka aankda saalon ka hai; do likhi hui reviews us number ko nahi banatin
    await authed('post', '/api/reviews', adminJar).send({
      rating: 4,
      text: 'Good trip.',
      name: 'A',
    })
    await authed('patch', '/api/package-defaults', adminJar).send({
      rating: { value: 4.9, count: 412 },
    })

    const res = await request(app).get('/api/public/package-defaults')

    expect(res.body.data.packageDefaults.rating).toEqual({ value: 4.9, count: 412 })
  })

  it('rating kabhi likhi hi na ho to zero jaati hai — theme wahan se line hata deta hai', async () => {
    // `0` ka matlab "dikhani hi nahi" hai (D-30). Purane document me ye key hai hi nahi,
    // aur dono ka natija ek hi hona chahiye — isiliye migration 016 ne data nahi chhua
    const res = await request(app).get('/api/public/package-defaults')

    expect(res.body.data.packageDefaults.rating).toEqual({ value: 0, count: 0 })
  })
})

describe('add-ons — package ka chunav (§1.4, D-64)', () => {
  async function makeAddOn(name) {
    const res = await authed('post', '/api/add-ons', adminJar).send({ name, price: '3500 pp' })
    return res.body.data.item
  }

  it('chune hue add-ons public payload me resolve ho kar jaate hain', async () => {
    // ⚠️ Ye field do baar ja chuka hai aur wapas aaya: D-61 me global, D-64 me phir chunav.
    // Aaj ka niyam wahi hai jo spec §1.4 me likha tha — poori list kabhi nahi chhapti
    const snorkel = await makeAddOn('Elephant Beach snorkelling')
    await makeAddOn('Sea walk')

    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { addOns: [snorkel.id] },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')
    const { addOns } = res.body.data.entry

    // Sirf chuna hua — "Sea walk" list me hone ke baawajood nahi
    expect(addOns).toHaveLength(1)
    expect(addOns[0].name).toBe('Elephant Beach snorkelling')
    expect(addOns[0].price).toBe('3500 pp')
  })

  it('anjaan add-on chuna nahi ja sakta', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { addOns: ['507f1f77bcf86cd799439011'] },
    })

    expect(res.status).toBe(422)
  })

  it('packageDefaults me add-ons nahi jaate — wo package ka chunav hai', async () => {
    await makeAddOn('Scuba try-dive')

    const res = await request(app).get('/api/public/package-defaults')

    expect(res.body.data.packageDefaults.addOns).toBeUndefined()
  })
})

describe('similar itineraries (§9 #15 — apne aap)', () => {
  /** Publish tak le jaane wala chhota helper — similar sirf publicly visible package leta hai. */
  async function publishedPackage(title, fields) {
    const created = await createEntry(adminJar, { title, fields })
    const { id } = created.body.data.entry
    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})

    return id
  }

  const resolve = (slug) => request(app).get(`/api/public/resolve?path=/packages/${slug}`)

  it('wahi nights AUR days wale package aate hain — khud ko chhod kar', async () => {
    await publishedPackage('Andaman A', { nights: 5, days: 6 })
    await publishedPackage('Andaman B', { nights: 5, days: 6 })
    await publishedPackage('Andaman C', { nights: 5, days: 6 })

    const res = await resolve('andaman-a')
    const { similar } = res.body.data.entry

    expect(similar.map((s) => s.title).sort()).toEqual(['Andaman B', 'Andaman C'])
  })

  it('sirf days match karne se similar nahi banta', async () => {
    // Client ne dono maange the (5N/6D = 5N/6D). 4N/6D "same days" hai par same trip nahi
    await publishedPackage('Andaman A', { nights: 5, days: 6 })
    await publishedPackage('Andaman D', { nights: 4, days: 6 })

    const res = await resolve('andaman-a')

    expect(res.body.data.entry.similar).toEqual([])
  })

  it('bina publish kiya package similar me nahi aata', async () => {
    await publishedPackage('Andaman A', { nights: 5, days: 6 })
    await createEntry(adminJar, { title: 'Andaman Draft', fields: { nights: 5, days: 6 } })

    const res = await resolve('andaman-a')

    expect(res.body.data.entry.similar).toEqual([])
  })

  it('jis package pe nights/days likhe hi nahi, uske similar khaali rehte hain', async () => {
    // Bina guard ke `null === null` har adhoore package ko doosre ka similar bana deta
    await publishedPackage('Andaman A', {})
    await publishedPackage('Andaman B', {})

    const res = await resolve('andaman-a')

    expect(res.body.data.entry.similar).toEqual([])
  })

  it('card ka daam sabse sasti category se derive hota hai', async () => {
    await publishedPackage('Andaman A', { nights: 5, days: 6 })
    await publishedPackage('Andaman B', {
      nights: 5,
      days: 6,
      pricing: {
        categoryPricing: [
          { category: 'deluxe', priceFrom: 29499 },
          { category: 'standard', priceFrom: 24999, strikePrice: 31999 },
        ],
      },
    })

    const res = await resolve('andaman-a')
    const [card] = res.body.data.entry.similar

    expect(card.from).toMatchObject({ category: 'standard', priceFrom: 24999, strikePrice: 31999 })
  })
})

describe('FAQs', () => {
  it('har FAQ ko stable id milti hai', async () => {
    // Wahi wajah jo itinerary ke din pe hai — bina id ke reorder pe khuli hui row galat
    // FAQ pe chipak jaati hai (D-43 §5)
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        faqs: [
          { question: 'Which ferry class is included?', answer: 'Base class.' },
          { question: 'Can I swap Neil for Baratang?' },
        ],
      },
    })

    const faqs = res.body.data.entry.fields.faqs

    expect(res.status).toBe(201)
    expect(faqs[0].id).toBeTruthy()
    expect(faqs[1].id).toBeTruthy()
    expect(faqs[0].id).not.toBe(faqs[1].id)
    expect(faqs[1].answer).toBe('')
  })

  it('client ki bheji hui id kabhi overwrite nahi hoti', async () => {
    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { faqs: [{ id: 'faq-one', question: 'Ferry class?' }] },
    })

    const updated = await authed(
      'patch',
      `/api/entries/${created.body.data.entry.id}`,
      adminJar,
    ).send({
      version: 0,
      fields: { faqs: [{ id: 'faq-one', question: 'Which ferry class?' }] },
    })

    expect(updated.body.data.entry.fields.faqs[0].id).toBe('faq-one')
  })

  it('bina sawaal ki FAQ 400 deti hai — fields Mixed hone ke baawajood', async () => {
    const res = await createEntry(adminJar, {
      title: 'Andaman',
      fields: { faqs: [{ answer: 'Jawab hai par sawaal nahi' }] },
    })

    expect(res.status).toBe(400)
  })

  it('public payload me FAQs jaisi ki waisi jaati hain', async () => {
    const created = await createEntry(adminJar, {
      title: 'Andaman',
      fields: {
        faqs: [{ question: 'Which ferry class is included?', answer: 'Base class, included.' }],
      },
    })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve?path=/packages/andaman')
    const { faqs } = res.body.data.entry

    expect(faqs).toHaveLength(1)
    expect(faqs[0].question).toBe('Which ferry class is included?')
    expect(faqs[0].answer).toBe('Base class, included.')
  })
})

describe('GET /api/public/resolve', () => {
  const resolve = (path) => request(app).get(`/api/public/resolve?path=${encodeURIComponent(path)}`)

  async function publishedPackage(overrides = {}) {
    const created = await createEntry(adminJar, { title: 'Andaman 5 Nights', ...overrides })
    const { id } = created.body.data.entry

    await authed('post', `/api/entries/${id}/publish`, adminJar).send({})

    return id
  }

  it('published package bina auth ke resolve hota hai', async () => {
    await publishedPackage()

    const res = await resolve('/packages/andaman-5-nights')

    expect(res.status).toBe(200)
    expect(res.body.data.kind).toBe('entry')
    expect(res.body.data.entry.title).toBe('Andaman 5 Nights')
  })

  it('admin-only fields public payload me kabhi nahi jaate (R10)', async () => {
    await publishedPackage()

    const { entry } = (await resolve('/packages/andaman-5-nights')).body.data

    // `searchText` sirf safai ki baat nahi — usme poora flattened text hota hai aur wo
    // payload ko lagbhag do guna kar deta hai, jabki render me kabhi use nahi hota
    for (const key of ['version', 'deletedAt', 'searchText', 'authorId', 'templateId']) {
      expect(entry[key]).toBeUndefined()
    }
  })

  it('draft resolve nahi hota — 404', async () => {
    await createEntry(adminJar, { title: 'Chhupa Hua' })

    expect((await resolve('/packages/chhupa-hua')).status).toBe(404)
  })

  it('private published hone ke baawajood public pe nahi dikhta', async () => {
    // `private` = published, par sirf logged-in user ko (02-ARCHITECTURE §5). Ye endpoint
    // bina auth ke hai
    const created = await createEntry(adminJar, { title: 'Staging Package' })
    await authed('post', `/api/entries/${created.body.data.entry.id}/publish`, adminJar).send({
      visibility: 'private',
    })

    expect((await resolve('/packages/staging-package')).status).toBe(404)
  })

  it('scheduled jiska waqt aa gaya wo dikhta hai — cron band ho to bhi', async () => {
    // Self-healing (R2): `isPubliclyVisible` khud `scheduled && publishAt <= now` ko
    // published maanti hai
    const created = await createEntry(adminJar, { title: 'Due Package' })
    await Entry.updateOne(
      { _id: created.body.data.entry.id },
      { $set: { status: 'scheduled', publishAt: new Date(Date.now() - 1000) } },
    )

    expect((await resolve('/packages/due-package')).status).toBe(200)
  })

  it('slug badal jaaye to purana path redirect deta hai, 404 nahi', async () => {
    const id = await publishedPackage()
    const current = await Entry.findById(id).lean()

    await authed('patch', `/api/entries/${id}`, adminJar).send({
      version: current.version,
      slug: 'andaman-5n',
    })

    const res = await resolve('/packages/andaman-5-nights')

    expect(res.status).toBe(200)
    expect(res.body.data.kind).toBe('redirect')
    expect(res.body.data.to).toBe('/packages/andaman-5n')
    expect(res.body.data.statusCode).toBe(301)
  })

  it('references resolve ho kar jaate hain — theme ko id se naam nahi dhoondhna padta', async () => {
    const goa = (
      await authed('post', '/api/taxonomies', adminJar).send({ type: 'destination', name: 'Goa' })
    ).body.data.taxonomy

    const ferry = (
      await authed('post', '/api/transfers', adminJar).send({ name: 'Ferry', icon: 'ferry' })
    ).body.data.item

    await publishedPackage({
      taxonomies: { destinations: [goa.id] },
      fields: {
        itinerary: [
          { title: 'Day 1', overnightStayId: goa.id, transferId: ferry.id, transferNote: '90 min' },
        ],
      },
    })

    const { entry } = (await resolve('/packages/andaman-5-nights')).body.data

    expect(entry.destinations).toEqual([{ id: goa.id, name: 'Goa', slug: 'goa' }])
    expect(entry.itinerary[0].stay.name).toBe('Goa')
    expect(entry.itinerary[0].transfer).toMatchObject({ name: 'Ferry', icon: 'ferry' })
    expect(entry.itinerary[0].transferNote).toBe('90 min')
  })

  it('route strip server pe banti hai — theme use derive nahi karta', async () => {
    const [pb, hv] = await Promise.all(
      ['Port Blair', 'Havelock'].map(async (name) => {
        const res = await authed('post', '/api/taxonomies', adminJar).send({
          type: 'destination',
          name,
        })
        return res.body.data.taxonomy
      }),
    )

    await publishedPackage({
      taxonomies: { destinations: [pb.id, hv.id] },
      fields: {
        itinerary: [
          { title: 'Day 1', overnightStayId: pb.id },
          { title: 'Day 2', overnightStayId: hv.id },
          { title: 'Day 3', overnightStayId: hv.id },
          { title: 'Day 4' },
        ],
      },
    })

    const { entry } = (await resolve('/packages/andaman-5-nights')).body.data

    expect(entry.routeStrip).toHaveLength(2)
    expect(entry.routeStrip[0]).toMatchObject({ from: 1, to: 1, nights: 1 })
    expect(entry.routeStrip[0].stay.name).toBe('Port Blair')
    expect(entry.routeStrip[1]).toMatchObject({ from: 2, to: 3, nights: 2 })
    expect(entry.routeStrip[1].stay.name).toBe('Havelock')
  })

  it('anjaan path pe 404, aur bina path ke 400', async () => {
    expect((await resolve('/kuch-bhi')).status).toBe(404)
    expect((await request(app).get('/api/public/resolve')).status).toBe(400)
  })
})
