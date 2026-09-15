import { badgeStyle } from '../../lib/badge.js'
import Img from '../Img.jsx'
import SectionHead from './SectionHead.jsx'

/**
 * `Offer cards` — `home-nav-v3.html` ke Popular sightseeing / Trending activities (`.tt`), Popular cruises &
 * ferries (`.cr`) aur category strip (`.cat`) — ek static section (client, 15 Sep, D-96 §21).
 *
 * ```
 * .hsec              background (admin)
 *   .hsh             heading + "View all →"
 *   .ofc             slider (reference ki .rail — side scroll, snap, bina JS) ya grid
 *     .ofcc          card — --top (image upar) ya --bg (image background)
 * ```
 *
 * Jo khaana khaali, wo nahi chhapta. Server component — koi JS nahi (slider CSS scroll hai).
 */
const RATIO = { photo: '3 / 2', wide: '16 / 9', square: '1 / 1', landscape: '4 / 3' }

function TopCard({ card }) {
  return (
    <>
      <div className="ofcc__m">
        {card.image ? (
          <Img image={card.image} alt={card.title} sizes="(max-width: 760px) 80vw, 300px" />
        ) : null}
        {card.badge ? (
          <span className="ofcc__badge" style={badgeStyle(card.badgeColor)}>
            {card.badge}
          </span>
        ) : null}
      </div>
      <div className="ofcc__b">
        {card.title ? <h3>{card.title}</h3> : null}
        {card.subtitle ? <span className="ofcc__sub">{card.subtitle}</span> : null}
        {card.chips?.length ? (
          <div className="ofcc__chips">
            {card.chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        ) : null}
        {card.price || card.rating ? (
          <div className="ofcc__f">
            {card.price ? (
              <span className="ofcc__pr">
                {card.oldPrice ? <del>{card.oldPrice}</del> : null}
                <b>{card.price}</b>
                {card.priceNote ? <i>{card.priceNote}</i> : null}
              </span>
            ) : (
              <span />
            )}
            {card.rating ? <span className="ofcc__rt">{card.rating} ★</span> : null}
          </div>
        ) : null}
      </div>
    </>
  )
}

function BackgroundCard({ card }) {
  return (
    <>
      {card.image ? (
        <Img image={card.image} alt={card.title} sizes="(max-width: 760px) 70vw, 240px" />
      ) : null}
      <span className="ofcc__b">
        {card.title ? <b className="ofcc__t">{card.title}</b> : null}
        {card.subtitle ? <span className="ofcc__sub">{card.subtitle}</span> : null}
        {/* Background card pe note daam se pehle — "from ₹22,540" (reference ka .cat__b b) */}
        {card.price ? (
          <b className="ofcc__pr">
            {card.priceNote ? `${card.priceNote} ${card.price}` : card.price}
          </b>
        ) : null}
      </span>
    </>
  )
}

export default function OfferCards({ props = {} }) {
  const items = props.items ?? []
  if (!items.length) return null

  const {
    background,
    heading,
    description,
    headingAlign = 'left',
    linkLabel,
    linkUrl,
    cardStyle = 'imageTop',
    shape = 'photo',
    layout = 'slider',
    columns = 4,
  } = props

  const isBackground = cardStyle === 'imageBackground'

  return (
    <section
      className="hsec"
      style={{
        ...(background ? { '--hsec-bg': background } : {}),
        '--ofc-cols': columns,
        '--ofc-ratio': RATIO[shape] ?? RATIO.photo,
      }}
    >
      <div className="wrap">
        <SectionHead
          heading={heading}
          description={description}
          align={headingAlign}
          linkLabel={linkLabel}
          linkUrl={linkUrl}
        />

        <div className={`ofc ofc--${layout === 'grid' ? 'grid' : 'slider'}`}>
          {items.map((card, i) => {
            const Tag = card.url ? 'a' : 'div'
            return (
              <Tag
                key={card.id ?? i}
                className={`ofcc ${isBackground ? 'ofcc--bg' : 'ofcc--top'}${card.url ? ' ofcc--link' : ''}`}
                href={card.url || undefined}
              >
                {isBackground ? <BackgroundCard card={card} /> : <TopCard card={card} />}
              </Tag>
            )
          })}
        </div>
      </div>
    </section>
  )
}
