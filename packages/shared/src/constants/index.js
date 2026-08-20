/**
 * Shared constants. Admin aur API dono yahan se import karte hain.
 */

export * from './permissions.js'

export const DEFAULT_SITE_ID = 'default'
export const DEFAULT_LOCALE = 'en'

/**
 * Entry statuses. `trash` yahan NAHI hai — wo `deletedAt` field hai (D-25),
 * taaki restore pe entry apni purani state me wapas aa sake.
 */
export const ENTRY_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
  PRIVATE: 'private',
})

export const ENTRY_STATUSES = Object.freeze(Object.values(ENTRY_STATUS))

/** Paanch roles — `subscriber` nahi (D-26), `salesAgent` add hua (D-29). */
export const ROLE = Object.freeze({
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  CONTRIBUTOR: 'contributor',
  /** Enquiries handle karta hai, content nahi (D-29). Permissions Phase 7b me. */
  SALES_AGENT: 'salesAgent',
})

export const ROLES = Object.freeze(Object.values(ROLE))

/** Public paths jo koi entry claim nahi kar sakti. */
export const RESERVED_SLUGS = Object.freeze(['admin', 'api', '_next', 'media', 'uploads'])

/** Responsive breakpoints — inhi teenon pe style store hoti hai. */
export const BREAKPOINT = Object.freeze({ DESKTOP: 'desktop', TABLET: 'tablet', MOBILE: 'mobile' })
