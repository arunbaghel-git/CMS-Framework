'use client'

/**
 * Home ka FAQ accordion — **ek waqt me ek hi sawaal khula** (`home-nav-v3.html` ka `FAQ: one open at a
 * time` script, D-96 §12).
 *
 * `<details>` hi hai (D-59 — bina JS ke bhi khulta-band hota hai); JS sirf itna karta hai ki ek khule to
 * baaki band hon. JS na chale to sab kaam karta hai, bas kai ek saath khul sakte hain.
 *
 * ⚠️ Sirf home pe. Tour/Blog ka FAQ (`tour/Blocks.jsx`) waisa ka waisa — unke reference me ye script nahi.
 */
export default function FaqAccordion({ items }) {
  function onToggle(event) {
    const opened = event.currentTarget
    if (!opened.open) return

    opened.parentElement?.querySelectorAll('details[open]').forEach((other) => {
      if (other !== opened) other.open = false
    })
  }

  return (
    <div className="faq">
      {items.map((faq, i) => (
        /* Pehla khula — reference ka `<details open>` (package/tour pe bhi yahi). */
        <details key={faq.id ?? i} open={i === 0} onToggle={onToggle}>
          <summary>{faq.question}</summary>
          {/* Jawab admin ki HTML, write pe saaf (R20). Padding wrapper pe (`.faq details > div`). */}
          <div dangerouslySetInnerHTML={{ __html: faq.answer ?? '' }} />
        </details>
      ))}
    </div>
  )
}
