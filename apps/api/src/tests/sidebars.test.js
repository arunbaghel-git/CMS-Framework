import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { ContentType } from '../modules/content-types/model.js'
import { Entry } from '../modules/entries/model.js'
import { ensureBuiltInContentTypes } from '../modules/content-types/service.js'
import { Enquiry, Form } from '../modules/forms/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { Settings } from '../modules/settings/model.js'
import { Sidebar } from '../modules/sidebars/model.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Sidebars ka integration test — asli Mongo pe (D-88).
 *
 * Chaar cheezein sabse zaroori hain, aur chaaron ke peeche is repo ki ek pakdi hui galti hai:
 *
 *   1. **HTML widget write pe sanitize hota hai** (R20) — bhoolne pe content girta nahi,
 *      *bina safai ke bach* jaata hai
 *   2. **Delete pe koi guard nahi** (D-79) — aur uske baad page pe sidebar *render hi nahi hoti*
 *   3. **Payload me `sidebarId` kabhi nahi jaata**, resolve hua maal jaata hai
 *   4. **Draft ya delete ho chuka form gir jaata hai** (D-30) — khaali dabba nahi banta
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

const createSidebar = (jar, body) => authed('post', '/api/sidebars', jar).send(body)

/** Ek chalta hua form — sidebar ka `enquiryForm` widget isi ko chunta hai. */
async function makeForm({ status = 'active', emailTo = 'sales@test.com' } = {}) {
  const doc = await Form.create({
    siteId: 'default',
    name: 'Package enquiry',
    emailTo,
    status,
    placement: 'none',
    fields: [{ key: 'name', label: 'Name', type: 'text', show: true, required: true }],
  })

  return String(doc._id)
}

/**
 * Ek published tour page jo di hui sidebar use karta hai — aur uska resolve kiya hua payload.
 */
async function resolvedPage({ sidebar = 'right', sidebarId = '' } = {}) {
  const doc = await Entry.create({
    siteId: 'default',
    locale: 'en',
    type: 'tourPage',
    title: 'Andaman tour packages',
    slug: 'andaman-tour-packages',
    path: '/andaman-tour-packages',
    status: 'published',
    publishedAt: new Date(),
    fields: { sidebar, sidebarId },
    content: { blocks: [] },
  })

  const res = await request(app).get('/api/public/resolve').query({ path: doc.path })

  return res.body.data.entry
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
    Settings.deleteMany({}),
    Sidebar.deleteMany({}),
    Entry.deleteMany({}),
    ContentType.deleteMany({}),
    Form.deleteMany({}),
    Enquiry.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()
  await ensureBuiltInContentTypes()

  for (const [username, email, role] of [
    ['boss', 'admin@test.com', 'admin'],
    ['ed', 'ed@test.com', 'editor'],
    ['auth', 'author@test.com', 'author'],
  ]) {
    await createUser({ username, name: username, email, role, password: PASSWORD })
  }

  adminJar = await loginAs('admin@test.com')
  editorJar = await loginAs('ed@test.com')
  authorJar = await loginAs('author@test.com')
})

