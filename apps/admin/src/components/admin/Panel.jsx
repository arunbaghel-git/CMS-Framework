import { useState } from 'react'

/**
 * Collapsible panel — `admin-design.html` ka `.panel` + `.toggle-ico`.
 *
 * Design me har sidebar panel ke head me `▾` hai aur wo band/khula hota hai (40 jagah).
 * Wo pehle chhoot gaya tha; ye us gap ko bharta hai.
 *
 * **Kyun zaroori hai:** package editor ke sidebar me chhe panel hain aur unme se do
 * (Destinations, Package Type) lambi checklists hain. Sab ek saath khule rehne ka matlab
 * hai ki SEO tak pahunchne ke liye do screen scroll karna pade.
 *
 * ## State component ke andar hai, bahar nahi
 *
 * Kaunsa panel khula hai — ye **UI ki state** hai, form ki nahi. Use bahar uthane ka matlab
 * hota ki har parent use apne state me rakhe aur save/reload pe wo kahin galat jagah reset
 * ho. Yahan wo panel ke saath rehta hai aur uske saath hi khatam ho jaata hai.
 *
 * ## `dragHandle` — kram badalne ka grip
 *
 * Head pe pehle se ek `onClick` hai (collapse). Grip usi head me baithta hai, isliye uske
 * apne handlers me `stopPropagation` zaroori hai — warna har drag ke baad panel band ya
 * khul jaata, aur wo bilkul galti jaisa lagta.
 *
 * @param {string} title
 * @param {React.ReactNode} [aside] head ke daayin taraf chhoti line — jaise "7 days"
 * @param {React.ReactNode} [footer] panel band hone pe bhi dikhta rehta hai
 * @param {boolean} [defaultOpen]
 * @param {object} [dragHandle] `useListDrag().handleProps(i)` — de do to head me grip aa jaata hai
 */
export default function Panel({
  title,
  aside,
  footer,
  defaultOpen = true,
  className = '',
  dragHandle,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`panel${open ? '' : ' panel--closed'} ${className}`.trim()}>
      <div
        className="panel-head"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          setOpen((v) => !v)
        }}
      >
        {dragHandle && (
          <span
            className="grip"
            {...dragHandle}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              dragHandle.onKeyDown?.(e)
            }}
          >
            ⠿
          </span>
        )}
        <h2>{title}</h2>
        {aside}
        <span className="toggle-ico">{open ? '▾' : '▸'}</span>
      </div>

      {/*
       * Band hone pe body **render hi nahi hoti**, `display: none` se nahi chhupti.
       *
       * Chhupi hui body ke inputs form me rehte hain aur tab bhi focusable hote hain —
       * keyboard se tab karte hue user ek aise field pe pahunch jaata hai jo dikh hi nahi
       * raha. Aur lambi checklists ka DOM bina wajah bana rehta hai.
       */}
      {open && children}

      {/*
       * `footer` collapse ke bahar hai — Publish panel ka "Update" button isi me jaata hai.
       *
       * Design me Publish pe bhi toggle hai, par uske andar Save ka button hai: collapse
       * karne pe wo gayab ho jaata aur user ko lagta ki kaam save karne ka raasta hi nahi
       * bacha. Ek panel band karna Save chhupane ki keemat pe nahi hona chahiye.
       */}
      {footer}
    </div>
  )
}
