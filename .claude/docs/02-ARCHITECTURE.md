# 02 — Architecture

System ka technical reference. "Aisa kyun hai" ke jawab
[`03-DECISIONS.md`](03-DECISIONS.md) me hain.

---

## 1. System shape

```
                 +--------------------------+
                 |   Admin Panel (React)    |   Vite SPA, /admin
                 |  editor + page builder   |
                 +------------+-------------+
                              | REST /api/admin/*  (JWT httpOnly cookie)
                              v
+--------------+   +--------------------------+   +--------------+
|  MongoDB     |<--|    API (Express + Node)  |-->|  Media store |
|  (Mongoose)  |   |  content | auth | media  |   | S3/R2 + CDN  |
+--------------+   +------------+-------------+   +--------------+
                              | REST /api/public/* (read-only)
                              v
                 +--------------------------+
                 |  Public Site (Next.js)   |   SSR/ISR = SEO
                 |  block renderer + theme  |
                 +--------------------------+
```

| Package           | Tech                  | Kaam                                                                   |
| ----------------- | --------------------- | ---------------------------------------------------------------------- |
| `apps/api`        | Express + Mongoose    | Saara business logic, auth, uploads — single source of truth           |
| `apps/admin`      | React 18 + Vite (JSX) | Admin UI, page builder, preview                                        |
| `apps/web`        | Next.js App Router    | Public website, SSR + ISR, SEO tags, sitemap                           |
| `packages/blocks` | React (JSX)           | Block registry, renderer, `styleToCss()` — **admin aur web dono**      |
| `packages/shared` | Zod                   | Validation schemas, constants, JSDoc typedefs — **admin aur api dono** |

**Deployment:** teen apps alag develop hote hain par **deploy ek hi unit ki tarah** —
ek container image / ek process group per client, ek version number ke saath. 15 client
ka matlab 15 instance, 45 alag deployment nahi.

**Database:** ek shared Mongo cluster, **per client alag database**. Logical isolation
poora, par 15 replica set chalane ki zaroorat nahi.

**Topology:** same-origin — admin `example.com/admin`, API `example.com/api`, dono ek
reverse proxy ke peeche. Dev me Vite proxy se wahi setup milta hai.

---

## 2. Folder structure

```
cms/                                    ← CORE REPO (ek, private)
├─ apps/
│  ├─ api/src/
│  │  ├─ modules/                       auth, entries, media, menus, seo, settings…
│  │  │   └─ entries/ { model.js, service.js, controller.js, routes.js, validation.js }
│  │  ├─ core/                          db, errors, logger, cache, events, migrations
│  │  ├─ middleware/                    auth, rbac, validate, upload, rateLimit, sanitize
│  │  └─ index.js
│  ├─ admin/src/
│  │  ├─ styles/                        tokens · base · layout · primitives (§11)
│  │  ├─ builder/                       canvas, layers, props-panel, toolbar, dnd, history
│  │  ├─ modules/                       entries, media, appearance, seo, settings, users, tools
│  │  ├─ components/admin/              AdminBar.jsx + AdminBar.css, Sidebar…
│  │  └─ lib/api.js                     single-flight refresh mutex yahin
│  └─ web/
│     ├─ app/[[...slug]]/page.jsx       ← routing ka EKMATRA entry point
│     ├─ app/sitemap.js | robots.js | feed.xml
│     └─ theme/                         client repo se inject hota hai
├─ packages/
│  ├─ blocks/                           registry + Render + styleToCss + override hook
│  └─ shared/                           zod schemas, constants, JSDoc typedefs
├─ migrations/
└─ docker-compose.yml
```

> `themes/<client>/` core repo me **nahi** hai. Client ka theme client ke repo me rehta
> hai — [`06-OPERATIONS.md`](06-OPERATIONS.md) dekho. Core me sirf `theme/` ka contract hai.

---

## 3. Data model

Core principle: **"Sab kuch content hai."** Pages aur posts alag collection nahi —
ek `entries` collection, `type` field se alag. Custom types (Services, Portfolio)
isse lagbhag free milte hain.

