import sanitizeHtmlLib from 'sanitize-html'

/**
 * Admin se aayi HTML ki safai — **poore system me ek hi jagah** (D-80).
 *
 * ## Ye file kyun bani
 *
 * 3 Sep tak rich text TipTap ka JSON tree tha, aur `rich-doc.js` me likha tha ki us shape ke
 * saath **XSS ban hi nahi sakta**: theme nodes ko chal kar React elements banati thi, kahin
 * `dangerouslySetInnerHTML` tha hi nahi. Client ko WordPress jaisa "HTML tab me kuch bhi
 * likho" chahiye tha (D-77), aur uske saath wo suraksha chali gayi.
 *
 * Isliye ab safai ek **zaroorat** hai, suvidha nahi — aur wo yahan hai, ek jagah.
 *
 * ## Do niyam jo tootne nahi chahiye
 *
 * 1. **Safai `write` pe hoti hai, render pe nahi** (R1 — service layer). DB me kabhi gandi
 *    HTML pahunchni hi nahi chahiye; tab theme us par bharosa kar sakti hai. Render pe
 *    saaf karne ka matlab hota ki DB me zeher pada rahe aur har naya reader use khud
 *    bachaye — aur ek reader bhoolte hi wo chal jaaye.
 * 2. **Safai server pe hoti hai, browser me nahi.** `packages/shared` admin ke browser me
 *    bhi chalta hai; sanitizer ka bharosa client-side pe rakhna hi wo galti hai jisse XSS
 *    aata hai. Attacker admin ka JS chhod kar seedha API ko call kar sakta hai.
 */

/** `class`/`id`/`style` har jagah — client ka faisla (3 Sep): purana content jaisa ka waisa. */
const COMMON_ATTRS = ['class', 'id', 'style', 'title', 'dir', 'lang']

/**
 * **Block profile** — Overview, section descriptions, itinerary din, FAQ answer, booking
 * step, cancellation policy.
 */
const BLOCK = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'ins',
    'sub',
    'sup',
    'mark',
    'small',
    'a',
    'img',
    'figure',
    'figcaption',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    'colgroup',
    'col',
    'div',
    'span',
    'section',
    'article',
    'header',
    'footer',
    'aside',

    /**
     * `details`/`summary` — accordion **bina JS ke** (D-87, D-59 ka hi tark).
     *
     * ⚠️ Ye 7 Sep tak yahan **nahi** the, aur wo ek chupa hua bug tha. Package page ka FAQ
     * accordion `<details>` se banta hai (D-59: "koi JS nahi") — par wo theme ke JSX me likha
     * hai, isliye sanitizer se guzarta hi nahi. Jis din client editor me khud `<details>`
     * likhta, wo **write pe chup-chaap gayab** ho jaata: 200 aata, "Saved." dikhta, aur
     * content ka wo hissa DB tak pahunchta hi nahi. Wahi shakl jo `cancellationText` (D-65)
     * aur transfer duration (D-64) ke bug ki thi.
     *
     * `open` attribute jaan-boojh kar **nahi** diya gaya: wo ek layout faisla hai (kaunsa
     * FAQ khula khule), aur wo theme ka kaam hai, client ki HTML ka nahi.
     */
    'details',
    'summary',
    /**
     * ⚠️ `svg` allow hai, aur ye D-41 ki "SVG upload block" wali baat se **alag** hai.
     * Wahan ek **file** thi jo browser me apne origin pe chalti (aur usme `<script>` chal
     * jaata); yahan admin ka likha hua **inline markup** hai jo isi sanitizer se guzarta
     * hai — `script` aur `on*` yahan bhi nahi bachte.
     */
    'svg',
    'path',
    'g',
    'circle',
    'rect',
    'line',
    'polyline',
    'polygon',
    'use',
    'defs',
    'iframe',
  ],

  allowedAttributes: {
    '*': COMMON_ATTRS,
    a: [...COMMON_ATTRS, 'href', 'target', 'rel', 'name'],
    img: [...COMMON_ATTRS, 'src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes'],
    /**
     * SVG ko apne geometry attributes chahiye, warna icon render hi nahi hoga.
     *
     * ⚠️ **`viewbox` chhota likha hai, aur wo galti nahi hai.** `sanitize-html` attribute ke
     * naam lowercase karke milaata hai, aur SVG me `viewBox` case-sensitive hai — sirf
     * `viewBox` likhne pe wo allowlist se **match hi nahi hota** aur chup-chaap gir jaata
     * hai. Uske bina `<svg>` ka koi naap nahi rehta aur icon render hi nahi hota (test se
     * pakda gaya). HTML parser SVG ke andar `viewbox` ko wapas `viewBox` bana deta hai,
     * isliye browser me wo theek chalta hai.
     */
    svg: [
      ...COMMON_ATTRS,
      'viewbox',
      'viewBox',
      'width',
      'height',
      'fill',
      'stroke',
      'stroke-width',
      'xmlns',
      'aria-hidden',
      'focusable',
      'role',
    ],
    path: ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'class'],
    circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'class'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'class'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'class'],
    polyline: ['points', 'fill', 'stroke', 'stroke-width', 'class'],
    polygon: ['points', 'fill', 'stroke', 'stroke-width', 'class'],
    g: ['fill', 'stroke', 'transform', 'class'],
    iframe: [...COMMON_ATTRS, 'src', 'width', 'height', 'allow', 'allowfullscreen', 'loading'],
    td: [...COMMON_ATTRS, 'colspan', 'rowspan'],
    th: [...COMMON_ATTRS, 'colspan', 'rowspan', 'scope'],
    col: [...COMMON_ATTRS, 'span'],
  },

  /**
   * ⚠️ `javascript:` yahin ruk-ta hai — allowlist hai, denylist nahi.
   *
   * `data:` bhi bahar hai: `data:text/html` ek poora page chala deta hai. Image ke liye
   * `data:` chahiye ho to wo alag se `allowedSchemesByTag` me aayega, poore board pe nahi.
   */
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],

  /** `iframe` sirf `https:` — client ne future ke liye maanga, par plain http nahi. */
  allowedSchemesByTag: { iframe: ['https'] },

  /**
   * `<script>` aur `<style>` ka **poora content** girta hai, sirf tag nahi.
   *
   * Bina iske `<script>alert(1)</script>` ka tag hat kar `alert(1)` **text** ban kar page pe
   * chhap jaata — bewakoofi jaisa dikhta hai aur client ko lagta hai kuch toot gaya.
   */
  nonTextTags: ['script', 'style', 'textarea', 'noscript'],

  /**
   * `on*` handlers apne aap gir jaate hain (wo `allowedAttributes` me hain hi nahi) — ye
   * comment isliye hai ki koi use "chhoot gaya" samajh kar jodne na lag jaaye.
   */
  disallowedTagsMode: 'discard',
}

