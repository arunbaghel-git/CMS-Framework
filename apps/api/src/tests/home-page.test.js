import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { emptyForm } from '@cms/shared'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { ContentType } from '../modules/content-types/model.js'
import { ensureBuiltInContentTypes } from '../modules/content-types/service.js'
import { Entry, Revision } from '../modules/entries/model.js'
import { pathTagsForForm, pathTagsForVideoReview } from '../modules/entries/service.js'
import { Review, VideoReview } from '../modules/master-lists/model.js'
import { Enquiry, Form } from '../modules/forms/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Home page — D-96 (client, 15 Sep). Asli Mongo pe.
 *
 * Paanch cheezein, aur har ek ke peeche is repo ki ek pakdi hui galti hai:
 *
 *   1. **Path `/` aur ek hi home** — dusri koshish saaf 409, "free URL nahi mila" nahi
 *   2. **Home trash nahi hota** — warna poori site ka `/` 404
 *   3. **Hero ki HTML write pe saaf** (R20) — `sanitizeContent()` me case bhoolna chup XSS hai
 *   4. **Payload me `formId`/`imageId` nahi**, resolve hua maal jaata hai (D-88 wala tark)
 *   5. **Form ka button label DB tak** — model me na ho to Mongoose chup-chaap gira deta (D-86)
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

/** Admin ka form jaisa bhejta hai — ek hero section. */
const heroBlock = (props = {}) => ({
  type: 'heroForm',
  props: {
    background: '#0B2B4A',
    title: 'Everything for your Andaman trip, <em>booked in one place.</em>',
    description: '<p>Packages, ferries and resorts.</p>',
    stats: [
      { value: '17 yrs', label: 'Operating from Port Blair' },
      { value: '', label: '' },
      { value: '38,000+', label: 'Travellers hosted' },
      { value: '', label: '' },
    ],
    ribbon: 'Free · No obligation',
    formHeading: 'Plan your Andaman trip',
    formDescription: '<p>Answered by a real planner.</p>',
    ...props,
  },
})

const createHome = (body = {}) =>
  authed('post', '/api/entries', adminJar).send({
    type: 'homePage',
    title: 'Home',
    content: { version: 1, blocks: [heroBlock()] },
    ...body,
  })

async function makeForm(patch = {}) {
  const res = await authed('post', '/api/forms', adminJar).send({
    ...emptyForm(),
    name: 'Home enquiry',
    status: 'active',
    ...patch,
  })

  return res.body.data.form
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
    Revision.deleteMany({}),
    ContentType.deleteMany({}),
    Form.deleteMany({}),
    Enquiry.deleteMany({}),
    Review.deleteMany({}),
    VideoReview.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()
  await ensureBuiltInContentTypes()

  await createUser({
    username: 'boss',
    name: 'boss',
    email: 'admin@test.com',
    role: 'admin',
    password: PASSWORD,
  })
  adminJar = await loginAs('admin@test.com')
})

describe('home page — path aur ek hi entry', () => {
  it('home ka path `/` hai, slug title se', async () => {
    const res = await createHome()

    expect(res.status).toBe(201)
    expect(res.body.data.entry).toMatchObject({ type: 'homePage', path: '/', slug: 'home' })
  })

  it('doosra home 409 deta hai — "free URL nahi mila" nahi', async () => {
    // Bina rok ke `-2`, `-3` wala loop 50 baar `/` pe takraata aur galat wajah batata
    await createHome()
    const res = await createHome({ title: 'Another home' })

    expect(res.status).toBe(409)
    expect(res.body.error.message).toMatch(/already a Home Page/)
    expect(await Entry.countDocuments({ type: 'homePage' })).toBe(1)
  })

  it('title badalne pe bhi path `/` hi rehta hai, aur koi redirect nahi banta', async () => {
    const created = (await createHome()).body.data.entry

    const res = await authed('patch', `/api/entries/${created.id}`, adminJar).send({
      title: 'Welcome',
      version: created.version,
    })

    expect(res.status).toBe(200)
    expect(res.body.data.entry.path).toBe('/')
  })

  it('home trash me nahi jaata — 422', async () => {
    const created = (await createHome()).body.data.entry

    const res = await authed('post', `/api/entries/${created.id}/trash`, adminJar)

    expect(res.status).toBe(422)
    expect((await Entry.findById(created.id).lean()).deletedAt).toBeNull()
  })
})

