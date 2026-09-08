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
**Slice 6 aur 7 ke bache hue section bhi ban gaye (1 Sep)** — Traveller reviews (**D-70**)
aur Similar itineraries (**D-71**). Dono ke sawaal client ne band kar diye: §9 #8 → rating
**haath se** (`reviews[]` se gini nahi jaati), §9 #15 → similar **apne aap** chunte hain.
`goodToKnow[]` banega hi nahi (**D-68**).

**Q-2 poora band ho gaya (3 Sep — D-75, phir D-76).** 1 Sep ko Enquiry Forms + Add New Form
bane (D-72) aur package page ke sidebar me sach me chalta hua form aaya; **3 Sep ko inbox** —
All Enquiries · Enquiry Detail · Export CSV (date range filter ke saath). Usi din client ne
use chala kar **chhota bhi kar diya** (D-76): submenu me sirf teen item, detail pe sirf
Status, aur Notes/Quick Actions dono hat gaye. Email ab bhi nahi (SMTP Phase 0 se blocked).

**A-5 band ho gaya (31 Aug)** — `apps/web/.env` ban gayi, revalidate ab configured hai.
**Q-9 ka bada hissa bhi band (31 Aug — D-65)** — section ke heading aur unke neeche ki lines
ab admin se aati hain. Saath me ek chup bug bhi nikla: `cancellationText` public payload me
ja hi nahi raha tha.

**1 Sep — section ki description ab rich text hai (D-69)** — har section pe wahi TipTap
editor jo Overview pe hai. Migration **015**. Client (unke senior ka order): textarea me
bold/heading/list ban hi nahi sakti.

**3 Sep — editor ab TinyMCE, saara page content HTML (D-80).** spec 002 ka **doosra** badlaav,
migration **020**. Client ko Classic Editor jaise **Visual + Text** do tab chahiye the aur
`class`/`id`/inline `style` likhne pe kuch gayab na ho — TipTap wo kar hi nahi sakta (wo
schema-based hai). ⚠️ Iske saath **XSS ki problem ab hum paal rahe hain** — keemat `rich-doc.js`
me D-69 ke waqt pehle se likhi thi.

**3–4 Sep — Bulk Upload (D-81).** Google Sheet + Docs se package pages, **bina kisi Google
account ke** (`export?format=csv|html` anonymous 200 deta hai). Migration **021**. 4 Sep ko
client ki asli sheet pe pehla end-to-end chala.

**4 Sep — Itinerary Settings aur structured data ki teen galtiyaan (D-82).** `aggregateRating`
ab `Product` node pe (Trip pe wo valid hi nahi tha), har din ek `subTrip`, `stripTags` ka
vaakya-chipkane wala bug, aur `seoSchema` per-package se hat kar `packageDefaults` me
(**paanchon package pe `false` mila tha** — feature bana kar rakha gaya aur kabhi chala nahi).
Migration **022**.

**4 Sep — ISR cache sach me on hua (D-83).** `fetch(url, { next: { tags } })` Next 15 me kuch
cache karta hi nahi (default `no-store`) — poora revalidate dhaancha teen hafte inert pada tha.
Ab `revalidate` tags ke **saath** hai, unki jagah nahi.

**764 tests passing** (31 files) · lint clean · format clean — 4 Sep ko verify kiya.
**Last updated:** 4 Sep 2026 (TinyMCE D-80 · Bulk Upload D-81 · Itinerary Settings +
structured data D-82 · ISR cache D-83)

⚠️ **Push:** `origin/main` abhi bhi `f0b7964` (2 Sep) pe hai — **28 commit unpushed**. Push se
pehle A-12 padho: CI un sab pe red aayegi, aur wo red environment ki wajah se hai, code ki nahi.

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

### 31 Aug 2026

