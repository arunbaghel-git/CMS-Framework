# MERN CMS Framework — Implementation Plan (v2)

## Context

`C:\Users\deepa\Desktop\merncms` — greenfield project.

**Goal:** ek reusable CMS framework jisse **non-technical user** admin panel se poori
website build aur manage kar sake — pages, posts, media, menus, SEO, templates aur
drag-and-drop page builder ke saath.

"Framework" ka matlab: har naye client ke liye code dobara nahi likhna. Naya block =
ek file, naya content type = admin se banega, client branding = theme tokens se, aur
**core ka update sab clients tak versioned packages se pahunchega**.

Detailed design do documents me hai (ye plan unka executable version hai):
- `01-ARCHITECTURE.md`
- `02-BUILD-PLAN.md`

> **v2 me kya badla:** architecture review ke baad 8 din-1 faisle add hue (distribution
> model, migrations, URL/path model, status lifecycle, cache authority, block→CSS,
> preview parity, reserved fields), har phase me additions aaye, aur estimates
> realistic kiye gaye. Purane docs `.bak` files me hain.

### Confirmed decisions
| Decision | Choice |
|---|---|
| Public site renderer | **Next.js** (App Router) — SSR/ISR, sitemap, metadata API se SEO handle |
| Language | **JavaScript** (ESM) everywhere — no TypeScript |
| Multi-site | **Single-site** behaviour, par `siteId` field + compound indexes day 1 se reserved |
| Versions | Plan me hardcode **nahi** — implementation ke waqt current stable/LTS. Lockfile + `.nvmrc`/`engines` me exact pin |
| Deployment topology | **Same-origin** — admin `/admin`, API `/api`, ek reverse proxy ke peeche |
| **Distribution** | **Versioned `@cms/*` packages + patla per-client repo.** Client ka theme/blocks core repo me **nahi** |
| **Packaging** | Teen app, par **ek deployable unit** per client. Mongo: shared cluster, per-client alag DB |
| **Routing** | Stored+indexed `entries.path`. Ek catch-all route. Koi hardcoded public route nahi |
| **Cache** | **Next ISR hi authority.** Public API pe TTL cache nahi. Tag-based invalidation |
| **Media storage** | Production me S3/R2 + CDN, local sirf dev |

---

## Din 1 se pehle ke 8 faisle

Ye schema aur repo layout me pak jaate hain — baad me badalna sabse mehnga refactor
hai. Code likhne se **pehle** freeze karo.

| # | Faisla | Kyun blocking |
|---|---|---|
| 1 | **Core distribution model** — versioned packages + client repo | Iske bina "no code per client" client #2 pe hi toot jaata hai. `themes/<client>/` core repo me = fork per client = har security fix N baar |
| 2 | **Migration runner** (schema + block-tree, do alag system) | Ye wahi mechanism hai jo #1 ko chalne deta hai |
| 3 | **`entries.path`** stored + unique indexed | `{siteId,type,slug}` unique hone pe bhi ek `page` "about" aur ek `service` "about" dono `/about` pe resolve kar sakte hain |
| 4 | **Reserve fields:** `deletedAt`, `locale`, `version`, `searchText` | Wahi insurance logic jo `siteId` pe pehle se laga hai — live data pe baad me daalna schema-wide change hai |
| 5 | **Statuses `pending` + `private`** | `pending` ke bina `contributor` role ka koi "review karo" state hi nahi bachta — role non-functional hai |
| 6 | **`refreshTokens` collection** | Rotation + reuse detection stateless JWT se possible hi nahi |
| 7 | **`style` → CSS strategy** (server-generated scoped CSS) | **Inline styles se media query likhi hi nahi ja sakti** — matlab `style.{desktop,tablet,mobile}` model inline se implement ho hi nahi sakta |
| 8 | **Preview parity mechanism** — `<BlockRenderer components={{Link,Image}} />` | Sirf component share karna kaafi nahi; canvas Vite hai aur live Next hai. `next/image` canvas me chalta hi nahi |

