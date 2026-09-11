import { describe, expect, it } from 'vitest'

import {
  articleHtml,
  leadParagraph,
  markedBlocks,
  normalizeTable,
  wrapFigures,
  wrapTables,
} from './article-html.js'

/**
 * Article ke design transforms — spec 008 (client, 10–11 Sep).
 *
 * ⚠️ **Ye pehle `Blocks.jsx` ke andar the aur unka koi test nahi tha.** Usi wajah se table ka
 * header do baar galat bana, aur caption `.lead` ban gayi — teeno baar galti live page pe
 * pakdi gayi, test me nahi.
 */

/**
 * Jaisa Google **sach me** bhejta hai — 10 Sep ko asli doc se naapa gaya:
 * `<thead>` hai par cells `<td>`, har cell me `<p>`, har cell pe `colspan="1"`, aur ek toota
 * hua khaali `<tbody>` pehli `<tr>` ke **andar**.
 */
const GOOGLE_TABLE =
  '<table><thead><tr>' +
  '<td colspan="1" rowspan="1"><p>Nights</p></td>' +
  '<td colspan="1" rowspan="1"><p>Covers</p></td>' +
  '<tbody></tbody></tr>' +
  '<tr><td colspan="1" rowspan="1"><p><strong>2N</strong></p></td>' +
  '<td colspan="1" rowspan="1"><p>Short</p><p>Second line</p></td></tr>' +
  '<tr><td colspan="1" rowspan="1"><p>3N</p></td><td colspan="1" rowspan="1"><p>Long</p></td></tr>' +
  '</table>'

/** Client ki apni likhi table — reference ki hoobahoo shakl. */
const CLIENT_TABLE =
  '<div class="tblw"><table class="tbl"><thead><tr><th>A</th><th>B</th></tr></thead>' +
  '<tbody><tr><td>1</td><td>2</td></tr></tbody></table></div>'

describe('normalizeTable — reference ki shakl, pehli row head, baaki body', () => {
  const out = normalizeTable(GOOGLE_TABLE)

  it('poori table reference jaisi dobara banti hai', () => {
    expect(out).toBe(
      '<table class="tbl">' +
        '<thead><tr><th>Nights</th><th>Covers</th></tr></thead>' +
        '<tbody>' +
        '<tr><td><strong>2N</strong></td><td>Short<br>Second line</td></tr>' +
        '<tr><td>3N</td><td>Long</td></tr>' +
        '</tbody></table>',
    )
  })

  it('cell ke andar koi <p> nahi bachta — wahi styling tod raha tha', () => {
    /** Client, 11 Sep: `.art p` ka font-size aur margin cell me lag kar `.tbl td` ko hara deta. */
    expect(out).not.toMatch(/<t[dh][^>]*>\s*<p/i)
  })

  it('sirf pehli row thead me hai, data rows tbody me', () => {
    expect(out.match(/<thead>[\s\S]*<\/thead>/)[0].match(/<tr>/g)).toHaveLength(1)
    expect(out.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g)).toHaveLength(2)
  })

  it('Google ka toota hua khaali <tbody> nahi bachta', () => {
    expect(out).not.toMatch(/<tbody>\s*<\/tbody>/)
  })

  it('colspan="1" gir jaata hai, par asli colspan bachta hai', () => {
    const wide = normalizeTable(
      '<table><tr><td colspan="2"><p>Wide header</p></td></tr>' +
        '<tr><td colspan="1"><p>a</p></td><td rowspan="3"><p>b</p></td></tr></table>',
    )

    expect(wide).toContain('<th colspan="2">Wide header</th>')
    expect(wide).toContain('<td>a</td>')
    expect(wide).toContain('<td rowspan="3">b</td>')
  })

  it('haath se likhi table ka dhaancha chhua nahi jaata', () => {
    /** 11 Sep ko DB me gina: tour page aur do post ki saari tables aisi hi hain. */
    const table = CLIENT_TABLE.replace(/^<div class="tblw">|<\/div>$/g, '')

    expect(normalizeTable(table)).toBe(table)
  })

  it('haath se likhi table me <p> ho to bhi sirf wo khulta hai, dhaancha nahi', () => {
    const out = normalizeTable(
      '<table class="tbl"><thead><tr><th>A</th></tr></thead><tbody><tr><td><p>1</p></td></tr></tbody></table>',
    )

    expect(out).toBe(
      '<table class="tbl"><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
    )
  })

  it('bina class wali <th> table ko class="tbl" milti hai', () => {
    expect(normalizeTable('<table><tr><th>A</th></tr></table>')).toMatch(/^<table class="tbl">/)
  })
})

