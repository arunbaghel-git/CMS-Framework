import { describe, expect, it } from 'vitest'

import {
  hasFixedPath,
  normalizePath,
  pathFromUrl,
  rebasePath,
  resolvePath,
  slugify,
  suffixSlug,
} from './path.js'

/**
 * Slug aur path ke pure functions — D-09.
 *
 * Ye tests isliye alag aur pehle hain ki inka **koi DB nahi** hai. Yahi wo ek jagah hai
 * jahan se har entry ka URL nikalta hai; yahan ek galti seedha stored data me baith jaati
 * hai, aur stored path badalna matlab live URL badalna.
 */

const PAGE = { urlPattern: '/{slug}', hierarchical: true }
const PACKAGE = { urlPattern: '/packages/{slug}', hierarchical: false }
const POST = { urlPattern: '/blog/{slug}', hierarchical: false }

describe('slugify', () => {
  it('space aur uppercase se URL-safe slug banata hai', () => {
    expect(slugify('Andaman 5 Nights')).toBe('andaman-5-nights')
  })

  it('diacritics gira deta hai, letter nahi', () => {
    // "Café" → "cafe" hona chahiye, "caf" nahi — NFD ke bina yahi tootta hai
    expect(slugify('Café Havelock')).toBe('cafe-havelock')
  })

  it('apostrophe hata deta hai, hyphen me nahi badalta', () => {
    // "India's Best" → "indias-best"; warna "india-s-best" jaisa gandha slug banta
    expect(slugify("India's Best")).toBe('indias-best')
  })

  it('punctuation aur repeat separators ek hi hyphen bante hain', () => {
    expect(slugify('Port Blair -- Havelock // Neil!!')).toBe('port-blair-havelock-neil')
  })

  it('shuru aur aakhir ke hyphen nahi bachte', () => {
    expect(slugify('  --Hello--  ')).toBe('hello')
  })

  it('non-Latin script pe khaali lautata hai — caller ko slug haath se bharna padega', () => {
    // Transliteration jaan-boojh kar nahi hai: uska koi ek sahi jawab nahi hota, aur
    // galat transliteration ek permanent URL me baith jaati hai
    expect(slugify('अंडमान')).toBe('')
  })
})

describe('suffixSlug', () => {
  it('pehli koshish pe slug waisa ka waisa', () => {
    expect(suffixSlug('about', 1)).toBe('about')
  })

  it('collision pe -2, -3', () => {
    expect(suffixSlug('about', 2)).toBe('about-2')
    expect(suffixSlug('about', 3)).toBe('about-3')
  })

  it('lambe slug pe suffix ke liye jagah kaat-ta hai — 200 ki hadd nahi tootti', () => {
    // Bina iske collision pe validation fail hoti aur wajah bilkul saaf nahi hoti
    const long = 'a'.repeat(200)
    const result = suffixSlug(long, 2)

    expect(result.length).toBe(200)
    expect(result.endsWith('-2')).toBe(true)
  })
})

describe('normalizePath', () => {
  it('double slash aur trailing slash hata deta hai', () => {
    expect(normalizePath('//about//team/')).toBe('/about/team')
  })

  it('khaali aur "/" dono root hain', () => {
    // Do variants store ho jaayein to unique index unhe alag maanta hai aur ek hi page
    // do URL pe live ho jaata hai — duplicate content
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('/')).toBe('/')
  })
})

describe('resolvePath', () => {
  it('non-hierarchical type urlPattern se path banata hai', () => {
    expect(resolvePath({ slug: 'andaman-5-nights' }, PACKAGE)).toBe('/packages/andaman-5-nights')
    expect(resolvePath({ slug: 'hello' }, POST)).toBe('/blog/hello')
  })

  it('hierarchical type root pe /{slug} deta hai', () => {
    expect(resolvePath({ slug: 'about', parentPath: '/' }, PAGE)).toBe('/about')
  })

  it('hierarchical type parent ke neeche nested path deta hai', () => {
    expect(resolvePath({ slug: 'team', parentPath: '/about' }, PAGE)).toBe('/about/team')
  })

  it('root parent pe double slash nahi banta', () => {
    expect(resolvePath({ slug: 'about', parentPath: '' }, PAGE)).toBe('/about')
  })

  it('slug ke bina throw karta hai — chup-chaap "/" kabhi nahi', () => {
    // Khaali path lautana matlab do entries ka ek hi path claim karna, aur wo failure
    // Mongo ke duplicate-key error ke roop me kahin aur dikhti
    expect(() => resolvePath({ slug: '' }, PACKAGE)).toThrow()
  })
})

