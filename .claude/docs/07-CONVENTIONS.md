# 07 — Conventions

Har PR se pehle ye padho. Ye rules framework ko framework banaye rakhte hain — inhe
todne ka matlab hai ki 6 mahine baad har client pe custom code likhna padega.

---

## 1. Non-negotiable rules

### R1 · Business logic sirf `service.js` me

Controller patla, model sirf schema. **Mongoose hooks me sirf pure data normalization** —
slugify, trim, `updatedAt`, denormalized counts. Koi side effect nahi, koi I/O nahi.

Revision snapshot, cache invalidation, revalidate webhook, publish state machine,
email — **sab service me**.

> **Kyun:** `updateOne` / `findOneAndUpdate` / `bulkWrite` `save` hooks **chalate hi nahi
> hain**. Hook me rakha logic chup-chaap skip ho jaayega — koi error nahi, koi log nahi.

### R2 · Scheduled publish `setTimeout` se kabhi nahi

DB source of truth (`status:'scheduled'` + indexed `publishAt`), cron har minute atomic
`findOneAndUpdate` se claim kare. Public read query khud bhi `scheduled && publishAt <= now`
ko published maane (self-healing).

### R3 · Library versions lockfile me pin, plan me nahi

"Latest lo" ka matlab `^` se float karna nahi. Node version `.nvmrc` + `engines` me —
sharp/bcrypt jaise native modules mismatch pe toot-te hain.

### R4 · Block ka `type` string kabhi rename mat karo

Wo DB me stored data hai. `content.version` rakho aur block-tree migration likho.

### R5 · Naya block = ek file + registry entry

Core code touch nahi hona chahiye. Agar touch karna pad raha hai, to registry me
extension point missing hai — usse add karo.

### R6 · Client-specific customization client repo me

`theme/`, `blocks/` — core me kabhi nahi. Core me client ka naam aana ek bug hai.

### R7 · Revision snapshot publish pe **aur** save pe

Retention cap ke saath. Recovery ka asli case _"maine save karke tod diya"_ hai, sirf
publish nahi.

### R8 · Har input pe Zod validation

Schema `packages/shared` se — admin aur API dono wahi import karein.

### R9 · Har query param Zod se validated

`req.query` / `req.body` ko **kabhi seedha Mongoose query me spread mat karo**.
`fields` Mixed hai — ye NoSQL injection ka direct raasta hai.

```js
// ❌ kabhi nahi
Entry.find({ ...req.query })

// ✅
const q = listQuerySchema.parse(req.query)
Entry.find({ siteId, type: q.type, status: q.status })
```

### R10 · Routing ka ekmatra source `entries.path` hai

Koi hardcoded public route nahi. `app/blog/[slug]` banate hi `contentType.urlPattern`
ke configurable hone ka matlab khatam ho jaata hai.

### R11 · UI me internal naam kabhi nahi

| Code me            | UI me                    |
| ------------------ | ------------------------ |
| `entries`          | Pages / Posts / Services |
| `taxonomies`       | Categories / Tags        |
| `template.regions` | Template Parts           |
| synced pattern     | Synced Patterns          |

### R12 · Delete = trash

Permanent delete sirf Trash screen ke andar se.

### R13 · State-changing GET kabhi nahi

`SameSite=Lax` top-level GET navigation pe cookie bhejta hai — koi bhi state-changing
GET usi gap se CSRF-able hai.

### R14 · Har list pe server-side pagination, day 1 se

Saara data ek page me = admin hang.

---

## 2. Code layout

### API module ka shape

Har module ki **wahi paanch files**, hamesha:

```
apps/api/src/modules/entries/
├─ model.js         Mongoose schema — sirf shape aur pure normalization
├─ service.js       SAARA business logic yahan
├─ controller.js    patla — req/res handling, service ko call
├─ routes.js        route definitions + middleware chain
└─ validation.js    Zod schemas (packages/shared se import ya re-export)
```

### Naming

| Cheez             | Convention        | Example                                    |
| ----------------- | ----------------- | ------------------------------------------ |
| Files             | kebab-case        | `media-picker.jsx`, `resolve-path.js`      |
| React components  | PascalCase        | `BlockRenderer`, `MediaPicker`             |
| Functions / vars  | camelCase         | `resolvePath`, `searchText`                |
| Constants         | SCREAMING_SNAKE   | `DEFAULT_SITE_ID`                          |
| Mongo collections | plural lowercase  | `entries`, `mediaRefs`                     |
| Permissions       | `resource.action` | `entry.publish`, `settings.scripts.update` |
| Cache tags        | `type:id`         | `entry:abc123`, `menu:header`              |
| Block types       | camelCase         | `richText`, `formPlaceholder`              |

### Imports

```js
// packages ke liye alias, relative paths nahi
import { entrySchema } from '@cms/shared/schemas'
import { BlockRenderer } from '@cms/blocks'
```

---

## 3. JavaScript ke saath safety

TS nahi hai (D-03), isliye ye teen **optional nahi hain**:

### 3.1 Zod har boundary pe

