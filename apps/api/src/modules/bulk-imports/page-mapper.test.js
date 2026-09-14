import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { entryCreateSchema, parsePageDoc } from '@cms/shared'
import { describe, expect, it } from 'vitest'

import { cleanGoogleHtml } from '../../core/google-html.js'
import { toPageEntryInput } from './page-mapper.js'

/**
 * Page mapper — asli Google Doc export (`page-template.html`, 14 Sep) se, **`cleanGoogleHtml()`
 * ke saath**, taaki wahi HTML mile jo import me milti hai.
 *
 * ⚠️ Output `entryCreateSchema` se guzaara jaata hai — post mapper wala hi tark: sirf shakl dekhne
 * wala test ek aisi hadd kabhi na pakadta jo poore page ko gira de.
 */
const TEMPLATE = cleanGoogleHtml(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../../../../packages/shared/src/import/__fixtures__/page-template.html',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
  { allowImages: true },
)

const REFS = {
  pages: [{ id: 'page-beaches', name: 'Andaman Beaches', slug: 'andaman-beaches' }],
  sidebars: [{ id: 'sb-pages', name: 'Pages Sidebar' }],
}

const run = (html = TEMPLATE, refs = REFS) => toPageEntryInput(parsePageDoc(html), refs)

describe('toPageEntryInput — asli template', () => {
  const out = run()

  it('sirf On this page ka note, aur payload entryCreateSchema se guzarta hai', () => {
    // Client ke doc me `On this page: Yes` hai — wo setting 14 Sep shaam Pages settings me gayi
    expect(out.issues).toEqual([expect.objectContaining({ level: 'note', label: 'On this page' })])
    expect(entryCreateSchema.safeParse(out.input).success).toBe(true)
  })

  it('title, slug, parent aur SEO', () => {
    expect(out.input.title).toBe('Bharatpur Beach')
    expect(out.slug).toBe('bharatpur-beach')
    expect(out.input.parentId).toBe('page-beaches')
    expect(out.input.seo.description).toMatch(/^Where Bharatpur Beach is/)
  })

  it('stat rail — entity decode ho kar, pehla highlight', () => {
    expect(out.input.fields.statRail[0]).toEqual({
      value: 'Free',
      suffix: 'entry',
      label: 'Ticket · qualifier',
      highlight: true,
    })
    expect(out.input.fields.statRail.filter((s) => s.highlight)).toHaveLength(1)
  })

  it('naye page ke liye Pages Sidebar right pe — input me nahi, alag', () => {
    // `input.fields` me nahi — service tay karta hai ki page naya hai ya purana
    expect(out.input.fields.sidebar).toBeUndefined()
    expect(out.newOnlyFields).toEqual({ sidebar: 'right', sidebarId: 'sb-pages' })
    expect(out.newOnlyIssues).toEqual([])
  })

  it('sub heading me bold bachta hai — Google ki class se `<strong>` bankar', () => {
    // Raw export me bold ek CSS class hai; `cleanGoogleHtml()` use `<strong>` banata hai
    expect(out.input.fields.subheading).toContain(
      '<strong>the one thing that decides whether it is worth your day</strong>',
    )
  })

  it('On this page doc se page pe nahi jaata — setting Pages settings me hai (D-95 §12)', () => {
    expect(out.input.fields).not.toHaveProperty('showToc')
  })

  it('doc me On this page na ho to koi note nahi', () => {
    const bare = run('<p>Page title</p><p>X</p><p>Page URL</p><p>x</p><p>Content</p><p>Hi</p>')

    expect(bare.issues).toEqual([])
  })

  it('banner ka URL aata hai', () => {
    expect(out.bannerUrl).toMatch(/\/media\/2026\/09\/[a-f0-9]{24}\/large\.webp$/)
  })
})

describe('toPageEntryInput — galti ki haalat', () => {
  const p = (line) => `<p>${line}</p>`
  const doc = (...lines) => lines.map(p).join('')

  it('Page URL na ho to blocker', () => {
    const out = run(doc('Page title', 'X', 'Content', 'Hi'))

    expect(out.issues).toEqual([expect.objectContaining({ level: 'blocker', label: 'Page URL' })])
  })

  it('Parent page na mile to blocker, aur parentId nahi jaata', () => {
    const out = run(
      doc('Page title', 'X', 'Page URL', 'x', 'Parent page', 'Nowhere', 'Content', 'Hi'),
    )

    expect(out.input.parentId).toBeUndefined()
    expect(out.issues).toEqual([
      expect.objectContaining({ level: 'blocker', label: 'Parent page' }),
    ])
  })

  it('page apna hi parent nahi ban sakta', () => {
    const out = run(
      doc(
        'Page title',
        'X',
        'Page URL',
        'andaman-beaches',
        'Parent page',
        'Andaman Beaches',
        'Content',
        'Hi',
      ),
    )

    expect(out.input.parentId).toBeUndefined()
    expect(out.issues[0].message).toMatch(/its own parent/)
  })

  it('button ka sirf label ho to note — button nahi aayega', () => {
    const out = run(doc('Page title', 'X', 'Page URL', 'x', 'Button label', 'Go', 'Content', 'Hi'))

    expect(out.issues).toEqual([expect.objectContaining({ level: 'note', label: 'Button link' })])
  })

  it('Pages Sidebar na mile to note, aur naye page pe koi sidebar nahi', () => {
    const out = run(doc('Page title', 'X', 'Page URL', 'x', 'Content', 'Hi'), {
      ...REFS,
      sidebars: [],
    })

    expect(out.newOnlyFields).toEqual({})
    expect(out.newOnlyIssues).toEqual([
      expect.objectContaining({ level: 'note', label: 'Sidebar' }),
    ])
  })

  it('chaar se zyada stat card — pehle chaar, note ke saath', () => {
    const cards = [1, 2, 3, 4, 5].flatMap((n) => ['Value', `${n}`])
    const out = run(doc('Page title', 'X', 'Page URL', 'x', 'Stat Rail', ...cards, 'Content', 'Hi'))

    expect(out.input.fields.statRail).toHaveLength(4)
    expect(out.issues).toEqual([expect.objectContaining({ level: 'note', label: 'Stat Rail' })])
  })
})
