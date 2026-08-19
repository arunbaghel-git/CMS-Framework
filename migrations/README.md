# Migrations

Do alag system hain — detail `.claude/docs/06-OPERATIONS.md` §3 me.

## Schema / data migrations (yahan)

```
001-initial-seed.js
002-add-path-field.js
```

| Rule | |
|---|---|
| Kab chalti hain | Deploy step pe, app boot se **pehle** |
| Record kahan | `migrations` collection — `name`, `appliedAt`, `checksum` |
| Order | Numbered, strictly sequential, gaps nahi |
| Idempotent | Dobara chale to kuch na bigde |
| Reversible | Har migration me `down()` — rollback ke bina koi raasta nahi bachta |
| Bade collections | Cursor + batch, poora `updateMany` nahi |

```bash
pnpm cms migrate
pnpm cms migrate:status
```

## Block-tree migrations (`blocks/`)

Ye alag isliye hain ki **ek page ka `content.version` v1 pe ho sakta hai jab site v4
pe hai** — wo page do saal se edit hi nahi hua.

| Rule | |
|---|---|
| Kab chalti hain | Read pe **lazily**, aur background batch job se |
| Scope | Per-document, per-version |
| Idempotent | Zaroori — ek document pe kai baar chal sakti hai |

> Block ka `type` string kabhi rename mat karo (R4) — wo DB me stored data hai.
> Rename chahiye to yahan migration me map karo.
