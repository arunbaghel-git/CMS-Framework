import { CURRENT_CONTENT_VERSION } from './schemas/content.js'

/**
 * Block-tree migrations — D-16 / 06-OPERATIONS.md §3.2.
 *
 * Ye schema migrations se **alag system** hai, aur alag isliye hai:
 * ek page ka `content.version` v1 pe ho sakta hai jab site v4 pe hai — wo page do
 * saal se edit hi nahi hua. Isliye ye per-document chalti hain, ek baar nahi.
 *
 *   - Read pe **lazily** chalti hain, aur ek background batch job se
 *   - **Idempotent** — ek document pe kai baar chal sakti hai
 *   - Block ka `type` string kabhi rename mat karo (R4). Rename chahiye to yahan map karo.
 */

/**
 * @typedef {(content: import('./types.js').Content) => import('./types.js').Content} BlockMigration
 */

/**
 * Version N ka content → version N+1.
 *
 * Key = **source** version. Abhi khaali hai kyunki sirf v1 exist karta hai.
 *
 * Example jab v2 aayega:
 *   1: (content) => ({
 *     ...content,
 *     version: 2,
 *     blocks: renameType(content.blocks, 'text', 'paragraph'),
 *   })
 *
 * @type {Record<number, BlockMigration>}
 */
export const blockMigrations = {}

/**
 * Content ko current version tak le jaata hai.
 *
 * Ye har read pe chalta hai, isliye same-version case pe **kuch nahi karta** —
 * koi copy nahi, koi allocation nahi.
 *
 * @param {import('./types.js').Content} content
 * @returns {import('./types.js').Content}
 */
export function migrateContent(content) {
  if (!content) return content

  const version = content.version ?? 1
  if (version >= CURRENT_CONTENT_VERSION) return content

  let current = content
  let guard = 0

  while ((current.version ?? 1) < CURRENT_CONTENT_VERSION) {
    const from = current.version ?? 1
    const step = blockMigrations[from]

    if (!step) {
      throw new Error(
        `Block-tree migration missing: v${from} → v${from + 1}. ` +
          `packages/shared/src/block-migrations.js me add karo.`,
      )
    }

    current = step(current)

    // Migration ne version badhaya hi nahi — infinite loop se bachao
    if ((current.version ?? 1) <= from) {
      throw new Error(`Block migration v${from} ne version bump nahi kiya`)
    }

    if (++guard > 100) throw new Error('Block migration loop — 100 steps se zyada')
  }

  return current
}

/** Kya is content ko migrate karna hai? Batch job isse filter karti hai. */
export function needsContentMigration(content) {
  return (content?.version ?? 1) < CURRENT_CONTENT_VERSION
}

/**
 * Tree me har block pe function chalata hai — migrations likhne ka helper.
 *
 * @param {import('./types.js').Block[]} blocks
 * @param {(block: import('./types.js').Block) => import('./types.js').Block} fn
 * @returns {import('./types.js').Block[]}
 */
export function mapBlocks(blocks = [], fn) {
  return blocks.map((block) => {
    const mapped = fn(block)
    return mapped.children?.length
      ? { ...mapped, children: mapBlocks(mapped.children, fn) }
      : mapped
  })
}

/**
 * Block type rename karne ka helper. Type string DB me stored hai, isliye rename
 * hamesha migration ke through hota hai (R4).
 *
 * @param {import('./types.js').Block[]} blocks
 * @param {string} from
 * @param {string} to
 */
export function renameBlockType(blocks, from, to) {
  return mapBlocks(blocks, (block) => (block.type === from ? { ...block, type: to } : block))
}
