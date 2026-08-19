# 005 — Field DSL: ek ya do?

**Status:** 🟢 Approved — Option A (ek DSL), 19 Aug 2026
**Phase:** 0 (kyunki `packages/shared` me rehta hai)
**Blocks:** Phase 5c (properties panel), Phase 6 (content type builder)
**Related:** D-06, `02-ARCHITECTURE.md` §6.1

---

## Problem

Project me **do field-definition systems** hain, aur dono docs me alag-alag define hue
hain — kabhi connect nahi kiye gaye:

| System                     | Kahan   | Kis liye                      |
| -------------------------- | ------- | ----------------------------- |
| `contentTypes.fields[]`    | Phase 6 | Entry editor ke custom fields |
| `blockDefinition.schema[]` | Phase 5 | Block properties panel        |

Overlap lagbhag aadha hai:

| Field type                                                     | contentType | block schema |
| -------------------------------------------------------------- | :---------: | :----------: |
| `text` `textarea` `number` `select` `boolean`/`toggle` `media` |     ✅      |      ✅      |
| `richText` `date` `relation` `repeater`                        |     ✅      |      ❌      |
| `color` `slider` `link` `align` `spacing`                      |     ❌      |      ✅      |

**Agar ek DSL:** ek field renderer likhoge jo **dono** jagah kaam karega — Phase 6 ka
accha khaasa hissa gayab ho jaata hai.

**Agar do:** wahi cheez do baar banegi aur waqt ke saath drift karegi.

---

## Option A — Ek DSL, per-context allowed list _(recommended)_

```js
// packages/shared/src/field-types.js
export const FIELD_TYPES = {
  text: { component: 'TextField', contexts: ['content', 'block'] },
  textarea: { component: 'TextArea', contexts: ['content', 'block'] },
  number: { component: 'NumberField', contexts: ['content', 'block'] },
  select: { component: 'SelectField', contexts: ['content', 'block'] },
  toggle: { component: 'Toggle', contexts: ['content', 'block'] },
  media: { component: 'MediaPicker', contexts: ['content', 'block'] },

  richText: { component: 'RichText', contexts: ['content'] },
  date: { component: 'DateField', contexts: ['content'] },
  relation: { component: 'RelationField', contexts: ['content'] },
  repeater: { component: 'Repeater', contexts: ['content'] },

  color: { component: 'ColorField', contexts: ['block'] },
  slider: { component: 'Slider', contexts: ['block'] },
  link: { component: 'LinkField', contexts: ['block'] },
  align: { component: 'AlignField', contexts: ['block'] },
  spacing: { component: 'SpacingField', contexts: ['block'] },
}
```

**Fayde**

- Ek field renderer, dono jagah
- Naya field type ek jagah add hota hai
- Phase 6 chhota ho jaata hai
- `packages/shared` me ek hi source of truth

**Nuksaan**

- Ek abstraction jo do consumers ko serve karta hai — thoda coupling
- `responsive: true` sirf block context me matlab rakhta hai

---

## Option B — Do alag DSL

**Fayde**

- Har system apne hisaab se evolve kar sakta hai
- Koi coupling nahi

**Nuksaan**

- Field renderer do baar banega (~aadha Phase 6 ka kaam)
- Naya field type do jagah add karna padega
- Waqt ke saath drift — do jagah `select` thoda alag behave karega
- Do jagah bugs fix karne padenge

---

## Recommendation

**Option A.** Reasons:

1. Overlap already 50% hai — drift ka risk asli hai, theoretical nahi
2. Phase 6 ka estimate 3-4 hafte hai; shared renderer usme se kaafi kaat deta hai
3. Coupling manageable hai — `contexts` array ek simple filter hai, complex abstraction
   nahi
4. Ye faisla `packages/shared` ko chhoota hai, matlab **abhi lena hai** — Phase 5 tak
   ruke to dono systems alag ban chuke honge

---

## Agar Option A choose karein

- [ ] `packages/shared/src/field-types.js` — registry with `contexts`
- [ ] Ek `<FieldRenderer field={} context="block|content" />` component
- [ ] Block `schema[]` aur `contentType.fields[]` dono same shape use karein:
      `{ key, type, label, default, options?, responsive?, validation? }`
- [ ] `responsive: true` sirf `block` context me honour ho
- [ ] Naya field type add karne ka procedure `07-CONVENTIONS.md` me
- [ ] Docs: `02-ARCHITECTURE.md` §6.1 update

---

## Faisla

**Tay hone ki tareekh:** **\_\_\_**
**Chuna gaya:** ☐ Option A · ☐ Option B
**Kisne:** **\_\_\_**

Faisla hone ke baad: `03-DECISIONS.md` me `D-24` banao, aur is spec ka status
🟢 Approved karo.
