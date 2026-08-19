---
name: cms-conventions
description: Is MERN CMS project me koi bhi code likhne, edit karne ya review karne se pehle load karo. Isme 14 non-negotiable rules, module shape, naming conventions, aur wo galtiyaan hain jo is codebase me chup-chaap fail hoti hain. Trigger — koi bhi file banana/badalna apps/ ya packages/ me, PR review, ya "ye sahi tareeka hai?" jaisa sawaal.
---

# CMS Conventions

Ye rules is project ke **specific failure modes** se aaye hain. Har ek ke peeche ek
asli bug hai jo chup-chaap fail hota hai.

## Teen rules jo sabse zyada tootte hain

### 1. Business logic service layer me, Mongoose hooks me nahi

```js
// ❌ ye chup-chaap fail hoga
entrySchema.post('save', async function() {
  await createRevision(this)          // findOneAndUpdate pe kabhi nahi chalega
})

// ✅
// service.js
async function publishEntry(id, userId) {
  const entry = await Entry.findOneAndUpdate(...)
  await createRevision(entry, userId)  // explicit
  await invalidateTags(entry)
  await logActivity(...)
  return entry
}
```

**Kyun:** `updateOne` / `findOneAndUpdate` / `bulkWrite` `save` hooks **chalate hi nahi**.
Koi error nahi, koi log nahi — bas logic skip. Ye is codebase ka sabse mushkil bug class hai.

Hooks me sirf: slugify, trim, `updatedAt`, denormalized counts. Koi I/O nahi.

### 2. Query params kabhi seedha query me nahi

```js
// ❌ NoSQL injection
Entry.find({ siteId, ...req.query })
// ?status[$ne]=null bhej do, sab kuch mil jaayega

// ✅
const q = listQuerySchema.parse(req.query)
Entry.find({ siteId, type: q.type, status: q.status, deletedAt: null })
```

`entries.fields` **Mixed** hai — ye raasta khula chhodna sabse seedha exploit hai.

### 3. Routing sirf `entries.path` se

```js
// ❌ urlPattern configurable hone ka matlab khatam
// app/blog/[slug]/page.jsx

// ✅ ek hi catch-all
// app/[[...slug]]/page.jsx → GET /api/public/resolve?path=/blog/x
```

`path` stored aur indexed hai. `{siteId, locale, path}` unique. Runtime pe url pattern
reverse-engineer karna band.

---

## Poori rules list

| # | Rule |
|---|---|
| R1 | Business logic sirf `service.js` me; hooks me sirf pure normalization |
| R2 | Scheduled publish DB-based; `setTimeout` kabhi nahi |
| R3 | Versions lockfile me pin; Node `.nvmrc` + `engines` me |
| R4 | Block ka `type` string kabhi rename nahi — migration likho |
| R5 | Naya block = ek file + registry entry; core untouched |
| R6 | Client customization client repo me (`theme/`, `blocks/`) |
| R7 | Revision snapshot publish pe **aur** save pe |
| R8 | Har input pe Zod, schema `packages/shared` se |
| R9 | Har query param Zod se validated |
| R10 | Routing ka ekmatra source `entries.path` |
| R11 | UI me internal naam kabhi nahi |
| R12 | Delete = trash; permanent delete sirf Trash se |
| R13 | State-changing GET kabhi nahi |
| R14 | Har list pe server-side pagination, day 1 se |

Detail: `.claude/docs/07-CONVENTIONS.md`

---

## Module shape

```
apps/api/src/modules/<name>/
├─ model.js         schema + indexes + pure normalization
├─ service.js       SAARA business logic
├─ controller.js    patla — validate → service → response
├─ routes.js        routes + requirePermission()
└─ validation.js    Zod schemas
```

Content-scoped collection = `siteId` + `deletedAt` zaroori. Indexes me `siteId` first.

---

## Naming

| Cheez | Convention | Example |
|---|---|---|
| Files | kebab-case | `media-picker.jsx` |
| Components | PascalCase | `BlockRenderer` |
| Functions | camelCase | `resolvePath` |
| Constants | SCREAMING_SNAKE | `DEFAULT_SITE_ID` |
| Collections | plural lowercase | `entries`, `mediaRefs` |
| Permissions | `resource.action` | `entry.publish` |
| Cache tags | `type:id` | `entry:abc123` |
| Block types | camelCase | `richText` |

**UI naming (R11):**
`entries` → Pages/Posts · `taxonomies` → Categories/Tags ·
`template.regions` → Template Parts · synced pattern → Synced Patterns

---

## API response

```js
{ data: {...}, meta: { page, limit, total } }
{ error: { code: 'ENTRY_CONFLICT', message: '...', details: {} } }
```

`400` Zod fail · `401` token nahi · `403` permission nahi · `404` nahi mila ·
`409` version conflict · `422` business rule fail · `429` rate limit

---

## Code likhne se pehle checklist

- [ ] Koi naya field/collection? → pehle `cms-architect` se poocho
- [ ] Query params pe Zod?
- [ ] Business logic service me, hook me nahi?
- [ ] Admin route pe `requirePermission()`?
- [ ] Content-scoped hai to `siteId` + `deletedAt`?
- [ ] List pe pagination?
- [ ] Public-facing hai to cache tags?
- [ ] Mutation pe activity log?
- [ ] Test: service pe unit, route pe integration?
- [ ] Doc update usi PR me?
