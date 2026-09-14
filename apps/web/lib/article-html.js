/**
 * Article ki HTML ko design ke laayak banane wale transforms — sab **pure functions**.
 *
 * ⚠️ **Ye pehle `Blocks.jsx` ke andar the, aur wahan inka test likha hi nahi ja sakta tha**
 * (wo file JSX hai aur poore component tree ko kheenchti hai). Yahan aane se ye `linkify.js`
 * ke saath baith gaye — wahi jagah jahan is app ke doosre pure helpers aur unke test hain.
 *
 * ⚠️ **Ye safai nahi hai** — safai write pe ho chuki hoti hai (`sanitizeContent()`, R20). Ye
 * sirf **dhaancha** theek karte hain: wo cheezein jo design maangta hai par Google Doc likh
 * hi nahi sakta. Wahi tark jo `wrapTables()` pe D-90 §5 me likha gaya tha.
 *
 * Regex HTML pe aam taur pe bura auzaar hai; yahan wo chalta hai kyunki daayra tang aur maloom
 * hai — ye HTML sanitizer se hokar aa chuki hai, aur `<table>` apne andar `<table>` nahi rakhti.
 */

const CELL_RE = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi
const ROW_RE = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi

/**
 * Cell ke andar ke `<p>` khol do — kai ho to `<br>` se judte hain.
 *
 * ⚠️ **Google har cell ki value `<p>` me bhejta hai**, aur wahi table ki styling tod raha tha
 * (client, 11 Sep): `.art p` ka font-size aur margin cell ke andar bhi lag jaata, to `.tbl td`
 * ka 13px/`line-height` haar jaata. Reference ke cell me koi `<p>` nahi hai — seedha text.
 */
const unwrapCellParagraphs = (inner) =>
  String(inner ?? '')
    .replace(/<p\b[^>]*>/gi, '')
    .replace(/<\/p>\s*/gi, '<br>')
    .replace(/(?:\s*<br>\s*)+$/i, '')
    .trim()

/** `colspan`/`rowspan` sirf tab jab 1 se zyada ho — Google **har** cell pe `="1"` likhta hai. */
const spanAttrs = (attrs) =>
  ['colspan', 'rowspan']
    .map((name) => {
      const value = String(attrs ?? '').match(new RegExp(`${name}\\s*=\\s*"?(\\d+)`, 'i'))?.[1]

      return value && Number(value) > 1 ? ` ${name}="${value}"` : ''
    })
    .join('')

/** `<table>` pe `class="tbl"` — pehle se ho to waisa hi, doosri class ho to uske saath. */
const ensureTblClass = (table) =>
  table.replace(/<table\b([^>]*)>/i, (tag, attrs) => {
    if (/\bclass\s*=\s*"[^"]*\btbl\b/i.test(attrs)) return tag
    if (/\bclass\s*=\s*"/i.test(attrs)) return tag.replace(/class\s*=\s*"/i, 'class="tbl ')

    return `<table class="tbl"${attrs}>`
  })

/**
 * Table ko reference ki shakl me lao — **pehli row `<thead>`, baaki `<tbody>`** (client, 11 Sep).
 *
 * Reference (`blog-detail-v1.html`) ki har table aisi hai:
 *
 * ```html
 * <table class="tbl"><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody></table>
 * ```
 *
 * Google ka export teen jagah is se alag hai, aur teeno naap kar mile:
 *
 * 1. **`<th>` kabhi nahi** — `<thead>` aata hai, par uske andar bhi `<td>`
 * 2. **Har cell me `<p>`** — jo `.art p` ki styling cell me le aata hai
 * 3. **Toota hua nesting** — ek khaali `<tbody></tbody>` pehli `<tr>` ke **andar**, aur data
 *    rows bhi `<thead>` ke andar hi
 *
 * Isliye aisi table ko thodna-thodna sudharne ki jagah **rows aur cells nikaal kar dobara
 * banaya jaata hai**. Pehle `ensureTableHeader()` sirf `<td>` → `<th>` karta tha, aur teesri
 * baat waise ki waisi reh jaati thi.
 *
 * ⚠️ **Jis table me pehle se `<th>` ho uska dhaancha chhua nahi jaata** — wo client ne haath se
 * likhi hai (11 Sep ko DB me gina: tour page ki 3 aur do post ki 2-2, sab `class="tbl"` + `<th>`).
 * Uski pehli row header hai ya pehla column, wo client jaanta hai. Us par sirf cell ke `<p>`
 * khulte hain aur `class="tbl"` pakka hota hai.
 *
 * ⚠️ Ye ek **maan lena** hai: bina `<th>` wali table ki pehli row header hai. Client ne 11 Sep ko
 * yahi kaha — _"only first row will be table head other will be table body"_.
 */
