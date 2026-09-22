import { describe, expect, it } from 'vitest'

import { csvCell, docUrlsFromSheet, parseCsv, seoRowsFromSheet } from './csv.js'

describe('parseCsv', () => {
  it('saada CSV padhta hai', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('quote ke andar wala comma field nahi todta', () => {
    // Yahi wo case hai jiske liye `split(',')` chhoda gaya
    expect(parseCsv('url,status\nhttps://x,"Done, published"')).toEqual([
      ['url', 'status'],
      ['https://x', 'Done, published'],
    ])
  })

  it('`""` ko ek asli quote samajhta hai', () => {
    expect(parseCsv('a\n"He said ""hi"""')).toEqual([['a'], ['He said "hi"']])
  })

  it('quote ke andar newline row nahi todti', () => {
    expect(parseCsv('a,b\n"line1\nline2",x')).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ])
  })

  it('CRLF pe khaali row nahi banati', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('Excel ka BOM header ko kharaab nahi karta', () => {
    expect(parseCsv(String.fromCharCode(0xfeff) + 'Doc File,Status')[0][0]).toBe('Doc File')
  })

  it('poori khaali rows gira deta hai', () => {
    expect(parseCsv('a\n\n\nb')).toEqual([['a'], ['b']])
  })
})

describe('docUrlsFromSheet', () => {
  const rows = (csv) => parseCsv(csv)

  it('client ki asli sheet se URL nikaalta hai', () => {
    const { urls, warnings } = docUrlsFromSheet(
      rows(
        'Doc File,Status,Published URL\nhttps://docs.google.com/document/d/A/edit,,\nhttps://docs.google.com/document/d/B/edit,,',
      ),
    )

    expect(urls).toEqual([
      'https://docs.google.com/document/d/A/edit',
      'https://docs.google.com/document/d/B/edit',
    ])
    expect(warnings).toEqual([])
  })

  it('column aage-peeche ho jaaye to bhi naam se dhoondh leta hai', () => {
    // Position pe tikne ka matlab hota ki `Status` doc ka URL samajh liya jaata
    const { urls } = docUrlsFromSheet(
      rows('Status,Published URL,Doc File\n,,https://docs.google.com/document/d/A/edit'),
    )

    expect(urls).toEqual(['https://docs.google.com/document/d/A/edit'])
  })

  it('header ka case aur space maaf karta hai', () => {
    const { urls } = docUrlsFromSheet(rows('  DOC FILE ,Status\nhttps://x,'))

    expect(urls).toEqual(['https://x'])
  })

  it('header na ho to pehla column leta hai — par chup nahi rehta', () => {
    const { urls, warnings } = docUrlsFromSheet(rows('https://a\nhttps://b'))

    expect(urls).toEqual(['https://a', 'https://b'])
    expect(warnings.join(' ')).toContain('first column')
  })

  it('khaali sheet pe saaf jawab deta hai', () => {
    expect(docUrlsFromSheet([])).toEqual({ urls: [], warnings: ['The sheet is empty'] })
  })

  it('sirf header ho aur koi link na ho to batata hai', () => {
    const { urls, warnings } = docUrlsFromSheet(rows('Doc File,Status,Published URL'))

    expect(urls).toEqual([])
    expect(warnings.join(' ')).toContain('No document links')
  })
})

describe('csvCell', () => {
  it('quotes lagata hai aur andar ke quote double karta hai', () => {
    expect(csvCell('plain')).toBe('"plain"')
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""')
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })

  it('formula banne wali value ke aage quote lagta hai — CSV injection', () => {
    for (const evil of ['=1+1', '+A1', '-2', '@SUM(A1)']) {
      expect(csvCell(evil)).toBe(`"'${evil}"`)
    }
  })
})

describe('seoRowsFromSheet', () => {
  const rows = (text) => parseCsv(text)

  it('column naam se milte hain, position se nahi', () => {
    const { rows: out, warnings } = seoRowsFromSheet(
      rows(
        [
          'Type,Meta Description,Page URL,SEO Title',
          'Package,Ferry timings and prices,/packages/x,Andaman 5N',
        ].join('\n'),
      ),
    )

    expect(warnings).toEqual([])
    expect(out).toEqual([
      { url: '/packages/x', title: 'Andaman 5N', description: 'Ferry timings and prices' },
    ])
  })

  it('Meta Title aur SEO Description bhi chalte hain', () => {
    const { rows: out } = seoRowsFromSheet(rows('URL,Meta Title,SEO Description\n/a,T,D'))

    expect(out).toEqual([{ url: '/a', title: 'T', description: 'D' }])
  })

  it('saada Title / Description column **nahi** maana jaata', () => {
    const { rows: out, warnings } = seoRowsFromSheet(rows('Page URL,Title,Description\n/a,T,D'))

    /**
     * Page ka apna `Title` column aam hai — use SEO Title maan lena **har page ka title** badal
     * deta. Yahan dono maane hue column gayab hain, yaani import karne ko kuch hai hi nahi.
     */
    expect(out).toEqual([])
    expect(warnings[0]).toMatch(/nothing to import/)
  })

  it('Page URL ka column na ho to kuch nahi hota', () => {
    const { rows: out, warnings } = seoRowsFromSheet(rows('SEO Title,Meta Description\nT,D'))

    expect(out).toEqual([])
    expect(warnings[0]).toMatch(/No "Page URL" column/)
  })

  it('sirf Meta Description ka column ho to Title chhua hi nahi jaata', () => {
    const { rows: out, warnings } = seoRowsFromSheet(rows('Page URL,Meta Description\n/a,D'))

    expect(out).toEqual([{ url: '/a', title: null, description: 'D' }])
    expect(warnings).toEqual(['No "SEO Title" column — titles were left as is'])
  })

  it('dono me se koi column na ho to import ka matlab hi nahi', () => {
    const { rows: out, warnings } = seoRowsFromSheet(rows('Page URL,Type\n/a,Package'))

    expect(out).toEqual([])
    expect(warnings[0]).toMatch(/nothing to import/)
  })

  it('khaali sheet aur sirf header wali sheet dono batati hain', () => {
    expect(seoRowsFromSheet([]).warnings).toEqual(['The sheet is empty'])
    expect(seoRowsFromSheet(rows('Page URL,SEO Title,Meta Description')).warnings).toEqual([
      'The sheet has a header but no rows',
    ])
  })

  it('cell ke aage-peeche ki jagah hat jaati hai', () => {
    const { rows: out } = seoRowsFromSheet(rows('Page URL,SEO Title\n"  /a  ","  T  "'))

    expect(out).toEqual([{ url: '/a', title: 'T', description: null }])
  })
})
