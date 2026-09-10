'use client'

import { useMemo, useState } from 'react'

import Img from '../Img.jsx'
import PostCard, { categoryClass } from './PostCard.jsx'

/**
 * `Post list` block — blog ka poora listing page (`blog-v1.html`, spec 008 Slice D2).
 *
 * ```
 * .sh            Start here + `All articles` link
 * .feat          ek bada card + do chhote
 * #latest
 *   .sh          Latest articles + uski line
 *   .bfilter     Topic ki pills + `9 articles`
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

/** `2026-08-12` → `12 Aug 2026`. */
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

const Arrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/**
 * `Start here` ka card — reference ka `.fcard`.
 *
 * ⚠️ **Ye `PostCard` (`.bp`) se poori tarah alag markup hai**, isliye alag component hai: usme
 * image card ke **upar** hoti hai, yahan wo background hai aur text uske upar. Ek hi component
 * me dono karne ka matlab hota do bilkul alag JSX ek `variant` prop ke peeche — aur wo
 * `EnquiryForm` (D-87 §11) se ulta case hai, jahan dono roop 90% ek jaise the.
 *
 * Bada card apna excerpt dikhata hai, chhote nahi — reference me bhi wahi hai.
 */
function FeaturedCard({ post, large }) {
  return (
    <a className={`fcard${large ? ' fcard--lg' : ' fcard--sm'}`} href={post.path}>
      {/*
       * ⚠️ `sizes` bada aur chhota card ke liye alag hai — bina iske browser dono ke liye ek hi
       * naap chunta hai aur chhote card pe 3x badi image utar leta hai (D-84).
       */}
      {post.banner && (
        <Img
          image={post.banner}
          alt={post.title}
          sizes={large ? '(max-width: 1024px) 100vw, 45vw' : '(max-width: 1024px) 100vw, 30vw'}
        />
      )}

      <div className="fcard__b">
        {post.category && (
          <span className={categoryClass(post.category.id)}>{post.category.name}</span>
        )}
        <h3>{post.title}</h3>

        {large && post.excerpt ? <p>{post.excerpt}</p> : null}

        <div className="fcard__m">
          {shortDate(post.publishedAt)}
          {post.readMinutes ? (
            <>
              <i />
              {post.readMinutes} min read
            </>
          ) : null}
        </div>
      </div>
    </a>
  )
}

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
  const { featured = [], cards = [], facets = [], author = '', capped = false } = data ?? {}

  const [topic, setTopic] = useState('all')
  const [page, setPage] = useState(1)

  const perPage = props.perPage ?? 9

  /** Filter aur page dono yahan tay hote hain — ek hi jagah, taaki wo kabhi alag na ho jaayein. */
  const filtered = useMemo(
    () => (topic === 'all' ? cards : cards.filter((c) => c.category?.id === topic)),
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

  const pick = (next) => {
    setTopic(next)
    setPage(1)
  }

  /** Dono zaroori hain — aadha link ek aisa button hai jo click pe kuch nahi karta (D-30). */
  const hasLink = Boolean(props.linkLabel && props.linkUrl)

  return (
    <>
      {featured.length > 0 && (
        <>
          <div className="sh">
            <div>
              <h2>{props.heading || 'Start here'}</h2>
              {props.subheading ? <p>{props.subheading}</p> : null}
            </div>

            {/*
             * ⚠️ Client ka apna link pehle; na ho to reference wala `#latest` — wo isi page pe
             * neeche le jaata hai, aur featured section ka poora point yahi hai.
             */}
            <a className="viewall" href={hasLink ? props.linkUrl : '#latest'}>
              {hasLink ? props.linkLabel : 'All articles'}
              <Arrow />
            </a>
          </div>

          <div className="feat">
            {/* Pehla bada — kram client ka hai (`featuredIds`), `publishAt` ka nahi. */}
            <FeaturedCard post={featured[0]} large />

            {featured.length > 1 && (
              <div className="feat__side">
                {featured.slice(1).map((post) => (
                  <FeaturedCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

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

            <span className="bfilter__c">
              {filtered.length} article{filtered.length === 1 ? '' : 's'}
            </span>
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
