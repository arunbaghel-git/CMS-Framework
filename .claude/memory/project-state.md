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

## Blockers — Phase 0 ke code se pehle

| ID | Kya | Status |
|---|---|---|
| A-1 | Permission strings | 🟡 Draft ban gaya — [`specs/001`](../specs/001-permissions.md) — **approval chahiye** |
| A-2 | `entries` + block Zod contract | 🔴 Likhna hai — [`specs/002`](../specs/002-content-contract.md) |
| A-3 | Env schema | 🟡 Draft ban gaya — [`specs/003`](../specs/003-env-schema.md) — **approval chahiye** |
| A-4 | Seed definition | 🟡 Draft ban gaya — [`specs/004`](../specs/004-seed.md) — **approval chahiye** |
| B-1 | Field DSL — ek ya do? | 🔴 **Faisla pending** — [`specs/005`](../specs/005-field-dsl.md) |
| C-1 | `packages/shared`+`blocks` TypeScript me? | 🔴 Faisla pending — 2 ghante ka spike |
| C-2 | Payload CMS spike | 🔴 Pending — Phase 1 se pehle |

**Jo abhi shuru ho sakta hai (kisi blocker pe depend nahi):**
`git init` · pnpm monorepo skeleton · docker-compose (mongo) · ESLint/Prettier/jsconfig ·
CI pipeline · Express boilerplate (error handler, logger, helmet, CORS, rate limit)

---

## Timeline

| Milestone | Cumulative |
|---|---|
| Phase 0-2 | 6 hafte |
| **Phase 3-4 — usable CMS, demo ready** | **10 hafte** |
| Phase 5 — builder live | 16-18 hafte |
| Phase 6-8 — production | 23-28 hafte |

---

## Session ke end me update karo

- Phase aur % complete
- Blockers jo resolve hue (aur `docs/09-OPEN-ITEMS.md` se hatao)
- Naye blockers jo mile
- Koi decision jo liya gaya (aur `docs/03-DECISIONS.md` me `D-xx` banao)
