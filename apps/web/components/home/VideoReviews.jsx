import SectionHead from './SectionHead.jsx'
import VideoRail from './VideoRail.jsx'

/**
 * `Customer reviews` — `home-nav-v3.html` ka `11. VIDEO CUSTOMER REVIEWS` (client, 15 Sep, D-96 §13).
 *
 * ```
 * .hsec          background (admin)
 *   .hsh         heading + line + "All video reviews →" (left, reference jaisa)
 *   .vrl         9:14 tiles ki scroll rail — reference ka `.rail--6 .vr`
 * ```
 *
 * Reviews server pe resolve hote hain (`resolveVideoReviews()`), section ke kram me. Koi na bache
 * (sab delete) to section hi nahi (D-30).
 */
export default function VideoReviews({ props = {}, data = {} }) {
  const reviews = data.reviews ?? []
  if (!reviews.length) return null

  const { background, heading, description, headingAlign = 'left', linkLabel, linkUrl } = props

  return (
    <section className="hsec" style={background ? { '--hsec-bg': background } : undefined}>
      <div className="wrap">
        <SectionHead
          heading={heading}
          description={description}
          align={headingAlign}
          linkLabel={linkLabel}
          linkUrl={linkUrl}
        />
        <VideoRail reviews={reviews} />
      </div>
    </section>
  )
}
