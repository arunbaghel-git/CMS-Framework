import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { emptyForm } from '@cms/shared'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { Enquiry, Form } from '../modules/forms/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Enquiry forms ka integration test — client, 1 Sep (`admin-design-v2.html`).
 *
 * Chaar cheezein yahan sabse zyada maayne rakhti hain, aur teen unme se **public submit**
 * pe hain — kyunki wo is poore repo ka pehla **bina auth ke likhne wala** endpoint hai:
 *
 *   1. draft form pe submission na ho
 *   2. anjaan key `values` me na ghuse
 *   3. honeypot bhara ho to chup-chaap gir jaaye (error nahi, taaki bot ko pata na chale)
 *   4. jis form pe enquiries hain wo delete na ho
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
let contributorJar

/** Ek chalta hua form — active aur package pages pe. */
async function makeForm(patch = {}) {
  const res = await authed('post', '/api/forms', adminJar).send({
    ...emptyForm(),
    name: 'Package Enquiry',
    status: 'active',
    placement: 'packages',
    ...patch,
  })

  return res.body.data.form
}

/** Bharna — public raasta, bina kisi cookie ke (visitor jaisa). */
const submit = (body) => request(app).post('/api/public/enquiries').send(body)

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
    Form.deleteMany({}),
    Enquiry.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()

  for (const [username, email, role] of [
    ['boss', 'admin@test.com', 'admin'],
    ['ed', 'ed@test.com', 'editor'],
    ['contrib', 'contrib@test.com', 'contributor'],
  ]) {
    await createUser({ username, name: username, email, role, password: PASSWORD })
  }

  adminJar = await loginAs('admin@test.com')
  editorJar = await loginAs('ed@test.com')
  contributorJar = await loginAs('contrib@test.com')
})

// ── forms ka CRUD ────────────────────────────────────────────────────────────

describe('enquiry forms', () => {
  it('naya form bhara hua khulta hai — das dikhne wale field, aur ek chhupa hua', async () => {
    // Khaali table dekh kar client ko pehle ye sochna padta ki form me hota kya hai (D-65)
    const form = await makeForm()

    expect(form.fields).toHaveLength(11)
    expect(form.fields.filter((f) => f.show).map((f) => f.key)).toHaveLength(10)
    expect(form.fields.map((f) => f.key)).toContain('fullName')
    expect(form.fields.find((f) => f.key === 'consent').required).toBe(true)

    /*
     * `hotelCategory` `show: false` pe khulta hai, jaan-boojh kar — har site package pe
     * category-wise daam nahi rakhti, aur bina daam ke wo dropdown khaali hota. Jise chahiye
     * wo ek tick se chalu kar le.
     */
    expect(form.fields.find((f) => f.key === 'hotelCategory').show).toBe(false)
  })

  it('do field ek hi key nahi le sakte', async () => {
    // Bina is rok ke submission ka `values` chup-chaap ek ko doosre se overwrite kar deta
    const res = await authed('post', '/api/forms', adminJar).send({
      name: 'Bad form',
      fields: [
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'email', label: 'Work email', type: 'email' },
      ],
    })

    expect(res.status).toBe(400)
  })

  it('list ke saath tabs ke counts ek hi call me aate hain', async () => {
    await makeForm({ name: 'A' })
    await makeForm({ name: 'B', status: 'draft' })

    const res = await authed('get', '/api/forms', adminJar)

    expect(res.body.data.counts).toEqual({ all: 2, active: 1, draft: 1 })
    expect(res.body.meta).toMatchObject({ page: 1, limit: 50, total: 2 })
  })

  it('editor likh sakta hai, contributor sirf padh sakta hai', async () => {
    expect((await authed('post', '/api/forms', editorJar).send({ name: 'X' })).status).toBe(201)
    expect((await authed('post', '/api/forms', contributorJar).send({ name: 'Y' })).status).toBe(
      403,
    )
    expect((await authed('get', '/api/forms', contributorJar)).status).toBe(200)
  })

  it('bina enquiry wala form delete ho jaata hai', async () => {
    const form = await makeForm()

    expect((await authed('delete', `/api/forms/${form.id}`, adminJar)).status).toBe(200)
    expect(await Form.findById(form.id).lean()).toBeNull()
  })

  it('jis form pe enquiries aa chuki hain wo delete nahi hota', async () => {
    // Warna un enquiries ka `formId` kisi aisi cheez ko point karta jo hai hi nahi
    const form = await makeForm()
    await submit({
      formId: form.id,
      values: { fullName: 'A', email: 'a@b.com', phone: '1', consent: true },
    })

    const res = await authed('delete', `/api/forms/${form.id}`, adminJar)

    expect(res.status).toBe(422)
    expect(res.body.error.message).toMatch(/1 enquiry/)
    expect(await Form.findById(form.id).lean()).not.toBeNull()
  })
})

// ── public submit ────────────────────────────────────────────────────────────

