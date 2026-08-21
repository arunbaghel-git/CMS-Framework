import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { ROLE_LABEL } from '@cms/shared'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { invalidateRoleCache, ensureDefaultRoles } from '../modules/roles/service.js'
import { Role } from '../modules/roles/model.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Auth ka integration test — **asli Mongo pe**.
 *
 * In-memory mock se ye test bekaar ho jaata: reuse detection, TTL index aur unique
 * index sab DB ka behaviour hain, service ka nahi.
 *
 * Chalane se pehle: `pnpm db:up`
 */

const PASSWORD = 'ek-lamba-sa-passphrase'
const EMAIL = 'auth-test@example.com'

const app = createApp()

/** supertest ke `set-cookie` se ek cookie ki value nikaalta hai. */
function cookieValue(res, name) {
  const raw = res.headers['set-cookie'] ?? []
  const found = raw.find((c) => c.startsWith(`${name}=`))
  if (!found) return null

  const value = found.split(';')[0].slice(name.length + 1)
  return value === '' ? null : value
}

/** Saari cookies ko ek `Cookie` header string me badalta hai. */
function cookieJar(res, previous = {}) {
  const jar = { ...previous }

  for (const name of [COOKIE.ACCESS, COOKIE.REFRESH, COOKIE.CSRF]) {
    const value = cookieValue(res, name)
    if (value) jar[name] = value
    // clearCookie khaali value bhejta hai — jar se hata do
    else if ((res.headers['set-cookie'] ?? []).some((c) => c.startsWith(`${name}=;`))) {
      delete jar[name]
    }
  }

  return jar
}

const asHeader = (jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

async function login({ email = EMAIL, password = PASSWORD, rememberMe = false } = {}) {
  const res = await request(app).post('/api/auth/login').send({ email, password, rememberMe })
  return { res, jar: cookieJar(res) }
}

/**
 * Refresh bhi ek POST hai, isliye uspe bhi CSRF header lagta hai.
 *
 * Admin client ye token **cookie se padhta hai**, login response se nahi — page
 * reload ke baad koi login response bacha hi nahi hota. Isiliye CSRF cookie
 * `httpOnly` nahi hai.
 */
function refreshRequest(jar) {
  const req = request(app).post('/api/auth/refresh').set('Cookie', asHeader(jar))
  return jar[COOKIE.CSRF] ? req.set(CSRF_HEADER, jar[COOKIE.CSRF]) : req
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
  // `mustChangePassword: true` — taaki seed wale admin ka forced gate bhi test ho sake
  await createUser(
    { username: 'testadmin', name: 'Test Admin', email: EMAIL, role: 'admin', password: PASSWORD },
    { mustChangePassword: true },
  )
})

describe('POST /api/auth/login', () => {
  it('sahi credentials pe user aur teenon cookies deta hai', async () => {
    const { res, jar } = await login()

    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(EMAIL)
    expect(jar[COOKIE.ACCESS]).toBeTruthy()
    expect(jar[COOKIE.REFRESH]).toBeTruthy()
    expect(jar[COOKIE.CSRF]).toBeTruthy()
  })

  it('passwordHash kabhi response me nahi aata', async () => {
    const { res } = await login()
    expect(JSON.stringify(res.body)).not.toContain('$2')
    expect(res.body.data.user.passwordHash).toBeUndefined()
  })

  it('galat password pe 401', async () => {
    const { res } = await login({ password: 'bilkul-galat-password' })
    expect(res.status).toBe(401)
  })

  it('anjaan email pe wahi message deta hai jo galat password pe', async () => {
    // Warna koi bhi enumerate kar sakta hai ki kaunse emails registered hain
    const wrongPass = await login({ password: 'bilkul-galat-password' })
    const noUser = await login({ email: 'kabhi-tha-hi-nahi@example.com' })

    expect(noUser.res.status).toBe(401)
    expect(noUser.res.body.error.message).toBe(wrongPass.res.body.error.message)
  })

  it('email case aur spaces se farq nahi padta', async () => {
    const { res } = await login({ email: '  Auth-Test@Example.COM  ' })
    expect(res.status).toBe(200)
  })

  it('khaali password pe 400 deta hai, 401 nahi', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: EMAIL, password: '' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
  })

  it('inactive user login nahi kar paata', async () => {
    await User.updateOne({ email: EMAIL }, { $set: { status: 'inactive' } })
    const { res } = await login()
    expect(res.status).toBe(401)
  })

  it('rememberMe false pe refresh cookie session cookie hoti hai', async () => {
    const { res } = await login({ rememberMe: false })
    const raw = res.headers['set-cookie'].find((c) => c.startsWith(COOKIE.REFRESH))
    expect(raw).not.toMatch(/Max-Age/i)
  })

  it('rememberMe true pe refresh cookie persistent hoti hai', async () => {
    const { res } = await login({ rememberMe: true })
    const raw = res.headers['set-cookie'].find((c) => c.startsWith(COOKIE.REFRESH))
    expect(raw).toMatch(/Max-Age/i)
  })

  it('lastLoginAt set karta hai', async () => {
    await login()
    const user = await User.findOne({ email: EMAIL }).lean()
    expect(user.lastLoginAt).toBeInstanceOf(Date)
  })
})

