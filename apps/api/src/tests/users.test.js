import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Users module ka integration test — asli Mongo pe.
 *
 * Yahan sabse zaroori cheez **guards** hain (D-34): admin delete nahi hota, aakhri
 * admin demote nahi hota, aur koi apna account nahi mita sakta. Ye teenon service me
 * hain, middleware me nahi — isliye inhe route ke through hi test karna sahi hai.
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
    const name = pair.slice(0, idx)
    const value = pair.slice(idx + 1)
    if (value) jar[name] = value
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

/** Har authenticated request ke liye cookies + CSRF header ek saath. */
function authed(method, url, jar) {
  const req = request(app)[method](url).set('Cookie', asHeader(jar))
  return jar[COOKIE.CSRF] ? req.set(CSRF_HEADER, jar[COOKIE.CSRF]) : req
}

let adminJar
let editorId
let adminId

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Role.deleteMany({}), RefreshToken.deleteMany({})])
  invalidateRoleCache()
  await ensureDefaultRoles()

  const admin = await createUser(
    { username: 'boss', name: 'Boss', email: 'admin@test.com', role: 'admin', password: PASSWORD },
    { mustChangePassword: false },
  )
  const editor = await createUser(
    { username: 'editor1', name: 'Ed', email: 'ed@test.com', role: 'editor', password: PASSWORD },
    { mustChangePassword: false },
  )

  adminId = admin.id
  editorId = editor.id
  adminJar = await loginAs('admin@test.com')
})

describe('GET /api/users', () => {
  it('list aur role counts deta hai', async () => {
    const res = await authed('get', '/api/users', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.meta.total).toBe(2)
    expect(res.body.meta.counts).toEqual({ all: 2, admin: 1, editor: 1 })
  })

  it('passwordHash kabhi list me nahi aata', async () => {
    const res = await authed('get', '/api/users', adminJar)
    expect(JSON.stringify(res.body)).not.toContain('$2')
  })

  it('server-side pagination karta hai (R14)', async () => {
    for (let i = 0; i < 5; i++) {
      await createUser({
        username: `u${i}`,
        name: `U${i}`,
        email: `u${i}@test.com`,
        role: 'author',
        password: PASSWORD,
      })
    }

    const res = await authed('get', '/api/users?page=2&limit=3', adminJar)

    expect(res.body.data).toHaveLength(3)
    expect(res.body.meta).toMatchObject({ page: 2, limit: 3, total: 7, pages: 3 })
  })

  it('role se filter hota hai, par counts poore rehte hain', async () => {
    const res = await authed('get', '/api/users?role=editor', adminJar)

    expect(res.body.data).toHaveLength(1)
    // Tabs par hamesha poora total dikhna chahiye, warna filter lagate hi baaki 0 ho jaate
    expect(res.body.meta.counts.all).toBe(2)
  })

  it('search naam, email aur username teenon me dekhta hai', async () => {
    expect((await authed('get', '/api/users?search=boss', adminJar)).body.data).toHaveLength(1)
    expect((await authed('get', '/api/users?search=ed@test', adminJar)).body.data).toHaveLength(1)
  })

  it('regex wala search crash nahi karta', async () => {
    // Bina escape ke `(` ek invalid regex hai aur 500 de deta
    const res = await authed('get', '/api/users?search=%28%28%28', adminJar)
    expect(res.status).toBe(200)
  })

  it('limit ki upper bound lagti hai', async () => {
    const res = await authed('get', '/api/users?limit=99999', adminJar)
    expect(res.status).toBe(400)
  })

  it('bina login ke 401', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401)
  })

  it('editor ke paas user.read nahi hai — 403', async () => {
    const editorJar = await loginAs('ed@test.com')
    expect((await authed('get', '/api/users', editorJar)).status).toBe(403)
  })
})

