import { z } from 'zod'

import { DEFAULT_LOCALE, DEFAULT_SITE_ID } from '../constants/index.js'

/**
 * `menus` ka contract — **spec 006**, D-43.
 *
 * Admin ka form, API ki validation aur public payload — teenon yahi schema padhte hain
 * (R8). Ye contract Slice 0 me freeze hua hai: menu data 15 live instances pe jaayega,
 * aur baad me shape badalna matlab us saare data ko migrate karna.
 *
 * Shape ka core:
 *
 *   item      menuType: 'link' | 'dropdown' | 'mega'     ← ek menu me teenon mixed
 *   dropdown  children[] — max depth 3 (top → child → grandchild)
 *   mega      layout (width) + columns (grid count)      ← DO ALAG properties
 *             columns[] → column → groups[] → group → links[]
 *
 * **`className` kahin bhi behaviour decide nahi karta (R18).** Wo sirf theme ke liye ek
 * hook hai. Renderer hamesha `menuType` / `layout` / `columns` padhta hai.
 */

// ── Ordering ─────────────────────────────────────────────────────────────────
//
// Kahin koi `order` field **nahi** hai — array ki position hi order hai. Isliye Slice 0
// ke move up/down controls aur baad ka nested drag-drop bilkul ek hi data likhte hain,
// aur drag-drop add karna ek pure UI change hai — koi migration nahi (D-43).

export const MENU_TYPE = Object.freeze({
  LINK: 'link',
  DROPDOWN: 'dropdown',
  MEGA: 'mega',
})

export const MENU_TYPES = Object.freeze(Object.values(MENU_TYPE))

export const LINK_TYPE = Object.freeze({
  ENTRY: 'entry',
  URL: 'url',
  TAXONOMY: 'taxonomy',
})

export const LINK_TYPES = Object.freeze(Object.values(LINK_TYPE))

/**
 * Jo link types **aaj sach me kaam karte hain**.
 *
 * `entry` aur `taxonomy` schema me day 1 se hain (baad me jodna migration hota), par
 * Slice 0 me `entries`/`taxonomies` module hain hi nahi — unki koi id point karne ko
 * nahi hoti. Isliye write pe abhi sirf `url` accept hota hai.
 *
 * **Phase 1 me ye ek line badlegi**, schema nahi (D-30 — connection point abhi, data
 * baad me).
 */
export const SUPPORTED_LINK_TYPES = Object.freeze([LINK_TYPE.URL])

export const LINK_TARGETS = Object.freeze(['_self', '_blank'])

export const MEGA_LAYOUTS = Object.freeze(['sm', 'md', 'wide', 'full'])

export const MEGA_COLUMN_COUNTS = Object.freeze([2, 3, 4, 5, 6])

/** Dropdown ki nesting — top-level ko milakar teen (D-43). */
export const MAX_MENU_DEPTH = 3

// ── layout × columns compatibility (spec 006 §2) ─────────────────────────────
//
// "CMS ko admin se jaan-boojh kar toota hua layout nahi banwana chahiye." Isliye ye ek
// **validation** hai, sirf UI hint nahi.
//
// `sm` behaviour reference me 300px hai — 420px isliye kiya gaya ki 300px pe do columns
// bhi 116px ke bachte hain aur link text 3 line me toot-ta hai.

export const MEGA_LAYOUT_WIDTH = Object.freeze({ sm: 420, md: 780, full: 1280, wide: 1700 })

export const MEGA_PADDING_X = 48
export const MEGA_COLUMN_GAP = 20
export const MIN_COLUMN_WIDTH = 160

/** @param {string} layout @param {number} columns */
export function megaColumnWidth(layout, columns) {
  const width = MEGA_LAYOUT_WIDTH[layout]
  if (!width || !columns) return 0

  return (width - MEGA_PADDING_X - MEGA_COLUMN_GAP * (columns - 1)) / columns
}

/**
 * Ek layout pe kaunse column counts chal sakte hain.
 *
 * Admin ka builder isi se options disable karta hai, aur server isi se `400` deta hai —
 * **ek hi function, do jagah**, taaki dono kabhi alag na ho jaayein.
 *
 * @param {string} layout
 */
export function allowedColumnCounts(layout) {
  return MEGA_COLUMN_COUNTS.filter((n) => megaColumnWidth(layout, n) >= MIN_COLUMN_WIDTH)
}

// ── Common pieces ────────────────────────────────────────────────────────────

/**
 * Custom CSS class — sirf presentation (R18).
 *
 * Character set jaan-boojh kar tang hai: class attribute me quote ya `<` chala jaana
 * markup todta hai, aur ye value seedha public HTML me chhapti hai.
 */
export const classNameSchema = z
  .string()
  .trim()
  .max(120)
  .regex(/^[a-zA-Z0-9 _-]*$/, 'Use letters, numbers, spaces, hyphens and underscores only')
  .default('')

const idSchema = z.string().trim().min(1).max(64)

