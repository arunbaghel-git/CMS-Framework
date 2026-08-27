import { useState } from 'react'

import { MEALS, MEAL_LABEL, routeStrip } from '@cms/shared'

import { confirmRemove } from '../../lib/confirm.js'
import { useListDrag } from '../../lib/drag-list.js'

/**
 * Itinerary Builder — `admin-design.html` ke `#s-package-edit` wale panel se, spec 007 §3.
 *
 * Design se **do farq**, dono client ke faisle se:
 *
 * - **Day Images hata diye gaye** (spec 007 §3).
 * - **Overnight Stay ab ek dropdown hai**, free text nahi — Destinations list se. Free text
 *   hone pe "Havelock" aur "Havelock Island" do alag jagah ban jaate, aur route strip do
 *   card dikhati. Yahi wajah thi ki client ne ise list se bandha.
 *
 * Design me jo nahi tha par spec §3 maangti hai: `transferNote` (`90 min`),
 * `dayTag` (`Arrival day`) aur `note` (`Approx. 4 hrs sightseeing` — D-51 §1).
 *
 * **Route strip ka live preview neeche hai.** Wo puri tarah derived hai (§3.1) — client use
 * bharta nahi. Use yahin dikhana isliye zaroori hai ki wahi ek jagah hai jahan overnight
 * stay ki galti turant dikh jaati hai: galat din pe galat stay chunne ka nateeja public
 * page pe jaakar pata chalta, jahan use theek karna sabse mehnga hai.
 */

/** Ek khaali din — `id` client-side banti hai taaki reorder ke aar-paar stable rahe (D-43 §5). */
function blankDay() {
  return {
    id: crypto.randomUUID(),
    title: '',
    overnightStayId: null,
    description: '',
    meals: [],
    transferId: null,
    transferNote: '',
    dayTag: '',
    note: '',
  }
}

/*
 * `toLines()` **hata diya gaya** — wo sirf `highlights[]` ke liye tha, aur wo field D-64 me
 * description me mil gayi. Ek helper jiska koi caller na ho wo sirf sadta hai (wahi tark
 * jo `tags` field type par laga tha, D-55).
 */

