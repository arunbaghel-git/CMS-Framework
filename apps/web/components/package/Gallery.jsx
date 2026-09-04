'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

import { HERO_TILES } from '../../lib/hero.js'
import Img from '../Img.jsx'

/**
 * Lightbox **click pe** load hota hai, page ke saath nahi.
 *
 * Wo poora ek popup hai — auto-slide ka timer, keyboard handlers, swipe, focus trap, body
 * scroll lock — aur wo sab tab tak bekaar pada rehta hai jab tak koi tile pe click na kare.
 * Seedha `import` karne ka matlab tha ki har visitor uska JS **utaare, parse kare aur
 * hydrate kare**, chahe wo popup kabhi khole hi na. Zyadatar visitor kabhi nahi kholte.
 *
 * `ssr: false` isliye ki popup ka pehla render hamesha click ke baad hota hai — server pe
 * uska HTML banta hi nahi tha.
 */
const Lightbox = dynamic(() => import('./Lightbox.jsx'), { ssr: false })

/**
 * Page ka hero — `itinerary-v3.html` ka `.gal` mosaic.
 *
 * **Saare paanch tiles shuffle hote hain — bada wala bhi** (client, 26 Aug).
 *
 * Pehle bada tile package ke apne `bannerImage` pe **pin** tha. Soch ye thi ki banner is
 * package ki pehchaan hai, to use har refresh pe badalna galat hoga. Client ne ulta chaha:
 * refresh pe **main image hi** badalni chahiye.
 *
 * Isliye banner aur Itinerary Images ka pool **ek hi list** hain, poori list shuffle hoti
 * hai, aur uske pehle paanch tiles bharte hain — bada tile bhi unme se ek.
 *
 * ## Shuffle ab server pe hai (D-85) — behaviour wahi, jagah alag
 *
 * Ye kaam pehle yahan `useEffect` me hota tha, aur wo **page ka sabse mehnga hissa** nikla:
 * browser server ki bheji paanch images download kar chuka hota, phir hydration ke baad
 * `setTiles` paanch **alag** images daal deta aur wo sab dobara download hoti. Lighthouse me
 * LCP ka 929ms sirf isi "Load Delay" ka tha (naap 4 Sep — D-85).
 *
 * Ab chunav `lib/hero.js` me hota hai, **har request pe** — refresh pe hero phir bhi badalta
 * hai (client ki wahi baat), par browser ko wo pehle se HTML me milta hai.
 *
 * Yahan ab koi `useState`/`useEffect` tiles ke liye nahi hai. Ye component client isliye
 * hai ki **popup ka open/close state** chahiye, shuffle ke liye nahi.
 *
 * ⚠️ Client ki ek baat abhi baaki hai — aage chal kar hero me **ek hi image** ho sakti hai,
 * paanch nahi (`09-OPEN-ITEMS.md` **A-10**). Aaj wala paanch-tile mosaic design se hai.
 *
 * @param {object} props
 * @param {object[]} props.tiles mosaic me jo paanch dikhengi — server chun chuka hai
 * @param {object[]} props.all popup ke liye **poori** list, sirf ye paanch nahi
 */
export default function Gallery({ tiles, all, title }) {
  /** Popup band ho to `null`, warna `all` me wo index jisse wo khula hai. */
  const [open, setOpen] = useState(null)

  if (!tiles?.length) return null

  const extra = all.length - tiles.length

  /**
   * Popup jis image se khulega uska index — `all` me, `tiles` me nahi.
   *
   * ⚠️ Ye farak zaroori hai: `tiles` shuffle ho chuki paanch hain, aur popup **saari**
   * images dikhata hai. Tile ka index seedha popup me bhejne pe click ek image pe hota aur
   * popup kisi aur pe khulta.
   */
  const openAt = (image) => setOpen(all.findIndex((x) => x.url === image.url))

  return (
    <>
      {/*
       * `gal--few` bhi server se — paanch se kam tiles pe mosaic ki jagah ek saada strip.
       * Pehle ye CSS `:has()` se pata karta tha (D-85).
       */}
      <div className={`gal ${tiles.length < HERO_TILES ? 'gal--few' : ''}`.trim()}>
        {tiles.map((image, i) => (
          /*
           * `<a href>` se `<button>` — pehle click seedha image file kholta tha, ab popup
           * kholta hai (client, 31 Aug).
           *
           * `<div onClick>` nahi: keyboard se pahunchna aur Enter/Space dono `<button>` me
           * apne aap milte hain, aur screen reader use "button" bolta hai — `<div>` pe wo
           * teenon haath se banane padte.
           */
          <button key={image.url} type="button" onClick={() => openAt(image)}>
            {/*
             * Pehla tile **page ka LCP** hai — grid me wo `2fr` leta hai aur dono row me
             * phaila hota hai (~640px), mobile pe poori chaudai. Isliye wahi ek image
             * `priority` hai; baaki chaar `1fr` wale hain (~320px) aur `lazy`.
             *
             * ⚠️ `sizes` bina `srcset` ke bemaani hai aur `Img` use tabhi likhta hai jab
             * payload me srcset ho — chhoti original wali image pe (jiske do variant ek hi
             * chaudai ke bante hain) wo apne aap gir jaata hai.
             */}
            <Img
              image={image}
              alt={title}
              sizes={i === 0 ? '(max-width: 860px) 100vw, 640px' : '(max-width: 860px) 50vw, 320px'}
              priority={i === 0}
            />
            {/* `+18 photos` hamesha aakhri tile pe — reference me wahi hai */}
            {i === tiles.length - 1 && extra > 0 && (
              <span className="gal__more">+ {extra} photos</span>
            )}
          </button>
        ))}
      </div>

      {open !== null && (
        <Lightbox images={all} startIndex={open} title={title} onClose={() => setOpen(null)} />
      )}
    </>
  )
}
