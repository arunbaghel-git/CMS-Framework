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
 */
export default function Toc({ items = [], label = 'On this post' }) {
  if (!items.length) return null

  return (
    <div className="wdg">
      <div className="wdg__h">
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
        {label}
      </div>
      <div className="wdg__b">
        <ul className="toc">
          {items.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.text}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
