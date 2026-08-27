import { useState } from 'react'

import { HOTEL_CATEGORIES, HOTEL_CATEGORY_LABEL, pricedCategories } from '@cms/shared'

import { confirmRemove } from '../../lib/confirm.js'

/**
 * Hotels — spec 007 §4.2. **Design me ye panel tha hi nahi**, ye spec se aaya hai.
 *
 * ## Table apne aap banti hai — ye panel sirf **jodne** ke liye hai
 *
 * Public page ki hotels table poori tarah derived hai (D-58, D-60, D-61): rows itinerary ke
 * overnight stays se, categories pricing se, aur hotel **Hotels master list** se — us
 * destination aur us category ka jo hotel wahan hai, wahi.
 *
 * Yaani is panel me kuch **na** karo to bhi page pe table poori bharti hai.
 *
 * ## Auto wali rows yahan **dikhti hi nahi**
 *
 * Pehle yahan har jodi ki row thi, `Auto — <hotel>` label ke saath (D-60). Teen destination ×
 * chaar category = bara rows, aur unme se lagbhag saari bas wahi dohra rahi thin jo master
 * list me pehle se likha hai. Client ne wo hata di (27 Aug — D-61): panel ab ek hi sawaal
 * poochta hai — _"is package pe kahin koi doosra hotel chahiye?"_
 *
 * Neeche wali list me **sirf wo rows hain jo client ne khud jodi hain**, taaki unhe dekha aur
 * hataya ja sake. Auto wali usme kabhi nahi aatin.
 *
 * **Jodi hui row us jodi ke auto wale ko hata deti hai**, uske saath nahi dikhti — ek island
 * ki ek category me do hotel dekh kar customer ko pata hi nahi chalta ki wo kis me ruk raha
 * hai.
 */

export default function HotelsPanel({
  rows,
  onChange,
  days,
  pricing,
  destinations,
  hotels,
  disabled,
}) {
  const list = rows ?? []

  const [draft, setDraft] = useState({ destinationId: '', category: '', hotelId: '' })

  /** Itinerary me jin jagah raat rukni hai — kram itinerary ka, har jagah ek hi baar. */
  const stayIds = []
  for (const day of days ?? []) {
    const id = day?.overnightStayId
    if (id && !stayIds.includes(id)) stayIds.push(id)
  }

  /**
   * Categories pricing se aati hain, par khaali pricing pe panel bekaar na ho isliye
   * fallback chaaron hai — client hotel pehle jod sakta hai aur daam baad me bhar sakta hai.
   */
  const priced = pricedCategories(pricing).map((row) => row.category)
  const categories = priced.length ? priced : HOTEL_CATEGORIES

  const nameOf = (id) => destinations.find((d) => d.id === id)?.name ?? 'Unknown destination'
  const hotelName = (id) => hotels.find((h) => h.id === id)?.name ?? 'Unknown hotel'

  /** Dono khaane bharne ke baad hi hotel ki list bharti hai — warna 40 naam ek saath. */
  const options =
    draft.destinationId && draft.category
      ? hotels.filter(
          (h) => h.destinationId === draft.destinationId && h.category === draft.category,
        )
      : []

  function add() {
    if (!draft.destinationId || !draft.category || !draft.hotelId) return

    // Usi jodi ki purani row hata kar nayi — ek jodi pe do row kabhi nahi (service bhi rokti hai)
    const rest = list.filter(
      (r) => !(r.destinationId === draft.destinationId && r.category === draft.category),
    )

    onChange([...rest, { id: crypto.randomUUID(), ...draft }])
    setDraft({ destinationId: '', category: '', hotelId: '' })
  }

  if (stayIds.length === 0) {
    return (
      <div className="panel-body">
        <p className="subtitle" style={{ margin: 0 }}>
          Add days with an overnight stay in the itinerary first — hotels follow the places this
          package stays.
        </p>
      </div>
    )
  }

  return (
    <div className="panel-body">
      <p className="hint" style={{ marginTop: 0 }}>
        The site picks each hotel from the Hotels list on its own. Add a row here only if this
        package needs a different property somewhere.
      </p>

      <div className="row3">
        <div className="field">
          <label>Destination</label>
          <select
            className="sel"
            value={draft.destinationId}
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, destinationId: e.target.value, hotelId: '' })}
          >
            <option value="">Select…</option>
            {stayIds.map((id) => (
              <option key={id} value={id}>
                {nameOf(id)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Category</label>
          <select
            className="sel"
            value={draft.category}
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, category: e.target.value, hotelId: '' })}
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {HOTEL_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Hotel</label>
          <select
            className="sel"
            value={draft.hotelId}
            disabled={disabled || options.length === 0}
            onChange={(e) => setDraft({ ...draft, hotelId: e.target.value })}
          >
            <option value="">
              {!draft.destinationId || !draft.category
                ? 'Pick a destination and category'
                : options.length === 0
                  ? 'No hotel in this list yet'
                  : 'Select…'}
            </option>
            {options.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-sm"
        disabled={disabled || !draft.hotelId}
        onClick={add}
      >
        ＋ Add hotel
      </button>

      {list.length > 0 && (
        <table className="list" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Category</th>
              <th>Hotel</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, index) => (
              <tr key={row.id ?? index}>
                <td>
                  <b>{nameOf(row.destinationId)}</b>
                </td>
                <td>{HOTEL_CATEGORY_LABEL[row.category] ?? row.category}</td>
                <td>{hotelName(row.hotelId)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={disabled}
                    onClick={() => {
                      const what = `${nameOf(row.destinationId)} · ${
                        HOTEL_CATEGORY_LABEL[row.category] ?? row.category
                      }`
                      if (!confirmRemove(what)) return
                      onChange(list.filter((_, i) => i !== index))
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
