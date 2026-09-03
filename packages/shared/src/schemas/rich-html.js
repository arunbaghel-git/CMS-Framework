import { z } from 'zod'

/**
 * Rich text ka **stored shape — ab HTML string** (D-80, client 3 Sep).
 *
 * ## Ye `rich-doc.js` ki jagah aaya hai, aur wo badlaav sasta nahi tha
 *
 * Pehle yahan TipTap ka JSON tree store hota tha, aur us file me is din ki bhavishyavani
 * likhi hui thi:
 *
 * > _"TipTap HTML store nahi karta… kahin `dangerouslySetInnerHTML` hai hi nahi. Nateeja:
 * > XSS **filter** nahi hota, wo **ban hi nahi sakta**… par jis din wo chahiye, ye ek naya
 * > faisla hoga (sanitizer + permission gate)."_
 *
 * Client ko WordPress ke Classic Editor jaisa chahiye tha: Text tab me `class`, `id` aur
 * inline `style` likho to **kuch gayab na ho**. Schema-based editor wo de hi nahi sakta —
 * jo tag uske schema me nahi, wo hata deta hai, chahe aap khud likho.
 *
 * ## Isliye ab XSS ek asli khatra hai, aur uska ilaaj ek hi jagah hai
 *
 * Ye schema **sirf shape aur size** dekhta hai. Asli safai
 * `apps/api/src/core/sanitize-html.js` me hoti hai aur wo **write pe** chalti hai (R1),
 * render pe nahi — taaki DB me kabhi gandi HTML pahunche hi nahi aur theme bharosa kar sake.
 *
 * ⚠️ Zod se sanitize **nahi** kiya ja raha, aur wo jaan-boojh kar hai: `packages/shared`
 * admin ke browser me bhi chalta hai, aur sanitizer ka bharosa client-side pe rakhna hi wo
 * galti hai jisse XSS aata hai. Safai server pe, hamesha.
 */

/**
 * Poore HTML ka size cap — **bytes me, characters me nahi**.
 *
 * `rich-doc.js` se wahi 40KB uthaya gaya hai, aur wajah bhi wahi: text markup ke saath aata
 * hai, isliye character count bemaani hai. Ek 10MB ka paste DB bharne se rok deta hai.
 */
const MAX_HTML_BYTES = 40_000

/** Ek list ki line — chhoti hai, isliye apna chhota cap. */
const MAX_INLINE_BYTES = 2_000

/**
 * Aakhir ke khaali paragraph gira do.
 *
 * ⚠️ Ye rok `rich-doc.js` se aayi hai aur ab bhi utni hi zaroori hai — TinyMCE bhi content
 * ke aakhir me ek khaali `<p>` chhod deta hai (cursor rakhne ki jagah). Wo chup-chaap save
 * ho jaata hai aur page pe bina wajah ~23px ki jagah bana deta hai.
 *
 * **Sirf aakhir se** — beech ka khaali paragraph client ne jaan-boojh kar chhoda ho sakta
 * hai, aur uska matlab badalna hamara kaam nahi.
 */
const trimTrailingEmpty = (html) =>
  String(html ?? '')
    .replace(/(?:\s*<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>)+\s*$/gi, '')
    .trim()

/** Block-level rich text — Overview, section descriptions, itinerary din, FAQ answer… */
export const htmlSchema = z
  .string()
  .max(MAX_HTML_BYTES, `Content is too long (max ${MAX_HTML_BYTES / 1000}KB)`)
  .default('')
  .transform(trimTrailingEmpty)

/**
 * Ek list ki line ka inline HTML — `whatsIncluded.included[]` jaisi jagah.
 *
 * Yahan block tag allow nahi hote (wo `sanitize-html.js` ka `inline` profile dekhta hai):
 * `<li>` ke andar ek `<p>` layout tod deta hai. Yahan sirf size aur trim.
 */
export const inlineHtmlSchema = z
  .string()
  .max(MAX_INLINE_BYTES, `Line is too long (max ${MAX_INLINE_BYTES / 1000}KB)`)
  .default('')
  .transform((value) => String(value ?? '').trim())

/** Khaali content — naya field, aur "ye line hata do" wala jawab. */
export const emptyHtml = () => ''

/**
 * HTML khaali hai ya nahi.
 *
 * ⚠️ **Ye helper isliye zaroori hai ki D-65 ka poora niyam "khaali" pe tika hai** — khaali
 * description ka matlab "wo line page se hata do". Aur "khaali" ki ek shakl nahi hoti; ye
 * teenon editor **khud** banata hai aur teenon page pe kuch nahi dikhate:
 *
 * ```
 * ''                            kabhi chhua hi nahi
 * '<p></p>'                     editor kholo aur band kar do
 * '<p>&nbsp;</p>'               ek space type karke hata do
 * ```
 *
 * Doosri aur teesri shakl hi galti karwati hain: `html.length` dekh kar wo "bhari hui"
 * lagti hain. Yahi jaal `isEmptyDoc()` me tha, bas ab HTML ki shakl me.
 */
export function isEmptyHtml(html) {
  const text = String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()

  if (text) return false

  /** Text na ho par `<img>` ya `<iframe>` ho to wo khaali nahi hai — kuch to dikhega. */
  return !/<(img|iframe|video|hr|table)\b/i.test(String(html ?? ''))
}

/** HTML me guse hue special characters — plain text ko HTML me daalne se **pehle**. */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Saada text → HTML. Har line ek `<p>`, aur `-` se shuru hone wali line `<li>`.
 *
 * Do jagah chahiye: **defaults** (`package-sections.js` me wo padhne laayak strings hi rehti
 * hain) aur **migration 020** (purane plain-text fields ko HTML me laane ke liye).
 *
 * ⚠️ **`escapeHtml()` sabse zaroori kadam hai, aur sabse aasaan chhoot jaane wala.** Purana
 * text plain tha — usme `Kids < 5 years free` jaisi line bilkul theek thi. HTML me wo ek
 * adhoora tag ban jaati hai aur uske aage ka poora text **gayab** ho jaata hai. Wo failure
 * chup hoti: koi error nahi, bas aadhi line.
 *
 * ⚠️ `-` wala niyam **D-64** se aa raha hai (migration 014 ne usi shape me data daala tha).
 * Ab wo asli `<ul>` ban jaata hai — yaani wo convention ab data me nahi, sirf is converter
 * me zinda hai.
 */
export function textToHtml(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''

  const out = []
  let list = null

  for (const line of lines) {
    const bullet = /^[-•]\s*/.test(line)

    if (bullet) {
      list ??= []
      list.push(`<li>${escapeHtml(line.replace(/^[-•]\s*/, ''))}</li>`)
      continue
    }

    if (list) {
      out.push(`<ul>${list.join('')}</ul>`)
      list = null
    }
    out.push(`<p>${escapeHtml(line)}</p>`)
  }

  if (list) out.push(`<ul>${list.join('')}</ul>`)

  return out.join('')
}
