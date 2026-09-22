import { toPublicSettings } from '@cms/shared'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { resolveMailConfig } from '../core/mailer.js'
import { decryptSecret, encryptSecret } from '../core/secrets.js'
import { RefreshToken } from '../modules/auth/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { Settings } from '../modules/settings/model.js'
import { getMailConfig } from '../modules/settings/service.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * `Settings ▸ Email / SMTP` ka test — D-108.
 *
 * ⚠️ **Apni file me hai, `settings.test.js` me nahi**, aur wo jaan-boojh kar. Wo file pehle se
 * badi hai aur uska `beforeEach` teen login karta hai; D-87 me theek isi wajah se `entries.test.js`
 * **rate limit** kha rahi thi aur wo failure bilkul logic bug jaisi dikhti thi.
 *
 * ⚠️ **Yahan koi asli SMTP connection nahi banta** — `core/mailer.js` test me nodemailer ka
 * `jsonTransport` use karta hai (wahi rok jo `revalidateTags()` pe hai). Isliye ye test ye sabit
 * karte hain ki **kya bheja ja raha tha**, ye nahi ki wo pahuncha — uske liye MailDev hai
 * (`docker compose up -d maildev`) aur wo aankh se dekhna padta hai.
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

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    RefreshToken.deleteMany({}),
    Settings.deleteMany({}),
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

// ── encryption (core/secrets.js) ─────────────────────────────────────────────

describe('encryptSecret / decryptSecret', () => {
  it('jo daala wahi wapas milta hai', () => {
    expect(decryptSecret(encryptSecret('hunter2'))).toBe('hunter2')
  })

  it('ciphertext me plaintext kahin nahi dikhta', () => {
    const blob = encryptSecret('super-secret-pass')

    expect(blob).not.toContain('super-secret-pass')
    expect(blob.startsWith('v1:')).toBe(true)
  })

  /**
   * Har baar naya IV — bina iske ek hi password do site pe **ek jaisa** blob banata, aur DB
   * dekhne wala bina kuch tode ye jaan leta ki dono jagah password same hai.
   */
  it('ek hi value do baar encrypt karne pe do alag blob bante hain', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'))
  })

  it('khaali input pe khaali string — "koi password nahi" ka nishaan', () => {
    expect(encryptSecret('')).toBe('')
    expect(decryptSecret('')).toBe(null)
  })

  /**
   * ⚠️ Ye test us din ke liye hai jab koi `JWT_ACCESS_SECRET` rotate karega. Tab purane blob
   * khul nahi paayenge, aur **app ko chalte rehna hai** — `null` milna hi sahi bartaav hai.
   * Throw karne ka matlab hota ki admin ka poora Email screen 500 de, yaani wahi jagah band
   * ho jaati jahan se client password theek kar sakta tha.
   */
  it('doosri key se bana blob null deta hai, phat-ta nahi', () => {
    expect(decryptSecret('v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA:AAAA')).toBe(null)
  })

  it('anjaan format pe bhi null', () => {
    expect(decryptSecret('plain-text-password')).toBe(null)
    expect(decryptSecret('v2:a:b:c')).toBe(null)
  })
})

// ── config resolve (core/mailer.js) ──────────────────────────────────────────

describe('resolveMailConfig', () => {
  it('`secure` port se banta hai — 465 SSL, 587 STARTTLS', () => {
    expect(resolveMailConfig({ host: 'x', port: 465 }).secure).toBe(true)
    expect(resolveMailConfig({ host: 'x', port: 587 }).secure).toBe(false)
    expect(resolveMailConfig({ host: 'x', port: 1025 }).secure).toBe(false)
  })

  it('host na ho to configured false — mail chup-chaap skip hoti hai', () => {
    expect(resolveMailConfig({}).configured).toBe(false)
    expect(resolveMailConfig({ host: 'smtp.example.com' }).configured).toBe(true)
  })

  /**
   * ⚠️ Bina auth wale SMTP asli hote hain — dev ka MailDev, aur company ke andar ke relay.
   * `user` ko zaroori banane se wo dono haath se nikal jaate.
   */
  it('user na ho to auth undefined — bina login wala SMTP bhi chalta hai', () => {
    expect(resolveMailConfig({ host: 'localhost', port: 1025 }).auth).toBeUndefined()
    expect(resolveMailConfig({ host: 'x', user: 'u', password: 'p' }).auth).toEqual({
      user: 'u',
      pass: 'p',
    })
  })

  it('`from` me naam tabhi jab email bhi ho', () => {
    expect(resolveMailConfig({ host: 'x', fromName: 'A', fromEmail: 'a@b.com' }).from).toBe(
      '"A" <a@b.com>',
    )
    expect(resolveMailConfig({ host: 'x', fromEmail: 'a@b.com' }).from).toBe('a@b.com')
  })
})

