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
