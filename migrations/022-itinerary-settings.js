/**
 * Itinerary Settings — structured data ka toggle aur Similar cards ke do number (D-82, client 4 Sep).
 *
 * ## Do cheezein code se nikal kar settings me aayi hain
 *
 * | Pehle | Ab |
 * | --- | --- |
 * | `entry.fields.seoSchema` — har package pe ek checkbox | `packageDefaults.seoSchema` — ek jagah |
 * | `resolveSimilarPackages()` me `limit(12)` | `packageDefaults.similar.total` |
 * | `Similar.jsx` me `const PER_PAGE = 3` | `packageDefaults.similar.perPage` |
 *
 * ⚠️ **`seoSchema` ka default ab `true` hai, aur wo jaan-boojh kar hai.** Purana per-package
 * field `false` pe default tha, aur uska nateeja data me saaf dikha: paanchon package pe wo
 * `false` mila — yaani structured data ka poora feature bana kar rakh diya gaya aur **kabhi
 * chala hi nahi**. Ise off rakhne ka koi kaaran bhi nahi milta.
 */

export async function up({ db }) {
  const defaults = db.collection('packageDefaults')

  /**
   * Naye khaane — sirf wahan jahan wo hain hi nahi.
   *
   * `$exists: false` ka filter zaroori hai: bina uske ye migration dobara chalne pe client ki
   * chuni hui value wapas default pe le aati.
   */
  await defaults.updateMany({ seoSchema: { $exists: false } }, { $set: { seoSchema: true } })
  await defaults.updateMany(
    { similar: { $exists: false } },
    { $set: { similar: { total: 12, perPage: 3 } } },
  )

  /**
   * Purana per-package field hata do.
   *
   * ⚠️ Ye client ka **likha hua content nahi** hai — ek toggle hai jo har package pe `false`
   * tha, aur ab uski jagah site-level wala aa gaya. Chhodne se wo `fields` me pada rehta aur
   * ek din koi use padh kar sochta ki wo abhi bhi kuch karta hai. Migration 020 wale content
   * badalne jaisa khatra yahan nahi hai.
   */
  await db
    .collection('entries')
    .updateMany({ 'fields.seoSchema': { $exists: true } }, { $unset: { 'fields.seoSchema': '' } })
}

export async function down({ db }) {
  await db.collection('packageDefaults').updateMany({}, { $unset: { seoSchema: '', similar: '' } })

  /**
   * `fields.seoSchema` wapas nahi aata.
   *
   * Kis package pe wo `true` tha ye kahin likha nahi hai — sab pe `false` tha, par us baat pe
   * bharosa kar ke sab pe `false` likh dena ek andaza hoga. Field ka na hona aur `false` hona
   * `Boolean()` ke baad ek hi cheez hai, isliye kuch khota bhi nahi.
   */
}
