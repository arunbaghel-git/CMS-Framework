---
name: schema-change
description: Jab bhi Mongo collection ya field add, remove, rename ya change karna ho — ye skill pehle load karo. Isme day-1 reserve ka test, migration ka decision tree, index rules, aur block-tree versioning ka procedure hai. Trigger — "naya field add karna hai", "collection banao", "ye field hatana hai", model.js edit karna, ya koi bhi migration.
---

# Schema Change

Is project me **schema decisions sabse mehngi hain** — 15 running instances hain aur
sab pe live client data hai. Har schema change is procedure se guzarta hai.

## Step 1 — Day-1 reserve test

Naya field add kar rahe ho? Ye teen sawaal:

1. **Kya ye har query ya index ko chhoota hai?** (jaise `deletedAt`, `siteId`)
2. **Kya ye uniqueness constraint badalta hai?** (jaise `locale` → `{siteId, locale, path}`)
3. **Kya isko baad me backfill karna 15 instances pe mehnga hoga?**

Koi ek bhi **haan** = ye field **abhi** add hona chahiye, chahe feature baad me aaye.

Already reserved: `siteId` · `path` · `deletedAt` · `locale` · `version` · `searchText`

## Step 2 — Migration ka decision tree

```
Kya badal raha hai?
│
├─ Naya field, default value ke saath
│  └─ Migration chahiye? Sirf agar existing docs pe backfill zaroori hai
│     → schema migration, idempotent
│
├─ Field rename
│  └─ HAMESHA migration. Do-step karo:
│     1. naya field add + dono likho (dual-write)
│     2. backfill
│     3. purana field padhna band
│     4. purana field drop (alag release me)
│
├─ Field remove
│  └─ Migration + pehle check karo koi read kar raha hai ya nahi
│     contentType ka field hai to: orphan rakhna hai ya purge? DEFINE KARO
│
├─ Naya collection
│  └─ Migration me indexes bhi banao, model me nahi chhodo
│
└─ Block tree ka shape
   └─ SCHEMA MIGRATION NAHI — block-tree migration (Step 4)
```

## Step 3 — Schema migration ke rules

```
migrations/
├─ 001-initial-seed.js
├─ 002-add-path-field.js
└─ 003-backfill-search-text.js
```

| Rule          | Detail                                                      |
| ------------- | ----------------------------------------------------------- |
| Numbered      | Strictly sequential, gaps nahi                              |
| Recorded      | `migrations` collection — `name`, `appliedAt`, `checksum`   |
| Idempotent    | Dobara chale to kuch na bigde                               |
| Reversible    | Har migration me `down()` — rollback ke liye zaroori        |
| Boot se pehle | Deploy step pe chale, app start hone se pehle               |
| Batched       | Bade collections pe cursor + batch, poora `updateMany` nahi |

Command: `pnpm cms migrate` · status: `pnpm cms migrate:status`

## Step 4 — Block-tree migrations (alag system)

Ye alag isliye hain ki **ek page ka `content.version` v1 pe ho sakta hai jab site v4 pe
hai** — page 2 saal se edit hi nahi hua.

```js
function migrateTree(content) {
  while (content.version < CURRENT_BLOCK_VERSION) {
    content = blockMigrations[content.version](content)
  }
  return content
}
```

| Rule         | Detail                                                             |
| ------------ | ------------------------------------------------------------------ |
| Kab chale    | Read pe **lazily**, aur background batch job se                    |
| Scope        | Per-document, per-version                                          |
| Idempotent   | Zaroori — ek document pe kai baar chal sakti hai                   |
| Block `type` | **Kabhi rename mat karo.** Rename chahiye to migration me map karo |

## Step 5 — Index rules

- Compound indexes me **`siteId` sabse pehle**
- Naya query pattern = pehle index check karo, `explain()` chalao
- Text index: **ek collection pe sirf EK allowed**. Isliye `searchText` denormalized
  field hai — naya text index mat banao
- TTL indexes: `refreshTokens.expiresAt`, `submissions.expiresAt`
- Unique index add karne se pehle **existing data me duplicates check karo**, warna
  migration fail hogi

## Step 6 — Doc update (usi PR me)

- `.claude/docs/02-ARCHITECTURE.md` §3 — collection/field
- `.claude/docs/02-ARCHITECTURE.md` §3.3 — index list
- `.claude/docs/03-DECISIONS.md` — agar koi design faisla hua to naya `D-xx`
- `.claude/docs/06-OPERATIONS.md` — agar deploy step badla

## Checklist

- [ ] Day-1 reserve test kiya
- [ ] Migration likhi (agar chahiye), `down()` ke saath
- [ ] Idempotent verify kiya — do baar chala ke dekha
- [ ] Bade collection pe batched
- [ ] Index `siteId` first ke saath
- [ ] Unique index se pehle duplicate check
- [ ] Block tree change hai to `content.version` bump + migration registered
- [ ] Zod schema `packages/shared` me update
- [ ] Docs update
- [ ] Staging pe migrate chala ke smoke test kiya

## Kabhi mat karo

- Production pe direct schema change, migration ke bina
- Block `type` string rename
- Migration ko non-idempotent chhodna
- `down()` skip karna — rollback ka koi raasta nahi bachta
- Naya text index banana — ek hi allowed hai