export function normalizeTable(table) {
  if (/<th[\s>]/i.test(table)) {
    return ensureTblClass(
      table.replace(
        CELL_RE,
        (cell, tag, attrs, inner) => `<${tag}${attrs}>${unwrapCellParagraphs(inner)}</${tag}>`,
      ),
    )
  }

  const rows = [...table.replace(/<\/?(thead|tbody|tfoot)\b[^>]*>/gi, '').matchAll(ROW_RE)]
    .map(([, row]) =>
      [...row.matchAll(CELL_RE)].map(([, , attrs, inner]) => ({
        attrs: spanAttrs(attrs),
        html: unwrapCellParagraphs(inner),
      })),
    )
    .filter((cells) => cells.length > 0)

  /** Row hi na mile to jo aaya wahi lautao — kuch gira dene se behtar hai. */
  if (rows.length === 0) return ensureTblClass(table)

  const line = (cells, tag) =>
    `<tr>${cells.map((cell) => `<${tag}${cell.attrs}>${cell.html}</${tag}>`).join('')}</tr>`

  const [head, ...body] = rows

  return (
    `<table class="tbl"><thead>${line(head, 'th')}</thead>` +
    (body.length ? `<tbody>${body.map((cells) => line(cells, 'td')).join('')}</tbody>` : '') +
    '</table>'
  )
}

/**
 * Har `<table>` ko `.tblw` me lapet do — client, 9 Sep.
 *
 * ⚠️ **`.tblw` sirf border-radius ke liye nahi hai, usme `overflow-x: auto` bhi hai.** Uske bina
 * table apni `min-width: 520px` le kar mobile pe page se **bahar nikal jaati hai**. Client ne
 * dono cheezein pakdi: gol kone nahi aa rahe, aur scroll bhi nahi ho raha.
 *
 * ⚠️ **Pehle maine ise content ki galti kaha tha, aur wo galat tha.** Client ke teen table me se
 * do pe wrapper tha aur ek pe nahi — par ye us kism ki cheez hai jise **theme ko sambhalna
 * chahiye**, client ko yaad nahi rakhni chahiye. Wahi sabak jo `.wdgl` (A-19) aur `.faq p` pe
 * mila tha: look us markup ka mohtaaj mat rakho jo editor **shayad** dega.
 *
 * Kaam do kadam me hota hai aur wo kram maayne rakhta hai: pehle **purane wrapper hata**, phir
 * **sab pe ek jaisa laga**. Sirf doosra kadam karne se pehle se lipti hui tables **do baar** lipat
 * jaatin — do border, ek doosre ke andar.
 *
 * ⚠️ Ye **har** page pe chalta hai, sirf blog pe nahi — table ka header aur `.tbl` har jagah sahi
 * hone chahiye. Haath se likhi tables pe iska koi asar nahi (unme `<th>` pehle se hai).
 */
export const wrapTables = (html) =>
  String(html ?? '')
    .replace(/<div class="tblw">\s*(<table[\s\S]*?<\/table>)\s*<\/div>/g, '$1')
    .replace(
      /<table[\s\S]*?<\/table>/g,
      (table) => `<div class="tblw">${normalizeTable(table)}</div>`,
    )

/** `Caption:` — image ke **turant neeche** wale paragraph ke shuru me, chahe bold/italic ho. */
export const CAPTION_RE = /^\s*(?:<(?:strong|b|em|i)>\s*)?caption\s*:/i

/** Caption se nishaan hatao, aur poori line italic ho to wo italic bhi — reference ka caption seedha hai. */
function captionOf(inner) {
  let text = String(inner ?? '')
    .replace(/caption\s*:\s*/i, '')
    .replace(/<(strong|b|em|i)>\s*<\/\1>/gi, '')
    .trim()

  const whole = text.match(/^<(em|i)>([\s\S]*)<\/\1>$/i)
  if (whole) text = whole[2].trim()

  return text
}

