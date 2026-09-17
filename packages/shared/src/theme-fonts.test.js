import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  FONT_SCALE_STEPS,
  defaultThemeFonts,
  normalizeThemeFonts,
  slotFamily,
  themeFontCss,
} from './theme-fonts.js'

const css = readFileSync(
  fileURLToPath(new URL('../../../apps/web/app/globals.css', import.meta.url)),
  'utf8',
)

describe('Settings ▸ Fonts (theme-fonts)', () => {
  it('kuch na badla ho to CSS khaali — Inter aur aaj ke naap waise hi', () => {
    expect(themeFontCss({})).toBe('')
    expect(themeFontCss(defaultThemeFonts())).toBe('')
  })

  it('globals.css ka har --fs-* token kisi ek step me hai — koi chhoota nahi, koi do baar nahi', () => {
    const all = [...css.matchAll(/^\s*(--fs-[a-z0-9-]+):/gm)].map((m) => m[1])
    const used = FONT_SCALE_STEPS.flatMap((s) => s.tokens)
    expect(all.filter((t) => !used.includes(t))).toEqual([])
    expect(used.filter((t) => !all.includes(t))).toEqual([])
    expect(new Set(used).size).toBe(used.length)
  })

  it('H2 badla — us step ke saare token teen naap pe, aur h2 tag ka weight/line/spacing', () => {
    const fonts = defaultThemeFonts()
    fonts.scale.h2 = { size: 30, sizeTablet: 26, sizeMobile: 22, weight: '700', lh: 1.2, ls: 0 }
    const out = themeFontCss(fonts)

    expect(out).toContain('--fs-section:30px')
    expect(out).toContain('--fs-h2:30px')
    expect(out).toContain('@media (max-width:1024px){html:root{--fs-section:26px')
    expect(out).toContain('@media (max-width:767px){html:root{--fs-section:22px')
    expect(out).toContain('--h2-w:700')
    expect(out).toContain('--h2-lh:1.2')
    // doosre step ke token nahi
    expect(out).not.toContain('--fs-hero-title')
  })

  it('custom font — @font-face apni site ke URL se, heading token', () => {
    const fonts = defaultThemeFonts()
    fonts.heading = {
      source: 'custom',
      family: 'Gilroy',
      files: [
        { url: '/uploads/sites/default/fonts/custom/abc.woff2', weight: '700', style: 'normal' },
      ],
    }
    const out = themeFontCss(fonts)
    expect(out).toContain(
      '@font-face{font-family:"Gilroy";src:url(/uploads/sites/default/fonts/custom/abc.woff2) format("woff2");font-weight:700;font-style:normal;font-display:swap}',
    )
    expect(out).toContain('--font-heading:"Gilroy", var(--font)')
    expect(out).not.toContain('--font:')
  })

  it('Google font bina downloaded faces ke — kuch nahi (browser fallback jhootha "badla hua" dikhata)', () => {
    const fonts = defaultThemeFonts()
    fonts.body = { source: 'google', google: 'Poppins', faces: [] }
    expect(slotFamily(normalizeThemeFonts(fonts).body)).toBeNull()
    expect(themeFontCss(fonts)).toBe('')

    fonts.body.faces = [
      {
        url: '/uploads/sites/default/fonts/google/poppins/x.woff2',
        weight: '100 900',
        unicodeRange: 'U+0000-00FF',
      },
    ]
    const out = themeFontCss(fonts)
    expect(out).toContain('font-weight:100 900')
    expect(out).toContain('unicode-range:U+0000-00FF')
    expect(out).toContain(`--font:'RupeeLocal', "Poppins"`)
  })

  it('CSS me ghusane ki koshish — naam, URL, range sab gir jaate hain', () => {
    const out = themeFontCss({
      heading: {
        source: 'custom',
        family: 'X";}</style><script>',
        files: [{ url: 'https://evil.com/x.woff2' }],
      },
      body: {
        source: 'google',
        google: 'Poppins',
        faces: [{ url: '/uploads/a.woff2', unicodeRange: 'U+0;}body{display:none' }],
      },
    })
    expect(out).not.toContain('evil')
    expect(out).not.toContain('</style')
    expect(out).not.toContain('display:none')
  })
})
