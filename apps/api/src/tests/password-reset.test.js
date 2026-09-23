import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

/**
 * Mail pakadne ke liye `sendMail` ka mock — token mail ke link me hi hota hai, aur use padhne ka
 * doosra koi raasta nahi (DB me sirf hash hai, jaan-boojh kar). `vi.mock` hoist hota hai, isliye
 * `app.js` ke import se pehle lag jaata hai.
 */
const sent = vi.hoisted(() => [])
vi.mock('../core/mailer.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendMail: vi.fn(async (args) => {
    sent.push(args)
    return { ok: true }
  }),
}))

const { createApp } = await import('../app.js')
const { connectTestDb, disconnectTestDb } = await import('./db.js')
const { adminUrl } = await import('../core/env.js')
const { PasswordReset, RefreshToken } = await import('../modules/auth/model.js')
const { issueTemporaryPassword, requestPasswordReset } = await import('../modules/auth/service.js')
const { Role } = await import('../modules/roles/model.js')
const { ensureDefaultRoles, invalidateRoleCache } = await import('../modules/roles/service.js')
const { User } = await import('../modules/users/model.js')
const { createUser } = await import('../modules/users/service.js')

/**
 * Password reset — sirf administrator (D-110, client 23 Sep).
 *
 * Sabse zaroori teen cheezein, sabse upar:
 *   1. jawab **har email pe ek jaisa** — kaun admin hai, ye bahar na jaaye
 *   2. link **ek baar**, **30 minute**, aur uska pata `ADMIN_URL` se — request ke header se nahi
 *   3. reset ke baad saare session band, aur "changed" ki mail
 *
 * Chalane se pehle: `pnpm db:up`
 */

const PASSWORD = 'ek-lamba-sa-passphrase'
const NEW_PASSWORD = 'bilkul-naya-lamba-password'
const app = createApp()

const forgot = (email, headers = {}) =>
  request(app).post('/api/auth/forgot-password').set(headers).send({ email })
const reset = (token, newPassword = NEW_PASSWORD) =>
  request(app).post('/api/auth/reset-password').send({ token, newPassword })
const login = (email, password) => request(app).post('/api/auth/login').send({ email, password })

/** Fire-and-forget mail ke aane tak ruko — `requestPasswordReset()` mail ka intezaar nahi karta. */
async function waitForMail(to, subjectPart = 'Reset your password') {
  for (let i = 0; i < 60; i++) {
    const mail = sent.find((m) => m.to === to && m.subject.includes(subjectPart))
    if (mail) return mail
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return null
}

const tokenFrom = (mail) => mail.text.match(/#token=([A-Za-z0-9_-]+)/)?.[1]

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  sent.length = 0
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    RefreshToken.deleteMany({}),
    PasswordReset.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()

  for (const [username, email, role] of [
    ['boss', 'admin@test.com', 'admin'],
    ['ed', 'ed@test.com', 'editor'],
  ]) {
    await createUser({ username, name: username, email, role, password: PASSWORD })
  }
})

describe('forgot-password — kaun admin hai, ye kabhi bahar nahi jaata', () => {
  it('admin, editor aur anjaan email — teeno ka jawab bilkul ek', async () => {
    const [a, e, u] = await Promise.all([
      forgot('admin@test.com'),
      forgot('ed@test.com'),
      forgot('nobody@test.com'),
    ])

    for (const res of [a, e, u]) expect(res.status).toBe(200)
    expect(e.body).toEqual(a.body)
    expect(u.body).toEqual(a.body)
    /** Service ka `sent` boolean bahar nahi aata — wahi batata ki kaun admin hai. */
    expect(a.body.data).not.toHaveProperty('sent')

    await waitForMail('admin@test.com')
  })

  it('mail sirf admin ko — editor ya anjaan email pe na mail, na DB record', async () => {
    await forgot('ed@test.com')
    await forgot('nobody@test.com')
    await forgot('admin@test.com')

    expect(await waitForMail('admin@test.com')).toBeTruthy()
    expect(sent.map((m) => m.to)).toEqual(['admin@test.com'])
    expect(await PasswordReset.countDocuments()).toBe(1)
  })

  it('band (inactive) admin ko mail nahi', async () => {
    await User.updateOne({ email: 'admin@test.com' }, { $set: { status: 'inactive' } })

    const out = await requestPasswordReset({ email: 'admin@test.com' })

    expect(out.sent).toBe(false)
    expect(await PasswordReset.countDocuments()).toBe(0)
  })

  it('email bade akshar aur space ke saath bhi milta hai', async () => {
    await forgot('  Admin@Test.com ')

    expect(await waitForMail('admin@test.com')).toBeTruthy()
  })
})

