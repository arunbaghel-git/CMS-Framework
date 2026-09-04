'use client'

import { formatReviewMonth, starString } from '@cms/shared'
import { useEffect, useRef, useState } from 'react'

/**
 * Traveller reviews — reference ka `#reviews` (`itinerary-v3.html`).
 *
 * Reviews **universal** hain (client, 1 Sep): `packageDefaults` ke saath aati hain, entry ke
 * saath nahi, aur har package ke neeche wahi ki wahi chhapti hain. Isliye yahan koi
 * per-package chunav nahi hai.
 *
 * ## Client component kyun
 *
 * Design me teen card ek grid me khade hain, bas. Client ne uske aage ek baat kahi —
 * _"3 uske bad slider, all reviews will be in slider"_ — yaani teen se zyada hon to wo
 * khiskani chahiye. Wo scroll position aur arrows ka enable/disable browser me hi tay ho
 * sakta hai.
 *
 * **Scroll khud CSS ka hai, JS ka nahi.** Track ek saada `overflow-x` + `scroll-snap` hai,
 * to bina JS ke bhi (aur touch pe, aur keyboard se) poori list pahunch me rehti hai. JS
 * sirf do arrows aur unka disabled hona jodta hai. Yahi lakeer `<details>` wale FAQ (D-59)
 * aur `<input type="month">` (Reviews screen) pe bhi hai: jo browser pehle se karta hai use
 * dobara mat likho.
 *
 * ⚠️ Teen ya usse kam reviews pe arrows **hain hi nahi** aur track scroll bhi nahi karta —
 * tab ye bilkul wahi teen-column grid dikhta hai jo design me hai.
 */

/** Design me teen card ek row me — arrows ek "page" (teen card) khiskate hain. */
const PER_VIEW = 3

export default function Reviews({ reviews }) {
  const trackRef = useRef(null)
  /**
   * `null` ka matlab hai "abhi naapa nahi" — server render pe aur pehle paint pe.
   *
   * Isse arrows shuru me **dono disabled** nahi dikhte. `useState(true/false)` se ek frame
   * ke liye galat haalat chhap jaati hai, aur wo ek jhilmilahat jaisi dikhti hai.
   */
  const [edges, setEdges] = useState(null)

  const slides = reviews?.length ?? 0
  const hasSlider = slides > PER_VIEW

  useEffect(() => {
    const track = trackRef.current
    if (!track || !hasSlider) return

    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = track
      setEdges({
        /** 1px ka jhol jaan-boojh kar — sub-pixel width pe `scrollLeft` poora 0 nahi hota. */
        atStart: scrollLeft <= 1,
        atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
      })
    }

    measure()
    track.addEventListener('scroll', measure, { passive: true })

    /**
     * Width badalne pe bhi naapna padta hai — 1180px se neeche card poori chaudai ka ho
     * jaata hai, aur tab "aakhir" kahin aur hota hai. Bina iske arrow window resize ke baad
     * galat haalat me atak jaata tha.
     */
    const observer = new ResizeObserver(measure)
    observer.observe(track)

    return () => {
      track.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [hasSlider, slides])

  if (!slides) return null

  /**
   * Ek "page" = jitna abhi dikh raha hai.
   *
   * `clientWidth` se khiskate hain, kisi ginne hue card-width se nahi — chaudai breakpoint
   * ke saath badalti hai (teen card → ek card), aur do jagah wo hisaab likhne ka matlab hota
   * ki ek din wo alag ho jaate.
   */
  const page = (direction) => {
    const track = trackRef.current
    if (track) track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className={hasSlider ? 'rev rev--slider' : 'rev'}>
      <div className="rev__track" ref={trackRef}>
        {reviews.map((review) => {
          const month = formatReviewMonth(review.month)

          return (
            <div className="revc" key={review.id}>
              <div className="revc__h">
                {/*
                 * `aria-label` isliye ki screen reader pe `★★★★☆` "black star black star…"
                 * padha jaata hai. `aria-hidden` glyphs ko chhupa deta hai aur label unki
                 * jagah ek saaf vaakya deta hai.
                 */}
                <span className="revc__s" aria-label={`${review.rating} out of 5`}>
                  <span aria-hidden="true">{starString(review.rating)}</span>
                </span>
                {month && <span className="revc__d">{month}</span>}
              </div>

              <p>{review.text}</p>

              <b>
                {review.name}
                {review.lastLine && <span>{review.lastLine}</span>}
              </b>
            </div>
          )
        })}
      </div>

      {hasSlider && (
        <div className="rev__nav">
          <button
            type="button"
            className="rev__arrow"
            onClick={() => page(-1)}
            /** Naapne se pehle (`edges === null`) dono chalu — kabhi dono disabled na dikhein. */
            disabled={edges?.atStart ?? false}
            aria-label="Previous reviews"
          >
            ‹
          </button>
          <button
            type="button"
            className="rev__arrow"
            onClick={() => page(1)}
            disabled={edges?.atEnd ?? false}
            aria-label="More reviews"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
