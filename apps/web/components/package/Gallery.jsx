'use client'

import { useEffect, useState } from 'react'

/**
 * Page ka hero — `itinerary-v3.html` ka `.gal` mosaic.
 *
 * **Saare paanch tiles shuffle hote hain — bada wala bhi** (client, 26 Aug).
 *
 * Pehle bada tile package ke apne `bannerImage` pe **pin** tha. Soch ye thi ki banner is
 * package ki pehchaan hai, to use har refresh pe badalna galat hoga. Client ne ulta chaha:
 * refresh pe **main image hi** badalni chahiye.
 *
 * Isliye ab banner aur Itinerary Images ka pool **ek hi list** hain, poori list shuffle
 * hoti hai, aur uske pehle paanch tiles bharte hain — bada tile bhi unme se ek.
 *
 * Banner list me **sabse aage** rakha jaata hai. Iska matlab: chhote pool me (5 se kam
 * images) wo hamesha dikhta hai, aur bade pool me wo baaki images jaisa hi ek hai.
 *
 * ## Shuffle client-side kyun hai
 *
 * Site Next.js ISR pe hai (D-14) — page ek baar ban kar cache ho jaata hai. Server pe
 * shuffle karne ka koi matlab nahi hota: jo paanch pehli baar chuni gayin, wahi har visitor
 * ko hamesha dikhti rehtin. Isliye server **saari** images bhejta hai (bas strings) aur
 * chunav browser me hota hai — ISR waise ka waisa rehta hai (spec 007 §1.7, D-52).
 *
 * ## Shuffle `useEffect` me hai, render me nahi
 *
 * Render ke dauraan shuffle karne ka matlab hai server ka HTML aur client ka HTML alag —
 * yaani hydration mismatch, aur React poora subtree dobara banata hai. Isliye pehla render
 * **stable** hai (list ke pehle paanch), aur mount ke baad shuffle lagta hai.
 *
 * ⚠️ Client ki ek baat abhi baaki hai — aage chal kar hero me **ek hi image** ho sakti hai,
 * paanch nahi (`09-OPEN-ITEMS.md` **A-10**). Aaj wala paanch-tile mosaic design se hai.
 */

/** Fisher–Yates — `sort(() => Math.random() - 0.5)` biased hota hai aur kuch images kabhi nahi aatin. */
function shuffle(items) {
  const out = [...items]

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }

  return out
}

const SHOWN = 5

export default function Gallery({ images, banner, title }) {
  /**
   * Banner aur pool ek hi list — dono shuffle me jaate hain.
   *
   * Banner sabse aage isliye hai ki wahi pehla (stable) render banata hai, server aur
   * client dono pe.
   */
  const all = [...(banner ? [banner] : []), ...images]

  /** Pehla render server jaisa — `useEffect` ke baad hi shuffle lagta hai. */
  const [tiles, setTiles] = useState(() => all.slice(0, SHOWN))

  /**
   * List ki pehchaan ek string se — array ki identity har render pe nayi hoti hai, aur uspe
   * depend karne ka matlab hota ki effect har render pe chale aur images phadakti rahein.
   * Wahi pattern jo admin ke `useMediaById` me hai.
   */
  const listKey = all.map((image) => image.url).join(',')

  useEffect(() => {
    if (all.length <= SHOWN) return

    setTiles(shuffle(all).slice(0, SHOWN))
  }, [listKey])

  if (tiles.length === 0) return null

  const extra = all.length - tiles.length

  return (
    <div className="gal">
      {tiles.map((image, i) => (
        <a key={image.url} href={image.url}>
          <img src={image.url} alt={image.alt || title} loading={i === 0 ? 'eager' : 'lazy'} />
          {/* `+18 photos` hamesha aakhri tile pe — reference me wahi hai */}
          {i === tiles.length - 1 && extra > 0 && (
            <span className="gal__more">+ {extra} photos</span>
          )}
        </a>
      ))}
    </div>
  )
}
