import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../app.js'
import { connectTestDb, disconnectTestDb } from './db.js'
import { ContentType } from '../modules/content-types/model.js'
import { Entry } from '../modules/entries/model.js'
import { ensureBuiltInContentTypes } from '../modules/content-types/service.js'
import { Settings } from '../modules/settings/model.js'
import { Sidebar } from '../modules/sidebars/model.js'
import { entryCounts, listEntries, updateEntry } from '../modules/entries/service.js'
import { Redirect } from '../modules/redirects/model.js'
import { updateSettings } from '../modules/settings/service.js'
import { Taxonomy } from '../modules/taxonomies/model.js'

/**
 * Blog ka integration test — asli Mongo pe (spec 008).
 *
 * ## ⚠️ Yahan koi login nahi hai, aur wo jaan-boojh kar hai
 *
 * Sab kuch `Entry.create()` se banta hai aur public API se padha jaata hai. Wajah 8 Sep ka
 * sabak: `entries.test.js` ka har test `beforeEach` me chaar login karta tha, aur file badi
 * hone pe wo 1000 req/min wali chhat paar kar gayi — naye tests **429** khaane lage aur wo
 * failure bilkul logic bug jaisi dikhti thi. Yahan likhne ka koi raasta test hi nahi karta
 * (wo `entries.test.js` ka kaam hai), isliye login ki zaroorat hi nahi.
 *
 * ## Kya sabse zaroori hai
 *
 * 1. **`post` package-shaped payload pe nahi girta** — wo aaj tak `toPublicEntry()` pe jaata tha
 * 2. **Byline `blogSettings.author` se hai**, `authorId` se nahi — warna page pe admin ka naam
 * 3. **Prev/next ke chaar edge case**, tie samet — bina tie ke chain beech se toot-ti hai
 * 4. **Naya post listing pe apne aap aata hai** — `postList` query se chalta hai, chunav se nahi
 * 5. **TOC ke link aur heading ke `id` bilkul match karte hain**
 *
 * Chalane se pehle: `pnpm db:up`
 */

const app = createApp()

const resolve = (path) => request(app).get('/api/public/resolve').query({ path })

/** Ek published post — `publishAt` hi blog ka poora kram tay karta hai. */
async function makePost({
  title,
  slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  publishAt,
  categories = [],
  blocks = [],
  status = 'published',
  deletedAt = null,
  excerpt = '',
} = {}) {
  return Entry.create({
    siteId: 'default',
    locale: 'en',
    type: 'post',
    title,
    slug,
    path: `/blog/${slug}`,
    status,
    publishAt,
    deletedAt,
    excerpt,
    taxonomies: { categories },
    content: { version: 1, blocks },
  })
}

const textBlock = (id, html) => ({ id, type: 'richText', props: { html } })

/** Ek blog listing page jisme `postList` ho — aur uska resolve kiya hua payload. */
async function resolvedListing(props = {}) {
  await Entry.create({
    siteId: 'default',
    locale: 'en',
    type: 'blogPage',
    title: 'Andaman travel guide',
    slug: 'blog',
    path: '/blog',
    status: 'published',
    publishAt: new Date(),
    fields: {},
    content: { version: 1, blocks: [{ id: 'pl1', type: 'postList', props }] },
  })

  const res = await resolve('/blog')
  return res.body.data.entry.blocks.find((b) => b.type === 'postList')
}

async function makeCategory(name, slug = name.toLowerCase()) {
  const doc = await Taxonomy.create({ siteId: 'default', type: 'category', name, slug })
  return String(doc._id)
}

const day = (n) => new Date(`2026-0${n}-01T00:00:00Z`)

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([
    Entry.deleteMany({}),
    ContentType.deleteMany({}),
    Settings.deleteMany({}),
    Sidebar.deleteMany({}),
    Taxonomy.deleteMany({}),
    /** ⚠️ Bina iske ek test ki redirect agle test me leak karti hai aur loop-check jhootha ho jaata. */
    Redirect.deleteMany({}),
  ])
  await ensureBuiltInContentTypes()
})