describe('hero section — write pe', () => {
  it('title inline HTML hai, script gir jaati hai aur `<em>` bachta hai', async () => {
    const res = await createHome({
      content: {
        version: 1,
        blocks: [
          heroBlock({
            title: 'Andaman <em>trip</em><script>alert(1)</script><p>block</p>',
            description: '<p>ok</p><img src=x onerror=alert(1)>',
          }),
        ],
      },
    })

    // DB padho, response nahi — safai ka sach wahin hai
    const doc = await Entry.findById(res.body.data.entry.id).lean()
    const props = doc.content.blocks[0].props

    expect(props.title).toContain('<em>trip</em>')
    expect(props.title).not.toMatch(/<script|<p>/)
    expect(props.description).not.toMatch(/onerror/)
  })

  it('background sirf `#rrggbb` — lowercase me store', async () => {
    const res = await createHome()
    const doc = await Entry.findById(res.body.data.entry.id).lean()

    expect(doc.content.blocks[0].props.background).toBe('#0b2b4a')
  })

  it('background me CSS ghusaana mana hai', async () => {
    // Ye value theme me inline `style` me jaati hai — `;` ya `url()` yahan se guzar hi na sake
    const res = await createHome({
      content: { version: 1, blocks: [heroBlock({ background: 'red; background: url(x)' })] },
    })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    expect(await Entry.countDocuments({ type: 'homePage' })).toBe(0)
  })
})

