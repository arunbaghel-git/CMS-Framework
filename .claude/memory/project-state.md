# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 19 Aug 2026

---

## Abhi kahan hain

**Phase 0 — ~65% poora.** Dhaancha khada hai, ab auth banana hai.

```
Phase −1  Din-1 faisle                    ✅ 8/8
Phase 0   Setup layer                     ✅
          Zod contract (spec 002)         ✅
          Migration runner                ✅
          Auth + RBAC                     🔴  ← AGLA KAAM
          Seed script (spec 004)          🔴
          Admin shell (login + sidebar)   🔴
Slice 0   Header + Footer end-to-end      🔴
Phase 1+  Content core aur aage           🔴
```

**Health:** 43 tests passing · lint / format / build clean · API asli Mongo se
connect hoti hai aur `/api/health` 200 deta hai.

---

## Faisle jo ho chuke hain

| Faisla | Nateeja |
|---|---|
| Field DSL | **Ek DSL** — `contexts: ['content'\|'block']` (D-24) |
| TypeScript | **Nahi** — sab JavaScript (D-03) |
| Trash | **`deletedAt` field**, `status: 'trash'` nahi (D-25) |
| Roles | **Char** — `subscriber` nahi (D-26) |
| Permanent delete | **Sirf admin** — editor trash me daal sakta hai, mita nahi sakta |
| Seed content | **Khaali** Home + Blog, koi demo blocks nahi |
| Payload spike | **Approved** — Phase 1 se pehle |
| Pehla milestone | **Slice 0: Header + Footer** end-to-end (D-27) |

Specs 001, 002, 003, 004, 005 — sab ✅ approved ya implemented.

---

## Agla order

```
1. Phase 0 ka auth                        (~1 hafta)
   - User / Role / RefreshToken models + migration
   - login · logout · forgot · reset
   - refresh rotation + reuse detection + double-submit CSRF
   - single-flight refresh mutex (admin client me)
   - requirePermission() middleware
   - seed script (spec 004)
   - admin shell: login screen + sidebar + protected routes
2. Slice 0 — Header + Footer end-to-end   (1.5 hafte)
3. Payload spike (parallel me)            (2 din)
4. Phase 1 — Content Core                 (3 hafte)
```

**User se ek sawaal pending:** auth ek saath banayein, ya do hisson me
(pehle models + login, phir refresh / CSRF / RBAC)?

---

## Ab bhi baaki (blockers)

| ID | Kya | Kab tak |
|---|---|---|
| C-2 | Payload CMS spike | Phase 1 se pehle |

Baaki sab (A-1 se A-4, B-1, C-1, D-1) ✅ ho chuke.

---

## Timeline

| Milestone | Cumulative |
|---|---|
| Phase 0 + Slice 0 | 3 hafte |
| Phase 1-2 | 7.5 hafte |
| **Phase 3-4 — client demo ready** | **12 hafte** |
| Phase 5 — builder live | 18-20 hafte |
| Phase 6-8 — production | 25-29 hafte |

---

## Git

```
branch : main
remote : github.com/progryss/crmmern.git   (configured, PUSH NAHI HUA)

5450902  Migration runner — dono system
b2a1ac4  Zod contract freeze — spec 002
8569996  Documented folder structure poora karo
d4b6fef  Line endings LF me normalize karo
85d416e  Phase 0 setup layer
2e81050  8 faisle record kiye — D-24 se D-27
0933c1f  Planning docs v3 + .claude workspace
```

⚠️ **Push kabhi bhi bina permission ke nahi karna.**

---

## Dev environment

```bash
pnpm install
docker compose up -d mongo        # mongo 8, port 27017
pnpm cms migrate                  # migrations chalao
pnpm dev                          # teenon apps
pnpm test                         # 43 tests
```

`apps/api/.env` local hai aur git me nahi hai (`.env.example` se copy hota hai).

---

## Desktop pe reference files (repo se bahar)

- `CMS-Technology-Guide.html` — 28 technologies, saral bhasha me
- `CMS-Build-Roadmap.html` — poora phase-wise roadmap
