/**
 * `content.blocks` ka `richText` block render karta hai — spec 002 ka envelope.
 *
 * **Ye `BlockRenderer` nahi hai.** Wo Phase 5 me aayega aur poora block tree chalayega
 * (`packages/blocks`, D-07). Aaj package ka content ek hi `richText` block hai (D-46 §3),
 * aur uske liye poora registry laana bekaar hai.
 *
 * ## ⚠️ `dangerouslySetInnerHTML` ab yahan hai — aur pehle jaan-boojh kar nahi tha
 *
 * D-69 tak yahan ek node-walker tha jo TipTap ka JSON tree chal kar React elements banata
 * tha, aur us file me likha tha:
 *
 * > _"Rich text **client** likhta hai; use HTML ki tarah chalane ka matlab hai ki admin ka
 * > likha `<script>` har visitor ke browser me chale."_
 *
 * Wo baat aaj bhi sach hai. Badla ye hai ki content ab **HTML hai** (D-80 — client ko
 * WordPress jaisa "HTML tab me kuch bhi likho" chahiye tha), aur uska bachav ab yahan nahi,
 * **write pe** hai: `apps/api/src/core/sanitize-html.js` har HTML field ko save se pehle
 * saaf karta hai.
 *
 * Yaani suraksha gayab nahi hui, **jagah badli hai** — aur wo jagah behtar hai: DB me kabhi
 * gandi HTML pahunchti hi nahi, isliye har naye reader ko khud bachne ki zaroorat nahi.
 *
 * ⚠️ Iska ek seedha nateeja: **is file me kabhi bina sanitize ki HTML mat bhejo.** Agar kal
 * koi naya field yahan aaye, to pehle dekho ki uska write path sanitizer se guzarta hai.
 */

/**
 * Ek raw HTML string — bina `content` envelope ke.
 *
 * Ye D-69 me alag kiya gaya tha: rich text `entry.content` ke bahar bhi hai (section ki
 * description), aur wahan sirf content hota hai, block wala envelope nahi.
 */
export function RichTextDoc({ html, className = 'rt' }) {
  if (!html) return null

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export default function RichText({ content }) {
  const block = (content?.blocks ?? []).find((b) => b.type === 'richText')

  return <RichTextDoc html={block?.props?.html} />
}
