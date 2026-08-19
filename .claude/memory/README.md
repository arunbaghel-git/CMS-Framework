# `memory/`

Project ki chalti hui state — jo `CLAUDE.md` me nahi samati.

| File | Kya |
|---|---|
| [`project-state.md`](project-state.md) | Abhi kahan hain, blockers, timeline. **Har session me padho** |
| [`session-log.md`](session-log.md) | Kya kaam hua, kab. Append-only |

---

## Ye aur `CLAUDE.md` me farak

| | Auto-load hota hai? | Kya rakhna hai |
|---|---|---|
| Root `CLAUDE.md` | ✅ har session | Stable cheezein — rules, stack, conventions |
| `.claude/memory/` | ❌ manually padho | Badalne wali cheezein — state, progress, log |

`CLAUDE.md` me changing state mat daalo — wo har session me load hota hai aur stale
hone pe sabse zyada nuksaan wahin hota hai.

---

## Kab update karna

**`project-state.md`** — jab bhi:
- Phase badle
- Koi blocker resolve ho ya naya mile
- Koi decision liya jaaye
- Repo structure badle

**`session-log.md`** — har kaam wale session ke baad, ek entry.

---

## Rule

Yahan koi **decision** mat likho. Decisions ki jagah
[`../docs/03-DECISIONS.md`](../docs/03-DECISIONS.md) hai — wahan `D-xx` format me.
Yahan sirf ye likho ki **kya hua**, na ki **kya tay hua**.
