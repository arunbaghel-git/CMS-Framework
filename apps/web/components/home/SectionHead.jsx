/**
 * Home ke section ka heading — reference ka `.sh` / `.sh--center` (D-96 §11–§12).
 *
 * Info cards aur FAQ dono ka ek hi dhaancha hai: heading, uske neeche line, aur **left** heading pe
 * daayein `View all →`. Pehle ye `InfoCards.jsx` ke andar tha (`.ic__sh`); FAQ aate hi alag nikla —
 * do copies ek din alag ho jaati hain (D-65/D-51/D-58).
 *
 * Font `.sh h2` / `.sh p` ke saath grouped hai (client: heading aur body font hamara).
 */
export default function SectionHead({
  heading,
  description,
  align = 'center',
  linkLabel,
  linkUrl,
}) {
  if (!heading && !description) return null

  const isLeft = align === 'left'

  return (
    <div className={`hsh${isLeft ? ' hsh--left' : ''}`}>
      <div>
        {heading ? <h2>{heading}</h2> : null}
        {/* Editor ki HTML, write pe saaf (R20). Naap div pe — `<p>` ho ya na ho (A-19). */}
        {description ? (
          <div className="hsh__d" dangerouslySetInnerHTML={{ __html: description }} />
        ) : null}
      </div>

      {/* `.viewall` — dono chahiye (D-30), aur sirf left heading pe (center me jagah nahi). */}
      {isLeft && linkLabel && linkUrl ? (
        <a className="hsh__all" href={linkUrl}>
          {linkLabel}
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
      ) : null}
    </div>
  )
}
