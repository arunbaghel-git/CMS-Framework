# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 24 Aug 2026

---

## Abhi kahan hain

**Phase 0 ka approved execution scope poora.** Auth, RBAC, admin shell, Users,
Settings General, Media foundation, aur Settings Logo/Favicon current scope me live hain.
Original Phase 0 ke teen backlog items abhi bhi deferred/non-blocking hain (neeche).

```
Phase −1  Din-1 faisle                    ✅ 8/8
Phase 0   Setup layer                     ✅
          Zod contract (spec 002)         ✅
          Migration runner                ✅
          CSS architecture (D-28)         ✅
          Auth + RBAC                     ✅  ← 20 Aug
          Seed script (spec 004)          🟡  roles + admin user ✅, baaki Phase 1 pe block
          Admin shell (login + sidebar)   ✅  ← 20 Aug
          Users screens                   ✅  ← 20 Aug
          Users menu role-aware + Profile ✅  ← 21 Aug (D-37)
          Settings model + General screen ✅  ← 21 Aug (D-40)
          Media foundation                ✅  ← 21 Aug (D-41, pulled forward)
          Settings Logo/Favicon live      ✅  current approved scope complete
          Docker compose (api + admin)    🟡  deferred, chhota, kuch block nahi
          CSP policy (nonce-based)        🟡  deferred to Phase 4-5
          forgot / reset                  🟡  deferred, SMTP pe block (Phase 2)
Slice 0   Menu contract (spec 006, D-43)    ✅  ← 24 Aug
          menus + menuLocations API         ✅  public read + cache tags
          Appearance: Menus + Footer        ✅  mega builder ke saath
          Public header + footer render     ✅  desktop + mobile, ek hi data
          Revalidate webhook                🟡  code ready, apps/web ki .env baaki (A-5)
          Admin UX iterations (24 Aug)      ✅  drag-drop · accordions · header buttons
          Q-7 (logo fallback)               🔴  client ka faisla
Phase 1+  Content core aur aage           🔴
```

**Health:** 348 tests passing · lint clean · admin build clean · API media/settings
integration clean. Media upload route, SVG rejection, media.upload permission, and
settings logo/favicon ID persistence have focused coverage.

`pnpm format:check` clean hai — pehle wali 9 prettier-dirty files theek ho chuki hain.

---

## 🔒 Design ab SPEC hai — sabse zaroori baat

Client ne **do asli design** diye. Ye ab guess ki jagah le chuke hain:

| File                               | Kya                                        |
| ---------------------------------- | ------------------------------------------ |
| `docs/reference/admin-design.html` | **Admin ka spec.** Isi ke hisaab se banega |
| `docs/11-REFERENCE-ADMIN.md`       | Uska analysis — kya match, kya gap         |
| `docs/10-REFERENCE-DESIGN.md`      | Public site (Andaman) ka analysis          |

**Rule ab likha hua hai — `07-CONVENTIONS.md` R15.** (Pehle ye rule kahin likha hi
nahi tha; docs galti se "rule 8" bolte the, jabki R8 Zod validation hai.)

`04-ADMIN-UX.md` ab **secondary** hai — conflict ho to design jeetega.

---

## Faisle jo ho chuke hain

