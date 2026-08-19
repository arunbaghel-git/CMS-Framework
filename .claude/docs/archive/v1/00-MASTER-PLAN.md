# MERN CMS Framework — Implementation Plan

## Context

`C:\Users\deepa\Desktop\CMS PLAN` abhi khaali directory hai — ye greenfield project hai.

**Goal:** ek reusable CMS framework jisse **non-technical user** admin panel se poori
website build aur manage kar sake — pages, posts, media, menus, SEO, templates aur
drag-and-drop page builder ke saath.

"Framework" ka matlab: har naye client ke liye code dobara nahi likhna. Naya block =
ek file, naya content type = admin se banega, client branding = theme tokens se.

Detailed design pehle se do documents me likha ja chuka hai (ye plan unka executable
version hai):
- `Desktop/CMS PLAN/01-ARCHITECTURE.md`
- `Desktop/CMS PLAN/02-BUILD-PLAN.md`

### Confirmed decisions
| Decision | Choice |
|---|---|
| Public site renderer | **Next.js** (App Router) — SSR/ISR, sitemap, metadata API se SEO handle |
| Language | **JavaScript** (ESM) everywhere — no TypeScript |
| Multi-site | **Single-site** behaviour, par `siteId` field + compound indexes day 1 se reserved |
| Versions | Plan me hardcode **nahi** — implementation ke waqt current stable/LTS. Lockfile + `.nvmrc`/`engines` me exact pin |
| Deployment topology | **Same-origin** — admin `/admin`, API `/api`, ek reverse proxy ke peeche |

### Char engineering rules (in par plan explicitly commit karta hai)
1. **Mongoose hooks me sirf pure data normalization** — slugify, trim, `updatedAt`,
   counts. Koi side effect, koi I/O nahi. Revision snapshot, cache invalidation,
   revalidate webhook, publish state machine, email — **sab service layer me**.
   *Kyun:* `updateOne` / `findOneAndUpdate` / `bulkWrite` `save` hooks chalate hi
   nahi — hook wala logic chup-chaap skip ho jaayega, bina error bina log.
2. **Scheduled publish DB-based, `setTimeout` kabhi nahi** — restart pe schedule kho
   jaata hai. `status:'scheduled'` + indexed `publishAt`; cron har minute atomic
   `findOneAndUpdate` se claim kare (multi-instance double-publish se bachne ko).
   Public read query bhi `scheduled && publishAt <= now` ko published maane — cron
   band ho jaaye to bhi site sahi rahe (**self-healing**). BullMQ Phase 7 me, par
   DB tab bhi source of truth rahega.
3. **Cookie + CSRF explicit:** httpOnly · Secure (prod) · SameSite=Lax · `__Host-`
   prefix · access 15min + refresh 7din with rotation & reuse detection ·
   **double-submit CSRF token har non-GET pe** · CORS strict allowlist + credentials
   (wildcard kabhi nahi). Same-origin isliye chuna kyunki cross-origin me
   `SameSite=None` majboori ban jaati hai aur SameSite ka protection zero ho jaata hai.
4. **Versions plan me nahi, lockfile me.** "Latest lo" ka matlab `^` se float karna
   nahi — exact pin karo. Node `.nvmrc` + `engines` me, warna sharp/bcrypt jaise
   native modules mismatch pe toot-te hain.

### JavaScript choice — iska matlab kya hai
TS nahi hai, to jo safety compiler deta wo **runtime pe** leni padegi. Teen cheezein
non-negotiable ho jaati hain:
1. **Zod har boundary pe** — API input, block props, contentType fields. `packages/shared`
   me schemas ek jagah, admin aur api dono wahi import karein.
2. **`jsconfig.json` with `checkJs: true` + JSDoc typedefs** core shapes pe (`Entry`,
   `Block`, `BlockDefinition`). Build step nahi, sirf editor autocomplete + red squiggles.
3. **Block tree operations pe unit tests** (add/move/delete/duplicate/undo). TS ke bina
   yahi wo jagah hai jahan silent bugs sabse zyada aate hain — ye tests optional nahi hain.

---

## Architecture

```
apps/api      Express + Mongoose (JS/ESM)  — saara business logic, single source of truth
apps/admin    React + Vite (JSX)           — admin UI + page builder
apps/web      Next.js App Router (JS)      — public site (SSR/ISR)
packages/blocks   block registry + <BlockRenderer />   ← admin aur web DONO isi ko import karte hain
packages/shared   Zod schemas + constants + JSDoc typedefs  ← admin aur api DONO same validation
```

