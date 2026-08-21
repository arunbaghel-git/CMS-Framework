# 05 — Build Plan

Estimates 1 full-time dev ke hisaab se. 2 dev ho to roughly 60% time.
Har phase ek **shippable milestone** hai — beech me ruk gaye to bhi jo bana hai wo
kaam karta hai.

| Phase | Naam                            | Time      | Milestone                                         |
| ----- | ------------------------------- | --------- | ------------------------------------------------- |
| −1    | Din-1 faisle                    | —         | Koi code nahi, sirf freeze                        |
| 0     | Foundation & Auth               | 1.5 hafte | Admin me login ho jaata hai                       |
| 1     | Content Core                    | 3 hafte   | Page/post ban ke save, trash + revisions ke saath |
| 2     | Media Library                   | 1.5 hafte | Upload, variants, picker, usage tracking          |
| 3     | Public Site + Routing + Menus   | 3 hafte   | **Pehli live website chal padi**                  |
| 4     | SEO Module                      | 1.5 hafte | Meta, sitemap, redirects, JSON-LD, feed           |
| 5     | Page Builder MVP                | 6-8 hafte | Drag-drop se page banta hai                       |
| 6     | Content-Type Builder + Patterns | 3-4 hafte | Ab ye "framework" hai                             |
| 7     | Forms, Users, Tools & Polish    | 2-3 hafte | Client ko dene laayak                             |
| 8     | Hardening & Fleet Ops           | 1.5 hafte | Production, backup, monitoring                    |

**Total ~23-28 hafte.** Phase 0-4 ke baad (~10 hafte) ek **usable CMS** mil jaata hai —
page builder ke bina, classic editor ke saath. Client demo isi point pe ho sakta hai.

---

## Phase −1 — Din 1 se pehle (koi code nahi)

Ye schema aur repo layout me pak jaate hain. Code likhne se **pehle** freeze karo.
Poora reasoning [`03-DECISIONS.md`](03-DECISIONS.md) me.

| #   | Faisla                                                         | Reference |
| --- | -------------------------------------------------------------- | --------- |
| 1   | Core distribution — versioned packages + client repo           | D-15      |
| 2   | Migration runner (schema + block-tree, do alag)                | D-16      |
| 3   | `entries.path` stored + unique indexed                         | D-09      |
| 4   | Reserve fields: `deletedAt`, `locale`, `version`, `searchText` | §3.1      |
| 5   | Statuses `pending` + `private`                                 | D-18      |
| 6   | `refreshTokens` collection                                     | D-13      |
| 7   | `style` → server-generated scoped CSS                          | D-08      |
| 8   | Preview parity — injected `components={{Link, Image}}`         | D-07      |

Saath hi ye char **artifacts** likhne hain →
[`09-OPEN-ITEMS.md`](09-OPEN-ITEMS.md):
permission string list ✅ · env schema ✅ · seed definition ✅ ·
`entries` + block envelope ka Zod contract (baaki hai).

---

## Slice 0 — Header + Footer, end-to-end (~1.5 hafte)

**Phase 0 ke baad, Phase 1 se pehle.** Ye ek patli vertical slice hai jo poora pipeline
ek baar verify karti hai — admin se lekar live site tak. Page builder isme **nahi** banega.

### Kyun header/footer, koi content page nahi

Header aur footer **har page pe** aate hain — poore system ka sabse zyada reuse hone
wala hissa. Aur ye original Phase 3 order se match karta hai: _"header/footer pehle,
asli API data se, dummy se nahi"_.

### Scope

**Admin me (minimal config screens)**

- Logo upload + site name
- Navigation — menu items add/reorder/nest (drag-drop)
- Header CTA button (label + link)
- Footer columns — links
- Social links
- Copyright text
- Save aur publish

**API**

- `settings` — admin write + public read
- `menus` + `menuLocations` — admin write + public read
- Revalidate webhook (shared secret ke saath)

**Public site**

- Header aur footer **asli API data se** render
- Theme tokens (colors, fonts) settings se driven
- Menu change → site update (cache invalidation verify)

### Done kab

```
1. Admin me login karo
2. Logo badlo, menu me ek item add karo, CTA ka text badlo
3. Save karo
4. Public site refresh karo → change turant dikhe
```

### Kya verify ho jaata hai

- ✅ Auth + admin shell + RBAC ka poora rasta
- ✅ Settings aur menus ka API contract
- ✅ **Cache invalidation** — menu badla, site update hui
- ✅ Theme tokens ka mechanism
- ✅ Deploy pipeline end-to-end

