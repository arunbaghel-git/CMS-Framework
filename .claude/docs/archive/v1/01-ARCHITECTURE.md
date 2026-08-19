# MERN CMS Framework — Architecture (v1)

## 1. Goal

Ek reusable CMS framework jisse non-technical user admin panel se poori website
banaye aur manage kare — pages, posts, media, menus, SEO, templates aur
drag-and-drop page builder ke saath.

Framework ka matlab: har naye client ke liye code dobara nahi likhna. Sirf
theme/blocks add karo, CMS core same rehta hai.

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
|  (Mongoose)  |   |  content | auth | media  |   | local -> S3  |
+--------------+   +------------+-------------+   +--------------+
                              | REST /api/public/* (cached, read-only)
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

### Next.js kyun, jab MERN bola tha?

Next.js React hi hai. SEO ke liye server-rendered HTML chahiye — pure SPA me
crawler ko khaali div milta hai. Agar strictly sirf Express rakhna hai to
alternative: Express + `react-dom/server` se manual SSR. Kaam karega, par
sitemap, ISR, image optimization, cache invalidation sab khud likhna padega —
motay taur pe 3-4 hafte extra. **Recommendation: Next.js.**

---

## 3. Data model (MongoDB collections)

Core principle: **"Sab kuch content hai."** Pages aur posts alag collection nahi
hain — ek hi `entries` collection hai jiska `type` alag hai. Isi se aage
"Services", "Portfolio", "Team" jaise custom types lagbhag free me mil jaate hain.

`siteId` — niche `*` wale sab collections pe ye field hoga, default ek constant
(`DEFAULT_SITE_ID`). Abhi koi ise filter nahi karta; ye sirf future multi-site ke
liye reserve hai (section 3b dekho).

```
users            _id, name, email, passwordHash, role, status, lastLoginAt
roles            _id, key(admin|editor|author|viewer), permissions[]
settings       * siteId, siteName, logo, favicon, timezone, socialLinks, defaultSeo, scripts
contentTypes   * siteId, key(page|post|service...), label, icon, fields[], hasBuilder, urlPattern
entries        * siteId, type, title, slug, status(draft|published|scheduled),
                 publishAt, authorId, templateId,
                 content { blocks: [...] },      // page builder tree
                 fields  { ...customFields },    // content-type ke fields
                 seo     { ... },                // niche dekho
                 taxonomies { categories[], tags[] },
                 featuredImageId, order, parentId, updatedAt
revisions        entryId, snapshot, createdBy, createdAt, label
media          * siteId, filename, mime, size, width, height, folderId,
                 variants[{ key, url, w, h }], alt, caption, uploadedBy
mediaFolders   * siteId, name, parentId
menus          * siteId, key(main|footer), items[]   // nested tree
templates      * siteId, name, type(page|post|archive|single),
                 regions{header,footer}, layout(blocks tree), isDefault
taxonomies     * siteId, type(category|tag), name, slug, parentId, seo
redirects      * siteId, from, to, statusCode(301|302), hits
forms          * siteId, name, fields[], notifyEmails[], successMessage
submissions      formId, data, ip, createdAt
```

`users` / `roles` / `revisions` / `submissions` pe `siteId` nahi — ye user ya parent
entry se derive ho jaate hain.

### 3b. Single-site by design, multi-site reserved

Ye ek **agency framework** hai: **ek deployment = ek client = ek website**, apna DB,
apna domain, apna admin login. Multiple websites ek admin se manage karna scope me
nahi hai.

`siteId` sirf **insurance** hai — taaki kabhi multi-site karna pade to bade data pe
index rebuild na karna pade (wo mehnga hota hai). Iske alawa aaj wo kuch nahi karta.

**Aaj:** `siteId` likha jaata hai, `DEFAULT_SITE_ID` se. Koi query usse filter nahi karti.

**Multi-site ke liye jo tab banana padega (~2-3 hafte, aaj scope me nahi):**
`sites` collection (domain, theme, per-site settings) · admin site-switcher +
current-site context · **har query me siteId scoping** (ek query bhooli = cross-site
data leak — ye security bug class hai, feature nahi) · per-site permissions ·
`Host` header se site resolve · cache keys me siteId · media shared vs per-site decision.

Multi-tenancy tabhi lena jab ise **SaaS** banana ho (client khud signup kare, infra
aap chalao). Agency use-case me multi-instance hi behtar hai — data isolation
automatic, ek client ka traffic spike doosre ko affect nahi karta, aur client-specific
block/theme baaki clients pe asar nahi daalta.

### Menu item (nested)

```json
{
  "id": "m1",
  "label": "About",
  "linkType": "entry|url|taxonomy",
  "entryId": "...",
  "url": null,
  "target": "_self",
  "children": []
}
```

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

Khaali fields pe fallback chain: entry SEO -> `settings.defaultSeo` -> entry
title/excerpt.

### Indexes (day 1 se, warna baad me dard)

Compound indexes me `siteId` **sabse pehle** rakho — yahi wo cheez hai jiske liye
field reserve kiya hai. Single-site me koi nuksaan nahi (ek hi value hai), aur
multi-site me index dobara banane se bach jaate ho.

```
entries:   { siteId: 1, type: 1, slug: 1 }  unique
entries:   { siteId: 1, type: 1, status: 1, publishAt: -1 }
entries:   { title: "text", "seo.description": "text" }
media:     { siteId: 1, folderId: 1, createdAt: -1 }
redirects: { siteId: 1, from: 1 }  unique
menus:     { siteId: 1, key: 1 }  unique
```

---

## 4. Page builder ka core (sabse zaroori hissa)

Page ka layout ek **JSON tree** hai — HTML string nahi. HTML store karoge to
dobara edit karna, theme badalna, responsive control sab impossible ho jayega.

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
  Render: (props) => JSX          // ek hi component: admin canvas + public site
}
```

**Fayda:** naya block add karne ke liye sirf ek file. Properties panel, drag
list, defaults — sab schema se generate. Yahi cheez isko "CMS framework" banati
hai, "ek website" nahi.

### Builder UI ke 4 hisse

1. **Left** — block library (categories) + layer/tree view
2. **Center** — canvas, **iframe me render** taaki theme CSS aur admin CSS na takraayein
3. **Right** — properties panel (schema-driven) + responsive tabs (desktop/tablet/mobile)
4. **Top** — undo/redo, breakpoint switch, preview, save/publish

Libraries: `dnd-kit` (drag-drop), `zustand` + `immer` (editor state + history),
`react-hook-form` + `zod` (forms), `TipTap` (rich text), `sharp` (image variants).

### Responsive model

Har block pe `style.desktop | tablet | mobile`. Mobile khaali ho to desktop se
inherit. Sirf ye control do: spacing, alignment, visibility, columns, font size.
Free-form CSS mat do — non-technical user usse site tod dega.

### Global/reusable blocks (Phase 6+)

Block ko "Global" mark karo -> alag collection me save -> jahan use ho wahan
reference. Header/footer/CTA ek jagah badlo, poori site update.

---

## 5. Rendering + SEO flow

```
User /about kholta hai
  -> Next.js catch-all route [[...slug]]
  -> GET /api/public/entries/by-path?path=/about        (cache 60s)
  -> entry.templateId se template -> header/footer regions
  -> <BlockRenderer blocks={entry.content.blocks} />
  -> generateMetadata(): title, description, canonical, OG, JSON-LD
  -> ISR revalidate; publish pe API webhook se on-demand revalidate
```

SEO module deta hai: per-entry meta, OG/Twitter cards, canonical, robots
directives, auto `sitemap.xml` (published entries se), `robots.txt`, JSON-LD
schema, redirect manager (purana URL -> 301), aur editor me simple SEO
checklist (title length, meta length, H1 count, missing image alt, internal links).

---

## 6. Auth & roles

### Deployment topology (pehle ye decide karo — cookie policy isi pe depend karti hai)

**Same-origin** rakho: admin `example.com/admin`, API `example.com/api`, dono ek
reverse proxy ke peeche. Dev me Vite proxy se wahi setup mil jaata hai.

| Setup                                       | Cookie                                                             | CSRF ka bharosa        |
| ------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| **Same-origin (recommended)**               | `SameSite=Lax` kaam karta hai                                      | Token defence-in-depth |
| Cross-origin (`admin.x.com` ↔ `api.x.com`) | `SameSite=None; Secure` majboori — **SameSite ka protection zero** | Token hi akela sahara  |

### Cookie + CSRF policy (explicit)

```
access token   15 min   httpOnly · Secure (prod) · SameSite=Lax · Path=/ · __Host- prefix
refresh token  7 din    wahi flags + rotation on use + reuse detection (chori pakadne ke liye)
CSRF           double-submit token; har non-GET request pe verify
CORS           strict origin allowlist + credentials:true  (wildcard kabhi nahi)
```

localStorage me token kabhi mat rakho — CMS me user rich text aur embed HTML
daalta hai, matlab XSS surface bada hai; cookie hi safe hai.

### Roles

- Roles: `admin` (sab), `editor` (sab content publish kar sakta), `author`
  (sirf apna content, publish nahi), `viewer` (read-only).
- Permissions string-based: `entry.create`, `entry.publish`, `media.delete`,
  `settings.update`. Role -> permissions[] mapping DB me, taaki custom role
  banana baad me aasan ho.
- Har admin route pe `requirePermission('...')` middleware.

---

## 7. API surface (REST, versioned)

```
POST   /api/auth/login | logout | refresh | forgot | reset

GET    /api/admin/entries?type=page&status=&q=&page=
POST   /api/admin/entries
GET    /api/admin/entries/:id
PATCH  /api/admin/entries/:id
POST   /api/admin/entries/:id/publish | unpublish | duplicate
GET    /api/admin/entries/:id/revisions
POST   /api/admin/entries/:id/revisions/:rid/restore
POST   /api/admin/media (multipart)   GET /api/admin/media   DELETE /api/admin/media/:id
GET/PUT /api/admin/menus/:key
GET/PUT /api/admin/settings
CRUD   /api/admin/templates | content-types | taxonomies | redirects | users

GET    /api/public/entries/by-path?path=/about
GET    /api/public/entries?type=post&page=1&limit=10&category=news
GET    /api/public/menus/:key
GET    /api/public/settings
GET    /api/public/sitemap
```

Admin aur public routes alag rakho: public read-only + cacheable, admin authed.

---

## 8. Folder structure

```
cms/
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ modules/             # auth, entries, media, menus, seo, settings...
│  │     │   └─ entries/ { model.js, service.js, controller.js, routes.js, validation.js }
│  │     ├─ core/                # db, errors, logger, cache, hooks/events
│  │     ├─ middleware/          # auth, rbac, validate, upload, rateLimit
│  │     └─ index.js
│  ├─ admin/
│  │  └─ src/
│  │     ├─ builder/             # canvas, layers, props-panel, dnd, history
│  │     ├─ modules/             # entries, media, menus, seo, settings, users
│  │     ├─ components/ui/       # shadcn/ui
│  │     └─ lib/api.js
│  └─ web/
│     ├─ app/[[...slug]]/page.jsx
│     ├─ app/blog/[slug]/page.jsx
│     ├─ app/sitemap.js | robots.js
│     └─ themes/default/         # tokens.css + template components
├─ packages/
│  ├─ blocks/                    # registry + Render components (SHARED)
│  └─ shared/                    # zod schemas, constants, JSDoc typedefs
└─ docker-compose.yml            # mongo + api + admin + web
```

---

## 9. Non-negotiable rules (framework rehne ke liye)

1. Business logic sirf `service.js` me. Controller patla, model sirf schema.
   **Mongoose hooks me sirf pure data normalization** — slugify, trim, `updatedAt`,
   denormalized counts. Koi side effect nahi, koi I/O nahi. Revision snapshot, cache
   invalidation, revalidate webhook, publish state machine, email — sab service me.
   _Kyun:_ `updateOne` / `findOneAndUpdate` / `bulkWrite` `save` hooks chalate hi nahi.
   Logic hook me hua to wo chup-chaap skip ho jaayega — koi error nahi, koi log nahi.
   1b. Scheduled publish **kabhi `setTimeout` se nahi** — DB source of truth
   (`status:'scheduled'` + indexed `publishAt`), cron har minute atomic
   `findOneAndUpdate` se claim kare (multi-instance pe double-publish se bachne ke liye).
   Public read query khud bhi `scheduled && publishAt <= now` ko published maane —
   isse cron band ho jaaye to bhi site sahi rahe (self-healing).
   1c. Library versions plan me hardcode mat karo — implementation ke waqt current
   stable/LTS lo. Par `package.json` + lockfile me exact pin, aur Node version
   `.nvmrc` + `engines` me (native modules — sharp, bcrypt — mismatch pe toot-te hain).
2. Block ka `type` string kabhi rename mat karo. `version` field rakho aur
   migration function likho.
3. Naya block = ek file + registry entry. Core code touch nahi hona chahiye.
4. Client-specific customization `themes/<client>/` me, core me kabhi nahi.
5. Publish action hamesha revision snapshot banaye.
6. Har input pe Zod validation, schema `packages/shared` se — admin aur API
   same rule use karein.

---

## 10. Known traps

| Trap                                  | Kya hoga                         | Bachav                                             |
| ------------------------------------- | -------------------------------- | -------------------------------------------------- |
| Builder me "Elementor jaisa sab kuch" | 3 mahine me bhi launch nahi hoga | Phase 5 me sirf ~10 block, fixed layout system     |
| Preview != live output                | Client ka trust khatam           | Shared renderer package, canvas iframe me          |
| HTML string save karna                | Aage kuch edit nahi hota         | Hamesha JSON tree                                  |
| Slug/URL logic bikhra hua             | Duplicate URL, SEO loss          | Ek `resolvePath()` util + unique index             |
| Original image serve karna            | Site slow, Core Web Vitals down  | Upload pe hi sharp se webp variants                |
| Saara data ek page me                 | Admin hang                       | Har list pe server-side pagination day 1 se        |
| Custom fields ko strict schema        | Har client pe migration          | `fields` ko Mixed rakho, validation contentType se |