### Char core principles (inhe todna mat)

1. **"Sab kuch content hai."** Pages/posts alag collection nahi — ek `entries`
   collection with `type` field. Custom types (Services, Portfolio) isse free milte hain.
2. **Layout = JSON tree, HTML kabhi nahi.** `{ id, type, props, style: {desktop,tablet,mobile}, children[] }`.
   HTML string save kiya to edit/theme-change/responsive sab mar jaata hai.
3. **Block definition me `schema` array** hota hai — properties panel usi se *auto*
   generate hota hai. Naya block add karne pe core code touch nahi hona chahiye.
4. **Renderer shared + canvas iframe me.** Warna "preview me kuch, live pe kuch aur"
   wala bug permanent ho jaata hai.

### Data model (MongoDB)
```
users · roles · settings
contentTypes   key, label, fields[], hasBuilder, urlPattern
entries        siteId, type, title, slug, status, publishAt, templateId,
               content{blocks[]}, fields{}, seo{}, taxonomies{}, parentId
revisions      entryId, snapshot, createdBy
media          filename, mime, variants[{key,url,w,h}], alt, folderId
mediaFolders · menus · templates · taxonomies · redirects · forms · submissions
```
Indexes day 1 se (siteId reserved):
```
entries:   { siteId:1, type:1, slug:1 } unique
entries:   { siteId:1, type:1, status:1, publishAt:-1 }
entries:   { title:"text", "seo.description":"text" }
redirects: { siteId:1, from:1 } unique
```

### Single-site vs multi-site — sthiti saaf
Ye architecture **single-site** hai: ek deploy = ek website. Naya client = naya
instance (apna DB, apna domain). Framework ke liye ye multi-tenancy se behtar hai —
data isolation automatic, ek client ka traffic doosre ko affect nahi karta, aur
client-specific block/theme baaki clients pe asar nahi daalta.

`siteId` sirf **insurance** ke taur pe reserve hai — taaki kabhi multi-site karna pade
to bade data pe index rebuild na karna pade. Reserve **in sab content-scoped
collections pe** hona chahiye (aadha-adhoora reserve bekaar hai):
```
entries · redirects · menus · templates · taxonomies · media · mediaFolders
· contentTypes · forms · settings
```
`users`, `roles`, `revisions`, `submissions` pe nahi — ye entry/user se derive ho jaate hain.

**Jo abhi NAHI banega** (multi-site tab ~2-3 hafte ka kaam hai, aur risk yahi hai):
`sites` collection · admin site-switcher + current-site context · **har query me
siteId scoping** (ek query bhooli = cross-site data leak) · per-site permissions ·
`Host` header se site resolve · cache keys me siteId · media shared vs per-site decision.

Multi-tenancy tabhi lena jab ise **SaaS** banana ho (client khud signup kare).
Agency/framework use-case me multi-instance hi sahi hai.

---

## Phases

Har phase ek shippable milestone hai. Estimates 1 full-time dev ke liye.

### Build order — UI kab banta hai (confusion se bachne ke liye)
Is project me **do alag UI** hain, inhe mix mat karo:

| UI | Kab | Kya |
|---|---|---|
| **Admin panel UI** | Phase 0 | Login screen + sidebar shell — sabse pehla UI yahi banta hai |
| Admin ke andar ke screens | Phase 1-2 | Entry editor, media grid |
| **Website ka header + footer** | **Phase 3** | `themes/default` + template regions |
| Page builder UI | Phase 5 | Canvas, block library, properties panel |

**Header/footer Phase 3 me isliye hai** ki wo teen cheezein API se leta hai —
logo + brand colors (`settings`, Phase 0), menu items (`menus`, Phase 3), footer
links + social (`menus` + `settings`). **Dummy/hardcoded data se nahi banega** —
Phase 3 me pehle ye APIs ready hongi, tabhi header/footer banega.

### Phase 3 ka internal order (header/footer pehle)
Phase 3 ke andar sequence ye rahegi, taaki website ka pehla UI header/footer hi bane:
1. `menus` model + CRUD API + admin drag-drop menu builder
2. Public API: `settings` + `menus` endpoints
3. `themes/default` design tokens (settings-driven CSS variables)
4. **Header + Footer components — asli API data se, day one se**
5. Templates CRUD + header/footer regions
6. `apps/web` catch-all route + BlockRenderer + blog