/**
 * **Inline profile** — `whatsIncluded.included[]` jaisi ek list ki line.
 *
 * ⚠️ Yahan block tag jaan-boojh kar nahi hain. Wo line theme ke `<li>` ke **andar** chhapti
 * hai (`<li><Tick />{line}</li>`), aur `<li>` ke andar ek `<p>` ya `<div>` layout tod deta
 * hai — line apne icon se alag ho kar neeche chali jaati hai. Design nahi badalna, isliye
 * ye rok yahan design ka hissa hai, sirf suraksha ki nahi.
 */
const INLINE = {
  allowedTags: [
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'ins',
    'sub',
    'sup',
    'mark',
    'small',
    'a',
    'span',
    'code',
    'br',
  ],
  allowedAttributes: {
    '*': ['class', 'style', 'title', 'lang'],
    a: ['class', 'style', 'title', 'href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  nonTextTags: ['script', 'style', 'textarea', 'noscript'],
  disallowedTagsMode: 'discard',
}

/**
 * Bina attribute wale `<span>` khol do — 8 Sep me juda.
 *
 * ⚠️ **Client ne ye pakda, aur uska lakshan dhokha dene wala tha:** usne FAQ me saada text
 * paste kiya aur Text tab me `<p><span>No. Roundtrip flights…</span></p>` dikha — use laga ki
 * "kuch aur paste ho gaya". Text bilkul sahi tha; sirf ek bekaar `<span>` uske saath aa gaya tha.
 *
 * Wo `<span>` browser se aata hai: rendered page se copy karne pe clipboard usme apni styling ke
 * span daal deta hai. Hum TinyMCE se kehte hain _"kuch mat chhaanto"_ (`valid_elements: '*[*]'`,
 * D-80) taaki client ka `class`/`id`/`style` bach sake — uska side effect ye hai ki paste ka
 * kachra bhi bach jaata hai.
 *
 * ⚠️ **Sirf wo `<span>` khulta hai jiska koi attribute na ho.** `<span class="x">` ya
 * `<span style="…">` bilkul chhua nahi jaata — wo client ka apna faisla hai aur D-80 ka poora
 * vaada usi pe khada hai. Bina attribute ke span ka koi matlab hota hi nahi.
 *
 * Loop isliye ki span ek doosre ke andar bhi ho sakte hain (`<span><span>x</span></span>`);
 * chhat isliye ki koi gadha hua input use hamesha ke liye ghumaa na sake.
 */
function unwrapBareSpans(html) {
  let out = html
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/<span>([\s\S]*?)<\/span>/g, '$1')
    if (next === out) break
    out = next
  }

  return out
}