| Faisla                | Nateeja                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Field DSL             | **Ek DSL** — `contexts: ['content'\|'block']` (D-24)                                              |
| TypeScript            | **Nahi** — sab JavaScript (D-03)                                                                  |
| Trash                 | **`deletedAt` field**, `status: 'trash'` nahi (D-25)                                              |
| Roles                 | **Paanch** — `subscriber` nahi (D-26), `salesAgent` hai (D-29)                                    |
| Permanent delete      | **Sirf admin**                                                                                    |
| Seed content          | **Khaali** Home + Blog                                                                            |
| Payload spike         | Approved — Phase 1 se pehle, abhi baaki                                                           |
| Pehla milestone       | **Slice 0: Header + Footer** (D-27)                                                               |
| **CSS**               | **Plain CSS** — Tailwind, CSS Modules, CSS-in-JS teenon reject (D-28)                             |
| **Ruki hui cheezein** | Connection point abhi, data baad me (D-30)                                                        |
| **Login screen**      | Design me nahi tha → WordPress-style, design ke tokens se (D-31)                                  |
| **Password hashing**  | `bcryptjs` cost 12 — native `bcrypt` nahi (D-32)                                                  |
| **`.env` loading**    | Node ka `process.loadEnvFile()` — `dotenv` nahi (D-33)                                            |
| **Users**             | `username` immutable · asli delete + reassign · admin protected (D-34)                            |
| **Password**          | Sirf admin set karta hai; user khud nahi badal sakta (D-35)                                       |
| **Built-in roles**    | Code-owned — permissions har deploy pe sync hoti hain (D-36)                                      |
| **Users ka menu**     | Role-aware — admin ko 3 item, baaki ko sirf Profile (D-37)                                        |
| **Apna password**     | User Profile se khud badal sakta hai, current password ke saath (D-37)                            |
| **Session ki umr**    | 24 ghante · "Remember me" pe 7 din · dono sliding (D-38)                                          |
| **Role dena**         | Apna role khud nahi · apni permission se upar ka role kisi ko nahi (D-39)                         |
| **Settings**          | Screens design se (Phase 7 se aage khiskin) · Site URL env se, editable nahi (D-40)               |
| **Media**             | Foundation Phase 2 se aage khiski · variant + storage contract frozen · SVG blocked (D-41)        |
| **Logo ka reference** | Media id write pe validate hoti hai · broken `<img>` kabhi nahi · orphan media abhi accept (D-42) |
| **Menu ka contract**  | Typed · mega = Columns→Groups→Links · layout aur columnCount alag · mobile wahi data (D-43)       |
| **className**         | Sirf presentation — behaviour kabhi nahi (R18, D-43)                                              |

Specs 001–006: 001/002/003 ✅ implemented, 004 🟡 aadha, 005 🟢 approved,
**006 ✅ implemented** (menu contract).

**Ek khula sawaal jo Slice 0 ke header ko rokta hai:** logo na mile to uski jagah **kya**
dikhe — `09-OPEN-ITEMS.md` **Q-7**. Wo client ka faisla hai (R15), developer ka nahi.
D-42 sirf itna tay karta hai ki toota hua `<img>` kabhi render nahi hoga.

---

## Auth kaise kaam karta hai (20 Aug me bana)

```
access token   15 min   httpOnly cookie
refresh token  24h/7d  rotation + reuse detection. 7d sirf "Remember me" pe (D-38)
               SLIDING — ghadi inactivity pe chalti hai, login se nahi
CSRF           double-submit, har non-GET pe
permissions    roles collection se, 60s in-process cache
```

**Teen cheezein jo yaad rakhni hain:**

1. **`attachUser` har request pe user DB se laata hai** (role cached hai, user nahi).
   Isliye deactivate kiya gaya user agli hi request pe bahar — 15 min baad nahi.
2. **Reuse detection poori family maar deti hai.** Ek purana refresh token dobara aaya
   = us login session ke saare tokens revoke. Isiliye admin client me **single-flight
   refresh mutex** hai (`lib/api.js`) — bina uske 5 parallel 401 se 5 refresh chalte
   aur user bewajah logout ho jaata.
3. **`mustChangePassword` ek gate hai, banner nahi.** Seed ka admin `.env` wale plain
   text password se aata hai; jab tak wo na badle, andar jaane dena us password ko
   zinda rakhna hai.

---

## 21 Aug ko kya bana (D-37)

**Users ka menu ab role ke hisaab se badalta hai, aur Profile screen ban gayi.**

```
apps/admin/src/lib/nav.js            nav registry — sidebar AUR route guard dono isse
apps/admin/src/screens/Profile.jsx   naam + password
apps/admin/src/screens/NoAccess.jsx  permission na ho to yahi
```

**Teen cheezein jo yaad rakhni hain:**

1. **`nav.js` ab ek contract hai, sirf ek list nahi** (R16). `NAV` sidebar deta hai,
   `ROUTE_GUARDS` route ka permission. Naya section jodte waqt **wahi ek file** kholni
   hai. Do jagah rakhne ka nateeja chup-chaap hota hai: item menu se gayab, par URL
   type karne pe screen khul jaati hai.
