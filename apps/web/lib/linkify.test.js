import { describe, expect, it } from 'vitest'

import { linkifyParts, telHref } from './linkify.js'

/**
 * Ye pure function hai aur uske saare kaante regex ke kaante hain — isliye test unit hai,
 * render ka nahi.
 *
 * Sabse zaroori test wo **nahi** hai jo pakadta hai, balki wo hai jo **nahi** pakadta:
 * pincode, date aur time galti se `tel:` link ban jaayein to footer me toota link chala
 * jaata hai, bina kisi error ke.
 */

/** Sirf link wale tukde — assertions padhne me saaf rehti hain. */
const links = (parts) => parts.filter((p) => p.href)

describe('linkifyParts — email', () => {
  it('email ko mailto: banata hai, chahe block ka icon kuch bhi ho', () => {
    const parts = linkifyParts('info@andamantourism.org')

    expect(parts).toEqual([
      { text: 'info@andamantourism.org', href: 'mailto:info@andamantourism.org' },
    ])
  })

  it('text ke beech ka email bhi pakadta hai, aas-paas ka text bacha rehta hai', () => {
    const parts = linkifyParts('Write to us at info@example.org anytime')

    expect(parts).toEqual([
      { text: 'Write to us at ' },
      { text: 'info@example.org', href: 'mailto:info@example.org' },
      { text: ' anytime' },
    ])
  })

  it('bina TLD ke "@handle" link nahi banta', () => {
    expect(links(linkifyParts('Follow @andamantourism'))).toEqual([])
  })
})

describe('linkifyParts — phone', () => {
  const phone = { phone: true }

  it('phone icon ke bina number link nahi banta', () => {
    expect(links(linkifyParts('+91 98100 66496'))).toEqual([])
  })

  it('do number "/" se alag hon to do alag link bante hain', () => {
    const parts = linkifyParts('+91 98100 66496 / 98110 66496', phone)

    expect(links(parts)).toEqual([
      { text: '+91 98100 66496', href: 'tel:+919810066496' },
      { text: '98110 66496', href: 'tel:9811066496' },
    ])

    // Beech ka " / " text hi rehta hai, kisi link ke andar nahi jaata
    expect(parts.map((p) => p.text).join('')).toBe('+91 98100 66496 / 98110 66496')
  })

  it('link digit pe khatam hota hai — trailing space andar nahi jaata', () => {
    const [link] = links(linkifyParts('Call 98100 66496 today', phone))

    expect(link.text).toBe('98100 66496')
  })

  /**
   * Ye teen test hi asli wajah hain ki phone detection `phone` icon se bandhi hui hai.
   * Inme se koi bhi pass hone lage to footer me `tel:744102` jaisa link chala jaayega.
   */
  it('pincode link nahi banta — 6 digit 10 se kam hain', () => {
    expect(links(linkifyParts('A&N Islands 744102', phone))).toEqual([])
    expect(links(linkifyParts('New Delhi 110005', phone))).toEqual([])
  })

  it('timing link nahi banti', () => {
    expect(links(linkifyParts('Mon – Sat, 10:00 to 19:00 IST', phone))).toEqual([])
  })

  it('ghar ka number wala pata link nahi banta', () => {
    const text = '920/1, Desh Bandhu Gupta Road, Karol Bagh, Naiwala, New Delhi 110005'

    expect(links(linkifyParts(text, phone))).toEqual([])
  })
})

describe('linkifyParts — shape', () => {
  it('khaali text pe khaali list', () => {
    expect(linkifyParts('')).toEqual([])
    expect(linkifyParts(null)).toEqual([])
    expect(linkifyParts(undefined)).toEqual([])
  })

  it('koi match na ho to poora text ek hi tukde me aata hai', () => {
    expect(linkifyParts('Just some words')).toEqual([{ text: 'Just some words' }])
  })

  it('line breaks bache rehte hain — theme unhe pre-line se render karti hai', () => {
    const parts = linkifyParts('Line one\nLine two')

    expect(parts.map((p) => p.text).join('')).toBe('Line one\nLine two')
  })
})

describe('telHref', () => {
  it('digits aur + ke alawa sab hata deta hai', () => {
    expect(telHref('+91 98100 66496')).toBe('tel:+919810066496')
    expect(telHref('(080) 4567-8900')).toBe('tel:08045678900')
  })
})