describe('post ka payload package-shaped nahi hai', () => {
  it('post apni branch se aata hai — pricing, itinerary, similar kuch nahi', async () => {
    const post = await makePost({ title: 'Ferry guide', publishAt: day(1) })

    const res = await resolve(post.path)
    const entry = res.body.data.entry

    expect(res.status).toBe(200)
    expect(entry.type).toBe('post')
    // Aaj tak post `toPublicEntry()` pe girta tha, jo poori tarah package-shaped hai —
    // ek `page` resolve pe `resolveSimilarPackages()` ka poora daur chalta tha
    for (const key of ['pricing', 'itinerary', 'hotels', 'addOns', 'similar', 'reviews']) {
      expect(entry).not.toHaveProperty(key)
    }
    // Aur jo post ke apne hain
    expect(entry).toHaveProperty('prev')
    expect(entry).toHaveProperty('next')
    expect(entry).toHaveProperty('related')
    expect(entry).toHaveProperty('toc')
  })

  it('kachcha content payload me nahi jaata — sirf blocks', async () => {
    const post = await makePost({
      title: 'Content shape',
      publishAt: day(1),
      blocks: [textBlock('r1', '<p>Body</p>')],
    })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry).not.toHaveProperty('content')
    expect(entry.blocks).toHaveLength(1)
  })
})

describe('byline ka author', () => {
  it('blogSettings se aata hai, entry ke authorId se nahi', async () => {
    await Settings.create({
      siteId: 'default',
      blogSettings: {
        author: { name: 'Andaman Tourism team', role: 'Planners in Port Blair', bio: 'Hum log.' },
      },
    })
    const post = await makePost({ title: 'Byline', publishAt: day(1) })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.author).toEqual({
      name: 'Andaman Tourism team',
      role: 'Planners in Port Blair',
      bio: 'Hum log.',
    })
  })

  it('admin user ka naam kabhi payload me nahi jaata (R10)', async () => {
    const post = await makePost({ title: 'No leak', publishAt: day(1) })

    const entry = (await resolve(post.path)).body.data.entry

    // Author khaali hai kyunki blogSettings bhari hi nahi — par `authorId` ya user ka
    // koi bhi hissa payload me aana R10 ka ullanghan hota
    expect(entry.author.name).toBe('')
    expect(JSON.stringify(entry)).not.toContain('authorId')
  })
})

describe('previous / next ki chain', () => {
  it('Previous purana hai aur Next naya', async () => {
    await makePost({ title: 'Purana', publishAt: day(1) })
    const middle = await makePost({ title: 'Beech', publishAt: day(2) })
    await makePost({ title: 'Naya', publishAt: day(3) })

    const entry = (await resolve(middle.path)).body.data.entry

    expect(entry.prev.title).toBe('Purana')
    expect(entry.next.title).toBe('Naya')
  })

  it('sabse naye post pe next null hai', async () => {
    await makePost({ title: 'Purana', publishAt: day(1) })
    const newest = await makePost({ title: 'Naya', publishAt: day(3) })

    const entry = (await resolve(newest.path)).body.data.entry

    expect(entry.next).toBeNull()
    expect(entry.prev.title).toBe('Purana')
  })

  it('sabse purane post pe prev null hai', async () => {
    const oldest = await makePost({ title: 'Purana', publishAt: day(1) })
    await makePost({ title: 'Naya', publishAt: day(3) })

    const entry = (await resolve(oldest.path)).body.data.entry

    expect(entry.prev).toBeNull()
    expect(entry.next.title).toBe('Naya')
  })

  it('akela post ho to dono null — poora .pn gayab', async () => {
    const only = await makePost({ title: 'Akela', publishAt: day(1) })

    const entry = (await resolve(only.path)).body.data.entry

    expect(entry.prev).toBeNull()
    expect(entry.next).toBeNull()
  })

  it('do post ka publishAt ek hi ho to bhi chain toot-ti nahi', async () => {
    // Bina `_id` ke compound cursor ke `$lt`/`$gt` dono ko chhod dete hain, aur beech me se
    // chain toot jaati hai — ye "edge case" bulk publish pe aam hai
    const same = day(2)
    const a = await makePost({ title: 'Ek', slug: 'ek', publishAt: same })
    const b = await makePost({ title: 'Do', slug: 'do', publishAt: same })

    const first = (await resolve(a.path)).body.data.entry
    const second = (await resolve(b.path)).body.data.entry

    // Kram jo bhi ho, dono ek doosre se jude hone chahiye — aur A → B → A wala loop na bane
    const links = [first.prev, first.next, second.prev, second.next].filter(Boolean)
    expect(links.length).toBe(2)
    expect(new Set(links.map((l) => l.id)).size).toBe(2)
  })

  it('trash me pada post chain me nahi aata', async () => {
    await makePost({ title: 'Trashed', publishAt: day(1), deletedAt: new Date() })
    const post = await makePost({ title: 'Zinda', publishAt: day(2) })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.prev).toBeNull()
  })

  it('scheduled post jiska waqt aa chuka wo chain me hai (R2)', async () => {
    // Sirf `status: published` maangne se ye post chain se gayab ho jaata, aur wo failure
    // bilkul chup hoti — cron use baad me published karti hai par wo tab tak live hai
    await makePost({ title: 'Nikal chuka', publishAt: day(1), status: 'scheduled' })
    const post = await makePost({ title: 'Baad wala', publishAt: day(2) })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.prev.title).toBe('Nikal chuka')
  })
})