2. **`/profile` jaan-boojh kar `/users/` ke andar nahi hai.** Guard ka natural shape
   `/users` pe `user.read` maangna hai; profile ko uske andar rakhne se ek exception
   banana padta, aur wahi exception aage toot-ta.
3. **Password badalne pe purane saare session marte hain par turant naya mil jaata
   hai.** Pehle service sirf `revokeAllSessions()` chalati thi — us se user apna hi
   password badal kar logout ho jaata. Iska test hai:
   _"jis browser se badla wo chalta rehta hai"_.

**Client ne test kiya aur ek asli bug pakda (D-38).** "Remember me" off hone ke bawajood
password badalne ke baad browser band karke kholo to Dashboard khul jaata tha. Wajah:
`setAuthCookies()` ko refresh aur change-password dono **hardcoded `persistent: true`**
bhejte the. Ab `remember` `refreshTokens` record me hai aur rotation ke saath chalta hai.
Saath me TTL 7d se **24h** hui, aur "Remember me" wale ko alag **7d** milta hai.

> Ye bug D-37 se nahi aaya — refresh me pehle se tha, yaani "Remember me" pehle
> auto-refresh ke baad hi bemaani ho jaata tha. Password wale raaste me wahi pattern
> copy hua isliye dikh gaya.

**`ChangePassword.jsx` (forced flow) bhi badla:** ab wo `logout()` nahi, `reload()`
karta hai. Seed wala admin password badal kar seedha andar chala jaata hai.

**Permission ke abhi bhi teen layer hain, par sirf Users pe:** baaki menu items pe
`permission` jaan-boojh kar nahi lagayi — client ne abhi sirf Users ka shape maanga hai,
aur design frozen hai (R15). Wo tab lagegi jab wo screens banengi.

---

## Media foundation aur General Logo/Favicon — complete for current scope

**Media Phase 2 ka poora scope nahi bana.** Sirf foundation pull-forward hui, kyunki Logo
General Settings aur Slice 0 header dono ko block kar raha tha.

```
media collection + indexes (migration 006)
storage driver abstraction     local abhi, s3 ka interface taiyaar
upload hardening               magic-byte check · size cap · filename sanitize
                               sharp pixel limit (decompression bomb)
sharp variants + webp          "original kabhi serve mat karo"
Settings me Logo/Favicon       clickable drop zone upload · saved preview · replace/remove
                               logoMediaId/faviconMediaId settings me persist
Local media preview            API serves local `/uploads` from resolved UPLOAD_DIR
                               Vite dev proxies `/uploads` to API
```

Stored media URLs stay relative (`/uploads/...`); never store `localhost:4000` or any
other dev hostname in `media.variants[].url`.

**Baad me (Phase 2 me hi):** library grid · folders · media trash · `mediaRefs` usage ·
crop/rotate · replace · MediaPicker modal · S3 driver ka asli implementation.
Settings ke Logo/Favicon bhi tab MediaPicker use karenge; abhi direct upload current
scope ka live path hai, alag final picker UX nahi.

**Favicon-specific dimension validation deferred:** UI hint `512x512` bolta hai, par
backend abhi generic image validation karta hai. Ye current General completion ka blocker
nahi; Phase 2 Media validation/picker work me aayega.

**Delete jaan-boojh kar nahi banana.** `mediaRefs` ke bina delete = live page pe toota
hua image (08-RISKS ka documented trap). Delete hi na ho to wo trap lag hi nahi sakta.

### Ye order kyun

Logo **do jagah** ka blocker hai — General ka field, aur **Slice 0 ka header** (D-27 ke
scope me "logo" likha hai). Isliye Media pehle.

Aur Settings pe koi alag "logo upload" **mat banana**: usse do upload raaste ban jaate
hain aur logo `media` collection se bahar reh jaata — na usage tracking, na variants,
aur Phase 2 me use andar laane ke liye migration likhni padti. Foundation ke saath logo
pehle din se `media` me hi rehta hai; picker aane pe Settings ka field sirf "upload" se
"choose or upload" ban jaayega.

**SVG policy ab current scope me resolved hai:** SVG upload blocked by default. Sanitized
SVG support can be revisited in later Media work, but current General completion does not
depend on it.

### Ab official next task

