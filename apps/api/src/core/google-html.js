import sanitizeHtmlLib from 'sanitize-html'

/**
 * Google Docs ke HTML export ko hamare laayak banana — Bulk Upload (D-81).
 *
 * ## ⚠️ Google formatting **class** se bhejta hai, tag se nahi — aur yahi is file ki wajah hai
 *
 * Pehli nazar me lagta hai ki bas `class` aur `style` hata do aur kaam ho gaya. Wo galat hai,
 * aur galti chup hoti hai. Google ka export aisa dikhta hai:
 *
 * ```html
 * <style>.c2{font-weight:400}  .c4{font-weight:700}  .c5{font-style:italic}</style>
 * <p class="c0"><span class="c4">Port Blair</span> and Neil.</p>
 * ```
 *
 * `<b>` ya `<strong>` kahin nahi hai. Bold ki poori jaankari **`.c4` ke naam me** hai. Seedhe
 * `class` hata dene se `Port Blair` saada text ban jaata hai — **na error, na warning**, bas
 * client ka bold hamesha ke liye gayab. Pata tab chalta jab wo live page kholta.
 *
 * Isliye yahan **do kadam** hain, aur kram badla nahi ja sakta:
 *
 * 1. `<style>` padh kar naksha banao — kaunsi class ka matlab bold/italic/underline hai
 * 2. Us naksha se `<span class="c4">` ko asli `<strong>` me badlo
 *
 * Uske **baad** hi safai chalti hai. Tab tak jo bachana tha wo semantic tag ban chuka hota hai.
 *
 * ## Safai ka profile `sanitize-html.js` walon se alag kyun hai
 *
 * `BLOCK` profile `class` aur `style` **jaan-boojh kar allow** karta hai — D-80 me client ko
 * HTML tab me apni class likhne ki chhoot chahiye thi. Yahan source alag hai: ye class client
 * ne nahi likhi, **Google ne thopi** hai. `.c4` hamare theme me kuch matlab nahi rakhti, par DB
 * me hamesha ke liye baith jaati aur ek din kisi asli class se takra sakti hai.
 *
 * **Profile source ke hisaab se chunna chahiye, field ke hisaab se nahi.**
 */

/**
 * Sirf wahi tags jo doc se aane chahiye. `span` yahan **nahi** hai — wo upar hi khap chuka
 * hota hai.
 *
 * ## ⚠️ Table aur image spec 008 me jude, aur unke bina nuksaan **chup** tha
 *
 * Package ke doc me sirf prose aati thi (`Overview`, `Day Description`), isliye ye list utni
 * hi chhoti thi. Blog ka article ulta hai: reference (`blog-detail-v1.html`) ka poora `.art`
 * body **h2 · table · list · figure** hai.
 *
 * Bina inke jo hota tha wo "gayab ho jaana" se bhi bura tha — table ke cells **chipak kar ek
 * line ban jaate the**:
 *
 * ```
 * Makruzz90 minutes₹1,400
 * ```
 *
 * Na error, na warning; row `Published` hi bolti. Yahi shakl D-82 me `stripTags` pe pakdi
 * gayi thi.
 *
 * ⚠️ **`img` allow karne ki ek shart hai**, aur wo is file ke bahar poori hoti hai: Google ke
 * `lh7-*.googleusercontent.com` wale URL **signed aur expire hone wale** hain. Unhe DB me
 * chhod dena matlab post aaj theek dikhega aur kuch hafte baad har image toot jaayegi. Isliye
 * `importInlineImages()` (`bulk-imports/service.js`) har image ko Media library me utaar kar
 * `src` badal deti hai. **Ye do cheezein ek saath hi chalni chahiye.**
 */