| Item | Faisla |
| --- | --- |
| **Q-9 section ke heading + lines** | ✅ **Bada hissa band — D-65.** 7 section ke heading aur unke neeche ki lines ab admin se aati hain (`packageDefaults.sectionLabels`, screen **Packages ▸ Section Headings**). Client ne teen raaston me se **#2** chuna, aur har section ko heading **aur** description dono diye — chahe aaj us section pe line ho ya na ho. Khaali `description` line ko **hata** deti hai (khaali `heading` pe theme ka heading wapas aata hai). Chhoti inline lines (`or similar`, `PRICE_NOTE`, `TAB_NOTE`) abhi bhi static — Q-9 usi ke liye khula hai |
| **`cancellationText` payload me nahi tha** | ✅ **Chup bug, 31 Aug ko pakda aur theek kiya** (D-65). `PackagePage.jsx` do jagah use padhta tha par public projection use bhejti hi nahi thi — client ki likhi cancellation policy page pe **kabhi** nahi aati thi, aur "Good to know" section sirf tab dikhta tha jab booking steps bhi hon. Wahi shakl jo D-64 wale transfer-duration bug ki thi |
| **A-13 booking steps ka UI** | ✅ **Ban gaya (1 Sep)** — `Packages ▸ Section Headings ▸ Good to know` wale tab me (pehle alag submenu banaya tha; client ne palta — page pe wo **ek hi section** hai). `bookingSteps` aur `cancellationText` poore raaste par pehle se the (schema · service · payload · theme) par **bharne ki jagah nahi thi**; isliye client ne unka content Section Headings ki description me type kar diya tha, jahan wo numbered list nahi banta. Client ka data bhi hilaya gaya — warna wo text page pe do baar chhapta |
| **A-5 `apps/web` ki `.env`** | ✅ **Ban gayi — revalidate ab configured hai.** `API_URL=http://localhost:4000` aur `REVALIDATE_SECRET` (`apps/api/.env` se **bilkul same** — verify kiya: dono 42 chars, ek hi fingerprint). Endpoint ab galat secret pe **401** deta hai, `503` nahi — yaani secret load ho chuka hai. `SITE_URL` bhi web pe hi point karta hai (`localhost:3000` API ki CORS allowlist me mila). ⚠️ **Next `.env` sirf boot pe padhta hai** — file banane ke baad web dev server restart karna zaroori hai, warna 503 aata rahega |

---

## 🔴 Ab bhi baaki

### A-18 · `importRuns` aur `importruns` — do collection ban gayi hain (4 Sep)

**Deadline:** koi nahi — aaj kuch toot nahi raha
**D-86 ki jaanch me dikhi**, us kaam ka hissa nahi thi

```
importRuns  ->  0 documents
importruns  -> 20 documents   ← asli data yahin hai
```

Mongoose collection ka naam apne aap lowercase kar deta hai, isliye service `importruns` me
likhti hai. `importRuns` shayad **migration 021** ne banayi (wo `db.collection('importRuns')`
jaisa kuch chalati hogi).

⚠️ **Dekhne wali baat:** agar us migration ne **index** `importRuns` pe banaye hain, to wo
khaali collection pe pade hain aur **asli data bina index ke** chal raha hai. Aaj 20 hi run
hain to farak nahi padta; ye tab kaat-ta hai jab list dheemi hone lage aur wajah samajh na aaye.

Karne wala kaam: migration 021 padho, dekho wo kaunsa naam use karti hai, aur ya to naam theek
karo ya model me `collection: 'importRuns'` pin kar do. Khaali collection tab hata dena.

⚠️ **Data mat hatao pehle** — pehle pakka karo ki `importRuns` sach me khaali hai.

---

### A-17 · Speed — naap ho chuki hai. Mobile **91**, desktop **98** (4 Sep)