**Slice 0 — Header + Footer end-to-end (D-27).** 24 Aug ko bana — spec 006 + D-43 ke
hisaab se. Neeche "24 Aug ko kya bana" dekho.

---

**Users me chhota-mota baaki:** bulk actions (isiliye list me checkbox column nahi hai),
email badalna (SMTP), avatar (Phase 2). Column sorting **ban chuki** hai.
**Activity log defer ho chuka hai** — client ke design me hai hi nahi (Q-4).

**Har section kitna ruka hua hai:**

| Section    | Abhi kitna ban sakta hai | Kya rok raha hai                                                    |
| ---------- | ------------------------ | ------------------------------------------------------------------- |
| Users      | ~95%                     | Posts/Enquiries count (Phase 1, 7b) · invite email (SMTP)           |
| Settings   | 100% current scope       | MediaPicker/fav icon dimensions later · Reading/Permalinks Phase 1+ |
| Appearance | ~40%                     | Menu me Pages/Destinations chahiye (Phase 1 + 6)                    |

---

## 24 Aug ko kya bana — Slice 0 (D-43, spec 006)

**Menu ka contract pehle freeze hua, phir code.** D-41 wala sabak yahi tha.

```
packages/shared/src/schemas/menu.js                poora typed contract + toPublicMenu
packages/shared/src/constants/theme-locations.js   theme ki declared locations
migrations/007-menus.js                            menus + menuLocations + indexes
apps/api/src/modules/menus/                        5-file module (dono collections)
apps/api/src/modules/public/                       /api/public/settings + /menus/:location
apps/api/src/core/revalidate.js                    tag-based invalidation (D-14)
apps/admin/src/screens/appearance/                 Menus (mega builder + header CTA) · Footer
apps/web/components/                               SiteHeader · SiteFooter · MobileNav
apps/web/app/api/revalidate/route.js               webhook, shared secret ke saath
```

**Chhe cheezein jo yaad rakhni hain:**

1. **`mega.columnCount` (number) aur `mega.columns[]` do alag fields hain.** Spec me
   dono ko `columns` likha tha — padhne me ambiguous tha. Validator dono ka barabar hona
   enforce karta hai, aur admin ka builder bhi wahi karta hai.
2. **`layout` × `columnCount` ek validation hai, hint nahi.** `MIN_COLUMN_WIDTH = 160px`
   se derived: `sm`→2 · `md`→2,3,4 · `full`/`wide`→2..6. **Ek hi function**
   (`allowedColumnCounts`) server aur builder dono use karte hain — do jagah rakhne se wo
   ek din alag ho jaate.
3. **`leafItemSchema` pe `.strict()` zaroori tha.** Zod default me anjaan keys chup-chaap
   **hata deta hai** — uske bina depth-4 ka `children` bina error ke gaayab ho jaata: admin
   Save karta, "ho gaya" dikhta, aur uske items kahin nahi hote. Test ne pakda.
4. **Cache invalidation menu se nahi, uske assignments se hoti hai.**
   `cache-invalidation` skill `menu.location` padh rahi thi — par location menu pe hai hi
   nahi, aur ek menu **kai** locations pe ho sakta hai. Skill ka map bhi theek kiya.
5. **`entries` module hai hi nahi**, isliye menu item abhi sirf **custom URL** ho sakta hai.
   `entry`/`taxonomy` schema me hain par write pe reject hote hain — Phase 1 me
   `SUPPORTED_LINK_TYPES` ki ek line badlegi, schema nahi (D-30).

\
6. **`apps/web` ko `/uploads/*` ka rewrite chahiye tha.** `media.variants[].url` relative
hoti hai (`/uploads/...`) — jaan-boojh kar, taaki dev hostname DB me na baithe. Par
Next uske liye koi proxy nahi rakhta tha, to header ka logo browser me **404** deta tha.
Admin me yahi kaam Vite ka dev proxy karta hai. **Sabak:** D-42 §2 ka "toota `<img>` kabhi
nahi" sirf data ka invariant nahi hai — wo delivery layer pe bhi toot sakta hai, aur
payload dekh kar wo pata nahi chalta.

**Uske baad client ke saath 8 iterations hue (usi din):**

