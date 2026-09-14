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
  /**
   * Posts — blog (spec 008, client 9 Sep).
   *
   * ⚠️ **`Tags` hata diya gaya** — client: _"remove tag submenu"_. Sirf yahan se link
   * hataana kaafi nahi hota: `post.taxonomyTypes` se bhi `tag` gaya hai, warna taxonomy
   * zinda rehti aur uske paas koi UI na hoti — theek wahi "bana hua par juda nahi" jo D-89
   * aur D-90 me baar-baar mila.
   *
   * ⚠️ **In chaaron pe `permission` ab lagi hui hai, aur pehle nahi thi.** Ye wahi jaal ka
   * **zinda** instance tha jo 8 Sep ko Pages pe theek hua tha — menu **sabko** dikhta tha aur
   * contributor click karke ek toota hua screen paata.
   *
   * `Blog Page` listing page hai (`blogPage` type) — client ne use _"ek submenu me single
   * page"_ kaha. Wo aam list hai jisme aam taur pe ek hi row hogi; doosri banane ka raasta
   * khula hai kyunki topic-wise landing page (`/blog/ferries`) usi se banta hai.
   */
  {
    id: 'posts',
    icon: '✎',
    label: 'Posts',
    children: [
      { label: 'All Posts', to: '/posts', permission: PERMISSION.ENTRY_READ },
      { label: 'Add New', to: '/posts/new', permission: PERMISSION.ENTRY_CREATE },
      { label: 'Categories', to: '/posts/categories', permission: PERMISSION.TAXONOMY_READ },
      { label: 'Blog Page', to: '/blog-page', permission: PERMISSION.ENTRY_READ },
      /**
       * ⚠️ **11 Sep ko `Settings ▸ Blog settings` se yahan aaya** (client, D-93) — theek wahi
       * raasta jo `Tour settings` ne 8 Sep ko liya tha. Storage (`settings.blogSettings`) aur
       * permission (`settings.read`) wahi; sirf menu me jagah badli.
       */
      { label: 'Blog settings', to: '/posts/settings', permission: PERMISSION.SETTINGS_READ },
    ],
  },
  { id: 'media', icon: '▤', label: 'Media', to: '/media', permission: PERMISSION.MEDIA_READ },
  {
    id: 'pages',
    icon: '▭',
    label: 'Pages',
    children: [
      { label: 'All Pages', to: '/pages', permission: PERMISSION.ENTRY_READ },
      { label: 'Add New', to: '/pages/new', permission: PERMISSION.ENTRY_CREATE },
    ],
  },
  /**
   * Tour — **apna top-level menu**, Pages ka submenu nahi (client ka faisla #1, D-87).
   *
   * Wahi wajah jiske liye `tourPage` ek alag content type hai: menu, list aur URL teenon alag
   * maange gaye the. **Edit screen dono ka ek hi hai** (`/pages/:id` aur `/tour/:id` ek hi
   * component pe jaate hain).
   *
   * ⚠️ Dono par `permission` ab lagi hui hai. Slice C se pehle Pages ke dono link pe wo thi
   * hi nahi — yaani menu **sabko** dikhta tha, aur contributor click karne pe ek toota hua
   * screen paata. Wahi galti jo Settings pe pehle ho chuki thi (21 Aug).
   */
  {
    id: 'tour',
    icon: '🏝',
    label: 'Tour',
    children: [
      { label: 'All Tour Pages', to: '/tour', permission: PERMISSION.ENTRY_READ },
      { label: 'Add New', to: '/tour/new', permission: PERMISSION.ENTRY_CREATE },
      /**
       * ⚠️ **Ye 8 Sep ko `Settings ▸ Tour settings` se yahan aaya** (client).
       *
       * Storage abhi bhi `settings` document me hai (`settings.tourSettings`) aur permission
       * bhi wahi (`settings.read`) — sirf **menu me jagah** badli hai. UI ki jagah aur storage
       * ki jagah alag hone me koi dikkat nahi; wahi baat `Appearance ▸ Footer` pe pehle se
       * likhi hai, jo likhta `settings` me hi hai.
       *
       * Client ka tark seedha hai: ye Tour page ki cheezein hain (banner, trust badges), to wo
       * Tour ke neeche milni chahiye — wahan nahi jahan site ke settings hain.
       */
      {
        label: 'Tour settings',
        to: '/tour/settings',
        permission: PERMISSION.SETTINGS_READ,
      },
    ],
  },
  { separator: true },
  /**
   * Packages — submenu **client ki 26 Aug wali list se** hai (spec 007 "Scope me kya hai"),
   * design ke purane paanch item se nahi. Ye R15 ke against nahi hai: badlaav client se
   * hi aaya hai.
   *
   * Teen farq:
   *
   * - **"Travel Themes" ab "Package Type" hai** (spec 007 §1.2). Editor ka free-tag input
   *   bhi hat gaya — ab wo ek managed list hai.
   * - **"Departures & Pricing" hat gaya** — Fixed Departures aur Occupancy Slabs client ne
   *   hata diye (§5.1), aur baaki pricing package ke apne editor me hai (§4).
   * - **Paanch nayi lists judi** — Hotels · Add Ons · What's Included · Itinerary Images ·
   *   Transfer.
   *
   * **"Inclusion/Exclusion" jaan-boojh kar nahi hai.** Client ne wo naam bhi bataya tha, par
   * dono ka target ek hi block hai (§1.5) — do menu item ek hi screen pe le jaate to wo
   * "do alag cheezein hain" ka jhootha ishaara deta. Agar wo sach me alag nikle to yahan ek
   * line judegi (spec 007 §9 #2 abhi khula hai).
   */
  {
    id: 'packages',
    icon: '🧳',
    label: 'Packages',
    children: [
      { label: 'All Packages', to: '/packages', permission: PERMISSION.ENTRY_READ },
      { label: 'Add New', to: '/packages/new', permission: PERMISSION.ENTRY_CREATE },
      { label: 'Destinations', to: '/packages/destinations', permission: PERMISSION.TAXONOMY_READ },
      { label: 'Package Type', to: '/packages/types', permission: PERMISSION.TAXONOMY_READ },
      { label: 'Hotels', to: '/packages/hotels', permission: PERMISSION.HOTEL_READ },
      { label: 'Add Ons', to: '/packages/add-ons', permission: PERMISSION.ADD_ON_READ },
      { label: 'Transfer', to: '/packages/transfers', permission: PERMISSION.TRANSFER_READ },
      {
        label: "What's Included",
        to: '/packages/whats-included',
        permission: PERMISSION.PACKAGE_DEFAULTS_READ,
      },
      {
        label: 'Itinerary Images',
        to: '/packages/itinerary-images',
        permission: PERMISSION.PACKAGE_DEFAULTS_READ,
      },
      {
        label: 'Section Headings',
        to: '/packages/section-headings',
        permission: PERMISSION.PACKAGE_DEFAULTS_READ,
      },
      {
        label: 'Itinerary Settings',
        to: '/packages/itinerary-settings',
        permission: PERMISSION.PACKAGE_DEFAULTS_READ,
      },
    ],
  },
  /**
   * Enquiries — submenu `admin-design-v2.html` (1 Sep) se.
   *
   * Design me paanch item hain; **do ban chuke hain** (Enquiry Forms · Add New Form) aur
   * teen abhi "abhi nahi bana" pe hain (All Enquiries · Enquiry Detail · Export CSV).
   * Client ne 1 Sep ko sirf do maange the — "banana hai abhi Enquiry Forms, Add New Form
   * only, kyunki design me chahiye itinerary page par".
   *
   * Teenon anbane item phir bhi yahan hain: D-30 — khaali cheez khaali dikhni chahiye,
   * tooti hui nahi. Menu se hata dene se baad me poora nav dobara likhna padta.
   */
  /**
   * Reviews — **apna top-level menu**, Packages ka submenu nahi (client, 1 Sep).
   *
   * ⚠️ Pehle ye `Packages ▸ Reviews` bana diya gaya tha, kyunki data ke hisaab se wo baaki
   * master lists jaisa hi hai (Hotels · Add Ons · Transfer). Client ne palta, aur unki baat
   * pehli baar me hi saaf thi — _"one menu in sidebar"_.
   *
   * Wajah data me nahi, **daayre me** hai: Hotels aur Add Ons package ke **andar** ki
   * cheezein hain — har package unme se chunta hai. Reviews kisi package ke andar nahi
   * hain; wo poori site ki hain aur har package ke neeche wahi ki wahi chhapti hain. Jo
   * cheez sabke upar hai, wo kisi ek ke andar nahi baithni chahiye.
   *
   * Ye wahi lakeer hai jo A-13/A-14 pe bani thi, bas ulti taraf se: **admin ka dhaancha us
   * cheez ke daayre ko follow karta hai, uske data model ko nahi.**
   *
   * Submenu nahi hai — screen ek hi hai (form + list ek saath), Media jaisi.
   */
  {
    id: 'reviews',
    icon: '★',
    label: 'Reviews',
    to: '/reviews',
    permission: PERMISSION.REVIEW_READ,
  },
  {
    id: 'enquiries',
    icon: '✉',
    label: 'Enquiries',
    children: [
      /**
       * ⚠️ Design ke nav me paanch item hain; yahan **teen** hain — client ka faisla (3 Sep).
       *
       * `Enquiry Detail` aur `Export CSV` hata diye gaye. Dono nav ke item ki tarah kaam hi
       * nahi karte the: detail ko ek enquiry ki id chahiye (nav ke paas hoti nahi), aur
       * export ek **kaam** hai, ek jagah nahi — wo list ke upar wale button se hota hai,
       * jahan abhi ke filter (date range samet) uske saath jaate hain.
       */
      { label: 'All Enquiries', to: '/enquiries', permission: PERMISSION.SUBMISSION_READ },
      { label: 'Enquiry Forms', to: '/enquiries/forms', permission: PERMISSION.FORM_READ },
      { label: 'Add New Form', to: '/enquiries/forms/new', permission: PERMISSION.FORM_CREATE },
    ],
  },
  /**
   * Bulk Upload — **top-level, submenu nahi** (client, 3 Sep: _"sidebar me menu banana hai not
   * submenu remember"_).
   *
   * Packages ke theek neeche isliye hai ki ye unhi ko banata hai. Andar do screen hain (list
   * aur ek run ka nateeja), par nav me ek hi item hai — Media ki tarah: doosri screen kisi run
   * ki id se khulti hai, aur wo nav ke paas hoti hi nahi. Wahi wajah thi jisse
   * `Enquiries ▸ Enquiry Detail` bhi nav se hataya gaya tha (D-76).
   *
   * ⚠️ **Ye screen `admin-design-v2.html` me nahi hai** — client ne ise design ke baad maanga.
   * Isliye layout naya nahi gadha gaya; wo maujooda pattern hi dohraata hai (list screen +
   * panel). Client ko iska apna design chahiye ho to wo **unse** aayega, yahan se nahi (R15).
   *
   * ⚠️ `tools.import` `permissions.js` me pehle se tha par kisi role pe nahi — migration 021 ne
   * roles sync ki. Abhi wo **sirf admin** ke paas hai. Editor ko bhi chahiye to wo ek line
   * `ROLE_PERMISSIONS` me aur ek nayi migration hai.
   */
  {
    id: 'bulkUpload',
    icon: '⇪',
    label: 'Bulk Upload',
    to: '/bulk-upload',
    permission: PERMISSION.TOOLS_IMPORT,
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
      /**
       * Sidebar — design me ye tab pehle se hai (`admin-design-v3.html` nav, line 341).
       *
       * ⚠️ Uska **model** alag tha (ek hi sidebar, position isi screen pe, aur form ke liye
       * niyam ki table). Client ne uski jagah **named sidebars** chune — poora hisaab D-88 §1
       * me. Yahan sirf tab ka naam design se liya gaya hai.
       */
      { label: 'Sidebar', to: '/appearance/sidebars', permission: PERMISSION.SIDEBAR_READ },
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
      /**
       * Page ka aakhri CTA card — D-67. Design me ye `.offer` hai.
       *
       * ⚠️ Ye `settings` me hai, `packageDefaults` me nahi — client ka faisla: "dusre pages
       * par bhi use hoga". Package ke aur text (headings) Packages ▸ Section Headings me
       * hain, ye yahan.
       */
      { label: 'CTA Section', to: '/settings/cta', permission: PERMISSION.SETTINGS_READ },
      /* `Tour settings` yahan se **Tour ke submenu** me chala gaya (client, 8 Sep) — upar dekho. */
      /* `Blog settings` yahan se **Posts ke submenu** me chala gaya (client, 11 Sep, D-93) — upar dekho. */
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
  /**
   * Packages — list `entry.read` pe, editor `entry.update` **ya** uska `.own` pe.
   *
   * Editor pe sirf `entry.read` maangna galat hota: screen kholte hi save ka raasta khul
   * jaata hai. Wahi tark jo `/users/:id` pe likha hua hai. Asli `.own` check phir bhi
   * server pe hai — yahan sirf "andar aane do" wala layer hai (D-37).
   */
  '/packages': PERMISSION.ENTRY_READ,
  '/packages/new': PERMISSION.ENTRY_CREATE,
  '/packages/:id': PERMISSION.ENTRY_READ,
  '/packages/destinations': PERMISSION.TAXONOMY_READ,
  '/packages/types': PERMISSION.TAXONOMY_READ,
  '/packages/hotels': PERMISSION.HOTEL_READ,
  '/packages/add-ons': PERMISSION.ADD_ON_READ,
  '/packages/transfers': PERMISSION.TRANSFER_READ,
  '/packages/whats-included': PERMISSION.PACKAGE_DEFAULTS_READ,
  '/packages/itinerary-images': PERMISSION.PACKAGE_DEFAULTS_READ,
  '/packages/section-headings': PERMISSION.PACKAGE_DEFAULTS_READ,
  '/packages/itinerary-settings': PERMISSION.PACKAGE_DEFAULTS_READ,

  /**
   * Pages aur Tour Pages — wahi jodi jo Packages pe hai (D-87, Slice C).
   *
   * ⚠️ **Slice C se pehle in dono ka koi guard tha hi nahi** — `/pages/*` `NotBuiltYet` pe
   * jaata tha aur `NAV` me uske links pe `permission` bhi nahi thi, yaani menu **sabko**
   * dikhta tha. Ab dono jagah lag gayi hai.
   *
   * Edit screen dono ke liye ek hi component hai, par guard alag-alag path pe likha hai —
   * `permissionForRoute()` exact pattern se milaata hai, prefix se nahi.
   */
  /*
   * `/pages` ke guard **14 Sep se** (D-95) — 8 Sep se yahan nahi the, kyunki screens
   * `NotBuiltYet` pe thin aur jo route hi nahi uska guard jhootha ishaara deta.
   */
  '/pages': PERMISSION.ENTRY_READ,
  '/pages/new': PERMISSION.ENTRY_CREATE,
  '/pages/:id': PERMISSION.ENTRY_READ,

  '/tour': PERMISSION.ENTRY_READ,
  '/tour/new': PERMISSION.ENTRY_CREATE,
  '/tour/:id': PERMISSION.ENTRY_READ,

  /**
   * Posts aur Blog Page — wahi jodi (spec 008, Slice C).
   *
   * ⚠️ Ab ye guard sach me kuch rokte hain, kyunki screens ban chuki hain. `/posts/tags` ka
   * guard **nahi** hai aur na ho — wo route hi hata diya gaya (client ne Tags mana kiya).
   */
  '/posts': PERMISSION.ENTRY_READ,
  '/posts/new': PERMISSION.ENTRY_CREATE,
  '/posts/:id': PERMISSION.ENTRY_READ,
  '/posts/categories': PERMISSION.TAXONOMY_READ,
  '/blog-page': PERMISSION.ENTRY_READ,
  '/blog-page/new': PERMISSION.ENTRY_CREATE,
  '/blog-page/:id': PERMISSION.ENTRY_READ,

  /**
   * Bulk Upload — dono screen ek hi permission pe.
   *
   * Nateeje wali screen bhi `tools.import` maangti hai, sirf `read` jaisi koi cheez nahi:
   * usme client ke package ke naam, unke URL aur unki galtiyaan dikhti hain — yaani wahi
   * jaankari jo import chalane wale ki hai.
   */
  '/bulk-upload': PERMISSION.TOOLS_IMPORT,
  '/bulk-upload/:id': PERMISSION.TOOLS_IMPORT,

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
  '/settings/cta': PERMISSION.SETTINGS_READ,
  /**
   * ⚠️ Menu me ye ab **Tour** ke neeche hai (client, 8 Sep), par guard `settings.read` hi rahi —
   * storage `settings.tourSettings` me hai. Jagah badalne se permission nahi badalti.
   */
  '/tour/settings': PERMISSION.SETTINGS_READ,
  /** Blog settings — menu me ab **Posts** ke neeche (client, 11 Sep, D-93), guard wahi. */
  '/posts/settings': PERMISSION.SETTINGS_READ,
  /**
   * Menus screen khud `menu.update` na hone pe form disable kar deti hai — `author` aur
   * `contributor` menu **dekh** sakte hain (link banate waqt ye kaam ka hai), badal nahi.
   */
  '/appearance/menus': PERMISSION.MENU_READ,
  /**
   * Sidebars — wahi jodi jo Menus pe hai: `sidebar.read` se khulti hai, aur `sidebar.update`
   * na ho to screen khud form disable kar deti hai.
   *
   * Dono route yahan hain (list aur editor). ⚠️ 8 Sep ko Pages pe ulta pakda gaya tha — `NAV`
   * me `permission` thi hi nahi, to menu sabko dikhta tha. Naya section jodte waqt **dono
   * jagah** likhna hi wo galti nahi hone deta.
   */
  '/appearance/sidebars': PERMISSION.SIDEBAR_READ,
  '/appearance/sidebars/:id': PERMISSION.SIDEBAR_READ,
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