describe('GET /api/me', () => {
  it('bina login ke 401', async () => {
    const res = await request(app).get('/api/me')
    expect(res.status).toBe(401)
  })

  it('login ke baad user aur uski permissions deta hai', async () => {
    const { jar } = await login()
    const res = await request(app).get('/api/me').set('Cookie', asHeader(jar))

    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(EMAIL)
    expect(res.body.data.user.permissions).toContain('entry.publish')
    expect(res.body.data.user.permissions).toContain('settings.scripts.update')
  })

  it('bekaar access token pe 401', async () => {
    const res = await request(app).get('/api/me').set('Cookie', `${COOKIE.ACCESS}=jhoota-token`)
    expect(res.status).toBe(401)
  })
})

describe('CSRF', () => {
  it('logged-in POST bina CSRF header ke 400 hota hai', async () => {
    const { jar } = await login()
    const res = await request(app).post('/api/auth/logout').set('Cookie', asHeader(jar))

    expect(res.status).toBe(400)
  })

  it('sahi CSRF header ke saath POST chalta hai', async () => {
    const { jar } = await login()
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', asHeader(jar))
      .set(CSRF_HEADER, jar[COOKIE.CSRF])

    expect(res.status).toBe(200)
  })

  it('galat CSRF header pe 400', async () => {
    const { jar } = await login()
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', asHeader(jar))
      .set(CSRF_HEADER, 'chura-ke-laaya-hua-token')

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/refresh — rotation', () => {
  it('naya refresh token deta hai aur purana revoke kar deta hai', async () => {
    const { jar } = await login()
    const oldRefresh = jar[COOKIE.REFRESH]

    const res = await refreshRequest(jar)
    const newJar = cookieJar(res, jar)

    expect(res.status).toBe(200)
    expect(newJar[COOKIE.REFRESH]).not.toBe(oldRefresh)

    const stored = await RefreshToken.find().sort({ createdAt: 1 }).lean()
    expect(stored).toHaveLength(2)
    expect(stored[0].revokedAt).toBeInstanceOf(Date)
    expect(stored[0].replacedByJti).toBe(stored[1].jti)
    expect(stored[1].familyId).toBe(stored[0].familyId)
  })

  it('bina refresh cookie ke 401', async () => {
    const res = await request(app).post('/api/auth/refresh')
    expect(res.status).toBe(401)
  })

  it('naya access token bhi deta hai', async () => {
    const { jar } = await login()
    const res = await refreshRequest(jar)

    expect(cookieValue(res, COOKIE.ACCESS)).toBeTruthy()
  })
})

describe('POST /api/auth/refresh — reuse detection', () => {
  it('purana token dobara use hua to POORI family mar jaati hai', async () => {
    const { jar } = await login()
    // Chor ne poori cookie jar copy kar li — CSRF token bhi, kyunki wo httpOnly nahi hai
    const stolen = { ...jar }

    // Asli user refresh karta hai — ab `stolen` rotate ho chuka hai
    const first = await refreshRequest(jar)
    expect(first.status).toBe(200)
    const rotatedJar = cookieJar(first, jar)

    // Chor purana token leke aata hai
    const reuse = await refreshRequest(stolen)
    expect(reuse.status).toBe(401)

    // Sirf chor nahi — asli user ka naya token bhi ab bekaar hai
    const victim = await refreshRequest(rotatedJar)
    expect(victim.status).toBe(401)

    const alive = await RefreshToken.countDocuments({ revokedAt: null })
    expect(alive).toBe(0)
  })

  it('refresh fail hone pe cookies clear ho jaati hain', async () => {
    // Warna admin infinite 401 loop me phans jaata hai
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${COOKIE.REFRESH}=jhoota-refresh-token`)

    expect(res.status).toBe(401)
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${COOKIE.REFRESH}=;`))).toBe(true)
  })

  it('ek session logout hone pe dusra session chalta rehta hai', async () => {
    const a = await login()
    const b = await login()

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', asHeader(a.jar))
      .set(CSRF_HEADER, a.jar[COOKIE.CSRF])

    const stillWorks = await refreshRequest(b.jar)
    expect(stillWorks.status).toBe(200)
  })
})