---

### Phase 0 — Foundation & Auth · 1 hafta
- pnpm monorepo (ESM), ESLint + Prettier, `jsconfig.json` (path aliases + `checkJs`),
  `docker-compose.yml` (mongo)
- Express core: error handler, pino logger, helmet, CORS, rate limit, Zod validate middleware
- Models: `User`, `Role`, `Settings` · seed script (pehla admin + default roles)
- Auth: login/logout/refresh/forgot/reset — **httpOnly + Secure + SameSite=Lax
  cookies**, access 15min + refresh 7din with rotation, **double-submit CSRF middleware**
- `requirePermission()` RBAC middleware; permission strings ki poori list abhi freeze karo
- Admin shell: Vite + Tailwind + shadcn/ui, sidebar layout, protected routes,
  axios client with auto-refresh on 401

**Done:** admin login karke dashboard dekhta hai; `viewer` role restricted route pe 403 khaata hai.

Files: `apps/api/src/{core,middleware,modules/auth}`, `apps/admin/src/{lib/api.js,modules/auth}`

---

### Phase 1 — Content Core · 2 hafte
- `entries` model + service + controller + routes; slug auto-gen + uniqueness per type
- Draft / Published / Scheduled; publish, unpublish, duplicate
- Scheduled publish: DB-based cron (atomic claim), NOT setTimeout — rule 2 dekho
- `revisions`: har publish pe snapshot, list + restore — **service layer me, hook me nahi**
- Admin: Pages list, Posts list (search/filter/sort, **server-side pagination**)
- Entry editor: title, slug, TipTap rich text, excerpt, status sidebar, autosave (30s debounce)
- Taxonomies (categories + tags) CRUD + posts pe assign

**Critical:** `content` ko abhi se `{ version: 1, blocks: [] }` shape me store karo —
rich text ko ek `richText` block ke andar rakho. Phase 5 me migration nahi likhni padegi.

Files: `apps/api/src/modules/entries/*`, `packages/shared/src/schemas/entry.js`

---

### Phase 2 — Media Library · 1 hafta
- Upload: multer + `sharp` → variants (thumb 300 / medium 800 / large 1600, webp)
- Storage adapter interface: `local` implementation ab, `s3` baad me — call site same rahega
- Folders, rename, delete with usage-check
- Admin grid: drag-drop upload, alt/caption edit, search
- **Reusable `<MediaPicker />` modal** — entry editor aur page builder dono isko use karenge

**Rule:** original file kabhi serve mat karo, URL hamesha variant ka.

---

### Phase 3 — Public Site + Templates + Menus · 2 hafte
*(Pehli baar site live dikhti hai)*
- `packages/blocks`: registry + `<BlockRenderer />` + 4 starter blocks
  (`richText`, `image`, `section`, `container`) — abhi builder UI nahi, sirf renderer
- Public API (read-only, cacheable): `by-path`, list+pagination, menus, settings
- `apps/web`: catch-all `[[...slug]]`, blog list + single, 404
- Templates CRUD + header/footer regions; entry pe template select
- `themes/default`: design tokens (colors, fonts, spacing) **settings-driven**, taaki
  client apna brand color admin se badle
- Menus: nested drag-drop builder (dnd-kit) + public render
- Publish → Next.js on-demand revalidate webhook

**Done:** ek asli chhoti site (home + about + contact + blog) sirf admin se ban jaaye.

---

### Phase 4 — SEO Module · 1 hafta
- Entry editor SEO tab: title, description, canonical, noindex/nofollow, OG image,
  schema type + Google preview snippet
- Fallback chain: entry SEO → `settings.defaultSeo` → title/excerpt
- Dynamic `sitemap.xml` (published only) + `robots.txt` + JSON-LD (Organization, WebSite, Article/WebPage)
- Redirect manager (301/302 + hit counter); slug change pe auto-suggest redirect
- SEO checklist score: title/meta length, H1 count, missing image alt, internal links
- GTM/analytics script fields (head/body injection) settings me

---

### Phase 5 — Page Builder MVP · 3-4 hafte
**Project ka sabse bada risk. Scope tight rakhna hai.**

- **5a Engine (1 hafta):** zustand + immer store, tree ops (add/move/delete/duplicate/select),
  patch-based undo/redo (50 steps), canvas **iframe** + postMessage bridge, dnd-kit drop zones.
  Tree ops ke saath-saath unit tests likho — JS me yahan type safety nahi hai.
