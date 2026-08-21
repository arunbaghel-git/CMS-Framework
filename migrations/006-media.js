/**
 * `media` collection foundation — D-41.
 *
 * Ye migration sirf `media` collection ko ready karti hai. `mediaRefs` jaan-boojh kar
 * nahi ban raha; usage tracking full Media phase me aayegi.
 *
 * Collection ka reserved shape architecture §3 ke hisaab se:
 *
 *   siteId, filename, mime, size, width, height, folderId, deletedAt,
 *   variants[{ key, url, w, h }], alt, title, caption, uploadedBy
 *
 * Mongo schema enforcement model/service me aayega. Migration ka kaam deploy-time
 * indexes banana hai, kyunki production me Mongoose `autoIndex` off rahega.
 */

export async function up({ db }) {
  const media = db.collection('media')

  await media.createIndexes([
    /**
     * Admin media list ka primary access path. `folderId` aur `deletedAt` fields day 1
     * se reserve hain, par folders/trash UI foundation scope me nahi hai (D-41).
     */
    { key: { siteId: 1, folderId: 1, createdAt: -1 }, name: 'siteId_folderId_createdAt' },
  ])
}

export async function down({ db }) {
  const media = db.collection('media')

  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  await media.dropIndex('siteId_folderId_createdAt').catch(() => {})
}