export default function ItineraryBuilder({
  days,
  onChange,
  destinations,
  transfers,
  disabled,
  dragHandle,
}) {
  const [open, setOpen] = useState(() => new Set())

  const nameOf = (list, id) => list.find((x) => x.id === id)?.name

  function update(index, patch) {
    onChange(days.map((day, i) => (i === index ? { ...day, ...patch } : day)))
  }

  function reorder(from, to) {
    if (to < 0 || to >= days.length || from === to) return

    const next = [...days]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const drag = useListDrag(reorder, !disabled)

  function addDay() {
    const day = blankDay()
    onChange([...days, day])
    // Naya din khud khulta hai — warna user ko lagta hai ki click ne kuch kiya hi nahi
    setOpen((s) => new Set(s).add(day.id))
  }

  /**
   * "Duplicate Last Day" — design ka doosra button.
   *
   * Itinerary me lagatar din aksar 80% same hote hain (wahi stay, wahi transfer, wahi
   * meals); sirf title aur description badalte hain. **Naya `id`** milta hai, warna dono
   * din ek hi React key pe aa jaate aur collapse state dono pe chipak jaati.
   */
  function duplicateLast() {
    const last = days[days.length - 1]
    if (!last) return

    const copy = { ...last, id: crypto.randomUUID(), title: `${last.title} (copy)` }
    onChange([...days, copy])
    setOpen((s) => new Set(s).add(copy.id))
  }

  function toggle(id) {
    setOpen((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const strip = routeStrip(days)

  /** Head pe dikhne wali chhoti line — wahi jo public card pe chip banti hai. */
  function summary(day) {
    const bits = [
      nameOf(destinations, day.overnightStayId) &&
        `Stay: ${nameOf(destinations, day.overnightStayId)}`,
      nameOf(transfers, day.transferId),
      day.note,
    ].filter(Boolean)

    return bits.join(' · ')
  }

  return (
    <div className="panel itin-panel">
      <div className="panel-head">
        {/* Panels ka kram badalne ka grip — SortablePanels deta hai (D-64) */}
        {dragHandle && (
          <span className="grip" {...dragHandle}>
            ⠿
          </span>
        )}
        <h2>Itinerary Builder</h2>
        <span className="muted">
          {days.length} {days.length === 1 ? 'day' : 'days'}
          {days.length > 1 && !disabled && ' · drag to reorder'}
        </span>
      </div>

      <div className="panel-body">
        {days.length === 0 && <p className="muted">No days yet. Add the first one below.</p>}

        {days.map((day, index) => {
          const isOpen = open.has(day.id)

          return (
            <div className={`day${isOpen ? '' : ' closed'}`} key={day.id} {...drag.rowProps(index)}>
              <div
                className="day-head"
                role="button"
                tabIndex={0}
                onClick={() => toggle(day.id)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  toggle(day.id)
                }}
              >
                <span className="grip" {...drag.handleProps(index)}>
                  ⠿
                </span>
                <span className="dnum">{index + 1}</span>
                <span className="dt">{day.title || 'Untitled day'}</span>
                <span className="muted">{summary(day)}</span>
                {day.dayTag && <span className="badge b-draft">{day.dayTag}</span>}
                <span className="toggle-ico">{isOpen ? '▾' : '▸'}</span>
              </div>

              {isOpen && (
                <div className="day-body">
                  <div className="row2">
                    <div className="field">
                      <label>Day Title</label>
                      <input
                        className="inp"
                        value={day.title}
                        onChange={(e) => update(index, { title: e.target.value })}
                        disabled={disabled}
                      />
                    </div>
                    <div className="field">
                      <label>Overnight Stay</label>
                      <select
                        className="sel"
                        value={day.overnightStayId ?? ''}
                        onChange={(e) => update(index, { overnightStayId: e.target.value || null })}
                        disabled={disabled}
                      >
                        {/* Aakhri din (departure) pe koi stay nahi hoti — wo ek valid state hai */}
                        <option value="">No overnight stay</option>
                        {destinations.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label>Description</label>
                    <textarea
                      className="ta"
                      value={day.description}
                      onChange={(e) => update(index, { description: e.target.value })}
                      disabled={disabled}
                    />
                    {/*
                     * Hint yahan zaroori hai, sajawat nahi: `-` wala niyam dekh kar pata
                     * nahi chalta. Pehle bullets ka apna field tha (`highlights[]`); ab wo
                     * isi textarea me hain (D-64).
                     */}
                    <div className="hint">
                      <code>-</code> se shuru hone wali line page pe bullet banti hai; baaki
                      paragraph
                    </div>
                  </div>

                  <div className="row3">
                    <div className="field">
                      <label>Meals</label>
                      {MEALS.map((meal) => (
                        <label className="inline-lbl" key={meal}>
                          <input
                            type="checkbox"
                            checked={day.meals.includes(meal)}
                            onChange={(e) =>
                              update(index, {
                                meals: e.target.checked
                                  ? [...day.meals, meal]
                                  : day.meals.filter((m) => m !== meal),
                              })
                            }
                            disabled={disabled}
                          />{' '}
                          {MEAL_LABEL[meal]}
                        </label>
                      ))}
                    </div>

                    <div className="field">
                      <label>Transfer</label>
                      <select
                        className="sel"
                        value={day.transferId ?? ''}
                        onChange={(e) => update(index, { transferId: e.target.value || null })}
                        disabled={disabled}
                      >
                        <option value="">None</option>
                        {transfers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row3">
                    <div className="field">
                      <label>Transfer duration</label>
                      <input
                        className="inp"
                        placeholder="90 min"
                        value={day.transferNote}
                        onChange={(e) => update(index, { transferNote: e.target.value })}
                        disabled={disabled}
                      />
                      <div className="hint">Har din alag hoti hai — isliye din pe hai</div>
                    </div>
                    <div className="field">
                      <label>Day tag</label>
                      <input
                        className="inp"
                        placeholder="Arrival day"
                        value={day.dayTag}
                        onChange={(e) => update(index, { dayTag: e.target.value })}
                        disabled={disabled}
                      />
                    </div>
                    <div className="field">
                      <label>Note</label>
                      <input
                        className="inp"
                        placeholder="Approx. 4 hrs sightseeing"
                        value={day.note}
                        onChange={(e) => update(index, { note: e.target.value })}
                        disabled={disabled}
                      />
                      <div className="hint">Khaali chhodo to chip dikhti hi nahi</div>
                    </div>
                  </div>

                  {!disabled && (
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      onClick={() => {
                        if (!confirmRemove(`Day ${index + 1}`)) return
                        onChange(days.filter((_, i) => i !== index))
                      }}
                    >
                      Remove Day
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!disabled && (
          <div className="itin-actions">
            <button className="btn" type="button" onClick={addDay}>
              ＋ Add Day
            </button>
            <button
              className="btn"
              type="button"
              onClick={duplicateLast}
              disabled={days.length === 0}
            >
              ⧉ Duplicate Last Day
            </button>
          </div>
        )}

        {strip.length > 0 && (
          <div className="route-strip">
            <label>Route strip</label>
            <div className="hint">
              Ye apne aap banti hai — lagatar din jinka Overnight Stay same hai, wo ek card me judte
              hain.
            </div>
            <div className="chips">
              {strip.map((leg, i) => (
                <span className="chip" key={`${leg.stayId}-${leg.from}-${i}`}>
                  {leg.nights === 1 ? `Night ${leg.from}` : `Nights ${leg.from}–${leg.to}`}
                  {' · '}
                  {nameOf(destinations, leg.stayId) ?? 'Unknown'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
