# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 20 Aug 2026

---

## Abhi kahan hain

**Phase 0 — ~92% poora.** Auth, RBAC, admin shell aur Users screens ban chuke hain.

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
          Settings screens                🔴  ← AGLA KAAM
Slice 0   Header + Footer end-to-end      🔴
Phase 1+  Content core aur aage           🔴
```

**Health:** 184 tests passing · lint clean · admin build clean · asli Mongo pe
end-to-end verify kiya (login → rotation → reuse detection → logout)

⚠️ **9 files prettier-dirty hain** — 6 admin CSS + `App.jsx` se pehle wali + dono
memory files. `pnpm format` ek baar chala do.

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

| Faisla                | Nateeja                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| Field DSL             | **Ek DSL** — `contexts: ['content'\|'block']` (D-24)                   |
| TypeScript            | **Nahi** — sab JavaScript (D-03)                                       |
| Trash                 | **`deletedAt` field**, `status: 'trash'` nahi (D-25)                   |
| Roles                 | **Paanch** — `subscriber` nahi (D-26), `salesAgent` hai (D-29)         |
| Permanent delete      | **Sirf admin**                                                         |
| Seed content          | **Khaali** Home + Blog                                                 |
| Payload spike         | Approved — Phase 1 se pehle, abhi baaki                                |
| Pehla milestone       | **Slice 0: Header + Footer** (D-27)                                    |
| **CSS**               | **Plain CSS** — Tailwind, CSS Modules, CSS-in-JS teenon reject (D-28)  |
| **Ruki hui cheezein** | Connection point abhi, data baad me (D-30)                             |
| **Login screen**      | Design me nahi tha → WordPress-style, design ke tokens se (D-31)       |
| **Password hashing**  | `bcryptjs` cost 12 — native `bcrypt` nahi (D-32)                       |
| **`.env` loading**    | Node ka `process.loadEnvFile()` — `dotenv` nahi (D-33)                 |
| **Users**             | `username` immutable · asli delete + reassign · admin protected (D-34) |
| **Password**          | Sirf admin set karta hai; user khud nahi badal sakta (D-35)            |
| **Built-in roles**    | Code-owned — permissions har deploy pe sync hoti hain (D-36)           |

Specs 001–005: 001/002/003 ✅ implemented, 004 🟡 aadha, 005 🟢 approved.

---

## Auth kaise kaam karta hai (20 Aug me bana)

```
access token   15 min   httpOnly cookie
refresh token  7 din    rotation + reuse detection (refreshTokens collection)
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

## Agla session — RBAC (yahin ruke the)

Client ne **role-based access control** maanga hai: **Users → Roles** submenu, aur
role ko jo sections diye jaayein **sirf wahi sidebar me dikhein**. Unka example:
Sales Agent ko sirf Packages + Enquiries.

Approach samjha di gayi hai, **code shuru nahi hua**. Do cheezein pending:

1. **Spec `006-rbac.md` likhni hai** — client ne abhi "haan" nahi bola
2. **Ek faisla client se lena hai** (niche "Khule sawaal" me #1)

**Approach ka saar (jo client ko bataya):**

```
Teen layer, par asli boundary sirf pehli hai:
  1. server route   requirePermission()        ← asli rok
  2. admin route    screen render hi na ho     ← /users type karne pe
  3. sidebar        item chhupa do             ← sirf UX

Sabse bada kaam: permissions me SCOPE — `entry.read:package`
  Abhi `entry.read` = saara content. "Sirf Packages" kehne ka raasta hai hi nahi,
  kyunki Posts/Pages/Packages teenon ek hi `entries` collection me hain.
  Ye spec 001 ka khula sawaal tha; client ki demand ne use aaj bana diya.
  Saath me service layer me list queries ko allowed types se filter karna hoga.

Role screen: 67 checkbox nahi — section ke hisaab se
  (Kuch nahi / Sirf dekhe / Edit kare / Poora) + "Advanced" me ek-ek permission

Nav registry ek jagah: { id, label, to, permission } — sidebar aur route guard
  dono wahi padhein, warna naya section jodne pe teen jagah yaad rakhni padegi

Do guard: apna role koi edit na kare · jo permission khud ke paas nahi wo kisi ko
  de na paaye. Aur role save pe invalidateRoleCache() — warna 60s tak kuch nahi hota
```

> **Aaj ki sachai jo client ko bata di gayi:** Packages (Phase 6) aur Enquiries
> (Phase 7b) abhi bane hi nahi. RBAC aaj banega to Sales Agent ko wo do menu dikhenge
> par andar "abhi nahi bana" page milega. Aaj test yahi ho payega ki use **Users aur
> Settings dikhte hi nahi**. Ye D-30 wala pattern hai — jagah abhi, data baad me.

**Uske baad: Settings** — `settings` collection ka schema + migration, phir General.

**Users me chhota-mota baaki:** bulk actions (isiliye list me checkbox column nahi
hai), email badalna, avatar (Phase 2), column sorting (API taiyaar hai, UI nahi),
apni profile screen (`PATCH /api/me` bana hai, UI nahi — client ne kaha **naam
editable, baaki read-only**), aur **activity log** (conventions me hai, code me
kahin nahi).

**Har section kitna ruka hua hai:**

| Section    | Abhi kitna ban sakta hai | Kya rok raha hai                                          |
| ---------- | ------------------------ | --------------------------------------------------------- |
| Users      | ~90%                     | Posts/Enquiries count (Phase 1, 7b) · invite email (SMTP) |
| Settings   | ~75%                     | Homepage dropdown (Phase 1) · logo upload (Phase 2)       |
| Appearance | ~40%                     | Menu me Pages/Destinations chahiye (Phase 1 + 6)          |

---

## Khule sawaal

| #   | Sawaal                                                         | Kab tak           |
| --- | -------------------------------------------------------------- | ----------------- |
| 1   | **Built-in role (`salesAgent`) edit ho sake, ya "Duplicate"?** | **RBAC se pehle** |
| 2   | Enquiries — Phase 7b banayein ya alag Phase 9?                 | Phase 7 se pehle  |
| 3   | Field DSL me `matrix` + `table` types add karne hain           | Phase 5c se pehle |
| 4   | Payload CMS spike (2 din)                                      | Phase 1 se pehle  |

**#1 kyun blocking hai:** D-36 kehta hai built-in roles code-owned hain — unki
permissions har deploy pe code se sync hoti hain. Agar admin unhe edit kar sake to
**agla deploy uske changes mita dega**. Do hal: built-in roles read-only rakho aur
"Duplicate" do, ya ek `customizedAt` flag rakho jisse chhue gaye role ko code sync
karna band kar de. Doosra client ke example ke zyada kareeb hai.

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

35d4780  Built-in roles ab sync hote hain — D-36
5e28af3  Users ke teen changes — D-35
0826815  Users screens
5ffc545  Users backend — D-34
```

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
