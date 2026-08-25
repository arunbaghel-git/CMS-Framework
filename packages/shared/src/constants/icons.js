/**
 * UI icons ka registry — D-44.
 *
 * **Ek chhoti curated list, koi khula media field nahi.** Icons framework ki furniture
 * hain, client ka content nahi. Media se pick karwane ka matlab hota ki har icon ke liye
 * client ko ek file upload karni pade, aur hume upload + validation + resolve ki poori
 * machinery — jabki asal me sabko wahi 8-10 icons chahiye.
 *
 * **Value hi contract hai** — theme isi se SVG chunti hai, aur ye DB me stored data hai.
 * Isliye inhe **rename mat karo** (wahi rule jo block `type` pe hai, R4). Naya icon jodna
 * do line hai: yahan ek value, aur `apps/web/components/Icon.jsx` me ek path.
 *
 * **Ek hi list header buttons aur footer text blocks dono ke liye hai.** Pehle ye sirf
 * `BUTTON_ICONS` thi (settings schema ke andar). Do alag list rakhne ka nateeja wahi hota
 * jo `menu.location` pe hua tha: ek din wo alag ho jaatin, aur theme ke paas aisi value
 * pahunch jaati jiska SVG hai hi nahi.
 */
export const ICONS = Object.freeze([
  'none',
  'award',
  'phone',
  'mail',
  'chat',
  'calendar',
  'star',
  /** Neeche wale teen footer ke reference se aaye (D-44) — timing, offices, addresses. */
  'clock',
  'mapPin',
  'building',
])

/**
 * UI ke labels — value hi contract hai, ye sirf naam hai (R11/R17).
 *
 * Yahan isliye hain ki ab **do** screens icon dropdown dikhati hain (Appearance ▸ Menus ke
 * header buttons, aur Appearance ▸ Footer ke text blocks). Labels har screen me alag likhe
 * jaate to wahi icon do jagah do naam se dikhta.
 */
export const ICON_LABELS = Object.freeze({
  none: 'No icon',
  award: 'Award',
  phone: 'Phone',
  mail: 'Email',
  chat: 'Chat',
  calendar: 'Calendar',
  star: 'Star',
  clock: 'Clock',
  mapPin: 'Location',
  building: 'Building',
})
