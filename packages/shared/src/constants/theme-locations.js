/**
 * Theme ki menu locations — D-17, D-43, **D-44**.
 *
 * **Core in naamon ko enum nahi karta.** `menuLocations.location` ek free string hai;
 * ye list wo hai jo **aaj ka theme declare karta hai**. D-17 ka poora point yahi tha:
 * agar keys core me hardcode hon to client ko ek aur location chahiye hone pe code
 * change karna pade — aur wo framework ke apne "no code per client" rule ko hi tod deta.
 *
 * Admin ka Theme Locations panel **isi registry se** render hota hai.
 *
 * ⚠️ **`mobile` yahan nahi hai.** D-17 usko list karta tha; D-43 ne hata diya — mobile
 * wahi menu render karta hai jo `header` pe assigned hai. Do alag content sets hamesha
 * drift karte hain.
 *
 * ⚠️ **`footerColumn1..4` bhi ab yahan nahi hain — D-44 ne hata diye.** Footer ka column
 * ab sirf menu nahi hota: usme text blocks bhi ho sakte hain, uski apni heading aur width
 * hoti hai, aur unki ginti admin chunta hai. Jis pal ek column text-only ho sakta hai, wo
 * "menu location" rehta hi nahi — wo ek composed region hai. Isliye footer ka poora
 * structure `settings.footerColumns[]` me hai (D-44, spec 006 §7.3), aur uska menu
 * reference bhi wahin hai. Migration 008 purane assignments wahan le jaati hai.
 *
 * Label English me (R17) — ye seedha admin UI me dikhta hai.
 */
export const THEME_MENU_LOCATIONS = Object.freeze([{ id: 'header', label: 'Header' }])

export const THEME_MENU_LOCATION_IDS = Object.freeze(THEME_MENU_LOCATIONS.map((l) => l.id))

export const HEADER_MENU_LOCATION_ID = 'header'

/** @param {string} id */
export function isThemeMenuLocation(id) {
  return THEME_MENU_LOCATION_IDS.includes(id)
}
