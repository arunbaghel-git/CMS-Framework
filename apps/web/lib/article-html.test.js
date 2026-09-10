import { describe, expect, it } from 'vitest'

import { leadParagraph, markedBlocks, wrapTables } from './article-html.js'

/**
 * Article ke design transforms — spec 008 (client, 10 Sep).
 *
 * ⚠️ **Ye teenon pehle `Blocks.jsx` ke andar the aur unka koi test nahi tha.** Usi wajah se
 * table ka header do baar galat bana: pehle maine maana ki Google `<thead>` bhejta hi nahi,
 * phir CSS ka `tr:first-child` **do** rows pakadta tha. Dono baar galti live page pe pakdi
 * gayi, test me nahi.
 */

/** Jaisa Google sach me bhejta hai — `<thead>` hai, par cells `<td>`, aur ek toota `<tbody>`. */
const GOOGLE_TABLE =
  '<table><thead><tr><td><p>Nights</p></td><td><p>Covers</p></td><tbody></tbody></tr>' +
  '<tr><td><p>2N</p></td><td><p>Short</p></td></tr></table>'

/** Client ki apni likhi table — header pehle se sahi hai. */
const CLIENT_TABLE =
  '<div class="tblw"><table class="tbl"><thead><tr><th>A</th><th>B</th></tr></thead>' +
  '<tbody><tr><td>1</td><td>2</td></tr></tbody></table></div>'

describe('wrapTables — har table apne dabbe me, header ke saath', () => {
  it('Google ki table ki pehli row header ban jaati hai', () => {
    const out = wrapTables(GOOGLE_TABLE)

    expect(out).toMatch(/<div class="tblw">/)
    expect((out.match(/<th[\s>]/g) || []).length).toBe(2)
    expect(out).toContain('<th><p>Nights</p></th>')
    /** ⚠️ Data row `<td>` hi rehni chahiye. */
    expect(out).toContain('<td><p>2N</p></td>')
  })

  it('Google ka toota hua khaali <tbody> hat jaata hai', () => {
    /** Wo `<tr>` ke **andar** aata hai — browser ko khud sudharna padta hai. */
    expect(wrapTables(GOOGLE_TABLE)).not.toMatch(/<tbody>\s*<\/tbody>/)
  })

  it('client ki apni table chhui nahi jaati', () => {
    const out = wrapTables(CLIENT_TABLE)

    /** Pehle se `<th>` hai, to pehli row waise ki waisi. */
    expect((out.match(/<th[\s>]/g) || []).length).toBe(2)
    expect(out).toContain('<td>1</td>')
  })

  it('pehle se lipti hui table dobara nahi lipat-ti', () => {
    /** Do wrapper matlab do border, ek doosre ke andar (D-90 §5). */
    expect((wrapTables(CLIENT_TABLE).match(/tblw/g) || []).length).toBe(1)
  })

  it('bina table wali HTML waisi ki waisi rehti hai', () => {
    const html = '<p>Just words.</p><ul><li>One</li></ul>'

    expect(wrapTables(html)).toBe(html)
  })
})

describe('markedBlocks — wo design blocks jo doc me likhe hi nahi ja sakte', () => {
  it('Note: se callout banta hai, bold hissa uska heading', () => {
    const out = markedBlocks('<p>Note: <strong>Rule of thumb</strong> One night is a stop.</p>')

    expect(out).toMatch(/<div class="callout">/)
    expect(out).toContain('<b>Rule of thumb</b>')
    expect(out).toContain('<p>One night is a stop.</p>')
    expect(out).toMatch(/<svg/)
  })

  it('Warning: se laal wala callout banta hai', () => {
    const out = markedBlocks('<p>Warning: <strong>Careful</strong> Never do this.</p>')

    expect(out).toMatch(/class="callout callout--w"/)
    expect(out).toContain('<b>Careful</b>')
  })

  it('Quote: se pull quote banta hai', () => {
    const out = markedBlocks('<p>Quote: Nobody wishes they spent longer on a ferry.</p>')

    expect(out).toMatch(/<div class="pullq"><p>Nobody wishes/)
  })

  it('nishaan khud bold likha ho to bhi chalta hai', () => {
    /** Writer aksar poori line bold kar deta hai. */
    const out = markedBlocks('<p><strong>Note:</strong> <strong>Title</strong> Body text.</p>')

    expect(out).toMatch(/<div class="callout">/)
    expect(out).toContain('<b>Title</b>')
  })

  it('bina bold ke sirf body banti hai — heading nahi', () => {
    /** D-30: adhoora bhara hua khaali dikhe, toota hua nahi. */
    const out = markedBlocks('<p>Note: Just a plain reminder.</p>')

    expect(out).toMatch(/<div class="callout">/)
    expect(out).not.toContain('<b>')
    expect(out).toContain('<p>Just a plain reminder.</p>')
  })

  it('saada paragraph chhua nahi jaata', () => {
    const html = '<p>Nothing special here.</p>'

    expect(markedBlocks(html)).toBe(html)
  })

  it('beech me likha "note:" nishaan nahi banta', () => {
    /** ⚠️ Nishaan sirf paragraph ke **shuru** me chalta hai. */
    const html = '<p>Please note: this is not a callout.</p>'

    expect(markedBlocks(html)).toBe(html)
  })
})

describe('leadParagraph — pehla paragraph bada', () => {
  it('pehle paragraph ko .lead milta hai, doosre ko nahi', () => {
    const out = leadParagraph('<p>First one.</p><p>Second one.</p>')

    expect(out).toBe('<p class="lead">First one.</p><p>Second one.</p>')
  })

  it('image wala paragraph chhod diya jaata hai', () => {
    /** Reference me bhi `.lead` figure ke **baad** aata hai. */
    const out = leadParagraph('<p><img src="/a.webp"></p><p>The real lead.</p>')

    expect(out).toContain('<p><img src="/a.webp"></p>')
    expect(out).toContain('<p class="lead">The real lead.</p>')
  })

  it('khaali paragraph chhod diya jaata hai', () => {
    const out = leadParagraph('<p></p><p>Real text.</p>')

    expect(out).toBe('<p></p><p class="lead">Real text.</p>')
  })

  it('heading se shuru hone wale article pe bhi pehla paragraph hi lead hai', () => {
    const out = leadParagraph('<h2>Title</h2><p>Body.</p>')

    expect(out).toBe('<h2>Title</h2><p class="lead">Body.</p>')
  })
})
