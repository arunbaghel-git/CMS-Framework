import Img from '../Img.jsx'
import { categoryClass } from './PostCard.jsx'

/**
 * `Start here` — listing page ka featured hissa (`blog-v1.html`, spec 008 Slice D2).
 *
 * ## ⚠️ Ye alag file kyun hai, aur `.pgl` ke **bahar** kyun render hoti hai
 *
 * Reference me ye section **poori chaudai** pe hai, `.pgl` (main + sidebar) ke upar:
 *
 * ```
 * .wrap
 *   .sh + .feat        ← ye, poori chaudai
 *   .pgl
 *     .pgl__main       ← #latest, filter, grid, pager
 *     .pgl__side
 * ```
 *
 * Pehle maine poora `postList` ek hi component me rakha tha aur wo `.pgl__main` ke andar
 * girta tha — client ne 10 Sep ko pakda: _"Start here ka section upar hai, ye side me kyu aa
 * raha hai."_
 *
 * Ilaaj ek **lead slot** hai (`tour/Blocks.jsx` ka `LEADS` map): koi bhi block apna ek hissa
 * columns ke upar bhej sakta hai. `TourPage` me `type === 'postList'` likhna wahi hardcoding
 * hoti jise D-09 ne mana kiya tha — page ko ye pata nahi hona chahiye ki blog kya hai.
 *
 * ## Ye server component hai, `PostList` client
 *
 * Featured cards me kuch interactive hai hi nahi — na filter, na page. `'use client'` yahan
 * lagane ka matlab hota `Img` aur ye poora markup browser ko bhejna, bina kisi faayde ke.
 * Filter aur pager `PostList.jsx` me hain, aur wahi ek file client jaati hai.
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
 * ⚠️ **Ye `PostCard` (`.bp`) se poori tarah alag markup hai**, isliye alag component hai: usme
 * image card ke **upar** hoti hai, yahan wo background hai aur text uske upar, gradient ke saath.
 * Ek `variant` prop ke peeche do bilkul alag JSX rakhna `EnquiryForm` (D-87 §11) se **ulta**
 * case hota — wahan dono roop 90% ek jaise the.
 *
 * Bada card apna excerpt dikhata hai, chhote nahi — reference me bhi wahi hai.
 */
function FeaturedCard({ post, large }) {
  return (
    <a className={`fcard${large ? ' fcard--lg' : ' fcard--sm'}`} href={post.path}>
      {/*
       * ⚠️ `sizes` bade aur chhote card ke liye alag hai — bina iske browser dono ke liye ek hi
       * naap chunta hai aur chhote card pe 3x badi image utar leta hai (D-84).
       */}
      {post.banner && (
        <Img
          image={post.banner}
          alt={post.title}
          sizes={large ? '(max-width: 1024px) 100vw, 58vw' : '(max-width: 1024px) 100vw, 38vw'}
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

export default function PostListLead({ props = {}, data }) {
  const featured = data?.featured ?? []

  /** Ek bhi featured na chuna ho to poora section gayab — khaali dabba nahi banta (D-30). */
  if (!featured.length) return null

  /** Dono zaroori hain — aadha link ek aisa button hai jo click pe kuch nahi karta. */
  const hasLink = Boolean(props.linkLabel && props.linkUrl)

  return (
    <>
      <div className="sh">
        <div>
          <h2>{props.heading || 'Start here'}</h2>
          {props.subheading ? <p>{props.subheading}</p> : null}
        </div>

        {/*
         * ⚠️ Client ka apna link pehle; na ho to reference wala `#latest`, jo isi page pe neeche
         * le jaata hai — featured section ka poora point yahi hai.
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
  )
}
