# 09 — Open Items

**Status:** Planning complete. Code shuru nahi hua.
**Last updated:** 19 Aug 2026

---

## ✅ Jo resolve ho gaya (19 Aug 2026)

| Item                        | Faisla                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| A-1 Permission strings      | ✅ [`specs/001`](../specs/001-permissions.md) **approved** — 4 roles, `purge` sirf admin |
| A-3 Env schema              | ✅ [`specs/003`](../specs/003-env-schema.md) **approved**                                |
| A-4 Seed definition         | ✅ [`specs/004`](../specs/004-seed.md) **approved** — khaali Home + Blog, 4 roles        |
| B-1 Field DSL               | ✅ **Ek DSL** — [`specs/005`](../specs/005-field-dsl.md), D-24                           |
| C-1 TypeScript for packages | ✅ **Nahi** — sab JavaScript. D-03 waise hi                                              |
| C-2 Payload spike           | ✅ **Approved** — Phase 1 se pehle                                                       |
| D-1 Vertical slice          | ✅ **Haan** — aur wo **Header + Footer** hoga. D-27                                      |
| Trash mechanism             | ✅ **`deletedAt` field**, `status: 'trash'` nahi. D-25                                   |
| `subscriber` role           | ✅ **Nahi banega** — 4 roles. D-26                                                       |

---

## 🔴 Ab bhi baaki

### A-2 · `entries` + block envelope ka Zod contract

**Blocks:** Phase 1 poora
**Spec:** [`specs/002-content-contract.md`](../specs/002-content-contract.md)

Ye ab **likhne** wala kaam hai, decide karne wala nahi — teenon open questions me se ek
resolve ho chuka hai (trash = `deletedAt`), aur baaki do pe recommendation clear hai.

Kya likhna hai:

- `entrySchema` — saare fields, `deletedAt` ke saath
- `blockSchema` — envelope, recursive `children` ke liye
- `contentSchema` — `{ version: 1, blocks: [] }`
- `seoSchema`
- Enums: status (`draft|pending|published|scheduled|private`), role (4), permissions

Jagah: `packages/shared/src/schemas/`

**Bache hue chhote sawaal** (recommendation ke saath, blocking nahi):

- `content.version` tree-level hi rahe, per-block version nahi → **haan**
- `fields` (Mixed) ka Zod `z.record(z.unknown())`, asli validation contentType se → **haan**

---

### C-2 · Payload CMS ka 2-din spike

**Deadline:** Phase 1 se pehle (Phase 1 land hote hi window band)

Approve ho chuka hai, karna baaki hai. Kya check karna:

1. MongoDB adapter kaisa hai
2. Blocks field se page builder ban sakta hai kya
3. Admin UI kitna customize hota hai
4. Multi-instance model fit hota hai
5. Visual builder banane ki jagah milti hai ya nahi

Result se D-01 se D-27 me se kuch badal sakti hain — isliye Phase 1 se pehle.

---

## Ab ka order

```
1. A-2 — Zod contract likho aur freeze        (aadha din)
2. Phase 0 — Foundation & Auth                (1.5 hafte)
3. Slice 0 — Header + Footer end-to-end       (1.5 hafte)
4. C-2 — Payload spike (parallel me)          (2 din)
5. Phase 1 — Content Core                     (3 hafte)
```

**Setup layer abhi shuru ho sakta hai** — monorepo, docker-compose, ESLint/Prettier,
CI, Express boilerplate. Ye A-2 pe block nahi hai.

---

## Housekeeping

- ✅ `git init` ho chuka — branch `main`, remote `origin` configured
- ⚠️ Push abhi nahi hua (permission pe hoga). GitHub repo khaali hai
- ⚠️ Repo ka naam **`crmmern`** hai par project **CMS** hai — rename karna ho to abhi sasta hai
- ⚠️ `CLAUDE.md` `.claude/` ke andar hai. Claude Code **root** wali file pakka auto-load
  karta hai — root pe rakhna zyada reliable hai
- `docs/archive/` purane versions hain. Git history ab hai, isliye kabhi bhi hata sakte ho
