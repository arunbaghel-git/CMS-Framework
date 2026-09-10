'use client'

import Icon from '../Icon.jsx'
import { useBlogFilter } from './BlogFilter.jsx'

/**
 * Sidebar ka `Topics` — categories aur unki ginti (spec 008).
 *
 * ## ⚠️ Ye ek hi widget hai jo **do jagah do tarah** chalta hai
 *
 * | Kahan | Rows kya hain | Kyun |
 * | --- | --- | --- |
 * | Listing page | **buttons** — grid ko filter karte hain | wahan ek list hai jise filter kiya ja sake |
 * | Post ka page | saada text | wahan filter karne ko kuch hai hi nahi |
 *
 * Faisla `useBlogFilter()` se hota hai: provider mile to filter maujood hai. Do alag widget
 * banane ka matlab hota client ko do naam dikhaana (`Topics` aur `Topics (list)`) aur ye yaad
 * rakhwana ki kaunsa kahan lagta hai.
 *
 * ⚠️ **Yahan `All` ka row nahi hai** — reference me bhi nahi hai (sirf chhe categories). Filter
 * hataane ka raasta `.bfilter` ki `All` pill hai, aur uske bina bhi kaam chalta hai: chuna hua
 * topic **dobara click** karne pe filter hat jaata hai.
 *
 * ⚠️ **Link kabhi nahi** — na yahan, na post page pe. Category ka apna URL hai hi nahi
 * (topic-wise page ek aur `blogPage` entry se banta hai), aur listing pe filter client-side
 * hai to navigation hota hi nahi. `href="#"` ek aisa link hota jo click pe kuch na kare —
 * aur wo us cheez se bura hai jo link lagti hi nahi (D-30).
 *
 * ## Ginti pills se alag hoti hai, aur wo galti nahi hai
 *
 * ⚠️ Yahan ki ginti **poore blog** ki hai (`data.topics`, server se), aur `.bfilter` ki ginti
 * us page pe dikh rahe set ki. Reference me bhi wahi hai — sidebar `9 · 6 · 11 · 8 · 5 · 4`
 * (43) jabki grid pe `9 articles`. Dono ko ek number pe zabardasti laana design ko todta.
 */
export default function TopicsWidget({ props }) {
  const filter = useBlogFilter()
  const topics = props.topics ?? []

  return (
    <div className="wdg">
      {props.heading ? (
        <div className="wdg__h">
          <Icon name={props.icon} size={14} strokeWidth={2.4} />
          {props.heading}
        </div>
      ) : null}

      <div className="wdg__b">
        <ul className="cats">
          {topics.map((topic) => (
            <li key={topic.id}>
              {filter ? (
                <button
                  type="button"
                  className={filter.topic === topic.id ? 'on' : ''}
                  onClick={() => {
                    /**
                     * ⚠️ **Chuna hua dobara click = filter hat gaya.**
                     *
                     * Reference me sidebar me koi `All` row hai hi nahi (sirf chhe categories),
                     * aur maine ek jodi thi — client ne pakda: _"ye to categories hai na."_ Wo
                     * theek tha: `All topics` koi topic nahi, ek control hai, aur uspe ginti bhi
                     * nahi banti.
                     *
                     * Par ek asli case bacha tha: client `Show the filter pills` off kar de to
                     * sidebar hi ekmatra control hota, aur bina `All` ke user topic chun kar
                     * **phans** jaata. Toggle usi ka ilaaj hai — aur wahi pattern
                     * `PackageListBlock` ke page filter pe pehle se hai (_"chuna hua dobara
                     * click karne pe `none` pe wapas"_).
                     */
                    filter.setTopic(filter.topic === topic.id ? 'all' : topic.id)

                    /**
                     * ⚠️ Grid neeche/doosri column me hai — sidebar se topic chunne pe agar
                     * page waheen khada rahe to client ko lagta hai kuch hua hi nahi. `#latest`
                     * wahi anchor hai jispe `All articles` bhi le jaata hai.
                     */
                    document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  {topic.name}
                  <span>{topic.count}</span>
                </button>
              ) : (
                <span>
                  {topic.name}
                  <span>{topic.count}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