API input, block props, contentType fields, query params. Schema ek jagah
(`packages/shared`), admin aur api dono wahi import karein.

### 3.2 `jsconfig.json` + `checkJs` + JSDoc

Core shapes pe typedefs — build step nahi, sirf editor autocomplete aur red squiggles:

```js
/**
 * @typedef {Object} Block
 * @property {string} id
 * @property {string} type
 * @property {Object} props
 * @property {{desktop?:Object, tablet?:Object, mobile?:Object}} [style]
 * @property {Block[]} [children]
 */
```

### 3.3 Block tree operations pe unit tests

`add` / `move` / `delete` / `duplicate` / `undo` — **JS me yahi wo jagah hai jahan
silent bugs sabse zyada aate hain.** Ye tests optional nahi hain.

---

## 4. Testing strategy

| Level           | Tool                              | Kya cover kare                                                                                                   |
| --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Unit**        | Vitest                            | Services — slug/path logic, cascade + redirect, permission checks, SEO fallback chain, **block tree operations** |
| **Integration** | supertest + mongodb-memory-server | Har API module: happy path + auth failure + **409 conflict** + **trash/restore**                                 |
| **E2E**         | Playwright                        | 6 flows (niche)                                                                                                  |

**E2E ke 6 critical flows:**

1. Login
2. Page create + publish
3. Media upload
4. Builder drag + save
5. Public page render (preview vs live match)
6. **Slug change se 301 redirect** (cascade ke saath)

**CI Phase 0 se** — lint + test har commit pe, Phase 8 se nahi.

---

## 5. Contracts jo freeze hote hain

Ye teen cheezein ek baar likhne ke baad **soch samajh kar hi** badalti hain, kyunki
inpe poora system khada hai:

### 5.1 Block envelope

```js
{ id, type, props, style: { desktop, tablet, mobile }, children }
```

**Envelope freeze hai, block ki list nahi.** Naye blocks aate rahenge; ye 5 keys nahi
badlenge.

### 5.2 `content` shape

```js
{ version: 1, blocks: [] }
```

Phase 1 se hi ye shape use karo — rich text ko ek `richText` block ke andar. Phase 5 me
migration nahi likhni padegi.

### 5.3 Block definition

```js
{ type, label, category, allowedChildren, schema[], defaults, toolbar[], Render }
```

`schema[]` ka field-type set ek DSL hai aur `packages/shared` me rehta hai.

---

## 6. API conventions

### Response shape

```js
// success
{ data: {...}, meta: { page, limit, total } }

// error
{ error: { code: 'ENTRY_CONFLICT', message: '...', details: {...} } }
```

### Status codes

| Code  | Kab                                                      |
| ----- | -------------------------------------------------------- |
| `400` | Zod validation fail                                      |
| `401` | Token nahi / invalid                                     |
| `403` | Token sahi, par permission nahi                          |
| `404` | Resource nahi mila (ya trashed hai aur trashed=false)    |
| `409` | **Optimistic concurrency conflict** — `version` mismatch |
| `422` | Business rule fail (reserved slug, circular parent)      |
| `429` | Rate limit                                               |

### Admin vs public

- `/api/admin/*` — authed, RBAC-checked, kabhi cache nahi
- `/api/public/*` — read-only, kabhi authed nahi, Next ISR ke peeche

---

## 7. Git conventions

```
main                    hamesha deployable
feat/entries-trash      feature branches
fix/refresh-stampede    bug fixes
```

**Commit format:**

```
feat(entries): add trash + restore

- deletedAt soft delete on entries
- Trash view with restore + permanent delete
- auto-purge after 30 days

Refs: 05-BUILD-PLAN.md Phase 1
```

Har PR me: kya badla, kaunsa phase/rule refer karta hai, aur test pass hue.

---

## 8. Documentation rules

Code badle to doc bhi badle — **usi PR me**:

| Kya badla                | Kaunsa doc update ho                |
| ------------------------ | ----------------------------------- |
| Naya collection ya field | `02-ARCHITECTURE.md` §3             |
| Koi architectural faisla | `03-DECISIONS.md` — naya D-xx entry |
| Admin screen ya nav      | `04-ADMIN-UX.md` + wireframe        |
| Phase ka scope           | `05-BUILD-PLAN.md`                  |
| Env var, deploy step     | `06-OPERATIONS.md`                  |
| Naya rule ya convention  | ye file                             |

**Decision reverse karna ho to purani D-xx entry delete mat karo** — usme
"Superseded by D-yy" likh do. Reasoning ka itihaas hi is doc ki asli value hai.

8. **Admin design frozen hai.** `.claude/docs/reference/admin-design.html` ka layout,
   colours aur wording bilkul waisa hi banega. Apna variation mat banao — change
   sirf client ke kehne pe.

9. **CSS plain rahegi** — Tailwind, CSS Modules, CSS-in-JS teenon reject (D-28).
   Shared styles `styles/` me, component ki apni CSS uske saath. Har component ka
   class prefix zaroori (`ab-`, `menu-`, `blk-`) kyunki classes global hain.
