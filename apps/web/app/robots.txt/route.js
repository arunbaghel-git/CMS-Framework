import { getSeoSettings } from '../../lib/cms.js'
import { robotsTxt } from '../../lib/seo.js'

/**
 * `/robots.txt` — `Settings ▸ SEO & Schema` ka textarea (client, 24 Sep). Pehle ye 404 tha.
 *
 * Next ka `app/robots.js` jaan-boojh kar **nahi** — wo rules ka object maangta hai, jabki client
 * poora text khud likhta hai. Route handler text waisa ka waisa bhejta hai.
 *
 * Cache: wahi `settings` tag wala fetch — admin me Save karte hi saaf (D-14).
 */
export async function GET() {
  const text = robotsTxt(await getSeoSettings())

  // API na mile to 503 — `Disallow` nahi (poora tark `robotsTxt()` pe)
  if (text === null) {
    return new Response('Service unavailable\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '300' },
    })
  }

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
