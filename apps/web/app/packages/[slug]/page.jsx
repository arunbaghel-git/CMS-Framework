import CatchAllPage, { generateMetadata as catchAllMetadata } from '../../[[...slug]]/page.jsx'

/**
 * `/packages/{slug}` — **har request pe naya**, cache se nahi (client, 24 Sep).
 *
 * Baaki saara site catch-all se **cache (ISR)** se aata hai. Package page ka hero har refresh pe
 * badalna chahiye (`lib/hero.js`, 26 Aug ka faisla), jo cached page me jam jaata. Next 15 me ek hi
 * cached route ke andar ek page ko per-request banana (`connection()`) `DYNAMIC_SERVER_USAGE` se
 * **500** deta hai — isliye ye alag route, sirf render ka tareeka badalne ke liye.
 *
 * ⚠️ **Ye koi hardcoded routing nahi hai (R10)** — page wahi `resolvePath()` puchhta hai aur wahi
 * render chalata hai jo catch-all; path ka jawab ab bhi `entries.path` se aata hai. Package URL
 * `/packages/{slug}` client ne tay kiya hai (D-97). Kabhi pattern badla to package pages catch-all
 * pe gir jaayenge — cache se, hero jam kar — par kuch tootega nahi.
 *
 * Data phir bhi cached fetch se aata hai (`lib/cms.js`), to per-request render sasta hai.
 */
export const dynamic = 'force-dynamic'

/** Catch-all `slug` ko array maangta hai — `['packages', 'discover-andaman']`. */
const asCatchAll = (params) => params.then(({ slug }) => ({ slug: ['packages', slug] }))

export function generateMetadata({ params }) {
  return catchAllMetadata({ params: asCatchAll(params) })
}

export default function PackageRoute({ params }) {
  return CatchAllPage({ params: asCatchAll(params) })
}