> **Update (4 Sep, shaam):** naap ho gayi — **D-85**. Neeche wala "naapa nahi gaya" wala
> hissa us waqt ka hai jab sirf D-84 hua tha.
>
> | | Pehle | Ab |
> | --- | --- | --- |
> | Mobile | 68 | **91** |
> | Desktop | — | **98** |
> | LCP | 6.5s | 3.35s |
> | CLS | 0.147 | **0** |
> | TBT | 150ms | 103ms |
>
> **100 abhi nahi mila, aur sirf LCP ki wajah se** (3.35s, chahiye <2.5s). FCP · TBT · CLS · SI
> chaaron poore number pe hain. LCP ab **bandwidth** ka sawaal hai: emulated 1.6 Mbps par is
> page ka saara saamaan ~440 KB hai aur utna utarne me hi ~2.2s lagte hain.
>
> **Do raaste bache hain, dono me kuch dena padta hai:**
>
> | Raasta | Faayda | Keemat |
> | --- | --- | --- |
> | Naya **~480w image variant** | ~120 KB kam — gallery ke chaar chhote tile abhi 800px wali image uthate hain jabki unhe 320px chahiye (`thumb` 300 aur `medium` 800 ke beech kuch hai hi nahi) | D-41 ke variants badlenge, aur purani media ka **backfill** — original store hoti hi nahi, to naya variant `large` se banana hoga |
> | Page chhota karna | HTML 221 KB, 1366 element — dono seedha LCP pe | Ye **content ka faisla** hai, code ka nahi (R15) |
>
> ⚠️ **Do badlaav aise hain jinka dikhne wala asar hai — client ko batana zaroori hai:**
>
> 1. **`content-visibility`** — pehli baar scroll karte waqt **scrollbar apna naap badalta hai**
>    (mobile ~790px, desktop ~1340px). Ye TBT ko 834ms se 128ms laata hai
> 2. **₹ ab machine ke apne font ka hai**, Inter ka nahi — kyunki Inter ka wo glyph 85 KB ki
>    alag file me hai aur wo ek character 34 baar aata hai
>
> ⚠️ **Naapne ka tareeka bhi likh liya jaaye:** `next build` + `next start` par, **5 run ka
> median**. Is machine pe noise 2× tak hai (`benchmarkIndex` 1317–2536) — ek run ka number
> bekaar hai, aur **dev server pe naapna to bilkul hi bekaar hai**.

**Deadline:** client khud Lighthouse chala kar number dega
**Client ka lakshya:** _"Make sure it is fast, can serve page from cache and score of 100 in
Google Page Speed, All pages."_

**Jo ho chuka (D-84):** media ab `immutable` (pehle `max-age=0` tha — 12 image, 12 round trip,
har visit), har image pe `srcset` + `sizes`, 12/12 pe `width`/`height` (pehle 6/12 — CLS),
hero pe `fetchpriority="high"`, aur `Lightbox` click pe load hota hai.

**Jo baaki hai — sirf naapna:**

| Kaam | Kyun |
| --- | --- |
| Production build pe Lighthouse | ⚠️ **dev server pe naapa hua number bemaani hai** — na minification, na HTML ka cache, aur dev overlay ka apna JS. Tunnel abhi dev pe hi jaata hai |
| Uske baad hi hero shuffle ka faisla | Wo LCP bigaadta hai ya nahi — **abhi tak sirf theory hai**, naap nahi. Naap se pehle us feature ko chhedna galat hoga |

⚠️ **Scope ki baat jo "all pages" se pehle jaanni chahiye:** site pe aaj **paanch hi page**
hain, paanchon package. `/` khud **404** deta hai (koi home entry nahi hai), aur Pages/Posts
ke template bane hi nahi (**A-9**). "All pages 100" ka matlab aaj paanch package page hai.

⚠️ **Ek maloom trap:** `immutable` sirf isliye likha ja saka ki media ka URL kabhi badalta
nahi (path me media id + variant ka naam dono hain). **Jis din "replace file" banega** (aaj
D-79 me scope se bahar), ya to replace naya `_id` de ya URL me content hash jude — warna
browser purani image saal bhar dikhata rahega aur server uska kuch nahi kar sakta.

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

### A-16 · `pnpm test` asli uploads folder mita deta tha — ✅ **theek ho gaya (2 Sep)**

**Code wala hissa band.** Ek hissa abhi baaki hai: `UPLOAD_DIR` repo ke **bahar** (neeche).

Client kai dinon se ye keh raha tha: _"jo images admin me upload karta hu, koi change karne
ko bolu fir wo frontend par visible kyu nahi hoti, mujhe fir se upload karna padta hai har
baar."_

