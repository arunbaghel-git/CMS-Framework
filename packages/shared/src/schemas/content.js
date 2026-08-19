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
