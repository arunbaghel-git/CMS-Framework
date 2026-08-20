# 09 — Open Items

**Status:** Phase 0 chal raha hai (~85%). Auth + RBAC land ho chuka — 130 tests passing.
**Last updated:** 20 Aug 2026

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

---

## 🔴 Ab bhi baaki

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

### Q-3 · Field DSL me `matrix` + `table` types

**Deadline:** Phase 5c se pehle
Spec 005 me add karne honge.

---

## Ab ka order

```
1. Phase 0 — Users + Settings screens            ← ABHI YAHAN
2. C-2 — Payload spike (parallel me)             (2 din)
3. Slice 0 — Header + Footer end-to-end          (1.5 hafte)
4. Phase 1 — Content Core                        (3 hafte)
```

**Phase 0 me kya ho chuka:** monorepo + workspaces, docker-compose, ESLint/Prettier,
CI, Express boilerplate, Zod contract, migration runner, CSS architecture,
**auth + RBAC + admin shell** (login, protected routes, sidebar, `/api/me`).

**Phase 0 me kya baaki:** Users screens (list, invite, deactivate), Settings screens,
seed ka baaki hissa (settings/entries — wo Phase 1 pe block hai).

---

## Housekeeping

- ✅ `git init` ho chuka — branch `main`, remote `origin` configured
- ✅ R15 likh diya gaya — design change client se aata hai
- ⚠️ **Push abhi bhi nahi hua** (permission pe hoga). GitHub repo khaali hai
- ⚠️ Repo ka naam **`crmmern`** hai par project **CMS** hai — rename karna ho to abhi sasta hai
- ⚠️ `CLAUDE.md` `.claude/` ke andar hai. Load to ho rahi hai, par root pe rakhna
  zyada reliable hai
- ⚠️ **9 files prettier-dirty hain** — 6 admin CSS, `App.jsx` se pehle wali,
  aur dono memory files. `pnpm format` ek baar chala do
- `docs/archive/` purane versions hain. Git history ab hai, isliye kabhi bhi hata sakte ho

---

## 🔧 Local setup ke do kaante (20 Aug me mile)

Dono `apps/api/.env` me hain — wo file git me nahi hai, isliye code se theek nahi ho sakti.

### 1. `COOKIE_SECURE=true` — local HTTP dev me login tik nahi payega

`Secure` cookie plain `http://localhost` pe **browser store hi nahi karega**. Login
200 dega par session bachega nahi. Cookie ka naam bhi `__Host-cms_at` ban jaata hai.

```diff
- COOKIE_SECURE=true
+ COOKIE_SECURE=false     # prod me true — wahan HTTPS hai
```

### 2. `MIGRATIONS_DIR=../../migrations` — cwd-relative hai

`pnpm cms` repo **root** se chalta hai, isliye ye `C:\Users\deepa\migrations` pe
resolve hota tha. Pehle iska nateeja **chup-chaap "koi pending migration nahi"** tha;
ab runner saaf error deta hai. Absolute path do ya line hata do (default sahi hai).
