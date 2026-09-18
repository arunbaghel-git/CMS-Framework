---
description: Project abhi kahan hai — phase, pending blockers, aur agla kadam
---

Project ka current status batao. Ye karo:

1. `.claude/memory/project-state.md` padho — declared state
2. `.claude/docs/09-OPEN-ITEMS.md` padho — pending blockers
3. Repo me **actually** kya hai check karo:
   - `apps/` aur `packages/` exist karte hain?
   - `package.json` hai? Workspaces set hain?
   - Git repo hai? Kitne commits?
   - `pnpm test` chalta hai?

Phir declared state aur actual state **compare** karo. Agar mismatch ho to wo sabse
pehle batao.

Output:

```
PHASE      : <kaunsa phase, kitna % poora>
LAST WORK  : <memory se>

BLOCKERS   : <09-OPEN-ITEMS se, sirf jo abhi bhi khule hain>
  A-1  permission list        — blocks Phase 0 RBAC
  ...

AAJ HO SAKTA HAI
  <jo kaam kisi blocker pe depend nahi karta>

AGLA KADAM
  1. <concrete>
```

Sirf wahi blockers dikhao jo abhi bhi khule hain — jo resolve ho chuke unhe hatao
(aur `09-OPEN-ITEMS.md` update karne ko bolo).
