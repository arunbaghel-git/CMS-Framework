import { describe, expect, it } from 'vitest'

import { pageDescription, pageOgImages, pageRobots, pageTitle, robotsTxt } from './seo.js'

const settings = (seo = {}, extra = {}) => ({
  siteName: 'Andaman Tours',
  tagline: 'Island holidays',
  searchEngineVisible: true,
  seo: {
    titleTemplate: '%title% | %sitename%',
    defaultDescription: 'Site ka default.',
    defaultOgImage: { url: '/uploads/og.webp', width: 1200, height: 630 },
    robotsTxt: 'User-agent: *\nAllow: /',
    ...seo,
  },
  ...extra,
})

describe('pageTitle', () => {
  it('SEO Title khaali ho to template page ke Title pe', () => {
    expect(pageTitle({ title: 'Havelock 5N' }, settings())).toBe('Havelock 5N | Andaman Tours')
  })

  it('SEO Title likha ho to jaisa likha waisa — template nahi (client, 24 Sep)', () => {
    const entry = { title: 'Havelock 5N', seo: { title: 'Best Havelock Trip 2026' } }
    expect(pageTitle(entry, settings())).toBe('Best Havelock Trip 2026')
  })

  it('%tagline% bhi chalta hai', () => {
    const s = settings({ titleTemplate: '%title% — %sitename%: %tagline%' })
    expect(pageTitle({ title: 'Home' }, s)).toBe('Home — Andaman Tours: Island holidays')
  })

  it('khaali template = sirf page ka title', () => {
    expect(pageTitle({ title: 'Home' }, settings({ titleTemplate: '' }))).toBe('Home')
  })

  it('seo payload na ho (purana API) to aaj wala hi look', () => {
    expect(pageTitle({ title: 'Home' }, { siteName: 'X' })).toBe('Home | X')
  })
})

describe('pageDescription', () => {
  it('page ka apna pehle, default sabse aakhir me', () => {
    expect(pageDescription({ seo: { description: 'SEO' }, excerpt: 'Ex' }, settings())).toBe('SEO')
    expect(pageDescription({ fields: { shortDescription: 'Short' } }, settings())).toBe('Short')
    expect(pageDescription({ excerpt: 'Ex' }, settings())).toBe('Ex')
    expect(pageDescription({}, settings())).toBe('Site ka default.')
    expect(pageDescription({}, settings({ defaultDescription: '' }))).toBeUndefined()
  })
})

describe('pageOgImages', () => {
  it('page ki banner pehle, phir Default OG Image', () => {
    expect(pageOgImages({ banner: { url: '/uploads/b.webp' } }, settings())).toEqual([
      { url: '/uploads/b.webp' },
    ])
    expect(pageOgImages({}, settings())).toEqual([
      { url: '/uploads/og.webp', width: 1200, height: 630 },
    ])
  })

  it('dono na hon to kuch nahi — toota link kabhi nahi', () => {
    expect(pageOgImages({}, settings({ defaultOgImage: null }))).toBeUndefined()
  })
})

describe('pageRobots', () => {
  it('site ka switch band ho to har page noindex — page ka apna faisla bhi nahi bachata', () => {
    const off = settings({}, { searchEngineVisible: false })
    expect(pageRobots({}, off)).toEqual({ index: false, follow: false })
  })

  it('switch on ho to sirf page ka apna noindex', () => {
    expect(pageRobots({}, settings())).toBeUndefined()
    expect(pageRobots({ seo: { noindex: true } }, settings())).toEqual({
      index: false,
      follow: true,
    })
  })

  it('settings na milein to noindex nahi — cache me galat page na baithe', () => {
    expect(pageRobots({}, null)).toBeUndefined()
  })
})

describe('robotsTxt', () => {
  it('admin ka likha text, aakhir me newline', () => {
    const s = settings({ robotsTxt: 'User-agent: *\nDisallow: /private' })
    expect(robotsTxt(s)).toBe('User-agent: *\nDisallow: /private\n')
  })

  it('search engines band hon to admin ka text NAHI — poori site Disallow', () => {
    const s = settings({ robotsTxt: 'User-agent: *\nAllow: /' }, { searchEngineVisible: false })
    expect(robotsTxt(s)).toBe('User-agent: *\nDisallow: /\n')
  })

  it('khaali textarea pe default, khaali file nahi', () => {
    expect(robotsTxt(settings({ robotsTxt: '   ' }))).toBe('User-agent: *\nAllow: /\n')
  })

  it('settings hi na milein (API band) to null — route 503 de, Disallow nahi', () => {
    expect(robotsTxt(null)).toBeNull()
  })
})
