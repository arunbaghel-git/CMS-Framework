/**
 * Theme ki menu locations — D-17, D-43.
 *
 * **Core in naamon ko enum nahi karta.** `menuLocations.location` ek free string hai;
 * ye list wo hai jo **aaj ka theme declare karta hai**. D-17 ka poora point yahi tha:
 * agar keys core me hardcode hon to client ko ek aur footer column chahiye hone pe code
 * change karna pade — aur wo framework ke apne "no code per client" rule ko hi tod deta.
 *
 * Admin ka Theme Locations panel **isi registry se** render hota hai.
 *
 * Naam **generic** hain, content-specific nahi: `footerExplore` / `footerPackages` jaise
 * naam ek travel site ke hain, framework ke nahi. Ek dental clinic ke instance me wahi
 * `footerColumn2` "Treatments" hoga.
 *
 * ⚠️ **`mobile` yahan nahi hai.** D-17 usko list karta tha; D-43 ne hata diya — mobile
 * wahi menu render karta hai jo `header` pe assigned hai. Do alag content sets hamesha
 * drift karte hain.
 *
 * Label English me (R17) — ye seedha admin UI me dikhta hai.
 */
export const THEME_MENU_LOCATIONS = Object.freeze([
  { id: 'header', label: 'Header' },
  { id: 'footerColumn1', label: 'Footer Column 1' },
  { id: 'footerColumn2', label: 'Footer Column 2' },
  { id: 'footerColumn3', label: 'Footer Column 3' },
  { id: 'footerColumn4', label: 'Footer Column 4' },
])

export const THEME_MENU_LOCATION_IDS = Object.freeze(THEME_MENU_LOCATIONS.map((l) => l.id))

/** Footer ke columns, usi order me jisme wo render hote hain. */
export const FOOTER_MENU_LOCATION_IDS = Object.freeze(
  THEME_MENU_LOCATION_IDS.filter((id) => id.startsWith('footerColumn')),
)

export const HEADER_MENU_LOCATION_ID = 'header'

/** @param {string} id */
export function isThemeMenuLocation(id) {
  return THEME_MENU_LOCATION_IDS.includes(id)
}
