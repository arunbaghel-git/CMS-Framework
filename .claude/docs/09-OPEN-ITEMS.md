# 09 — Open Items

**Status:** Phase 0 poora, **Slice 0 (Header + Footer)** poora — D-43 / spec 006, header
aur footer dono client ke reference se match (25 Aug), footer ka data model **D-44** me
badla.

Phase 0 ke original teen backlog items abhi bhi deferred/non-blocking hain (neeche).

**Abhi ka milestone: Phase 1 — Packages (spec 007 — 🟢 approved).** Buniyaadi faisla
26 Aug ko band — Package `entries` ka ek type hai, **D-46**.
**Slice 1 (engine) · Slice 2 (master lists) · Slice 3 (API + screens) · Slice 4
(Itinerary Builder) — chaaron ban chuki hain** (D-47 se D-51), aur **public package page
shuru ho chuka hai** (D-52) — wo har slice ke saath badhega.
**Slice 5 (Pricing + Hotels) bhi ban gayi** — 27 Aug, **D-56**. Admin ke do naye panel aur
public page pe price block · catbar · hotels table · add-ons.
**Agla kaam: Slice 6 ka bacha hua hissa** — `goodToKnow[]` aur `reviews[]` + rating.
⚠️ Slice 6 ka aadha ban chuka hai: Itinerary Images ka pool + gallery Slice 4/D-52 me, aur
FAQs D-59 me. Ek sawaal khula hai — §9 #8 (rating haath se ya `reviews[]` se).

**568 tests passing** · lint · format clean.
**Last updated:** 27 Aug 2026

---

## ✅ Jo resolve ho gaya

### 19 Aug 2026

| Item                        | Faisla                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| A-1 Permission strings      | ✅ [`specs/001`](../specs/001-permissions.md) **approved** — `purge` sirf admin          |
| A-3 Env schema              | ✅ [`specs/003`](../specs/003-env-schema.md) **approved**                                |
| A-4 Seed definition         | ✅ [`specs/004`](../specs/004-seed.md) **approved** — khaali Home + Blog                 |
| B-1 Field DSL               | ✅ **Ek DSL** — [`specs/005`](../specs/005-field-dsl.md), D-24                           |
| C-1 TypeScript for packages | ✅ **Nahi** — sab JavaScript. D-03 waise hi                                              |
| C-2 Payload spike           | ✅ Approved tha — **26 Aug ko band** (D-45), neeche dekho                               |
| D-1 Vertical slice          | ✅ **Haan** — aur wo **Header + Footer** hoga. D-27                                      |
| Trash mechanism             | ✅ **`deletedAt` field**, `status: 'trash'` nahi. D-25                                   |
| `subscriber` role           | ✅ **Nahi banega**. D-26                                                                 |

### 20 Aug 2026

| Item                        | Faisla                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| **A-2 Zod contract**        | ✅ **Implemented** — [`specs/002`](../specs/002-content-contract.md), 34 tests           |
| Roles ki ginti              | ✅ **Paanch** — `salesAgent` add hua (D-29). Spec 001 update ho chuki                    |
| CSS approach                | ✅ **Plain CSS** — Tailwind / CSS Modules / CSS-in-JS teenon reject (D-28)               |
| Admin design                | ✅ **Client ka asli design ab SPEC hai** — `docs/reference/admin-design.html`            |
| Ruki hui cheezein           | ✅ **Connection point abhi, data baad me** (D-30)                                        |
| **Q-1 Login screen**        | ✅ **Design me nahi hai** — WordPress-style, design ke tokens se (D-31)                  |
| Password hashing            | ✅ **`bcryptjs`** cost 12 — native `bcrypt` nahi (D-32)                                 |
| `.env` load kaise ho        | ✅ **Node ka `process.loadEnvFile()`** — `dotenv` package nahi (D-33)                   |
| Design-change rule kahan    | ✅ `07-CONVENTIONS.md` **R15** — pehle kahin likha hi nahi tha                          |

**A-2 kahan bana:** `packages/shared/src/schemas/` — `entry.js`, `block.js`,
`content.js`, `seo.js` + `schemas.test.js`. Contract ab **frozen** hai.

### 21 Aug 2026

| Item | Faisla |
| --- | --- |
| **Users ka menu** | ✅ **Role-aware** — admin ko All Users · Add User · Profile; baaki sabko sirf Profile (D-37) |
| **Roles submenu** | ✅ **Abhi nahi banega** — role builder Phase 7 me. `GET /api/roles` read-only hi rahega |
| **Q-1 built-in role edit** | ✅ **Phase 7 pe khisak gaya** — koi role-edit UI hi nahi ban raha, to ab kuch block nahi karta |
| **Profile pe password** | ✅ **User khud badal sakta hai**, current password ke saath. D-35 §1 superseded (D-37) |
| **Admin ka reset field** | ✅ **Rahega** — koi forgot-password email flow nahi hai (SMTP pending), recovery ka ekmatra raasta |
| **Session ki umr** | ✅ **24 ghante**, aur "Remember me" pe **7 din** — dono sliding (D-38) |
| **"Remember me" ka bug** | ✅ Fix — choice ab `refreshTokens` record me, rotation ke saath chalti hai (D-38) |
| **Profile pe email/avatar** | ✅ **Nahi** — email verification flow maangta hai (SMTP), avatar Phase 2 (Media) pe block |
| **Media foundation** | ✅ Pulled forward from Phase 2: collection/indexes, local/S3 driver shape, upload hardening, WebP variants, `/api/media` upload |
| **Q-5 SVG upload** | ✅ Current policy: SVG blocked by default. Sanitized SVG support can be revisited later, but it is not a blocker |
| **Q-6 Logo stub mismatch** | ✅ Resolved by using `logoMediaId` / `faviconMediaId` and the Media upload path in Settings |
| **Settings Logo/Favicon** | ✅ Current approved scope complete: clickable drop upload, saved preview, replace/remove, IDs persisted on Save |

