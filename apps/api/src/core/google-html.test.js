import { describe, expect, it } from 'vitest'

import { classMapFromStyle, cleanGoogleHtml, unwrapGoogleLink } from './google-html.js'

/**
 * ⚠️ **In tests ki asli wajah ek galti hai jo pehle ho chuki hai.**
 *
 * Pehli koshish me maana gaya tha ki Google bold `style="font-weight:700"` se bhejta hai, aur
 * uska demo bhi "chal gaya" — kyunki demo ka HTML khud likha gaya tha. Asli export me bold
 * **class** se aata hai (`.c4{font-weight:700}` + `<span class="c4">`), aur us design me client
 * ka saara bold chup-chaap gir jaata.
 *
 * Isliye har fixture yahan **class wala** hai, inline style wala nahi.
 */

/** Google ke export ki asli shakl. */
const googleDoc = (
  body,
  style = '.c2{font-weight:400}.c4{font-weight:700}.c5{font-style:italic}',
) =>
  `<html><head><style type="text/css">${style}</style></head><body class="c3">${body}</body></html>`

describe('classMapFromStyle', () => {
  it('bold, italic, underline aur strike wali class pehchaan leta hai', () => {
    const map = classMapFromStyle(
      googleDoc('', '.a{font-weight:700}.b{font-style:italic}.c{text-decoration:underline}'),
    )

    expect(map.get('a').bold).toBe(true)
    expect(map.get('b').italic).toBe(true)
    expect(map.get('c').underline).toBe(true)
  })

  it('font-weight:400 ko bold nahi maanta', () => {
    // `.c2` har normal text pe hoti hai — ise bold maan lena poore doc ko bold kar deta
    expect(classMapFromStyle(googleDoc('', '.c2{font-weight:400}')).get('c2').bold).toBe(false)
  })

  it('`bold` shabd aur 600+ dono chalte hain', () => {
    const map = classMapFromStyle(googleDoc('', '.x{font-weight:bold}.y{font-weight:600}'))

    expect(map.get('x').bold).toBe(true)
    expect(map.get('y').bold).toBe(true)
  })
})

describe('cleanGoogleHtml', () => {
  it('class wala bold asli <strong> ban jaata hai', () => {
    const html = cleanGoogleHtml(
      googleDoc(
        '<p class="c0"><span class="c2">Covers </span><span class="c4">Port Blair</span></p>',
      ),
    )

    expect(html).toBe('<p>Covers <strong>Port Blair</strong></p>')
  })

  it('ek hi span pe bold aur italic dono ho to dono bachte hain', () => {
    const html = cleanGoogleHtml(googleDoc('<p><span class="c4 c5">Neil</span></p>'))

    expect(html).toBe('<p><strong><em>Neil</em></strong></p>')
  })

  it('single quote wali attributes pe bhi bold nahi girta', () => {
    // Google double quote bhejta hai, par single quote wala HTML kahin se bhi aa sakta hai
    const html = cleanGoogleHtml(googleDoc("<p><span class='c4'>Bold</span></p>"))

    expect(html).toContain('<strong>Bold</strong>')
  })

  it('class aur style ek bhi nahi bachti', () => {
    const html = cleanGoogleHtml(
      googleDoc('<p class="c0"><span class="c2" style="color:red">Text</span></p>'),
    )

    expect(html).not.toContain('class')
    expect(html).not.toContain('style')
  })

  it('<style> ka CSS text ban kar bahar nahi aata', () => {
    const html = cleanGoogleHtml(googleDoc('<p><span class="c2">Hello</span></p>'))

    expect(html).not.toContain('font-weight')
    expect(html).toBe('<p>Hello</p>')
  })

  it('list aur nested list bachti hai', () => {
    const html = cleanGoogleHtml(
      googleDoc(
        '<ul><li><span class="c2">One</span><ul><li><span class="c2">Sub</span></li></ul></li></ul>',
      ),
    )

    expect(html).toBe('<ul><li>One<ul><li>Sub</li></ul></li></ul>')
  })

  it('Google ka redirect link khol deta hai', () => {
    const html = cleanGoogleHtml(
      googleDoc(
        '<p><a href="https://www.google.com/url?q=https://example.com/pic.jpg&amp;sa=D&amp;ust=17">photo</a></p>',
      ),
    )

    expect(html).toContain('href="https://example.com/pic.jpg"')
    expect(html).not.toContain('google.com/url')
  })

  it('doc ka <h1> page ke apne <h1> se takrane nahi jaata', () => {
    expect(cleanGoogleHtml(googleDoc('<h1><span class="c2">Title</span></h1>'))).toBe(
      '<h2>Title</h2>',
    )
  })

  it('span khap jaane ke baad khokhle tag nahi chhodta', () => {
    const html = cleanGoogleHtml(googleDoc('<p><span class="c4"></span>Text</p>'))

    expect(html).toBe('<p>Text</p>')
  })

  it('script kabhi bhi bahar nahi aata', () => {
    const html = cleanGoogleHtml(googleDoc('<p>Hi</p><script>alert(1)</script>'))

    expect(html).not.toContain('alert')
    expect(html).not.toContain('script')
  })
})

describe('unwrapGoogleLink', () => {
  it('redirector se asli URL nikaalta hai', () => {
    expect(unwrapGoogleLink('https://www.google.com/url?q=https://example.com&sa=D')).toBe(
      'https://example.com',
    )
  })

  it('saada link ko haath nahi lagata', () => {
    expect(unwrapGoogleLink('https://example.com/pic.jpg')).toBe('https://example.com/pic.jpg')
  })

  it('toota hua URL waisa hi lauta deta hai', () => {
    expect(unwrapGoogleLink('not a url')).toBe('not a url')
  })
})