const IMPORTED = {
  allowedTags: [
    'p',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'u',
    's',
    'a',
    'br',
    'blockquote',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'caption',
    'figure',
    'figcaption',
    'img',
  ],

  /**
   * `href`/`src` ke alawa kuch nahi — koi `class`, koi `style`, koi `id`.
   *
   * ⚠️ `colspan`/`rowspan` **zaroori** hain: client ke table me merged cells ho sakte hain, aur
   * unke bina wo table apne aap ko doosre kram me jod leti hai — dikhne me sahi, padhne me
   * galat.
   *
   * ⚠️ `width`/`height` `img` pe rakhe gaye hain kyunki unke bina CLS wapas aati hai (D-84 ne
   * wahi 6/12 se 12/12 kiya tha). `Img.jsx` inhe padhta hai.
   */
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },

  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],

  /**
   * ⚠️ `style` aur `head`/`title` ka **text** bhi girna chahiye, sirf tag nahi.
   *
   * Google ka poora CSS `<style>` me hota hai. Wo `nonTextTags` me na ho to sanitize-html tag
   * to hata deta hai par uske andar ka CSS **text ki tarah** bahar aa jaata hai — yaani poora
   * stylesheet client ke Overview me chhap jaata.
   */
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'head', 'title'],
  disallowedTagsMode: 'discard',

  transformTags: {
    /** Doc ka `<h1>` page ke apne `<h1>` (package ka naam) se takrata hai — use neeche karo. */
    h1: 'h2',
    h5: 'h4',
    h6: 'h4',

    /**
     * ⚠️ Ye do **beema** hain, aaj ki zaroorat nahi.
     *
     * Google Docs bold ko `<span>` se bhejta hai aur `spansToTags()` use `<strong>` bana chuka
     * hota hai — yaani aam haalat me `<b>` aata hi nahi. Par doc me kahin se paste kiya hua
     * HTML `<b>`/`<i>` la sakta hai, aur wo `allowedTags` me na hone se **chup-chaap girta**.
     * Ek mapping likhna us poori kism ke bug se sasta hai.
     */
    b: 'strong',
    i: 'em',
  },
}

/**
 * `<style>` se class ka naksha — `.c4{font-weight:700}` → `{ bold: true }`.
 *
 * Google ka style block machine ka likha hua hai: ek selector, ek rule set, koi nesting nahi,
 * koi media query nahi. Isliye yahan regex bilkul surakshit hai — ye "HTML regex se parse mat
 * karo" wala case nahi hai.
 */
export function classMapFromStyle(html) {
  const map = new Map()
  const styles = String(html ?? '').match(/<style[^>]*>([\s\S]*?)<\/style>/gi)

  if (!styles) return map

  for (const block of styles) {
    const ruleRe = /\.([\w-]+)\s*\{([^}]*)\}/g
    let rule

    while ((rule = ruleRe.exec(block))) {
      const [, name, body] = rule

      map.set(name, {
        /** `bold` aur `700`+ dono aate hain; `400` normal hai aur usse kuch nahi banta. */
        bold: /font-weight\s*:\s*(bold|[6-9]00)/i.test(body),
        italic: /font-style\s*:\s*italic/i.test(body),
        underline: /text-decoration\s*:[^;]*underline/i.test(body),
        strike: /text-decoration\s*:[^;]*line-through/i.test(body),
      })
    }
  }

  return map
}

/**
 * Ek attribute ki value — `"` aur `'` dono chalte hain.
 *
 * ⚠️ Google double quotes bhejta hai, par sirf unhi ko pakadna ek chup jaal hai: single quote
 * wala HTML kahin se bhi aa sakta hai (client ne kisi editor se paste kiya ho), aur tab class
 * mil hi nahi paati — yaani bold chup-chaap gir jaata. Ye galti is file ke apne test me pehli
 * baar hui thi.
 */
const attrValue = (attrs, name) =>
  attrs
    .match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
    ?.slice(2)
    .find(Boolean) ?? ''

/** Naksha + inline style, dono se — client ne khud bold kiya ho to wo inline bhi aa sakta hai. */
function marksOf(attrs, classMap) {
  const marks = { bold: false, italic: false, underline: false, strike: false }
  const className = attrValue(attrs, 'class')
  const style = attrValue(attrs, 'style')

  for (const name of className.split(/\s+/).filter(Boolean)) {
    const found = classMap.get(name)
    if (!found) continue

    for (const key of Object.keys(marks)) marks[key] ||= found[key]
  }

  marks.bold ||= /font-weight\s*:\s*(bold|[6-9]00)/i.test(style)
  marks.italic ||= /font-style\s*:\s*italic/i.test(style)
  marks.underline ||= /text-decoration\s*:[^;]*underline/i.test(style)
  marks.strike ||= /text-decoration\s*:[^;]*line-through/i.test(style)

  return marks
}

/** Kaunsa mark kaunsa tag banta hai — kram tay hai taaki output har baar ek jaisa rahe. */
const MARK_TAGS = [
  ['bold', 'strong'],
  ['italic', 'em'],
  ['underline', 'u'],
  ['strike', 's'],
]

