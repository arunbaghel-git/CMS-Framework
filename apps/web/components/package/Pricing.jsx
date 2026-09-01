'use client'

import { createContext, useContext, useMemo, useState } from 'react'

import { HOTEL_CATEGORY_LABEL, formatPrice, isEmptyDoc } from '@cms/shared'

import SectionHead from './SectionHead.jsx'

/**
 * Daam aur hotel category — `itinerary-v3.html` ke `.ptitle__p`, `.catbar` aur `#hotels` se
 * (spec 007 §4, Slice 5).
 *
 * ## Teen hisse ek hi file me kyun hain
 *
 * Reference me category chunna **teen jagah ek saath** badalta hai: upar ka daam
 * (`.ptitle__p`), catbar ka chuna hua card, aur hotels ki table. Design ka apna JS bhi yahi
 * karta hai — `js-catpick` aur `js-htab` ek doosre ko sync karte hain.
 *
 * Isliye selected category ek **context** me hai. Teen alag component apni-apni state
 * rakhte to page pe do alag jawab dikhte: upar Standard ka daam aur neeche Deluxe ki table
 * — aur user ko pata hi nahi chalta ki kaunsa sach hai.
 *
 * Provider client component hai par uske **children server-rendered rehte hain** — poora
 * page client pe nahi jaata, sirf ye teen hisse.
 *
 * ## Category ka source `categoryPricing[]` hai, `hotels[]` nahi
 *
 * Tab wahi banti hai jiska **daam** likha hai. Jis category ka hotel to chuna hai par daam
 * nahi, uska tab dikhana matlab ek aisa tab jo daam ke bina khulta hai — aur wahi tab
 * booking form me bhi jaata hai.
 */

const CategoryContext = createContext(null)

/**
 * ⚠️ Ye hook **is file ke bahar bhi** jaata hai — `EnquiryForm` ka "Hotel category" dropdown
 * isse hi category badalta hai (reference ka `.js-cat-sel`).
 *
 * Yaani page pe do jagah se ek hi cheez chunti hai: upar ka catbar, aur sidebar ka form. Wo
 * jaan-boojh kar hai — reference me bhi dono ek hi daam dikhate hain, isliye unka state bhi
 * ek hi hona chahiye. Do alag state rakhne ka matlab hota ki catbar "Deluxe" dikhata aur form
 * "Standard" bhejta.
 */
export function useCategory() {
  const ctx = useContext(CategoryContext)
  if (!ctx) throw new Error('Pricing ke hisse CategoryProvider ke andar hi chalte hain')
  return ctx
}

export function CategoryProvider({ pricing, currency, children }) {
  /**
   * Rows **server pe hi** chhan kar aate hain (`pricedCategories()`) — jinka daam nahi
   * bhara wo payload me hi nahi hote, aur jo hain wo sasti se mehngi ke kram me hain.
   *
   * Theme yahan dobara filter/sort nahi karta: do jagah wahi tark rakhne ka matlab hota ki
   * ek din wo alag ho jaayein aur page pe chaar card par teen tab dikhein.
   */
  const rows = pricing?.categoryPricing ?? []

  /**
   * Shuruaat sabse sasti category se — wahi daam page ke upar bhi dikhta hai (§6).
   *
   * Agar shuruaat kisi aur se hoti to page khulte hi upar ka `from` daam aur chuna hua tab
   * do alag number dikhate.
   */
  const [category, setCategory] = useState(() => rows[0]?.category ?? null)

  const value = useMemo(
    () => ({
      rows,
      currency,
      category,
      setCategory,
      selected: rows.find((r) => r.category === category) ?? rows[0] ?? null,
    }),
    [rows, currency, category],
  )

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>
}

/**
 * Sidebar ke enquiry widget ka neela sar — reference ka `.bkg__t`.
 *
 * Wahi `useCategory()` se chalta hai jo hero ka `PriceBlock` chalata hai, isliye category
 * badalte hi **dono** ek saath badalte hain. Do jagah alag hisaab rakhne ka matlab hota ki
 * ek din upar kuch aur daam dikhta aur form ke sar pe kuch aur — aur wo customer ko dikhta.
 *
 * ⚠️ `save 22%` reference me hai par yahan **derive** hota hai, likha hua nahi:
 * `(strike − price) / strike`. Kaata hua daam na ho to wo line aati hi nahi — "save 0%"
 * chhapna adhoora page dikhata hai (D-30).
 */