describe('related reading', () => {
  it('sirf usi category ke post aate hain, khud ko chhod kar', async () => {
    const ferries = await makeCategory('Ferries')
    const beaches = await makeCategory('Beaches')

    const post = await makePost({ title: 'Ferry ek', publishAt: day(1), categories: [ferries] })
    await makePost({ title: 'Ferry do', publishAt: day(2), categories: [ferries] })
    await makePost({ title: 'Beach ek', publishAt: day(3), categories: [beaches] })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.related.map((r) => r.title)).toEqual(['Ferry do'])
  })

  it('chaar se zyada nahi', async () => {
    const cat = await makeCategory('Planning')
    const post = await makePost({ title: 'Main', publishAt: day(1), categories: [cat] })
    for (let i = 0; i < 6; i += 1) {
      await makePost({ title: `Aur ${i}`, publishAt: day(2), categories: [cat] })
    }

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.related).toHaveLength(4)
  })

  it('category patli ho to kam aate hain — kisi aur category se bhare nahi jaate', async () => {
    const cat = await makeCategory('Planning')
    const other = await makeCategory('Food')

    const post = await makePost({ title: 'Main', publishAt: day(1), categories: [cat] })
    await makePost({ title: 'Sathi', publishAt: day(2), categories: [cat] })
    await makePost({ title: 'Alag', publishAt: day(3), categories: [other] })

    const entry = (await resolve(post.path)).body.data.entry

    // "Related reading" jo related hi na ho, wo chhoti list se bura hai
    expect(entry.related).toHaveLength(1)
  })

  it('bina category wale post ka koi related nahi hota', async () => {
    const post = await makePost({ title: 'Anaath', publishAt: day(1) })
    await makePost({ title: 'Doosra', publishAt: day(2) })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.related).toEqual([])
  })
})

describe('On this post (TOC)', () => {
  const threeHeadings =
    '<h2>Nights first</h2><p>a</p><h2>Lock the ferries</h2><p>b</p><h2>Book hotels</h2>'

  it('teen ya zyada heading pe banti hai, aur id body me bhi lagti hai', async () => {
    const post = await makePost({
      title: 'Guide',
      publishAt: day(1),
      blocks: [textBlock('r1', threeHeadings)],
    })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.toc.map((t) => t.id)).toEqual(['nights-first', 'lock-the-ferries', 'book-hotels'])
    // Link aur anchor ek hi pass se aate hain — do jagah slug banane pe wo alag ho jaate
    for (const item of entry.toc) {
      expect(entry.blocks[0].props.html).toContain(`id="${item.id}"`)
    }
  })

  it('teen se kam heading pe render hi nahi hoti', async () => {
    const post = await makePost({
      title: 'Chhota',
      publishAt: day(1),
      blocks: [textBlock('r1', '<h2>Ek</h2><p>x</p><h2>Do</h2>')],
    })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.toc).toEqual([])
  })

  it('showToc off karne pe khaali aati hai — theme ko kuch tay nahi karna', async () => {
    await Settings.create({ siteId: 'default', blogSettings: { showToc: false } })
    const post = await makePost({
      title: 'Off',
      publishAt: day(1),
      blocks: [textBlock('r1', threeHeadings)],
    })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.toc).toEqual([])
    // Par heading ke id phir bhi lagte hain — wo content ka hissa hain, TOC ka nahi
    expect(entry.blocks[0].props.html).toContain('id="nights-first"')
  })
})

