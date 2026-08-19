# MERN CMS Framework — Architecture (v2)

> **v2 me kya add hua:** distribution/versioning model, migrations, URL/path model,
> status lifecycle, cache invalidation authority, block→CSS strategy, theming API,
> admin IA. Ye sab architecture review ke findings se aaye hain.

## 1. Goal

Ek reusable CMS framework jisse non-technical user admin panel se poori website
banaye aur manage kare — pages, posts, media, menus, SEO, templates aur
drag-and-drop page builder ke saath.

Framework ka matlab: har naye client ke liye code dobara nahi likhna. Sirf
theme/blocks add karo, CMS core same rehta hai.

**Deployment model:** ek deployment = ek client = ek website (alag DB, alag domain,
alag admin login). Core code sab clients me **same** rehta hai aur versioned
packages se aata hai — section 8.

---

## 2. High-level shape

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

### Teen apps, do shared packages

| App               | Tech                  | Kaam                                                             |
| ----------------- | --------------------- | ---------------------------------------------------------------- |
| `apps/api`        | Express + Mongoose    | Saara business logic, auth, uploads — single source of truth     |
| `apps/admin`      | React 18 + Vite (JSX) | Admin UI, page builder, preview                                  |
| `apps/web`        | Next.js (App Router)  | Public website, SSR + ISR, SEO tags, sitemap                     |
| `packages/blocks` | React (JSX)           | **Block registry + renderer — dono apps yahi import karte hain** |
| `packages/shared` | Zod                   | Validation schemas, constants, JSDoc typedefs                    |

> **Sabse important decision:** block renderer ek hi jagah likho
> (`packages/blocks`). Admin canvas aur public site dono wahi component use
> karein. Warna "preview me kuch, live pe kuch aur" wala bug permanent ho jayega.

### Packaging: teen app, par ek deployable unit

Teen apps alag develop hote hain, par **deploy ek hi unit ki tarah hota hai** — ek
container image / ek process group per client, ek version number ke saath.
15 client ka matlab 15 instance hai, 45 alag deployment nahi.

**Mongo:** ek shared cluster, **per client alag database**. Logical isolation poora
rehta hai par 15 replica set chalane ki zaroorat nahi. Ops cost ka sabse bada saving
yahi hai, aur architecture pe koi asar nahi padta.

### Next.js kyun, jab MERN bola tha?

Next.js React hi hai. SEO ke liye server-rendered HTML chahiye — pure SPA me
crawler ko khaali div milta hai. Alternative Express + `react-dom/server` se manual
SSR hai; kaam karega, par sitemap, ISR, image optimization, cache invalidation sab
khud likhna padega — motay taur pe 3-4 hafte extra. **Recommendation: Next.js.**

---

## 3. Data model (MongoDB collections)

Core principle: **"Sab kuch content hai."** Pages aur posts alag collection nahi
hain — ek hi `entries` collection hai jiska `type` alag hai. Isi se aage
"Services", "Portfolio", "Team" jaise custom types lagbhag free me mil jaate hain.

> **Par UI me `entries` shabd kabhi mat dikhao.** Ye internal detail hai. Admin me
> "Pages", "Posts", "Services" alag-alag screens hongi. Isi tarah "Taxonomies" bhi
> internal hai — UI me sirf "Categories" aur "Tags". Section 10 dekho.

`siteId` — niche `*` wale sab collections pe ye field hoga, default ek constant
(`DEFAULT_SITE_ID`). Abhi koi ise filter nahi karta; sirf future multi-site ke liye
reserve hai (section 3b).