### Kya verify NAHI hota (imaandari se)

- ❌ **Preview parity** — usme blocks chahiye, wo Phase 5 me hi test hoga
- ❌ `entries` + `path` routing — Phase 1/3 me
- ❌ Page builder — Phase 5

Ye slice cache aur config pipeline ka risk khatam karti hai; preview-parity ka risk
khula rehta hai. Wo D-07 ke mechanism (injected primitives) pe depend karta hai.

---

## Phase 0 — Foundation & Auth (1.5 hafte)

- Monorepo (pnpm workspaces): `apps/api`, `apps/admin`, `packages/shared`
- Express core: error handler, pino logger, CORS, helmet, rate limit, Zod validate middleware
- Mongoose connect + `User`, `Role`, `Settings`, `RefreshToken` models
- **Migration runner** chalu, pehli migration hi seed ho
- Auth: login, logout, refresh, forgot/reset — httpOnly + Secure + SameSite=Lax cookies,
  refresh rotation + reuse detection, double-submit CSRF middleware
- **Single-flight refresh mutex** admin API client me (D-13)
- RBAC middleware `requirePermission()` — permission list pehle se freeze
- **NoSQL injection guard** — har query param pe strict Zod. `req.query`/`req.body`
  kabhi seedha Mongoose query me spread nahi
- **CSP policy** likho (nonce-based) — helmet enable karna alag cheez hai
- Seed script: pehla admin user + default roles + default settings
- Admin shell: React + Vite + **plain CSS** (design se), sidebar, protected routes
- **Users screens** (Phase 7 se aage khiske): list · add · edit · delete + reassign (D-34/D-35)
- **Users ka role-aware menu + Profile screen** (D-37) — admin ko All Users · Add User ·
  Profile, baaki roles ko sirf Profile. Iske liye nav registry `{ id, label, to, permission }`
  chahiye jise **sidebar aur route guard dono** padhein
- ~~**Activity log ka write path**~~ → **DEFER** (21 Aug). Client ke design me activity
  log hai hi nahi; ye humare apne plan se aaya tha. Neeche "Activity log kyun defer hua"
  padho — us faisle ki ek keemat hai jo likhi honi chahiye
- **CI day 1 se** — lint + test on every commit
- Docker compose: mongo + api + admin

**Done kab:** admin login karke khaali dashboard dekhta hai; `contributor` role
restricted route pe 403 khaata hai **aur use sidebar me Users ke andar sirf Profile
dikhta hai**; `pnpm cms migrate` chalta hai; CI green.

> `subscriber` yahan likha tha — wo role banaya hi nahi gaya (D-26).

### Activity log kyun defer hua

Ye item **client se nahi aaya tha** — humare apne plan se aaya tha. Client ke design
(`reference/admin-design.html`) me site-wide activity log **kahin nahi hai**. Usme jo
"Activity & Notes" dikhta hai wo **Enquiry detail** ke andar ki timeline hai (Phase 7b) —
bilkul alag cheez, aur `11-REFERENCE-ADMIN.md` §gap me wo pehle se noted hai.

Write path har user/entry/media service me code jodta hai, hamesha ke liye. Jo feature
maanga hi nahi gaya, uske liye wo cost aaj uthana galat hai (R15 ka wahi rule — scope
client se aata hai, developer se nahi).

**Is faisle ki keemat, saaf likhi hui:** activity log ka itihaas **backfill nahi ho
sakta**. Jis din ye banega, us din se pehle ka record kahin nahi hoga. Agar kabhi client
poochhe "ye user kisne delete kiya tha", to us tareekh se pehle ka jawab hamesha "pata
nahi" rahega. Client ko ye bata diya gaya hai aur unhone ye maan kar defer kiya hai.

`activity.read` permission `packages/shared` me rehne di gayi hai — spec 001 kehta hai
permission strings sirf **add** hoti hain, hatti nahi. Wo abhi kisi cheez ko point nahi
karti, aur yahi wo jagah hai jahan ye likha hua hai.

---

## Phase 1 — Content Core (3 hafte)

