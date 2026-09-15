import { Fragment } from 'react'

import { badgeStyle } from '../../lib/badge.js'
import Img from '../Img.jsx'

/**
 * Ek post ka listing card — reference ka `.bp` (spec 008, Slice D).
 *
 * ⚠️ **Ek hi jagah, teen istemaal:** `Related reading`, listing page ki grid, aur (Slice D2 me)
 * `Post list` block. `PackageCard.jsx` isi wajah se bana tha — do copies ka nateeja is repo me
 * do baar ho chuka hai: `bestFor` similar cards pe **chhoot gaya tha**, aur `Similar` har card pe
 * ek hi global rating dikhata tha jabki D-87 §3 ke baad har card apni le kar aata hai.
 *
 * ⚠️ **Author card pe nahi hai, aur wo jaan-boojh kar hai.** Reference ke `.bp__f` me wo dikhta
 * hai, par wo har post pe **wahi ek naam** hai (`blogSettings.author`) — use 60 cards ke payload
 * me dohraana fizool hai. Isliye wo `settings` se aata hai aur `author` prop se yahan pahunchta
 * hai. Ek hi cheez do jagah store karne se wo ek din alag ho jaati (D-86).
 */

/** `2026-08-12` → `12 Aug 2026`. Site ka locale abhi `en-IN` hai (package page se hi). */
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

/**
 * Category badge ka rang — reference me chaar variant hain (`bcat--b`/`--g`/`--d` aur plain).
 *
 * ⚠️ **Rang payload me nahi aata, yahan derive hota hai** — aur wo ek faisla hai. Taxonomy pe
 * `color` ka field banane ka matlab hota client se ek aisa chunav maangna jo uska hai hi nahi
 * (wahi tark jis pe `showBadges` aur `emitSchema` hate the, 8 Sep).
 *
 * Id se derive karne se ek category ka rang **har jagah wahi** rehta hai — listing pe, related
 * pe, detail ke hero pe. Random hota to wo har render pe badalta.
 */
const CAT_VARIANTS = ['', ' bcat--b', ' bcat--g', ' bcat--d']

export function categoryClass(id) {
  const key = String(id ?? '')
  let sum = 0
  for (let i = 0; i < key.length; i += 1) sum = (sum + key.charCodeAt(i)) % 997

  return `bcat${CAT_VARIANTS[sum % CAT_VARIANTS.length]}`
}

/**
 * Badge ka inline rang — sirf tab jab category ka apna rang chuna gaya ho (client, 11 Sep, D-93).
 * Khaali pe `undefined`, yaani class wala rang (`categoryClass()`) hi chalta hai. Hisaab (padhne laayak
 * text) `lib/badge.js` me — Package Type ka badge bhi wahi use karta hai (D-96 §20).
 */
export function categoryStyle(category) {
  return badgeStyle(category?.color)
}

/**
 * Post ki **saari** categories ke badge (client, 11 Sep: _"Saari categories"_, D-93).
 *
 * `.bcats` ek wrapper hai jo image ke upar badge ki jagah leta hai — pehle wahan ek hi `.bcat`
 * baithta tha, aur do-teen badge ek doosre ke upar chad jaate.
 */
export function CategoryBadges({ categories = [] }) {
  if (!categories.length) return null

  return (
    <span className="bcats">
      {categories.map((category) => (
        <span
          key={category.id}
          className={categoryClass(category.id)}
          style={categoryStyle(category)}
        >
          {category.name}
        </span>
      ))}
    </span>
  )
}

export default function PostCard({ post, author, showExcerpt = true }) {
  if (!post) return null

  const meta = [
    author,
    shortDate(post.publishedAt),
    post.readMinutes ? `${post.readMinutes} min read` : null,
  ]

  return (
    <a className="bp" href={post.path}>
      {/*
       * ⚠️ Banner na ho to `.bp__m` **poora** gir jaata hai, khaali dabba nahi banta.
       * `toDisplayImage()` resolve na hone pe `null` deti hai (D-42 §2 ka invariant), isliye
       * yahan koi toota `<img>` pahunch hi nahi sakta.
       */}
      {post.banner && (
        <div className="bp__m">
          {/*
           * Card ka thumbnail — `sizes` isliye zaroori hai ki browser `srcset` me se sahi
           * chunav kar sake (D-84). Grid do column ka hai, mobile pe ek.
           */}
          <Img image={post.banner} alt={post.title} sizes="(max-width: 860px) 100vw, 50vw" />
          <CategoryBadges categories={post.categories} />
        </div>
      )}

      <div className="bp__b">
        <h3>{post.title}</h3>

        {/* Related reading me reference sirf title + meta dikhata hai, excerpt nahi. */}
        {showExcerpt && post.excerpt ? <p className="bp__x">{post.excerpt}</p> : null}

        {/*
         * `.bp__f` — author · date · read time. `<i>` ek separator dot hai, text nahi.
         *
         * Jo tukda na ho wo gir jaata hai aur uske saath uska dot bhi — "Unknown" ya khaali
         * dot dono tooti hui cheez jaise dikhte hain (D-30).
         */}
        <div className="bp__f">
          {meta.filter(Boolean).map((part, i) => (
            <Fragment key={i}>
              {i > 0 && <i />}
              {/* Reference me sirf author bold hai — `<b>…</b><i></i>22 Jul 2026<i></i>8 min read` */}
              {part === author ? <b>{part}</b> : part}
            </Fragment>
          ))}
        </div>
      </div>
    </a>
  )
}
