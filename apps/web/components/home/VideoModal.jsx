'use client'

import { useEffect, useRef } from 'react'

/**
 * Video ka popup player — Customer reviews (D-96 §13) aur Text with video (§22) dono ka.
 *
 * Pehle ye `VideoRail.jsx` ke andar tha; doosra section aate hi alag nikla — do copies ek din alag ho
 * jaati hain (D-65/D-51/D-58).
 *
 * Esc se band, parde pe click se band, body scroll lock, aur band hote hi focus **wapas usi button pe** jisse
 * popup khula tha — wahi vyavhaar jo gallery ke `Lightbox` ka hai. Opener `openerRef` se (click wala
 * button), na ho to mount ke waqt ka `document.activeElement`.
 *
 * ⚠️ Iframe sirf popup khulne pe banta hai — page ke saath YouTube ka ~500 KB JS nahi (D-85).
 */
export default function VideoModal({ title, embedUrl, onClose, openerRef }) {
  const closeRef = useRef(null)
  /**
   * ⚠️ `onClose` ref me — bulane wale inline arrow bhejte hain, aur use effect ki dep banane pe har render pe
   * effect dobara chalta: opener tab close button hi ban jaata aur focus wapas galat jagah jaata.
   */
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    /** Safari click pe button ko focus nahi deta — isliye bulane wala `openerRef` bhejta hai. */
    const opener = openerRef?.current ?? document.activeElement
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }

    document.addEventListener('keydown', onKey)
    document.body.classList.add('noscroll')
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('noscroll')
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  return (
    <div
      className="vmod"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="vmod__box">
        <button
          ref={closeRef}
          type="button"
          className="vmod__x"
          aria-label="Close video"
          onClick={onClose}
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
          src={embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  )
}