### 24 Aug 2026 — Slice 0 land ho gaya

| Item | Faisla |
| --- | --- |
| **Menu ka data contract** | ✅ **Frozen** — spec 006 + D-43. Typed items · mega = Columns→Groups→Links · `columnCount` aur `columns[]` alag fields |
| **Footer ka data kahan** | ✅ **Menu locations** (`footerColumn1..4`) — `04-ADMIN-UX.md` jeeta, `05-BUILD-PLAN.md` wali "settings me" wali line galat thi |
| **Public projection ki hadd** | ✅ `/api/public/settings` + `/api/public/menus/:location` — `adminEmail`/`searchEngineVisible` bahar nahi jaate, `href` resolved jaata hai (R10) |
| **Appearance ka scope** | ✅ Sirf **Menus + Footer** — Homepage Blocks aur Banners & Sliders hataye. Ek "Header" tab bina poochhe bana tha, wo **poora delete** ho chuka |
| **Header ka CTA** | ✅ `headerButtons[]` (max 4, per-button `enabled`) — `headerCtaLabel`/`headerCtaUrl` hataye. Migration nahi lagi, wo fields kabhi commit hi nahi hue the |
| **`menuType: 'button'`** | ✅ **Nahi joda** — CTA `<nav>` ke bahar baithta hai; `menuType` structural discriminator hai, look ka nahi. Nav me button chahiye to D-17 ka `className` raasta hai (`04-ADMIN-UX.md` §6.4) |
| **Q-C ordering UI** | ✅ ↑↓ buttons ki jagah **drag-drop har level pe** — native HTML5 DnD, koi library nahi; handle pe keyboard ↑/↓ bhi |

### 25 Aug 2026 — header design ke hisaab se poora

| Item | Faisla |
| --- | --- |
| **Header buttons ka shape** | ✅ `variant` (Outline/Primary/Accent) · `icon` (7 SVG) · `iconOnlyOnMobile` — client ke reference se |
| **Drawer ka layout** | ✅ Logo upar · groups apne accordion me · neeche CTA + "Call <phone>" |
| **Typography** | ✅ Inter (`next/font/google`) — `system-ui` Windows pe Segoe UI banta tha, yahi sabse bada visual farak tha |
| **D10 palta** | ✅ Mega ka CTA ab **mobile pe nahi** dikhta — jis kami se D10 liya gaya tha (drawer me CTA ka thikana na hona) wo bhar gayi. Wajah D-43 me likhi hai |
| **`.btn` ka padding/font-size** | ✅ Client ne **khud tune** kiya hai, reference se jaan-boojh kar alag. Comment code me hai — "match" karne ke naam pe wapas mat badalna |
| **Adhoori menu rows** | ✅ Ab save hoti hain, aur error batata hai **kahan** hai (`f5432f2`) |
| **Upload dir missing** | ✅ Boot pe resolved path log hota hai, folder na ho to warn (`17f3f94`) — `apps/api/uploads` gayab tha aur saari media 404 de rahi thi |
| **Footer ka data model** | ✅ **D-44** — `settings.footerColumns[]`; ginti client chunta hai (0–4), column me menu/text/dono, apni heading + width. Migration 008 |
| **Footer ke theme locations** | ✅ **Hata diye** — `footerColumn1..4` ab locations nahi. Panel me sirf `header` bacha (D-44) |
| **Social links do jagah the** | ✅ Duplicate UI Footer screen se hat gayi — Settings ▸ General hi single source (D-44 §6) |
| **Footer logo** | ✅ `settings.footerLogoMediaId` — footer + mobile drawer; khaali ho to header wale pe fallback (D-44 §4) |
| **Footer ka look** | ✅ Reference ke tokens pe — gehra neela, uppercase headings, icon wale text blocks, circular social |

### 26 Aug 2026

