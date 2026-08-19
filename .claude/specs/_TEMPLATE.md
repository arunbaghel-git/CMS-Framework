# NNN — <Feature ka naam>

**Status:** 🔴 Pending | 🟡 Draft | 🟢 Approved | ✅ Implemented
**Phase:** <kaunsa phase — 05-BUILD-PLAN.md se>
**Blocks:** <iske bina kya nahi ho sakta>
**Related:** <D-xx decisions, doc sections>

---

## Problem

<Kya solve kar rahe hain. 3-4 line. "User X ye karna chahta hai par abhi nahi kar
paata kyunki…">

## Scope me kya hai

- <specific, checkable>
- <specific, checkable>

## Scope me kya NAHI hai

- <explicit — ye section sabse zyada kaam aata hai, scope creep yahin rukta hai>
- <explicit>

---

## Schema impact

> Sabse zaroori section. `.claude/skills/schema-change/SKILL.md` ka day-1 reserve
> test yahan chalao.

| Collection | Change                            | Day-1 reserve?   | Migration? |
| ---------- | --------------------------------- | ---------------- | ---------- |
| `<name>`   | <naya field / index / collection> | haan/nahi + kyun | haan/nahi  |

**Indexes:**

```
<naye ya badle hue indexes>
```

---

## API

```
<naye ya badle hue endpoints, method + path>
```

**Permissions:** `<resource.action>` — naya hai to 001-permissions.md me add karo

**Errors:**
| Code | Kab |
|---|---|
| `400` | |
| `409` | |

---

## Admin UI

<Kaunsi screen, kahan fit hoti hai. Nav change hai to 04-ADMIN-UX.md bhi update hoga.>

---

## Cache impact

<Public site pe dikhta hai? To kaunse tags, aur dependency map me kya add hoga.
`.claude/skills/cache-invalidation/SKILL.md` dekho.>

---

## Acceptance criteria

> Checkable statements, "kaam karna chahiye" nahi.

- [ ] <specific behaviour, verify ho sake>
- [ ] <specific behaviour>
- [ ] Test: <kaunsa level — unit / integration / e2e>
- [ ] Docs updated: <kaunsi files>

---

## Open questions

- <jo abhi tay nahi hua — approve karne se pehle inka jawab chahiye>

---

## Rejected alternatives

<Kya consider karke chhoda aur kyun. Ye 6 mahine baad kaam aata hai.>
