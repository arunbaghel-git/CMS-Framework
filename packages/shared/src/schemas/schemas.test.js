import { describe, expect, it } from 'vitest'

import {
  applyTitleTemplate,
  blockSchema,
  contentFromRichText,
  contentSchema,
  emptyContent,
  entryCreateSchema,
  entryListQuerySchema,
  entrySchema,
  entryUpdateSchema,
  extractBlockText,
  findDuplicateBlockIds,
  heroFormPropsSchema,
  videoEmbedUrl,
  BLOG_PAGE_BLOCK_TYPES,
  PAGE_BLOCK_PROP_SCHEMAS,
  PAGE_BLOCK_TYPES,
  POST_BLOCK_TYPES,
  POST_LIST_PER_PAGE_DEFAULT,
  parseBlockProps,
  settingsSchema,
  sidebarWidgetSchema,
  isPubliclyVisible,
  pathSchema,
  seoSchema,
  slugSchema,
} from './index.js'
import {
  ENTRY_STATUSES,
  ROLE_LABEL,
  ROLE_PERMISSIONS,
  ROLES,
  THEME_COLORS,
} from '../constants/index.js'
import {
  awardBadgesPropsSchema,
  GALLERY_MAX,
  HOME_PAGE_BLOCK_TYPES,
  PAGE_DEFAULT_BLOCK_TYPES,
  SECTION_PAGE_BLOCK_TYPES,
  textVideoPropsSchema,
} from './page.js'
import { fieldTypesFor, isFieldTypeAllowed, isResponsive } from '../field-types.js'
/** ⚠️ `toc.js` top-level index me hai, `schemas/index.js` me nahi — cycle se bachne ke liye. */
import { withHeadingIds } from '../toc.js'

/** Ek valid entry — baaki tests isko base ki tarah use karte hain. */
const validEntry = () => ({
  type: 'page',
  title: 'About Us',
  slug: 'about',
  path: '/about',
})

describe('blockSchema', () => {
  it('nested tree validate karta hai', () => {
    const tree = {
      id: 'b1',
      type: 'section',
      props: { background: '#0f172a' },
      style: { desktop: { paddingY: 80 }, mobile: { paddingY: 40 } },
      children: [
        {
          id: 'b2',
          type: 'container',
          props: { maxWidth: 1200 },
          children: [{ id: 'b3', type: 'heading', props: { text: 'Hello', level: 1 } }],
        },
      ],
    }

    expect(() => blockSchema.parse(tree)).not.toThrow()
  })

  it('block type camelCase enforce karta hai', () => {
    expect(() => blockSchema.parse({ id: 'b1', type: 'Rich-Text', props: {} })).toThrow()
    expect(() => blockSchema.parse({ id: 'b1', type: 'richText', props: {} })).not.toThrow()
  })

  it('unknown style keys ko girata nahi — Phase 5 naye controls add kar sake', () => {
    const parsed = blockSchema.parse({
      id: 'b1',
      type: 'section',
      props: {},
      style: { desktop: { paddingY: 40, futureControl: 'xyz' } },
    })

    expect(parsed.style.desktop.futureControl).toBe('xyz')
  })

  it('galat style value reject karta hai', () => {
    expect(() =>
      blockSchema.parse({
        id: 'b1',
        type: 'section',
        props: {},
        style: { desktop: { columns: 99 } },
      }),
    ).toThrow()
  })
})

describe('extractBlockText', () => {
  it('nested tree ka saara text nikaalta hai — searchText ke liye', () => {
    const text = extractBlockText([
      {
        id: 'b1',
        type: 'section',
        props: {},
        children: [
          { id: 'b2', type: 'heading', props: { text: 'Dental care' } },
          { id: 'b3', type: 'text', props: { body: 'Same-day appointments', level: 2 } },
        ],
      },
    ])

    expect(text).toContain('Dental care')
    expect(text).toContain('Same-day appointments')
  })
})

describe('contentSchema', () => {
  it('khaali content default deta hai', () => {
    expect(emptyContent()).toEqual({ version: 1, blocks: [] })
  })

  it('rich text ko richText block me wrap karta hai — Phase 5 me migration na likhni pade', () => {
    const content = contentFromRichText({ type: 'doc', content: [] })

    expect(content.blocks).toHaveLength(1)
    expect(content.blocks[0].type).toBe('richText')
    expect(() => contentSchema.parse(content)).not.toThrow()
  })

  it('duplicate block ids pakadta hai', () => {
    const content = {
      version: 1,
      blocks: [
        {
          id: 'b1',
          type: 'section',
          props: {},
          children: [{ id: 'b1', type: 'heading', props: {} }],
        },
      ],
    }

    expect(findDuplicateBlockIds(content)).toEqual(['b1'])
    expect(findDuplicateBlockIds(emptyContent())).toEqual([])
  })
})

