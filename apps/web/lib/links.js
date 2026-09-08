/**
 * Contact ke link — ek hi jagah.
 *
 * ⚠️ Ye file isliye bani ki `Planner` aur `TourPage` dono ko wahi WhatsApp link chahiye tha.
 * Do copies ka nateeja is repo me pehle ho chuka hai aur wo hamesha chup hota hai (`bestFor`
 * similar cards pe chhoot gaya tha, `cancellationText` payload me).
 */

/** `+91 98100 66496` → `+919810066496`. `tel:` aur `wa.me` dono ko spaces pasand nahi. */
export const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '')

/** `tel:` ka href. */
export const telHref = (phone) => `tel:${digits(phone)}`

/**
 * `wa.me` ka href.
 *
 * ⚠️ `wa.me` **`+` nahi leta** — country code bina `+` ke chahiye, isliye wo alag se hataya
 * jaata hai.
 */
export const waHref = (whatsapp) => `https://wa.me/${digits(whatsapp).replace(/^\+/, '')}`
