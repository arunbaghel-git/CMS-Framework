import { ENTRY_SUPPORT } from './schemas/content-type.js'

/**
 * Built-in content types — **code-owned** (D-46, wahi model jo built-in roles pe hai, D-36).
 *
 * Inka content code se aata hai aur seed har deploy pe DB me sync karta hai. Isliye
 * `package` ka field set badalna ek **code change** hai, migration nahi — jo Phase 1 ke
 * dauraan bilkul zaroori hai, kyunki spec 007 ke khule sawaal me se kai theek isi field
 * set ko chhoote hain (§9).
 *
 * **Custom types (Phase 6) yahan nahi honge** — wo admin banata hai aur wo sirf DB me
 * rehte hain. Unke liye `contentTypes` collection hi source hai.
 *
 * ⚠️ `key` **stored data** hai — `entries.type` me baithi hoti hai. Rename karna matlab
 * har entry pe migration (R4 wali baat, block `type` jaisi). Field ki `key` bhi wahi
 * cheez hai: wo `entries.fields` me baithti hai.
 */

const S = ENTRY_SUPPORT

/**
 * Package ka field set — spec 007 §2, Slice 3.
 *
 * Slice 3 me bana, Slice 4 me `itinerary` (§3) aur Slice 5 me `pricing`/`hotels` (§4) juda.
 *
 * `addOns` ek baar hata kar wapas aaya hai — D-61 me global, D-64 me phir se package ka
 * chunav (spec §1.4 wala asli niyam). `faqs` D-59 me juda (Slice 6 se aage khiska).
 * **`reviews` + rating abhi baaki hain** — wo Slice 6 me judenge. `goodToKnow` **banega hi
 * nahi** (D-68): uska content har package pe same rehta hai, to wo
 * `packageDefaults.sectionLabels.booking.description` me jaata hai.
 *
 * `destinations` aur `packageTypes` yahan **nahi** hain — wo `entry.taxonomies` me hain
 * (D-49), aur kaunsi taxonomies chalti hain wo `taxonomyTypes` batata hai.
 *
 * **`overview` bhi yahan nahi hai** — wo entry ka `content` hai, ek `richText` block ke
 * andar. D-46 §3 me yahi likha tha; use ek alag field banane ka matlab hota ek hi cheez
 * do jagah: `content` versioned hai, revisions me jaata hai aur `searchText` bharta hai,
 * aur `fields.overview` inme se kuch nahi karta.
 */