describe('rebasePath', () => {
  it('parent badalne pe bachche ka path rebase hota hai', () => {
    expect(rebasePath('/about/team', '/about', '/company')).toBe('/company/team')
  })

  it('gehre nested descendants bhi rebase hote hain', () => {
    expect(rebasePath('/about/team/leads', '/about', '/company')).toBe('/company/team/leads')
  })

  it('sirf prefix pe lagta hai — milta-julta naam nahi kat-ta', () => {
    // `/about-us` `/about` se shuru zaroor hota hai, par uska bachcha nahi hai.
    // Plain string replace yahin galat jawab deta hai
    expect(rebasePath('/about-us', '/about', '/company')).toBe('/about-us')
  })

  it('khud parent ka path bhi rebase hota hai', () => {
    expect(rebasePath('/about', '/about', '/company')).toBe('/company')
  })

  it('bilkul alag branch ko haath nahi lagata', () => {
    expect(rebasePath('/blog/hello', '/about', '/company')).toBe('/blog/hello')
  })
})

describe('hasFixedPath — home page (D-96)', () => {
  const home = { urlPattern: '/', hierarchical: false }

  it('`{slug}` ke bina pattern tay path hai, aur resolvePath `/` lautata hai', () => {
    expect(hasFixedPath(home)).toBe(true)
    expect(resolvePath({ slug: 'home' }, home)).toBe('/')
    expect(resolvePath({ slug: 'welcome' }, home)).toBe('/')
  })

  it('slug wala pattern aur nested type tay nahi hain', () => {
    expect(hasFixedPath({ urlPattern: '/{slug}', hierarchical: false })).toBe(false)
    // Nested type ka path parent se banta hai, pattern se nahi
    expect(hasFixedPath({ urlPattern: '/', hierarchical: true })).toBe(false)
    expect(hasFixedPath(null)).toBe(false)
  })
})

describe('pathFromUrl — SEO ka bulk import (D-107)', () => {
  it('poora URL, origin ke bina, aur bina slash wala — teenon ek hi path', () => {
    expect(pathFromUrl('https://andamantourism.org/packages/x')).toBe('/packages/x')
    expect(pathFromUrl('/packages/x')).toBe('/packages/x')
    expect(pathFromUrl('packages/x')).toBe('/packages/x')
    expect(pathFromUrl('//andamantourism.org/packages/x')).toBe('/packages/x')
  })

  it('bade akshar lowercase ho jaate hain — D-86 theek yahi galti thi', () => {
    expect(pathFromUrl('https://site.com/Packages/Discover-Andaman/')).toBe(
      '/packages/discover-andaman',
    )
  })

  it('query aur hash girte hain — client analytics wala poora link chipkata hai', () => {
    expect(pathFromUrl('/blog/a?utm_source=sheet&x=1')).toBe('/blog/a')
    expect(pathFromUrl('/blog/a#top')).toBe('/blog/a')
    expect(pathFromUrl('https://site.com/blog/a?u=1#top')).toBe('/blog/a')
  })

  it('aakhir ka slash aur aas-paas ki jagah hat-ti hai', () => {
    expect(pathFromUrl('  /about/team/  ')).toBe('/about/team')
    expect(pathFromUrl('/about//team')).toBe('/about/team')
  })

  it('sirf origin ka matlab home page hai', () => {
    expect(pathFromUrl('https://site.com')).toBe('/')
    expect(pathFromUrl('https://site.com/')).toBe('/')
    expect(pathFromUrl('/')).toBe('/')
  })

  it('khaali cell pe khaali string — caller use Failed row banata hai', () => {
    expect(pathFromUrl('')).toBe('')
    expect(pathFromUrl('   ')).toBe('')
    expect(pathFromUrl(null)).toBe('')
    expect(pathFromUrl(undefined)).toBe('')
  })
})