describe('POST /api/auth/logout', () => {
  it('cookies clear karta hai aur refresh band ho jaata hai', async () => {
    const { jar } = await login()

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', asHeader(jar))
      .set(CSRF_HEADER, jar[COOKIE.CSRF])

    expect(res.status).toBe(200)

    const after = await refreshRequest(jar)
    expect(after.status).toBe(401)
  })
})

describe('POST /api/auth/change-password', () => {
  const NEW_PASSWORD = 'bilkul-naya-passphrase'

  async function changePassword(jar, body) {
    return request(app)
      .post('/api/auth/change-password')
      .set('Cookie', asHeader(jar))
      .set(CSRF_HEADER, jar[COOKIE.CSRF])
      .send(body)
  }

  it('password badal deta hai aur naye se login chalta hai', async () => {
    const { jar } = await login()

    const res = await changePassword(jar, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    })
    expect(res.status).toBe(200)

    expect((await login({ password: NEW_PASSWORD })).res.status).toBe(200)
    expect((await login({ password: PASSWORD })).res.status).toBe(401)
  })

  /**
   * D-37 ka pehla hissa.
   *
   * Pehle (D-35) ye raasta band tha: `mustChangePassword` false hone pe 403 milta tha,
   * kyunki password ka ekmatra source administrator tha. Client ne wo palat diya.
   */
  it('gate na laga ho tab bhi chalta hai — har user apna password khud badal sakta hai (D-37)', async () => {
    await User.updateOne({ email: EMAIL }, { $set: { mustChangePassword: false } })
    const { jar } = await login()

    const res = await changePassword(jar, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    })

    expect(res.status).toBe(200)
  })

  it('gate laga ho to utar jaata hai — seed wala admin aage badh sakta hai', async () => {
    const { res: loginRes, jar } = await login()
    expect(loginRes.body.data.user.mustChangePassword).toBe(true)

    const res = await changePassword(jar, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    })

    expect(res.body.data.user.mustChangePassword).toBe(false)
  })

  it('doosre devices logout ho jaate hain', async () => {
    const a = await login()
    const b = await login()

    await changePassword(a.jar, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })

    expect((await refreshRequest(b.jar)).status).toBe(401)
  })

  /**
   * D-37 ka doosra hissa — aur sabse aasaani se toot-ne wala.
   *
   * Pehle service `revokeAllSessions()` chala kar chhod deti thi, to **is** browser ka
   * session bhi usi sweep me mar jaata tha: user apna hi password badal kar logout ho
   * jaata. Ab purane saare marte hain par turant ek naya session mil jaata hai.
   */
  it('jis browser se badla wo chalta rehta hai (D-37)', async () => {
    const { jar } = await login()

    const res = await changePassword(jar, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    })

    const next = cookieJar(res, jar)
    expect(next[COOKIE.REFRESH]).toBeTruthy()
    expect(next[COOKIE.REFRESH]).not.toBe(jar[COOKIE.REFRESH])

    expect((await request(app).get('/api/me').set('Cookie', asHeader(next))).status).toBe(200)
    expect((await refreshRequest(next)).status).toBe(200)
  })

  it('purana refresh token password badalne ke baad nahi chalta', async () => {
    const { jar } = await login()

    await changePassword(jar, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })

    expect((await refreshRequest(jar)).status).toBe(401)
  })

  it('galat current password pe 422', async () => {
    const { jar } = await login()
    const res = await changePassword(jar, {
      currentPassword: 'yaad-nahi-tha-ye',
      newPassword: NEW_PASSWORD,
    })

    expect(res.status).toBe(422)
  })

  it('chhote naye password pe 400', async () => {
    const { jar } = await login()
    const res = await changePassword(jar, { currentPassword: PASSWORD, newPassword: 'chhota' })

    expect(res.status).toBe(400)
  })

  it('bina login ke 401', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })

    expect(res.status).toBe(401)
  })
})

/**
 * D-38 — "Remember me" ka faisla **poore session** tak chalta hai.
 *
 * Ye tests ek asli bug se aaye hain jo testing me pakda gaya: login pe checkbox off
 * hone ke bawajood, pehle auto-refresh (ya password change) ke baad cookie persistent
 * ho jaati thi. Matlab browser band karne pe user logout hota hi nahi tha — jabki usne
 * yahi maanga tha.
 *
 * Isiliye har test **login ke baad wali** request dekhta hai, login ko nahi.
 */
