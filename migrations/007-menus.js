/**
 * `menus` + `menuLocations` collections — D-43, spec 006 §9.
 *
 * Collection ka shape 02-ARCHITECTURE §3 se:
 *
 *   menus          siteId, locale, key, name, version, deletedAt, items[]
 *   menuLocations  siteId, locale, location, menuId
 *
 * Mongo schema enforcement model/service me hai. Migration ka kaam deploy-time indexes
 * banana hai, kyunki production me Mongoose `autoIndex` off rehta hai.
 *
 * **`locale` day 1 se hai.** Uniqueness `{siteId, locale, key}` hai, `{siteId, key}` nahi —
 * multi-language kabhi aaya to unique index badalna live data pe sabse mehnga kaam hota
 * (02-ARCHITECTURE §3.1). `02-ARCHITECTURE.md` §3.3 me ye pehle chhoot gaya tha; D-43 me
 * theek hua.
 */

export async function up({ db }) {
  const menus = db.collection('menus')
  const menuLocations = db.collection('menuLocations')

  await menus.createIndexes([
    /** Routing/lookup ka primary path — ek key ek hi menu ki. */
    { key: { siteId: 1, locale: 1, key: 1 }, name: 'siteId_locale_key_unique', unique: true },

    /** Admin ki list — `deletedAt` har list query me filter hota hai (R12). */
    { key: { siteId: 1, deletedAt: 1, updatedAt: -1 }, name: 'siteId_deletedAt_updatedAt' },
  ])

  await menuLocations.createIndexes([
    /**
     * Ek location pe ek hi menu. Public read (`GET /api/public/menus/:location`) isi
     * equality query pe chalti hai.
     */
    {
      key: { siteId: 1, locale: 1, location: 1 },
      name: 'siteId_locale_location_unique',
      unique: true,
    },

    /** Menu delete hone pe uske saare assignments dhoondhne ke liye (spec 006 §9.3). */
    { key: { siteId: 1, menuId: 1 }, name: 'siteId_menuId' },
  ])
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  await db
    .collection('menus')
    .dropIndex('siteId_locale_key_unique')
    .catch(() => {})
  await db
    .collection('menus')
    .dropIndex('siteId_deletedAt_updatedAt')
    .catch(() => {})
  await db
    .collection('menuLocations')
    .dropIndex('siteId_locale_location_unique')
    .catch(() => {})
  await db
    .collection('menuLocations')
    .dropIndex('siteId_menuId')
    .catch(() => {})
}