describe('read time', () => {
  it('faqs block ka jawab bhi ginta hai — wo items[] ke andar hai', async () => {
    const words = (n) => Array.from({ length: n }, () => 'shabd').join(' ')

    const withFaq = await makePost({
      title: 'Faq wala',
      slug: 'faq-wala',
      publishAt: day(1),
      blocks: [
        textBlock('r1', `<p>${words(200)}</p>`),
        {
          id: 'f1',
          type: 'faqs',
          props: { items: [{ id: 'q1', question: 'Kya?', answer: `<p>${words(600)}</p>` }] },
        },
      ],
    })

    const entry = (await resolve(withFaq.path)).body.data.entry

    // Pehle sirf top-level string props gine jaate the, to ye 1 min dikhata tha
    expect(entry.readMinutes).toBeGreaterThanOrEqual(4)
  })
})

describe('postList block', () => {
  it('saare published post aate hain, naye pehle', async () => {
    await makePost({ title: 'Purana', publishAt: day(1) })
    await makePost({ title: 'Naya', publishAt: day(3) })

    const block = await resolvedListing()

    expect(block.data.cards.map((c) => c.title)).toEqual(['Naya', 'Purana'])
  })

  it('naya post apne aap aa jaata hai — block edit kiye bina', async () => {
    // Yahi `packageList` se ulta hai (D-87 §8): wahan client ko har item chunna padta hai.
    // Blog pe wo galat hota — "publish karo, turant dikhe" hi uska poora point hai
    await makePost({ title: 'Pehla', publishAt: day(1) })
    const before = await resolvedListing()
    expect(before.data.cards).toHaveLength(1)

    await makePost({ title: 'Doosra', publishAt: day(2) })
    const after = (await resolve('/blog')).body.data.entry.blocks[0]

    expect(after.data.cards).toHaveLength(2)
  })

  it('featured teen neeche wali grid me dobara nahi aate', async () => {
    const a = await makePost({ title: 'Featured', publishAt: day(3) })
    await makePost({ title: 'Aam', publishAt: day(1) })

    const block = await resolvedListing({ featuredIds: [String(a._id)] })

    expect(block.data.featured.map((c) => c.title)).toEqual(['Featured'])
    expect(block.data.cards.map((c) => c.title)).toEqual(['Aam'])
  })

  it('featured ka kram client ka hai — pehla bada card banta hai', async () => {
    const a = await makePost({ title: 'A', slug: 'a', publishAt: day(1) })
    const b = await makePost({ title: 'B', slug: 'b', publishAt: day(3) })

    const block = await resolvedListing({ featuredIds: [String(a._id), String(b._id)] })

    // publishAt ke hisaab se B pehle aata, par client ne A pehle rakha hai
    expect(block.data.featured.map((c) => c.title)).toEqual(['A', 'B'])
  })

  it('trash me pada post na cards me hai, na featured me', async () => {
    const gone = await makePost({ title: 'Trashed', publishAt: day(1), deletedAt: new Date() })
    await makePost({ title: 'Zinda', publishAt: day(2) })

    const block = await resolvedListing({ featuredIds: [String(gone._id)] })

    expect(block.data.cards.map((c) => c.title)).toEqual(['Zinda'])
    expect(block.data.featured).toEqual([])
  })

  it('categoryId list ko ek topic pe seemit karta hai', async () => {
    const ferries = await makeCategory('Ferries')
    const beaches = await makeCategory('Beaches')
    await makePost({ title: 'Ferry', publishAt: day(1), categories: [ferries] })
    await makePost({ title: 'Beach', publishAt: day(2), categories: [beaches] })

    const block = await resolvedListing({ categoryId: ferries })

    expect(block.data.cards.map((c) => c.title)).toEqual(['Ferry'])
  })

  it('bekaar categoryId pe 500 nahi aata — wo bas anadekhi ho jaati hai', async () => {
    await makePost({ title: 'Zinda', publishAt: day(1) })

    const block = await resolvedListing({ categoryId: 'not-an-object-id' })

    expect(block.data.cards).toHaveLength(1)
  })

  it('facets un cards se bunte hain jo dikh rahe hain', async () => {
    const ferries = await makeCategory('Ferries')
    await makePost({ title: 'Ferry ek', publishAt: day(1), categories: [ferries] })
    await makePost({ title: 'Ferry do', publishAt: day(2), categories: [ferries] })
    await makePost({ title: 'Bina category', publishAt: day(3) })

    const block = await resolvedListing()

    expect(block.data.facets).toEqual([expect.objectContaining({ name: 'Ferries', count: 2 })])
  })

  it('card pe date, read time aur category jaate hain — author nahi', async () => {
    const cat = await makeCategory('Planning')
    await makePost({
      title: 'Card',
      publishAt: day(1),
      categories: [cat],
      excerpt: 'Chhota sa parichay',
      blocks: [textBlock('r1', '<p>Kuch likha hua</p>')],
    })

    const [card] = (await resolvedListing()).data.cards

    expect(card.excerpt).toBe('Chhota sa parichay')
    expect(card.category.name).toBe('Planning')
    expect(card.readMinutes).toBe(1)
    expect(card.publishedAt).toBeTruthy()
    // Author har post pe wahi hai — 60 cards pe wahi string dohraana fizool hai
    expect(card).not.toHaveProperty('author')
  })
})

