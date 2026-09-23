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
import { Settings } from '../modules/settings/model.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Settings ka integration test — asli Mongo pe.
 *
 * Do cheezein yahan sabse zaroori hain:
 *   1. **singleton** — ek instance me ek hi document, chahe kitni baar padho
 *   2. **read aur update ki permissions alag hain** — editor padh sakta hai, badal nahi
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

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

/**
 * Asli media record — D-42 §1 ke baad settings sirf **maujood** media ki id leti hai,
 * isliye logo/favicon wale test ko sach me ek media chahiye.
 */
async function makeMedia(input = {}) {
  const uploader = await User.findOne({ email: 'admin@test.com' }).lean()

  return Media.create({
    filename: 'logo.png',
    mime: 'image/png',
    size: 4096,
    width: 512,
    height: 512,
    variants: [
      { key: 'thumb', url: '/uploads/sites/default/media/2026/08/x/thumb.webp', w: 300, h: 300 },
    ],
    uploadedBy: uploader._id,
    ...input,
  })
}

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    RefreshToken.deleteMany({}),
    Settings.deleteMany({}),
    Media.deleteMany({}),
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

describe('GET /api/settings', () => {
  it('bina login ke 401', async () => {
    expect((await request(app).get('/api/settings')).status).toBe(401)
  })

  it('defaults deta hai — seed na chali ho tab bhi', async () => {
    const res = await authed('get', '/api/settings', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data.settings).toMatchObject({
      siteName: 'My Site',
      timezone: 'Asia/Kolkata',
      dateFormat: 'd MMM yyyy',
      currency: 'INR',
      postsPerPage: 10,
    })
  })

  /**
   * Staging pe safe default (spec 004 §3). Ye ulta ho jaaye to har naya client ka adhoora
   * site Google me index hone lagega — aur wo galti chup-chaap hoti hai.
   */
  it('searchEngineVisible default FALSE hai', async () => {
    const res = await authed('get', '/api/settings', adminJar)
    expect(res.body.data.settings.searchEngineVisible).toBe(false)
  })

  it('siteUrl env se aata hai, DB se nahi', async () => {
    const res = await authed('get', '/api/settings', adminJar)

    expect(res.body.data.settings.siteUrl).toBe(process.env.SITE_URL)
    expect(await Settings.findOne({ siteId: 'default' }).lean()).not.toHaveProperty('siteUrl')
  })

  /**
   * Singleton ka asli test. Do baar padhne pe do document ban jaayein to `findOne()`
   * "jo pehle mil jaaye" lautane lagta hai, aur admin ke save random taur pe gayab
   * hone lagte hain.
   */
  it('baar-baar padhne pe bhi ek hi document banta hai', async () => {
    await authed('get', '/api/settings', adminJar)
    await authed('get', '/api/settings', adminJar)
    await authed('get', '/api/settings', editorJar)

    expect(await Settings.countDocuments()).toBe(1)
  })

  it('editor padh sakta hai', async () => {
    expect((await authed('get', '/api/settings', editorJar)).status).toBe(200)
  })

  it('author nahi padh sakta — uske paas settings.read nahi hai', async () => {
    expect((await authed('get', '/api/settings', authorJar)).status).toBe(403)
  })
})