describe('GET /api/public/resolve?path=/', () => {
  async function publishedHome(blockProps) {
    const created = (await createHome({ content: { version: 1, blocks: [heroBlock(blockProps)] } }))
      .body.data.entry
    await authed('post', `/api/entries/${created.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve').query({ path: '/' })
    return res.body.data.entry
  }

  it('draft home pe `/` 404', async () => {
    await createHome()

    const res = await request(app).get('/api/public/resolve').query({ path: '/' })

    expect(res.status).toBe(404)
  })

  it('published home — section me form resolve hota hai, ids bahar nahi jaatin', async () => {
    const form = await makeForm({ submitLabel: 'Send me a quote' })
    const entry = await publishedHome({ formId: form.id, imageId: 'nahi-hai' })

    expect(entry.type).toBe('homePage')

    const [hero] = entry.blocks
    expect(hero.type).toBe('heroForm')
    expect(hero.props.formId).toBeUndefined()
    expect(hero.props.imageId).toBeUndefined()
    expect(hero.props).toMatchObject({ ribbon: 'Free · No obligation', background: '#0b2b4a' })

    expect(hero.data.form).toMatchObject({ id: form.id, submitLabel: 'Send me a quote' })
    // Media nahi mili to `null` — toota `<img>` kabhi nahi (D-42 §2)
    expect(hero.data.image).toBeNull()
    expect(hero.data.mobileImage).toBeNull()
  })

  it('khaali stats page pe nahi jaate', async () => {
    const entry = await publishedHome()

    expect(entry.blocks[0].props.stats.map((s) => s.value)).toEqual(['17 yrs', '38,000+'])
  })

  it('draft form chuna ho to form `null` — card gayab', async () => {
    const form = await makeForm({ status: 'draft' })
    const entry = await publishedHome({ formId: form.id })

    expect(entry.blocks[0].data.form).toBeNull()
  })
})

describe('form ka button label aur cache', () => {
  it('button label DB me store hota hai', async () => {
    const form = await makeForm()

    await authed('patch', `/api/forms/${form.id}`, adminJar).send({
      submitLabel: 'Send me a quote',
    })

    // Response nahi, DB — model me field na ho to API 200 deti hai aur DB me kuch nahi jaata
    expect((await Form.findById(form.id).lean()).submitLabel).toBe('Send me a quote')
  })

  it('jis page ke section me form hai uska `path:` tag milta hai', async () => {
    const form = await makeForm()
    await createHome({ content: { version: 1, blocks: [heroBlock({ formId: form.id })] } })

    expect(await pathTagsForForm(form.id)).toEqual(['path:/'])
    expect(await pathTagsForForm('000000000000000000000000')).toEqual([])
  })
})

describe('Info cards section (D-96 §11)', () => {
  const cardsBlock = (props = {}) => ({
    type: 'infoCards',
    props: {
      heading: 'Certified by',
      headingAlign: 'center',
      border: 'top',
      accentColor: '#F5A623',
      items: [
        {
          icon: 'shieldCheck',
          label: 'Blog',
          title: 'Ministry of Tourism',
          text: 'Enlisted in <b>2009</b><script>alert(1)</script><p>x</p>',
          url: '/about',
          imageId: 'nahi-hai',
        },
        { icon: 'none', title: '', text: '' },
      ],
      ...props,
    },
  })

  it('write pe card ko id, text inline saaf, rang lowercase', async () => {
    const res = await createHome({ content: { version: 1, blocks: [cardsBlock()] } })

    expect(res.status).toBe(201)
    const { props } = (await Entry.findById(res.body.data.entry.id).lean()).content.blocks[0]

    expect(props.accentColor).toBe('#f5a623')
    expect(props.items[0].id).toBeTruthy()
    expect(props.items[0].text).toContain('<b>2009</b>')
    expect(props.items[0].text).not.toMatch(/<script|<p>/)
  })

  it('anjaan icon aur galat border 4xx — chup-chaap store nahi', async () => {
    for (const bad of [
      cardsBlock({ border: 'dashed' }),
      cardsBlock({ items: [{ icon: 'rocket', title: 'x' }] }),
      cardsBlock({ iconBg: 'url(x)' }),
    ]) {
      const res = await createHome({ content: { version: 1, blocks: [bad] } })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    }
    expect(await Entry.countDocuments({ type: 'homePage' })).toBe(0)
  })

  it('payload — imageId bahar nahi, media na mile to image null, khaali card gira', async () => {
    const created = (await createHome({ content: { version: 1, blocks: [cardsBlock()] } })).body
      .data.entry
    await authed('post', `/api/entries/${created.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve').query({ path: '/' })
    const [section] = res.body.data.entry.blocks

    expect(section.props.items).toHaveLength(1)
    expect(section.props.items[0]).toMatchObject({
      icon: 'shieldCheck',
      label: 'Blog',
      image: null,
    })
    expect(section.props.items[0].imageId).toBeUndefined()
  })
})

describe('FAQ section — wahi `faqs` block (D-96 §12)', () => {
  const faqBlock = (props = {}) => ({
    type: 'faqs',
    props: {
      background: '#F2F8FD',
      heading: 'FAQ',
      items: [
        { question: 'Can we customise?', answer: '<p>Yes</p><script>alert(1)</script>' },
        { question: 'Best time?', answer: '<p>October to May</p>' },
      ],
      ...props,
    },
  })

  it('home pe background ke saath store — jawab saaf, har sawaal ko id', async () => {
    const res = await createHome({ content: { version: 1, blocks: [faqBlock()] } })

    expect(res.status).toBe(201)
    const { props } = (await Entry.findById(res.body.data.entry.id).lean()).content.blocks[0]

    expect(props.background).toBe('#f2f8fd')
    expect(props.items[0].id).toBeTruthy()
    expect(props.items[0].answer).not.toMatch(/<script/)
  })

  it('galat background 4xx', async () => {
    const res = await createHome({
      content: { version: 1, blocks: [faqBlock({ background: 'red' })] },
    })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('payload me sawaal kram se aate hain', async () => {
    const created = (await createHome({ content: { version: 1, blocks: [faqBlock()] } })).body.data
      .entry
    await authed('post', `/api/entries/${created.id}/publish`, adminJar).send({})

    const res = await request(app).get('/api/public/resolve').query({ path: '/' })
    const [section] = res.body.data.entry.blocks

    expect(section.type).toBe('faqs')
    expect(section.props.items.map((f) => f.question)).toEqual(['Can we customise?', 'Best time?'])
  })
})

describe('FAQ alignment (D-96 §12 amendment)', () => {
  it('align left store hota hai, anjaan value 4xx', async () => {
    const ok = await createHome({
      content: { version: 1, blocks: [{ type: 'faqs', props: { align: 'left', items: [] } }] },
    })
    expect(ok.status).toBe(201)
    expect((await Entry.findById(ok.body.data.entry.id).lean()).content.blocks[0].props.align).toBe(
      'left',
    )

    await Entry.deleteMany({})
    const bad = await createHome({
      content: { version: 1, blocks: [{ type: 'faqs', props: { align: 'right', items: [] } }] },
    })
    expect(bad.status).toBeGreaterThanOrEqual(400)
    expect(bad.status).toBeLessThan(500)
  })
})

describe('Video reviews (D-96 §13)', () => {
  const addVideo = (body) =>
    authed('post', '/api/video-reviews', adminJar).send({
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      name: 'Sneha & family',
      packageName: '6N Blissful Andaman',
      ...body,
    })

  it('video review banta hai — DB me saare field, text reviews me nahi', async () => {
    const res = await addVideo({ imageId: null })

    expect(res.status).toBe(201)
    const doc = await VideoReview.findById(res.body.data.item.id).lean()
    expect(doc).toMatchObject({ name: 'Sneha & family', packageName: '6N Blissful Andaman' })
    // Alag collection — package page ki text reviews me video wale kabhi nahi ghusein
    expect(await Review.countDocuments({})).toBe(0)
  })

  it('https ke bina link aur bina title 400', async () => {
    expect((await addVideo({ videoUrl: 'javascript:alert(1)' })).status).toBe(400)
    expect((await addVideo({ videoUrl: 'http://youtu.be/x' })).status).toBe(400)
    expect((await addVideo({ name: '' })).status).toBe(400)
  })

  it('section — chune hue reviews section ke kram me, delete wala gira, ids bahar nahi', async () => {
    const a = (await addVideo({ name: 'A' })).body.data.item
    const b = (await addVideo({ name: 'B', videoUrl: 'https://www.instagram.com/reel/abc123/' }))
      .body.data.item
    const gone = (await addVideo({ name: 'Gone' })).body.data.item

    const created = (
      await createHome({
        content: {
          version: 1,
          blocks: [
            {
              type: 'videoReviews',
              props: { heading: 'Customer reviews', reviewIds: [b.id, gone.id, a.id] },
            },
          ],
        },
      })
    ).body.data.entry
    await authed('post', `/api/entries/${created.id}/publish`, adminJar).send({})

    expect(await pathTagsForVideoReview(a.id)).toEqual(['path:/'])

    await authed('delete', `/api/video-reviews/${gone.id}`, adminJar)

    const res = await request(app).get('/api/public/resolve').query({ path: '/' })
    const [section] = res.body.data.entry.blocks

    expect(section.props.reviewIds).toBeUndefined()
    expect(section.data.reviews.map((r) => r.name)).toEqual(['B', 'A'])
    // Instagram iframe me nahi chalta — embed null, theme naye tab me kholti hai
    expect(section.data.reviews[0].embedUrl).toBeNull()
    expect(section.data.reviews[1].embedUrl).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })
})
