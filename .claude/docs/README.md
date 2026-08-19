# MERN CMS Framework — Documentation

Ek reusable CMS framework, jisme **har client ki website ka apna instance** hota hai
(apna DB, apna domain, apna admin login) — aur **core code sab clients me same** rehta
hai, versioned packages se.

Target user: **non-technical client**, jo admin panel se poori website chalaye —
pages, posts, media, menus, SEO, templates aur drag-and-drop page builder ke saath.

**Status:** Planning complete (v2). Code abhi shuru nahi hua.
Kya pending hai → [`09-OPEN-ITEMS.md`](09-OPEN-ITEMS.md)

---

## Kaunsa doc kab padhna hai

| #   | Doc                                | Isme kya hai                                              | Kaun padhe                            |
| --- | ---------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| 01  | [Overview](01-OVERVIEW.md)         | Project kya hai, kiske liye, scope, glossary              | **Sabse pehle ye**                    |
| 02  | [Architecture](02-ARCHITECTURE.md) | System design, data model, URL model, builder, auth, API  | Developer                             |
| 03  | [Decisions](03-DECISIONS.md)       | Har bada faisla + **kyun** + kya reject kiya              | Jab "aisa kyun hai?" ka jawab chahiye |
| 04  | [Admin UX](04-ADMIN-UX.md)         | Admin ki navigation, screens, list/editor/builder layout  | Frontend dev, designer                |
| 05  | [Build Plan](05-BUILD-PLAN.md)     | Phase 0-8, estimates, done criteria                       | Roz ka kaam plan karne ke liye        |
| 06  | [Operations](06-OPERATIONS.md)     | Distribution, versioning, migrations, deploy, env, backup | DevOps, release ke waqt               |
| 07  | [Conventions](07-CONVENTIONS.md)   | Coding rules, naming, testing, contracts                  | Har PR se pehle                       |
| 08  | [Risks](08-RISKS.md)               | Known traps aur unse kaise bachna hai                     | Phase shuru karne se pehle            |
| 09  | [Open Items](09-OPEN-ITEMS.md)     | Jo abhi decide/likha nahi gaya                            | **Aaj**                               |

**Interactive:** [`admin-wireframe.html`](admin-wireframe.html) — 7 admin screens ka
clickable wireframe. Browser me kholo.

---

## 60-second version

```
apps/api      Express + MongoDB      saara business logic, single source of truth
apps/admin    React + Vite           admin panel + page builder
apps/web      Next.js (App Router)   public website, SSR/ISR (SEO ke liye)

packages/blocks   block registry + renderer   ← admin aur web DONO import karte hain
packages/shared   Zod schemas + constants     ← admin aur api DONO same validation
```

Char cheezein jo poore system ko define karti hain:

1. **"Sab kuch content hai"** — pages, posts, services sab ek `entries` collection me,
   `type` field se alag. Naya content type admin se banta hai, code se nahi.
2. **Layout ek JSON tree hai, HTML kabhi nahi** — isliye content ko dobara edit karna,
   theme badalna aur responsive control mumkin rehta hai.
3. **Block definition me `schema` array hota hai** — properties panel usi se _auto_
   generate hota hai. Naya block = ek file, core code touch kiye bina.
4. **Renderer ek hi hai** (`packages/blocks`) — admin canvas aur live site dono wahi
   component use karte hain, warna "preview me kuch, live pe kuch aur" wala bug
   permanent ho jaata hai.

---

## Timeline

| Milestone                                     | Cumulative   |
| --------------------------------------------- | ------------ |
| Phase 0-2 — admin + content + media           | 6 hafte      |
| **Phase 3-4 — usable CMS, client demo ready** | **10 hafte** |
| Phase 5 — page builder live                   | 16-18 hafte  |
| Phase 6-8 — full framework, production        | 23-28 hafte  |

1 full-time dev ke hisaab se. 2 dev ho to roughly 60%.

---

## Documentation history

| Version     | Kab         | Kya                                                                                                                              |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| v1          | 18 Aug 2026 | Pehla plan — 3 documents                                                                                                         |
| v2          | 19 Aug 2026 | Architecture review ke baad: distribution model, migrations, URL/path model, status lifecycle, cache authority, admin IA add hue |
| **v3 (ye)** | 19 Aug 2026 | Sab merge karke topic-wise organize kiya, decisions log alag nikala                                                              |

Purane versions `archive/` me safe hain — kuch delete nahi hua:

- `archive/v1/` — original teen docs
- `archive/v2-monolithic/` — v2 ke teen docs (jinka content ab in files me distribute hai)
