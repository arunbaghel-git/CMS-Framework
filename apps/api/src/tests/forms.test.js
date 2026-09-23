import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { emptyForm } from '@cms/shared'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { Enquiry, Form } from '../modules/forms/model.js'
import { notifyEnquiry } from '../modules/forms/service.js'
import { Role } from '../modules/roles/model.js'
import { Settings } from '../modules/settings/model.js'
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
  it('naya form bhara hua khulta hai — nau dikhne wale field, aur ek chhupa hua', async () => {
    // Khaali table dekh kar client ko pehle ye sochna padta ki form me hota kya hai (D-65)
    const form = await makeForm()

    expect(form.fields).toHaveLength(10)
    expect(form.fields.filter((f) => f.show).map((f) => f.key)).toHaveLength(9)
    expect(form.fields.map((f) => f.key)).toContain('fullName')
    expect(form.fields.find((f) => f.key === 'consent').required).toBe(true)

    /*
     * `sourcePage` ab default me hai hi nahi — enquiry ka path payload ka apna khaana hai
     * (`sourcePath`), kisi field pe tika hua nahi (2 Sep).
     */
    expect(form.fields.map((f) => f.key)).not.toContain('sourcePage')

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

  it('sourcePath payload se aata hai, form ke kisi field se nahi', async () => {
    /*
     * ⚠️ Pehle ye `values.sourcePage` se aata tha, yaani ek `hidden` field pe tika hua tha —
     * aur jis client ne wo field apne form se hata di, uski har enquiry pe path **khaali**
     * aane laga (2 Sep). "Ye kis page se aayi" client ki setting nahi hai.
     */
    const form = await makeForm()

    await submit({ formId: form.id, sourcePath: '/packages/discover-andaman', values: filled })

    const saved = await Enquiry.findOne({}).lean()
    expect(saved.sourcePath).toBe('/packages/discover-andaman')
    /** Wo `values` me nahi ghusta — wahan sirf wo aata hai jo form pe bhara gaya. */
    expect(saved.values.sourcePage).toBeUndefined()
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
    expect(enquiryForm.fields).toHaveLength(9)
  })

  it('contactEmail form ke emailTo se aata hai — sirf pehla pata', async () => {
    /*
     * "Talk to a planner" ka email yahi hai (client, 2 Sep). Ek se zyada pate **routing** ki
     * baat hain, dikhane ki nahi — poori list chhapna har us pate ko spam ke saamne khada
     * kar deta jo sirf CC pe tha.
     */
    await makeForm({ emailTo: 'sales@x.com, ops@x.com' })

    const res = await request(app).get('/api/public/package-defaults')

    expect(res.body.data.packageDefaults.enquiryForm.contactEmail).toBe('sales@x.com')
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

// ── inbox ────────────────────────────────────────────────────────────────────

/**
 * Enquiries inbox — client, 3 Sep. Chaar cheezein sabse zyada maayne rakhti hain:
 *
 *   1. column form ke **type** se derive hon (label badle to bhi chalein)
 *   2. trash ke baad enquiry list se gayab ho, par DB me bachi rahe
 *   3. bulk delete ka **pichhla darwaza** band ho — editor ke paas `submission.delete` nahi
 *   4. CSV Excel me formula na ban jaaye
 */
describe('enquiries inbox', () => {
  /**
   * Ek bhari hui enquiry — public raaste se, taaki wo asli shakl me bane.
   *
   * Default form me chaar field `required` hain (`fullName · email · phone · consent`),
   * isliye wo yahan pehle se bhare jaate hain — har test me unhe dohrane ka koi matlab nahi.
   */
  async function makeEnquiry(form, values, sourcePath = '/packages/andaman') {
    const res = await submit({
      formId: form.id,
      values: { phone: '9876500000', consent: true, ...values },
      sourcePath,
    })
    expect(res.status).toBe(201)
    return res.body.data
  }

  async function firstEnquiryId(jar = adminJar) {
    const list = await authed('get', '/api/enquiries', jar)
    return list.body.data.enquiries[0].id
  }

  it('list nayi enquiry pehle deti hai, counts ke saath', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Priya Menon', email: 'priya@example.com' })
    await makeEnquiry(form, { fullName: 'Rahul Sethi', email: 'rahul@example.com' })

    const res = await authed('get', '/api/enquiries', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data.enquiries).toHaveLength(2)
    expect(res.body.data.enquiries[0].values.fullName).toBe('Rahul Sethi')
    expect(res.body.data.counts).toMatchObject({ all: 2, new: 2, contacted: 0 })
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 2 })
  })

  it('column form ke type se derive hote hain — label badalne se kuch nahi tootta', async () => {
    const base = emptyForm()
    const form = await makeForm({
      // Wahi fields, par label client ne badal diya — column phir bhi milna chahiye
      fields: base.fields.map((field) =>
        field.key === 'travelDate' ? { ...field, label: 'Journey date' } : field,
      ),
    })
    await makeEnquiry(form, {
      fullName: 'Ann',
      email: 'ann@example.com',
      travelDate: '2026-09-12',
    })

    const res = await authed('get', `/api/enquiries/${await firstEnquiryId()}`, adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data.columns.name.key).toBe('fullName')
    expect(res.body.data.columns.email.key).toBe('email')
    expect(res.body.data.columns.travelDate).toMatchObject({
      key: 'travelDate',
      label: 'Journey date',
    })
  })

  it('search values ke text pe chalti hai', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Priya Menon', email: 'priya@example.com' })
    await makeEnquiry(form, { fullName: 'Rahul Sethi', email: 'rahul@example.com' })

    const res = await authed('get', '/api/enquiries?search=rahul', adminJar)

    expect(res.body.data.enquiries).toHaveLength(1)
    expect(res.body.data.enquiries[0].values.fullName).toBe('Rahul Sethi')
  })

  it('status badalta hai — par values kabhi nahi badalte', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Priya', email: 'priya@example.com' })
    const id = await firstEnquiryId()

    const res = await authed('patch', `/api/enquiries/${id}`, adminJar).send({
      status: 'contacted',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.enquiry.status).toBe('contacted')
    expect(res.body.data.enquiry.values.fullName).toBe('Priya')
  })

  it('status ke alawa kuch bhej hi nahi sakte — notes wala raasta band ho chuka hai', async () => {
    /*
     * Internal notes 3 Sep subah bane the aur usi din client ne wo panel hata diya. Schema
     * `.strict()` hai, isliye `note` ab 400 deta hai — dead API chhupe rehne se behtar hai
     * ki wo saaf mana kare.
     */
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Priya', email: 'priya@example.com' })

    const res = await authed('patch', `/api/enquiries/${await firstEnquiryId()}`, adminJar).send({
      note: 'Called them',
    })

    expect(res.status).toBe(400)
  })

  it('date range se list chhanti hai, aur export wahi filter uthata hai', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Aaj Wali', email: 'aaj@example.com' })

    // Ek purani enquiry — seedha DB me, taaki uski tareekh peeche ki ho
    const old = await Enquiry.findOne({}).lean()
    await Enquiry.create({
      ...old,
      _id: undefined,
      values: { fullName: 'Purani Wali', email: 'purani@example.com' },
      createdAt: new Date('2026-01-15T10:00:00.000Z'),
    })

    const jan = await authed('get', '/api/enquiries?from=2026-01-01&to=2026-01-31', adminJar)
    expect(jan.body.data.enquiries).toHaveLength(1)
    expect(jan.body.data.enquiries[0].values.fullName).toBe('Purani Wali')

    /*
     * ⚠️ `to` poore din ko pakadta hai. 15 Jan ki enquiry `to=2026-01-15` me aani chahiye —
     * bina us +1 din ke wo chhoot jaati, aur wo galti chup hoti: filter chalta hua dikhta
     * par us din ka data gayab.
     */
    const sameDay = await authed('get', '/api/enquiries?from=2026-01-15&to=2026-01-15', adminJar)
    expect(sameDay.body.data.enquiries).toHaveLength(1)

    // Export bhi wahi filter uthata hai — "jo list me dikh raha hai wahi CSV me"
    const csv = await authed('get', '/api/enquiries/export?from=2026-01-01&to=2026-01-31', adminJar)
    expect(csv.text).toContain('Purani Wali')
    expect(csv.text).not.toContain('Aaj Wali')
  })

  it('values seedha update nahi ho sakte — schema strict hai', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Priya', email: 'priya@example.com' })

    const res = await authed('patch', `/api/enquiries/${await firstEnquiryId()}`, adminJar).send({
      values: { fullName: 'Badla hua' },
    })

    expect(res.status).toBe(400)
  })

  it('bulk se status badalta hai', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'A', email: 'a@example.com' })
    await makeEnquiry(form, { fullName: 'B', email: 'b@example.com' })
    const list = await authed('get', '/api/enquiries', adminJar)
    const ids = list.body.data.enquiries.map((row) => row.id)

    const res = await authed('post', '/api/enquiries/bulk', adminJar).send({
      ids,
      action: 'contacted',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.modified).toBe(2)

    const after = await authed('get', '/api/enquiries?status=contacted', adminJar)
    expect(after.body.data.enquiries).toHaveLength(2)
  })

  it('delete trash hai — list se gayab, DB me bachi hui', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Priya', email: 'priya@example.com' })
    const id = await firstEnquiryId()

    await authed('post', '/api/enquiries/bulk', adminJar).send({ ids: [id], action: 'delete' })

    const after = await authed('get', '/api/enquiries', adminJar)
    expect(after.body.data.enquiries).toHaveLength(0)
    expect(after.body.data.counts.all).toBe(0)

    // ⚠️ Yahi is test ka asli maksad — record mita nahi, sirf chhupa hai (R12)
    const doc = await Enquiry.findById(id).lean()
    expect(doc).not.toBeNull()
    expect(doc.deletedAt).toBeInstanceOf(Date)

    // Aur trash ki hui enquiry detail pe bhi nahi khulti
    const detail = await authed('get', `/api/enquiries/${id}`, adminJar)
    expect(detail.status).toBe(404)
  })

  it('editor status badal sakta hai par delete nahi kar sakta', async () => {
    const form = await makeForm()
    await makeEnquiry(form, { fullName: 'Priya', email: 'priya@example.com' })
    const ids = [await firstEnquiryId(editorJar)]

    const ok = await authed('post', '/api/enquiries/bulk', editorJar).send({
      ids,
      action: 'contacted',
    })
    expect(ok.status).toBe(200)

    /**
     * ⚠️ Gate route pe `submission.update` hai, par bulk se `delete` bhi ho sakta tha.
     * Bina controller wale check ke ye 200 deta — yaani bulk delete ka pichhla darwaza.
     */
    const denied = await authed('post', '/api/enquiries/bulk', editorJar).send({
      ids,
      action: 'delete',
    })
    expect(denied.status).toBe(403)
  })

  it('contributor inbox dekh hi nahi sakta', async () => {
    const res = await authed('get', '/api/enquiries', contributorJar)

    expect(res.status).toBe(403)
  })

  it('CSV me derived column bhare hue aate hain', async () => {
    const form = await makeForm()
    await makeEnquiry(form, {
      fullName: 'Priya Menon',
      email: 'priya@example.com',
      phone: '9876500000',
      travellers: 4,
    })

    const res = await authed('get', '/api/enquiries/export', adminJar)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.text).toContain('Priya Menon')
    expect(res.text).toContain('priya@example.com')
  })

  it('CSV me = se shuru hone wali value formula nahi banti', async () => {
    const form = await makeForm()
    // Classic CSV injection — Excel ise formula maan kar chala deta hai
    await makeEnquiry(form, { fullName: '=1+1', email: 'x@example.com' })

    const res = await authed('get', '/api/enquiries/export', adminJar)

    expect(res.text).toContain("'=1+1")
  })

  it('client ke asli form pe bhi sahi column milte hain — type akela kaafi nahi', async () => {
    /**
     * ⚠️ Ye 3 Sep ko client ke **chalte hue** form se liya gaya hai, banaya hua nahi.
     *
     * Isme teen jaal hain jo sirf-type wale niyam ko harate the:
     *   `mobile` aur `email` dono ka type `text` hai — `phone`/`email` nahi
     *   `guests` ek `select` hai, `number` nahi
     *
     * Sirf type dekhne pe Phone aur Email khaali aate the, aur Budget ke khaane me `guests`
     * dikhta tha — poori tarah chup galti.
     */
    const form = await makeForm({
      fields: [
        { key: 'name', label: 'Name', type: 'text', show: true, required: true, options: [] },
        {
          key: 'travelDate',
          label: 'Travel date',
          type: 'date',
          show: true,
          required: true,
          options: [],
        },
        {
          key: 'guests',
          label: 'Guests',
          type: 'select',
          show: true,
          required: true,
          options: ['2 adults', '3 adults'],
        },
        {
          key: 'hotelCategory',
          label: 'Hotel category',
          type: 'select',
          source: 'categories',
          show: true,
          required: true,
          options: [],
        },
        { key: 'mobile', label: 'Mobile', type: 'text', show: true, required: true, options: [] },
        { key: 'email', label: 'Email', type: 'text', show: true, required: true, options: [] },
        {
          key: 'specialRequestOptional',
          label: 'Special request',
          type: 'textarea',
          show: true,
          required: false,
          options: [],
        },
      ],
    })

    const res = await submit({
      formId: form.id,
      sourcePath: '/packages/discover-andaman',
      values: {
        name: 'Arun Baghel',
        travelDate: '2026-09-20',
        guests: '2 adults',
        hotelCategory: 'Deluxe',
        mobile: '8787878787',
        email: 'arun@example.com',
        specialRequestOptional: 'Sea-facing room please',
      },
    })
    expect(res.status).toBe(201)

    const list = await authed('get', '/api/enquiries', adminJar)
    const { columns } = list.body.data.enquiries[0]

    expect(columns.name.key).toBe('name')
    // `text` type hone ke bawajood — key se mile
    expect(columns.email.key).toBe('email')
    expect(columns.phone.key).toBe('mobile')
    expect(columns.travelDate.key).toBe('travelDate')
    expect(columns.pax.key).toBe('guests')
    expect(columns.message.key).toBe('specialRequestOptional')

    // Is form me hai hi nahi — khaali rehna chahiye, kisi aur field se bhara hua nahi
    expect(columns.budget).toBeNull()

    /**
     * ⚠️ Ye assertion **palti hai** (client, 4 Sep). Pehle yahan `columns.package` ko `null`
     * hona chahiye tha, aur wo tab theek tha — is form me `package` naam ka field hai hi nahi.
     *
     * Par live dekh kar client ne kaha ki wo column khaali dikhta hai jabki uske form me
     * `hotelCategory` hai, aur wahi baat batati hai ki visitor ne kaunsa darja poochha.
     *
     * Column ka heading field ke apne `label` se banta hai, isliye ab wo **"Hotel category"**
     * kehta hai — kahin koi hardcoded naam nahi.
     */
    expect(columns.package.key).toBe('hotelCategory')
    expect(columns.package.label).toBe('Hotel category')

    const detail = await authed('get', `/api/enquiries/${list.body.data.enquiries[0].id}`, adminJar)
    expect(detail.body.data.enquiry.values.hotelCategory).toBe('Deluxe')
  })
})