describe('PATCH /api/settings', () => {
  it('fields update karta hai', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      siteName: 'Wanderly Travels',
      tagline: 'Handcrafted journeys',
      phone: '+91 80 4567 8900',
      currency: 'USD',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.settings).toMatchObject({
      siteName: 'Wanderly Travels',
      tagline: 'Handcrafted journeys',
      currency: 'USD',
    })

    // Aur wo sach me likha gaya, sirf response me nahi
    const stored = await Settings.findOne({ siteId: 'default' }).lean()
    expect(stored.siteName).toBe('Wanderly Travels')
  })

  it('logo aur favicon media IDs persist karta hai', async () => {
    const logo = await makeMedia({ filename: 'logo.png' })
    const favicon = await makeMedia({ filename: 'favicon.png' })

    const res = await authed('patch', '/api/settings', adminJar).send({
      logoMediaId: String(logo._id),
      faviconMediaId: String(favicon._id),
    })

    expect(res.status).toBe(200)
    expect(res.body.data.settings).toMatchObject({
      logoMediaId: String(logo._id),
      faviconMediaId: String(favicon._id),
    })

    const stored = await Settings.findOne({ siteId: 'default' }).lean()
    expect(stored.logoMediaId).toBe(String(logo._id))
    expect(stored.faviconMediaId).toBe(String(favicon._id))
  })

  /**
   * D-42 §1 — ye wahi test hai jo pehle **ulta** assert karta tha: ek aisi ObjectId
   * bhejta tha jo `media` me hai hi nahi, aur ummeed karta tha ki wo save ho jaayegi.
   * Us gap ka nateeja Slice 0 me header pe dikhta — upload ke hafton baad.
   */
  it('anjaan media id 400 deti hai aur kuch save nahi hota (D-42 §1)', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      siteName: 'Should Not Save',
      logoMediaId: '64f000000000000000000001',
    })

    expect(res.status).toBe(400)

    // Poori request rukni chahiye — siteName bhi nahi jaana chahiye
    const stored = await Settings.findOne({ siteId: 'default' }).lean()
    expect(stored?.logoMediaId ?? null).toBeNull()
    expect(stored?.siteName).not.toBe('Should Not Save')
  })

  it('bekaar media id 400 deti hai, 500 nahi (D-42 §1)', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      faviconMediaId: 'not-an-object-id',
    })

    expect(res.status).toBe(400)
  })

  it('trash me padi media ki id bhi reject hoti hai (D-42 §1)', async () => {
    const deleted = await makeMedia({ deletedAt: new Date() })

    const res = await authed('patch', '/api/settings', adminJar).send({
      logoMediaId: String(deleted._id),
    })

    expect(res.status).toBe(400)
  })

  it('null bhejna hamesha chalta hai — wo "logo hata do" hai (D-42 §1)', async () => {
    const logo = await makeMedia()
    await authed('patch', '/api/settings', adminJar).send({ logoMediaId: String(logo._id) })

    const res = await authed('patch', '/api/settings', adminJar).send({ logoMediaId: null })

    expect(res.status).toBe(200)
    expect(res.body.data.settings.logoMediaId).toBeNull()
  })

  /**
   * `social` nested hai, aur poora object `$set` karne se wo links ud jaate hain jo
   * request me nahi aaye the. Service dot-notation isiliye use karti hai.
   */
  it('ek social link badalne se baaki nahi udte', async () => {
    await authed('patch', '/api/settings', adminJar).send({
      social: {
        instagram: 'https://instagram.com/wanderly',
        facebook: 'https://facebook.com/wanderly',
        youtube: 'https://youtube.com/@wanderly',
      },
    })

    const res = await authed('patch', '/api/settings', adminJar).send({
      social: { instagram: 'https://instagram.com/naya' },
    })

    expect(res.body.data.settings.social).toEqual({
      instagram: 'https://instagram.com/naya',
      facebook: 'https://facebook.com/wanderly',
      youtube: 'https://youtube.com/@wanderly',
      // 25 Aug me juda — set kiya hi nahi tha, isliye default khaali
      x: '',
    })
  })

  it('siteUrl bheja jaaye to chupchaap ignore hota hai — wo env se aata hai', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      siteUrl: 'https://attacker.example.com',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.settings.siteUrl).toBe(process.env.SITE_URL)
  })

  it('siteId badla nahi ja sakta', async () => {
    await authed('patch', '/api/settings', adminJar).send({ siteId: 'kuch-aur' })

    expect(await Settings.countDocuments({ siteId: 'default' })).toBe(1)
    expect(await Settings.countDocuments({ siteId: 'kuch-aur' })).toBe(0)
  })

  it('khaali site title pe 400', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({ siteName: '   ' })
    expect(res.status).toBe(400)
  })

  it('aadha-adhoora social URL pe 400', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      social: { instagram: 'instagram.com/wanderly' },
    })
    expect(res.status).toBe(400)
  })

  it('khaali social link chalta hai — matlab "hata do"', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      social: { instagram: '' },
    })

    expect(res.status).toBe(200)
    expect(res.body.data.settings.social.instagram).toBe('')
  })

  it('anjaan timezone pe 400', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({ timezone: 'Mars/Olympus' })
    expect(res.status).toBe(400)
  })

  it('editor badal nahi sakta — uske paas settings.update nahi hai', async () => {
    // Pehle document bana lo, warna "kuch badla to nahi" check karne ko kuch hai hi nahi
    await authed('get', '/api/settings', adminJar)

    const res = await authed('patch', '/api/settings', editorJar).send({ siteName: 'Hijack' })

    expect(res.status).toBe(403)
    expect((await Settings.findOne({ siteId: 'default' }).lean()).siteName).toBe('My Site')
  })

  /** CSRF fail 400 deta hai, 403 nahi — wo "request kharab hai", "permission nahi" nahi. */
  it('CSRF header ke bina 400', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Cookie', asHeader(adminJar))
      .send({ siteName: 'No CSRF' })

    expect(res.status).toBe(400)
  })
})

