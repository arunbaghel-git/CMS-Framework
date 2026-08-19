# 01 — Overview

## Kya bana rahe hain

Ek **reusable CMS framework** — MERN stack pe. Non-technical client admin panel se
poori website banaye aur chalaye: pages, posts, media, menus, SEO, templates, aur
drag-and-drop page builder.

"Framework" ka matlab ye hai: **har naye client ke liye CMS dobara nahi likhna.**
Naya block = ek file. Naya content type = admin se ban jaata hai. Client ki branding =
theme tokens se. Core code chhua tak nahi jaata.

## Business model — ek client, ek instance

```
Client A  →  apna deployment  →  apna DB  →  acme-dental.com/admin
Client B  →  apna deployment  →  apna DB  →  sharma-legal.com/admin
Client C  →  apna deployment  →  apna DB  →  cafe-mocha.com/admin
                     ↑
        teenon me core code bilkul same, versioned packages se
```

Ye **multi-tenant SaaS nahi hai.** Har client alag installation hai — jaise alag-alag
WordPress installs. Agency use-case ke liye ye behtar hai:

- **Data isolation automatic** — ek query bhoolne se doosre client ka data leak nahi hota
- **Ek client ka traffic spike** baaki clients ko affect nahi karta
- **Client-specific block ya theme** baaki clients pe asar nahi daalta
- Client chale jaaye to uska instance handover karna aasaan hai

Iski **keemat** ye hai ki core update ka ek raasta banana padta hai — warna 12 client
matlab 12 fork. Wo raasta [`06-OPERATIONS.md`](06-OPERATIONS.md) me define hai, aur
project ka sabse zaroori structural faisla wahi hai.

Multi-tenancy tabhi lena jab ise **SaaS** banana ho (client khud signup kare, infra
aap chalao). Tab tak `siteId` field reserve hai — detail
[`02-ARCHITECTURE.md`](02-ARCHITECTURE.md) §3b me.

---

## Kiske liye hai

| Kaun                       | Kya karega                                                                       |
| -------------------------- | -------------------------------------------------------------------------------- |
| **Client** (non-technical) | Content likhna, page banana, image upload, menu badalna, form submissions dekhna |
| **Agency designer**        | Theme tokens se branding, patterns banana, templates set karna                   |
| **Agency developer**       | Naya client instance khada karna, custom block likhna, core upgrade karna        |

Sabse important user **client** hai. Har design faisla is sawaal se guzarta hai:
_"kya ek non-technical banda ye bina call kiye kar lega?"_

---

## Scope

### Andar hai

- Pages, Posts, aur admin se bane custom content types (Services, Portfolio, Team)
- Categories + tags, unke archive pages ke saath
- Media library — folders, image variants, crop, usage tracking
- Drag-drop page builder (~10 blocks) + patterns
- Templates aur template parts (header/footer)
- Menus (jitne chaho) + theme locations
- SEO — meta, title templates, sitemap, robots, RSS, JSON-LD, redirects, breadcrumbs
- Drafts, pending review, scheduled publish, private, trash, revisions
- Forms + submissions inbox
- Users, roles, permissions, activity log
- Design tokens se theming

### Bahar hai (jaan-boojh kar)

| Cheez                         | Kyun nahi                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------- |
| **Comments**                  | Agency sites pe spam + moderation ka bojh. Third-party embed block se ho jaayega |
| **Plugin system**             | Code aapke paas hai — blocks hi extension point hain                             |
| **Multi-site / multi-tenant** | Ek instance = ek site. SaaS banane pe hi zaroori                                 |
| **E-commerce**                | Alag product hai                                                                 |
| **Multi-language**            | `locale` field day 1 se reserve hai, feature baad me                             |
| **Live multi-user collab**    | Builder ka scope phat jaayega                                                    |
| **Free-form CSS in builder**  | Non-technical user usse site tod dega                                            |

---

## Tech stack

