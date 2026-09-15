import SectionHead from './SectionHead.jsx'
import PackageGridCards from './PackageGridCards.jsx'

/**
 * `Package grid` — `home-nav-v3.html` ka `10. PACKAGES` (client, 15 Sep, D-96 §19).
 *
 * ```
 * .hsec          background (default halka neela — reference ka sec--blue)
 *   .hsh         heading + "View all 40+ →"
 *   .ipk__pills  All + Package Type (client component)
 *   .ipk         4 → 3 → 2 → 1 column, max 16 card
 * ```
 */
export default function PackageGrid({ props = {}, data = {} }) {
  const cards = data.cards ?? []
  if (!cards.length) return null

  const { background, heading, description, headingAlign = 'left', linkLabel, linkUrl } = props

  return (
    <section
      className="hsec hsec--tint"
      style={background ? { '--hsec-bg': background } : undefined}
    >
      <div className="wrap">
        <SectionHead
          heading={heading}
          description={description}
          align={headingAlign}
          linkLabel={linkLabel}
          linkUrl={linkUrl}
        />
        <PackageGridCards cards={cards} facets={data.facets ?? []} currency={data.currency} />
      </div>
    </section>
  )
}