| Item | Faisla |
| --- | --- |
| **Footer ke phone/email clickable** | ✅ **Auto-detect** — `lib/linkify.js` render ke waqt link banata hai, data me kuch store nahi hota. Phone sirf `phone` icon wale block me, warna pincode `tel:` link ban jaate (D-44 §10) |
| **Q-8 drawer vs footer logo** | ✅ **Ek hi logo dono me theek hai** — client ka faisla. Koi code change nahi; abhi ka behaviour hi final hai. Logo aisa chuna jaaye jo gehre footer aur safed drawer **dono** pe padha jaaye |
| **spec 007 §9 #1 — Package = `entries` ka type?** | ✅ **Haan (D-46)** — client ka faisla. `packages` collection nahi banegi; engine ek hi rahega. Master lists (`hotels`, `addOns`, `transfers`, `packageDefaults`) phir bhi apni collection me — unka apna URL aur publish lifecycle nahi hai. **spec 007 ab 🟢 approved** |
| **Public package page** | ✅ **Shuru ho gaya (D-52)** — client ne 26 Aug ko chuna ki page slice ke saath badhe, Slice 7 ka intezaar na kare. Ek hi catch-all route, `GET /api/public/resolve`, aur naya `path:` cache tag — **jiske bina publish karne pe page saaf hi nahi hota tha**. Auto-301 ab sach me chalta hai |
| **spec 007 §9 #3, #12, #13** | ✅ **Teenon band (D-53)** — `Room` **hotel ke record pe** (kuch nahi badla) · category ke daam ke saath **ek chhoti line** (Slice 5 me banegi) · `Ferries` **client likhega**, derive nahi (`included` ginti se aa hi nahi sakta, aur Transfer ek free list hai) |
| **`bestFor` ka shape** | ✅ **Ek line, chips nahi (D-55)** — client ne asli listing page dikhaya: `Best for <b>first-timers on a short break</b>`. Card ke baaki chips (`2N / 3D`, `Ferry`) **derived** hain, `bestFor` nahi. Field DSL ka `tags` type bhi hata diya — uska koi caller nahi bacha. D-50 §3 superseded |
| **`availability` (Sold Out)** | ✅ **Banaya, phir hata diya (D-54)** — client ne live page dekhne ke baad kaha ki ye feature chahiye hi nahi. D-50 §1 superseded. Migration 012 **delete nahi ki**: wo apply ho chuki thi, aur file hatane se runner use "missing" report karta — 013 sirf uska index drop karti hai. Field Mongo me chhod diya (koi query use padhti hi nahi) |
| **Slice 4 — Itinerary Builder** | ✅ **Ban gaya** — din-wise builder (drag-reorder, accordion), aur **route strip ka live preview** jo poori tarah derived hai. spec 007 §9 ke teen sawaal band (**D-51**): `note` ek free line hai · `transferNote` **din pe** hai (ek hi Ferry teen duration pe chalti hai) · per-day Hotel Category **rahegi**. `fields.itinerary` ab write pe validate hoti hai |
| **A-8 — Overview ka editor** | ✅ **TipTap lag gaya** — Bold · Italic · H2 · dono lists · Link. `getJSON()` seedha `content.blocks[0].props.doc` me jaata hai, isliye **koi migration nahi lagi**: interim textarea bhi yahi doc banata tha. Image button jaan-boojh kar nahi — uske liye MediaPicker chahiye (Phase 2) |
| **Slice 3 ki screens** | ✅ **Ban gayin** — All Packages (tabs · filters · bulk actions · row actions) aur Add New/Edit. Saath me Slice 2 ki saat screens bhi: Destinations · Package Type · Hotels · Add Ons · Transfer · What's Included · Itinerary Images. Design se jo farq hain wo `04-ADMIN-UX.md` ke aakhri section me table me hain |
| **spec 007 §9 #6, #7, #9** | ✅ **Teenon band (D-50)** — `Code` column **hat gaya** (field hi nahi hai) · `Best For` **chips ki list** (field DSL me naya `tags` type) · `Sold Out` ek **alag `availability` field** hai, status nahi — sold-out package ka page live rehta hai, sirf badge lagta hai. Migration 012 |
| **A-7 — package taxonomy ka reference** | ✅ **`entry.taxonomies` generalize hua** (D-49) — ab `{categories, tags, destinations, packageTypes}`. Isse `tax:{id}` cache tag, archive aur delete guard **har type pe ek jaise** kaam karte hain. spec 002 ka contract ek baar badla, us waqt `entries` me koi asli data nahi tha |
| **A-6 — slug badalne pe 301** | ✅ **`redirects` collection ban gayi** (D-49) — auto-301, chain flatten aur loop se bachav ke saath. Descendants ke purane URL bhi zinda. Manager UI Phase 4 me hi rahegi. Migration 011 |
| **Slice 2 — master lists** | ✅ **Ban gaya** — `taxonomies` (Destinations + Package Type), `hotels`, `addOns`, `transfers`, singleton `packageDefaults`. Migration 010, 30 naye test, 14 nayi permissions. Teen faisle **D-48** me: teenon lists **ek module** me par **teen alag routes/permissions** · `locale` sirf wahan jahan unique index hai · `packageDefaults` `settings` me nahi |
| **Slice 1 — Content Core engine** | ✅ **Ban gaya** — `entries` + `contentTypes`, migration 009, 64 naye test. Paanch guard **D-47** me: create se publish nahi · published ka title badalne se URL nahi badalta · `urlPattern` entries hone ke baad lock · revision poora snapshot (path restore nahi hota) · bachche wale item trash nahi hote |
| **Route ka prefix** | ✅ `/api/<resource>`, `/api/admin/<resource>` nahi. Doc `/api/admin/*` likhta tha par code Phase 0 se hi `/api/users` pe chal raha tha — 02-ARCHITECTURE §9 ab code ke hisaab se theek hai |
| **C-2 Payload spike** | ✅ **Band — Payload nahi (D-45)**. 19 Aug ko repo khaali tha, tab sawaal sasta tha. Aaj auth/RBAC/media/settings/admin shell sab chal rahe hain (383 test), aur Payload apna admin panel laata hai — jo client ke **frozen design** (R15) se takrata hai. Uske **ideas** Phase 5 se pehle dekhenge, framework nahi lenge |

---

## 🔴 Ab bhi baaki

### Q-7 · Logo na mile to header me uski jagah **kya** dikhe?

**Deadline:** ab bhi khula — header ban chuka hai aur interim par chal raha hai (neeche)
**Client ka faisla hai, developer ka nahi (R15)**

Do case hain jinme header ko logo nahi milega:

