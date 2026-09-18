---
description: Naya page-builder block banao — /new-block testimonial
argument-hint: <block ka naam>
---

`block-author` agent ko launch karo: `$ARGUMENTS` naam ka naya block banao.

Agent ko ye context do:

- Block `packages/blocks/src/blocks/` me jaayega, aur registry me register hoga
- Existing blocks se pattern copy kare
- `.claude/docs/02-ARCHITECTURE.md` §6 ke rules follow kare

Agent se **explicitly** confirm karwao:

- [ ] Koi `next/image` ya `next/link` import nahi — `components` prop se aate hain
- [ ] `schema[]` se poora properties panel ban jaata hai, koi custom panel code nahi
- [ ] `data-block-type` attribute emit hua
- [ ] Responsive values `styleToCss()` se, inline style se nahi
- [ ] `type` string camelCase aur unique

Agar block ko koi **naya field type** chahiye jo `schema[]` me abhi nahi hai — ruko
aur pehle mujhse poocho. Wo DSL change hai, `packages/shared` ko chhoota hai.