```
users            _id, name, email, passwordHash, role, status, avatarId, lastLoginAt
roles            _id, key(admin|editor|author|contributor|subscriber), permissions[]
refreshTokens    userId, jti, familyId, expiresAt, usedAt, revokedAt, ua, ip
migrations       name, appliedAt, checksum
settings       * siteId, siteName, tagline, logo, favicon, timezone, dateFormat,
                 homepageEntryId, postsPageEntryId, postsPerPage,
                 searchEngineVisible, socialLinks, defaultSeo, titleTemplates,
                 privacyPolicyEntryId, scripts{head,bodyOpen,bodyClose}
contentTypes   * siteId, key(page|post|service...), label, labelPlural, icon,
                 fields[], hasBuilder, isBuiltIn, urlPattern, archiveBase,
                 hasArchive, supports[]
entries        * siteId, locale, type, title, slug, path, status, publishAt,
                 authorId, templateId, version, deletedAt,
                 content { version, blocks: [...] },   // page builder tree
                 fields  { ...customFields },          // content-type ke fields
                 seo     { ... },
                 taxonomies { categories[], tags[] },
                 searchText,                           // denormalized, index ke liye
                 featuredImageId, order, parentId, updatedAt
revisions        entryId, snapshot, createdBy, createdAt, label, kind(save|publish)
media          * siteId, filename, mime, size, width, height, folderId, deletedAt,
                 variants[{ key, url, w, h }], alt, title, caption, uploadedBy
mediaRefs      * siteId, mediaId, entityType(entry|settings|menu), entityId, field
mediaFolders   * siteId, name, parentId
menus          * siteId, key, name, items[]            // nested tree
menuLocations  * siteId, location(header|footer|...), menuId
templates      * siteId, name, type(page|post|archive|single|404|search),
                 regions{header,footer}, layout(blocks tree), isDefault
patterns       * siteId, name, kind(pattern|synced), blocks[], category
taxonomies     * siteId, type(category|tag), name, slug, parentId, isDefault, seo
redirects      * siteId, from, to, statusCode(301|302), hits, isAuto
forms          * siteId, name, fields[], notifyEmails[], successMessage
submissions      formId, data, ip, createdAt, expiresAt
activityLog      userId, action, entityType, entityId, meta, createdAt
```

`users` / `roles` / `revisions` / `submissions` / `refreshTokens` / `activityLog` /
`migrations` pe `siteId` nahi — ye user ya parent entry se derive ho jaate hain.

### Day 1 se reserve karne wale fields (kaam baad me, field abhi)

Yahi wahi "insurance" logic hai jo `siteId` pe already lag chuka hai. Ye paanch bhi
usi category me hain — **baad me daalna live data pe schema-wide change hai:**

| Field        | Kyun day 1                                                               |
| ------------ | ------------------------------------------------------------------------ |
| `path`       | Routing ka single source of truth — section 3c                           |
| `deletedAt`  | Trash/soft-delete har list query aur har index ko chhoota hai            |
| `locale`     | Multi-language aane pe uniqueness `{siteId, locale, path}` ban jaati hai |
| `version`    | Optimistic concurrency — autosave + 2 editors = silent lost update       |
| `searchText` | Mongo me ek hi text index allowed hai; block content isi se searchable   |

### 3b. Single-site by design, multi-site reserved

Ye ek **agency framework** hai: ek deployment = ek client = ek website, apna DB,
apna domain, apna admin login. Multiple websites ek admin se manage karna scope me
nahi hai.

`siteId` sirf **insurance** hai — taaki kabhi multi-site karna pade to bade data pe
index rebuild na karna pade. Iske alawa aaj wo kuch nahi karta.

**Aaj:** `siteId` likha jaata hai, `DEFAULT_SITE_ID` se. Koi query usse filter nahi karti.

**Multi-site ke liye jo tab banana padega (~2-3 hafte, aaj scope me nahi):**
`sites` collection · admin site-switcher + current-site context · **har query me
siteId scoping** (ek query bhooli = cross-site data leak — ye security bug class hai,
feature nahi) · per-site permissions · `Host` header se site resolve · cache keys me
siteId · media shared vs per-site decision.

Multi-tenancy tabhi lena jab ise **SaaS** banana ho. Agency use-case me multi-instance
hi behtar hai — data isolation automatic, ek client ka traffic spike doosre ko affect
nahi karta, aur client-specific block/theme baaki clients pe asar nahi daalta.

### 3c. URL & path model (routing ka single source of truth)

**Problem:** `{siteId, type, slug}` unique hone ke baawajood ek `page` "about" aur ek
`service` "about" dono `/about` pe resolve kar sakte hain. Unique index isko rok nahi
paata, aur `by-path` query ko runtime pe url pattern reverse-engineer karna padta hai.

> **Rule:** har entry pe ek computed `path` field store hoga, aur
> `{ siteId, locale, path }` **unique** hoga. Path lookup ek single indexed equality
> query ban jaayegi.

```
path likhne wala sirf ek function hai:  resolvePath(entry, contentType)
  page   ->  parentId chain se        /about, /about/team
  post   ->  contentType.urlPattern   /blog/{slug}
  custom ->  contentType.urlPattern   /services/{slug}
```

**Routing `apps/web` me:** sirf **ek catch-all** `[[...slug]]` jo stored `path` se
resolve karta hai. `app/blog/[slug]` jaisa hardcoded route **mat banao** — wo
`urlPattern` ke configurable hone ka matlab hi khatam kar deta hai.

