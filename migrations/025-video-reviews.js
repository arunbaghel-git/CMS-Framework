/**
 * `videoReviews` — home ke Customer reviews section ki list (client, 15 Sep, D-96 §13).
 *
 *   videoReviews   siteId, imageId, videoUrl, name, packageName
 *
 * Nayi collection — backfill kuch nahi. Khaali list ka matlab "section me chunne ko kuch nahi" (D-30).
 * Kaam sirf deploy-time index ka hai, kyunki production me Mongoose `autoIndex` off rehta hai.
 *
 * Roles ka sync **nahi** — video reviews wahi `review.*` permission use karte hain.
 */

export async function up({ db }) {
  /** Admin ki list ka kram — nayi pehle (`LISTS.videoReview.sort`). */
  await db
    .collection('videoReviews')
    .createIndex({ siteId: 1, createdAt: -1 }, { name: 'siteId_createdAt' })
}

export async function down({ db }) {
  await db
    .collection('videoReviews')
    .dropIndex('siteId_createdAt')
    .catch(() => {})
}