describe('slug aur path', () => {
  it('reserved slugs reject karta hai', () => {
    for (const reserved of ['admin', 'api', 'media']) {
      expect(() => slugSchema.parse(reserved)).toThrow()
    }
  })

  it('uppercase aur space reject karta hai', () => {
    expect(() => slugSchema.parse('About Us')).toThrow()
    expect(() => slugSchema.parse('About')).toThrow()
    expect(() => slugSchema.parse('about-us')).not.toThrow()
  })

  it('nested path accept karta hai', () => {
    expect(() => pathSchema.parse('/about/team')).not.toThrow()
    expect(() => pathSchema.parse('/')).not.toThrow()
  })

  it('trailing slash aur uppercase path reject karta hai', () => {
    expect(() => pathSchema.parse('/about/')).toThrow()
    expect(() => pathSchema.parse('/About')).toThrow()
    expect(() => pathSchema.parse('about')).toThrow()
  })
})

describe('entrySchema', () => {
  it('defaults bharta hai', () => {
    const entry = entrySchema.parse(validEntry())

    expect(entry.siteId).toBe('default')
    expect(entry.locale).toBe('en')
    expect(entry.status).toBe('draft')
    expect(entry.version).toBe(0)
    expect(entry.deletedAt).toBeNull()
    expect(entry.content).toEqual({ version: 1, blocks: [] })
    /**
     * A-7 / D-49 — `taxonomies` ab har type ki apni key rakhta hai, sirf categories/tags
     * nahi. Packages ko Destinations aur Package Type chahiye the, aur unhe `fields` me
     * daalne ka matlab hota ki cache tag, archive aur delete guard sirf aadhe types pe
     * kaam karte.
     */
    expect(entry.taxonomies).toEqual({
      categories: [],
      tags: [],
      destinations: [],
      packageTypes: [],
    })
  })

  it('taxonomies me anjaan key chup-chaap nahi girti (D-43 §3 ka trap)', () => {
    // Zod default me anjaan keys HATA deta hai. `.strict()` ke bina galat key
    // (singular `destination`) bina error ke gayab ho jaati: admin Save karta,
    // "ho gaya" dikhta, aur uska chuna hua destination kahin nahi hota
    expect(() =>
      entrySchema.parse({ ...validEntry(), taxonomies: { destination: ['abc'] } }),
    ).toThrow()

    expect(
      entrySchema.parse({ ...validEntry(), taxonomies: { destinations: ['abc'] } }).taxonomies
        .destinations,
    ).toEqual(['abc'])
  })

  it('`trash` ko status nahi maanta — wo deletedAt hai (D-25)', () => {
    expect(ENTRY_STATUSES).not.toContain('trash')
    expect(() => entrySchema.parse({ ...validEntry(), status: 'trash' })).toThrow()
  })

  it('update pe version zaroori hai — warna silent lost update', () => {
    expect(() => entryUpdateSchema.parse({ title: 'Naya title' })).toThrow()
    expect(() => entryUpdateSchema.parse({ title: 'Naya title', version: 3 })).not.toThrow()
  })

  it('create pe path nahi maangta — server resolvePath() se likhta hai', () => {
    const parsed = entryCreateSchema.parse({ type: 'page', title: 'Contact' })
    expect(parsed).not.toHaveProperty('path')
  })
})

describe('entryListQuerySchema — month (All dates)', () => {
  /**
   * ⚠️ 10–14 Sep regex `^d{4}` tha (backslash gayab) — har asli mahina 400 khaata tha, aur
   * Posts/Pages ka `All dates` ek bhi baar chala nahi. `blog.test.js` `listEntries()` ko seedha
   * bulata hai, is schema se guzre bina, isliye wo pass tha. Ye test schema ko hi pakadta hai.
   */
  it('asli mahina maanta hai', () => {
    expect(entryListQuerySchema.parse({ month: '2026-09' }).month).toBe('2026-09')
    expect(entryListQuerySchema.parse({ month: '2026-12' }).month).toBe('2026-12')
  })

  it('galat shakl mana karta hai', () => {
    for (const bad of ['dddd-09', '2026-13', '2026-9', 'september', '2026-09-01']) {
      expect(entryListQuerySchema.safeParse({ month: bad }).success).toBe(false)
    }
  })
})

