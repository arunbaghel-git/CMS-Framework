# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 19 Aug 2026

---

## Abhi kahan hain

**Phase:** −1 (din-1 faisle) — code shuru nahi hua
**Repo:** `git init` **abhi nahi hua**
**Docs:** v3 complete — `.claude/docs/`

```
merncms/
├─ CLAUDE.md
└─ .claude/
   ├─ docs/       10 documents, v3 (merged aur topic-wise)
   ├─ specs/      5 specs — 001,003,004 draft · 002,005 pending
   ├─ agents/     5 subagents
   ├─ commands/   6 slash commands
   ├─ skills/     3 skills
   └─ memory/     ye folder
```

Abhi tak **koi application code nahi likha gaya**. Sirf planning aur documentation.

---

## Faisle jo 19 Aug ko ho gaye

| Faisla           | Nateeja                                                          |
| ---------------- | ---------------------------------------------------------------- |
| Field DSL        | **Ek DSL** — `contexts: ['content'\|'block']` (D-24)             |
| TypeScript       | **Nahi** — sab JavaScript (D-03 waise hi)                        |
| Trash            | **`deletedAt` field**, `status: 'trash'` nahi (D-25)             |
| Roles            | **Char** — `subscriber` nahi (D-26)                              |
| Permanent delete | **Sirf admin** — editor trash me daal sakta hai, mita nahi sakta |
| Seed content     | **Khaali** Home + Blog, koi demo blocks nahi                     |
| Payload spike    | **Approved** — Phase 1 se pehle                                  |
| Pehla milestone  | **Slice 0: Header + Footer** end-to-end (D-27)                   |

Specs 001, 003, 004, 005 → 🟢 Approved

---

## Ab bhi baaki

| ID  | Kya                            | Status                                                              |
| --- | ------------------------------ | ------------------------------------------------------------------- |
| A-2 | `entries` + block Zod contract | 🔴 **Likhna hai** — [`specs/002`](../specs/002-content-contract.md) |
| C-2 | Payload CMS spike              | 🔴 Karna hai — Phase 1 se pehle                                     |

**Jo abhi shuru ho sakta hai (A-2 pe block nahi):**
pnpm monorepo skeleton · docker-compose (mongo) · ESLint/Prettier/jsconfig ·
CI pipeline · Express boilerplate (error handler, logger, helmet, CORS, rate limit)

---

## Agla order

```
1. A-2 — Zod contract likho aur freeze     (aadha din)
2. Phase 0 — Foundation & Auth             (1.5 hafte)
3. Slice 0 — Header + Footer end-to-end    (1.5 hafte)
4. C-2 — Payload spike (parallel)          (2 din)
5. Phase 1 — Content Core                  (3 hafte)
```

---

## Timeline

| Milestone                              | Cumulative     |
| -------------------------------------- | -------------- |
| Phase 0 + Slice 0                      | 3 hafte        |
| Phase 1-2                              | 7.5 hafte      |
| **Phase 3-4 — usable CMS, demo ready** | **11.5 hafte** |
| Phase 5 — builder live                 | 18-20 hafte    |
| Phase 6-8 — production                 | 25-30 hafte    |

_(Slice 0 ka ~1.5 hafta add hua)_

---

## Git

```
branch  : main
commit  : 0933c1f  Planning docs v3 + .claude workspace
remote  : github.com/progryss/crmmern.git  (configured, PUSH NAHI HUA)
```

⚠️ **Push kabhi bhi bina permission ke nahi karna.**

---

## Session ke end me update karo

- Phase aur % complete
- Blockers jo resolve hue (aur `docs/09-OPEN-ITEMS.md` se hatao)
- Naye blockers jo mile
- Koi decision jo liya gaya (aur `docs/03-DECISIONS.md` me `D-xx` banao)
