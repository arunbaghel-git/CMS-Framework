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

    expect(res.body.data.locations.map((l) => l.location)).toEqual(['header'])
    expect(res.body.data.locations.every((l) => l.menuId === null)).toBe(true)
  })

  /**
   * D-44: footer ke columns ab theme locations **nahi** hain — wo
   * `settings.footerColumns[]` me hain. Ye test isliye hai ki koi wapas se
   * `footerColumn1` ko location banane ki koshish kare to yahan pakda jaaye, na ki
   * production me jahan do jagah footer ka data ho jaayega.
   */
  it('footer ke columns ab locations nahi hain (D-44 — D-43 superseded)', async () => {
    const res = await authed('put', '/api/menu-locations', adminJar).send({
      locations: [{ location: 'footerColumn1', menuId: null }],
    })

    expect(res.status).toBe(400)
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
    // `header` hi ekmatra theme location hai (D-44) — aur yahan wo assign nahi hui
    const res = await request(app).get('/api/public/menus/header')

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
      {
        label: 'Get a quote',
        url: '/contact',
        target: '_self',
        variant: 'outline',
        className: 'primary',
        icon: 'none',
        iconOnlyOnMobile: false,
      },
    ])
    // `enabled` theme tak nahi jaata — use sirf wahi milte hain jo dikhne hain
    expect(headerButtons[0]).not.toHaveProperty('enabled')
  })

  /**
   * Page ka aakhri CTA card — D-67.
   *
   * Ye contract test hai: card ka poora matlab hi ye hai ki wo **static** rahe aur uska
   * button tab tak na dikhe jab tak uska URL na ho (enquiry form Q-2 pe atka hai). Dono
   * bina test ke chup-chaap badal sakte the.
   */
  describe('ctaSection (D-67)', () => {
    const full = {
      enabled: true,
      badge: 'Planning open for 2026 season',
      heading: 'Want this trip on your dates?',
      bullets: ['The same day-by-day plan', 'Ferry seats held'],
      boxTitle: 'Plan with us',
      boxNote: 'per person, twin sharing',
      buttons: [
        { label: 'Get this itinerary', url: '/contact', variant: 'accent' },
        // URL abhi nahi hai — enquiry form bana hi nahi (Q-2)
        { label: 'Enquire', url: '' },
      ],
    }

    it('off ho to public payload me null jaata hai', async () => {
      await authed('patch', '/api/settings', adminJar).send({
        ctaSection: { ...full, enabled: false },
      })

      const res = await request(app).get('/api/public/settings')

      expect(res.body.data.settings.ctaSection).toBeNull()
    })

    it('on ho to poora card jaata hai, par bina URL wala button nahi', async () => {
      await authed('patch', '/api/settings', adminJar).send({ ctaSection: full })

      const { ctaSection } = (await request(app).get('/api/public/settings')).body.data.settings

      expect(ctaSection.badge).toBe('Planning open for 2026 season')
      expect(ctaSection.bullets).toEqual(['The same day-by-day plan', 'Ferry seats held'])
      expect(ctaSection.boxTitle).toBe('Plan with us')

      /**
       * Yahi is section ka asli maqsad hai: jab tak form ka URL nahi bhara, wo button page
       * pe aata hi nahi — adhoora control dikhane se behtar hai na dikhana (D-30).
       */
      expect(ctaSection.buttons).toEqual([
        { label: 'Get this itinerary', url: '/contact', target: '_self', variant: 'accent' },
      ])
      expect(ctaSection.buttons[0]).not.toHaveProperty('enabled')
    })

    it('do se zyada button 400 dete hain', async () => {
      const res = await authed('patch', '/api/settings', adminJar).send({
        ctaSection: {
          buttons: Array.from({ length: 3 }, (_, i) => ({ label: `B${i}`, url: '/x' })),
        },
      })

      expect(res.status).toBe(400)
    })
  })

  it('chaar se zyada header buttons 400 dete hain', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      headerButtons: Array.from({ length: 5 }, (_, i) => ({ label: `B${i}`, url: '/x' })),
    })

    expect(res.status).toBe(400)
  })

  it('button ka icon public payload me jaata hai', async () => {
    await authed('patch', '/api/settings', adminJar).send({
      headerButtons: [{ label: 'Awards', url: '/awards', icon: 'award', variant: 'primary' }],
    })

    const { headerButtons } = (await request(app).get('/api/public/settings')).body.data.settings

    expect(headerButtons[0]).toEqual({
      label: 'Awards',
      url: '/awards',
      target: '_self',
      variant: 'primary',
      className: '',
      icon: 'award',
      iconOnlyOnMobile: false,
    })
  })

  it('anjaan icon 400 deta hai — value hi contract hai', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      headerButtons: [{ label: 'X', url: '/x', icon: 'rocket' }],
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

/**
 * Footer ke columns — D-44.
 *
 * Yahan ka sabse zaroori assertion wo **nahi** hai jo dikh raha hai (columns aa gaye),
 * balki wo hai jo chup-chaap toot sakta tha: `type` ka filter server pe lagta hai, aur
 * menu delete hone pe reference saaf hota hai. Dono ke bina site pe kuch "kaam karta
 * hua" dikhta rehta hai jabki data galat hota hai.
 */
describe('footer columns (D-44)', () => {
  const column = (over = {}) => ({
    id: 'c1',
    heading: 'Explore',
    type: 'menu',
    width: 'normal',
    menuId: null,
    textBlocks: [],
    ...over,
  })

  async function makeMenu(key = 'explore') {
    const res = await createMenu(adminJar, { key, name: `Menu ${key}`, items: simpleItems })
    return res.body.data.menu.id
  }

  const publicSettings = async () =>
    (await request(app).get('/api/public/settings')).body.data.settings

  it('column ka menu resolve ho kar public payload me aata hai', async () => {
    const menuId = await makeMenu()

    const saved = await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [column({ menuId })],
    })
    expect(saved.status).toBe(200)

    const { footerColumns } = await publicSettings()

    expect(footerColumns).toHaveLength(1)
    expect(footerColumns[0].heading).toBe('Explore')
    expect(footerColumns[0].width).toBe('normal')
    expect(footerColumns[0].menu.name).toBe('Menu explore')
    expect(footerColumns[0].menu.items[0].href).toBe('/')
    // `type` admin ka choice hai, theme ka nahi — wo bahar nahi jaata
    expect(footerColumns[0]).not.toHaveProperty('type')
  })

  it("type 'text' pe menu public payload me nahi jaata, par DB me bacha rehta hai", async () => {
    const menuId = await makeMenu()

    await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [
        column({
          type: 'text',
          menuId,
          textBlocks: [{ id: 'b1', icon: 'phone', label: 'SUPPORT', text: '+91 98100 66496' }],
        }),
      ],
    })

    const { footerColumns } = await publicSettings()

    expect(footerColumns[0].menu).toBeNull()
    expect(footerColumns[0].textBlocks).toEqual([
      { id: 'b1', icon: 'phone', label: 'SUPPORT', text: '+91 98100 66496' },
    ])

    // Reference mit-ta nahi — client wapas 'both' kar de to menu turant laut aata hai
    const stored = await Settings.findOne({}).lean()
    expect(stored.footerColumns[0].menuId).toBe(menuId)
  })

  it("type 'menu' pe text blocks public payload me nahi jaate", async () => {
    const menuId = await makeMenu()

    await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [
        column({ menuId, textBlocks: [{ id: 'b1', icon: 'none', label: 'X', text: 'Y' }] }),
      ],
    })

    expect((await publicSettings()).footerColumns[0].textBlocks).toEqual([])
  })

  it('adhoora text block (na label na text) chhant jaata hai', async () => {
    await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [
        column({
          type: 'text',
          textBlocks: [
            { id: 'b1', icon: 'clock', label: '', text: '' },
            { id: 'b2', icon: 'clock', label: 'TIMING', text: 'Mon–Sat' },
          ],
        }),
      ],
    })

    const { footerColumns } = await publicSettings()

    expect(footerColumns[0].textBlocks.map((b) => b.id)).toEqual(['b2'])
  })

  it('poora khaali column public payload me jaata hi nahi — grid me khaali khaana nahi banta', async () => {
    await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [column({ heading: '', menuId: null })],
    })

    expect((await publicSettings()).footerColumns).toEqual([])
  })

  it('menu delete hone pe column ka reference saaf hota hai, column nahi', async () => {
    const menuId = await makeMenu()
    await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [column({ menuId, type: 'both', textBlocks: [] })],
    })

    await authed('delete', `/api/menus/${menuId}`, adminJar)

    const stored = await Settings.findOne({}).lean()

    expect(stored.footerColumns).toHaveLength(1)
    expect(stored.footerColumns[0].menuId).toBeNull()
    // Heading client ka content hai — menu ke saath nahi udti
    expect(stored.footerColumns[0].heading).toBe('Explore')
  })

  it('anjaan menuId 400 deti hai — footer chup-chaap khaali nahi rehta', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [column({ menuId: '507f1f77bcf86cd799439011' })],
    })

    expect(res.status).toBe(400)
  })

  it('chhe columns tak chalte hain', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      footerColumns: Array.from({ length: 6 }, (_, i) =>
        column({ id: `c${i}`, heading: `Column ${i}` }),
      ),
    })

    expect(res.status).toBe(200)
    expect((await publicSettings()).footerColumns).toHaveLength(6)
  })

  it('chhe se zyada columns 400 dete hain', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      footerColumns: Array.from({ length: 7 }, (_, i) => column({ id: `c${i}` })),
    })

    expect(res.status).toBe(400)
  })

  /**
   * D-43 §3 wali galti ka footer wala roop. `.strict()` ke bina Zod anjaan key
   * **chup-chaap hata deta** — admin Save karta, "ho gaya" dikhta, aur field kahin nahi
   * hoti.
   */
  it('column me anjaan key 400 deti hai, chup-chaap nahi hatti', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      footerColumns: [{ ...column(), extraField: 'kuch' }],
    })

    expect(res.status).toBe(400)
  })

  it('footer logo na ho to header wale pe fallback hota hai (D-44 §4)', async () => {
    const admin = await User.findOne({ email: 'admin@test.com' }).lean()
    const media = await Media.create({
      siteId: 'default',
      uploadedBy: admin._id,
      filename: 'logo.png',
      mime: 'image/png',
      size: 100,
      width: 400,
      height: 120,
      variants: [{ key: 'medium', url: '/uploads/logo-medium.webp', w: 400, h: 120 }],
    })

    await authed('patch', '/api/settings', adminJar).send({ logoMediaId: String(media._id) })

    const settings = await publicSettings()

    expect(settings.footerLogo.url).toBe('/uploads/logo-medium.webp')
    expect(settings.footerLogo).toEqual(settings.logo)
  })

  it('dono logo na hon to footerLogo null hai — kabhi toota src nahi (D-42 §2)', async () => {
    expect((await publicSettings()).footerLogo).toBeNull()
  })

  it('bottom bar ka note aur disclaimer public payload me jaate hain', async () => {
    await authed('patch', '/api/settings', adminJar).send({
      footerNote: 'Member IATO, TAAI',
      footerDisclaimer: 'Prices are indicative.',
    })

    const settings = await publicSettings()

    expect(settings.footerNote).toBe('Member IATO, TAAI')
    expect(settings.footerDisclaimer).toBe('Prices are indicative.')
  })

  /**
   * `x` 25 Aug me juda. Ye test isliye hai ki naye key ka default **chup-chaap** na
   * chhoot jaaye: `socialUpdateSchema` me har link optional hai, aur ek link bhejne pe
   * baaki teen ud jaana wahi bug tha jo pehle pakda gaya tha.
   */
  it('social me x bhi hai, aur ek link badalne se baaki nahi udte', async () => {
    await authed('patch', '/api/settings', adminJar).send({
      social: { facebook: 'https://facebook.com/a', x: 'https://x.com/a' },
    })
    await authed('patch', '/api/settings', adminJar).send({
      social: { youtube: 'https://youtube.com/a' },
    })

    expect((await publicSettings()).social).toEqual({
      facebook: 'https://facebook.com/a',
      instagram: '',
      youtube: 'https://youtube.com/a',
      x: 'https://x.com/a',
    })
  })
})
