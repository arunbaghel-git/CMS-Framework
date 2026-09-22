import { describe, expect, it } from 'vitest'

import { SEO_LIMITS, toSeoUpdate } from './seo-mapper.js'

/**
 * SEO ke bulk import ka pure hissa (D-107).
 *
 * Yahan ka sabse zaroori test pehla hai — **purane `seo` ke baaki khaane bachne chahiye**.
 * `updateEntry()` ka `$set` poora `seo` object replace karta hai, to bina merge ke ek import
 * har page ka `canonical` aur `noindex` chup-chaap uda deta, aur wo kisi error me nahi dikhta.
 */

const existing = (seo) => ({ seo })

describe('toSeoUpdate', () => {
  it('purane seo ke baaki khaane bache rehte hain', () => {
    const { seo, changed } = toSeoUpdate(
      { title: 'New title', description: 'New description' },
      existing({
        title: 'Old title',
        description: 'Old description',
        canonical: 'https://site.com/a',
        noindex: true,
        ogTitle: 'Og',
        twitterCard: 'summary_large_image',
        schemaType: 'Product',
      }),
    )

    expect(seo).toEqual({
      title: 'New title',
      description: 'New description',
      canonical: 'https://site.com/a',
      noindex: true,
      ogTitle: 'Og',
      twitterCard: 'summary_large_image',
      schemaType: 'Product',
    })
    expect(changed).toEqual(['SEO Title', 'Meta Description'])
  })

  it('khaali cell us khaane ko chhoota hi nahi — client ka faisla (21 Sep)', () => {
    const { seo, changed } = toSeoUpdate(
      { title: '', description: '   ' },
      existing({ title: 'Old title', description: 'Old description' }),
    )

    expect(seo).toEqual({ title: 'Old title', description: 'Old description' })
    expect(changed).toEqual([])
  })

  it('column hi na ho (null) to bhi wahi — khaali aur ghaayab ek hi baat hai', () => {
    const { seo, changed } = toSeoUpdate(
      { title: null, description: 'Only this' },
      existing({ title: 'Old title' }),
    )

    expect(seo).toEqual({ title: 'Old title', description: 'Only this' })
    expect(changed).toEqual(['Meta Description'])
  })

  it('bina seo wale page pe khaali se shuru hota hai', () => {
    const { seo, changed } = toSeoUpdate({ title: 'T' }, {})

    expect(seo).toEqual({ title: 'T' })
    expect(changed).toEqual(['SEO Title'])
  })

  it('hadd se lamba text kaat kar note lagta hai — row Failed nahi hoti', () => {
    const long = 'x'.repeat(SEO_LIMITS.description + 40)
    const { seo, changed, issues } = toSeoUpdate({ title: 'T', description: long }, null)

    expect(seo.description).toHaveLength(SEO_LIMITS.description)
    expect(changed).toEqual(['SEO Title', 'Meta Description'])
    expect(issues).toEqual([expect.objectContaining({ level: 'note', label: 'Meta Description' })])
  })

  it('aas-paas ki jagah hat jaati hai', () => {
    const { seo } = toSeoUpdate({ title: '  Padded  ' }, null)

    expect(seo.title).toBe('Padded')
  })
})
