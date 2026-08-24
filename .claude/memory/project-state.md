# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 21 Aug 2026

---

## Abhi kahan hain

**Phase 0 ka approved execution scope poora.** Auth, RBAC, admin shell, Users,
Settings General, Media foundation, aur Settings Logo/Favicon current scope me live hain.
Original Phase 0 ke teen backlog items abhi bhi deferred/non-blocking hain (neeche).

```
Phase −1  Din-1 faisle                    ✅ 8/8
Phase 0   Setup layer                     ✅
          Zod contract (spec 002)         ✅
          Migration runner                ✅
          CSS architecture (D-28)         ✅
          Auth + RBAC                     ✅  ← 20 Aug
          Seed script (spec 004)          🟡  roles + admin user ✅, baaki Phase 1 pe block
          Admin shell (login + sidebar)   ✅  ← 20 Aug
          Users screens                   ✅  ← 20 Aug
          Users menu role-aware + Profile ✅  ← 21 Aug (D-37)
          Settings model + General screen ✅  ← 21 Aug (D-40)
          Media foundation                ✅  ← 21 Aug (D-41, pulled forward)
          Settings Logo/Favicon live      ✅  current approved scope complete
          Docker compose (api + admin)    🟡  deferred, chhota, kuch block nahi
          CSP policy (nonce-based)        🟡  deferred to Phase 4-5
          forgot / reset                  🟡  deferred, SMTP pe block (Phase 2)
Slice 0   Header + Footer end-to-end      🔴
Phase 1+  Content core aur aage           🔴
```

**Health:** 279 tests passing · lint clean · admin build clean · API media/settings
integration clean. Media upload route, SVG rejection, media.upload permission, and
settings logo/favicon ID persistence have focused coverage.

`pnpm format:check` clean hai — pehle wali 9 prettier-dirty files theek ho chuki hain.

---

## 🔒 Design ab SPEC hai — sabse zaroori baat

Client ne **do asli design** diye. Ye ab guess ki jagah le chuke hain:

| File                               | Kya                                        |
| ---------------------------------- | ------------------------------------------ |
| `docs/reference/admin-design.html` | **Admin ka spec.** Isi ke hisaab se banega |
| `docs/11-REFERENCE-ADMIN.md`       | Uska analysis — kya match, kya gap         |
| `docs/10-REFERENCE-DESIGN.md`      | Public site (Andaman) ka analysis          |

**Rule ab likha hua hai — `07-CONVENTIONS.md` R15.** (Pehle ye rule kahin likha hi
nahi tha; docs galti se "rule 8" bolte the, jabki R8 Zod validation hai.)

`04-ADMIN-UX.md` ab **secondary** hai — conflict ho to design jeetega.

---

## Faisle jo ho chuke hain

| Faisla                | Nateeja                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| Field DSL             | **Ek DSL** — `contexts: ['content'\|'block']` (D-24)                                |
| TypeScript            | **Nahi** — sab JavaScript (D-03)                                                    |
| Trash                 | **`deletedAt` field**, `status: 'trash'` nahi (D-25)                                |
| Roles                 | **Paanch** — `subscriber` nahi (D-26), `salesAgent` hai (D-29)                      |
| Permanent delete      | **Sirf admin**                                                                      |
| Seed content          | **Khaali** Home + Blog                                                              |
| Payload spike         | Approved — Phase 1 se pehle, abhi baaki                                             |
| Pehla milestone       | **Slice 0: Header + Footer** (D-27)                                                 |
| **CSS**               | **Plain CSS** — Tailwind, CSS Modules, CSS-in-JS teenon reject (D-28)               |
| **Ruki hui cheezein** | Connection point abhi, data baad me (D-30)                                          |
| **Login screen**      | Design me nahi tha → WordPress-style, design ke tokens se (D-31)                    |
| **Password hashing**  | `bcryptjs` cost 12 — native `bcrypt` nahi (D-32)                                    |
| **`.env` loading**    | Node ka `process.loadEnvFile()` — `dotenv` nahi (D-33)                              |
| **Users**             | `username` immutable · asli delete + reassign · admin protected (D-34)              |
| **Password**          | Sirf admin set karta hai; user khud nahi badal sakta (D-35)                         |
| **Built-in roles**    | Code-owned — permissions har deploy pe sync hoti hain (D-36)                        |
| **Users ka menu**     | Role-aware — admin ko 3 item, baaki ko sirf Profile (D-37)                          |
| **Apna password**     | User Profile se khud badal sakta hai, current password ke saath (D-37)              |
| **Session ki umr**    | 24 ghante · "Remember me" pe 7 din · dono sliding (D-38)                            |
| **Role dena**         | Apna role khud nahi · apni permission se upar ka role kisi ko nahi (D-39)           |
| **Settings**          | Screens design se (Phase 7 se aage khiskin) · Site URL env se, editable nahi (D-40) |

Specs 001–005: 001/002/003 ✅ implemented, 004 🟡 aadha, 005 🟢 approved.

---

