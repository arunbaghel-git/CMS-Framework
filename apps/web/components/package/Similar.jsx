'use client'

import { formatPrice } from '@cms/shared'
import { useState } from 'react'

/**
 * Similar itineraries — reference ka `#similar` (`itinerary-v3.html`).
 *
 * **Poora section derived hai** (spec 007 §9 #15 ka jawab — client, 1 Sep: apne aap).
 * Server wahi package chunta hai jinke `nights` aur `days` dono is package jaise hain, khud
 * ko chhod kar; card ka har tukda — route, chips, daam — unke apne data se banta hai. Client
 * ko kuch chunna nahi padta, aur naya package jodte hi wo purane packages ke page pe aa
 * jaata hai.
 *
 * ## Client component sirf pagination ke liye
 *
 * Design me teen card khade hain, bas. Client ne kaha — _"Design me 3 cards hain, uske bad
 * 1,2,3 button pagination"_. Cards khud server se poore bane hue aate hain; yahan sirf ye
 * tay hota hai ki kaunse teen dikh rahe hain.
 *
 * Teen ya kam card hon to pagination render hi nahi hoti — tab ye bilkul design wala section
 * hai.
 */

/** Design me teen card ek page pe — `.sim` unhe ek ke neeche ek rakhta hai. */
const PER_PAGE = 3

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

export default function Similar({ items, rating, currency = 'INR' }) {
  const [page, setPage] = useState(0)

  if (!items?.length) return null

  const pages = Math.ceil(items.length / PER_PAGE)
  const shown = items.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <>
      <div className="sim">
        {shown.map((item) => {
          /**
           * Chips — `5N / 6D` · `Ferry` · `Breakfast` (client, 2 Sep).
           *
           * Teenon **haan/na** hain, ginti nahi. Isiliye chip ka text yahan likha hua hai aur
           * data se nahi banta: server sirf itna batata hai ki wo cheez hai ya nahi.
           *
           * | Chip | Kab | Kahan se |
           * | --- | --- | --- |
           * | `5N / 6D` | dono bhare hon | `fields.nights` / `fields.days` |
           * | `Ferry` | `Ferries` bhara ho | `fields.ferriesNote` |
           * | `Breakfast` | kisi din breakfast ho | itinerary ke `meals` |
           *
           * ⚠️ Pehle yahan **saare transfers** aur **saare meals** aate the — saat chip tak.
           * Aur Ferry ka chip transfers se banta tha, jo bharosemand nahi: Transfer ek free
           * list hai (client `Private cab`, `Catamaran`, kuch bhi likh sakta hai). Ab wo
           * `Ferries` field se aata hai — wahi D-53 wali wajah jiske liye wo field bana tha.
           */
          const chips = [
            item.nights != null && item.days != null ? `${item.nights}N / ${item.days}D` : null,
            item.hasFerries ? 'Ferry' : null,
            item.hasBreakfast ? 'Breakfast' : null,
          ].filter(Boolean)

          return (
            <a className="prow" href={item.path} key={item.id}>
              <div className="prow__m">
                {/*
                 * Image na ho to `<img>` banta hi nahi — D-42 §2 ka invariant. `.prow__m` ka
                 * apna background hai, isliye khaali khaana toota hua nahi lagta.
                 */}
                {item.banner && (
                  <img
                    src={item.banner.url}
                    alt={item.banner.alt || item.title}
                    width={item.banner.width ?? undefined}
                    height={item.banner.height ?? undefined}
                    loading="lazy"
                  />
                )}

                {/*
                 * Badge — reference ka `.prow__tag` (`HONEYMOON`, `SEA VIEW`, `2 DIVES`).
                 *
                 * Ye **Package Type** taxonomy se aata hai (client, 2 Sep). 1 Sep ko client ne
                 * "abhi chhod do" kaha tha kyunki tab tay nahi tha ki text kahan se aayega;
                 * ab wo tay hai — package ka pehla type.
                 *
                 * ⚠️ Reference me do rang hain (narangi aur hara, `.prow__tag--g`). Kaunsa
                 * badge kaunsa rang le — uska koi niyam design me likha nahi hai, aur andaaze
                 * se ek niyam gadhna client ka faisla apne haath lena hota. Isliye sab narangi.
                 */}
                {item.tag && <span className="prow__tag">{item.tag}</span>}
              </div>

              <div className="prow__b">
                <h3>{item.title}</h3>

                {item.route?.length > 0 && (
                  <p className="prow__route">
                    <Pin />
                    {item.route.join(' → ')}
                  </p>
                )}

                {/*
                 * `Best for <b>first-timers on a short break</b>` — reference ka `.prow__best`.
                 *
                 * "Best for" theme me likha hai aur badalne wala hissa hi field se aata hai —
                 * wahi dhaancha jo poore page pe hai (Q-9). Field khaali ho to poori line
                 * gayab, sirf "Best for" nahi bachta.
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
                {/*
                 * Rating har card pe **wahi** hai — wo site ki ek global jodi hai
                 * (`packageDefaults.rating`), package ki apni nahi (client, 1 Sep).
                 *
                 * Reference me har card ka apna number hai (`4.9 ★ 305`, `4.8 ★ 158`), par
                 * wo per-package rating maan kar likha gaya tha — aur client ne ulta chuna
                 * (spec 007 §9 #8: haath se, ek hi). Isliye teenon card pe ek hi number
                 * dikhega.
                 */}
                {rating?.value > 0 && (
                  <span className="prow__rt">
                    <b>{rating.value} ★</b>
                    {rating.count > 0 && (
                      <span>{rating.count.toLocaleString('en-IN')} reviews</span>
                    )}
                  </span>
                )}

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
        })}
      </div>

      {pages > 1 && (
        <nav className="simpg" aria-label="More similar itineraries">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === page ? 'on' : ''}
              /**
               * `aria-current` isliye ki `.on` sirf ek rang hai — screen reader ko us se
               * pata nahi chalta ki kaunsa page khula hai.
               */
              aria-current={i === page ? 'true' : undefined}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </>
  )
}
