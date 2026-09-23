import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { blockSchema, entryCreateSchema, parseBlockProps, parsePostDoc } from '@cms/shared'
import { describe, expect, it } from 'vitest'

import { toPostEntryInput } from './post-mapper.js'

/**
 * ⚠️ **Mapper ka output asli Zod schemas se guzaara jaata hai** — yahi is test ka poora point.
 *
 * Package ke mapper pe wahi tareeka tha, aur usi ne ek asli bug pakda tha: `₹` ka entity
 * decode na hone se `₹24,999` ka `837724999` ban jaata tha, jo `pricingSchema` ki hadd paar
 * kar ke **poore package** ko gira deta. Sirf output ki shakl dekhne wala test us bug ko
 * kabhi na pakadta.
 *
 * Yahan bhi wahi khatra hai: `title` 300, `excerpt` 1000, FAQ ka sawaal 300.
 * Inme se ek bhi paar ho to Zod poore post ko gira deta hai.
 */
const TEMPLATE = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../../packages/shared/src/import/__fixtures__/post-template.html',
      import.meta.url,
    ),
  ),
  'utf8',
)

/** Asli DB ke naam — 10 Sep ko `taxonomies` se padhe gaye. */
const CATEGORIES = new Map([
  ['trip planning', [{ id: 'cat-trip', name: 'Trip planning' }]],
  ['ferries & transport', [{ id: 'cat-ferry', name: 'Ferries & transport' }]],
])

const REFS = { categories: CATEGORIES }

const run = (html, refs = REFS) => toPostEntryInput(parsePostDoc(html), refs)

const blockers = (issues) => issues.filter((i) => i.level === 'blocker')

describe('toPostEntryInput — asli doc', () => {
  const { input, issues, slug, bannerUrl } = run(TEMPLATE)

  it('payload asli entryCreateSchema se guzar jaata hai', () => {
    expect(() => entryCreateSchema.parse(input)).not.toThrow()
  })

  it('har block apne props schema se guzar jaata hai', () => {
    for (const block of input.content.blocks) {
      expect(() => blockSchema.parse(block)).not.toThrow()
      expect(() => parseBlockProps(block.type, block.props)).not.toThrow()
    }
  })

  it('bhare hue doc pe koi blocker nahi aata', () => {
    expect(blockers(issues)).toEqual([])
  })

  it('title aur slug — Blog heading ab kahin nahi jaata, sirf note banta hai (D-93)', () => {
    /**
     * Client, 11 Sep: _"heading will be title now"_. Template me `Blog heading` abhi bhi bhara hai
     * (purana doc) — wo `fields.heading` me nahi jaata, aur client ko ek note milta hai.
     */
    expect(input.title).toBe('Andaman ferry booking')
    expect(slug).toBe('andaman-ferry-booking')
    expect(input).not.toHaveProperty('fields')

    const found = issues.find((i) => i.label === 'Blog heading')
    expect(found.level).toBe('note')
    expect(found.value).toBe('Andaman ferry booking: everything you need before you sail')
  })

  it('category naam se id ban jaati hai', () => {
    expect(input.taxonomies.categories).toEqual(['cat-trip'])
  })

  it('excerpt aur seo bhar jaate hain, aur entity decode ho kar', () => {
    expect(input.excerpt).toMatch(/^Three operators, two jetties/)
    expect(input.seo.title).toMatch(/^Andaman Ferry Booking 2026/)
    /** ⚠️ `&mdash;` yahan literally aa jaata to meta description me wahi chhapta. */
    expect(input.seo.description).toMatch(/Neil — plus when to book/)
  })

  it('Featured Image ka URL alag lautta hai — service use download karke Media me daalti hai', () => {
    expect(bannerUrl).toBe('https://images.example.com/andaman/havelock-ferry.jpg')
    /** Post pe ab `fields` hi nahi jaata (D-93) — banner kisi field me ghusa na ho, bas yahi dekhna hai. */
    expect(input.fields?.bannerImage).toBeUndefined()
    expect(input).not.toHaveProperty('featuredImageId')
  })
})

describe('blocks', () => {
  const { input } = run(TEMPLATE)

  it('do block bante hain — pehle article, phir FAQs', () => {
    expect(input.content.blocks.map((b) => b.type)).toEqual(['richText', 'faqs'])
  })

  it('article ka HTML table aur heading rakhta hai', () => {
    const html = input.content.blocks[0].props.html

    expect(html).toMatch(/<table/i)
    expect(html).toMatch(/<h2/i)
  })

  it('FAQ ka heading block ke props me jaata hai, kisi item me nahi', () => {
    const faqs = input.content.blocks[1].props

    expect(faqs.heading).toBe('Common questions about Andaman ferries')
    expect(faqs.items).toHaveLength(3)
    expect(faqs.items[0].question).toMatch(/after I land\?/)
  })

  it('FAQ na hon to faqs block banta hi nahi', () => {
    /** Khaali block editor me ek khaali panel banata aur page pe kuch nahi — D-30 ka ulta. */
    const { input: bare } = run(
      '<p>Blog title</p><p>X</p><p>Blog URL</p><p>x</p><p>Category</p><p>Trip planning</p><p>Content</p><p>Body text</p>',
    )

    expect(bare.content.blocks.map((b) => b.type)).toEqual(['richText'])
  })
})

