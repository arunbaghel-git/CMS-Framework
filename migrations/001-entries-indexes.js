/**
 * `entries` collection ke indexes — 02-ARCHITECTURE.md §3.3.
 *
 * Indexes migration me hain, model me nahi — Mongoose ka `autoIndex` production me
 * off rehta hai, aur index build ek deploy-time operation hai, boot-time nahi.
 *
 * Compound indexes me `siteId` **sabse pehle** (§3.1) — multi-site kabhi karna pada
 * to bade data pe index rebuild nahi karna padega.
 */

export async function up({ db }) {
  const entries = db.collection('entries')

  await entries.createIndexes([
    // Routing ka single source of truth (D-09). Iske bina ek `page` "about" aur ek
    // `service` "about" dono `/about` pe resolve kar sakte hain.
    { key: { siteId: 1, locale: 1, path: 1 }, name: 'siteId_locale_path_unique', unique: true },

    // Slug uniqueness per type — path se alag constraint hai
    { key: { siteId: 1, type: 1, slug: 1 }, name: 'siteId_type_slug_unique', unique: true },

    // Admin list screens + scheduled-publish cron ka atomic claim isi pe chalta hai
    { key: { siteId: 1, type: 1, status: 1, publishAt: -1 }, name: 'siteId_type_status_publishAt' },

    // Trash aur "recently edited". deletedAt har list query me filter hota hai (D-25)
    { key: { siteId: 1, deletedAt: 1, updatedAt: -1 }, name: 'siteId_deletedAt_updatedAt' },

    // Nested pages — parent ka slug badle to descendants isi se milte hain
    { key: { siteId: 1, parentId: 1, order: 1 }, name: 'siteId_parentId_order' },

    // MongoDB ek collection pe sirf EK text index allow karta hai. Isliye ye
    // denormalized `searchText` pe hai — title + excerpt + blocks ka flattened text.
    // Iske bina admin search page ke body me kuch dhoondh hi nahi paayega.
    { key: { searchText: 'text' }, name: 'searchText_text' },
  ])
}

export async function down({ db }) {
  const entries = db.collection('entries')

  for (const name of [
    'siteId_locale_path_unique',
    'siteId_type_slug_unique',
    'siteId_type_status_publishAt',
    'siteId_deletedAt_updatedAt',
    'siteId_parentId_order',
    'searchText_text',
  ]) {
    // Index maujood na ho to ignore — down() idempotent rehna chahiye
    await entries.dropIndex(name).catch(() => {})
  }
}