## Auth kaise kaam karta hai (20 Aug me bana)

```
access token   15 min   httpOnly cookie
refresh token  24h/7d  rotation + reuse detection. 7d sirf "Remember me" pe (D-38)
               SLIDING — ghadi inactivity pe chalti hai, login se nahi
CSRF           double-submit, har non-GET pe
permissions    roles collection se, 60s in-process cache
```

**Teen cheezein jo yaad rakhni hain:**

1. **`attachUser` har request pe user DB se laata hai** (role cached hai, user nahi).
   Isliye deactivate kiya gaya user agli hi request pe bahar — 15 min baad nahi.
2. **Reuse detection poori family maar deti hai.** Ek purana refresh token dobara aaya
   = us login session ke saare tokens revoke. Isiliye admin client me **single-flight
   refresh mutex** hai (`lib/api.js`) — bina uske 5 parallel 401 se 5 refresh chalte
   aur user bewajah logout ho jaata.
3. **`mustChangePassword` ek gate hai, banner nahi.** Seed ka admin `.env` wale plain
   text password se aata hai; jab tak wo na badle, andar jaane dena us password ko
   zinda rakhna hai.

---

## 21 Aug ko kya bana (D-37)

**Users ka menu ab role ke hisaab se badalta hai, aur Profile screen ban gayi.**

```
apps/admin/src/lib/nav.js            nav registry — sidebar AUR route guard dono isse
apps/admin/src/screens/Profile.jsx   naam + password
apps/admin/src/screens/NoAccess.jsx  permission na ho to yahi
```

**Teen cheezein jo yaad rakhni hain:**

1. **`nav.js` ab ek contract hai, sirf ek list nahi** (R16). `NAV` sidebar deta hai,
   `ROUTE_GUARDS` route ka permission. Naya section jodte waqt **wahi ek file** kholni
   hai. Do jagah rakhne ka nateeja chup-chaap hota hai: item menu se gayab, par URL
   type karne pe screen khul jaati hai.
2. **`/profile` jaan-boojh kar `/users/` ke andar nahi hai.** Guard ka natural shape
   `/users` pe `user.read` maangna hai; profile ko uske andar rakhne se ek exception
   banana padta, aur wahi exception aage toot-ta.
3. **Password badalne pe purane saare session marte hain par turant naya mil jaata
   hai.** Pehle service sirf `revokeAllSessions()` chalati thi — us se user apna hi
   password badal kar logout ho jaata. Iska test hai:
   _"jis browser se badla wo chalta rehta hai"_.

**Client ne test kiya aur ek asli bug pakda (D-38).** "Remember me" off hone ke bawajood
password badalne ke baad browser band karke kholo to Dashboard khul jaata tha. Wajah:
`setAuthCookies()` ko refresh aur change-password dono **hardcoded `persistent: true`**
bhejte the. Ab `remember` `refreshTokens` record me hai aur rotation ke saath chalta hai.
Saath me TTL 7d se **24h** hui, aur "Remember me" wale ko alag **7d** milta hai.

> Ye bug D-37 se nahi aaya — refresh me pehle se tha, yaani "Remember me" pehle
> auto-refresh ke baad hi bemaani ho jaata tha. Password wale raaste me wahi pattern
> copy hua isliye dikh gaya.

**`ChangePassword.jsx` (forced flow) bhi badla:** ab wo `logout()` nahi, `reload()`
karta hai. Seed wala admin password badal kar seedha andar chala jaata hai.

**Permission ke abhi bhi teen layer hain, par sirf Users pe:** baaki menu items pe
`permission` jaan-boojh kar nahi lagayi — client ne abhi sirf Users ka shape maanga hai,
aur design frozen hai (R15). Wo tab lagegi jab wo screens banengi.

---

## Media foundation aur General Logo/Favicon — complete for current scope

**Media Phase 2 ka poora scope nahi bana.** Sirf foundation pull-forward hui, kyunki Logo
General Settings aur Slice 0 header dono ko block kar raha tha.

```
media collection + indexes (migration 006)
storage driver abstraction     local abhi, s3 ka interface taiyaar
upload hardening               magic-byte check · size cap · filename sanitize
                               sharp pixel limit (decompression bomb)
sharp variants + webp          "original kabhi serve mat karo"
Settings me Logo/Favicon       clickable drop zone upload · saved preview · replace/remove
                               logoMediaId/faviconMediaId settings me persist
Local media preview            API serves local `/uploads` from resolved UPLOAD_DIR
                               Vite dev proxies `/uploads` to API
```

Stored media URLs stay relative (`/uploads/...`); never store `localhost:4000` or any
other dev hostname in `media.variants[].url`.

**Baad me (Phase 2 me hi):** library grid · folders · media trash · `mediaRefs` usage ·
crop/rotate · replace · MediaPicker modal · S3 driver ka asli implementation.
Settings ke Logo/Favicon bhi tab MediaPicker use karenge; abhi direct upload current
scope ka live path hai, alag final picker UX nahi.

