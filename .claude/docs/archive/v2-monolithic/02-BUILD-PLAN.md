# Phased Build Plan (v2)

Estimates 1 full-time dev ke hisaab se hain. 2 dev ho to roughly 60% time.
Har phase ek **shippable milestone** hai — beech me ruk gaye to bhi jo bana hai
wo kaam karta hai.

> **v2 note:** review ke baad har phase me additions aaye hain (niche **NEW** se mark
> hain). Zyadatar additions schema-shaped hain, screen-shaped nahi — matlab wahi kaam
> jo production data aane ke baad 5-10x mehnga ho jaata hai. Isliye estimates bhi
> realistic kiye gaye hain.

| Phase | Naam                            | Time      | Milestone                                               |
| ----- | ------------------------------- | --------- | ------------------------------------------------------- |
| 0     | Foundation & Auth               | 1.5 hafte | Admin me login ho jaata hai                             |
| 1     | Content Core (pages + posts)    | 3 hafte   | Page/post ban ke DB me save, trash + revisions ke saath |
| 2     | Media Library                   | 1.5 hafte | Upload, variants, picker, usage tracking                |
| 3     | Public Site + Routing + Menus   | 3 hafte   | **Pehli live website chal padi**                        |
| 4     | SEO Module                      | 1.5 hafte | Meta, sitemap, redirects, JSON-LD, feed                 |
| 5     | Page Builder MVP                | 6-8 hafte | Drag-drop se page banta hai                             |
| 6     | Content-Type Builder + Patterns | 3-4 hafte | Ab ye "framework" hai                                   |
| 7     | Forms, Users, Tools & Polish    | 2-3 hafte | Client ko dene laayak                                   |
| 8     | Hardening & Fleet Ops           | 1.5 hafte | Production, backup, monitoring                          |

**Total ~23-28 hafte.** Phase 0-4 ke baad (~10 hafte) ek usable CMS mil jaata hai —
page builder ke bina, classic editor ke saath.

---

## Phase -1 — Din 1 se pehle ke faisle (koi code nahi)

Ye 8 cheezein schema aur repo layout me pak jaati hain. Baad me badalna sabse mehnga
refactor hai, isliye code likhne se **pehle** decide karo.

1. **Core distribution model** — versioned `@cms/*` packages + patla client repo.
   Iske bina "no code per client" client #2 pe hi toot jaata hai.
2. **Migration runner** — numbered files + `migrations` collection, aur block-tree
   migrations kahan chalengi.
3. **`entries.path`** stored + indexed, reserved slugs, cascade + auto-redirect.
4. **Reserve fields:** `deletedAt`, `locale`, `version`, `searchText`.
5. **Statuses `pending` + `private`** — `pending` ke bina contributor role kaam hi
   nahi karta.
6. **`refreshTokens` collection** — rotation + reuse detection stateless JWT se
   possible hi nahi.
7. **`style` → CSS strategy** — server-generated scoped CSS (inline style se media
   query likhi hi nahi ja sakti).
8. **Preview parity** — `<BlockRenderer components={{Link, Image}} />`, host apne
   primitives inject kare.

Detail: `01-ARCHITECTURE.md` sections 3c, 3d, 4a, 4b, 8.

---

## Phase 0 — Foundation & Auth (1.5 hafte)

**Banana kya hai**

- Monorepo (pnpm workspaces): `apps/api`, `apps/admin`, `packages/shared`
- Express setup: error handler, logger (pino), CORS, helmet, rate limit, Zod validate middleware
- Mongoose connect + `User`, `Role`, `Settings`, `RefreshToken` models
- Auth: login, logout, refresh, forgot/reset password — httpOnly + Secure +
  SameSite=Lax cookies, refresh rotation, double-submit CSRF token middleware
- RBAC middleware `requirePermission()`
- Seed script: pehla admin user + default roles + default settings
- Admin shell: React + Vite (JSX) + Tailwind + shadcn/ui, sidebar layout,
  protected routes, API client (axios + auto refresh on 401)
- Docker compose: mongo + api + admin

**NEW is phase me**

- **CI day 1 se** (lint + test on every commit) — pehle Phase 8 me tha, 15 hafte late
- **NoSQL injection guard** — har query param pe strict Zod; `req.query`/`req.body`
  kabhi seedha Mongoose query me spread nahi. `fields` Phase 1 se Mixed hai, isliye
  ye Phase 8 ka kaam nahi hai
