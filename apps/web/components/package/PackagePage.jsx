import Gallery from './Gallery.jsx'
import Planner from './Planner.jsx'
import {
  AddOns,
  CatBar,
  CategoryProvider,
  HotelsSection,
  HotelsTag,
  PriceBlock,
} from './Pricing.jsx'
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
 * | Gallery mosaic (`.gal`) — **page ka hero** | ✅ pehla tile package ka `bannerImage`, baaki Itinerary Images ke pool se (client-side shuffle) |
 * | Title block (`.ptitle`) — meta, title, intro | ✅ (price wala right column **Slice 5**) |
 * | About this itinerary (overview) | ✅ |
 * | Route strip | ✅ server pe derive hoti hai (D-51) |
 * | At-a-glance — Duration · Ferries · Best season · Type | ✅ (Hotels ka cell **Slice 5**) |
 * | Day-by-day itinerary | ✅ |
 * | What's included / not included | ✅ `packageDefaults` se (global, §1.5) |
 * | How booking works + cancellation | ✅ `packageDefaults` se |
 * | Gallery strip | ✅ `packageDefaults` ke pool se |
 * | Price, hotel category picker, add-ons | ❌ **Slice 5** |
 * | Questions about this package (FAQs) | ✅ client ne Slice 5 ke saath maanga (D-59) |
 * | Reviews, similar itineraries | ❌ **Slice 6-7** |
 */

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

/**
 * What's included ke tick aur cross — reference ke inline SVG.
 *
 * Rang inke apne nahi hain: wo `.blk ul.tick svg` (hara) aur `.tick.no svg` (laal) se aata
 * hai, taaki dono list ek hi icon component se bhar sakein.
 */
const Tick = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="m5 13 4 4L19 7" />
  </svg>
)

const Cross = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

/*
 * `.pmeta` ki do chip ke icon — reference ke inline SVG, wahi 13px aur `stroke-width: 2.5`.
 *
 * Rang inka apna nahi hai: `.pmeta svg` `--blue-500` deta hai, isliye `currentColor` chhoda
 * hai — chip ka text `--ink-2` rehta hai aur icon neela.
 */
const Pin = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const Clock = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

/** Route strip me do stay ke beech ka teer — rang `.route__a` se (`--faint`). */
const Chevron = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
)

/** `5 nights / 6 days` — dono me se ek bhi na ho to kuch nahi. */
function duration(fields) {
  if (fields.nights == null && fields.days == null) return null

  const nights =
    fields.nights == null ? null : `${fields.nights} night${fields.nights === 1 ? '' : 's'}`
  const days = fields.days == null ? null : `${fields.days} day${fields.days === 1 ? '' : 's'}`

  return [nights, days].filter(Boolean).join(' / ')
}

/**
 * Wahi baat, par `<h1>` ke liye — `5 Nights / 6 Days`.
 *
 * Reference me heading me ye Title Case me hai aur meta chip me lowercase, isliye do alag
 * string hain, ek CSS `text-transform` nahi: chip `5 nights / 6 days` hi rehni chahiye.
 */