- `logoMediaId` set hi nahi hai (naya instance, ya admin ne hata diya)
- id set hai par media resolve nahi hoti (Phase 2 me delete aane ke baad)

**Jo tay ho chuka hai (D-42 §2):** toota hua `<img>` **kabhi** render nahi hoga — na 404
wala `src`, na khaali `src`, na alt-text ka toota box. Ye ek constraint hai.

**Jo tay NAHI hua:** us jagah kya dikhe.

**Abhi ka interim (24 Aug):** logo na mile to header me **kuch bhi render nahi hota** —
nav left shift ho jaati hai. Ye ek jagah rakha gaya faisla nahi, sirf D-42 §2 ka palan
hai jab tak jawab na aaye. Code me `Q-7 INTERIM` comment hai
(`apps/web/components/SiteHeader.jsx`). Jawab aane pe **sirf ek JSX branch** badlegi —
menu ya settings ka data bilkul nahi.

| Option | Matlab |
| --- | --- |
| Site name text | `settings.siteName` wordmark ki tarah. Header kabhi khaali nahi lagta |
| Kuch bhi nahi | Logo ki jagah khaali. Nav left shift ho jaayegi |
| Placeholder | Neutral box. Live site pe "unfinished" lagta hai |

**Kyun ye khula chhoda gaya:** ye ek **visible design choice** hai. D-27 is pe chup hai,
aur public design reference (`10-REFERENCE-DESIGN.md` §4) me header ka sirf `[logo]` state
dikhta hai — missing state kahin defined nahi. Pehle draft me ye chup-chaap "site name
text" maan liya gaya tha; wo developer ka faisla ban raha tha, isliye alag kar diya gaya.

Client se poochhne wala sawaal: **logo na ho to header me uski jagah kya dikhna chahiye?**

---

### A-5 · `apps/web` ki `.env` — revalidate abhi chal nahi raha

**Deadline:** Slice 0 ko "done" kehne se pehle
**Ye ek manual step hai** — `.env` files is environment se likhi nahi ja saktin

Slice 0 ka revalidate webhook code taiyaar hai (`apps/web/app/api/revalidate/route.js`
+ `apps/api/src/core/revalidate.js`), par `apps/web` ke paas `REVALIDATE_SECRET` nahi
hai — isliye endpoint **503** deta hai aur cache kabhi saaf nahi hota.

```bash
# apps/web/.env
API_URL=http://localhost:4000
REVALIDATE_SECRET=<apps/api/.env se BILKUL same>
```

⚠️ Secret alag hua to API ko **401** milega. `revalidateTags()` fail-soft hai, isliye
admin ka Save theek dikhega par site purani rahegi — aur koi error screen pe nahi aayega.
Dono cases ka lakshan ek hi hai: _"publish kiya par site update nahi hui"_. API ke logs me
`Revalidate request rejected/failed` warning milegi.

Poori detail: [`06-OPERATIONS.md`](06-OPERATIONS.md) §4.1

---

### A-11 · Test suite kabhi-kabhi phat-ti hai — Mongo contention

**Deadline:** koi nahi — par har baar shak paida karti hai
**Koi asli bug nahi hai** — teen me se ek run me kuch files fail hoti hain, dobara chalane
pe pass

Lakshan dhokha dene wala hai: ek `beforeEach` **hook timeout** khaati hai, uski cleanup
adhoori reh jaati hai, aur uske baad ke tests _"A user with this email already exists"_ pe
girte hain — jaise koi asli bug ho. **Har file akele chalane pe pass hoti hai**, aur yahi
sabse bada surag hai.

Wajah: har `beforeEach` aath collections saaf karti hai, roles aur content types seed karti
hai, aur 3-4 users banati hai. Vitest kai files parallel chalata hai, sab ek hi local Mongo
pe.

⚠️ **Pehle iski wajah `bcryptjs` cost 12 likhi gayi thi — wo galat tha.**
`auth/service.js` test me pehle se cost **4** use karta hai; D-32 wala 12 sirf production
me lagta hai. `vitest.config.js` ka comment theek kar diya gaya hai.

`hookTimeout` 10s se 30s kiya gaya tha; usse kam hua par khatam nahi hua. **Timeout aur
badhana fix nahi hai** — wo sirf failure ko der se laata hai.

Teen asli raaste:

| Raasta | Keemat |
| --- | --- |
| `beforeEach` ke round trips ghatao — roles/contentTypes `beforeAll` me ek baar | Sabse saaf. Par tests ko ek doosre se alag rakhna padega: aaj har test maan kar chalta hai ki DB khaali hai |
| Vitest ki parallelism cap karo (`maxThreads`) | Ek line ka kaam, par poori suite dheemi ho jaati hai |
| Har file ka apna Mongo (in-memory server) | Contention poori tarah khatam, par ek nayi dependency (R3) |

---

### A-10 · Hero ka shape — client ki do baatein (26 Aug)

**Deadline:** koi nahi — aaj jo hai wo design ke hisaab se sahi hai
**Client ne dekh kar bola**, isliye ye developer ka andaaza nahi hai (R15)

Client ne live page dekhne ke baad do cheezein kahin. Dono **aaj se alag** hain, isliye
inhe likha ja raha hai — chupke se badla nahi gaya.

#### 1. Aage chal kar hero me **ek hi image** ho sakti hai, paanch nahi

Aaj `.gal` reference ka paanch-tile mosaic hai (ek bada + chaar chhote), aur wahi
`itinerary-v3.html` me hai. Client ne kaha: _"in future may be only one image ho, not 5."_

