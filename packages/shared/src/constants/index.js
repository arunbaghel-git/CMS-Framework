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

/**
 * User ka lifecycle. Users pe `deletedAt` nahi hai (D-25 content ke liye hai) —
 * user hataya nahi jaata, **deactivate** hota hai, taaki uska likha content aur
 * activity log orphan na ho jaaye.
 */
export const USER_STATUS = Object.freeze({
  /** Login kar sakta hai. */
  ACTIVE: 'active',
  /** Invite bheja gaya, abhi tak password set nahi kiya. */
  INVITED: 'invited',
  /** Login band, par record aur uska content bacha hua hai. */
  INACTIVE: 'inactive',
})

export const USER_STATUSES = Object.freeze(Object.values(USER_STATUS))

/** Public paths jo koi entry claim nahi kar sakti. */
export const RESERVED_SLUGS = Object.freeze(['admin', 'api', '_next', 'media', 'uploads'])

/** Responsive breakpoints — inhi teenon pe style store hoti hai. */
export const BREAKPOINT = Object.freeze({ DESKTOP: 'desktop', TABLET: 'tablet', MOBILE: 'mobile' })
