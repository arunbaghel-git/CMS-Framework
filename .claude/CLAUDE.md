# MERN CMS Framework

Reusable CMS framework — **har client ki website ka apna instance** (apna DB, apna
domain, apna admin login), par **core code sab me same**, versioned `@cms/*` packages se.

Target user: **non-technical client**, jo admin panel se poori website chalaye.

**Status:** **Phase 0, Slice 0, Phase 1 ki Slice 1–7, aur Phase 2 (Media) — sab ban chuki
hain** (**764 tests passing**, 4 Sep). Public package page ke **saare** section live hain.
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

Teen item jaan-boojh kar deferred hain: docker compose me `api`+`admin`, CSP policy
(Phase 4-5), aur forgot/reset (SMTP pe block).

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
| "Aisa kyun hai?"      | [`03-DECISIONS.md`](docs/03-DECISIONS.md) — D-01 se D-83                |
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

**Slice C (admin screens) bhi ban gayi — aur usne A-9 band kar diya.** `Pages` list ·
`Tour Pages` list · **ek hi** edit screen · `Settings ▸ Tour settings`. `entries` engine 26 Aug
se `page` sambhal raha tha, par admin me uska koi raasta nahi tha — nav ke links `NotBuiltYet`
pe jaate the.

- **Blocks ka editor** — har block apna panel, `＋ Add block…` dropdown, ⌃⌄ se reorder, band
  hone pe bhi ek line ka summary
- **Generic entry hooks `lib/use-entries.js` me nikle** — `usePackages.js` ab unka patla wrapper
  hai (naam wahi, isliye paanch purani screens ko haath nahi laga)
- ⚠️ **Duration ki ginti admin me dikhti hi nahi** — wo padhne ki cheez hai, likhne ki nahi.
  Client sirf chunta hai ki kaunsi durations dikhein; ginti page pe server se aati hai
- ⚠️ **Pages ke nav links pe pehle `permission` thi hi nahi** — menu sabko dikhta tha. Ab dono
  jagah lagi hai (`NAV` + `ROUTE_GUARDS`), `/tour` ke saath

**Live check asli DB pe:** ek tour page banaya → publish → resolve → **hata diya**. Blocks kram
me (`richText → packageList → faqs`), byline apne aap, kachcha `content` payload me nahi, list
ne 5 me se 3 cards diye, facets `5N/6D[5]`, rating `packageDefaults` se. `tourSettings` alag se
DB me likh kar padha gaya. Dono ke baad DB waisi ki waisi.

Baaki slices: **D** (theme) · **E** (`Appearance ▸ Sidebar`, faisla #14).

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
