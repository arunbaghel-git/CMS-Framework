import { PERMISSION } from '@cms/shared'

/**
 * Nav registry — **sidebar aur route guard dono yahi padhte hain** (D-37).
 *
 * Ek hi jagah isliye hai ki menu me item chhupana aur route band karna do alag
 * cheezein hain, aur unhe do files me rakhne ka nateeja hamesha ek jaisa hota hai:
 * item menu se gayab ho jaata hai par URL type karne pe screen khul jaati hai. Wo
 * bug chup-chaap hota hai — koi error nahi, sirf ek khaali toota hua screen.
 *
 * **Yaad rakho:** ye sirf UX aur ek doosri deewar hai. **Asli rok server pe hai** —
 * har route pe `requirePermission()`. Yahan se kuch hata dena kisi ko API se nahi
 * rokta.
 */

/**
 * Left navigation — `admin-design.html` ke SIDEBAR section se.
 *
 * Menu **exactly wahi** hai jo design me hai (order, wording, icons, separators tak).
 * Design SPEC hai — kuch add/remove karna ho to client se aayega, yahan se nahi (R15).
 *
 * Jo screens abhi bani nahi hain wo bhi yahan hain: link dikhta hai par "abhi nahi
 * bana" page pe le jaata hai. D-30 — **khaali cheez khaali dikhni chahiye, tooti hui
 * nahi.** Menu se hata dene se baad me poora nav dobara likhna padta.
 *
 * `permission` **optional** hai. Jis item pe nahi hai wo sabko dikhta hai — aaj wo
 * design ke har item pe laga hua nahi hai, sirf Users pe. Client ne abhi sirf Users ka
 * shape maanga hai (D-37); baaki sections pe permission tab lagegi jab wo screens
 * banengi aur client unka access batayega. Aaj hi sab pe laga dena "design frozen hai"
 * wale rule ko developer ki taraf se todna hota.
 */
export const NAV = [
  { id: 'dashboard', icon: '⌂', label: 'Dashboard', to: '/' },
  {
    id: 'posts',
    icon: '✎',
    label: 'Posts',
    children: [
      { label: 'All Posts', to: '/posts' },
      { label: 'Add New', to: '/posts/new' },
      { label: 'Categories', to: '/posts/categories' },
      { label: 'Tags', to: '/posts/tags' },
    ],
  },
  { id: 'media', icon: '▤', label: 'Media', to: '/media' },
  {
    id: 'pages',
    icon: '▭',
    label: 'Pages',
    children: [
      { label: 'All Pages', to: '/pages' },
      { label: 'Add New', to: '/pages/new' },
    ],
  },
  { separator: true },
  {
    id: 'packages',
    icon: '🧳',
    label: 'Packages',
    children: [
      { label: 'All Packages', to: '/packages' },
      { label: 'Add New', to: '/packages/new' },
      { label: 'Destinations', to: '/packages/destinations' },
      { label: 'Travel Themes', to: '/packages/themes' },
      { label: 'Departures & Pricing', to: '/packages/departures' },
    ],
  },
  {
    id: 'enquiries',
    icon: '✉',
    label: 'Enquiries',
    children: [
      { label: 'All Enquiries', to: '/enquiries' },
      { label: 'Enquiry Detail', to: '/enquiries/detail' },
      { label: 'Export CSV', to: '/enquiries/export' },
    ],
  },
  { separator: true },
  /**
   * Appearance — Slice 0 ke liye **jaan-boojh kar chhota kiya gaya** (24 Aug, user ka
   * instruction).
   *
   * Design ke tabs chaar hain — Menus · Homepage Blocks · Banners & Sliders · Footer.
   * Abhi do hain: **Menus · Footer**.
   *
   * ⚠️ **Ye R15 se ek jaan-boojh kar liya gaya vichlan hai** — design se item hatana
   * normally client ka faisla hai. Homepage Blocks aur Banners & Sliders isliye hataye
   * gaye ki wo Phase 5/6 ki hain, aur unke `NotBuiltYet` links Appearance ko bhara hua
   * dikha kar galat impression dete the. Wapas laana is array me do line jodna hai.
   *
   * **Ek teesra "Header" tab bhi tha — ab wo poora hat chuka hai** (24 Aug). Usme sirf
   * header ka CTA button tha, aur wo ab **Appearance ▸ Menus ke left column me** hai.
   * Wajah: Menus screen hi asal me header ki screen hai — Header location wahin assign
   * hoti hai. Do field ke liye alag tab rakhna client ke liye ek aur jagah dhoondhna tha.
   */
  {
    id: 'appearance',
    icon: '🎨',
    label: 'Appearance',
    children: [
      { label: 'Menus', to: '/appearance/menus', permission: PERMISSION.MENU_READ },
      { label: 'Footer', to: '/appearance/footer', permission: PERMISSION.SETTINGS_READ },
    ],
  },
  /**
   * Users — pehle flat link tha (`to: '/users'`). Client ne 21 Aug ko iska asli shape
   * diya (D-37): administrator ko teen item, baaki har role ko sirf **Profile**.
   *
   * Profile pe `permission` nahi hai aur na honi chahiye — apni profile har logged-in
   * user ki hai, chahe uska role kuch bhi ho. Isi wajah se `Users` group **sabko**
   * dikhta hai; sirf uske andar ka content role se badalta hai.
   *
   * **Roles ka submenu yahan jaan-boojh kar nahi hai.** Role ki permissions edit karne
   * ka UI Phase 7 ka custom-role builder hai; `GET /api/roles` filhaal read-only hai.
   */
  {
    id: 'users',
    icon: '👤',
    label: 'Users',
    children: [
      { label: 'All Users', to: '/users', permission: PERMISSION.USER_READ },
      { label: 'Add User', to: '/users/new', permission: PERMISSION.USER_INVITE },
      { label: 'Profile', to: '/profile' },
    ],
  },
  /**
   * Settings ab `settings.read` ke peeche hai.
   *
   * Spec 001 ke hisaab se ye permission `admin` aur `editor` ke paas hai — baaki roles
   * ko ye poora group dikhta hi nahi. Pehle sabko dikhta tha, par contributor click
   * karta to API 403 deti aur use ek toota hua screen milta.
   */
  {
    id: 'settings',
    icon: '⚙',
    label: 'Settings',
    children: [
      { label: 'General', to: '/settings', permission: PERMISSION.SETTINGS_READ },
      { label: 'SEO & Schema', to: '/settings/seo', permission: PERMISSION.SETTINGS_READ },
      { label: 'Email / SMTP', to: '/settings/email', permission: PERMISSION.SETTINGS_READ },
      {
        label: 'Integrations',
        to: '/settings/integrations',
        permission: PERMISSION.SETTINGS_READ,
      },
    ],
  },
]

