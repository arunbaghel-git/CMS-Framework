import SectionHead from './SectionHead.jsx'

/**
 * `Testimonials` — `home-nav-v3.html` ka `22. TESTIMONIALS` (client, 15 Sep, D-96 §16).
 *
 * ```
 * .hsec        background (admin; reference ka halka neela)
 *   .hsh       heading + line (centre)
 *   .tmg       4 column fixed → tablet 2 → phone 1
 *     .tmc     quote icon · text · (avatar initials + naam + last line)
 * ```
 *
 * Text reviews se — taare aur mahina **nahi** (reference me nahi, client). Avatar ke initials naam se yahin
 * bante hain; reviews me photo ka koi khaana nahi (client: initials).
 */

/** `Smita Menon` → `SM`, `Mehta family` → `MF`, `Ganesh K.` → `GK`. Ek shabd → pehle do akshar nahi, ek. */
function initials(name) {
  return String(name ?? '')
    .split(/[\s&]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

export default function Testimonials({ props = {}, data = {} }) {
  const reviews = data.reviews ?? []
  if (!reviews.length) return null

  const {
    background,
    heading,
    description,
    headingAlign = 'center',
    linkLabel,
    linkUrl,
    iconColor,
  } = props

  const style = {
    ...(background ? { '--hsec-bg': background } : {}),
    ...(iconColor ? { '--tm-icon': iconColor } : {}),
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

        <div className="tmg">
          {reviews.map((review) => (
            <figure className="tmc" key={review.id}>
              <svg
                className="tmc__q"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9 7H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v2a2 2 0 0 1-2 2H4v2h1a4 4 0 0 0 4-4zm11 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v2a2 2 0 0 1-2 2h-1v2h1a4 4 0 0 0 4-4z" />
              </svg>
              <blockquote>{review.text}</blockquote>
              <figcaption>
                <span className="tmc__av" aria-hidden="true">
                  {initials(review.name)}
                </span>
                <span>
                  <b>{review.name}</b>
                  {review.lastLine ? <span>{review.lastLine}</span> : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
