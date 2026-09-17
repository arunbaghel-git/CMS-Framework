import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { ContentType } from '../modules/content-types/model.js'
import { ensureBuiltInContentTypes } from '../modules/content-types/service.js'
import { Entry } from '../modules/entries/model.js'
import { Redirect } from '../modules/redirects/model.js'
import { recordAutoRedirect } from '../modules/redirects/service.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * `Settings ▸ 301 Redirects` — haath se banaye redirect (D-97, 17 Sep).
 *
 * Sabse zaroori teen, aur teeno "kuch na hona" wali galti se bachate hain (D-86):
 *
 *   1. **Page wale path pe redirect nahi banta** — warna wo kabhi chalta hi nahi
 *   2. **Page baad me bane to page jeet-ta hai** — resolve ka kram (D-97 §3)
 *   3. **Auto-redirect admin wale ko overwrite nahi karta**
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
let authorJar

const create = (body, jar = adminJar) => authed('post', '/api/redirects', jar).send(body)
const resolve = (path) => request(app).get('/api/public/resolve').query({ path })

async function makePage(path, status = 'published') {
  return Entry.create({
    siteId: 'default',
    locale: 'en',
    type: 'page',
    title: 'Offers',
    slug: path.split('/').pop(),
    path,
    status,
    publishedAt: status === 'published' ? new Date() : null,
  })
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
    Entry.deleteMany({}),
    ContentType.deleteMany({}),
    Redirect.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()
  await ensureBuiltInContentTypes()

  for (const [username, email, role] of [
    ['boss', 'admin@test.com', 'admin'],
    ['auth', 'author@test.com', 'author'],
  ]) {
    await createUser({ username, name: username, email, role, password: PASSWORD })
  }

  adminJar = await loginAs('admin@test.com')
  authorJar = await loginAs('author@test.com')
})

describe('create', () => {
  it('/packages/ → listing page — normalize hota hai aur resolve 301 deta hai', async () => {
    const res = await create({ from: '/Packages/', to: '/andaman-tour-packages/' })

    expect(res.status).toBe(201)
    expect(res.body.data.redirect).toMatchObject({
      from: '/packages',
      to: '/andaman-tour-packages',
      statusCode: 301,
      isAuto: false,
    })

    // trailing slash aur bada akshar — dono pe wahi redirect
    for (const path of ['/packages', '/packages/', '/PACKAGES']) {
      const out = await resolve(path)
      expect(out.body.data).toEqual({
        kind: 'redirect',
        to: '/andaman-tour-packages',
        statusCode: 301,
      })
    }
  })

  it('purane site ka URL (.html, underscore) bhi from ban sakta hai', async () => {
    const res = await create({ from: '/Old_Tour.html', to: '/packages/x' })
    expect(res.status).toBe(201)
    expect(res.body.data.redirect.from).toBe('/old_tour.html')
  })

  it('bahar ka https link aur 302 chalte hain; javascript: / http: / // nahi', async () => {
    const ok = await create({
      from: '/whatsapp',
      to: 'https://wa.me/919999999999',
      statusCode: 302,
    })
    expect(ok.status).toBe(201)
    expect((await resolve('/whatsapp')).body.data).toEqual({
      kind: 'redirect',
      to: 'https://wa.me/919999999999',
      statusCode: 302,
    })

    expect((await create({ from: '/a', to: 'javascript:alert(1)' })).status).toBe(400)
    expect((await create({ from: '/b', to: 'http://example.com' })).status).toBe(400)
    expect((await create({ from: '/c', to: '//evil.com' })).status).toBe(400)
  })

  it('home, query wala from, aur khud pe redirect — teeno mana', async () => {
    expect((await create({ from: '/', to: '/x' })).status).toBe(400)
    expect((await create({ from: '/a?b=1', to: '/x' })).status).toBe(400)
    expect((await create({ from: '/same', to: '/same/' })).status).toBe(422)
  })

  it('jis path pe page hai (draft bhi) wahan redirect nahi banta — naam ke saath message', async () => {
    await makePage('/offers', 'draft')

    const res = await create({ from: '/offers', to: '/packages' })
    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('"Offers" lives at /offers')
    expect(await Redirect.countDocuments()).toBe(0)
  })

  it('ek from pe do redirect nahi', async () => {
    await create({ from: '/a', to: '/b' })
    const res = await create({ from: '/a', to: '/c' })
    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('/a already redirects to /b')
  })

  it('loop mana — /a → /b ho to /b → /a nahi', async () => {
    await create({ from: '/a', to: '/b' })
    const res = await create({ from: '/b', to: '/a' })
    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('loop')
  })

  it('chain nahi bachti — dono taraf se', async () => {
    // to khud redirect ho: /b → /c pehle se, phir /a → /b  ⇒  /a seedha /c
    await create({ from: '/b', to: '/c' })
    const a = await create({ from: '/a', to: '/b' })
    expect(a.body.data.redirect.to).toBe('/c')

    // naya redirect kisi ke to pe baitha: /x → /y, phir /y → /z  ⇒  /x bhi /z
    await create({ from: '/x', to: '/y' })
    await create({ from: '/y', to: '/z' })
    expect((await Redirect.findOne({ from: '/x' }).lean()).to).toBe('/z')
  })

  it('author ke paas redirect.create nahi — 403', async () => {
    expect((await create({ from: '/a', to: '/b' }, authorJar)).status).toBe(403)
  })
})