Detail: `01-ARCHITECTURE.md` §3c, §3d, §4a, §4b, §8.

---

## Char engineering rules (in par plan explicitly commit karta hai)

1. **Mongoose hooks me sirf pure data normalization** — slugify, trim, `updatedAt`,
   counts. Koi side effect, koi I/O nahi. Revision snapshot, cache invalidation,
   revalidate webhook, publish state machine, email — **sab service layer me**.
   *Kyun:* `updateOne` / `findOneAndUpdate` / `bulkWrite` `save` hooks chalate hi
   nahi — hook wala logic chup-chaap skip ho jaayega, bina error bina log.
2. **Scheduled publish DB-based, `setTimeout` kabhi nahi** — restart pe schedule kho
   jaata hai. `status:'scheduled'` + indexed `publishAt`; cron har minute atomic
   `findOneAndUpdate` se claim kare. Public read query bhi
   `scheduled && publishAt <= now` ko published maane — cron band ho jaaye to bhi site
   sahi rahe (**self-healing**).
3. **Cookie + CSRF explicit:** httpOnly · Secure (prod) · SameSite=Lax · `__Host-`
   prefix · access 15min + refresh 7din with rotation & reuse detection ·
   **double-submit CSRF token har non-GET pe** · CORS strict allowlist + credentials.
   Same-origin isliye chuna kyunki cross-origin me `SameSite=None` majboori ban jaati
   hai aur SameSite ka protection zero ho jaata hai.
   **Iske teen zaroori saathi:** `refreshTokens` collection (reuse detection ke liye
   server state) · **single-flight refresh mutex** (5 parallel 401 = 5 refresh =
   random logout) · **state-changing GET kabhi nahi**.
4. **Versions plan me nahi, lockfile me.** "Latest lo" ka matlab `^` se float karna
   nahi — exact pin karo. Node `.nvmrc` + `engines` me, warna sharp/bcrypt jaise
   native modules mismatch pe toot-te hain.

### Do naye rules (v2)
5. **Routing ka ekmatra source `entries.path` hai.** Koi hardcoded public route nahi —
   `app/blog/[slug]` banate hi `urlPattern` ke configurable hone ka matlab khatam.
6. **UI me internal naam kabhi nahi.** `entries` → Pages/Posts, `taxonomies` →
   Categories/Tags, "regions" → Template Parts, "global blocks" → Synced Patterns.
   Data model generalized hai; UI familiar hona chahiye.

### JavaScript choice — iska matlab kya hai
TS nahi hai, to jo safety compiler deta wo **runtime pe** leni padegi. Teen cheezein
non-negotiable ho jaati hain:
1. **Zod har boundary pe** — API input, block props, contentType fields, **aur har
   query param**. `packages/shared` me schemas ek jagah, admin aur api dono wahi
   import karein.
2. **`jsconfig.json` with `checkJs: true` + JSDoc typedefs** core shapes pe (`Entry`,
   `Block`, `BlockDefinition`).
3. **Block tree operations pe unit tests** (add/move/delete/duplicate/undo). TS ke bina
   yahi wo jagah hai jahan silent bugs sabse zyada aate hain — ye tests optional nahi hain.

> **Open question:** `packages/shared` aur `packages/blocks` ko TypeScript rakhna
> (ya Zod se `.d.ts` generate karna) worth hai — ye do packages har app import karta
> hai. App code JS reh sakta hai. Ye reversible sirf abhi hai.

---

## Architecture

```
apps/api      Express + Mongoose (JS/ESM)  — saara business logic, single source of truth
apps/admin    React + Vite (JSX)           — admin UI + page builder
apps/web      Next.js App Router (JS)      — public site (SSR/ISR)
packages/blocks   registry + <BlockRenderer /> + styleToCss   ← admin aur web DONO
packages/shared   Zod schemas + constants + JSDoc typedefs    ← admin aur api DONO
```

### Char core principles (inhe todna mat)

