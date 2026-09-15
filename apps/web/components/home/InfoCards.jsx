import Icon from '../Icon.jsx'
import Img from '../Img.jsx'

/**
 * `Info cards` — `home-nav-v3.html` ke Achievements · Certified by · Why us · Popular articles (D-96 §11).
 *
 * ```
 * .ic                 background (admin) + look ke rang CSS variables me
 *   .ic__sh           heading + line; `--left` pe daayein "View all →"
 *   .ic__grid         2–4 column
 *     .icc            card — border/icon/align ke modifier
 * ```
 *
 * ## ⚠️ Link wala card `<a>` nahi hai
 *
 * Reference me `a.art` poora card hai. Par yahan card ki description me client **link** likh sakta hai
 * (Why us ka `Contact us`), aur `<a>` ke andar `<a>` HTML me mana hai — browser use tod deta hai aur
 * React hydration pe chillata hai. Isliye title ka link card pe **phaila** hota hai (`.icc__a::after`),
 * aur description ke link uske upar baithte hain. Dikhne aur click me wahi, HTML sahi.
 *
 * ## Rang
 *
 * Section ke saare rang (`--ic-*`) Zod ke hex regex se guzre hain (`sectionBackgroundSchema`), isliye
 * inline style me CSS ghus nahi sakti. Khaali rang pe CSS ka default (reference ke neele).
 */
export default function InfoCards({ props = {} }) {
  const {
    background,
    heading,
    description,
    headingAlign = 'center',
    linkLabel,
    linkUrl,
    columns = 4,
    border = 'full',
    accentColor,
    iconPosition = 'above',
    iconBox = true,
    iconBg,
    iconColor,
    textAlign = 'left',
    items = [],
  } = props

  if (!items.length && !heading) return null

  const style = {
    '--ic-cols': columns,
    ...(background ? { '--ic-bg': background } : {}),
    ...(accentColor ? { '--ic-accent': accentColor } : {}),
    ...(iconBg ? { '--ic-icon-bg': iconBg } : {}),
    ...(iconColor ? { '--ic-icon': iconColor } : {}),
  }

  const isLeft = headingAlign === 'left'
  const cardClass = [
    'icc',
    `icc--b-${border}`,
    `icc--i-${iconPosition}`,
    textAlign === 'center' ? 'icc--center' : '',
    iconBox === false ? 'icc--bare' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="ic" style={style}>
      <div className="wrap">
        {heading || description ? (
          <div className={`ic__sh${isLeft ? ' ic__sh--left' : ''}`}>
            <div>
              {heading ? <h2>{heading}</h2> : null}
              {description ? (
                <div className="ic__sd" dangerouslySetInnerHTML={{ __html: description }} />
              ) : null}
            </div>
            {/* `.viewall` — dono chahiye (D-30), aur sirf left heading pe (center me jagah nahi). */}
            {isLeft && linkLabel && linkUrl ? (
              <a className="ic__all" href={linkUrl}>
                {linkLabel}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="ic__grid">
          {items.map((card, i) => {
            /** Upload wali image icon ke upar jeet-ti hai (client: "icon list + upload"). */
            const mark = card.image ? (
              <span className="icc__i icc__i--img">
                <Img image={card.image} alt="" sizes="46px" />
              </span>
            ) : card.icon && card.icon !== 'none' ? (
              <span className="icc__i">
                <Icon name={card.icon} size={iconPosition === 'inline' ? 17 : 20} strokeWidth={2} />
              </span>
            ) : null

            const title = card.url ? (
              <a className="icc__a" href={card.url}>
                {card.title}
              </a>
            ) : (
              card.title
            )

            return (
              <div className={`${cardClass}${card.url ? ' icc--link' : ''}`} key={card.id ?? i}>
                {iconPosition === 'above' ? mark : null}
                {card.label ? <span className="icc__t">{card.label}</span> : null}
                {card.title || (iconPosition === 'inline' && mark) ? (
                  <h3>
                    {iconPosition === 'inline' ? mark : null}
                    {title}
                  </h3>
                ) : null}
                {/* Admin ki inline HTML, write pe saaf (R20) — bold · italic · link. */}
                {card.text ? <p dangerouslySetInnerHTML={{ __html: card.text }} /> : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
