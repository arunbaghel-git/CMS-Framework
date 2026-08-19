# Phased Build Plan

Estimates 1 full-time dev ke hisaab se hain. 2 dev ho to roughly 60% time.
Har phase ek **shippable milestone** hai — beech me ruk gaye to bhi jo bana hai
wo kaam karta hai.

| Phase | Naam | Time | Milestone |
|---|---|---|---|
| 0 | Foundation & Auth | 1 hafta | Admin me login ho jaata hai |
| 1 | Content Core (pages + posts) | 2 hafte | Rich-text se page/post ban ke DB me save |
| 2 | Media Library | 1 hafta | Upload, crop-free variants, picker |
| 3 | Public Site + Templates + Menus | 2 hafte | **Pehli live website chal padi** |
| 4 | SEO Module | 1 hafta | Meta, sitemap, redirects, JSON-LD |
| 5 | Page Builder MVP | 3-4 hafte | Drag-drop se page banta hai |
| 6 | Content-Type Builder + Global Blocks | 2 hafte | Ab ye "framework" hai |
| 7 | Forms, Users, Polish | 1-2 hafte | Client ko dene laayak |
| 8 | Hardening & Deploy | 1 hafta | Production, backup, monitoring |

**Total ~14-16 hafte.** Phase 0-4 ke baad (7 hafte) hi ek usable CMS mil jaata
hai — page builder ke bina, classic editor ke saath.

---

## Phase 0 — Foundation & Auth (1 hafta)

**Banana kya hai**
- Monorepo (pnpm workspaces): `apps/api`, `apps/admin`, `packages/shared`
- Express setup: error handler, logger (pino), CORS, helmet, rate limit, Zod validate middleware
- Mongoose connect + `User`, `Role`, `Settings` models
- Auth: login, logout, refresh, forgot/reset password — httpOnly + Secure +
  SameSite=Lax cookies, refresh rotation, aur double-submit CSRF token middleware
- RBAC middleware `requirePermission()`
- Seed script: pehla admin user + default roles + default settings
- Admin shell: React + Vite (JSX) + Tailwind + shadcn/ui, sidebar layout,
  protected routes, API client (axios + auto refresh on 401)
- Docker compose: mongo + api + admin

**Done kab:** admin login karke khaali dashboard dekh sakta hai; `viewer` role
wala user restricted route pe 403 khaata hai.

**Sochne wali cheez:** permission strings ki list abhi likh lo (aage sirf add
karoge). Baad me RBAC retrofit karna sabse mehnga refactor hota hai.

---

## Phase 1 — Content Core (2 hafte)

**Banana kya hai**
- `entries` model + service (type/slug/status/publishAt/seo/fields/content)
- Slug auto-generate + uniqueness per type + manual override
- Draft / Published / Scheduled states, publish + unpublish + duplicate
- **Scheduled publish DB-based** — indexed `publishAt`, cron har minute atomic
  `findOneAndUpdate` claim; public query bhi `scheduled && publishAt<=now` ko
  published maane (self-healing). `setTimeout` kabhi nahi.
- Revisions: har publish pe snapshot, list + restore — **service layer me, Mongoose
  hook me nahi** (`findOneAndUpdate` hooks skip kar deta hai, bug chup jaata hai)
- Admin: Pages list, Posts list (search, filter, sort, server-side pagination)
- Entry editor screen: title, slug, TipTap rich text, excerpt, featured image
  placeholder, status sidebar, autosave draft (30s debounce)
- Taxonomies: categories + tags CRUD, posts pe assign

**Done kab:** admin 10 pages aur 10 posts bana, edit kar, publish/unpublish kar
sakta hai, aur purani revision restore kar sakta hai.

**Trap:** `content` field ko abhi se `{ blocks: [] }` shape me rakho — rich text
ko ek `richText` block ke andar store karo. Phase 5 me migration nahi likhni padegi.

---

## Phase 2 — Media Library (1 hafta)