describe('entryListQuerySchema', () => {
  it('query params coerce karta hai aur limit cap karta hai', () => {
    const q = entryListQuerySchema.parse({ page: '2', limit: '50', trashed: 'true' })

    expect(q.page).toBe(2)
    expect(q.limit).toBe(50)
    expect(q.trashed).toBe(true)
    expect(q.sort).toBe('updatedAt')
  })

  it('injection-shaped params reject karta hai (R9)', () => {
    expect(() => entryListQuerySchema.parse({ status: { $ne: null } })).toThrow()
    expect(() => entryListQuerySchema.parse({ limit: '9999' })).toThrow()
  })
})

describe('isPubliclyVisible', () => {
  const now = new Date('2026-08-19T12:00:00Z')

  it('published dikhta hai, draft nahi', () => {
    expect(isPubliclyVisible({ status: 'published' }, now)).toBe(true)
    expect(isPubliclyVisible({ status: 'draft' }, now)).toBe(false)
    expect(isPubliclyVisible({ status: 'pending' }, now)).toBe(false)
  })

  it('beeta hua scheduled published maana jaata hai — self-healing (R2)', () => {
    expect(
      isPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-19T11:00:00Z') }, now),
    ).toBe(true)
    expect(
      isPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-20T11:00:00Z') }, now),
    ).toBe(false)
  })

  it('trashed entry kabhi nahi dikhti, chahe published ho', () => {
    expect(isPubliclyVisible({ status: 'published', deletedAt: now }, now)).toBe(false)
  })
})

describe('seo', () => {
  it('safe defaults deta hai', () => {
    const seo = seoSchema.parse({})

    expect(seo.noindex).toBe(false)
    expect(seo.schemaType).toBe('WebPage')
    expect(seo.twitterCard).toBe('summary_large_image')
  })

  it('title template resolve karta hai', () => {
    expect(applyTitleTemplate('%title% | %sitename%', { title: 'About', sitename: 'Acme' })).toBe(
      'About | Acme',
    )
  })

  it('khaali variable pe latakta hua separator saaf karta hai', () => {
    expect(applyTitleTemplate('%title% | %sitename%', { title: 'About' })).toBe('About')
  })
})

describe('permissions', () => {
  it('paanch roles hain — subscriber nahi (D-26), salesAgent hai (D-29)', () => {
    expect(ROLES).toEqual(['admin', 'editor', 'author', 'contributor', 'salesAgent'])
    expect(ROLES).not.toContain('subscriber')
  })

  /**
   * Har role ka label hona **zaroori** hai — bina label ke UI role ki **key** dikhane
   * lagti hai, aur wo R4 ka seedha ulta hai (UI me internal naam kabhi nahi).
   */
  it('har role ka ek label hai', () => {
    for (const key of ROLES) {
      expect(ROLE_LABEL[key], `${key} ka label missing hai`).toBeTruthy()
    }
  })

  /**
   * Ye assertion ek asli bug se aayi hai: seed DB me "Administrator" likhta tha, par
   * Profile screen key se label bana kar "Admin" dikha rahi thi. Ab dono isi map se
   * aate hain.
   */
  it('admin ka label "Administrator" hai, "Admin" nahi', () => {
    expect(ROLE_LABEL.admin).toBe('Administrator')
    expect(ROLE_LABEL.salesAgent).toBe('Sales Agent')
  })

  it('salesAgent content edit nahi kar sakta — sirf padh sakta hai (D-29)', () => {
    expect(ROLE_PERMISSIONS.salesAgent).toContain('entry.read')
    expect(ROLE_PERMISSIONS.salesAgent).not.toContain('entry.create')
    expect(ROLE_PERMISSIONS.salesAgent).not.toContain('entry.update')
    expect(ROLE_PERMISSIONS.salesAgent).not.toContain('entry.publish')
  })

  it('purge sirf admin ko hai', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('entry.purge')
    expect(ROLE_PERMISSIONS.editor).not.toContain('entry.purge')
    expect(ROLE_PERMISSIONS.editor).not.toContain('media.purge')
  })

  it('scripts inject karna sirf admin ka hai — privilege boundary', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('settings.scripts.update')
    expect(ROLE_PERMISSIONS.editor).not.toContain('settings.scripts.update')
  })

  it('contributor likh sakta hai par publish nahi', () => {
    expect(ROLE_PERMISSIONS.contributor).toContain('entry.submitReview')
    expect(ROLE_PERMISSIONS.contributor).not.toContain('entry.publish')
    expect(ROLE_PERMISSIONS.contributor).not.toContain('entry.publish.own')
  })

  it('author apna content publish kar sakta hai, dusron ka nahi', () => {
    expect(ROLE_PERMISSIONS.author).toContain('entry.publish.own')
    expect(ROLE_PERMISSIONS.author).not.toContain('entry.publish')
  })
})