describe('Settings ▸ Colours — themeColors (17 Sep)', () => {
  const colours = (body) => authed('patch', '/api/settings', adminJar).send({ themeColors: body })

  it('DB tak jaata hai, aur public payload me sirf badle hue token ka CSS', async () => {
    const res = await colours({
      primary: '#0E7490',
      accent: '#f4701c',
      heading: '#111d2b',
      body: '#4a5a6d',
      page: '#ffffff',
      dark: '#0b2b4a',
      perHeading: false,
      headings: {},
      advanced: { btnPrimaryBg: '#16a34a' },
    })
    expect(res.status).toBe(200)

    /** Whitelist wala jaal — response nahi, DB padho */
    const doc = await Settings.findOne({}).lean()
    expect(doc.themeColors.primary).toBe('#0e7490')
    expect(doc.themeColors.advanced).toEqual({ btnPrimaryBg: '#16a34a' })

    const { getPublicSettings } = await import('../modules/public/service.js')
    const css = (await getPublicSettings()).themeCss
    expect(css.startsWith('html:root{')).toBe(true)
    expect(css).toContain('--blue-600:#0e7490')
    expect(css).toContain('--btn-p-bg:#16a34a')
    // accent nahi badla — uska group nahi jaata
    expect(css).not.toContain('--orange-500')
  })

  it('kuch saved nahi ya sab default — themeCss khaali (is site ka look waisa hi)', async () => {
    const { getPublicSettings } = await import('../modules/public/service.js')
    expect((await getPublicSettings()).themeCss).toBe('')

    await colours({}).expect(200)
    expect((await getPublicSettings()).themeCss).toBe('')

    const admin = await authed('get', '/api/settings', adminJar)
    expect(admin.body.data.settings.themeColors).toMatchObject({ primary: '#1668ae', advanced: {} })
  })

  it('galat rang, anjaan key aur CSS ghusane ki koshish — 400', async () => {
    expect((await colours({ primary: 'red' })).status).toBe(400)
    expect((await colours({ primary: '#fff' })).status).toBe(400)
    expect((await colours({ accent: '#f4701c;}</style>' })).status).toBe(400)
    expect((await colours({ advanced: { navBg: '#000000' } })).status).toBe(400)
    expect((await colours({ fontSize: 12 })).status).toBe(400)
  })

  it('author ke paas settings.update nahi — 403', async () => {
    const res = await authed('patch', '/api/settings', authorJar).send({
      themeColors: { primary: '#000000' },
    })
    expect(res.status).toBe(403)
  })
})

