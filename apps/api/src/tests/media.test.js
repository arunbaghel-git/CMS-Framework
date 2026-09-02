import { rm } from 'node:fs/promises'
import path from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import sharp from 'sharp'

import { createApp } from '../app.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { Media } from '../modules/media/model.js'
import { getStorageDriver } from '../modules/media/storage/index.js'
import { RefreshToken } from '../modules/auth/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'
import { connectTestDb, disconnectTestDb } from './db.js'

/**
 * Media foundation tests.
 *
 * Upload/storage/delete intentionally nahi hain (D-41). Tests sirf metadata read/list
 * aur metadata update ka contract pin karte hain.
 */

const PASSWORD = 'ek-lamba-sa-passphrase'
const app = createApp()
/**
 * ✅ A-16 theek ho chuka (2 Sep). Neeche wali `beforeEach` is folder ko **har test se
 * pehle** `rm -r` karti hai — isliye ye path kya hai, wahi poora bug tha.
 *
 * Pehle yahan `path.resolve(process.cwd(), 'apps/api/uploads')` hardcoded tha, yaani dev
 * ka **asli** upload folder. Har `pnpm test` client ki saari uploaded images le jaata tha.
 * DB ke records bache rehte the aur sirf files jaati thi, isiliye lakshan galat jagah
 * dikhta tha: admin ki Media list bhari hui, aur wahi image public page pe 404.
 *
 * Ab ye app ke **apne** storage driver se aata hai, hardcoded nahi. Yaani jahan app sach
 * me likhti hai theek wahi folder saaf hota hai — dono kabhi alag ho hi nahi sakte. Folder
 * khud `vitest.config.js` ke `UPLOAD_DIR` se aata hai (`./.test-uploads-media`).
 */
const UPLOAD_ROOT = getStorageDriver().root

/**
 * Doosri deewar. Agar kisi ne `UPLOAD_DIR` wapas kisi asli folder pe kar diya, to ye file
 * **chalne se pehle** phat jaayegi — data mit jaane ke baad nahi. Ek `rm -r` wali test ko
 * apne throwaway folder ke bahar kabhi nahi jaana chahiye.
 */
if (!path.basename(UPLOAD_ROOT).startsWith('.test-')) {
  throw new Error(
    'media.test.js sirf throwaway upload folder pe chal sakti hai (A-16). ' +
      `Abhi wo "${UPLOAD_ROOT}" pe hai — vitest.config.js ka UPLOAD_DIR dekho.`,
  )
}

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

function uploadRequest(jar) {
  return authed('post', '/api/media', jar)
}

async function makeMedia(input = {}) {
  const uploader = await User.findOne({ email: 'admin@test.com' }).lean()

  return Media.create({
    filename: 'hero.jpg',
    mime: 'image/jpeg',
    size: 12345,
    width: 1600,
    height: 900,
    variants: [
      {
        key: 'thumb',
        url: '/uploads/sites/default/media/2026/08/media-id/thumb.webp',
        w: 300,
        h: 169,
      },
      {
        key: 'medium',
        url: '/uploads/sites/default/media/2026/08/media-id/medium.webp',
        w: 800,
        h: 450,
      },
      {
        key: 'large',
        url: '/uploads/sites/default/media/2026/08/media-id/large.webp',
        w: 1600,
        h: 900,
      },
    ],
    uploadedBy: uploader._id,
    ...input,
  })
}

let adminJar
let editorJar
let authorJar
let salesJar

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  // Throwaway folder peeche mat chhodo — warna wo repo me pada rehta hai
  await rm(UPLOAD_ROOT, { recursive: true, force: true })
  await disconnectTestDb()
})

beforeEach(async () => {
  await rm(UPLOAD_ROOT, { recursive: true, force: true })
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    RefreshToken.deleteMany({}),
    Media.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()

  for (const [username, email, role] of [
    ['boss', 'admin@test.com', 'admin'],
    ['ed', 'ed@test.com', 'editor'],
    ['auth', 'author@test.com', 'author'],
    ['sales', 'sales@test.com', 'salesAgent'],
  ]) {
    await createUser({ username, name: username, email, role, password: PASSWORD })
  }

  adminJar = await loginAs('admin@test.com')
  editorJar = await loginAs('ed@test.com')
  authorJar = await loginAs('author@test.com')
  salesJar = await loginAs('sales@test.com')
})

