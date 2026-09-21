import Icon from './Icon.jsx'
import { telHref, waHref } from '../lib/links.js'

/**
 * Desktop pe kone me chipke hue do gol button — **WhatsApp** aur **phone**.
 *
 * Reference: `.float` — aur wo **saaton site reference me** ek hi CSS ke saath maujood hai
 * (`home-nav-v3` · `tour-v3` · `itinerary-v3` · `blog-v1` · `blog-detail-v1` · `contact-us` ·
 * `page-template-text`). Theme me ye kabhi bana hi nahi tha, yaani ye naya feature nahi —
 * **chhoota hua** hissa hai (R15, client ne 21 Sep ko pakda).
 *
 * ## `.mobar` ke saath batwara — dono kabhi ek saath nahi
 *
 * | Chaudai | Kaun dikhta hai |
 * | --- | --- |
 * | 760px se upar | ye do gol button (`.float`) |
 * | 760px se neeche | neeche wali patti (`.mobar`) — usme yahi do + "Get free quote" |
 *
 * ⚠️ Ye rok **CSS me** hai, JS me nahi. JS se karne ka matlab hota server pe ye tay karna ki
 * screen kitni chaudi hai — jo ISR ke saath ho hi nahi sakta (sab ko ek hi HTML jaata hai).
 *
 * ## Yahan koi on/off setting nahi hai
 *
 * Dono number khaali ho to component `null` lautata hai — wahi guard jo `MobileBar` pe hai
 * (D-30: khaali patti screen ki jagah kha leti hai aur dikhti kuch nahi). Ek alag toggle
 * rakhne ka matlab hota "band" ke **do** matlab, aur wo ek din alag ho jaate.
 *
 * ⚠️ Ek number ho aur doosra na ho to **ek hi button** aata hai — ye theek hai, `.float`
 * column hai aur akela button bhi apni jagah pe hi baithta hai.
 *
 * ## Yahan dono `<a>` hain
 *
 * `MobileBar` me teesra `<button>` hai (wo kahin le nahi jaata, sheet kholta hai). Yahan
 * aisa kuch nahi — dono jagah badalte hain, to dono link hain.
 *
 * ⚠️ Icon ke saath koi label **nahi** hai (reference me bhi nahi), isliye `aria-label`
 * zaroori hai — warna screen reader ko sirf ek khaali link milta hai.
 */
export default function FloatingContact({ settings }) {
  const phone = settings?.phone?.trim()
  const whatsapp = settings?.whatsapp?.trim()

  if (!phone && !whatsapp) return null

  const side = settings?.floatingContactSide === 'left' ? 'left' : 'right'

  return (
    <div className={`float${side === 'left' ? ' float--left' : ''}`}>
      {whatsapp && (
        <a
          className="f-wa"
          href={waHref(whatsapp)}
          aria-label="WhatsApp"
          rel="noopener noreferrer"
          target="_blank"
        >
          {/* `filled` ki zaroorat nahi — whatsapp path khud `fill`/`stroke` carry karta hai */}
          <Icon name="whatsapp" size={23} />
        </a>
      )}

      {phone && (
        <a className="f-ph" href={telHref(phone)} aria-label="Call us">
          <Icon name="phone" size={20} />
        </a>
      )}
    </div>
  )
}