export function PriceHeader() {
  const { selected, currency, category } = useCategory()

  if (!selected) return null

  const save =
    selected.strikePrice != null
      ? Math.round(((selected.strikePrice - selected.priceFrom) / selected.strikePrice) * 100)
      : 0

  return (
    <div className="bkg__t">
      {selected.strikePrice != null && <del>{formatPrice(selected.strikePrice, currency)}</del>}
      <b>{formatPrice(selected.priceFrom, currency)}</b>
      {/* Wahi static chhoti line jo hero me hai (client, 27 Aug) — dono ek jaisi rehni chahiye. */}
      <span>per person · twin sharing</span>
      {save > 0 && (
        <i>
          {HOTEL_CATEGORY_LABEL[category] ?? category} · save {save}%
        </i>
      )}
    </div>
  )
}

/** `₹31,999  ₹24,999  per person` — title ke daayin taraf ka column. */
export function PriceBlock({ ctaLabel = 'Get this itinerary', ctaHref = '#enquiry' }) {
  const { selected, currency } = useCategory()

  // Ek bhi category ka daam na ho to yahan kuch nahi aata — `.ptitle` ka grid `auto`
  // column ko 0 kar deta hai aur title poori chaudai le leta hai
  if (!selected) return null

  return (
    <div className="ptitle__p">
      {selected.strikePrice != null && <del>{formatPrice(selected.strikePrice, currency)}</del>}
      <b>{formatPrice(selected.priceFrom, currency)}</b>
      {/*
       * Ye line **static** hai, reference se jaisi ki taisi (client, 27 Aug) — har cheez
       * field nahi banti.
       *
       * Pehle yahan `packageDefaults.priceNote` daali gayi thi, par wo poori vaakya hai
       * ("per person on twin sharing, daily breakfast included.") aur yahan ek **chhoti**
       * line chahiye — `.ptitle__p` ke `nowrap` me wo grid column ko kheench deti thi.
       * Wo line apni asli jagah — hotels table ke neeche — `PRICE_NOTE` se chhapti hai.
       */}
      <span>per person · twin sharing</span>
      {/*
       * `btn btn--accent` — reference me ye `b b-o` hai, par is repo me buttons ke class
       * naam badal chuke hain (globals.css §buttons). Reference ka naam likhne ka nateeja
       * ek **bina style ka link** hota hai, aur wo galti chup hoti hai: page render ho jaata
       * hai, bas button button nahi lagta.
       */}
      <a className="btn btn--accent" href={ctaHref}>
        {ctaLabel}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </div>
  )
}

const Tick = () => (
  <i className="catbar__ck" aria-hidden="true">
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  </i>
)

/**
 * Chaar card — naam, hotel ki chhoti line, aur daam. Hero ke neeche.
 *
 * **Beech wali line us category ke pehle hotel ke `note` se aati hai** (client, 27 Aug —
 * D-57). Pehle wo har package pe alag likhi jaati thi (`categoryPricing[].note`, D-53 §2);
 * ab wo hotel ke apne record pe hai, aur ek baar likhne se har package me chalti hai.
 *
 * "Pehla" = package ke `hotels[]` me jo pehle aata hai — yaani kram client ke haath me hai
 * (Hotels panel me rows wahi order me rehti hain). Jis hotel ka note khaali hai, uski line
 * dikhti hi nahi.
 */
