/**
 * Site ka dhaancha — **Settings ▸ Layout** (client, 17 Sep; reference `admin-design-v4.html` `#t-layout`).
 *
 * Chaudai, side ki jagah, sections/blocks ke beech ki jagah, cards gap, kone, shadow, button, header aur
 * logo ke naap. Wahi niyam jo `theme-colors.js`
 * ka hai: **default = `globals.css` ke `:root` ki aaj ki value**, aur jo nahi badla uska CSS bheja hi nahi
 * jaata — is site pe Save dabane se kuch nahi badalta.
 *
 * ⚠️ Breakpoints (1024 / 767) yahan **nahi** — CSS media query me variable nahi chalta. Sab sites ke liye ek.
 */

export const CORNER_STYLES = Object.freeze(['sharp', 'soft', 'round'])
export const SHADOW_STYLES = Object.freeze(['none', 'soft', 'strong'])
export const BUTTON_SHAPES = Object.freeze(['corners', 'pill'])

/** `globals.css` `:root` jaise. `0` max width = koi rok nahi (aaj yahi hai). */
export const THEME_LAYOUT_DEFAULTS = Object.freeze({
  wrap: 1280,
  pad: 26,
  padMobile: 20,
  corners: 'soft',
  shadow: 'soft',
  btnHeight: 44,
  btnShape: 'corners',
  sticky: true,
  headerH: 64,
  headerHMobile: 64,
  logoH: 42,
  logoHMobile: 34,
  logoMaxW: 0,
  footLogoH: 42,
  footLogoHMobile: 34,
  footLogoMaxW: 0,
  footLogoCard: true,
  /** Spacing (client, 18 Sep) — `--space-section` / `--space-block` ke clamp ke dono sire */
  spaceSection: 46,
  spaceSectionMobile: 28,
  spaceBlock: 38,
  spaceBlockMobile: 22,
  cardGapRow: 14,
  cardGapCol: 14,
})

/** Har number ki hadd — schema aur normalize dono yahi padhte hain. */
export const THEME_LAYOUT_LIMITS = Object.freeze({
  /** 1200 se kam nahi — 1100 pe is site ka header menu Awards aur Get quote ke neeche dab gaya tha (17 Sep, render se dekha) */
  wrap: [1200, 1600],
  pad: [0, 80],
  padMobile: [0, 40],
  btnHeight: [32, 64],
  headerH: [48, 140],
  headerHMobile: [48, 120],
  logoH: [16, 124],
  logoHMobile: [16, 104],
  logoMaxW: [0, 480],
  footLogoH: [16, 120],
  footLogoHMobile: [16, 100],
  footLogoMaxW: [0, 480],
  spaceSection: [0, 160],
  spaceSectionMobile: [0, 120],
  spaceBlock: [0, 120],
  spaceBlockMobile: [0, 80],
  cardGapRow: [0, 60],
  cardGapCol: [0, 60],
})

/**
 * Aaj ke clamp ka dhalaan — `clamp(28px, 3.4vw, 46px)` 820px pe 28 aur 1350px pe 46 hota hai. Admin
 * sire badle to beech ka hissa **isi chaudai pe** chadhta hai, taaki site ka bartaav wahi rahe.
 * Single content ka andar ka gap (`--space-block-in`) Block spacing ke anupaat me: 22→22, 38→32.
 */
const RAMP = {
  section: [820, 1350],
  block: [790, 1360],
  blockIn: [850, 1230],
}
const BLOCK_IN_RATIO = 32 / 38

/** `clamp(min, fluid, max)` — mobile width pe `mobile`, ramp ke aakhir se `desktop`. */
function fluid(desktop, mobile, [from, to]) {
  if (desktop === mobile) return `${desktop}px`
  const slope = Number(((desktop - mobile) / (to - from)).toFixed(5))
  const lo = Math.min(desktop, mobile)
  const hi = Math.max(desktop, mobile)
  return `clamp(${lo}px, calc(${mobile}px + (100vw - ${from}px) * ${slope}), ${hi}px)`
}

/** Kone — `soft` aaj ki site hai (`--r1..r4`). `sharp` me `--r2` 2px, taaki `calc(var(--r2) - 2px)` 0 bane, negative nahi. */
const RADII = {
  sharp: { '--r1': '0px', '--r2': '2px', '--r3': '2px', '--r4': '2px' },
  soft: { '--r1': '6px', '--r2': '10px', '--r3': '14px', '--r4': '20px' },
  round: { '--r1': '10px', '--r2': '16px', '--r3': '22px', '--r4': '30px' },
}

const SHADOWS = {
  none: { '--sh-1': 'none', '--sh-2': 'none', '--sh-3': 'none', '--sh-4': 'none' },
  strong: {
    '--sh-1': '0 2px 4px rgb(17 29 43 / 10%)',
    '--sh-2': '0 2px 6px rgb(17 29 43 / 12%), 0 10px 24px -6px rgb(17 29 43 / 22%)',
    '--sh-3': '0 14px 40px -10px rgb(17 29 43 / 35%)',
    '--sh-4': '0 28px 64px -18px rgb(11 43 74 / 45%)',
  },
}

/** Logo header se bada nahi — upar-neeche 8px ki jagah. */
export const logoLimit = (headerH) => Math.max(16, headerH - 16)

