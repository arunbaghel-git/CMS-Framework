---
description: Naya API module scaffold karo — /new-module taxonomies
argument-hint: <module ka naam>
---

`api-module` agent ko launch karo: `$ARGUMENTS` naam ka naya API module banao.

Agent ko ye context do:

- `apps/api/src/modules/$ARGUMENTS/` me paanch files
- Data model `.claude/docs/02-ARCHITECTURE.md` §3 se lo — invent mat karo
- API surface §9 se lo
- Permission strings `.claude/specs/001-permissions.md` se lo — naye invent mat karo

Agent se **explicitly** confirm karwao:

- [ ] Paanch files: `model.js`, `service.js`, `controller.js`, `routes.js`, `validation.js`
- [ ] Model hooks me sirf pure normalization — koi side effect, koi I/O nahi
- [ ] Content-scoped hai to `siteId` + `deletedAt`
- [ ] Indexes me `siteId` sabse pehle
- [ ] Har query param pe Zod, kuch bhi seedha Mongoose query me spread nahi
- [ ] Har admin route pe `requirePermission()`
- [ ] List endpoint pe server-side pagination
- [ ] Delete = trash, permanent delete alag endpoint
- [ ] Test: service pe unit, route pe integration (happy + auth fail + 409)

Agar module ko koi **naya field ya collection** chahiye jo architecture doc me nahi hai —
ruko, pehle `cms-architect` se poocho. Schema decisions is project me sabse mehngi hain.