describe('"Remember me" poore session tak chalti hai (D-38)', () => {
  const NEW_PASSWORD = 'bilkul-naya-passphrase'

  const refreshCookie = (res) =>
    (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(COOKIE.REFRESH))

  async function changePassword(jar) {
    return request(app)
      .post('/api/auth/change-password')
      .set('Cookie', asHeader(jar))
      .set(CSRF_HEADER, jar[COOKIE.CSRF])
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
  }

  it('refresh ke baad bhi session cookie hi rehti hai — rememberMe false', async () => {
    const { jar } = await login({ rememberMe: false })

    const res = await refreshRequest(jar)

    expect(res.status).toBe(200)
    expect(refreshCookie(res)).not.toMatch(/Max-Age/i)
  })

  it('refresh ke baad bhi persistent rehti hai — rememberMe true', async () => {
    const { jar } = await login({ rememberMe: true })

    const res = await refreshRequest(jar)

    expect(res.status).toBe(200)
    expect(refreshCookie(res)).toMatch(/Max-Age/i)
  })

  it('password badalne se persistence nahi badalti — rememberMe false', async () => {
    const { jar } = await login({ rememberMe: false })

    const res = await changePassword(jar)

    expect(res.status).toBe(200)
    expect(refreshCookie(res)).not.toMatch(/Max-Age/i)
  })

  it('password badalne ke baad bhi persistent rehti hai — rememberMe true', async () => {
    const { jar } = await login({ rememberMe: true })

    const res = await changePassword(jar)

    expect(res.status).toBe(200)
    expect(refreshCookie(res)).toMatch(/Max-Age/i)
  })

  /**
   * Cookie me `remember` likha hi nahi hota — wo sirf record me hai. Rotation pe naya
   * record banta hai, aur usme purani choice aani chahiye.
   */
  it('rotation ke baad naye record me bhi remember zinda rehta hai', async () => {
    const { jar } = await login({ rememberMe: true })
    await refreshRequest(jar)

    const tokens = await RefreshToken.find({}).lean()

    expect(tokens).toHaveLength(2)
    expect(tokens.every((t) => t.remember === true)).toBe(true)
  })

  it('TTL alag hoti hai — bina remember 24 ghante, remember pe 7 din', async () => {
    await login({ rememberMe: false })
    const short = await RefreshToken.findOne({ remember: false }).lean()

    await login({ rememberMe: true })
    const long = await RefreshToken.findOne({ remember: true }).lean()

    const hours = (token) => Math.round((token.expiresAt - token.createdAt) / 3_600_000)

    expect(hours(short)).toBe(24)
    expect(hours(long)).toBe(24 * 7)
  })
})

describe('deactivated user', () => {
  it('deactivate hote hi agli request pe bahar ho jaata hai', async () => {
    const { jar } = await login()
    expect((await request(app).get('/api/me').set('Cookie', asHeader(jar))).status).toBe(200)

    await User.updateOne({ email: EMAIL }, { $set: { status: 'inactive' } })

    // Access token abhi 15 min valid hai — par user DB se check hota hai
    expect((await request(app).get('/api/me').set('Cookie', asHeader(jar))).status).toBe(401)
  })
})

describe('roles seed', () => {
  it('paanchon roles banata hai', async () => {
    const roles = await Role.find().lean()
    expect(roles.map((r) => r.key).sort()).toEqual([
      'admin',
      'author',
      'contributor',
      'editor',
      'salesAgent',
    ])
  })

  /** Labels ab `@cms/shared` ke `ROLE_LABEL` se aate hain — seed aur admin dono wahi padhte hain. */
  it('shared wale labels DB me likhta hai', async () => {
    const roles = await Role.find().lean()
    const byKey = Object.fromEntries(roles.map((r) => [r.key, r.label]))

    expect(byKey).toEqual(ROLE_LABEL)
  })

  it('dobara chalne pe duplicate nahi banata', async () => {
    await ensureDefaultRoles()
    await ensureDefaultRoles()
    expect(await Role.countDocuments()).toBe(5)
  })

  it('purge sirf admin ko milta hai', async () => {
    const editor = await Role.findOne({ key: 'editor' }).lean()
    const admin = await Role.findOne({ key: 'admin' }).lean()

    expect(editor.permissions).not.toContain('entry.purge')
    expect(editor.permissions).toContain('entry.delete')
    expect(admin.permissions).toContain('entry.purge')
  })

  it('contributor publish nahi kar sakta par review ke liye bhej sakta hai', async () => {
    const contributor = await Role.findOne({ key: 'contributor' }).lean()

    expect(contributor.permissions).not.toContain('entry.publish')
    expect(contributor.permissions).not.toContain('entry.publish.own')
    expect(contributor.permissions).toContain('entry.submitReview')
  })

  it('salesAgent ke paas content pe koi write permission nahi', async () => {
    const sales = await Role.findOne({ key: 'salesAgent' }).lean()
    const writes = sales.permissions.filter((p) => p.startsWith('entry.') && p !== 'entry.read')

    expect(writes).toEqual([])
  })
})

describe('duplicate email', () => {
  it('ek hi email se dusra user nahi banta', async () => {
    await expect(
      createUser({ name: 'Dusra', email: EMAIL, role: 'editor', password: PASSWORD }),
    ).rejects.toThrow()
  })
})
