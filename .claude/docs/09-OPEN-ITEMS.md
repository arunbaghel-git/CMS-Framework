# 09 — Open Items

**Status:** Phase 0 ka approved execution scope poora. Users ka role-aware menu + Profile
(D-37), Settings — model + migration 005 + General screen (D-40), Media foundation
(D-41), aur Settings Logo/Favicon current scope me live hain — **288 tests passing**.
Original Phase 0 ke teen items deferred/non-blocking hain (neeche).
**Last updated:** 24 Aug 2026

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
| C-2 Payload spike           | ✅ **Approved** (karna abhi baaki — neeche dekho)                                        |
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

---

## 🔴 Ab bhi baaki

### Q-7 · Logo na mile to header me uski jagah **kya** dikhe?

**Deadline:** Slice 0 ka header ka kaam shuru hone se pehle
**Client ka faisla hai, developer ka nahi (R15)**

Do case hain jinme header ko logo nahi milega:

- `logoMediaId` set hi nahi hai (naya instance, ya admin ne hata diya)
- id set hai par media resolve nahi hoti (Phase 2 me delete aane ke baad)

**Jo tay ho chuka hai (D-42 §2):** toota hua `<img>` **kabhi** render nahi hoga — na 404
wala `src`, na khaali `src`, na alt-text ka toota box. Ye ek constraint hai.

**Jo tay NAHI hua:** us jagah kya dikhe.

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

### C-2 · Payload CMS ka 2-din spike

**Deadline:** Phase 1 se pehle (Phase 1 land hote hi window band)
**Phase 0 ko block nahi karta** — auth ke saath parallel me ho sakta hai

Approve ho chuka hai, karna baaki hai. Kya check karna:

1. MongoDB adapter kaisa hai
2. Blocks field se page builder ban sakta hai kya
3. Admin UI kitna customize hota hai
4. Multi-instance model fit hota hai
5. Visual builder banane ki jagah milti hai ya nahi

Result se D-01 se D-30 me se kuch badal sakti hain — isliye Phase 1 se pehle.

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
5. Slice 0 — Header + Footer end-to-end          ← OFFICIAL NEXT (1.5 hafte)
6. C-2 — Payload spike (parallel me)             (2 din)
7. Phase 1 — Content Core                        (3 hafte)
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
- ⚠️ **1 commit unpushed** hai (total 33). `origin/main` `a2b10ad` pe khada hai; local
  HEAD `3c29b58` — Media foundation. Aage bhi push **sirf permission pe**
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