export function CatBar({ hotels }) {
  const { rows, category, setCategory, currency } = useCategory()

  const noteFor = (cat) => (hotels ?? []).find((h) => h.category === cat && h.note)?.note ?? ''

  // Ek hi category ho to "choose" karne ko kuch hai hi nahi
  if (rows.length < 2) return null

  return (
    <div className="catbar">
      <div className="catbar__h">
        <b>Choose your hotel category</b>
        {/* Reference ka poora text (R15) — "and ferry class" pehle chhoot gaya tha */}
        <span>The day-by-day plan stays the same — only the hotels and ferry class change.</span>
      </div>

      <div className="catbar__g" role="tablist" aria-label="Hotel category">
        {rows.map((row) => (
          <button
            key={row.category}
            type="button"
            role="tab"
            aria-selected={row.category === category}
            onClick={() => setCategory(row.category)}
          >
            <Tick />
            <b>{HOTEL_CATEGORY_LABEL[row.category] ?? row.category}</b>
            {noteFor(row.category) && <span>{noteFor(row.category)}</span>}
            <strong>{formatPrice(row.priceFrom, currency)}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * At-a-glance ka Hotels wala cell — `Standard · upgradable`.
 *
 * Reference me ye `js-cat-tag` hai aur category ke saath badalta hai, isliye ye bhi context
 * se hi aata hai.
 */
export function HotelsTag() {
  const { rows, selected } = useCategory()
  if (!selected) return null

  const label = HOTEL_CATEGORY_LABEL[selected.category] ?? selected.category

  return <b>{rows.length > 1 ? `${label} · upgradable` : label}</b>
}

/**
 * Har hotel category ka do-hissa text — tab ka chhota naranji `label` (`Standard **Base**`)
 * aur tabs ke neeche panel ka `text`.
 *
 * ⚠️ **Ye hardcoded content hai, aur ye is repo ke apne usool ke khilaaf hai** (client ka
 * faisla, 27 Aug — Q-9). Dono ke liye koi field nahi hai aur client ne admin me nayi jagah
 * dene se mana kiya. `note` (jo catbar pe chhapta hai) label ki jagah daalne ka mashwara
 * diya gaya tha; wo na-manzoor hua kyunki pill design se kaafi chaudi ho jaati.
 *
 * Jo isse tootta hai: `Sea-facing`, `Beachfront`, `Havelock`, `Sitapur` — sab **Andaman ki
 * baat hai**, jabki core code har client ke instance me wahi rehta hai. Agle client ke
 * pahaadi package pe tab pe `Beachfront` likha aayega aur panel me Havelock ka zikr. Isiliye
 * ye `packages/shared` me **nahi** hai — theme layer me hai, taaki client ka apna theme ise
 * badal sake bina core chhue.
 *
 * `text` sirf un chaar category ke liye hai jo reference me hain. Client paanchvi category
 * jode to uska panel bina paragraph ke rahega — khaali `<p>` chhapne se behtar.
 *
 * Jis din inke liye field banein, ye const hat jayega — aur bas.
 */
/**
 * `… per person on twin sharing, daily breakfast included.` — hotels table ke neeche wali
 * patti ka aakhri hissa (client, 27 Aug — Q-9).
 *
 * Pehle ye `packageDefaults.priceNote` thi aur admin me Packages ▸ Hotels pe uska field tha
 * (D-57 §3, D-62). Client ne wo field hata diya: ye line har package pe, har category pe
 * bilkul wahi rehti hai, aur uske liye admin me ek aur jagah dena bina wajah tha.
 *
 * Category ka naam aur daam ab bhi **derive** hote hain — sirf ye poonchh static hai.
 */
const PRICE_NOTE = 'per person on twin sharing, daily breakfast included.'

const CATEGORY_COPY = {
  standard: {
    label: 'Base',
    text: 'The base category — comfortable, well-run properties in walkable locations, picked for reliable power, water and staff more than for the view.',
  },
  deluxe: {
    label: 'Sea-facing',
    text: 'A clear step up on all three islands, with a sea-facing room on Havelock. This is the upgrade most couples take, and the one we suggest for a honeymoon.',
  },
  premium: {
    label: 'Beachfront',
    text: 'Beachfront on both Havelock and Neil — you step out of the room onto sand. Port Blair moves to a harbour-view property on Marine Hill.',
  },
  luxury: {
    label: 'Villas',
    text: 'The highest category the islands have — the best resorts and private villas we work with. Havelock is a beachfront villa with its own deck; Neil is a boutique villa resort at Sitapur. These properties sell out first, so book early.',
  },
}

/**
 * "Hotels on this package" — tabs + har category ki apni table.
 *
 * `Nights` aur `Room` server se resolve ho kar aate hain (`/api/public/resolve`): nights
 * itinerary se derive hoti hai aur room hotel ke apne record se (D-53 §3). Theme unhe
 * banata nahi, sirf dikhata hai.
 */
export function HotelsSection({ hotels, label }) {
  const { rows, category, setCategory, currency } = useCategory()

  const byCategory = useMemo(() => {
    const map = new Map()
    for (const hotel of hotels ?? []) {
      map.set(hotel.category, [...(map.get(hotel.category) ?? []), hotel])
    }
    return map
  }, [hotels])

  // Jin categories ka daam bhi hai aur hotel bhi
  const tabs = rows.filter((row) => (byCategory.get(row.category) ?? []).length > 0)

  /**
   * Koi category na ho to table ban hi nahi sakti — par agar client ne is section ka
   * description likha hai to wo phir bhi chhapna chahiye.
   *
   * Yahan **jaldi lautna zaroori hai**, `null` se pehle: neeche `active` `tabs[0]` se
   * banta hai, aur khaali `tabs` pe wo `undefined` ho kar `active.category` pe crash
   * karega. Isiliye ye do alag return hain, ek shart nahi.
   */
  if (tabs.length === 0) {
    if (isEmptyDoc(label?.description)) return null

    return (
      <section className="blk" id="hotels">
        <SectionHead label={label} />
      </section>
    )
  }

  const active = tabs.find((t) => t.category === category) ?? tabs[0]
  const table = byCategory.get(active.category) ?? []
  const activeLabel = HOTEL_CATEGORY_LABEL[active.category] ?? active.category

  return (
    <section className="blk" id="hotels">
      {/*
       * Heading aur line dono ab admin se (Q-9, 31 Aug). Default `package-sections.js` me
       * hai — wahi reference ka poora text (R15).
       *
       * ⚠️ Default me "and on the enquiry form" likha hai aur wo form abhi bana nahi
       * (Enquiries, Q-2). Pehle wo teen shabd hatana ek code change tha; ab client box
       * khaali kar ke poori line hata sakta hai.
       */}
      <SectionHead label={label} />

      {tabs.length > 1 && (
        <div className="htab" role="tablist" aria-label="Hotel category">
          {tabs.map((tab) => (
            <button
              key={tab.category}
              type="button"
              role="tab"
              aria-selected={tab.category === active.category}
              onClick={() => setCategory(tab.category)}
            >
              {HOTEL_CATEGORY_LABEL[tab.category] ?? tab.category}
              {CATEGORY_COPY[tab.category]?.label && (
                <span>{CATEGORY_COPY[tab.category].label}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="hpan">
        {/* Chuni hui category ka apna paragraph — `.hpan > p` (reference me table se pehle) */}
        {CATEGORY_COPY[active.category]?.text && <p>{CATEGORY_COPY[active.category].text}</p>}

        <div className="tblw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Island</th>
                <th>Nights</th>
                <th>{activeLabel} category</th>
                {/*
                 * `Note` ka column **hata diya gaya hai** — reference me table ke chaar hi
                 * column hain. Hotel ka `note` pehle se catbar ke card pe chhapta hai
                 * (D-57), aur wahi text do jagah dikhne se table me ek column bhar jaata
                 * tha jo design me hai hi nahi.
                 */}
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {table.map((hotel) => (
                <tr key={hotel.id ?? `${hotel.destination.id}-${hotel.category}`}>
                  <td>
                    <b>{hotel.destination.name}</b>
                  </td>
                  <td>{hotel.nights}</td>
                  {/*
                   * Naam **jaisa hai waisa** — theme apni taraf se kuch nahi jodta
                   * (client, 31 Aug).
                   *
                   * Pehle yahan `<em>or similar</em>` chhapta tha, design ke hisaab se
                   * (R15). Par Hotels master list me client ne khud har naam me
                   * "(or similar)" likha hua tha, to table me wo **do baar** aata:
                   * `Garden resort, 5 min from Govind Nagar beach (or similar) or similar`.
                   *
                   * Do raaste the — naam se hata do, ya theme se. Client ne theme se
                   * hatane ko kaha: _"jo name hoga wahi dikhega, apne side se add mat
                   * karo."_ Ye design se **vichlan** hai, client ke faisle se (R15) — aur
                   * yahi is poore din ka niyam raha: admin ka text jaisa likha hai waisa
                   * chhape, theme uspe apna kuch na chipkaye.
                   */}
                  <td>{hotel.name}</td>
                  <td>{hotel.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/*
         * `Deluxe category — ₹29,499 per person on twin sharing, daily breakfast included.`
         *
         * Category ka naam aur daam **derive** hote hain (chuna hua tab + uska daam); baaki
         * line static hai (`PRICE_NOTE`, upar).
         */}
        <div className="hpan__note">
          <span>
            <b>{activeLabel}</b> category — <b>{formatPrice(active.priceFrom, currency)}</b>{' '}
            {PRICE_NOTE}
          </span>
        </div>
      </div>
    </section>
  )
}

/**
 * "Popular add-ons" — Add Ons master list, poori.
 *
 * **Package pe chune hue add-ons** — poori master list kabhi nahi chhapti (§1.4). Ye field
 * D-61 me global ho gaya tha aur D-64 me wapas chunav pe aa gaya.
 *
 * Category se iska koi lena-dena nahi, isliye ye context bhi nahi padhta — par file yahi hai,
 * kyunki page pe ye hotels ke theek baad aata hai.
 */
export function AddOns({ addOns, label }) {
  /** Ek bhi add-on na ho aur client ne kuch likha bhi na ho — tabhi poora section chhodo. */
  if (!addOns?.length && isEmptyDoc(label?.description)) return null

  return (
    <section className="blk" id="add-ons">
      <SectionHead label={label} />

      {addOns?.length > 0 && (
        <div className="tblw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Add-on</th>
                <th>Price</th>
                <th>Where</th>
              </tr>
            </thead>
            <tbody>
              {addOns.map((addOn) => (
                <tr key={addOn.id}>
                  <td>
                    <b>{addOn.name}</b>
                  </td>
                  <td>{addOn.price}</td>
                  <td>{addOn.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