describe('blockers — row Failed hoti hai (D-116)', () => {
  const base =
    '<p>Blog title</p><p>Ferries</p><p>Content</p><p>Some body</p><p>Category</p><p>Trip planning</p>'

  it('Blog URL na ho to blocker — D-86', () => {
    const { issues, input } = run(base)

    expect(blockers(issues).map((i) => i.label)).toContain('Blog URL')
    expect(input.content.blocks[0].props.html).toMatch(/Some body/)
  })

  it('category na mile to blocker, aur naam issue me dikhta hai', () => {
    const { issues } = run(base.replace('Trip planning', 'Trip Planing'))
    const found = blockers(issues).find((i) => i.label === 'Category')

    expect(found.value).toBe('Trip Planing')
    expect(found.message).toMatch(/is not in the Categories list/)
  })

  it('category bilkul na likhi ho to bhi blocker', () => {
    const { issues } = run('<p>Blog title</p><p>X</p><p>Content</p><p>Body</p>')

    expect(blockers(issues).map((i) => i.label)).toContain('Category')
  })

  it('ek naam do category pe mile to blocker — chup-chaap pehli nahi uthti', () => {
    const refs = {
      categories: new Map([
        [
          'trip planning',
          [
            { id: 'a', name: 'Trip planning' },
            { id: 'b', name: 'Trip planning' },
          ],
        ],
      ]),
    }

    const { issues, input } = run(base, refs)
    const found = blockers(issues).find((i) => i.label === 'Category')

    expect(found.message).toMatch(/matches 2 entries/)
    expect(input.taxonomies.categories).toEqual([])
  })

  it('Content khaali ho to blocker', () => {
    const { issues } = run('<p>Blog title</p><p>X</p><p>Category</p><p>Trip planning</p>')

    expect(blockers(issues).map((i) => i.label)).toContain('Content')
  })

  it('case aur extra space maaf hain, spelling nahi', () => {
    const { issues } = run(base.replace('Trip planning', '  TRIP   PLANNING  '))

    expect(blockers(issues).map((i) => i.label)).not.toContain('Category')
  })
})

describe('haddein — line kat_ti hai, post girta nahi', () => {
  const long = (n) => 'x'.repeat(n)

  it('bahut lamba title kaat kar note likha jaata hai', () => {
    const { input, issues } = run(
      `<p>Blog title</p><p>${long(400)}</p><p>Blog URL</p><p>a</p><p>Category</p><p>Trip planning</p><p>Content</p><p>b</p>`,
    )

    expect(input.title).toHaveLength(300)
    expect(issues.some((i) => i.message.includes('Blog title was shortened'))).toBe(true)
    /** ⚠️ Asli jaanch yahi hai: kaatne ke baad payload Zod se guzarna chahiye. */
    expect(() => entryCreateSchema.parse(input)).not.toThrow()
  })

  it('bahut lamba excerpt bhi kat_ta hai aur schema paas karta hai', () => {
    const { input, issues } = run(
      `<p>Blog title</p><p>T</p><p>Blog URL</p><p>a</p><p>Category</p><p>Trip planning</p><p>Excerpt</p><p>${long(1400)}</p><p>Content</p><p>b</p>`,
    )

    expect(input.excerpt).toHaveLength(1000)
    expect(issues.some((i) => i.message.includes('Excerpt was shortened'))).toBe(true)
    expect(() => entryCreateSchema.parse(input)).not.toThrow()
  })
})

describe('FAQs', () => {
  it('bina jawab wala sawaal chhod diya jaata hai, note ke saath', () => {
    const { input, issues } = run(
      '<p>Blog title</p><p>T</p><p>Blog URL</p><p>a</p><p>Category</p><p>Trip planning</p><p>Content</p><p>b</p>' +
        '<p>FAQs</p><p>Question</p><p>Only a question?</p><p>Question</p><p>Real one?</p><p>answer</p><p>Yes.</p>',
    )

    const faqs = input.content.blocks.find((b) => b.type === 'faqs')

    expect(faqs.props.items).toHaveLength(1)
    expect(faqs.props.items[0].question).toBe('Real one?')
    expect(issues.some((i) => i.message.includes('no answer under it'))).toBe(true)
  })
})

/** `Published Date` — client, 23 Sep (D-116). */
describe('Published Date', () => {
  const base =
    '<p>Blog title</p><p>Ferries</p><p>Blog URL</p><p>ferries</p><p>Category</p><p>Trip planning</p><p>Content</p><p>Body</p>'

  it('asli doc ki date — 9 Sept 2026', () => {
    const { publishAt } = run(TEMPLATE)

    expect(publishAt.toISOString().slice(0, 10)).toBe('2026-09-09')
  })

  it('doc me date na ho to null — service publish ke din ki date lagati hai', () => {
    expect(run(base).publishAt).toBeNull()
  })

  it('padhi na ja sake to blocker, saaf message ke saath', () => {
    const { issues, publishAt } = run(`<p>Published Date</p><p>next week</p>${base}`)

    expect(publishAt).toBeNull()
    expect(blockers(issues).map((i) => i.label)).toContain('Published Date')
  })
})

/** Featured Image — doc me image daali ho (URL nahi), to uska `src` (D-116). */
describe('Featured Image — doc me daali hui image', () => {
  it('value me <img> ho to uska src', () => {
    const { bannerUrl } = run(
      '<p>Blog title</p><p>X</p><p>Featured Image</p><p><img alt="" src="/uploads/sites/default/media/2026/09/aaaaaaaaaaaaaaaaaaaaaaaa/large.webp"></p>',
    )

    expect(bannerUrl).toBe(
      '/uploads/sites/default/media/2026/09/aaaaaaaaaaaaaaaaaaaaaaaa/large.webp',
    )
  })
})