- **CSP policy likho** (nonce-based) — helmet enable karna alag cheez hai, policy alag
- **Single-flight refresh mutex** admin API client me — 5 parallel 401 se 5 refresh
  chalenge aur rotation ke saath user random logout hoga (week 3 ka classic bug)
- **`refreshTokens` collection** — `jti` + `familyId`, reuse pe poori family revoke
- **Roles final:** `admin` / `editor` / `author` (apna publish kar sakta) /
  `contributor` (publish nahi, `pending` bhejta hai) / `subscriber`
- **Activity log ka write path** service layer me (screen Phase 7 me) — ye backfill
  nahi ho sakta
- **Migration runner** chalu — pehli migration hi seed ho

**Done kab:** admin login karke khaali dashboard dekh sakta hai; `subscriber` role
wala user restricted route pe 403 khaata hai; `pnpm cms migrate` chalta hai.

**Sochne wali cheez:** permission strings ki list abhi likh lo (aage sirf add karoge).
Baad me RBAC retrofit karna sabse mehnga refactor hota hai.

---

## Phase 1 — Content Core (3 hafte)

**Banana kya hai**

- `entries` model + service (type/slug/path/status/publishAt/seo/fields/content)
- Slug auto-generate + uniqueness per type + manual override + collision suffix `-2`
- Draft / Pending / Published / Scheduled / Private states + publish, unpublish, duplicate
- **Scheduled publish DB-based** — indexed `publishAt`, cron har minute atomic
  `findOneAndUpdate` claim; public query bhi `scheduled && publishAt<=now` ko published
  maane (self-healing). `setTimeout` kabhi nahi.
- Revisions: snapshot, list + restore — **service layer me, Mongoose hook me nahi**
- Admin: Pages list, Posts list (search, filter, sort, server-side pagination)
- Entry editor screen: title, slug, TipTap rich text, excerpt, featured image
  placeholder, status sidebar, autosave draft (30s debounce)
- Taxonomies: categories + tags CRUD, posts pe assign

**NEW is phase me**

- **`path` field + `resolvePath()`** — ek hi jagah likha jaaye. Parent slug badle to
  descendants ka path **cascade update** + har ek pe auto 301
- **Reserved slugs** (`/admin`, `/api`, `/_next`, `/media`, `/uploads`) claim na ho sakein
- **Trash** — delete action `deletedAt` set kare; Trash view per type; restore;
  permanent delete sirf Trash ke andar se; N din baad auto-purge
- **Pending review workflow** — contributor ka "Submit for review", editor ke liye
  Pending filter + dashboard count
- **Revision on save bhi**, sirf publish pe nahi (retention cap ke saath). Recovery ka
  asli case "maine save karke tod diya" hai. Restore se pehle **changed-summary**
  dikhao ("3 blocks changed, 1 added") — timestamp list se blind restore karna
  non-technical user ke liye darawna hai
- **Bulk actions + row actions** — select-all → Publish/Unpublish/Trash/Assign category;
  row hover pe Edit · **View** · Duplicate · Trash. 200 posts wale client ke liye ye
  optional nahi hai
- **Status count tabs** — `All (24) | Published (18) | Draft (4) | Pending (2) | Trash (7)`
- **Optimistic concurrency** — PATCH pe `version` bheja jaaye, mismatch pe 409.
  30s autosave + 2 editor = silent lost update
- **`searchText` maintain on save** (title + excerpt + blocks ka flattened text).
  Mongo ek hi text index deta hai aur `{title, seo.description}` block content cover
  nahi karta — iske bina admin search page body me kuch dhoondh hi nahi paayega
- **Autosave recovery prompt** — "iska ek naya autosave maujood hai, restore karein?"
- Default "Uncategorized" category, taaki har post ke paas ek category ho

**Done kab:** admin 10 pages aur 10 posts bana, edit, publish/unpublish, trash se
restore, aur purani revision restore kar sakta hai.

**Trap:** `content` field ko abhi se `{ version: 1, blocks: [] }` shape me rakho —
rich text ko ek `richText` block ke andar store karo. Phase 5 me migration nahi
likhni padegi.

---

## Phase 2 — Media Library (1.5 hafte)