/**
 * Paragraph me akeli image → `figure.artfig`, aur uske neeche ki `Caption:` line → `figcaption`
 * (client, 11 Sep).
 *
 * Reference me image aur uski line **ek hi `<figure>`** me hain:
 *
 * ```html
 * <figure class="artfig"><img …><figcaption>…</figcaption></figure>
 * ```
 *
 * Google Doc me `<figure>` likhne ka koi tareeka nahi — wo image ko `<p><img></p>` me bhejta
 * hai, aur uske neeche ki line ek alag `<p>`. Pehle wo line **`.lead` ban jaati thi**:
 * `leadParagraph()` image wale paragraph ko chhod kar **agle** paragraph ko lead maan leta tha,
 * aur wo agla paragraph caption hi tha. Client ne yahi pakda.
 *
 * ⚠️ **Caption `Caption:` nishaan se banti hai, andaze se nahi.** "Image ke neeche italic line
 * = caption" maan lena aasaan tha, par tab image ke turant baad likha koi bhi italic paragraph
 * chup-chaap caption ban jaata. Wahi soch jo `Note:`/`Warning:` pe hai.
 *
 * Do kadam, aur kram zaroori hai: pehle **har** akeli image figure banti hai, phir figure ke
 * turant baad wali `Caption:` line uske andar jaati hai. Ek hi regex me dono karne pe, caption
 * na hone par agla paragraph "kha liya" jaata — aur agar wo khud ek image hota to wo figure
 * banne se reh jaati.
 *
 * ⚠️ Haath se likhe `<figure>` chhue nahi jaate — unka `<img>` kisi `<p>` me nahi hota, aur doosra
 * kadam sirf wahi figure pakadta hai jisme **sirf** ek `<img>` ho.
 */
export function wrapFigures(html) {
  return String(html ?? '')
    .replace(/<p>\s*(<img\b[^>]*>)\s*<\/p>/gi, '<figure class="artfig">$1</figure>')
    .replace(
      /<figure class="artfig">(<img\b[^>]*>)<\/figure>\s*<p>((?:(?!<\/p>)[\s\S])*)<\/p>/gi,
      (match, img, inner) =>
        CAPTION_RE.test(inner)
          ? `<figure class="artfig">${img}<figcaption>${captionOf(inner)}</figcaption></figure>`
          : match,
    )
}

/** Reference ke apne icon — `blog-detail-v1.html` se hoobahoo. */
export const INFO_ICON =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>'

export const WARN_ICON =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17v.5"/></svg>'

/** `Note:` · `Warning:` · `Quote:` — paragraph ke shuru me, chahe bold ho ya na ho. */
export const MARKER_RE = /^\s*(?:<(?:strong|b)>\s*)?(note|warning|quote)\s*:/i

/**
 * Article ke teen design blocks jo Google Doc me likhe hi nahi ja sakte — client, 10 Sep.
 *
 * Reference (`blog-detail-v1.html`) me callout, warning aur pull quote apne `<div>` aur class
 * se bante hain. Google Doc me `<div class="callout">` likhne ka koi tareeka hai hi nahi, to
 * client ke article me wo teenon **saade paragraph** ban kar aate the — design ka ek poora
 * hissa gayab.
 *
 * Isliye writer ek chhota sa nishaan likhta hai aur theme use asli block bana deti hai:
 *
 * | Doc me | Page pe |
 * | --- | --- |
 * | `Note: **Title** body…`    | `.callout` (neela, info icon) |
 * | `Warning: **Title** body…` | `.callout--w` (laal, warning icon) |
 * | `Quote: …`                 | `.pullq` |
 *
 * ⚠️ **Ilaaj yahan hai, importer me nahi** — wahi jagah jahan `wrapTables()` baitha hai (D-90
 * §5). Isse ye TinyMCE se likhe content pe bhi chalta hai, aur DB me content saaf rehta hai:
 * client kal nishaan hata de to page apne aap saade paragraph pe wapas aa jaata hai.
 *
 * ⚠️ Title ke liye writer ka apna **bold** use hota hai. Bold na ho to sirf body banti hai —
 * D-30: adhoora bhara hua khaali dikhe, toota hua nahi.
 */