describe('POST /api/sidebars', () => {
  it('sidebar banata hai aur har widget ko stable id deta hai', async () => {
    const res = await createSidebar(adminJar, {
      name: 'Tour sidebar',
      widgets: [{ type: 'talkToPlanner', props: { heading: 'Talk to us' } }],
    })

    expect(res.status).toBe(201)
    expect(res.body.data.sidebar.name).toBe('Tour sidebar')
    // `id` input me optional hai — server bhar deta hai (wahi jodi jo blocks/faqs pe hai)
    expect(res.body.data.sidebar.widgets[0].id).toBeTruthy()
    expect(res.body.data.sidebar.version).toBe(0)
  })

  it('naam ke bina 400 — dropdown me client isi naam se chunta hai', async () => {
    expect((await createSidebar(adminJar, { name: '', widgets: [] })).status).toBe(400)
  })

  it('anjaan widget type 400 deta hai — list fixed hai, blocks ki tarah khuli nahi', async () => {
    const res = await createSidebar(adminJar, {
      name: 'X',
      widgets: [{ type: 'packageList', props: {} }],
    })

    expect(res.status).toBe(400)
  })

  it('editor bana sakta hai, author nahi', async () => {
    expect((await createSidebar(editorJar, { name: 'A', widgets: [] })).status).toBe(201)
    expect((await createSidebar(authorJar, { name: 'B', widgets: [] })).status).toBe(403)
  })

  it('author padh sakta hai — uske bina page ka dropdown khaali rehta', async () => {
    await createSidebar(adminJar, { name: 'A', widgets: [] })

    const res = await authed('get', '/api/sidebars', authorJar)

    expect(res.status).toBe(200)
    expect(res.body.data.sidebars).toHaveLength(1)
  })

  it('bina login ke 401', async () => {
    expect((await request(app).post('/api/sidebars').send({ name: 'X' })).status).toBe(401)
  })
})

describe('HTML widget ki safai (R20)', () => {
  it('script write pe hi hat jaata hai — render pe kabhi nahi', async () => {
    const res = await createSidebar(adminJar, {
      name: 'Sidebar',
      widgets: [
        {
          type: 'html',
          props: { heading: 'Packages', html: '<p>Hi</p><script>alert(1)</script>' },
        },
      ],
    })

    expect(res.status).toBe(201)

    /**
     * ⚠️ Jaanch **DB pe** hai, response pe nahi.
     *
     * `updatePackageDefaults()` wala jaal chaar baar isi wajah se chhoot gaya tha: API 200
     * deti thi, admin "Saved." dikhata tha, aur DB me kuch aur pada rehta tha.
     */
    const doc = await Sidebar.findById(res.body.data.sidebar.id).lean()

    expect(doc.widgets[0].props.html).not.toContain('script')
    expect(doc.widgets[0].props.html).toContain('Hi')
  })

  it('update pe bhi saaf hoti hai, sirf create pe nahi', async () => {
    const created = await createSidebar(adminJar, { name: 'S', widgets: [] })
    const id = created.body.data.sidebar.id

    await authed('patch', `/api/sidebars/${id}`, adminJar).send({
      widgets: [{ type: 'html', props: { html: '<p onclick="steal()">x</p>' } }],
    })

    const doc = await Sidebar.findById(id).lean()

    expect(doc.widgets[0].props.html).not.toContain('onclick')
  })
})

describe('PATCH /api/sidebars/:id', () => {
  it('version mismatch pe 409 — do admin ka ek saath save kisi ka kaam nahi mitata', async () => {
    const created = await createSidebar(adminJar, { name: 'S', widgets: [] })
    const id = created.body.data.sidebar.id

    await authed('patch', `/api/sidebars/${id}`, adminJar).send({ name: 'Pehla', version: 0 })
    const second = await authed('patch', `/api/sidebars/${id}`, adminJar).send({
      name: 'Doosra',
      version: 0,
    })

    expect(second.status).toBe(409)
  })

  it('widgets ka kram wahi rehta hai jo client ne bheja', async () => {
    const created = await createSidebar(adminJar, { name: 'S', widgets: [] })
    const id = created.body.data.sidebar.id

    const res = await authed('patch', `/api/sidebars/${id}`, adminJar).send({
      widgets: [
        { type: 'html', props: { html: '<p>a</p>' } },
        { type: 'talkToPlanner', props: {} },
        { type: 'enquiryForm', props: { formId: 'x' } },
      ],
    })

    expect(res.body.data.sidebar.widgets.map((w) => w.type)).toEqual([
      'html',
      'talkToPlanner',
      'enquiryForm',
    ])
  })

  it('bekaar id pe 404, 500 nahi', async () => {
    expect((await authed('patch', '/api/sidebars/kachra', adminJar).send({})).status).toBe(404)
  })
})