// ── GET /api/settings/mail ───────────────────────────────────────────────────

describe('GET /api/settings/mail', () => {
  it('bina login ke 401', async () => {
    expect((await request(app).get('/api/settings/mail')).status).toBe(401)
  })

  it('author ko 403 — uske paas settings.read hai hi nahi', async () => {
    expect((await authed('get', '/api/settings/mail', authorJar)).status).toBe(403)
  })

  it('editor padh sakta hai — password usme hai hi nahi, to dikkat nahi', async () => {
    const res = await authed('get', '/api/settings/mail', editorJar)

    expect(res.status).toBe(200)
    expect(res.body.data.mail.hasPassword).toBe(false)
  })

  it('defaults deta hai — seed na chali ho tab bhi', async () => {
    const res = await authed('get', '/api/settings/mail', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data.mail).toEqual({
      host: '',
      port: 587,
      user: '',
      fromName: '',
      fromEmail: '',
      hasPassword: false,
    })
  })

  /**
   * ⚠️ **Is file ka sabse zaroori test.** Password aur uska ciphertext, dono me se kuch bhi
   * response me nahi jaana chahiye — na `password`, na `passwordEnc`. Encrypted blob bhejna
   * bhi offline attack ka maal de dena hai.
   */
  it('password kabhi response me nahi jaata — sirf hasPassword', async () => {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'smtp.example.com',
      password: 'hunter2',
    })

    const res = await authed('get', '/api/settings/mail', adminJar)

    expect(res.body.data.mail.hasPassword).toBe(true)
    expect(res.body.data.mail.password).toBeUndefined()
    expect(res.body.data.mail.passwordEnc).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain('hunter2')
  })
})

// ── mail kisi aur raaste se bahar na nikle ───────────────────────────────────

describe('mail settings kahin aur leak nahi hoti', () => {
  beforeEach(async () => {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'smtp.example.com',
      user: 'apikey',
      password: 'hunter2',
    })
  })

  /**
   * ⚠️ **Ye structural guarantee ka test hai, sirf aaj ke bartaav ka nahi.** `mail`
   * `settingsSchema` me hai hi nahi, aur Zod anjaan keys strip kar deti hai — isliye
   * `toPublicSettings()` use gira deta hai. Ye test us din phatega jis din koi `mail` ko
   * `settingsSchema` me jod dega, aur wahi din hai jab password leak hoga.
   */
  it('toPublicSettings() me mail hai hi nahi', async () => {
    const doc = await Settings.findOne({ siteId: 'default' })

    expect(doc.mail.passwordEnc).toBeTruthy()
    expect(toPublicSettings(doc).mail).toBeUndefined()
  })

  it('GET /api/settings me mail nahi aati', async () => {
    const res = await authed('get', '/api/settings', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data.settings.mail).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain('hunter2')
  })

  it('public settings me bhi nahi — wahan allowlist projection hai', async () => {
    const res = await request(app).get('/api/public/settings')

    expect(res.status).toBe(200)
    expect(res.body.data.settings.mail).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain('smtp.example.com')
  })
})

// ── PATCH /api/settings/mail ─────────────────────────────────────────────────

