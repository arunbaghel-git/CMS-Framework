/**
 * Permission strings — spec 001.
 *
 * Naming: `<resource>.<action>` · `.own` suffix = sirf apna content ·
 * `<resource>.<sub>.<action>` = privilege boundary.
 *
 * RULE: aage sirf ADD karo, remove kabhi nahi. RBAC retrofit karna is project ka
 * sabse mehnga refactor hai.
 */

export const PERMISSION = Object.freeze({
  // Content
  ENTRY_READ: 'entry.read',
  ENTRY_CREATE: 'entry.create',
  ENTRY_UPDATE: 'entry.update',
  ENTRY_UPDATE_OWN: 'entry.update.own',
  ENTRY_DELETE: 'entry.delete', // trash me daalna
  ENTRY_DELETE_OWN: 'entry.delete.own',
  ENTRY_PURGE: 'entry.purge', // permanent — sirf admin (D-26)
  ENTRY_RESTORE: 'entry.restore',
  ENTRY_PUBLISH: 'entry.publish',
  ENTRY_PUBLISH_OWN: 'entry.publish.own',
  ENTRY_UNPUBLISH: 'entry.unpublish',
  ENTRY_SUBMIT_REVIEW: 'entry.submitReview',
  ENTRY_DUPLICATE: 'entry.duplicate',
  ENTRY_REVISION_READ: 'entry.revision.read',
  ENTRY_REVISION_RESTORE: 'entry.revision.restore',

  // Taxonomy
  TAXONOMY_READ: 'taxonomy.read',
  TAXONOMY_CREATE: 'taxonomy.create',
  TAXONOMY_UPDATE: 'taxonomy.update',
  TAXONOMY_DELETE: 'taxonomy.delete',

  // Media
  MEDIA_READ: 'media.read',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_UPDATE: 'media.update',
  MEDIA_EDIT: 'media.edit', // crop / rotate / replace
  MEDIA_DELETE: 'media.delete', // trash
  MEDIA_RESTORE: 'media.restore',
  MEDIA_PURGE: 'media.purge', // permanent — sirf admin

  // Appearance
  MENU_READ: 'menu.read',
  MENU_UPDATE: 'menu.update',
  TEMPLATE_READ: 'template.read',
  TEMPLATE_CREATE: 'template.create',
  TEMPLATE_UPDATE: 'template.update',
  TEMPLATE_DELETE: 'template.delete',
  PATTERN_READ: 'pattern.read',
  PATTERN_CREATE: 'pattern.create',
  PATTERN_UPDATE: 'pattern.update',
  PATTERN_DELETE: 'pattern.delete',
  THEME_UPDATE: 'theme.update',

  // Structure
  CONTENT_TYPE_READ: 'contentType.read',
  CONTENT_TYPE_CREATE: 'contentType.create',
  CONTENT_TYPE_UPDATE: 'contentType.update',
  CONTENT_TYPE_DELETE: 'contentType.delete',

  // SEO
  SEO_READ: 'seo.read',
  SEO_UPDATE: 'seo.update',
  REDIRECT_READ: 'redirect.read',
  REDIRECT_CREATE: 'redirect.create',
  REDIRECT_UPDATE: 'redirect.update',
  REDIRECT_DELETE: 'redirect.delete',

  // Forms
  FORM_READ: 'form.read',
  FORM_CREATE: 'form.create',
  FORM_UPDATE: 'form.update',
  FORM_DELETE: 'form.delete',
  SUBMISSION_READ: 'submission.read',
  SUBMISSION_DELETE: 'submission.delete',
  SUBMISSION_EXPORT: 'submission.export',

  // Settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  /**
   * Alag isliye hai ki `<script>` inject karne wala user admin ke browser me code
   * chala sakta hai — matlab role escalation. Ye settings field nahi, security
   * boundary hai.
   */
  SETTINGS_SCRIPTS_UPDATE: 'settings.scripts.update',

  // Users
  USER_READ: 'user.read',
  USER_INVITE: 'user.invite',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  /**
   * Permanent delete — sirf admin (D-34). `entry.purge` aur `media.purge` wahi rule
   * follow karte hain: mitane wala kaam recoverable nahi hota, isliye ek hi role ke paas.
   */
  USER_DELETE: 'user.delete',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',

  // Tools
  TOOLS_EXPORT: 'tools.export',
  TOOLS_IMPORT: 'tools.import',
  ACTIVITY_READ: 'activity.read',
})