/**
 * Menu ka URL — relative, absolute, anchor, `mailto:` aur `tel:` sab valid hain.
 *
 * `z.string().url()` yahan **galat** hota: wo `/about` aur `#contact` dono reject karta,
 * jo menu me sabse aam values hain.
 */
export const menuUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .regex(
    /^(\/|#|https?:\/\/|mailto:|tel:)/,
    'Enter a path starting with /, an anchor, or a full https:// address',
  )

export const menuLinkSchema = z
  .object({
    type: z.enum(/** @type {[string, ...string[]]} */ (LINK_TYPES)).default(LINK_TYPE.URL),
    url: z.string().trim().max(2000).default(''),
    /** Dono Phase 1 me live honge — jagah abhi (D-30). */
    entryId: z.string().trim().nullable().default(null),
    taxonomyId: z.string().trim().nullable().default(null),
    target: z.enum(/** @type {[string, ...string[]]} */ (LINK_TARGETS)).default('_self'),
    className: classNameSchema,
  })
  .superRefine((link, ctx) => {
    if (!SUPPORTED_LINK_TYPES.includes(link.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Only custom links are available right now',
      })
      return
    }

    const parsed = menuUrlSchema.safeParse(link.url)
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: parsed.error.issues[0].message,
      })
    }
  })

const labelSchema = z.string().trim().min(1, 'Label is required').max(160)

/**
 * Sabse chhota node — mega ke andar ka link, aur dropdown ka grandchild.
 *
 * **`.strict()` yahan zaroori hai, sirf safai nahi.** Zod default me anjaan keys
 * chup-chaap **hata deta** hai. Uske bina depth-4 wala `children` bina kisi error ke
 * gaayab ho jaata — admin save karta, "ho gaya" dikhta, aur uske items kahin nahi hote.
 * Error dena isse hamesha behtar hai.
 */
const leafItemSchema = z
  .object({
    id: idSchema.optional(),
    label: labelSchema,
    link: menuLinkSchema,
    className: classNameSchema,
  })
  .strict('Menus can be nested three levels deep at most')

// ── Mega ─────────────────────────────────────────────────────────────────────

/**
 * Group — ek column ke andar ek block.
 *
 * `heading` **aur** `link` dono optional hone se wahi teen case bante hain jo client ke
 * behaviour reference me hain: heading + links · **clickable heading** + links · bina
 * heading ke sirf links.
 *
 * Isi liye `linkType: "none"` ki zaroorat khatam ho gayi — wo purana workaround clickable
 * heading ko possible hi nahi hone deta tha (D-43).
 */
export const megaGroupSchema = z
  .object({
    id: idSchema.optional(),
    heading: z.string().trim().max(160).default(''),
    /** `null` = heading clickable nahi hai. */
    link: menuLinkSchema.nullable().default(null),
    className: classNameSchema,
    links: z.array(leafItemSchema).max(50).default([]),
  })
  .superRefine((group, ctx) => {
    if (group.link && !group.heading) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['heading'],
        message: 'Add a heading before making it clickable',
      })
    }
  })

/** Column ek **pure layout wrapper** hai — usme content nahi hota, sirf groups hote hain.
 * Isi wajah se mobile pe columns bina kisi extra rule ke flatten ho jaate hain (D-43). */
export const megaColumnSchema = z.object({
  id: idSchema.optional(),
  className: classNameSchema,
  groups: z.array(megaGroupSchema).max(20).default([]),
})

/** Columns ke neeche full-width row. Har mega pe **optional** hai (D-43). */
export const megaCtaSchema = z.object({
  text: z.string().trim().min(1, 'CTA text is required').max(300),
  buttonLabel: z.string().trim().min(1, 'Button label is required').max(80),
  buttonUrl: menuUrlSchema,
  className: classNameSchema,
})

export const megaSchema = z
  .object({
    layout: z.enum(/** @type {[string, ...string[]]} */ (MEGA_LAYOUTS)).default('wide'),
    /**
     * Declared grid count. Array ka naam `columns` hai, isliye number `columnCount` hai —
     * spec 006 me dono ko `columns` likha tha, wo padhne me ambiguous tha.
     */
    columnCount: z.coerce
      .number()
      .int()
      .refine((n) => MEGA_COLUMN_COUNTS.includes(n), 'Choose between 2 and 6 columns')
      .default(4),
    className: classNameSchema,
    columns: z.array(megaColumnSchema).max(6).default([]),
    /** `null` = is mega pe CTA nahi hai. */
    cta: megaCtaSchema.nullable().default(null),
  })
  .superRefine((mega, ctx) => {
    const allowed = allowedColumnCounts(mega.layout)

    if (!allowed.includes(mega.columnCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columnCount'],
        message: `A ${mega.layout} mega menu supports ${allowed.join(', ')} columns`,
      })
    }

    if (mega.columns.length !== mega.columnCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columns'],
        message: `Expected ${mega.columnCount} columns, found ${mega.columns.length}`,
      })
    }
  })

// ── Items ────────────────────────────────────────────────────────────────────