- `entries` model + service (type/slug/**path**/status/publishAt/seo/fields/content)
- **`resolvePath()` ek hi jagah** — parent slug badle to descendants cascade + har ek pe 301
- Slug auto-generate, uniqueness per type, manual override, collision suffix `-2`
- **Reserved slugs** (`/admin`, `/api`, `/_next`, `/media`, `/uploads`) block
- Statuses: draft / pending / published / scheduled / private + publish, unpublish, duplicate
- **Scheduled publish DB-based** — indexed `publishAt`, cron atomic claim, self-healing
  read query. `setTimeout` kabhi nahi (D-11)
- **Trash** — `deletedAt`, Trash view per type, restore, permanent delete sirf Trash se,
  N din baad auto-purge
- **Pending review workflow** — "Submit for review", editor ke liye Pending filter + count
- **Revisions on save aur publish dono** (retention cap ke saath) + **changed-summary**
  restore se pehle
- **Optimistic concurrency** — PATCH pe `version`, mismatch pe 409
- **`searchText` maintain on save** — title + excerpt + blocks ka flattened text
- **Autosave recovery prompt**
- Admin: Pages list, Posts list — search, filter, sort, **server-side pagination**,
  **status count tabs**, **bulk actions**, **row actions (Edit · View · Duplicate · Trash)**
- Entry editor: title, slug, TipTap rich text, excerpt, featured image placeholder,
  status sidebar, autosave (30s debounce)
- Taxonomies: categories + tags CRUD, posts pe assign, default "Uncategorized"

**Done kab:** admin 10 pages aur 10 posts bana, edit, publish/unpublish, trash se
restore, aur purani revision restore kar sakta hai.

**Trap:** `content` ko abhi se `{ version: 1, blocks: [] }` shape me rakho — rich text
ko ek `richText` block ke andar. Phase 5 me migration nahi likhni padegi.

---

## Phase 2 — Media Library (1.5 hafte)

- Upload API: multer + `sharp` → variants (thumb 300, medium 800, large 1600, webp)
- Storage adapter: `local` (dev) aur `s3` (prod) — call site same
- **Upload hardening yahin** — magic-byte check (sirf mime header pe bharosa nahi),
  size cap, sharp pixel/decompression-bomb limit, filename sanitize (path traversal)
- **SVG policy** — SVG ke andar `<script>` chal jaata hai. Sanitize ya disallow
- Folders, rename, media trash (`deletedAt`), bulk select
- **`mediaRefs` backlink index** — save pe refs likho; `GET /media/:id/usage` isi se;
  references hone pe delete block
- **Image crop / rotate / scale** admin me
- **Replace file** — swap ho, URL aur references same rahein
- Admin grid: drag-drop upload, alt/title/caption edit, search
- **Reusable `<MediaPicker />` modal** — editor aur builder dono use karenge
- Featured image entry pe wire karna

**Done kab:** 50 images upload, folder me organize, alt set, editor se pick, aur
"ye image kahan-kahan use ho rahi hai" ka jawab mile.

**Rule:** original file kabhi serve mat karo, URL hamesha variant ka (SVG exception).

---

## Phase 3 — Public Site + Routing + Menus (3 hafte)

_Sabse zyada "wow" is phase me — pehli baar site live dikhti hai._

### Internal order (header/footer pehle)

1. `menus` + `menuLocations` model + CRUD + admin drag-drop builder
2. Public API: `settings` + `menus` + **`resolve`** endpoints
3. Theme design tokens (settings-driven CSS variables)
4. **Header + Footer components — asli API data se, day one se** (dummy se nahi)
5. Templates CRUD + template parts
6. `apps/web` **ek catch-all route** + BlockRenderer + archives

### Kaam

- `packages/blocks`: registry + `<BlockRenderer />` + 4 starter blocks
  (richText, image, section, container). Abhi builder UI nahi, sirf renderer
- **`components={{Link, Image}}` injection** — preview/live parity ka asli mechanism (D-07)
- **Homepage + posts-page settings** — `/` isi se resolve hota hai
- **Ek hi catch-all route**, stored `path` se. Hardcoded `/blog/[slug]` **nahi**
- **Taxonomy archives** `/category/{slug}`, `/tag/{slug}` (base editable) +
  **archive pagination** `/page/2`
- **Search results page** + **RSS feed**
- **Canonical enforcement** — trailing-slash policy, lowercase, variants 301
- **Menus + locations** + item pe `target` aur `cssClass`
- Templates + template parts; entry pe template select
- **Cache authority + tag map** — Next ISR hi authority, publish service explicit
  dependency map se `revalidateTag()` (D-14). **Ye map yahin design hoga**
