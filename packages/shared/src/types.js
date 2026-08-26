/**
 * JSDoc typedefs — core shapes.
 *
 * TypeScript nahi hai (D-03), isliye safety teen jagah se aati hai: Zod har boundary
 * pe, `checkJs` + ye typedefs editor me, aur block tree operations pe unit tests.
 *
 * Ye file sirf types deti hai — koi runtime code nahi.
 */

/**
 * @typedef {'desktop'|'tablet'|'mobile'} Breakpoint
 * @typedef {'draft'|'pending'|'published'|'scheduled'|'private'} EntryStatus
 * @typedef {'admin'|'editor'|'author'|'contributor'} RoleKey
 */

/**
 * Ek breakpoint ke style values. Value space constrained hai (D-20).
 * @typedef {Object} BlockStyle
 * @property {number} [paddingY]
 * @property {number} [paddingX]
 * @property {number} [marginY]
 * @property {number} [marginX]
 * @property {number} [gap]
 * @property {number} [maxWidth]
 * @property {number} [columns]
 * @property {'left'|'center'|'right'} [align]
 * @property {number} [fontSize]
 * @property {string} [background]
 * @property {string} [color]
 * @property {number} [radius]
 * @property {'none'|'sm'|'md'|'lg'} [shadow]
 * @property {boolean} [hidden]
 */

/**
 * Block envelope — FROZEN. Ye paanch keys kabhi nahi badlenge.
 * @typedef {Object} Block
 * @property {string} id
 * @property {string} type            camelCase. Kabhi rename mat karo — DB me stored hai (R4)
 * @property {Record<string, unknown>} props
 * @property {Partial<Record<Breakpoint, BlockStyle>>} [style]
 * @property {Block[]} [children]
 */

/**
 * @typedef {Object} Content
 * @property {number} version          tree-level, per-block nahi
 * @property {Block[]} blocks
 */

/**
 * @typedef {Object} Seo
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [canonical]
 * @property {boolean} noindex
 * @property {boolean} nofollow
 * @property {string} [ogTitle]
 * @property {string} [ogDescription]
 * @property {string} [ogImageId]
 * @property {string} twitterCard
 * @property {string} schemaType
 * @property {string} [focusKeyword]
 */

/**
 * @typedef {Object} Entry
 * @property {string} siteId
 * @property {string} locale
 * @property {string} type
 * @property {string} title
 * @property {string} slug
 * @property {string} path            routing ka single source of truth (D-09)
 * @property {EntryStatus} status
 * @property {Date|null} publishAt
 * @property {string|null} authorId
 * @property {string|null} templateId
 * @property {string|null} parentId
 * @property {string|null} featuredImageId
 * @property {Content} content
 * @property {Record<string, unknown>} fields
 * @property {Seo} seo
 * @property {{ categories: string[], tags: string[] }} taxonomies
 * @property {string} [excerpt]
 * @property {number} order
 * @property {string} searchText
 * @property {number} version         optimistic concurrency — mismatch pe 409
 * @property {Date|null} deletedAt    trash. status chhua nahi jaata (D-25)
 * @property {Date} [createdAt]
 * @property {Date} [updatedAt]
 */

/**
 * Ek content type ka code-owned seed — `BUILT_IN_CONTENT_TYPES` ka element (D-46).
 * @typedef {Object} ContentTypeSeed
 * @property {string} key             `entries.type` me stored. Rename = har entry pe migration
 * @property {string} label
 * @property {string} labelPlural
 * @property {string} icon
 * @property {boolean} hasBuilder     builder ya classic editor — dono ek hi content shape likhte hain
 * @property {boolean} hierarchical   path parent chain se banega ya urlPattern se (D-09)
 * @property {string} urlPattern      `{slug}` hona zaroori hai
 * @property {string|null} archiveBase
 * @property {boolean} hasArchive
 * @property {string[]} supports
 * @property {BlockSchemaField[]} fields
 */

/**
 * Block registry entry — framework ka extension point. Naya block = ek file.
 * @typedef {Object} BlockDefinition
 * @property {string} type
 * @property {string} label
 * @property {string} category
 * @property {string[]|null} [allowedChildren]
 * @property {BlockSchemaField[]} schema      isse properties panel AUTO banta hai
 * @property {Record<string, unknown>} [defaults]
 * @property {string[]} [toolbar]
 * @property {Function} Render                ek hi component: admin canvas + public site
 */

/**
 * Field definition — content fields aur block properties dono ke liye (D-24).
 * @typedef {Object} BlockSchemaField
 * @property {string} key
 * @property {string} type            FIELD_TYPES me se
 * @property {string} [label]
 * @property {unknown} [default]
 * @property {unknown[]} [options]
 * @property {boolean} [responsive]   sirf block context me
 */

export {}