describe('field DSL (D-24)', () => {
  it('ek hi registry dono contexts ko serve karta hai', () => {
    expect(isFieldTypeAllowed('text', 'content')).toBe(true)
    expect(isFieldTypeAllowed('text', 'block')).toBe(true)
  })

  it('context-specific types alag rehte hain', () => {
    expect(isFieldTypeAllowed('richText', 'block')).toBe(false)
    expect(isFieldTypeAllowed('spacing', 'content')).toBe(false)
  })

  it('har context apni list deta hai', () => {
    expect(fieldTypesFor('content')).toContain('repeater')
    expect(fieldTypesFor('content')).not.toContain('spacing')
    expect(fieldTypesFor('block')).toContain('spacing')
  })

  it('responsive sirf block context me matlab rakhta hai', () => {
    expect(isResponsive({ type: 'spacing' }, 'block')).toBe(true)
    expect(isResponsive({ type: 'spacing' }, 'content')).toBe(false)
  })
})

describe('blog ka schema (spec 008)', () => {
  it('postList apne defaults bharta hai — khaali block bhi poora hota hai', () => {
    const props = parseBlockProps('postList', {})

    expect(props.perPage).toBe(POST_LIST_PER_PAGE_DEFAULT)
    expect(props.showFilter).toBe(true)
    expect(props.featuredIds).toEqual([])
    // Khaali matlab "saare post", kisi ek topic pe seemit nahi
    expect(props.categoryId).toBeNull()
  })

  it('featured teen se zyada nahi ho sakte — Start here ka layout hi teen ka hai', () => {
    expect(() => parseBlockProps('postList', { featuredIds: ['a', 'b', 'c', 'd'] })).toThrow()
  })

  it('postList PAGE_BLOCK_PROP_SCHEMAS me hai — warna props chhoot jaate, gir nahi jaate', () => {
    // Us naksha me naam na hone ka matlab "koi validation nahi" hota hai, "block nahi ban
    // sakta" nahi — isliye iska apna test
    expect(PAGE_BLOCK_PROP_SCHEMAS.postList).toBeDefined()
    expect(PAGE_BLOCK_TYPES).toContain('postList')
  })

  it('post ke dropdown me sirf Text aur FAQs hain', () => {
    expect(POST_BLOCK_TYPES).toEqual(['richText', 'faqs'])
    // packageList ek blog post pe bemaani hai
    expect(BLOG_PAGE_BLOCK_TYPES).not.toContain('packageList')
    expect(BLOG_PAGE_BLOCK_TYPES).toContain('postList')
  })

  it('blogSettings khaali settings me se bhi poora nikalta hai', () => {
    const parsed = settingsSchema.parse({})

    expect(parsed.blogSettings.showToc).toBe(true)
    expect(parsed.blogSettings.author.name).toBe('')
    // Sidebar `none` default hai — naya page bina maange khaali sidebar le kar na aaye (D-30)
    expect(parsed.blogSettings.postSidebar).toBe('none')
  })

  it('topics aur postPicks widget ban jaate hain', () => {
    const topics = sidebarWidgetSchema.parse({ type: 'topics', props: {} })
    expect(topics.props.heading).toBe('')

    const picks = sidebarWidgetSchema.parse({
      type: 'postPicks',
      props: { heading: 'Most read', postIds: ['a', 'b'] },
    })
    // "Most read" sirf ek heading hai — ginti se kuch nahi banta (koi view counting nahi)
    expect(picks.props.heading).toBe('Most read')
    expect(picks.props.postIds).toEqual(['a', 'b'])
  })

  it('postPicks paanch se zyada nahi le sakta', () => {
    expect(() =>
      sidebarWidgetSchema.parse({
        type: 'postPicks',
        props: { postIds: ['a', 'b', 'c', 'd', 'e', 'f'] },
      }),
    ).toThrow()
  })
})

