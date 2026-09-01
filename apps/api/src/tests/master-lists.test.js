import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { emptyDoc, isEmptyDoc, textToDoc } from '@cms/shared'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { COOKIE } from '../core/tokens.js'
import { CSRF_HEADER } from '../middleware/csrf.js'
import { RefreshToken } from '../modules/auth/model.js'
import { Media } from '../modules/media/model.js'
import { AddOn, Hotel, Transfer } from '../modules/master-lists/model.js'
import { PackageDefaults } from '../modules/package-defaults/model.js'
import { Role } from '../modules/roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../modules/roles/service.js'
import { Taxonomy } from '../modules/taxonomies/model.js'
import { User } from '../modules/users/model.js'
import { createUser } from '../modules/users/service.js'

/**
 * Packages ki master lists ka integration test — spec 007 §1, Slice 2.
 *
 * Chaar cheezein jo yahan sabse zyada maayne rakhti hain:
 *
 *   1. **type se alag lists** — ek collection hone ka matlab ek list hona nahi hai
 *   2. **hierarchy** — Destinations nested, Package Type flat (§1.1, §1.2)
 *   3. **references kabhi mari hui id pe na baithein** — D-42 §2 ka invariant
 *   4. **read contributor ke paas, write editor ke paas** — dropdown khaali na rahein
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

async function createDestination(jar, body) {
  return authed('post', '/api/taxonomies', jar).send({ type: 'destination', ...body })
}

async function createPackageType(jar, body) {
  return authed('post', '/api/taxonomies', jar).send({ type: 'packageType', ...body })
}

/** Ek asli media document — `itineraryImages` ka positive case iske bina test nahi hota. */
async function createMedia() {
  const uploader = await User.findOne({ email: 'admin@test.com' }).lean()

  return Media.create({
    filename: 'beach.png',
    mime: 'image/png',
    size: 4096,
    width: 1200,
    height: 800,
    variants: [{ key: 'thumb', url: '/uploads/x/thumb.webp', w: 300, h: 300 }],
    uploadedBy: uploader._id,
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
    Media.deleteMany({}),
    Taxonomy.deleteMany({}),
    Hotel.deleteMany({}),
    AddOn.deleteMany({}),
    Transfer.deleteMany({}),
    PackageDefaults.deleteMany({}),
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

// ── taxonomies ───────────────────────────────────────────────────────────────

describe('taxonomies — Destinations aur Package Type', () => {
  it('name se slug banta hai', async () => {
    const res = await createDestination(adminJar, { name: 'Port Blair' })

    expect(res.status).toBe(201)
    expect(res.body.data.taxonomy.slug).toBe('port-blair')
    expect(res.body.data.taxonomy.type).toBe('destination')
  })

  it('list bina type ke 400 deti hai — ek collection ka matlab ek list nahi', async () => {
    const res = await authed('get', '/api/taxonomies', adminJar)

    expect(res.status).toBe(400)
  })

  it('Destinations ki list me Package Type ki rows nahi aatin', async () => {
    await createDestination(adminJar, { name: 'Havelock' })
    await createPackageType(adminJar, { name: 'Honeymoon' })

    const res = await authed('get', '/api/taxonomies?type=destination', adminJar)

    expect(res.body.data.taxonomies).toHaveLength(1)
    expect(res.body.data.taxonomies[0].name).toBe('Havelock')
  })

  it('do alag vocabularies ek hi slug le sakti hain', async () => {
    // Uniqueness {siteId, locale, type, slug} pe hai — ek destination "goa" aur ek
    // packageType "goa" ko takrane dena client ko bina wajah rokna hota
    const a = await createDestination(adminJar, { name: 'Goa' })
    const b = await createPackageType(adminJar, { name: 'Goa' })

    expect(a.body.data.taxonomy.slug).toBe('goa')
    expect(b.body.data.taxonomy.slug).toBe('goa')
  })

  it('ek hi list me slug dobara aaye to -2 lagta hai', async () => {
    await createDestination(adminJar, { name: 'Goa' })
    const res = await createDestination(adminJar, { name: 'Goa' })

    expect(res.body.data.taxonomy.slug).toBe('goa-2')
  })

  it('Destination nested ho sakti hai — India → Kerala', async () => {
    const india = (await createDestination(adminJar, { name: 'India' })).body.data.taxonomy
    const res = await createDestination(adminJar, { name: 'Kerala', parentId: india.id })

    expect(res.status).toBe(201)
    expect(res.body.data.taxonomy.parentId).toBe(india.id)
  })

  it('Package Type flat hai — usme nesting 422 deti hai', async () => {
    const honeymoon = (await createPackageType(adminJar, { name: 'Honeymoon' })).body.data.taxonomy
    const res = await createPackageType(adminJar, { name: 'Luxury', parentId: honeymoon.id })

    expect(res.status).toBe(422)
  })

  it('alag list ka parent nahi chun sakte', async () => {
    const theme = (await createPackageType(adminJar, { name: 'Honeymoon' })).body.data.taxonomy
    const res = await createDestination(adminJar, { name: 'Goa', parentId: theme.id })

    expect(res.status).toBe(422)
  })

  it('apne hi bachche ke andar nahi ja sakti — cycle ruk jaati hai', async () => {
    const india = (await createDestination(adminJar, { name: 'India' })).body.data.taxonomy
    const kerala = (await createDestination(adminJar, { name: 'Kerala', parentId: india.id })).body
      .data.taxonomy

    const res = await authed('patch', `/api/taxonomies/${india.id}`, adminJar).send({
      parentId: kerala.id,
    })

    expect(res.status).toBe(422)
  })

  it('type PATCH se badal nahi sakta — wo strip ho jaata hai', async () => {
    const goa = (await createDestination(adminJar, { name: 'Goa' })).body.data.taxonomy

    await authed('patch', `/api/taxonomies/${goa.id}`, adminJar).send({ type: 'packageType' })

    expect((await Taxonomy.findById(goa.id).lean()).type).toBe('destination')
  })

  it('jiske bachche hain wo delete nahi hoti', async () => {
    const india = (await createDestination(adminJar, { name: 'India' })).body.data.taxonomy
    await createDestination(adminJar, { name: 'Kerala', parentId: india.id })

    const res = await authed('delete', `/api/taxonomies/${india.id}`, adminJar)
    expect(res.status).toBe(422)
  })

  it('contributor padh sakta hai, likh nahi sakta', async () => {
    await createDestination(adminJar, { name: 'Goa' })

    expect((await authed('get', '/api/taxonomies?type=destination', contributorJar)).status).toBe(
      200,
    )
    expect((await createDestination(contributorJar, { name: 'Kerala' })).status).toBe(403)
  })
})

// ── hotels ───────────────────────────────────────────────────────────────────

describe('hotels', () => {
  it('destination aur category ke saath banta hai', async () => {
    const goa = (await createDestination(adminJar, { name: 'Goa' })).body.data.taxonomy

    const res = await authed('post', '/api/hotels', adminJar).send({
      destinationId: goa.id,
      category: 'deluxe',
      name: 'City hotel near Aberdeen Bazaar',
      room: 'Deluxe, twin sharing',
    })

    expect(res.status).toBe(201)
    expect(res.body.data.item.category).toBe('deluxe')
  })

  it('anjaan destination pe 422 — reference kabhi mari hui id pe nahi baithti', async () => {
    // D-42 §2 ka invariant: asli bachav reference BANNE se pehle hai, render pe nahi
    const res = await authed('post', '/api/hotels', adminJar).send({
      destinationId: '64b7f3f3f3f3f3f3f3f3f3f3',
      category: 'deluxe',
      name: 'Nowhere Hotel',
    })

    expect(res.status).toBe(422)
  })

  it('Package Type ki id destination ki jagah nahi chalti', async () => {
    const theme = (await createPackageType(adminJar, { name: 'Honeymoon' })).body.data.taxonomy

    const res = await authed('post', '/api/hotels', adminJar).send({
      destinationId: theme.id,
      category: 'deluxe',
      name: 'Wrong Vocabulary Hotel',
    })

    expect(res.status).toBe(422)
  })

  it('paanch me se koi bhi category ke bahar ki value 400 deti hai', async () => {
    const goa = (await createDestination(adminJar, { name: 'Goa' })).body.data.taxonomy

    const res = await authed('post', '/api/hotels', adminJar).send({
      destinationId: goa.id,
      category: 'ultraLuxury',
      name: 'X',
    })

    expect(res.status).toBe(400)
  })

  it('destination aur category se filter hoti hai', async () => {
    const goa = (await createDestination(adminJar, { name: 'Goa' })).body.data.taxonomy
    const kerala = (await createDestination(adminJar, { name: 'Kerala' })).body.data.taxonomy

    for (const [dest, category, name] of [
      [goa.id, 'deluxe', 'Goa Deluxe'],
      [goa.id, 'luxury', 'Goa Luxury'],
      [kerala.id, 'deluxe', 'Kerala Deluxe'],
    ]) {
      await authed('post', '/api/hotels', adminJar).send({
        destinationId: dest,
        category,
        name,
      })
    }

    const byDest = await authed('get', `/api/hotels?destinationId=${goa.id}`, adminJar)
    const byBoth = await authed(
      'get',
      `/api/hotels?destinationId=${goa.id}&category=luxury`,
      adminJar,
    )

    expect(byDest.body.data.items).toHaveLength(2)
    expect(byBoth.body.data.items).toHaveLength(1)
    expect(byBoth.body.data.items[0].name).toBe('Goa Luxury')
  })

  it('jis destination pe hotel hai wo destination delete nahi hoti', async () => {
    const goa = (await createDestination(adminJar, { name: 'Goa' })).body.data.taxonomy
    await authed('post', '/api/hotels', adminJar).send({
      destinationId: goa.id,
      category: 'deluxe',
      name: 'Goa Deluxe',
    })

    const res = await authed('delete', `/api/taxonomies/${goa.id}`, adminJar)
    expect(res.status).toBe(422)
  })
})

// ── add-ons + transfers ──────────────────────────────────────────────────────

describe('add-ons aur transfers', () => {
  it('add-on ka price free text hai — range aur alag basis dono chalte hain', async () => {
    // Number field me `₹3,500 – ₹4,500 pp` likha hi nahi ja sakta (spec 007 §1.4)
    for (const price of ['₹3,500 – ₹4,500 pp', '₹2,500 per couple']) {
      const res = await authed('post', '/api/add-ons', adminJar).send({
        name: 'Scuba',
        price,
        where: 'Elephant Beach, Havelock',
      })

      expect(res.status).toBe(201)
      expect(res.body.data.item.price).toBe(price)
    }
  })

  it('transfer apna icon rakhta hai', async () => {
    const res = await authed('post', '/api/transfers', adminJar).send({
      name: 'Ferry',
      icon: 'ferry',
    })

    expect(res.status).toBe(201)
    expect(res.body.data.item.icon).toBe('ferry')
  })

  it('editor likh sakta hai, contributor sirf padh sakta hai', async () => {
    expect((await authed('post', '/api/transfers', editorJar).send({ name: 'Cab' })).status).toBe(
      201,
    )
    expect(
      (await authed('post', '/api/transfers', contributorJar).send({ name: 'Bus' })).status,
    ).toBe(403)
    expect((await authed('get', '/api/transfers', contributorJar)).status).toBe(200)
  })

  it('list pe pagination day 1 se hai (R14)', async () => {
    for (const n of [1, 2, 3]) {
      await authed('post', '/api/add-ons', adminJar).send({ name: `Add-on ${n}` })
    }

    const res = await authed('get', '/api/add-ons?limit=2&page=1', adminJar)

    expect(res.body.data.items).toHaveLength(2)
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 })
  })

  it('delete permanent hai — master list content nahi hai', async () => {
    const created = await authed('post', '/api/transfers', adminJar).send({ name: 'Cab' })
    const { id } = created.body.data.item

    expect((await authed('delete', `/api/transfers/${id}`, adminJar)).status).toBe(200)
    expect(await Transfer.findById(id).lean()).toBeNull()
  })
})

// ── packageDefaults ──────────────────────────────────────────────────────────

describe('packageDefaults', () => {
  it('pehli read pe singleton khud ban jaata hai', async () => {
    const res = await authed('get', '/api/package-defaults', adminJar)

    expect(res.status).toBe(200)
    expect(res.body.data.packageDefaults.whatsIncluded).toEqual({ included: [], excluded: [] })
    expect(await PackageDefaults.countDocuments({})).toBe(1)
  })

  it('dobara read pe doosra document nahi banta', async () => {
    await authed('get', '/api/package-defaults', adminJar)
    await authed('get', '/api/package-defaults', adminJar)

    expect(await PackageDefaults.countDocuments({})).toBe(1)
  })

  it("what's included dono column me save hota hai", async () => {
    const res = await authed('patch', '/api/package-defaults', adminJar).send({
      whatsIncluded: {
        included: ['Accommodation on twin sharing with daily breakfast'],
        excluded: ['Airfare'],
      },
    })

    expect(res.body.data.packageDefaults.whatsIncluded.included).toHaveLength(1)
    expect(res.body.data.packageDefaults.whatsIncluded.excluded).toEqual(['Airfare'])
  })

  it('booking steps ko stable id milti hai, aur maujood id badalti nahi', async () => {
    const first = await authed('patch', '/api/package-defaults', adminJar).send({
      bookingSteps: [{ title: 'Tell us your dates' }],
    })

    const stepId = first.body.data.packageDefaults.bookingSteps[0].id
    expect(stepId).toBeTruthy()

    const second = await authed('patch', '/api/package-defaults', adminJar).send({
      bookingSteps: [
        { id: stepId, title: 'Tell us your dates' },
        { title: 'Get the day-by-day plan' },
      ],
    })

    const steps = second.body.data.packageDefaults.bookingSteps
    expect(steps[0].id).toBe(stepId)
    expect(steps[1].id).toBeTruthy()
    expect(steps[1].id).not.toBe(stepId)
  })

  it('itinerary images me asli media id chalti hai', async () => {
    const media = await createMedia()

    const res = await authed('patch', '/api/package-defaults', adminJar).send({
      itineraryImages: [String(media._id)],
    })

    expect(res.status).toBe(200)
    expect(res.body.data.packageDefaults.itineraryImages).toEqual([String(media._id)])
  })

  it('anjaan media id pe 422 — gallery me khaali khaana kabhi nahi', async () => {
    const res = await authed('patch', '/api/package-defaults', adminJar).send({
      itineraryImages: ['64b7f3f3f3f3f3f3f3f3f3f3'],
    })

    expect(res.status).toBe(422)
  })

  /**
   * Section headings — Q-9 (client, 31 Aug).
   *
   * Ye contract test hai, UI ka nahi: "khaali chhodi" aur "kabhi chhui hi nahi" ka farak
   * **server pe** tay hota hai (`toSectionLabels()`), aur wahi farak client ko line hataane
   * deta hai. Bina test ke wo farak ek din chup-chaap mit jaata.
   */
  describe('sectionLabels (Q-9)', () => {
    it('kuch set na ho to public payload me theme ke apne heading aur line aate hain', async () => {
      const res = await request(app).get('/api/public/package-defaults')

      expect(res.status).toBe(200)

      const labels = res.body.data.packageDefaults.sectionLabels

      expect(labels.overview.heading).toBe('About this itinerary')
      /** Overview pe description ka field hi nahi — uska text `entry.content` se aata hai. */
      expect(labels.overview).not.toHaveProperty('description')
      expect(labels.addOns.heading).toBe('Popular add-ons')
      /** Default padhne laayak string hai, par bahar doc ban kar jaati hai (D-69). */
      expect(labels.addOns.description).toEqual(
        textToDoc('Added to your quote only if you want them.'),
      )
    })

    it('client ka heading aur description dono public payload me jaate hain', async () => {
      /** Bold ke saath — yahi is field ke rich hone ki poori wajah hai (D-69). */
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Add ' },
              { type: 'text', marks: [{ type: 'bold' }], text: 'these' },
              { type: 'text', text: ' to your quote.' },
            ],
          },
        ],
      }

      await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: { addOns: { heading: 'Optional extras', description: doc } },
      })

      const res = await request(app).get('/api/public/package-defaults')
      const labels = res.body.data.packageDefaults.sectionLabels

      expect(labels.addOns).toEqual({ heading: 'Optional extras', description: doc })
    })

    it('khaali heading pe theme ka heading wapas aata hai — section bina title ke nahi rehta', async () => {
      await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: { faq: { heading: '', description: emptyDoc() } },
      })

      const res = await request(app).get('/api/public/package-defaults')

      expect(res.body.data.packageDefaults.sectionLabels.faq.heading).toBe(
        'Questions about this package',
      )
    })

    it('khaali description line ko HATA deti hai — theme wali wapas nahi aati', async () => {
      /**
       * Yahi is feature ka asli maqsad hai. Add-ons ki line theme me maujood hai; client
       * use khaali karke hata sakta hai. Agar yahan fallback lag gaya to client kisi bhi
       * line se kabhi peecha nahi chhuda payega — aur hotels wali line me to abhi ek
       * jhootha vaada hai ("and on the enquiry form", Q-2).
       */
      await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: { addOns: { heading: 'Popular add-ons', description: emptyDoc() } },
      })

      const res = await request(app).get('/api/public/package-defaults')

      expect(isEmptyDoc(res.body.data.packageDefaults.sectionLabels.addOns.description)).toBe(true)
    })

    /**
     * Overview pe description ka box hai hi nahi (client, 31 Aug) — uska text
     * `entry.content` (Edit Package ▸ Overview) se aata hai, aur wo per-package hai.
     *
     * `.strict()` ke bina Zod ise **chup-chaap gira deta** aur admin ko "save ho gaya"
     * dikhta. Yahi wajah hai ki ye test hai.
     */
    it('overview pe description bhejne se 400 aata hai — chup-chaap girta nahi', async () => {
      const res = await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: {
          overview: { heading: 'About this trip', description: 'Kuch bhi' },
        },
      })

      expect(res.status).toBe(400)
    })

    it('overview ka heading akela save hota hai, aur payload me description ki key hoti hi nahi', async () => {
      await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: { overview: { heading: 'About this trip' } },
      })

      const res = await request(app).get('/api/public/package-defaults')
      const overview = res.body.data.packageDefaults.sectionLabels.overview

      expect(overview.heading).toBe('About this trip')
      expect(overview).not.toHaveProperty('description')
    })

    /**
     * Admin jo padhta hai wahi wapas bhejta hai (Save pe poora object jaata hai). Agar
     * payload me koi aisi key ho jo schema na le, to Save **400** pe mar jaata — aur wo
     * failure sirf asli admin chalane pe dikhti, test me kabhi nahi.
     */
    it('admin ka padha hua payload bina badle wapas save ho jaata hai', async () => {
      const read = await authed('get', '/api/package-defaults', adminJar)
      const roundTrip = await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: read.body.data.packageDefaults.sectionLabels,
      })

      expect(roundTrip.status).toBe(200)
    })

    /**
     * Admin ko **resolved** labels milte hain, raw stored nahi — wahi text jo page pe
     * chhap raha hai. Warna admin ko khud fallback lagana padta aur wo shart do jagah
     * likhi hoti.
     */
    it('admin ko bhi resolved labels milte hain, khaali stored nahi', async () => {
      const res = await authed('get', '/api/package-defaults', adminJar)
      const labels = res.body.data.packageDefaults.sectionLabels

      expect(labels.addOns.description).toEqual(
        textToDoc('Added to your quote only if you want them.'),
      )
    })

    /**
     * ⚠️ TipTap khaali editor ko `{content:[{type:'paragraph'}]}` chhod jaata hai — khaali
     * array nahi. Client ne box khola, kuch nahi likha, Save dabaya — bas.
     *
     * `content.length` dekhne wala koi bhi check ise "bhari hui" maan lega, aur page pe ek
     * khaali `<p>` chhap jaayega jiska margin heading ke neeche bina wajah ka gap banata
     * hai. D-65 ka "khaali = line hata do" isi shakl pe toot-ta hai.
     */
    it('editor khol kar band karna khaali hi ginta hai — khaali paragraph line nahi banata', async () => {
      await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: {
          addOns: {
            heading: 'Popular add-ons',
            description: { type: 'doc', content: [{ type: 'paragraph' }] },
          },
        },
      })

      const res = await request(app).get('/api/public/package-defaults')

      expect(isEmptyDoc(res.body.data.packageDefaults.sectionLabels.addOns.description)).toBe(true)
    })

    /**
     * ⚠️ TipTap heading ke baad ek **trailing khaali paragraph** chhod deta hai (ProseMirror
     * ka apna vyavhaar — heading ke neeche cursor rakhne ki jagah). Wo chup-chaap save ho
     * jaata hai aur page pe khaali `<p>` ban kar ~23px ki bina wajah ki jagah bana deta hai.
     *
     * Client ne ise "spacing ka issue" ki tarah dekha, aur wo theek dekha.
     */
    it('aakhir ka khaali paragraph write pe hi gir jaata hai', async () => {
      await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: {
          addOns: {
            heading: 'Popular add-ons',
            description: {
              type: 'doc',
              content: [
                { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Hi' }] },
                { type: 'paragraph' },
                { type: 'paragraph' },
              ],
            },
          },
        },
      })

      const res = await request(app).get('/api/public/package-defaults')
      const { content } = res.body.data.packageDefaults.sectionLabels.addOns.description

      expect(content).toHaveLength(1)
      expect(content[0].type).toBe('heading')
    })

    /** Beech ka khaali paragraph client ka faisla ho sakta hai — wo nahi chhoota. */
    it('beech ka khaali paragraph bacha rehta hai', async () => {
      await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: {
          addOns: {
            heading: 'Popular add-ons',
            description: {
              type: 'doc',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'A' }] },
                { type: 'paragraph' },
                { type: 'paragraph', content: [{ type: 'text', text: 'B' }] },
              ],
            },
          },
        },
      })

      const res = await request(app).get('/api/public/package-defaults')

      expect(res.body.data.packageDefaults.sectionLabels.addOns.description.content).toHaveLength(3)
    })

    it('plain string ab reject hoti hai — description doc hai (D-69)', async () => {
      const res = await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: { addOns: { heading: 'Popular add-ons', description: 'purana shape' } },
      })

      expect(res.status).toBe(400)
    })

    it('anjaan section key reject hoti hai', async () => {
      const res = await authed('patch', '/api/package-defaults', adminJar).send({
        sectionLabels: { notASection: { heading: 'Hi', description: '' } },
      })

      expect(res.status).toBe(400)
    })
  })

  /**
   * ⚠️ Ye payload me **chhoot gaya tha** (31 Aug ko pakda) — `PackagePage.jsx` ise padhta
   * hai par projection bhejti hi nahi thi, to client ki likhi cancellation policy page pe
   * kabhi nahi aati thi. Wahi shakl jo D-64 wale transfer-duration bug ki thi.
   */
  it('cancellationText public payload me jaata hai', async () => {
    await authed('patch', '/api/package-defaults', adminJar).send({
      cancellationText: 'Cancellations more than 30 days before travel are fully refunded.',
    })

    const res = await request(app).get('/api/public/package-defaults')

    expect(res.body.data.packageDefaults.cancellationText).toBe(
      'Cancellations more than 30 days before travel are fully refunded.',
    )
  })

  it('contributor padh sakta hai, badal nahi sakta', async () => {
    expect((await authed('get', '/api/package-defaults', contributorJar)).status).toBe(200)
    expect(
      (
        await authed('patch', '/api/package-defaults', contributorJar).send({
          cancellationText: 'Nope',
        })
      ).status,
    ).toBe(403)
  })
})
