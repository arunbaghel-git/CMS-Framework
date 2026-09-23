/**
 * `<head>` ke liye kachcha HTML → **asli elements** ki list (23 Sep — 404 pe CSS gayab).
 *
 * ## Ye file kyun bani
 *
 * D-106 se layout `<head>` pe **khud** `dangerouslySetInnerHTML` lagata tha (theme CSS + Custom CSS +
 * Integrations ▸ Header, ek string). Aam pages pe wo chalta tha, par **404 pe poori site ki CSS gayab**
 * thi: `notFound()` pe Next page ko browser me shuru se banata hai, React `layout.css` ka `<link>` head
 * me daalta hai — aur phir head ka `innerHTML` hamari string se badal jaata hai, link ke saath. Headless
 * Chrome se naapa gaya: innerHTML ke saath head me link **0**, uske bina **1**.
 *
 * Isliye head ab saade React children se banta hai. Theme/Custom CSS `<style>` elements hain; Integrations
 * ka HTML yahan **server pe** head ke tags me tootta hai.
 *
 * ## Niyam — wahi jo browser ka parser `<head>` me karta hai
 *
 * | Mila | Kya hota hai |
 * | --- | --- |
 * | `meta` · `link` · `base` | void element, `head` me |
 * | `script` · `style` · `noscript` · `template` · `title` | andar ka maal jaisa ka taisa, `head` me |
 * | comment, khaali jagah | gir jaata hai |
 * | **baaki kuch bhi** (`<div>`, text…) | wahan se aage ka **sab** `rest` me — layout use `<body>` ke shuru me rakhta hai |
 *
 * Aakhri row browser ki hi nakal hai: head me anjaan tag milte hi parser head band karke body me chala
 * jaata hai, aur baaki sab body me girta hai. Pehle bhi client ka aisa code body me hi pahunchta tha.
 *
 * ⚠️ **Saaf karna iska kaam nahi hai.** Integrations R20 ka jaan-boojh kar liya gaya apwaad hai (D-106) —
 * `<script>` chalana hi us field ka kaam hai. Ye sirf **shakl** badalta hai, maal nahi.
 *
 * Pure function isliye ki test ho sake — `layout.jsx` ke andar likha niyam test nahi hota (D-92 §11).
 */

/** Andar ka maal wale tag — band hone wale tag tak sab kuch raw. */
const RAW_TAGS = ['script', 'style', 'noscript', 'template', 'title']

/** Void tag — inka koi andar nahi. */
const VOID_TAGS = ['meta', 'link', 'base']

/**
 * HTML attribute ka naam → React prop. Sirf wo jo head ke tags pe sach me aate hain (GA · Pixel · GTM ·
 * site verification); anjaan naam React waise hi aage bhej deta hai.
 */
const PROP_NAME = {
  class: 'className',
  charset: 'charSet',
  'http-equiv': 'httpEquiv',
  crossorigin: 'crossOrigin',
  referrerpolicy: 'referrerPolicy',
  nomodule: 'noModule',
  fetchpriority: 'fetchPriority',
  itemprop: 'itemProp',
  hreflang: 'hrefLang',
  imagesizes: 'imageSizes',
  imagesrcset: 'imageSrcSet',
}

/** Bina value wale attribute jo React me `true` maangte hain — baaki bina value wale `''` ban-te hain. */
const BOOLEAN_PROPS = new Set(['async', 'defer', 'noModule'])

/** `&amp;` → `&` — React render pe dobara escape karta hai, warna `&amp;amp;` ban jaata. */
function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (match, code) => {
    const lower = code.toLowerCase()
    if (lower === 'amp') return '&'
    if (lower === 'quot') return '"'
    if (lower === 'apos') return "'"
    if (lower === 'lt') return '<'
    if (lower === 'gt') return '>'
    const num = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10)
    return Number.isFinite(num) ? String.fromCodePoint(num) : match
  })
}

/**
 * `async src="x" data-id='y'` → `{ async: true, src: 'x', 'data-id': 'y' }`.
 *
 * @param {string} source
 */
export function parseAttrs(source) {
  const props = {}
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

  for (const match of String(source ?? '').matchAll(re)) {
    const raw = match[1].toLowerCase()
    /** `on*` bhi jaane diye — Integrations ka apwaad (D-106); React server pe string attribute chhapta hai. */
    const name = PROP_NAME[raw] ?? raw
    const value = match[2] ?? match[3] ?? match[4]

    if (value === undefined) props[name] = BOOLEAN_PROPS.has(name) ? true : ''
    else props[name] = decodeEntities(value)
  }

  return props
}

/**
 * @param {string} html
 * @returns {{ head: { tag: string, props: Record<string, any>, html?: string }[], rest: string }}
 */
export function splitHeadHtml(html) {
  const head = []
  let s = String(html ?? '')

  while (s.length) {
    const lead = s.match(/^\s+/)
    if (lead) {
      s = s.slice(lead[0].length)
      continue
    }

    if (s.startsWith('<!--')) {
      const end = s.indexOf('-->')
      s = end === -1 ? '' : s.slice(end + 3)
      continue
    }

    const open = s.match(/^<([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^>]*)?)\/?>/)
    const tag = open?.[1].toLowerCase()

    if (open && VOID_TAGS.includes(tag)) {
      head.push({ tag, props: parseAttrs(open[2].replace(/\/\s*$/, '')) })
      s = s.slice(open[0].length)
      continue
    }

    if (open && RAW_TAGS.includes(tag)) {
      const afterOpen = s.slice(open[0].length)
      const close = afterOpen.search(new RegExp(`</${tag}\\s*>`, 'i'))
      /** Band hi na ho to browser bhi baaki sab usi tag ka maal maanta hai — wahi yahan. */
      const inner = close === -1 ? afterOpen : afterOpen.slice(0, close)
      head.push({ tag, props: parseAttrs(open[2]), html: inner })
      if (close === -1) s = ''
      else {
        const closeTag = afterOpen.slice(close).match(/^<\/[^>]*>/)[0]
        s = afterOpen.slice(close + closeTag.length)
      }
      continue
    }

    /** Head me na chalne wali cheez — yahin se browser body me chala jaata, to hum bhi. */
    return { head, rest: s }
  }

  return { head, rest: '' }
}
