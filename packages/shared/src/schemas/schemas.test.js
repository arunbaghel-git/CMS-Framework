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
  isPubliclyVisible,
  pathSchema,
  seoSchema,
  slugSchema,
} from './index.js'
import { ENTRY_STATUSES, ROLE_PERMISSIONS, ROLES } from '../constants/index.js'
import { fieldTypesFor, isFieldTypeAllowed, isResponsive } from '../field-types.js'

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
    expect(entry.taxonomies).toEqual({ categories: [], tags: [] })
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
  it('char roles hain, subscriber nahi (D-26)', () => {
    expect(ROLES).toEqual(['admin', 'editor', 'author', 'contributor'])
    expect(ROLES).not.toContain('subscriber')
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
