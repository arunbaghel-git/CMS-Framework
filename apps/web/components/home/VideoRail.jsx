'use client'

import { useRef, useState } from 'react'

import Img from '../Img.jsx'
import VideoModal from './VideoModal.jsx'

/**
 * Video reviews ki rail + popup player (client, 15 Sep, D-96 §13: _"popup me video chale"_).
 *
 * - `embedUrl` ho (YouTube/Vimeo — server ne banaya) → tile ek **button**, click pe popup me iframe
 * - na ho (Instagram, Facebook…) → tile ek **link**, naye tab me
 *
 * Popup `VideoModal.jsx` me hai — Text with video (§22) bhi wahi use karta hai.
 */
export default function VideoRail({ reviews }) {
  const [active, setActive] = useState(null)
  const openerRef = useRef(null)

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
        <VideoModal
          title={active.name}
          embedUrl={active.embedUrl}
          openerRef={openerRef}
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  )
}