describe('sidebar ke blog widgets', () => {
  async function listingWithSidebar(widgets) {
    const sidebar = await Sidebar.create({ siteId: 'default', name: 'Blog Page', widgets })

    await Entry.create({
      siteId: 'default',
      locale: 'en',
      type: 'blogPage',
      title: 'Guide',
      slug: 'blog',
      path: '/blog',
      status: 'published',
      publishAt: new Date(),
      fields: { sidebar: 'left', sidebarId: String(sidebar._id) },
      content: { version: 1, blocks: [] },
    })

    return (await resolve('/blog')).body.data.entry
  }

  it('postPicks client ke kram me resolve hote hain', async () => {
    const a = await makePost({ title: 'Pehla', slug: 'pehla', publishAt: day(1) })
    const b = await makePost({ title: 'Doosra', slug: 'doosra', publishAt: day(3) })

    const entry = await listingWithSidebar([
      {
        id: 'w1',
        type: 'postPicks',
        props: { heading: 'Most read', postIds: [String(b._id), String(a._id)] },
      },
    ])

    const widget = entry.sidebarWidgets[0]
    expect(widget.props.heading).toBe('Most read')
    expect(widget.props.posts.map((p) => p.title)).toEqual(['Doosra', 'Pehla'])
    // Theme ko id se kuch nahi karna
    expect(widget.props).not.toHaveProperty('postIds')
  })

  it('trash me pada pick chup-chaap gir jaata hai', async () => {
    const gone = await makePost({
      title: 'Gaya',
      slug: 'gaya',
      publishAt: day(1),
      deletedAt: new Date(),
    })
    const alive = await makePost({ title: 'Bacha', slug: 'bacha', publishAt: day(2) })

    const entry = await listingWithSidebar([
      { id: 'w1', type: 'postPicks', props: { postIds: [String(gone._id), String(alive._id)] } },
    ])

    expect(entry.sidebarWidgets[0].props.posts.map((p) => p.title)).toEqual(['Bacha'])
  })

  it('saare picks gir jaayein to widget hi nahi dikhta', async () => {
    const gone = await makePost({ title: 'Gaya', publishAt: day(1), deletedAt: new Date() })

    const entry = await listingWithSidebar([
      { id: 'w1', type: 'postPicks', props: { postIds: [String(gone._id)] } },
    ])

    expect(entry.sidebarWidgets).toEqual([])
  })

  it('topics poore blog ki ginti deta hai — us page ke cards ki nahi', async () => {
    const ferries = await makeCategory('Ferries')
    await makePost({ title: 'Ek', slug: 'ek', publishAt: day(1), categories: [ferries] })
    await makePost({ title: 'Do', slug: 'do', publishAt: day(2), categories: [ferries] })

    const entry = await listingWithSidebar([
      { id: 'w1', type: 'topics', props: { heading: 'Topics' } },
    ])

    expect(entry.sidebarWidgets[0].props.topics).toEqual([
      expect.objectContaining({ name: 'Ferries', count: 2 }),
    ])
  })

  it('ek bhi category na ho to topics widget nahi dikhta', async () => {
    await makePost({ title: 'Bina category', publishAt: day(1) })

    const entry = await listingWithSidebar([{ id: 'w1', type: 'topics', props: {} }])

    expect(entry.sidebarWidgets).toEqual([])
  })
})

