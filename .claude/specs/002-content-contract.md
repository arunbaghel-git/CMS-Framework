# 002 — `entries` + block envelope Zod contract

**Status:** 🔴 Pending
**Phase:** −1 (Phase 1 se pehle zaroori)
**Blocks:** Phase 1 poora, Phase 5 builder, Phase 6 content types
**Related:** D-04, D-05, D-09, `02-ARCHITECTURE.md` §3, §6

---

## Problem

Dono planning docs isse **"step 2"** bolte hain — *"`entries` aur block JSON ka contract
likh ke freeze karo, poora system isi pe khada hai"*. Par contract khud kahin likha nahi
hai.

Bina iske Phase 1 shuru hoga to shape ad-hoc invent hoga — aur wahi cheez hai jiske
khilaaf plan warn karta hai. Baad me badalna sabse mehnga refactor hai.

## Scope me hai
- `entrySchema` — saare fields
- `blockSchema` — **envelope** (block ki list nahi)
- `contentSchema` — `{ version, blocks[] }`
- `seoSchema`
- Enums: status, role, block category
- Ye sab `packages/shared/src/schemas/`

## Scope me nahi
- Block ki **list** — wo Phase 5 me asli client design se nikalegi
- Field DSL ka final shape — wo [005](005-field-dsl.md) me
- contentType fields ka validation — Phase 6

---

## Kya freeze hona hai

### Block envelope — **ye 5 keys kabhi nahi badlenge**
```
{ id, type, props, style: { desktop, tablet, mobile }, children }
```

Naye blocks aate rahenge; envelope wahi rahega. Isi liye ise "envelope" bola hai —
container freeze hai, contents nahi.

### Content shape
```
{ version: 1, blocks: [] }
```

**Phase 1 se hi ye shape** — rich text ko ek `richText` block ke andar. Phase 5 me
migration nahi likhni padegi.

### Entry — saare fields
`02-ARCHITECTURE.md` §3 se lo. Khaas dhyaan in reserved fields pe:
`siteId` · `locale` · `path` · `version` · `deletedAt` · `searchText`

### Status enum
```
draft | pending | published | scheduled | private
```

**`trash` status me nahi hai** — wo alag `deletedAt` timestamp field hai (D-25). Isse
restore pe entry apni purani state me wapas aati hai (published thi to published hi).

---

## Schema impact

| Collection | Change | Day-1 reserve? | Migration? |
|---|---|---|---|
| `entries` | Poora schema define | Haan — sab reserved fields | Nahi (naya) |

Ye migration nahi hai, ye **foundation** hai. Iske baad har change migration maangega.

---

## Acceptance criteria

- [ ] `packages/shared/src/schemas/entry.js` — `entrySchema` complete
- [ ] `packages/shared/src/schemas/block.js` — `blockSchema` (recursive, `children` ke liye)
- [ ] `packages/shared/src/schemas/content.js` — `contentSchema`
- [ ] `packages/shared/src/schemas/seo.js` — `seoSchema`
- [ ] `packages/shared/src/constants/` — status, role, permission enums
- [ ] Recursive block schema actually validate karta hai (nested tree pe test)
- [ ] Admin aur API dono yahi import karte hain — duplicate schema kahin nahi
- [ ] JSDoc typedefs generate hue (`Entry`, `Block`, `BlockDefinition`)
- [ ] Test: valid entry pass, invalid reject, deep-nested block tree validate
- [ ] Docs: `02-ARCHITECTURE.md` §3 se cross-reference

---

## Open questions

**1.** ~~`trash` status hai ya `deletedAt` field?~~ → ✅ **`deletedAt` field** (D-25,
19 Aug 2026). Status ko chhua nahi jaata; restore pe entry purani state me wapas.
Har list query me `deletedAt: null` filter — service layer ka default ho, controller ka nahi.

**2. `content.version` aur block-level version — dono chahiye?**
Abhi sirf `content.version` plan me hai (poore tree ka). Kya kabhi per-block versioning
chahiye hogi? **Recommendation: nahi** — tree-level kaafi hai, aur simpler hai.

**3. `fields` (custom fields) ka validation kahan?**
`fields` Mixed hai (D-21). Zod me `z.record(z.unknown())` rakho, aur asli validation
runtime pe `contentType.fields[]` se. Confirm karna hai.

---

## Rejected alternatives

- **Block list ko bhi abhi freeze karna** — Phase 5 me asli client design se nikalegi.
  Abhi guess karna matlab galat list freeze karna.
- **Har block ka apna Zod schema abhi** — block definitions me `schema[]` hai, wo runtime
  pe validate karega. Do jagah maintain karna drift banayega.
