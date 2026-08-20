# Session Log

Append-only. Naya entry **upar** add karo.

Format:

```
## YYYY-MM-DD — <ek line summary>

**Kya hua:** …

**Faisle:** … (ya "koi nahi")
**Agla:** …
```

---

## 2026-08-20 — Auth + RBAC + admin shell; docs ko asli state pe laaya

**Kya hua**

- `/status` chalaya to sabse bada mismatch `09-OPEN-ITEMS.md` me tha — "code shuru
  nahi hua" likha tha jabki Phase 0 ~65% ho chuka tha. Wo aur `CLAUDE.md` sync kiye
- Q-1 (login screen) client se clear hua → D-31
- **Backend auth poora:** User/Role/RefreshToken models, migration 002 (TTL index ke
  saath), JWT + cookie layer, CSRF double-submit, `requirePermission()`,
  login/refresh/logout/change-password, `GET|PATCH /api/me`, roles seed
- **Admin shell:** login screen, protected routes, AdminBar, Sidebar (design ke poore
  menu ke saath), `mustChangePassword` gate, NotBuiltYet placeholder screens
- `lib/api.js` ka purana TODO poora — **single-flight refresh mutex** (D-13)
- Tests 44 → **130**. Auth ke integration tests asli Mongo pe chalte hain
- Asli Mongo pe end-to-end verify: login → rotation → reuse detection → family revoke

**Teen asli bug jo raaste me mile**

1. `emailSchema` me `.email()` `.trim()` se **pehle** chal raha tha — `a@b.com`
   reject hota tha aur user ko "email sahi nahi lag raha" dikhta, jabki email sahi thi
2. `.env` file maujood thi par **use koi load hi nahi karta tha** — na dotenv, na
   `--env-file`. `pnpm seed` iske bina chal hi nahi sakti thi (D-33)
3. Migration runner missing directory pe **chup-chaap `[]`** lautata tha —
   `pnpm cms migrate` "koi pending nahi" bol kar exit 0 deta tha aur indexes bante
   hi nahi. Ab loud error deta hai. (`.env` ka `MIGRATIONS_DIR` cwd-relative hai,
   isliye ye asli me ho raha tha)

Ek regression khud banayi aur pakdi: `.env` load karne se **test env local file pe
depend karne laga** (`COOKIE_SECURE=true` se cookie ke naam badle aur ek test fail
hua). Ab `NODE_ENV=test` pe `.env` load hoti hi nahi.

**Faisle:** D-31 login screen · D-32 `bcryptjs` (native bcrypt nahi) · D-33 `.env`
Node ke apne loader se. Aur `07-CONVENTIONS.md` me **R15** likha — "design change
client se aata hai" rule pehle kahin likha hi nahi tha (docs use galti se "rule 8"
bolte the, jabki R8 Zod validation hai).

**Agla**

1. Users screens — list (server-side pagination), invite, edit, deactivate
2. Settings General
3. `roles` module ko `routes.js` do (abhi sirf model + service hai)
4. `apps/api/.env` me `COOKIE_SECURE=false` aur `MIGRATIONS_DIR` wali line theek karo

---

## 2026-08-20 — Client ke asli design aaye; CSS architecture tay hui

**Kya hua**

- Client ne do asli design diye — public site (Andaman travel) aur admin (travel CMS).
  Dono analyse kiye: `docs/10-REFERENCE-DESIGN.md` aur `docs/11-REFERENCE-ADMIN.md`
- Admin design ab **SPEC** hai, reference nahi. `04-ADMIN-UX.md` secondary ho gaya
- CSS architecture tay hui aur implement bhi — Tailwind hataya, plain CSS aaya

**Faisle**

- D-28 Plain CSS — Tailwind, CSS Modules, CSS-in-JS teenon reject.
  Sabse bada reason: blocks ka theming contract stable class names maangta hai,
  Tailwind utility classes se wo toot jaata hai. shadcn/ui bhi gaya (Tailwind pe
  khada tha) — uski jagah Radix primitives aayenge.
- D-29 `salesAgent` paanchwa role. Design ke users list me 4 users us role me hain,
  aur enquiry assignment usi pe chalta hai. D-26 ko partially supersede karta hai.
