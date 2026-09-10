import { DEFAULT_SITE_ID } from '@cms/shared'
import mongoose from 'mongoose'
import { beforeEach, describe, expect, it } from 'vitest'

import { importInlineImages } from '../modules/bulk-imports/inline-images.js'

/**
 * Article ke andar ki images ka import — spec 008.
 *
 * ## ⚠️ Ye test na Mongo chhuata hai, na disk — aur wo jaan-boojh kar hai
 *
 * Pehla version asli `Media` aur asli storage pe likha gaya tha. Wo **akele chalne pe pass**
 * hota tha aur poori suite me fail — kyunki `media.test.js` ki `beforeEach` `UPLOAD_ROOT` ko
 * `rm -rf` karti hai **aur** `Media.deleteMany({})` chalati hai, dono bina `siteId` ke. Vitest
 * files parallel chalata hai, to meri image beech me hi gayab ho jaati thi.
 *
 * Us failure ka lakshan bilkul ek logic bug jaisa tha (`match(...)` pe `null`), aur usi kism
 * ka dhokha A-11 me likha hai. Isliye media ka raasta ab `deps.mediaPort` se aata hai — wahi
 * convention jo `deps.fetchImpl` aur `createMediaFromUpload(input, { storage })` pe hai.
 *
 * ⚠️ **`stemFor()` phir bhi production code me hai, dono taraf** — dhoondhne ka naam aur save
 * karne ka naam alag ho jaana hi wo bug tha jo D-86 me har import pe duplicate bana raha tha.
 * Ye test us jodi ko sach me jaanchta hai: fake store sirf `filename` se dhoondhta hai.
 */

const actor = { user: { _id: new mongoose.Types.ObjectId() } }

const REMOTE = 'https://lh7-rt.googleusercontent.com/docsz/AD_4nXabc123'
const OTHER = 'https://lh7-rt.googleusercontent.com/docsz/AD_4nXzzz999'

/** Jaisa Google sach me bhejta hai — 10 Sep ko asli doc pe naapa gaya. */
const DATA_URI = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-bytes').toString('base64')
const DATA_URI_2 = 'data:image/png;base64,' + Buffer.from('another-image').toString('base64')

/** Naqli Google — har image URL pe ek chhoti PNG. */
const PNG = Buffer.from('89504e470d0a1a0a', 'hex')

const okFetch = async (url) => ({
  ok: true,
  status: 200,
  url,
  headers: new Map([
    ['content-type', 'image/png'],
    ['content-length', String(PNG.length)],
  ]),
  arrayBuffer: async () => PNG,
})

const deadFetch = async (url) => ({
  ok: false,
  status: 404,
  url,
  headers: new Map(),
  arrayBuffer: async () => Buffer.alloc(0),
})

/**
 * Media ka naqli ghar.
 *
 * ⚠️ Ye **sirf `filename` se** dhoondhta hai — bilkul waise jaise Mongo wala port. Isse wo
 * jodi sach me jaanchi jaati hai: `importOne()` jis naam se save karta hai, `findImportedMedia()`
 * usi naam se dhoondhta hai ya nahi.
 */
function fakeMediaPort() {
  const rows = []
  const created = []
  let next = 1

  return {
    rows,
    created,

    async findByFilenames(filenames) {
      return rows.find((row) => filenames.includes(row.filename)) ?? null
    },

    async create(input) {
      created.push(input)
      const id = String(next++).padStart(24, '0')

      const row = {
        id,
        filename: `${input.filename}.png`,
        variants: [
          { key: 'large', url: `/uploads/sites/default/media/2026/09/${id}/large.webp` },
          { key: 'thumb', url: `/uploads/sites/default/media/2026/09/${id}/thumb.webp` },
        ],
      }

      rows.push(row)

      return row
    },
  }
}

let port

const run = (html, fetchImpl = okFetch) =>
  importInlineImages(html, {
    actor,
    siteId: DEFAULT_SITE_ID,
    deps: { fetchImpl, mediaPort: port },
  })

