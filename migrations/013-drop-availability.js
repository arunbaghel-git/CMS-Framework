/**
 * `entries.availability` ka index hata diya gaya — client ka faisla, 26 Aug (D-54).
 *
 * `availability` (`open` | `soldOut`) D-50 §1 me joda gaya tha: sold-out package ka page
 * live rehta aur sirf ek badge lagta. Client ne use live dekhne ke baad hata diya — unhe
 * ye feature chahiye hi nahi.
 *
 * **Migration 012 delete nahi ki gayi**, aur ye jaan-boojh kar hai. Wo apply ho chuki hai;
 * applied migration ki file hata dene ka matlab hai ki ledger me ek record bacha rahe
 * jiski file hi na ho — runner use **"missing"** report karta hai aur wo har boot pe ek
 * jhoothi chetavni banti hai. Isliye 012 waise ki waisi hai aur ye uska ulta karti hai.
 *
 * **Field khud collection se nahi hataya ja raha:**
 *
 * - Mongo me ek bacha hua field muft hai — ab koi query use padhti hi nahi
 * - `entries` me abhi asli data nahi hai, par 15 instances pe `$unset` ka batch chalana ek
 *   risk hai jiska koi fayda nahi
 *
 * Index zaroor ja raha hai: wo **har write pe maintain** hota hai, aur ab uspe koi query
 * nahi chalti.
 */

export async function up({ db }) {
  // Index maujood na ho to ignore — idempotent rehna chahiye
  await db
    .collection('entries')
    .dropIndex('siteId_type_availability')
    .catch(() => {})
}

export async function down({ db }) {
  await db
    .collection('entries')
    .createIndex({ siteId: 1, type: 1, availability: 1 }, { name: 'siteId_type_availability' })
}