- D-30 Ruki hui cheezon ke connection point abhi banao — field, API shape aur UI ki
  jagah abhi; data baad me. Khaali cheez khaali dikhe, tooti hui nahi.
- Design badal sakta hai par change client se aayega, developer se nahi (rule 8)

**Design se jo gaps mile**

- Mega-menu — humara menu model simple nested tree hai, design me columns aur
  non-clickable group headings hain. Slice 0 me fix karna hai
- Enquiries ek mini-CRM hai (pipeline, assign, quotation, notes), form inbox nahi.
  Plan me sirf "submissions inbox" tha — bahut under-scoped
- Field DSL me `matrix` aur `table` types chahiye (occupancy slabs, departures)
- Public site "listing" site hai — 20 me se 13 sections ek hi card shape ke.
  Matlab Phase 6 (dynamic lists) is client ke liye Phase 5 se zyada zaroori hai

**Analysis: Appearance / Users / Settings kitne ruke hain**
Users ~90% · Settings ~75% · Appearance ~40%. Teenon `requirePermission()` pe
depend karte hain, aur wo Users module hai — isliye auth pehle.

**Agla:** Phase 0 ka auth — models, login, refresh rotation + reuse detection,
CSRF, requirePermission(), admin login screen + protected routes.
Uske baad Users + Settings, phir Appearance.

**Ek sawaal pending:** login screen design me hai kya? Nahi to WordPress-style
simple banega.

---

rate limit, pino, error envelope, /api/health, graceful shutdown)

- Zod contract freeze (spec 002): block envelope, content, seo, entry +
  create/update/listQuery. Permissions constants (spec 001). Field DSL (D-24).
  JSDoc typedefs.
- Migration runner: dono system — schema (numbered + ledger + checksum guard +
  down() mandatory) aur block-tree (per-document, lazy). CLI: pnpm cms migrate.
  Pehli migration: entries ke 6 indexes.

**Verify (asli mongo pe, sirf test nahi)**
migrate → 6 indexes bane · dobara → no-op · migrate:down → indexes gaye ·
file edit → checksum guard fire · API boot → /api/health 200

**Bug jo mila aur fix hua**
MIGRATIONS_DIR cwd se resolve hoti thi, apps/api se chalane pe ledger "missing"
dikhata tha. Env var override se fix. Ye sirf `pnpm test` se pakda hi nahi jaata —
health endpoint hit karne se mila.

**Faisle:** koi naya nahi

**Desktop pe do files banayi** (samajhne ke liye, repo se bahar)
CMS-Technology-Guide.html · CMS-Build-Roadmap.html

**Agla:** Phase 0 ka auth — User/Role/RefreshToken models + migration, login/logout,
refresh rotation + reuse detection, CSRF, requirePermission(), seed, admin shell.
User se poochha tha: ek saath karein ya do hisson me — jawab pending.

---

## 2026-08-19 — Coding shuru: setup + contract + migrations

**Kya bana**

- Phase 0 setup layer: pnpm monorepo, 3 apps + 2 packages, docker (mongo 8),
  ESLint 10 + Prettier, GitHub Actions CI, Express base (helmet, CORS allowlist,
  rate limit, pino, error envelope, /api/health, graceful shutdown)
- Zod contract freeze (spec 002): block envelope, content, seo, entry +
  create/update/listQuery. Permissions constants (spec 001). Field DSL (D-24).
  JSDoc typedefs.
- Migration runner: dono system — schema (numbered + ledger + checksum guard +
  down() mandatory) aur block-tree (per-document, lazy). CLI: pnpm cms migrate.
  Pehli migration: entries ke 6 indexes.

**Verify (asli mongo pe, sirf test nahi)**
migrate → 6 indexes bane · dobara → no-op · migrate:down → indexes gaye ·
file edit → checksum guard fire · API boot → /api/health 200

**Bug jo mila aur fix hua**
MIGRATIONS_DIR cwd se resolve hoti thi, apps/api se chalane pe ledger "missing"
dikhata tha. Env var override se fix. Ye sirf `pnpm test` se pakda hi nahi jaata —
health endpoint hit karne se mila.