const PACKAGE_FIELDS = [
  {
    key: 'shortDescription',
    type: 'textarea',
    label: 'Short description',
    help: 'Ek line jo title ke neeche dikhti hai',
  },
  { key: 'nights', type: 'number', label: 'Nights' },
  { key: 'days', type: 'number', label: 'Days' },
  { key: 'bannerImage', type: 'media', label: 'Banner image' },
  {
    /**
     * Din-wise plan — poora contract `schemas/itinerary.js` me hai (spec 007 §3).
     *
     * DSL me ye `repeater` hai, par admin iske liye ek apna builder chalata hai (drag
     * se reorder, accordion, aur route strip ka live preview). Registry me phir bhi hona
     * zaroori hai: Phase 6 ka content-type builder isi list se type ka shape padhta hai.
     */
    key: 'itinerary',
    type: 'repeater',
    label: 'Itinerary',
    help: 'Din-wise plan. Route strip isi se apne aap banti hai.',
  },
  { key: 'bestSeason', type: 'text', label: 'Best season', help: 'Jaise: Oct – May' },
  {
    /**
     * Daam — poora contract `schemas/pricing.js` me hai (spec 007 §4, Slice 5).
     *
     * DSL me ye ek `group` hai: andar sirf `categoryPricing[]` hai — chaar category, har
     * ek ka `priceFrom` aur `strikePrice`. Spec §2 me bhi ye `pricing{}` hai.
     *
     * Client ne 27 Aug ko `Price Basis · GST % · Advance to Book %` wali poori row hata di
     * (D-57), aur per-category `note` hotel ke record pe bhej diya.
     *
     * **Currency yahan nahi hai** — wo `settings.currency` se aati hai (client, 27 Aug).
     *
     * ⚠️ Page ka `₹31,999 → ₹24,999` **sabse sasti category** se derive hota hai
     * (`cheapestPricing()`), kisi "featured category" field se nahi.
     */
    key: 'pricing',
    type: 'group',
    label: 'Pricing',
    help: 'Har hotel category ka apna daam',
  },
  {
    /**
     * Har destination × category pe ek hotel (§4.2).
     *
     * `Nights` yahan **nahi** hai — wo itinerary se derive hoti hai (`nightsByStay()`).
     * `Room` bhi nahi — wo hotel ke apne record pe hai (D-53 §3).
     */
    key: 'hotels',
    type: 'repeater',
    label: 'Hotels',
    help: 'Har destination par har category ka hotel',
  },
  {
    /**
     * Add Ons master list me se **chune hue** — poori list kabhi nahi chhapti (§1.4).
     *
     * Wajah seedhi hai: jo package Havelock jaata hi nahi, uspe "Elephant Beach snorkelling"
     * dikhana galat hai. Ye What's Included se ulta case hai — wo global hai (§1.5), ye
     * package ka apna chunav.
     */
    key: 'addOns',
    type: 'relation',
    label: 'Add-ons',
    help: 'Is package pe dikhne wale add-ons',
  },
  {
    /**
     * Page ka "Questions about this package" — poora contract `schemas/faq.js` me
     * (spec 007 §2).
     *
     * Design me iska panel **"FAQs & Policies"** tha; client ne 27 Aug ko sirf FAQs maanga.
     * Policies wahin hain jahan wo pehle se the — `packageDefaults.cancellationText` (§2.1),
     * kyunki wo har package pe same hain.
     */
    key: 'faqs',
    type: 'repeater',
    label: 'FAQs',
    help: 'Is package ke apne sawaal-jawab',
  },
  {
    /**
     * `first-timers on a short break` — **ek line**, chips nahi (client, 26 Aug, D-55).
     *
     * Ye **listing card** pe dikhta hai (`tour-v3.html`), package page pe nahi:
     * `Best for <b>first-timers on a short break</b>`. Card ke chips (`2N / 3D`, `Ferry`,
     * `Breakfast`) isse alag hain — wo nights/days, transfers aur meals se derive hote hain.
     */
    key: 'bestFor',
    type: 'text',
    label: 'Best for',
    help: 'Ek line — jaise: first-timers on a short break',
  },
  {
    /**
     * `3 legs, included` — At-a-glance ka Ferries cell (spec 007 §9 #13, D-53).
     *
     * **Client khud likhta hai, derive nahi hota.** Ginti itinerary ke ferry wale dino se
     * nikaali ja sakti thi, par do dikkat thi: Transfer ek free list hai (client `Ferry`,
     * `Catamaran`, `Cruise` kuch bhi likh sakta hai) to "ye ferry hai" pehchanna bharosemand
     * nahi tha; aur "included" jaisi baat ginti se aa hi nahi sakti.
     */
    key: 'ferriesNote',
    type: 'text',
    label: 'Ferries',
    help: 'Jaise: 3 legs, included',
  },
  {
    /**
     * Is package ki apni rating — `4.8 ★ 214 reviews` (D-87, client 7 Sep).
     *
     * **D-70 yahin palta.** Wo faisla ("rating universal hai") sirf package detail page dekh
     * kar liya gaya tha; `tour-v3.html` ek **listing** page hai jahan chaudah package ek
     * doosre ke neeche khade hote hain, aur wahan har card pe ek hi number jhootha dikhta hai.
     *
     * ⚠️ **Khaali chhodna ise mitata nahi** — `packageDefaults.rating` chalti rahegi. Poora
     * tark `schemas/package-defaults.js` me `ratingSchema` ke upar hai.
     */
    key: 'rating',
    type: 'group',
    label: 'Rating',
    help: 'Is package ki apni rating. Khaali chhodo to site wali chalegi.',
  },
  {
    key: 'featured',
    type: 'toggle',
    label: 'Featured',
    help: 'Homepage aur listings me upar dikhta hai',
  },
  /*
   * `seoSchema` **hata diya gaya** (client, 4 Sep — D-82).
   *
   * Wo Slice 3 se yahan tha aur har package pe ek checkbox deta tha. Live dekhne pe do baatein
   * saaf hui: paanchon package pe wo `false` tha (yaani feature kabhi on hi nahi hua), aur ye
   * per-package faisla hai bhi nahi — site ya to structured data bhejti hai ya nahi.
   *
   * Ab wo `packageDefaults.seoSchema` hai, aur uski screen **Packages ▸ Itinerary Settings**
   * hai. Migration 022 ne purana field entries se hata diya.
   */
]

