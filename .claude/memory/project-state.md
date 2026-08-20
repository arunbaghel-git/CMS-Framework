# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 20 Aug 2026

---

## Abhi kahan hain

**Phase 0 — ~85% poora.** Auth + RBAC + admin shell land ho chuka hai.

```
Phase −1  Din-1 faisle                    ✅ 8/8
Phase 0   Setup layer                     ✅
          Zod contract (spec 002)         ✅
          Migration runner                ✅
          CSS architecture (D-28)         ✅
          Auth + RBAC                     ✅  ← 20 Aug
          Seed script (spec 004)          🟡  roles + admin user ✅, baaki Phase 1 pe block
          Admin shell (login + sidebar)   ✅  ← 20 Aug
          Users screens                   🔴  ← AGLA KAAM
          Settings screens                🔴
Slice 0   Header + Footer end-to-end      🔴
Phase 1+  Content core aur aage           🔴
```

**Health:** 130 tests passing · lint clean · admin build clean · asli Mongo pe
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

| Faisla                | Nateeja                                                               |
| --------------------- | --------------------------------------------------------------------- |
| Field DSL             | **Ek DSL** — `contexts: ['content'\|'block']` (D-24)                  |
| TypeScript            | **Nahi** — sab JavaScript (D-03)                                      |
| Trash                 | **`deletedAt` field**, `status: 'trash'` nahi (D-25)                  |
| Roles                 | **Paanch** — `subscriber` nahi (D-26), `salesAgent` hai (D-29)        |
| Permanent delete      | **Sirf admin**                                                        |
| Seed content          | **Khaali** Home + Blog                                                |
| Payload spike         | Approved — Phase 1 se pehle, abhi baaki                               |
| Pehla milestone       | **Slice 0: Header + Footer** (D-27)                                   |
| **CSS**               | **Plain CSS** — Tailwind, CSS Modules, CSS-in-JS teenon reject (D-28) |
| **Ruki hui cheezein** | Connection point abhi, data baad me (D-30)                            |
| **Login screen**      | Design me nahi tha → WordPress-style, design ke tokens se (D-31)      |
| **Password hashing**  | `bcryptjs` cost 12 — native `bcrypt` nahi (D-32)                      |
| **`.env` loading**    | Node ka `process.loadEnvFile()` — `dotenv` nahi (D-33)                |

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

## Aaj ka plan (agla session) — Users + Settings

```
1. Users list — server-side pagination (R14), role filter tabs (design se)
2. Invite / edit / deactivate — har route pe requirePermission('user.*')
3. Settings General — siteName, tagline, timezone, dateFormat
4. `roles` module ko routes.js dena (abhi sirf model + service hai)
```

**Har section kitna ruka hua hai:**

| Section    | Abhi kitna ban sakta hai | Kya rok raha hai                                          |
| ---------- | ------------------------ | --------------------------------------------------------- |
| Users      | ~90%                     | Posts/Enquiries count (Phase 1, 7b) · invite email (SMTP) |
| Settings   | ~75%                     | Homepage dropdown (Phase 1) · logo upload (Phase 2)       |
| Appearance | ~40%                     | Menu me Pages/Destinations chahiye (Phase 1 + 6)          |

---

## Khule sawaal

| #   | Sawaal                                               | Kab tak           |
| --- | ---------------------------------------------------- | ----------------- |
| 1   | Enquiries — Phase 7b banayein ya alag Phase 9?       | Phase 7 se pehle  |
| 2   | Field DSL me `matrix` + `table` types add karne hain | Phase 5c se pehle |
| 3   | Payload CMS spike (2 din)                            | Phase 1 se pehle  |

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
```

⚠️ **Push kabhi bhi bina permission ke nahi karna.**

---

## Dev environment

```bash
pnpm install
docker compose up -d mongo        # mongo 8, port 27017
pnpm cms migrate                  # migrations
pnpm seed                         # roles + admin user
pnpm dev                          # teenon apps
pnpm test                         # 130 tests
```

Auth ke integration tests ko **chalta hua Mongo chahiye** (`pnpm db:up`) — wo
jaan-boojh kar mock nahi hain: reuse detection, TTL aur unique index sab DB ka
behaviour hain, service ka nahi.

---

## Desktop pe reference files (repo se bahar)

- `CMS-Technology-Guide.html` — 28 technologies, saral bhasha me
- `CMS-Build-Roadmap.html` — poora phase-wise roadmap
