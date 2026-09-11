'use client'

import { useMemo, useState } from 'react'

import { useBlogFilter } from './BlogFilter.jsx'
import PostCard from './PostCard.jsx'

/**
 * `Post list` block — blog ka poora listing page (`blog-v1.html`, spec 008 Slice D2).
 *
 * ⚠️ **`Start here` ka hissa yahan NAHI hai** — wo `PostListLead.jsx` me hai aur `.pgl` ke
 * **bahar** render hota hai (client, 10 Sep). Poora tark wahin likha hai.
 *
 * ```
 * #latest
 *   .sh          Latest articles + uski line
 *   .bfilter     Topic ki pills (ginti `9 articles` 11 Sep ko hati — client, D-93)
 *   .bpg         cards ka grid
 *   .pager       page numbers
 * ```
 *
 * ## ⚠️ Ye `'use client'` hai, aur wo client ka faisla hai (9 Sep)
 *
 * Filter aur pagination **browser me** chalte hain: saare post ek hi baar payload me aate hain
 * aur `perPage` theme lagati hai. Server pe karne ka matlab hota har pill pe ek round trip aur
 * ek naya URL — aur us raaste pe pills aur sidebar ka `Topics` do alag state ban jaate.
 *
 * ⚠️ **Iski keemat `POST_LIST_CAP` hai** (`schemas/page.js`) — ek page pe 200 post tak. Us se
 * aage jaane pe URL wala raasta lena hoga. `data.capped` hume wo din bata dega.
 *
 * ⚠️ **`.feat` yahan `.pgl__main` ke andar hai, reference me wo poori chaudai pe hai.** Hamare
 * yahan har block `.pgl__main` me baithta hai (D-88 §9 — "admin jo dikhata hai, page wahi
 * deta hai"), aur ek block ko poori chaudai dene ka matlab hota page ka poora dhaancha
 * badalna. Grid `1.45fr 1fr` tang column me bhi theek baithti hai.
 */

const Arrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/**
 * Pager ke button — `1 2 3 … 7 Next`.
 *
 * ⚠️ Ye `<button>` hain, `<a>` nahi: filter client-side hai to page badalne se URL badalta hi
 * nahi. `<a href="#">` bana dena keyboard aur screen reader dono ke liye jhooth hota — wahi
 * lakeer jo `MobileBar` ke sar pe khinchi hai.
 */
function Pager({ page, pages, onGo }) {
  if (pages <= 1) return null

  /**
   * Kaunse number dikhein — pehla, aakhri, aur maujooda ke aas-paas ke. Beech me `…`.
   *
   * Bina iske 12 page wale blog pe bar apne aap me ek paragraph ban jaati hai.
   */
  const shown = new Set([1, pages, page, page - 1, page + 1].filter((n) => n >= 1 && n <= pages))
  const numbers = [...shown].sort((a, b) => a - b)

  return (
    <nav className="pager" aria-label="Pagination">
      {numbers.map((n, i) => (
        <span key={n} style={{ display: 'contents' }}>
          {i > 0 && numbers[i - 1] !== n - 1 && <span className="dots">…</span>}
          {n === page ? (
            <span className="on" aria-current="page">
              {n}
            </span>
          ) : (
            <button type="button" onClick={() => onGo(n)}>
              {n}
            </button>
          )}
        </span>
      ))}

      {page < pages && (
        <button type="button" onClick={() => onGo(page + 1)}>
          Next
          <Arrow />
        </button>
      )}
    </nav>
  )
}