`*` wale collections pe `siteId` field hota hai (default `DEFAULT_SITE_ID`). Aaj koi
query usse filter nahi karti — ye sirf future multi-site ke liye reserve hai (§3.2).

```
users            _id, name, email, passwordHash, role, status, avatarId, lastLoginAt
roles            _id, key(admin|editor|author|contributor), permissions[]
refreshTokens    userId, jti, familyId, expiresAt, usedAt, revokedAt, ua, ip
migrations       name, appliedAt, checksum

settings       * siteId, siteName, tagline, logo, favicon, timezone, dateFormat,
                 homepageEntryId, postsPageEntryId, postsPerPage,
                 searchEngineVisible, socialLinks, defaultSeo, titleTemplates,
                 privacyPolicyEntryId, scripts{head,bodyOpen,bodyClose}

contentTypes   * siteId, key(page|post|service…), label, labelPlural, icon,
                 fields[], hasBuilder, isBuiltIn, urlPattern, archiveBase,
                 hasArchive, supports[]

entries        * siteId, locale, type, title, slug, path, status, publishAt,
                 authorId, templateId, version, deletedAt,
                 content { version, blocks: [...] },     page builder tree
                 fields  { ...customFields },            contentType ke fields
                 seo     { ... },
                 taxonomies { categories[], tags[] },
                 searchText,                             denormalized, index ke liye
                 featuredImageId, order, parentId, updatedAt

revisions        entryId, snapshot, createdBy, createdAt, label, kind(save|publish)
media          * siteId, filename, mime, size, width, height, folderId, deletedAt,
                 variants[{ key, url, w, h }], alt, title, caption, uploadedBy
mediaRefs      * siteId, mediaId, entityType(entry|settings|menu), entityId, field
mediaFolders   * siteId, name, parentId
menus          * siteId, key, name, items[]
menuLocations  * siteId, location(header|footer|…), menuId
templates      * siteId, name, type(page|post|archive|single|404|search),
                 regions{header,footer}, layout, isDefault
patterns       * siteId, name, kind(pattern|synced), blocks[], category
taxonomies     * siteId, type(category|tag), name, slug, parentId, isDefault, seo
redirects      * siteId, from, to, statusCode(301|302), hits, isAuto
forms          * siteId, name, fields[], notifyEmails[], successMessage
submissions      formId, data, ip, createdAt, expiresAt
activityLog      userId, action, entityType, entityId, meta, createdAt
```

`users` / `roles` / `revisions` / `submissions` / `refreshTokens` / `activityLog` /
`migrations` pe `siteId` nahi — ye user ya parent entry se derive ho jaate hain.

### 3.1 Day 1 se reserve hone wale fields

Ye "insurance" hain — kaam baad me, par **field abhi**, kyunki live data pe baad me
daalna schema-wide change hai.

| Field        | Kyun day 1                                                              |
| ------------ | ----------------------------------------------------------------------- |
| `siteId`     | Multi-site kabhi karna pada to bade data pe index rebuild na karna pade |
| `path`       | Routing ka single source of truth — §4                                  |
| `deletedAt`  | Trash/soft-delete har list query aur har index ko chhoota hai           |
| `locale`     | Multi-language pe uniqueness `{siteId, locale, path}` ban jaati hai     |
| `version`    | Optimistic concurrency — autosave + 2 editors = silent lost update      |
| `searchText` | Mongo ek hi text index deta hai; block content isi se searchable banega |

### 3.2 Single-site by design, multi-site reserved

Ek deployment = ek client = ek website. Multiple websites ek admin se manage karna
scope me nahi hai.

**Multi-site ke liye tab jo banana padega (~2-3 hafte):** `sites` collection ·
admin site-switcher + current-site context · **har query me siteId scoping** (ek query
bhooli = cross-site data leak, ye security bug class hai) · per-site permissions ·
`Host` header se site resolve · cache keys me siteId · media shared vs per-site.

### 3.3 Indexes

Compound indexes me `siteId` **sabse pehle**.