1. **"Sab kuch content hai."** Pages/posts alag collection nahi — ek `entries`
   collection with `type` field. Custom types (Services, Portfolio) isse free milte
   hain. **Par UI me `entries` kabhi nahi dikhta.**
2. **Layout = JSON tree, HTML kabhi nahi.** `{ id, type, props, style, children[] }`.
3. **Block definition me `schema` array** hota hai — properties panel usi se *auto*
   generate hota hai. Naya block = ek file, core code touch nahi hota.
4. **Renderer shared + canvas sandboxed iframe me + host primitives injected.**
   Warna "preview me kuch, live pe kuch aur" wala bug permanent ho jaata hai.

### Data model (MongoDB) — sirf naye/badle hue points
Poora model `01-ARCHITECTURE.md` §3 me.
```
entries    siteId, locale, type, title, slug, PATH, status(draft|pending|published|
           scheduled|private), publishAt, templateId, VERSION, DELETEDAT,
           content{version,blocks[]}, fields{}, seo{}, taxonomies{}, SEARCHTEXT, parentId
settings   + tagline, dateFormat, HOMEPAGEENTRYID, POSTSPAGEENTRYID, postsPerPage,
           SEARCHENGINEVISIBLE, titleTemplates
menus      + menuLocations (fixed main|footer keys hataye gaye)
patterns   pattern | synced          (pehle "global blocks")
mediaRefs  media backlinks — "ye image kahan use ho rahi hai" ka jawab
refreshTokens · migrations · activityLog
```

Naye indexes:
```
entries: { siteId:1, locale:1, path:1 } unique     <- routing
entries: { siteId:1, deletedAt:1, updatedAt:-1 }
entries: { searchText: "text" }                    <- Mongo ek hi text index deta hai
```

### Theming API — bina iske framework fork ban jaayega
Blocks stable class names + `data-block-type` emit karein, CSS variables expose karein,
aur registry me **override hook** ho (`registry.override('heading', MyHeading)`).
Sirf design tokens se har client ka "thoda alag hero" handle nahi hoga — aur tab core
block file badalni padegi.

### Single-site vs multi-site — sthiti saaf
Ek deploy = ek website. Naya client = naya instance. `siteId` sirf **insurance** hai
(index rebuild se bachne ko), aaj koi query usse filter nahi karti.