export function markedBlocks(html) {
  return String(html ?? '').replace(/<p>([\s\S]*?)<\/p>/gi, (tag, inner) => {
    const marker = inner.match(MARKER_RE)
    if (!marker) return tag

    const kind = marker[1].toLowerCase()

    /** Nishaan hata do — wo `<strong>` ke andar likha ho tab bhi. */
    const rest = inner
      .replace(/(note|warning|quote)\s*:\s*/i, '')
      .replace(/<(strong|b)>\s*<\/\1>/gi, '')
      .trim()

    if (kind === 'quote') return `<div class="pullq"><p>${rest}</p></div>`

    /** Shuru ka bold = callout ka heading, baaki uska body. */
    const lead = rest.match(/^\s*<(strong|b)>([\s\S]*?)<\/\1>\s*/i)
    const title = lead ? `<b>${lead[2].trim()}</b>` : ''
    const body = lead ? rest.slice(lead[0].length).trim() : rest

    const warn = kind === 'warning'

    return `<div class="callout${warn ? ' callout--w' : ''}">${warn ? WARN_ICON : INFO_ICON}<div>${title}<p>${body}</p></div></div>`
  })
}

/**
 * Article ka pehla paragraph bada hota hai — reference ka `<p class="lead">`.
 *
 * ⚠️ **Writer ko iske liye kuch likhna nahi padta**, aur wo jaan-boojh kar hai: har article ka
 * pehla paragraph lead hota hai, to use ek nishaan ke bharose chhodna sirf bhoolne ka mauka
 * dena hai. Yahi soch `wrapTables()` pe hai.
 *
 * Teen tarah ke paragraph chhod diye jaate hain:
 *
 * - **image wala** — reference me bhi `.lead` figure ke **baad** aata hai
 * - **khaali**
 * - **nishaan wala** (`Note:` · `Warning:` · `Quote:` · `Caption:`) — ⚠️ ye 11 Sep ko juda. Pehle
 *   image ke neeche ki caption line hi lead ban jaati thi, aur article `Note:` se shuru ho to
 *   wo `<p class="lead">` ban kar callout banne se reh jaata (`markedBlocks()` sirf saada `<p>`
 *   pakadta hai)
 *
 * ⚠️ **Content me pehle se lead ho to kuch nahi hota** — ye bhi 11 Sep ko juda, ek asli bug ke
 * baad. Client ke haath se likhe post me `<p class="lead">` pehle se tha; ye function sirf saada
 * `<p>` pakadta hai, to usne use chhod kar **agle** paragraph ko bhi lead bana diya. Page pe do
 * bade paragraph — 10 Sep se, kisi ne dekha nahi.
 */
export function leadParagraph(html) {
  const source = String(html ?? '')

  if (/<p\b[^>]*\bclass\s*=\s*"[^"]*\blead\b/i.test(source)) return source

  let done = false

  return source.replace(/<p>([\s\S]*?)<\/p>/gi, (tag, inner) => {
    if (done) return tag
    if (/<img/i.test(inner) || !inner.replace(/<[^>]*>/g, '').trim()) return tag
    if (MARKER_RE.test(inner) || CAPTION_RE.test(inner)) return tag

    done = true

    return `<p class="lead">${inner}</p>`
  })
}

/**
 * Blog article ki poori HTML — **ek hi jagah, ek hi kram**.
 *
 * ⚠️ **Kram hi is function ki wajah hai.** Caption ka `.lead` ban jaana ek **kram ka bug** tha:
 * figure banne se pehle lead dhoondha ja raha tha. Jab kram `Blocks.jsx` ke andar likha tha,
 * uska test ho hi nahi sakta tha. Ab wo yahan hai aur uska apna test hai.
 *
 * 1. `wrapTables` — table ka dhaancha (har page pe bhi chalta hai)
 * 2. `wrapFigures` — image + caption, taaki caption paragraph na rahe
 * 3. `leadParagraph` — ab pehla **asli** paragraph lead banta hai
 * 4. `markedBlocks` — nishaan wale paragraph (lead unhe chhod chuka hota hai)
 *
 * ⚠️ **`lead: false` — `page` ke liye** (client, 14 Sep, D-95): _"body font only no lead font"_.
 * Page pe bhi callout, caption aur table wahi chahiye (Bulk Upload unhi nishaan se likhega),
 * sirf bada pehla paragraph nahi. Kram wahi rehta hai — bas teesra kadam chhoot jaata hai.
 *
 * @param {string} html
 * @param {{ lead?: boolean }} [options]
 */
export const articleHtml = (html, { lead = true } = {}) => {
  const framed = wrapFigures(wrapTables(html))

  return markedBlocks(lead ? leadParagraph(framed) : framed)
}
