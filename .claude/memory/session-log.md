# Session Log

Append-only. Naya entry **upar** add karo.

Format:

```
## YYYY-MM-DD — <ek line summary>

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