```
entries:   { siteId: 1, locale: 1, path: 1 }               unique   ← routing
entries:   { siteId: 1, type: 1, slug: 1 }                 unique
entries:   { siteId: 1, type: 1, status: 1, publishAt: -1 }
entries:   { siteId: 1, deletedAt: 1, updatedAt: -1 }
entries:   { siteId: 1, parentId: 1, order: 1 }
entries:   { searchText: "text" }                          ← ek hi text index allowed
media:     { siteId: 1, folderId: 1, createdAt: -1 }
mediaRefs: { siteId: 1, mediaId: 1 }
redirects: { siteId: 1, from: 1 }                          unique
menus:     { siteId: 1, key: 1 }                           unique
revisions: { entryId: 1, createdAt: -1 }
refreshTokens: { jti: 1 } unique · { userId: 1 } · { expiresAt: 1 } TTL
submissions:   { expiresAt: 1 } TTL
```

> **Text index ka trap:** MongoDB ek collection pe sirf **ek** text index allow karta
> hai, aur `{title, seo.description}` block content cover nahi karta — matlab page ke
> body text pe search chup-chaap kuch nahi dhoondhta. Isliye save pe `searchText` me
> title + excerpt + blocks ka flattened text likho, index usi pe. Admin Cmd+K search
> aur list search dono isi pe chalenge.

---

## 4. URL & path model

**Problem:** `{siteId, type, slug}` unique hone ke baawajood ek `page` "about" aur ek
`service` "about" dono `/about` pe resolve kar sakte hain — unique index isko rok nahi
paata.

> **Rule:** har entry pe computed `path` field stored hai, `{siteId, locale, path}` > **unique** hai. Lookup ek single indexed equality query hai.

```
path likhne wala sirf EK function hai:  resolvePath(entry, contentType)

  page   →  parentId chain se        /about, /about/team
  post   →  contentType.urlPattern   /blog/{slug}
  custom →  contentType.urlPattern   /services/{slug}
```

**Routing:** `apps/web` me sirf **ek catch-all** `[[...slug]]`, jo stored `path` se
resolve karta hai. `app/blog/[slug]` jaisa hardcoded route banana `urlPattern` ke
configurable hone ka matlab hi khatam kar deta hai.

| Rule            | Behaviour                                                                          |
| --------------- | ---------------------------------------------------------------------------------- |
| Reserved slugs  | `/admin` `/api` `/_next` `/media` `/uploads` kabhi claim nahi ho sakte             |
| Slug collision  | auto-suffix `-2`, `-3`                                                             |
| Slug change     | **automatic** 301, aur **descendants ka path cascade update** + har ek pe redirect |
| Canonical       | trailing-slash policy fix, lowercase enforce, baaki variants 301                   |
| Redirect safety | chain flatten + loop detection                                                     |
| Homepage        | `settings.homepageEntryId` — `/` isi se resolve                                    |
| Posts page      | `settings.postsPageEntryId` — archive kis URL pe hai                               |

**Archive routes (usi catch-all ke andar):**

```
/                        homepage (settings se)
/{postsPageSlug}         post archive
/{postsPageSlug}/page/2  pagination
/category/{slug}         taxonomy archive    (base editable)
/tag/{slug}              taxonomy archive    (base editable)
/{archiveBase}           custom type archive (contentType se)
/search?q=               search results
/feed                    RSS
```

Permalink options **jaan-boojh kar limited** hain — `?p=123`, numeric aur date-based
patterns nahi. Published content ke baad pattern badla to redirects automatic banenge.

---

## 5. Status lifecycle

```
draft ──> pending ──> published ──> (unpublish) ──> draft
             │            │
             │            └──> scheduled (publishAt future)
             │
private = published, par sirf logged-in user ko dikhta hai (client staging pages)
```

**Trash `status` nahi hai — wo `deletedAt` field hai** (D-25):

```
koi bhi status  +  deletedAt: null        →  normal
koi bhi status  +  deletedAt: <timestamp> →  Trash me hai

restore  →  deletedAt = null, status jaisa tha waisa wapas
purge    →  permanent delete (sirf `admin`, sirf Trash screen se)
```

