/**
 * `content.blocks` ka `richText` block render karta hai — spec 002 ka envelope.
 *
 * **Ye `BlockRenderer` nahi hai.** Wo Phase 5 me aayega aur poora block tree chalayega
 * (`packages/blocks`, D-07). Aaj package ka content ek hi `richText` block hai (D-46 §3),
 * aur uske liye poora registry laana bekaar hai.
 *
 * ⚠️ **`dangerouslySetInnerHTML` yahan jaan-boojh kar nahi hai.** Rich text **client**
 * likhta hai; use HTML ki tarah chalane ka matlab hai ki admin ka likha `<script>` har
 * visitor ke browser me chale. TipTap ka doc ek JSON tree hai, isliye use node-by-node
 * render karna sirf safe nahi — wo hi sahi tareeka hai (architecture §8.2).
 *
 * Jo mark ya node yahan handle nahi hai wo **text ki tarah** girta hai, gayab nahi hota:
 * ek anjaan formatting ki wajah se paragraph ka poora text kho jaana sabse bura nateeja hai.
 */

/** Ek text node ke marks — bold, italic, link. */
function renderText(node, key) {
  let out = node.text ?? ''

  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') out = <strong>{out}</strong>
    else if (mark.type === 'italic') out = <em>{out}</em>
    else if (mark.type === 'code') out = <code>{out}</code>
    else if (mark.type === 'link') {
      const href = mark.attrs?.href ?? ''
      /**
       * `javascript:` jaisa scheme kabhi nahi. TipTap write pe bhi rok-ta hai, par ye
       * doosri deewar hai: purana data aur import kiya hua content dono is raaste se
       * aa sakte hain.
       */
      const safe = /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : ''

      out = safe ? (
        <a href={safe} rel={safe.startsWith('http') ? 'noopener noreferrer' : undefined}>
          {out}
        </a>
      ) : (
        out
      )
    }
  }

  return <span key={key}>{out}</span>
}

function renderNodes(nodes) {
  return (nodes ?? []).map((node, i) => renderNode(node, i))
}

function renderNode(node, key) {
  if (node.type === 'text') return renderText(node, key)

  const children = renderNodes(node.content)

  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{children}</p>
    case 'heading': {
      const level = Math.min(Math.max(node.attrs?.level ?? 2, 2), 4)
      const Tag = `h${level}`
      return <Tag key={key}>{children}</Tag>
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>
    case 'orderedList':
      return <ol key={key}>{children}</ol>
    case 'listItem':
      return <li key={key}>{children}</li>
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>
    case 'hardBreak':
      return <br key={key} />
    case 'horizontalRule':
      return <hr key={key} />
    default:
      // Anjaan node — uska text phir bhi dikhna chahiye
      return <span key={key}>{children}</span>
  }
}

export default function RichText({ content }) {
  const block = (content?.blocks ?? []).find((b) => b.type === 'richText')
  const doc = block?.props?.doc

  if (!doc?.content?.length) return null

  return <div className="rt">{renderNodes(doc.content)}</div>
}
