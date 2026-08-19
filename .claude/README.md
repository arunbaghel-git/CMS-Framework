# `.claude/` — project workspace

Ye folder Claude Code ke liye project ka context aur tooling rakhta hai, aur project
ki poori documentation bhi.

```
.claude/
├─ README.md          ← ye file
├─ settings.json      permissions + env (team ke saath share hota hai)
├─ docs/              PROJECT KI POORI DOCUMENTATION  ← sabse zaroori
├─ specs/             feature specs — code likhne se pehle likhe jaate hain
├─ agents/            specialized subagents
├─ commands/          slash commands (/new-block, /preflight …)
├─ skills/            reusable procedures jo Claude khud load karta hai
└─ memory/            project state + session log
```

Root pe [`CLAUDE.md`](../CLAUDE.md) hai — wo **har session me apne aap load** hota hai
aur baaki sab yahan point karta hai.

---

## Har folder ka kaam

### `docs/` — project documentation
Project ka poora structure, logic aur working. 10 documents, topic-wise.
Index: [`docs/README.md`](docs/README.md)

Sabse zyada kaam ke teen:
- `03-DECISIONS.md` — har faisla + **kyun** + kya reject kiya
- `07-CONVENTIONS.md` — 14 rules jo har PR pe apply hote hain
- `09-OPEN-ITEMS.md` — jo abhi pending hai

`docs/archive/` me purane versions safe hain — kuch delete nahi hua.

### `specs/` — feature specs
Har non-trivial feature ka spec **code se pehle**. Template: `specs/_TEMPLATE.md`.

Kyun: is project me schema decisions sabse mehngi hain. Spec likhne se wo decision
implementation se pehle saamne aa jaata hai, baad me nahi.

### `agents/` — subagents
| Agent | Kab use karo |
|---|---|
| `cms-architect` | Design review, "ye approach sahi hai?" |
| `api-module` | Naya API module scaffold karna |
| `block-author` | Naya block banana |
| `doc-keeper` | Code change ke baad docs sync karna |
| `phase-reviewer` | Phase khatam hone pe done-criteria verify karna |

### `commands/` — slash commands
`/preflight`, `/new-block`, `/new-module`, `/adr`, `/status`

### `skills/` — procedures
Claude in-ko khud load karta hai jab task match kare. Manually `/skill-name` se bhi.

### `memory/` — project state
`project-state.md` — abhi kahan hain, kya chal raha hai.
`decisions-pending.md` — jo faisle abhi khule hain.

> Note: Claude Code ki **auto-loaded** memory root wali `CLAUDE.md` hai. Ye folder
> uska supplement hai — lambi state jo `CLAUDE.md` me nahi samati.

---

## Naye developer ke liye order

```
1. CLAUDE.md                      (root)         5 min
2. .claude/docs/README.md                        2 min
3. .claude/docs/01-OVERVIEW.md                  10 min
4. .claude/docs/03-DECISIONS.md                 20 min   ← "kyun" ke jawab
5. .claude/docs/07-CONVENTIONS.md               10 min   ← code likhne se pehle
6. .claude/docs/admin-wireframe.html            5 min    ← browser me kholo
```

Baaki docs reference hain — zaroorat pe padho.