**Banana kya hai**

- Upload API: multer + `sharp` → variants (thumb 300, medium 800, large 1600, webp)
- Storage adapter interface: `local` (dev) aur `s3` — call site same
- Folders, rename, delete (usage check)
- Admin: grid view, drag-drop upload, alt/caption edit, search
- Reusable `<MediaPicker />` modal — editor aur builder dono use karenge
- Featured image entry pe wire karna

**NEW is phase me**

- **Upload hardening yahin, Phase 8 me nahi** — magic-byte check (sirf mime header pe
  bharosa nahi), size cap, sharp pixel/decompression-bomb limit, filename sanitize
  (path traversal)
- **SVG policy** — SVG ke andar `<script>` chal jaata hai. Ya to sanitize karo ya
  disallow. Aur "original kabhi serve mat karo" rule SVG pe apply nahi hota
- **`mediaRefs` backlink index** — spec me "delete with usage-check" tha par usko
  answer karne ka koi structure hi nahi tha; image refs block tree ke andar dabe hote
  hain. Save pe refs likho, `GET /media/:id/usage` isi se
- **Image crop / rotate / scale** admin me — non-technical user ke paas koi doosra tool nahi
- **Replace file** — image swap ho, URL aur saare references same rahein
- **Media trash** (`deletedAt`) + bulk select
- **Object storage production default** (S3/R2 + CDN), local sirf dev. Local disk
  instance ko stateful bana deta hai, aur baad me har client ki files migrate karni padengi

**Done kab:** 50 images upload, folder me organize, alt set, editor se pick, aur
"ye image kahan-kahan use ho rahi hai" ka jawab mile.

---

## Phase 3 — Public Site + Routing + Menus (3 hafte)

Ye phase sabse zyada "wow" deta hai — pehli baar site live dikhti hai.

**Banana kya hai**

- `packages/blocks`: registry + `<BlockRenderer />` + 4 starter blocks
  (richText, image, section, container). Abhi builder UI nahi, sirf renderer.
- Public API: `resolve`, list with pagination, menus, settings
- `apps/web` (Next.js): catch-all route, blog list + single, 404, loading states
- Templates: `templates` CRUD + header/footer **template parts**; entry pe template select
- Theme: design tokens (colors, fonts, spacing) settings se driven
- Menus: nested drag-drop menu builder (dnd-kit) + public render
- On-demand revalidate: publish pe API → Next.js revalidate webhook

**NEW is phase me**

- **Homepage + posts-page settings** — teen document me kahin ye likha hi nahi tha ki
  `/` resolve kaise hota hai. `settings.homepageEntryId` + `postsPageEntryId`
- **Ek hi catch-all route**, stored `path` se resolve. `app/blog/[slug]` jaisa
  hardcoded route **hatao** — wo `urlPattern` configurable hone ka matlab hi khatam
  kar deta hai
- **Taxonomy archives** `/category/{slug}`, `/tag/{slug}` (base editable) +
  **archive pagination** `/page/2`. Iske bina categories sirf labels hain
- **Search results page** (searchText pe) + **RSS feed**
- **Menus + locations** — fixed `key(main|footer)` hatao. Client ko doosra footer menu
  chahiye to code change karna pade, ye "no code per client" rule hi tod deta hai.
  Menu item pe `target` + `cssClass` bhi (nav me "Book Now" button isi se banta hai)
- **Canonical enforcement** — trailing-slash policy, lowercase, baaki variants 301
- **Cache authority + tag map** — Next ISR hi authority; public API pe TTL cache nahi.
  Har fetch pe tags, aur publish service explicit dependency map se `revalidateTag()`
  maare. Ek post publish = post page + archive + pagination + har taxonomy archive +
  post-list wale pages + menu + sitemap + feed. **Ye map yahin design hoga, Phase 8 me
  retrofit nahi**
- **Revalidate webhook pe shared secret** — warna wo public cache-purge endpoint hai
- **`components={{Link, Image}}` injection** BlockRenderer me — preview/live parity
  ka asli mechanism (sirf component share karna kaafi nahi, host alag hai)
- **Appearance nav grouping** admin me — Site Style · Menus · Templates · Patterns.
  Warna in teenon ka koi ghar nahi hai
- **Frontend edit bar** — live site pe logged-in user ko "Edit this page". Session/origin
  design yahin ho raha hai, isliye yahin add karo