beforeEach(() => {
  port = fakeMediaPort()
})

describe('bahar ki image Media library me utarti hai', () => {
  it('src hamare apne URL se badal jaata hai', async () => {
    const { html, issues } = await run(`<p>Before</p><p><img src="${REMOTE}"></p><p>After</p>`)

    expect(issues).toEqual([])
    expect(html).not.toContain('googleusercontent.com')
    expect(html).toMatch(/<img src="\/uploads\/sites\/default\/media\/[^"]+\/large\.webp">/)
    expect(port.rows).toHaveLength(1)
  })

  it('thumb nahi, large variant lagta hai — wahi jo public payload chunta hai', async () => {
    const { html } = await run(`<p><img src="${REMOTE}"></p>`)

    expect(html).toContain('/large.webp')
    expect(html).not.toContain('/thumb.webp')
  })

  it('poora article bacha rehta hai — sirf src badalta hai', async () => {
    const { html } = await run(`<h2>Ferries</h2><p><img src="${REMOTE}" alt="A jetty"></p>`)

    expect(html).toContain('<h2>Ferries</h2>')
    expect(html).toContain('alt="A jetty"')
  })

  it('ek hi image do jagah ho to ek hi baar utarti hai', async () => {
    const { html } = await run(`<p><img src="${REMOTE}"></p><p><img src="${REMOTE}"></p>`)

    expect(port.rows).toHaveLength(1)

    const urls = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1])
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe(urls[1])
  })

  it('do alag images do alag record banati hain', async () => {
    await run(`<p><img src="${REMOTE}"></p><p><img src="${OTHER}"></p>`)

    expect(port.rows).toHaveLength(2)
  })

  it('single quote wale src pe bhi chalta hai', async () => {
    /** ⚠️ Sirf double quotes pakadna wahi chup jaal hai jo `google-html.js` me ek baar ban chuka tha. */
    const { html } = await run(`<p><img src='${REMOTE}'></p>`)

    expect(port.rows).toHaveLength(1)
    expect(html).not.toContain('googleusercontent.com')
  })
})

describe('dobara import pe image dobara nahi utarti', () => {
  it('doosri baar koi naya media record nahi banta', async () => {
    const first = await run(`<p><img src="${REMOTE}"></p>`)
    expect(port.rows).toHaveLength(1)

    /**
     * ⚠️ Doosri baar fetch **chalna hi nahi chahiye**, isliye yahan `deadFetch` diya gaya hai:
     * code phir bhi download karne gaya to 404 khaayega aur image gir jaayegi — yaani test
     * saaf-saaf fail hoga, chup-chaap pass nahi hoga.
     */
    const second = await run(`<p><img src="${REMOTE}"></p>`, deadFetch)

    expect(port.rows).toHaveLength(1)
    expect(second.issues).toEqual([])
    expect(second.html).toBe(first.html)
  })

  it('pehchan URL se hoti hai, position se nahi', async () => {
    /**
     * ⚠️ Yahi is design ka poora point. Client article ke **beech me** ek nayi image daale to
     * purani apni jagah rehni chahiye. Position se milaane wale tareeke me wo khisak jaati aur
     * **galat image galat jagah** lag jaati — chup-chaap.
     */
    const first = await run(`<p><img src="${REMOTE}"></p>`)
    const firstUrl = first.html.match(/<img src="([^"]+)"/)[1]

    const second = await run(`<p><img src="${OTHER}"></p><p><img src="${REMOTE}"></p>`)
    const urls = [...second.html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1])

    expect(port.rows).toHaveLength(2)
    /** Purani image wahi rahi, chahe ab wo doosre number pe hai. */
    expect(urls[1]).toBe(firstUrl)
  })
})