/**
 * `tourPage` ka field set — sab kuch **`tour-v3.html` ke hero** se (D-87, client 7 Sep).
 *
 * ## ⚠️ `page` ke fields yahan nahi hain, aur wo ek galti ka sudhaar hai
 *
 * D-87 ka kaam **Tour** ka tha. Slice C me faisla #2 ("koi template nahi, ek hi edit screen")
 * ko itna kheench liya gaya ki `page` ko bhi yahi field set de diya gaya — "ek hi screen" ka
 * matlab "ek jaise types" maan liya gaya.
 *
 * Client ne do kadam me wo pakda (8 Sep). Pehle: _"kal to hamne tour par kaam kiya tha, to page
 * me bhi tour ka content kyun aa raha hai?"_ Phir, aur saaf: _"Pages ▸ Add New par kuch nahi
 * aana chahiye, kyunki ispar kaam to ho hi nahi raha."_
 *
 * Isliye **`page` bilkul waisa hi hai jaisa D-87 se pehle tha** — `fields: []`, aur uski
 * screens wapas `NotBuiltYet` pe (A-9 phir se khula). Engine use pehle se sambhalta hai; jis
 * din uska kaam aayega, `EntriesList.jsx` aur `PageEdit.jsx` dono `type` se chalte hain.
 *
 * **Sabak:** scope ek faisle se nahi badhta. "Ek hi screen" screen ke baare me tha, types ke
 * baare me nahi.
 */
