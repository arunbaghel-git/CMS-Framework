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
/**
 * Ye section render hoga ya nahi — **ek hi jagah likha hua sawaal**.
 *
 * `PackagePage` ko iska jawab chahiye kyunki `.pkg` ki neeche wali padding is baat pe
 * badalti hai. Pehle wo baat CSS `.pkg:has(.pkg__cta)` se poochhta tha, aur wo page ka
 * sabse mehnga selector nikla (D-85): `.pkg` poore page ka `<main>` hai, to uske andar
 * kahin bhi DOM badalne pe browser ko poore document ki style dobara nikaalni padti thi.
 *
 * Ab dono taraf yahi function chalta hai. Do jagah alag-alag shart likhne ka matlab hota ki
 * kabhi ek badle aur doosri nahi — aur us din padding chup-chaap galat ho jaati.
 */
export function hasCtaSection(cta) {
  if (!cta) return false

  const { badge, heading, bullets = [], boxTitle, buttons = [] } = cta

  /** Card me kuch bhi na ho to poora section chhod do — khaali gradient patti bemaani hai. */
  return Boolean(badge || heading || bullets.length > 0 || boxTitle || buttons.length > 0)
}

export default function CtaSection({ cta }) {
  if (!hasCtaSection(cta)) return null

  const { badge, heading, bullets = [], boxTitle, boxNote, buttons = [] } = cta

  /*
   * Reference me ye `.sec.sec--white > .wrap` me baithta hai — yaani ek **poori chaudai ka
   * safed band**, aur uske andar content 1280px me.
   *
   * Wahi shakl yahan bhi hai, bas class ka naam apna (`.pkg__cta`): hamare theme me `.sec`
   * ka koi doosra user nahi hai, aur sirf iske liye ek poora spacing system banana bekaar
   * hota.
   *
   * ⚠️ Pehle `.wrap` **section pe hi** tha (`<section className="wrap pkg__cta">`) aur tab ye
   * band ban hi nahi paata: background bhi 1280px me sikud jaata tha, aur CTA ke dono taraf
   * page ka neela rang chalta rehta tha (client, 2 Sep).
   */
  return (
    <section className="pkg__cta">
      {/*
       * `.wrap` **andar** hai, section pe nahi — reference me bhi wahi hai
       * (`<section class="sec sec--white"><div class="wrap">`).
       *
       * Wajah: section ko poori chaudai ka hona chahiye taaki uska safed background page ke
       * kinare tak jaaye. `.wrap` section pe lagane se background bhi 1280px me sikud jaata
       * hai aur uske dono taraf page ka neela rang dikhta rehta hai.
       */}
      <div className="wrap">
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
      </div>
    </section>
  )
}
