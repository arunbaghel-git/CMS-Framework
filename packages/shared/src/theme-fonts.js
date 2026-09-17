/**
 * Site ke fonts — **Settings ▸ Fonts** (client, 17 Sep; reference `admin-design-v4.html` `#t-fonts`).
 *
 * Do hisse:
 *
 * 1. **Font family** — Heading Font (h1–h6) aur Body Font (baaki sab). Google font **server pe download
 *    hokar isi site se** aata hai (`apps/api/src/modules/settings/fonts.js`), custom WOFF/WOFF2 upload hota hai.
 * 2. **Text Sizes** — 9 step. Site pe ~40 size token hain; har token kisi ek step ka hai (`tokens`), aur
 *    step badalne pe us step ke **saare** token ek naap pe aa jaate hain.
 *
 * ## ⚠️ Wahi niyam: jo nahi badla, wo emit nahi hota
 *
 * Step ka default us step ke "pratinidhi" token ka aaj ka naap hai (jaise H2 = `--fs-section`). Jab tak
 * client step na badle, site ke apne alag-alag hand-tuned naap chalte rehte hain. Badla to us step ke
 * saare token desktop/tablet/mobile teen naap pe (clamp ki jagah).
 *
 * ## ⚠️ Weight · line spacing · character spacing sirf asli tags pe
 *
 * Size token-wide hai. Weight/line-height/letter-spacing `h1`–`h6` tags aur `body` pe lagte hain — jo
 * card title `<div>` hai uska weight uski apni CSS se aata hai. Wo alag refactor hai.
 */

export const FONT_WEIGHTS = Object.freeze(['300', '400', '500', '600', '700', '800', '900'])
export const FONT_SOURCES = Object.freeze(['google', 'custom'])
export const FONT_STYLES = Object.freeze(['normal', 'italic'])

/** Aaj ki site ka font (next/font se build pe aata hai). Isse alag family chuni tabhi CSS jaata hai. */
export const DEFAULT_FONT_FAMILY = 'Inter'

/** Google/custom family ka naam — sirf akshar, number, space, hyphen. CSS string me jaata hai. */
export const FONT_FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{0,60}$/

/** Upload/download hui font file ka URL — sirf apni site ka, sirf woff/woff2. */
export const FONT_FILE_URL_RE = /^\/uploads\/[a-z0-9/_.-]+\.woff2?$/

/**
 * 9 step. `tokens` = `globals.css` ke wo `--fs-*` jo is step ke hain; `tag` = kis HTML tag pe weight etc.
 * Default naap us step ke pehle token ke aaj ke desktop / 1024px / 375px naap hain.
 */
