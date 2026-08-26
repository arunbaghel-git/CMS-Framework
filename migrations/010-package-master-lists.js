/**
 * Packages ki master lists — spec 007 §1 / §8, Slice 2.
 *
 * Collection ka shape 02-ARCHITECTURE §3 se:
 *
 *   taxonomies       siteId, locale, type, name, slug, parentId, isDefault, seo,
 *                    description, bannerMediaId, order
 *   hotels           siteId, destinationId, category, name, room
 *   addOns           siteId, name, price, where
 *   transfers        siteId, name, icon
 *   packageDefaults  siteId, whatsIncluded, itineraryImages, bookingSteps, cancellationText
 *
 * Mongo schema enforcement model/service me hai. Migration ka kaam deploy-time indexes
 * banana hai, kyunki production me Mongoose `autoIndex` off rehta hai.
 */

export async function up({ db }) {
  const taxonomies = db.collection('taxonomies')
  const hotels = db.collection('hotels')
  const addOns = db.collection('addOns')
  const transfers = db.collection('transfers')
  const packageDefaults = db.collection('packageDefaults')

  await taxonomies.createIndexes([
    /**
     * Ek type ke andar ek slug ek hi baar.
     *
     * **`locale` uniqueness ka hissa hai** — `{siteId, type, slug}` nahi. Multi-language
     * kabhi aaya to unique index badalna live data pe sabse mehnga kaam hota (§3.1).
     * Menus pe ye pehle chhoot gaya tha aur D-43 me theek karna pada; yahan wahi galti
     * dobara nahi ki gayi.
     *
     * `type` uske andar hai, isliye ek `destination` "goa" aur ek `packageType` "goa"
     * dono ban sakte hain — wo do alag vocabularies hain.
     */
    {
      key: { siteId: 1, locale: 1, type: 1, slug: 1 },
      name: 'siteId_locale_type_slug_unique',
      unique: true,
    },

    /**
     * Tree ki list — Destinations screen har level ko `parentId` se nikaalti hai
     * (India → Kerala → Munnar).
     */
    { key: { siteId: 1, type: 1, parentId: 1, order: 1 }, name: 'siteId_type_parentId_order' },
  ])

  await hotels.createIndexes([
    /**
     * Hotels screen ka pehla dropdown Destination hai, doosra Category (spec 007 §1.3) —
     * list isi order me filter hoti hai, isliye index bhi isi order me.
     */
    {
      key: { siteId: 1, destinationId: 1, category: 1 },
      name: 'siteId_destinationId_category',
    },
  ])

  /**
   * Add-ons aur transfers chhoti lists hain, par pagination day 1 se hai (R14) aur wo
   * naam pe sort karti hai. Bina index ke wo har page pe in-memory sort hai — aaj sasta,
   * par "abhi to kam hain" har list pe kaha jaata hai.
   */
  await addOns.createIndex({ siteId: 1, name: 1 }, { name: 'siteId_name' })
  await transfers.createIndex({ siteId: 1, name: 1 }, { name: 'siteId_name' })

  /**
   * Singleton — wahi pattern jo `settings` ka hai (D-40, migration 005).
   *
   * Unique index hi wo cheez hai jo "ek instance, ek packageDefaults" ko sach me enforce
   * karti hai; service ka `ensure...()` akela race condition me do document bana sakta hai.
   */
  await packageDefaults.createIndex({ siteId: 1 }, { name: 'siteId_unique', unique: true })
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  const drops = [
    ['taxonomies', 'siteId_locale_type_slug_unique'],
    ['taxonomies', 'siteId_type_parentId_order'],
    ['hotels', 'siteId_destinationId_category'],
    ['addOns', 'siteId_name'],
    ['transfers', 'siteId_name'],
    ['packageDefaults', 'siteId_unique'],
  ]

  for (const [collection, index] of drops) {
    await db
      .collection(collection)
      .dropIndex(index)
      .catch(() => {})
  }
}