**Wajah `media.test.js` se bhi badi nikli.** Pehle sirf test ki `beforeEach` par shak tha,
par asli jad `vitest.config.js` me thi:

```js
// vitest.config.js — har test file pe lagti hai
UPLOAD_DIR: './uploads',   // ← apps/api/uploads, dev ka ASLI folder

// media.test.js
const UPLOAD_ROOT = path.resolve(process.cwd(), 'apps/api/uploads')  // hardcoded
beforeEach(async () => {
  await rm(UPLOAD_ROOT, { recursive: true, force: true })
```

Yaani do alag jagah ek hi asli folder pe point kar rahi thi: test me chalne wali **app**
wahan likhti thi, aur **test** use har baar `rm -r` kar deta tha. Sirf test ka path badalna
aadha fix hota — app phir bhi asli folder me likhti rehti.

Lakshan isiliye itna uljha hua tha: **DB ke records bache rehte hain**, sirf files jaati
hain. Admin ki Media list bhari hui dikhti hai, aur frontend pe wahi image 404 deti hai. Aur
kyunki files sirf tab jaati hain jab koi test chalata hai, client ko lagta tha ki wajah
"code change" hai — jabki wajah change ke **baad chalne wala test** tha.

⚠️ **Pehli theory galat thi.** Is par pehle `git clean -fdx` ka shak likha gaya tha
(`uploads/` gitignored hai, to theory theek baithti thi). Wo galat tha — wajah repo ke apne
test setup me thi. Purani theory par aage koi kaam mat karna.

**Kya laga (2 Sep):**

| Kaam | Kya hua |
| --- | --- |
| `vitest.config.js` ka `UPLOAD_DIR` | ab `./.test-uploads-media` — test me chalne wali app asli folder ko chhooti hi nahi |
| `media.test.js` ka `UPLOAD_ROOT` | ab `getStorageDriver().root` se aata hai, hardcoded nahi — jahan app likhti hai **theek wahi** saaf hota hai, dono drift kar hi nahi sakte |
| Ek guard | root `.test-` se shuru na ho to file **chalne se pehle** throw karti hai — data mitne ke baad nahi |
| `afterAll` cleanup | throwaway folder peeche nahi rehta; `.gitignore` me `.test-uploads*/` bhi juda |

**Verify kiya:** poori suite (26 file · **624 test**) chalane ke baad `apps/api/uploads` ki
files jaisi ki waisi bachi rahin, aur guard ki dono soorat alag se jaanchi gayi.

**Ab bhi baaki — doosri deewar:** `apps/api/.env` me `UPLOAD_DIR` repo ke **bahar** ho
(jaise `C:/Users/deepa/cms-uploads`). Uske baad koi test, build ya `git clean` usse chhoo hi
nahi sakta. D-41 absolute path pehle se allow karta hai. Ye file permissions ki wajah se
2 Sep ko nahi badli ja saki — client khud badlega, aur purani files nayi jagah move karni
hongi.

⚠️ Jo files pehle ja chuki hain wo **wapas nahi aayengi** — disk se mit chuki hain aur git
me thi nahi. Ek baar phir upload karni padengi.

Ek sabak bhi hai, aur wo D-42 §2 se juda hai: public API sirf **DB record** dekh kar `null`
bhejti hai. Record maujood par file gayab — wo soorat wo pakad hi nahi sakti. Isiliye ye
failure itni chup thi.

Aur ek: **`storage.test.js` ne yahi galti nahi ki thi** kyunki wo apna folder khud banati
hai. Farak sirf itna tha ki `media.test.js` app ko `createApp()` se chalati hai, aur app ka
folder config se aata hai — isliye us file ko config se **judna** padta tha, na ki apna path
likhna.

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

