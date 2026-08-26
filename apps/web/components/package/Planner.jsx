/**
 * "Talk to a planner" — `itinerary-v3.html` ka sidebar widget (`.wdg`).
 *
 * Poora data **settings se** aata hai (`/api/public/settings`), package se nahi — ye har
 * page pe wahi hai. Isliye ise package ke payload me daalne ka koi matlab nahi tha; wo har
 * entry ke saath ek hi cheez dohrata.
 *
 * ⚠️ **Email wala row abhi nahi hai.** Reference me Call · WhatsApp · Email teenon hain, par
 * settings me sirf `adminEmail` hai — aur wo **jaan-boojh kar public payload se bahar** hai
 * (R10): wo admin ka login-wala pata hai, customer ko dikhane wala nahi. Uske liye ek alag
 * "contact email" setting chahiye, jo abhi banayi nahi gayi.
 *
 * Koi bhi contact na ho to widget **render hi nahi hota** — ek khaali card "abhi nahi bana"
 * nahi lagta, "toota hua" lagta hai (D-30).
 */

/** `+91 98100 66496` → `+919810066496`. `tel:` aur `wa.me` dono ko spaces pasand nahi. */
const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '')

export default function Planner({ settings }) {
  const phone = settings?.phone?.trim()
  const whatsapp = settings?.whatsapp?.trim()

  if (!phone && !whatsapp) return null

  return (
    <div className="wdg">
      <div className="wdg__h">Talk to a planner</div>

      {phone && (
        <div className="wdgc">
          <span className="wdgc__i">☎</span>
          <span>
            <b>Call</b>
            <a href={`tel:${digits(phone)}`}>{phone}</a>
          </span>
        </div>
      )}

      {whatsapp && (
        <div className="wdgc">
          <span className="wdgc__i wdgc__i--wa">✆</span>
          <span>
            <b>WhatsApp</b>
            <a
              href={`https://wa.me/${digits(whatsapp).replace(/^\+/, '')}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Chat with us
            </a>
          </span>
        </div>
      )}
    </div>
  )
}