describe('DELETE /api/sidebars/:id', () => {
  it('delete hamesha chalta hai — chahe koi page use karta ho (D-79)', async () => {
    const created = await createSidebar(adminJar, { name: 'S', widgets: [] })
    const id = created.body.data.sidebar.id

    await Entry.create({
      siteId: 'default',
      locale: 'en',
      type: 'tourPage',
      title: 'Uses it',
      slug: 'uses-it',
      path: '/uses-it',
      status: 'published',
      publishedAt: new Date(),
      fields: { sidebar: 'right', sidebarId: id },
      content: { blocks: [] },
    })

    expect((await authed('delete', `/api/sidebars/${id}`, adminJar)).status).toBe(200)
  })

  it('delete soft hai (R12) — record rehta hai, list se gayab ho jaata hai', async () => {
    const created = await createSidebar(adminJar, { name: 'S', widgets: [] })
    const id = created.body.data.sidebar.id

    await authed('delete', `/api/sidebars/${id}`, adminJar)

    expect((await authed('get', '/api/sidebars', adminJar)).body.data.sidebars).toHaveLength(0)
    expect(await Sidebar.findById(id).lean()).not.toBeNull()
  })
})

describe('page ke payload me sidebar (D-88 §3)', () => {
  it('widgets resolve ho kar jaate hain, aur sidebarId kabhi nahi', async () => {
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'html', props: { heading: 'By duration', html: '<ul><li>2N</li></ul>' } }],
    })

    const entry = await resolvedPage({ sidebarId: created.body.data.sidebar.id })

    expect(entry.sidebar).toBe('right')
    expect(entry.sidebarWidgets).toHaveLength(1)
    expect(entry.sidebarWidgets[0].props.heading).toBe('By duration')
    /** Theme ke paas id ka koi kaam nahi — bhejne ka matlab hota ek din koi uspe call likh de */
    expect(entry.sidebarId).toBeUndefined()
    expect(entry.fields.sidebarId).toBeUndefined()
  })

  it('`sidebar: none` pe widgets resolve hote hi nahi — chunav bacha rehta hai', async () => {
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'html', props: { html: '<p>x</p>' } }],
    })
    const id = created.body.data.sidebar.id

    const entry = await resolvedPage({ sidebar: 'none', sidebarId: id })

    expect(entry.sidebarWidgets).toEqual([])

    /** ⚠️ Value DB me phir bhi bachi hai — client left/right toggle karke wapas aayega */
    const doc = await Entry.findOne({ path: '/andaman-tour-packages' }).lean()
    expect(doc.fields.sidebarId).toBe(id)
  })

  it('delete ho chuki sidebar pe page chalta rahta hai — sirf sidebar gayab (D-42 §2)', async () => {
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'html', props: { html: '<p>x</p>' } }],
    })
    const id = created.body.data.sidebar.id

    await authed('delete', `/api/sidebars/${id}`, adminJar)

    const entry = await resolvedPage({ sidebarId: id })

    expect(entry.sidebar).toBe('right')
    expect(entry.sidebarWidgets).toEqual([])
  })

  it('bekaar sidebarId se 500 nahi aata — wo chup-chaap gir jaati hai', async () => {
    const entry = await resolvedPage({ sidebarId: 'kachra' })

    expect(entry.sidebarWidgets).toEqual([])
  })

  it('khaali HTML wala widget gir jaata hai — heading akela khaali card banata (D-30)', async () => {
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'html', props: { heading: 'Kuch nahi', html: '' } }],
    })

    const entry = await resolvedPage({ sidebarId: created.body.data.sidebar.id })

    expect(entry.sidebarWidgets).toEqual([])
  })
})