describe('post ka sidebar blogSettings se aata hai', () => {
  it('postSidebar none ho to widgets resolve hi nahi hote', async () => {
    const sidebar = await Sidebar.create({
      siteId: 'default',
      name: 'Blog',
      widgets: [{ id: 'w1', type: 'topics', props: {} }],
    })
    await Settings.create({
      siteId: 'default',
      blogSettings: { postSidebar: 'none', postSidebarId: String(sidebar._id) },
    })
    const post = await makePost({ title: 'Post', publishAt: day(1) })

    const entry = (await resolve(post.path)).body.data.entry

    expect(entry.sidebar).toBe('none')
    expect(entry.sidebarWidgets).toEqual([])
  })

  it('left/right pe wahi ek sidebar saare post pe chalti hai', async () => {
    const cat = await makeCategory('Planning')
    const sidebar = await Sidebar.create({
      siteId: 'default',
      name: 'Blog',
      widgets: [{ id: 'w1', type: 'topics', props: {} }],
    })
    await Settings.create({
      siteId: 'default',
      blogSettings: { postSidebar: 'right', postSidebarId: String(sidebar._id) },
    })

    const a = await makePost({ title: 'Ek', slug: 'ek', publishAt: day(1), categories: [cat] })
    const b = await makePost({ title: 'Do', slug: 'do', publishAt: day(2), categories: [cat] })

    for (const post of [a, b]) {
      const entry = (await resolve(post.path)).body.data.entry
      expect(entry.sidebar).toBe('right')
      expect(entry.sidebarWidgets[0].type).toBe('topics')
    }
  })
})

describe('admin list ke filter — category aur All dates', () => {
  it('month filter mahine ke pehle aur aakhri instant dono pakadta hai', async () => {
    // ⚠️ Yahi wo jagah hai jo chup-chaap toot-ti hai. `publishAt` UTC me store hoti hai;
    // mahina local time me kaatne se boundary wale post kabhi idhar kabhi udhar chale jaate,
    // aur wo galti sirf mahine me do din dikhti hai (D-41 wala hi jaal).
    await makePost({ title: 'Pehla instant', slug: 'p1', publishAt: '2026-08-01T00:00:00.000Z' })
    await makePost({ title: 'Aakhri instant', slug: 'p2', publishAt: '2026-08-31T23:59:59.999Z' })
    await makePost({ title: 'Ek second baad', slug: 'p3', publishAt: '2026-09-01T00:00:00.000Z' })
    await makePost({ title: 'Ek second pehle', slug: 'p4', publishAt: '2026-07-31T23:59:59.999Z' })

    const res = await listEntries({ type: 'post', month: '2026-08', limit: 50 })

    expect(res.entries.map((e) => e.title).sort()).toEqual(['Aakhri instant', 'Pehla instant'])
  })

  it('months ki list naye se purane, aur trash wale usme nahi', async () => {
    await makePost({ title: 'Naya', slug: 'n', publishAt: day(3) })
    await makePost({ title: 'Purana', slug: 'p', publishAt: day(1) })
    await makePost({ title: 'Trashed', slug: 't', publishAt: day(2), deletedAt: new Date() })

    const counts = await entryCounts('post')

    // Trash list me dikhta hi nahi, to uska mahina dropdown me aana ek jhootha option hota
    expect(counts.months).toEqual(['2026-03', '2026-01'])
  })

  it('category aur month ek saath lagte hain', async () => {
    const ferries = await makeCategory('Ferries')
    const beaches = await makeCategory('Beaches')

    await makePost({ title: 'Sahi', slug: 'a', publishAt: day(1), categories: [ferries] })
    await makePost({ title: 'Galat mahina', slug: 'b', publishAt: day(2), categories: [ferries] })
    await makePost({ title: 'Galat category', slug: 'c', publishAt: day(1), categories: [beaches] })

    const res = await listEntries({
      type: 'post',
      categories: ferries,
      month: '2026-01',
      limit: 50,
    })

    expect(res.entries.map((e) => e.title)).toEqual(['Sahi'])
  })

  it('bina publishAt wala draft na month filter me aata hai, na months ki list me', async () => {
    await makePost({ title: 'Draft', slug: 'd', status: 'draft', publishAt: null })
    await makePost({ title: 'Live', slug: 'l', publishAt: day(1) })

    const counts = await entryCounts('post')
    const res = await listEntries({ type: 'post', month: '2026-01', limit: 50 })

    expect(counts.months).toEqual(['2026-01'])
    expect(res.entries.map((e) => e.title)).toEqual(['Live'])
  })
})

