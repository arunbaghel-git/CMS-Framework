/**
 * Theme ke default rang — **admin ke color picker ka "Default" swatch** (D-96 §18, client 15 Sep).
 *
 * Section ka rang khaali ho to site theme ka rang lagati hai (`apps/web/app/globals.css` ka `:root`). Admin
 * ko wahi rang picker me dikhana hai — pehle ye hex admin ke code me ~10 jagah haath se likhe the, aur future
 * ke customizer (admin se rang/font) ke baad wo purana rang dikhate.
 *
 * ⚠️ **Abhi ye `:root` ki copy hai, source nahi.** Dono ek hi value rakhein — `globals.css` me token badlo to
 * yahan bhi. Customizer ke din ulta hoga: rang `settings` me honge, web layout unse `:root` likhega aur admin
 * yahan ke badle settings padhega — tab ye file sirf "factory default" bachegi.
 *
 * Naam `:root` ke token ke hi hain, taaki milaan ek nazar me ho.
 */
export const THEME_COLORS = Object.freeze({
  /** `--surface` — safed section */
  surface: '#ffffff',
  /** `--blue-50` — halka neela section (Testimonials, Logo grid) aur icon ka dabba */
  blue50: '#f2f8fd',
  /** `--blue-100` — quote icon */
  blue100: '#e4f0fb',
  /** `--blue-500` — card ki patti (accent) */
  blue500: '#2a86d4',
  /** `--blue-600` — icon ka rang */
  blue600: '#1668ae',
  /** `--blue-900` — hero ka background */
  blue900: '#0b2b4a',
  /** `--gold` — Award badges ka gola (D-96 §23) */
  gold: '#f5a623',
})
