import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { telHref, waHref } from '../lib/links.js'

/**
 * `FloatingContact` khud React component hai aur is repo me theme ke components ka koi
 * render test nahi hai (sirf `lib/` ke pure functions test hote hain). Par iska sabse
 * aasan tootan **CSS me** hai, JSX me nahi — isliye guard wahin lagta hai.
 *
 * Wahi tark jo D-92 §10 pe liya gaya tha: jo cheez sirf render pe chalti hai use aisi jagah
 * rakho jahan uska test likha ja sake. Yahan CSS file seedha padhi ja rahi hai — `theme-fonts`
 * aur `theme-layout` ke tests pehle se yahi karte hain.
 */
const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8')

/**
 * Har `@media (max-width: 760px) { … }` block, jod kar.
 *
 * ⚠️ Aise block `globals.css` me **ek se zyada** hain (har section apne paas likhta hai),
 * isliye sirf pehla uthana galat jawab deta hai — ye test likhte waqt wahi hua tha.
 */
const mobileBlocks = (() => {
  const out = []
  const re = /@media \(max-width: 760px\)/g
  for (let m; (m = re.exec(css)); ) {
    let depth = 0
    for (let i = css.indexOf('{', m.index); i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) {
        out.push(css.slice(m.index, i + 1))
        break
      }
    }
  }
  return out
})()

const mobileCss = mobileBlocks.join('\n')

describe('Desktop ke floating contact buttons (.float)', () => {
  it('reference wali jagah pe hai — fixed, neeche daayein, .mobar ke peeche', () => {
    expect(css).toMatch(/\.float\s*\{/)
    // Reference: position:fixed; right:16px; bottom:16px; z-index:95
    const block = css.slice(css.search(/\.float\s*\{/))
    const rule = block.slice(0, block.indexOf('}'))
    expect(rule).toContain('position: fixed')
    expect(rule).toContain('right: 16px')
    expect(rule).toContain('bottom: 16px')
    /** z-index ka kram reference se: .float 95 < .mobar 96 — patti hamesha upar */
    expect(rule).toContain('z-index: 95')
  })

  it('Left wala vikalp `right` ko wapas auto karta hai', () => {
    /**
     * ⚠️ Sirf `left: 16px` likhna kaafi nahi — `.float` pe `right: 16px` pehle se hai aur
     * dono set reh jaane se button khinch kar poori chaudai le leta. Ye galti dikhti bhi
     * tabhi hai jab koi Left chun kar page khole.
     */
    const at = css.search(/\.float--left\s*\{/)
    expect(at).toBeGreaterThan(-1)
    const rule = css.slice(at, css.indexOf('}', at))
    expect(rule).toContain('left: 16px')
    expect(rule).toContain('right: auto')
  })

  it('760px se neeche .float chhup jaata hai aur .mobar aa jaati hai — dono kabhi ek saath nahi', () => {
    /**
     * Ye is feature ka sabse asli invariant hai. Dono ek hi number ke buttons dikhate hain;
     * ek saath dikhne ka matlab hai phone pe WhatsApp do jagah. Reference me bhi theek yahi
     * ek line hai (`.sidetab,.float{display:none}`).
     */
    expect(mobileBlocks.length).toBeGreaterThan(0)
    expect(mobileCss).toMatch(/\.float\s*\{\s*display:\s*none/)
    expect(mobileCss).toMatch(/\.mobar\s*\{\s*display:\s*grid/)
  })

  it('dono rang token se aate hain, hardcoded nahi (D-98)', () => {
    const wa = css.slice(css.search(/\.f-wa\s*\{/))
    expect(wa.slice(0, wa.indexOf('}'))).toContain('var(--wa)')
    const ph = css.slice(css.search(/\.f-ph\s*\{/))
    expect(ph.slice(0, ph.indexOf('}'))).toContain('var(--blue-600)')
  })
})

describe('Floating buttons ke href — wahi helper jo baaki jagah hai', () => {
  /**
   * Component `lib/links.js` use karta hai, apna `digits` nahi likhta. Ye test us faisle ko
   * pakka karta hai: `wa.me` ko `+` nahi chahiye, `tel:` ko chahiye.
   */
  it('space wale number dono jagah theek bante hain', () => {
    expect(telHref('+91 98100 66496')).toBe('tel:+919810066496')
    expect(waHref('+91 98100 66496')).toBe('https://wa.me/919810066496')
  })
})