| Rule            | Behaviour                                                                          |
| --------------- | ---------------------------------------------------------------------------------- |
| Reserved slugs  | `/admin` `/api` `/_next` `/media` `/uploads` — kabhi claim nahi ho sakte           |
| Slug collision  | auto-suffix `-2`, `-3`                                                             |
| Slug change     | **automatic** 301, aur **descendants ka path cascade update** + har ek pe redirect |
| Canonical       | trailing-slash policy fix, lowercase enforce, baaki variants 301                   |
| Redirect safety | chain flatten + loop detection, warna infinite redirect                            |
| Homepage        | `settings.homepageEntryId` — `/` isi se resolve hota hai                           |
| Posts page      | `settings.postsPageEntryId` — post archive kis URL pe hai                          |

**Archive routes (usi catch-all ke andar):**

```
/                        homepage (settings se)
/{postsPageSlug}         post archive
/{postsPageSlug}/page/2  pagination
/category/{slug}         taxonomy archive   (base editable)
/tag/{slug}              taxonomy archive   (base editable)
/{archiveBase}           custom type archive (contentType se)
/search?q=               search results
/feed                    RSS
```

Permalink options **jaan-boojh kar limited** hain — `?p=123`, numeric aur date-based
patterns nahi denge. Non-technical user ke liye chhota, sane set hi behtar hai. Aur
published content ke baad pattern badla to redirects **automatic** banenge; chup-chaap
URL todna allowed nahi.

### 3d. Status lifecycle

```
draft ──> pending ──> published ──> (unpublish) ──> draft
  │          │            │
  │          │            └──> scheduled (publishAt future)
  └──────────┴──> trash ──> restore / purge after N days

private = published, par sirf logged-in user ko dikhta hai (client staging pages)
```

`pending` **optional nahi hai** — `author`/`contributor` publish nahi kar sakte, to
unke "kaam ho gaya, review karo" ka koi state hi nahi bachta. Editor ko "Pending
Review" filter + dashboard count chahiye.

`trash` bhi optional nahi — target user non-technical hai, delete galti se hoga.
Delete action hamesha trash me daale; permanent delete sirf Trash screen ke andar se.

### Menu item (nested)

```json
{
  "id": "m1",
  "label": "About",
  "linkType": "entry|url|taxonomy",
  "entryId": "...",
  "url": null,
  "target": "_self",
  "cssClass": "",
  "children": []
}
```

**Menus aur locations alag hain.** Pehle `key(main|footer)` hardcoded tha — client ko
doosra footer menu chahiye to code change karna padta, jo "no code per client" rule
hi tod deta hai. Ab: jitne chaho menus banao, aur theme jo `location` declare kare
(`header`, `footer`, `mobile`) uspe assign kar do.

### SEO object (har entry pe embedded)

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

Fallback chain: entry SEO → `settings.titleTemplates[type]` (jaise
`%title% | %sitename%`) → `settings.defaultSeo` → entry title/excerpt.

**Global kill-switch:** `settings.searchEngineVisible = false` hone pe poori site
`noindex` + `robots.txt` disallow. Staging site ka Google me index ho jaana agency ka
sabse common aur sabse mehnga accident hai — isliye ye toggle on hone pe admin me
permanent warning banner dikhega.

### Indexes (day 1 se, warna baad me dard)

Compound indexes me `siteId` **sabse pehle**.

```
entries:   { siteId: 1, locale: 1, path: 1 }               unique   <- routing
entries:   { siteId: 1, type: 1, slug: 1 }                 unique
entries:   { siteId: 1, type: 1, status: 1, publishAt: -1 }
entries:   { siteId: 1, deletedAt: 1, updatedAt: -1 }
entries:   { siteId: 1, parentId: 1, order: 1 }
entries:   { searchText: "text" }                          <- ek hi text index allowed
media:     { siteId: 1, folderId: 1, createdAt: -1 }
mediaRefs: { siteId: 1, mediaId: 1 }
redirects: { siteId: 1, from: 1 }                          unique
menus:     { siteId: 1, key: 1 }                           unique
revisions: { entryId: 1, createdAt: -1 }
refreshTokens: { jti: 1 } unique · { userId: 1 } · { expiresAt: 1 } TTL
submissions:   { expiresAt: 1 } TTL
```

