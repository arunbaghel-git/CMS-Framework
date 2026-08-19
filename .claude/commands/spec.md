---
description: Feature ka spec likho, code se pehle — /spec media usage tracking
argument-hint: <feature ka naam>
---

`$ARGUMENTS` ke liye ek spec banao `.claude/specs/` me.

## Pehle

1. `.claude/specs/_TEMPLATE.md` padho
2. Agla free number nikaalo (`005-`, `006-`…)
3. `.claude/docs/03-DECISIONS.md` aur `02-ARCHITECTURE.md` check karo — ye feature
   kisi existing decision se conflict to nahi karta
4. `05-BUILD-PLAN.md` me dekho ye kis phase ka kaam hai

## Spec me ye zaroor hona chahiye

Template ke saare sections, par khaas taur pe ye teen — inhi ki wajah se spec likha
jaata hai:

**Schema impact** — koi naya field ya collection? Kya wo live data pe baad me add
karna mehnga hoga? Agar haan, to ye **day-1 reserve** candidate hai.

**Acceptance criteria** — checkable statements, "kaam karna chahiye" nahi.
❌ "Trash sahi se kaam kare"
✅ "Delete pe `deletedAt` set ho, entry list se hate, Trash view me dikhe, restore pe
wapas aaye, aur 30 din baad auto-purge ho"

**Kya scope me nahi hai** — explicit likho. Ye spec ka sabse zyada kaam aane wala
section hai, kyunki scope creep yahin rukta hai.

## Iske baad

Spec ka status `Draft` rakho. Mujhe review ke liye bolo — approve hone ke baad hi
implementation shuru hogi.

Bade features pe: spec likhne ke baad `cms-architect` agent se review karwao.
