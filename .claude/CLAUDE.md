# MERN CMS Framework

Reusable CMS framework — **har client ki website ka apna instance** (apna DB, apna
domain, apna admin login), par **core code sab me same**, versioned `@cms/*` packages se.

Target user: **non-technical client**, jo admin panel se poori website chalaye.

**Status:** **Phase 0, Slice 0, aur Phase 1 ki Slice 1–5 ban chuki hain**; public package
page shuru ho chuka hai aur har slice ke saath badh raha hai (**554 tests passing**).
Agla kaam **Slice 6 — Itinerary Images pool + FAQs, goodToKnow, reviews + rating**.

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
| "Aisa kyun hai?"      | [`03-DECISIONS.md`](docs/03-DECISIONS.md) — D-01 se D-43                |
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

**Price line** (`per person on twin sharing…`) **Packages ▸ Hotels** screen pe hai (D-62) —
wo page pe sirf hotels table ke neeche chhapti hai, isliye setting wahin. Hero me daam ke
neeche abhi **kuch nahi** — wahan design me ek chhoti alag line hai jiske liye koi field nahi
bacha (jaan-boojh kar chhoda gaya gap).

**Add-ons ab global hain** (D-61) — package editor me unka panel nahi hai, page har package
pe poori Add Ons list dikhata hai, aur wo `packageDefaults` ke payload me jaati hai (cache
tag `type:package`). ⚠️ Spec §1.4 ka **ulta** hai, client ka faisla.

**Public hotels table poori tarah derived hai** (D-58, D-60) — rows itinerary ke overnight
stays se, categories pricing se, aur hotel Hotels master list se. Package ka panel **sirf
override** hai: usme kuch na karo to bhi table bharti hai. `fields.hotels[]` ab chunav nahi,
override hai.

Design ka koi text nahi hataya (R15). Jo per-package field nahi rahe unka source badla:
`per person on twin sharing…` ab `packageDefaults.priceNote` se, aur category card ki beech
wali line hotel ke apne `note` se. **Teen cheezein derive hoti hain, store nahi:** upar ka
daam (sabse sasti category), table ka `Nights` (itinerary se), aur `Deluxe category —
₹29,499`.

Agla kaam **Slice 6** (spec 007 §7) — Itinerary Images pool + gallery, aur FAQs ·
goodToKnow[] · reviews[] + rating.

**Design frozen hai (R15)**: `docs/reference/admin-design.html` ke hisaab se hi banega, aur
build ke waqt kuch theek na lage to **pehle poochho, khud mat badlo**. Jo farq abhi liye
gaye hain wo sab client ke faislon se hain aur `04-ADMIN-UX.md` ke aakhri section me
table me likhe hain.
spec 007 §9 ke **6 sawaal** abhi khule hain (#2, #5, #8, #14, #15, #16), par koi bhi plan
nahi rokta — har ek apne slice pe tay hoga (`09-OPEN-ITEMS.md`).

| #   | Kya                                                    | Kab tak                                      |
| --- | ------------------------------------------------------ | -------------------------------------------- |
| A-5 | `apps/web` ki `.env` — `REVALIDATE_SECRET` + `API_URL` | Ab — iske bina prod me cache saaf nahi hoga  |
| Q-7 | Logo na mile to header me kya dikhe?                   | Client ka faisla (R15) — abhi interim pe hai |
| Q-2 | Enquiries — Phase 7b ya alag Phase 9?                  | Phase 7 se pehle                             |
| Q-3 | Field DSL me `matrix` + `table` types                  | Phase 5c se pehle                            |

**Q-7 ka interim:** logo na mile to header me **kuch render nahi hota** (nav left shift).
Ye D-42 §2 ka palan hai, koi faisla nahi. Code me `Q-7 INTERIM` comment hai
(`apps/web/components/SiteHeader.jsx`) — jawab aane pe sirf ek JSX branch badlegi.

**D-42 §2 ka invariant ab sach me enforce hai** — public API media resolve na hone pe `null`
bhejti hai, isliye toota `<img>` banta hi nahi. ⚠️ Aur ek sabak: wo invariant **delivery
layer pe bhi** toot sakta hai — `apps/web` me `/uploads/*` ka rewrite chhoot gaya tha aur
payload sahi hone ke bawajood logo 404 de raha tha.

Poori list → [`docs/09-OPEN-ITEMS.md`](docs/09-OPEN-ITEMS.md)

---

## Admin design — FROZEN

Admin ka spec [`docs/reference/admin-design.html`](docs/reference/admin-design.html) hai
(analysis: [`docs/11-REFERENCE-ADMIN.md`](docs/11-REFERENCE-ADMIN.md)).
**Usi ke hisaab se banega** — layout,
colours, spacing, wording sab.

`docs/04-ADMIN-UX.md` ab secondary hai; conflict ho to design jeetega.
Design badal sakta hai — par change **client se** aayega, developer se nahi.
Build ke waqt kuch theek na lage to pehle poochho, khud mat badlo.
