import { useState } from 'react'

import { confirmRemove } from '../../lib/confirm.js'
import { useListDrag } from '../../lib/drag-list.js'

/**
 * FAQs — `admin-design.html` ke "FAQs & Policies" panel se, spec 007 §2.
 *
 * **Design se ek farq, client ka faisla (27 Aug — D-59): sirf FAQs, policies nahi.**
 *
 * Design ke panel me do alag kism ka content mila hua tha. Uske do rows me se ek asli FAQ
 * thi ("Is the houseboat private or shared?") aur doosri **policy** ("What is the
 * cancellation policy?"). Policy har package pe **bilkul same** hoti hai, aur wo pehle se
 * `packageDefaults.cancellationText` me hai (§2.1) — usi lakeer par jo What's Included pe
 * hai (§1.5).
 *
 * Dono ko ek panel me rakhne ka matlab hota ki client cancellation policy 60 packages pe
 * dobara likhe, aur ek din wo alag-alag ho jaayein.
 *
 * Accordion aur drag wahi hai jo Itinerary Builder ka hai — dono ek hi shape ki list hain,
 * aur editor me do alag tareeke seekhna nahi padna chahiye.
 */

/** Ek khaali FAQ — `id` client-side banti hai taaki reorder ke aar-paar stable rahe. */
const blankFaq = () => ({ id: crypto.randomUUID(), question: '', answer: '' })

export default function FaqsPanel({ faqs, onChange, disabled }) {
  const list = faqs ?? []
  const [open, setOpen] = useState(() => new Set())

  const toggle = (id) =>
    setOpen((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const update = (index, patch) =>
    onChange(list.map((faq, i) => (i === index ? { ...faq, ...patch } : faq)))

  function reorder(from, to) {
    if (to < 0 || to >= list.length || from === to) return

    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const drag = useListDrag(reorder, !disabled)

  function addFaq() {
    const faq = blankFaq()
    onChange([...list, faq])
    // Naya sawaal khud khulta hai — warna user ko lagta hai ki click ne kuch kiya hi nahi
    setOpen((s) => new Set(s).add(faq.id))
  }

  return (
    <div className="panel-body">
      {list.length === 0 && <p className="muted">No FAQs yet. Add the first one below.</p>}

      {list.map((faq, index) => {
        const isOpen = open.has(faq.id)

        return (
          <div className={`day${isOpen ? '' : ' closed'}`} key={faq.id} {...drag.rowProps(index)}>
            <div
              className="day-head"
              role="button"
              tabIndex={0}
              onClick={() => toggle(faq.id)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                toggle(faq.id)
              }}
            >
              <span className="grip" {...drag.handleProps(index)}>
                ⠿
              </span>
              <span className="dt">{faq.question || 'Untitled question'}</span>
              <span className="toggle-ico">{isOpen ? '▾' : '▸'}</span>
            </div>

            {isOpen && (
              <div className="day-body">
                <div className="field">
                  <label>Question</label>
                  <input
                    className="inp"
                    value={faq.question}
                    placeholder="Which ferry class is included in this package?"
                    onChange={(e) => update(index, { question: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                <div className="field">
                  <label>Answer</label>
                  <textarea
                    className="ta"
                    style={{ minHeight: 60 }}
                    value={faq.answer}
                    onChange={(e) => update(index, { answer: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                {!disabled && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      if (!confirmRemove(faq.question || `FAQ ${index + 1}`)) return
                      onChange(list.filter((_, i) => i !== index))
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
        <button type="button" className="btn btn-sm" onClick={addFaq}>
          ＋ Add FAQ
        </button>
      )}
    </div>
  )
}
