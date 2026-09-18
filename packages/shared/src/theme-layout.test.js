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

  it('Spacing ke defaults globals.css ke tokens se milte hain', () => {
    const d = THEME_LAYOUT_DEFAULTS
    expect(token('--space-section')).toBe(
      `clamp(${d.spaceSectionMobile}px, 3.4vw, ${d.spaceSection}px)`,
    )
    expect(token('--space-block')).toBe(`clamp(${d.spaceBlockMobile}px, 2.8vw, ${d.spaceBlock}px)`)
    expect(token('--gap-card-row')).toBe(`${d.cardGapRow}px`)
    expect(token('--gap-card-col')).toBe(`${d.cardGapCol}px`)
  })

  it('Section spacing badla — sirf --space-section, dono sire, beech ka hissa aaj ki chaudai pe', () => {
    const out = themeLayoutCss({ spaceSection: 60, spaceSectionMobile: 30 })
    expect(out).toBe(
      'html:root{--space-section:clamp(30px, calc(30px + (100vw - 820px) * 0.0566), 60px)}',
    )
  })

  it('Block spacing badla — single content ka andar ka gap anupaat me saath', () => {
    const out = themeLayoutCss({ spaceBlock: 48 })
    expect(out).toContain('--space-block:clamp(22px, calc(22px + (100vw - 790px) * 0.04561), 48px)')
    // 48 × 32/38 = 40
    expect(out).toContain(
      '--space-block-in:clamp(22px, calc(22px + (100vw - 850px) * 0.04737), 40px)',
    )
    expect(out).not.toContain('--space-section')
  })

  it('desktop aur mobile barabar — seedha px, clamp nahi', () => {
    expect(themeLayoutCss({ spaceSection: 40, spaceSectionMobile: 40 })).toBe(
      'html:root{--space-section:40px}',
    )
  })

  it('Cards gap — row aur column alag, sirf badla hua', () => {
    expect(themeLayoutCss({ cardGapRow: 20 })).toBe('html:root{--gap-card-row:20px}')
    expect(themeLayoutCss({ cardGapCol: 8 })).toBe('html:root{--gap-card-col:8px}')
  })

  it('har card grid Cards gap ke token pe — koi seedha likha gap nahi bacha', () => {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const GRIDS = [
      '.atg',
      '.inx',
      '.catbar__g',
      '.sim',
      '.rev__track',
      '.prows',
      '.dgrid',
      '.bpg',
      '.pn',
      '.feat',
      '.feat__side',
      '.ic__grid',
      '.vrl',
      '.imc',
      '.tmg',
      '.lgg',
      '.ipk',
      '.ofc--grid',
      '.contact-steps .promise',
    ]
    for (const sel of GRIDS) {
      const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const gaps = [...clean.matchAll(new RegExp(`(?:^|\\n)\\s*${esc} \\{([^}]*)\\}`, 'g'))]
        .map((m) => (m[1].match(/(?:^|[;\s])gap:\s*([^;]+);/) || [])[1])
        .filter(Boolean)
      expect(gaps.length, sel).toBeGreaterThan(0)
      for (const g of gaps) expect(g, sel).toBe('var(--gap-card-row) var(--gap-card-col)')
    }
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
