import { useState } from 'react'

/**
 * Chips input — field DSL ka `tags` type (D-50 §3).
 *
 * Design ke `#s-package-edit` wale "Travel Themes" panel se shape liya gaya hai
 * (`.chips` + `.chip` + uske andar `×`). Wo panel ab Package Type ban chuka hai aur
 * managed list se chalta hai (spec 007 §1.2), par **chips ka look wahin se aaya hai** —
 * isliye "Best for" bhi bilkul waisa hi dikhta hai.
 *
 * Enter ya comma se chip banti hai. Comma isliye ki client ki aadat `Couples, Families`
 * ek saath type karne ki hoti hai, aur us case me Enter ka intezaar karna use lagta hai
 * ki field kaam hi nahi kar raha.
 */
export default function TagsInput({ label, hint, value, onChange, disabled }) {
  const [draft, setDraft] = useState('')

  function commit(raw) {
    const parts = String(raw)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    if (parts.length === 0) return

    // Duplicate chip banne ka koi matlab nahi — wo do baar chhapti bhi hai
    const next = [...value]
    for (const part of parts) if (!next.includes(part)) next.push(part)

    onChange(next)
    setDraft('')
  }

  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="inp"
        placeholder={hint}
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value
          if (raw.includes(',')) commit(raw)
          else setDraft(raw)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          }
          /**
           * Khaali input pe Backspace aakhri chip hataata hai — yahi wo chhoti aadat hai
           * jo har chips input me expect ki jaati hai.
           */
          if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        /** Focus hatte hi jo type kiya tha wo kho na jaaye — wo sabse aam shikayat hai. */
        onBlur={() => commit(draft)}
      />

      {value.length > 0 && (
        <div className="chips">
          {value.map((tag) => (
            <span className="chip" key={tag}>
              {tag}
              {!disabled && (
                <b
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${tag}`}
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    onChange(value.filter((t) => t !== tag))
                  }}
                >
                  ×
                </b>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