const TOUR_PAGE_FIELDS = [
  {
    /**
     * Page ka **dikhne wala** `<h1>` — client, 9 Sep.
     *
     * ⚠️ Iske aane se `title` ka kaam **chhota ho gaya**: ab wo slug, breadcrumb, admin ki list,
     * SEO aur schema ke liye hai — page pe chhapta nahi. Poora tark `schemas/page.js` me
     * `pageHeadingSchema` ke upar hai.
     */
    key: 'heading',
    type: 'text',
    label: 'Page heading',
    help: 'The H1 shown on the page. Leave it empty and the Title is used.',
  },
  {
    /**
     * Title ke upar ki chhoti line (faisla #13).
     *
     * ⚠️ Ye breadcrumb ka label **nahi** hai — wo parent chain se auto banta hai (faisla #12,
     * `resolvePath()`). Dono dikhne me ek jaise lagte hain aur design me paas-paas hain,
     * isliye ye chetavni yahan likhi hai.
     */
    key: 'eyebrow',
    type: 'text',
    label: 'Eyebrow',
    help: 'Title ke upar ki chhoti line',
  },
  {
    /**
     * Title ke neeche ka sub heading — **asli editor**, plain text nahi (faisla #3).
     *
     * Client ne isme bold/link maange the, isliye ye `textarea` nahi hai. Safai
     * `sanitizeEntryFields()` me hoti hai (R20).
     */
    key: 'subheading',
    type: 'richText',
    label: 'Sub heading',
    help: 'Title ke neeche ka paragraph',
  },
  {
    /**
     * `.vrail` — chaar stat cards, pehla highlighted (`--p`).
     *
     * Haath se likha jaata hai, derive nahi hota. Poora tark `schemas/page.js` me
     * `statRailSchema` ke upar hai.
     */
    key: 'statRail',
    type: 'repeater',
    label: 'Stat rail',
    help: 'Hero ke neeche ke chaar number',
  },
  {
    /**
     * Sidebar hai ya nahi, aur kis taraf — `none` · `left` · `right` (client, 8 Sep).
     *
     * ⚠️ **Kaunsa form dikhega wo yahan tay nahi hota** — client ne wo saaf kiya. Layout page
     * ka apna faisla hai, content site ka. Poora tark `schemas/page.js` me
     * `sidebarPositionSchema` ke upar hai.
     */
    key: 'sidebar',
    type: 'select',
    label: 'Sidebar',
    help: 'Is page pe sidebar dikhe ya nahi, aur kis taraf',
  },
  {
    /**
     * **Kaunsa** sidebar — `sidebars` collection ki id (D-88, client 8 Sep).
     *
     * Ye `sidebar` ka jodidaar hai, uska hissa nahi: wo **kis taraf** hai, ye **kaunsa**.
     * Admin me ye dropdown tabhi khulta hai jab `sidebar` `none` na ho — client ne yahi
     * maanga tha ("left/right chunne ke baad hi list dikhegi").
     *
     * ⚠️ **`package` pe ye field jaan-boojh kar nahi hai** — package ka sidebar hardcoded hi
     * rahega (D-88 #7). `page` aur `post` pe tab aayega jab unki screens banengi (A-9); unka
     * field set aaj bhi khaali hai aur use is kaam me kholna wahi galti hoti jo Slice C me
     * hui thi.
     */
    key: 'sidebarId',
    type: 'select',
    label: 'Which sidebar',
    help: 'Appearance ▸ Sidebar me banaye gaye sidebars me se ek',
  },
  /*
   * ⚠️ **`blocks` yahan **nahi** hai — aur wo 7 Sep ko badla (D-87 §7).**
   *
   * Kuch ghante ke liye yahan ek `blocks` group tha: layout `content` ki HTML me rehta aur
   * uske andar ke blocks ki settings `fields.blocks['blk-a1b2']` me. Client ne demo dekh kar
   * wo mana kiya — har block ab **apna panel** hai, dropdown se judta hai.
   *
   * Ab kram aur settings dono `content.blocks[]` me hain, yaani spec 002 ke FROZEN
   * `{id, type, props}` envelope me. Ise `fields` me rakhne ka koi kaaran nahi bacha, aur
   * rakhne ka matlab hota ek hi cheez do jagah.
   */
]

/**
 * `blogPage` ka field set — blog **listing** page (spec 008, client 9 Sep).
 *
 * ⚠️ **`TOUR_PAGE_FIELDS` reuse nahi kiya, aur wo jaan-boojh kar hai.** Do field wahan hain jo
 * yahan bemaani hain: `statRail` (hero ke neeche chaar number — wo `tour-v3.html` ki cheez hai,
 * `blog-v1.html` me hai hi nahi) aur `eyebrow` (client ne use **saaf mana kiya** — _"Written on
 * the islands · updated for 2026"_ hataana tha).
 *
 * Ek hi constant share karne ka matlab hota ki admin me do khaane hamesha khaali padey rahein
 * aur client poochhe ki inka karna kya hai. Ye D-87 §1 ka palan hai, uska apwaad nahi: wahan
 * `page` aur `tourPage` ka field set isliye ek tha ki dono ka **content shape** ek hai; yahan
 * shape alag hai.
 */
