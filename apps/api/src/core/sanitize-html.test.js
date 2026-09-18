import { describe, expect, it } from 'vitest'

import { sanitizeBlockHtml, sanitizeInlineHtml } from './sanitize-html.js'

/**
 * Apne origin wale `/uploads/` link relative bante hain (18 Sep).
 *
 * Test env me `SITE_URL` = `http://localhost:3000`, `ADMIN_URL` = `http://localhost:5173`
 * (`vitest.config.js`) — yaani yahi do "apne" hain.
 */
describe('sanitizer — apne origin ke /uploads/ link relative', () => {
  const PATH = '/uploads/sites/default/media/2026/09/abc/large.webp'

  it('admin ke origin wala img src relative ho jaata hai (Media Library ka Copy URL)', () => {
    const out = sanitizeBlockHtml(
      `<div class="ipanel__m"><img src="http://localhost:5173${PATH}" alt="x"></div>`,
    )

    expect(out).toContain(`src="${PATH}"`)
    expect(out).not.toContain('localhost:5173')
  })

  it('site ka origin bhi, aur href/srcset me bhi — srcset ke har URL pe', () => {
    const out = sanitizeBlockHtml(
      `<a href="http://localhost:3000${PATH}">x</a>` +
        `<img src="${PATH}" srcset="http://localhost:3000${PATH} 800w, http://localhost:5173${PATH} 1600w">`,
    )

    expect(out).toContain(`href="${PATH}"`)
    expect(out).toContain(`srcset="${PATH} 800w, ${PATH} 1600w"`)
    expect(out).not.toMatch(/localhost:(3000|5173)/)
  })

  it('inline profile me bhi (list ki line ka link)', () => {
    expect(sanitizeInlineHtml(`<a href="http://localhost:5173${PATH}">x</a>`)).toBe(
      `<a href="${PATH}">x</a>`,
    )
  })

  it('editor ka banaya ../../uploads/ (aur ./uploads/) root se — srcset ke har URL pe', () => {
    const out = sanitizeBlockHtml(
      `<img src="../..${PATH}" srcset="../..${PATH} 800w, .${PATH} 1600w">`,
    )

    expect(out).toContain(`src="${PATH}"`)
    expect(out).toContain(`srcset="${PATH} 800w, ${PATH} 1600w"`)
  })

  it('../ wala koi aur relative link nahi chhua jaata', () => {
    expect(sanitizeBlockHtml('<a href="../contact-us">x</a>')).toContain('href="../contact-us"')
  })

  it('kisi aur site ka /uploads/ link nahi chhua jaata', () => {
    const other = 'https://www.andamantourism.org/wp-content/uploads/2017/05/box-1.jpg'
    const cdn = `https://cdn.example.com${PATH}`
    const out = sanitizeBlockHtml(`<img src="${other}"><img src="${cdn}">`)

    expect(out).toContain(`src="${other}"`)
    expect(out).toContain(`src="${cdn}"`)
  })

  it('apne origin ka /uploads/ ke bahar wala link waisa ka waisa (page link absolute rakha ho to)', () => {
    const out = sanitizeBlockHtml('<a href="http://localhost:3000/contact-us">x</a>')

    expect(out).toContain('href="http://localhost:3000/contact-us"')
  })

  it('text me likha URL nahi badalta — sirf attribute', () => {
    const out = sanitizeBlockHtml(`<p>http://localhost:5173${PATH}</p>`)

    expect(out).toBe(`<p>http://localhost:5173${PATH}</p>`)
  })
})