describe('PATCH /api/settings/mail', () => {
  it('editor badal nahi sakta — 403', async () => {
    const res = await authed('patch', '/api/settings/mail', editorJar).send({ host: 'x.com' })

    expect(res.status).toBe(403)
  })

  it('chhe khaane save hote hain, aur DB me password encrypted jaata hai', async () => {
    const res = await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'smtp.gmail.com',
      port: 465,
      user: 'me@gmail.com',
      password: 'app-password',
      fromName: 'My Site',
      fromEmail: 'hello@mysite.com',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.mail.host).toBe('smtp.gmail.com')
    expect(res.body.data.mail.port).toBe(465)

    /** ⚠️ Response nahi, **DB** padhi jaati hai — `updatePackageDefaults()` wala chautha jaal. */
    const stored = await Settings.findOne({ siteId: 'default' }).lean()

    expect(stored.mail.passwordEnc).not.toBe('app-password')
    expect(stored.mail.passwordEnc.startsWith('v1:')).toBe(true)
    expect(decryptSecret(stored.mail.passwordEnc)).toBe('app-password')
  })

  /**
   * ⚠️ Adhoora PATCH baaki khaane nahi udaata — dotted `$set` ka poora maksad yahi hai. Wahi
   * jaal jo 10 Sep ko `blogSettings` pe pakda gaya tha (poora object `$set` karne se baaki
   * field gayab).
   */
  it('sirf ek khaana bhejne se baaki nahi ud-te', async () => {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'smtp.gmail.com',
      user: 'me@gmail.com',
      fromName: 'My Site',
    })

    await authed('patch', '/api/settings/mail', adminJar).send({ fromName: 'Renamed' })

    const stored = await Settings.findOne({ siteId: 'default' }).lean()

    expect(stored.mail.fromName).toBe('Renamed')
    expect(stored.mail.host).toBe('smtp.gmail.com')
    expect(stored.mail.user).toBe('me@gmail.com')
  })

  /**
   * ⚠️ **Ye D-105 wala bug hai, is feature pe.** Screen password kabhi padhti nahi, yaani wo
   * khaana **hamesha khaali khulta hai**. Khaali ko "mita do" maanne ka matlab hota ki client
   * From Name badal kar Save dabaye aur mail chup-chaap band ho jaaye — bina kisi error ke.
   */
  it('khaali password purana rehne deta hai, mitata nahi', async () => {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'smtp.gmail.com',
      password: 'keep-me',
    })

    await authed('patch', '/api/settings/mail', adminJar).send({
      fromName: 'New name',
      password: '',
    })

    const stored = await Settings.findOne({ siteId: 'default' }).lean()

    expect(decryptSecret(stored.mail.passwordEnc)).toBe('keep-me')
    expect(stored.mail.fromName).toBe('New name')
  })

  /** Mitane ka apna saaf nishaan — khaali value se alag. */
  it('clearPassword se password hat-ta hai', async () => {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'smtp.gmail.com',
      password: 'remove-me',
    })

    const res = await authed('patch', '/api/settings/mail', adminJar).send({ clearPassword: true })

    expect(res.body.data.mail.hasPassword).toBe(false)

    const stored = await Settings.findOne({ siteId: 'default' }).lean()

    expect(stored.mail.passwordEnc).toBe('')
    /** Baaki khaane bache rehne chahiye — `clearPassword` sirf ek khaana chhoota hai. */
    expect(stored.mail.host).toBe('smtp.gmail.com')
  })

  /** ⚠️ `.strict()` — anjaan key chup-chaap girti nahi (D-103 ka `showOn` sabak). */
  it('anjaan key 400 deti hai, chup-chaap girti nahi', async () => {
    const res = await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'x.com',
      secure: true,
    })

    expect(res.status).toBe(400)
  })

  it('galat port aur galat email dono 400', async () => {
    expect(
      (await authed('patch', '/api/settings/mail', adminJar).send({ port: 70000 })).status,
    ).toBe(400)

    expect(
      (await authed('patch', '/api/settings/mail', adminJar).send({ fromEmail: 'not-an-email' }))
        .status,
    ).toBe(400)
  })

  it('getMailConfig() decrypted password deta hai — sirf mailer ke liye', async () => {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'smtp.gmail.com',
      password: 'for-the-mailer',
    })

    expect((await getMailConfig()).password).toBe('for-the-mailer')
  })
})

// ── POST /api/settings/mail/test ─────────────────────────────────────────────

describe('POST /api/settings/mail/test', () => {
  it('editor nahi bhej sakta — 403', async () => {
    expect((await authed('post', '/api/settings/mail/test', editorJar)).status).toBe(403)
  })

  /**
   * ⚠️ Config na hone pe **422, 500 nahi** — ye client ki bhari hui value ki dikkat hai, server
   * ka crash nahi.
   */
  it('SMTP configure hi na ho to 422 aur saaf message', async () => {
    const res = await authed('post', '/api/settings/mail/test', adminJar)

    expect(res.status).toBe(422)
    expect(res.body.error.message).toMatch(/SMTP host/i)
  })

  /**
   * ⚠️ **Test mail hamesha logged-in user ke apne email pe** — body kuch leti hi nahi. Warna
   * `settings.update` wala koi bhi user is route se kisi bhi address pe mail bhej sakta, yaani
   * site ke naam pe ek chhota mail relay.
   */
  it('logged-in user ke apne email pe jaata hai — body ka address nahi maana jaata', async () => {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'localhost',
      port: 1025,
      fromEmail: 'cms@test.local',
      fromName: 'CMS',
    })

    const res = await authed('post', '/api/settings/mail/test', adminJar).send({
      to: 'attacker@example.com',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.to).toBe('admin@test.com')

    /** `jsonTransport` poora message lauta deta hai — yaani ye dekha ja sakta hai ki **kya** gaya. */
    const sent = JSON.parse(res.body.data.message)

    expect(sent.to[0].address).toBe('admin@test.com')
    expect(sent.from.address).toBe('cms@test.local')
    expect(sent.subject).toMatch(/test email/i)
    expect(JSON.stringify(sent)).not.toContain('attacker@example.com')
  })
})
