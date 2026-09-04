/**
 * Rating ki jodi — **do jagah, dono baar sirf padhne ke liye**.
 *
 * Ye pehle `Reviews.jsx` me thi, aur wahi ek galti thi jo naap me dikhi (D-85): `Reviews`
 * ek **client component** hai (slider ka scroll state chahiye), aur `HeroRating` hero me
 * — yaani fold ke upar — use hoti hai. Nateeja: slider ka poora JS har visitor ko turant
 * utarna padta tha, sirf isliye ki usi file me ek aisi cheez thi jo upar chahiye thi.
 *
 * In dono me na koi state hai, na koi handler — ye **server components** hain. Alag file me
 * aane se `Reviews` ab `next/dynamic` pe ja sakta hai.
 *
 * ⚠️ Yahan kabhi `'use client'` mat likhna. Wo ek line poore split ko bekaar kar degi, aur
 * failure bilkul chup hogi — page waisa ka waisa dikhega, bas JS phir se bhaari ho jaayega.
 */

/**
 * `4.9 ★ 412 traveller reviews` — hero me title ke upar (reference ka `.pmeta__rt`).
 *
 * Wahi jodi jo reviews section ke heading ke saath chhapti hai
 * (`packageDefaults.rating`), aur **reviews se gini nahi jaati** (spec 007 §9 #8 ka jawab).
 *
 * `value` 0 ho to poori line gayab — khaali cheez khaali dikhe, tooti hui nahi (D-30).
 * `0.0 ★ 0 reviews` chhapna page ko adhoora dikhata hai.
 */
export function HeroRating({ rating }) {
  if (!rating?.value) return null

  return (
    <span className="pmeta__rt">
      <b>{rating.value} ★</b>
      {rating.count > 0 && ` ${rating.count.toLocaleString('en-IN')} traveller reviews`}
    </span>
  )
}

/**
 * `— 4.9 average from 412 trips` — reviews section ke heading ke saath.
 *
 * Reference me ye `<h2>` ke andar ek inline `<span>` hai. Yahan wo alag component isliye
 * hai ki `SectionHead` har section pe ek jaisa rehna chahiye — usme ek section ka apwaad
 * daalne ka matlab hota ki har naye apwaad pe wo file lambi hoti jaati.
 *
 * ⚠️ `trips`, `reviews` nahi — reference dono shabd alag matlab me use karta hai: hero me
 * `412 traveller reviews`, yahan `from 412 trips`. Dono ek hi number hain.
 */
export function RatingNote({ rating }) {
  if (!rating?.value) return null

  return (
    <span className="rev__avg">
      {' '}
      — {rating.value} average
      {rating.count > 0 && ` from ${rating.count.toLocaleString('en-IN')} trips`}
    </span>
  )
}
