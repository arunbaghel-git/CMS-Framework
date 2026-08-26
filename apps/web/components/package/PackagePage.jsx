import RichText from './RichText.jsx'

/**
 * Package ka public page — `docs/reference/itinerary-v3.html` se.
 *
 * **Ye page slice ke saath badh raha hai.** Aaj wahi sections hain jinka data ban chuka
 * hai; baaki jaan-boojh kar **render hi nahi hote** — ek khaali section "abhi nahi bana"
 * nahi lagta, "toota hua" lagta hai (D-30 ka ulta).
 *
 * | Reference ka section | Yahan |
 * | --- | --- |
 * | Hero — title, meta, intro, banner | ✅ |
 * | About this itinerary (overview) | ✅ |
 * | Route strip | ✅ server pe derive hoti hai (D-51) |
 * | At-a-glance — Duration, Best season | ✅ (Ferries aur Hotels **Slice 5**) |
 * | Day-by-day itinerary | ✅ |
 * | What's included / not included | ✅ `packageDefaults` se (global, §1.5) |
 * | How booking works + cancellation | ✅ `packageDefaults` se |
 * | Gallery strip | ✅ `packageDefaults` ke pool se |
 * | Price, hotel category picker, add-ons | ❌ **Slice 5** |
 * | FAQs, reviews, similar itineraries | ❌ **Slice 6-7** |
 */

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

/** `5 nights / 6 days` — dono me se ek bhi na ho to kuch nahi. */
function duration(fields) {
  if (fields.nights == null && fields.days == null) return null

  const nights =
    fields.nights == null ? null : `${fields.nights} night${fields.nights === 1 ? '' : 's'}`
  const days = fields.days == null ? null : `${fields.days} day${fields.days === 1 ? '' : 's'}`

  return [nights, days].filter(Boolean).join(' / ')
}

/** Din ke card ki chips — sab structured data se, sirf `note` free text hai (D-51 §1). */
function dayChips(day) {
  return [
    day.transfer && [day.transfer.name, day.transferNote].filter(Boolean).join(': '),
    day.stay && `Stay: ${day.stay.name}`,
    day.meals.length > 0 && `${day.meals.map((m) => MEAL_LABEL[m] ?? m).join(', ')} included`,
    day.note,
  ].filter(Boolean)
}

export default function PackagePage({ entry, defaults }) {
  const { fields } = entry
  const stays = entry.destinations.map((d) => d.name).join(' · ')
  const length = duration(fields)

  const included = defaults?.whatsIncluded?.included ?? []
  const excluded = defaults?.whatsIncluded?.excluded ?? []
  const steps = defaults?.bookingSteps ?? []
  const gallery = defaults?.itineraryImages ?? []

  return (
    <main className="pkg">
      <section className="pkg__hero wrap">
        <div className="pmeta">
          {/* Rating Slice 6 me aayegi — abhi wo data hai hi nahi */}
          {stays && <span className="t">{stays}</span>}
          {stays && length && <i className="pmeta__d" />}
          {length && <span className="t">{length}</span>}
          {entry.availability === 'soldOut' && (
            <>
              <i className="pmeta__d" />
              <span className="pkg__sold">Sold out</span>
            </>
          )}
        </div>

        <h1>{entry.title}</h1>

        {fields.shortDescription && <p className="pintro">{fields.shortDescription}</p>}

        {entry.banner && (
          // Media resolve na ho to koi `<img>` hi nahi — D-42 §2
          <img
            className="pkg__banner"
            src={entry.banner.url}
            alt={entry.banner.alt || entry.title}
            width={entry.banner.width ?? undefined}
            height={entry.banner.height ?? undefined}
          />
        )}

        {fields.bestFor.length > 0 && (
          <div className="pkg__bestfor">
            <span>Best for</span>
            {fields.bestFor.map((tag) => (
              <b key={tag}>{tag}</b>
            ))}
          </div>
        )}
      </section>

      {gallery.length > 0 && (
        <section className="wrap pkg__gallery">
          {gallery.slice(0, 5).map((image) => (
            <img key={image.url} src={image.url} alt={image.alt || ''} loading="lazy" />
          ))}
          {gallery.length > 5 && <span className="pkg__more">+{gallery.length - 5} photos</span>}
        </section>
      )}

      <div className="wrap pkg__body">
        <section className="blk" id="overview">
          <h2>About this itinerary</h2>
          <RichText content={entry.content} />

          {entry.routeStrip.length > 0 && (
            <div className="route">
              {entry.routeStrip.map((leg, i) => (
                <div className="route__leg" key={`${leg.stayId}-${leg.from}`}>
                  {i > 0 && <div className="route__a" />}
                  <div className="route__s">
                    <span>
                      {leg.nights === 1 ? `Night ${leg.from}` : `Nights ${leg.from}–${leg.to}`}
                    </span>
                    <b>{leg.stay?.name ?? '—'}</b>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="atg">
            {length && (
              <div>
                <span>Duration</span>
                <b>{length}</b>
              </div>
            )}
            {fields.bestSeason && (
              <div>
                <span>Best season</span>
                <b>{fields.bestSeason}</b>
              </div>
            )}
            {entry.packageTypes.length > 0 && (
              <div>
                <span>Type</span>
                <b>{entry.packageTypes.map((t) => t.name).join(' · ')}</b>
              </div>
            )}
            {/* Ferries aur Hotels ke cells Slice 5 me judenge */}
          </div>
        </section>

        {entry.itinerary.length > 0 && (
          <section className="blk" id="itinerary">
            <h2>Day-by-day itinerary</h2>

            <div className="dnav">
              {entry.itinerary.map((day, i) => (
                <a href={`#day${i + 1}`} key={day.id ?? i}>
                  Day {i + 1}
                  {day.stay ? ` · ${day.stay.name}` : ''}
                </a>
              ))}
            </div>

            <ol className="itin">
              {entry.itinerary.map((day, i) => (
                <li className="itin__d" id={`day${i + 1}`} key={day.id ?? i}>
                  <div className="itin__k">
                    <b>Day {i + 1}</b>
                    {day.stay && <span>{day.stay.name}</span>}
                    {day.dayTag && <em>{day.dayTag}</em>}
                  </div>
                  <div className="itin__c">
                    <h3>{day.title}</h3>
                    {day.description && <p>{day.description}</p>}

                    {day.highlights.length > 0 && (
                      <ul className="itin__l">
                        {day.highlights.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}

                    {dayChips(day).length > 0 && (
                      <div className="itin__m">
                        {dayChips(day).map((chip) => (
                          <span key={chip}>{chip}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(included.length > 0 || excluded.length > 0) && (
          <section className="blk" id="included">
            <h2>What&rsquo;s included</h2>
            <div className="incl">
              {included.length > 0 && (
                <div>
                  <h3>Included</h3>
                  <ul className="incl__y">
                    {included.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {excluded.length > 0 && (
                <div>
                  <h3>Not included</h3>
                  <ul className="incl__n">
                    {excluded.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {(steps.length > 0 || defaults?.cancellationText) && (
          <section className="blk" id="booking">
            <h2>Good to know before you book</h2>

            {steps.length > 0 && (
              <ol className="steps">
                {steps.map((step, i) => (
                  <li key={step.id ?? i}>
                    <b>{step.title}</b>
                    {step.text && <span>{step.text}</span>}
                  </li>
                ))}
              </ol>
            )}

            {defaults?.cancellationText && <p className="muted">{defaults.cancellationText}</p>}
          </section>
        )}
      </div>
    </main>
  )
}