**Done kab:** ek asli chhoti website (home + about + contact + blog + category archive)
sirf admin se ban jaaye, koi code change nahi.

---

## Phase 4 — SEO Module (1.5 hafte)

**Banana kya hai**

- Entry editor me SEO tab: title, description, canonical, noindex/nofollow,
  OG image, schema type + Google preview snippet
- `settings.defaultSeo` + fallback chain
- `sitemap.xml` (dynamic, published only), `robots.txt`
- JSON-LD injection: Organization + WebSite + Article/WebPage
- Redirect manager: from/to/301|302 + hit counter; slug change pe auto-suggest
- SEO checklist score: title/meta length, H1 count, image alt missing,
  internal link count, focus keyword presence
- Analytics/GTM script fields settings me (head/body injection)

**NEW is phase me**

- **Global noindex toggle** (`settings.searchEngineVisible`) — staging site ka Google
  me index ho jaana agency ka sabse mehnga accident hai. On hone pe admin me permanent
  warning banner
- **SEO title templates** per content type (`%title% | %sitename%`) — fallback chain me
  pattern layer tha hi nahi
- **Breadcrumbs + BreadcrumbList JSON-LD** — `parentId` already maujood hai
- **Redirect chain flatten + loop detection** — warna infinite redirect
- **Rich-text output sanitization yahin**, Phase 8 me nahi
- **`settings.scripts` sirf `admin` role ko editable** — ye privilege boundary hai,
  settings field nahi. Editor `<script>` inject kar sake to wo admin ke browser me
  chalega, matlab role escalation
- **Pre-publish check panel** — publish button pe SEO checklist ka result dikhe
  ("3 SEO issues"), tab me dabaa hua nahi

**Done kab:** naya page publish karte hi sitemap me aaye, share karne pe sahi OG card
dikhe, slug badalne pe purana URL 301 kare, aur staging pe noindex banner dikhe.

---

## Phase 5 — Page Builder MVP (6-8 hafte)

**Yahi project ka sabse bada risk hai — scope tight rakho.**

> Estimate 3-4 se 6-8 hafte kiya gaya hai. Iframe canvas + postMessage, nested dnd-kit
> drop zones, patch-based undo/redo, responsive style system, schema-driven properties
> panel aur 10 blocks — ye akela itna hi kaam hai.

### 5a — Engine (2 hafte)

- Editor store: zustand + immer, tree ops (add/move/delete/duplicate/select)
- Undo/redo history stack (patches based, 50 steps)
- Canvas **sandboxed** iframe + postMessage bridge, hover/selection outlines
- Drop zones + drag from library aur canvas ke andar (dnd-kit)
- **`styleToCss()` in `packages/blocks`** — server-generated scoped CSS with real
  media queries. Inline styles se media query likhi hi nahi ja sakti

### 5b — Blocks v1 (1.5 hafte) — sirf ye 10, aur kuch nahi

`section` · `container` · `columns (2/3/4)` · `heading` · `text` · `image` ·
`button` · `spacer` · `video` · `form-placeholder`

### 5c — Properties panel (1.5-2 hafte)

- Schema-driven field renderer: text, textarea, number, select, toggle, color,
  slider, image (MediaPicker), link, align, spacing
- Responsive tabs desktop/tablet/mobile + inherit indicator
- Style controls: padding, margin, background, border radius, shadow, max-width,
  visibility per breakpoint
- **NEW — sidebar me do tabs: `Document` aur `Block`.** Pehle Document settings ka koi
  ghar hi nahi tha; builder mode me user slug, status ya category set hi nahi kar paata
- **NEW — floating block toolbar** — align, link, duplicate, delete, move.
  High-frequency actions right panel me bhejoge to editing slow lagegi

### 5d — Polish (1-1.5 hafte)

- Layers panel, keyboard shortcuts (Ctrl+Z/C/V/D, Delete)
- Save draft / publish, "unsaved changes" guard
- Preview mode + device preview
- **Patterns** — 6-8 ready-made sections (hero, features, CTA, testimonial, pricing,
  contact) jo ek click me insert ho. _(Naam "section templates" se "Patterns" kiya —
  insert hote hi copy ban jaate hain)_
