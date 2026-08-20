# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 20 Aug 2026

---

## Abhi kahan hain

**Phase 0 — ~65% poora.** Buniyaad khadi hai. Auth agla bada kaam hai.

```
Phase −1  Din-1 faisle                    ✅ 8/8
Phase 0   Setup layer                     ✅
          Zod contract (spec 002)         ✅
          Migration runner                ✅
          CSS architecture (D-28)         ✅
          Auth + RBAC                     🔴  ← AGLA KAAM
          Seed script (spec 004)          🔴
          Admin shell (login + sidebar)   🔴
Slice 0   Header + Footer end-to-end      🔴
Phase 1+  Content core aur aage           🔴
```

**Health:** 44 tests passing · lint / format / build clean · API asli Mongo se
connect hoti hai · `pnpm cms migrate` chalti hai

---

## 🔒 Design ab SPEC hai — sabse zaroori baat

Client ne **do asli design** diye. Ye ab guess ki jagah le chuke hain:

| File | Kya |
|---|---|
| `docs/reference/admin-design.html` | **Admin ka spec.** Isi ke hisaab se banega |
| `docs/11-REFERENCE-ADMIN.md` | Uska analysis — kya match, kya gap |
| `docs/10-REFERENCE-DESIGN.md` | Public site (Andaman) ka analysis |

**Rule:** design badal sakta hai, par change **client se** aayega — developer se nahi.
Kuch theek na lage to poochho, khud mat badlo. (`07-CONVENTIONS.md` rule 8)

`04-ADMIN-UX.md` ab **secondary** hai — conflict ho to design jeetega.

---

## Faisle jo ho chuke hain

| Faisla | Nateeja |
|---|---|
| Field DSL | **Ek DSL** — `contexts: ['content'\|'block']` (D-24) |
| TypeScript | **Nahi** — sab JavaScript (D-03) |
| Trash | **`deletedAt` field**, `status: 'trash'` nahi (D-25) |
| Roles | **Paanch** — `subscriber` nahi (D-26), `salesAgent` hai (D-29) |
| Permanent delete | **Sirf admin** |
| Seed content | **Khaali** Home + Blog |
| Payload spike | Approved — Phase 1 se pehle |
| Pehla milestone | **Slice 0: Header + Footer** (D-27) |
| **CSS** | **Plain CSS** — Tailwind, CSS Modules, CSS-in-JS teenon reject (D-28) |
| **Ruki hui cheezein** | Connection point abhi, data baad me (D-30) |

Specs 001–005 sab approved ya implemented.

---

## Aaj ka plan (20 Aug) — auth se shuru

User ne Appearance + Users + Settings maange the. Analysis ke baad order badla,
kyunki teenon `requirePermission()` pe depend karte hain — aur wo Users module hai.

```
1. User · Role · RefreshToken models + migration
2. 5 roles + permissions seed (salesAgent ke saath)
3. Login / logout / refresh rotation + reuse detection + CSRF
4. requirePermission() middleware
5. Admin: login screen + protected routes + sidebar shell
```

**Kal:** Users screens + Settings. **Parso:** Appearance.

**Har section kitna ruka hua hai:**

| Section | Aaj kitna ban sakta hai | Kya rok raha hai |
|---|---|---|
| Users | ~90% | Posts/Enquiries count (Phase 1, 7b) · invite email (SMTP) |
| Settings | ~75% | Homepage dropdown (Phase 1) · logo upload (Phase 2) |
| Appearance | ~40% | Menu me Pages/Destinations chahiye (Phase 1 + 6) |

---

## Khule sawaal

| # | Sawaal | Kab tak |
|---|---|---|
| 1 | **Login screen** design me hai kya? Nahi to WordPress-style simple banega | Auth se pehle |
| 2 | Enquiries — Phase 7b banayein ya alag Phase 9? | Phase 7 se pehle |
| 3 | Field DSL me `matrix` + `table` types add karne hain | Phase 5c se pehle |
| 4 | Payload CMS spike | Phase 1 se pehle |

---

## Git

```
branch : main
remote : github.com/progryss/crmmern.git

8415ac0  Design ka status saaf karo — SPEC
f5d6ccc  Plain CSS pe shift karo — D-28
6b5983d  Admin design ko FROZEN spec mark karo
b8f46d0  Asli admin design add + analyse
53cb34e  Reference design analyse (Andaman)
5450902  Migration runner
b2a1ac4  Zod contract freeze — spec 002
8569996  Folder structure poora karo
d4b6fef  Line endings LF
85d416e  Phase 0 setup layer
2e81050  8 faisle record
0933c1f  Planning docs v3
```

⚠️ **Push kabhi bhi bina permission ke nahi karna.**

---

## Dev environment

```bash
pnpm install
docker compose up -d mongo        # mongo 8, port 27017
pnpm cms migrate                  # migrations
pnpm dev                          # teenon apps
pnpm test                         # 44 tests
```

`apps/api/.env` local hai, git me nahi (`.env.example` se copy hota hai).

---

## Desktop pe reference files (repo se bahar)

- `CMS-Technology-Guide.html` — 28 technologies, saral bhasha me
- `CMS-Build-Roadmap.html` — poora phase-wise roadmap