**Favicon-specific dimension validation deferred:** UI hint `512x512` bolta hai, par
backend abhi generic image validation karta hai. Ye current General completion ka blocker
nahi; Phase 2 Media validation/picker work me aayega.

**Delete jaan-boojh kar nahi banana.** `mediaRefs` ke bina delete = live page pe toota
hua image (08-RISKS ka documented trap). Delete hi na ho to wo trap lag hi nahi sakta.

### Ye order kyun

Logo **do jagah** ka blocker hai — General ka field, aur **Slice 0 ka header** (D-27 ke
scope me "logo" likha hai). Isliye Media pehle.

Aur Settings pe koi alag "logo upload" **mat banana**: usse do upload raaste ban jaate
hain aur logo `media` collection se bahar reh jaata — na usage tracking, na variants,
aur Phase 2 me use andar laane ke liye migration likhni padti. Foundation ke saath logo
pehle din se `media` me hi rehta hai; picker aane pe Settings ka field sirf "upload" se
"choose or upload" ban jaayega.

**SVG policy ab current scope me resolved hai:** SVG upload blocked by default. Sanitized
SVG support can be revisited in later Media work, but current General completion does not
depend on it.

### Ab official next task

**Slice 0 — Header + Footer end-to-end (D-27).** Ye abhi unimplemented hai.

---

**Users me chhota-mota baaki:** bulk actions (isiliye list me checkbox column nahi hai),
email badalna (SMTP), avatar (Phase 2). Column sorting **ban chuki** hai.
**Activity log defer ho chuka hai** — client ke design me hai hi nahi (Q-4).

**Har section kitna ruka hua hai:**

| Section    | Abhi kitna ban sakta hai | Kya rok raha hai                                                    |
| ---------- | ------------------------ | ------------------------------------------------------------------- |
| Users      | ~95%                     | Posts/Enquiries count (Phase 1, 7b) · invite email (SMTP)           |
| Settings   | 100% current scope       | MediaPicker/fav icon dimensions later · Reading/Permalinks Phase 1+ |
| Appearance | ~40%                     | Menu me Pages/Destinations chahiye (Phase 1 + 6)                    |

---

## Khule sawaal

| #   | Sawaal                                               | Kab tak           |
| --- | ---------------------------------------------------- | ----------------- |
| 1   | Enquiries — Phase 7b banayein ya alag Phase 9?       | Phase 7 se pehle  |
| 2   | Field DSL me `matrix` + `table` types add karne hain | Phase 5c se pehle |
| 3   | Payload CMS spike (2 din)                            | Phase 1 se pehle  |

**Jo band ho gaya:** "built-in role (`salesAgent`) edit ho sake ya Duplicate?" — ye RBAC
ko block kar raha tha. D-37 ke baad **role-edit ka koi UI hi nahi ban raha**, isliye ye
sawaal Phase 7 (custom-role builder) pe khisak gaya. D-36 ka takraav tab dekha jaayega.

---

## ⚠️ `apps/api/.env` me do cheezein theek karni hain

`.env` git me nahi hai, isliye ye code se theek nahi ho saktin:

```diff
- COOKIE_SECURE=true            # local HTTP pe browser cookie store hi nahi karega
+ COOKIE_SECURE=false           # prod me true

- MIGRATIONS_DIR=../../migrations   # cwd-relative — pnpm cms root se chalta hai
+ # line hata do, default sahi hai
```

Aur agar `pnpm seed` se admin banana ho to teen vars chahiye:
`SEED_ADMIN_EMAIL` · `SEED_ADMIN_PASSWORD` (min 10 chars) · `SEED_ADMIN_NAME`.

---

## Git

```
branch : main
remote : github.com/progryss/crmmern.git

c48a556  Settings — model, migration, General screen (D-40)
d9d4899  Column sorting · role dene ke do guard (D-39) · activity log defer
7e248ba  Role-aware menu (D-37) · Remember me fix (D-38) · admin English (R17)
53df920  D-37 ke docs
88ffdc2  Session wrap — Users poora
```

29 commits · working tree clean · **22 commits unpushed** (`origin/main` `0e328cb` pe hai).
`apps/api/.env` ka backup: `apps/api/.env.bak-1787215917` (gitignored).

⚠️ **Push kabhi bhi bina permission ke nahi karna.**

---

## Dev environment

```bash
pnpm install
docker compose up -d mongo        # mongo 8, port 27017
pnpm cms migrate                  # migrations
pnpm seed                         # roles + admin user
pnpm dev                          # teenon apps
pnpm test                         # 184 tests
```

Auth ke integration tests ko **chalta hua Mongo chahiye** (`pnpm db:up`) — wo
jaan-boojh kar mock nahi hain: reuse detection, TTL aur unique index sab DB ka
behaviour hain, service ka nahi.

---

## Desktop pe reference files (repo se bahar)

- `CMS-Technology-Guide.html` — 28 technologies, saral bhasha me
- `CMS-Build-Roadmap.html` — poora phase-wise roadmap