/**
 * Block-level rich text saaf karo.
 *
 * @param {unknown} html
 * @returns {string}
 */
export function sanitizeBlockHtml(html) {
  if (!html) return ''

  return unwrapBareSpans(sanitizeHtmlLib(String(html), BLOCK))
}

/**
 * Ek list ki line saaf karo — sirf inline markup bachta hai.
 *
 * @param {unknown} html
 * @returns {string}
 */
export function sanitizeInlineHtml(html) {
  if (!html) return ''

  return unwrapBareSpans(sanitizeHtmlLib(String(html), INLINE))
}

// ── kaunsa field HTML hai — ek hi jagah ─────────────────────────────────────

/**
 * ⚠️ **Neeche wale teen function is file ke sabse zaroori hisse hain.**
 *
 * "Kaunsa field HTML rakhta hai" ka jawab **ek hi jagah** hona chahiye. Har service me
 * apna-apna sanitize likhne ka matlab hai ki kal koi naya HTML field jode aur ek jagah pe
 * sanitize likhna bhool jaaye — aur wo bhoolna **chup** hoga: content save ho jaayega, page
 * pe theek dikhega, aur zeher DB me pada rahega jab tak koi use chala na de.
 *
 * Yahi shakl is repo me chaar baar mil chuki hai (D-64 · D-65 · D-68 · D-75) — wahan sirf
 * data gayab hota tha; yahan suraksha ka sawaal hai.
 */

/**
 * `content.blocks[]` ki saari HTML — D-87 §7.
 *
 * Pehle yahan sirf `richText` tha (Overview). Ab page ka content **blocks ki list** hai, aur
 * unme se chaar ke andar admin ki likhi HTML baithti hai:
 *
 * | Block | Kahan |
 * | --- | --- |
 * | `richText` | `props.html` — "Text" block |
 * | `twoColumn` | `props.left` · `props.right` — dono khaane |
 * | `cards` | `props.items[].text` — **inline** profile |
 * | `faqs` | `props.description` · `props.items[].answer` |
 *
 * ⚠️ **Naya block type jodte waqt ise bhi jodna hai.** Yahan chhoot jaane ka matlab ye nahi
 * ki content gir jaayega — wo bilkul theek save hoga, **bina safai ke**, aur page pe
 * `dangerouslySetInnerHTML` se render ho jaayega (R20). Ye us "whitelist wale jaal" ki ulti
 * shakl hai jo `updatePackageDefaults()` pe chaar baar laga: wahan bhoolne se content **kho**
 * jaata tha, yahan bhoolne se content **bach** jaata hai — aur wahi zyada khatarnak hai.
 *
 * ⚠️ Card ka text **inline** profile se guzarta hai, block se nahi — wahi wajah jo
 * `whatsIncluded` ki lines pe hai: wo ek chhoti line hai aur uske andar `<p>` layout tod deta
 * hai.
 */
export function sanitizeContent(content) {
  if (!content?.blocks) return content

  return {
    ...content,
    blocks: content.blocks.map((block) => {
      if (!block?.props) return block
      const p = block.props

      switch (block.type) {
        case 'richText':
          return { ...block, props: { ...p, html: sanitizeBlockHtml(p.html) } }

        case 'twoColumn':
          return {
            ...block,
            props: {
              ...p,
              /** Heading ke neeche ki line — D-88 §9 me judi (client, 8 Sep). */
              description: sanitizeBlockHtml(p.description),
              left: sanitizeBlockHtml(p.left),
              right: sanitizeBlockHtml(p.right),
            },
          }

        case 'cards':
          return {
            ...block,
            props: {
              ...p,
              /** Heading ke neeche ki line — D-88 §9 me judi (client, 8 Sep). */
              description: sanitizeBlockHtml(p.description),
              items: (p.items ?? []).map((item) =>
                item ? { ...item, text: sanitizeInlineHtml(item.text) } : item,
              ),
            },
          }

        case 'faqs':
          return {
            ...block,
            props: {
              ...p,
              /** Heading ke neeche ki line — 8 Sep me judi (client). */
              description: sanitizeBlockHtml(p.description),
              items: (p.items ?? []).map((faq) =>
                faq ? { ...faq, answer: sanitizeBlockHtml(faq.answer) } : faq,
              ),
            },
          }

        default:
          return block
      }
    }),
  }
}

