import { PACKAGE_SECTION_DEFAULTS, isEmptyHtml } from '@cms/shared'
/** `<Fragment>` sirf hero ke meta list me — wahan har tukde ko key aur ek divider chahiye. */
import { Fragment } from 'react'

import CtaSection, { hasCtaSection } from './CtaSection.jsx'
import { EnquiryDockProvider } from './EnquiryDock.jsx'
import EnquiryForm from './EnquiryForm.jsx'
import Gallery from './Gallery.jsx'
import { pickHeroTiles } from '../../lib/hero.js'
import MobileBar from './MobileBar.jsx'
import Planner from './Planner.jsx'
import {
  AddOns,
  CatBar,
  CategoryProvider,
  HotelsSection,
  HotelsTag,
  PriceBlock,
} from './Pricing.jsx'
import { HeroRating, RatingNote } from './Rating.jsx'
import Reviews from './Reviews.jsx'
import RichText from './RichText.jsx'
import Schema from './Schema.jsx'
import SectionHead from './SectionHead.jsx'
import Similar from './Similar.jsx'
import StickySide from './StickySide.jsx'

/**
 * ⚠️ **`Reviews` aur `Similar` ko `next/dynamic` pe daalna aazma kar dekha — kuch nahi hua.**
 * Ye baat yahan isliye likhi hai ki wo koshish bilkul wajib lagti hai aur koi phir karega.
 *
 * Dono client components hain aur fold se bahut neeche hain (mobile pe ~8400px aur ~9500px),
 * to soch ye thi ki unka JS baad me utre. Naap ne mana kar diya (D-85):
 *
 * | | Pehle | `dynamic()` ke saath |
 * | --- | --- | --- |
 * | First Load JS | 138 kB | **138 kB** |
 * | Page pe kul JS | 141 KB | **141 KB** — koi naya chunk bana hi nahi |
 * | Mobile score (5 run ka median) | 91 | **91** |
 *
 * Wajah App Router ke dhaanche me hai: `ssr: false` yahan **daala hi nahi ja sakta** (SEO —
 * reviews aur similar packages page ka asli content hain, unhe crawler ko dikhna hi chahiye).
 * Aur `ssr: true` ke saath dono ka HTML server pe banta hai, yaani unka JS **hydration ke liye
 * chahiye hi chahiye** — Next use route ke bundle me hi rakhta hai. Chunk alag ho bhi jaaye to
 * wo usi waqt utrega.
 *
 * Yaani in dono ka JS bachane ka ek hi asli raasta hai: inhe client components na banana. Aur
 * wo ho nahi sakta — ek me slider ke arrows ka state hai, doosre me client ki maangi hui
 * `1 2 3` pagination.
 *
 * (`Lightbox` par yahi cheez **sach me** chalti hai — `Gallery.jsx` dekho. Farak ye hai ki wo
 * `ssr: false` pe hai: uska HTML server pe banta hi nahi, wo sirf click ke baad aata hai.)
 */

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
 * | Traveller reviews | ✅ universal reviews + haath se likhi rating (client, 1 Sep) |
 * | Similar itineraries | ✅ poori tarah derived — wahi nights/days wale package |
 */

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

/**
 * Breadcrumb ka beech wala crumb — package archive.
 *
 * ⚠️ **Ye Andaman-specific hai, aur jaan-boojh kar** (client, 1 Sep). Pehle ye crumb tha hi
 * nahi, kyunki archive page Phase 3 me banega aur "ek crumb jo 404 pe le jaaye, wo na hone
 * se bura hai". Client ne teen raaston me se hardcode chuna.
 *
 * Do baatein jo isse judi hain:
 *
 * - Naam aur URL dono **is client ke** hain. Doosre instance pe ye galat hoga — wahi haalat
 *   `TAB_NOTE` ki hai (Q-9, `09-OPEN-ITEMS.md`). Isiliye ye yahan ek constant hai, JSX me
 *   bikhra hua nahi: badalna ek line ka kaam rahe.
 * - Jis din archive page bane, iska `href` waise hi rahega — sirf 404 dena band kar dega.
 */
const ARCHIVE_CRUMB = { label: 'Andaman Tour Packages', href: '/andaman-tour-packages/' }

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
 * Har chip ke saath uska icon bhi aata hai. Icon chip ke **kism** se tay hota hai, uske text
 * se nahi — text client ka hai aur usme kuch bhi ho sakta hai.
 */
