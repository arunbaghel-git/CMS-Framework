---
description: Naya architectural decision record likho — /adr media ko CDN se serve karna
argument-hint: <decision ka ek line summary>
---

`$ARGUMENTS` ke liye ek decision record banao `.claude/docs/03-DECISIONS.md` me.

## Pehle

1. Poori `03-DECISIONS.md` padho — dekho koi existing `D-xx` isse **conflict** to nahi
   karta ya isse cover to nahi hota
2. Agar conflict hai — mujhse poocho ki purani decision supersede karni hai ya nahi.
   Chupchaap dono mat rakho
3. Agla free number nikaalo (`D-24`, `D-25`…)

## Format

```markdown
## D-xx · <ek line ka faisla>

**Context:** <kya sawaal tha, kis situation me aaya>

**Decision:** <kya tay hua — saaf aur specific>

**Kyun:** <asli reason. "cleaner lagta hai" reason nahi hai. Agar koi hard technical
limit hai to wo likho>

**Reject kiya:** <kya consider karke chhoda, aur har ek kyun chhoda>

**Nateeja:** <iske kaaran aur kya karna padta hai — naya field, migration, naya rule>
```

## Iske baad

- Agar rule bana hai → `07-CONVENTIONS.md` me add karo, aur zaroori ho to root
  `CLAUDE.md` me bhi
- Agar schema badla → `02-ARCHITECTURE.md` §3
- Agar naya risk khula → `08-RISKS.md` traps table
- Agar ye koi open item close karta hai → `09-OPEN-ITEMS.md` se hatao

Reasoning poora likho. Ye doc ki asli value 6 mahine baad hai, aaj nahi.