describe('extractBlockText nested props bhi padhta hai (spec 008)', () => {
  it('faqs ka jawab ginti me aata hai — wo items[] ke andar hai', () => {
    const text = extractBlockText([
      { id: 'r1', type: 'richText', props: { html: '<p>upar wali line</p>' } },
      {
        id: 'f1',
        type: 'faqs',
        props: {
          heading: 'Questions',
          items: [{ id: 'q1', question: 'Kitne din?', answer: '<p>Paanch raat</p>' }],
        },
      },
    ])

    // Pehle sirf top-level string props padhe jaate the, isliye ye do chhoot jaate the —
    // yaani searchText adhoora aur read time jhootha
    expect(text).toContain('Kitne din?')
    expect(text).toContain('<p>Paanch raat</p>')
    expect(text).toContain('upar wali line')
  })

  it('cards ke items ka text bhi aata hai', () => {
    const text = extractBlockText([
      { id: 'c1', type: 'cards', props: { items: [{ title: 'Ferry', text: 'Do ghante' }] } },
    ])

    expect(text).toContain('Ferry')
    expect(text).toContain('Do ghante')
  })
})

describe('withHeadingIds — On this post (spec 008)', () => {
  it('har h2 ko id deta hai aur wahi id toc me bhejta hai', () => {
    const { html, toc } = withHeadingIds(
      '<p>lead</p><h2>Lock the ferries</h2><p>x</p><h2>Book hotels</h2>',
    )

    expect(toc).toEqual([
      { id: 'lock-the-ferries', text: 'Lock the ferries' },
      { id: 'book-hotels', text: 'Book hotels' },
    ])
    // Link aur heading ka id ek hi pass se aate hain — do jagah slug banane pe wo ek din
    // alag ho jaate aur har link kahin na le jaata
    expect(html).toContain('<h2 id="lock-the-ferries">Lock the ferries</h2>')
    expect(html).toContain('<h2 id="book-hotels">Book hotels</h2>')
  })

  it('client ne khud id likhi ho to wahi chalti hai', () => {
    const { html, toc } = withHeadingIds('<h2 id="mera-anchor">Kuch bhi</h2>')

    expect(toc[0].id).toBe('mera-anchor')
    // Purane anchor tab bhi kaam karte rahein jab heading ka text badle
    expect(html).toBe('<h2 id="mera-anchor">Kuch bhi</h2>')
  })

  it('ek jaisi heading do baar ho to id takraati nahi', () => {
    const { toc } = withHeadingIds('<h2>Cost</h2><h2>Cost</h2>')

    expect(toc.map((t) => t.id)).toEqual(['cost', 'cost-2'])
  })

  it('heading ke andar ka markup id me nahi ghusta', () => {
    const { toc } = withHeadingIds('<h2>Step 1 — <em>nights</em> first</h2>')

    expect(toc[0].text).toBe('Step 1 — nights first')
    expect(toc[0].id).toBe('step-1-nights-first')
  })

  it('khaali heading toc me nahi jaati — us link pe kuch likha hi nahi hota', () => {
    const { toc } = withHeadingIds('<h2></h2><h2>Asli</h2>')

    expect(toc).toEqual([{ id: 'asli', text: 'Asli' }])
  })

  it('h3 ko chhoota nahi — TOC sirf h2 ki hai', () => {
    const { html, toc } = withHeadingIds('<h3>Chhota</h3>')

    expect(toc).toEqual([])
    expect(html).toBe('<h3>Chhota</h3>')
  })
})

describe('heroFormPropsSchema — home ka hero (D-96)', () => {
  it('khaali props pe saare default', () => {
    expect(heroFormPropsSchema.parse({})).toMatchObject({
      background: '',
      imageId: null,
      mobileImageId: null,
      stats: [],
      ribbon: '',
      formId: '',
    })
  })

  it('background sirf `#rrggbb`, lowercase me', () => {
    expect(heroFormPropsSchema.parse({ background: '#0B2B4A' }).background).toBe('#0b2b4a')
    for (const bad of ['red', '#fff', '#0b2b4a; color: red', 'url(x)']) {
      expect(() => heroFormPropsSchema.parse({ background: bad })).toThrow()
    }
  })

  it('chaar se zyada stats nahi', () => {
    const stat = { value: '1', label: 'x' }
    expect(() => heroFormPropsSchema.parse({ stats: Array(5).fill(stat) })).toThrow()
  })
})