describe('galat id', () => {
  it('bekaar id pe 404 deta hai, 500 nahi', async () => {
    // Mongoose CastError client ki galti hai — 500 se logs bhar jaate aur monitoring
    // alert karti, jabki asli baat sirf ye hoti ki kisi ne galat link khola
    const res = await authed('get', '/api/users/ye-koi-id-nahi', adminJar)
    expect(res.status).toBe(404)
  })

  it('bekaar id pe PATCH bhi 404 deta hai', async () => {
    const res = await authed('patch', '/api/users/ye-koi-id-nahi', adminJar).send({ name: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/users', () => {
  const newUser = {
    username: 'neha.s',
    name: 'Neha Sharma',
    email: 'neha@test.com',
    role: 'salesAgent',
    password: 'neha-ka-lamba-password',
  }

  it('naya user banata hai', async () => {
    const res = await authed('post', '/api/users', adminJar).send(newUser)

    expect(res.status).toBe(201)
    expect(res.body.data.user.username).toBe('neha.s')
    // Koi gate nahi — user seedha admin wale password se andar aata hai (D-35)
    expect(res.body.data.user.mustChangePassword).toBe(false)
  })

  it('naya user apne password se login kar leta hai', async () => {
    await authed('post', '/api/users', adminJar).send(newUser)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'neha@test.com', password: newUser.password })

    expect(res.status).toBe(200)
  })

  it('username na do to email se ban jaata hai', async () => {
    const { username: _skip, ...withoutUsername } = newUser
    const res = await authed('post', '/api/users', adminJar).send(withoutUsername)

    expect(res.body.data.user.username).toBe('neha')
  })

  it('duplicate email pe 422', async () => {
    const res = await authed('post', '/api/users', adminJar).send({
      ...newUser,
      email: 'ed@test.com',
    })
    expect(res.status).toBe(422)
  })

  it('duplicate username pe 422 — chupchaap badalta nahi', async () => {
    const res = await authed('post', '/api/users', adminJar).send({
      ...newUser,
      username: 'editor1',
    })

    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('editor1')
  })

  it('chhota password 400 deta hai', async () => {
    const res = await authed('post', '/api/users', adminJar).send({ ...newUser, password: 'abc' })
    expect(res.status).toBe(400)
  })

  it('anjaan role 422 deta hai — Zod shape pass kar deta hai, service wajood check karti hai', async () => {
    const res = await authed('post', '/api/users', adminJar).send({ ...newUser, role: 'wizard' })

    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('wizard')
  })
})

describe('PATCH /api/users/:id', () => {
  it('naam aur role badal deta hai', async () => {
    const res = await authed('patch', `/api/users/${editorId}`, adminJar).send({
      name: 'Ed Naya',
      role: 'author',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.user).toMatchObject({ name: 'Ed Naya', role: 'author' })
  })

  it('username badalna chupchaap ignore hota hai — wo immutable hai', async () => {
    await authed('patch', `/api/users/${editorId}`, adminJar).send({ username: 'naya-naam' })

    const user = await User.findById(editorId).lean()
    expect(user.username).toBe('editor1')
  })

  it('AAKHRI admin ka role nahi badal sakta', async () => {
    // Warna aakhri admin khud ko Editor bana kar poori site lock kar sakta hai
    const res = await authed('patch', `/api/users/${adminId}`, adminJar).send({ role: 'editor' })

    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('last administrator')
  })

  it('do admin hon to ek ka role badal sakta hai', async () => {
    const second = await createUser({
      username: 'admin2',
      name: 'Admin Do',
      email: 'admin2@test.com',
      role: 'admin',
      password: PASSWORD,
    })

    const res = await authed('patch', `/api/users/${second.id}`, adminJar).send({ role: 'editor' })
    expect(res.status).toBe(200)
  })

  it('admin naya password set kar sakta hai', async () => {
    await authed('patch', `/api/users/${editorId}`, adminJar).send({
      password: 'bilkul-naya-passphrase',
    })

    const purana = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ed@test.com', password: PASSWORD })
    const naya = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ed@test.com', password: 'bilkul-naya-passphrase' })

    expect(purana.status).toBe(401)
    expect(naya.status).toBe(200)
  })

  it('password set karne pe uske chalu sessions kat jaate hain', async () => {
    // Purane sessions purane password ki umeed pe khule the
    await loginAs('ed@test.com')
    await authed('patch', `/api/users/${editorId}`, adminJar).send({
      password: 'bilkul-naya-passphrase',
    })

    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(1) // sirf admin ka
  })

  it('chhota password 400 deta hai', async () => {
    const res = await authed('patch', `/api/users/${editorId}`, adminJar).send({
      password: 'chhota',
    })
    expect(res.status).toBe(400)
  })

  it('deactivate karne pe uske sessions turant kat jaate hain', async () => {
    const editorJar = await loginAs('ed@test.com')
    expect((await authed('get', '/api/me', editorJar)).status).toBe(200)

    await authed('patch', `/api/users/${editorId}`, adminJar).send({ status: 'inactive' })

    expect((await authed('get', '/api/me', editorJar)).status).toBe(401)
  })

  it('apna hi account deactivate nahi kar sakte', async () => {
    const res = await authed('patch', `/api/users/${adminId}`, adminJar).send({
      status: 'inactive',
    })
    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/users/:id — guards (D-34)', () => {
  it('normal user delete ho jaata hai', async () => {
    const res = await authed('delete', `/api/users/${editorId}`, adminJar).send({})

    expect(res.status).toBe(200)
    expect(await User.findById(editorId)).toBeNull()
  })

  it('ADMINISTRATOR delete nahi hota', async () => {
    const second = await createUser({
      username: 'admin2',
      name: 'Admin Do',
      email: 'admin2@test.com',
      role: 'admin',
      password: PASSWORD,
    })

    const res = await authed('delete', `/api/users/${second.id}`, adminJar).send({})

    expect(res.status).toBe(403)
    expect(res.body.error.message).toContain('Deactivate')
    expect(await User.findById(second.id)).not.toBeNull()
  })

  it('apna hi account delete nahi kar sakte', async () => {
    const res = await authed('delete', `/api/users/${adminId}`, adminJar).send({})
    expect(res.status).toBe(403)
  })

  it('demote karke delete karne ka raasta bhi band hai', async () => {
    // Aakhri admin ko pehle editor banane ki koshish — wahi pe ruk jaata hai
    const demote = await authed('patch', `/api/users/${adminId}`, adminJar).send({ role: 'editor' })
    expect(demote.status).toBe(422)

    // Aur admin abhi bhi admin hai, isliye delete bhi nahi chalta
    expect((await authed('delete', `/api/users/${adminId}`, adminJar).send({})).status).toBe(403)
  })

  it('delete hone pe uske saare sessions revoke ho jaate hain', async () => {
    // Sirf session banane ke liye — jar ki zaroorat nahi, uska revoke hona check karna hai
    await loginAs('ed@test.com')
    await authed('delete', `/api/users/${editorId}`, adminJar).send({})

    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(1) // sirf admin ka
  })

  it('content usi user ko dene ki koshish 422 deti hai', async () => {
    const res = await authed('delete', `/api/users/${editorId}`, adminJar).send({
      reassignToId: editorId,
    })
    expect(res.status).toBe(422)
  })

  it('anjaan user ko content dene pe 422', async () => {
    const res = await authed('delete', `/api/users/${editorId}`, adminJar).send({
      reassignToId: '6a86b6711098fc547e54ea7d',
    })
    expect(res.status).toBe(422)
  })

  it('sahi reassign target ke saath delete chalta hai', async () => {
    const other = await createUser({
      username: 'other',
      name: 'Other',
      email: 'other@test.com',
      role: 'author',
      password: PASSWORD,
    })

    const res = await authed('delete', `/api/users/${editorId}`, adminJar).send({
      reassignToId: other.id,
    })

    expect(res.status).toBe(200)
    // entries collection abhi hai hi nahi — 0 aana sahi hai (D-30)
    expect(res.body.data.reassigned).toEqual({ entries: 0 })
  })

  it('editor ke paas user.delete nahi hai — 403', async () => {
    const editorJar = await loginAs('ed@test.com')
    const res = await authed('delete', `/api/users/${adminId}`, editorJar).send({})
    expect(res.status).toBe(403)
  })

  it('bina CSRF header ke delete nahi hota', async () => {
    const res = await request(app)
      .delete(`/api/users/${editorId}`)
      .set('Cookie', asHeader(adminJar))

    expect(res.status).toBe(400)
    expect(await User.findById(editorId)).not.toBeNull()
  })
})

describe('GET /api/roles', () => {
  it('paanchon roles deta hai', async () => {
    const res = await authed('get', '/api/roles', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(5)
    expect(res.body.data.map((r) => r.key).sort()).toEqual([
      'admin',
      'author',
      'contributor',
      'editor',
      'salesAgent',
    ])
  })

  it('permissions ki poori list nahi bhejta, sirf count', async () => {
    const res = await authed('get', '/api/roles', adminJar)
    expect(res.body.data[0].permissions).toBeUndefined()
    expect(typeof res.body.data[0].permissionCount).toBe('number')
  })

  it('code me juda naya permission chalu instance tak pahunchta hai', async () => {
    /**
     * Ye asli bug tha: roles ek baar seed hote the aur uske baad skip. Code me
     * `user.delete` juda par kisi chalu instance tak pahuncha hi nahi — admin ko
     * Delete button dikhna band ho gaya aur koi error kahin nahi aaya.
     */
    await Role.updateOne({ key: 'admin' }, { $set: { permissions: ['entry.read'] } })

    const result = await ensureDefaultRoles()
    const admin = await Role.findOne({ key: 'admin' }).lean()

    expect(admin.permissions).toContain('user.delete')
    expect(result.find((r) => r.key === 'admin').action).toBe('synced')
  })

  it('custom role (isBuiltIn: false) ko sync haath nahi lagata', async () => {
    // Uski permissions admin ne set ki hain, code ne nahi
    await Role.create({ key: 'special', label: 'Special', permissions: ['entry.read'] })

    await ensureDefaultRoles()

    const special = await Role.findOne({ key: 'special' }).lean()
    expect(special.permissions).toEqual(['entry.read'])
  })

  it('kuch na badla ho to up-to-date batata hai', async () => {
    const result = await ensureDefaultRoles()
    expect(result.every((r) => r.action === 'up-to-date')).toBe(true)
  })

  it('editor ke paas role.read nahi hai — 403', async () => {
    const editorJar = await loginAs('ed@test.com')
    expect((await authed('get', '/api/roles', editorJar)).status).toBe(403)
  })
})