#### 2. ✅ **Ho gaya** — bada image bhi refresh pe badalta hai

Aaj bada tile **pin** hai — wo package ka apna `bannerImage` hai aur shuffle nahi hota.
Sirf chaar chhote tiles pool se aate hain aur wahi badalte hain.

Wajah jo pehle lagayi gayi thi: banner is package ki **pehchaan** hai; use har refresh pe
badalna matlab pehchaan hi badalna. Client ne ulta chaha — unke hisaab se **main image hi**
wo cheez hai jo badalni chahiye. Client ki baat maani gayi.

Ab banner aur pool **ek hi list** hain, poori list shuffle hoti hai, aur pehle paanch tiles
bharte hain. Banner list me sabse aage rehta hai, isliye chhote pool me (5 se kam images) wo
hamesha dikhta hai; bade pool me wo baaki jaisa hi ek hai.

#### Aage kya bacha — hero me ek hi image

```
aaj                              client ki disha
┌────────┬──┬──┐                 ┌──────────────┐
│ banner │P │P │                 │  pool se ek  │  ← har refresh pe naya
│ (pin)  ├──┼──┤                 │   bada image │
│        │P │P │                 └──────────────┘
└────────┴──┴──┘
```

Us soorat me `bannerImage` page ke hero se poori tarah nikal jaata hai aur sirf **listing
card** ka image bacha rehta hai (Similar itineraries, package archive — spec 007 §6.1).

**Jab ye tay ho:**

- `Gallery.jsx` me `banner` wala pin hat jaayega; shuffle poore pool pe chalega
- `.gal` ka grid ek tile ka ho jaayega (CSS me pehle se ek fallback hai jo 5 se kam images
  pe strip bana deta hai — wo iska aadha kaam pehle se karta hai)
- `bannerImage` ka field **rahega** — wo card ke liye chahiye hi
- Shuffle client-side hi rahega (spec §1.7, D-52): ISR pe server-side shuffle ka koi matlab
  nahi, wo sabko ek hi image dikhata rehta

**Kyun abhi nahi badla:** client ne kaha _"abhi ke liye sahi aa raha hai, jaisa design me
hai"_. Design (`itinerary-v3.html`) me paanch-tile mosaic hi hai, aur R15 kehta hai design
jeetega jab tak client saaf na kahe.

---

### A-9 · Pages aur Posts ki screens abhi bhi "abhi nahi bana" pe hain

**Deadline:** koi sakht nahi — par ye **engine ka bacha hua kaam** hai, naya feature nahi
**Kuch toota nahi hai** — sirf ek gap hai jiska kahin record nahi tha

D-46 ke baad `entries` + `contentTypes` ka engine chal raha hai, aur `page` aur `post`
dono types **seed me register bhi ho chuke hain**. Docs kai jagah kehte hain ki _"uske baad
Pages aur Posts sirf apne field set ki baat hain"_ (`05-BUILD-PLAN.md`, D-46).

**Par unki screens bani nahi hain.** `apps/admin/src/lib/nav.js` me unke links maujood hain
aur wo `NotBuiltYet` pe jaate hain:

```
/posts   /posts/new   /posts/categories   /posts/tags
/pages   /pages/new
```

Yaani API se aaj bhi ek Page ya Post banaya ja sakta hai, par admin me uska koi raasta
nahi hai.

**Kaam kitna hai:** Packages ki screens (`PackagesList` + `PackageEdit`) ka hi doosra roop —
dono `type` se chalti hain, hardcoded `package` unme kam jagah hai. Categories aur Tags ke
liye `TaxonomyScreen` pehle se bana hua hai (wo `type` prop leta hai), sirf do route jodne
hain.

⚠️ **Ek cheez jo Packages se alag hai:** Pages **hierarchical** hain (D-09) — unke editor me
ek "Parent" dropdown chahiye, aur list me indent. Package editor me wo hai hi nahi, kyunki
packages flat hain. Ye copy-paste se nahi aayega.

**Ye yahan isliye likha hai ki ye chup-chaap gayab ho raha tha.** Slice 1 se Slice 4 tak ka
poora kaam Packages pe kendrit raha, aur is gap ka kisi list me zikr nahi tha — wo sirf tab
dikhta jab koi sidebar me Posts pe click karta.

---

### Public page ke chaar section jo abhi bane hi nahi

**Deadline:** koi nahi — page aaj poora chalta hai, ye sections **render hi nahi hote**
**Yahan isliye hain ki inhe "TODO" kahin aur nahi likha gaya**

Design (`itinerary-v3.html`) me ye chaar hain aur hamare page pe nahi:

| Section | Kya chahiye | Kis sawaal pe ruka |
| --- | --- | --- |
| **Traveller reviews** | `reviews[]` + `ratingValue`/`ratingCount` | §9 #8 — rating haath se ya derive |
| **Similar itineraries** | koi naya field nahi, sab derived (§6.1) | §9 #15 — apne aap chunein ya haath se |
| **"Want this trip on your dates?"** (neeche ka band) | enquiry form | **Q-2** — Enquiries Phase 7b me hai |
| Sidebar ka **price + enquiry widget** | wahi enquiry form | **Q-2** |

Pehle do Slice 6-7 me aayenge. Aakhri do Enquiries ke bina adhoore rahenge — un par teen
raaste hain: form ka khaali shell (D-30 wala precedent), ya "Call/WhatsApp" button (settings
me phone pehle se hai), ya jab tak Enquiries na bane tab tak chhod dena.

