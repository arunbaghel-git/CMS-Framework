/**
 * Social network ka brand mark — `SOCIAL_KEYS` ki value se.
 *
 * **Ye `Icon.jsx` se alag hai, aur jaan-boojh kar.** `ICONS` registry UI ki furniture hai
 * (phone, mail, clock…) — client use kisi bhi text block ya button pe chun sakta hai.
 * Brand marks aise nahi hain: unhe "Instagram" wale link ke alawa kahin dikhana galat
 * hota, aur unka set `SOCIAL_KEYS` se bandha hua hai, client ki pasand se nahi.
 *
 * Dono ka **rendering bhi alag** hai: UI icons stroke-based hain (`currentColor` pe stroke),
 * brand marks **filled** hote hain. Ek hi component me dono karne ka matlab hota har call
 * pe `fill`/`stroke` ka flag pass karna.
 *
 * Naya network jodna do line hai: `SOCIAL_KEYS` me ek value, aur yahan ek path.
 */
const PATHS = {
  facebook:
    'M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.6a19 19 0 0 0-2.2-.1c-2.4 0-4 1.5-4 4.2v1.8H8V12h2.8v9h3.4v-9h2.8l.4-3.5H14z',
  instagram:
    'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9a3.9 3.9 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm8.4-11.1a1.5 1.5 0 1 1-3.1 0 1.5 1.5 0 0 1 3.1 0z',
  youtube:
    'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12c0 1.6.1 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8zM10 15.1V8.9l5.2 3.1-5.2 3.1z',
  x: 'M17.2 3h3.3l-7.2 8.2L21.8 21h-6.6l-5.2-6.8L4.1 21H.8l7.7-8.8L.5 3h6.8l4.7 6.2L17.2 3zm-1.2 16h1.8L6.1 4.9H4.1L16 19z',
}

/**
 * @param {object} props
 * @param {string} props.name `SOCIAL_KEYS` ki koi value
 * @param {number} [props.size]
 */
export default function SocialIcon({ name, size = 15 }) {
  const path = PATHS[name]
  if (!path) return null

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}