export const FONT_SCALE_STEPS = Object.freeze([
  {
    key: 'h1',
    label: 'H1',
    used: 'Hero and page titles, big offer prices',
    family: 'heading',
    tag: 'h1',
    tokens: ['--fs-hero-title', '--fs-title', '--fs-price', '--fs-offer', '--fs-h1'],
    defaults: { size: 40, sizeTablet: 37, sizeMobile: 25, weight: '800', lh: 1.25, ls: -0.8 },
  },
  {
    key: 'h2',
    label: 'H2',
    used: 'Section headings, stats, price boxes, big card titles',
    family: 'heading',
    tag: 'h2',
    tokens: [
      '--fs-section',
      '--fs-display',
      '--fs-price-side',
      '--fs-stat',
      '--fs-card-lg',
      '--fs-price-row',
      '--fs-h2',
    ],
    defaults: { size: 25, sizeTablet: 22.5, sizeMobile: 19, weight: '800', lh: 1.25, ls: -0.5 },
  },
  {
    key: 'h3',
    label: 'H3',
    used: 'Quotes, big numbers',
    family: 'heading',
    tag: 'h3',
    tokens: ['--fs-quote', '--fs-4xl', '--fs-glyph', '--fs-hero-num', '--fs-h3'],
    defaults: { size: 21, sizeTablet: 20.5, sizeMobile: 17, weight: '800', lh: 1.25, ls: -0.4 },
  },
  {
    key: 'h4',
    label: 'H4',
    used: 'Card titles, intro lines',
    family: 'heading',
    tag: 'h4',
    tokens: ['--fs-card-md', '--fs-3xl', '--fs-intro', '--fs-h4'],
    defaults: { size: 17.5, sizeTablet: 15.5, sizeMobile: 15, weight: '800', lh: 1.3, ls: -0.35 },
  },
  {
    key: 'h5',
    label: 'H5',
    used: 'Widget titles, hero sub-lines',
    family: 'heading',
    tag: 'h5',
    tokens: ['--fs-2xl', '--fs-xl', '--fs-hero-sub', '--fs-h5'],
    defaults: { size: 16, sizeTablet: 16, sizeMobile: 16, weight: '800', lh: 1.35, ls: -0.3 },
  },
  {
    key: 'h6',
    label: 'H6',
    used: 'Smallest headings',
    family: 'heading',
    tag: 'h6',
    tokens: ['--fs-md', '--fs-h6'],
    defaults: { size: 13.5, sizeTablet: 13.5, sizeMobile: 13.5, weight: '800', lh: 1.4, ls: -0.3 },
  },
  {
    key: 'body',
    label: 'Body',
    used: 'Paragraphs, lists, forms, buttons',
    family: 'body',
    tag: 'body',
    tokens: ['--fs-base', '--fs-lg', '--fs-body', '--fs-lead'],
    defaults: { size: 14, sizeTablet: 14, sizeMobile: 14, weight: '400', lh: 1.55, ls: 0 },
  },
  {
    key: 'small',
    label: 'Small',
    used: 'Meta lines, notes, breadcrumb, footer links',
    family: 'body',
    tag: null,
    tokens: ['--fs-sm', '--fs-xs', '--fs-2xs'],
    defaults: { size: 13, sizeTablet: 13, sizeMobile: 13, weight: '400', lh: 1.5, ls: 0 },
  },
  {
    key: 'xsmall',
    label: 'Extra small',
    used: 'Badges, chips, labels',
    family: 'body',
    tag: null,
    tokens: [
      '--fs-3xs',
      '--fs-4xs',
      '--fs-5xs',
      '--fs-6xs',
      '--fs-7xs',
      '--fs-card-label',
      '--fs-badge-label',
    ],
    defaults: { size: 11, sizeTablet: 11, sizeMobile: 11, weight: '600', lh: 1.4, ls: 0 },
  },
])

export const FONT_SCALE_KEYS = Object.freeze(FONT_SCALE_STEPS.map((s) => s.key))

export const FONT_SIZE_LIMITS = Object.freeze({ size: [8, 120], lh: [0.8, 3], ls: [-5, 20] })

const emptySlot = () => ({
  source: 'google',
  google: DEFAULT_FONT_FAMILY,
  family: '',
  files: [],
  faces: [],
})

/** Poora default — admin ka "Reset to Defaults". */
export function defaultThemeFonts() {
  return {
    heading: emptySlot(),
    body: emptySlot(),
    scale: Object.fromEntries(FONT_SCALE_STEPS.map((s) => [s.key, { ...s.defaults }])),
  }
}