1. **Appearance sirf Menus + Footer** — Homepage Blocks aur Banners & Sliders hataye (R15 se
   jaan-boojh kar vichlan, `nav.js` me likha hai). Ek "Header" tab maine bina poochhe banaya
   tha — wo ab **poora delete** ho chuka hai.
2. **Logo header me nahi aa raha tha** — `apps/web/next.config.js` me `/uploads/*` ka rewrite
   chhoot gaya tha. Media URLs relative hoti hain (D-41), to serve karne ka kaam web ka tha.
   **Sabak:** D-42 §2 ka "toota `<img>` kabhi nahi" **delivery layer pe bhi** toot sakta hai —
   payload bilkul sahi tha.
3. **`wide`/`full` mega dikhte hi nahi the** — `.hdr__top` pe `position: relative` chhoot gaya tha.
   Un layouts me `<li>` `static` hota hai, to panel initial containing block pe gir jaata aur
   `top: 100%` ka matlab "poori viewport height" ban jaata. `sm`/`md` isse bach gaye the.
4. **Admin ke columns ulte chaude the** — `.appearance-grid` ki specificity `.edit-grid` ke
   barabar thi, to jeet CSS load order se tay ho rahi thi. Ab `.edit-grid.appearance-grid`.
5. **↑↓ buttons → drag-drop har level pe** (Q-C revised). Native HTML5 DnD, koi library nahi;
   handle pe ↑/↓ keyboard bhi. Saath me `blank*()` helpers ab client-side `id` dete hain —
   index-key + drag milkar collapse state galat row pe chipka dete the.
6. **Columns aur groups ab collapsible** — default band, naya bana hua khud khulta hai.
7. **"Link type" dropdown hataya** — wo hamesha disabled tha aur kisi state se bind nahi tha.
   Data ka `link.type` field **zinda hai**; Phase 1 me wahan asli control banega.
8. **Header CTA → `headerButtons[]`** (max 4, per-button `enabled` toggle, drag-drop).
   `headerCtaLabel`/`headerCtaUrl` hata diye — **koi migration nahi lagi**, kyunki wo fields
   kabhi commit hi nahi hue the. Wahi aakhri free moment tha.
9. **"Add Menu Items" ab WordPress jaisa** — har source ek `.day` accordion (Pages band,
   Custom Links khula).

**`menuType: 'button'` jaan-boojh kar NAHI joda.** CTA reference me `<nav>` ke bahar baithta hai
aur mobile pe dikhta rehta hai; menu item banane se wo drawer me chala jaata. Aur `menuType`
ek **structural** discriminator hai, look ka nahi. Nav ke andar button chahiye to D-17 ka
`className: nav-cta` raasta khula hai. Poora tark `04-ADMIN-UX.md` §6.4 me.

**Live verify kiya:** menu + locations DB me daal kar chalti hui API se
`/api/public/menus/header` padha — mixed types, ek column me 2 groups, clickable aur
non-clickable dono headings, CTA, `href` resolved, aur koi `version`/`deletedAt` nahi.
Phir Next dev se rendered HTML me header, footer aur mobile drawer teenon confirm kiye.
Uske baad smoke data hata diya.

⚠️ **Revalidate abhi end-to-end nahi chal raha** — `apps/web` ki `.env` nahi hai, isliye
webhook **503** (fail-closed) deta hai. Steps `06-OPERATIONS.md` §4.1 me hain. Ye ek manual
step hai: `.env` files is environment me permission se likhi nahi ja saktin.

---

## Agla kaam — Slice 0, aur uska pehla kadam **spec 006**

Phase 0 ke done-criteria poore ho chuke. Agla milestone **Slice 0 — Header + Footer
end-to-end** (D-27).

**Seedha code mat likhna.** Slice 0 ka data model abhi define hi nahi hai, aur wo saara
**schema** hai — baad me badla to migration:

| Kya                                                            | Abhi                              | Kahan likha hai                                                                      |
| -------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| `menus.items[]` me `menuType` · `linkType: "none"` · `columns` | sirf `siteId, key, name, items[]` | `10-REFERENCE-DESIGN.md` §6 **item #1** — _"Slice 0 se pehle"_, _"sabse urgent"_     |
| Header ka CTA · awards badge · support line                    | settings schema me **0 fields**   | §6 item #2 — "Slice 0 scope"                                                         |
| Sticky mobile CTA bar (phone · WhatsApp · toggle)              | kuch nahi                         | §6 item #3 — plan me kabhi tha hi nahi                                               |
| Footer columns · copyright · disclaimer                        | kuch nahi                         | **`04-ADMIN-UX.md` menu locations bolta hai, `05-BUILD-PLAN.md` settings** — takraav |
| Public read ka projection                                      | koi public endpoint nahi          | `adminEmail` / `searchEngineVisible` bahar nahi jaane chahiye                        |
| `settings` + `menus` ke cache tags                             | kuch nahi                         | D-14 kehta hai "Phase 3 me" — par Slice 0 ko **abhi** chahiye                        |

`REVALIDATE_SECRET` `env.js` me pehle se hai (min 32) — wo ek cheez ready hai.

**Pehla kadam:** `/spec` se **spec 006 — Slice 0 ka data contract**. Sirf shape freeze ho,
code nahi. Usme 3-4 choices client/user se poochhni padengi (footer columns kahan,
`linkType` ka set, public projection ki hadd). Phir `02-ARCHITECTURE.md` §3 +
`05-BUILD-PLAN.md` update, aur ek naya `D-43`.

**Uske baad code:** `/new-module menus` → public read routes → `apps/web` ka header/footer
→ cache invalidation verify.

**C-2 (Payload spike, 2 din)** parallel me chal sakta hai — Phase 1 se pehle hona hai.

> **Kyun spec pehle:** isi session me dono raaste dikh gaye. D-41 ne media ka contract
> code se pehle freeze kiya — implementation ek baar me saaf utri. Logo ka reference bina
> soche ban gaya tha — uske liye baad me D-42 likhni padi aur ek test ulta assert kar raha
> tha.

---

## ⚠️ Kal sabse pehle — ek hi kaam, teen step

**Sab kuch commit ho chuka hai** (working tree clean, 14 commits unpushed). Bacha hua kaam
sirf itna hai: `pnpm build` verify karo, phir push.

```bash
# 1. web dev server band karo (Ctrl+C)

# 2. corrupt build cache saaf karo — wajah neeche
rm -rf apps/web/.next

# 3. wahi chalao jo CI ka aakhri step hai, phir push
pnpm build && git push
```

### `.next` corrupt kyun hai — developer ki galti (24 Aug)

User ke chalte hue dev server ke saath `next build` chala diya gaya tha. `next build` aur
`next dev` **wahi `.next` folder** use karte hain. Uske baad ek doosra `next dev` bhi usi
project pe chala. Nateeja: web pe CSS bina HTML, phir 500, phir 404.

`.next` sirf build cache hai — usme koi kaam nahi hai, dobara ban jaayega.

**Rule aage ke liye:** jab tak user ke dev server chal rahe hon, na `pnpm build` chalao na
apna doosra dev server uthao. Verify karna ho to API/DB level pe karo — wo unke servers ko
chhoota hi nahi.

### `pnpm build` kya pakadta hai

Sirf do workspace sach me build hote hain — `apps/admin` (`vite build`) aur `apps/web`
(`next build`); baaki teen `echo "no build step"` hain. Ye wo compile errors pakadta hai jo
tests nahi pakadte: JSX typo, galat import, undefined variable. Aur `next build` `/` ko
prerender karta hai, yaani server components sach me chala kar dekhta hai.

⚠️ `apps/admin/dist/` git me commit hota hai — build ke baad `git status` dekh lena, warna
ek naya uncommitted change bacha reh jaayega.

### Uske baad — Phase 1 se pehle

1. **A-5** — `apps/web/.env` (`API_URL` + `REVALIDATE_SECRET`). Iske bina **production** me
   cache kabhi saaf nahi hoga. Dev me farak nahi padta, isliye ye chup-chaap chhoot sakta hai.
2. **Q-7** — client se poochho: logo na ho to header me kya dikhe?
3. **spec 006 §11** — mere 6 resolved decisions ka review baaki hai.
4. **C-2** — Payload spike (2 din), Phase 1 land hote hi window band.

---

## Khule sawaal