`status` ko chhua nahi jaata, isliye published entry restore hone pe **published hi**
wapas aati hai. `status: 'trash'` karne pe ye info kho jaati.

> **Har query me `deletedAt: null` filter zaroori hai.** Ye service layer ka default
> hona chahiye, controller ka nahi — bhoolne pe trashed entries public site pe dikh
> jaayengi.

- **`pending` optional nahi hai** — `author`/`contributor` publish nahi kar sakte, to
  unke "kaam ho gaya, review karo" ka koi state hi nahi bachta.
- **`trash` optional nahi hai** — target user non-technical hai, delete galti se hoga.
  Delete hamesha trash me daale; permanent delete sirf Trash screen ke andar se.

**Scheduled publish DB-based hai, `setTimeout` se kabhi nahi:**
`status:'scheduled'` + indexed `publishAt`; cron har minute atomic `findOneAndUpdate`
se claim kare (multi-instance pe double-publish se bachne ko). Public read query khud
bhi `scheduled && publishAt <= now` ko published maane — cron band ho jaaye to bhi
site sahi rahe (**self-healing**).

---

## 6. Page builder

Page ka layout ek **JSON tree** hai, HTML string nahi.

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "b1",
      "type": "section",
      "props": { "background": { "type": "color", "value": "#0f172a" } },
      "style": { "desktop": { "paddingY": 80 }, "mobile": { "paddingY": 40 } },
      "children": [
        {
          "id": "b2",
          "type": "container",
          "props": { "maxWidth": 1200 },
          "children": [
            { "id": "b3", "type": "heading", "props": { "text": "Hello", "level": 1 } },
            { "id": "b4", "type": "button", "props": { "label": "Contact", "href": "/contact" } }
          ]
        }
      ]
    }
  ]
}
```

### 6.1 Block definition — framework ka extension point

```
{
  type: 'heading',
  label: 'Heading',
  category: 'Basic',
  allowedChildren: null,          // ya ['column']
  schema: [                       // isse properties panel AUTO ban jaata hai
    { key: 'text',  type: 'text',   label: 'Text', default: 'Heading' },
    { key: 'level', type: 'select', options: [1,2,3,4], default: 2 },
    { key: 'align', type: 'align',  responsive: true }
  ],
  defaults: { ... },
  toolbar: ['align','duplicate','delete'],
  Render: (props) => JSX          // ek hi component: admin canvas + public site
}
```

Naya block = **sirf ek file**. Properties panel, drag list, defaults — sab schema se
generate hote hain. Core code touch nahi hota.

### 6.2 `style` se CSS kaise banta hai

**Inline styles se media queries likhi hi nahi ja sakti** — isliye responsive model
inline style se implement ho hi nahi sakta.

> **Decision: server-generated scoped CSS.** Har block ke `id` se class banti hai
> (`.blk-b1`), render ke waqt ek `<style>` emit hota hai jisme asli media queries hain.

```css
.blk-b1 {
  padding-block: 80px;
}
@media (max-width: 1023px) {
  .blk-b1 {
    padding-block: 60px;
  }
}
@media (max-width: 767px) {
  .blk-b1 {
    padding-block: 40px;
  }
}
```

Ye function `packages/blocks` me hai (`styleToCss(block)`), taaki admin canvas aur
public site bilkul same CSS banayein. Value space constrained hai (spacing scale, token
colors) — free-form CSS nahi. CSP ke liye is `<style>` pe nonce lagega.

### 6.3 Preview == live kaise guarantee hoti hai

Sirf component share karna **kaafi nahi** — host alag hai. Admin canvas Vite iframe hai,
live page Next.js. `next/image` aur `next/link` canvas me chalenge hi nahi.

> **Rule:** blocks framework-agnostic rahenge; host apne primitives inject karega.
>
> ```jsx
> <BlockRenderer blocks={...} components={{ Link, Image }} />
> ```
>
> `apps/web` Next ke `Link`/`Image` deta hai (image optimization milti rahegi),
> admin canvas plain `<a>` / `<img>` deta hai. Block ka code ek hi rehta hai.

Escape hatch agar Phase 5 me divergence dikhe: canvas iframe ko asli Next app pe
draft-mode me point kar do — tab preview _hai hi_ live.

### 6.4 Theming API — client customization ka contract

Sirf design tokens kaafi nahi hote. Blocks ko ek documented styling surface deni hogi:

1. Har block stable class names + `data-block-type` attribute emit kare
2. Block apni CSS variables expose kare (`--blk-heading-color`)
3. Registry me **override hook** — theme kisi block ka `Render` replace kar sake:
   `registry.override('heading', MyHeading)`

Iske bina har client "thoda alag hero" maangega, core block file badalni padegi, aur
framework 3 client baad forks ka dher ban jaayega.

### 6.5 Builder UI layout

Detail [`04-ADMIN-UX.md`](04-ADMIN-UX.md) me. Sankshep me:

1. **Left** — block library (categories + search) + layers/tree view
2. **Center** — canvas, **sandboxed iframe** me
3. **Right** — **do tabs: `Document` aur `Block`**
4. **Floating block toolbar** — selection pe align/link/duplicate/delete/move
5. **Top** — undo/redo, breakpoint switch, preview, save/publish

### 6.6 Responsive model

Har block pe `style.desktop | tablet | mobile`. Mobile khaali ho to desktop se inherit.
Sirf ye control: spacing, alignment, visibility, columns, font size. Free-form CSS mat
do — non-technical user usse site tod dega.

### 6.7 Do editors, ek content field

`hasBuilder` per content type decide karta hai kaunsa editor khulega:

- `hasBuilder: false` (Posts) → rich text editor; content ek single `richText` block
- `hasBuilder: true` (Pages) → full block builder

Dono **ek hi** `content.blocks` shape likhte hain, isliye type ko builder pe switch
karna non-destructive hai.

### 6.8 Patterns aur Synced Patterns

- **Pattern** — ready-made section (hero, features, CTA). Insert hote hi **copy** ban
  jaata hai; baad ka edit sirf usi page pe.
- **Synced Pattern** — ek jagah save, har use pe **reference**. Ek jagah badlo, poori
  site update.

---

## 7. Rendering, cache & SEO

```
User /about kholta hai
  → Next.js catch-all [[...slug]]
  → GET /api/public/resolve?path=/about        (indexed path lookup)
  → entry.templateId se template → header/footer regions
  → <BlockRenderer blocks={...} components={{Link,Image}} /> + scoped CSS
  → generateMetadata(): title template, description, canonical, OG, JSON-LD
  → ISR + cache tags; publish pe API se on-demand revalidate
