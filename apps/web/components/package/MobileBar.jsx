'use client'

import { useEnquiryDock } from './EnquiryDock.jsx'

/**
 * Phone pe neeche chipki hui patti — reference ka `.mobar` (`itinerary-v3.html`).
 *
 * **Call · WhatsApp · Get free quote** — teen cheezein jo mobile pe hamesha angoothe ke paas
 * rehni chahiye. 760px se upar ye dikhti hi nahi (CSS).
 *
 * ## Iske aane se mobile pe do cheezein chhup jaati hain
 *
 * | Kya | Kyun |
 * | --- | --- |
 * | "Talk to a planner" widget | uske contact ab is patti me hain (client, 2 Sep) |
 * | sidebar ka enquiry form | wo ab **Get free quote** se sheet ki tarah khulta hai |
 *
 * ⚠️ **Email is patti me nahi hai** — client ka faisla (2 Sep): sirf phone aur WhatsApp.
 * Reference me bhi teen hi hain. Iska matlab hai ki mobile pe email ka option kahin nahi
 * bachta (Planner chhupa hua hai) — wo maloom hai aur chuna hua hai.
 *
 * ## Home pe wahi patti, par **link** ke saath (client, 16 Sep)
 *
 * Home ka form hero me pehle se khula baitha hai, isliye client ne wahan popup mana kiya —
 * _"get free quote ko contact page se link kar denge, popup nahi chahiye"_. Us soorat me `quoteUrl`
 * aati hai (`Settings ▸ General ▸ Get quote link`) aur CTA ek saada link ban jaata hai.
 *
 * ⚠️ Doosra component nahi banaya — wahi galti hoti jo `EnquiryForm` pe bachayi gayi thi (variant, D-87 §11).
 *
 * ## Yahan `<a>` aur `<button>` dono hain
 *
 * Call aur WhatsApp **jagah badalte hain** (`tel:`, `wa.me`) — wo link hain. "Get free quote"
 * kahin nahi le jaata, wo isi page pe ek sheet kholta hai — wo button hai. Teenon ko `<a>`
 * bana dena keyboard aur screen reader dono ke liye jhooth hota.
 */

const Phone = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
)

const WhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.1-.7.2-.7 1-.9 1.2-.4.2-.7 0a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.3 14.3 0 0 0 5.5 4.8c2.6 1 2.6.7 3.1.6a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z" />
  </svg>
)

/** `+91 98100 66496` → `+919810066496`. `tel:` aur `wa.me` dono ko spaces pasand nahi. */
const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '')

export default function MobileBar({ settings, hasForm, quoteUrl }) {
  const dock = useEnquiryDock()

  const phone = settings?.phone?.trim()
  const whatsapp = settings?.whatsapp?.trim()

  /**
   * Teenon me se kuch bhi na ho to patti banti hi nahi — ek khaali patti screen ka 70px kha
   * leti aur dikhti kuch nahi (D-30).
   */
  /** Link wala CTA — page pe form na ho tab. Dono ek saath nahi chahiye. */
  const quoteHref = !hasForm ? (quoteUrl ?? settings?.quoteUrl ?? '').trim() : ''

  if (!phone && !whatsapp && !hasForm && !quoteHref) return null

  return (
    <nav className="mobar" aria-label="Quick contact">
      {phone && (
        <a href={`tel:${digits(phone)}`}>
          <Phone />
          Call
        </a>
      )}

      {whatsapp && (
        <a
          className="mobar__wa"
          href={`https://wa.me/${digits(whatsapp).replace(/^\+/, '')}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          <WhatsApp />
          WhatsApp
        </a>
      )}

      {hasForm && (
        <button className="mobar__cta" type="button" onClick={() => dock?.show()}>
          Get free quote
        </button>
      )}

      {quoteHref && (
        <a className="mobar__cta" href={quoteHref}>
          Get free quote
        </a>
      )}
    </nav>
  )
}
