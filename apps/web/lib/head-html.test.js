import { describe, expect, it } from 'vitest'

import { parseAttrs, splitHeadHtml } from './head-html.js'

/**
 * `splitHeadHtml()` — Integrations ▸ Header ka kachcha HTML → head ke elements (23 Sep, 404 ki CSS).
 * Asli shaklein GA · Pixel · GTM · site verification ki hain, jo client sach me paste karta hai.
 */
describe('splitHeadHtml', () => {
  it('GA — do script, async ke saath, maal jaisa ka taisa', () => {
    const html = `<!-- Google tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-X1&amp;l=dl"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); if (1 < 2) gtag('config', 'G-X1');
</script>`
    const { head, rest } = splitHeadHtml(html)

    expect(rest).toBe('')
    expect(head).toHaveLength(2)
    expect(head[0]).toEqual({
      tag: 'script',
      props: { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-X1&l=dl' },
      html: '',
    })
    expect(head[1].html).toContain("if (1 < 2) gtag('config', 'G-X1');")
  })

  it('meta · link · noscript — void tag ka / aur bina value wala attribute', () => {
    const { head } = splitHeadHtml(
      `<meta name="google-site-verification" content="abc" />
<meta http-equiv="x-ua-compatible" content="ie=edge">
<link rel="preconnect" href="https://x.com" crossorigin>
<noscript><img height="1" width="1" src="https://facebook.com/tr?id=1&ev=PageView"/></noscript>`,
    )

    expect(head.map((el) => el.tag)).toEqual(['meta', 'meta', 'link', 'noscript'])
    expect(head[0].props).toEqual({ name: 'google-site-verification', content: 'abc' })
    expect(head[1].props.httpEquiv).toBe('x-ua-compatible')
    expect(head[2].props).toEqual({ rel: 'preconnect', href: 'https://x.com', crossOrigin: '' })
    expect(head[3].html).toContain('<img height="1"')
  })

  it('head me na chalne wala tag — wahan se aage sab rest me (browser jaisa)', () => {
    const { head, rest } = splitHeadHtml(
      '<meta name="a" content="1"><div class="banner">Hi</div><script>x()</script>',
    )

    expect(head).toHaveLength(1)
    expect(rest).toBe('<div class="banner">Hi</div><script>x()</script>')
  })

  it('khaali, null aur sirf comment — kuch nahi', () => {
    expect(splitHeadHtml('')).toEqual({ head: [], rest: '' })
    expect(splitHeadHtml(null)).toEqual({ head: [], rest: '' })
    expect(splitHeadHtml('  <!-- test -->  ')).toEqual({ head: [], rest: '' })
  })

  it('band na hua script — baaki sab usi ka maal (browser bhi yahi karta)', () => {
    const { head, rest } = splitHeadHtml('<script>var a = 1; <meta name="x">')
    expect(head).toEqual([{ tag: 'script', props: {}, html: 'var a = 1; <meta name="x">' }])
    expect(rest).toBe('')
  })

  it('bade akshar ke tag aur band tag me space', () => {
    const { head } = splitHeadHtml('<SCRIPT type="text/javascript">a()</SCRIPT ><STYLE>b{}</style>')
    expect(head).toEqual([
      { tag: 'script', props: { type: 'text/javascript' }, html: 'a()' },
      { tag: 'style', props: {}, html: 'b{}' },
    ])
  })

  it('client ka dummy test code (22 Sep, asli DB me pada)', () => {
    const { head, rest } = splitHeadHtml(
      '<meta name="test-integration" content="header-ok">\n<script>console.log("integration header ok")</script>',
    )
    expect(head.map((el) => el.tag)).toEqual(['meta', 'script'])
    expect(rest).toBe('')
  })
})

describe('parseAttrs', () => {
  it('teeno quote shaklein, data-*, class → className, entity decode', () => {
    expect(
      parseAttrs(` class="a b" data-id='7' defer id=x title="&quot;hi&quot; &#39;y&#x27;"`),
    ).toEqual({
      className: 'a b',
      'data-id': '7',
      defer: true,
      id: 'x',
      title: `"hi" 'y'`,
    })
  })
})
