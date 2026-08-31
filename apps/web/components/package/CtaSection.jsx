/**
 * Page ka aakhri CTA card — `itinerary-v3.html` ka `.offer` (D-67).
 *
 * **Poori tarah static** — saara text `settings.ctaSection` se aata hai aur kuch bhi
 * package se derive nahi hota. Design me box ka daam aur category `js-px`/`js-cat-name`
 * se aate the; client ne wo raasta band kiya kyunki ye card doosre pages pe bhi jaayega
 * jahan koi package hai hi nahi.
 *
 * ## Yahan koi fallback text nahi hai
 *
 * Har hissa apne data ke hone pe hi banta hai — badge, heading, bullets, box aur buttons
 * sab alag-alag. Section khud tab render hota hai jab admin ne use **on** kiya ho; API off
 * hone pe `ctaSection: null` bhejti hai, isliye yahan `if (!cta)` hi kaafi hai.
 *
 * Button bhi API chhaanti hai (label + URL dono chahiye) — yaani jab tak enquiry form nahi
 * bana aur uska URL khaali hai, wo button yahan aata hi nahi (D-30, Q-2).
 */
export default function CtaSection({ cta }) {
  if (!cta) return null

  const { badge, heading, bullets = [], boxTitle, boxNote, buttons = [] } = cta

  /** Card me kuch bhi na ho to poora section chhod do — khaali gradient patti bemaani hai. */
  if (!badge && !heading && bullets.length === 0 && !boxTitle && buttons.length === 0) return null

  /*
   * Reference me ye `.sec.sec--white > .wrap` me baithta hai. Hamare theme me `.sec` hai
   * hi nahi — page ke baaki sections seedhe `.wrap` use karte hain (`.wrap.pgl`,
   * `.wrap.pkg__gal`), isliye wahi pattern yahan bhi. Ek nayi `.sec` class banane ka
   * matlab hota ek aur spacing system, jiska doosra koi user nahi.
   */
  return (
    <section className="wrap pkg__cta">
      <div className="offer">
        <div className="offer__in">
          <div>
            {badge && (
              <span className="offer__live">
                <span className="dotp" />
                {badge}
              </span>
            )}

            {heading && <h2>{heading}</h2>}

            {bullets.length > 0 && (
              <ul>
                {bullets.map((line, i) => (
                  <li key={i}>
                    {/*
                     * Tick ka SVG — reference se hi. Icon `aria-hidden` hai: list ka
                     * matlab `<ul>`/`<li>` se pehle hi aa jaata hai, aur har row pe
                     * screen reader ka "check mark" bolna sirf shor hai.
                     */}
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/*
           * Box tabhi banta hai jab uska bada text ho. Sirf `boxNote` ya sirf buttons
           * ke saath wo ek adhoora dabba dikhta — aur design me wo hamesha bhara hua hai.
           */}
          {boxTitle && (
            <div className="offer__box">
              <b>{boxTitle}</b>
              {boxNote && <span>{boxNote}</span>}

              {buttons.map((button, i) => (
                <a
                  key={i}
                  className={`btn btn--${button.variant}`}
                  href={button.url}
                  target={button.target}
                  rel={button.target === '_blank' ? 'noopener noreferrer' : undefined}
                >
                  {button.label}
                </a>
              ))}
            </div>
          )}

          {/*
           * Box na ho par buttons hon to wo bina thikane ke reh jaate — isliye unka
           * apna row. Ye case client ke chalane se hi banega (box khaali chhod dein),
           * par tab bhi card poora dikhna chahiye.
           */}
          {!boxTitle && buttons.length > 0 && (
            <div className="offer__btns">
              {buttons.map((button, i) => (
                <a
                  key={i}
                  className={`btn btn--${button.variant}`}
                  href={button.url}
                  target={button.target}
                  rel={button.target === '_blank' ? 'noopener noreferrer' : undefined}
                >
                  {button.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
