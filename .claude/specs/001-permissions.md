# 001 — Permission strings

**Status:** 🟡 Draft — approval chahiye
**Phase:** 0
**Blocks:** `requirePermission()` middleware, `Role` model, seed script
**Related:** D-18 (statuses), `02-ARCHITECTURE.md` §8.3

---

## Problem

Dono planning docs kehte hain *"permission strings ki list abhi likh lo"* — par list
kahin likhi nahi hai. RBAC retrofit karna sabse mehnga refactor hai (docs khud ye
kehte hain), isliye ye list Phase 0 ke code se pehle freeze honi chahiye.

**Rule:** aage sirf **add** karoge, remove nahi. Isliye ab thoda zyada soch lo.

## Scope me hai
- Har resource ke liye permission strings
- 5 default roles ka permission mapping
- Naming convention

## Scope me nahi
- Custom role builder UI (Phase 7)
- Per-entry / per-field permissions (kabhi nahi — over-engineering)

---

## Naming convention

```
<resource>.<action>              entry.publish
<resource>.<action>.own          entry.publish.own      ← sirf apna content
<resource>.<sub>.<action>        settings.scripts.update ← privilege boundary
```

---

## Proposed list

### Content
```
entry.read
entry.create
entry.update
entry.update.own
entry.delete              trash me daalna
entry.delete.own
entry.purge               permanent delete (Trash ke andar se)
entry.publish
entry.publish.own
entry.unpublish
entry.restore             trash se wapas
entry.submitReview        contributor ka "done, review karo"
entry.duplicate
entry.revision.read
entry.revision.restore
```

### Taxonomy
```
taxonomy.read · taxonomy.create · taxonomy.update · taxonomy.delete
```

### Media
```
media.read · media.upload · media.update · media.delete
media.purge · media.restore · media.edit          crop/rotate/replace
```

### Appearance
```
menu.read · menu.update
template.read · template.create · template.update · template.delete
pattern.read · pattern.create · pattern.update · pattern.delete
theme.update                                       design tokens / site style
```

### Structure
```
contentType.read · contentType.create · contentType.update · contentType.delete
```

### SEO
```
seo.read · seo.update
redirect.read · redirect.create · redirect.update · redirect.delete
```

### Forms
```
form.read · form.create · form.update · form.delete
submission.read · submission.delete · submission.export
```

### Settings
```
settings.read
settings.update
settings.scripts.update      ← ADMIN-ONLY, privilege boundary (D — CSP section)
```

> `settings.scripts.update` alag isliye hai ki `<script>` inject karne wala user admin
> ke browser me code chala sakta hai — matlab role escalation. Ye settings field nahi,
> security boundary hai.

### Users
```
user.read · user.invite · user.update · user.deactivate
role.read · role.update
```

### Tools
```
tools.export · tools.import
activity.read
```

---

## Role mapping

| Permission group | admin | editor | author | contributor | subscriber |
|---|:---:|:---:|:---:|:---:|:---:|
| `entry.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `entry.create` | ✅ | ✅ | ✅ | ✅ | — |
| `entry.update` | ✅ | ✅ | — | — | — |
| `entry.update.own` | ✅ | ✅ | ✅ | ✅ | — |
| `entry.publish` | ✅ | ✅ | — | — | — |
| `entry.publish.own` | ✅ | ✅ | ✅ | — | — |
| `entry.submitReview` | ✅ | ✅ | ✅ | ✅ | — |
| `entry.delete` | ✅ | ✅ | — | — | — |
| `entry.delete.own` | ✅ | ✅ | ✅ | ✅ | — |
| `entry.purge` | ✅ | ✅ | — | — | — |
| `taxonomy.*` | ✅ | ✅ | read | read | read |
| `media.upload` | ✅ | ✅ | ✅ | ✅ | — |
| `media.delete` | ✅ | ✅ | — | — | — |
| `menu.*` `template.*` `pattern.*` `theme.*` | ✅ | ✅ | — | — | — |
| `contentType.*` | ✅ | — | — | — | — |
| `seo.*` `redirect.*` | ✅ | ✅ | — | — | — |
| `form.*` | ✅ | ✅ | — | — | — |
| `submission.read` | ✅ | ✅ | — | — | — |
| `settings.update` | ✅ | — | — | — | — |
| **`settings.scripts.update`** | ✅ | — | — | — | — |
| `user.*` `role.*` | ✅ | — | — | — | — |
| `tools.*` | ✅ | — | — | — | — |
| `activity.read` | ✅ | ✅ | — | — | — |

**`contributor` ka poora rasta:** create → update.own → submitReview → (editor publish
karta hai). Iske bina `pending` status ka koi matlab nahi.

---

## Implementation notes

- Role → permissions[] mapping **DB me** (`roles` collection), code me hardcode nahi —
  taaki custom role banana Phase 7 me aasaan ho
- `.own` check service layer me — `entry.authorId === user._id`
- Permission constants `packages/shared/src/constants/permissions.js` me
- Seed script default 5 roles banaye is mapping se

---

## Acceptance criteria

- [ ] Saare permission strings `packages/shared` me constants ke roop me
- [ ] `requirePermission()` middleware string leta hai, 403 deta hai
- [ ] `.own` variant service layer me authorId check karta hai
- [ ] 5 default roles seed hote hain is mapping ke saath
- [ ] Test: har role ka ek restricted route pe 403
- [ ] Test: `contributor` publish nahi kar paata par submitReview kar paata hai
- [ ] Docs: `02-ARCHITECTURE.md` §8.3 me link

---

## Open questions

1. **`entry.purge` editor ko dena chahiye?** Abhi ✅ diya hai. Agar client ka data
   permanently delete karna sirf admin ka kaam hona chahiye, to hatao.
2. **`subscriber` role chahiye bhi?** Agency sites pe shayad koi use na kare. Rakhna
   sasta hai, par seed me default banana zaroori nahi.
3. **Per-content-type permissions** (jaise "editor sirf Posts publish kare, Pages nahi")
   — abhi scope me nahi. Kabhi chahiye to `entry.publish:post` shape me extend hoga.

---

## Rejected alternatives

- **Sirf role-based checks** (`if (user.role === 'admin')`) — custom roles kabhi
  possible nahi hote, aur permission logic poore codebase me bikhar jaata hai
- **Per-entry ACL** — over-engineering. Agency CMS me kabhi zaroorat nahi padi