**Faisle:** koi naya nahi

**Desktop pe do files banayi** (samajhne ke liye, repo se bahar)
CMS-Technology-Guide.html · CMS-Build-Roadmap.html

**Agla:** Phase 0 ka auth — User/Role/RefreshToken models + migration, login/logout,
refresh rotation + reuse detection, CSRF, requirePermission(), seed, admin shell.
User se poochha tha: ek saath karein ya do hisson me — jawab pending.

**Kya hua:** …

**Faisle:** … (ya "koi nahi")
**Agla:** …

```

---
## 2026-08-19 — 8 faisle liye, specs approve hue

**Kya hua**

- User se 8 sawaal poochhe, sab ke jawab mile
- Specs 001, 003, 004, 005 → Approved
- 4 naye decision records: D-24 se D-27

**Faisle**

- D-24 Field DSL: **ek DSL** (contexts: content|block), do nahi
- D-25 Trash: **`deletedAt` field**, `status: 'trash'` nahi — restore pe purani state wapas
- D-26 Roles: **char** — `subscriber` nahi. `entry.purge`/`media.purge` sirf admin
- D-27 Pehla milestone: **Slice 0 = Header + Footer** end-to-end
- TypeScript: **nahi** — sab JavaScript, D-03 waise hi
- Seed: **khaali** Home + Blog, koi demo blocks nahi
- Payload spike: **approved**, Phase 1 se pehle

**User ka input (Slice 0 pe)**
Slice normal content page ka nahi, **header/footer** ka hoga — logo, navigation, CTA,
footer columns/social/copyright ka minimal admin config, save/publish, aur public site
pe render. Page builder abhi nahi.

**Imaandari se:** ye slice cache invalidation aur settings/menus pipeline verify karti
hai, par **preview parity nahi** — usme blocks chahiye. Wo risk Phase 5 tak khula.

**Agla**

1. A-2 — Zod contract likho (`packages/shared`)
2. Phase 0 setup layer shuru
3. Payload spike parallel me

---

## 2026-08-19 — Docs v3: merge + `.claude` workspace

**Kya hua**

- Teenon planning docs merge karke topic-wise 10 documents banaye (`.claude/docs/`)
- `03-DECISIONS.md` naya — 23 decisions with context/why/rejected/consequences
- `08-RISKS.md` naya — top 5 risks + 28 traps + phase-wise pre-flight
- `.claude/` workspace banaya — agents, commands, skills, specs, memory
- Root `CLAUDE.md` banaya
- 5 specs banaye: 001 permissions (draft), 002 content contract (pending),
  003 env schema (draft), 004 seed (draft), 005 field DSL (faisla pending)
- Purane docs `docs/archive/v1/` aur `docs/archive/v2-monolithic/` me safe

**Faisle:** koi naya nahi — sirf existing decisions document kiye gaye

**Naya finding:** `contentTypes.fields[]` aur `blockDefinition.schema[]` do alag
field systems hain jo docs me kabhi connect nahi hue. ~50% overlap. Ek DSL banane se
Phase 6 ka kaafi kaam kam ho jaata hai. → `specs/005-field-dsl.md`

**Agla**

1. Specs 001, 003, 004 review + approve
2. 005 (field DSL) ka faisla lo
3. C-1 (TypeScript for packages) ka spike
4. 002 (Zod contract) likho aur freeze
5. `git init` + Phase 0 setup layer shuru

---

## 2026-08-19 — Architecture review + docs v2

**Kya hua**

- Teen planning docs ka independent architecture review
- WordPress ke against product/IA validation
- Findings v2 me merge kiye: distribution model, migrations, URL/path model,
  status lifecycle, cache authority, block→CSS strategy, admin IA
- `admin-wireframe.html` banaya — 7 clickable screens

**Faisle (v2 me added)**

- D-15 distribution: versioned `@cms/*` packages + patla client repo
- D-09 routing: stored `entries.path` + unique index
- D-08 responsive: server-generated scoped CSS
- D-07 preview parity: host-injected primitives
- D-14 cache: Next ISR single authority + tag invalidation
- D-18 statuses: `pending` + `private` + trash

**Agla:** docs organize karna
```
