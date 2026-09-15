/**
 * Badge ka inline rang — admin me chuna hua `#rrggbb`, uspe padhne laayak text (D-93, D-96 §20).
 *
 * Do jagah chahiye tha — blog ki category aur package ka Package Type. Pehle ye `PostCard.jsx` ke andar tha;
 * package card aate hi yahan nikla (do copies ek din alag ho jaati hain).
 *
 * Khaali/galat rang pe `undefined` — yaani CSS class wala default rang hi chalta hai.
 */

/**
 * `#rrggbb` pe padhne laayak text — halke rang pe gehra, gehre pe safed.
 *
 * Client koi bhi rang chun sakta hai, aur peele badge pe safed text padha hi nahi jaata. Ye andaaz
 * (0.299/0.587/0.114) aankh ki roshni ka seedha hisaab hai — koi library nahi.
 *
 * @param {string} hex
 */
export function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16)
  const light = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255

  return light > 0.62 ? 'var(--ink)' : '#fff'
}

/** @param {string | undefined | null} color */
export function badgeStyle(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color ?? '')
    ? { background: color, color: inkOn(color) }
    : undefined
}