describe('post ke URL ki shakl — Blog settings ka switch (#10)', () => {
  /** Ek listing page jiske `postList` block ho — prefix isi ke slug se aata hai. */
  const makeListing = (slug = 'blog') =>
    Entry.create({
      siteId: 'default',
      locale: 'en',
      type: 'blogPage',
      title: 'Andaman travel guide',
      slug,
      path: `/${slug}`,
      status: 'published',
      publishAt: new Date(),
      content: { version: 1, blocks: [{ id: 'pl1', type: 'postList', props: {} }] },
    })

  const pathOf = async (slug) =>
    (await Entry.findOne({ type: 'post', slug }).select('path').lean())?.path

  it('root mode har post ka path root pe le aata hai, 301 ke saath', async () => {
    await makeListing()
    await makePost({ title: 'Ferry guide', slug: 'ferry-guide', publishAt: day(1) })

    expect(await pathOf('ferry-guide')).toBe('/blog/ferry-guide')

    await updateSettings({ blogSettings: { postUrlMode: 'root' } })

    expect(await pathOf('ferry-guide')).toBe('/ferry-guide')

    // ⚠️ Bina iske client ke share kiye hue aur Google me index ho chuke saare blog link
    // chup-chaap mar jaate — aur wo failure kahin dikhti bhi nahi
    const r = await Redirect.findOne({ from: '/blog/ferry-guide' }).lean()
    expect(r).toMatchObject({ to: '/ferry-guide', statusCode: 301 })
  })

  it('wapas nested karne pe path lautta hai aur koi loop nahi banta', async () => {
    await makeListing()
    await makePost({ title: 'Ferry guide', slug: 'ferry-guide', publishAt: day(1) })

    await updateSettings({ blogSettings: { postUrlMode: 'root' } })
    await updateSettings({ blogSettings: { postUrlMode: 'nested' } })

    expect(await pathOf('ferry-guide')).toBe('/blog/ferry-guide')

    // `/blog/ferry-guide → /ferry-guide` aur uska ulta — dono ek saath hote to loop banta
    const all = await Redirect.find({}).lean()
    const byFrom = new Map(all.map((r) => [r.from, r.to]))
    expect(all.filter((r) => byFrom.has(r.to))).toEqual([])
  })

  it('prefix listing page ke slug se aata hai, hardcoded /blog nahi', async () => {
    // Admin ka dropdown "Under the blog page" kehta hai — agar prefix us page se na aaye
    // to wo label ek din jhooth bolne lagta
    await makeListing('guides')
    await makePost({ title: 'Ferry guide', slug: 'ferry-guide', publishAt: day(1) })

    await updateSettings({ blogSettings: { postUrlMode: 'root' } })
    await updateSettings({ blogSettings: { postUrlMode: 'nested' } })

    expect(await pathOf('ferry-guide')).toBe('/guides/ferry-guide')
  })

  it('listing page ka slug badle to post uske saath chalte hain', async () => {
    const listing = await makeListing()
    await makePost({ title: 'Ferry guide', slug: 'ferry-guide', publishAt: day(1) })

    /**
     * ⚠️ Yahan koi asli user nahi banaya — `assertCan()` sabse pehle `permissions` dekhta hai
     * aur broad permission milte hi lauta deta hai. User sirf `.own` waale raaste pe chahiye
     * hota, jo yahan chalta hi nahi. Is file ka poora point login se bachna hai.
     */
    const actor = { permissions: ['entry.update'] }
    await updateEntry(listing._id, { version: listing.version, slug: 'guides' }, actor)

    // ⚠️ Sirf path-prefix cascade kaafi nahi hota — `urlPattern` bhi badalna chahiye, warna
    // agle save pe path wapas purane pattern pe chala jaata
    expect(await pathOf('ferry-guide')).toBe('/guides/ferry-guide')

    const ct = await ContentType.findOne({ key: 'post' }).lean()
    expect(ct.urlPattern).toBe('/guides/{slug}')
  })

  it('trash ke post bhi saath chalte hain — restore pe purana pattern na rah jaaye', async () => {
    await makeListing()
    await makePost({
      title: 'Trashed',
      slug: 'trashed',
      publishAt: day(1),
      deletedAt: new Date(),
    })

    await updateSettings({ blogSettings: { postUrlMode: 'root' } })

    expect(await pathOf('trashed')).toBe('/trashed')
  })

  it('switch pe listing page ka cache bhi saaf hota hai — sirf post ke apne path nahi', async () => {
    /**
     * ⚠️ **A-21 ki jaanch me pakda (11 Sep, production build pe).** Switch ke baad `/blog` ke
     * card **ek ghante tak** (`CACHE_SECONDS`) purane URL pe link karte the. `syncPostUrlPattern()`
     * har moved post ke dono path bhejta tha, par listing ka `path:/blog` nahi — aur `type:post`
     * ko web me koi padhta hi nahi.
     *
     * Wahi galti jo 9 Sep ko `invalidate()` me theek hui thi (`blogListingTags()`); us fix se
     * ye doosra raasta chhoot gaya tha. Aaj tak koi test ye dekhta hi nahi tha ki **kaunse tags**
     * gaye, isliye ye chup raha.
     */
    await makeListing()
    await makePost({ title: 'Ferry guide', slug: 'ferry-guide', publishAt: day(1) })
    await Settings.updateOne(
      { siteId: 'default' },
      { $set: { 'blogSettings.postUrlMode': 'root' } },
      { upsert: true },
    )

    const { syncPostUrlPattern } = await import('../modules/entries/service.js')
    const result = await syncPostUrlPattern('default')

    expect(result.moved).toBe(1)
    expect(result.tags).toContain('path:/blog')
    expect(result.tags).toEqual(
      expect.arrayContaining(['path:/blog/ferry-guide', 'path:/ferry-guide']),
    )
  })
})