/**
 * Field ka label **optional** (client, 22 Sep: _"just make labels of form elements optional —
 * if filled then visible, if not then not visible"_).
 *
 * ⚠️ Wajah client ki thi aur theek thi: popup me scroll isliye aa raha tha ki har khaane ke upar
 * ek label ki line thi. Main uska ilaaj **content chhota karke** kar raha tha (image ki ooonchai,
 * textarea) — client ne roka. Label hatane se ~116px bachte hain aur design ka koi hissa chhota
 * nahi hota.
 */
describe('Form field ka label optional hai (22 Sep)', () => {
  it('khaali label save hota hai — aur khaali hi wapas aata hai', async () => {
    const form = await makeForm({
      fields: [
        { key: 'name', label: '', type: 'text', required: true, placeholder: 'Your name' },
        { key: 'email', label: 'Email', type: 'email', required: true },
      ],
    })

    /** ⚠️ Response nahi, DB — Mongoose `strict` aur Zod dono chup-chaap gira sakte hain */
    const doc = await Form.findById(form.id).lean()
    expect(doc.fields[0].label).toBe('')
    expect(doc.fields[0].placeholder).toBe('Your name')
    /** Doosre field ka label waisa ka waisa — khaali karna ek chunav hai, sab pe nahi lagta */
    expect(doc.fields[1].label).toBe('Email')
  })

  it('khaali label public payload me bhi khaali jaata hai', async () => {
    const form = await makeForm({
      fields: [{ key: 'name', label: '', type: 'text', required: true, placeholder: 'Your name' }],
    })

    const { getPublicFormById } = await import('../modules/forms/service.js')
    const pub = await getPublicFormById(form.id)

    expect(pub.fields[0].label).toBe('')
    /**
     * ⚠️ Placeholder zaroor jaana chahiye — bina label ke wahi batata hai ki khaane me kya likhna
     * hai, aur theme usi se `aria-label` banati hai.
     */
    expect(pub.fields[0].placeholder).toBe('Your name')
  })

  it('label bhejna zaroori nahi — default khaali hai', async () => {
    const form = await makeForm({
      fields: [{ key: 'name', type: 'text', required: false }],
    })

    const doc = await Form.findById(form.id).lean()
    expect(doc.fields[0].label).toBe('')
  })

  it('bahut lamba label ab bhi 400 deta hai — sirf `min` hata hai, `max` nahi', async () => {
    const res = await authed('post', '/api/forms', adminJar).send({
      name: 'Long label',
      status: 'active',
      fields: [{ key: 'name', label: 'x'.repeat(121), type: 'text' }],
    })

    expect(res.status).toBe(400)
  })
})