| Kaam          | Choice                                                   | Kyun (detail → [03-DECISIONS](03-DECISIONS.md))  |
| ------------- | -------------------------------------------------------- | ------------------------------------------------ |
| API           | Express + Mongoose                                       | Team familiar, ecosystem bada                    |
| Database      | MongoDB                                                  | Flexible custom fields, per-client alag DB       |
| Admin UI      | React + Vite + Tailwind + shadcn/ui                      | Fast dev, accessible components free             |
| Public site   | Next.js App Router                                       | SSR/ISR — SEO ke liye zaroori                    |
| Language      | JavaScript (ESM)                                         | TS nahi — safety Zod + tests se aati hai         |
| Validation    | Zod, `packages/shared` me                                | Ek schema, admin + API dono                      |
| Server state  | TanStack Query                                           | Cache, refetch, optimistic updates               |
| Editor state  | Zustand + Immer                                          | Undo/redo ke liye patches easy                   |
| Drag & drop   | dnd-kit                                                  | Accessible, nested support                       |
| Rich text     | TipTap                                                   | JSON output deta hai, HTML nahi                  |
| Images        | sharp                                                    | Variants + webp                                  |
| Media storage | S3/R2 + CDN (prod), local (dev)                          | Instance stateless rahe                          |
| Auth          | JWT httpOnly cookies + CSRF + `refreshTokens` collection | Reuse detection ke liye server state chahiye     |
| Cache         | Next ISR (single authority) + tag invalidation           | Do cache layer = "publish kiya, update nahi hua" |
| Jobs          | DB-based cron → BullMQ (Phase 7+)                        | `setTimeout` restart pe schedule kho deta hai    |

Versions kahin hardcode nahi — implementation ke waqt current stable/LTS lo, par
lockfile me **exact pin** karo aur Node version `.nvmrc` + `engines` me rakho
(sharp/bcrypt jaise native modules mismatch pe toot-te hain).

---

## Glossary

Ye shabd poore docs me consistently use hote hain. **Internal naam aur UI naam alag
hain** — ye jaan-boojh kar hai (rule 9, [`07-CONVENTIONS.md`](07-CONVENTIONS.md)).

| Internal (code, DB) | UI me dikhta hai      | Matlab                                                              |
| ------------------- | --------------------- | ------------------------------------------------------------------- |
| `entry`             | Page / Post / Service | Ek content item. Sab ek hi collection me hain, `type` se alag       |
| `contentType`       | Content Type          | Entry ka blueprint — fields, URL pattern, builder on/off            |
| `taxonomy`          | Categories / Tags     | Content ko group karne ka tareeka                                   |
| `block`             | Block                 | Page ka ek hissa (heading, image, section) — JSON tree ka node      |
| `pattern`           | Pattern               | Ready-made section. Insert hote hi **copy** ban jaata hai           |
| `pattern (synced)`  | Synced Pattern        | Ek jagah save, har use pe **reference**. Ek jagah badlo, sab update |
| `template.regions`  | Template Parts        | Header/footer jaise reusable page hisse                             |
| `path`              | URL                   | Entry ka poora public URL, DB me stored                             |
| —                   | Instance              | Ek client ka poora deployment (app + DB + domain)                   |
| —                   | Core                  | `@cms/*` packages jo sab instances me same hain                     |

**Naam ki teen galtiyaan jo nahi karni:**

- UI me kabhi "Entries" mat dikhao — wahan "Pages"/"Posts" hi hoga
- UI me kabhi "Taxonomies" mat dikhao — wahan "Categories"/"Tags" hi hoga
- Block ka `type` string kabhi rename mat karo — wo DB me stored hai

---

## Ek page banne se live hone tak ka safar

Poora system samajhne ke liye ye ek example kaafi hai:

```
1. Client admin me "Add New Page" dabata hai
       ↓
2. Editor khulta hai. contentType.hasBuilder=true hai, isliye page builder khulta hai
       ↓
3. Left se blocks drag karke canvas me daalta hai
   → canvas ek sandboxed iframe hai
   → render packages/blocks se ho raha hai (wahi jo live site use karega)
       ↓
4. Right panel me Block tab se properties set karta hai
   → panel block ke schema[] se AUTO generate hua hai
   → responsive tabs se mobile ka spacing alag
       ↓
5. Document tab me slug likhta hai → resolvePath() se path banta hai (/about/team)
   → { siteId, locale, path } unique index isko duplicate hone se rokta hai
       ↓
6. Publish dabata hai
   → service layer: status=published, revision snapshot, activity log
   → cache invalidation: tag map se revalidateTag() — page + archive +
     category archives + sitemap + feed, sab ek saath
       ↓
7. Visitor site kholta hai
   → Next.js catch-all [[...slug]] → GET /api/public/resolve?path=/about/team
   → template + BlockRenderer + scoped CSS
   → generateMetadata(): title template, OG, JSON-LD
       ↓
8. Preview aur live bilkul same dikhte hain
   → kyunki dono ne ek hi BlockRenderer aur ek hi styleToCss() use kiya
```

Har step ka detail [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md) me hai.
