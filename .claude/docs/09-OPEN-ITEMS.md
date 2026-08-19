# 09 — Open Items

**Ye aaj ka kaam hai.** Jo abhi decide ya likha nahi gaya, aur jo Phase 0 se pehle
chahiye.

**Status:** Planning complete. Code shuru nahi hua.
**Blocker count:** 4 artifacts + 1 design question + 2 decisions.

---

## A · Likhne wale artifacts (~1 din)

Ye docs me **reference** hote hain par exist nahi karte. Har ek kisi na kisi cheez ko
block kar raha hai.

### A-1 · Permission string list
**Blocks:** Phase 0 ka `requirePermission()`
**Kyun urgent:** RBAC retrofit karna sabse mehnga refactor hai — dono docs ye khud
kehte hain. Abhi list "likh lo" ek to-do hai jo khud ki taraf point kar raha hai.

Shape:
```
entry.create · entry.read · entry.update · entry.update.own
entry.delete · entry.publish · entry.publish.own · entry.restore
media.upload · media.update · media.delete
taxonomy.* · menu.* · template.* · pattern.* · contentType.*
settings.update · settings.scripts.update      ← ye alag hai (privilege boundary)
user.invite · user.update · user.deactivate · role.update
tools.export · tools.import · activity.read
```
Aage sirf **add** karoge, remove nahi. Isliye ab thoda zyada soch lo.

---

### A-2 · `entries` + block envelope ka Zod contract
**Blocks:** Phase 1 poora
**Kyun urgent:** dono docs isse "step 2" bolte hain, par contract khud kahin likha nahi
hai. Bina iske Phase 1 shuru hoga to shape ad-hoc invent hoga — wahi cheez jiske khilaaf
plan warn karta hai.

Kya freeze karna hai:
- `entrySchema` — saare fields, incl. `path`, `locale`, `version`, `deletedAt`, `searchText`
- `blockSchema` — **envelope** `{ id, type, props, style, children }` (block ki *list* nahi)
- `contentSchema` — `{ version: 1, blocks: [] }`
- `seoSchema`
- Status enum, role enum, permission enum

Jagah: `packages/shared/src/schemas/`

---

### A-3 · Environment schema
**Blocks:** Phase 0 ka boot, aur D-15 ka client-repo contract
**Kyun urgent:** ye core aur client repo ke beech ka interface hai. Bina define kiye
`.env` 6 mahine me jo bhi accumulate ho gaya wahi ban jaayega.

Draft [`06-OPERATIONS.md`](06-OPERATIONS.md) §4 me hai — usse finalize karo aur boot pe
Zod validation lagao (missing var pe app start hi na ho).

---

### A-4 · Seed definition
**Blocks:** Phase 0 ka seed script, aur Phase 8 ka `create-cms-site`
**Kyun urgent:** fresh instance kis state me boot hota hai — ye exact hona chahiye,
warna har client thoda alag start karega.

Kya seed hona chahiye:
- Admin user (env se credentials)
- 5 roles + unke permissions
- Default settings (siteName, timezone, `searchEngineVisible: false`)
- Default template + header/footer template parts
- "Uncategorized" category
- Home page (published) + `settings.homepageEntryId` set
- Content types: `page` (hasBuilder: true), `post` (hasBuilder: false) — dono `isBuiltIn`

---

## B · Design question (~1 ghanta)

### B-1 · Kya `contentTypes.fields[]` aur `blockDefinition.schema[]` ek hi DSL hain?

**Problem:** dono docs me alag-alag define hue hain aur kabhi connect nahi kiye gaye.
Overlap lagbhag aadha hai:

| Field type | contentType | block schema |
|---|---|---|
| text, textarea, number, select, boolean/toggle, media | ✅ | ✅ |
| richText, date, relation, repeater | ✅ | ❌ |
| color, slider, link, align, spacing | ❌ | ✅ |

**Agar ek DSL:** ek field renderer likhoge jo **dono** jagah kaam karega — entry editor
(Phase 6) aur block properties panel (Phase 5c). Phase 6 ka ek accha khaasa hissa
gayab ho jaata hai.

**Agar do:** wahi cheez do baar banegi aur waqt ke saath drift karegi.

**Recommendation:** **ek DSL**, per-context allowed-types list ke saath. Rehna chahiye
`packages/shared` me — matlab ye Phase 0 ka faisla hai, Phase 5 ka nahi.

---

## C · Khule faisle (reversible sirf abhi)

### C-1 · `packages/shared` + `packages/blocks` TypeScript me?
**Deadline:** Phase 0 se pehle

Ye do packages **har app** import karta hai. Aur Zod schemas to waise bhi likh rahe ho —
`z.infer` se types **free** milte hain. App code JS reh sakta hai.

**Faisla lene ka tareeka:** ek chhota spike — `entrySchema` TS me likho, `z.infer` se
type nikaalo, dekho editor experience kitna behtar hua. 2 ghante.

Poora reasoning: [`03-DECISIONS.md`](03-DECISIONS.md) D-03

---

### C-2 · Payload CMS ka 2-din spike
**Deadline:** Phase 1 se pehle (Phase 1 land hote hi window band)

Phase 0, 1, 2, 4 aur Phase 6 ka bada hissa solved problems hain. Payload CMS 3
MIT-licensed hai, Next.js-native, MongoDB support karta hai, aur auth + RBAC +
drafts/versions + blocks field + config-driven admin UI deta hai — motay taur pe
**8-10 hafte ka kaam**.

Aapka asli differentiator **visual page builder** hai, jo Payload nahi deta.

**Ye adopt karne ki salah nahi hai.** Control, licensing aur lock-in asli counter-arguments
hain. Par ek quarter commit karne se pehle 2 din ka throwaway spike sasti insurance hai.
Uski current state khud verify karo — ye space tezi se badalta hai.

---

## D · Ek structural suggestion

### D-1 · Vertical slice ko ek asli milestone banao
Abhi ye [`05-BUILD-PLAN.md`](05-BUILD-PLAN.md) ke end me **salah** hai. Agar isse agree
karte ho to ise definition-of-done ke saath ek milestone banao — kyunki ye Phase 0-3 ke
andar ka kaam reorder karta hai.

**Slice ka scope:** ek content type (page) · do block (section, heading) · ek template ·
ek page live, publish se lekar public URL tak.

**Kya prove karta hai:** preview parity aur cache invalidation — dono sabse risky
design, aur dono tab test ho jaate hain jab badalna abhi sasta hai.

---

## Is hafte ka order

```
1. A-1, A-3, A-4 likho                    (aadha din, teenon)
2. B-1 settle karo                        (1 ghanta)
3. C-1 ka faisla lo                       (2 ghante ka spike)
4. A-2 — Zod contract likho aur freeze    (aadha din)
5. C-2 — Payload spike, parallel me       (2 din, agar koi aur available ho)
6. Phase 0 shuru
```

---

## Housekeeping

- Folder abhi **git repo nahi hai**. `git init` karo Phase 0 se pehle — `docs/archive/`
  ki zaroorat hi khatam ho jaayegi, aur history git me hogi.
- `docs/archive/v1/` aur `docs/archive/v2-monolithic/` purane versions hain. Reference
  ke liye rakhe hain; git init ke baad delete kar sakte ho.
