import { z } from 'zod'
import { blockSchema, collectBlockIds } from './block.js'

/**
 * Entry ka `content` field — spec 002.
 *
 * Ye shape **Phase 1 se hi** use hoti hai, page builder aane se pehle. Rich text ek
 * `richText` block ke andar rehta hai — isse Phase 5 me koi migration nahi likhni padti.
 */

/** Abhi ka block-tree version. Tree ka shape badle to ise bump karo + migration likho. */
export const CURRENT_CONTENT_VERSION = 1

export const contentSchema = z.object({
  /**
   * Tree-level version, per-block nahi. Ek page v1 pe ho sakta hai jab site v4 pe hai —
   * wo page do saal se edit hi nahi hua. Block-tree migrations read pe lazily chalti hain.
   */
  version: z.number().int().positive().default(CURRENT_CONTENT_VERSION),
  blocks: z.array(blockSchema).default([]),
})

/** Naye entry ka default content. */
export function emptyContent() {
  return { version: CURRENT_CONTENT_VERSION, blocks: [] }
}

/**
 * Rich text ko content shape me wrap karta hai — Phase 1 ka classic editor isse use
 * karega, taaki Phase 5 me builder wahi data padh sake.
 *
 * @param {unknown} doc TipTap ka JSON document
 * @param {string} [id]
 */
export function contentFromRichText(doc, id = 'rt1') {
  return {
    version: CURRENT_CONTENT_VERSION,
    blocks: [{ id, type: 'richText', props: { doc }, children: [] }],
  }
}

/**
 * Plain text (har line ek paragraph) → `content` shape.
 *
 * Doc **TipTap ke shape me** banta hai (`{ type: 'doc', content: [paragraph…] }`) bhale hi
 * abhi editor ek saada textarea ho. Wajah seedhi hai: agar aaj yahan ek plain string
 * store kar di jaaye, to TipTap aane ke din har entry pe ek migration likhni padegi —
 * aur wo Phase 1 ka documented trap hai (05-BUILD-PLAN).
 *
 * @param {string} text
 * @param {string} [id]
 */
export function richTextFromPlain(text, id = 'rt1') {
  const paragraphs = String(text ?? '')
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }))

  return contentFromRichText({ type: 'doc', content: paragraphs }, id)
}

/**
 * `content` se wapas plain text — editor me dikhane ke liye.
 *
 * Sirf `text` nodes uthata hai, isliye TipTap ka bold/italic/link markup gir jaata hai.
 * Ye jaan-boojh kar hai: jab tak editor plain textarea hai, use wo markup dikhana bhi
 * nahi chahiye aur save pe wo waise bhi kho jaata. **TipTap aane pe ye function editor
 * ke raaste se hat jaayega** — doc seedha usme jaayega.
 *
 * @param {import('../types.js').Content} content
 * @returns {string}
 */
export function plainFromRichText(content) {
  const block = (content?.blocks ?? []).find((b) => b.type === 'richText')
  const doc = block?.props?.doc

  if (typeof doc === 'string') return doc

  const lines = []
  const walk = (nodes) => {
    for (const node of nodes ?? []) {
      if (node.type === 'text' && node.text) lines.push(node.text)
      if (node.content) walk(node.content)
    }
  }

  for (const node of doc?.content ?? []) {
    const before = lines.length
    walk([node])
    // Har top-level paragraph apni line pe — warna poora doc ek lambi line ban jaata hai
    if (lines.length > before) lines.push('\n')
  }

  return lines.join('').trim()
}

/**
 * Tree me duplicate block ids dhoondhta hai.
 *
 * Duplicate ids se builder ke tree operations (move/duplicate/delete) chup-chaap galat
 * block pe lag jaate hain — JS me type safety nahi hai, isliye ye check zaroori hai.
 *
 * @param {import('../types.js').Content} content
 * @returns {string[]} duplicate ids, khaali array = sab theek
 */
export function findDuplicateBlockIds(content) {
  const ids = collectBlockIds(content?.blocks ?? [])
  const seen = new Set()
  const dupes = new Set()

  for (const id of ids) {
    if (seen.has(id)) dupes.add(id)
    seen.add(id)
  }

  return [...dupes]
}
