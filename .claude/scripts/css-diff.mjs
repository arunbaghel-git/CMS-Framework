import fs from 'node:fs'

/**
 * Reference ki CSS aur hamari CSS ka rule-by-rule diff.
 *
 * Aankh se milaan karne pe hamesha kuch chhoot jaata hai — font-weight 800 vs 900, ek
 * letter-spacing, ek padding. Ye script har selector ke har property ko milaati hai.
 */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Top-level (media ke bahar) rules — `{selector: {prop: value}}`. */
function parse(css) {
  css = stripComments(css)

  // media blocks alag nikaal do
  const media = []
  css = css.replace(/@media[^{]+\{((?:[^{}]|\{[^{}]*\})*)\}/g, (m, body) => {
    media.push(m)
    return ''
  })

  const rules = {}
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) {
    const selectors = m[1].trim()
    if (!selectors || selectors.startsWith('@')) continue

    const decls = {}
    for (const part of m[2].split(';')) {
      const i = part.indexOf(':')
      if (i < 0) continue
      const prop = part.slice(0, i).trim()
      const value = part
        .slice(i + 1)
        .trim()
        .replace(/\s+/g, ' ')
      if (prop) decls[prop] = value
    }

    for (const sel of selectors.split(',')) {
      const key = sel.trim().replace(/\s+/g, ' ')
      if (!key) continue
      rules[key] = { ...(rules[key] ?? {}), ...decls }
    }
  }

  return rules
}

const refHtml = fs.readFileSync('.claude/docs/reference/itinerary-v3.html', 'utf8')
const refCss = [...refHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
const ourCss = fs.readFileSync('apps/web/app/globals.css', 'utf8')

const ref = parse(refCss)
const ours = parse(ourCss)

/** Package page ke selectors — inhi pe milaan karna hai. */
const PREFIXES = [
  '.pkg',
  '.vcrumb',
  '.gal',
  '.ptitle',
  '.pmeta',
  '.pintro',
  '.catbar',
  '.pgl',
  '.blk',
  '.route',
  '.atg',
  '.dnav',
  '.itin',
  '.htab',
  '.hpan',
  '.tbl',
  '.tblw',
  '.incl',
  '.inx',
  '.steps',
  '.faq',
  '.wdg',
  '.sim',
  '.rev',
]

const wanted = (sel) =>
  PREFIXES.some(
    (p) =>
      sel === p ||
      sel.startsWith(p + ' ') ||
      sel.startsWith(p + '.') ||
      sel.startsWith(p + ':') ||
      sel.startsWith(p + '>') ||
      sel.startsWith(p + '['),
  )

const missing = []
const differs = []

for (const [sel, decls] of Object.entries(ref)) {
  if (!wanted(sel)) continue

  const mine = ours[sel]
  if (!mine) {
    missing.push([sel, decls])
    continue
  }

  const diff = []
  for (const [prop, value] of Object.entries(decls)) {
    const mineVal = mine[prop]
    if (mineVal === undefined) diff.push(`  - ${prop}: ${value}   (hamare paas nahi)`)
    else if (mineVal.replace(/\s/g, '') !== value.replace(/\s/g, ''))
      diff.push(`  ~ ${prop}: ref="${value}"  ours="${mineVal}"`)
  }
  if (diff.length) differs.push([sel, diff])
}

console.log('=========== SELECTOR HAMARE PAAS HAI HI NAHI ===========')
for (const [sel, decls] of missing) {
  console.log(`\n${sel} {`)
  for (const [p, v] of Object.entries(decls)) console.log(`  ${p}: ${v};`)
  console.log('}')
}

console.log('\n\n=========== VALUES ALAG HAIN ===========')
for (const [sel, diff] of differs) {
  console.log(`\n${sel}`)
  for (const line of diff) console.log(line)
}

console.log(`\n\nkul: ${missing.length} selector missing, ${differs.length} me values alag`)