- **5b Blocks v1 (1 hafta) — sirf ye 10:** `section` `container` `columns(2/3/4)`
  `heading` `text` `image` `button` `spacer` `video` `form`
- **5c Properties panel (1 hafta):** schema-driven field renderer (text, number, select,
  toggle, color, slider, image→MediaPicker, link, align, spacing) + responsive tabs
  desktop/tablet/mobile with inherit indicator
- **5d Polish (0.5-1 hafta):** layers panel, keyboard shortcuts, save/publish + unsaved
  guard, device preview, 6-8 ready-made section templates (hero, features, CTA,
  testimonial, pricing, contact)

**Explicitly OUT of scope:** animations, custom CSS box, absolute positioning/z-index,
live multi-user collab, nested global blocks.

**Done:** non-technical banda 20 min me landing page bana le, aur live site pe *bilkul* wahi dikhe.

---

### Phase 6 — Content-Type Builder + Global Blocks · 2 hafte
*(Yahan project "ek website" se "framework" banta hai)*
- `contentTypes` admin UI: naya type (label, icon, URL pattern, builder on/off) + custom fields
- Field types: text, textarea, richText, number, boolean, date, select, media,
  relation, repeater
- Dynamic admin: naya type banate hi sidebar menu + list screen + editor auto-generate
- Global/reusable blocks (save as global, sync across pages)
- Dynamic "Post List" block (query: type, category, limit, sort, layout)
- Template assignment rules per content type (archive + single)

**Done:** developer ke bina admin "Services" type bana ke 5 entries daale, aur homepage
pe "Services List" block se dikha de.

---

### Phase 7 — Forms, Users & Polish · 1-2 hafte
Form builder + submissions inbox + CSV export + honeypot/rate-limit · user management
(invite, role, deactivate) · activity log · settings screens · dashboard widgets ·
setup wizard (site name, logo, colors, starter pages) · Cmd+K search ·
empty/error/loading states (non-technical user ke liye yahi actual UX hai).

### Phase 8 — Hardening & Deploy · 1 hafta
Security (XSS sanitize on rich text, CSRF for cookie auth, file type/size validation,
Mongo injection guard) · caching (LRU → Redis) + index review · mongodump cron +
restore test · Sentry + health endpoint · CI/CD · docs (block guide, theme guide,
runbook, **screenshot-based admin manual**) · `create-cms-site` starter script.

---

## Timeline

| Milestone | Cumulative |
|---|---|
| Phase 0-2 (admin + content + media) | 4 hafte |
| **Phase 3-4 → usable CMS, client demo ready** | **7 hafte** |
| Phase 5 → page builder live | 11 hafte |
| Phase 6-8 → full framework, production | 14-16 hafte |

---

## Testing strategy (parallel me chalta rahe)
- **Vitest unit** — services: slug logic, permission checks, SEO fallback chain,
  **block tree operations** (JS me ye tests optional nahi — silent bugs sabse zyada wahin)
- **supertest + mongodb-memory-server** — har API module ka happy path + auth failure
- **Playwright E2E** — 5 flows: login · page create+publish · media upload ·
  builder drag+save · public page render

## Verification (har phase ke baad)
1. `docker compose up` → mongo + api + admin + web chalein
2. `pnpm seed` → admin user bane, `pnpm test` green
3. Manual smoke: login → page banao → block drop karo → publish → `apps/web` pe
   wahi page kholo aur **preview vs live pixel-match** verify karo
4. `curl /api/public/sitemap` me naya page aaye; `view-source` me meta + JSON-LD dikhe
5. Lighthouse SEO score ≥ 95 on a published page

---

## Sabse pehla kadam
1. Monorepo skeleton + docker-compose (mongo chalu)
2. **`entries` aur block JSON ka Zod contract `packages/shared` me likh ke freeze karo** —
   poora system isi pe khada hai, baad me badalna sabse mehnga refactor hai
3. Phase 0 complete: auth + RBAC + admin shell
4. Apne kisi asli client ka homepage design lo, blocks me todo — jo 10 block nikle
   wahi Phase 5 ki final list hai (guess karne se behtar)

## Biggest risk
**Phase 5 (builder) ko Phase 3-4 se pehle mat chhedna.** Bina public renderer +
templates ke builder banaoge to preview aur live output kabhi match nahi karenge,
aur wo bug baad me poora rewrite maangta hai.