describe('wrapTables — har table apne dabbe me', () => {
  it('Google ki table dabbe me, reference ki shakl me', () => {
    const out = wrapTables(GOOGLE_TABLE)

    expect(out).toMatch(/^<div class="tblw"><table class="tbl"><thead>/)
    expect((out.match(/<th>/g) || []).length).toBe(2)
  })

  it('client ki apni table bilkul waisi ki waisi', () => {
    expect(wrapTables(CLIENT_TABLE)).toBe(CLIENT_TABLE)
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

describe('wrapFigures — image aur caption ek hi figure me', () => {
  const IMG = '<img alt="A boat" src="/a.webp" />'

  it('image + Caption: → reference jaisa figure', () => {
    const out = wrapFigures(`<p>${IMG}</p><p>Caption: The order you book things in.</p>`)

    expect(out).toBe(
      `<figure class="artfig">${IMG}<figcaption>The order you book things in.</figcaption></figure>`,
    )
  })

  it('caption italic ho to italic hat jaata hai — reference ka caption seedha hai', () => {
    /** Purana guide team ko "italic line likho" bol chuka tha, to italic aana aam hoga. */
    expect(wrapFigures(`<p>${IMG}</p><p><em>Caption: A boat</em></p>`)).toContain(
      '<figcaption>A boat</figcaption>',
    )
    expect(wrapFigures(`<p>${IMG}</p><p>Caption: <em>A boat</em></p>`)).toContain(
      '<figcaption>A boat</figcaption>',
    )
  })

  it('caption ke beech ka bold/link bachta hai', () => {
    expect(wrapFigures(`<p>${IMG}</p><p>Caption: Photo by <strong>Arun</strong></p>`)).toContain(
      '<figcaption>Photo by <strong>Arun</strong></figcaption>',
    )
  })

  it('bina caption ki image bhi figure banti hai', () => {
    expect(wrapFigures(`<p>${IMG}</p><p>Body.</p>`)).toBe(
      `<figure class="artfig">${IMG}</figure><p>Body.</p>`,
    )
  })

  it('image ke neeche saada italic paragraph caption NAHI banta', () => {
    /** ⚠️ Caption sirf nishaan se — andaze se nahi. Warna har italic line caption ban jaati. */
    expect(wrapFigures(`<p>${IMG}</p><p><em>Just an aside.</em></p>`)).toBe(
      `<figure class="artfig">${IMG}</figure><p><em>Just an aside.</em></p>`,
    )
  })

  it('do image lagatar hon to dono figure banti hain', () => {
    /** Ek hi regex me dono kadam karne pe doosri image "kha li" jaati. */
    const out = wrapFigures(`<p>${IMG}</p><p>${IMG}</p><p>Caption: Second</p>`)

    expect((out.match(/<figure class="artfig">/g) || []).length).toBe(2)
    expect(out).toContain('<figcaption>Second</figcaption>')
  })

  it('text ke beech wali image figure nahi banti', () => {
    const html = `<p>See this ${IMG} here.</p>`

    expect(wrapFigures(html)).toBe(html)
  })

  it('haath se likha figure chhua nahi jaata', () => {
    const html = `<figure class="artfig">\n  ${IMG}\n  <figcaption>Own</figcaption>\n</figure><p>Caption: x</p>`

    expect(wrapFigures(html)).toBe(html)
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
    const out = markedBlocks('<p><strong>Note:</strong> <strong>Title</strong> Body text.</p>')

    expect(out).toMatch(/<div class="callout">/)
    expect(out).toContain('<b>Title</b>')
  })

  it('bina bold ke sirf body banti hai — heading nahi', () => {
    const out = markedBlocks('<p>Note: Just a plain reminder.</p>')

    expect(out).toMatch(/<div class="callout">/)
    expect(out).not.toContain('<b>')
  })

  it('saada paragraph chhua nahi jaata', () => {
    const html = '<p>Nothing special here.</p>'

    expect(markedBlocks(html)).toBe(html)
  })

  it('beech me likha "note:" nishaan nahi banta', () => {
    const html = '<p>Please note: this is not a callout.</p>'

    expect(markedBlocks(html)).toBe(html)
  })
})

describe('leadParagraph — pehla asli paragraph bada', () => {
  it('pehle paragraph ko .lead milta hai, doosre ko nahi', () => {
    expect(leadParagraph('<p>First one.</p><p>Second one.</p>')).toBe(
      '<p class="lead">First one.</p><p>Second one.</p>',
    )
  })

  it('image aur khaali paragraph chhod diye jaate hain', () => {
    expect(leadParagraph('<p><img src="/a.webp"></p><p></p><p>The real lead.</p>')).toContain(
      '<p class="lead">The real lead.</p>',
    )
  })

  it('nishaan wala paragraph lead nahi banta', () => {
    /** ⚠️ Warna `Note:` se shuru hone wala article callout banne se reh jaata. */
    const out = leadParagraph('<p>Note: <strong>T</strong> body</p><p>Intro.</p>')

    expect(out).toContain('<p>Note: <strong>T</strong> body</p>')
    expect(out).toContain('<p class="lead">Intro.</p>')
  })

  it('Caption: wala paragraph lead nahi banta', () => {
    expect(leadParagraph('<p>Caption: A boat</p><p>Intro.</p>')).toContain(
      '<p class="lead">Intro.</p>',
    )
  })

  it('heading se shuru hone wale article pe bhi pehla paragraph hi lead hai', () => {
    expect(leadParagraph('<h2>Title</h2><p>Body.</p>')).toBe(
      '<h2>Title</h2><p class="lead">Body.</p>',
    )
  })

  it('content me pehle se lead ho to doosra nahi banta', () => {
    /**
     * ⚠️ Asli bug (10–11 Sep): client ke haath se likhe `/how-to-plan-an-andaman-trip` me
     * `<p class="lead">` pehle se tha, aur page pe **do** lead paragraph dikh rahe the.
     */
    const html =
      '<figure class="artfig"><img src="/a.webp"></figure><p class="lead">Written.</p><p>Second.</p>'

    expect(leadParagraph(html)).toBe(html)
    expect(articleHtml(html).match(/class="lead"/g)).toHaveLength(1)
  })
})

describe('articleHtml — poora kram, jaisa blog post pe chalta hai', () => {
  /**
   * ⚠️ **Caption ka `.lead` ban jaana kram ka bug tha** (client, 11 Sep) — figure banne se pehle
   * lead dhoondha ja raha tha. Ye test asli article ki shuruat jaisi HTML pe chalta hai.
   */
  const START =
    '<p><img alt="" src="/a.webp" /></p>' +
    '<p><em>Caption: The order you book things in decides how much of your trip you spend on a boat.</em></p>' +
    '<p>Most Andaman itineraries fall apart for the same reason.</p>' +
    '<p>Here is the sequence we use.</p>'

  const out = articleHtml(START)

  it('image aur caption ek figure me', () => {
    expect(out).toMatch(
      /^<figure class="artfig"><img alt="" src="\/a\.webp" \/><figcaption>The order you book/,
    )
  })

  it('lead caption nahi, pehla asli paragraph hai', () => {
    expect(out).toContain('<p class="lead">Most Andaman itineraries fall apart')
    expect(out).not.toMatch(/<p class="lead">[^<]*The order you book/)
    expect((out.match(/class="lead"/g) || []).length).toBe(1)
  })

  it('article Note: se shuru ho to bhi callout banta hai, aur lead agla paragraph', () => {
    const noted = articleHtml(
      '<p>Note: <strong>Heads up</strong> Ferries sell out.</p><p>Intro.</p>',
    )

    expect(noted).toMatch(/^<div class="callout">/)
    expect(noted).toContain('<p class="lead">Intro.</p>')
  })

  it('table, figure, callout aur lead sab ek saath', () => {
    const all = articleHtml(
      '<p>Intro.</p>' +
        GOOGLE_TABLE +
        '<p><img src="/b.webp"></p><p>Caption: Jetty</p>' +
        '<p>Warning: <strong>Careful</strong> Book early.</p>',
    )

    expect(all).toContain('<p class="lead">Intro.</p>')
    expect(all).toContain('<div class="tblw"><table class="tbl"><thead><tr><th>Nights</th>')
    expect(all).toContain('<figcaption>Jetty</figcaption>')
    expect(all).toMatch(/class="callout callout--w"/)
  })
})
