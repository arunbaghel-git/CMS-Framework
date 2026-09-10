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
 */
/**
 * Table ki pehli row **hamesha** header banti hai — client, 10 Sep.
 *
 * ⚠️ **Google Doc kabhi `<th>` nahi bhejta.** Wo `<thead>` to bhej deta hai (jab doc me header
 * row set ho), par uske andar bhi cells `<td>` hi hote hain. Aur uske saath ek toota hua
 * `<tbody></tbody>` bhi aata hai, `<tr>` ke **andar** — jo browser ko khud sudharna padta hai.
 *
 * Poora header look (`.tbl th` — blue background, uppercase, letter-spacing) `<th>` par tika
 * hai. Isliye CSS se jugaad karne ki jagah **markup theek kiya jaata hai**: pehli row ke `<td>`
 * ko `<th>` bana do. Isse teen cheezein ek saath milti hain — reference wala look, sahi
 * semantics (screen reader ko pata chalta hai ki wo header hai), aur client ki apni likhi
 * tables ka markup aur imported tables ka markup **ek jaisa**.
 *
 * ⚠️ Jis table me pehle se ek bhi `<th>` ho use **chhua nahi jaata** — wo client ne khud likhi
 * hai aur uska header pehle se sahi hai.
 *
 * ⚠️ Ye ek **maan lena** hai: pehli row header hai. Google Docs me wo bahut aam hai. Kisi table
 * me pehli row asli data ho to wo header jaisi dikhegi — nuksaan sirf dikhne ka hai, data ka
 * nahi.
 */
export const ensureTableHeader = (table) => {
  /** Google ka toota hua khaali `<tbody>` — wo `<tr>` ke andar aata hai aur bemaani hai. */
  const clean = table.replace(/<tbody>\s*<\/tbody>/gi, '')

  if (/<th[\s>]/i.test(clean)) return clean

  return clean.replace(/<tr[^>]*>[\s\S]*?<\/tr>/i, (row) =>
    row.replace(/<td\b/gi, '<th').replace(/<\/td>/gi, '</th>'),
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
 * Regex HTML pe aam taur pe bura auzaar hai; yahan wo chalta hai kyunki daayra tang aur maloom
 * hai — `<table>` apne andar `<table>` nahi rakhti, aur ye HTML sanitizer se hokar aa chuki hai.
 */
export const wrapTables = (html) =>
  String(html ?? '')
    .replace(/<div class="tblw">\s*(<table[\s\S]*?<\/table>)\s*<\/div>/g, '$1')
    .replace(
      /<table[\s\S]*?<\/table>/g,
      (table) => `<div class="tblw">${ensureTableHeader(table)}</div>`,
    )

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
 * ⚠️ Image wala paragraph chhod diya jaata hai — reference me bhi `.lead` figure ke **baad**
 * aata hai.
 */
export function leadParagraph(html) {
  let done = false

  return String(html ?? '').replace(/<p>([\s\S]*?)<\/p>/gi, (tag, inner) => {
    if (done || /<img/i.test(inner) || !inner.replace(/<[^>]*>/g, '').trim()) return tag

    done = true

    return `<p class="lead">${inner}</p>`
  })
}

/**
 * ⚠️ **Saari HTML `dangerouslySetInnerHTML` se jaati hai, aur wo theek hai** — safai **write pe**
 * ho chuki hai (`sanitizeContent()`, R20). Render pe dobara saaf karna do jagah ek hi tark
 * rakhna hota, aur wo dheere-dheere alag ho jaata.
 *
 * ⚠️ `wrapTables()` safai **nahi** hai — wo dhaancha theek karta hai, khatra nahi hatata.
 */
