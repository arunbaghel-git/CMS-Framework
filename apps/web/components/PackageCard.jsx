import { formatPrice } from '@cms/shared'

import Img from './Img.jsx'

/**
 * Ek package ka card — reference ka `.prow` (`itinerary-v3.html` ka `#similar`).
 *
 * ⚠️ **Ye file isliye bani ki iske do istemaal hain** — `Similar` (package page) aur
 * `PackageList` (tour page ka block). Dono ko bilkul wahi card chahiye, aur dono ka data ek hi
 * jagah se banta hai (`toPackageCards()` — wo bhi isi wajah se Slice B me bahar nikala gaya tha).
 *
 * Do copies ka nateeja is repo me pehle ho chuka hai aur wo chup tha: `bestFor` similar cards pe
 * **chhoot gaya tha**. Ek hi jagah hone se wo dobara nahi ho sakta.
 */

/** Reference ka pin icon — `.prow__route` ke aage. */
const Pin = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

/** `View itinerary →` ka teer. */
const Arrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/**
 * `4.9 ★ 305 reviews` — reference ka `.prow__rt`.
 *
 * ⚠️ Ye card me **do jagah** render hoti hai, aur ek waqt pe sirf ek dikhti hai:
 *
 * | Kahan | Kab |
 * | --- | --- |
 * | daayein wali price rail me | 760px se upar |
 * | title ke **upar**, card ke body me | 760px se neeche (client, 2 Sep) |
 *
 * Do jagah rakhne ki wajah dhaanche me hai: rail (`.prow__p`) aur body (`.prow__b`) do alag grid
 * cells hain, aur CSS ek cell se doosre cell me kisi cheez ko nahi bhej sakti.
 *
 * Chhupi hui copy `display: none` pe hai, isliye wo screen reader ko bhi nahi milti.
 */
function Rating({ rating, className = '' }) {
  if (!rating?.value) return null

  return (
    <span className={`prow__rt ${className}`.trim()}>
      <b>{rating.value} ★</b>
      {rating.count > 0 && <span>{rating.count.toLocaleString('en-IN')} reviews</span>}
    </span>
  )
}

export default function PackageCard({ item, rating, currency = 'INR' }) {
  /**
   * ⚠️ **Card ki apni rating pehle** — wo D-87 §3 me per-package ho gayi thi.
   *
   * `toPackageCards()` server pe hi `resolveRating(fields.rating, defaultRating)` chala kar
   * bhejta hai, yaani fallback wahin lag chuka hota hai. `rating` wala prop sirf tab bachta hai
   * jab payload purana ho — naya kabhi khaali nahi aata.
   */
  const cardRating = item.rating ?? rating

  /**
   * Chips — `5N / 6D` · `Ferry` · `Breakfast` (client, 2 Sep).
   *
   * Teenon **haan/na** hain, ginti nahi — isiliye chip ka text yahan likha hai aur data se nahi
   * banta: server sirf itna batata hai ki wo cheez hai ya nahi.
   */
  const chips = [
    item.nights != null && item.days != null ? `${item.nights}N / ${item.days}D` : null,
    item.hasFerries ? 'Ferry' : null,
    item.hasBreakfast ? 'Breakfast' : null,
  ].filter(Boolean)

  return (
    <a className="prow" href={item.path}>
      <div className="prow__m">
        {/*
         * Card ka slot: desktop pe teen column (~400px), tablet pe do (~50vw), phone pe ek.
         * Pehle har card 800px chaudi `medium` uthata tha — teen card yaani teen guna bytes,
         * un pixels ke liye jo dikhte hi nahi.
         */}
        <Img
          image={item.banner}
          alt={item.title}
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px"
        />

        {/*
         * Badge — `.prow__tag`. Package Type taxonomy se (client, 2 Sep).
         *
         * ⚠️ Reference me do rang hain (narangi aur hara, `.prow__tag--g`). Kaunsa badge kaunsa
         * rang le — uska koi niyam design me likha nahi hai, aur andaaze se niyam gadhna client
         * ka faisla apne haath lena hota. Isliye sab narangi.
         */}
        {item.tag && <span className="prow__tag">{item.tag}</span>}
      </div>

      <div className="prow__b">
        {/* Mobile pe title ke upar — desktop pe ye chhupi rehti hai (dekho `Rating`) */}
        <Rating rating={cardRating} className="prow__rt--top" />

        <h3>{item.title}</h3>

        {item.route?.length > 0 && (
          <p className="prow__route">
            <Pin />
            {item.route.join(' → ')}
          </p>
        )}

        {/*
         * `Best for <b>first-timers on a short break</b>` — `.prow__best`.
         *
         * "Best for" theme me likha hai aur badalne wala hissa hi field se aata hai — wahi
         * dhaancha jo poore page pe hai (Q-9). Field khaali ho to poori line gayab, sirf
         * "Best for" nahi bachta.
         */}
        {item.bestFor && (
          <p className="prow__best">
            Best for <b>{item.bestFor}</b>
          </p>
        )}

        {chips.length > 0 && (
          <div className="prow__inc">
            {chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        )}
      </div>

      <div className="prow__p">
        <Rating rating={cardRating} />

        {item.from?.strikePrice != null && (
          <del>{formatPrice(item.from.strikePrice, currency)}</del>
        )}
        {item.from && <strong>{formatPrice(item.from.priceFrom, currency)}</strong>}

        <span className="prow__go">
          View itinerary
          <Arrow />
        </span>
      </div>
    </a>
  )
}