describe('Settings ▸ Layout — themeLayout (17 Sep)', () => {
  const layout = (body) => authed('patch', '/api/settings', adminJar).send({ themeLayout: body })

  it('DB tak jaata hai aur themeCss me rang ke saath layout bhi', async () => {
    const res = await layout({ wrap: 1400, corners: 'round', sticky: false })
    expect(res.status).toBe(200)

    const doc = await Settings.findOne({}).lean()
    expect(doc.themeLayout).toMatchObject({ wrap: 1400, corners: 'round', sticky: false, pad: 26 })

    const { getPublicSettings } = await import('../modules/public/service.js')
    const css = (await getPublicSettings()).themeCss
    expect(css).toContain('--wrap:1400px')
    expect(css).toContain('--r2:16px')
    expect(css).toContain('--header-pos:relative')
  })

  it('Spacing (18 Sep) — DB me padha jaata hai, aur site pe sirf badle hue token', async () => {
    const res = await layout({ spaceBlock: 48, cardGapRow: 20 })
    expect(res.status).toBe(200)

    const doc = await Settings.findOne({}).lean()
    expect(doc.themeLayout).toMatchObject({
      spaceBlock: 48,
      spaceBlockMobile: 22,
      cardGapRow: 20,
      cardGapCol: 14,
    })

    const { getPublicSettings } = await import('../modules/public/service.js')
    const css = (await getPublicSettings()).themeCss
    expect(css).toContain('--space-block:clamp(22px,')
    expect(css).toContain('--space-block-in:')
    expect(css).toContain('--gap-card-row:20px')
    expect(css).not.toContain('--gap-card-col')
    expect(css).not.toContain('--space-section')
  })

  it('hadd ke bahar, galat enum, anjaan key — 400', async () => {
    expect((await layout({ cardGapCol: 200 })).status).toBe(400)
    expect((await layout({ wrap: 5000 })).status).toBe(400)
    expect((await layout({ corners: 'blob' })).status).toBe(400)
    expect((await layout({ btnHeight: 44.5 })).status).toBe(400)
    expect((await layout({ breakpoint: 900 })).status).toBe(400)
  })
})

describe('Settings ▸ Fonts — themeFonts + upload (17 Sep)', () => {
  const WOFF2 = Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(64, 1)])

  it('custom font file — magic bytes dekhe jaate hain, naam nahi', async () => {
    const ok = await authed('post', '/api/settings/fonts', adminJar).attach(
      'file',
      WOFF2,
      'Gilroy-Bold.woff2',
    )
    expect(ok.status).toBe(201)
    expect(ok.body.data.file).toMatchObject({
      name: 'Gilroy-Bold.woff2',
      weight: '700',
      style: 'normal',
    })
    expect(ok.body.data.file.url).toMatch(
      /^\/uploads\/sites\/default\/fonts\/custom\/[a-f0-9]+\.woff2$/,
    )

    const fake = await authed('post', '/api/settings/fonts', adminJar).attach(
      'file',
      Buffer.from('\x89PNG....'),
      'sneaky.woff2',
    )
    expect(fake.status).toBe(400)

    const author = await authed('post', '/api/settings/fonts', authorJar).attach(
      'file',
      WOFF2,
      'a.woff2',
    )
    expect(author.status).toBe(403)
  })

  it('custom font settings me jaata hai aur themeCss me @font-face', async () => {
    const up = await authed('post', '/api/settings/fonts', adminJar).attach(
      'file',
      WOFF2,
      'Gilroy.woff2',
    )
    const res = await authed('patch', '/api/settings', adminJar).send({
      themeFonts: { heading: { source: 'custom', family: 'Gilroy', files: [up.body.data.file] } },
    })
    expect(res.status).toBe(200)

    const doc = await Settings.findOne({}).lean()
    expect(doc.themeFonts.heading.family).toBe('Gilroy')

    const { getPublicSettings } = await import('../modules/public/service.js')
    const css = (await getPublicSettings()).themeCss
    expect(css).toContain('font-family:"Gilroy"')
    expect(css).toContain('--font-heading:"Gilroy", var(--font)')
  })

  it('Google font — server download karta hai, admin ka bheja faces nahi maanta, dobara download nahi', async () => {
    const { setFontFetchForTest } = await import('../modules/settings/fonts.js')
    const calls = []
    setFontFetchForTest(async (url) => {
      calls.push(url)
      if (url.startsWith('https://fonts.googleapis.com/css2')) {
        return new Response(
          `/* cyrillic */\n@font-face { font-family: 'Poppins'; font-weight: 100 900; src: url(https://fonts.gstatic.com/s/p/cyr.woff2) format('woff2'); unicode-range: U+0400-045F; }\n` +
            `/* latin */\n@font-face { font-family: 'Poppins'; font-style: normal; font-weight: 100 900; src: url(https://fonts.gstatic.com/s/p/latin.woff2) format('woff2'); unicode-range: U+0000-00FF; }`,
          { status: 200 },
        )
      }
      return new Response(WOFF2, { status: 200 })
    })

    try {
      const body = {
        themeFonts: {
          body: {
            source: 'google',
            google: 'Poppins',
            faces: [{ url: '/uploads/evil.woff2' }],
          },
        },
      }
      const res = await authed('patch', '/api/settings', adminJar).send(body)
      expect(res.status).toBe(200)

      const doc = await Settings.findOne({}).lean()
      const faces = doc.themeFonts.body.faces
      expect(faces).toHaveLength(1) // cyrillic chhoot gaya
      expect(faces[0].url).toMatch(
        /^\/uploads\/sites\/default\/fonts\/google\/poppins\/[a-f0-9]+\.woff2$/,
      )
      expect(faces[0]).toMatchObject({ weight: '100 900', unicodeRange: 'U+0000-00FF' })
      expect(calls.filter((u) => u.includes('gstatic'))).toEqual([
        'https://fonts.gstatic.com/s/p/latin.woff2',
      ])

      const before = calls.length
      await authed('patch', '/api/settings', adminJar).send(body).expect(200)
      expect(calls.length).toBe(before) // wahi family — koi nayi request nahi

      const { getPublicSettings } = await import('../modules/public/service.js')
      expect((await getPublicSettings()).themeCss).toContain(`--font:'RupeeLocal', "Poppins"`)
    } finally {
      setFontFetchForTest(null)
    }
  })

  it('Google pe na mile to 422, samajh aane wale message ke saath', async () => {
    const { setFontFetchForTest } = await import('../modules/settings/fonts.js')
    setFontFetchForTest(async () => new Response('bad', { status: 400 }))
    try {
      const res = await authed('patch', '/api/settings', adminJar).send({
        themeFonts: { heading: { source: 'google', google: 'Poppinz' } },
      })
      expect(res.status).toBe(422)
      expect(res.body.error.message).toContain('"Poppinz" was not found on Google Fonts')
    } finally {
      setFontFetchForTest(null)
    }
  })

  it('size table ki hadd — 400', async () => {
    const res = await authed('patch', '/api/settings', adminJar).send({
      themeFonts: { scale: { h1: { size: 500 } } },
    })
    expect(res.status).toBe(400)
  })
})

