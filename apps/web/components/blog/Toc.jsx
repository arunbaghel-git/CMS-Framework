'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * `On this post` / `On this page` — reference ka `.toc` (spec 008, D-95).
 *
 * ⚠️ **Ye ek sidebar widget NAHI hai.** Post pe wo `blogSettings.showToc` ke ek checkbox pe hai,
 * page pe page ke apne checkbox pe (client, 14 Sep). Dono jagah list content ke apne `<h2>` se
 * banti hai. Widget banane ka matlab hota **do control** — checkbox aur "list me hona" — aur do
 * me se ek hi yaad rehta (wahi tark jise D-88 ne `talkToPlanner` pe likha tha).
 *
 * ⚠️ **Dono shart server pe lag chuki hain** — checkbox off ho ya 3 se kam heading hon, dono
 * soorat me `toc` **khaali** aata hai. Isliye yahan sirf lambai dekhi jaati hai: theme ko koi
 * niyam yaad nahi rakhna, aur wo niyam do jagah alag nahi ho sakta (D-65 wala hi tark).
 *
 * ⚠️ Heading ke `id` bhi server pe lagte hain (`withToc()`), usi ek pass me jisme ye list bani.
 *
 * ⚠️ 14 Sep ko `PostPage.jsx` se bahar aaya — page ko bhi yahi chahiye tha, aur doosri copy ka
 * matlab hota ki ek din post ki TOC badle aur page ki nahi.
 *
 * ## Jo section padha ja raha hai uska link `.on` (client, 14 Sep)
 *
 * `.toc li a.on` ki CSS (orange patti) pehle se thi, par **`.on` lagane wala koi nahi tha** — reference
 * (`page-template-text.html` · `blog-detail-v1.html`) me ye ek chhota script karta hai. Yahan wahi
 * `IntersectionObserver`, **wahi `rootMargin`** (`-110px 0px -72% 0px`): heading jab screen ke upar
 * wale ~28% hisse me aati hai, wahi section "current" hai. Scroll listener nahi — observer sirf tab
 * jaagta hai jab koi heading us patti ko paar kare.
 *
 * ⚠️ Isi wajah se ye component **client** hai. List ka markup waisa hi hai jo server banata tha, to
 * JS aane se pehle bhi links chalte hain — sirf rang JS ke baad lagta hai.
 */
export default function Toc({ items = [], label = 'On this post', variant = 'side' }) {
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === 'undefined') return undefined

    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean)
    if (!headings.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-110px 0px -72% 0px', threshold: 0 },
    )

    for (const heading of headings) observer.observe(heading)

    return () => observer.disconnect()
  }, [items])

  const barRef = useRef(null)

  if (!items.length) return null

  const icon = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  )

  const list = (
    <ul className="toc">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={active === item.id ? 'on' : undefined}
            /* Patti me link chunne pe wo band ho jaaye — warna poori list heading ke upar khuli rehti hai. */
            onClick={variant === 'bar' ? () => barRef.current?.removeAttribute('open') : undefined}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  )

  /**
   * ## `bar` — 1024px tak, hero ke theek baad, **band** (client, 23 Sep)
   *
   * _"side tab mobile par sabse upar with default close so user can click and scroll"_. 1024px se
   * neeche sidebar article ke **neeche** chali jaati hai, yaani TOC wahan pahunchti thi jahan uski
   * zaroorat khatam ho chuki hoti. Ab wahan article ke upar ek band patti hai; sidebar wala TOC us
   * width pe CSS se chhupta hai (`.wdg--toc`).
   *
   * ⚠️ **Native `<details>`** — khulna/band hona bina JS ke chalta hai, keyboard aur screen reader
   * dono ke saath. JS sirf link chunne pe band karne ke liye hai.
   *
   * ⚠️ Do copy DOM me hain (ek patti, ek sidebar) — CSS ek hi dikhati hai. Isse chhota koi raasta
   * nahi: sidebar grid ka alag column hai aur `order` se wo article ke upar nahi aa sakta.
   */
  if (variant === 'bar') {
    return (
      <details className="tocm" ref={barRef}>
        <summary className="tocm__h">
          {icon}
          {label}
        </summary>
        <div className="tocm__b">{list}</div>
      </details>
    )
  }

  return (
    <div className="wdg wdg--toc">
      <div className="wdg__h">
        {icon}
        {label}
      </div>
      <div className="wdg__b">{list}</div>
    </div>
  )
}
