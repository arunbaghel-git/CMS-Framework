'use client'

import { useEffect, useRef } from 'react'

/**
 * Sidebar jo lambi hone par bhi poori padhi ja sake — reference ka sticky script
 * (`itinerary-v3.html`, "sticky sidebar" wala IIFE).
 *
 * ## Sirf CSS se kyun nahi hota
 *
 * `position: sticky; top: 78px` tab tak theek hai jab tak column screen se **chhota** ho.
 * Bada ho jaaye — aur enquiry form ke saath wo ho jaata hai — to wo 78px pe chipak jaata hai
 * aur uska **neeche wala hissa kabhi dikhta hi nahi**: page niche jaata rehta hai, sidebar
 * wahin ruki rehti hai, aur "Talk to a planner" tak pahunchne ka koi raasta nahi bachta.
 *
 * Client ne yahi pakda (2 Sep): _"form is scrolling when all content of left goes up, but in
 * reference form scrolls with left content until the form content ends"_.
 *
 * ## Kya karta hai
 *
 * `top` ko **scroll ki disha ke saath** khiskata hai:
 *
 * - neeche scroll → `top` ghatta hai, `viewport − height − gap` tak. Us par column ka
 *   **neeche wala kinara** screen ke neeche se chipak jaata hai — yaani uska aakhir dikh
 *   jaata hai
 * - upar scroll → `top` wapas `--sticky-top` (aaj 78px) tak badhta hai, header ke neeche
 *
 * Isliye sidebar content ke saath chalti hai jab tak uska apna aakhir na aa jaaye, aur uske
 * baad ruk jaati hai — bilkul wahi jo reference karta hai.
 *
 * ⚠️ **Andar ka apna scrollbar jaan-boojh kar nahi hai.** Wo aasan hota (`overflow-y: auto`)
 * par sidebar me ek form hai: nested scrollbar me trackpad se scroll karte waqt page aur
 * form ke beech scroll "phas" jaata hai, aur mobile pe wo bug ka pakka nuskha hai.
 */

/**
 * Header ke neeche ki jagah — **CSS se padhi jaati hai** (`.pgl__side { top: var(--sticky-top) }`).
 *
 * 17 Sep tak yahan `const TOP = 78` tha, aur CSS me bhi `78px`. Settings ▸ Layout se header ki height
 * badlegi to CSS apne aap badlega — JS ka number wahi rehta aur sidebar header ke neeche chhup jaati.
 * Isliye ek hi source: CSS. `FALLBACK_TOP` sirf tab jab padhna na ho paaye.
 */
const FALLBACK_TOP = 78
const GAP = 16

/** `style.top` hata kar CSS wali value padho — hamara apna likha hua `top` beech me na aaye. */
function readTop(side) {
  const inline = side.style.top
  side.style.top = ''
  const top = parseFloat(getComputedStyle(side).top)
  side.style.top = inline
  return Number.isFinite(top) ? top : FALLBACK_TOP
}

/**
 * 1024px se neeche sidebar sticky hai hi nahi (`position: static`, CSS me).
 *
 * Isliye wahan `top` ko haath lagana bhi galat hai — wo ek aisi cheez set karta jo kuch
 * karti hi nahi, aur dev tools me use dekh kar agla banda confuse hota.
 */
const STICKY_FROM = 1024

export default function StickySide({ children }) {
  const ref = useRef(null)

  useEffect(() => {
    const side = ref.current
    if (!side) return

    let TOP = readTop(side)
    let last = window.scrollY
    let cur = TOP
    let queued = false

    const run = () => {
      queued = false

      if (window.innerWidth <= STICKY_FROM) {
        side.style.top = ''
        return
      }

      const height = side.offsetHeight
      const view = window.innerHeight
      const y = window.scrollY

      /** Poori screen me sama jaati hai — tab saada sticky hi kaafi hai. */
      if (height + TOP + GAP <= view) {
        side.style.top = `${TOP}px`
        cur = TOP
        last = y
        return
      }

      /** Negative — column ka neeche wala kinara screen ke neeche se chipak jaata hai. */
      const min = view - height - GAP

      cur = Math.max(min, Math.min(TOP, cur - (y - last)))
      last = y
      side.style.top = `${cur}px`
    }

    /**
     * `requestAnimationFrame` ke bina ye har scroll event pe `offsetHeight` padhta, aur wo
     * **layout ko force** karta hai — yaani har frame pe browser dobara naapta. Scroll pe
     * wahi ek line poore page ko lag-jaisa bana deti hai.
     */
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(run)
    }

    const onResize = () => {
      if (window.innerWidth > STICKY_FROM) TOP = readTop(side)
      cur = TOP
      last = window.scrollY
      onScroll()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    /**
     * Sidebar ki unchai badal sakti hai bina scroll ya resize ke — form submit hone pe uski
     * jagah ek chhota thank-you message le leta hai, aur category badalne pe daam ka sar
     * badalta hai. Bina iske `min` purani unchai pe atka rehta aur sidebar galat jagah ruk
     * jaati.
     */
    const observer = new ResizeObserver(onScroll)
    observer.observe(side)

    run()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [])

  return (
    <aside className="pgl__side" ref={ref}>
      {children}
    </aside>
  )
}
