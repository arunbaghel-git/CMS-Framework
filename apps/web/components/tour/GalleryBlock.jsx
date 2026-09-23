'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import Img from '../Img.jsx'

/** Lightbox **click pe** load hota hai — package ke hero wala hi tark (`package/Gallery.jsx`, D-84). */
const Lightbox = dynamic(() => import('../package/Lightbox.jsx'), { ssr: false })

/**
 * `Gallery` block — sirf Pages pe (client, 23 Sep, D-111). Reference: `page-template.html` ka `.gal4`.
 *
 * Square tiles, click pe Lightbox me **saari** images. Row me kitni — desktop aur mobile admin se, tablet
 * **derive** (desktop ki value, zyada se zyada 3 — client: "apne aap"). Teeno CSS variable se jaate hain,
 * taaki breakpoint CSS me hi rahe aur yahan `matchMedia` na lage (hydration pe layout nahi hilta).
 *
 * ⚠️ Class `.pgal`, reference ka `.gal4` nahi — hamare yahan ginti admin se aati hai (4 fixed nahi), aur
 * `.gal` package ke hero ka hai (D-96 wala prefix ka sabak).
 *
 * Images na hon (sab delete ho gayin, ya chuni hi nahi) to **poora section gayab** — heading akela nahi
 * chhapta (D-30).
 */
export default function GalleryBlock({ props, data }) {
  const images = data?.images ?? []
  const [open, setOpen] = useState(null)

  if (!images.length) return null

  const cols = props.columns ?? 4
  const mobile = props.mobileColumns ?? 2
  const tablet = Math.min(cols, 3)

  return (
    <section className="blk">
      {props.heading ? <h2>{props.heading}</h2> : null}
      <div className="pgal" style={{ '--gcols': cols, '--gcols-t': tablet, '--gcols-m': mobile }}>
        {images.map((image, i) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open image ${i + 1} of ${images.length}`}
          >
            {/*
             * `sizes` moti naap hai — asli slot content column ka hissa hai, par zyada batana sirf ek
             * bada variant chunwata hai, kabhi dhundhla nahi.
             */}
            <Img
              image={image}
              alt={props.heading}
              sizes={`(max-width: 760px) ${Math.ceil(100 / mobile)}vw, (max-width: 1024px) ${Math.ceil(100 / tablet)}vw, ${Math.ceil(100 / cols)}vw`}
            />
          </button>
        ))}
      </div>

      {/*
       * ⚠️ **`<body>` me portal se** — `.blk` pe `contain: layout paint` hai (D-85), jo andar ke
       * `position: fixed` ko bhi usi box me band kar deta hai. Bina portal ke Lightbox content column
       * ke andar khulta tha, poori screen pe nahi (client, 23 Sep). `VideoModal` wala hi ilaaj (D-101).
       * `open` sirf click pe set hota hai, to `document` yahan hamesha maujood hai.
       */}
      {open !== null &&
        createPortal(
          <Lightbox
            images={images}
            startIndex={open}
            title={props.heading || 'Gallery'}
            onClose={() => setOpen(null)}
          />,
          document.body,
        )}
    </section>
  )
}