describe('videoEmbedUrl — video review ka popup (D-96 §13)', () => {
  it('YouTube ke saare roop aur Vimeo', () => {
    const yt = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0'
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    ]) {
      expect(videoEmbedUrl(url)).toBe(yt)
    }
    expect(videoEmbedUrl('https://vimeo.com/76979871')).toBe(
      'https://player.vimeo.com/video/76979871?autoplay=1',
    )
  })

  it('baaki sab null — naye tab me khulega', () => {
    for (const url of [
      'https://www.instagram.com/reel/abc/',
      'http://youtu.be/dQw4w9WgXcQ',
      'javascript:alert(1)',
      'not a url',
      '',
    ]) {
      expect(videoEmbedUrl(url)).toBeNull()
    }
  })
})

describe('THEME_COLORS — admin ka Default rang site ke :root se milta hai (D-96 §18)', () => {
  it('har rang globals.css ke token ke barabar', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync(
      new URL('../../../../apps/web/app/globals.css', import.meta.url),
      'utf8',
    )
    const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
    const token = (name) =>
      root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase()

    expect(THEME_COLORS.blue50).toBe(token('blue-50'))
    expect(THEME_COLORS.blue100).toBe(token('blue-100'))
    expect(THEME_COLORS.blue500).toBe(token('blue-500'))
    expect(THEME_COLORS.blue600).toBe(token('blue-600'))
    expect(THEME_COLORS.blue900).toBe(token('blue-900'))
    expect(THEME_COLORS.gold).toBe(token('gold'))
  })
})

describe('Text with video + Award badges (D-96 §22–§23)', () => {
  it('video link khaali ya https — kuch aur nahi', () => {
    expect(textVideoPropsSchema.parse({}).videoUrl).toBe('')
    expect(textVideoPropsSchema.parse({ videoUrl: 'https://vimeo.com/1' }).videoUrl).toBe(
      'https://vimeo.com/1',
    )
    expect(() => textVideoPropsSchema.parse({ videoUrl: 'javascript:alert(1)' })).toThrow()
    expect(textVideoPropsSchema.parse({}).imageSide).toBe('right')
  })

  it('badge ka rang sirf hex, khaali = theme ka sunehra', () => {
    expect(awardBadgesPropsSchema.parse({}).badgeColor).toBe('')
    expect(() => awardBadgesPropsSchema.parse({ badgeColor: 'red;x' })).toThrow()
  })
})

describe('Gallery block — sirf Pages pe (client, 23 Sep, D-111)', () => {
  it('dono Page template ke dropdown me hai, aur kahin nahi', () => {
    expect(PAGE_DEFAULT_BLOCK_TYPES).toContain('gallery')
    expect(SECTION_PAGE_BLOCK_TYPES).toContain('gallery')
    expect(POST_BLOCK_TYPES).not.toContain('gallery')
    expect(BLOG_PAGE_BLOCK_TYPES).not.toContain('gallery')
    expect(HOME_PAGE_BLOCK_TYPES).not.toContain('gallery')
    expect(PAGE_BLOCK_TYPES).not.toContain('gallery')
    expect(PAGE_BLOCK_PROP_SCHEMAS.gallery).toBeDefined()
  })

  it('default — desktop 4, mobile 2 (reference ka `.gal4`), heading khaali', () => {
    expect(parseBlockProps('gallery', {})).toEqual({
      heading: '',
      columns: 4,
      mobileColumns: 2,
      imageIds: [],
    })
  })

  it('desktop 2–6 aur mobile 1–3 ke bahar ki value nahi chalti', () => {
    expect(() => parseBlockProps('gallery', { columns: 1 })).toThrow()
    expect(() => parseBlockProps('gallery', { columns: 7 })).toThrow()
    expect(() => parseBlockProps('gallery', { mobileColumns: 0 })).toThrow()
    expect(() => parseBlockProps('gallery', { mobileColumns: 4 })).toThrow()
    expect(parseBlockProps('gallery', { columns: '6', mobileColumns: '1' })).toMatchObject({
      columns: 6,
      mobileColumns: 1,
    })
  })

  it('ek image do baar — ek hi bachti hai, kram pehli baar wala', () => {
    expect(parseBlockProps('gallery', { imageIds: ['a', 'b', 'a', 'c'] }).imageIds).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it(`${GALLERY_MAX} se zyada images nahi`, () => {
    const ids = Array.from({ length: GALLERY_MAX + 1 }, (_, i) => `m${i}`)
    expect(() => parseBlockProps('gallery', { imageIds: ids })).toThrow()
  })
})