```

### 7.1 Cache authority — ek hi, do nahi

> **Rule: Next.js ISR hi cache authority hai.** Public API pe koi TTL cache nahi
> (ya sirf explicitly-invalidated — time-based kabhi nahi).

Do cache layer aur ek invalidation signal = "publish kiya par site update nahi hui"
wala support ticket.

### 7.2 Invalidation ek graph hai, ek path nahi

`revalidatePath('/blog/x')` kaafi nahi. Ek post publish hone pe stale hote hain:

```
post ka page · post archive + uske saare pagination pages ·
har category/tag archive jisme wo hai · har page jisme "Post List" block hai ·
menu (agar link hua) · sitemap.xml · RSS feed
```

Isliye **tag-based invalidation**: har fetch pe tags (`entry:{id}`, `type:post`,
`tax:{id}`, `menu:{location}`, `settings`), aur publish service ek explicit dependency
map se `revalidateTag()` maare. Ye map Phase 3 me design hoga, Phase 8 me retrofit nahi.

Revalidate webhook **shared secret se protected** — warna wo ek public cache-purge
endpoint hai.

### 7.3 SEO

- Per-entry meta + **title templates** (`%title% | %sitename%`) per content type
- Fallback chain: entry SEO → `settings.titleTemplates[type]` → `settings.defaultSeo`
  → entry title/excerpt
- OG/Twitter cards, canonical, robots directives
- Auto `sitemap.xml`, `robots.txt`, **RSS feed**
- JSON-LD: Organization, WebSite, Article/WebPage, **BreadcrumbList**
- **Breadcrumbs** `parentId` se
- Redirect manager (301/302 + hit counter)
- Editor me SEO checklist score, publish se pehle pre-publish panel me dikhta hai

**Global kill-switch:** `settings.searchEngineVisible = false` → poori site `noindex` +
`robots.txt` disallow, aur admin me permanent warning banner. Staging site ka Google me
index ho jaana agency ka sabse mehnga routine accident hai.

**SEO object (har entry pe embedded):**

```json
{
  "title": "",
  "description": "",
  "canonical": "",
  "noindex": false,
  "nofollow": false,
  "ogTitle": "",
  "ogDescription": "",
  "ogImageId": "",
  "twitterCard": "summary_large_image",
  "schemaType": "WebPage|Article|Product",
  "focusKeyword": ""
}
```

---

## 8. Auth & roles

### 8.1 Cookie + CSRF policy

```
access token   15 min   httpOnly · Secure (prod) · SameSite=Lax · Path=/ · __Host- prefix
refresh token  7 din    wahi flags + rotation on use + reuse detection
CSRF           double-submit token; har non-GET request pe verify
CORS           strict origin allowlist + credentials:true  (wildcard kabhi nahi)
```

localStorage me token kabhi nahi — CMS me user rich text aur embed HTML daalta hai,
XSS surface bada hai; cookie hi safe hai.

| Setup                       | Cookie                                                             | CSRF ka bharosa        |
| --------------------------- | ------------------------------------------------------------------ | ---------------------- |
| **Same-origin (chuna hua)** | `SameSite=Lax` kaam karta hai                                      | Token defence-in-depth |
| Cross-origin                | `SameSite=None; Secure` majboori — **SameSite ka protection zero** | Token akela sahara     |

**Teen zaroori saathi:**

1. **`refreshTokens` collection** — reuse detection stateless JWT se ho hi nahi sakti.
   `jti` + `familyId` server pe. Purana token dobara use hua = poori family revoke.
2. **Single-flight refresh mutex** admin API client me — ek screen 5 parallel request
   maarti hai, sab 401 aate hain, 5 refresh chal padte hain; rotation ke saath 4 "token
   chori" lagte hain aur user random logout ho jaata hai.
3. **State-changing GET kabhi nahi** — `SameSite=Lax` top-level GET navigation pe cookie
   bhejta hai; koi bhi state-changing GET usi gap se CSRF-able hai.

`__Host-` prefix ko `Secure` chahiye, matlab plain HTTP dev me set nahi hoga — cookie
name env-conditional rakho ya local HTTPS chalao.

### 8.2 CSP

Helmet enable karna kaafi nahi, **policy likhni padegi**. Nonce-based: block ka
generated `<style>` aur theme scripts nonce carry karenge.

> `settings.scripts` (GTM etc.) sirf **`admin` role** ko editable. Ye ek privilege
> boundary hai, settings field nahi. Editor `<script>` inject kar sake to wo admin ke
> browser me chalega — matlab role escalation.

Canvas iframe **`sandbox` attribute ke saath**. Untrusted block content ka admin session
ke saath same-origin execute hona poore system ka sabse bada target hai.

### 8.3 Roles

| Role          | Kya kar sakta hai                                                             |
| ------------- | ----------------------------------------------------------------------------- |
| `admin`       | Sab kuch — settings, scripts, users, **permanent delete**                     |
| `editor`      | Saara content publish, media, menus. Trash me daal sakta hai, mita nahi sakta |
| `author`      | Apna content **publish kar sakta hai**                                        |
| `contributor` | Apna content likhta hai, publish nahi — `pending` pe bhejta hai               |
| `salesAgent`  | Enquiries handle karta hai, content nahi (D-29). Permissions Phase 7b me      |

**Paanch** roles hain — `subscriber` nahi banega (D-26), `salesAgent` add hua (D-29).

Permissions string-based: `entry.create`, `entry.publish`, `entry.publish.own`,
`media.delete`, `settings.update`, `settings.scripts.update`. Role → permissions[]
mapping **DB me** (`roles` collection) — `packages/shared` ka `ROLE_PERMISSIONS` sirf
seed ka default hai. Har admin route pe `requirePermission('...')`.

**Users pe `deletedAt` nahi hai.** D-25 (trash) content ke liye hai; user delete karne
se uska content aur activity log orphan ho jaate, isliye user `inactive` hota hai —
hataya nahi jaata. Deactivate hote hi uske chalu sessions bhi revoke ho jaate hain.

### 8.4 Kya ban chuka hai (Phase 0)

```
apps/api/src/core/tokens.js          JWT sign/verify + cookie flags + safeEqual
apps/api/src/middleware/auth.js      attachUser · requireAuth · requirePermission
apps/api/src/middleware/csrf.js      double-submit check
apps/api/src/modules/auth/           RefreshToken model · login/refresh/logout/password
apps/api/src/modules/users/          User model · GET|PATCH /api/me
apps/api/src/modules/roles/          Role model · permissions cache · seed defaults
migrations/002-auth-indexes.js       users · roles · refreshTokens (TTL ke saath)
```

`attachUser` **har request pe user DB se laata hai** (role cached hai, user nahi).
Ek query ki keemat pe ye guarantee milti hai ki deactivate kiya gaya user agli hi
request pe bahar ho jaaye — 15 minute baad nahi jab access token expire ho.

Har user ke liye **apni profile screen** (naam, email, password, avatar) — ye "dusron ko
manage karna" se alag cheez hai.

---

## 9. API surface

```
POST   /api/auth/login | logout | refresh | forgot | reset
GET/PATCH /api/me                        apni profile + password change