---

### spec 007 §9 · Packages ke 6 baaki sawaal

**Deadline:** har sawaal ka apna slice — spec me likha hai
**Koi bhi plan ko nahi rokta.** Jo ek buniyaadi tha (#1), wo D-46 me band ho gaya.

Ye yahan isliye likhe hain ki spec ke andar rehne se `/status` jaise kisi bhi check se
chhoot jaate the — 26 Aug ko yahi hua.

| Slice | Sawaal |
| --- | --- |
| 2 | #2 What's Included aur Inclusion/Exclusion ek hi hain? · ~~#3~~ ✅ **D-53 §3** · ~~#4~~ ✅ **D-51 §2** · #5 Package Type flat ya hierarchical? · #14 `packageDefaults` naam theek hai? |
| ~~5~~ | ~~currency package pe ya settings me~~ ✅ **D-56 §2** — settings me (client, 27 Aug) |
| ~~3~~ | ~~#6 · #7 · #9~~ ✅ **teenon band — D-50** |
| ~~4~~ | ~~#10 · #11~~ ✅ **dono band — D-51** |
| ~~5~~ | ~~#12 · #13~~ ✅ **dono band — D-53** |
| 6 | #8 `ratingValue`/`ratingCount` haath se ya `reviews[]` se? |
| 7 | #15 similar itineraries — apne aap ya haath se? |
| baad me | #16 Enquiries (Q-2) — `Enq.` column aur booking form iska intezaar kar rahe hain |

Poora sandarbh: [`specs/007-packages.md`](../specs/007-packages.md) §9

---

### Q-9 · Public package page ke heading aur intro lines — static rahein ya admin se aayein?

**Deadline:** koi nahi — jab client kisi heading ko badalna chahe
**Kisi cheez ko block nahi karta.** Page aaj poora chal raha hai.

**Abhi ka niyam:** *dhaancha* static, *maal* admin se. Har section ka heading aur uske
neeche ki intro line theme ke code me likhi hui hai; admin se sirf content aata hai
(`entry.content`, `entry.itinerary[]`, `entry.faqs[]`, `packageDefaults.*`).

**Kitna static hai** — 7 heading + 7 lines:

| Text | Kahan |
| --- | --- |
| `About this itinerary` · `Day-by-day itinerary` · `What's included` (+ `Included`/`Not included`) · `Good to know before you book` · `Questions about this package` | `apps/web/components/package/PackagePage.jsx` |
| `Hotels on this package` · `Popular add-ons` | `apps/web/components/package/Pricing.jsx` |
| `Every day below can be moved…` (day-by-day intro) | `PackagePage.jsx` |
| `Rooms are held on twin sharing…` (hotels intro) | `Pricing.jsx` |
| `Added to your quote only if you want them.` (add-ons intro) | `Pricing.jsx` |
| `per person · twin sharing` (hero ka daam) | `Pricing.jsx` |
| `The day-by-day plan stays the same — only the hotels and ferry class change.` | `Pricing.jsx` (catbar) |
| `or similar` (hotels table) | `Pricing.jsx` |
| `per person on twin sharing, daily breakfast included.` (hotels table ke neeche) | `Pricing.jsx` — `PRICE_NOTE` (**D-63**: pehle ye admin ka field tha, client ne hataya) |
| `Base` · `Sea-facing` · `Beachfront` · `Villas` (hotel tabs) | `Pricing.jsx` — `TAB_NOTE` |

**Sawaal kyun hai:** client in me se **ek shabd bhi admin se nahi badal sakta**. Ye is
framework ke buniyaadi vaade se takraata hai — har client ka apna instance, par core code
sab me same. `Popular add-ons` ko `Optional extras` karna aaj ek code change hai, aur wo
change us client ke instance me hi rehna padega.

**`TAB_NOTE` sabse tez kaanta hai** (client ka faisla, 27 Aug — admin me nayi jagah dene se
mana kiya). `Sea-facing` aur `Beachfront` **Andaman ki baat hai**, jabki wo file har client
ke instance me wahi rehti hai. Agle client ke pahaadi package pe tab pe `Beachfront` likha
aayega. Isiliye wo `packages/shared` me nahi, theme layer me hai — client ka theme ise badal
sake bina core chhue.

**Teen raaste:**

1. **Aise hi rehne do** — theme ka hissa maano. Abhi yahi chal raha hai.
2. **`packageDefaults` me ek `labels{}` block** — saaton heading + paanchon line, sab
   optional; khaali ho to abhi wala text default rahe. Ek screen, ek baar bharna.
3. **Jab zaroorat pade tab** — jo heading client sach me badalna chahe, sirf usi ko field
   banao. **Mashwara yahi hai** — abhi kisi ne badalne ko kaha nahi, aur 12 field pehle se
   bana dena wahi galti hai jo D-57/D-58 me pakdi gayi thi (jo cheez pehle se hai, use
   dobara mat poochho).

---

### Q-2 · Enquiries — Phase 7b ya alag Phase 9?

**Deadline:** Phase 7 se pehle
`salesAgent` role ke permissions bhi isi pe rukey hain (spec 001 me note hai).

---

### Q-4 · Activity log — banega ya nahi?

**Deadline:** koi nahi — jab client maange
**Kisi cheez ko block nahi karta**

21 Aug ko **defer** kiya: client ke design me hai hi nahi, aur unhone maanga nahi
(`05-BUILD-PLAN.md` Phase 0 → "Activity log kyun defer hua").

Yahan sirf isliye likha hai ki ye **chup-chaap gayab na ho jaye**: iska itihaas backfill
nahi ho sakta, to jis din client ye maange, us din unhe pata hona chahiye ki purana
record kahin nahi hai.

---

### spec 006 §11 · 6 resolved decisions ka review

**Deadline:** Phase 1 se pehle
**Kuch block nahi karta** — code un decisions pe already chal raha hai

Spec 006 likhte waqt 6 sawaal khud resolve kiye gaye the (client se poochhe bina), aur
wo §11 me alag list hain. Code unke hisaab se ban chuka hai; ye sirf ek **confirm** step
hai — agar koi ulta nikla to abhi badalna sasta hai, Phase 1 ke baad nahi.

---

### Q-3 · Field DSL me `matrix` + `table` types

**Deadline:** Phase 5c se pehle
Spec 005 me add karne honge.

---

## Ab ka order

```
1. ✅ Users menu role-aware + Profile screen      (D-37 — 21 Aug)
2. ✅ Settings — model + migration + General      (D-40 — 21 Aug)
3. ✅ Media ki foundation                         (D-41 — pulled forward)
4. ✅ Settings ka Logo/Favicon live → General 100% current scope
5. ✅ Slice 0 — Header + Footer end-to-end        (D-43, 24 Aug)
6. ✅ Header design ke hisaab se poora            (25 Aug — buttons, drawer, Inter)
7. ✅ Footer ka naya data model + design          (D-44, 25 Aug — migration 008)
8. ✅ C-2 — Payload spike **band** (D-45, 26 Aug)  apna stack hi chalega
9. ✅ spec 007 — Packages 🟢 approved (D-46, 26 Aug)  Package = entries ka type
10. ✅ Slice 1 — entries + contentTypes engine    (D-47, 26 Aug — 447 tests)
11. ✅ Slice 2 — master lists + packageDefaults    (D-48, 26 Aug — 477 tests)
12. ✅ A-6 + A-7 — Slice 3 ke dono blocker band   (D-49, 26 Aug — 491 tests)
    entry.taxonomies generalize · redirects ka auto hissa
13. ✅ Slice 3 — API aur screens dono              (D-50, 26 Aug — 518 tests)
    ✅ field set · ~~availability~~ (D-54 me hata) · taxonomyTypes ka gate
    ✅ All Packages + Add New/Edit + Slice 2 ki saat screens
    ✅ A-8 — Overview ka WYSIWYG (TipTap)
14. ✅ Slice 4 — Itinerary Builder                 (D-51, 26 Aug — 538 tests)
15. 🟡 Public package page — shuru             (D-52, 26 Aug — 547 tests)
    hero · overview · route strip · itinerary · included · booking · gallery
16. ✅ Dev server tunnel/LAN se khule; CORS reject ab 403  (27 Aug — 541 tests)
    naya env var `EXTRA_CORS_ORIGINS` · spec 003 update
17. ✅ Slice 5 — Pricing + Hotels     (D-56 · D-57 · D-58, 27 Aug — 558 tests)
    pricing{} · hotels[] · addOns[] · admin ke do panel · page pe catbar + table
    chaaron category ki row hamesha; khaali daam = wo category page pe nahi
    currency, basis, GST, advance — chaaron package pe NAHI (client, 27 Aug)
    note ab hotel ke record pe; price wali line packageDefaults.priceNote se
    hotels table poori derived — rows itinerary se, hotel master list se
    package ka hotels[] sirf OVERRIDE hai (D-60), panel me ek blank row (D-61)
    add-ons global — editor me panel nahi, poori list packageDefaults se (D-61)
18. ✅ FAQs ka panel — Slice 6 se aage khiska    (D-59, 27 Aug — 565 tests)
    sirf FAQs, policies nahi; page pe <details>, koi JS nahi
19. Slice 6 — Itinerary Images pool + goodToKnow · reviews   ← agla kaam
20. Slice 7 → specs/007-packages.md §7
```

### Media Phase 2 se aage kyun khisak rahi hai

Plan me Media **Phase 2** hai (`05-BUILD-PLAN.md` §Phase 2, 1.5 hafte), aur wo Phase 1 ke
baad aati hai. Aage isliye aa rahi hai ki **Logo/Favicon do jagah ke blocker hain** —
General ka field, aur D-27 ke done-criteria ("Logo badlo, menu me item add karo, CTA ka
text badlo"). Ye wahi precedent hai jo Users (D-34) aur Settings (D-40) pe laga: plan ka
phase number apne aap koi rok nahi hai, scope client se aata hai (R15).

**Poora Phase 2 nahi ban raha — sirf foundation (~40%):**

```
media collection + indexes (migration 006)
storage driver abstraction     local abhi, s3 ka interface taiyaar
upload hardening               magic-byte · size cap · filename sanitize · sharp pixel limit
sharp variants + webp          "original kabhi serve mat karo"
Settings me Logo/Favicon       clickable drop upload · saved preview · replace/remove
                               local `/uploads` preview works via API static serving + Vite proxy
```

**Baad me (Phase 2 me hi):** library grid · folders · media trash · `mediaRefs` usage ·
crop/rotate · replace · `<MediaPicker />` · S3 driver ka asli implementation.
Yaani Phase 2 ka budget zyada nahi ghatta — sirf ~3-4 din aage khiskte hain.
Settings ke Logo/Favicon bhi tab MediaPicker use karenge; current scope me clickable
drop-zone direct upload final enough hai. Favicon-specific `512x512` dimension validation
also deferred to later Media validation work and is not a current General blocker.

**Delete jaan-boojh kar nahi banega.** `mediaRefs` ke bina delete = live page pe toota
hua image (`08-RISKS` ka documented trap). Delete hi na ho to wo trap lag hi nahi sakta.

**Later phases se takrav nahi hoga, teen shart pe:**

| Shart | Kyun |
| --- | --- |
| Collection ka shape `02-ARCHITECTURE.md` §3 se lo (`folderId`, `deletedAt` day-1 reserve) | Phase 2 me folders + trash ko migration nahi chahiye |
| Index `{ siteId: 1, folderId: 1, createdAt: -1 }` abhi bana do | Wo pehle se documented hai (§3.2) |
| Variant + URL scheme **aaj freeze** karo, `D-41` likh kar | Files us scheme pe upload ho gayin to badalna = stored URLs rewrite karna |

`settings.logoMediaId` aur `faviconMediaId` **pehle se model me hain**, aur `/media` +
`/uploads` pehle se reserved slugs hain — Settings ke schema ko haath lagane ki zaroorat
nahi.

**Original Phase 0 backlog jo deferred hai** (koi bhi Slice 0 ko block nahi kar raha):

| Item | Kab karein |
| --- | --- |
| Docker compose me `api` + `admin` service | Chhota kaam — abhi `pnpm dev` se chalta hai |
| CSP policy (nonce-based) | Phase 4-5 — asli matlab page builder aur `settings.scripts` ke saath hai |
| `forgot` / `reset` auth routes | **SMTP pe block** — SMTP work ke saath |

**Phase 0 me kya ho chuka:** monorepo + workspaces, docker-compose, ESLint/Prettier,
CI, Express boilerplate, Zod contract, migration runner, CSS architecture,
**auth + RBAC + admin shell** (login, protected routes, sidebar, `/api/me`).

**Phase 0 approved execution scope me kya baaki:** kuch nahi. Upar wali teen cheezein
deferred backlog hain; teenon me se koi Slice 0 ko block nahi kar rahi. Seed ka baaki
hissa (content types, taxonomies, entries) Phase 1 pe hai.

**Users me kya baaki:** bulk actions, email badalna (SMTP), avatar (Media pe block).
Column sorting **ban chuki hai**. Posts/Enquiries counts Phase 1 aur 7b pe block hain.

---

## Housekeeping

- ✅ `git init` ho chuka — branch `main`, remote `origin` configured
- ✅ R15 likh diya gaya — design change client se aata hai
- ⚠️ **Local commits `origin/main` se aage hain.** Ginti yahan jaan-boojh kar nahi likhi —
  wo har commit pe purani ho jaati thi aur do baar galat mili. Sach `git log --oneline
  origin/main..HEAD` se lo. **Rule wahi hai: push sirf permission pe.**
- ⚠️ **CI ka pehla step `pnpm format:check` hai** (`.github/workflows/ci.yml`:
  Format → Lint → Test → Build). `3c29b58` isi pe fail ho raha tha — 9 files prettier-dirty
  thin, ab theek ho chuki hain. Push se pehle `pnpm format:check` **hamesha** chala lo,
  warna CI pehle hi step pe red ho jaata hai
- ⚠️ **`EXTRA_CORS_ORIGINS` (27 Aug) `.env.example` me hai ya nahi — verify karo.** Var
  optional hai isliye kuch tootega nahi, par jis din admin tunnel/LAN se khulega us din
  ye pehli cheez hai jo chahiye hogi (spec 003)
- ⚠️ **`apps/api/.env.example` me `REFRESH_TOKEN_TTL_REMEMBER=7d` add karna hai** aur
  `REFRESH_TOKEN_TTL` ko `24h` karna hai. Var ka default code me hai isliye kuch tootega
  nahi, par example file batati nahi
- ⚠️ Repo ka naam **`crmmern`** hai par project **CMS** hai — rename karna ho to abhi sasta hai
- ⚠️ `CLAUDE.md` `.claude/` ke andar hai. Load to ho rahi hai, par root pe rakhna
  zyada reliable hai
- `docs/archive/` purane versions hain. Git history ab hai, isliye kabhi bhi hata sakte ho

---

## ✅ Local setup ke do kaante — theek ho chuke (20 Aug)

Dono `apps/api/.env` me the. Backup: `apps/api/.env.bak-1787215917` (gitignored).

| Kya tha | Ab | Kyun maayne rakhta tha |
| --- | --- | --- |
| `COOKIE_SECURE=true` | `false` | `Secure` cookie plain HTTP pe browser store hi nahi karta — login 200 deta par session tikta nahi |
| `MIGRATIONS_DIR=../../migrations` | absolute path | cwd-relative tha; `pnpm cms` root se chalta hai, to ye `C:Usersdeepamigrations` pe resolve hota tha |

Dono ke peeche **code ke bug** bhi mile, wo bhi theek ho chuke:

- `z.coerce.boolean()` `Boolean('false') === true` deta hai — yaani `COOKIE_SECURE`
  kabhi off ho hi nahi sakta tha. Ab proper `envBoolean` + 10 test
- Migration runner missing directory pe chup-chaap `[]` lautata tha — `pnpm cms
  migrate` "koi pending nahi" bol kar exit 0 deta. Ab loud error, aur boot pe bhi log
