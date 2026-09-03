import { describe, expect, it } from 'vitest'

import { docUrlsFromSheet, parseCsv } from './csv.js'

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
