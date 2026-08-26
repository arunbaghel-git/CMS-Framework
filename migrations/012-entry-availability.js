/**
 * `entries.availability` ka index — D-50, spec 007 §9 #9.
 *
 * `availability` (`open` | `soldOut`) `status` se **alag** field hai: sold-out package ka
 * page live rehta hai, sirf ek badge lagta hai. All Packages list ka **"Sold Out" tab**
 * isi pe filter karta hai.
 *
 * Backfill ki zaroorat nahi — Mongoose ka default `open` hai, aur missing field wale
 * purane documents `{ availability: 'soldOut' }` query me aate hi nahi. Ye field
 * `entries` collection me abhi bani hi hai, isliye koi purana document hai bhi nahi.
 */

export async function up({ db }) {
  await db
    .collection('entries')
    .createIndex({ siteId: 1, type: 1, availability: 1 }, { name: 'siteId_type_availability' })
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  await db
    .collection('entries')
    .dropIndex('siteId_type_availability')
    .catch(() => {})
}
