import { z } from 'zod'

/**
 * Block envelope — spec 002.
 *
 * FROZEN: `{ id, type, props, style, children }`. Ye paanch keys kabhi nahi badlenge.
 * Blocks ki *list* frozen nahi hai — wo Phase 5 me asli client design se nikalegi.
 *
 * Layout hamesha JSON tree hai, HTML string kabhi nahi (D-05) — warna dobara edit
 * karna, theme badalna aur responsive control teenon marr jaate hain.
 */

export const BREAKPOINTS = Object.freeze(['desktop', 'tablet', 'mobile'])

/**
 * Ek breakpoint ke style values.
 *
 * Value space jaan-boojh kar constrained hai (D-20) — non-technical user ko poora CSS
 * dena matlab use site todne ka tool dena. Known keys validate hote hain; baaki
 * `catchall` se bach jaate hain taaki Phase 5 me `styleToCss()` naye controls add kar
 * sake bina purane pages tode.
 */
export const blockStyleSchema = z
  .object({
    // spacing
    paddingY: z.number().int().min(0).max(400).optional(),
    paddingX: z.number().int().min(0).max(400).optional(),
    marginY: z.number().int().min(0).max(400).optional(),
    marginX: z.number().int().min(0).max(400).optional(),
    gap: z.number().int().min(0).max(200).optional(),

    // layout
    maxWidth: z.number().int().min(0).max(2560).optional(),
    columns: z.number().int().min(1).max(4).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),

    // type
    fontSize: z.number().int().min(8).max(200).optional(),

    // surface
    background: z.string().optional(),
    color: z.string().optional(),
    radius: z.number().int().min(0).max(200).optional(),
    shadow: z.enum(['none', 'sm', 'md', 'lg']).optional(),

    // visibility per breakpoint
    hidden: z.boolean().optional(),
  })
  .catchall(z.unknown())

/**
 * Responsive style. Mobile khaali ho to desktop se inherit hota hai —
 * inheritance render time pe hoti hai, store me nahi.
 */
export const responsiveStyleSchema = z.object({
  desktop: blockStyleSchema.optional(),
  tablet: blockStyleSchema.optional(),
  mobile: blockStyleSchema.optional(),
})

/**
 * Block ka `type` string. Ye DB me **stored data** hai — kabhi rename mat karo (R4).
 * Rename chahiye to block-tree migration likho.
 */
export const blockTypeSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-zA-Z0-9]*$/, 'Block type camelCase hona chahiye, jaise richText')

/**
 * Recursive block tree.
 *
 * `z.lazy()` isliye ki `children` apne hi schema ko reference karta hai.
 * @type {z.ZodType<import('../types.js').Block>}
 */
export const blockSchema = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: blockTypeSchema,
    props: z.record(z.unknown()).default({}),
    style: responsiveStyleSchema.optional(),
    children: z.array(blockSchema).optional(),
  }),
)

/**
 * Tree me se saara text nikalta hai — `entries.searchText` ke liye.
 *
 * Zaroori kyun: MongoDB ek collection pe sirf EK text index allow karta hai, aur wo
 * block content cover nahi karta. Iske bina admin search page ke body me kuch
 * dhoondh hi nahi paayega.
 *
 * @param {import('../types.js').Block[]} blocks
 * @returns {string}
 */
export function extractBlockText(blocks = []) {
  const out = []

  const walk = (nodes) => {
    for (const node of nodes ?? []) {
      for (const value of Object.values(node.props ?? {})) {
        if (typeof value === 'string' && value.trim()) out.push(value.trim())
      }
      if (node.children?.length) walk(node.children)
    }
  }

  walk(blocks)
  return out.join(' ')
}

/**
 * Tree ke saare block ids — duplicate detect karne ke liye.
 * @param {import('../types.js').Block[]} blocks
 * @returns {string[]}
 */
export function collectBlockIds(blocks = []) {
  const ids = []
  const walk = (nodes) => {
    for (const node of nodes ?? []) {
      ids.push(node.id)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(blocks)
  return ids
}
