import Img from '../Img.jsx'
import SectionHead from './SectionHead.jsx'

/**
 * `Image cards` — `home-nav-v3.html` ke Andaman's best islands (`.isl`) · Popular beaches · Places to
 * visit (`.pt`) — D-96 §14.
 *
 * ```
 * .hsec          background (admin)
 *   .hsh         heading + "All beaches →"
 *   .imc         grid — columns aur shape CSS variables me
 *     .imcc      card: image poore card pe, gehra parda, text neeche/beech me
 * ```
 *
 * Card ke saare khaane plain text hain, isliye link wala card seedha `<a>` hai (Info cards ki tarah
 * `::after` ki zaroorat nahi — andar koi link ban hi nahi sakta).
 */
const RATIO = {
  square: '1 / 1',
  portrait: '3 / 4',
  tall: '9 / 14',
  landscape: '4 / 3',
  wide: '16 / 9',
}

export default function ImageCards({ props = {} }) {
  const items = props.items ?? []
  if (!items.length) return null

  const {
    background,
    heading,
    description,
    headingAlign = 'left',
    linkLabel,
    linkUrl,
    shape = 'square',
    columns = 4,
    mobileColumns = 2,
    textAlign = 'left',
    textPosition = 'bottom',
  } = props

  const style = {
    '--imc-cols': columns,
    '--imc-mcols': mobileColumns,
    '--imc-ratio': RATIO[shape] ?? RATIO.square,
    ...(background ? { '--hsec-bg': background } : {}),
  }

  const cardClass = [
    'imcc',
    textAlign === 'center' ? 'imcc--center' : '',
    textPosition === 'middle' ? 'imcc--middle' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="hsec" style={style}>
      <div className="wrap">
        <SectionHead
          heading={heading}
          description={description}
          align={headingAlign}
          linkLabel={linkLabel}
          linkUrl={linkUrl}
        />

        <div className={`imc${columns === 2 ? ' imc--c2' : ''}`}>
          {items.map((card, i) => {
            const Tag = card.url ? 'a' : 'div'
            return (
              <Tag className={cardClass} key={card.id ?? i} href={card.url || undefined}>
                {card.image ? (
                  <Img
                    image={card.image}
                    alt={card.title}
                    sizes={`(max-width: 760px) ${Math.round(100 / mobileColumns)}vw, ${Math.round(100 / columns)}vw`}
                  />
                ) : null}
                <span className="imcc__b">
                  {card.title ? <b>{card.title}</b> : null}
                  {card.subtitle ? <span>{card.subtitle}</span> : null}
                  {card.tag ? <em>{card.tag}</em> : null}
                </span>
              </Tag>
            )
          })}
        </div>
      </div>
    </section>
  )
}