const BLOG_PAGE_FIELDS = [
  {
    /** Page ka dikhne wala `<h1>` — `blog-v1.html` me `The Andaman <em>travel guide</em>`. */
    key: 'heading',
    type: 'text',
    label: 'Page heading',
    help: 'The H1 shown on the page. Leave it empty and the Title is used.',
  },
  {
    key: 'subheading',
    type: 'richText',
    label: 'Sub heading',
    help: 'Title ke neeche ka paragraph',
  },
  {
    key: 'sidebar',
    type: 'select',
    label: 'Sidebar',
    help: 'Is page pe sidebar dikhe ya nahi, aur kis taraf',
  },
  {
    /**
     * ⚠️ Listing page apni sidebar **alag** chun sakta hai — post ki sidebar
     * `blogSettings.postSidebarId` se aati hai. Reference me dono alag hain hi: listing pe
     * `Topics`, detail pe `On this post`.
     */
    key: 'sidebarId',
    type: 'select',
    label: 'Which sidebar',
    help: 'Appearance ▸ Sidebar me banaye gaye sidebars me se ek',
  },
]

/**
 * `page` ka field set — text-first page, `page-template-text.html` (client, 14 Sep, D-95).
 *
 * ⚠️ **`TOUR_PAGE_FIELDS` reuse nahi kiya** — wahi tark jo `BLOG_PAGE_FIELDS` ke upar hai. Do
 * cheezein client ne page se **hatayi** (`heading` — `<h1>` Title hai, aur `eyebrow` —
 * _"Andaman beaches · updated for 2026"_), aur teen cheezein **sirf page ki** hain:
 *
 * | Field | Kyun page pe, Settings me nahi |
 * | --- | --- |
 * | `heroButton` | client: _"pages par specific rahega inside edit page"_ — Tour ka button Settings me hai |
 * | `showWhatsapp` | number Settings ▸ General ka; page sirf tay karta hai ki button dikhe ya nahi |
 * | `showToc` | Post pe ye `blogSettings` me ek baar hai; page ki sidebar hi per-page hai, to TOC bhi |
 */
const PAGE_FIELDS = [
  {
    key: 'subheading',
    type: 'richText',
    label: 'Sub heading',
    help: 'The paragraph under the title',
  },
  {
    key: 'statRail',
    type: 'repeater',
    label: 'Stat rail',
    help: 'The four numbers under the hero',
  },
  {
    /** `Plan a trip here` — `.vhero__cta` ka pehla button. Shape `heroButtonSchema` ka. */
    key: 'heroButton',
    type: 'link',
    label: 'Hero button',
    help: 'Label and link. Leave either empty and the button does not appear.',
  },
  {
    /**
     * `WhatsApp us` — doosra button. Number yahan **nahi** hai: wo `settings.whatsapp` me hai,
     * aur ek hi number do jagah rakhna wahi galti hoti jo `contactEmail` pe palti gayi thi.
     */
    key: 'showWhatsapp',
    type: 'toggle',
    label: 'Show WhatsApp button',
    help: 'The number comes from Settings ▸ General',
  },
  {
    /** `On this page` — page ke apne `<h2>` se banti hai (`withHeadingIds()`). */
    key: 'showToc',
    type: 'toggle',
    label: 'Show "On this page"',
    help: 'Contents list in the sidebar, built from the page headings',
  },
  {
    key: 'sidebar',
    type: 'select',
    label: 'Sidebar',
    help: 'Whether this page has a sidebar, and on which side',
  },
  {
    key: 'sidebarId',
    type: 'select',
    label: 'Which sidebar',
    help: 'One of the sidebars made under Appearance ▸ Sidebar',
  },
]