> **Text index ka trap:** MongoDB ek collection pe sirf **ek** text index allow karta
> hai, aur `{title, seo.description}` block content ko cover hi nahi karta — matlab
> page ke body text pe search chup-chaap kuch nahi dhoondhta. Isliye save pe
> `searchText` me title + excerpt + blocks ka flattened text likho aur index usi pe
> rakho. Admin Cmd+K search aur list search dono isi pe chalenge.

---

## 4. Page builder ka core (sabse zaroori hissa)

Page ka layout ek **JSON tree** hai — HTML string nahi. HTML store karoge to dobara
edit karna, theme badalna, responsive control sab impossible ho jayega.

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

### 4a. `style` se CSS kaise banta hai (ye pehle decide karna zaroori tha)

**Inline styles se media queries likhi hi nahi ja sakti** — matlab
`style.{desktop,tablet,mobile}` wala model inline style se implement ho hi nahi sakta.
Decision:

> **Server-generated scoped CSS.** Har block ke `id` se class banti hai (`.blk-b1`),
> aur render ke waqt ek `<style>` emit hota hai jisme asli media queries hain. Value
> space constrained hai (spacing scale, token colors) — free-form CSS nahi.

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

Ye function **`packages/blocks` me hi rahega** (`styleToCss(block)`), taaki admin
canvas aur public site bilkul same CSS banayein. CSP ke liye is `<style>` pe nonce
lagega (section 6).

### 4b. Preview == live kaise guarantee hoti hai

Sirf component share karna **kaafi nahi hai** — host alag hai. Admin canvas Vite
iframe hai, live page Next.js. `next/image` aur `next/link` canvas me chalenge hi nahi,
aur agar blocks unhe import karein to canvas toot jaayega.

> **Rule:** blocks framework-agnostic rahenge; host apne primitives inject karega.
>
> ```jsx
> <BlockRenderer blocks={...} components={{ Link, Image }} />
> ```
>
> `apps/web` Next ke `Link`/`Image` deta hai (image optimization milti rahegi), admin
> canvas plain `<a>` / `<img>` deta hai. Block ka code ek hi rehta hai.

Agar Phase 5 me divergence phir bhi dikhe, escape hatch: canvas iframe ko asli Next
app pe draft-mode me point kar do — tab preview _hai hi_ live.

### Block definition (registry entry) — framework ka extension point

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
  toolbar: ['align','duplicate','delete'],   // floating toolbar ke actions
  Render: (props) => JSX          // ek hi component: admin canvas + public site
}
```

**Fayda:** naya block = sirf ek file. Properties panel, drag list, defaults — sab
schema se generate.

### 4c. Theming API (client customization ka contract)

Rule "client customization theme me" tabhi chalega jab blocks ke paas ek **documented
styling surface** ho. Sirf design tokens kaafi nahi hote.

1. Har block stable class names + `data-block-type` attribute emit kare
2. Block apni CSS variables expose kare (`--blk-heading-color`)
3. Registry me **override hook** — theme kisi block ka `Render` replace kar sake:
   `registry.override('heading', MyHeading)`

Iske bina har client "thoda alag hero" maangega, core block file badalni padegi, aur
framework 3 client baad forks ka dher ban jaayega.

### Builder UI ke hisse

1. **Left** — block library (categories + search) + layers/tree view
2. **Center** — canvas, **sandboxed iframe** me render
3. **Right — do tabs: `Document` aur `Block`**
   - `Document`: status, slug, publish date, template, featured image, categories, excerpt
   - `Block`: schema-driven properties + responsive tabs (desktop/tablet/mobile)
4. **Floating block toolbar** — selection pe align / link / duplicate / delete /
   move. High-frequency actions right panel me bhejoge to editing slow lagegi.
5. **Top** — undo/redo, breakpoint switch, preview, save/publish

> Pehle `Document` settings ka koi ghar hi nahi tha — builder mode me user slug ya
> category set hi nahi kar paata. Do-tab sidebar isi gap ko band karta hai.

Libraries: `dnd-kit` (drag-drop), `zustand` + `immer` (editor state + history),
`react-hook-form` + `zod` (forms), `TipTap` (rich text), `sharp` (image variants).

### Do editors, ek content field

`hasBuilder` per content type decide karta hai kaunsa editor khulega:

- `hasBuilder: false` (Posts) → rich text editor; content ek single `richText` block
- `hasBuilder: true` (Pages) → full block builder

Dono **ek hi** `content.blocks` shape likhte hain, isliye type ko builder pe switch
karna non-destructive hai.

### Responsive model

Har block pe `style.desktop | tablet | mobile`. Mobile khaali ho to desktop se
inherit. Sirf ye control do: spacing, alignment, visibility, columns, font size.
Free-form CSS mat do — non-technical user usse site tod dega.

### Patterns aur Synced Patterns

- **Pattern** — ready-made section (hero, features, CTA). Insert hote hi **copy** ban
  jaata hai; baad ka edit sirf usi page pe.
- **Synced Pattern** — ek jagah save, har use pe **reference**. Ek jagah badlo, poori
  site update. (Pehle iska naam "global blocks" tha.)

---

## 5. Rendering + SEO flow

```
User /about kholta hai
  -> Next.js catch-all route [[...slug]]
  -> GET /api/public/resolve?path=/about        (indexed path lookup)
  -> entry.templateId se template -> header/footer regions
  -> <BlockRenderer blocks={...} components={{Link,Image}} /> + scoped CSS
  -> generateMetadata(): title template, description, canonical, OG, JSON-LD
  -> ISR + cache tags; publish pe API se on-demand revalidate