describe('blogSettings ka partial patch baaki field nahi udaata', () => {
  it('sirf postUrlMode bhejne se author aur sidebar bache rehte hain', async () => {
    // ⚠️ Ye test ek asli data loss ke baad likha gaya (10 Sep): `$set['blogSettings'] = value`
    // poore object ko badal deta tha, aur ek script se ek field patch karte hi client ka
    // author text uud gaya. Admin ka form hamesha poora object bhejta hai, isliye wahan ye
    // kabhi nahi dikha — yaani ek aisa bug jise sirf ye test pakadta hai.
    await updateSettings({
      blogSettings: {
        author: { name: 'Andaman Tourism team', role: 'Planners', bio: 'Hum log.' },
        postSidebar: 'right',
        postSidebarId: 'abc',
        showToc: false,
      },
    })

    await updateSettings({ blogSettings: { postUrlMode: 'root' } })

    const saved = (await Settings.findOne({ siteId: 'default' }).lean()).blogSettings

    expect(saved.author.name).toBe('Andaman Tourism team')
    expect(saved.postSidebar).toBe('right')
    expect(saved.postSidebarId).toBe('abc')
    expect(saved.showToc).toBe(false)
    expect(saved.postUrlMode).toBe('root')
  })

  it('social pe bhi wahi — wo is jaal ka pehla instance tha', async () => {
    await updateSettings({
      social: { facebook: 'https://fb.com/x', instagram: 'https://ig.com/y' },
    })
    await updateSettings({ social: { facebook: 'https://fb.com/z' } })

    const saved = (await Settings.findOne({ siteId: 'default' }).lean()).social

    expect(saved.facebook).toBe('https://fb.com/z')
    expect(saved.instagram).toBe('https://ig.com/y')
  })
})