function dayChips(day) {
  return [
    /**
     * Transfer ki chip **tab bhi** banti hai jab sirf duration likhi ho.
     *
     * Pehle shart `day.transfer &&` thi, yaani transfer na chuna ho to poori chip gir jaati
     * thi — aur uske saath client ka likha hua `90 min` bhi. Ye chup tha: admin me text
     * bhara dikhta tha, page pe kuch nahi aata.
     *
     * Duration akeli ho to icon ghadi ka hai, gaadi ka nahi — bina transfer ke gaadi ka
     * icon ek aisi baat keh deta hai jo likhi hi nahi gayi.
     */
    (day.transfer || day.transferNote) && {
      text: [day.transfer?.name, day.transferNote].filter(Boolean).join(': '),
      icon: day.transfer ? 'car' : 'clock',
      emoji: day.transfer?.icon || '',
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
  /**
   * Hero ke paanch tiles — **har request pe naye** (D-85).
   *
   * `Math.random()` yahan server component me chalta hai, aur wo theek hai kyunki ye route
   * `ƒ Dynamic` hai. Jis din ise static/ISR banaya jaaye, ye randomness jam jaayegi — wo
   * chetavni `lib/hero.js` me likhi hai.
   */
  const hero = pickHeroTiles(entry.banner, defaults?.itineraryImages ?? [])

  /**
   * Section ke heading aur lines — admin se (Q-9).
   *
   * Fallback API me lag chuka hota hai; ye `??` sirf us soorat ke liye hai jab
   * `packageDefaults` ka call hi fail ho jaaye — tab bhi page bina heading ke nahi rehta.
   * Shared constant se hai, isliye ye doosra default kabhi pehle se alag nahi ho sakta.
   */
  const labels = defaults?.sectionLabels ?? PACKAGE_SECTION_DEFAULTS

  /**
   * **Reviews** global hain (client, 1 Sep) — `packageDefaults` se aati hain, entry se nahi.
   * Package inme se kuch chunta nahi.
   *
   * ⚠️ **Rating ab global NAHI hai — 9 Sep ko client ne pakda.**
   *
   * D-87 §3 (7 Sep) ne rating per-package kar di thi: `resolveRating(fields.rating,
   * defaults.rating)` payload me chalti hai aur `entry.rating` me poori resolve ho kar aati
   * hai. Card us par chala gaya tha, par **ye page `defaults.rating` hi padhta reh gaya** —
   * isliye listing me package ki apni rating dikhti thi aur uske apne page pe global wali.
   *
   * Ye D-70 ka comment tha jo D-87 §3 ke baad **bhi wahin baitha reh gaya**. Faisla badla,
   * uska palan ek jagah badla aur doosri jagah nahi.
   *
   * `?? defaults?.rating` sirf ehtiyaat hai — payload me fallback pehle hi lag chuka hota hai.
   */
  const reviews = defaults?.reviews ?? []
  const rating = entry.rating ?? defaults?.rating

  /**
   * Similar itineraries — server pe chune gaye (wahi nights/days, khud ko chhod kar).
   * Yahan koi filter nahi lagta; theme sirf teen-teen ke page banata hai.
   */
  const similar = entry.similar ?? []

  /**
   * Sidebar ka enquiry form — `packageDefaults` ke saath aata hai (client, 1 Sep).
   *
   * Koi active form na ho to `null` — sidebar me sirf "Talk to a planner" rehta hai.
   */
  const enquiryForm = defaults?.enquiryForm

  /**
   * "Package" wale dropdown ke vikalp.
   *
   * Design kehta hai `auto-filled from Packages`. Yahan wo **is page ka package aur uske
   * similar** hain — dono payload me pehle se hain, koi nayi query nahi lagti.
   *
   * Poori site ke saare packages jaan-boojh kar nahi: visitor is package ke page pe khada
   * hai, aur uski enquiry isi ke baare me hai. Saath me wahi vikalp hain jinpe wo abhi
   * neeche cards me dekh raha hai — yaani wo list jo yahan sach me kaam ki hai. Sabhi
   * packages bhejne ka matlab hota har package page ke payload me poori catalogue.
   */
  const formPackages = [entry.title, ...similar.map((item) => item.title)]

  /**
   * Client ne is section ke description box me kuch likha hai?
   *
   * ⚠️ Ye har section ke guard me **zaroori** hai. Pehle guard sirf section ke apne data ko
   * dekhte the (`steps.length > 0`, `faqs.length > 0`…), to client ka likha text bina kisi
   * error ke gayab ho jaata tha — admin me bhara hua dikhta, page pe kuch nahi.
   *
   * D-68 ke baad ye aur zaroori ho gaya: "Good to know" ka **poora content** ab isi box me
   * aata hai, yaani wahan description hi section ki wajah hai.
   *
   * Ye is codebase ka pehchana hua failure mode hai — D-64 (transfer chip ki shart
   * `day.transfer &&` thi, to akeli likhi duration gir jaati thi) aur D-65
   * (`cancellationText` payload me hi nahi ja raha tha). Teeno baar lakshan ek: **admin me
   * text dikhta hai, page pe kuch nahi, aur kahin koi error nahi.**
   */
  const wrote = (key) => !isEmptyHtml(labels[key]?.description)

  return (
    <CategoryProvider pricing={entry.pricing} currency={settings?.currency ?? 'INR'}>
      {/*
       * `EnquiryDockProvider` `<main>` ke **bahar** hai, jaan-boojh kar.
       *
       * Mobile pe enquiry form ek sheet ban jaata hai aur use `.mobar` kholti hai — aur wo
       * bar `<main>` ke bahar baithti hai (wo poore viewport se chipki hui hai, page ke
       * content ka hissa nahi). Provider ko andar rakhne se bar ko wo state milti hi nahi.
       */}
      <EnquiryDockProvider>
        {/*
         * `pkg--cta` server se lagti hai — pehle CSS `.pkg:has(.pkg__cta)` se ye khud
         * pata karta tha, aur wo page ka sabse mehnga selector tha (D-85).
         */}
        <main className={`pkg ${hasCtaSection(settings?.ctaSection) ? 'pkg--cta' : ''}`.trim()}>
          {/*
           * Structured data — reference ke `@graph` se (breadcrumb · trip · FAQs).
           *
           * `<main>` ke andar hai, `<head>` me nahi: Next ke App Router me `generateMetadata`
           * se `<script>` nahi nikalti, aur JSON-LD body me bilkul valid hai (Google khud yahi
           * kehta hai). Yahan hone ka ek faayda aur hai — jo data page render karta hai wahi
           * schema ko milta hai, do alag fetch nahi.
           */}
          <Schema
            entry={entry}
            defaults={defaults}
            settings={settings}
            breadcrumbs={[
              { name: 'Home', path: '/' },
              { name: ARCHIVE_CRUMB.label, path: ARCHIVE_CRUMB.href },
              { name: entry.title, path: entry.path },
            ]}
          />

          {/* Order reference ka hai: breadcrumb → .gal → .ptitle → body. */}
          <nav className="wrap vcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <i>›</i>
            <a href={ARCHIVE_CRUMB.href}>{ARCHIVE_CRUMB.label}</a>
            <i>›</i>
            <b>{entry.title}</b>
          </nav>

          <div className="wrap pkg__gal">
            {/*
             * Hero ke tiles **yahan (server pe) chune jaate hain** — D-85.
             *
             * Pehle ye chunav `Gallery` ke `useEffect` me hota tha, aur wahi page ka sabse
             * mehnga hissa tha: browser paanch images utaar chuka hota, phir hydration ke
             * baad wo paanch **badal** jaati aur sab dobara download hoti.
             */}
            <Gallery tiles={hero.tiles} all={hero.all} title={entry.title} />
          </div>

          {/*
           * Reference me `.ptitle` ek andar ka div hai aur `.catbar` uska **bhai** — dono
           * hero section ke andar. Pehle `.ptitle` khud section pe tha (tab uske do hi bachche
           * the); catbar ko us grid ka teesra bachcha banane se do-column layout toot jaata.
           */}
          <section className="pkg__hero wrap">
            <div className="ptitle">
              <div>
                {/*
                 * Teen tukde, aur beech me divider — par **koi bhi gayab ho sakta hai**.
                 *
                 * Pehle ye `{a && <i/>}` wali shart se juda hua tha, aur do tukdon pe wo chal
                 * jaata hai. Teesra judte hi wo galat ho jaata: rating ho aur stays na ho to
                 * ek divider bina kisi ke aage-peeche khada dikhta. Isliye ab list se banta hai
                 * — divider **hamesha** do maujood tukdon ke beech aata hai, kyunki khaali
                 * tukde list me pahunchte hi nahi.
                 *
                 * Yahi shakl D-64 wale transfer-chip bug ki thi: shart aur maal ek saath likhe
                 * gaye the.
                 */}
                <div className="pmeta">
                  {[
                    /** `4.9 ★ 412 traveller reviews` — `packageDefaults.rating` se (client, 1 Sep) */
                    rating?.value ? <HeroRating key="rating" rating={rating} /> : null,
                    stays ? (
                      <span className="t" key="stays">
                        <Pin />
                        {stays}
                      </span>
                    ) : null,
                    length ? (
                      <span className="t" key="length">
                        <Clock />
                        {length}
                      </span>
                    ) : null,
                  ]
                    .filter(Boolean)
                    .map((node, i) => (
                      <Fragment key={node.key}>
                        {i > 0 && <i className="pmeta__d" />}
                        {node}
                      </Fragment>
                    ))}
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
                <SectionHead label={labels.overview} />
                <RichText content={entry.content} />

                {entry.routeStrip.length > 0 && (
                  <div className="route">
                    {/*
                     * ⚠️ Card aur teer **sidhe `.route` ke bachche** hain, kisi wrapper ke andar
                     * nahi — reference me bhi wahi hai.
                     *
                     * Pehle har jodi (teer + card) ek `.route__leg` div me thi. Wo sirf `key`
                     * rakhne ki suvidha ke liye thi, par usne layout badal diya: `.route` ka
                     * `flex-wrap` phir **poori jodi** ko ek unit maanta tha, aur mobile pe wo
                     * jodiyan theek se nahi tootti thin (client, 2 Sep).
                     *
                     * `Fragment` se wahi `key` mil jaati hai aur DOM me koi extra box nahi
                     * banta — har card aur har teer alag-alag wrap hota hai, design ki tarah.
                     */}
                    {entry.routeStrip.map((leg, i) => (
                      <Fragment key={`${leg.stayId}-${leg.from}`}>
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
                            {leg.nights === 1
                              ? `Night ${leg.from}`
                              : `Nights ${leg.from}–${leg.to}`}
                          </span>
                          <b>{leg.stay?.name ?? '—'}</b>
                        </div>
                      </Fragment>
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

              {(entry.itinerary.length > 0 || wrote('itinerary')) && (
                <section className="blk" id="itinerary">
                  {/*
                   * Ye line pehle static thi, aur uspe likha tha: "isme ek vaada hai
                   * (Replanning is free) jo har client pe sach nahi hoga — jis din ise
                   * badalne ki zaroorat pade, ye `packageDefaults` ka field banegi."
                   * Wo din aa gaya (Q-9, 31 Aug) — ab wo field hai.
                   */}
                  <SectionHead label={labels.itinerary} />

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
                          {/*
                           * Din ki description ab **HTML** hai (D-80) — pehle yahan
                           * `dayBlocks()` chalta tha, jo `-` wali line ko bullet banata tha
                           * (D-64). Wo niyam ab render pe nahi, editor me hai.
                           *
                           * Safai write pe ho chuki hai (`core/sanitize-html.js`).
                           */}
                          {day.description && (
                            <div dangerouslySetInnerHTML={{ __html: day.description }} />
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
              <HotelsSection hotels={entry.hotels} label={labels.hotels} />
              <AddOns addOns={entry.addOns} label={labels.addOns} />

              {(included.length > 0 || excluded.length > 0 || wrote('included')) && (
                <section className="blk" id="included">
                  <SectionHead label={labels.included} />
                  <div className="inx">
                    {included.length > 0 && (
                      <div className="inx__c">
                        <h3>Included</h3>
                        {/*
                         * ⚠️ **`<Tick />` yahin rehta hai — icon theme ka hai, content ka
                         * nahi** (D-80). WordPress bhi yahi karta hai: theme ka wrapper aur
                         * icon `post_content` me kabhi nahi jaate, wahan sirf wo hota hai jo
                         * author ne likha.
                         *
                         * Line ab **inline HTML** hai (`<b>Daily</b> breakfast`), aur uska
                         * `<span>` isliye hai ki icon ke baad ka text ek hi node me rahe —
                         * `dangerouslySetInnerHTML` `<li>` pe lagane se `<Tick />` hi mit
                         * jaata.
                         */}
                        <ul className="tick">
                          {included.map((line) => (
                            <li key={line}>
                              <Tick />
                              <span dangerouslySetInnerHTML={{ __html: line }} />
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
                              <span dangerouslySetInnerHTML={{ __html: line }} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {(steps.length > 0 || defaults?.cancellationText || wrote('booking')) && (
                <section className="blk" id="booking">
                  <SectionHead label={labels.booking} />

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
                            {/* Ab HTML (D-80) — safai write pe ho chuki hai */}
                            {step.text && <div dangerouslySetInnerHTML={{ __html: step.text }} />}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/*
                   * `.blk__note` — reference me yahan inline `style="margin-top:12px"` hai.
                   *
                   * `.muted` yahan pehle likhi thi par uska theme me koi rule hai hi nahi —
                   * wo class kuch karti hi nahi thi, aur uske hone se ye lagta tha ki rang
                   * halka ho raha hai. Reference me ye paragraph baaki `.blk p` jaisa hi hai,
                   * sirf steps se 12px neeche.
                   */}
                  {defaults?.cancellationText && (
                    <div
                      className="blk__note"
                      dangerouslySetInnerHTML={{ __html: defaults.cancellationText }}
                    />
                  )}
                </section>
              )}

              {/*
               * Traveller reviews — reference ka `#reviews`.
               *
               * Section tabhi aata hai jab **kuch dikhane ko ho**: reviews, ya rating, ya client
               * ki likhi hui line. Teenon khaali hon to ye render hi nahi hota — khaali section
               * "abhi nahi bana" nahi, "toota hua" lagta hai (D-30 ka ulta).
               */}
              {(reviews.length > 0 || rating?.value || wrote('reviews')) && (
                <section className="blk" id="reviews">
                  <SectionHead label={labels.reviews} suffix={<RatingNote rating={rating} />} />
                  <Reviews reviews={reviews} />
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
              {(entry.faqs?.length > 0 || wrote('faq')) && (
                <section className="blk" id="faq">
                  <SectionHead label={labels.faq} />

                  <div className="faq">
                    {entry.faqs.map((faq, i) => (
                      <details key={faq.id ?? i} open={i === 0}>
                        <summary>{faq.question}</summary>
                        {faq.answer && <div dangerouslySetInnerHTML={{ __html: faq.answer }} />}
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {/*
               * Similar itineraries — reference ka `#similar`.
               *
               * Section tabhi aata hai jab sach me koi doosra package usi duration ka ho. Sirf
               * heading likhi hone se ye nahi khulta: ek "Similar itineraries" heading jiske
               * neeche kuch na ho, wo D-30 ka ulta hai — khaali nahi, **toota hua** dikhta hai.
               *
               * Isiliye yahan `wrote('similar')` ki shart **nahi** hai, jabki reviews aur baaki
               * sections pe hai. Wahan client ka likha text apne aap me content hota hai; yahan
               * content sirf cards hain.
               */}
              {similar.length > 0 && (
                <section className="blk" id="similar">
                  <SectionHead label={labels.similar} />
                  <Similar
                    items={similar}
                    rating={rating}
                    currency={settings?.currency ?? 'INR'}
                    perPage={defaults?.similar?.perPage}
                  />
                </section>
              )}
            </div>

            {/*
             * Sticky sidebar — reference ka `.pgl__side`.
             *
             * Isme do widget hain: upar **price + enquiry form**, neeche **"Talk to a planner"**.
             *
             * ⚠️ `<StickySide>` ek client component hai, aur wo sirf ek `<aside>` nahi hai:
             * jab column screen se **lambi** ho jaati hai (form ke saath ho jaati hai) to saada
             * `position: sticky` uska neeche wala hissa kabhi dikhne hi nahi deta. Reference me
             * uske liye ek script hai; wahi kaam wahan hota hai.
             */}
            <StickySide>
              {/*
               * Enquiry widget sabse upar — reference me bhi wahi kram hai (`#enquiry`, phir
               * "Talk to a planner"). D-67 ka button isi `#enquiry` pe utarta hai.
               */}
              <EnquiryForm form={enquiryForm} packages={formPackages} sourcePath={entry.path} />
              {/* Email form ke `emailTo` se — wahi pata jispe enquiries jaani hain (client, 2 Sep) */}
              <Planner settings={settings} email={enquiryForm?.contactEmail} />
            </StickySide>
          </div>

          {/*
           * Page ka aakhri card — reference ka "CLOSING CTA" (D-67).
           *
           * `.pgl` grid ke **bahar** hai, kyunki design me ye poori chaudai ka section hai,
           * main column ka hissa nahi. Admin ne section off kiya ho to component khud `null`
           * lautata hai.
           */}
          <CtaSection cta={settings?.ctaSection} />
        </main>

        {/*
         * Phone pe neeche chipki patti — Call · WhatsApp · Get free quote (client, 2 Sep).
         *
         * `<main>` ke bahar isliye ki wo page ka content nahi hai; wo viewport se chipki hui
         * hai aur har section ke upar tairti hai.
         *
         * `hasForm` ke bina "Get free quote" ek aisa button hota jo kuch kholta hi nahi —
         * client ne form draft kar diya ho ya placement hata di ho, dono me wo hota hi nahi.
         */}
        <MobileBar settings={settings} hasForm={Boolean(enquiryForm)} />
      </EnquiryDockProvider>
    </CategoryProvider>
  )
}
