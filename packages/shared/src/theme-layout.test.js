import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { THEME_LAYOUT_DEFAULTS, normalizeThemeLayout, themeLayoutCss } from './theme-layout.js'

const css = readFileSync(
  fileURLToPath(new URL('../../../apps/web/app/globals.css', import.meta.url)),
  'utf8',
)

/** `:root` ki pehli line jo `name: value;` hai */
function token(name) {
  const line = css.split('\n').find((l) => l.trim().startsWith(`${name}:`))
  return line
    ?.trim()
    .slice(name.length + 1)
    .replace(/;.*$/, '')
    .trim()
}

describe('Settings ▸ Layout (theme-layout)', () => {
  it('kuch na badla ho to CSS khaali — is site pe koi farak nahi', () => {
    expect(themeLayoutCss({})).toBe('')
    expect(themeLayoutCss({ ...THEME_LAYOUT_DEFAULTS })).toBe('')
  })

  it('defaults globals.css ke :root se milte hain', () => {
    const d = THEME_LAYOUT_DEFAULTS
    expect(token('--wrap')).toBe(`${d.wrap}px`)
    expect(token('--pad')).toBe(`${d.pad}px`)
    expect(token('--btn-h')).toBe(`${d.btnHeight}px`)
    expect(token('--header-h')).toBe(`${d.headerH}px`)
    expect(token('--logo-h')).toBe(`${d.logoH}px`)
    expect(token('--logo-h-m')).toBe(`${d.logoHMobile}px`)
    expect(token('--foot-logo-h')).toBe(`${d.footLogoH}px`)
    expect(token('--foot-logo-h-m')).toBe(`${d.footLogoHMobile}px`)
    // "soft" kone = aaj ke --r1..r4
    expect([token('--r1'), token('--r2'), token('--r3'), token('--r4')]).toEqual([
      '6px',
      '10px',
      '14px',
      '20px',
    ])
    // mobile pad — ≤760 wale media block me
    const m760 = css.slice(css.indexOf('@media (max-width: 760px)'))
    expect(m760.slice(0, 80)).toContain(`--pad: ${d.padMobile}px`)
  })

  it('side space badla — desktop, tablet (beech ka) aur mobile teeno', () => {
    const out = themeLayoutCss({ pad: 30, padMobile: 14 })
    expect(out).toContain('html:root{--pad:30px}')
    expect(out).toContain('@media (max-width:1024px){html:root{--pad:22px}}')
    expect(out).toContain('@media (max-width:760px){html:root{--pad:14px}}')
  })

  it('logo header se bada nahi — header − 16 pe ruk jaata hai', () => {
    expect(themeLayoutCss({ logoH: 90 })).toContain('--logo-h:48px')
    expect(themeLayoutCss({ headerH: 90, logoH: 70 })).toContain('--logo-h:70px')
  })

  it('desktop header badla to mobile ki apni value bhi likhi jaati hai', () => {
    const out = themeLayoutCss({ headerH: 80 })
    expect(out).toContain('--header-h:80px')
    expect(out).toContain('--header-h-m:64px')
  })

  it('sticky band — header relative, sidebar aur scroll offset header ke bina', () => {
    const out = themeLayoutCss({ sticky: false })
    expect(out).toContain('--header-pos:relative')
    expect(out).toContain('--sticky-top:14px')
    expect(out).toContain('--scroll-offset:26px')
  })

  it('footer logo ka safed dabba band, pill button, sharp kone', () => {
    const out = themeLayoutCss({ footLogoCard: false, btnShape: 'pill', corners: 'sharp' })
    expect(out).toContain('--foot-card-bg:transparent')
    expect(out).toContain('--btn-r:999px')
    expect(out).toContain('--r2:2px')
  })

  it('galat/hadd ke bahar ka data normalize pe theek — CSS me kabhi text nahi', () => {
    const l = normalizeThemeLayout({ wrap: 99999, pad: 'x', corners: '}</style>', sticky: 'yes' })
    expect(l.wrap).toBe(1600)
    expect(l.pad).toBe(THEME_LAYOUT_DEFAULTS.pad)
    expect(l.corners).toBe('soft')
    expect(l.sticky).toBe(true)
    expect(themeLayoutCss({ corners: '}</style>' })).toBe('')
  })
})