// ── team ko mail (D-109) ─────────────────────────────────────────────────────

/**
 * Nayi enquiry ki mail `Email enquiries to` wale pate(on) pe — D-109, A-43 band.
 *
 * Test me SMTP `jsonTransport` hai (`core/mailer.js`) — mail banti poori hai par jaati kahin nahi,
 * aur `message` me wahi JSON laut-ta hai jo bheja ja raha tha. Isliye ye dekha ja sakta hai ki
 * **kise, kis subject aur Reply-To ke saath** gayi.
 *
 * ⚠️ Submit mail ka intezaar **nahi** karta (visitor ka button atakta). Isliye submit wale test
 * enquiry pe `notification` ke likhe jaane tak rukte hain — `waitForNotification()`.
 */
describe('nayi enquiry ki mail — Email enquiries to (D-109)', () => {
  const filled = {
    fullName: 'Ananya <b>Rao</b>',
    email: 'ananya@example.com',
    phone: '9810000000',
    consent: true,
  }

  async function configureSmtp() {
    await authed('patch', '/api/settings/mail', adminJar).send({
      host: 'localhost',
      port: 1025,
      fromEmail: 'cms@test.local',
      fromName: 'CMS',
    })
  }

  async function waitForNotification(id) {
    for (let i = 0; i < 60; i++) {
      const doc = await Enquiry.findById(id).lean()
      if (doc?.notification) return doc.notification
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return null
  }

  afterEach(async () => {
    await Settings.updateMany({}, { $unset: { mail: 1 } })
  })

  it('submit ke baad mail jaati hai aur enquiry pe "sent" likha jaata hai', async () => {
    await configureSmtp()
    const form = await makeForm({ emailTo: 'sales@x.com, ops@x.com' })

    const res = await submit({ formId: form.id, values: filled, sourcePath: '/packages/x' })
    expect(res.status).toBe(201)

    const notification = await waitForNotification(res.body.data.id)

    expect(notification.status).toBe('sent')
    expect(notification.to).toEqual(['sales@x.com', 'ops@x.com'])
  })

  it('mail ka poora maal — kise, subject, Reply-To, escape, poora URL', async () => {
    await configureSmtp()
    const form = await makeForm({
      emailTo: 'sales@x.com; bekaar-pata',
      notifyEmail: {
        subject: 'Lead: {{fullName}}',
        body: '<p>From {{page_url}}</p><p>{{all_fields}}</p>',
      },
    })

    const doc = await Form.findById(form.id).lean()
    const enquiry = await Enquiry.create({
      formId: form.id,
      formName: doc.name,
      sourcePath: '/packages/x',
      values: filled,
    })

    const out = await notifyEnquiry(doc, enquiry.toObject())
    const sent = JSON.parse(out.message)

    /** Galat pata gira, sahi wala gaya — ek typo poori team ki mail nahi rokta. */
    expect(sent.to.map((a) => a.address)).toEqual(['sales@x.com'])
    /** Team "Reply" dabaye to jawab customer ko jaaye. */
    expect(sent.replyTo[0].address).toBe('ananya@example.com')
    expect(sent.from.address).toBe('cms@test.local')
    expect(sent.subject).toBe('Lead: Ananya <b>Rao</b>')
    /** Bahar ka maal body me escape — team ke inbox me chalta hua HTML nahi. */
    expect(sent.html).toContain('Ananya &lt;b&gt;Rao&lt;/b&gt;')
    expect(sent.html).not.toContain('<b>Rao</b>')
    /** Poora URL, relative path nahi (D-90 wala bug). */
    expect(sent.html).toMatch(/From https?:\/\/[^<]+\/packages\/x/)
    /** Text roop me label form ka apna (`Full Name`), aur value wahi jo bhari — escape sirf HTML me. */
    expect(sent.text).toContain('Full Name: Ananya <b>Rao</b>')
  })

  it('email ka khaana type "text" ho tab bhi Reply-To milta hai — client ka asli form', async () => {
    /** 3 Sep: client ke form me `email` ka type `text` hai. Type dekhne wala niyam yahan chup rehta. */
    await configureSmtp()
    const form = await makeForm({ emailTo: 'sales@x.com' })
    const doc = await Form.findById(form.id).lean()
    const typed = {
      ...doc,
      fields: doc.fields.map((f) => (f.key === 'email' ? { ...f, type: 'text' } : f)),
    }
    const enquiry = await Enquiry.create({ formId: form.id, values: filled })

    const out = await notifyEnquiry(typed, enquiry.toObject())

    expect(out.replyTo).toBe('ananya@example.com')
  })

  it('bhara hua email pata jaisa na ho to Reply-To lagta hi nahi', async () => {
    await configureSmtp()
    const form = await makeForm({ emailTo: 'sales@x.com' })
    const doc = await Form.findById(form.id).lean()
    const enquiry = await Enquiry.create({
      formId: form.id,
      values: { ...filled, email: 'x@y.com\r\nBcc: victim@z.com' },
    })

    const out = await notifyEnquiry(doc, enquiry.toObject())

    expect(out.replyTo).toBeUndefined()
    expect(JSON.parse(out.message).replyTo).toBeUndefined()
  })

  it('Email enquiries to khaali — mail nahi, aur enquiry pe kuch likha bhi nahi jaata', async () => {
    await configureSmtp()
    const form = await makeForm({ emailTo: '' })
    const doc = await Form.findById(form.id).lean()
    const enquiry = await Enquiry.create({ formId: form.id, values: filled })

    expect(await notifyEnquiry(doc, enquiry.toObject())).toBeNull()
    expect((await Enquiry.findById(enquiry._id).lean()).notification).toBeNull()
  })

  it('SMTP configure hi nahi — enquiry phir bhi banti hai, aur "skipped"', async () => {
    const form = await makeForm({ emailTo: 'sales@x.com' })

    const res = await submit({ formId: form.id, values: filled })
    expect(res.status).toBe(201)

    expect((await waitForNotification(res.body.data.id)).status).toBe('skipped')
  })

  it('template Save hota hai — response nahi, DB padha jaata hai', async () => {
    /** `updatePackageDefaults` wala jaal: model me field na ho to API 200, DB me kuch nahi. */
    const form = await makeForm()

    const res = await authed('patch', `/api/forms/${form.id}`, adminJar).send({
      notifyEmail: { subject: 'Hello {{fullName}}', body: '<p>Body {{email}}</p>' },
    })
    expect(res.status).toBe(200)

    const saved = await Form.findById(form.id).lean()
    expect(saved.notifyEmail).toEqual({
      subject: 'Hello {{fullName}}',
      body: '<p>Body {{email}}</p>',
    })
  })

  it('message ki HTML write pe saaf hoti hai (R20)', async () => {
    const form = await makeForm()

    await authed('patch', `/api/forms/${form.id}`, adminJar).send({
      notifyEmail: {
        subject: 'x',
        body: '<p onclick="x()">Hi {{fullName}}</p><script>alert(1)</script>',
      },
    })

    const saved = await Form.findById(form.id).lean()
    expect(saved.notifyEmail.body).not.toContain('<script')
    expect(saved.notifyEmail.body).not.toContain('onclick')
    expect(saved.notifyEmail.body).toContain('Hi {{fullName}}')
  })

  it('naya form default template ke saath banta hai', async () => {
    const res = await authed('post', '/api/forms', adminJar).send({ name: 'Bina template' })

    const saved = await Form.findById(res.body.data.form.id).lean()
    expect(saved.notifyEmail.subject).toBe('New enquiry — {{form_name}}')
    expect(saved.notifyEmail.body).toContain('{{all_fields}}')
  })

  it('template public payload me nahi jaata', async () => {
    await makeForm({ emailTo: 'sales@x.com' })

    const res = await request(app).get('/api/public/package-defaults')

    expect(JSON.stringify(res.body)).not.toContain('notifyEmail')
    expect(JSON.stringify(res.body)).not.toContain('{{all_fields}}')
  })
})
