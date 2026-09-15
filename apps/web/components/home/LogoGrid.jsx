import Img from '../Img.jsx'
import SectionHead from './SectionHead.jsx'

/**
 * `Logo grid` — `home-nav-v3.html` ka `8. CLIENT LOGOS` (client, 15 Sep, D-96 §17).
 *
 * ```
 * .hsec          background (default reference ka halka neela)
 *   .hsh         heading + line (centre)
 *   .lgg         6 → tablet 4 → phone 3 (reference ke breakpoints, fixed)
 *     .lgg__t    tile — logo image (heading neeche), ya bina image ke sirf heading (reference jaisa)
 *   .lgg__c      closing line — `EXPERIENCE. EXCELLENCE. TRUST.` + chhoti line
 * ```
 */
export default function LogoGrid({ props = {} }) {
  const items = props.items ?? []
  const { background, heading, description, headingAlign = 'center', linkLabel, linkUrl } = props
  const { closingTitle, closingText } = props

  if (!items.length && !closingTitle && !closingText) return null

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

        {items.length > 0 && (
          <ul className="lgg">
            {items.map((logo, i) => (
              <li className={`lgg__t${logo.image ? '' : ' lgg__t--text'}`} key={logo.id ?? i}>
                {logo.image ? (
                  <Img image={logo.image} alt={logo.title || ''} sizes="160px" />
                ) : null}
                {logo.title ? <span>{logo.title}</span> : null}
              </li>
            ))}
          </ul>
        )}

        {closingTitle || closingText ? (
          <div className="lgg__c">
            {closingTitle ? <b>{closingTitle}</b> : null}
            {closingText ? <span>{closingText}</span> : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
