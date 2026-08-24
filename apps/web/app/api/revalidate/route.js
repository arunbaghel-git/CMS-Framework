import { revalidateTag } from 'next/cache'

/**
 * Revalidate webhook — D-14.
 *
 * API server yahan tags bhejta hai jab admin me kuch badalta hai. Ye ekmatra jagah hai
 * jahan se public site ka cache saaf hota hai.
 *
 * ⚠️ **Shared secret zaroori hai.** Iske bina ye ek public cache-purge endpoint hai, aur
 * koi bhi ise loop me maar kar site ko har request pe rebuild karwa sakta hai (D-14).
 *
 * `next.config.js` ka `/api/:path*` rewrite ise **nahi** chhoota: `rewrites()` array
 * `afterFiles` hai, aur Next filesystem routes pehle dekhta hai. Isliye `/api/revalidate`
 * yahin rukta hai aur baaki `/api/*` API server pe chala jaata hai.
 */
export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET

  // Config hi na ho to fail-closed — warna staging pe ye endpoint khula reh jaata hai
  if (!secret) {
    return Response.json({ error: 'Revalidation is not configured' }, { status: 503 })
  }

  if (request.headers.get('x-revalidate-secret') !== secret) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t) => typeof t === 'string') : []

  if (tags.length === 0) {
    return Response.json({ error: 'No tags supplied' }, { status: 400 })
  }

  for (const tag of tags) revalidateTag(tag)

  return Response.json({ revalidated: tags })
}
