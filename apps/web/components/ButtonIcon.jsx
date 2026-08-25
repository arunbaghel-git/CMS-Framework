/**
 * Header button ka icon — `settings.headerButtons[].icon` se.
 *
 * Value ek **structured field** hai (`BUTTON_ICONS` enum), className nahi (R18). Theme
 * yahan uska SVG chunti hai; client sirf naam chunta hai.
 *
 * Naya icon jodna do line hai: `packages/shared` ke `BUTTON_ICONS` me ek value, aur
 * yahan ek entry.
 *
 * Sab stroke-based hain, `currentColor` pe — isliye har button variant me apne aap sahi
 * rang le lete hain (neele pe safed, outline pe neela). Alag-alag rang wale icons rakhne
 * se har variant ke liye alag file rakhni padti.
 */
const PATHS = {
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
}

/** @param {{ name?: string }} props */
export default function ButtonIcon({ name }) {
  const path = PATHS[name]
  // `none`, khaali, ya koi anjaan value — teenon pe kuch render nahi hota
  if (!path) return null

  return (
    <svg
      className="btn__icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}