describe('link', () => {
  it('ADMIN_URL se banta hai — request ka Host header kuch nahi badalta', async () => {
    /**
     * Password-reset poisoning: header badal kar link apne domain pe banwana. `Origin` yahan nahi
     * bheja — anjaan origin ko CORS pehle hi 403 de deta hai, aur tab ye test link tak pahunchta hi
     * nahi. `Host` / `X-Forwarded-Host` wo raasta hai jo CORS se nahi rukta.
     */
    const res = await forgot('admin@test.com', {
      Host: 'evil.test',
      'X-Forwarded-Host': 'evil.test',
    })
    expect(res.status).toBe(200)

    const mail = await waitForMail('admin@test.com')

    expect(mail.text).toContain(`${adminUrl()}/reset-password#token=`)
    /**
     * ⚠️ Upar wali line akeli kaafi nahi — wo link ko `adminUrl()` se hi milaati hai, to function galat
     * ho to test bhi usi galti pe raazi. 23 Sep ko bilkul yahi hua: link `/admin` ke bina bana aur 19
     * test pass rahe. Admin ka path code me pakka hai (`ADMIN_BASE_PATH`), isliye yahan seedha.
     */
    expect(mail.text).toMatch(/https?:\/\/[^/\s]+\/admin\/reset-password#token=/)
    expect(mail.text).not.toContain('evil.test')
    expect(mail.html).not.toContain('evil.test')
  })

  it('token # ke baad hai (query me nahi), aur DB me sirf uska hash', async () => {
    await forgot('admin@test.com')
    const token = tokenFrom(await waitForMail('admin@test.com'))

    expect(token.length).toBeGreaterThanOrEqual(40)

    const record = await PasswordReset.findOne({}).lean()
    expect(record.tokenHash).not.toBe(token)
    expect(JSON.stringify(record)).not.toContain(token)
  })

  it('30 minute ki expiry', async () => {
    const before = Date.now()
    await forgot('admin@test.com')
    const { expiresAt } = await PasswordReset.findOne({}).lean()

    const minutes = (expiresAt.getTime() - before) / 60_000
    expect(minutes).toBeGreaterThan(29.9)
    expect(minutes).toBeLessThanOrEqual(30.1)

    /** Background mail ka intezaar — warna wo agle test ki `sent` list me der se aa girti. */
    await waitForMail('admin@test.com')
  })

  it('naya link maangte hi purana band', async () => {
    await forgot('admin@test.com')
    const first = tokenFrom(await waitForMail('admin@test.com'))

    sent.length = 0
    await forgot('admin@test.com')
    const second = tokenFrom(await waitForMail('admin@test.com'))

    expect((await reset(first)).status).toBe(422)
    expect((await reset(second)).status).toBe(200)
  })
})

describe('reset-password', () => {
  async function freshToken() {
    await forgot('admin@test.com')
    return tokenFrom(await waitForMail('admin@test.com'))
  }

  it('naya password chalta hai, purana nahi, aur "changed" ki mail jaati hai', async () => {
    const token = await freshToken()

    const res = await reset(token)
    expect(res.status).toBe(200)
    /** Reset login nahi karwata — koi cookie nahi. */
    expect(res.headers['set-cookie']).toBeUndefined()

    expect((await login('admin@test.com', PASSWORD)).status).toBe(401)
    expect((await login('admin@test.com', NEW_PASSWORD)).status).toBe(200)

    expect(await waitForMail('admin@test.com', 'Your password was changed')).toBeTruthy()
  })

  it('saare purane session band ho jaate hain', async () => {
    await login('admin@test.com', PASSWORD)
    await login('admin@test.com', PASSWORD)
    const admin = await User.findOne({ email: 'admin@test.com' }).lean()

    await reset(await freshToken())

    const live = await RefreshToken.countDocuments({ userId: admin._id, revokedAt: null })
    expect(live).toBe(0)
  })

  it('link ek hi baar chalta hai', async () => {
    const token = await freshToken()

    expect((await reset(token)).status).toBe(200)

    const again = await reset(token, 'ek-aur-lamba-password')
    expect(again.status).toBe(422)
    expect(again.body.error.message).toMatch(/expired or was already used/)
  })

  it('expire hua link nahi chalta', async () => {
    const token = await freshToken()
    await PasswordReset.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })

    expect((await reset(token)).status).toBe(422)
  })

  it('galat token — wahi message, koi farq nahi', async () => {
    const res = await reset('x'.repeat(43))

    expect(res.status).toBe(422)
    expect(res.body.error.message).toMatch(/expired or was already used/)
  })

  it('link maangne ke baad admin se editor bana diya — link bekaar', async () => {
    const token = await freshToken()
    await User.updateOne({ email: 'admin@test.com' }, { $set: { role: 'editor' } })

    expect((await reset(token)).status).toBe(422)
    expect((await login('admin@test.com', PASSWORD)).status).toBe(200)
  })

  it('chhota password — wahi policy jo Profile pe hai (400)', async () => {
    const token = await freshToken()

    expect((await reset(token, 'short')).status).toBe(400)
    /** 400 pe link jalta nahi — admin dobara koshish kar sake. */
    expect((await reset(token)).status).toBe(200)
  })

  it('mustChangePassword utar jaata hai', async () => {
    await User.updateOne({ email: 'admin@test.com' }, { $set: { mustChangePassword: true } })

    await reset(await freshToken())

    expect((await User.findOne({ email: 'admin@test.com' }).lean()).mustChangePassword).toBe(false)
  })
})

describe('pnpm cms reset-password — server wala aakhri raasta', () => {
  it('temporary password se login hota hai, aur agle login pe badalna zaroori', async () => {
    const out = await issueTemporaryPassword('ADMIN@test.com')

    expect(out.email).toBe('admin@test.com')
    expect(out.password.length).toBeGreaterThanOrEqual(10)

    const res = await login('admin@test.com', out.password)
    expect(res.status).toBe(200)
    expect(res.body.data.user.mustChangePassword).toBe(true)
    expect((await login('admin@test.com', PASSWORD)).status).toBe(401)
  })

  it('band account ko bhi chalu kar deta hai — warna temporary password bekaar', async () => {
    await User.updateOne({ email: 'admin@test.com' }, { $set: { status: 'inactive' } })

    const out = await issueTemporaryPassword('admin@test.com')

    expect((await login('admin@test.com', out.password)).status).toBe(200)
  })

  it('anjaan email pe saaf error', async () => {
    await expect(issueTemporaryPassword('nobody@test.com')).rejects.toThrow(/No user/)
  })
})
