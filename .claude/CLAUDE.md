# MERN CMS Framework

Reusable CMS framework — **har client ki website ka apna instance** (apna DB, apna
domain, apna admin login), par **core code sab me same**, versioned `@cms/*` packages se.

Target user: **non-technical client**, jo admin panel se poori website chalaye.

**Status:** **Phase 0, Slice 0, Phase 1 ki Slice 1–7, aur Phase 2 (Media) — sab ban chuki
hain** (**1431 tests**, 23 Sep). Public package page ke **saare** section live hain.
Uske upar client ke maange hue teen bade kaam: **Enquiries inbox** (D-75/D-76),
**TinyMCE + HTML content** (D-80), aur **Bulk Upload** — Google Sheet/Docs se package pages
(D-81). Media ka scope D-79 pe band hua — `mediaRefs` client ne mana kiya.
1 Sep ko client ki 15-item list se: reviews (D-70), similar itineraries (D-71), structured
data, Enquiry Forms (D-72) aur typography tokens (D-73).
⚠️ `goodToKnow[]` **banega hi nahi** (D-68) — uska content har package pe same rehta hai, to
wo Packages ▸ Section Headings ke "Good to know" wale description box me jaata hai.
⚠️ **`reviews` per-package NAHI hai** (D-70) — wo universal hai, apni collection me, aur
package usme se kuch chunta nahi. Rating (`4.9` / `412 trips`) usse **gini nahi jaati** —
wo `packageDefaults.rating` me haath se likhi jaati hai.

Phase 0: setup layer, Zod contract, migration runner, CSS architecture, **auth + RBAC +
admin shell**, **Users screens**, **role-aware nav + Profile** (D-37), **Settings** (D-40),
**Media foundation + Logo/Favicon** (D-41).

**Slice 0 — Header + Footer end-to-end** (D-27, 24 Aug): menu ka typed contract (spec 006,
D-43), `menus` + `menuLocations` module, public read API, Appearance ▸ Menus (mega builder
ke saath) + Footer, aur public site ka header/footer — asli API data se, desktop aur mobile
ek hi payload se.

**25 Aug — header:** client ke reference se match — header buttons ka
`variant`/`icon`/`iconOnlyOnMobile`, naya drawer (logo + accordion groups + CTA), Inter
typography, sticky header.

**25 Aug — footer (D-44):** footer ka poora structure ab `settings.footerColumns[]` me hai.
Client columns ki **ginti** chunta hai (0–4), har column me **menu, text, ya dono**, apni
heading aur width. Footer ka **apna logo** (drawer bhi wahi use karta hai). Theme locations
me sirf `header` bacha; social links ki duplicate UI Footer screen se hat gayi. Migration 008.

Do item jaan-boojh kar deferred hain: docker compose me `api`+`admin`, aur CSP policy
(Phase 4-5). (Teesra — forgot/reset — 23 Sep ko ban gaya, sirf administrator ke liye: D-110.)

**26 Aug — Slice 1 (Content Core ka engine):** `entries` + `contentTypes` module,
migration 009, aur `resolvePath()`/`slugify()` `packages/shared` me. Path cascade, trash,
publish, scheduled publish, revisions aur optimistic concurrency sab chal rahe hain.
Engine ke paanch guard **D-47** me.

**26 Aug — Slice 2 (master lists):** `taxonomies` (Destinations + Package Type), `hotels`,
`addOns`, `transfers`, aur singleton `packageDefaults` — migration 010, 14 nayi
permissions. Teen faisle **D-48** me.

**26 Aug — Slice 3 ki neev (D-49):** `entry.taxonomies` ab har taxonomy type ki apni key
rakhta hai (spec 002 ka contract ek baar badla), aur `redirects` collection ban gayi —
slug badalne pe auto-301, chain flatten aur loop se bachav ke saath. Agla kaam
**Slice 3 — All Packages list + Add New**.
**C-2 (Payload spike) band ho chuka hai** — D-45: apna stack hi chalega.
Pending kaam → [`docs/09-OPEN-ITEMS.md`](docs/09-OPEN-ITEMS.md)

---

## Kaam shuru karne se pehle

