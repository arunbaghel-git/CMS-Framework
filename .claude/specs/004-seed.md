# 004 — Seed definition

**Status:** 🟡 Draft — approval chahiye
**Phase:** 0
**Blocks:** Phase 0 seed script, Phase 8 `create-cms-site`
**Related:** D-01, D-15, `06-OPERATIONS.md` §6

---

## Problem

Fresh instance kis state me boot hota hai — ye kahin exact define nahi hai. Bina iske
har client thoda alag start karega, aur `create-cms-site` (Phase 8) ka koi reliable
base nahi hoga.

## Scope me hai
- Fresh instance ka exact starting state
- Idempotent seed — dobara chale to duplicate na bane
- `create-cms-site` ke liye base

## Scope me nahi
- Demo content (lorem pages) — client ko khaali site milni chahiye, kachra nahi
- Setup wizard (Phase 7) — wo seed ke **baad** chalta hai

---

## Kya seed hona chahiye

### 1. Roles (5)
[`001-permissions.md`](001-permissions.md) ke mapping se:
`admin` · `editor` · `author` · `contributor` · `subscriber`

### 2. Admin user (1)
Env se — `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`.
Password bcrypt hashed. Pehle login pe password change prompt.

### 3. Settings (1 document)
```
siteName            env se ya "My Site"
tagline             khaali
timezone            env se ya "Asia/Kolkata"
dateFormat          "d MMM yyyy"
searchEngineVisible FALSE          ← staging pe safe default
postsPerPage        10
homepageEntryId     → Home page (niche)
postsPageEntryId    → Blog page (niche)
defaultSeo          khaali
titleTemplates      { page: "%title% | %sitename%", post: "%title% | %sitename%" }
scripts             khaali
```

> `searchEngineVisible: false` **jaan-boojh kar default hai**. Naya instance hamesha
> staging hota hai. Launch pe manually on karna hoga — aur admin banner ise yaad
> dilaata rahega.

### 4. Content types (2, dono `isBuiltIn: true`)
| key | label | hasBuilder | urlPattern | archive |
|---|---|---|---|---|
| `page` | Page | ✅ | `/{slug}` (parent chain ke saath) | ❌ |
| `post` | Post | ❌ | `/{postsPageSlug}/{slug}` | ✅ |

`isBuiltIn` matlab delete nahi ho sakte aur `key` immutable hai.

### 5. Taxonomies (1)
`Uncategorized` category, `isDefault: true` — taaki har post ke paas ek category ho.

### 6. Templates (2 + parts)
- `Default Page` — `isDefault: true` for `page`
- `Single Post` — `isDefault: true` for `post`
- Header aur footer template parts (khaali, theme fill karega)

### 7. Menus (1)
`Primary Navigation` — khaali, `header` location pe assigned.

### 8. Entries (2)
| Title | Type | Slug | Path | Status |
|---|---|---|---|---|
| Home | page | `home` | `/` | published |
| Blog | page | `blog` | `/blog` | published |

Dono ke `content` = `{ version: 1, blocks: [] }`. Home `homepageEntryId` me set,
Blog `postsPageEntryId` me.

> Home ka `path` `/` hai kyunki wo homepage hai — `resolvePath()` me ye special case
> handle hona chahiye.

---

## Idempotency

Seed **dobara chalne pe safe** hona chahiye:
- Har document pe deterministic check (email, key, slug) — exist kare to skip
- `--force` flag se hi overwrite
- Existing data pe kabhi destructive nahi

Command: `pnpm seed` · reset (sirf dev): `pnpm seed --reset`

---

## Acceptance criteria

- [ ] `pnpm seed` fresh DB pe chale, upar ka poora state bane
- [ ] Dobara chale to koi duplicate na bane, koi error na aaye
- [ ] Admin user login kar paaye
- [ ] `/` request Home entry resolve kare
- [ ] `/blog` request Blog entry resolve kare
- [ ] `searchEngineVisible: false` hai aur admin me banner dikhta hai
- [ ] Built-in content types delete nahi ho paate (403)
- [ ] Test: fresh DB → seed → smoke test (login + `/` resolve)
- [ ] Docs: `06-OPERATIONS.md` §6 launch checklist sync

---

## Open questions

1. **Home page me starter blocks daalein?** Abhi khaali `blocks: []` hai. Agar ek simple
   hero + text daal dein to client ko turant kuch dikhega. **Recommendation:** khaali
   rakho — setup wizard (Phase 7) starter content offer karega, seed nahi.

2. **`Contact` page bhi seed karein?** Zyadatar sites pe chahiye hota hai.
   **Recommendation:** nahi — Home aur Blog structural hain (settings unhe point karte
   hain), Contact nahi. Wo wizard ka kaam hai.

3. **`subscriber` role seed karein?** [`001`](001-permissions.md) me open question 2 se
   juda hua. Agency sites pe shayad koi use na kare.

---

## Rejected alternatives

- **Demo content ke saath seed** — client ko khaali site milni chahiye. Demo content
  hata na paana ek common CMS complaint hai.
- **Seed ko migration bana dena** — seed idempotent aur re-runnable hai, migration
  one-time aur ordered. Alag concerns, alag rakhо.