/**
 * `post` ka field set — **khaali** (client, 11 Sep, D-93).
 *
 * ## ⚠️ `heading` 10 Sep ko juda aur 11 Sep ko wapas gaya
 *
 * 10 Sep ko client ne kaha tha _"blog ki heading aur slug alag rahenge"_ — to `Post heading`
 * juda aur `<h1>` usse chhapta tha. 11 Sep ko palta: _"Edit/Add post will not be having Page
 * Header becouse heading will be title now no need extra same heading same title"_. Ab post
 * ka `<h1>`, card ka title, breadcrumb aur SEO — sab `title` se. Purane post ke
 * `fields.heading` DB me pade reh sakte hain; unhe koi padhta nahi (client apne 4 post ka
 * title khud theek karega).
 *
 * ## Jo yahan **nahi** hai
 *
 * - **`heading`** — upar dekho
 *
 * - **`eyebrow`** — `blog-detail-v1.html` me uski jagah category ka badge hai (`.ahead__cat`),
 *   jo taxonomy se aata hai. Ek aur free-text line dene ka matlab hota do cheezein ek hi jagah
 * - **`subheading`** — uski jagah **excerpt** hai (`.ahead__d`), jo listing card pe bhi wahi
 *   text dikhata hai. Do field rakhne ka matlab hota ki card kuch kahe aur page kuch aur (D-86)
 * - **`sidebar`/`sidebarId`** — post ki sidebar `Settings ▸ Blog settings` me ek baar chunti
 *   hai, har post pe nahi
 */
const POST_FIELDS = []

