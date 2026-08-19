/**
 * Shared constants. Admin aur API dono yahan se import karte hain.
 * Permission strings spec 001 se aate hain, statuses D-18/D-25 se.
 */

export const DEFAULT_SITE_ID = 'default'
export const DEFAULT_LOCALE = 'en'

/** Entry statuses. `trash` yahan NAHI hai — wo `deletedAt` field hai (D-25). */
export const ENTRY_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
  PRIVATE: 'private',
})

export const ENTRY_STATUSES = Object.freeze(Object.values(ENTRY_STATUS))

/** Char roles — `subscriber` nahi banega (D-26). */
export const ROLE = Object.freeze({
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  CONTRIBUTOR: 'contributor',
})

export const ROLES = Object.freeze(Object.values(ROLE))

/** Public paths jo koi entry claim nahi kar sakti. */
export const RESERVED_SLUGS = Object.freeze(['admin', 'api', '_next', 'media', 'uploads'])