/** Depth 2 — iske andar grandchild (depth 3) aa sakta hai, usse aage nahi. */
const childItemSchema = leafItemSchema.extend({
  children: z.array(leafItemSchema).max(50).default([]),
})

const baseItemShape = {
  id: idSchema.optional(),
  label: labelSchema,
  link: menuLinkSchema,
  className: classNameSchema,
}

export const menuItemSchema = z.discriminatedUnion('menuType', [
  z.object({ ...baseItemShape, menuType: z.literal(MENU_TYPE.LINK) }),
  z.object({
    ...baseItemShape,
    menuType: z.literal(MENU_TYPE.DROPDOWN),
    children: z.array(childItemSchema).max(50).default([]),
  }),
  z.object({
    ...baseItemShape,
    menuType: z.literal(MENU_TYPE.MEGA),
    mega: megaSchema,
  }),
])

// ── Menu ─────────────────────────────────────────────────────────────────────

export const menuSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),
  /** Day-1 reserve — multi-locale pe uniqueness `{siteId, locale, key}` ban jaati hai
   * (spec 006 §9.1). `02-ARCHITECTURE.md` §3.3 me ye pehle chhoot gaya tha. */
  locale: z.string().default(DEFAULT_LOCALE),
  key: z
    .string()
    .trim()
    .min(1, 'Menu key is required')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  /** Footer me column ki heading **yahi** banti hai — koi alag field nahi (D-43). */
  name: z.string().trim().min(1, 'Menu name is required').max(120),
  items: z.array(menuItemSchema).max(50).default([]),
  /** Optimistic concurrency — do admin ek saath save karein to `409` (spec 006 O-4). */
  version: z.number().int().default(0),
  deletedAt: z.date().nullable().default(null),
})

export const createMenuSchema = menuSchema.pick({ key: true, name: true, items: true })

/**
 * Update pe `key` badalna allowed **nahi** — wo machine name hai aur locations usi se
 * judi hoti hain. Naam badalna hai to `name` hai.
 */
export const updateMenuSchema = z.object({
  name: menuSchema.shape.name.optional(),
  items: menuSchema.shape.items.optional(),
  /** Client jo version padh kar aaya tha. Mismatch = `409`. */
  version: z.coerce.number().int().optional(),
})

// ── Public projection ────────────────────────────────────────────────────────

/**
 * `href` **server pe** resolve hota hai, client pe kabhi nahi.
 *
 * Ye R10 ka seedha nateeja hai — routing ka ekmatra source `entries.path` hai. Agar
 * payload `entryId` bheje aur Next use path me badle, to path resolution ki **doosri
 * copy** `apps/web` me ban jaati hai, aur do jagah hamesha drift karti hain.
 *
 * @param {{ type: string, url: string }} link
 */
export function resolveHref(link) {
  if (!link) return null
  // `entry` aur `taxonomy` Phase 1 me yahin judenge — schema tab bhi nahi badlega.
  if (link.type === LINK_TYPE.URL) return link.url || null

  return null
}

const publicLink = (node) => ({
  label: node.label,
  href: resolveHref(node.link),
  target: node.link?.target ?? '_self',
  className: node.className || '',
})

/**
 * Public payload — admin-only kuch bhi bahar nahi jaata.
 *
 * `toPublicSettings` wali wajah se ek hi jagah se banta hai: koi naya endpoint galti se
 * poora Mongoose document na bhej de. Yahan `version`, `deletedAt`, `_id` aur internal
 * ids sab andar hi reh jaate hain.
 *
 * @param {any} menu
 */
export function toPublicMenu(menu) {
  if (!menu) return null

  const plain = typeof menu.toObject === 'function' ? menu.toObject() : menu

  return {
    key: plain.key,
    name: plain.name,
    items: (plain.items ?? []).map((item) => {
      const base = { id: item.id, menuType: item.menuType, ...publicLink(item) }

      if (item.menuType === MENU_TYPE.DROPDOWN) {
        return {
          ...base,
          children: (item.children ?? []).map((child) => ({
            id: child.id,
            ...publicLink(child),
            children: (child.children ?? []).map((g) => ({ id: g.id, ...publicLink(g) })),
          })),
        }
      }

      if (item.menuType === MENU_TYPE.MEGA) {
        const mega = item.mega ?? {}
        return {
          ...base,
          mega: {
            layout: mega.layout,
            columnCount: mega.columnCount,
            className: mega.className || '',
            cta: mega.cta
              ? {
                  text: mega.cta.text,
                  buttonLabel: mega.cta.buttonLabel,
                  buttonUrl: mega.cta.buttonUrl,
                  className: mega.cta.className || '',
                }
              : null,
            columns: (mega.columns ?? []).map((col) => ({
              className: col.className || '',
              groups: (col.groups ?? []).map((group) => ({
                heading: group.heading || '',
                href: group.link ? resolveHref(group.link) : null,
                target: group.link?.target ?? '_self',
                className: group.className || '',
                links: (group.links ?? []).map((l) => ({ id: l.id, ...publicLink(l) })),
              })),
            })),
          },
        }
      }

      return base
    }),
  }
}
