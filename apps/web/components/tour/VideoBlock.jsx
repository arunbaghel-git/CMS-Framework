'use client'

import { useState } from 'react'

import Img from '../Img.jsx'

/**
 * `Video` block — sirf Pages pe (client, 23 Sep, D-112). Reference: `page-template.html` ka `.embed`.
 *
 * **Pehle thumbnail + play, iframe sirf click pe** (client). YouTube ka player ~500 KB JS aur kai request
 * laata hai; page khulte hi iframe lagane ka matlab har visitor wo utaare, chahe video chalaye ya nahi (A-17).
 * Click pe wahi box iframe ban jaata hai — `embedUrl` me `autoplay=1` pehle se hai, to doosra click nahi lagta.
 *
 * `poster` server se: admin ki image, warna YouTube ka thumbnail, Vimeo pe `null` (saada neela box + play —
 * reference ka hi look). `embedUrl` na ho (link toot gaya) to **poora block gayab** (D-30).
 *
 * Portal ki zaroorat nahi — ye popup nahi, box ke andar hi chalta hai (`GalleryBlock` se farak).
 */
export default function VideoBlock({ props, data }) {
  const [playing, setPlaying] = useState(false)
  const embedUrl = data?.embedUrl
  if (!embedUrl) return null

  const label = props.heading || 'Video'

  return (
    <section className="blk">
      {props.heading ? <h2>{props.heading}</h2> : null}
      <div className="pvid">
        {playing ? (
          <iframe
            src={embedUrl}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${label}`}
          >
            {data.poster ? (
              <Img image={data.poster} alt="" sizes="(max-width: 760px) 100vw, 800px" />
            ) : null}
            {/* Reference ke `.embed` wala hi play icon */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M10 8.5v7l6-3.5z" fill="currentColor" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}
