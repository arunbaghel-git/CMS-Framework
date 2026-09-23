import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `On this post` / `On this page` — 1024px tak article ke upar band patti (client, 23 Sep).
 *
 * Guard CSS + JSX padh kar, `popup-form.test.js` jaisa: is kaam ka sabse aasan tootan ye hai ki
 * patti aur sidebar wala TOC **alag breakpoint** pe badlein — tab ek beech ki width pe TOC do jagah
 * dikhta ya kahin nahi.
 */
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const read = (path) => strip(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))

const css = read('../../app/globals.css')
const toc = read('./Toc.jsx')
const post = read('./PostPage.jsx')
const page = read('../page/TextPage.jsx')
const sidebar = read('../tour/Sidebar.jsx')

/** `@media (max-width: 1024px) { … }` ka wo block jisme `.tocm` hai. */
const tabletBlock = (() => {
  const re = /@media \(max-width: 1024px\)/g
  for (let m; (m = re.exec(css)); ) {
    let depth = 0
    for (let i = css.indexOf('{', m.index); i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) {
        const block = css.slice(m.index, i + 1)
        if (block.includes('.tocm')) return block
        break
      }
    }
  }
  return ''
})()

describe('TOC ki patti — 1024px tak article ke upar, band (client, 23 Sep)', () => {
  it('patti native <details> hai aur band khulti hai (open attribute nahi)', () => {
    expect(toc).toContain('<details className="tocm"')
    expect(toc).not.toMatch(/<details[^>]*\sopen/)
  })

  it('link chunne pe patti band hoti hai', () => {
    expect(toc).toContain("removeAttribute('open')")
  })

  it('desktop pe patti chhupi, 1024px tak dikhti', () => {
    expect(css).toMatch(/\n\.tocm \{\s*display: none;/)
    expect(tabletBlock, '.tocm ka 1024px block nahi mila').not.toBe('')
    expect(tabletBlock).toMatch(/\.tocm \{\s*display: block;/)
  })

  /** Wahi breakpoint jahan `.pgl` ek column hota hai — dono ek saath badlein. */
  it('usi breakpoint pe sidebar wala TOC aur sirf-TOC wala sidebar chhupta hai', () => {
    expect(tabletBlock).toMatch(
      /\.pgl__side \.wdg--toc,\s*\.pgl__side--toconly \{\s*display: none;/,
    )
    expect(toc).toContain('className="wdg wdg--toc"')
    expect(sidebar).toContain('pgl__side--toconly')
  })

  it('post aur page dono pe patti article se pehle', () => {
    for (const src of [post, page]) {
      const bar = src.indexOf('variant="bar"')
      expect(bar).toBeGreaterThan(-1)
      expect(bar).toBeLessThan(src.indexOf('<article'))
    }
  })
})

describe('TOC ki list ke bullet (client, 23 Sep)', () => {
  /** Reset sirf `.wdg__b ul` pe tha — patti (`.tocm__b`) me bullet aa gaye the. Ab `.toc` pe khud. */
  it('.toc apna list-style reset rakhta hai, kisi dabbe pe nirbhar nahi', () => {
    expect(css).toMatch(/\n\.toc \{\s*list-style: none;/)
  })
})