```

### 5a. Cache authority — ek hi, do nahi

Pehle teen cache the: public API pe 60s LRU, Next ISR, aur revalidate webhook. Teen
cache aur ek signal = "publish kiya par site update nahi hui" wala ticket.

> **Rule: Next.js ISR hi cache authority hai.** Public API pe koi TTL cache nahi
> (ya sirf explicitly-invalidated cache — time-based kabhi nahi).

### 5b. Invalidation ek graph hai, ek path nahi

`revalidatePath('/blog/x')` kaafi nahi. Ek post publish hone pe stale hote hain:

```
post ka page · post archive + uske saare pagination pages ·
har category/tag archive jisme wo hai · har page jisme "Post List" block hai ·
menu (agar link hua) · sitemap.xml · RSS feed
```

Isliye **tag-based invalidation**: har fetch pe tags (`entry:{id}`, `type:post`,
`tax:{id}`, `menu:{location}`, `settings`), aur publish service ek explicit dependency
map se `revalidateTag()` maare. Ye map **Phase 3 me design hoga, Phase 8 me retrofit
nahi.**

Revalidate webhook **shared secret se protected** hai — warna wo ek public cache-purge
endpoint hai.

SEO module deta hai: per-entry meta, **title templates**, OG/Twitter cards, canonical,
robots directives, auto `sitemap.xml`, `robots.txt`, **RSS feed**, JSON-LD
(Organization, WebSite, Article/WebPage, **BreadcrumbList**), **breadcrumbs**
(parentId se), redirect manager, aur editor me SEO checklist score.

---

## 6. Auth & roles

### Deployment topology

**Same-origin** rakho: admin `example.com/admin`, API `example.com/api`, dono ek
reverse proxy ke peeche. Dev me Vite proxy se wahi setup mil jaata hai.

| Setup                                       | Cookie                                                             | CSRF ka bharosa        |
| ------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| **Same-origin (recommended)**               | `SameSite=Lax` kaam karta hai                                      | Token defence-in-depth |
| Cross-origin (`admin.x.com` ↔ `api.x.com`) | `SameSite=None; Secure` majboori — **SameSite ka protection zero** | Token hi akela sahara  |

### Cookie + CSRF policy (explicit)

```
access token   15 min   httpOnly · Secure (prod) · SameSite=Lax · Path=/ · __Host- prefix
refresh token  7 din    wahi flags + rotation on use + reuse detection
CSRF           double-submit token; har non-GET request pe verify
CORS           strict origin allowlist + credentials:true  (wildcard kabhi nahi)
```

localStorage me token kabhi mat rakho — CMS me user rich text aur embed HTML daalta
hai, matlab XSS surface bada hai; cookie hi safe hai.

**Teen cheezein jo iske saath zaroori hain:**

1. **`refreshTokens` collection.** Reuse detection stateless JWT se ho hi nahi sakti —
   `jti` + `familyId` server pe store karna hi padega. Purana token dobara use hua =
   poori family revoke.
2. **Single-flight refresh mutex** admin API client me. Ek screen 5 parallel request
   maarti hai, sab 401 aate hain, 5 refresh chal padte hain — rotation ke saath 4
   "token chori" lagte hain aur user random logout ho jaata hai. Ek hi refresh chale,
   baaki queue me wait karein.
3. **State-changing GET kabhi nahi.** `SameSite=Lax` top-level GET navigation pe cookie
   bhejta hai; koi bhi state-changing GET usi gap se CSRF-able hai.

`__Host-` prefix ko `Secure` chahiye, matlab plain HTTP dev me set hi nahi hoga —
cookie name env-conditional rakho ya local HTTPS chalao.

### CSP

Helmet enable karna kaafi nahi, **policy likhni padegi**. Nonce-based: block ka
generated `<style>` aur theme scripts nonce carry karenge. `settings.scripts` (GTM
etc.) is policy ka sabse bada dushman hai, isliye:

> `settings.scripts` sirf **`admin` role** ko editable. Ye ek privilege boundary hai,
> settings field nahi. Editor agar `<script>` inject kar sake, to wo admin ke browser
> me chalega — matlab role escalation.

Canvas iframe **`sandbox` attribute ke saath** chalega. Untrusted block content ka
admin session ke saath same-origin execute hona is poore system ka sabse bada target hai.

### Roles

| Role          | Kya kar sakta hai                                               |
| ------------- | --------------------------------------------------------------- |
| `admin`       | Sab kuch — settings, scripts, users                             |
| `editor`      | Saara content publish, media, menus                             |
| `author`      | Apna content **publish kar sakta hai**                          |
| `contributor` | Apna content likhta hai, publish nahi — `pending` pe bhejta hai |
| `subscriber`  | Read-only                                                       |

Permissions string-based: `entry.create`, `entry.publish`, `entry.publish.own`,
`media.delete`, `settings.update`, `settings.scripts.update`. Role → permissions[]
mapping DB me. Har admin route pe `requirePermission('...')`.

**Har user ke liye apni profile screen** (naam, email, password, avatar) — ye "user
management" (dusron ko manage karna) se alag cheez hai.

---

## 7. API surface (REST, versioned)

```
POST   /api/auth/login | logout | refresh | forgot | reset
GET/PATCH /api/me                       # apni profile + password change

