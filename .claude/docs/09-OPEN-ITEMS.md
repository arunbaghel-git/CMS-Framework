# 09 — Open Items

**Status:** Phase 0 chal raha hai (~65%). Code shuru ho chuka hai — 44 tests passing.
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
1. Phase 0 — Auth + RBAC + admin shell           ← ABHI YAHAN
2. C-2 — Payload spike (parallel me)             (2 din)
3. Slice 0 — Header + Footer end-to-end          (1.5 hafte)
4. Phase 1 — Content Core                        (3 hafte)
```

**Phase 0 me kya ho chuka:** monorepo + workspaces, docker-compose, ESLint/Prettier,
CI, Express boilerplate, Zod contract, migration runner, CSS architecture.

**Phase 0 me kya baaki:** auth + RBAC, seed script, admin shell (login + sidebar).

---

## Housekeeping

- ✅ `git init` ho chuka — branch `main`, remote `origin` configured
- ⚠️ **Push abhi bhi nahi hua** (permission pe hoga). GitHub repo khaali hai
- ⚠️ Repo ka naam **`crmmern`** hai par project **CMS** hai — rename karna ho to abhi sasta hai
- ⚠️ `CLAUDE.md` `.claude/` ke andar hai. Load to ho rahi hai, par root pe rakhna
  zyada reliable hai
- ⚠️ "Design change client se aayega" rule `07-CONVENTIONS.md` me **likha nahi hai** —
  `project-state.md` usse "rule 8" bolta hai par R8 Zod validation hai. R15 banani chahiye
- `docs/archive/` purane versions hain. Git history ab hai, isliye kabhi bhi hata sakte ho
