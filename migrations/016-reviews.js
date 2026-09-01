/**
 * `reviews` — traveller reviews ki master list (client, 1 Sep; spec 007 §7).
 *
 * Collection ka shape 02-ARCHITECTURE §3 se:
 *
 *   reviews   siteId, rating, month, text, name, lastLine
 *
 * Mongo schema enforcement model/service me hai (migration 010 wala hi model). Migration
 * ka kaam deploy-time index banana hai, kyunki production me Mongoose `autoIndex` off
 * rehta hai.
 *
 * ## Data ko koi backfill nahi chahiye
 *
 * Ye ek **nayi** collection hai — purane instance pe wo khaali hoti hai, aur khaali reviews
 * ka matlab hai "page pe wo section aata hi nahi" (D-30). `packageDefaults.rating` bhi is
 * migration me nahi hai: uska default `{ value: 0, count: 0 }` schema se aata hai aur `0`
 * ka wahi matlab hai — rating dikhani hi nahi. Missing key aur `0` dono ek hi natija dete
 * hain, isliye purane document ko chhune ki koi wajah nahi.
 */

import { ROLE_PERMISSIONS } from '@cms/shared'

export async function up({ db }) {
  const reviews = db.collection('reviews')

  /**
   * Admin ki list aur public payload **dono** isi kram me padhte hain — nayi trip pehle.
   *
   * `month` `YYYY-MM` string hai, aur uska lexical kram hi chronological kram hai, to index
   * seedha uspe chalta hai. `createdAt` doosri kunji isliye hai ki ek hi mahine ki kai
   * reviews ho sakti hain: bina uske unka aapsi kram Mongo ki marzi pe hota aur har call pe
   * badal sakta tha — public page pe wo "cards khud-ba-khud reorder ho jaate hain" jaisa
   * dikhta, jiska koi kaaran kahin likha nahi hota.
   *
   * Index ki disha wahi hai jo query ki hai (`{ month: -1, createdAt: -1 }`). Mongo ulti
   * disha me bhi chal leta hai, par compound index par tabhi jab **poori** key ulti ho —
   * isliye use waise hi likha jaisa service maangti hai.
   */
  await reviews.createIndex(
    { siteId: 1, month: -1, createdAt: -1 },
    { name: 'siteId_month_createdAt' },
  )

  /**
   * Built-in roles ki permissions dobara sync — **bina iske Reviews screen kisi ko dikhti
   * hi nahi**.
   *
   * `review.read` / `review.create` / `review.update` / `review.delete` aaj code me jude
   * hain, par `roles` documents ek baar seed hote hain aur uske baad chhue nahi jaate.
   * Migration 004 ne yahi kaam kiya tha aur wo chalu instance pe **applied** ho chuki hai,
   * to wo dobara nahi chalegi — naye permission strings ka koi raasta bacha hi nahi.
   *
   * Ye failure chup hai, aur is repo ne ise pehle bhi dekha hai (`user.delete`, D-34):
   * menu item render nahi hota, koi error nahi aata, aur dhoondhne pe lagta hai ki UI ka
   * bug hai. Isliye har baar naya permission jodne pe uske saath ek sync bhi jaayega.
   *
   * Sirf `isBuiltIn: true` — custom roles (Phase 7) ki permissions admin ne set ki hain.
   */
  const roles = db.collection('roles')
  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await roles.updateOne({ key, isBuiltIn: true }, { $set: { permissions: [...permissions] } })
  }
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  await db
    .collection('reviews')
    .dropIndex('siteId_month_createdAt')
    .catch(() => {})
}
