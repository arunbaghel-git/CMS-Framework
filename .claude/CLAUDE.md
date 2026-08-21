# MERN CMS Framework

Reusable CMS framework — **har client ki website ka apna instance** (apna DB, apna
domain, apna admin login), par **core code sab me same**, versioned `@cms/*` packages se.

Target user: **non-technical client**, jo admin panel se poori website chalaye.

**Status:** **Phase 0 chal raha hai — ~95%.** Setup layer, Zod contract, migration runner,
CSS architecture, **auth + RBAC + admin shell**, **Users screens** aur **role-aware nav +
Profile** (D-37) ban chuke hain (**207 tests passing**).
Agla kaam **Settings screens**.
Pending kaam → [`docs/09-OPEN-ITEMS.md`](docs/09-OPEN-ITEMS.md)

---

## Kaam shuru karne se pehle

| Kaam                  | Pehle ye padho                                                          |
| --------------------- | ----------------------------------------------------------------------- |
| Koi bhi code likhna   | [`07-CONVENTIONS.md`](docs/07-CONVENTIONS.md) — 17 non-negotiable rules |
| "Aisa kyun hai?"      | [`03-DECISIONS.md`](docs/03-DECISIONS.md) — D-01 se D-38                |
| Naya module / feature | [`02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md)                         |
| Admin ka UI           | [`04-ADMIN-UX.md`](docs/04-ADMIN-UX.md)                                 |
| Phase shuru karna     | [`08-RISKS.md`](docs/08-RISKS.md) — pre-flight checklist                |

Poora index: [`docs/README.md`](docs/README.md)

---

## Stack

```
apps/api      Express + Mongoose (JS/ESM)   saara business logic
apps/admin    React 18 + Vite (JSX)         admin panel + page builder
apps/web      Next.js App Router (JS)       public site, SSR/ISR

packages/blocks   registry + BlockRenderer + styleToCss   ← admin aur web DONO
packages/shared   Zod schemas + constants                 ← admin aur api DONO
```

JavaScript (ESM), **TypeScript nahi** — safety Zod + `checkJs` + tests se aati hai (D-03).

---

## Rules jo har baar apply hote hain

Poori list [`07-CONVENTIONS.md`](docs/07-CONVENTIONS.md) me. Sabse zyada tootne wale:

1. **Business logic sirf `service.js` me.** Mongoose hooks me sirf pure normalization —
   `findOneAndUpdate` `save` hooks chalata hi nahi, logic chup-chaap skip ho jaayega.
2. **Har query param Zod se validated.** `req.query`/`req.body` ko kabhi seedha Mongoose
   query me spread mat karo — `fields` Mixed hai, ye NoSQL injection ka raasta hai.
3. **Routing ka ekmatra source `entries.path` hai.** Koi hardcoded public route nahi.
4. **UI me internal naam kabhi nahi** — `entries` → Pages/Posts, `taxonomies` → Categories/Tags.
   **Aur UI ka text English me** — design spec English me hai (R17). Code comments Hinglish.
5. **Delete = trash** (`deletedAt`). Permanent delete sirf Trash screen se.
6. **Block ka `type` string kabhi rename mat karo** — wo DB me stored data hai.
7. **Naya block = ek file.** Core code touch nahi hona chahiye.
8. **Scheduled publish DB-based**, `setTimeout` kabhi nahi.
9. **Har list pe server-side pagination**, day 1 se.
10. **State-changing GET kabhi nahi.**

---

## Module ka shape

Har API module ki **wahi paanch files**:

```
apps/api/src/modules/<name>/
├─ model.js         Mongoose schema — sirf shape + pure normalization
├─ service.js       SAARA business logic
├─ controller.js    patla — req/res, service ko call
├─ routes.js        routes + middleware chain
└─ validation.js    Zod schemas
```

`roles` module isme apwaad hai — uske paas `validation.js` nahi hai, aur uska
`routes.js` me sirf **ek read-only route** hai (`GET /api/roles`, user form ke role
dropdown ke liye). Role ki permissions **edit** karne ka koi route jaan-boojh kar nahi
hai — wo Phase 7 ka custom-role builder hai (D-37). Permissions badalne ka raasta khula
chhodna RBAC bypass karne ka sabse seedha tareeka hai.

---

## Naming

| Cheez             | Convention                                |
| ----------------- | ----------------------------------------- |
| Files             | kebab-case — `media-picker.jsx`           |
| React components  | PascalCase — `BlockRenderer`              |
| Functions / vars  | camelCase — `resolvePath`                 |
| Constants         | SCREAMING_SNAKE — `DEFAULT_SITE_ID`       |
| Mongo collections | plural lowercase — `entries`, `mediaRefs` |
| Permissions       | `resource.action` — `entry.publish`       |
| Cache tags        | `type:id` — `entry:abc123`                |
| Block types       | camelCase — `richText`                    |

---

## Commands

```bash
pnpm dev                  # sab apps
pnpm test                 # vitest
pnpm lint
pnpm cms migrate          # schema migrations
pnpm cms migrate:status
pnpm seed                 # admin user + defaults
docker compose up         # mongo
```

> Sab chalte hain. `pnpm seed` abhi roles + admin user banata hai; settings aur
> entries Phase 1 me judenge (spec 004).

---

## Doc update rule

Code badle to doc bhi badle, **usi PR me**:

| Kya badla               | Kaunsa doc                      |
| ----------------------- | ------------------------------- |
| Naya collection / field | `02-ARCHITECTURE.md` §3         |
| Architectural faisla    | `03-DECISIONS.md` — naya `D-xx` |
| Admin screen / nav      | `04-ADMIN-UX.md` + wireframe    |
| Phase scope             | `05-BUILD-PLAN.md`              |
| Env var / deploy step   | `06-OPERATIONS.md`              |
| Naya rule               | `07-CONVENTIONS.md`             |

Decision reverse karna ho to purani `D-xx` entry **delete mat karo** — usme
"Superseded by D-yy" likh do.

---

## Abhi ke blockers

Phase 0 pe **kuch block nahi** — auth stack abhi bana sakte ho.

| #   | Kya                                   | Kab tak           |
| --- | ------------------------------------- | ----------------- |
| C-2 | Payload CMS spike (2 din)             | Phase 1 se pehle  |
| Q-3 | Field DSL me `matrix` + `table` types | Phase 5c se pehle |

Poori list → [`docs/09-OPEN-ITEMS.md`](docs/09-OPEN-ITEMS.md)

---

## Admin design — FROZEN

Admin ka spec [`docs/reference/admin-design.html`](docs/reference/admin-design.html) hai
(analysis: [`docs/11-REFERENCE-ADMIN.md`](docs/11-REFERENCE-ADMIN.md)).
**Usi ke hisaab se banega** — layout,
colours, spacing, wording sab.

`docs/04-ADMIN-UX.md` ab secondary hai; conflict ho to design jeetega.
Design badal sakta hai — par change **client se** aayega, developer se nahi.
Build ke waqt kuch theek na lage to pehle poochho, khud mat badlo.
