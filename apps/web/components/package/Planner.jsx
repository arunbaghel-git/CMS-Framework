/**
 * "Talk to a planner" — `itinerary-v3.html` ka sidebar widget (`.wdg`).
 *
 * Poora data **settings se** aata hai (`/api/public/settings`), package se nahi — ye har
 * page pe wahi hai. Isliye ise package ke payload me daalne ka koi matlab nahi tha; wo har
 * entry ke saath ek hi cheez dohrata.
 *
 * Reference ke teenon row ab hain — Call · WhatsApp · Email.
 *
 * ⚠️ Email `settings.contactEmail` se aata hai, `adminEmail` se **nahi**. Wo farq zaroori
 * hai: `adminEmail` admin ka **login wala** pata hai aur wo public payload se jaan-boojh kar
 * bahar hai (R10) — use site pe chhapna matlab har visitor ko wo pata de dena jispe password
 * reset jaata hai.
 *
 * Ye row 1 Sep tak tha hi nahi, kyunki `contactEmail` ka field hi nahi tha. Client ne 2 Sep
 * ko pakda ("Talk to a planner me email kyu nahi aa raha hai") — wo Settings ▸ General me
 * juda, aur bharte hi row aa jaata hai.
 *
 * Koi bhi contact na ho to widget **render hi nahi hota** — ek khaali card "abhi nahi bana"
 * nahi lagta, "toota hua" lagta hai (D-30).
 */

/** `+91 98100 66496` → `+919810066496`. `tel:` aur `wa.me` dono ko spaces pasand nahi. */
const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '')

export default function Planner({ settings }) {
  const phone = settings?.phone?.trim()
  const whatsapp = settings?.whatsapp?.trim()
  const email = settings?.contactEmail?.trim()

  if (!phone && !whatsapp && !email) return null

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