export default function PostList({ props = {}, data }) {
  const { cards = [], facets = [], author = '', capped = false } = data ?? {}

  /**
   * ⚠️ **State provider me hai, yahan nahi** (spec 008) — usi state ko sidebar ka `Topics` bhi
   * padhta hai. Do `useState` rakhne ka matlab hota ki client sidebar se `Ferries` chune aur
   * yahan pill bar par abhi bhi `All` chamak raha ho. Poora tark `BlogFilter.jsx` me hai.
   *
   * ⚠️ Fallback isliye ki ye component bina provider ke bhi na toote — `BlocksScope` use
   * hamesha lapetta hai, par ek din koi `PostList` kahin aur render kare to wo chup-chaap
   * chalna chahiye, crash nahi.
   */
  const shared = useBlogFilter()
  const [localTopic, setLocalTopic] = useState('all')
  const [localPage, setLocalPage] = useState(1)

  const topic = shared ? shared.topic : localTopic
  const page = shared ? shared.page : localPage
  const setTopic = shared ? shared.setTopic : setLocalTopic
  const setPage = shared ? shared.setPage : setLocalPage

  const perPage = props.perPage ?? 9

  /** Filter aur page dono yahan tay hote hain — ek hi jagah, taaki wo kabhi alag na ho jaayein. */
  const filtered = useMemo(
    /** Post kai categories me ho sakta hai (D-93) — kisi bhi ek se mile to wo topic me hai. */
    () =>
      topic === 'all'
        ? cards
        : cards.filter((c) => (c.categories ?? []).some((category) => category.id === topic)),
    [cards, topic],
  )

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  /**
   * ⚠️ **`page` ko yahan clamp kiya jaata hai, `setTopic` me nahi.** Page 3 pe hote hue ek aisa
   * topic chunna jiske sirf 4 post hain — us haalat me grid khaali dikhti aur wo "filter kaam
   * nahi kar raha" jaisa lagta. Reset ko ek alag effect me karne ka matlab hota ek extra render
   * jisme khaali list dikh chuki hoti.
   */
  const current = Math.min(page, pages)
  const visible = filtered.slice((current - 1) * perPage, current * perPage)

  /** Provider ka `setTopic` page khud 1 pe le aata hai — wo jodi ek hi jagah rehni chahiye. */
  const pick = (next) => {
    setTopic(next)
    if (!shared) setLocalPage(1)
  }

  return (
    <>
      <div id="latest" style={{ scrollMarginTop: 96 }}>
        <div className="sh">
          <div>
            <h2>Latest articles</h2>
            <p>Filter by topic — everything here is written and updated by our own planners</p>
          </div>
        </div>

        {/*
         * ⚠️ **Bar tabhi jab client ne maangi ho AUR chunne ko kuch ho.** Ek hi topic wale blog
         * pe `All | Trip planning` do pills ek jhootha control hai — wahi galti jo 8 Sep ko
         * tour page pe pakdi gayi thi (`facets.length > 1` ki jagah `> 0` karna pada tha).
         */}
        {props.showFilter !== false && facets.length > 1 && (
          <div className="bfilter">
            <span className="bfilter__l">Topic</span>

            <button
              type="button"
              className={`dpill${topic === 'all' ? ' on' : ''}`}
              onClick={() => pick('all')}
            >
              All
            </button>

            {facets.map((facet) => (
              <button
                key={facet.id}
                type="button"
                className={`dpill${topic === facet.id ? ' on' : ''}`}
                onClick={() => pick(facet.id)}
              >
                {facet.name}
              </button>
            ))}

            {/*
             * `9 articles` ki ginti (`.bfilter__c`) **hata di gayi** — client, 11 Sep (D-93). Reference
             * me wo thi; client ne mana kiya.
             */}
          </div>
        )}

        <div className="bpg">
          {visible.map((post) => (
            <PostCard key={post.id} post={post} author={author} />
          ))}
        </div>

        {/*
         * Filter ke baad kuch na bache to wo saaf likha hona chahiye — khaali grid "toota hua"
         * dikhta hai (D-30). Aisa aam taur pe hota nahi (pills sirf un topics ki hain jinme post
         * hain), par featured nikal jaane ke baad ek topic khaali ho sakta hai.
         */}
        {visible.length === 0 && (
          <p className="muted" style={{ padding: '18px 0' }}>
            Nothing under this topic yet.
          </p>
        )}

        <Pager page={current} pages={pages} onGo={setPage} />

        {/*
         * ⚠️ **Ye chetavni sirf dev me dikhti hai, aur wo jaan-boojh kar hai.** `POST_LIST_CAP`
         * paar hone ka matlab hai ki listing ne chup-chaap post chhodne shuru kar diye — us din
         * URL wala pagination banana padega. Client ko dikhane ka koi faayda nahi (wo iska kuch
         * kar hi nahi sakta), par hume pata chalna chahiye.
         */}
        {capped && process.env.NODE_ENV !== 'production' && (
          <p className="muted" style={{ paddingTop: 12 }}>
            ⚠️ Post list cap reached — some posts are not on this page.
          </p>
        )}
      </div>
    </>
  )
}