**Banana kya hai**
- Upload API: multer + `sharp` -> variants (thumb 300, medium 800, large 1600, webp)
- Storage adapter interface: `local` (Phase 2) aur `s3` (baad me) — call site same
- Folders, rename, delete (usage check: kahin use to nahi ho raha)
- Admin: grid view, drag-drop upload, alt/caption edit, search
- Reusable `<MediaPicker />` modal — editor aur builder dono use karenge
- Featured image entry pe wire karna

**Done kab:** 50 images upload, folder me organize, alt set, aur editor se pick.

**Trap:** original file kabhi serve mat karo. URL hamesha variant ka. Alt text
ko Phase 4 ke SEO checklist se joda jaayega, isliye field abhi banao.

---

## Phase 3 — Public Site + Templates + Menus (2 hafte)

Ye phase sabse zyada "wow" deta hai — pehli baar site live dikhti hai.

**Banana kya hai**
- `packages/blocks`: registry + `<BlockRenderer />` + 4 starter blocks
  (richText, image, section, container). Abhi UI nahi, sirf renderer.
- Public API: `by-path`, list with pagination, menus, settings (cache headers)
- `apps/web` (Next.js): catch-all route, blog list + single, 404, loading states
- Templates: `templates` CRUD + header/footer regions; entry pe template select
- Theme: `themes/default` — design tokens (colors, fonts, spacing) settings se
  driven, taaki client apna brand color admin se badal sake
- Menus: nested drag-drop menu builder (dnd-kit) + public render
- On-demand revalidate: publish pe API -> Next.js revalidate webhook

**Done kab:** ek asli chhoti website (home + about + contact + blog) sirf admin
se ban jaaye, koi code change nahi.

---

## Phase 4 — SEO Module (1 hafta)

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

**Done kab:** naya page publish karte hi sitemap me aaye, share karne pe sahi OG
card dikhe, aur slug badalne pe purana URL 301 kare.

---

## Phase 5 — Page Builder MVP (3-4 hafte)

**Yahi project ka sabse bada risk hai — scope tight rakho.**

### 5a — Engine (1 hafta)
- Editor store: zustand + immer, tree ops (add/move/delete/duplicate/select)
- Undo/redo history stack (patches based, 50 steps)
- Canvas iframe + postMessage bridge, hover/selection outlines
- Drop zones + drag from library aur canvas ke andar (dnd-kit)

### 5b — Blocks v1 (1 hafta) — sirf ye 10, aur kuch nahi
`section` · `container` · `columns (2/3/4)` · `heading` · `text` · `image` ·
`button` · `spacer` · `video` · `form-placeholder`

### 5c — Properties panel (1 hafta)
- Schema-driven field renderer: text, textarea, number, select, toggle, color,
  slider, image (MediaPicker), link, align, spacing
- Responsive tabs desktop/tablet/mobile + inherit indicator
- Style controls: padding, margin, background (color/image/gradient), border
  radius, shadow, max-width, visibility per breakpoint

### 5d — Polish (0.5-1 hafta)
- Layers panel, keyboard shortcuts (Ctrl+Z/C/V/D, Delete)
- Save draft / publish, "unsaved changes" guard
- Preview mode + device preview
- Section templates: 6-8 ready-made sections (hero, features, CTA, testimonial,
  pricing, contact) jo ek click me insert ho

**Done kab:** non-technical banda 20 minute me ek landing page bana le, save
kare, aur live site pe bilkul wahi dikhe.

**Explicitly OUT of scope (Phase 5 me nahi):** animations, custom CSS box,
z-index/absolute positioning, multi-user live collab, nested global blocks.
Ye sab Phase 6+ ya baad ke versions me.

---

## Phase 6 — Content-Type Builder + Global Blocks (2 hafte)

Isi phase me project "ek website" se "framework" ban jaata hai.

**Banana kya hai**
- `contentTypes` CRUD admin UI: naya type banao (label, icon, URL pattern,
  builder on/off), custom fields define karo
- Field types: text, textarea, richText, number, boolean, date, select,
  media, relation (dusre entry se), repeater
- Dynamic admin: naya type banate hi sidebar me menu, list screen, editor
  screen auto generate ho
