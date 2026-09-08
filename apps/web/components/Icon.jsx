/**
 * Ek icon — `packages/shared` ke `ICONS` registry ki value se.
 *
 * Value ek **structured field** hai, className nahi (R18). Theme yahan uska SVG chunti
 * hai; client sirf naam chunta hai.
 *
 * Naya icon jodna do line hai: `constants/icons.js` me ek value + label, aur yahan ek
 * entry.
 *
 * Ye pehle `ButtonIcon` tha aur sirf header ke buttons ke liye tha. D-44 me footer ke
 * text blocks ko bhi wahi icons chahiye the — do copy rakhne ka matlab hota ki ek din ek
 * icon ek jagah dikhe aur doosri jagah nahi.
 *
 * Sab stroke-based hain, `currentColor` pe — isliye har jagah apne aap sahi rang le lete
 * hain (neele button pe safed, footer ke gehre background pe halka neela). Alag-alag rang
 * wale icons rakhne se har context ke liye alag file rakhni padti.
 */
const PATHS = {
  /*
   * ⚠️ **`shield` · `pin` · `doc` · `check` yahan 8 Sep me jude, aur unka na hona ek chup bug
   * tha.**
   *
   * `trustBadgeSchema` ka enum inhe **shuru se** deta hai (`none · shield · pin · doc · star ·
   * clock · check`) aur admin ka dropdown inhe dikhata hai — par yahan sirf `star` aur `clock`
   * the. Yaani client `shield` chunta, save hota, aur page pe **kuch na dikhta**: `Icon` anjaan
   * naam pe `null` lauta deta hai.
   *
   * Wahi shakl jo baar-baar pakdi ja rahi hai — feature ka aadha hissa bana hota hai aur uska
   * na chalna kabhi error nahi deta, sirf "kuch na hone" jaisa dikhta hai (D-86).
   *
   * Teenon path reference ke `.vhero__trust` se hi liye gaye hain (`tour-v3.html:1385`).
   */
  shield: <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" />,
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  doc: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,

  /**
   * WhatsApp ka brand mark.
   *
   * ⚠️ Ye akela icon **fill-based** hai, baaki sab stroke-based. Brand glyph aisa hi hai — use
   * stroke se banane ka matlab hota uski shakl badal dena. `fill`/`stroke` path pe hi likhe hain
   * taaki wo `<svg>` ke `fill="none" stroke="currentColor"` ko override kar dein — wrapper ko
   * chhedne ki zaroorat nahi padi.
   */
  whatsapp: (
    <path
      fill="currentColor"
      stroke="none"
      d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.1-.7.2-.7 1-.9 1.2-.4.2-.7 0a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.3 14.3 0 0 0 5.5 4.8c2.6 1 2.6.7 3.1.6a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"
    />
  ),

  award: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="m8.2 13.9-1.4 7.1L12 18.4l5.2 2.6-1.4-7.1" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
  chat: (
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20.5l1.5-4.4A8.4 8.4 0 0 1 3.6 12a8.4 8.4 0 0 1 8.4-9 8.4 8.4 0 0 1 9 8.5z" />
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,

  /* Neeche wale teen footer ke reference se — timing, offices, addresses (D-44) */
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 1.9" />
    </>
  ),
  mapPin: (
    <>
      <path d="M20 10.5c0 5.2-8 12-8 12s-8-6.8-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10.3" r="2.8" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18M5 21V5.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 5.5V21M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21" />
      <path d="M8.5 8h3M8.5 12h3M8.5 16h3" />
    </>
  ),
}

/**
 * @param {object} props
 * @param {string} [props.name] `ICONS` ki koi value
 * @param {string} [props.className]
 * @param {number} [props.size]
 * @param {number} [props.strokeWidth] Footer ke icons reference me patle hain (2), buttons pe 2.2
 */
export default function Icon({ name, className, size = 16, strokeWidth = 2.2 }) {
  const path = PATHS[name]
  // `none`, khaali, ya koi anjaan value — teenon pe kuch render nahi hota
  if (!path) return null

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}