describe('sidebarId ka write path — API se, seedha Mongoose se nahi', () => {
  /**
   * ⚠️ **Ye test isliye hai ki baaki tests entries `Entry.create()` se banate hain, yaani
   * service ko bypass karte hain.**
   *
   * `normalizeFields()` ka `has()` **`declares()` pe gated hai** — field content type me
   * declared hona chahiye, warna uski `.parse()` chup-chaap skip ho jaati hai. Ye theek wahi
   * shakl hai jo `updatePackageDefaults()` ke whitelist jaal ki hai, jo chaar baar laga: API
   * 200 deti hai, admin "Saved." dikhata hai, aur DB me kuch aur pada rehta hai.
   *
   * Isliye jaanch **DB pe** hai, response pe nahi.
   */
  it('API se bheja hua sidebarId DB tak pahunchta hai', async () => {
    const created = await createSidebar(adminJar, { name: 'S', widgets: [] })
    const sidebarId = created.body.data.sidebar.id

    const res = await authed('post', '/api/entries', adminJar).send({
      type: 'tourPage',
      title: 'Sidebar wala tour page',
      fields: { sidebar: 'left', sidebarId },
    })

    expect(res.status).toBe(201)

    const doc = await Entry.findById(res.body.data.entry.id).lean()

    expect(doc.fields.sidebar).toBe('left')
    expect(doc.fields.sidebarId).toBe(sidebarId)
  })

  it('galat sidebar value 400 deti hai — theme isse seedha class me badalti hai', async () => {
    const res = await authed('post', '/api/entries', adminJar).send({
      type: 'tourPage',
      title: 'Bad',
      fields: { sidebar: 'top' },
    })

    expect(res.status).toBe(400)
  })
})

describe('enquiryForm widget ka resolve', () => {
  it('chuna hua form poora payload me aata hai — theme ko id nahi milti', async () => {
    const formId = await makeForm()
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'enquiryForm', props: { formId } }],
    })

    const entry = await resolvedPage({ sidebarId: created.body.data.sidebar.id })

    expect(entry.sidebarWidgets[0].props.form.id).toBe(formId)
    expect(entry.sidebarWidgets[0].props.form.fields[0].key).toBe('name')
    expect(entry.sidebarWidgets[0].props.formId).toBeUndefined()
  })

  it('draft form pe widget gir jaata hai — dikhta form jo kaam na kare, wo bura hai', async () => {
    const formId = await makeForm({ status: 'draft' })
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'enquiryForm', props: { formId } }],
    })

    const entry = await resolvedPage({ sidebarId: created.body.data.sidebar.id })

    expect(entry.sidebarWidgets).toEqual([])
  })

  it('form chuna hi na ho to widget gir jaata hai, khaali dabba nahi banta (D-30)', async () => {
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'enquiryForm', props: { formId: '' } }],
    })

    const entry = await resolvedPage({ sidebarId: created.body.data.sidebar.id })

    expect(entry.sidebarWidgets).toEqual([])
  })
})

describe('talkToPlanner ka email usi sidebar ke form se aata hai', () => {
  it('sidebar me form ho to uska emailTo planner tak pahunchta hai (client, 2 Sep)', async () => {
    const formId = await makeForm({ emailTo: 'trips@test.com, cc@test.com' })
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [
        { type: 'enquiryForm', props: { formId } },
        { type: 'talkToPlanner', props: {} },
      ],
    })

    const entry = await resolvedPage({ sidebarId: created.body.data.sidebar.id })
    const planner = entry.sidebarWidgets.find((w) => w.type === 'talkToPlanner')

    /** ⚠️ Sirf pehla pata — baaki routing ki baat hai, dikhane ki nahi */
    expect(planner.props.email).toBe('trips@test.com')
  })

  it('koi form na ho to email khaali — planner phir bhi rehta hai (phone Settings se aata hai)', async () => {
    const created = await createSidebar(adminJar, {
      name: 'S',
      widgets: [{ type: 'talkToPlanner', props: { heading: 'Baat karein' } }],
    })

    const entry = await resolvedPage({ sidebarId: created.body.data.sidebar.id })

    expect(entry.sidebarWidgets[0].props.email).toBe('')
    expect(entry.sidebarWidgets[0].props.heading).toBe('Baat karein')
  })
})