const clamp = (v, [min, max], fallback) => {
  const n = Number(v)
  return v !== '' && v !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function normalizeFile(f) {
  if (!f || typeof f !== 'object' || !FONT_FILE_URL_RE.test(String(f.url ?? ''))) return null
  return {
    url: f.url,
    name: String(f.name ?? '').slice(0, 120),
    weight: FONT_WEIGHTS.includes(String(f.weight)) ? String(f.weight) : '400',
    style: FONT_STYLES.includes(f.style) ? f.style : 'normal',
  }
}

/** Server ki download ki hui Google faces — weight range ho sakta hai (`100 900`). */
function normalizeFace(f) {
  if (!f || typeof f !== 'object' || !FONT_FILE_URL_RE.test(String(f.url ?? ''))) return null
  const weight = String(f.weight ?? '400')
  const range = String(f.unicodeRange ?? '')
  return {
    url: f.url,
    weight: /^\d{3}( \d{3})?$/.test(weight) ? weight : '400',
    style: FONT_STYLES.includes(f.style) ? f.style : 'normal',
    unicodeRange: /^[U+0-9A-Fa-f?, -]{1,2000}$/.test(range) ? range : '',
  }
}

function normalizeSlot(src) {
  const s = src && typeof src === 'object' ? src : {}
  const google = String(s.google ?? '').trim()
  const family = String(s.family ?? '').trim()
  return {
    source: FONT_SOURCES.includes(s.source) ? s.source : 'google',
    google: FONT_FAMILY_RE.test(google) ? google : DEFAULT_FONT_FAMILY,
    family: FONT_FAMILY_RE.test(family) ? family : '',
    files: (Array.isArray(s.files) ? s.files : []).map(normalizeFile).filter(Boolean).slice(0, 12),
    faces: (Array.isArray(s.faces) ? s.faces : []).map(normalizeFace).filter(Boolean).slice(0, 40),
  }
}

/** Kachcha/aadha/purana data → poora. Kabhi throw nahi karta. */
export function normalizeThemeFonts(input) {
  const src = input && typeof input === 'object' ? input : {}
  const scale = {}
  for (const step of FONT_SCALE_STEPS) {
    const v = src.scale?.[step.key] ?? {}
    const d = step.defaults
    scale[step.key] = {
      size: clamp(v.size, FONT_SIZE_LIMITS.size, d.size),
      sizeTablet: clamp(v.sizeTablet, FONT_SIZE_LIMITS.size, d.sizeTablet),
      sizeMobile: clamp(v.sizeMobile, FONT_SIZE_LIMITS.size, d.sizeMobile),
      weight: FONT_WEIGHTS.includes(String(v.weight)) ? String(v.weight) : d.weight,
      lh: clamp(v.lh, FONT_SIZE_LIMITS.lh, d.lh),
      ls: clamp(v.ls, FONT_SIZE_LIMITS.ls, d.ls),
    }
  }
  return { heading: normalizeSlot(src.heading), body: normalizeSlot(src.body), scale }
}

/**
 * Slot ka font-family naam jo CSS me jaayega — `null` = aaj ka default (next/font Inter), kuch mat bhejo.
 *
 * Google: Inter ke alawa koi bhi, **aur tabhi jab server uski files download kar chuka ho** (`faces`).
 * Bina faces ke naam bhejne ka matlab hota browser ka apna fallback — client ko lagta font badla hi nahi.
 */
export function slotFamily(slot) {
  if (slot.source === 'custom') return slot.family && slot.files.length ? slot.family : null
  if (slot.google === DEFAULT_FONT_FAMILY) return null
  return slot.faces.length ? slot.google : null
}

const px = (n) => `${Math.round(n * 100) / 100}px`
const sameStep = (a, b) =>
  a.size === b.size &&
  a.sizeTablet === b.sizeTablet &&
  a.sizeMobile === b.sizeMobile &&
  a.weight === b.weight &&
  a.lh === b.lh &&
  a.ls === b.ls

/**
 * Site ka font CSS — `@font-face` + `html:root{…}` + tablet/mobile ke `@media`. Sirf badla hua.
 * Har value upar regex/number se guzar chuki hai.
 */
export function themeFontCss(input) {
  const f = normalizeThemeFonts(input)
  const root = {}
  const tablet = {}
  const mobile = {}
  const faces = []

  for (const key of ['heading', 'body']) {
    const slot = f[key]
    const family = slotFamily(slot)
    if (!family) continue

    const list = slot.source === 'custom' ? slot.files : slot.faces
    for (const face of list) {
      const format = face.url.endsWith('.woff2') ? 'woff2' : 'woff'
      const range = face.unicodeRange ? `;unicode-range:${face.unicodeRange}` : ''
      faces.push(
        `@font-face{font-family:"${family}";src:url(${face.url}) format("${format}");` +
          `font-weight:${face.weight};font-style:${face.style};font-display:swap${range}}`,
      )
    }

    if (key === 'heading') root['--font-heading'] = `"${family}", var(--font)`
    else {
      root['--font'] =
        `'RupeeLocal', "${family}", -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    }
  }

  for (const step of FONT_SCALE_STEPS) {
    const v = f.scale[step.key]
    if (sameStep(v, step.defaults)) continue

    for (const token of step.tokens) {
      root[token] = px(v.size)
      tablet[token] = px(v.sizeTablet)
      mobile[token] = px(v.sizeMobile)
    }
    if (step.tag) {
      root[`--${step.tag}-w`] = v.weight
      root[`--${step.tag}-lh`] = String(v.lh)
      root[`--${step.tag}-ls`] = px(v.ls)
    }
  }

  const block = (vars) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')

  const out = [...new Set(faces)]
  if (Object.keys(root).length) out.push(`html:root{${block(root)}}`)
  if (Object.keys(tablet).length) out.push(`@media (max-width:1024px){html:root{${block(tablet)}}}`)
  if (Object.keys(mobile).length) out.push(`@media (max-width:767px){html:root{${block(mobile)}}}`)
  return out.join('')
}
