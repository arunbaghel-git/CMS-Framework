/**
 * Public API ki ek image ko `<img>` me badalta hai — **saare variants ke saath**.
 *
 * Aaj tak har `<img>` ek hi variant dikhata tha (zyadatar `medium`, 800px chaudi), chahe
 * uska slot phone pe 150px ka ho. Browser ke paas chunne ka koi tareeka nahi tha, jabki
 * chunna wahi sabse achha kar sakta hai: DPR, asli layout width aur network sirf usi ko
 * pata hote hain.
 *
 * `srcset` ab payload me hi ready aata hai (`toDisplayImage`) — theme use jodti nahi. `sizes`
 * yahan se nahi aata: wo **layout ki baat** hai, media ki nahi, aur har call site apna alag
 * deta hai.
 *
 * ## Teen cheezein jo ye component har jagah ek jaisi rakhta hai
 *
 * 1. **`width` aur `height` hamesha** — inke bina browser ko image ki jagah pata nahi hoti
 *    aur wo aane par page ko dhakel deti hai (CLS). Ye do attribute CSS ki `width: 100%`
 *    ko nahi kaat-te; wo sirf aspect ratio batate hain.
 * 2. **Image na ho to `<img>` banta hi nahi** — D-42 §2 ka locked invariant. Call sites
 *    pehle se guard karte hain; ye doosri deewar hai.
 * 3. **`loading` / `fetchPriority` ki jodi** — `priority` wali image kabhi lazy nahi hoti,
 *    aur lazy image kabhi high priority nahi. Dono alag-alag likhne pe wo jodi kahin na
 *    kahin toot-ti hi hai.
 *
 * ## `priority` aur `eager` do alag cheezein hain
 *
 * | Prop | Kiske liye | Kya lagta hai |
 * | --- | --- | --- |
 * | `priority` | **sirf LCP wali image** — page ka hero | `loading="eager"` + `fetchpriority="high"` |
 * | `eager` | screen pe pehle se dikhti chhoti image — logo | `loading="eager"` |
 * | (kuch nahi) | neeche ki har image | `loading="lazy"` + `decoding="async"` |
 *
 * Header ka logo `eager` hai, `priority` nahi: wo dikhta pehle se hai (isliye lazy galat
 * hoga — lazy above-the-fold image LCP ko der karti hai), par usko hero se **aage** bhejne
 * ka koi matlab nahi. `fetchpriority="high"` ek hi page pe kai jagah likh dena usse bemaani
 * bana deta hai — jab sab kuch zaroori ho to kuch bhi zaroori nahi.
 *
 * @param {object} props
 * @param {{ url: string, srcset?: string | null, width?: number | null, height?: number | null, alt?: string } | null | undefined} props.image
 * @param {string} [props.sizes] CSS me is image ka slot kitna chauda hai
 * @param {string} [props.alt] payload ke `alt` ke upar — jab image ka apna alt khaali ho
 * @param {boolean} [props.priority] LCP wali image: turant, aur sabse pehle
 * @param {boolean} [props.eager] dikhti hui image: turant, par normal priority pe
 */
export default function Img({ image, sizes, alt, priority = false, eager = false, ...rest }) {
  if (!image?.url) return null

  const loadsNow = priority || eager

  return (
    <img
      src={image.url}
      srcSet={image.srcset || undefined}
      sizes={image.srcset ? sizes : undefined}
      alt={image.alt || alt || ''}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={loadsNow ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={loadsNow ? undefined : 'async'}
      {...rest}
    />
  )
}