GET    /api/admin/entries?type=page&status=&q=&page=&trashed=
POST   /api/admin/entries
GET    /api/admin/entries/:id
PATCH  /api/admin/entries/:id           # version bhejo -> mismatch pe 409
POST   /api/admin/entries/:id/publish | unpublish | duplicate | submit-review
POST   /api/admin/entries/:id/trash | restore
DELETE /api/admin/entries/:id           # permanent, sirf Trash ke andar se
POST   /api/admin/entries/bulk          # { ids[], action }
GET    /api/admin/entries/:id/revisions
GET    /api/admin/entries/:id/revisions/:rid/diff
POST   /api/admin/entries/:id/revisions/:rid/restore
GET    /api/admin/entries/:id/autosave  # crash recovery

POST   /api/admin/media (multipart)   GET /api/admin/media
POST   /api/admin/media/:id/trash | restore
POST   /api/admin/media/:id/edit        # crop / rotate / scale
POST   /api/admin/media/:id/replace     # file swap, URL + refs same
GET    /api/admin/media/:id/usage       # mediaRefs se

CRUD   /api/admin/menus   ·   GET/PUT /api/admin/menu-locations
GET/PUT /api/admin/settings
CRUD   /api/admin/templates | patterns | content-types | taxonomies | redirects | users
GET    /api/admin/search?q=              # Cmd+K, searchText pe
GET    /api/admin/activity
POST   /api/admin/tools/export | import