describe('GET /api/media', () => {
  it('bina login ke 401', async () => {
    expect((await request(app).get('/api/media')).status).toBe(401)
  })

  it('media metadata paginated list deta hai aur trash hide karta hai', async () => {
    const visible = await makeMedia({ filename: 'hero.jpg', title: 'Homepage hero' })
    await makeMedia({ filename: 'old.jpg', deletedAt: new Date() })

    const res = await authed('get', '/api/media?limit=10', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10, total: 1, pages: 1 })
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({
      id: String(visible._id),
      filename: 'hero.jpg',
      title: 'Homepage hero',
      mime: 'image/jpeg',
    })
    expect(res.body.data[0]).not.toHaveProperty('deletedAt')
  })

  it('query params validate hote hain', async () => {
    const res = await authed('get', '/api/media?limit=1000', adminJar)
    expect(res.status).toBe(400)
  })

  it('author media padh sakta hai', async () => {
    await makeMedia()
    expect((await authed('get', '/api/media', authorJar)).status).toBe(200)
  })
})

describe('GET /api/media/:id', () => {
  it('ek media item deta hai', async () => {
    const media = await makeMedia({ alt: 'Beach view' })

    const res = await authed('get', `/api/media/${media._id}`, editorJar)

    expect(res.status).toBe(200)
    expect(res.body.data.media).toMatchObject({
      id: String(media._id),
      alt: 'Beach view',
      variants: expect.arrayContaining([expect.objectContaining({ key: 'thumb', w: 300, h: 169 })]),
    })
  })

  it('deleted media 404 deta hai', async () => {
    const media = await makeMedia({ deletedAt: new Date() })

    expect((await authed('get', `/api/media/${media._id}`, adminJar)).status).toBe(404)
  })
})

describe('PATCH /api/media/:id', () => {
  it('metadata update karta hai', async () => {
    const media = await makeMedia()

    const res = await authed('patch', `/api/media/${media._id}`, editorJar).send({
      alt: 'Logo on white background',
      title: 'Site logo',
      caption: 'Used in header',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.media).toMatchObject({
      id: String(media._id),
      alt: 'Logo on white background',
      title: 'Site logo',
      caption: 'Used in header',
    })
  })

  it('author metadata update nahi kar sakta', async () => {
    const media = await makeMedia({ alt: 'Original' })

    const res = await authed('patch', `/api/media/${media._id}`, authorJar).send({
      alt: 'Hijack',
    })

    expect(res.status).toBe(403)
    expect((await Media.findById(media._id).lean()).alt).toBe('Original')
  })

  it('unknown field reject hota hai', async () => {
    const media = await makeMedia()

    const res = await authed('patch', `/api/media/${media._id}`, editorJar).send({
      filename: 'rename.jpg',
    })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/media', () => {
  it('valid image upload karta hai aur media record banata hai', async () => {
    const png = await sharp({
      create: {
        width: 16,
        height: 9,
        channels: 3,
        background: { r: 32, g: 96, b: 160 },
      },
    })
      .png()
      .toBuffer()

    const res = await uploadRequest(adminJar)
      .field('alt', 'Blue test image')
      .field('title', 'Integration upload')
      .attach('file', png, { filename: 'Hero Upload.PNG', contentType: 'image/png' })

    expect(res.status).toBe(201)
    expect(res.body.data.media).toMatchObject({
      filename: 'hero-upload.png',
      mime: 'image/png',
      size: png.length,
      width: 16,
      height: 9,
      alt: 'Blue test image',
      title: 'Integration upload',
      uploadedBy: expect.any(String),
    })
    expect(res.body.data.media.variants).toEqual([
      expect.objectContaining({ key: 'thumb', w: 16, h: 9 }),
      expect.objectContaining({ key: 'medium', w: 16, h: 9 }),
      expect.objectContaining({ key: 'large', w: 16, h: 9 }),
    ])

    const stored = await Media.findById(res.body.data.media.id).lean()
    expect(stored).toMatchObject({
      filename: 'hero-upload.png',
      mime: 'image/png',
      alt: 'Blue test image',
      title: 'Integration upload',
    })

    const served = await request(app).get(res.body.data.media.variants[0].url)
    expect(served.status).toBe(200)
    expect(served.headers['content-type']).toMatch(/image\/webp/)
  })

  it('SVG upload reject karta hai', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script /></svg>')

    const res = await uploadRequest(adminJar).attach('file', svg, {
      filename: 'logo.svg',
      contentType: 'image/svg+xml',
    })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/Unsupported media type: image\/svg\+xml/)
    expect(await Media.countDocuments()).toBe(0)
  })

  it('media.upload permission ke bina upload nahi hota', async () => {
    const res = await uploadRequest(salesJar).attach('file', Buffer.from('not-read'), {
      filename: 'blocked.png',
      contentType: 'image/png',
    })

    expect(res.status).toBe(403)
    expect(res.body.error.message).toContain('media.upload')
    expect(await Media.countDocuments()).toBe(0)
  })

  it('bina login ke 401', async () => {
    expect((await request(app).post('/api/media')).status).toBe(401)
  })
})

describe('D-41 deferred routes', () => {
  it('delete route abhi nahi hai', async () => {
    const media = await makeMedia()
    expect((await authed('delete', `/api/media/${media._id}`, adminJar)).status).toBe(404)
  })
})
