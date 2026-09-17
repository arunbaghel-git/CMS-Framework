import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  THEME_COLOR_DEFAULTS,
  autoThemeColor,
  mixColors,
  normalizeThemeColors,
  readableOn,
  themeColorCss,
  themeColorVars,
} from './theme-colors.js'

describe('Settings ▸ Colours (theme-colors)', () => {
  it('kuch na badla ho to ek bhi variable nahi — is site ka look Save se nahi badalta', () => {
    expect(themeColorVars({})).toEqual({})
    expect(themeColorVars(null)).toEqual({})
    expect(themeColorVars({ ...THEME_COLOR_DEFAULTS })).toEqual({})
    // bade akshar wala wahi rang bhi "badla hua" nahi
    expect(themeColorVars({ primary: THEME_COLOR_DEFAULTS.primary.toUpperCase() })).toEqual({})
    expect(themeColorCss({})).toBe('')
  })

  it('THEME_COLOR_DEFAULTS globals.css ke :root se milte hain', () => {
    const css = readFileSync(
      fileURLToPath(new URL('../../../apps/web/app/globals.css', import.meta.url)),
      'utf8',
    )
    const token = (name) => css.match(new RegExp(`^\\s*${name}:\\s*(#[0-9a-fA-F]{3,6});`, 'm'))?.[1]
    const full = (h) => (h.length === 4 ? '#' + [...h.slice(1)].map((x) => x + x).join('') : h)

    expect(full(token('--blue-600'))).toBe(THEME_COLOR_DEFAULTS.primary)
    expect(full(token('--orange-500'))).toBe(THEME_COLOR_DEFAULTS.accent)
    expect(full(token('--ink'))).toBe(THEME_COLOR_DEFAULTS.heading)
    expect(full(token('--body'))).toBe(THEME_COLOR_DEFAULTS.body)
    expect(full(token('--surface'))).toBe(THEME_COLOR_DEFAULTS.page)
    expect(full(token('--blue-900'))).toBe(THEME_COLOR_DEFAULTS.dark)
  })

  it('Store Colour badla — sirf uska group, shade apne aap', () => {
    const vars = themeColorVars({ primary: '#0e7490' })
    expect(vars['--blue-600']).toBe('#0e7490')
    expect(vars['--accent']).toBe('#0e7490')
    expect(vars['--blue-700']).toBe(mixColors('#0e7490', '#000000', 0.18))
    expect(vars['--blue-50']).toBe(mixColors('#0e7490', '#ffffff', 0.94))
    expect(vars['--orange-500']).toBeUndefined()
    expect(vars['--ink']).toBeUndefined()
  })

  it('page badla to body ke halke shade bhi naye page ki taraf', () => {
    const vars = themeColorVars({ page: '#fafaf5' })
    expect(vars['--surface']).toBe('#fafaf5')
    expect(vars['--line']).toBe(mixColors(THEME_COLOR_DEFAULTS.body, '#fafaf5', 0.84))
  })

  it('halka dark section — us pe text gehra ho jaata hai', () => {
    expect(readableOn('#0b2b4a')).toBe('#ffffff')
    expect(readableOn('#f5f5f5')).toBe('#111827')
    expect(themeColorVars({ dark: '#e8eef5' })['--on-dark']).toBe('#111827')
  })

  it('Advanced: Auto wala emit nahi, set kiya hua hi', () => {
    const c = normalizeThemeColors({ advanced: { btnPrimaryBg: '#16a34a' } })
    expect(themeColorVars(c)).toEqual({ '--btn-p-bg': '#16a34a' })
    expect(autoThemeColor('btnPrimaryBg', c)).toBe(THEME_COLOR_DEFAULTS.accent)
  })

  it('har heading ka rang sirf checkbox on pe', () => {
    expect(themeColorVars({ headings: { h1: '#ff0000' } })).toEqual({})
    const vars = themeColorVars({ perHeading: true, headings: { h1: '#ff0000' } })
    expect(vars['--h1-c']).toBe('#ff0000')
    expect(vars['--h2-c']).toBe(THEME_COLOR_DEFAULTS.heading)
  })

  it('galat value chup-chaap default pe — CSS me kabhi ghus nahi sakti', () => {
    const css = themeColorCss({
      primary: 'red;}</style><script>',
      accent: '#12',
      advanced: { card: 'url(x)', btnOutline: '#abcdef' },
    })
    expect(css).toBe('html:root{--btn-o:#abcdef}')
  })
})