- **NEW — `hasBuilder` rule explicit:** Posts → rich text (single `richText` block),
  Pages → builder. Dono ek hi `content.blocks` shape likhte hain, isliye switch
  non-destructive hai

**Done kab:** non-technical banda 20 minute me ek landing page bana le, save kare,
aur live site pe bilkul wahi dikhe.

**Explicitly OUT of scope:** animations, custom CSS box, z-index/absolute positioning,
multi-user live collab, nested synced patterns.

---

## Phase 6 — Content-Type Builder + Patterns (3-4 hafte)

Isi phase me project "ek website" se "framework" ban jaata hai.

**Banana kya hai**

- `contentTypes` CRUD admin UI: naya type banao (label, icon, URL pattern,
  archive base, builder on/off), custom fields define karo
- Field types: text, textarea, richText, number, boolean, date, select,
  media, relation, repeater
- Dynamic admin: naya type banate hi sidebar me menu, list screen, editor
  screen auto generate ho
- **Synced Patterns** (pehle "global blocks") — ek jagah save, har use pe reference
- Template assignment rules per content type (archive + single)
- Dynamic blocks: "Post List" block jo query se content pull kare

**NEW is phase me**

- **Built-in types protected** — `page` aur `post` delete na ho sakein; `key` immutable
- **Field delete pe kya ho** define karo (orphan data rakho ya purge) — warna admin ek
  click me 400 entries ka data uda dega
- **Block-tree migration path** — page `content.version` v1 pe ho sakta hai jab site v4
  pe hai. Per-document, lazily on read + batch job, idempotent
- **Custom type archive routing** — `archiveBase` catch-all me wire ho

**Done kab:** developer ke bina admin "Services" type bana ke 5 services daale, aur
home page pe "Services List" block se wo dikha de.

---

## Phase 7 — Forms, Users, Tools & Polish (2-3 hafte)

- Form builder (fields, validation, email notify, success message) + submissions
  inbox + CSV export + honeypot/rate limit spam guard
- User management UI: invite, role assign, deactivate
- **NEW — My Profile screen** (naam, email, password, avatar). Ye "dusron ko manage
  karna" se alag cheez hai aur plan me thi hi nahi
- Activity log screen (write path Phase 0 se chalu hai)
- Settings screens: **General · Reading · Permalinks · Media · Scripts**
  - **NEW — General:** tagline, dateFormat
  - **NEW — Reading:** homepage/posts page, postsPerPage, searchEngineVisible
  - **NEW — Permalinks:** per-type urlPattern, category/tag base
- Dashboard widgets: recent edits, draft count, **pending review count**, form
  submissions, quick actions
- Onboarding: setup wizard (site name, logo, colors, starter pages import)
- Search across admin (Cmd+K) — `searchText` index pe
- **NEW — Tools: content Export / Import (JSON)** — staging→prod content move,
  client handover, portability
- **NEW — Submissions retention + PII policy** (`ip` store hota hai; TTL + export/delete)
- Empty states, error states, toasts, loading skeletons

---

## Phase 8 — Hardening & Fleet Ops (1.5 hafte)

- Security audit: rate limiting, file type/size validation, secrets audit
  _(XSS sanitize, Mongo injection guard, upload hardening ab pehle ke phases me hain)_
- Performance: DB index review, N+1 query check, image lazy loading, bundle split
- **NEW — fleet-level ops, per-instance cron nahi:** 15 instance = 15 `mongodump` cron
  = 15 silent failure modes. Backup, monitoring, uptime, Sentry aur **core-version
  tracking** central honge ("kaunsa client kis version pe hai" ek query me)
- **NEW — shared Mongo cluster, per client alag DB** — isolation wahi, par 15 replica
  set nahi
- Backup: centralized dump + media backup + **restore test** (untested backup = no backup)
- Docs: block guide, theme guide, deployment runbook, admin user manual (screenshots ke
  saath), **core upgrade runbook**
- **NEW — `create-cms-site` client repo generator** — patla client repo (theme + blocks
  - env), core `@cms/*` packages se aata hai

---

## Post-launch backlog (jaan-boojh kar abhi nahi)