> ⚠️ **Ek din ke liye Pages ka hissa band ho gaya tha, phir wapas khul gaya (8 Sep).**
>
> D-87 Slice C me Pages ki screens ban gayi thin — par **wo kaam scope me tha hi nahi**, D-87
> Tour ka kaam tha. Client ne wo mana kiya: _"Pages par kaam to ho hi nahi raha."_ Screens wapas
> `NotBuiltYet` pe hain aur `page` ka field set phir se khaali hai.
>
> ✅ **Ek cheez bach gayi, aur wo asli faayda hai:** ab in screens ka **saancha maujood hai** —
> `EntriesList.jsx` aur `PageEdit.jsx` dono `type` se chalte hain, aur `lib/use-entries.js` ke
> hooks kisi bhi content type pe chalte hain. Jis din Pages ya Posts ka kaam aayega, wo screens
> dobara likhni nahi padengi: `TYPE_CONFIG` me ek row, aur do route.
>
> ⚠️ **Neeche wala purana andaza galat nikla** — usme likha tha ki ye "Packages ki screens ka hi
> doosra roop" hoga aur `PackagesList`/`PackageEdit` `type` se chal jaayengi. Asli kaam ulta
> hua: un screens ko **chhua hi nahi gaya** (unke apne filter aur bulk actions package ke domain
> ke hain). Jo sach me share hua wo **data hooks** the, screens nahi.

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

⚠️ **Upar wale "Kaam kitna hai" wala andaza galat nikla.** Usme likha tha ki ye "Packages ki
screens ka hi doosra roop" hoga aur `PackagesList`/`PackageEdit` `type` se chal jaayengi.
Slice C me asli kaam ulta hua: un screens ko **chhua hi nahi gaya** — unke apne filter,
`From price` column aur Featured wale bulk action package ke domain ki cheezein hain, aur unhe
props se on/off karna wahi component banata jise koi chhoona nahi chahta. Jo sach me share hua
wo **data hooks** the (`lib/use-entries.js`), screens nahi.

Parent dropdown wali chetavni **sahi** nikli — wo `PageEdit.jsx` me bana hua hai, aur Tour page
pe bhi chalta hai (wahan wo URL nahi badalta, sirf breadcrumb banata hai).

---

### Public page ke chaar section jo abhi bane hi nahi

**Deadline:** koi nahi — page aaj poora chalta hai, ye sections **render hi nahi hote**
**Yahan isliye hain ki inhe "TODO" kahin aur nahi likha gaya**

Design (`itinerary-v3.html`) me ye chaar the. **Chaaron ban gaye** — ek 31 Aug ko, teen
1 Sep ko:

| Section | Kya laga | Kab |
| --- | --- | --- |
| ~~**Traveller reviews**~~ | ✅ `reviews` collection + `packageDefaults.rating` | **D-70** |
| ~~**Similar itineraries**~~ | ✅ poori tarah derived, koi field nahi | **D-71** |
| ~~**"Want this trip on your dates?"**~~ | ✅ button + uska target field | **D-67** |
| ~~Sidebar ka **price + enquiry widget**~~ | ✅ `forms` module, khol design ka | **D-72** |

> Is section ka kaam khatam ho gaya. Ye heading yahan **itihaas** ke liye hai: yahi wo list
> thi jo kahin aur "TODO" likhi hi nahi gayi thi, aur usi wajah se do mahine chup padi rahi.

**Q-2 ka atkav is band pe khul gaya (31 Aug).** Client ne teen raaston me se chautha chuna:
_"button to form par hi jata hai par abhi bana nahi hai to abhi fields bana do jisse bad me
bhej sake."_ Yaani section **poora ban gaya** aur button ka target ek **field** hai — jis
din form bane, sirf ek value bharni hai. Khaali URL pe button dikhta hi nahi (D-30).

⚠️ Sidebar wala widget abhi bhi Q-2 pe hai — wahan asli **form** chahiye, sirf ek link nahi.

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
| ~~6~~ | ~~#8 rating haath se ya `reviews[]` se~~ ✅ **D-70** — **haath se** (client, 1 Sep) |
| ~~7~~ | ~~#15 similar itineraries — apne aap ya haath se~~ ✅ **D-71** — **apne aap** |
| baad me | #16 Enquiries — **aadha band (D-72)**. Form ban gaya; inbox aur email baaki. `Enq.` column client ne **hata diya** (1 Sep) |

Poora sandarbh: [`specs/007-packages.md`](../specs/007-packages.md) §9

---