- **Revalidate webhook pe shared secret**
- **Appearance nav grouping** admin me
- **Frontend edit bar** — live site pe "Edit this page"

**Done kab:** ek asli chhoti website (home + about + contact + blog + category archive)
sirf admin se ban jaaye, koi code change nahi.

---

## Phase 4 — SEO Module (1.5 hafte)

- Entry editor SEO tab: title, description, canonical, noindex/nofollow, OG image,
  schema type + Google preview snippet
- **SEO title templates** per content type (`%title% | %sitename%`)
- `settings.defaultSeo` + poora fallback chain
- **Global noindex toggle** (`settings.searchEngineVisible`) + admin warning banner
- Dynamic `sitemap.xml` (published only) + `robots.txt`
- JSON-LD: Organization, WebSite, Article/WebPage, **BreadcrumbList**
- **Breadcrumbs** `parentId` se
- Redirect manager (301/302 + hit counter); slug change pe auto-redirect
- **Redirect chain flatten + loop detection**
- SEO checklist score: title/meta length, H1 count, missing alt, internal links, focus keyword
- **Pre-publish check panel** — publish button pe checklist ka result
- **Rich-text output sanitization** (Phase 8 me nahi, yahin)
- Analytics/GTM script fields — **sirf `admin` role ko editable** (privilege boundary)

**Done kab:** naya page publish karte hi sitemap me aaye, share pe sahi OG card dikhe,
slug badalne pe purana URL 301 kare, staging pe noindex banner dikhe.

---

## Phase 5 — Page Builder MVP (6-8 hafte)

**Project ka sabse bada risk. Scope tight rakhna hai.**

### 5a — Engine (2 hafte)

- Editor store: zustand + immer, tree ops (add/move/delete/duplicate/select)
- Undo/redo history stack (patches based, 50 steps)
- Canvas **sandboxed** iframe + postMessage bridge, hover/selection outlines
- Drop zones + drag from library aur canvas ke andar (dnd-kit)
- **`styleToCss()` in `packages/blocks`** — scoped CSS with real media queries (D-08)
- **Tree ops ke saath-saath unit tests** — JS me yahan type safety nahi hai

### 5b — Blocks v1 (1.5 hafte) — sirf ye 10

`section` · `container` · `columns (2/3/4)` · `heading` · `text` · `image` ·
`button` · `spacer` · `video` · `form-placeholder`

### 5c — Properties panel (1.5-2 hafte)

- Schema-driven field renderer: text, textarea, number, select, toggle, color, slider,
  image (MediaPicker), link, align, spacing
- Responsive tabs desktop/tablet/mobile + **inherit indicator**
- Style controls: padding, margin, background, border radius, shadow, max-width,
  visibility per breakpoint
- **Sidebar me do tabs: `Document` aur `Block`**
- **Floating block toolbar** — align, link, duplicate, delete, move

### 5d — Polish (1-1.5 hafte)

- Layers panel, keyboard shortcuts (Ctrl+Z/C/V/D, Delete)
- Save draft / publish, "unsaved changes" guard
- Preview mode + device preview
- **Patterns** — 6-8 ready-made sections (hero, features, CTA, testimonial, pricing, contact)
- **`hasBuilder` rule explicit** — Posts → rich text, Pages → builder; dono ek hi
  `content.blocks` shape likhte hain, switch non-destructive

**Done kab:** non-technical banda 20 minute me landing page bana le, save kare, aur
live site pe **bilkul wahi** dikhe.

**Explicitly OUT:** animations, custom CSS box, z-index/absolute positioning,
multi-user live collab, nested synced patterns.

---

## Phase 6 — Content-Type Builder + Patterns (3-4 hafte)

_Isi phase me project "ek website" se "framework" ban jaata hai._

- `contentTypes` CRUD admin UI: label, icon, URL pattern, archive base, builder on/off
- Field types: text, textarea, richText, number, boolean, date, select, media,
  relation, repeater
- **Dynamic admin** — naya type banate hi sidebar menu, list screen, editor auto-generate
- **Synced Patterns** — ek jagah save, har use pe reference
- Template assignment rules per content type (archive + single)
- Dynamic "Post List" block (query: type, category, limit, sort, layout)
- **Custom type archive routing** — `archiveBase` catch-all me wire ho
- **Built-in types protected** — `page`/`post` delete na hon, `key` immutable
- **Field delete pe kya ho** define karo (orphan rakho ya purge) — warna admin ek click
  me 400 entries ka data uda dega
