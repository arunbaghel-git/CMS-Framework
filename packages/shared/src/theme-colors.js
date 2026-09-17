/**
 * Site ke rang — **Settings ▸ Colours** (client, 17 Sep; reference `admin-design-v4.html`).
 *
 * Client sirf **6 rang** chunta hai. Site pe ~40 rang ke token hain (`apps/web/app/globals.css` `:root`);
 * baaki sab inhi 6 se **apne aap** bante hain. Kuch alag chahiye to **Advanced** me us ek cheez ka Auto
 * hatao — sirf wahi badalti hai.
 *
 * ## Ek hi jagah — admin aur site dono yahi padhte hain
 *
 * Admin ka preview aur Auto swatch, aur site ka `<style>` — dono `themeColorVars()` se. Do jagah
 * formula likhne ka matlab hota ki preview kuch dikhata aur site kuch aur chhapti (D-65 wala sabak).
 *
 * ## ⚠️ Default = theme ke apne rang, aur jo nahi badla wo emit hi nahi hota
 *
 * `THEME_COLOR_DEFAULTS` **wahi value hain jo `globals.css` ke `:root` me likhi hain.** Kisi group ka
 * base rang default ke barabar ho to uske token **bheje hi nahi jaate** — CSS ka apna hand-tuned shade
 * chalta rehta hai. Isliye:
 *
 * - is site pe pehli baar Save dabane se **look nahi badalta** (derived shade CSS ke shade se thode alag hain)
 * - client jo rang **badalta hai**, sirf usi ke shade formula se bante hain
 *
 * `globals.css` ke `:root` me in 6 me se koi value badlo to yahan bhi badlo — test dono ko milata hai.
 */

/** Theme ke rang — `globals.css` `:root` jaise. Admin ka "Reset to Defaults" yahi. */
export const THEME_COLOR_DEFAULTS = Object.freeze({
  primary: '#1668ae', // Store Colour — `--blue-600`
  accent: '#f4701c', // `--orange-500`
  heading: '#111d2b', // `--ink`
  body: '#4a5a6d', // `--body`
  page: '#ffffff', // `--surface`
  dark: '#0b2b4a', // `--blue-900`
})

export const THEME_BASE_COLOR_KEYS = Object.freeze(Object.keys(THEME_COLOR_DEFAULTS))

/**
 * Advanced — har ek ka default **Auto**. Admin me label ke saath (UI English, R17).
 * Kram wahi jo screen pe hai.
 */
export const THEME_ADVANCED_COLORS = Object.freeze([
  { key: 'btnPrimaryBg', group: 'Primary button', label: 'Background' },
  { key: 'btnPrimaryText', group: 'Primary button', label: 'Text' },
  { key: 'btnPrimaryHoverBg', group: 'Primary button', label: 'Hover background' },
  { key: 'btnPrimaryHoverText', group: 'Primary button', label: 'Hover text' },
  { key: 'btnSecondaryBg', group: 'Secondary button', label: 'Background' },
  { key: 'btnSecondaryText', group: 'Secondary button', label: 'Text' },
  { key: 'btnSecondaryHoverBg', group: 'Secondary button', label: 'Hover background' },
  { key: 'btnSecondaryHoverText', group: 'Secondary button', label: 'Hover text' },
  { key: 'btnOutline', group: 'Outline button', label: 'Border & text' },
  { key: 'muted', group: 'Text', label: 'Small grey text' },
  { key: 'border', group: 'Text', label: 'Border lines' },
  { key: 'headerBg', group: 'Header & Footer', label: 'Header background' },
  { key: 'headerText', group: 'Header & Footer', label: 'Header text' },
  { key: 'footerBg', group: 'Header & Footer', label: 'Footer background' },
  { key: 'footerText', group: 'Header & Footer', label: 'Footer text' },
  { key: 'card', group: 'Cards', label: 'Card background' },
  { key: 'star', group: 'Status', label: 'Rating stars' },
  { key: 'success', group: 'Status', label: 'Success' },
  { key: 'error', group: 'Status', label: 'Error' },
])

export const THEME_ADVANCED_COLOR_KEYS = Object.freeze(THEME_ADVANCED_COLORS.map((c) => c.key))