/** Kachcha/aadha/purana data → poora, hadd ke andar. Kabhi throw nahi karta. */
export function normalizeThemeLayout(input) {
  const src = input && typeof input === 'object' ? input : {}
  const d = THEME_LAYOUT_DEFAULTS
  const num = (k) => {
    const v = Number(src[k])
    if (!Number.isFinite(v)) return d[k]
    const [min, max] = THEME_LAYOUT_LIMITS[k]
    return Math.round(Math.min(max, Math.max(min, v)))
  }
  const oneOf = (k, list) => (list.includes(src[k]) ? src[k] : d[k])
  const bool = (k) => (typeof src[k] === 'boolean' ? src[k] : d[k])

  return {
    wrap: num('wrap'),
    pad: num('pad'),
    padMobile: num('padMobile'),
    corners: oneOf('corners', CORNER_STYLES),
    shadow: oneOf('shadow', SHADOW_STYLES),
    btnHeight: num('btnHeight'),
    btnShape: oneOf('btnShape', BUTTON_SHAPES),
    sticky: bool('sticky'),
    headerH: num('headerH'),
    headerHMobile: num('headerHMobile'),
    logoH: num('logoH'),
    logoHMobile: num('logoHMobile'),
    logoMaxW: num('logoMaxW'),
    footLogoH: num('footLogoH'),
    footLogoHMobile: num('footLogoHMobile'),
    footLogoMaxW: num('footLogoMaxW'),
    footLogoCard: bool('footLogoCard'),
    spaceSection: num('spaceSection'),
    spaceSectionMobile: num('spaceSectionMobile'),
    spaceBlock: num('spaceBlock'),
    spaceBlockMobile: num('spaceBlockMobile'),
    cardGapRow: num('cardGapRow'),
    cardGapCol: num('cardGapCol'),
  }
}

/**
 * Site ka CSS — sirf badle hue naap. Teen hisse ho sakte hain: `html:root{…}`, mobile/tablet ke
 * `@media` blocks, aur `html{scroll-padding-top}` (sticky band ho to).
 *
 * Har value upar number/enum se guzar chuki hai — koi text CSS me nahi pahunchta.
 */
export function themeLayoutCss(input) {
  const l = normalizeThemeLayout(input)
  const d = THEME_LAYOUT_DEFAULTS
  const root = {}
  const tablet = {}
  const mobile760 = {}

  if (l.wrap !== d.wrap) root['--wrap'] = `${l.wrap}px`

  /** `globals.css` me --pad teen jagah hai: desktop 26, ≤1024 23, ≤760 20. Tablet dono ke beech. */
  if (l.pad !== d.pad || l.padMobile !== d.padMobile) {
    root['--pad'] = `${l.pad}px`
    tablet['--pad'] = `${Math.round((l.pad + l.padMobile) / 2)}px`
    mobile760['--pad'] = `${l.padMobile}px`
  }

  if (l.corners !== d.corners) Object.assign(root, RADII[l.corners])
  if (l.shadow !== d.shadow) Object.assign(root, SHADOWS[l.shadow])

  if (l.btnHeight !== d.btnHeight) root['--btn-h'] = `${l.btnHeight}px`
  if (l.btnShape === 'pill') root['--btn-r'] = '999px'

  if (l.headerH !== d.headerH) root['--header-h'] = `${l.headerH}px`
  /** CSS me mobile ka default desktop wala hai — desktop badla to mobile ki apni value bhi likho, warna wo peeche chal padti */
  if (l.headerHMobile !== d.headerHMobile || l.headerH !== d.headerH) {
    root['--header-h-m'] = `${l.headerHMobile}px`
  }

  const logoH = Math.min(l.logoH, logoLimit(l.headerH))
  const logoHMobile = Math.min(l.logoHMobile, logoLimit(l.headerHMobile))
  if (logoH !== d.logoH) root['--logo-h'] = `${logoH}px`
  if (logoHMobile !== d.logoHMobile) root['--logo-h-m'] = `${logoHMobile}px`
  if (l.logoMaxW > 0) root['--logo-max-w'] = `${l.logoMaxW}px`

  if (l.footLogoH !== d.footLogoH) root['--foot-logo-h'] = `${l.footLogoH}px`
  if (l.footLogoHMobile !== d.footLogoHMobile) root['--foot-logo-h-m'] = `${l.footLogoHMobile}px`
  if (l.footLogoMaxW > 0) root['--foot-logo-max-w'] = `${l.footLogoMaxW}px`
  if (!l.footLogoCard) {
    root['--foot-card-bg'] = 'transparent'
    root['--foot-card-pad'] = '0px'
  }

  if (l.spaceSection !== d.spaceSection || l.spaceSectionMobile !== d.spaceSectionMobile) {
    root['--space-section'] = fluid(l.spaceSection, l.spaceSectionMobile, RAMP.section)
  }
  if (l.spaceBlock !== d.spaceBlock || l.spaceBlockMobile !== d.spaceBlockMobile) {
    root['--space-block'] = fluid(l.spaceBlock, l.spaceBlockMobile, RAMP.block)
    root['--space-block-in'] = fluid(
      Math.round(l.spaceBlock * BLOCK_IN_RATIO),
      l.spaceBlockMobile,
      RAMP.blockIn,
    )
  }
  if (l.cardGapRow !== d.cardGapRow) root['--gap-card-row'] = `${l.cardGapRow}px`
  if (l.cardGapCol !== d.cardGapCol) root['--gap-card-col'] = `${l.cardGapCol}px`

  /** Header saath nahi chalta — sidebar aur "On this page" ko uske liye jagah nahi chhodni. */
  if (!l.sticky) {
    root['--header-pos'] = 'relative'
    root['--sticky-top'] = '14px'
    root['--scroll-offset'] = '26px'
  }

  const block = (vars) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')

  const out = []
  if (Object.keys(root).length) out.push(`html:root{${block(root)}}`)
  if (Object.keys(tablet).length) out.push(`@media (max-width:1024px){html:root{${block(tablet)}}}`)
  if (Object.keys(mobile760).length)
    out.push(`@media (max-width:760px){html:root{${block(mobile760)}}}`)
  return out.join('')
}