| #   | Sawaal                                                  | Kab tak                        |
| --- | ------------------------------------------------------- | ------------------------------ |
| Q-7 | **Logo na mile to header me kya dikhe?** (client se)    | **Slice 0 ke header se pehle** |
| —   | `.panel-foot` ka `flex-wrap: wrap` rakhein ya hatayein? | jab Settings ka footer chhuo   |
| 1   | Enquiries — Phase 7b banayein ya alag Phase 9?          | Phase 7 se pehle               |
| 2   | Field DSL me `matrix` + `table` types add karne hain    | Phase 5c se pehle              |
| 3   | Payload CMS spike (2 din)                               | Phase 1 se pehle               |

**Q-7 sirf header ka logo render rokta hai** — Slice 0 ka baaki sab (menus module, public
API, footer, cache tags) uske bina chal sakta hai. Poora item `09-OPEN-ITEMS.md` me.

**`flex-wrap` wali baat:** `3c29b58` me `primitives.css` ke `.panel-foot` me
`flex-wrap: wrap` add hua. Design spec (`admin-design.html:112`) me wo nahi hai. Nuksaan
koi nahi dikha, isliye **jaan-boojh kar chhoda gaya** — ye design ka call hai (R15), khud
nahi badalna.

**Jo band ho gaya:** "built-in role (`salesAgent`) edit ho sake ya Duplicate?" — ye RBAC
ko block kar raha tha. D-37 ke baad **role-edit ka koi UI hi nahi ban raha**, isliye ye
sawaal Phase 7 (custom-role builder) pe khisak gaya. D-36 ka takraav tab dekha jaayega.

---

## `apps/api/.env` — do cheezein jo naye machine pe dekhni hain

> **`09-OPEN-ITEMS.md` ke hisaab se ye 20 Aug ko theek ho chuki hain** (backup:
> `apps/api/.env.bak-1787215917`). Ye section ab **pending kaam nahi** — naya setup karte
> waqt check-list hai. `.env` git me nahi hai, isliye code se verify nahi hota.

```diff
- COOKIE_SECURE=true            # local HTTP pe browser cookie store hi nahi karega
+ COOKIE_SECURE=false           # prod me true

- MIGRATIONS_DIR=../../migrations   # cwd-relative — pnpm cms root se chalta hai
+ # line hata do, default sahi hai
```

Aur agar `pnpm seed` se admin banana ho to teen vars chahiye:
`SEED_ADMIN_EMAIL` · `SEED_ADMIN_PASSWORD` (min 10 chars) · `SEED_ADMIN_NAME`.

---

## Git

```
branch : main
remote : github.com/progryss/crmmern.git

50d8fac  Session wrap — handoff doc sach bolta hai ab (24 Aug)
bb5844e  .featured-drop ki height wapas — shared primitive thi
9e0c3a0  Docs sync — 288 tests, D-42/Q-7
446528d  Settings sirf maujood media ki id leti hai (D-42 §1)
0e85662  D-42 approved, Q-7 alag kiya
731a462  Media foundation ke baad ki safai — prettier, stale comments
3c29b58  Media foundation + Settings logo upload (Codex)
a2b10ad  ← origin/main yahin khada hai
```

45 commits · working tree clean · **13 commits unpushed** (`origin/main` `a2b10ad` pe hai).
Aaj ke 6 commits: contract freeze → shared+migration → API → admin → web → docs sync.
`apps/api/.env` ka backup: `apps/api/.env.bak-1787215917` (gitignored).

⚠️ **Push kabhi bhi bina permission ke nahi karna.**

---

## Dev environment

```bash
pnpm install
docker compose up -d mongo        # mongo 8, port 27017
pnpm cms migrate                  # migrations
pnpm seed                         # roles + admin user
pnpm dev                          # teenon apps
pnpm test                         # 184 tests
```

Auth ke integration tests ko **chalta hua Mongo chahiye** (`pnpm db:up`) — wo
jaan-boojh kar mock nahi hain: reuse detection, TTL aur unique index sab DB ka
behaviour hain, service ka nahi.

---

## Desktop pe reference files (repo se bahar)

- `CMS-Technology-Guide.html` — 28 technologies, saral bhasha me
- `CMS-Build-Roadmap.html` — poora phase-wise roadmap
