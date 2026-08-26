# 09 — Open Items

**Status:** Phase 0 poora, aur **Slice 0 (Header + Footer) bhi ban chuka** — D-43 /
spec 006. **Header aur footer dono client ke reference se match kar diye gaye** (25 Aug)
— footer ka data model **D-44** me badla. 383 tests passing.

Phase 0 ke original teen backlog items abhi bhi deferred/non-blocking hain (neeche).
**Last updated:** 26 Aug 2026

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
9. Phase 1 — Content Core                        (3 hafte)
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
- ⚠️ **4 commits unpushed** hain (total 51). `origin/main` `0cfe50b` pe khada hai; local
  HEAD `513a120` — 25 Aug ka header work. Aage bhi push **sirf permission pe**
- ⚠️ **CI ka pehla step `pnpm format:check` hai** (`.github/workflows/ci.yml`:
  Format → Lint → Test → Build). `3c29b58` isi pe fail ho raha tha — 9 files prettier-dirty
  thin, ab theek ho chuki hain. Push se pehle `pnpm format:check` **hamesha** chala lo,
  warna CI pehle hi step pe red ho jaata hai
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
