'use client'

import { useId, useState } from 'react'

/**
 * Footer ka ek column — mobile pe collapsible, desktop pe hamesha khula.
 *
 * **Toggle sirf mobile pe hai** (client ka faisla). Desktop pe footer ke chaar column
 * saath me padhe jaate hain; phone pe wahi chaar column ek ke neeche ek 40+ links ka
 * lamba scroll ban jaate hain, aur uske neeche ka copyright/disclaimer kabhi dikhta hi
 * nahi.
 *
 * ## Collapse sirf **menu-only** column ka hota hai
 *
 * Faisla `SiteFooter` leta hai (`collapsible` prop) — wahan poora payload hota hai.
 * Shart do hain: column me **sirf ek link list** ho (koi text block nahi), aur uski
 * **heading** ho, kyunki heading hi toggle hai.
 *
 * Text wale column band nahi hote, aur wo client ka faisla hai: usme phone, email aur
 * pata hote hain — unhe dekhne ke liye ek tap maangna ulta padta. Ek lambi link list
 * chhupane me kuch nahi jaata; contact detail chhupane me jaata hai.
 *
 * ## `open` default `false` hai, aur ye hydration safe hai
 *
 * Server ek hi HTML deta hai — usme column band hai. Desktop pe **CSS** use khol deti
 * hai (`.ft__body` wahan hamesha `display: block`), state ko dekhe bina. Isliye
 * `window.matchMedia` padh kar initial state banane ki zaroorat nahi, aur wahi zaroori
 * hai: media query se state banane pe server aur client ka pehla render alag ho jaata
 * hai aur React hydration warning deta hai.
 *
 * Yaani JS na chale tab bhi desktop poora theek dikhta hai; sirf mobile ka toggle jaata
 * hai — aur wo bhi khule hue par nahi, band par ruk jaata. Isliye mobile pe CSS band
 * karti hai **sirf tab** jab wo state ke saath aaye (`data-open="false"`), aur
 * `data-collapsible` tabhi lagta hai jab component client pe zinda ho.
 *
 * ## `brand` alag prop kyun hai
 *
 * Logo collapse hone wale hisse ke **bahar** rehna chahiye. Agar wo `children` me hota to
 * jis column me heading bhi hai, wahan mobile pe column band karte hi **logo gayab** ho
 * jaata — aur logo footer ki pehchaan hai, uske liye ek tap maangna galat hai.
 */
export default function FooterColumn({ heading, width, brand, collapsible, children }) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()

  const style = { '--span': width === 'wide' ? 1.5 : 1 }

  if (!collapsible) {
    return (
      <div className="ft__col" style={style}>
        {brand}
        {heading && <h2>{heading}</h2>}
        {children}
      </div>
    )
  }

  return (
    <div className="ft__col" style={style} data-collapsible="true" data-open={open}>
      {brand}

      <h2>
        <button
          type="button"
          className="ft__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{heading}</span>
          {/* Caret desktop pe CSS se chhupta hai — wahan click karne ko kuch hai hi nahi */}
          <svg
            className="ft__caret"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>

      <div className="ft__body" id={bodyId}>
        {children}
      </div>
    </div>
  )
}