GET    /api/admin/entries?type=page&status=&q=&page=&trashed=
POST   /api/admin/entries
GET    /api/admin/entries/:id
PATCH  /api/admin/entries/:id            version bhejo → mismatch pe 409
POST   /api/admin/entries/:id/publish | unpublish | duplicate | submit-review
POST   /api/admin/entries/:id/trash | restore
DELETE /api/admin/entries/:id            permanent, sirf Trash ke andar se
POST   /api/admin/entries/bulk           { ids[], action }
GET    /api/admin/entries/:id/revisions
GET    /api/admin/entries/:id/revisions/:rid/diff
POST   /api/admin/entries/:id/revisions/:rid/restore
GET    /api/admin/entries/:id/autosave   crash recovery

POST   /api/admin/media (multipart)   GET /api/admin/media
POST   /api/admin/media/:id/trash | restore
POST   /api/admin/media/:id/edit         crop / rotate / scale
POST   /api/admin/media/:id/replace      file swap, URL + refs same
GET    /api/admin/media/:id/usage        mediaRefs se

CRUD   /api/admin/menus   ·   GET/PUT /api/admin/menu-locations
GET/PUT /api/admin/settings
CRUD   /api/admin/templates | patterns | content-types | taxonomies | redirects | users
GET    /api/admin/search?q=              Cmd+K, searchText pe
GET    /api/admin/activity
POST   /api/admin/tools/export | import