describe('jo download nahi honi chahiye', () => {
  it('hamari apni media ka URL chhua nahi jaata', async () => {
    const own =
      'http://localhost:5173/uploads/sites/default/media/2026/09/6a982cedb298ea0c64eeab4f/large.webp'

    const { html, issues } = await run(`<p><img src="${own}"></p>`, deadFetch)

    expect(html).toContain(own)
    expect(issues).toEqual([])
    expect(port.rows).toEqual([])
  })

  it('bina src wala <img> poora hata diya jaata hai', async () => {
    /**
     * ⚠️ Ye asli haalat hai — Google ka export un images ko `<img>` ki tarah likhta hai jo doc
     * me embed nahi ho payi. Use rakhne ka matlab hai page pe ek toota hua icon (D-42 §2).
     */
    const { html } = await run('<p>Before</p><p><img></p><p>After</p>', deadFetch)

    expect(html).not.toContain('<img')
    expect(html).toContain('<p>Before</p>')
    expect(html).toContain('<p>After</p>')
  })

  it('bina image wali HTML waisi ki waisi lautti hai', async () => {
    const source = '<h2>No pictures here</h2><p>Just words.</p>'
    const { html, issues } = await run(source, deadFetch)

    expect(html).toBe(source)
    expect(issues).toEqual([])
  })
})

describe('image na aaye to sirf image gire, article nahi', () => {
  it('fail hone pe img hat_ta hai aur note aata hai — blocker nahi', async () => {
    const { html, issues } = await run(
      `<h2>Ferries</h2><p><img src="${REMOTE}"></p><p>Body text</p>`,
      deadFetch,
    )

    expect(html).not.toContain('<img')
    expect(html).toContain('<h2>Ferries</h2>')
    expect(html).toContain('Body text')

    expect(issues).toHaveLength(1)
    expect(issues[0].level).toBe('note')
    expect(issues[0].label).toBe('Content image')
    expect(issues[0].value).toBe(REMOTE)
    expect(port.rows).toEqual([])
  })
})

describe('data: URI — jaisa Google sach me bhejta hai', () => {
  /**
   * ⚠️ **Ye shakl 10 Sep ko asli doc pe naap kar mili**, aur pehle iska ulta maan liya gaya tha
   * (`lh7-*.googleusercontent.com`). `export?format=html` doc me paste ki hui image ko
   * **inline base64** me bhejta hai.
   *
   * Us galat andaze ke do nateeje the, aur dono chup the: sanitizer `data:` ko allow na karke
   * `src` hata deta tha, aur importer `fetchImage()` pe jaata jahan SSRF guard use theek hi
   * thukra deta.
   */
  it('data: URI se image bina kisi fetch ke utar jaati hai', async () => {
    /** `deadFetch` yahan pehra hai: koi fetch hui to test saaf fail hoga. */
    const { html, issues } = await run(`<p><img src="${DATA_URI}"></p>`, deadFetch)

    expect(issues).toEqual([])
    expect(port.rows).toHaveLength(1)
    expect(html).not.toContain('data:image')
    expect(html).toContain('/large.webp')
  })

  it('mime data: URI se hi padha jaata hai', async () => {
    await run(`<p><img src="${DATA_URI}"></p>`, deadFetch)

    expect(port.created[0].declaredMime).toBe('image/jpeg')
  })

  it('wahi image dobara import pe dobara nahi utarti', async () => {
    /**
     * ⚠️ `data:` URI ke saath naam apne aap **content ka hash** ban jaata hai, isliye wo sawaal
     * hi nahi uthta jo bahar ke URL pe uthta tha ("src sthir rahega ya nahi").
     */
    const first = await run(`<p><img src="${DATA_URI}"></p>`, deadFetch)
    const second = await run(`<p><img src="${DATA_URI}"></p>`, deadFetch)

    expect(port.rows).toHaveLength(1)
    expect(second.html).toBe(first.html)
  })

  it('do alag images do alag record banati hain', async () => {
    await run(`<p><img src="${DATA_URI}"></p><p><img src="${DATA_URI_2}"></p>`, deadFetch)

    expect(port.rows).toHaveLength(2)
  })
})