/**
 * Desktop ke do floating button (client, 21 Sep).
 *
 * Reference ka `.float` saaton site reference me tha par theme me kabhi bana nahi — isliye
 * yahan sabse zaroori test wo hai jo **poori chain** dekhe: Zod → DB → public payload. Beech
 * me se ek kadam chhoot jaana hi is repo ka sabse aam bug hai (D-89: "bana hua par juda nahi").
 */
describe('Settings ▸ General — floating buttons ka side (21 Sep)', () => {
  const side = (value) =>
    authed('patch', '/api/settings', adminJar).send({ floatingContactSide: value })

  it('left DB tak jaata hai aur public payload me bhi', async () => {
    expect((await side('left')).status).toBe(200)

    /**
     * ⚠️ Response nahi, **DB** padho. Settings ka model `strict` hai — field model me na ho
     * to Mongoose use bina kuch kahe gira deta hai, API phir bhi 200 deti hai aur admin
     * "Saved." dikhata hai.
     */
    const doc = await Settings.findOne({}).lean()
    expect(doc.floatingContactSide).toBe('left')

    const { getPublicSettings } = await import('../modules/public/service.js')
    expect((await getPublicSettings()).floatingContactSide).toBe('left')
  })

  it('default right hai, aur purani settings pe bhi right hi milta hai', async () => {
    const { getPublicSettings } = await import('../modules/public/service.js')
    expect((await getPublicSettings()).floatingContactSide).toBe('right')

    /** Jis site ne ye field kabhi save hi nahi kiya — payload me phir bhi `right` */
    await Settings.updateOne({}, { $unset: { floatingContactSide: '' } })
    expect((await getPublicSettings()).floatingContactSide).toBe('right')
  })

  it('anjaan value pe 400 — `center` jaisa kuch CSS me class bana deta', async () => {
    expect((await side('center')).status).toBe(400)
    expect((await side('')).status).toBe(400)
  })

  it('side badalne se phone/whatsapp nahi udte', async () => {
    await authed('patch', '/api/settings', adminJar)
      .send({ phone: '+91 98100 66496', whatsapp: '+91 98100 66496' })
      .expect(200)

    await side('left').expect(200)

    const doc = await Settings.findOne({}).lean()
    expect(doc.phone).toBe('+91 98100 66496')
    expect(doc.whatsapp).toBe('+91 98100 66496')
  })
})

