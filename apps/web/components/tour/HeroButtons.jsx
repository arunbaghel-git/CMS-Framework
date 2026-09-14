import Icon from '../Icon.jsx'
import { waHref } from '../../lib/links.js'

/**
 * Hero ke do button — `.vhero__cta` (Tour: client 8 Sep · Page: client 14 Sep, D-95).
 *
 * Markup ek hai, **source page ka apna**:
 *
 * | Page | Pehla button | WhatsApp |
 * | --- | --- | --- |
 * | `tourPage` | `Tour ▸ Tour settings ▸ Hero button` | number Settings ▸ General se, hamesha |
 * | `page` | page ka apna `fields.heroButton` | wahi number, page ke checkbox pe |
 *
 * ⚠️ 14 Sep ko `TourPage.jsx` se bahar aaya — do copies hoti to ek din Tour ka button badalta aur
 * page ka nahi.
 *
 * WhatsApp ka **label** yahan likha hai. Wo ek hi shabd hai, har site pe wahi, aur uske liye ek
 * field maangna client se wo cheez poochhna hota jo uski nahi hai — wahi tark jo `Planner` ke
 * "Chat with us" pe hai.
 *
 * Dono me se koi bhi na ho to uska button render hi nahi hota (D-30); dono na hon to poori patti
 * gayab.
 *
 * @param {object} props
 * @param {{ label: string, url: string } | null} [props.button]
 * @param {string} [props.whatsapp]  number — khaali ho to button nahi
 */
export default function HeroButtons({ button, whatsapp }) {
  if (!button && !whatsapp) return null

  return (
    <div className="vhero__cta">
      {/*
       * ⚠️ **`.btn--accent`, reference ka `.b-o` nahi.** Hamare paas `.b`/`.b-o` hain hi nahi, aur
       * `.btn--accent` **bilkul wahi** hai — wahi `--orange-500`, wahi `box-shadow`. Nayi class
       * banane ka matlab hota ek hi button ke do naam.
       */}
      {button && (
        <a className="btn btn--accent" href={button.url}>
          {button.label}
        </a>
      )}

      {whatsapp && (
        <a
          className="btn btn--whatsapp"
          href={waHref(whatsapp)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Icon name="chat" size={17} />
          WhatsApp us
        </a>
      )}
    </div>
  )
}