/**
 * `entries.fields` ki saari HTML jagah.
 *
 * ⚠️ **Is list me naya field jodna bhoolna ek chup-chaap XSS hai** (R20). Yahan na hone ka
 * matlab ye nahi ki content gir jaayega — wo bilkul theek save hoga, **bina safai ke**, aur
 * page pe `dangerouslySetInnerHTML` se render ho jaayega. Ye us "whitelist wale jaal" ki ulti
 * shakl hai jo `updatePackageDefaults()` pe chaar baar laga: wahan bhoolne se content **kho**
 * jaata tha, yahan bhoolne se content **bach** jaata hai — aur wahi zyada khatarnak hai.
 */
export function sanitizeEntryFields(fields) {
  if (!fields) return fields

  const out = { ...fields }

  if (Array.isArray(out.itinerary)) {
    out.itinerary = out.itinerary.map((day) =>
      day ? { ...day, description: sanitizeBlockHtml(day.description) } : day,
    )
  }

  if (Array.isArray(out.faqs)) {
    out.faqs = out.faqs.map((faq) =>
      faq ? { ...faq, answer: sanitizeBlockHtml(faq.answer) } : faq,
    )
  }

  /** Page/Tour Page ka sub heading — asli editor hai, plain text nahi (D-87 faisla #3). */
  if (out.subheading !== undefined) out.subheading = sanitizeBlockHtml(out.subheading)

  /*
   * ⚠️ **Blocks yahan **nahi** hain — 7 Sep ko badla (D-87 §7).**
   *
   * Kuch ghante ke liye yahan `fields.blocks` ke andar ka prose saaf hota tha. Ab blocks
   * `content.blocks[]` me hain, aur unki safai `sanitizeContent()` me — wahi jagah jahan
   * `richText` pehle se saaf hota tha.
   */

  return out
}

/**
 * Sidebar ke widgets ki HTML — `Appearance ▸ Sidebar` (D-88).
 *
 * Aaj sirf `html` widget me prose hai. `enquiryForm` me ek id hai aur `talkToPlanner` ka poora
 * content derive hota hai — dono me saaf karne ko kuch hai hi nahi.
 *
 * ⚠️ **Naya widget type jodo to yahan bhi jodo.** Ye wahi jaal hai jo `sanitizeContent()` aur
 * `sanitizeEntryFields()` ke upar likha hai: chhoot jaane ka matlab ye **nahi** ki content gir
 * jaayega — wo **bina safai ke bach** jaayega, aur sidebar har us page pe render hoti hai
 * jisne use chuna hai.
 */
export function sanitizeSidebarWidgets(widgets) {
  if (!Array.isArray(widgets)) return widgets

  return widgets.map((widget) => {
    if (!widget?.props) return widget

    switch (widget.type) {
      case 'html':
        return { ...widget, props: { ...widget.props, html: sanitizeBlockHtml(widget.props.html) } }

      /** Heading ke neeche ki line — D-88 §10 me judi. */
      case 'enquiryForm':
        return {
          ...widget,
          props: { ...widget.props, description: sanitizeBlockHtml(widget.props.description) },
        }

      default:
        return widget
    }
  })
}

/**
 * `packageDefaults` ke chaar HTML jagah.
 *
 * ⚠️ `whatsIncluded` ki lines **inline** profile se guzarti hain, block se nahi — wo theme ke
 * `<li>` ke andar chhapti hain aur wahan `<p>` layout tod deta hai.
 */
export function sanitizePackageDefaults(input) {
  if (!input) return input

  const out = { ...input }

  if (out.whatsIncluded) {
    out.whatsIncluded = {
      ...out.whatsIncluded,
      included: (out.whatsIncluded.included ?? []).map(sanitizeInlineHtml),
      excluded: (out.whatsIncluded.excluded ?? []).map(sanitizeInlineHtml),
    }
  }

  if (out.cancellationText !== undefined) {
    out.cancellationText = sanitizeBlockHtml(out.cancellationText)
  }

  if (Array.isArray(out.bookingSteps)) {
    out.bookingSteps = out.bookingSteps.map((step) =>
      step ? { ...step, text: sanitizeBlockHtml(step.text) } : step,
    )
  }

  if (out.sectionLabels) {
    out.sectionLabels = Object.fromEntries(
      Object.entries(out.sectionLabels).map(([key, section]) => [
        key,
        section && 'description' in section
          ? { ...section, description: sanitizeBlockHtml(section.description) }
          : section,
      ]),
    )
  }

  return out
}
