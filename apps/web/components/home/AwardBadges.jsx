import Img from '../Img.jsx'
import SectionHead from './SectionHead.jsx'

/**
 * `Award badges` — `home-nav-v3.html` ka `6. AWARD BADGES` (client, 15 Sep, D-96 §23).
 *
 * ```
 * .hsec.hsec--tint   background (default reference ka halka neela)
 *   .hsh             heading + line (centre)
 *   .awb             golon ki row — beech me, wrap
 *     .awb__b        text wala gola (`2018` / `CHOICE`), ya `--img` — upload ki hui badge image
 * ```
 *
 * Rang ek hi (`--awb-c`, admin ka `badgeColor`, khaali pe `--gold`) — border, andar ka halka rang, saal aur
 * label CSS me `color-mix()` se usi se bante hain. Hex regex se guzra hai, inline style me CSS nahi ghus sakti.
 */
export default function AwardBadges({ props = {} }) {
  const { background, heading, description, headingAlign = 'center', linkLabel, linkUrl } = props
  const { badgeColor, items = [] } = props

  if (!items.length && !heading) return null

  const style = {
    ...(background ? { '--hsec-bg': background } : {}),
    ...(badgeColor ? { '--awb-c': badgeColor } : {}),
  }

  return (
    <section className="hsec hsec--tint" style={style}>
      <div className="wrap">
        <SectionHead
          heading={heading}
          description={description}
          align={headingAlign}
          linkLabel={linkLabel}
          linkUrl={linkUrl}
        />

        {items.length > 0 && (
          <ul className={`awb${headingAlign === 'left' ? ' awb--left' : ''}`}>
            {items.map((badge, i) => (
              <li className={`awb__b${badge.image ? ' awb__b--img' : ''}`} key={badge.id ?? i}>
                {badge.image ? (
                  <Img
                    image={badge.image}
                    alt={[badge.title, badge.label].filter(Boolean).join(' ')}
                    sizes="74px"
                  />
                ) : (
                  <>
                    <b>{badge.title}</b>
                    {badge.label ? <span>{badge.label}</span> : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