function durationTitle(fields) {
  const text = duration(fields)
  return text && text.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

/*
 * Din ki chips ke icon — reference ke inline SVG, 12px. Rang `.itin__m svg` se aata hai.
 *
 * Ferry aur cab ka icon reference me alag hai, par hamare paas transfer ek **free list**
 * hai (D-53 §1) — `Ferry`, `Catamaran`, `Cruise`, kuch bhi. "Ye paani wala hai" naam se
 * pehchanna bharosemand nahi, isliye transfer ki chip pe wo hi icon aata hai jo us record
 * pe likha hai (`transfer.icon`), aur na ho to gaadi.
 */
const CHIP_ICON = {
  bed: <path d="M3 18v-8h18v8M3 14h18M6 10V7h5v3" />,
  car: (
    <>
      <path d="M5 17h14M4 17v-4l2-5h12l2 5v4" />
      <circle cx="7.5" cy="17" r="1.6" />
      <circle cx="16.5" cy="17" r="1.6" />
    </>
  ),
  meal: <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M17 3c-1.7 1-2.5 3-2.5 5.5S15.3 13 17 13v8" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
}

const ChipIcon = ({ name }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={name === 'clock' ? '2.6' : '2.4'}
    aria-hidden="true"
  >
    {CHIP_ICON[name]}
  </svg>
)

/**
 * Din ke card ki chips — sab structured data se, sirf `note` free text hai (D-51 §1).
 *
 * Ab har chip ke saath uska icon bhi aata hai. Icon chip ke **kism** se tay hota hai, uske
 * text se nahi — text client ka hai aur usme kuch bhi ho sakta hai.
 */
function dayChips(day) {
  return [
    day.transfer && {
      text: [day.transfer.name, day.transferNote].filter(Boolean).join(': '),
      icon: 'car',
      emoji: day.transfer.icon || '',
    },
    day.stay && { text: `Stay: ${day.stay.name}`, icon: 'bed' },
    day.meals.length > 0 && {
      text: `${day.meals.map((m) => MEAL_LABEL[m] ?? m).join(', ')} included`,
      icon: 'meal',
    },
    day.note && { text: day.note, icon: 'clock' },
  ].filter(Boolean)
}

export default function PackagePage({ entry, defaults, settings }) {
  const { fields } = entry
  const stays = entry.destinations.map((d) => d.name).join(' · ')
  const length = duration(fields)
  const titleLength = durationTitle(fields)

  const included = defaults?.whatsIncluded?.included ?? []
  const excluded = defaults?.whatsIncluded?.excluded ?? []
  const steps = defaults?.bookingSteps ?? []
  const gallery = defaults?.itineraryImages ?? []

  return (
    <CategoryProvider
      pricing={entry.pricing}
      currency={settings?.currency ?? 'INR'}
      priceNote={defaults?.priceNote}
    >
      <main className="pkg">
        {/*
         * Order reference ka hai: breadcrumb → .gal → .ptitle → body.
         *
         * ⚠️ Beech ka crumb (`Andaman Tour Packages`) abhi **nahi** hai — wo package archive
         * ka link hoga, aur wo page Phase 3 me banega. Ek crumb jo 404 pe le jaaye, wo na
         * hone se bura hai.
         */}
        <nav className="wrap vcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <i>›</i>
          <b>{entry.title}</b>
        </nav>

        <div className="wrap pkg__gal">
          <Gallery images={gallery} banner={entry.banner} title={entry.title} />
        </div>

        {/*
         * Reference me `.ptitle` ek andar ka div hai aur `.catbar` uska **bhai** — dono
         * hero section ke andar. Pehle `.ptitle` khud section pe tha (tab uske do hi bachche
         * the); catbar ko us grid ka teesra bachcha banane se do-column layout toot jaata.
         */}
        <section className="pkg__hero wrap">
          <div className="ptitle">
            <div>
              <div className="pmeta">
                {/* Rating Slice 6 me aayegi — abhi wo data hai hi nahi */}
                {stays && (
                  <span className="t">
                    <Pin />
                    {stays}
                  </span>
                )}
                {stays && length && <i className="pmeta__d" />}
                {length && (
                  <span className="t">
                    <Clock />
                    {length}
                  </span>
                )}
              </div>

              {/*
               * Reference ka title do rang me hai — `Discover Andaman — <em>5 Nights / 6
               * Days</em>` — aur `<em>` wala hissa **derive** hota hai (`nights`/`days` se),
               * title field me nahi likha hota. Wahi soch jo D-58/D-60 me hai: jo package pe
               * pehle se hai use dobara mat poochho.
               */}
              <h1>
                {entry.title}
                {titleLength && (
                  <>
                    {' '}
                    — <em>{titleLength}</em>
                  </>
                )}
              </h1>

              {fields.shortDescription && <p className="pintro">{fields.shortDescription}</p>}

              {/*
               * `bestFor` yahan **nahi** hai. Wo listing card ka field hai (`tour-v3.html`) —
               * `Best for <b>first-timers on a short break</b>` — package page ka nahi (D-55).
               */}
            </div>

            <PriceBlock />
          </div>

          <CatBar hotels={entry.hotels} />
        </section>

        <div className="wrap pgl">
          <div className="pgl__main">
            <section className="blk" id="overview">
              <h2>About this itinerary</h2>
              <RichText content={entry.content} />

              {entry.routeStrip.length > 0 && (
                <div className="route">
                  {entry.routeStrip.map((leg, i) => (
                    <div className="route__leg" key={`${leg.stayId}-${leg.from}`}>
                      {/*
                       * Do stay ke beech ka teer. `.route__a` ki CSS pehle se thi par andar
                       * SVG kabhi daala hi nahi gaya — div khaali tha, isliye page pe cards
                       * ek doosre se juda hue nahi, bas alag-alag dikhte the.
                       */}
                      {i > 0 && (
                        <div className="route__a" aria-hidden="true">
                          <Chevron />
                        </div>
                      )}
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
                {fields.ferriesNote && (
                  <div>
                    <span>Ferries</span>
                    <b>{fields.ferriesNote}</b>
                  </div>
                )}
                {entry.pricing?.categoryPricing?.length > 0 && (
                  <div>
                    <span>Hotels</span>
                    {/* Chuni hui category ke saath badalta hai — reference ka `js-cat-tag` */}
                    <HotelsTag />
                  </div>
                )}
                {fields.bestSeason && (
                  <div>
                    <span>Best season</span>
                    <b>{fields.bestSeason}</b>
                  </div>
                )}
                {/*
                 * ⚠️ `Type` reference me **hai hi nahi** — wahan chaar cell hain aur `.atg`
                 * ka grid `repeat(4, 1fr)` hai. Isliye ye sabse aakhir me hai: pehli row
                 * hubahu design jaisi rehti hai, aur ye paanchwa cell akela doosri row me
                 * jaata hai. Client se poochha gaya hai ki ise rakhein ya hata dein.
                 */}
                {entry.packageTypes.length > 0 && (
                  <div>
                    <span>Type</span>
                    <b>{entry.packageTypes.map((t) => t.name).join(' · ')}</b>
                  </div>
                )}
              </div>
            </section>

            {entry.itinerary.length > 0 && (
              <section className="blk" id="itinerary">
                <h2>Day-by-day itinerary</h2>

                {/*
                 * ⚠️ Ye line **static** hai, reference se. Isme ek vaada hai ("Replanning is
                 * free") jo har client pe sach nahi hoga — jis din ise badalne ki zaroorat
                 * pade, ye `packageDefaults` ka field banegi.
                 */}
                <p>
                  Every day below can be moved, shortened or swapped. Replanning is free — you only
                  pay the difference in what you change.
                </p>

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
                              <span key={chip.text}>
                                {chip.emoji ? (
                                  <span aria-hidden="true">{chip.emoji}</span>
                                ) : (
                                  <ChipIcon name={chip.icon} />
                                )}
                                {chip.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/*
             * Kram reference ka hai: day-by-day → hotels → add-ons → what's included.
             *
             * Dono apne aap gayab ho jaate hain jab unka data nahi hota — khaali section
             * "abhi nahi bana" nahi, "toota hua" lagta hai.
             */}
            <HotelsSection hotels={entry.hotels} />
            <AddOns addOns={defaults?.addOns} />

            {(included.length > 0 || excluded.length > 0) && (
              <section className="blk" id="included">
                <h2>What&rsquo;s included</h2>
                <div className="inx">
                  {included.length > 0 && (
                    <div className="inx__c">
                      <h3>Included</h3>
                      <ul className="tick">
                        {included.map((line) => (
                          <li key={line}>
                            <Tick />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {excluded.length > 0 && (
                    <div className="inx__c no">
                      <h3>Not included</h3>
                      <ul className="tick no">
                        {excluded.map((line) => (
                          <li key={line}>
                            <Cross />
                            {line}
                          </li>
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
                        {/*
                         * Number wala neela circle `li::before` se aata hai (CSS counter) —
                         * isliye `<li>` ka apna content ek div me lapeta hua hai, warna
                         * flex me title aur text circle ke bagal me alag-alag baith jaate.
                         */}
                        <div>
                          <b>{step.title}</b>
                          {step.text && <p>{step.text}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {defaults?.cancellationText && <p className="muted">{defaults.cancellationText}</p>}
              </section>
            )}

            {/*
             * "Questions about this package" — reference ka `#faq`.
             *
             * `<details>` jaan-boojh kar, koi JS nahi: accordion browser ka apna hai, wo bina
             * hydration ke chalta hai, aur band accordion ka text bhi Ctrl+F se mil jaata hai.
             *
             * **Pehla khula hai**, reference ki tarah — poori band list ke saamne user ko
             * pata hi nahi chalta ki andar kya hai.
             */}
            {entry.faqs?.length > 0 && (
              <section className="blk" id="faq">
                <h2>Questions about this package</h2>

                <div className="faq">
                  {entry.faqs.map((faq, i) => (
                    <details key={faq.id ?? i} open={i === 0}>
                      <summary>{faq.question}</summary>
                      {faq.answer && <p>{faq.answer}</p>}
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/*
           * Sticky sidebar — reference ka `.pgl__side`.
           *
           * Isme do widget hain: upar **price + enquiry form** (Slice 5 + Enquiries, Phase 7b)
           * aur neeche **"Talk to a planner"**. Aaj sirf doosra ban sakta hai, kyunki uska
           * poora data settings me pehle se hai.
           */}
          <aside className="pgl__side">
            <Planner settings={settings} />
          </aside>
        </div>
      </main>
    </CategoryProvider>
  )
}
