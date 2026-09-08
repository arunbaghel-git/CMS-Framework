/**
 * "Talk to a planner" — `itinerary-v3.html` ka sidebar widget (`.wdg`).
 *
 * Poora data **settings se** aata hai (`/api/public/settings`), package se nahi — ye har
 * page pe wahi hai. Isliye ise package ke payload me daalne ka koi matlab nahi tha; wo har
 * entry ke saath ek hi cheez dohrata.
 *
 * Reference ke teenon row ab hain — Call · WhatsApp · Email.
 *
 * ⚠️ Email **enquiry form ke `emailTo`** se aata hai — settings se nahi.
 *
 * Pehle iske liye ek naya `settings.contactEmail` bana diya gaya tha; client ne palta
 * (2 Sep): wo pata form me pehle se hai. Ek hi cheez do jagah rakhne ka matlab hota ki ek
 * din wo alag ho jaate — client sales ka pata form me badalta aur ye card purana dikhata.
 *
 * `adminEmail` yahan **kabhi nahi** aa sakta: wo admin ka login wala pata hai aur public
 * payload se jaan-boojh kar bahar hai (R10) — usi pe password reset jaata hai.
 *
 * Koi bhi contact na ho to widget **render hi nahi hota** — ek khaali card "abhi nahi bana"
 * nahi lagta, "toota hua" lagta hai (D-30).
 */

/** `+91 98100 66496` → `+919810066496`. `tel:` aur `wa.me` dono ko spaces pasand nahi. */
const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '')

/**
 * @param {string} [heading] Sidebar widget ka apna heading (D-88). Khaali ho to theme ka apna
 *   naam chalta hai — wahi D-65 wala niyam: heading ke bina widget bemaani lagta hai.
 */
export default function Planner({ settings, email: formEmail, heading = '' }) {
  const phone = settings?.phone?.trim()
  const whatsapp = settings?.whatsapp?.trim()
  const email = formEmail?.trim()

  if (!phone && !whatsapp && !email) return null

  return (
    <div className="wdg">
      <div className="wdg__h">{heading || 'Talk to a planner'}</div>

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

      {email && (
        <div className="wdgc">
          <span className="wdgc__i">✉</span>
          <span>
            <b>Email</b>
            <a href={`mailto:${email}`}>{email}</a>
          </span>
        </div>
      )}
    </div>
  )
}