GET    /api/public/resolve?path=/about   # entry | taxonomy | archive | redirect | 404
GET    /api/public/entries?type=post&page=1&limit=10&category=news
GET    /api/public/search?q=
GET    /api/public/menus/:location
GET    /api/public/settings
GET    /api/public/sitemap  ·  /api/public/feed
```

Admin aur public routes alag rakho: public read-only, admin authed.

> `by-path` ki jagah `resolve` isliye ki ek hi endpoint entry, taxonomy archive,
> custom archive, redirect aur 404 — sabka jawab de. Next ka catch-all ek hi call me
> decide kar le ki render kya karna hai.

---

## 8. Distribution, versioning & migrations

> **Ye v1 ka sabse bada gap tha.** "Har client ka apna instance" likha tha, par ye
> kabhi define nahi hua ki core ka update 12 chalte hue instances tak pahunchta kaise
> hai. Aur `themes/<client>/` core repo ke andar rakhne ka matlab hai **fork per
> client** — 12 fork, aur har security fix 12 baar cherry-pick.

### Do repo, do kaam

**1. Core repo** (ek, private) — versioned packages publish karta hai:

```
@cms/api   @cms/admin   @cms/web   @cms/blocks   @cms/shared
```

Semver follow karega. Breaking change = major + migration.

**2. Client repo** (har client ka apna, patla):

```
client-acme/
├─ package.json          # @cms/* ki pinned versions
├─ .env                  # DB, domain, secrets
├─ theme/                # tokens, template components, CSS
├─ blocks/               # is client ke custom blocks
└─ migrations/           # sirf client-specific data fixes
```

Core upgrade = version bump + `pnpm cms migrate` + deploy. Aur ye ek query me pata
chalna chahiye: **kaunsa client kis core version pe hai.**

### Migrations — do alag system

| Kism            | Kab chalti hai                | Kaise                                                                                                   |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Schema/data** | Deploy step pe, boot se pehle | Numbered files, `migrations` collection me record, ordered, idempotent                                  |
| **Block tree**  | Read pe lazily + batch job    | Har page ka `content.version` alag ho sakta hai (page v1, site v4) — isliye per-document aur idempotent |

`contentTypes` se field delete hone pe kya ho — ye bhi define karo (orphan data rakho
ya purge karo), warna admin ek click me 400 entries ka data uda dega.

### Fleet-level ops (per-instance cron nahi)

15 instance ka matlab 15 `mongodump` cron = 15 silent failure modes. Backup,
monitoring, uptime, Sentry aur core-version tracking **central** honge.

---

## 9. Folder structure (core repo)

```
cms/
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ modules/             # auth, entries, media, menus, seo, settings...
│  │     │   └─ entries/ { model.js, service.js, controller.js, routes.js, validation.js }
│  │     ├─ core/                # db, errors, logger, cache, events, migrations
│  │     ├─ middleware/          # auth, rbac, validate, upload, rateLimit, sanitize
│  │     └─ index.js
│  ├─ admin/
│  │  └─ src/
│  │     ├─ builder/             # canvas, layers, props-panel, toolbar, dnd, history
│  │     ├─ modules/             # entries, media, appearance, seo, settings, users, tools
│  │     ├─ components/ui/       # shadcn/ui
│  │     └─ lib/api.js           # single-flight refresh mutex yahin
│  └─ web/
│     ├─ app/[[...slug]]/page.jsx    # <- routing ka ekmatra entry point
│     ├─ app/sitemap.js | robots.js | feed.xml
│     └─ theme/                      # client repo se inject hota hai
├─ packages/
│  ├─ blocks/                    # registry + Render + styleToCss + override hook
│  └─ shared/                    # zod schemas, constants, JSDoc typedefs
├─ migrations/
└─ docker-compose.yml
```

> **`themes/<client>/` core repo me nahi hai.** Client ka theme client ke repo me
> rehta hai (section 8). Core me sirf `theme/` ka interface/contract hai.

---

## 10. Admin information architecture

Screens ka list hona kaafi nahi tha — navigation structure chahiye, warna Menus,
Templates aur theme tokens teen alag features ban jaate hain jinka koi ghar nahi.
Isliye "Appearance" grouping.

```
Dashboard

Pages                     All · Trash                         (+ Add New)
Posts                     All · Categories · Tags · Trash     (+ Add New)
[Services] [Portfolio]    contentType se auto-generate        (Phase 6)

Media                     Library · Folders · Trash

Forms                     Forms · Submissions

Appearance                Site Style · Menus · Templates · Patterns

SEO                       Defaults · Redirects · Sitemap

Users                     All Users · Roles · My Profile

Tools                     Import · Export · Activity Log

Settings                  General · Reading · Permalinks · Media · Scripts
```

### List screen ka standard (har content type pe same)

```
[ All (24) | Published (18) | Draft (4) | Pending (2) | Trash (7) ]
[ search ]  [ filter: category · author · date ]          [ + Add New ]

[x] Title                Author    Categories   Status      Modified
[x] Home                 Deepak    —            Published   2 hrs ago
    ^ row hover: Edit · View · Duplicate · Trash

