# Specs

Har non-trivial feature ka spec **code likhne se pehle**.

Kyun: is project me schema decisions sabse mehngi hain (15 instances, live client data).
Spec likhne se wo decision implementation se pehle saamne aa jaata hai, baad me nahi.

## Status

| #                              | Spec                                    | Status                                      | Blocks        |
| ------------------------------ | --------------------------------------- | ------------------------------------------- | ------------- |
| [001](001-permissions.md)      | Permission strings                      | 🟢 **Approved** — 4 roles, purge admin-only | —             |
| [002](002-content-contract.md) | `entries` + block envelope Zod contract | ✅ **Implemented**                          | —             |
| [003](003-env-schema.md)       | Environment schema                      | 🟢 **Approved**                             | —             |
| [004](004-seed.md)             | Seed definition                         | 🟢 **Approved** — khaali Home + Blog        | —             |
| [005](005-field-dsl.md)        | Field DSL                               | 🟢 **Approved** — Option A (ek DSL)         | —             |
| [006](006-menu-contract.md)    | Menu data contract (Slice 0)            | 🟢 **Approved** — D-43, mega Columns→Groups | Slice 0       |
| [007](007-packages.md)         | Packages — content core + 10 submenus   | 🟡 **Draft** — client ke saath 26 Aug       | Packages      |
| [008](008-blog.md)             | Blog — post detail + blog listing page  | 🟡 **Draft** — client ke saath 9 Sep        | Blog (A-9)    |

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