| Kaam                  | Pehle ye padho                                                          |
| --------------------- | ----------------------------------------------------------------------- |
| Koi bhi code likhna   | [`07-CONVENTIONS.md`](docs/07-CONVENTIONS.md) — 18 non-negotiable rules |
| "Aisa kyun hai?"      | [`03-DECISIONS.md`](docs/03-DECISIONS.md) — D-01 se D-113               |
| Naya module / feature | [`02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md)                         |
| Admin ka UI           | [`04-ADMIN-UX.md`](docs/04-ADMIN-UX.md)                                 |
| Phase shuru karna     | [`08-RISKS.md`](docs/08-RISKS.md) — pre-flight checklist                |

Poora index: [`docs/README.md`](docs/README.md)

---

## Stack

```
apps/api      Express + Mongoose (JS/ESM)   saara business logic
apps/admin    React 18 + Vite (JSX)         admin panel + page builder
apps/web      Next.js App Router (JS)       public site, SSR/ISR

packages/blocks   registry + BlockRenderer + styleToCss   ← admin aur web DONO
packages/shared   Zod schemas + constants                 ← admin aur api DONO
```

JavaScript (ESM), **TypeScript nahi** — safety Zod + `checkJs` + tests se aati hai (D-03).

---

## Rules jo har baar apply hote hain

Poori list [`07-CONVENTIONS.md`](docs/07-CONVENTIONS.md) me. Sabse zyada tootne wale:

1. **Business logic sirf `service.js` me.** Mongoose hooks me sirf pure normalization —
   `findOneAndUpdate` `save` hooks chalata hi nahi, logic chup-chaap skip ho jaayega.
2. **Har query param Zod se validated.** `req.query`/`req.body` ko kabhi seedha Mongoose
   query me spread mat karo — `fields` Mixed hai, ye NoSQL injection ka raasta hai.
3. **Routing ka ekmatra source `entries.path` hai.** Koi hardcoded public route nahi.
4. **UI me internal naam kabhi nahi** — `entries` → Pages/Posts, `taxonomies` → Categories/Tags.
   **Aur UI ka text English me** — design spec English me hai (R17). Code comments Hinglish.
5. **Delete = trash** (`deletedAt`). Permanent delete sirf Trash screen se.
6. **Block ka `type` string kabhi rename mat karo** — wo DB me stored data hai.
7. **Naya block = ek file.** Core code touch nahi hona chahiye.
8. **Scheduled publish DB-based**, `setTimeout` kabhi nahi.
9. **Har list pe server-side pagination**, day 1 se.
10. **State-changing GET kabhi nahi.**
11. **Admin se aayi HTML hamesha write pe sanitize** (R20) — `core/sanitize-html.js`, service
    layer me. Render pe kabhi nahi.
12. **Date/time input pe `onClick={openPicker}`** — picker poore box se khule, sirf calendar
    icon se nahi (R19, client ka niyam). `date` · `datetime-local` · `time` · `month` sab pe.

---

## Module ka shape

Har API module ki **wahi paanch files**:

```
apps/api/src/modules/<name>/
├─ model.js         Mongoose schema — sirf shape + pure normalization
├─ service.js       SAARA business logic
├─ controller.js    patla — req/res, service ko call
├─ routes.js        routes + middleware chain
└─ validation.js    Zod schemas
```

`menus` module me **do collections** hain (`menus` + `menuLocations`) — assignment menu ke
bina bemaani hai, isliye wo alag module nahi hai. `public` module ka apna koi collection
nahi; wo doosre modules ka **public projection** hai (02-ARCHITECTURE §10).

`roles` module isme apwaad hai — uske paas `validation.js` nahi hai, aur uska
`routes.js` me sirf **ek read-only route** hai (`GET /api/roles`, user form ke role
dropdown ke liye). Role ki permissions **edit** karne ka koi route jaan-boojh kar nahi
hai — wo Phase 7 ka custom-role builder hai (D-37). Permissions badalne ka raasta khula
chhodna RBAC bypass karne ka sabse seedha tareeka hai.

---

## Naming

| Cheez             | Convention                                |
| ----------------- | ----------------------------------------- |
| Files             | kebab-case — `media-picker.jsx`           |
| React components  | PascalCase — `BlockRenderer`              |
| Functions / vars  | camelCase — `resolvePath`                 |
| Constants         | SCREAMING_SNAKE — `DEFAULT_SITE_ID`       |
| Mongo collections | plural lowercase — `entries`, `mediaRefs` |
| Permissions       | `resource.action` — `entry.publish`       |
| Cache tags        | `type:id` — `entry:abc123`                |
| Block types       | camelCase — `richText`                    |

---

## Commands

```bash
pnpm dev                  # sab apps
pnpm test                 # vitest
pnpm lint
pnpm cms migrate          # schema migrations
pnpm cms migrate:status
pnpm seed                 # admin user + defaults
docker compose up         # mongo
```

> Sab chalte hain. `pnpm seed` abhi roles + admin user banata hai; settings aur
> entries Phase 1 me judenge (spec 004).

---

## Doc update rule

Code badle to doc bhi badle, **usi PR me**:

| Kya badla               | Kaunsa doc                      |
| ----------------------- | ------------------------------- |
| Naya collection / field | `02-ARCHITECTURE.md` §3         |
| Architectural faisla    | `03-DECISIONS.md` — naya `D-xx` |
| Admin screen / nav      | `04-ADMIN-UX.md` + wireframe    |
| Phase scope             | `05-BUILD-PLAN.md`              |
| Env var / deploy step   | `06-OPERATIONS.md`              |
| Naya rule               | `07-CONVENTIONS.md`             |

Decision reverse karna ho to purani `D-xx` entry **delete mat karo** — usme
"Superseded by D-yy" likh do.

---

## Abhi ke blockers

Slice 1 se 5 poori ho chuki hain (D-47 se D-51, D-56) — API aur screens dono.

**26 Aug — public package page shuru** (D-52): ek hi catch-all route, `/api/public/resolve`,
aur naya `path:` cache tag. Client ka faisla — page **har slice ke saath badhega**.

**27 Aug — dev server tunnel/LAN se khulta hai, aur CORS reject ab 403 hai.** Allowlist se
bahar ka origin pehle plain `Error` throw karta tha, jo error handler me **500** ban jaata
tha — login screen pe sirf "Something went wrong" dikhta tha, yaani configuration ki galti
server crash jaisi lagti thi. Ab message me origin ka naam aata hai. Naya optional env var
**`EXTRA_CORS_ORIGINS`** (tunnel · LAN IP · staging preview) — `06-OPERATIONS.md` §4.0.
`SITE_URL` ko list nahi banaya ja sakta (wo revalidate ka target bhi hai) aur `*` support
nahi hai — D-12 ka palan, uska apwaad nahi.

**27 Aug — Slice 5 ban gayi (D-56, D-57):** `pricing{}` + `hotels[]` + `addOns[]`, admin
ke do naye panel (Pricing · Hotels) aur sidebar ka Add-ons checklist, aur public page pe
price block · catbar · hotels table · add-ons. Koi migration nahi lagi.

Pricing panel me **chaaron category ki row hamesha** hoti hai — Category · Price From ·
Strike-through. **Khaali daam ka matlab hai "ye category is package pe milti hi nahi"** aur
wo page se gayab ho jaati hai. Panel me **currency nahi** (`settings.currency` se) aur
**Price Basis / GST / Advance bhi nahi** — dono client ke faisle.

**FAQs ka panel bhi ban gaya** (D-59) — sirf FAQs, **policies nahi**: policy har package pe
same hoti hai aur wo `packageDefaults` me pehle se hai. Page pe wo `<details>` se banta hai,
koi JS nahi.

**27 Aug — editor ki safai (D-64):** din se `hotelCategory` hata, `highlights[]`
description me mil gayi (`-` wali line = bullet, **migration 014**), add-ons wapas package ka
chunav (D-61 ka palat), har remove pe confirmation, aur main column ke panels drag se reorder
hote hain (kram `localStorage` me). Ek chup bug bhi tha — transfer duration akeli likhi ho to
page pe aati hi nahi thi.

**Price line** (`per person on twin sharing…`) theme me **static** hai (D-63) — uske liye
admin me koi field nahi. Wo har package pe, har category pe bilkul wahi rehti hai. Yahi
Q-9 wali soch hai: dhaancha static, maal admin se.

**Add-ons wapas package ka chunav hain** (D-64 — D-61 ka palat, usi din). Sidebar me
checklist, aur payload `packageDefaults` se wapas entry pe. Yaani spec §1.4 ka asli niyam
hi chal raha hai. ⚠️ D-61 wala "global add-ons" ab **purana** hai — 27 Aug ko palat gaya.

**Public hotels table poori tarah derived hai** (D-58, D-60) — rows itinerary ke overnight
stays se, categories pricing se, aur hotel Hotels master list se. Package ka panel **sirf
override** hai: usme kuch na karo to bhi table bharti hai. `fields.hotels[]` ab chunav nahi,
override hai.

Design ka koi text nahi hataya (R15). Jo per-package field nahi rahe unka source badla:
`per person on twin sharing…` ab `packageDefaults.priceNote` se, aur category card ki beech
wali line hotel ke apne `note` se. **Teen cheezein derive hoti hain, store nahi:** upar ka
daam (sabse sasti category), table ka `Nights` (itinerary se), aur `Deluxe category —
₹29,499`.

**1 Sep — client ki 15-item list poori ho gayi.** Public page ke chaaron bache hue section
ban gaye, aur admin ke chhe fix bhi:

- **Traveller reviews (D-70)** — nayi `reviews` collection (master-lists module ki chauthi
  list), `Packages ▸ Reviews` screen, aur `Section Headings ▸ Traveller reviews` tab me
  rating ki jodi. Page pe teen card, uske baad slider
- **Similar itineraries (D-71)** — wahi nights **aur** days wale package, khud ko chhod kar.
  Poori tarah derived, koi naya field nahi. Teen-teen ke page, `1 2 3` pagination
- **Structured data** — reference ka poora `@graph` (breadcrumb · TouristTrip +
  AggregateOffer + AggregateRating · FAQPage). Trip wala hissa `fields.seoSchema` toggle pe
  hai — wo Slice 3 se maujood tha aur aaj tak **kuch karta hi nahi tha**
- **Enquiry Forms (D-72)** — naya `forms` module, admin ki do screens, aur package page ke
  sidebar me ek sach me chalta hua form. **Inbox aur email nahi** (client ne "only" kaha;
  SMTP waise bhi blocked hai). Submissions phir bhi `enquiries` me store hoti hain
- **Typography tokens (D-73)** — har `font-size`/`font-weight` ab `:root` se. Pure
  refactor: 136 computed value milaayi gayin, ek bhi nahi badli

⚠️ **`goodToKnow[]` banega hi nahi (D-68).** Client se poochhne pe pata chala ki wo content
har package pe **same** rehta hai — spec §2.1 ne ulta maan liya tha ("har itinerary ki ferry
wali majboori alag hoti hai"). Ab wo `Packages ▸ Section Headings` → "Good to know" ke
description box me jaata hai (D-65 me wo box pehle se ban chuka tha). Ek repeater field, ek
panel aur uske tests bach gaye.

⚠️ **`reviews[]` naam ka koi field bana hi nahi** (D-70). §9 #8 ka jawab client ne 1 Sep ko
diya — rating **haath se** likhi jaati hai, aur reviews khud **universal** hain (apni
collection, package ka chunav nahi).

**31 Aug — section ke heading aur lines ab admin se (D-65, Q-9 ka bada hissa band):**
`packageDefaults.sectionLabels` — 7 section, har ek pe `{ heading, description }`. Naya
screen **Packages ▸ Section Headings**. Default `packages/shared` ki
`package-sections.js` me hai aur wahi **teen** kaam karta hai — theme ka fallback, admin ka
pre-fill, aur Zod ki shape. Resolve **server pe** hota hai (`toSectionLabels()`), theme me
nahi.

⚠️ **Khaali ke do alag matlab:** khaali `heading` pe theme ka heading wapas aata hai (section
bina title ke na rahe), par khaali `description` line ko **hata** deti hai. Isiliye admin ka
form defaults se **bhara hua** khulta hai, placeholder se nahi — placeholder pe client kisi
line ko hata hi nahi sakta tha. Koi migration nahi lagi.

⚠️ Chhoti inline lines abhi bhi static hain — `or similar`, `per person · twin sharing`,
`PRICE_NOTE`, catbar ki line, aur hotel tabs ke naam (`TAB_NOTE`). Q-9 unhi ke liye khula
hai; `TAB_NOTE` sabse tez kaanta hai (wo Andaman-specific hai).

**Saath me ek chup bug bhi theek hua** — `cancellationText` public payload me ja hi nahi
raha tha, jabki `PackagePage.jsx` use do jagah padhta hai. Client ki likhi cancellation
policy page pe **kabhi** nahi aati thi. Wahi shakl jo D-64 wale transfer-duration bug ki
thi: dono taraf ka code sahi dikhta hai, bas payload me field chhoot gaya tha.

**2 Sep — `pnpm test` client ki uploaded images mita deta tha (A-16). ✅ Theek ho gaya.**
Asli wajah `media.test.js` se **bhi badi** nikli: `vitest.config.js` har test ke liye
`UPLOAD_DIR: './uploads'` set karti thi, yaani test me chalne wali app bhi dev ke **asli**
folder me likhti thi — aur `media.test.js` ki `beforeEach` usi folder ko `rm -r` kar deti
thi. DB ke records bache rehte the, files jaati thi — isiliye admin me image dikhti thi par
page pe 404. Ab `UPLOAD_DIR` test me `./.test-uploads-media` hai, aur `media.test.js` ka
`UPLOAD_ROOT` **app ke apne storage driver se** aata hai (hardcoded nahi) — jahan app
likhti hai wahi saaf hota hai, dono alag ho hi nahi sakte. Ek guard bhi hai: root `.test-`
se shuru na ho to file chalne se **pehle** phat-ti hai. ⚠️ Purani `git clean` wali theory
**galat** thi. ⚠️ Jo files ja chuki hain wo wapas nahi aayengi.
Doosri deewar abhi baaki hai — `apps/api/.env` me `UPLOAD_DIR` repo ke **bahar**.

**Design frozen hai (R15)**: `docs/reference/admin-design.html` ke hisaab se hi banega, aur
build ke waqt kuch theek na lage to **pehle poochho, khud mat badlo**. Jo farq abhi liye
gaye hain wo sab client ke faislon se hain aur `04-ADMIN-UX.md` ke aakhri section me
table me likhe hain.
spec 007 §9 ke **3 sawaal** abhi khule hain (#2, #5, #14), par koi bhi plan
nahi rokta — har ek apne slice pe tay hoga (`09-OPEN-ITEMS.md`).

| #   | Kya                                                           | Kab tak                                      |
| --- | ------------------------------------------------------------- | -------------------------------------------- |
| Q-7 | Logo na mile to header me kya dikhe?                          | Client ka faisla (R15) — abhi interim pe hai |
| Q-9 | Page ki chhoti inline lines — `TAB_NOTE` Andaman-specific hai | client jab kahe                              |
| Q-3 | Field DSL me `matrix` + `table` types                         | Phase 5c se pehle                            |

**Q-7 ka interim:** logo na mile to header me **kuch render nahi hota** (nav left shift).
Ye D-42 §2 ka palan hai, koi faisla nahi. Code me `Q-7 INTERIM` comment hai
(`apps/web/components/SiteHeader.jsx`) — jawab aane pe sirf ek JSX branch badlegi.

**D-42 §2 ka invariant ab sach me enforce hai** — public API media resolve na hone pe `null`
bhejti hai, isliye toota `<img>` banta hi nahi. ⚠️ Aur ek sabak: wo invariant **delivery
layer pe bhi** toot sakta hai — `apps/web` me `/uploads/*` ka rewrite chhoot gaya tha aur
payload sahi hone ke bawajood logo 404 de raha tha.

**3 Sep — teen bade kaam ek din me:** **Enquiries inbox** (D-75, usi din client ne chala kar
chhota kiya — D-76), **Media Library + MediaPicker** (D-77, D-78) aur uske turant baad
**`mediaRefs` ka rad hona** (D-79 — delete ab hamesha chalega, "Used in" panel aur
`Attached/Unattached` filter kabhi nahi banenge), aur **editor ab TinyMCE** (D-80, spec 002 ka
doosra badlaav — saara page content ab **HTML** hai).
⚠️ D-80 ke saath **XSS ki problem ab hum paal rahe hain** — TipTap me wo ban hi nahi sakti thi.
Har admin-likhi HTML write pe sanitize honi chahiye (R20), render pe kabhi nahi.

**3–4 Sep — Bulk Upload (D-81):** client ki Google Sheet + Docs se package pages banti hain,
**bina kisi Google account ke** (`export?format=csv|html` anonymous 200 deta hai). Sidebar me
**top-level** menu. Import ke saath **New / Existing** ka elaan jaata hai — wo filter nahi,
**assertion** hai: bina uske ek purana `Package URL` nayi sheet me reh jaaye to wo live package
ko chup-chaap overwrite kar deta.

**4 Sep — D-82 aur D-83, dono live check pe nikle:** structured data ki teen galtiyaan
(`aggregateRating` ab `Product` node pe, har din ek `subTrip`, `stripTags` ka chipkane wala
bug) aur `seoSchema` ka per-package se `packageDefaults` me aana — **paanchon package pe wo
`false` mila tha**, yaani feature bana kar rakha gaya aur teen din chala hi nahi.
Uske saath **D-83 — ISR cache aaj tak inert pada tha**: Next 15 me `fetch` ka default
`no-store` hai, to `{ next: { tags } }` akela kuch cache karta hi nahi. Har page load pe chaaron
public call API tak jaati thi.

⚠️ **Migration ka niyam (D-82):** `pnpm format` **pehle**, `pnpm cms migrate` **baad me**. Do
baar (020 aur 022) ulta hua aur checksum guard ne pakda.

**4 Sep — speed ka pehla pass (D-84):** media ab **`immutable`** hai (pehle `max-age=0` tha —
12 image yaani 12 revalidation round trip, har visit pe), har image pe **`srcset`** jaata hai
(payload me banta hai, theme me nahi — D-65 wala hi tark), `width`/`height` ab 12/12 pe
(pehle 6/12 — CLS), hero pe `fetchpriority="high"`, aur `Lightbox` **click pe** load hota hai.
Har `<img>` ab `components/Img.jsx` se banta hai.
**4 Sep — naap ke saath doosra pass (D-85): mobile 68 → 91, desktop 98.** Chaar badlaav, har ek
naap se: hero ka shuffle **server pe** (`lib/hero.js` — LCP 6.5s→3.5s, CLS 0.147→0),
`content-visibility` fold ke neeche (TBT 834ms→128ms), **₹ ka 85 KB font** hataya (FCP
1993→1417ms), aur Inter ab variable font.
⚠️ **Teen shak naap me galat nikle** — CSS bhaari hona, `:has()` mehnga hona, aur RSC flight data
ka parse. Teenon pe kaam shuru karne se pehle naap liya gaya tha; asli mujrim **full-page
layout** tha (`Layout` 639ms, 8 event, 1366 element).
⚠️ **Naapna hamesha `next build` + `next start` par, 5 run ka median.** Is machine pe noise 2× tak
hai — **dev server pe naapa hua number bilkul bemaani hai**.
⚠️ 100 abhi nahi mila — **sirf LCP** (3.35s) bacha hai, aur wo ab bandwidth ka sawaal hai. Raaste
aur unki keemat `09-OPEN-ITEMS.md` **A-17** me.
⚠️ `immutable` ka haq media ke URL se aata hai (path me id + variant). **"Replace file" banaane
se pehle** ya replace naya `_id` de, ya URL me content hash jude.

**4 Sep — Bulk Upload har run pe duplicate bana raha tha (D-86).** Ek hi doc ne saat live page
bana diye the (`…-2` se `…-7`). Jad: **dhoondhne ka slug aur save karne ka slug do alag the** —
save `slugify(Package URL || Package Name)` se hota tha, dhoondhna `parseSlug(Package URL)` se
(na `slugify`, na title ka fallback). Client ne doc me **bada akshar** likha tha, Mongo
case-sensitive hai, lookup hamesha khaali aata tha.
⚠️ Us ek `null` se **teen guard chup-chaap mar gaye the** — New/Existing ka, Trash wala (uska
message aaj tak kisi ne dekha hi nahi), aur duplicate se bachne wala.
⚠️ **Ab `Package URL` zaroori hai — par `Draft`, `Failed` nahi** (client, 4 Sep). Dono "zaroori"
alag hain: `Package Name` ke bina kuch **banta hi nahi** (Failed), `Package URL` ke bina package
**ban jaata hai par publish nahi hota** (Draft). Wahi soch — content chala jaaye, sirf publish ruke.
**Sabak:** ek hi cheez ke do naam do jagah mat banao. Guard ka na chalna kabhi error nahi deta —
wo sirf "kuch na hone" jaisa dikhta hai.

⚠️ **Chauthi baar laga hua jaal:** `updatePackageDefaults()` ka `$set` ek **whitelist** hai.
Naya field schema/model/screen teenon me jod dene ke bawajood wahan na ho to Zod pass karega,
API 200 degi, admin "Saved." dikhayega, aur DB me purani value rahegi. Naya field jodo to
whitelist bhi jodo, aur uska test **response nahi, DB** padhe.

**7 Sep — Tour Page shuru (D-87), Slice A ban gayi.** Client ne `tour-v3.html` di (package
**listing** page) aur din me **do baar palta**: pehle "do template", phir wo rad — ab **ek hi
edit screen** aur layout **content editor ke blocks** se (`Two column` · `Cards` ·
`Package list` · `FAQs`).

- **`tourPage` naya content type**, par field set `page` ke saath **ek hi constant** hai.
  Alag type sirf isliye ki menu, list aur URL teenon alag maange gaye the
- **Content ab blocks ki ek list hai** (`content.blocks[]`, **§7**) — har block apna
  **panel**, `Add block` dropdown se, grip se reorder. **Text bhi ek block hai** (`richText`),
  isliye layout blocks content ke **beech** me aa sakte hain — jaise reference page pe hain
- **Rating ab per-package (D-70 palta)** — listing page pe chaudah cards pe ek hi
  `4.9 ★ 412 trips` jhootha dikhta hai. ⚠️ Khaali `value` par `packageDefaults.rating`
  chalti hai; package ka number use **override** karta hai, mitata nahi
- **Trust badges + universal banner → `Settings ▸ Tour settings`** (client, #11)

⚠️ **§2 ka poora model usi din palat gaya (§7).** Kuch ghante ke liye blocks ek hi HTML field
ke andar `<div id="blk-…">` the aur settings `fields.blocks{}` me. Client ne demo dekh kar mana
kiya. Us palat se **teen problem apne aap khatam ho gayi**: settings ka do jagah hona, orphan
blocks, aur sanitizer me `data-*` kholne ka sawaal. Ab hum `block.js` ke FROZEN
`{id, type, props}` par hain — yaani Phase 5 ka builder yahi data uthayega.

⚠️ **`blockSchema.id` ab input me optional hai** — shape nahi badla (paanch keys wahi), sirf
required-ness. `normalizeContent()` write pe id bhar deta hai; wahi jodi jo `faqs[]` aur
`itinerary[]` pe pehle se hai.

⚠️ **Slice A ka schema plan se bana tha, design se nahi** — `admin-design-v3.html` se milaan pe
paanch farak nikle (Package list ka heading, `featuredFirst` alag checkbox, `showBadges`, cards
ka `tag` bajaye `icon`, FAQs ka heading). Design jeeta (R15), sab theek kar diye gaye.

⚠️ **`details`/`summary` sanitizer me the hi nahi** — D-87 ki jaanch me nikla, is kaam ka
hissa nahi tha. FAQ accordion theme ke JSX me hai isliye aaj tak chala; client editor me khud
`<details>` likhta to wo **write pe chup-chaap gayab** hota. Wahi shakl jo D-64/D-65 ke bug ki.

⚠️ **`sanitizeContent()` ab chaar block ki HTML saaf karti hai** — `richText.html`,
`twoColumn.left`/`.right`, `cards.items[].text`, `faqs.items[].answer`. **Naya block type jodo
to wahan bhi jodo.** Chhoot jaane ka matlab ye nahi ki content gir jaayega — wo bina safai ke
**bach** jaayega (R20). Ye `updatePackageDefaults()` wale whitelist jaal ki **ulti shakl** hai:
wahan bhoolne se content kho jaata tha, yahan bach jaata hai — aur wahi zyada khatarnak hai.

⚠️ **Test suite rate limit kha rahi thi** — `entries.test.js` ka har test `beforeEach` me chaar
login karta hai, aur file ab 168 test ki hai, yaani 1000 req/min wali chhat paar. Naye tests
**429** khaate the aur wo failure bilkul logic bug jaisi dikhti thi. Ab global limiter test me
band hai (`isTest`, `core/env.js`); **auth ka apna limiter chalta rehta hai**.

⚠️ **Koi migration nahi lagi** — `tourPage` naya type hai aur `ensureBuiltInContentTypes()`
naye type ko create kar deta hai; `fields` hamesha sync hote hain. Deploy pe **`pnpm seed`**
chahiye, `pnpm cms migrate` nahi.

**Slice B (public payload) bhi ban gayi.** `toPublicEntry()` **har** type pe chalti thi aur wo
poori tarah package-shaped hai — ek `page` resolve karne pe `resolveSimilarPackages()` ka poora
daur chalta tha, sirf khaali arrays banane ke liye. Ab `page`/`tourPage` ke liye
`toPublicPage()` alag hai.

- **Card builder bahar nikla** (`toPackageCards()`) — tour page ka `Package list` bilkul wahi
  card chahta hai. Do copies ka nateeja pehle ho chuka hai: `bestFor` similar cards pe
  **chhoot gaya tha**
- ⚠️ **Naya endpoint nahi banaya** — list `resolve` ke payload me hai, taaki `path:` tag aur
  ISR muft milein. Alag endpoint wahi D-83 wala bug dobara banata
- ⚠️ **Facets `limit` se pehle ginte hain** — warna `2N / 3D [3]` jhootha ho jaata
- ⚠️ **Sort JS me** hai, Mongo me nahi — `price-asc` `cheapestPricing()` se aata hai jo derived
  hai. Isliye `PACKAGE_LIST_SCAN_CAP = 200` ki chhat hai
- **`htmlToText()` ab `packages/shared` me hai** — wo `Schema.jsx` me `stripTags` tha; read time
  ke liye server pe bhi wahi chahiye tha, aur do copies wahi galti hoti jo D-65/D-51/D-58 pe
  bachayi gayi thi
- **`tourSettings` ka schema bhi ban gaya** — screen Slice C me

**Live check:** `/packages/discover-andaman` asli DB pe resolve kiya — rating `packageDefaults`
se **4.9 / 412** par gir rahi hai, yaani per-package rating aane ke baad bhi koi regression
nahi. **804 test pass.**

**Slice C (admin screens) bhi ban gayi** — `Tour Pages` list · edit screen ·
`Settings ▸ Tour settings`.

⚠️ **Isme Pages ki screens bhi ban gayi thin, aur wo scope se bahar tha** (8 Sep pe hata diya).
D-87 **Tour** ka kaam tha; faisla #2 ("ek hi edit screen") ko "ek jaise types" samajh kar `page`
ko bhi Tour ke fields aur screens de diye gaye the. Client ne mana kiya — _"Pages par kaam to ho
hi nahi raha"_ — to `page` wapas apni purani haalat me hai (`fields: []`, screens `NotBuiltYet`
pe, **A-9 phir se khula**). **Sabak: scope ek faisle se nahi badhta.**
✅ Saancha bach gaya — `EntriesList.jsx`/`PageEdit.jsx` dono `type` se chalte hain, to Pages/Posts
ka din aane pe ek row + do route ka kaam hai.

- **Blocks ka editor** — har block apna panel, `＋ Add block…` dropdown, ⌃⌄ se reorder, band
  hone pe bhi ek line ka summary
- **Generic entry hooks `lib/use-entries.js` me nikle** — `usePackages.js` ab unka patla wrapper
  hai (naam wahi, isliye paanch purani screens ko haath nahi laga)
- ⚠️ **Duration ki ginti admin me dikhti hi nahi** — wo padhne ki cheez hai, likhne ki nahi.
  Client sirf chunta hai ki kaunsi durations dikhein; ginti page pe server se aati hai
- ⚠️ **Pages ke nav links pe pehle `permission` thi hi nahi** — menu sabko dikhta tha. Ab `NAV`
  me dono pe lagi hai. `ROUTE_GUARDS` me sirf `/tour` hai, kyunki `/pages` ka route hi
  `NotBuiltYet` hai — jo route nahi hai uska guard likhna jhootha ishaara deta hai

**Live check asli DB pe:** ek tour page banaya → publish → resolve → **hata diya**. Blocks kram
me (`richText → packageList → faqs`), byline apne aap, kachcha `content` payload me nahi, list
ne 5 me se 3 cards diye, facets `5N/6D[5]`, rating `packageDefaults` se. `tourSettings` alag se
DB me likh kar padha gaya. Dono ke baad DB waisi ki waisi.

**Slice E bhi ban gayi (D-88, 8 Sep)** — `Appearance ▸ Sidebar`. Client ne wo ek sawaal band kar
diya jispe poora module ruka tha: _sidebar me kya-kya daala ja sakta hai?_ — **list fix hai, teen
type ki**: `enquiryForm` · `talkToPlanner` · `html`.

- **Named sidebars** — nayi `sidebars` collection, ek module, **migration 023** (indexes + roles
  ka sync). Widgets ki **ordered list**, wahi FROZEN `{id, type, props}` envelope jo
  `content.blocks[]` ka hai — par apna alag enum (`blockSchema` reuse nahi)
- **Page pe do field** — `fields.sidebar` (kis taraf, pehle se tha) aur naya `fields.sidebarId`
  (kaunsi). Dropdown `none` chhodne par hi khulta hai. **Sirf `tourPage` pe** — package ka
  sidebar hardcoded hi rahega (client), aur `page`/`post` pe tab jab unki screens banengi (A-9)
- **Payload me `sidebarId` kabhi nahi jaata** — `toPublicPage()` server pe resolve karke
  `sidebarWidgets[]` bhejti hai. Koi naya endpoint nahi (D-83 wala hi tark)
- ⚠️ **`sanitizeSidebarWidgets()`** — `html` widget ki safai write pe (R20). **Naya widget type
  jodo to wahan bhi jodo**
- ⚠️ **Delete pe koi guard nahi** (D-79 ka precedent) — jis page ka `sidebarId` gayab ho, wahan
  sidebar **render hi nahi hoti** (D-42 §2). Isliye "Used on N pages" ka column bhi nahi bana

⚠️ **Design v3 se paanch farak hain, aur wo client ke faisle hain** — `admin-design-v3.html:682`
pe Sidebar ka poora screen bana hua hai (ek hi sidebar · global left/right · form ke liye niyam
ki table). Poora hisaab **D-88 §1** me. **#2–#5 ka client-attribution likha jaana baaki hai.**

**Slice D (theme) bhi ban gayi — D-87 §11, 8 Sep. Ab D-87 ki saari slices poori hain.**

Ab tak catch-all me sirf ek branch thi (`type === 'package'`); `page`/`tourPage` fallback pe
girte the aur wahan **sirf `<h1>`** chhapta tha — yaani Slice A–C ka bhara hua sab kuch public
site pe **dikhta hi nahi tha**. Naya: `components/tour/` me `TourPage` · `Blocks` ·
`PackageList` · `Sidebar` · `TourSchema`, aur CSS (`.vhero*` · `.vrail*` · `.sec--*` ·
`.fbar`/`.dpill` · `.dgrid`/`.dcard` · `.twocol`).

- ⚠️ **`.pgl` chhua nahi gaya** — `.pgl--sideleft` ek **modifier** hai. Package page pe sidebar
  right hai, tour page pe left; `.pgl` seedha badalna us page ko tod deta. 1024px pe
  `grid-column` wapas `auto` karna zaroori tha, warna implicit doosra column bana rehta
- **Card ka markup ek jagah aaya** — `components/PackageCard.jsx`, `Similar` aur `PackageList`
  dono usi pe. Saath me ek purani galti bhi theek hui: `Similar` har card pe **ek hi global
  rating** dikhata tha, jabki D-87 §3 ke baad har card apni rating le kar aata hai
- **`EnquiryForm` ab `variant="book" | "cta"`** — do form component nahi banaye. Uske liye
  **`useOptionalCategory()`** juda; `useCategory()` ka throw waisa ka waisa hai (wo package page
  ke liye sahi guard hai)
- **`TourSchema` alag hai** — package wala `Schema.jsx` poori tarah package-shaped hai
  (`TouristTrip`/`Product`/`AggregateRating`). Listing page pe wo bhejna "misleading structured
  data" hai. Yahan sirf `BreadcrumbList` + **saare FAQ blocks milaa kar ek** `FAQPage`
- ⚠️ **Ek guard galat tha, live check me pakda** — filter bar `facets.length > 1` pe thi. Asli
  page ke saare paanch package `5N/6D` ke hain, yaani facet ek hi tha aur **client ka chuna hua
  filter chup-chaap gayab** ho gaya. Ab `> 0`. Wahi D-86 wala sabak

**Live check (production build, asli DB):** 200 · `.vrail__c` 4 · `.pgl--sideleft` · 10 `.blk` ·
9 `.dcard` · 5 `.prow` · 3 `.wdg` · `fbar: Duration | All | 5N/6D | 5` · JSON-LD me **ek**
`FAQPage` (9 sawaal), koi `TouristTrip` nahi.

**8 Sep — design se milaan (D-89).** Client ne page **chala kar** section-by-section milaan
karwaya; **13 farak** nikle aur sab theek ho gaye. Paanch naye contract, **koi migration nahi**:
`tourSettings.heroButton`, `twoColumn.style` (`plain`/`includedExcluded`), html widget ka `icon`,
enquiryForm ka `heading`/`description`, aur `unwrapBareSpans()`.

⚠️ **Zyada tar farak "bana hua par juda nahi" wale the** — trust badges (schema + admin + payload
teenon the, theme me koi padhta hi nahi tha), `entry.url` (4 Sep se bheja ja raha tha, `EntriesList`
purana `path` padh raha tha), `StickySide`, `Icon.jsx` ke chaar icon, aur `.wdgl`/`.wdg__b`/
`.wdg--cta`/`.vhero__cta`/`.vhero__trust` ki CSS. **Sab ka lakshan ek hi tha — "kuch na hona".**
Koi error nahi. Yahi D-86 me likha gaya tha.

⚠️ **Do jagah reference dekhe bina maan liya gaya tha, aur dono baar reference ne ulta kaha** —
byline (design me hai hi nahi; wo `page-template-text.html` ki cheez hai, isliye ab sirf `page`
type pe) aur package list ka `.blk` (reference me saada `<div id="pklist">`).

⚠️ **Do jagah CSS client ki likhi hui class pe nirbhar thi** (D-89 §6) — `.wdgl` aur `.faq p`.
`<ul class="wdgl">` DB me **thi**, kai save ke baad **gayab**; sanitizer nirdosh nikla, wo class
**editor me** khoyi. Ab dono jagah look class ke bina bhi kaam karta hai. **Wajah abhi zinda hai
— A-19.**

⚠️ **`next build` sirf tab jab dev band ho** — dono ek hi `.next` use karte hain. Dev chalte waqt
build chalane se uske vendor chunks kat gaye aur har page 500 dene laga.

⚠️ **`forms.placement` zinda hai aur wo theek hai** — wo sirf package pages ko serve karta hai,
sidebar ka `formId` sirf `page`/`tourPage` ko. Dono kabhi milte hi nahi.

**9 Sep — Tour page band ho gaya (D-90).** Client ne page dobara chala kar **pandrah** cheezein
gina di. **Do naye contract, koi migration nahi:** `fields.heading` (`pageHeadingSchema`) aur
`packageList` ka `linkLabel`/`linkUrl`.

⚠️ **`entry.title` ab page ka `<h1>` nahi hai.** Naya `fields.heading` wo kaam karta hai; `title`
slug · breadcrumb · admin list · SEO · schema ke liye bacha. Client ke shabd: _"current jo hai use
only slug ke liye rakhte hain, to breadcrumb bhi simple ho jayega."_ Wo `inlineHtmlSchema` pe hai,
`htmlSchema` pe nahi — block tags `<h1>` ke andar ghus hi nahi sakte. Khaali chhodo to theme
`title` pe girti hai, aur **wo fallback theme me hai, payload me nahi**.

⚠️ **Editor ek jaisa rakhna jeeta, chahe keemat lagi.** `Page heading` ka apna chhota toolbar tha;
client ne mana kiya (_"admin could be confuse"_). Ab wahi `HtmlEditor` hai jo baaki jagah hai —
yaani toolbar heading/list/image dikhata hai par wo save pe gir jaate hain. Ilaaj **field ki hint**
hai. Uske saath `Highlight` button hat gaya: heading ka accent rang ab **Italic** se banta hai
(`.vhero h1 em` ko `font-style: normal` milta hai).

⚠️ **Teen aur "bana hua par juda nahi"** — per-package rating ka admin panel, `statRail[].highlight`
ka checkbox, aur `PackagePage.jsx` ka `defaults.rating`. Teesra sabse seekhne layak hai: D-87 §3 ne
rating per-package ki aur `toPackageCards()` badal gaya, par **page ka doosra padhne wala chhoot
gaya**. Client ki shakayat bilkul yahi thi — _"card me updated hai, page pe purana 412 aa raha hai."_

⚠️ **A-19 ki teesri jagah mil gayi — ab ye pattern hai, ittefaq nahi.** `.wdgl` aur `.faq p` ke baad
ab **`.tblw`**: client ke teen table me se do pe wrapper tha, ek pe nahi. Us ek pe na gol kone aaye,
aur mobile pe wo apni `min-width` le kar page se bahar nikal gayi (`.tblw` me `overflow-x: auto` bhi
hai). Ab `wrapTables()` theme me khud wrapper lagata hai. **Naya CSS likhte waqt sawaal ye hai:
_"agar client ye class na likhe to kya hoga?"_**

⚠️ **`enquiry.sourceUrl`** — detail screen pe ab poora URL, aur wo link hai. `sourcePath` akela
admin ke apne origin (`:5173`) ka pata lagta tha. **Ye wahi bug teesri baar tha** (`entries` ka
`withUrl`, Bulk Upload ka result — D-81). ⚠️ Asli enquiry pe **verify nahi hua** (A-20).

⚠️ **`git add -A` ne client ke hand-edit commit me kheench liye** — `RatingPanel.jsx`/`PackageEdit.jsx`
se teen hint hataana `6869feb` me chala gaya, jiska message table ke baare me hai. **Commit se pehle
`git status` padho.**

**9–10 Sep — Blog poora ban gaya (D-91, spec 008).** Client ne `blog-v1.html` aur
`blog-detail-v1.html` di aur kaam ka kram khud chuna — pehle detail, phir listing. `post` se `tag`
gaya, naya `blogPage` type, `postList` block, `blogSettings`, aur post ke URL ka switch
(`/blog/{slug}` ↔ `/{slug}`, 301 ke saath).
⚠️ **`entry.title` post ka `<h1>` nahi hai** — wo `fields.heading` hai (wahi batwara jo D-90 ne
`tourPage` pe kiya tha). Client: _"blog ki heading aur slug alag rahenge jisse breadcrumb bhi thik
ho jayega."_

**10 Sep — Bulk Upload for blog (D-92).** Wahi `bulk-imports` module ab `target` se **package aur
post dono** banata hai — ek hi screen, ek dropdown. Sirf teen cheezein target se badalti hain
(`targets.js`): doc kaise padha jaaye, payload kaise bane, kaunsi master lists chahiye. **Koi
migration nahi lagi.**

⚠️ **Chhe bug mile aur unme se paanch sirf live chalane pe.** Har baar code-level pe sab "pass"
tha: `&mdash;` ka decode na hona, table ke cells ka chipakna, Google ka image `data:` URI me
bhejna (maine ulta maan liya tha), images ka clamp ke **baad** import hona (article **7 character**
ka bacha aur row ne "Published" kaha), FAQ ka heading `"Frequently asked questions"` khud ek
section marker hona, aur `<thead>` aane par mere CSS ka pehli **data row** ko header bana dena.

⚠️ **Jo sirf render pe chalta hai use JSX me mat rakho.** `wrapTables()` aur uske saathi
`Blocks.jsx` me the, jahan unka test likha hi nahi ja sakta tha — table ka header usi wajah se
**do baar** galat bana, dono baar galti live page pe pakdi gayi. Ab wo `apps/web/lib/article-html.js`
me hain, apne test ke saath.

⚠️ **Design ke wo hisse jo Google Doc likh hi nahi sakta, theme sambhalti hai** — `Note:` ·
`Warning:` · `Quote:` nishaan se `.callout` · `.callout--w` · `.pullq` bante hain, aur `.lead` apne
aap (pehla paragraph). Ghar theme hai, importer nahi (wahi jagah jahan `wrapTables()` hai), isliye
DB me content saaf rehta hai aur nishaan hata dene se page saade paragraph pe wapas aa jaata hai.
✅ Nishaan ke shabd maine chune the; 11 Sep ko client ne chaaron (`Caption:` ke saath) rakh liye
aur asli doc pe khud chala kar dekhe (A-22 band).

**11 Sep — article ka design aur A-21 (D-92 §10–§11).** Table ab theme me dobara banti hai
(`normalizeTable()` — pehli row `<thead><th>`, baaki `<tbody>`, cell me `<p>` nahi), image ke
neeche `Caption:` wali line `<figure class="artfig">` ka `figcaption` banti hai, aur do lead
paragraph wala bug theek hua. Kram ek function me hai: `articleHtml()` (`apps/web/lib/article-html.js`).
A-21 ke chaaron naap ho gaye — post URL switch pe **blog listing ka cache saaf nahi hota tha**
(ab `blogListingTags()`), hydration errors 0, aur speed `/blog` **85**, article **67** (A-17).
Bulk Upload ki images pe ab `width`/`height` lagta hai (CLS); purane imported post ke liye
`Existing` mode me dobara import chahiye.
Past imports me ab filter hai (`All · Packages · Blog posts`), aur 20 run **har type ke** bachte
hain — pehle dono milaa kar 20 the, yaani blog ke import package ka itihaas mita dete (D-92 §12).
⚠️ **Post ka parent ab Blog settings se, server pe** (D-92 §13, **migration 024**): `/blog/…` mode me
har post blog page ke neeche (admin list me `—`, breadcrumb `Home › Blog › Post`), `/…` mode me koi
parent nahi. Pehle ye kahin tay hi nahi hota tha — admin ka `—` aur page ka breadcrumb setting se alag
chal rahe the. Post ka bheja hua `parentId` ab maana nahi jaata.

**11 Sep — client ki list (D-93), koi migration nahi.** ⚠️ **Post ka `<h1>` ab Title hai** — Page
Header aur `fields.heading` post se gaye (10 Sep wala _"heading aur slug alag"_ palta); purane post
ka `fields.heading` DB me pada hai, koi padhta nahi. **Kai categories** (checkbox) — payload me
`category` ki jagah **`categories[]`**, card/hero pe saare badge, pills me post har category me
ginta hai. Category ka **badge rang** (`taxonomies.color`, khaali = Automatic). Excerpt optional —
khaali pe card content ke **24 shabd** leta hai. Hero byline me role ki jagah date · read time, TOC
pinned (`PinnedSide`). Review me **aadhe taare**. Blog settings ab **Posts ke submenu** me
(`/posts/settings`).

**11 Sep — header button ki jagah (D-94), koi migration nahi.** `headerButtons[].position`:
`left` = nav ke theek pehle (nav ke saath beech me), `right` = aakhir (default — purane button wahin).
Tablet/mobile pe dono group ek saath daayein. "Icon only on mobile" ab sirf **750px** se neeche
(pehle 1040 — tablet pe bhi label chhupta tha). Desktop pe (left button ho to) header grid `2:1:1` —
Awards apni jagah, menu dono taraf **barabar** (§4). Admin me row me akela dropdown 750px se upar
`max(50%, 300px)` — **client ka apna tune** (`primitives.css`), palatna nahi.
⚠️ **Aaj ka koi site badlaav render hote hue dekha nahi gaya** — port 3000 pe purana build tha
(**A-24**).

**14 Sep — saada page (D-95), A-9 band, koi migration nahi.** `page-template-text.html`:
`Pages ▸ All Pages · Add New` asli screens, `page` ka **apna** field set (Tour ka nahi —
`subheading · statRail · heroButton · showWhatsapp · showToc · sidebar · sidebarId`), aur theme me
`components/page/TextPage.jsx`. `<h1>` = Title, byline `Updated Aug 2026 · N min read` (sirf
mahina + saal), hero button **page ka apna**, content Text + FAQs block (`articleHtml(…, { lead:
false })` — callout/caption hain, bada pehla paragraph nahi), `On this page` per-page checkbox
(`withToc()` ab post aur page ki saanjhi), banner sirf Featured image. **1051 test.**
⚠️ Deploy pe **`pnpm seed`** (field set sync) aur API restart. ⚠️ Render dekha nahi gaya — **A-25**.
Usi din **All Pages ka All dates** (aur `month` regex ka backslash — Posts ka filter 10 Sep se toota
tha) aur **Bulk Upload for pages** (D-95 §10): `IMPORT_TARGET.PAGE`, `page-doc.js` + `page-mapper.js`,
naya page `Pages Sidebar` right pe, `prepare` hook re-import pe admin ke chunav bachata hai.
**Usi shaam (D-95 §11–§12):** `Pages ▸ Pages settings` (`settings.pageSettings` — banner ka fallback +
`On this page`, sab pages ke liye), edit page se WhatsApp aur TOC ke checkbox hate (WhatsApp hamesha),
page ka FAQ saada h2/h3 (data FAQs block me hi), TOC pe current section highlight, form ke focus ka
glow har jagah se hata, Past imports me pagination, aur header ka band flyout `display: none` (touch
device pe page zoom-out ho raha tha). **1092 test pass (DB ke saath).**
**15 Sep — Home page shuru (D-96), Section 1 ban gaya, koi migration nahi.** Client **section by
section** bata raha hai (`home-nav-v3.html`); kram admin me drag se, har section pe **background colour
picker**. `homePage` naya type, **`urlPattern: '/'`** — `settings.homepageEntryId` nahi (ek hi baat ke do
source hote). Ek hi home (409), trash nahi (422). **Pages ▸ Home Page** seedha edit screen. Pehla section
**Hero with form** (`heroForm`): desktop/mobile image, title (Italic = accent), description, 4 stats, aur
form **seedha chuna** (sidebar nahi) + ribbon. Form me naya **Button label** (`forms.submitLabel`). Form
badle to jin pages ke section me wo hai unka `path:` saaf (`pathTagsForForm()`).
⚠️ CSS prefix block ka (`.hf-*`) — reference ke `.art`/`.faq`/`.sec` hamari site pe takraate hain.
⚠️ Naya section = server pe chaar jagah + admin editor + theme — D-96 §6 aur `project-state.md`.
⚠️ Aankh se dekhna baaki — **A-28**. Purana bug mila: sidebar ka badlaav ek ghanta late — **A-26**.
**1110 test** (13 naye home ke) — 15 Sep shaam **1139**, 16 Sep ko aur bhi (neeche).
Usi din **Section 2–11** bhi (info cards · FAQ · video reviews · image cards · testimonials · logo grid · package
grid · offer cards · text with video · award badges — D-96 §11–§23). Client ke niyam (font, multi-site, tokens) `project-state.md` me.
**16 Sep — home band, contact page live, aur code se site ka naam nikalna shuru (D-96 §24–§33).** Naya
`Custom editor` block + **Settings ▸ Custom CSS** (§25), Tour pe `Read more:` nishaan (§26), home ka island
map (§27) aur uske tabs (`sw-tab`/`sw-panel`, §29), home ki mobile patti (§28), **contact page** — `Enquiry
form` block + snippets + sidebar ke widget (§30), **Page settings ▸ Template** (`Default` / `Section layout`
— naya content type **nahi**, client ne dropdown maanga tha; §31), site ka apna **404** (§32), aur breadcrumb
ka `Andaman Tour Packages` ab `packageDefaults.archiveCrumb` se (§33).
⚠️ **Code me bacha hua site-specific text — A-31**: `Pricing.jsx` ka `CATEGORY_COPY` (chaar hotel category ke
naam aur unke paragraph) har package page pe chhapta hai, chahe content kisi bhi site ka ho.
⚠️ Sanitizer me teen cheezein allow hui, teenon ek hi wajah se (bina unke content **chup-chaap** girta tha):
SVG ka `<text>`/`<tspan>`, `<address>`, aur `aria-label`.
**17 Sep — 301 Redirects + package breadcrumb (D-97), koi migration nahi.** `/packages/` pe 404 se shuru hua.
**Settings ▸ 301 Redirects** — haath se `from → to` (site ka path ya `https://`), hamesha 301. ⚠️ **Resolve ka kram palta:
dikhne wala page pehle, redirect sirf uske na hone pe** — warna redirect ke baad bana page kabhi dikhta hi nahi. Page wale
path pe redirect ban hi nahi sakta (422), aur auto-redirect admin ke banaye ko kabhi nahi badalta. Package URL
`/packages/{slug}` hi rahega (client). Breadcrumb ab `Packages ▸ Itinerary Settings` me **Tour page ka dropdown**
(`breadcrumbPageId`) — naam/link us page ke Title/path se, server pe; `Section Headings` se label/link hate.
Naya admin design reference `reference/travel-cms-admin_v2.html` (fonts + colours) — **client ke saath baad me**.
**17 Sep shaam — Theme admin se (D-98), koi migration nahi.** Reference `admin-design-v4.html`. **Settings ▸ Fonts · Colours ·
Layout**: 6 rang + Advanced (Auto), 9 step ki size table, Google font server pe self-host / custom WOFF upload, width ·
kone · shadow · button · header/logo · footer logo. Pehle `globals.css` ki 273 seedhi values token pe aayin (look nahi badla,
har line verify). ⚠️ **Jo nahi badla wo site pe bheja hi nahi jaata** — defaults = `globals.css` ke aaj ke value, tests dono ko
milate hain. ⚠️ Weight/line/spacing sirf `h1`–`h6` + `body` pe.
Client ne teeno chala kar theek paaye. **Raat — Fonts pe discussion (A-32), koi code nahi badla:** ek tag alag jagah alag size
ka (D-73 ki virasat), isliye HTML same rakh kar har level ka ek matlab + admin me **"Text Elements"** (har text cheez → level)
ka prastav. ⚠️ **Client ki ijaazat ke bina code mat chhoona.**
**18 Sep — headings common (D-99), migration 026:** h1 40 · h2 25 · h3 16 (tablet/mobile ke saath), h3 ke do apwaad (19, 24),
footer h2 alag. Fonts ki H1–H6 ab sirf apne tag ka token; daam/stats/quote `FONT_FIXED_TOKENS` me (A-32 tak). HTML nahi badla.
**18 Sep shaam — Layout ▸ Spacing (D-100), koi migration nahi:** Section spacing · Block spacing (desktop/mobile) · Cards gap
(rows + columns). Card grids sab 14 pe common (client). Single content ka andar ka gap Block spacing ke anupaat me.
**18 Sep raat — home ki speed (D-101), koi migration nahi:** mobile **77 → 91–97** (asli PageSpeed), desktop 100. Custom editor
ki images lazy, fold ke neeche ke sections + band drawer `content-visibility`, video popup portal se. Apne origin ka `/uploads/`
link ab write pe relative (Media Library ke Copy URL se `localhost:5173` paste hua tha). ⚠️ `inlineCss` naapa, **rad** (89→74).
Bacha: render-blocking CSS (ek 108 KB file) — A-17.
**21 Sep — SEO ka bulk export + import maanga gaya (A-33), abhi koi code nahi.** Bulk Upload ke dropdown me
naya target — **SEO Title · Meta Description · page url**, sab types pe, milaan **URL se**. Client ne kaha
hai poori details wo khud bhejenge, isliye is session me **sirf jaanch aur doc**.
✅ Jaanch ka nateeja: **SEO Title/Meta Description kaam kar rahe hain** (package · page · post pe live
verify) — kami **data** ki hai, 28 entries me se sirf 5 pe SEO bhara hai, aur tour/blog/home pe zero.
⚠️ Teen baatein pehle se pata hain: `targets.js` me **chauthi** cheez judegi (aaj sheet me sirf Doc ke
link hote hain, yahan data row me hi hai), **New/Existing is target pe bemaani hai** (SEO se page banta
nahi — har row Existing), aur **URL ka milaan normalize karke** hona chahiye — D-86 bilkul yahi galti thi.
**21 Sep — desktop ke floating WhatsApp + phone button (D-102), koi migration nahi.** Client ne maanga aur
saath me kaha _"kisi bhi reference me dekho"_ — nikla ki `.float` **saaton site reference me** hai, bilkul
ek hi CSS ke saath, aur theme me **kabhi bani hi nahi**. Yaani naya feature nahi, **chhoota hua** hissa
(R15). Reference ne chaar faisle khud kar diye: WhatsApp upar, 48×48 gol bina label, default `right`, aur
760px neeche `display: none` (wahan `.mobar` yahi do kaam karti hai). Naya field **`settings.floatingContactSide`**
(`right`/`left`) — Settings ▸ General ▸ Contact & Social me ek dropdown, **dono button ke liye ek hi** (client).
Mount `layout.jsx` me hai, kisi page component me nahi.
⚠️ **On/off toggle jaan-boojh kar nahi hai** — `phone`/`whatsapp` dono khaali to button hi nahi bante (D-30
wala guard). Alag toggle rakhne ka matlab "band" ke **do** matlab, jo ek din alag ho jaate.
⚠️ `left` ek **modifier** hai (`.float--left`, `right: auto` ke saath) — base class seedha badalna wahi galti
hoti jo `.pgl--sideleft` pe bachayi gayi thi.
⚠️ Mera ek mashwara **reference ne kaat diya** — "hover pe number dikhe" reference me hai hi nahi, saada
`tel:` hai. R15: reference jeeta.
⚠️ **`.sidetab` bhi usi din mili aur wo bhi kabhi nahi bani** — client: _"patti baad me"_ (**A-34**). Do
cheezein ek din me milna ittefaq nahi — poora class-level milaan **A-35** me.

**21 Sep — Enquiries ▸ Popup (D-103), koi migration nahi.** Poori site ka **ek** popup enquiry form
(client: _"single popup only and single setting for all pages"_). Screen `Enquiries` ke submenu me
(client ne jagah khud chuni), **data `settings.popupSettings` me** — wahi batwara jo `tourSettings`
(8 Sep) aur `blogSettings` (D-93) pe hai. Admin se: form ka chunav · heading/text · ~~0–3 image~~
**ek image** (23 Sep, D-103 §10) · `Show after` second · `Show again` (session/once/N days/always) ·
aur **page type ke 6 checkbox**.
⚠️ **Popup ke apne fields nahi hain** — form `Enquiry Forms` se chuna jaata hai (D-86 wala sabak).
Theme me bhi doosra form component nahi — `EnquiryForm variant="page"`.
⚠️ **"Kaun dekh chuka hai" sirf browser me hai** — ISR me sab ko ek hi HTML jaata hai, isliye server
ko pata ho hi nahi sakta. Nateeja: history saaf karne pe popup phir dikhega.
⚠️ **Teen bug tests ne pakde:** adhoora PATCH poora popup uda deta tha (`.partial()` sirf upar wale
level pe lagti hai), `showOn` ki anjaan key chup-chaap girti thi (ab `.strict()`), aur heading ki HTML
sanitize hi nahi ho rahi thi — **settings me ye pehli HTML hai**, ab `sanitizePopupSettings()` (R20).
⚠️ **Chautha bug sirf live chalane pe mila (D-103 §7):** gating sahi hone ke bawajood popup ka poora
maal har page ke HTML me ja raha tha, kyunki `MobileNav` (header, har page pe) **poora `settings`
object** client ko bhejta hai. Ab `getSettings()` `popup` nikal deti hai aur `getPopup()` alag hai.
Baaki settings ab bhi poori jaati hai — **A-36**.
⚠️ Route `/enquiries/popup` **`/enquiries/:id` se pehle** hona zaroori tha.
⚠️ Aankh se dekhna baaki — **A-37**. Maine DB me ek **test config** likh di hai (home page pe, 5 second).

**21 Sep — itinerary ke do khaane badle, naya Notes section (D-104), migration 027.** Client ke chaar
point: meals **free text** (checkbox nahi — teen se zyada ho sakte hain), `Popular add-ons` ke theek
upar naya **Notes section** (`fields.notes{heading,content}`), din ka `note` khatam, aur transfer ka
sawaal.
⚠️ **Notes ka heading per-package hai — page ka ekmatra aisa section** (baaki nau `sectionLabels` se,
D-65). Client ka faisla. Isliye wo `PACKAGE_SECTIONS` me hai hi nahi, aur "khaali" ka matlab bhi ulta
hai: **dono khaali = section hai hi nahi** (payload me `null`).
⚠️ **Meals ka enum A-38 ki wajah se gaya** — client ke doc ka `Evening tea` importer me **gir** jaata
tha. `MEAL_LABEL` khatam (do jagah thi); `hasBreakfast()` ab `packages/shared` me ek hi jagah, kyunki
card ka chip `includes('breakfast')` se banta tha aur wo `Breakfast (buffet)` pe jhootha hota.
⚠️ **Din ka `note` migration 027 ne DB se mita diya** (client ka faisla) — 49 din, **paanch alag lines**,
paanchon D-104 §4 me likhi hain. Importer me `Notes` ka label **jaan-boojh kar bacha** hai: hata dene pe
wo line upar wale khaane me **chipak** jaati (A-38 wali galti) — ab mapper use girata hai, ek note ke saath.
⚠️ Transfer aur duration ab **do alag chip** — `Transfer: Flight` · `Transfer duration: About 2 hrs`
(client ke apne shabd). Pehle `Ferry: 2 hrs` ek me jude the; wo bug nahi tha, par client ne alag maanga.
⚠️ Bulk Upload ke naye label `Notes Heading`/`Notes Content` **`Day wise Itinerary` se PEHLE** aane
chahiye. Deploy pe **`pnpm cms migrate` aur `pnpm seed` dono**, phir **API restart**.
⚠️ Aankh se dekhna baaki — **API dev server abhi purana code chala raha hai**.

**21 Sep shaam — popup ki naap (D-103 §8), master list ka bug (D-105), aur ek naya ask jo roka gaya.**
Client ne popup **live dekha** (A-37 band): width 840→560, scroller gaya (parde se `overflow-y` hata,
dabbe wala rehne diya — wo phone pe Submit tak pahunchne ka ekmatra raasta hai), aur close button ab
`.pmod__shell` ke sahare dabbe ke **bahar** hai (`.vmod` wala hi dhaancha).
⚠️ **`aspect-ratio` ki jagah `vh`** — wo ooonchai ko **chaudai** se baandhta hai, isliye 840px ke dabbe
me ek image 630px oonchi ban jaati thi. Popup ko viewport me samaana hai, to hadd bhi viewport se.
⚠️ **D-105 — master list me bhara hua khaana khaali nahi ho pata tha.** `submit()` ki ek line har khaali
value gira deti thi; wajah theek thi (khaali `destinationId` 422 deta hai) par usne har **optional**
khaane ko bhi pakad liya — paanchon screens pe. Lakshan wahi: API 200, "updated.", DB me purani value.
Niyam ab `lib/master-list-payload.js` me hai apne test ke saath — `submit()` ke andar uska test likha
hi nahi ja sakta tha, **aur isiliye wo galti chup padi rahi** (D-92 §11 wala sabak).
⚠️ **A-40 — `Settings ▸ Integrations` (header/footer/body) client ne ROK diya**: _"abhi main confirm
nahi hu, ise bhi mat banao, abhi sirf doc me update kar lo"_. Jaanch aur chaar khule sawaal
`09-OPEN-ITEMS.md` me. ⚠️ Wo feature R20 ka apwaad maangta hai aur `customCss` se **alag** khatra hai.
⚠️ **`next build` chalane se pehle `netstat` se `:3000` dekho** — dev chalte hue build chala diya gaya
aur dev server 500 dene laga (D-89 ka jaal, dobara). Code me kuch nahi toota tha.

**22 Sep — popup client ke saath settle hua (D-103 §9–§9.7), koi migration nahi.** Client ne screenshot
bhej kar chaar round karwaye: close button ka background (`.vmod__x` se udhaar liya gaya 16% safed site
ke header pe gayab tha), **scroller** (jad: form `variant="page"` pe apna card banata tha — dabbe ke
andar dabba, padding do baar), phone pe **poori image-patti** hatana (image + uska heading dono), aur
`Heading above the form` ka chhapna (`EnquiryForm` me `page` ki branch thi hi nahi).
⚠️ **Sabse bada sabak — §9.7:** scroll theek karne ke liye maine **content chhota kiya** (image
220→160, textarea 115→56), do baar. Client ne roka: _"why you are making images height small to fix
scroll"_ — aur khud browser me label hata kar jad batayi. Ab **`formFieldSchema.label` optional hai**
(`min(1)` gaya): khaali = site pe naam dikhta nahi, khaana chalta rehta hai. 4 label = ~116px, utni hi
bachat, aur design ka koi hissa chhota nahi hota. Image aur textarea wapas poore naap pe.
⚠️ **"Label chhupa do" ka matlab sirf dikhne ka hai** — theme wahan `aria-label` lagati hai
(placeholder → key), warna khaana screen reader pe bina naam ka milta. Checkbox apwaad hai.
⚠️ **Wo code ka badlaav hai, content ka nahi** — labels tab tak dikhenge jab tak client `Enquiries ▸
Enquiry Forms` me unhe khud khaali na kare.
⚠️ Naya open item **A-41** — "admin ka field payload tak aata hai par theme padhta hi nahi" ka poora
milaan. Ye is repo ka sabse baar-baar aane wala bug hai (D-82 · D-89 · D-90 · D-102 · D-103 §9.5).

**22 Sep — Settings ▸ Integrations (D-106), koi migration nahi.** Teen khaane (header · body · footer),
poori site pe, client ke shabd: _"view source me dikhega across the website, not on frontend"_.
⚠️ **Ye poore system me ekmatra jagah hai jahan HTML sanitize NAHI hoti** — R20 ka jaan-boojh kar liya
gaya apwaad, kyunki field ka kaam hi `<script>` chalana hai (GA · Pixel · GTM). Suraksha safai se nahi,
**do pehron** se: route pe `settings.scripts.update` (spec 001 se reserved, sirf admin) **aur**
`updateSettingsSchema` me se field ka hata hona. Doosra kam zaroori nahi — bina uske pehla bemaani.
~~⚠️ **`<head>` me raw HTML `<head>` par khud `dangerouslySetInnerHTML` se jaata hai**~~ — **Superseded by D-113
(23 Sep):** usi se **404 pe poori CSS gayab** thi. Ab head asli elements se banta hai, Integrations ka HTML
server pe `splitHeadHtml()` se tootta hai. `<div>` wala sabak (head band ho jaana) ab bhi sach hai.
⚠️ **`getSettings()` `integrations` nikal deti hai, `getIntegrations()` alag** — warna wo code har page
ke HTML me do baar jaata (A-36, D-103 §7 wala hi bug).
⚠️ **Permission aur nav dono pehle se rakhe hue the** — teesri baar (`.float` D-102, `.sidetab` A-34).
**Naya kaam shuru karne se pehle dhoondho ki wo pehle se rakha to nahi hai.**

**22 Sep — SEO ka bulk export + import (D-107), A-33 band, koi migration nahi.** Bulk Upload me chautha
target **`Meta upload`** (client ke apne shabd) aur page-head pe **`Export SEO`** (`tools.export`, jo spec
001 se reserved pada tha — **chauthi baar** koi cheez pehle se rakhi mili). Teen field: Page URL · SEO
Title · Meta Description, **sab types par sirf Published**, milaan **`path`** se.
✅ Pehle ye jaancha gaya ki SEO chal bhi raha hai ya nahi — **chal raha tha**; kami **data** ki thi (28
live entries me se sirf 5 pe SEO, tour/blog/home pe zero — yahi A-17 ka "SEO 91").
⚠️ **`targets.js` me ab chauthi cheez hai** — _sheet kaise padhi jaaye_ (D-92 ka "sirf teen" purana ho
gaya). SEO wali sheet me doc ke link nahi hote, maal row me hi hota hai; badle me is target ko doc parse,
images aur master lists **teeno nahi** chahiye.
⚠️ **`updateEntry()` ka `$set` poora `seo` replace karta hai** — isliye `toSeoUpdate()` purane `seo` ke
upar merge karta hai. Bina uske har import har page ka `canonical`/`noindex`/`og*` chup-chaap uda deta.
⚠️ **`New/Existing` is target pe dikhta hi nahi** (SEO se page banta nahi) aur **`status` kabhi nahi
chhua jaata** (draft draft rehta hai, live dobara publish nahi hota).
⚠️ **URL normalize hota hai** — origin · query · hash · bada akshar · aakhir ka slash sab. **D-86 theek
yahi galti thi.** ⚠️ `csvCell()` ab `packages/shared` me hai (`forms` ki copy hat gayi).
⚠️ Live check ne ek test ki kami pakdi — _"pehli row chali, doosri giri"_ wala raasta kisi test se guzarta
hi nahi tha. Aur: alag se script chalao to yaad rakho ki `:4000` ka server **apna** worker tick karta hai.

**22 Sep — Settings ▸ Email / SMTP (D-108), koi migration nahi.** **Repo ka sabse purana blocker khul
gaya** — SMTP Phase 0 (19 Aug) se ruka tha. Ab site ka mail account **admin panel se** set hota hai
(`settings.mail`), `.env` se nahi — kyunki non-technical client `.env` kabhi nahi kholega. Chhe khaane,
bilkul reference ke (`admin-design-v2.html:1436`, paanchon reference me hu-ba-hu same); koi Encryption
dropdown nahi — `secure` **port se derive** (465 = SSL). Naya `core/mailer.js` (`revalidate.js` ka
"fail soft, par chup nahi" saancha) aur `core/secrets.js` (AES-256-GCM, key `JWT_ACCESS_SECRET` se
HKDF — naya required env var nahi, warna purane deploy boot pe hi mar jaate).
⚠️ **`mail` Zod ke `settingsSchema` me hai hi nahi — sirf Mongoose model me, aur wo pehra hai.**
`toPublicSettings()` us schema se parse karta hai aur Zod anjaan keys **strip** kar deti hai, isliye
password kisi aam settings response me **ja hi nahi sakta**. `settings.read` **editor ke paas bhi hai**
(spec 001) — bina is rok ke SMTP ka password har Settings kholne wale ko milta. Uska **structural test**
hai; wo us din phatega jis din koi `mail` ko schema me jodega.
⚠️ **Khaali password = "purana rehne do", "mita do" nahi** — screen password kabhi padhti nahi, to wo
khaana hamesha khaali khulta hai. Mitane ka apna nishaan (`clearPassword`). **D-105 wali hi galti**,
pehle se rok di gayi.
⚠️ **Test mail hamesha logged-in user ke apne email pe** — route body leta hi nahi, warna `settings.update`
wala har user site ke naam pe mail bhej sakta (mail relay). Uska apna rate limiter bhi hai.
⚠️ **Asli SMTP ka raasta tests se guzarta hi nahi** (test me `jsonTransport`) — isliye **MailDev** se
alag se chala kar dekha gaya aur mail pahunchi. Dev me asli account chahiye hi nahi:
`docker compose up -d maildev` → Host `localhost`, Port `1025`, inbox `:1080` (`06-OPERATIONS.md` §4.2).
⚠️ **Feature poora pehle se rakha hua tha** — design, nav entry, tab, `SMTP_*` env vars, `SMTP_PASS` ka
redact hona. Sirf route nahi tha. **Paanchvi baar** (`.float` · `.sidetab` · `settings.scripts.update` ·
`tools.export`). ⚠️ Reference ka `Enquiry Notifications` panel jaan-boojh kar nahi bana (R15 deviation,
client ko batana hai). Deploy pe **`pnpm install`** chahiye.
✅ **Client ne poora raasta do baar chala kar dekha — MailDev pe, aur apne asli Google Workspace account
se** (`arun@progryss.com` → `progryss@gmail.com` ke **Inbox** me, Spam me nahi). **A-42 band.** Password
wale teenon flow bhi chale, sabse zaroori wala bhi: sirf From Name badal kar Save, mail phir bhi gayi.
⚠️ **Client ne `Enquiry Notifications` panel mana kar diya** (D-108 §10, _"i dont need"_) — yaani nayi
enquiry pe **email nahi jaayegi** (wo `Enquiries` inbox me hi dikhegi, D-76 wali soch), aur **SMTP ka aaj
koi asli grahak nahi hai** — sirf `Send Test Email`. Agla grahak `forgot`/`reset` hoga (ab unblocked,
client ne maanga nahi).
⚠️ **Client ka network port 465 block karta hai, 587 khula hai** — mail ki kisi bhi dikkat pe **pehle yahi
dekho**, `ETIMEDOUT` bilkul "code toota hai" jaisa dikhta hai.
⚠️ **Usi chalane se ek asli bug nikla (D-108 §9): `hasPassword`.** `GET` wo key bhejta hai (asli password
kabhi nahi), screen poora jawab wapas bhej deti thi, aur `.strict()` ne Save rok diya — _"Unrecognized
key(s)"_. **29 API test isse pakad nahi paaye kyunki wo sab payload KHUD banate hain**; "server ka jawab
wapas server ko bhejna" wale raaste pe koi test tha hi nahi. **Ye D-105 wali shakl hai** — ilaaj bhi wahi:
niyam ab `toMailUpdate()` me (`packages/shared`), `handleSubmit()` ke andar nahi, **8 naye test** ke saath.
**Sabak dobara:** jo niyam `submit()` ke andar likha hai, uska test likha hi nahi ja sakta.

**23 Sep — nayi enquiry ki mail team ko (D-109, A-43 band), koi migration nahi.** Mail `Email
enquiries to` wale pate(on) pe — **team ko, bharne wale ko nahi** (client ne ye saaf kiya; maine pehle
auto-reply samjha tha). Subject + message **har form pe** (`Enquiry Form ▸ Notification email`, rich
editor), variables form ke apne fields se (`{{fullName}}`) + `{{all_fields}}` ki table. Reply-To =
customer. Enquiry Detail pe `Emailed to …` ya not-sent ki wajah (`enquiry.notification`).
⚠️ **Koi toggle nahi** — `emailTo` khaali = mail nahi. **Khaali subject/message = default template**, band nahi.
⚠️ Niyam `packages/shared/src/enquiry-mail.js` me, pure functions + tests (D-105/D-108 §9 ka sabak):
bhari value **escape**, subject me **newline nahi**, Reply-To sirf asli pate pe.
⚠️ Submit mail ka **intezaar nahi** karta. `sourceUrl` ab `toSourceUrl()` (service) — ek hi jagah.
⚠️ **Auto-reply NAHI bana** — client ne maanga nahi, aur wo mail relay ka khatra laata hai.
⚠️ Asli submit → asli inbox abhi nahi dekha — **A-44** (asli DB ka SMTP client ka account hai).
**1430/1431 test.**

**23 Sep shaam — administrator ka password reset (D-110), migration 028.** Login ka `Lost your
password?` ab chalta hai (19 Aug se band tha). Client ka niyam: **mail sirf administrator ko** — baaki
users ka password admin `Users ▸ Edit User` se badalta hai; kami sirf tab thi jab admin khud bhoole.
30 minute ka ek-baar ka link, DB me sirf token ka hash, link `ADMIN_URL` se (header se kabhi nahi),
token `#` ke baad. Jawab **har email pe ek jaisa** (kaun admin hai, ye bahar na jaaye). Reset pe saare
session band + "password changed" mail. Aakhri raasta: **`pnpm cms reset-password <email>`** (server pe).
⚠️ **`ADMIN_URL` ek ORIGIN hai** (CORS), admin ka path `/admin` code me pakka — link = origin + `/admin`
(`adminUrl()`). Pehli live koshish pe link `/admin` ke bina bana aur **19 test pass rahe**, kyunki wo link
ko `adminUrl()` se hi milaate the (D-110 §12). **Jo test apne hi code se expected value banata hai, wo us
code ki galti nahi pakad sakta.** ✅ **A-46 band** — client ne asli SMTP se 1–7 chala liye; sirf CLI (#8) live nahi dekha.
Deploy pe **`pnpm cms migrate`** + API restart.

✅ **A-46 aur A-44 client ne live chala liye** (23 Sep).
**23 Sep — Pages ka `Gallery` block (D-111), koi migration nahi.** Sirf `page` pe, dono template. Row me kitni
image **desktop (2–6) aur mobile (1–3) alag dropdown**, tablet apne aap (max 3), square tiles, click pe Lightbox,
images Media Library se **ek baar me kai** (`MediaPicker multiple`). Reference `page-template.html` ka `.gal4`
pehle se tha — **chhathi baar**. Client ne live dekh liya (Lightbox ko portal chahiye tha — `.blk` ka `contain`).
**23 Sep — Pages ka `Video` block (D-112), koi migration nahi.** YouTube link, thumbnail (YouTube ka ya admin
ki cover image) + play, **iframe sirf click pe** (speed). Reference ka `.embed` bhi pehle se tha. ✅ Client ne live dekh liya (A-48 band).
**23 Sep — 404 pe CSS nahi lag rahi thi (D-113), koi migration nahi.** Jad D-106: `<head>` pe `dangerouslySetInnerHTML`.
404 pe Next page browser me banata hai, React `layout.css` ka link head me daalta hai aur hamara `innerHTML` use mita
deta tha. Ab head **asli elements** hain (`lib/head-html.js`, 8 test). Headless Chrome se naapa: link 0 → 1.
**1475/1476 test** (akela fail purana `theme-fonts`).
**23 Sep raat — popup: ek image, 720px, form teen column (D-103 §10), migration 029.** Image ki chhat 3 → **1**
(`POPUP_MAX_IMAGES`; 029 pehli image rakhti hai — bina uske `toPublicSettings()` ka parse `/settings` tod deta).
Teen column **sirf CSS**, sirf `.pmod__body` me aur 761px se upar — baaki forms nahi chhue. Aankh se dekhna — **A-49**.
Phir §11: popup se `Text above the form` gaya; image ka `clamp(100%, …)` MIN → `200px` (client) — `100%` pe chhat kabhi lagti hi nahi thi (scroller).

⏭️ **Agla kaam: A-38** — Kerala package ka import
(_"content doesn’t come on frontend"_). Uske baad **A-32** (Fonts — client ke jawab pe ruka), phir baaki
pages PageSpeed pe (A-17).
⚠️ **Global `Enquiry Notifications` PANEL mat banao — client ne 22 Sep ko mana kiya** (D-108 §10). Per-form
mail D-109 me hai.
`project-state.md` ka pehla section padho.

Poori list → [`docs/09-OPEN-ITEMS.md`](docs/09-OPEN-ITEMS.md)

---

## Admin design — FROZEN

Admin ka spec [`docs/reference/admin-design-v2.html`](docs/reference/admin-design-v2.html)
hai — **v2, v1 nahi** (client ne 1 Sep ko di, spec 3 Sep ko banayi — **D-74**).
Analysis: [`docs/11-REFERENCE-ADMIN.md`](docs/11-REFERENCE-ADMIN.md).
**Usi ke hisaab se banega** — layout, colours, spacing, wording sab.

⚠️ `admin-design.html` (v1) ab **itihaas** hai. v2 uska poora superset hai — v1 ka ek bhi
screen usme se hata nahi, sirf **Enquiry Forms** ke screens jude (`Enquiry Forms`,
`Enquiry Form`: Basics · Fields · Where it appears · Save). Purani docs me v1 ka naam mile
to wo us waqt ka sach hai, use badla nahi gaya.

`docs/04-ADMIN-UX.md` ab secondary hai; conflict ho to design jeetega.
Design badal sakta hai — par change **client se** aayega, developer se nahi.
Build ke waqt kuch theek na lage to pehle poochho, khud mat badlo.
