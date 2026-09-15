'use client'

import { useEffect, useRef, useState } from 'react'

import Img from '../Img.jsx'

/**
 * Video reviews ki rail + popup player (client, 15 Sep, D-96 §13: _"popup me video chale"_).
 *
 * - `embedUrl` ho (YouTube/Vimeo — server ne banaya) → tile ek **button**, click pe popup me iframe
 * - na ho (Instagram, Facebook…) → tile ek **link**, naye tab me
 *
 * ⚠️ Iframe **sirf popup khulne pe** banta hai. Chhe YouTube iframe page ke saath load karna har ek pe
 * ~500 KB JS hota — D-85 ka jeeta hua LCP/TBT seedha jaata.
 *
 * Popup: Esc se band, parde pe click se band, band hote hi focus wapas usi tile pe, aur body scroll lock
 * — wahi vyavhaar jo gallery ke `Lightbox` ka hai.
 */
export default function VideoRail({ reviews }) {
  const [active, setActive] = useState(null)
  const closeRef = useRef(null)
  const openerRef = useRef(null)

  useEffect(() => {
    if (!active) return undefined

    const onKey = (event) => {
      if (event.key === 'Escape') setActive(null)
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('noscroll')
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('noscroll')
      openerRef.current?.focus()
    }
  }, [active])

  return (
    <>
      <div className="vrl">
        {reviews.map((review) => {
          const inner = (
            <>
              {review.image ? (
                <Img image={review.image} alt="" sizes="(max-width: 760px) 52vw, 190px" />
              ) : null}
              <span className="vrl__p" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="vrl__n">
                {review.name}
                {review.packageName ? <span>{review.packageName}</span> : null}
              </span>
            </>
          )

          return review.embedUrl ? (
            <button
              key={review.id}
              type="button"
              className="vrl__t"
              aria-label={`Play video review: ${review.name}`}
              onClick={(event) => {
                openerRef.current = event.currentTarget
                setActive(review)
              }}
            >
              {inner}
            </button>
          ) : (
            <a
              key={review.id}
              className="vrl__t"
              href={review.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch video review: ${review.name} (opens in a new tab)`}
            >
              {inner}
            </a>
          )
        })}
      </div>

      {active ? (
        <div
          className="vmod"
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
          onClick={(event) => {
            if (event.target === event.currentTarget) setActive(null)
          }}
        >
          <div className="vmod__box">
            <button
              ref={closeRef}
              type="button"
              className="vmod__x"
              aria-label="Close video"
              onClick={() => setActive(null)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <iframe
              src={active.embedUrl}
              title={active.name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
