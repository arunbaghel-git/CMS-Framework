import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

/**
 * `revalidateTags` ka mock — test me wo waise bhi network nahi chhoota (`skipped`), par yahan
 * **fail wala raasta** bhi chalana hai: site na mile to button jhootha "Cleared" na bole.
 */
const revalidate = vi.hoisted(() => ({ calls: [], ok: true }))
vi.mock('../core/revalidate.js', () => ({
  revalidateTags: vi.fn(async (tags) => {
    revalidate.calls.push(tags)
    return { ok: revalidate.ok, tags }
  }),
}))

const { CACHE_TAG_ALL, PERMISSION, ROLE_PERMISSIONS } = await import('@cms/shared')
const { createApp } = await import('../app.js')
const { connectTestDb, disconnectTestDb } = await import('./db.js')
const { COOKIE } = await import('../core/tokens.js')
const { CSRF_HEADER } = await import('../middleware/csrf.js')
const { RefreshToken } = await import('../modules/auth/model.js')
const { resetFlushCooldown } = await import('../modules/cache/service.js')
const { Role } = await import('../modules/roles/model.js')
const { ensureDefaultRoles, invalidateRoleCache } = await import('../modules/roles/service.js')
const { User } = await import('../modules/users/model.js')
const { createUser } = await import('../modules/users/service.js')

/**
 * Topbar ka ⟳ Cache — client, 24 Sep (A-53). Teen baatein: kaun daba sakta hai (publish karne
 * wale), ek minute ki rok, aur fail hone pe saaf error.
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

async function flushAs(email) {
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD })
  const jar = cookieJar(login)

  return request(app)
    .post('/api/cache/flush')
    .set('Cookie', asHeader(jar))
    .set(CSRF_HEADER, jar[COOKIE.CSRF])
}

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
  resetFlushCooldown()
  revalidate.calls.length = 0
  revalidate.ok = true

  for (const [username, role] of [
    ['admin', 'admin'],
    ['editor', 'editor'],
    ['author', 'author'],
    ['contrib', 'contributor'],
    ['sales', 'salesAgent'],
  ]) {
    await createUser({
      username,
      name: username,
      email: `${username}@test.com`,
      role,
      password: PASSWORD,
    })
  }
})

describe('POST /api/cache/flush', () => {
  it('publish karne wale teeno role daba sakte hain', async () => {
    for (const who of ['admin', 'editor', 'author']) {
      resetFlushCooldown()
      const res = await flushAs(`${who}@test.com`)
      expect(res.status, who).toBe(200)
      expect(res.body.data.clearedAt).toBeTruthy()
    }
  })

  it('contributor aur sales agent nahi — dono kuch live nahi karte', async () => {
    expect((await flushAs('contrib@test.com')).status).toBe(403)
    expect((await flushAs('sales@test.com')).status).toBe(403)
    expect(revalidate.calls).toHaveLength(0)
  })

  it('bina login 401', async () => {
    expect((await request(app).post('/api/cache/flush')).status).toBe(401)
  })

  it('sirf ek common tag jaata hai — wahi jo web har fetch pe lagata hai', async () => {
    await flushAs('admin@test.com')
    expect(revalidate.calls).toEqual([[CACHE_TAG_ALL]])
  })

  it('poori site pe ek minute me ek baar — doosre user pe bhi', async () => {
    expect((await flushAs('admin@test.com')).status).toBe(200)

    const again = await flushAs('editor@test.com')
    expect(again.status).toBe(429)
    expect(again.body.error.code).toBe('CACHE_RECENTLY_CLEARED')
    expect(revalidate.calls).toHaveLength(1)
  })

  it('site na mile to 502 aur saaf message — jhootha "Cleared" nahi, aur rok bhi nahi lagti', async () => {
    revalidate.ok = false
    const res = await flushAs('admin@test.com')
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('CACHE_FLUSH_FAILED')

    // Fail hua to turant dobara koshish ho sake
    revalidate.ok = true
    expect((await flushAs('admin@test.com')).status).toBe(200)
  })

  it('GET se kuch nahi hota (R13)', async () => {
    expect((await request(app).get('/api/cache/flush')).status).toBe(404)
  })
})

describe('cache.flush — roles', () => {
  it('admin · editor · author ke paas, contributor · salesAgent ke paas nahi', () => {
    const has = (role) => ROLE_PERMISSIONS[role].includes(PERMISSION.CACHE_FLUSH)

    expect(['admin', 'editor', 'author'].map(has)).toEqual([true, true, true])
    expect(['contributor', 'salesAgent'].map(has)).toEqual([false, false])
  })
})
