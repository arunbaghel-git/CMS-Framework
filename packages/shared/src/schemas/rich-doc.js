import { z } from 'zod'

/**
 * TipTap ka JSON document — rich text ka **stored** shape.
 *
 * Ye is repo me pehla jagah hai jahan rich text `entry.content` ke bahar ja raha hai
 * (D-69). Isliye uska contract yahan, ek jagah likha ja raha hai — pehle wo `blockSchema`
 * ke `props: z.record(z.unknown())` ke andar chhupa hua tha aur uska koi apna naam nahi tha.
 *
 * ## Ye HTML nahi hai — aur yahi is faisle ki buniyaad hai
 *
 * TipTap HTML store **nahi** karta. Wo nodes ka ek ped store karta hai
 * (`{type:'paragraph', content:[{type:'text', text:'…'}]}`), aur theme us ped ko chal kar
 * React elements banati hai (`RichTextDoc`). Kahin `dangerouslySetInnerHTML` hai hi nahi.
 *
 * Nateeja: XSS **filter** nahi hota, wo **ban hi nahi sakta**. WordPress ko `wp_kses` isliye
 * chahiye ki wo HTML string store karta hai; hum wo problem paalte hi nahi.
 *
 * ⚠️ Iski keemat bhi hai: aap wahi likh sakte hain jo editor ke schema me hai. Table,
 * iframe ya custom markup **nahi** ja sakte. Client ne 1 Sep ko kaha ki abhi kisi design me
 * table hai hi nahi, to us par focus nahi kar rahe — par jis din wo chahiye, ye ek naya
 * faisla hoga (sanitizer + permission gate, WP wale raaste jaisa), aur ye shape usme rukawat
 * nahi banta.
 *
 * ## Node-level validation jaan-boojh kar nahi hai
 *
 * `content` ke andar ke nodes `unknown` hain. Har TipTap node type ka Zod schema likhne ka
 * matlab hota ki har naya extension (aaj blockquote, kal table) do jagah add karna pade —
 * editor me aur yahan — aur ek jagah bhoolne pe client ka likha content **write pe hi**
 * reject ho jaata. Wo failure mode is spec se bura hai.
 *
 * Bachav do jagah se aata hai: renderer sirf **jaane-pehchane** node types render karta hai
 * (anjaan node ka sirf text nikalta hai), aur neeche wala size cap.
 */

/** Top-level nodes ki hadd — ek section ki description ke liye kaafi se zyada. */
const MAX_TOP_LEVEL_NODES = 60

/**
 * Poore doc ka size cap — **bytes me, characters me nahi**.
 *
 * Pehle ye field ek plain string thi aur uspe `max(3000)` tha. Doc me wahi text markup ke
 * saath aata hai, isliye character count ab bemaani hai. 40KB usi text ke lagbhag barabar
 * hai, aur ek 10MB ka doc paste karke DB bharne se rokta hai.
 */
const MAX_DOC_BYTES = 40_000

/**
 * Aakhir ke khaali paragraph gira do.
 *
 * ⚠️ TipTap heading ke baad ek **trailing khaali paragraph** chhod deta hai — ProseMirror ka
 * apna vyavhaar hai (heading ke neeche cursor rakhne ki jagah). Wo chup-chaap save ho jaata
 * hai aur page pe ek khaali `<p>` ban kar ~23px ki bina wajah ki jagah bana deta hai.
 *
 * **Sirf aakhir se** hataye jaate hain, beech se nahi: beech ka khaali paragraph client ne
 * jaan-boojh kar chhoda ho sakta hai, aur uska matlab badalna hamara kaam nahi.
 */
const trimTrailingEmpty = (doc) => {
  const nodes = [...(doc.content ?? [])]

  while (nodes.length > 0) {
    const last = nodes[nodes.length - 1]
    if (last?.type !== 'paragraph' || last.content?.length) break
    nodes.pop()
  }

  return { ...doc, content: nodes }
}

export const richDocSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(z.unknown()).max(MAX_TOP_LEVEL_NODES).default([]),
  })
  .refine((doc) => JSON.stringify(doc).length <= MAX_DOC_BYTES, {
    message: `Rich text is too long (max ${MAX_DOC_BYTES / 1000}KB)`,
  })
  .transform(trimTrailingEmpty)

/** Khaali doc — naya field, aur "line hata do" wala jawab. */
export const emptyDoc = () => ({ type: 'doc', content: [] })

/**
 * Doc khaali hai ya nahi.
 *
 * ⚠️ **Ye helper isliye zaroori hai ki D-65 ka poora niyam "khaali" pe tika hai** — khaali
 * description ka matlab "wo line page se hata do". String me `''` do-tuk tha; doc me wo
 * teen shakl le leta hai, aur teenon TipTap khud banata hai:
 *
 * ```
 * undefined                                             kabhi chhua hi nahi
 * { type: 'doc', content: [] }                          saaf khaali
 * { type: 'doc', content: [{ type: 'paragraph' }] }     ← editor kholo aur band kar do
 * ```
 *
 * Teesri shakl hi wo hai jo galti karwati: `content.length` dekh kar wo "bhari hui" lagti
 * hai, jabki page pe usse ek khaali `<p>` ke alawa kuch nahi banta.
 */
export function isEmptyDoc(doc) {
  const nodes = doc?.content
  if (!Array.isArray(nodes) || nodes.length === 0) return true

  return nodes.every((node) => {
    if (node?.type !== 'paragraph') return false

    const inner = node.content
    if (!Array.isArray(inner) || inner.length === 0) return true

    return inner.every((child) => child?.type === 'text' && !String(child.text ?? '').trim())
  })
}

/**
 * Saada text → doc. Har line ek paragraph.
 *
 * Do jagah chahiye: **defaults** (`package-sections.js` me wo padhne laayak strings hi rehti
 * hain — unhe doc me likhna file ko bina wajah bhaari kar deta) aur **migration** (purani
 * plain-text descriptions ko naye shape me laane ke liye).
 *
 * Khaali line paragraph nahi banti — warna doc ke shuru me ek khaali `<p>` aa jaata hai.
 */
export function textToDoc(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return emptyDoc()

  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  }
}
