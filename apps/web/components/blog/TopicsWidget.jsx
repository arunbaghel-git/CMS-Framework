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
          {/*
           * `All` sirf filter wale roop me — bina filter ke wo ek aisa row hota jo kuch
           * batata bhi nahi aur karta bhi nahi.
           */}
          {filter && (
            <li>
              <button
                type="button"
                className={filter.topic === 'all' ? 'on' : ''}
                onClick={() => filter.setTopic('all')}
              >
                All topics
                {/*
                 * ⚠️ **Yahan ginti jaan-boojh kar nahi hai.** Neeche ke numbers **poore blog**
                 * ke hain, aur grid ki ginti (`9 articles`) us page pe dikh rahe set ki — usme
                 * featured teen nahi hote. Dono sach hain, par `All topics` pe unka jod likhne
                 * ka matlab hota do jagah do alag "total" — aur client theek wahi poochhta jo
                 * D-86 me baar-baar poochha gaya.
                 *
                 * Reference me ye row hai hi nahi (wahan rows link hain, filter nahi). Ye sirf
                 * filter hataane ka raasta hai, aur uske liye number ki zaroorat nahi.
                 */}
              </button>
            </li>
          )}

          {topics.map((topic) => (
            <li key={topic.id}>
              {filter ? (
                <button
                  type="button"
                  className={filter.topic === topic.id ? 'on' : ''}
                  onClick={() => {
                    filter.setTopic(topic.id)

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