/**
 * `Enquiries ▸ Popup` (client, 21 Sep — D-103).
 *
 * Data `settings.popupSettings` me hai (screen Enquiries me hai, par wo alag baat hai), aur
 * public payload me wo **resolved** jaata hai — form aur images server pe khul kar.
 *
 * ⚠️ Yahan sabse zyada keemat un teen test ki hai jo **"popup nahi dikhta"** dekhte hain. Unka
 * lakshan ek hi hai (kuch na hona), aur wahi is repo ki sabse aam bug ki shakl hai.
 */
describe('Enquiries ▸ Popup — popupSettings (21 Sep)', () => {
  const save = (body) => authed('patch', '/api/settings', adminJar).send({ popupSettings: body })

  const publicSettings = async () => {
    const { getPublicSettings } = await import('../modules/public/service.js')
    return getPublicSettings()
  }

  /** Ek chalta hua form — popup ko iski id chahiye. */
  async function makeForm(patch = {}) {
    const res = await authed('post', '/api/forms', adminJar).send({
      name: 'Popup Enquiry',
      status: 'active',
      fields: [{ key: 'name', label: 'Your Name', type: 'text', required: true }],
      ...patch,
    })
    expect(res.status).toBe(201)
    return res.body.data.form
  }

  /** Poora chalta hua popup — har test isme se ek cheez todta hai. */
  const working = (formId, patch = {}) => ({
    enabled: true,
    formId,
    heading: 'Special Offers',
    formHeading: 'Get Free Quotes',
    delaySeconds: 8,
    frequency: 'days',
    frequencyDays: 3,
    showOn: { homePage: true, package: true },
    ...patch,
  })

  it('poori chain — Zod se DB, DB se resolved public payload', async () => {
    const form = await makeForm()
    expect((await save(working(form.id))).status).toBe(200)

    /** ⚠️ Response nahi, DB — model `strict` hai aur field chhoot jaane pe API phir bhi 200 deti. */
    const doc = await Settings.findOne({}).lean()
    expect(doc.popupSettings).toMatchObject({
      enabled: true,
      formId: form.id,
      heading: 'Special Offers',
      delaySeconds: 8,
      frequency: 'days',
      frequencyDays: 3,
    })
    expect(doc.popupSettings.showOn).toMatchObject({ homePage: true, package: true, post: false })

    const { popup } = await publicSettings()
    /** Form **resolved** jaata hai — theme ko kabhi id nahi kholni padti. */
    expect(popup.form.id).toBe(form.id)
    expect(popup.form.fields[0].key).toBe('name')
    expect(popup.delaySeconds).toBe(8)
    expect(popup.showOn.homePage).toBe(true)

    /** ⚠️ Kachcha `formId`/`imageIds` payload me **kabhi nahi** — allowlist ka poora tark yahi hai. */
    expect(popup.formId).toBeUndefined()
    expect(popup.imageIds).toBeUndefined()
  })

  it('enabled off — payload me popup null', async () => {
    const form = await makeForm()
    await save(working(form.id, { enabled: false })).expect(200)
    expect((await publicSettings()).popup).toBe(null)
  })

  it('koi form chuna hi nahi — popup null', async () => {
    await save(working('', {})).expect(200)
    expect((await publicSettings()).popup).toBe(null)
  })

  it('kisi page pe tick nahi — popup null', async () => {
    const form = await makeForm()
    await save(working(form.id, { showOn: {} })).expect(200)
    expect((await publicSettings()).popup).toBe(null)
  })

  it('form mit gaya to popup chup-chaap band, 500 nahi (D-42 §2 wali soch)', async () => {
    const form = await makeForm()
    await save(working(form.id)).expect(200)
    expect((await publicSettings()).popup).not.toBe(null)

    await authed('delete', `/api/forms/${form.id}`, adminJar).expect(200)

    /** Settings me `formId` ab bhi padi hai — payload phir bhi `null`, koi toota reference nahi. */
    expect((await publicSettings()).popup).toBe(null)
  })

  it('draft form bhi popup nahi dikhata — public raaste pe wo hai hi nahi', async () => {
    const form = await makeForm({ status: 'draft' })
    await save(working(form.id)).expect(200)
    expect((await publicSettings()).popup).toBe(null)
  })

  it('adhoora PATCH baaki popup nahi udaata (MERGED_KEYS)', async () => {
    /**
     * ⚠️ Ye 10 Sep wala `blogSettings` data-loss hai, popup pe. Admin ka form hamesha poora
     * object bhejta hai isliye wahan ye kabhi nahi dikhta — ek script se ek field patch karte
     * hi dikhta hai.
     */
    const form = await makeForm()
    await save(working(form.id)).expect(200)

    await save({ enabled: false }).expect(200)

    const doc = await Settings.findOne({}).lean()
    expect(doc.popupSettings.enabled).toBe(false)
    expect(doc.popupSettings.formId).toBe(form.id)
    expect(doc.popupSettings.heading).toBe('Special Offers')
    expect(doc.popupSettings.frequencyDays).toBe(3)
  })

  it('hadd ke bahar aur anjaan value — 400', async () => {
    expect((await save({ frequency: 'weekly' })).status).toBe(400)
    expect((await save({ delaySeconds: 5000 })).status).toBe(400)
    expect((await save({ delaySeconds: -1 })).status).toBe(400)
    expect((await save({ frequencyDays: 0 })).status).toBe(400)
    /** Ek se zyada image (client, 23 Sep — pehle chhat 3 thi) — rok schema me hai, admin me nahi. */
    expect((await save({ imageIds: ['a', 'b'] })).status).toBe(400)
    expect((await save({ showOn: { nosuchtype: true } })).status).toBe(400)
  })

  it('heading ki HTML write pe saaf hoti hai (R20)', async () => {
    const form = await makeForm()
    await save(working(form.id, { heading: 'Special <script>alert(1)</script> Offers' })).expect(
      200,
    )

    const doc = await Settings.findOne({}).lean()
    expect(doc.popupSettings.heading).not.toContain('<script>')
  })

  it('author badal nahi sakta — settings.update nahi hai', async () => {
    const res = await authed('patch', '/api/settings', authorJar).send({
      popupSettings: { enabled: true },
    })
    expect(res.status).toBe(403)
  })
})