Multi-tenancy tabhi lena jab ise **SaaS** banana ho. Agency use-case me multi-instance
hi sahi hai — par tabhi jab **core update ka raasta** maujood ho (faisla #1).

---

## Admin information architecture

```
Dashboard
Pages          All · Trash                          (+ Add New)
Posts          All · Categories · Tags · Trash      (+ Add New)
[custom types] contentType se auto-generate         (Phase 6)
Media          Library · Folders · Trash
Forms          Forms · Submissions
Appearance     Site Style · Menus · Templates · Patterns
SEO            Defaults · Redirects · Sitemap
Users          All Users · Roles · My Profile
Tools          Import · Export · Activity Log
Settings       General · Reading · Permalinks · Media · Scripts
```
**Appearance grouping** sabse zaroori addition hai — pehle Menus, Templates aur theme
tokens teen alag features the jinka koi ghar nahi tha.

Har list screen ka standard: status count tabs · search + filters · **bulk actions** ·
row hover pe **Edit · View · Duplicate · Trash**.

---

## Phases

Har phase ek shippable milestone hai. Estimates 1 full-time dev ke liye.

| Phase | Naam | Time |
|---|---|---|
| -1 | Din-1 faisle (koi code nahi) | — |
| 0 | Foundation & Auth | 1.5 hafte |
| 1 | Content Core | 3 hafte |
| 2 | Media Library | 1.5 hafte |
| 3 | Public Site + Routing + Menus | 3 hafte |
| 4 | SEO Module | 1.5 hafte |
| 5 | Page Builder MVP | 6-8 hafte |
| 6 | Content-Type Builder + Patterns | 3-4 hafte |
| 7 | Forms, Users, Tools & Polish | 2-3 hafte |
| 8 | Hardening & Fleet Ops | 1.5 hafte |

Har phase ka detail + **NEW** additions: `02-BUILD-PLAN.md`.

### Build order — UI kab banta hai
| UI | Kab |
|---|---|
| **Admin panel shell** (login + sidebar) | Phase 0 — sabse pehla UI |
| Admin ke andar ke screens | Phase 1-2 |
| **Website ka header + footer** | Phase 3 — asli API data se, dummy se nahi |
| Page builder UI | Phase 5 |

### Phase 3 ka internal order
1. `menus` + `menuLocations` model + CRUD + admin drag-drop builder
2. Public API: `settings` + `menus` + **`resolve`** endpoints
3. Theme design tokens (settings-driven CSS variables)
4. **Header + Footer — asli API data se, day one se**
5. Templates CRUD + template parts
6. `apps/web` **ek catch-all route** + BlockRenderer + archives + pagination

---

## Timeline

| Milestone | Cumulative |
|---|---|
| Phase 0-2 (admin + content + media) | 6 hafte |
| **Phase 3-4 → usable CMS, client demo ready** | **10 hafte** |
| Phase 5 → page builder live | 16-18 hafte |
| Phase 6-8 → full framework, production | 23-28 hafte |

> Purana estimate 14-16 hafte tha. Phase 5 aur 6 dono apne estimate se lagbhag dugne
> hain, aur v2 additions ka ~2-3 hafta Phase 0-4 me juda hai. Wo addition rework
> bachaata hai: `path`, cache tag map aur block-CSS decision — teenon baad me partial
> rewrite maangte.

---

## Testing strategy (parallel me chalta rahe)
- **Vitest unit** — services: slug/path logic, cascade + redirect, permission checks,
  SEO fallback chain, **block tree operations**
- **supertest + mongodb-memory-server** — har API module ka happy path + auth failure +
  409 conflict + trash/restore
- **Playwright E2E** — 6 flows: login · page create+publish · media upload ·
  builder drag+save · public page render · slug change se 301
- **CI Phase 0 se**, Phase 8 se nahi

## Verification (har phase ke baad)
1. `docker compose up` → mongo + api + admin + web chalein
2. `pnpm seed` → admin user bane; `pnpm cms migrate` chale; `pnpm test` green
3. Manual smoke: login → page banao → block drop karo → publish → `apps/web` pe wahi
   page kholo aur **preview vs live pixel-match** verify karo
4. Slug badal ke dekho: purana URL 301 kare, descendants ke path update hon
5. `curl /api/public/sitemap` me naya page aaye; `view-source` me meta + JSON-LD dikhe
6. Lighthouse SEO score ≥ 95 on a published page

---

## Sabse pehla kadam
1. **Phase -1 ke 8 faisle freeze karo** — repo layout inhi pe khada hai
2. Monorepo skeleton + docker-compose (mongo chalu) + CI
3. **`entries` aur block JSON ka Zod contract `packages/shared` me freeze karo.**
   Envelope freeze karo (`id`/`type`/`props`/`style`/`children`/`version`), block ki
   *list* nahi — wo Phase 5 me asli design se nikalegi
4. Phase 0 complete: auth + RBAC + admin shell + migration runner
5. Apne kisi asli client ka homepage design lo, blocks me todo — jo 10 block nikle
   wahi Phase 5 ki final list hai

## Biggest risks
1. **Phase 5 (builder) ko Phase 3-4 se pehle mat chhedna.** Bina public renderer +
   templates ke builder banaoge to preview aur live output kabhi match nahi karenge.
2. **Faisla #1 (distribution) taal dena.** 3 client ship karne ke baad ye decide
   karoge to teen fork ban chuke honge, aur unhe wapas merge karna naya project hai.
3. **Phase 0→3 ka patla vertical slice pehle live karo** (ek content type, do block,
   ek template) — isse preview-parity aur cache-invalidation tab test ho jaate hain
   jab unhe badalna abhi sasta hai.