- Global/reusable blocks: save as global, sync across pages
- Template assignment rules per content type (archive + single)
- Dynamic blocks: "Post List" block jo query se content pull kare
  (type, category, limit, sort, layout)

**Done kab:** developer ke bina admin "Services" type bana ke 5 services daale,
aur home page pe "Services List" block se wo dikha de.

---

## Phase 7 — Forms, Users & Polish (1-2 hafte)

- Form builder (fields, validation, email notify, success message) + submissions
  inbox + CSV export + honeypot/rate limit spam guard
- User management UI: invite, role assign, deactivate
- Activity log (kisne kya badla, kab)
- Settings screens: general, branding, social, scripts, integrations
- Dashboard widgets: recent edits, draft count, form submissions, quick actions
- Onboarding: setup wizard (site name, logo, colors, starter pages import)
- Search across admin (Cmd+K)
- Empty states, error states, toasts, loading skeletons — non-technical user ke
  liye yahi actual UX hai

---

## Phase 8 — Hardening & Deploy (1 hafta)

- Security: rate limiting, XSS sanitize on rich text output, file type/size
  validation, CSRF for cookie auth, Mongo injection guard, secrets audit
- Performance: API response caching (Redis ya in-memory LRU), DB index review,
  N+1 query check, image lazy loading, bundle split
- Backup: mongodump cron + media backup + restore script test
- Monitoring: Sentry (api + web), health endpoint, uptime check
- CI/CD: lint + test + build, staging + prod env
- Docs: block banane ki guide, theme banane ki guide, deployment runbook,
  admin user manual (screenshots ke saath — non-technical user ke liye zaroori)
- Seed/starter kit: `npx create-cms-site` type script, taaki naya client 1 din
  me spin up ho

---

## Testing strategy (parallel me chalta rahe)
- **Unit (Vitest):** services — slug logic, permission checks, SEO fallback,
  block tree operations. Yahi sabse zyada value deta hai.
- **Integration (supertest + mongodb-memory-server):** har API module ka
  happy path + auth failure.
- **E2E (Playwright):** 5 critical flows — login, page create+publish,
  media upload, builder drag+save, public page render.
- Page builder ke tree operations pe test likhna optional nahi hai — wahin
  sabse zyada silent bugs aate hain.

---

## Tech stack (final picks)

| Kaam | Choice | Kyun |
|---|---|---|
| API | Express + Mongoose | Team familiar, ecosystem bada. Versions implementation ke waqt current stable |
| Validation | Zod (shared package) | Ek schema, admin + API dono |
| Admin UI | React + Vite + Tailwind + shadcn/ui | Fast dev, accessible components free |
| Server state | TanStack Query | Cache, refetch, optimistic updates |
| Editor state | Zustand + Immer | Undo/redo ke liye patches easy |
| Drag & drop | dnd-kit | Accessible, nested support, actively maintained |
| Rich text | TipTap | JSON output (HTML nahi), extensible |
| Images | sharp | Variants + webp |
| Public site | Next.js App Router | SSR/ISR, SEO, image optimization built-in |
| Auth | jsonwebtoken + httpOnly cookies + CSRF token | XSS-safe; Secure + SameSite=Lax + double-submit CSRF |
| Cache | in-memory LRU -> Redis | Chhote se shuru |
| Jobs | DB-based cron -> BullMQ (Phase 7+) | setTimeout restart pe schedule kho deta hai |

---

## Pehla kadam (agla hafta)

1. Repo + monorepo skeleton + docker-compose (mongo chalu)
2. `entries` aur `blocks` ka JSON contract likh ke freeze karo — poora system
   isi pe khada hai, baad me badalna mehnga hai
3. Phase 0 pura karo: auth + RBAC + admin shell
4. Ek asli client site ka homepage design lo aur puchho: "isko blocks me todein
   to kaunse 10 block chahiye?" — wahi Phase 5 ka block list ban jaayega

**Sabse badi salah:** Phase 5 (builder) ko phase 3-4 se pehle mat chhedna.
Bina public renderer + templates ke builder banaoge to preview aur live output
kabhi match nahi karenge, aur wo bug baad me poora rewrite maangta hai.