[ Bulk actions: Publish | Unpublish | Trash | Assign category ]  [Apply]
```

Bulk actions optional nahi hain — 200 posts wala client inke bina aapko call karega.
Har row pe **View** (live page kholna) sabse zyada use hone wala action hai.

### Frontend edit bar

Logged-in user jab live site dekhe, upar ek patli bar aaye: **"Edit this page"**.
Iske bina loop ye hai — site pe typo dikha → admin kholo → list me page dhoondho →
edit karo. Ek din ka kaam hai, roz kaam aata hai. Session/origin design Phase 3 me
waise bhi ho raha hai, isliye wahin add karo.

---

## 11. Non-negotiable rules (framework rehne ke liye)

1. Business logic sirf `service.js` me. Controller patla, model sirf schema.
   **Mongoose hooks me sirf pure data normalization** — slugify, trim, `updatedAt`,
   denormalized counts. Koi side effect nahi, koi I/O nahi. Revision snapshot, cache
   invalidation, revalidate webhook, publish state machine, email — sab service me.
   _Kyun:_ `updateOne` / `findOneAndUpdate` / `bulkWrite` `save` hooks chalate hi nahi;
   hook wala logic chup-chaap skip ho jaayega.
   1b. Scheduled publish **kabhi `setTimeout` se nahi** — DB source of truth
   (`status:'scheduled'` + indexed `publishAt`), cron har minute atomic
   `findOneAndUpdate` se claim kare. Public read query khud bhi
   `scheduled && publishAt <= now` ko published maane (self-healing).
   1c. Library versions plan me hardcode mat karo — lockfile me exact pin, Node
   `.nvmrc` + `engines` me.
2. Block ka `type` string kabhi rename mat karo. `content.version` rakho aur
   block-tree migration likho (section 8).
3. Naya block = ek file + registry entry. Core code touch nahi hona chahiye.
4. Client-specific customization **client repo** me (`theme/`, `blocks/`) — core me kabhi nahi.
5. Publish pe revision snapshot bane, **aur save pe bhi** (retention cap ke saath).
   Recovery ka asli case "maine save karke tod diya" hai, sirf publish nahi.
6. Har input pe Zod validation, schema `packages/shared` se.
7. **Har query param Zod se validated.** `req.query` / `req.body` ko kabhi seedha
   Mongoose query me spread mat karo — `fields` Mixed hai, ye NoSQL injection ka
   direct raasta hai.
8. **Routing ka ekmatra source `entries.path` hai.** Koi hardcoded public route nahi.
9. **UI me internal naam kabhi nahi:** `entries` → Pages/Posts, `taxonomies` →
   Categories/Tags, "regions" → Template Parts, "global blocks" → Synced Patterns.
10. Delete = trash. Permanent delete sirf Trash screen se.

---

## 12. Known traps

| Trap                                        | Kya hoga                                         | Bachav                                              |
| ------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| Builder me "Elementor jaisa sab kuch"       | 3 mahine me bhi launch nahi hoga                 | Phase 5 me sirf ~10 block, fixed layout system      |
| Preview != live output                      | Client ka trust khatam                           | Shared renderer + injected platform components (4b) |
| HTML string save karna                      | Aage kuch edit nahi hota                         | Hamesha JSON tree                                   |
| **Slug unique par path nahi**               | Do type ek hi URL pe, silent collision           | Stored `path` + unique index (3c)                   |
| **Hardcoded `/blog/[slug]` route**          | `urlPattern` configurable hone ka matlab khatam  | Ek catch-all, `path` se resolve                     |
| **`/` kahin define hi nahi**                | Homepage ka koi jawab nahi                       | `settings.homepageEntryId`                          |
| **Do cache layer**                          | "Publish kiya, site update nahi hui"             | Ek authority + tag invalidation (5a/5b)             |
| **Text index block content miss karta hai** | Admin search chup-chaap kuch nahi dhoondhta      | `searchText` denormalized field                     |
| **Core update ka koi raasta nahi**          | 12 fork, har fix 12 baar                         | Versioned packages + client repo (8)                |
| **`pending` status nahi**                   | contributor role bekaar                          | Status lifecycle (3d)                               |
| **Trash nahi**                              | Non-technical user data uda dega                 | `deletedAt` day 1                                   |
| **Reuse detection stateless JWT pe**        | Feature exist hi nahi karta                      | `refreshTokens` collection                          |
| **Parallel 401 → refresh stampede**         | Random logout, week 3 me                         | Single-flight mutex                                 |
| Original image serve karna                  | Site slow, CWV down                              | Upload pe hi sharp se webp variants                 |
| **SVG upload**                              | SVG ke andar `<script>` chal jaata hai           | Sanitize ya disallow                                |
| **Staging Google me index**                 | Client ka duplicate content live se compete kare | `searchEngineVisible` toggle + admin banner         |
| Saara data ek page me                       | Admin hang                                       | Server-side pagination day 1 se                     |
| Custom fields ko strict schema              | Har client pe migration                          | `fields` Mixed, validation contentType se           |
| **Local disk pe media**                     | Instance stateful, deploy/backup mushkil         | S3/R2 + CDN production default                      |
