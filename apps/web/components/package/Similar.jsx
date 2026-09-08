'use client'

import { useState } from 'react'

import PackageCard from '../PackageCard.jsx'

/**
 * Similar itineraries — reference ka `#similar` (`itinerary-v3.html`).
 *
 * **Poora section derived hai** (spec 007 §9 #15 ka jawab — client, 1 Sep: apne aap). Server
 * wahi package chunta hai jinke `nights` aur `days` dono is package jaise hain, khud ko chhod
 * kar; card ka har tukda unke apne data se banta hai. Client ko kuch chunna nahi padta, aur naya
 * package jodte hi wo purane packages ke page pe aa jaata hai.
 *
 * ## Client component sirf pagination ke liye
 *
 * Design me teen card khade hain, bas. Client ne kaha — _"Design me 3 cards hain, uske bad
 * 1,2,3 button pagination"_. Cards khud server se poore bane hue aate hain; yahan sirf ye tay
 * hota hai ki kaunse teen dikh rahe hain.
 *
 * Teen ya kam card hon to pagination render hi nahi hoti — tab ye bilkul design wala section hai.
 *
 * ⚠️ **Card ka markup ab `PackageCard.jsx` me hai** (Slice D). Tour page ka `Package list` block
 * bilkul wahi card chahta hai, aur do copies ka nateeja is repo me pehle ho chuka hai: `bestFor`
 * similar cards pe chhoot gaya tha.
 */

/**
 * Ek page pe kitne card — ab **Itinerary Settings se** (D-82).
 *
 * Pehle ye yahin `const PER_PAGE = 3` tha aur total ka cap API me `limit(12)` pe. Client ko dono
 * badalne the, aur uske liye do alag file chhoona padta.
 *
 * Default 3 hai — design me teen card ek page pe hain, aur config na aaye to look wahi rahe.
 */
const DEFAULT_PER_PAGE = 3

export default function Similar({ items, rating, currency = 'INR', perPage = DEFAULT_PER_PAGE }) {
  const [page, setPage] = useState(0)

  if (!items?.length) return null

  const size = perPage > 0 ? perPage : DEFAULT_PER_PAGE
  const pages = Math.ceil(items.length / size)
  const shown = items.slice(page * size, (page + 1) * size)

  return (
    <>
      <div className="sim">
        {shown.map((item) => (
          <PackageCard key={item.id} item={item} rating={rating} currency={currency} />
        ))}
      </div>

      {pages > 1 && (
        <nav className="simpg" aria-label="More similar itineraries">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === page ? 'on' : ''}
              /**
               * `aria-current` isliye ki `.on` sirf ek rang hai — screen reader ko us se pata
               * nahi chalta ki kaunsa page khula hai.
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