| Item                        | Kyun abhi nahi                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WordPress WXR importer**  | Sales feature hai (client migration), par launch block nahi karta. Bas entries/media/taxonomy model ko aisa mat hone do ki import impossible ho jaaye |
| Multi-language (`locale`)   | Field day 1 se reserve hai, feature baad me                                                                                                           |
| Multi-site                  | Sirf tab jab SaaS banana ho                                                                                                                           |
| Comments                    | **Native nahi banayenge** — third-party embed block. Ye ek decision hai, omission nahi                                                                |
| Quick Edit                  | Bulk actions 80% cover kar dete hain                                                                                                                  |
| Author / date archives      | Agency sites pe dead weight                                                                                                                           |
| Full visual block-tree diff | Changed-summary kaafi hai                                                                                                                             |
| Plugin system               | Agency framework hai, code aapke paas hai — blocks hi extension point hain                                                                            |

---

## Testing strategy (parallel me chalta rahe)

- **Unit (Vitest):** services — slug/path logic, cascade + redirect, permission checks,
  SEO fallback chain, block tree operations. Yahi sabse zyada value deta hai.
- **Integration (supertest + mongodb-memory-server):** har API module ka happy path +
  auth failure + **409 conflict** + **trash/restore**.
- **E2E (Playwright):** 6 critical flows — login · page create+publish · media upload ·
  builder drag+save · public page render · **slug change se 301 redirect**.
- Page builder ke tree operations pe test likhna optional nahi hai — wahin sabse zyada
  silent bugs aate hain.
- **CI Phase 0 se** chalu, Phase 8 se nahi.

---

## Tech stack (final picks)

| Kaam          | Choice                                                                  | Kyun                                              |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| API           | Express + Mongoose                                                      | Team familiar, ecosystem bada                     |
| Validation    | Zod (shared package)                                                    | Ek schema, admin + API dono                       |
| Admin UI      | React + Vite + Tailwind + shadcn/ui                                     | Fast dev, accessible components free              |
| Server state  | TanStack Query                                                          | Cache, refetch, optimistic updates                |
| Editor state  | Zustand + Immer                                                         | Undo/redo ke liye patches easy                    |
| Drag & drop   | dnd-kit                                                                 | Accessible, nested support, actively maintained   |
| Rich text     | TipTap                                                                  | JSON output (HTML nahi), extensible               |
| Images        | sharp                                                                   | Variants + webp                                   |
| Media storage | S3/R2 + CDN (prod), local (dev)                                         | Instance stateless rahe                           |
| Public site   | Next.js App Router                                                      | SSR/ISR, SEO, image optimization built-in         |
| Auth          | jsonwebtoken + httpOnly cookies + CSRF + **`refreshTokens` collection** | Reuse detection ke liye server-side state chahiye |
| Cache         | **Next ISR hi authority** + tag invalidation                            | Do cache layer = "publish kiya, update nahi hua"  |
| Migrations    | Numbered files + `migrations` collection                                | Schema aur block-tree, do alag system             |
| Distribution  | Versioned `@cms/*` packages + client repo                               | Core update 15 instance tak pahunche              |
| Jobs          | DB-based cron → BullMQ (Phase 7+)                                       | setTimeout restart pe schedule kho deta hai       |

---

## Pehla kadam (agla hafta)

1. **Phase -1 ke 8 faisle** likh ke freeze karo — repo layout inhi pe depend karta hai
2. Repo + monorepo skeleton + docker-compose (mongo chalu)
3. `entries` aur `blocks` ka JSON contract likh ke freeze karo — poora system isi pe
   khada hai. **Envelope freeze karo** (`id`/`type`/`props`/`style`/`children`/`version`),
   block ki _list_ nahi — wo Phase 5 me asli design se nikalegi
4. Phase 0 pura karo: auth + RBAC + admin shell + migration runner + CI
5. Ek asli client site ka homepage design lo aur puchho: "isko blocks me todein to
   kaunse 10 block chahiye?" — wahi Phase 5 ka block list ban jaayega

**Sabse badi salah:** Phase 5 (builder) ko Phase 3-4 se pehle mat chhedna. Bina public
renderer + templates ke builder banaoge to preview aur live output kabhi match nahi
karenge, aur wo bug baad me poora rewrite maangta hai.

**Doosri salah:** Phase 0→3 ka ek patla vertical slice pehle live karo (ek content type,
do block, ek template). Isse preview-parity aur cache-invalidation — do sabse risky
design — tab test ho jaate hain jab unhe badalna abhi sasta hai.
