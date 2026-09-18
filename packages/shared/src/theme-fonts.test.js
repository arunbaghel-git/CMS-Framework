import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  FONT_FIXED_TOKENS,
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

  it('globals.css ka har --fs-* token kisi step me ya fixed list me — koi chhoota nahi, koi do baar nahi', () => {
    // :root ke @media blocks me wahi token dobara aate hain — ginti ek baar
    const all = [...new Set([...css.matchAll(/^\s*(--fs-[a-z0-9-]+):/gm)].map((m) => m[1]))]
    const used = [...FONT_SCALE_STEPS.flatMap((s) => s.tokens), ...FONT_FIXED_TOKENS]
    expect(all.filter((t) => !used.includes(t))).toEqual([])
    expect(used.filter((t) => !all.includes(t))).toEqual([])
    expect(new Set(used).size).toBe(used.length)
  })

  it('H2 badla — sirf section heading ka token, teen naap pe, aur h2 tag ka weight/line/spacing', () => {
    const fonts = defaultThemeFonts()
    fonts.scale.h2 = { size: 30, sizeTablet: 26, sizeMobile: 22, weight: '700', lh: 1.2, ls: 0 }
    const out = themeFontCss(fonts)

    expect(out).toContain('--fs-h2:30px')
    expect(out).toContain('@media (max-width:1024px){html:root{--fs-h2:26px')
    expect(out).toContain('@media (max-width:767px){html:root{--fs-h2:22px')
    expect(out).toContain('--h2-w:700')
    expect(out).toContain('--h2-lh:1.2')
    // doosre step ke token nahi
    expect(out).not.toContain('--fs-h1')
    expect(out).not.toContain('--fs-h3')
  })

  it('H1–H3 ke defaults globals.css ke common heading naap se milte hain (desktop · tablet · mobile)', () => {
    const root = (name) => Number(css.match(new RegExp(`^  ${name}: ([0-9.]+)px;`, 'm'))?.[1])
    const inMedia = (width, name) => {
      const start = css.indexOf(`@media (max-width: ${width}px) {\n  :root {`)
      const block = css.slice(start, css.indexOf('\n}', start))
      return Number(block.match(new RegExp(`${name}: ([0-9.]+)px;`))?.[1])
    }
    const d = (key) => FONT_SCALE_STEPS.find((s) => s.key === key).defaults

    for (const key of ['h1', 'h2']) {
      expect(root(`--fs-${key}`)).toBe(d(key).size)
      expect(inMedia(1024, `--fs-${key}`)).toBe(d(key).sizeTablet)
      expect(inMedia(767, `--fs-${key}`)).toBe(d(key).sizeMobile)
    }
    expect(root('--fs-h3')).toBe(d('h3').size)
    // text ke teen common naap (18 Sep)
    expect(root('--fs-body')).toBe(d('body').size)
    expect(root('--fs-small')).toBe(d('small').size)
    expect(root('--fs-xsmall')).toBe(d('xsmall').size)
  })

  it('Small ka weight/line/spacing badla — unke variable jaate hain (tag nahi, key se)', () => {
    const fonts = defaultThemeFonts()
    fonts.scale.small = {
      size: 13,
      sizeTablet: 13,
      sizeMobile: 13,
      weight: '600',
      lh: 1.4,
      ls: 0.2,
    }
    const out = themeFontCss(fonts)
    // size nahi badla — wo nahi jaata
    expect(out).not.toContain('--fs-small')
    expect(out).toContain('--small-w:600')
    expect(out).toContain('--small-lh:1.4')
    expect(out).toContain('--small-ls:0.2px')
  })

  it('sirf size badla — weight/line/spacing ke variable nahi jaate (rules ke apne weight bache rahein)', () => {
    const fonts = defaultThemeFonts()
    fonts.scale.h3 = { ...fonts.scale.h3, size: 18, sizeTablet: 18, sizeMobile: 17 }
    const out = themeFontCss(fonts)
    expect(out).toContain('--fs-h3:18px')
    expect(out).not.toContain('--h3-w')
    expect(out).not.toContain('--h3-lh')
    expect(out).not.toContain('--h3-ls')
  })

  it('globals.css ka har weight/line/spacing jo level-size rule me hai, us level ke variable ke peeche', () => {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const blocks = [...clean.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1])
    const LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'small', 'xsmall']
    let checked = 0
    for (const b of blocks) {
      const lv = (b.match(/font-size:\s*var\(--fs-([a-z0-9]+)\)/) || [])[1]
      if (!LEVELS.includes(lv)) continue
      for (const m of b.matchAll(/(font-weight|line-height|letter-spacing):\s*([^;]+);/g)) {
        expect(m[2].startsWith(`var(--${lv}-`), m[0]).toBe(true)
        checked++
      }
    }
    // ~290 declaration — koi naya rule bina variable ke juda to yahi test pakdega
    expect(checked).toBeGreaterThan(250)
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
