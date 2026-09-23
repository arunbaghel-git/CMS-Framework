'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Img from './Img.jsx'
import EnquiryForm from './package/EnquiryForm.jsx'
import { isPopupDue, readPopupSeen, writePopupSeen } from '../lib/popup-visibility.js'

/**
 * **Enquiries ▸ Popup** ka theme wala hissa (client, 21 Sep, D-103).
 *
 * ## Dikhne ka faisla — do hisse, do jagah
 *
 * | Sawaal | Kahan tay hota hai |
 * | --- | --- |
 * | Popup chalu hai? form hai? koi page ticked hai? | **server** — `toPublicPopup()` (API) |
 * | *Is* page pe aaye ya nahi | **server** — `popupForType()` (catch-all) |
 * | Is *visitor* ko aaye ya nahi | yahan — browser ka storage |
 *
 * Sirf teesra yahan hai, aur wo majboori hai: har page ek hi cached HTML deta hai (ISR), isliye
 * server ko pata ho hi nahi sakta ki kis visitor ne popup dekha.
 *
 * ⚠️ Pehla sawaal `settings` payload me hai, kisi page ke payload me nahi — warna popup badalne
 * pe **har** `path:` tag saaf karna padta (A-26 wala bug). `settings` ka apna tag pehle se chalta
 * hai, aur form badalne pe wo bhi jaata hai (`forms/service.js`).
 *
 * ## Markup tab tak banta hi nahi jab tak popup khule
 *
 * `open` false ho to ye `null` lautata hai — yaani page ke HTML me popup ka form hota hi nahi.
 * Wahi tark jo `Lightbox` (D-84) aur `VideoModal` pe hai. Isse do cheezein milti hain: page ka
 * HTML nahi badhta, aur band popup ka content Google ko page ka content nahi lagta.
 *
 * ⚠️ **`<body>` me portal se.** Home ke sections pe `content-visibility: auto` hai (D-101 §3), jo
 * `contain: paint` lagata hai — us dabbe ke andar `position: fixed` **screen se nahi, section se**
 * chipakta hai. VideoModal pe theek yahi 18 Sep ko pakda gaya tha.
 *
 * ⚠️ **Doosra form component nahi banaya** — `EnquiryForm` ka `variant="page"` (koi card nahi,
 * kyunki popup khud card hai). D-87 §11 wala hi faisla.
 */
export default function PopupForm({ popup, sourcePath }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef(null)

  /**
   * `popup` yahan aa gaya iska matlab hai ki **is page pe ye dikhna chahiye** — `showOn` ka
   * faisla server pe ho chuka (`popupForType()`). Yahan sirf "is visitor ko" bacha hai.
   */
  const allowed = Boolean(popup)

  useEffect(() => {
    if (!allowed) return

    /**
     * ⚠️ Storage **effect ke andar** padha jaata hai, render ke waqt nahi.
     *
     * Server pe `sessionStorage` hai hi nahi, aur render me use chhoone ka matlab hota server
     * aur client ka HTML alag — yaani hydration error. Isliye pehla render hamesha "band" hai
     * aur faisla mount ke baad hota hai.
     */
    if (!isPopupDue(popup, readPopupSeen(popup.frequency))) return

    const delay = Math.max(0, Number(popup.delaySeconds) || 0) * 1000
    const timer = setTimeout(() => setOpen(true), delay)

    return () => clearTimeout(timer)
  }, [allowed, popup])

  useEffect(() => {
    if (!open) return

    /**
     * "Dekh liya" **khulte hi** likha jaata hai, band hone pe nahi.
     *
     * Wajah: user popup band kiye bina page chhod sakta hai (back button, tab band). Band hone
     * pe likhne se use wahi popup har baar dobara milta — aur wo "once" ka poora vaada tod deta.
     */
    writePopupSeen(popup.frequency)

    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const opener = document.activeElement

    document.addEventListener('keydown', onKey)
    document.body.classList.add('noscroll')
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('noscroll')
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [open, popup])

  if (!allowed || !open) return null

  const images = popup.images ?? []

  return createPortal(
    <div
      className="pmod"
      role="dialog"
      aria-modal="true"
      aria-label="Enquiry"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
    >
      {/*
        ⚠️ **Shell — close button dabbe ke BAHAR baithta hai** (client, 21 Sep): pehle wo image ke
        upar chhapta tha. Bahar rakhne ke liye use ek aisa maa-baap chahiye jo scroll aur clip
        dono na kare, aur `.pmod__box` dono karta hai. Wahi dhaancha `.vmod` (video popup) pe
        pehle se hai.
      */}
      <div className="pmod__shell">
        <button
          ref={closeRef}
          className="pmod__x"
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>

        <div className="pmod__box">
          {images.length > 0 && (
            /*
            Ab sirf **ek** image aati hai (client, 23 Sep — schema ki chhat 1). `images` phir bhi
            array hai kyunki contract wahi hai; 21 Sep ka `pmod__pics--2/--3` hat gaya.
          */
            <div className="pmod__pics">
              {images.map((image, index) => (
                <Img
                  key={image.url ?? index}
                  image={image}
                  alt=""
                  className="pmod__pic"
                  /*
                  ⚠️ **`eager` 22 Sep ko hata diya gaya — phone pe image ab dikhti hi nahi** (client
                  ka faisla), par `eager` use phir bhi **download** karwa deta: `display: none` wali
                  image browser chhodta nahi jab tak wo `lazy` na ho. Yaani theek us jagah bandwidth
                  jaati jahan wo sabse mehngi hai.

                  `lazy` yahan kuch kho nahi raha: component **khulne pe hi mount** hota hai, to
                  desktop pe image us waqt viewport me hoti hai aur turant utarti hai — wahi lamha
                  jo `eager` deta tha. Phone pe wo viewport me aati hi nahi, isliye utarti bhi nahi.

                  ⚠️ Purana comment kehta tha ki `lazy` se "khaali dabba" dikhega — wo tab sach hota
                  jab popup page ke saath render hota. Wo D-103 me hi badal chuka tha (popup sirf
                  khulne pe banta hai), par comment purana reh gaya tha.
                */
                />
              ))}

              {popup.heading && (
                <h2 className="pmod__h" dangerouslySetInnerHTML={{ __html: popup.heading }} />
              )}
            </div>
          )}

          {/*
          Image na ho to heading bhi apni jagah chahiye — warna wo chup-chaap gayab ho jaati
          (D-30 wala "khaali ka matlab" nahi, ye seedhi galti hoti).
        */}
          {images.length === 0 && popup.heading && (
            <h2
              className="pmod__h pmod__h--plain"
              dangerouslySetInnerHTML={{ __html: popup.heading }}
            />
          )}

          <div className="pmod__body">
            <EnquiryForm
              form={popup.form}
              variant="page"
              heading={popup.formHeading}
              description={popup.description}
              sourcePath={sourcePath}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