/**
 * `<span class="c4">` → `<strong>`, aur uski `</span>` → `</strong>`.
 *
 * ⚠️ Ye `transformTags` se nahi ho sakta: ek hi span **bold aur italic dono** ho sakta hai, aur
 * `transformTags` sirf ek tag laut sakta hai. Isliye khud chalna padta hai — aur chalte waqt ek
 * **stack** rakhni padti hai, taaki har `</span>` apne hi khule tag band kare. Bina stack ke
 * nested span (Google inhe aksar bhejta hai) HTML ko cross kar dete hain.
 */
function spansToTags(html, classMap) {
  const stack = []

  return String(html ?? '').replace(/<span([^>]*)>|<\/span>/gi, (tag, attrs) => {
    if (attrs === undefined) {
      const open = stack.pop() ?? []

      return open
        .map((name) => `</${name}>`)
        .reverse()
        .join('')
    }

    const marks = marksOf(attrs, classMap)
    const tags = MARK_TAGS.filter(([key]) => marks[key]).map(([, name]) => name)

    stack.push(tags)

    return tags.map((name) => `<${name}>`).join('')
  })
}

/**
 * Google ka redirector hata kar asli link.
 *
 * Doc me likha `https://example.com` export me
 * `https://www.google.com/url?q=https://example.com&sa=D&source=editors&ust=…` ban jaata hai.
 * Bina khole har link tracking URL ban kar DB me baith jaata — aur `Banner Image URL` agar
 * hyperlink ki tarah paste hua ho to wo image kabhi download hi na hoti.
 */
export function unwrapGoogleLink(href) {
  const raw = String(href ?? '')

  if (!/^https?:\/\/(www\.)?google\.com\/url\?/i.test(raw)) return raw

  try {
    return new URL(raw).searchParams.get('q') ?? raw
  } catch {
    return raw
  }
}

/**
 * Google Docs ka export → saaf, semantic HTML.
 *
 * Iske baad hi `parsePackageDoc()` chalti hai. Us parser ko is safai pe **bharosa** hai —
 * `packages/shared` browser me bhi chalta hai, aur safai ka bharosa client-side pe rakhna hi
 * wo galti hai jisse XSS aata hai (D-80).
 *
 * @param {unknown} html
 * @returns {string}
 */
export function cleanGoogleHtml(html, { allowImages = false } = {}) {
  if (!html) return ''

  const source = String(html)
  const withTags = spansToTags(source, classMapFromStyle(source))

  const cleaned = sanitizeHtmlLib(withTags, {
    ...IMPORTED,
    /**
     * ⚠️ **`img` default se BAND hai, aur wo jaan-boojh kar hai.**
     *
     * Google ka `src` signed aur expire hone wala hota hai. Use tabhi rakhna chahiye jab koi
     * use Media library me utaar bhi raha ho — yaani `importInlineImages()` saath chal rahi ho.
     * Dono me se ek akele chalne ka matlab hai post aaj theek dikhega aur kuch hafte baad har
     * image toot jaayegi (D-42 §2 ka seedha ulta).
     *
     * Isliye ye ek **chunav** hai, default nahi: jo raasta images sambhaal sakta hai wahi ise
     * kholta hai. Package ka import aaj images nahi sambhaalta, to uske liye ye band rehta hai
     * aur uska vyavhaar bilkul waisa hai jaisa pehle tha.
     */
    allowedTags: allowImages
      ? IMPORTED.allowedTags
      : IMPORTED.allowedTags.filter((tag) => tag !== 'img'),
    transformTags: {
      ...IMPORTED.transformTags,
      a: (tagName, attrs) => ({
        tagName: 'a',
        attribs: attrs.href
          ? { href: unwrapGoogleLink(attrs.href), rel: 'noopener noreferrer' }
          : {},
      }),
    },
  })

  /**
   * Khaali ho gaye tag hata do.
   *
   * Google har label ke baad ek khaali paragraph chhodta hai, aur `<span>` khap jaane ke baad
   * `<strong></strong>` jaise khokhle tag bhi bach jaate hain. Ye parser ko nahi todte, par
   * client ke content me bina wajah jagah bana dete hain.
   */
  return cleaned.replace(/<(strong|em|u|s)>\s*<\/\1>/gi, '').trim()
}
