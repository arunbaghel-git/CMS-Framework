# Specs

Har non-trivial feature ka spec **code likhne se pehle**.

Kyun: is project me schema decisions sabse mehngi hain (15 instances, live client data).
Spec likhne se wo decision implementation se pehle saamne aa jaata hai, baad me nahi.

## Status

| # | Spec | Status | Blocks |
|---|---|---|---|
| [001](001-permissions.md) | Permission strings | 🟡 Draft — approval chahiye | Phase 0 RBAC |
| [002](002-content-contract.md) | `entries` + block envelope Zod contract | 🔴 Pending | Phase 1 poora |
| [003](003-env-schema.md) | Environment schema | 🟡 Draft — approval chahiye | Phase 0 boot |
| [004](004-seed.md) | Seed definition | 🟡 Draft — approval chahiye | Phase 0 seed, Phase 8 `create-cms-site` |
| [005](005-field-dsl.md) | Field DSL — ek ya do? | 🔴 **Faisla pending** | `packages/shared`, Phase 5c + 6 |

🔴 Pending · 🟡 Draft · 🟢 Approved · ✅ Implemented

## Naya spec

```
/spec <feature ka naam>
```

Ya manually — `_TEMPLATE.md` copy karke agla number lo.

## Rules

- Spec **approve** hone ke baad hi implementation shuru hoti hai
- Bade features pe `cms-architect` agent se review karwao
- Implement hone ke baad status ✅ karo, spec delete mat karo — wo record hai
- Spec aur `docs/` alag cheezein hain: spec **ek feature** ka contract hai,
  docs **poore system** ka reference hai