describe('enquiry submit — bina auth ke', () => {
  const filled = { fullName: 'Ananya', email: 'a@b.com', phone: '9810000000', consent: true }

  it('bhari hui enquiry store hoti hai, aur form ka naam uske saath copy hota hai', async () => {
    // Naam copy isliye ki form rename ya delete ho jaaye to bhi enquiry apna source jaane
    const form = await makeForm()

    const res = await submit({ formId: form.id, values: { ...filled, message: 'Ferry?' } })

    expect(res.status).toBe(201)

    const saved = await Enquiry.findOne({}).lean()
    expect(saved.formName).toBe('Package Enquiry')
    expect(saved.values).toMatchObject({ fullName: 'Ananya', message: 'Ferry?' })
  })

  it('draft form pe submission nahi hoti', async () => {
    const form = await makeForm({ status: 'draft' })

    expect((await submit({ formId: form.id, values: filled })).status).toBe(404)
    expect(await Enquiry.countDocuments({})).toBe(0)
  })

  it('anjaan key reject hoti hai — values seedha document me jaata hai', async () => {
    const form = await makeForm()

    const res = await submit({ formId: form.id, values: { ...filled, notAField: 'x' } })

    expect(res.status).toBe(422)
    expect(await Enquiry.countDocuments({})).toBe(0)
  })

  it('nested value schema hi reject kar deta hai (R9)', async () => {
    const form = await makeForm()

    const res = await submit({ formId: form.id, values: { fullName: { $ne: null } } })

    expect(res.status).toBe(400)
  })

  it('required field khaali ho to 422', async () => {
    const form = await makeForm()

    const res = await submit({ formId: form.id, values: { fullName: 'A', email: 'a@b.com' } })

    expect(res.status).toBe(422)
    expect(res.body.error.message).toMatch(/required/i)
  })

  it('un-ticked consent khaali ke barabar hai — `false` ko bhara hua nahi maanna chahiye', async () => {
    const form = await makeForm()

    const res = await submit({ formId: form.id, values: { ...filled, consent: false } })

    expect(res.status).toBe(422)
  })

  it('honeypot bhara ho to 201 milta hai par kuch store nahi hota', async () => {
    // Bot ko "pakda gaya" batane ka matlab hai use agla tareeka dhoondhne ka ishaara dena
    const form = await makeForm()

    const res = await submit({ formId: form.id, values: filled, hp: 'i-am-a-bot' })

    expect(res.status).toBe(201)
    expect(await Enquiry.countDocuments({})).toBe(0)
  })

  it('chhupaya hua field bhara nahi ja sakta', async () => {
    // `show: false` ka matlab hai wo form pe hai hi nahi — uske naam se value bhejna anjaan
    // key jaisa hi hona chahiye
    const base = emptyForm()
    const form = await makeForm({
      fields: base.fields.map((f) => (f.key === 'message' ? { ...f, show: false } : f)),
    })

    const res = await submit({ formId: form.id, values: { ...filled, message: 'hi' } })

    expect(res.status).toBe(422)
  })
})

// ── public payload ───────────────────────────────────────────────────────────

describe('public payload me form', () => {
  it('active + packages wala form package payload me jaata hai', async () => {
    await makeForm()

    const res = await request(app).get('/api/public/package-defaults')
    const { enquiryForm } = res.body.data.packageDefaults

    expect(enquiryForm.name).toBe('Package Enquiry')
    expect(enquiryForm.fields).toHaveLength(10)
  })

  it('koi active form na ho to null — sidebar me khaali dabba nahi (D-30)', async () => {
    await makeForm({ status: 'draft' })

    const res = await request(app).get('/api/public/package-defaults')

    expect(res.body.data.packageDefaults.enquiryForm).toBeNull()
  })

  it('reference wale teen khaane payload me jaate hain', async () => {
    /*
     * Ye teen 1 Sep ko jude the, taaki sidebar ka form reference (`itinerary-v3.html`) se
     * poora match kare. Har ek ka payload me jaana zaroori hai — chhoot jaane pe wo admin me
     * bhara dikhta hai aur page pe kuch nahi hota. Is repo me wo shakl paanch baar ho chuki
     * hai (D-64, D-65, D-68, aur rating).
     */
    const base = emptyForm()
    await makeForm({
      footnote: 'No advance to see the plan.',
      fields: base.fields.map((f) =>
        f.key === 'travelDate' ? { ...f, width: 'half', placeholder: 'When?' } : f,
      ),
    })

    const res = await request(app).get('/api/public/package-defaults')
    const { enquiryForm } = res.body.data.packageDefaults
    const travelDate = enquiryForm.fields.find((f) => f.key === 'travelDate')

    expect(enquiryForm.footnote).toBe('No advance to see the plan.')
    expect(travelDate).toMatchObject({ width: 'half', placeholder: 'When?' })
  })

  it('hotel category wala field apne vikalp admin se nahi leta', async () => {
    // Uske vikalp har package ke apne daam hain — admin unhe likh hi nahi sakta (D-72)
    const base = emptyForm()
    await makeForm({
      fields: base.fields.map((f) => (f.key === 'hotelCategory' ? { ...f, show: true } : f)),
    })

    const res = await request(app).get('/api/public/package-defaults')
    const field = res.body.data.packageDefaults.enquiryForm.fields.find(
      (f) => f.key === 'hotelCategory',
    )

    expect(field.source).toBe('categories')
    expect(field.options).toEqual([])
  })

  it('chhupaye hue field payload me jaate hi nahi', async () => {
    // Chhaanne ka kaam theme ko dena galat hai — ek jagah chhoot jaane pe wo dikh jaata
    const base = emptyForm()
    await makeForm({
      fields: base.fields.map((f) => (f.key === 'budget' ? { ...f, show: false } : f)),
    })

    const res = await request(app).get('/api/public/package-defaults')
    const keys = res.body.data.packageDefaults.enquiryForm.fields.map((f) => f.key)

    expect(keys).not.toContain('budget')
    expect(keys).toContain('fullName')
  })
})