export const PERMISSIONS = Object.freeze(Object.values(PERMISSION))

const P = PERMISSION

/** Har role ke read-only permissions ka common base. */
const READ_ONLY = [P.ENTRY_READ, P.TAXONOMY_READ, P.MEDIA_READ, P.MENU_READ, P.PATTERN_READ]

const CONTRIBUTOR = [
  ...READ_ONLY,
  P.ENTRY_CREATE,
  P.ENTRY_UPDATE_OWN,
  P.ENTRY_DELETE_OWN,
  P.ENTRY_SUBMIT_REVIEW,
  P.ENTRY_REVISION_READ,
  P.MEDIA_UPLOAD,
]

/** Author = contributor + apna content publish kar sakta hai. */
const AUTHOR = [...CONTRIBUTOR, P.ENTRY_PUBLISH_OWN, P.ENTRY_DUPLICATE]

const EDITOR = [
  ...AUTHOR,
  P.ENTRY_UPDATE,
  P.ENTRY_DELETE,
  P.ENTRY_RESTORE,
  P.ENTRY_PUBLISH,
  P.ENTRY_UNPUBLISH,
  P.ENTRY_REVISION_RESTORE,
  P.TAXONOMY_CREATE,
  P.TAXONOMY_UPDATE,
  P.TAXONOMY_DELETE,
  P.MEDIA_UPDATE,
  P.MEDIA_EDIT,
  P.MEDIA_DELETE,
  P.MEDIA_RESTORE,
  P.MENU_UPDATE,
  P.TEMPLATE_READ,
  P.TEMPLATE_CREATE,
  P.TEMPLATE_UPDATE,
  P.TEMPLATE_DELETE,
  P.PATTERN_CREATE,
  P.PATTERN_UPDATE,
  P.PATTERN_DELETE,
  P.THEME_UPDATE,
  P.CONTENT_TYPE_READ,
  P.SEO_READ,
  P.SEO_UPDATE,
  P.REDIRECT_READ,
  P.REDIRECT_CREATE,
  P.REDIRECT_UPDATE,
  P.REDIRECT_DELETE,
  P.FORM_READ,
  P.FORM_CREATE,
  P.FORM_UPDATE,
  P.FORM_DELETE,
  P.SUBMISSION_READ,
  P.SUBMISSION_EXPORT,
  P.SETTINGS_READ,
  P.ACTIVITY_READ,
]

/**
 * Role → permissions.
 *
 * Ye seed ke liye **default** hai. Asli source of truth `roles` collection hai —
 * taaki custom role banana Phase 7 me aasaan ho.
 *
 * Note: `entry.purge`, `media.purge` aur `settings.scripts.update` sirf admin ko.
 * Editor trash me daal sakta hai par mita nahi sakta.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  admin: PERMISSIONS,
  /**
   * Enquiries handle karta hai, content nahi (D-29). Poore permissions Phase 7b me
   * aayenge (`enquiry.*`). Abhi sirf padh sakta hai — packages dekhne ke liye.
   */
  salesAgent: Object.freeze([P.ENTRY_READ, P.MEDIA_READ]),
  editor: Object.freeze([...new Set(EDITOR)]),
  author: Object.freeze([...new Set(AUTHOR)]),
  contributor: Object.freeze([...new Set(CONTRIBUTOR)]),
})