- **Block-tree migration path** — page `content.version` v1 pe ho sakta hai jab site v4 pe

**Done kab:** developer ke bina admin "Services" type bana ke 5 services daale, aur home
page pe "Services List" block se dikha de.

---

## Phase 7 — Forms, Users, Tools & Polish (2-3 hafte)

- Form builder + submissions inbox + CSV export + honeypot/rate-limit spam guard
- **Submissions retention + PII policy** (`ip` store hota hai — TTL + export/delete)
- ~~User management UI~~ → **Phase 0 me aa chuka** (list · add · edit · delete, D-34/D-35)
- ~~My Profile screen~~ → **Phase 0 me aa raha hai** (D-37). Naam + password editable
  (current password ke saath), baaki read-only. **Avatar** yahin rahega — wo Phase 2
  (Media) pe block hai
- **Custom role builder** — role ki permissions edit karne ka UI. **Yahi Phase 7 me hai**
  (D-37); Phase 0 me sirf `GET /api/roles` read-only bana hai. Isi ke saath wo faisla bhi
  aayega: built-in role edit ho sake, ya sirf "Duplicate"? (D-36 ka takraav)
- Activity log — **screen aur write path dono**, agar tab tak client maange. Write path
  Phase 0 me nahi bana (21 Aug ka faisla), isliye is screen ke pehle din se hi purana
  itihaas khaali rahega
- Settings screens: **General · Reading · Permalinks · Media · Scripts**
  - General: tagline, dateFormat
  - Reading: homepage/posts page, postsPerPage, searchEngineVisible
  - Permalinks: per-type urlPattern, category/tag base
- Dashboard widgets: recent edits, draft count, **pending review count**, submissions
- Onboarding: setup wizard (site name, logo, colors, starter pages)
- Cmd+K search — `searchText` index pe
- **Tools: content Export / Import (JSON)** — staging→prod move, client handover
- Empty / error / loading states — non-technical user ke liye yahi actual UX hai

---

## Phase 8 — Hardening & Fleet Ops (1.5 hafte)

- Security audit: rate limiting, file validation, secrets audit
  _(XSS sanitize, Mongo injection guard, upload hardening pehle ke phases me hain)_
- Performance: DB index review, N+1 check, image lazy loading, bundle split
- **Fleet-level ops** — 15 instance = 15 `mongodump` cron = 15 silent failure modes.
  Backup, monitoring, uptime, Sentry, **core-version tracking** central
- **Shared Mongo cluster, per client alag DB**
- Backup: centralized dump + media backup + **restore test** (untested backup = no backup)
- Docs: block guide, theme guide, deployment runbook, admin manual (screenshots ke saath),
  **core upgrade runbook**
- **`create-cms-site`** client repo generator

---

## Post-launch backlog (jaan-boojh kar abhi nahi)

| Item                        | Kyun abhi nahi                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WordPress WXR importer**  | Sales feature hai (client migration), launch block nahi karta. Bas entries/media/taxonomy model ko aisa mat hone do ki import impossible ho jaaye |
| Multi-language (`locale`)   | Field day 1 se reserve, feature baad me                                                                                                           |
| Multi-site                  | Sirf tab jab SaaS banana ho                                                                                                                       |
| Comments                    | Native nahi — third-party embed block (D-23)                                                                                                      |
| Quick Edit                  | Bulk actions 80% cover kar dete hain                                                                                                              |
| Author / date archives      | Agency sites pe dead weight                                                                                                                       |
| Full visual block-tree diff | Changed-summary kaafi hai                                                                                                                         |
| Plugin system               | Blocks hi extension point hain (D-23)                                                                                                             |

---

## Sabse badi salah

1. **Phase 5 (builder) ko Phase 3-4 se pehle mat chhedna.** Bina public renderer +
   templates ke builder banaoge to preview aur live output kabhi match nahi karenge,
   aur wo bug baad me poora rewrite maangta hai.

2. **Phase 0→3 ka ek patla vertical slice pehle live karo** — ek content type, do block,
   ek template, ek page live. Isse do sabse risky design (preview parity aur cache
   invalidation) tab test ho jaate hain jab unhe badalna abhi sasta hai.

3. **Faisla D-15 (distribution) mat taalo.** 3 client ship karne ke baad decide karoge
   to teen fork ban chuke honge, aur unhe wapas merge karna naya project hai.
