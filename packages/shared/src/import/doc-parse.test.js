import { describe, expect, it } from 'vitest'

import { faqHeadingRole, headingLevel, imageUrlOf, parseDocDate } from './doc-parse.js'

/** Bulk Upload ke saanjhe helpers — client, 23 Sep (D-116). */

describe('parseDocDate — Published Date', () => {
  const ist = (date) =>
    date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })

  it.each([
    ['9 Sept 2026'],
    ['9 Sep 2026'],
    ['9 September 2026'],
    ['9th Sept 2026'],
    ['Sept 9, 2026'],
    ['2026-09-09'],
    ['09/09/2026'],
  ])('"%s" → 9 Sep 2026', (text) => {
    expect(ist(parseDocDate(text))).toBe(ist(new Date('2026-09-09T12:00:00+05:30')))
  })

  /** DD/MM — Indian. `05/09/2026` 5 September hai, May 9 nahi. */
  it('slash wali date DD/MM hai', () => {
    expect(parseDocDate('05/09/2026').getUTCMonth()).toBe(8)
    expect(parseDocDate('05/09/2026').getUTCDate()).toBe(5)
  })

  /** Aadhi raat UTC India me pichhle din ki shaam hoti — isliye dopahar IST. */
  it('India me wahi din rehta hai, pichhla nahi', () => {
    expect(ist(parseDocDate('1 Jan 2026'))).toContain('1 Jan 2026')
  })

  it.each(['', 'soon', '31 Feb 2026', '9 Sepx 2026', '2026/13/01'])('"%s" → null', (text) => {
    expect(parseDocDate(text)).toBeNull()
  })
})

describe('headings se FAQ', () => {
  it('headingLevel', () => {
    expect(headingLevel('<h2 class="c1"><span>FAQs</span></h2>')).toBe(2)
    expect(headingLevel('<p>FAQs</p>')).toBeNull()
  })

  it('marker se chhoti heading sawaal, barabar ya badi FAQ ka ant', () => {
    expect(faqHeadingRole('<h3>Q?</h3>', 2)).toBe('question')
    expect(faqHeadingRole('<h4>Q?</h4>', 2)).toBe('question')
    expect(faqHeadingRole('<h2>Conclusion</h2>', 2)).toBe('end')
    expect(faqHeadingRole('<p>Answer.</p>', 2)).toBeNull()
  })

  /** Purana `Faq:` paragraph marker — tab bhi h3 sawaal hai. */
  it('marker heading na ho to level 2 maana jaata hai', () => {
    expect(faqHeadingRole('<h3>Q?</h3>', null)).toBe('question')
    expect(faqHeadingRole('<h2>Next</h2>', null)).toBe('end')
  })
})

describe('imageUrlOf — Featured Image ki value', () => {
  it('likha hua URL', () => {
    expect(imageUrlOf({ text: 'https://a.com/x.jpg', html: '<p>https://a.com/x.jpg</p>' })).toBe(
      'https://a.com/x.jpg',
    )
  })

  /** Doc me daali image — tab tak Media me utar chuki hoti hai, `src` hamara URL. */
  it('doc me daali hui image ka src', () => {
    expect(
      imageUrlOf({
        text: '',
        html: '<p><img alt="" src="/uploads/sites/default/media/x.webp"></p>',
      }),
    ).toBe('/uploads/sites/default/media/x.webp')
  })

  it('khaali', () => {
    expect(imageUrlOf(undefined)).toBe('')
    expect(imageUrlOf({ text: '', html: '' })).toBe('')
  })
})
