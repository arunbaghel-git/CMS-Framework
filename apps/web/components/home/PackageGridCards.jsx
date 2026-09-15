'use client'

import { PACKAGE_GRID_MAX, formatPrice } from '@cms/shared'
import { useState } from 'react'

import Img from '../Img.jsx'

/**
 * Package grid ki pills + cards — reference ka `.ipill` aur `.pk` (D-96 §19).
 *
 * Pill pe us Package Type ke **pehle 16** — server list `PACKAGE_GRID_SCAN` tak bhejta hai, isliye "Honeymoon"
 * pe Honeymoon ke 16 aate hain, "All" ke 16 me se bache hue nahi. Pills pe ginti nahi (reference).
 *
 * Card ka markup Tour page ke `PackageCard` (`.prow`, lambi row) se **alag** hai — reference me ye vertical card
 * hai. Data wahi `toPackageCards()` ka; discount wahi hisaab (strike aur asli daam se).
 */
const ALL = 'all'

const Pin = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    aria-hidden="true"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

/** `22% off` — strike aur asli daam se; na strike ho ya chhota ho to `null` (PackageCard wala hi niyam). */
function discountOf(from) {
  const strike = from?.strikePrice
  const price = from?.priceFrom
  return strike != null && price != null && strike > price
    ? Math.round(((strike - price) / strike) * 100) || null
    : null
}

export default function PackageGridCards({ cards, facets, currency = 'INR' }) {
  const [active, setActive] = useState(ALL)

  const shown = (
    active === ALL ? cards : cards.filter((c) => (c.packageTypeIds ?? []).includes(active))
  ).slice(0, PACKAGE_GRID_MAX)

  return (
    <>
      {facets.length > 0 && (
        <div className="ipk__pills" role="group" aria-label="Filter by package type">
          {[{ key: ALL, label: 'All' }, ...facets].map((pill) => (
            <button
              key={pill.key}
              type="button"
              className={`ipk__pill${active === pill.key ? ' on' : ''}`}
              aria-pressed={active === pill.key}
              onClick={() => setActive(pill.key)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      <div className="ipk">
        {shown.map((card) => {
          const discount = discountOf(card.from)
          const chips = [
            card.nights && card.days ? `${card.nights}N/${card.days}D` : null,
            card.hasFerries ? 'Ferry' : null,
            card.hasBreakfast ? 'Breakfast' : null,
          ].filter(Boolean)

          return (
            <a className="ipkc" href={card.path} key={card.id}>
              <div className="ipkc__m">
                <Img
                  image={card.banner}
                  alt={card.title}
                  sizes="(max-width: 760px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {(card.tags ?? []).length > 0 && (
                  <span className="ipkc__tags">
                    {card.tags.map((tag) => (
                      <span className="ipkc__tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
                {discount ? <span className="ipkc__off">{discount}% off</span> : null}
              </div>

              <div className="ipkc__b">
                <h3>{card.title}</h3>
                {card.route?.length > 0 && (
                  <p className="ipkc__route">
                    <Pin />
                    {card.route.join(' → ')}
                  </p>
                )}
                {chips.length > 0 && (
                  <div className="ipkc__inc">
                    {chips.map((chip) => (
                      <span key={chip}>{chip}</span>
                    ))}
                  </div>
                )}

                <div className="ipkc__f">
                  {card.from ? (
                    <div className="ipkc__pr">
                      {card.from.strikePrice != null &&
                      card.from.strikePrice > card.from.priceFrom ? (
                        <del>{formatPrice(card.from.strikePrice, currency)}</del>
                      ) : null}
                      <b>{formatPrice(card.from.priceFrom, currency)}</b>
                    </div>
                  ) : (
                    <span />
                  )}
                  {card.rating?.value ? (
                    <span className="ipkc__rt">
                      <b>{card.rating.value} ★</b>
                      {card.rating.count > 0 ? (
                        <span>{card.rating.count.toLocaleString('en-IN')}</span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </>
  )
}
