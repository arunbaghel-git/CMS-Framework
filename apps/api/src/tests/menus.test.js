import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { Media } from '../modules/media/model.js'
import { Menu, MenuLocation } from '../modules/menus/model.js'
import { Settings } from '../modules/settings/model.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Menus ka integration test — asli Mongo pe (spec 006, D-43).
 *
 * Sabse zaroori teen cheezein:
 *   1. **public payload** — `href` resolved, aur koi admin-only field bahar nahi
 *   2. **locations** — assignment menu se alag hai, unassigned ek valid state hai
 *   3. **optimistic concurrency** — do admin ek saath save karein to `409`
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

const link = (url) => ({ type: 'url', url })

const simpleItems = [{ label: 'Home', link: link('/'), menuType: 'link' }]

async function createMenu(jar, body) {
  return authed('post', '/api/menus', jar).send(body)
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
    Media.deleteMany({}),
    Menu.deleteMany({}),
    MenuLocation.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()

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

describe('POST /api/menus', () => {
  it('menu banata hai aur har item ko stable id deta hai', async () => {
    const res = await createMenu(adminJar, { key: 'header', name: 'Header', items: simpleItems })

    expect(res.status).toBe(201)
    expect(res.body.data.menu.key).toBe('header')
    expect(res.body.data.menu.items[0].id).toBeTruthy()
    expect(res.body.data.menu.version).toBe(0)
  })

  it('duplicate key pe 409', async () => {
    await createMenu(adminJar, { key: 'header', name: 'Header', items: [] })
    const res = await createMenu(adminJar, { key: 'header', name: 'Dobara', items: [] })

    expect(res.status).toBe(409)
  })

  it('editor bana sakta hai, author nahi', async () => {
    expect((await createMenu(editorJar, { key: 'a', name: 'A', items: [] })).status).toBe(201)
    expect((await createMenu(authorJar, { key: 'b', name: 'B', items: [] })).status).toBe(403)
  })

  it('bina login ke 401', async () => {
    const res = await request(app).post('/api/menus').send({ key: 'x', name: 'X', items: [] })

    expect(res.status).toBe(401)
  })

  it('sm layout pe 3 columns 400 deta hai — CMS toota layout banne hi nahi deta', async () => {
    const res = await createMenu(adminJar, {
      key: 'header',
      name: 'Header',
      items: [
        {
          label: 'Mega',
          link: link('/m'),
          menuType: 'mega',
          mega: { layout: 'sm', columnCount: 3, columns: [{}, {}, {}] },
        },
      ],
    })

    expect(res.status).toBe(400)
  })

  it('columns[] ki length columnCount se match na ho to 400', async () => {
    const res = await createMenu(adminJar, {
      key: 'header',
      name: 'Header',
      items: [
        {
          label: 'Mega',
          link: link('/m'),
          menuType: 'mega',
          mega: { layout: 'wide', columnCount: 4, columns: [{}] },
        },
      ],
    })

    expect(res.status).toBe(400)
  })

  it('entry link Slice 0 me abhi 400 deta hai (D-30)', async () => {
    const res = await createMenu(adminJar, {
      key: 'header',
      name: 'Header',
      items: [{ label: 'About', link: { type: 'entry', entryId: 'x' }, menuType: 'link' }],
    })

    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/menus/:id', () => {
  it('version badhata hai', async () => {
    const created = await createMenu(adminJar, { key: 'header', name: 'H', items: [] })
    const { id } = created.body.data.menu

    const res = await authed('patch', `/api/menus/${id}`, adminJar).send({ name: 'Header' })

    expect(res.status).toBe(200)
    expect(res.body.data.menu.version).toBe(1)
    expect(res.body.data.menu.name).toBe('Header')
  })

  it('purana version bhejne pe 409 — dusre admin ka kaam mit-ta nahi', async () => {
    const created = await createMenu(adminJar, { key: 'header', name: 'H', items: [] })
    const { id } = created.body.data.menu

    await authed('patch', `/api/menus/${id}`, adminJar).send({ name: 'Pehla', version: 0 })
    const second = await authed('patch', `/api/menus/${id}`, adminJar).send({
      name: 'Doosra',
      version: 0,
    })

    expect(second.status).toBe(409)
  })

  it('key badalna allowed nahi — wo strip ho jaati hai', async () => {
    const created = await createMenu(adminJar, { key: 'header', name: 'H', items: [] })
    const { id } = created.body.data.menu

    await authed('patch', `/api/menus/${id}`, adminJar).send({ key: 'kuch-aur', name: 'H2' })
    const after = await authed('get', `/api/menus/${id}`, adminJar)

    expect(after.body.data.menu.key).toBe('header')
  })
})

describe('DELETE /api/menus/:id', () => {
  it('soft delete karta hai aur uske location assignments clear karta hai', async () => {
    const created = await createMenu(adminJar, { key: 'header', name: 'H', items: simpleItems })
    const { id } = created.body.data.menu

    await authed('put', '/api/menu-locations', adminJar).send({
      locations: [{ location: 'header', menuId: id }],
    })

    expect((await authed('delete', `/api/menus/${id}`, adminJar)).status).toBe(200)

    // Record bacha hua hai (R12), par list se gayab
    expect(await Menu.countDocuments({})).toBe(1)
    expect((await authed('get', '/api/menus', adminJar)).body.data.menus).toHaveLength(0)

    const assignment = await MenuLocation.findOne({ location: 'header' }).lean()
    expect(assignment.menuId).toBeNull()
  })
})

describe('menu locations', () => {
  it('theme ki poori list deta hai, chahe DB me koi assignment na ho', async () => {
    const res = await authed('get', '/api/menu-locations', adminJar)

    expect(res.body.data.locations.map((l) => l.location)).toEqual([
      'header',
      'footerColumn1',
      'footerColumn2',
      'footerColumn3',
      'footerColumn4',
    ])
    expect(res.body.data.locations.every((l) => l.menuId === null)).toBe(true)
  })

  it('anjaan location 400 deti hai', async () => {
    const res = await authed('put', '/api/menu-locations', adminJar).send({
      locations: [{ location: 'sidebar', menuId: null }],
    })

    expect(res.status).toBe(400)
  })

  it('mobile ab ek location nahi hai (D-43 — D-17 partially superseded)', async () => {
    const res = await authed('put', '/api/menu-locations', adminJar).send({
      locations: [{ location: 'mobile', menuId: null }],
    })

    expect(res.status).toBe(400)
  })

  it('anjaan menuId 400 deti hai', async () => {
    const res = await authed('put', '/api/menu-locations', adminJar).send({
      locations: [{ location: 'header', menuId: '64b7f9c2e1a2b3c4d5e6f7a8' }],
    })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/public/menus/:location', () => {
  async function assign(location, items = simpleItems) {
    const created = await createMenu(adminJar, { key: location, name: `Menu ${location}`, items })
    await authed('put', '/api/menu-locations', adminJar).send({
      locations: [{ location, menuId: created.body.data.menu.id }],
    })
    return created.body.data.menu
  }

  it('bina auth ke padha ja sakta hai', async () => {
    await assign('header')
    const res = await request(app).get('/api/public/menus/header')

    expect(res.status).toBe(200)
    expect(res.body.data.items[0].label).toBe('Home')
  })

  it('href resolved bhejta hai, link object nahi (R10)', async () => {
    await assign('header')
    const { items } = (await request(app).get('/api/public/menus/header')).body.data

    expect(items[0].href).toBe('/')
    expect(items[0].link).toBeUndefined()
  })

  it('version aur deletedAt public payload me nahi jaate', async () => {
    await assign('header')
    const res = await request(app).get('/api/public/menus/header')

    expect(JSON.stringify(res.body)).not.toContain('deletedAt')
    expect(res.body.data.menu).toEqual({ key: 'header', name: 'Menu header' })
  })

  it('unassigned location pe khaali menu, 404 nahi (D-30)', async () => {
    const res = await request(app).get('/api/public/menus/footerColumn3')

    expect(res.status).toBe(200)
    expect(res.body.data.items).toEqual([])
  })

  it('menu delete hone pe location khaali ho jaati hai, tooti nahi', async () => {
    const menu = await assign('header')
    await authed('delete', `/api/menus/${menu.id}`, adminJar)

    const res = await request(app).get('/api/public/menus/header')

    expect(res.status).toBe(200)
    expect(res.body.data.items).toEqual([])
  })

  it('anjaan location pe 404', async () => {
    expect((await request(app).get('/api/public/menus/sidebar')).status).toBe(404)
  })

  it('mega ka poora Columns → Groups → Links tree public payload me aata hai', async () => {
    await assign('header', [
      {
        label: 'Activities',
        link: link('/activities'),
        menuType: 'mega',
        mega: {
          layout: 'wide',
          columnCount: 2,
          columns: [
            {
              groups: [
                { heading: 'Snorkeling', links: [{ label: 'Elephant Beach', link: link('/eb') }] },
                { heading: 'Sea Walk', links: [{ label: 'North Bay', link: link('/nb') }] },
              ],
            },
            { groups: [] },
          ],
          cta: { text: 'Not sure?', buttonLabel: 'Talk to us', buttonUrl: '/contact' },
        },
      },
    ])

    const { items } = (await request(app).get('/api/public/menus/header')).body.data

    expect(items[0].mega.columns[0].groups).toHaveLength(2)
    expect(items[0].mega.columns[0].groups[1].links[0].href).toBe('/nb')
    expect(items[0].mega.cta.buttonLabel).toBe('Talk to us')
  })
})

describe('GET /api/public/settings', () => {
  it('adminEmail bahar nahi jaata', async () => {
    await authed('patch', '/api/settings', adminJar).send({ adminEmail: 'secret@test.com' })

    const res = await request(app).get('/api/public/settings')

    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toContain('secret@test.com')
    expect(res.body.data.settings.adminEmail).toBeUndefined()
  })

  it('logo resolve na ho to null bhejta hai — kabhi toota src nahi (D-42 §2)', async () => {
    const res = await request(app).get('/api/public/settings')

    expect(res.body.data.settings.logo).toBeNull()
  })
  it('header buttons — sirf enabled aur poore hi public payload me jaate hain', async () => {
    await authed('patch', '/api/settings', adminJar).send({
      headerButtons: [
        { label: 'Get a quote', url: '/contact', className: 'primary' },
        // enabled hai par URL nahi — adhoora button toota link hai
        { label: 'Half', url: '' },
        // poora hai par band hai — config bachi rehti hai, dikhta nahi
        { label: 'Call us', url: 'tel:+919810066496', enabled: false },
      ],
    })

    const { headerButtons } = (await request(app).get('/api/public/settings')).body.data.settings

    expect(headerButtons).toEqual([
      { label: 'Get a quote', url: '/contact', target: '_self', className: 'primary' },
    ])
    // `enabled` theme tak nahi jaata — use sirf wahi milte hain jo dikhne hain
    expect(headerButtons[0]).not.toHaveProperty('enabled')
  })

  it('chaar se zyada header buttons 400 dete hain', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      headerButtons: Array.from({ length: 5 }, (_, i) => ({ label: `B${i}`, url: '/x' })),
    })

    expect(res.status).toBe(400)
  })

  it('galat button URL 400 deta hai', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      headerButtons: [{ label: 'Bad', url: 'example.com' }],
    })

    expect(res.status).toBe(400)
  })

  it('footerCopyright public payload me hai', async () => {
    await authed('patch', '/api/settings', adminJar).send({ footerCopyright: '© {year} Acme' })

    const res = await request(app).get('/api/public/settings')

    expect(res.body.data.settings.footerCopyright).toBe('© {year} Acme')
  })
})