export const THEME_HEADING_KEYS = Object.freeze(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

// ── rang ka hisaab ──────────────────────────────────────────────────────────

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const toHex = (rgb) =>
  '#' +
  rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')

/** `a` se `b` ki taraf `t` (0–1) — sRGB me, wahi jo CSS `color-mix(in srgb)` karta hai. */
export function mixColors(a, b, t) {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}

const WHITE = '#ffffff'
const BLACK = '#000000'

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Is background pe padhne layak text — gehre pe safed, halke pe gehra. */
export function readableOn(hex) {
  return luminance(hex) > 0.45 ? '#111827' : WHITE
}

/** Khaali, galat ya kam-zyada keys — sab saaf karke poora object. Purana/aadha data kabhi crash na kare. */
export function normalizeThemeColors(input) {
  const src = input && typeof input === 'object' ? input : {}
  const pick = (v, fallback) =>
    typeof v === 'string' && HEX_COLOR_RE.test(v) ? v.toLowerCase() : fallback

  const base = Object.fromEntries(
    THEME_BASE_COLOR_KEYS.map((k) => [k, pick(src[k], THEME_COLOR_DEFAULTS[k])]),
  )

  const advanced = {}
  for (const k of THEME_ADVANCED_COLOR_KEYS) {
    const v = pick(src.advanced?.[k], null)
    if (v) advanced[k] = v
  }

  const perHeading = src.perHeading === true
  const headings = Object.fromEntries(
    THEME_HEADING_KEYS.map((h) => [h, pick(src.headings?.[h], base.heading)]),
  )

  return { ...base, perHeading, headings, advanced }
}

/**
 * Advanced ki ek cheez ka **Auto** rang — admin ka swatch isi ko dikhata hai jab tak Auto laga hai.
 * @param {string} key
 * @param {ReturnType<typeof normalizeThemeColors>} c
 */
export function autoThemeColor(key, c) {
  const accentHover = mixColors(c.accent, BLACK, 0.12)
  const primaryHover = mixColors(c.primary, BLACK, 0.18)

  switch (key) {
    case 'btnPrimaryBg':
      return c.accent
    case 'btnPrimaryText':
      return readableOn(c.accent)
    case 'btnPrimaryHoverBg':
      return accentHover
    case 'btnPrimaryHoverText':
      return readableOn(accentHover)
    case 'btnSecondaryBg':
      return c.primary
    case 'btnSecondaryText':
      return readableOn(c.primary)
    case 'btnSecondaryHoverBg':
      return primaryHover
    case 'btnSecondaryHoverText':
      return readableOn(primaryHover)
    case 'btnOutline':
      return primaryHover
    case 'muted':
      return mixColors(c.body, c.page, 0.3)
    case 'border':
      return mixColors(c.body, c.page, 0.84)
    case 'headerBg':
      return c.page
    case 'headerText':
      return mixColors(c.heading, c.page, 0.12)
    case 'footerBg':
      return c.dark
    case 'footerText':
      return readableOn(c.dark)
    case 'card':
      return c.page
    case 'star':
      return '#f5a623'
    case 'success':
      return '#0f8a4d'
    case 'error':
      return '#d92d3c'
    default:
      return null
  }
}

/** Advanced ki value — set hai to wahi, warna Auto. */
export function resolveThemeColor(key, c) {
  return c.advanced[key] ?? autoThemeColor(key, c)
}

const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase()

/**
 * Site ke CSS variables — **sirf wo jo badle hain** (upar ka ⚠️ note).
 *
 * @param {object} input settings.themeColors (kachcha ya normalized)
 * @returns {Record<string, string>} `{ '--blue-600': '#…', … }`
 */
export function themeColorVars(input) {
  const c = normalizeThemeColors(input)
  const d = THEME_COLOR_DEFAULTS
  const vars = {}
  const set = (name, value) => (vars[name] = value)

  if (!same(c.primary, d.primary)) {
    const P = c.primary
    set('--blue-600', P)
    set('--accent', P)
    set('--blue-500', mixColors(P, WHITE, 0.15))
    set('--blue-700', mixColors(P, BLACK, 0.18))
    set('--blue-100', mixColors(P, WHITE, 0.88))
    set('--blue-50', mixColors(P, WHITE, 0.94))
    set('--on-dark-link', mixColors(P, WHITE, 0.55))
    set('--on-dark-eyebrow', mixColors(P, WHITE, 0.6))
    set('--on-dark-eyebrow-2', mixColors(P, WHITE, 0.75))
    set('--offer-grad-end', mixColors(P, WHITE, 0.08))
    set('--widget-icon', P)
    set('--widget-icon-bg', mixColors(P, WHITE, 0.92))
  }

  if (!same(c.accent, d.accent)) {
    const A = c.accent
    set('--orange-500', A)
    set('--orange-600', mixColors(A, BLACK, 0.12))
    set('--orange-700', mixColors(A, BLACK, 0.28))
    set('--orange-400', mixColors(A, WHITE, 0.25))
    set('--accent-glow', mixColors(A, WHITE, 0.28))
    set('--orange-100', mixColors(A, WHITE, 0.88))
    set('--orange-150', mixColors(A, WHITE, 0.8))
    set('--orange-50', mixColors(A, WHITE, 0.95))
    set('--on-dark-accent', mixColors(A, WHITE, 0.6))
    set('--on-dark-price', mixColors(A, WHITE, 0.7))
  }

  if (!same(c.heading, d.heading)) {
    set('--ink', c.heading)
    set('--ink-2', mixColors(c.heading, c.page, 0.12))
  }

  /** Body ke halke shade page ki taraf ghulte hain — isliye page badle to ye bhi dobara bante hain. */
  if (!same(c.body, d.body) || !same(c.page, d.page)) {
    set('--body', c.body)
    set('--muted', mixColors(c.body, c.page, 0.3))
    set('--faint', mixColors(c.body, c.page, 0.5))
    set('--line', mixColors(c.body, c.page, 0.84))
    set('--line-2', mixColors(c.body, c.page, 0.9))
    set('--slate-500', mixColors(c.body, c.page, 0.2))
    set('--slate-200', mixColors(c.body, c.page, 0.86))
    set('--slate-100', mixColors(c.body, c.page, 0.93))
  }

  if (!same(c.page, d.page)) {
    set('--surface', c.page)
    set('--tint', mixColors(c.page, c.primary, 0.04))
  }

  if (!same(c.dark, d.dark)) {
    set('--blue-900', c.dark)
    set('--shade', mixColors(c.dark, BLACK, 0.3))
    set('--scrim', mixColors(c.dark, BLACK, 0.45))
    set('--navy-overlay', mixColors(c.dark, BLACK, 0.15))
    set('--on-dark', readableOn(c.dark))
  }

  /** Advanced — sirf jo client ne khud set kiya (Auto hataya). Auto wale upar ke groups se chalte hain. */
  const ADV = {
    btnPrimaryBg: '--btn-p-bg',
    btnPrimaryText: '--btn-p-text',
    btnPrimaryHoverBg: '--btn-p-hover-bg',
    btnPrimaryHoverText: '--btn-p-hover-text',
    btnSecondaryBg: '--btn-s-bg',
    btnSecondaryText: '--btn-s-text',
    btnSecondaryHoverBg: '--btn-s-hover-bg',
    btnSecondaryHoverText: '--btn-s-hover-text',
    btnOutline: '--btn-o',
    muted: '--muted',
    border: '--line',
    headerBg: '--header-bg',
    headerText: '--header-text',
    footerBg: '--footer-bg',
    footerText: '--footer-text',
    card: '--card',
    star: '--gold',
    success: '--green-600',
    error: '--red-500',
  }
  for (const [key, name] of Object.entries(ADV)) if (c.advanced[key]) set(name, c.advanced[key])

  if (c.perHeading) for (const h of THEME_HEADING_KEYS) set(`--${h}-c`, c.headings[h])

  return vars
}

/**
 * `<style>` ke andar jaane wala CSS. Values upar hex se guzar chuki hain — koi aur akshar yahan
 * pahunch hi nahi sakta, isliye ye `customCss` jaisi `</style` wali chinta nahi rakhta.
 *
 * `html:root` — `:root` se ek darja zyada specific, taaki `globals.css` ka `:root` (jo `<head>` me kahin
 * bhi load ho) kram ki wajah se jeet na jaaye. Client ki Custom CSS iske **baad** aati hai.
 */
export function themeColorCss(input) {
  const vars = themeColorVars(input)
  const body = Object.entries(vars)
    .filter(([, v]) => HEX_COLOR_RE.test(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  return body ? `html:root{${body}}` : ''
}