/**
 * `Settings ▸ Integrations` — teesre tools ka code (D-106, client 22 Sep).
 *
 * ⚠️ **Yahan ke aadhe test suraksha ke hain, feature ke nahi.** Ye poore system me ekmatra jagah hai
 * jahan admin ki HTML bina safai ke DB me jaati hai, aur uska poora pehra do cheezon pe khada hai:
 * alag route + alag permission, aur `updateSettingsSchema` me se field ka **hata hona**. Dono me se
 * ek bhi khisak jaaye to editor `<script>` inject kar sakta hai — role escalation.
 */
describe('PATCH /api/settings/integrations (D-106)', () => {
  const GTM = '<script>window.dataLayer=[];</script>'

  it('admin teenon khaane likh sakta hai', async () => {
    const res = await authed('patch', '/api/settings/integrations', adminJar).send({
      header: GTM,
      body: '<noscript><iframe src="https://x"></iframe></noscript>',
      footer: '<script src="https://chat.example/w.js" defer></script>',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.settings.integrations.header).toBe(GTM)

    // ⚠️ Response nahi, **DB** — wahi sabak jo whitelist wale jaal pe mila tha
    const stored = await Settings.findOne({}).lean()
    expect(stored.integrations.header).toBe(GTM)
    expect(stored.integrations.footer).toContain('chat.example')
  })

  /** ⚠️ Ye field ka **poora matlab** hai — safai lagi to GA/Pixel/GTM kuch bhi kaam nahi karega. */
  it('script tag bacha rehta hai — yahan sanitize NAHI hota (R20 ka jaan-boojh kar apwaad)', async () => {
    await authed('patch', '/api/settings/integrations', adminJar).send({
      header: '<script>alert(1)</script><meta name="google-site-verification" content="abc" />',
    })

    const stored = await Settings.findOne({}).lean()
    expect(stored.integrations.header).toContain('<script>')
    expect(stored.integrations.header).toContain('google-site-verification')
  })

  /**
   * ⚠️ Sirf ek khaana bhejne se baaki **ud-te nahi**. `$set` me dotted key jaati hai
   * (`integrations.footer`), poora object nahi — wahi jaal jo 10 Sep ko `blogSettings` pe pakda gaya
   * tha, jahan ek field patch karne se teen field gayab ho gaye the.
   */
  it('adhoora PATCH baaki khaane nahi udata', async () => {
    await authed('patch', '/api/settings/integrations', adminJar).send({ header: GTM })
    await authed('patch', '/api/settings/integrations', adminJar).send({ footer: '<b>f</b>' })

    const stored = await Settings.findOne({}).lean()
    expect(stored.integrations.header).toBe(GTM)
    expect(stored.integrations.footer).toBe('<b>f</b>')
  })

  /** Anjaan key chup-chaap girti nahi — `head` likhne wala 200 + "kuch na hona" na dekhe (D-103 ka sabak). */
  it('anjaan khaana 400 deta hai, chup-chaap girta nahi', async () => {
    const res = await authed('patch', '/api/settings/integrations', adminJar).send({ head: 'x' })

    expect(res.status).toBe(400)
  })

  it('hadd se lambi value 400 deti hai', async () => {
    const res = await authed('patch', '/api/settings/integrations', adminJar).send({
      header: 'x'.repeat(20001),
    })

    expect(res.status).toBe(400)
  })

  // ── suraksha ────────────────────────────────────────────────────────────────

  it('editor ise chhoo bhi nahi sakta — 403', async () => {
    const res = await authed('patch', '/api/settings/integrations', editorJar).send({
      header: GTM,
    })

    expect(res.status).toBe(403)
  })

  it('author bhi nahi — 403', async () => {
    expect(
      (await authed('patch', '/api/settings/integrations', authorJar).send({ header: GTM })).status,
    ).toBe(403)
  })

  /**
   * ⚠️ **Ye is poore feature ka sabse zaroori test hai — aur isne mera ek galat comment pakda.**
   *
   * Pehle yahan likha tha ki "editor `PATCH /api/settings` chala sakta hai", aur test usse 200 ki
   * ummeed kar raha tha. Wo **galat** tha: `settings.update` bhi aaj **sirf admin** ke paas hai
   * (editor settings sirf padh sakta hai — spec 001). Test ne 403 de kar wo jhooth pakad liya, aur
   * usi wajah se `routes.js`, `service.js`, schema aur screen — chaaron ke comments theek karne pade.
   *
   * Asli baat phir bhi wahi hai: agar `integrations` aam route ke schema me hota, to
   * `settings.update` wala **koi bhi** role use likh deta aur permission ka pehra bemaani ho jaata.
   * Zod anjaan key girati hai, isliye request 200 laut-ti hai par DB me kuch nahi jaata.
   */
  it('aam settings route se integrations likha hi nahi ja sakta — admin bhi nahi', async () => {
    /** ⚠️ Document abhi bana bhi nahi ho sakta — `beforeEach` use mita deta hai aur wo pehle write pe banta hai. */
    const before = (await Settings.findOne({}).lean())?.integrations?.header ?? ''

    const asAdmin = await authed('patch', '/api/settings', adminJar).send({
      integrations: { header: '<script>evil()</script>' },
    })

    expect(asAdmin.status).toBe(200)

    const stored = await Settings.findOne({}).lean()
    expect(stored.integrations?.header ?? '').toBe(before)
    expect(stored.integrations?.header ?? '').not.toContain('evil')
  })

  it('bina login ke 401', async () => {
    expect((await request(app).patch('/api/settings/integrations').send({})).status).toBe(401)
  })

  /** Khaali chhodna poori tarah theek hai — theme us jagah kuch bhi nahi likhti (D-30). */
  it('khaali string likhi ja sakti hai — "hata do" ka matlab', async () => {
    await authed('patch', '/api/settings/integrations', adminJar).send({ header: GTM })
    await authed('patch', '/api/settings/integrations', adminJar).send({ header: '' })

    expect((await Settings.findOne({}).lean()).integrations.header).toBe('')
  })
})
