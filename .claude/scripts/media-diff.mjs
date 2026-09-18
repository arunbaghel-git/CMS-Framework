import fs from 'node:fs'

/**
 * Reference aur hamari CSS ke **@media blocks** ka milaan.
 *
 * `css-diff.mjs` jaan-boojh kar media blocks ko hata deti hai — wo sirf desktop ka milaan
 * karti hai. Isliye responsive ka poora hissa ab tak kisi check me aaya hi nahi, aur
 * breakpoints chup-chaap alag ho gaye.
 *
 * Ye script teen sawaal ka jawab deti hai:
 *
 *   1. reference ka koi selector kis width pe badalta hai, aur hamara kis width pe
 *   2. reference me kaunsa responsive rule hai jo hamare paas **hai hi nahi**
 *   3. hamare paas kaunsa rule hai jiski reference me koi jodi nahi
 *
 * Sirf un selectors pe dekhti hai jo hamari CSS me **sach me maujood** hain (top-level ya
 * media me) — reference ke un pages ke selectors se shor nahi machati jo hamare paas hain
 * hi nahi (`.hawards`, `.vrail`, `.clogos` wagairah).
 *
 * chalao:
 *   node .claude/scripts/media-diff.mjs                          # package page
 *   node .claude/scripts/media-diff.mjs <reference.html> [...our.css]
 *
 * Doosra argument se aage jitni bhi CSS files do, wo **jod kar** ek maani jaati hain.
 * Public theme ek hi file hai (`globals.css`), par admin ki CSS `styles/`, `components/`
 * aur `screens/` me bant-ti hai — bina is list ke admin ka milaan ho hi nahi sakta tha.
 */

const REF_FILE = process.argv[2] ?? '.claude/docs/reference/itinerary-v3.html'
const OUR_FILES = process.argv.length > 3 ? process.argv.slice(3) : ['apps/web/app/globals.css']

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** `{ prop: value }` — ek rule ka body. */
function decls(body) {
  const out = {}
  for (const part of body.split(';')) {
    const i = part.indexOf(':')
    if (i < 0) continue
    const prop = part.slice(0, i).trim()
    const value = part
      .slice(i + 1)
      .trim()
      .replace(/\s+/g, ' ')
    if (prop) out[prop] = value
  }
  return out
}

/** Ek CSS text me se saare rules — `{selector: {prop: value}}`. */
function rules(css) {
  const out = {}
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) {
    const sel = m[1].trim()
    if (!sel || sel.startsWith('@')) continue
    const d = decls(m[2])
    for (const one of sel.split(',')) {
      const key = one.trim().replace(/\s+/g, ' ')
      if (!key) continue
      out[key] = { ...(out[key] ?? {}), ...d }
    }
  }
  return out
}

/**
 * `{ maxWidth: {selector: {prop: value}} }`.
 *
 * Sirf `max-width` wale blocks — dono file mobile-last likhi gayi hain, aur `min-width` ya
 * feature queries (`prefers-reduced-motion`) is milaan ka hissa nahi hain.
 */
function mediaBlocks(css) {
  css = stripComments(css)
  const out = {}
  const re = /@media\s*\(\s*max-width:\s*(\d+)px\s*\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g
  let m
  while ((m = re.exec(css))) {
    const w = Number(m[1])
    const r = rules(m[2])
    out[w] = out[w] ?? {}
    for (const [sel, d] of Object.entries(r)) {
      out[w][sel] = { ...(out[w][sel] ?? {}), ...d }
    }
  }
  return out
}

/** Media ke bahar wale rules — "ye selector hamare theme me hai ya nahi" ke liye. */
function topLevel(css) {
  css = stripComments(css).replace(/@media[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
  return rules(css)
}

const refHtml = fs.readFileSync(REF_FILE, 'utf8')
const refCss = [...refHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
const ourCss = OUR_FILES.map((f) => fs.readFileSync(f, 'utf8')).join('\n')

const refMedia = mediaBlocks(refCss)
const ourMedia = mediaBlocks(ourCss)

/**
 * Hamara "vocabulary" — har selector jo hamari CSS kahin bhi use karti hai.
 *
 * Iske bina output me reference ke doosre pages ke sections bhar jaate hain aur asli
 * mismatch dikhna band ho jaata hai.
 */
const ourSelectors = new Set([
  ...Object.keys(topLevel(ourCss)),
  ...Object.values(ourMedia).flatMap((b) => Object.keys(b)),
])

/** `.gal a` → `.gal button` jaisa rename (D-66). Milaan se pehle normalize. */
const RENAMED = { '.gal a': '.gal button', '.gal a:hover img': '.gal button:hover img' }
const norm = (sel) => RENAMED[sel] ?? sel

/** Kaunsa selector kis-kis width pe badalta hai — `{selector: [widths]}`. */
function widthsBySelector(media, mapper = (s) => s) {
  const out = {}
  for (const [w, block] of Object.entries(media)) {
    for (const sel of Object.keys(block)) {
      const key = mapper(sel)
      out[key] = out[key] ?? []
      out[key].push(Number(w))
    }
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => b - a)
  return out
}

const refW = widthsBySelector(refMedia, norm)
const ourW = widthsBySelector(ourMedia)

const shared = Object.keys(refW).filter((s) => ourSelectors.has(s))

console.log('=========== BREAKPOINT ALAG HAI ===========\n')
let drift = 0
for (const sel of shared.sort()) {
  const a = refW[sel] ?? []
  const b = ourW[sel] ?? []
  if (a.join() === b.join()) continue
  drift++
  console.log(`${sel}`)
  console.log(`  ref  : ${a.length ? a.map((w) => w + 'px').join(' · ') : '—'}`)
  console.log(
    `  ours : ${b.length ? b.map((w) => w + 'px').join(' · ') : '— (koi responsive rule nahi)'}\n`,
  )
}

console.log('\n=========== HAMARE PAAS RESPONSIVE RULE HAI, REFERENCE ME NAHI ===========\n')
let extra = 0
for (const sel of Object.keys(ourW).sort()) {
  if (refW[sel]) continue
  extra++
  console.log(`${sel}  —  ${ourW[sel].map((w) => w + 'px').join(' · ')}`)
}

console.log(`\n\nkul: ${drift} selector ka breakpoint alag, ${extra} sirf hamare paas`)
console.log(`ref : ${REF_FILE}`)
console.log(`ours: ${OUR_FILES.join(' · ')}`)