/**
 * Settings ke tabs — design ka `#settingsTabs`.
 *
 * Sidebar ke Settings group aur ye tab bar **ek hi list** se bante hain, warna wo do
 * alag sach ban jaate: sidebar me "Email / SMTP" aur tab me kuch aur (R16).
 */
export const SETTINGS_TABS = NAV.find((item) => item.id === 'settings').children.map(
  ({ label, to }) => ({ label, to }),
)

/** Appearance ke tabs — wahi ek list jo sidebar deti hai (R16). */
export const APPEARANCE_TABS = NAV.find((item) => item.id === 'appearance').children.map(
  ({ label, to }) => ({ label, to }),
)

/**
 * Route → permission.
 *
 * Ye `NAV` se alag list isliye hai ki har route menu me nahi hota — `/users/:id` aur
 * `/users/:id/delete` kisi menu item se nahi khulte, par guard unpe bhi chahiye.
 * Rehti isi file me hai taaki naya section jodte waqt **ek hi file** kholni pade.
 *
 * Jo path yahan nahi hai wo har logged-in user ke liye khula hai (jaise `/profile`).
 */
export const ROUTE_GUARDS = Object.freeze({
  '/users': PERMISSION.USER_READ,
  '/users/new': PERMISSION.USER_INVITE,
  /**
   * Edit form hai, view screen nahi — kholte hi save karne ka raasta khul jaata hai.
   * Isliye `user.read` nahi, `user.update`.
   */
  '/users/:id': PERMISSION.USER_UPDATE,
  '/users/:id/delete': PERMISSION.USER_DELETE,
  /**
   * Sirf `settings.read` — screen khud `settings.update` na hone pe form disable kar
   * deti hai. Editor ko settings **dikhni** chahiye (date format, site title jaisi
   * cheezein uske kaam ki hain), badalni nahi.
   */
  '/settings': PERMISSION.SETTINGS_READ,
  /**
   * Menus screen khud `menu.update` na hone pe form disable kar deti hai — `author` aur
   * `contributor` menu **dekh** sakte hain (link banate waqt ye kaam ka hai), badal nahi.
   */
  '/appearance/menus': PERMISSION.MENU_READ,
  /** Footer ke fields `settings` document me hain (spec 006 §7.2), isliye wahi permission. */
  '/appearance/footer': PERMISSION.SETTINGS_READ,
})

/** @param {string} path route ka pattern, waisa hi jaisa `<Route path>` me hai */
export function permissionForRoute(path) {
  return ROUTE_GUARDS[path] ?? null
}

/**
 * Ek nav item dikhna chahiye ya nahi.
 *
 * Group tab dikhta hai jab uska **koi ek** child dikhta ho — warna khaali accordion
 * reh jaata hai jo khulta to hai par andar kuch nahi hota.
 *
 * @param {any} item
 * @param {(permission: string) => boolean} can
 */
export function isNavItemVisible(item, can) {
  if (item.separator) return true
  if (item.children) return item.children.some((child) => isNavItemVisible(child, can))
  return !item.permission || can(item.permission)
}

/**
 * `NAV` ka wo hissa jo is user ko dikhna chahiye.
 *
 * @param {(permission: string) => boolean} can
 */
export function visibleNav(can) {
  const items = NAV.filter((item) => isNavItemVisible(item, can)).map((item) =>
    item.children
      ? { ...item, children: item.children.filter((child) => isNavItemVisible(child, can)) }
      : item,
  )

  /**
   * Do separator aas-paas na reh jaayein (aur na shuru/aakhir me).
   *
   * Poora group chhup jaane pe uske dono taraf ke separator saath aa jaate hain aur
   * sidebar me ek moti lakeer dikhne lagti hai. Aaj sirf Users pe permission hai isliye
   * ye hota nahi — par jis din kisi aur group pe lagegi, ye chup-chaap ganda dikhega.
   */
  return items.filter((item, i, all) => {
    if (!item.separator) return true
    if (i === 0 || i === all.length - 1) return false
    return !all[i - 1].separator
  })
}