GET    /api/public/resolve?path=/about   entry | taxonomy | archive | redirect | 404
GET    /api/public/entries?type=post&page=1&limit=10&category=news
GET    /api/public/search?q=
GET    /api/public/menus/:location
GET    /api/public/settings
GET    /api/public/sitemap  ·  /api/public/feed
```

Admin aur public routes alag: public read-only, admin authed.

> `by-path` ki jagah `resolve` isliye ki ek hi endpoint entry, taxonomy archive, custom
> archive, redirect aur 404 — sabka jawab de. Next ka catch-all ek hi call me decide
> kar le ki render kya karna hai.

---

## 11. CSS structure

Poore project me **plain CSS** — Tailwind, CSS Modules aur CSS-in-JS teenon reject
hue hain (D-28). Teen alag CSS "duniya" hain, kyunki teenon ki constraint alag hai.

### 11.1 Admin (`apps/admin`)

```
src/
├─ index.css                  ← entry: sirf SHARED layer import karta hai
├─ styles/
│  ├─ tokens.css              23 CSS variables — design se copy
│  ├─ base.css                reset, body, a, h1-h4, input defaults
│  ├─ layout.css              .main, .page-head, .subtitle
│  └─ primitives.css          .btn .card .table .badge .form-* — reuse hone wale
├─ components/admin/
│  ├─ AdminBar.jsx  +  AdminBar.css     (.adminbar, .ab-*)
│  └─ Sidebar.jsx   +  Sidebar.css      (.sidebar, .menu-*, .submenu)
└─ modules/
   └─ <feature>/Feature.jsx  +  Feature.css
