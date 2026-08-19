---
description: Phase shuru karne se pehle ya khatam hone pe gate check — /preflight 1
argument-hint: <phase number> [done]
---

`phase-reviewer` agent ko launch karo, argument: `$ARGUMENTS`

- Sirf number diya (jaise `/preflight 1`) → **PRE-FLIGHT** mode: kya ye phase shuru
  kar sakte hain?
- `done` ke saath (jaise `/preflight 1 done`) → **DONE CHECK** mode: kya ye phase
  actually complete hai?

Agent ko ye yaad dilao:
- Plan ke checkbox pe bharosa nahi karna — repo me verify karna
- `.claude/docs/08-RISKS.md` ka phase-wise section padhna
- GO / NO-GO / PARTIAL verdict dena, aur missing items ke saath ye batana ki wo kya block kar rahe hain

Agent ka result mujhe seedha report karo — sirf "ho gaya" mat bolna.
