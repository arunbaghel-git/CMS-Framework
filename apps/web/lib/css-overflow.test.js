import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Mobile pe page screen se bahar — contact page, client 23 Sep.
 *
 * Jad: `.blk` ka `contain-intrinsic-size: auto 700px`. Us property me **ek value dono axis** pe lagti hai,
 * to render na hua har block 700px chauda maana jaata tha, aur `.secpg` grid ka column usi tak phail kar
 * 375px ke phone pe `scrollWidth` 758 kar deta tha. Headless Chrome se naapa, fix ke baad 375.
 */
const css = readFileSync(
  fileURLToPath(new URL('../app/globals.css', import.meta.url)),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')

describe('page ki chaudai — content-visibility ka andaza sirf ooonchai ka', () => {
  it('ek-value wala contain-intrinsic-size kahin nahi (wo chaudai bhi deta hai)', () => {
    expect(css).not.toMatch(/contain-intrinsic-size\s*:/)
    expect(css).toMatch(/contain-intrinsic-block-size:\s*auto 700px/)
  })

  it('.secpg ke bachche min-width 0 — .pgl__main jaisa pehra', () => {
    expect(css).toMatch(/\n\.secpg > \* \{\s*min-width: 0;/)
    expect(css).toMatch(/\n\.pgl__main > \* \{\s*min-width: 0;/)
  })
})