### Q-9 · Page ki chhoti inline lines — static rahein ya admin se aayein?

**Deadline:** koi nahi — jab client inme se kisi ko badalna chahe
**Kisi cheez ko block nahi karta.** Page aaj poora chal raha hai.

> ✅ **Iska bada hissa 31 Aug ko band ho gaya — D-65.** 7 section ke **heading aur unke
> neeche ki lines** ab admin se aati hain (`packageDefaults.sectionLabels`, screen:
> **Packages ▸ Section Headings**). Client ne teen raaston me se **#2** chuna. Neeche sirf
> wo bacha hai jo abhi bhi theme me likha hua hai.

**Abhi ka niyam:** _dhaancha_ static, _maal_ admin se. Section ke heading aur lines ab admin
se aa gaye; jo bacha hai wo **section ke heading nahi** hain — wo table ke andar ke shabd
aur chhoti inline lines hain.

**Kya abhi bhi static hai:**

| Text | Kahan |
| --- | --- |
| `per person · twin sharing` (hero ka daam) | `Pricing.jsx` |
| `The day-by-day plan stays the same — only the hotels and ferry class change.` | `Pricing.jsx` (catbar) |
| ~~`or similar` (hotels table)~~ | ✅ **hat gaya** — 31 Aug, client: "jo name hoga wahi dikhega, apne side se add mat karo" (D-65 amendment 4) |
| `per person on twin sharing, daily breakfast included.` (hotels table ke neeche) | `Pricing.jsx` — `PRICE_NOTE` (**D-63**: pehle ye admin ka field tha, client ne hataya) |
| `Base` · `Sea-facing` · `Beachfront` · `Villas` (hotel tabs) | `Pricing.jsx` — `TAB_NOTE` |
| `Included` / `Not included` (What's included ke do column) | `PackagePage.jsx` — section ka heading nahi, column ka label hai |

**`TAB_NOTE` sabse tez kaanta hai** (client ka faisla, 27 Aug — admin me nayi jagah dene se
mana kiya). `Sea-facing` aur `Beachfront` **Andaman ki baat hai**, jabki wo file har client
ke instance me wahi rehti hai. Agle client ke pahaadi package pe tab pe `Beachfront` likha
aayega. Isiliye wo `packages/shared` me nahi, theme layer me hai — client ka theme ise badal
sake bina core chhue.

**Mashwara — abhi kuch mat karo.** D-65 ne wo sab de diya jo client ne maanga tha. Ye bachi
hui lines abhi kisi ne badalne ko kahi nahi, aur unke liye pehle se field bana dena wahi
galti hai jo D-57/D-58 me pakdi gayi thi (jo cheez pehle se hai, use dobara mat poochho).
Jis din `TAB_NOTE` sach me kisi doosre client pe galat lage, wo apne aap sabse pehla
candidate hai.

---

### A-15 · Design-check ki dono script me blind spot hain

**Deadline:** koi nahi — par jo bhi drift inme se guzar jaaye, wo poore page pe hoti hai
**1 Sep ko dono ne ek saath kaata**

`css-diff.mjs` aur `media-diff.mjs` reference se milaan karti hain, par do kism ka farak
unke check me **aata hi nahi**:

| Kya chhoot jaata hai | Kyun | 1 Sep ko kya hua |
| --- | --- | --- |
| bare element selectors (`p`, `ul`, `body`) | `css-diff.mjs` me ek **hardcoded class-prefix allowlist** hai (`PREFIXES`), aur `media-diff.mjs` sirf `@media` blocks dekhti hai | `p { margin: 0 }` hamare paas tha hi nahi — **har** `<p>` pe 16px extra |
| hamari taraf ki **extra** property | script sirf `ref → ours` milaati hai; jo property reference me hai hi nahi, uska koi milaan hota hi nahi | `.steps { padding: 0 }` — reference me 40px default bacha rehta hai, hamare cards align ho gaye |

Dono me se koi bhi ek **page-wide** layout badal sakti hai, aur dono baar pakda **client ne**,
kisi script ne nahi.

**Kaam:**

1. `css-diff.mjs` ka `PREFIXES` allowlist hataa kar ek **denylist** banao — reference ke wo
   sections chhodo jo hamare paas hain hi nahi (`.hawards`, `.vrail`, `.clogos`…), baaki sab
   milao. Tab bare element selectors apne aap aa jaayenge.
2. Ulta milaan bhi karo — **hamari taraf ki extra property** report ho, "sirf hamare paas" ki
   ek alag list me. Har extra property galat nahi hai (bahut si jaan-boojh kar hain), isliye
   wo warning ho, error nahi.

⚠️ **Ek shart:** script ko un values pe chup rehna chahiye jinpe **comment likha hai** — wo
client ke hand-tuned faisle hain (jaise `.steps b` ka 4px, `.btn` ka padding). Warna har run
pe wahi purani bahas wapas aayegi.

**Andaza:** 2-3 ghante.

---

### A-14 · `What's Included` bhi apne tab me jaana chahiye

**Deadline:** koi nahi — aaj sab kaam karta hai
**1 Sep ko nikla** — A-13 ke merge se

Client ne "Good to know" ka content ek jagah karwaya, aur uska niyam saaf hai:

> **Admin ka dhaancha page ke section follow karta hai, collection ke field nahi.**

Usi niyam se `What's Included` bhi apna sidebar item nahi hona chahiye — wo bhi page ka ek
section hai (`#included`), aur uska heading/description pehle se `Section Headings` ke tab me
hai. Yaani us section ka content abhi bhi **do jagah** hai — theek wahi shakl jo booking pe
thi.

⚠️ **Ye khud ek screen-level tabdeeli hai**, isliye A-13 ke saath nahi kiya gaya: client ne
sirf "Good to know" kaha tha, aur bina poochhe doosri screen hatana wahi galti hoti jo D-43
me "Header tab bina poochhe bana diya" pe hui thi.

**Kaam:** `whatsIncluded` ke do textarea `included` wale tab me le jaao, aur sidebar se wo
item hata do. `Itinerary Images` iske daayre me **nahi** hai — wo kisi ek section ka content
nahi, poore page ka image pool hai.

---

### A-12 · CI green ho hi nahi sakti — na Mongo hai, na API

**Deadline:** koi sakht nahi, par **har push red aata hai**
**31 Aug ko pakda** — pehla `pnpm build` local pe chalane par

`.github/workflows/ci.yml` `ubuntu-latest` pe chalta hai: Format → Lint → Test → Build.
Usme **koi service container nahi** hai.

| Step | CI me kya hota hai |
| --- | --- |
| `pnpm format:check` · `pnpm lint` | ✅ chalte hain |
| `pnpm test` | ❌ integration tests ko **chalta Mongo** chahiye (auth, entries, menus, master-lists…) |
| `pnpm build` | ❌ `apps/web` ka root layout build ke waqt `getSettings()` **fetch** karta hai |

**Build wala 31 Aug ko aankhon se dekha gaya:** API band thi to `next build` `/_not-found`
pe teen baar **60-second timeout** kha kar gira ("Failed to build /_not-found after 3
attempts"). API chalu karte hi wahi build green ho gaya. Yaani failure environment ka hai,
code ka nahi — par CI me wo environment kabhi hota hi nahi.

⚠️ **Isiliye "CI red hai" ab tak kisi ko kuch nahi batata.** Wo har commit pe red hai, to
red hona ek signal reh hi nahi gaya. Yahi wo haalat hai jisme ek din koi **asli** failure
bhi ignore ho jaayega — flaky test wali chetavni (A-11) ka hi bada roop.

**Do cheezein chahiye:**

1. **CI me `mongo` service container** — `services:` block, aur test se pehle uska healthy
   hona. Ye seedha kaam hai
2. **Web build ka API par depend karna** — do raaste:
   - layout ka fetch **build-time pe fail-soft** ho (settings na milen to defaults se render
     ho jaaye). Ye waise bhi behtar hai: prod me API ek pal ke liye down hone se poora
     build/page nahi girna chahiye
   - ya CI me build se pehle API bhi uthao (bhaari, aur DB pe nirbhar)

**Mashwara: #1 + fail-soft.** Fail-soft wala D-42 §2 wali hi soch hai — "toota hua `<img>`
kabhi nahi" ka doosra roop: data na mile to page bina us hisse ke bane, poora build na gire.

**Andaza:** aadha din.

---

### Q-2 · Enquiries — ✅ **band (3 Sep — D-75)**

Do mahine khula raha, aur do kadam me band hua:

- **1 Sep (D-72)** — Enquiry Forms + Add New Form, aur package page pe sach me chalta form
- **3 Sep (D-75)** — **inbox**: All Enquiries · Enquiry Detail · Export CSV

Client ka scope: _"jo bina blocker ke ban sakta hai — poora"_. Isliye Send Quotation (SMTP),
activity feed (Q-4), aur assign/priority/follow-up **nahi** bane — unka panel bhi nahi dikhta
(D-30). Poora hisaab D-75 me.

⚠️ **`salesAgent` ke permissions ab bhi wahin hain** (`ENTRY_READ` + `MEDIA_READ`). Wo role
enquiries handle karne ke liye bana tha (D-29) par abhi inbox nahi dekh sakta — uske liye
`submission.*` chahiye. Ye jaan-boojh kar chhoda gaya: client ne assignment wala hissa scope
se bahar rakha, aur role ke defaults badalna unse poochhe bina karna theek nahi lagta.
**Client se poochhna hai:** salesAgent ko inbox dikhna chahiye ya nahi?

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
19. ✅ A-5 — apps/web ki .env; revalidate ab configured    (31 Aug)
20. Slice 6 ka bacha hua hissa — sirf reviews[] + rating   ← agla kaam
    ⚠️ Itinerary Images pool + gallery (Slice 4/D-52) aur FAQs (D-59) BAN CHUKE hain
    goodToKnow[] BANEGA HI NAHI (D-68); reviews[] §9 #8 pe ruka hai
21. Slice 7 → specs/007-packages.md §7
```

### Media Phase 2 se aage kyun khisak rahi hai

Plan me Media **Phase 2** hai (`05-BUILD-PLAN.md` §Phase 2, 1.5 hafte), aur wo Phase 1 ke
baad aati hai. Aage isliye aa rahi hai ki **Logo/Favicon do jagah ke blocker hain** —
General ka field, aur D-27 ke done-criteria ("Logo badlo, menu me item add karo, CTA ka
text badlo"). Ye wahi precedent hai jo Users (D-34) aur Settings (D-40) pe laga: plan ka
phase number apne aap koi rok nahi hai, scope client se aata hai (R15).

> ✅ **3 Sep — Library aur Picker bhi ban gaye (D-78), aur usi din Phase 2 band ho gaya
> (D-79).** Client ne `mediaRefs` mana kar diya — _"delete to kar sakte hai chahe kahin lagi
> ho ya nahi"_ — aur uske saath teen cheezein hamesha ke liye mar gayin: delete-guard,
> "Used in" panel, aur design ka `Attached`/`Unattached` filter. Media ke filters do hi
> rahenge: **kism** aur **mahina**.
>
> Jo aur bacha hai — folders · rename · bulk select · crop/rotate · replace file — wo kisi
> cheez ko rok nahi raha aur **client ne maanga nahi**. Media ab "current scope complete" hai,
> wahi lakeer jo Settings ▸ General pe D-40 me lagi thi.
>
> ⚠️ Neeche ki poori list **us waqt ki hai (~40% wali)** — ab wo itihaas hai, plan nahi.

**Us waqt poora Phase 2 nahi bana tha — sirf foundation (~40%):**

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

~~**Delete jaan-boojh kar nahi banega.**~~ — **3 Sep ko palat gaya (D-79).** Delete ab hai aur
**hamesha chalega**, chahe wo image kahin lagi ho. Client ko `08-RISKS` wala trap batakar hi
faisla liya gaya. Ek cheez nuksaan halka rakhti hai: **delete = trash** (R12) — record
`deletedAt` pe jaata hai aur **file disk pe rehti hai**, yaani galti ulti ja sakti hai.

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
