'use client'

import { useRef, useState } from 'react'

import Img from '../Img.jsx'
import VideoModal from './VideoModal.jsx'

/**
 * Text with video ka image box — reference ka `.vidbox` (D-96 §22).
 *
 * | Video link | Box |
 * | --- | --- |
 * | YouTube/Vimeo (`embedUrl` server se) | **button** — ▶, click pe popup |
 * | koi aur (Instagram…) | **link** — ▶, naye tab me (Customer reviews jaisa) |
 * | khaali | saada image — na ▶, na click (client) |
 *
 * Caption (title + chhoti line) teenon me, bhari ho to.
 */
export default function VideoBox({ image, videoUrl, embedUrl, title, text }) {
  const [open, setOpen] = useState(false)
  const openerRef = useRef(null)

  const hasCaption = Boolean(title || text)
  const cls = `txv__box${videoUrl ? '' : ' txv__box--plain'}${hasCaption ? ' txv__box--cap' : ''}`
  const label = title || 'Video'

  const inner = (
    <>
      {image ? (
        <Img
          image={image}
          alt={videoUrl ? '' : image.alt || title || ''}
          sizes="(max-width: 1024px) 100vw, 560px"
        />
      ) : null}
      {videoUrl ? (
        <span className="txv__p" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      ) : null}
      {hasCaption ? (
        <span className="txv__cap">
          {title ? <b>{title}</b> : null}
          {text ? <span>{text}</span> : null}
        </span>
      ) : null}
    </>
  )

  if (embedUrl) {
    return (
      <>
        <button
          type="button"
          className={cls}
          aria-label={`Play video: ${label}`}
          onClick={(event) => {
            openerRef.current = event.currentTarget
            setOpen(true)
          }}
        >
          {inner}
        </button>
        {open ? (
          <VideoModal
            title={label}
            embedUrl={embedUrl}
            openerRef={openerRef}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </>
    )
  }

  if (videoUrl) {
    return (
      <a
        className={cls}
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch video: ${label} (opens in a new tab)`}
      >
        {inner}
      </a>
    )
  }

  return <div className={cls}>{inner}</div>
}
