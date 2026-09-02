'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Mobile pe enquiry form ek **sheet** ban jaata hai, aur use kholne wala button page me
 * kahin aur hai (neeche wali `.mobar`). Dono ko ek hi state chahiye — wahi yahan rehti hai.
 *
 * ## Do component, ek hi form
 *
 * Form **ek hi baar** render hota hai (sidebar me). Mobile pe wo wahin rehta hai par CSS use
 * ek fixed sheet bana deti hai. Use dobara render karne ka matlab hota do alag form state:
 * user desktop pe kuch bharta, screen chhoti karta, aur uska bhara hua gayab.
 *
 * Isiliye yahan sirf **khula hai ya nahi** rehta hai — form ka apna data form ke paas hi
 * rehta hai.
 *
 * ⚠️ Ye provider `PackagePage` me **`<main>` ke bahar** lagta hai, kyunki `.mobar` bhi
 * `<main>` ke bahar hai. Andar lagane se bar ko ye state milti hi nahi.
 */

const DockContext = createContext(null)

export function EnquiryDockProvider({ children }) {
  const [open, setOpen] = useState(false)

  /**
   * Sheet khulte hi peeche ka page scroll band — wahi `body.noscroll` jo Lightbox use karta
   * hai (globals.css me pehle se hai).
   *
   * Bina iske phone pe do scroll ek saath chalte hain: ungli sheet pe hoti hai par page
   * peeche khisakta rehta hai, aur band karne pe user kahin aur pahunch chuka hota hai.
   */
  const close = useCallback(() => {
    setOpen(false)
    document.body.classList.remove('noscroll')
  }, [])

  const show = useCallback(() => {
    setOpen(true)
    document.body.classList.add('noscroll')
  }, [])

  const value = useMemo(() => ({ open, show, close }), [open, show, close])

  return <DockContext.Provider value={value}>{children}</DockContext.Provider>
}

/**
 * `null` lautati hai jab provider hai hi nahi.
 *
 * Ye jaan-boojh kar throw **nahi** karti (jaise `useCategory()` karti hai): form doosre
 * pages pe bhi ja sakta hai jahan mobile bar ka koi matlab nahi, aur wahan use bina sheet ke
 * hi chalna chahiye.
 */
export function useEnquiryDock() {
  return useContext(DockContext)
}
