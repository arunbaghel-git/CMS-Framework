'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hero ki image pe click karne pe khulne wala popup — client ka faisla, 31 Aug.
 *
 * **Ek waqt pe ek image**, aur 4 second baad apne aap agli. Slide me **saari** images
 * aati hain — banner aur poora Itinerary Images pool — sirf wo paanch nahi jo mosaic me
 * dikh rahi hain.
 *
 * ⚠️ **Ye design me hai hi nahi.** `itinerary-v3.html` me lightbox/modal/popup ek baar bhi
 * nahi aata (0 matches). Yaani ye R15 ka **vichlan** hai — aur wo theek hai, kyunki vichlan
 * client se aaya hai, developer se nahi. Record D-66 me hai.
 *
 * ## Auto-slide ke teen niyam
 *
 * 1. **Hover pe rukta hai.** Jo image dekhne ke liye user ruka hai, wahi uske haath ke
 *    neeche se khisak jaana sabse chidhane wali cheez hai.
 * 2. **Haath se aage badhne pe timer dobara shuru hota hai** — warna user next dabata hai
 *    aur 200ms baad slide khud aage badh jaati hai, yaani do image ek saath nikal jaati hain.
 * 3. **`prefers-reduced-motion` pe chalta hi nahi.** Apne aap badalta content us setting ka
 *    seedha nishana hai; arrows tab bhi kaam karte hain.
 */

const SLIDE_MS = 4000

export default function Lightbox({ images, startIndex = 0, onClose, title }) {
  const [index, setIndex] = useState(startIndex)
  const [paused, setPaused] = useState(false)
  const dialogRef = useRef(null)

  /**
   * Timer ko dobara shuru karne ka bahana.
   *
   * `index` pe depend karne se bhi kaam chal jaata, par tab **sirf** index badalne pe reset
   * hota. Ek hi image pe rehte hue "restart" chahiye ho (jaise hover khatam hone pe) to wo
   * raasta nahi milta.
   */
  const [tick, setTick] = useState(0)

  const count = images.length

  const go = useCallback(
    (step) => {
      setIndex((i) => (i + step + count) % count)
      setTick((t) => t + 1)
    },
    [count],
  )

  /** Auto-slide. */
  useEffect(() => {
    if (paused || count < 2) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const id = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearTimeout(id)
  }, [index, paused, count, tick])

  /** Keyboard — Esc band kare, arrows chalayein. */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  /**
   * Popup khulte hi background ka scroll band.
   *
   * Bina iske mobile pe popup ke peeche wala page scroll hota rehta hai aur band karne pe
   * user kahin aur pahunch jaata hai.
   */
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  /**
   * Focus popup me aaye, aur band hone pe **wapas usi tile pe** jaaye jispe click hua tha.
   *
   * Bina iske keyboard user popup band karke page ke bilkul shuru me pahunch jaata hai.
   */
  useEffect(() => {
    const returnTo = document.activeElement
    dialogRef.current?.focus()

    return () => {
      if (returnTo instanceof HTMLElement) returnTo.focus()
    }
  }, [])

  /** Mobile ka swipe — koi library nahi, do touch point ka farak hi kaafi hai. */
  const touchX = useRef(null)

  function onTouchStart(e) {
    touchX.current = e.changedTouches[0].clientX
  }

  function onTouchEnd(e) {
    if (touchX.current === null) return

    const dx = e.changedTouches[0].clientX - touchX.current
    /** 40px se kam ko swipe maanna galat hai — wo tap ka haath ka halka sa hilna hota hai. */
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
    touchX.current = null
  }

  if (count === 0) return null

  const image = images[index]

  return (
    <div
      className="lbx"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — image ${index + 1} of ${count}`}
      ref={dialogRef}
      tabIndex={-1}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      /**
       * Backdrop pe click band kare, par image ya buttons pe nahi — isiliye `target` aur
       * `currentTarget` ki barabari dekhi jaati hai. Bina iske image pe click karte hi
       * popup band ho jaata.
       */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button className="lbx__x" type="button" onClick={onClose} aria-label="Close">
        ✕
      </button>

      {/*
       * ⚠️ Hover-pause **sirf image pe** hai, backdrop pe nahi.
       *
       * Backdrop poori screen ghera hai. Uspe `onMouseEnter` lagane ka matlab tha ki
       * desktop pe cursor kahin bhi ho, popup hamesha "paused" rehta — yaani auto-slide
       * kabhi chalti hi nahi. Wo bilkul chup failure hoti: koi error nahi, bas feature
       * gayab.
       */}
      <div
        className="lbx__stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          setPaused(false)
          setTick((t) => t + 1)
        }}
      >
        {/*
         * `key` image ka url hai taaki har slide pe fade dobara chale. Bina key ke React
         * wahi `<img>` dobara use karta hai aur badlav ekdam jhatke se hota hai.
         *
         * Sirf yahi ek `<img>` hai — client ka faisla: "popup me ek time par ek image".
         */}
        <img key={image.url} src={image.url} alt={image.alt || title} />
      </div>

      {count > 1 && (
        <>
          <button
            className="lbx__nav lbx__nav--prev"
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            className="lbx__nav lbx__nav--next"
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
          >
            ›
          </button>

          <div className="lbx__count" aria-hidden="true">
            {index + 1} / {count}
          </div>
        </>
      )}
    </div>
  )
}