```

**Rule:** shared cheez `styles/` me, component ki apni cheez uske saath.
Component apni CSS **khud import** karta hai — `index.css` me nahi jaati.

Ye split hum ne banaya nahi — **frozen design me pehle se hai**. Uske CSS comments
literally kehte hain `/* SIDEBAR (components/admin/Sidebar.jsx) */`. Section →
file mapping:

| Design section | Kahan gaya |
|---|---|
| DESIGN TOKENS (`:root`) | `styles/tokens.css` |
| reset + element defaults | `styles/base.css` |
| LAYOUT | `styles/layout.css` |
| BUTTONS · CARDS/PANELS · TABLES · BADGES/PILLS · FORMS | `styles/primitives.css` |
| ADMIN BAR | `components/admin/AdminBar.css` |
| SIDEBAR | `components/admin/Sidebar.css` |
| DASHBOARD | `modules/dashboard/Dashboard.css` *(jab bane)* |
| MEDIA | `modules/media/Media.css` *(jab bane)* |
| ITINERARY BUILDER | client repo — travel-specific *(§11 of 11-REFERENCE-ADMIN)* |

### 11.2 Blocks (`packages/blocks`)

Blocks **admin canvas aur public site dono** me chalte hain, isliye admin ki CSS
import nahi kar sakte.

```
packages/blocks/src/
├─ styles/
│  ├─ tokens.css       spacing scale, breakpoints
│  └─ base.css         .blk-* resets
└─ blocks/heading/
   ├─ index.js         definition + Render
   └─ heading.css      .blk-heading ke base styles
```

Iske **upar** runtime CSS aati hai — `styleToCss()` se per-page generate hoti hai
aur `<style nonce>` me inject hoti hai (D-08). Wo file me nahi rehti.

> `blk-` prefix **mandatory** hai. Theming API (§6.4) isi pe khadi hai — client theme
> tabhi override kar sakta hai jab class names stable aur predictable hon.

### 11.3 Public site theme (client repo)

```
client-acme/theme/
├─ tokens.css              brand colours, fonts — DEFAULTS
├─ base.css
└─ components/Header.css, Footer.css
```

Yahan ek zaroori detail hai — **order**:

```html
<link href="/theme/tokens.css">          <!-- 1. defaults -->
<style nonce>:root{--brand:#0e7c7b}</style>  <!-- 2. settings se, RUNTIME -->
```

Settings wala **baad me** aana chahiye, warna admin se brand colour badalne pe kuch
nahi hoga.

### 11.4 Rules

| Rule | Kyun |
|---|---|
| Har component ka apna class prefix — `ab-`, `menu-`, `blk-` | Classes global hain; prefix hi collision rokta hai |
| Colours/spacing hamesha `var(--token)` se, hardcoded nahi | Client ka brand ek jagah se badle |
| Component delete → uski CSS bhi delete | Orphan CSS nahi bachegi |
| Naya shared style → `primitives.css`, component me nahi | `.btn` 10 jagah duplicate na ho |
| Frozen design ki value badalni ho → pehle poochho | Design spec hai (D-28, rule 8) |