/** @type {ReadonlyArray<import('./types.js').ContentTypeSeed>} */
export const BUILT_IN_CONTENT_TYPES = Object.freeze([
  {
    key: 'package',
    label: 'Package',
    labelPlural: 'Packages',
    icon: 'package',

    /**
     * Package ka content **rich text** hai, blocks nahi (spec 007 "Scope me kya NAHI hai").
     * Phir bhi wo `content.blocks` me hi jaata hai — ek `richText` block ke andar. Ye
     * Phase 1 ka documented trap hai: aaj shortcut lene ka matlab Phase 5 me migration.
     */
    hasBuilder: false,

    /** Packages nested nahi hote — har package ek flat `/packages/{slug}` pe. */
    hierarchical: false,
    urlPattern: '/packages/{slug}',
    archiveBase: 'packages',
    hasArchive: true,

    supports: [S.TITLE, S.EDITOR, S.EXCERPT, S.FEATURED_IMAGE, S.SEO, S.REVISIONS],

    /** Destinations + Package Type — dono `taxonomies` collection me hain (spec 007 §1). */
    taxonomyTypes: ['destination', 'packageType'],

    fields: PACKAGE_FIELDS,
  },

  {
    key: 'page',
    label: 'Page',
    labelPlural: 'Pages',
    icon: 'page',

    /** Pages hi wo type hain jinke liye page builder bana hai (Phase 5). */
    hasBuilder: true,

    /** `/about/team` — parent chain se path banta hai (D-09). */
    hierarchical: true,
    urlPattern: '/{slug}',
    archiveBase: null,
    hasArchive: false,

    supports: [S.TITLE, S.EDITOR, S.FEATURED_IMAGE, S.SEO, S.REVISIONS, S.ORDER],

    /** Pages classify nahi hote — unka structure parent chain se aata hai. */
    taxonomyTypes: [],

    /**
     * ⚠️ **14 Sep se bhara hua (D-95)** — 8 Sep se yahan `[]` tha.
     *
     * 7–8 Sep ke beech kuch ghante yahan Tour ke fields aa gaye the, kyunki "ek hi edit screen"
     * ko "ek jaise types" samajh liya gaya tha, aur client ne mana kiya: _"Pages par kaam to ho
     * hi nahi raha."_ Ab Pages ka apna kaam aaya hai, apne reference ke saath
     * (`page-template-text.html`) — isliye apna field set, Tour ka nahi. Poora tark
     * `PAGE_FIELDS` ke upar hai.
     */
    fields: PAGE_FIELDS,
  },

  {
    /**
     * Tour Page — package **listing** page (`tour-v3.html`), D-87.
     *
     * ## Ye `page` se alag type kyun hai jab field set ek hi hai
     *
     * Client ne teen cheezein alag maangi (faisla #1): **apna top-level menu**, **apni
     * list**, aur apna URL. Teenon `type` se hi aati hain — ek hi type me `isTour` jaisa
     * flag rakhne ka matlab hota ki har list query, har nav item aur har permission check
     * us flag ko yaad rakhe, aur ek jagah bhoolte hi Tour Pages `All Pages` me chhap jaayein.
     *
     * ## `/{slug}` — `page` ke saath hi, aur wo jaan-boojh kar hai
     *
     * `PackagePage.jsx` ka `ARCHIVE_CRUMB` `/andaman-tour-packages/` pe link karta hai aur
     * wo aaj **404 deta hai** — koi archive page hai hi nahi. Tour page root pe hone se wo
     * link bina kisi redirect ke sach ho jaata hai.
     *
     * ⚠️ **Do type ek hi URL space share karte hain**, aur wo safe hai: `{siteId, locale,
     * path}` day 1 se unique hai (§3.1), isliye ek Page aur ek Tour Page kabhi ek hi URL
     * claim nahi kar sakte — dusra write duplicate key pe girta hai, chup-chaap overwrite
     * nahi hota.
     *
     * ⚠️ `hierarchical: false` — Tour pages nested nahi hote. `page` `true` hai (D-09,
     * `/about/team`), par ek listing page ka koi parent nahi hota aur nesting se uska URL
     * `/x/andaman-tour-packages` ban jaata, jo `ARCHIVE_CRUMB` ko phir se tod deta.
     *
     * ⚠️ `hasArchive: false` — Tour page **khud** ek archive hai. Uska apna archive banane ka
     * matlab hota "listings ki listing", jo kisi ne maangi nahi.
     */
    key: 'tourPage',
    label: 'Tour Page',
    labelPlural: 'Tour Pages',
    icon: 'page',

    /**
     * ⚠️ `true` — aur ye **7 Sep ki shaam ko badla** (D-87 §7).
     *
     * Kuch ghante ke liye ye `false` tha, kyunki us waqt ka model layout ko ek hi HTML field
     * me rakhta tha. Client ne wo mana kiya: ab content **blocks ki list** hai
     * (`content.blocks[]`), yaani theek wahi cheez jiske liye ye flag hai.
     *
     * `package` aur `post` abhi bhi `false` hain — unka content ek hi `richText` block hai
     * (D-46 §3). Yaani ye flag ab sach me batata hai ki editor kaisa khulega.
     */
    hasBuilder: true,

    hierarchical: false,
    urlPattern: '/{slug}',
    archiveBase: null,
    hasArchive: false,

    supports: [S.TITLE, S.EDITOR, S.FEATURED_IMAGE, S.SEO, S.REVISIONS],

    /** Tour page khud packages ko filter karta hai; wo apne aap classify nahi hota. */
    taxonomyTypes: [],

    fields: TOUR_PAGE_FIELDS,
  },

  {
    /**
     * Blog ka **listing** page — `blog-v1.html` (spec 008, client 9 Sep).
     *
     * ## Alag type kyun, `tourPage` me kyun nahi
     *
     * Wahi teen wajah jo D-87 §1 me `tourPage` ko `page` se alag karne ki thin: **menu, list
     * aur URL teenon alag** maange gaye hain. Client ne kaha _"blog-v1.html ka ek submenu me
     * single page banega slug (/blog)"_ — yaani wo use `Posts` ke neeche dhoondhega,
     * `Tour Pages` ke andar nahi.
     *
     * ⚠️ **`hasArchive: false` — blog page khud ek archive hai.** Aur wo do field
     * (`archiveBase`/`hasArchive`) aaj poore repo me **koi padhta hi nahi**; packages ka
     * listing bhi ek `tourPage` **entry** hi hai. Yahi raasta liya gaya hai, aur usse `path:`
     * cache tag, ISR, redirects, breadcrumb aur SEO sab muft mil jaate hain.
     *
     * ⚠️ **`hierarchical: false`** — ek listing page ka koi parent nahi hota, aur nesting se
     * uska URL `/x/blog` ban jaata.
     */
    key: 'blogPage',
    label: 'Blog Page',
    labelPlural: 'Blog Pages',
    icon: 'page',

    hasBuilder: true,
    hierarchical: false,
    urlPattern: '/{slug}',
    archiveBase: null,
    hasArchive: false,

    supports: [S.TITLE, S.EDITOR, S.FEATURED_IMAGE, S.SEO, S.REVISIONS],

    /** Listing page khud posts ko filter karta hai; wo apne aap classify nahi hota. */
    taxonomyTypes: [],

    fields: BLOG_PAGE_FIELDS,
  },

  {
    key: 'post',
    label: 'Post',
    labelPlural: 'Posts',
    icon: 'post',

    /**
     * ⚠️ **`true` — 9 Sep ko badla (spec 008).**
     *
     * Client ne kaha content ek hi editor me aa jaayega, aur wo sach hai: `blog-detail-v1.html`
     * ka poora `.art` body (h2 · table · callout · list · figure) ek `richText` me likha ja
     * sakta hai. **FAQs alag block isliye hai** ki reference ke JSON-LD me `FAQPage` hai, aur
     * wo hand-written `<details>` se bharosemand nahi banti.
     *
     * Dropdown me sirf ye do — `POST_BLOCK_TYPES` (`schemas/page.js`).
     */
    hasBuilder: true,
    hierarchical: false,
    urlPattern: '/blog/{slug}',
    archiveBase: 'blog',
    hasArchive: true,

    supports: [S.TITLE, S.EDITOR, S.EXCERPT, S.FEATURED_IMAGE, S.SEO, S.REVISIONS, S.AUTHOR],

    /**
     * ⚠️ **`tag` hata diya gaya — client, 9 Sep** (_"remove tag submenu"_).
     *
     * Sirf nav se link hataana kaafi nahi hota: taxonomy zinda rehti aur uske paas koi UI na
     * hoti — theek wahi "bana hua par juda nahi" jo D-89 aur D-90 me kai baar mila. Isliye
     * dono jagah se.
     *
     * ⚠️ Jis post pe `taxonomies.tag` bhari ho uska agla edit D-49 ke gate pe **422** khaayega.
     * 9 Sep ko asli DB me gina gaya: `post` ki ginti **0**, tag lagi hui **0** — isliye koi
     * purge nahi. **Har naye instance pe ye dobara ginna hoga.**
     */
    taxonomyTypes: ['category'],

    /**
     * ⚠️ **Khaali, aur wo soch-samajh kar hai.**
     *
     * Blog ka sab kuch `supports` se aata hai (`title` · `excerpt` · `featuredImage` ·
     * `author` · `seo`) aur article khud `content.blocks[]` me. Teen field jaan-boojh kar
     * yahan **nahi** hain:
     *
     * - **`heading`** — post ka `<h1>` uska **title hi** hai (client, 11 Sep, D-93). 10 Sep ko
     *   ek `Post heading` juda tha; wo wapas gaya. Poora hisaab `POST_FIELDS` ke upar
     * - **`sidebar` / `sidebarId`** — post ki sidebar `blogSettings` me **ek baar** chunti hai
     *   (client ne TOC pe bhi "sabke liye" kaha). Har post pe bharwana bojh hai, aur ek baar
     *   bhoolne pe us post pe sidebar chup-chaap gayab (D-42 §2)
     * - **`author` / `readTime`** — dono derive hote hain, `blogSettings.author` aur
     *   `readingMinutes()` se
     */
    fields: POST_FIELDS,
  },
])

export const BUILT_IN_CONTENT_TYPE_KEYS = Object.freeze(BUILT_IN_CONTENT_TYPES.map((t) => t.key))

/** @param {string} key */
export function isBuiltInContentType(key) {
  return BUILT_IN_CONTENT_TYPE_KEYS.includes(key)
}