describe('resolve ka kram (D-97 §3)', () => {
  it('redirect ke baad usi path pe page publish ho to page dikhta hai', async () => {
    await create({ from: '/offers', to: '/packages' })
    await makePage('/offers')

    expect((await resolve('/offers')).body.data.kind).toBe('entry')
  })

  it('draft page redirect ko nahi rokta — 404 ki jagah redirect', async () => {
    await create({ from: '/offers', to: '/packages' })
    await makePage('/offers', 'draft')

    expect((await resolve('/offers')).body.data.kind).toBe('redirect')
  })
})

describe('update · delete · list', () => {
  it('auto redirect edit karo to wo manual ban jaata hai', async () => {
    await recordAutoRedirect('/packages/old', '/packages/new')
    const auto = await Redirect.findOne({ from: '/packages/old' }).lean()

    const res = await authed('patch', `/api/redirects/${auto._id}`, adminJar).send({
      to: '/packages/newer',
      statusCode: 302,
    })

    expect(res.status).toBe(200)
    expect(res.body.data.redirect).toMatchObject({
      to: '/packages/newer',
      statusCode: 302,
      isAuto: false,
    })
  })

  it('edit apne hi from pe "already redirects" nahi kehta', async () => {
    const { body } = await create({ from: '/a', to: '/b' })
    const res = await authed('patch', `/api/redirects/${body.data.redirect.id}`, adminJar).send({
      from: '/a',
      to: '/c',
    })
    expect(res.status).toBe(200)
  })

  it('auto-redirect admin ke banaye redirect ko overwrite nahi karta', async () => {
    await create({ from: '/packages/old', to: '/andaman-tour-packages' })
    await recordAutoRedirect('/packages/old', '/packages/new')

    const doc = await Redirect.findOne({ from: '/packages/old' }).lean()
    expect(doc).toMatchObject({ to: '/andaman-tour-packages', isAuto: false })
  })

  it('delete ke baad resolve 404', async () => {
    const { body } = await create({ from: '/a', to: '/b' })
    await authed('delete', `/api/redirects/${body.data.redirect.id}`, adminJar).expect(200)
    expect((await resolve('/a')).status).toBe(404)
  })

  it('list: search from/to dono pe, aur Manual/Automatic filter ("false" sach me false)', async () => {
    await create({ from: '/whatsapp', to: 'https://wa.me/91999' })
    await recordAutoRedirect('/packages/old', '/packages/new')

    const byTo = await authed('get', '/api/redirects?q=wa.me', adminJar)
    expect(byTo.body.data.redirects.map((r) => r.from)).toEqual(['/whatsapp'])

    const manual = await authed('get', '/api/redirects?isAuto=false', adminJar)
    expect(manual.body.data.redirects.map((r) => r.from)).toEqual(['/whatsapp'])

    const auto = await authed('get', '/api/redirects?isAuto=true', adminJar)
    expect(auto.body.data.redirects.map((r) => r.from)).toEqual(['/packages/old'])
    expect(auto.body.meta.total).toBe(1)
  })
})
