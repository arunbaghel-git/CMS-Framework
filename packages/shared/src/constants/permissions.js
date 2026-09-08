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

  /**
   * Packages ki master lists — spec 007 §1.
   *
   * Har list ki apni permission hai, ek saanjhi `masterList.*` nahi. Wajah spec 001 ka hi
   * rule hai: RBAC retrofit is project ka sabse mehnga refactor hai. Do permission ko baad
   * me **ek saath dena** aasaan hai; ek ko baad me **alag karna** poora retrofit hai.
   *
   * `packageDefaults` ka koi `create`/`delete` nahi — wo singleton hai, wahi shape jo
   * `settings` ka hai (D-40).
   */
  HOTEL_READ: 'hotel.read',
  HOTEL_CREATE: 'hotel.create',
  HOTEL_UPDATE: 'hotel.update',
  HOTEL_DELETE: 'hotel.delete',
  ADD_ON_READ: 'addOn.read',
  ADD_ON_CREATE: 'addOn.create',
  ADD_ON_UPDATE: 'addOn.update',
  ADD_ON_DELETE: 'addOn.delete',
  TRANSFER_READ: 'transfer.read',
  TRANSFER_CREATE: 'transfer.create',
  TRANSFER_UPDATE: 'transfer.update',
  TRANSFER_DELETE: 'transfer.delete',
  REVIEW_READ: 'review.read',
  REVIEW_CREATE: 'review.create',
  REVIEW_UPDATE: 'review.update',
  REVIEW_DELETE: 'review.delete',
  PACKAGE_DEFAULTS_READ: 'packageDefaults.read',
  PACKAGE_DEFAULTS_UPDATE: 'packageDefaults.update',

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
  /**
   * Sidebars — `Appearance ▸ Sidebar` (D-88).
   *
   * `MENU_*` wali hi jodi, aur usi wajah se: create/update/delete teenon `SIDEBAR_UPDATE`
   * pe hain, kyunki delete yahan soft hai (R12) — wo ek update hi hai.
   */
  SIDEBAR_READ: 'sidebar.read',
  SIDEBAR_UPDATE: 'sidebar.update',
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

  /**
   * Forms — spec 001 me ye saat naam Phase 0 me hi likh diye gaye the (ek saath dena aasaan
   * hai, baad me alag karna poora retrofit).
   *
   * **`form.*` chaaron 1 Sep se sach me chalti hain** — `/api/forms` unhi pe khadi hai.
   * **`submission.*` 3 Sep ko jaag gayin** — Enquiries inbox ban gayi (All Enquiries ·
   * Enquiry Detail · Export CSV), aur wo teenon isi pe khadi hai.
   *
   * `submission.update` spec 001 me nahi tha — wo 3 Sep me juda. Wajah: status badalna aur
   * internal note likhna **write** hai, aur use `submission.read` ke neeche rakhne ka matlab
   * hota ki har padhne wala enquiry ka lifecycle bhi badal sake. Migration 018 ise built-in
   * roles pe sync karti hai.
   */
  FORM_READ: 'form.read',
  FORM_CREATE: 'form.create',
  FORM_UPDATE: 'form.update',
  FORM_DELETE: 'form.delete',
  SUBMISSION_READ: 'submission.read',
  SUBMISSION_UPDATE: 'submission.update',
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
/**
 * Master lists ki **read** yahan isliye hai ki `contributor` bhi package edit karte waqt
 * add-ons chunta hai, hotel dropdown dekhta hai aur destination pick karta hai. Bina read
 * ke uske liye wo saare dropdown khaali rehte — aur wo failure "kuch nahi mila" jaisi
 * dikhti hai, permission jaisi nahi.
 */
const READ_ONLY = [
  P.ENTRY_READ,
  P.TAXONOMY_READ,
  P.MEDIA_READ,
  P.MENU_READ,
  /**
   * Sidebar ki read `MENU_READ` ke saath hai, aur wahi wajah hai: page edit karte waqt
   * "Which sidebar" ka dropdown isi se bharta hai. Bina read ke wo dropdown khaali rehta —
   * aur wo failure permission jaisi nahi, "kuch bana hi nahi" jaisi dikhti hai (D-86).
   */
  P.SIDEBAR_READ,
  P.PATTERN_READ,
  P.HOTEL_READ,
  P.ADD_ON_READ,
  P.TRANSFER_READ,
  /**
   * Reviews ki read baaki master lists ke saath hai, halanki package editor me unka koi
   * dropdown **nahi** hai — wo universal hain, chuni nahi jaatin (client, 1 Sep).
   *
   * Phir bhi read sabke paas isliye hai ki wo public page pe har package ke neeche chhapti
   * hain: jo user package edit kar raha hai use wo dikhni chahiye, warna wo apne hi page ka
   * aadha content nahi dekh sakta.
   */
  P.REVIEW_READ,
  /**
   * Form ki read sabke paas — package editor me aage "Enable enquiry form" wala chunav
   * aayega, aur uske bina wo dropdown khaali rehta. Khaali dropdown "kuch nahi mila" jaisa
   * dikhta hai, "aapko permission nahi" jaisa nahi.
   */
  P.FORM_READ,
  P.PACKAGE_DEFAULTS_READ,
]

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
  /**
   * Master lists ki write `editor` ke paas hai, `author` ke paas nahi.
   *
   * Ye ek client-vocabulary boundary hai: hotel ya add-on jodna site ke **har** package pe
   * asar daalta hai, sirf apne package pe nahi. Wahi tark jo `taxonomy.*` pe pehle se laga
   * hua hai.
   */
  P.HOTEL_CREATE,
  P.HOTEL_UPDATE,
  P.HOTEL_DELETE,
  P.ADD_ON_CREATE,
  P.ADD_ON_UPDATE,
  P.ADD_ON_DELETE,
  P.TRANSFER_CREATE,
  P.TRANSFER_UPDATE,
  P.TRANSFER_DELETE,
  P.REVIEW_CREATE,
  P.REVIEW_UPDATE,
  P.REVIEW_DELETE,
  P.FORM_CREATE,
  P.FORM_UPDATE,
  P.FORM_DELETE,
  P.PACKAGE_DEFAULTS_UPDATE,
  P.MEDIA_UPDATE,
  P.MEDIA_EDIT,
  P.MEDIA_DELETE,
  P.MEDIA_RESTORE,
  P.MENU_UPDATE,
  P.SIDEBAR_UPDATE,
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
  P.SUBMISSION_UPDATE,
  P.SUBMISSION_EXPORT,
  /**
   * ⚠️ `submission.delete` yahan **nahi** hai — wo sirf admin ke paas hai.
   *
   * Wahi lakeer jo `entry.purge` pe hai: editor kaam kar sakta hai, mita nahi sakta. Enquiry
   * client ka business record hai (kisi asli grahak ne bhari hai), aur uska mit-na sabse
   * mehnga undo hai.
   */
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
