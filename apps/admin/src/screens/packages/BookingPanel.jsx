import { useState } from 'react'

import { confirmRemove } from '../../lib/confirm.js'
import { useListDrag } from '../../lib/drag-list.js'

/**
 * "How booking works" ke steps + cancellation policy — `packageDefaults` (spec 007 §2.1).
 *
 * ⚠️ **Ye panel A-13 hai — ek gap jo 1 Sep tak khula tha.**
 *
 * Dono field poore raaste par pehle se maujood the: schema, model, service, public payload,
 * aur theme unhe render bhi karti thi ("Good to know" section me numbered cards aur uske
 * neeche cancellation ka paragraph). API ke test bhi the.
 *
 * **Bas ek screen nahi thi jahan se inhe bhara jaaye.** Nateeja live dikha: client ne
 * chaaron step aur poori cancellation policy `sectionLabels.booking.description` me type kar
 * di, kyunki unhe koi doosri jagah mili hi nahi. Wahan wo saade paragraph ban gaye — numbered
 * cards nahi.
 *
 * > **Sabak:** field ka poora raasta bana dena kaafi nahi hai. Jab tak use bharne ki jagah
 * > na ho, wo field khaali rehti hai — aur client wo content kahin aur, galat shakl me daal
 * > deta hai.
 *
 * Accordion aur drag wahi hain jo FAQs aur Itinerary Builder me hain — teenon ek hi shape ki
 * list hain, aur editor me teen alag tareeke seekhna nahi padna chahiye.
 */

/** Ek khaali step — `id` client-side, taaki reorder ke aar-paar stable rahe (D-43 §5). */
const blankStep = () => ({ id: crypto.randomUUID(), title: '', text: '' })

export default function BookingPanel({ steps, cancellationText, onChange, disabled }) {
  const list = steps ?? []
  const [open, setOpen] = useState(() => new Set())

  const toggle = (id) =>
    setOpen((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const setSteps = (next) => onChange({ bookingSteps: next, cancellationText })

  const update = (index, patch) =>
    setSteps(list.map((step, i) => (i === index ? { ...step, ...patch } : step)))

  function reorder(from, to) {
    if (to < 0 || to >= list.length || from === to) return

    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSteps(next)
  }

  const drag = useListDrag(reorder, !disabled)

  function addStep() {
    const step = blankStep()
    setSteps([...list, step])
    // Naya step khud khulta hai — warna user ko lagta hai ki click ne kuch kiya hi nahi
    setOpen((s) => new Set(s).add(step.id))
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h2>How booking works</h2>
          <span className="muted">
            {list.length} {list.length === 1 ? 'step' : 'steps'}
            {list.length > 1 && !disabled && ' · drag to reorder'}
          </span>
        </div>

        <div className="panel-body">
          {/*
           * Kram maayne rakhta hai — page pe ye ek numbered list (`ol.steps`) hai aur number
           * CSS counter se aata hai, data se nahi. Isliye yahan drag ka hona zaroori hai:
           * step 2 aur 3 badalne ka koi doosra raasta nahi.
           */}
          {list.length === 0 && <p className="muted">No steps yet. Add the first one below.</p>}

          {list.map((step, index) => {
            const isOpen = open.has(step.id)

            return (
              <div
                className={`day${isOpen ? '' : ' closed'}`}
                key={step.id}
                {...drag.rowProps(index)}
              >
                <div
                  className="day-head"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(step.id)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    toggle(step.id)
                  }}
                >
                  <span className="grip" {...drag.handleProps(index)}>
                    ⠿
                  </span>
                  <span className="dnum">{index + 1}</span>
                  <span className="dt">{step.title || 'Untitled step'}</span>
                  <span className="toggle-ico">{isOpen ? '▾' : '▸'}</span>
                </div>

                {isOpen && (
                  <div className="day-body">
                    <div className="field">
                      <label>Title</label>
                      <input
                        className="inp"
                        value={step.title}
                        placeholder="Tell us your dates"
                        onChange={(e) => update(index, { title: e.target.value })}
                        disabled={disabled}
                      />
                    </div>

                    <div className="field">
                      <label>Text</label>
                      <textarea
                        className="ta"
                        style={{ minHeight: 60 }}
                        value={step.text}
                        placeholder="Dates, nights and who is travelling. No payment, no account."
                        onChange={(e) => update(index, { text: e.target.value })}
                        disabled={disabled}
                      />
                    </div>

                    {!disabled && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          if (!confirmRemove(step.title || `Step ${index + 1}`)) return
                          setSteps(list.filter((_, i) => i !== index))
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!disabled && (
            <button type="button" className="btn btn-sm" onClick={addStep}>
              ＋ Add step
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Cancellation policy</h2>
        </div>
        <div className="panel-body">
          <div className="field">
            <textarea
              className="ta"
              style={{ minHeight: 90 }}
              value={cancellationText ?? ''}
              placeholder="Cancellations more than 30 days before travel are refunded minus…"
              onChange={(e) => onChange({ bookingSteps: list, cancellationText: e.target.value })}
              disabled={disabled}
            />
            {/*
             * Ye "Good to know" section ke **sabse neeche** chhapti hai, steps ke baad —
             * isliye panel bhi wahin hai. D-59 me FAQs se ise jaan-boojh kar alag rakha gaya
             * tha: policy har package pe same hoti hai, FAQ nahi.
             */}
            <div className="hint">
              Prints at the bottom of &ldquo;Good to know before you book&rdquo;, after the steps.
              Same on every package.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
