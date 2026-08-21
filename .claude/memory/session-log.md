# Session Log

Append-only. Naya entry **upar** add karo.

Format:

```
## YYYY-MM-DD — <ek line summary>

**Kya hua:** …

**Faisle:** … (ya "koi nahi")
**Agla:** …
```

---

## 2026-08-21 — Users ka menu role-aware hua; Roles submenu drop; Profile screen bani

**Kya hua**

- `/status` chalaya — **6 doc mismatch** mile. Sabse bade: `CLAUDE.md` "~85%, 130 tests,
  agla kaam Users" keh rahi thi jabki Users ho chuke the aur **184 tests** hain; aur wo
  abhi bhi keh rahi thi ki `roles` module ke paas koi HTTP surface nahi (jabki
  `controller.js` + `routes.js` do commit pehle aa chuke the). `09-OPEN-ITEMS` "175 tests"
  aur "GitHub repo khaali hai" — dono galat (origin/main `0e328cb` pe hai, 18 unpushed)
- Client ne Users section ka **asli shape** diya. Kal wala "Users → Roles" submenu ka plan
  **drop** — uski jagah menu role ke hisaab se badlega (D-37)
- Pehle **sirf docs** — client ne yahi kaha tha. Baad me usi session me code bhi

**Ek takraav pakda gaya (isiliye poochha)**

Client ne kaha "editor apni profile se naam aur password badal sake". Par **D-35 §1 ulta
kehta hai** — "user apna password khud nahi badal sakta" — aur wo code me laga hua bhi
hai: `auth/service.js` me `/api/auth/change-password` `mustChangePassword` false hone pe
**403** deta hai. Bina poochhe likh dete to doc apne hi decision se takraati.
Client se teen jawab liye: current password **zaroori** · admin ka reset field **rahega** ·
profile pe sirf **naam + password** (email/avatar nahi).

**Faisle:** **D-37** — (1) Users ka menu role-aware: admin ko All Users · Add User ·
Profile, baaki sabko sirf Profile; Roles submenu **nahi**, role builder Phase 7 me hi.
(2) User apna password Profile se khud badal sakta hai, current password ke saath —
**D-35 §1 superseded**, baaki D-35 waisa hi.

**Ek blocker apne aap khatam ho gaya:** Q-1 (built-in role edit ho ya "Duplicate") RBAC ko
block kar raha tha. Role-edit ka koi UI hi nahi ban raha, to wo Phase 7 pe khisak gaya.

**Docs jo badle:** `03-DECISIONS` (D-37 add, D-35 §1 superseded mark) · `02-ARCHITECTURE`
(§8.3 password ke do raaste, §8.4 profile) · `04-ADMIN-UX` (nav) · `05-BUILD-PLAN`
(Users/Profile Phase 7 → Phase 0, custom-role builder Phase 7 me hi, `subscriber` wali
purani line) · `09-OPEN-ITEMS` · `CLAUDE.md` · project-state.

**Phir code — D-37 poora laga**

```
apps/admin/src/lib/nav.js            nav registry (NAV + ROUTE_GUARDS) + 11 test
apps/admin/src/screens/Profile.jsx   naam + password, dono alag panel
apps/admin/src/screens/NoAccess.jsx  permission na ho to yahi dikhta hai
```

Sidebar ab `nav.js` se render hoti hai, `App.jsx` me `RequirePermission` guard aaya, aur
Users flat link se accordion group ban gaya. Backend me `changePassword()` ka 403 gate
hata, aur wo ab purane saare sessions maar kar **turant naya issue** karta hai.

**Chaar cheezein jo raaste me theek karni padin**

1. **`revokeAllSessions()` chalu session bhi maar deta tha.** Sirf gate hata dena kaafi
   nahi tha — user apna hi password badal kar logout ho jaata. Ab revoke ke baad
   `issueSession()` chalta hai aur controller naye cookies set karta hai.
2. **`Shell` pehle `RequirePermission` ke andar tha** — matlab access-nahi-hai wala page
   bina sidebar ke, layout ke bahar render hota. Shell bahar kiya.
3. **`forbidden` import orphan ho gaya tha** auth service me — lint ne pakda.
4. **Sidebar ka accordion `/users` pe band rehta tha.** Pehle Users flat link tha to
   dikkat nahi thi; group bante hi reload pe pata hi nahi chalta ki aap kahan khade ho.
   Ab current page ka group apne aap khulta hai.

**Ek cheez jaan-boojh kar nahi ki:** baaki menu items (Posts, Packages, Settings…) pe
`permission` nahi lagayi. Client ne abhi sirf Users ka shape maanga hai aur design frozen
hai (R15) — aaj hi sab pe laga dena us rule ko developer ki taraf se todna hota.

**Naya rule:** `07-CONVENTIONS.md` **R16** — nav item aur route guard ek hi jagah se.

**Tests:** 184 → **198**. Purana D-35 gate wala test (jo 403 expect karta tha) D-37 ke
hisaab se badla, aur `nav.js` ke 11 naye test aaye. Lint clean, admin build clean.

**Client ne test kiya aur ek asli bug nikaala (D-38)**

Sawaal seedha tha: _"Profile se password badal kar browser band karun, phir kholun —
Login aayega ya Dashboard?"_ Jawab tha **Dashboard, chahe "Remember me" tick kiya ho ya
nahi** — jo galat hai.

`setAuthCookies()` ka `persistent` flag refresh aur change-password dono me **hardcoded
`true`** tha. Matlab session cookie pehle auto-refresh pe hi (login ke ~15 min baad)
7-din wali persistent cookie ban jaati thi. **Checkbox practically bemaani tha.**
Ye D-37 se nahi aaya — refresh me pehle se tha; password wale raaste me wahi pattern
copy hua isliye dikh gaya.

**Fix:** `remember` ab `refreshTokens` record me hai aur har rotation ke saath chalta
hai. Login likhta hai, refresh aur change-password wahi padhte hain. Migration nahi
chahiye — collection ephemeral hai aur uspe TTL index hai, purane records `false` padhte
hain (safe direction).

**Saath me TTL bhi badli** (client ka faisla, teen options me se): `REFRESH_TOKEN_TTL`
7d se **24h**, aur naya `REFRESH_TOKEN_TTL_REMEMBER` = **7d**. Dono sliding hain —
ghadi inactivity pe chalti hai, login se nahi. Reference ke liye WordPress dekha:
wo 2 din / 14 din deta hai par **absolute**, sliding nahi.

**Tests:** 198 → **204**. Chhe naye test sirf isi baat pe ki _login ke baad wali_
request persistence badalti to nahi — kyunki bug wahin tha, login me nahi.

**Ek manual step baaki:** `apps/api/.env.example` me naya var add karna hai (wo file
mere permissions me nahi hai). Default code me hai, isliye kuch tootega nahi.

**Poora admin English me convert hua (R17)**

Client ne Profile pe read-only fields dekhe aur do cheezein kahin: (1) unhe `inp` jaisa
dikhna chahiye, (2) _"hint Hindi me kyun aa raha hai?"_

Doosre sawaal ka jawab check karne pe ye nikla: **language ka koi rule likha hi nahi
tha.** Code din-1 se Hinglish me drift kar raha tha, jabki client ka design — jo FROZEN
spec hai (R15) — **poora English me hai** (`URL-friendly, lowercase, hyphens only.`).
Yaani design ke hisaab se UI kabhi English me honi chahiye thi.

Client ne poora admin English karne ka faisla liya. **~107 strings** badle:

```
admin JSX          Profile · UserForm · UsersList · DeleteUser · Login
                   ChangePassword · NoAccess · NotBuiltYet · Dashboard · AdminBar · App
packages/shared    Zod ke validation messages
apps/api           errors.js · auth aur users service ke saare messages
                   middleware (auth, csrf) · rate limit
```

**Sirf JSX badalna aadha kaam hota.** API ke error messages aur Zod ke messages seedha
admin ke notice me chhapte hain (`errorMessage()` unhe wahin se uthata hai) — wo na
badalte to pehli hi failed login pe Hinglish dikh jaati.

**Hinglish jaan-boojh kar bacha:** code comments, test ke naam, aur developer errors
(`useAuth ko <AuthProvider> ke andar hi call karo`). Wo user kabhi nahi dekhta.

Ek test bhi update hua — `users.test.js` message text pe assert kar raha tha.

**Naya rule:** `07-CONVENTIONS.md` **R17** — user ko dikhne wala har text English me.
Isme wo table bhi hai ki kya English aur kya Hinglish, taaki ye drift dobara na ho.

**Profile ka read-only field** ab `<input className="inp" readOnly disabled />` hai —
wahi pattern jo Edit User me username/email pe hai. `.profile-ro` CSS hat gayi.

**Client ne ek aur bug pakda — stale form state**

Edit user karke **Add User** dabao, to `/users/new` ka form **pichhle user ke data se
bhara** khulta tha.

**Wajah React Router ka documented behaviour hai:** `/users/:id` aur `/users/new` dono
`<UserForm />` render karte hain, to route badalne pe React purana instance dobara use
kar leta hai aur `useState` zinda reh jaati hai. `useEffect` bhi nahi bachata — usme
`if (isNew) return` tha, jo form clear kiye bina nikal jaata tha.

**Fix:** component ko `key={id ?? new}` ke saath wrap kiya — route badalte hi poora
remount. Effect me manually reset karna bhi chalta, par phir har naya `useState` yaad
rakhna padta.

**`DeleteUser` me bhi wahi kiya** — client ne wo nahi bola, par wahan ye zyada khatarnaak
tha: ek delete screen se doosri pe jaate waqt naya user load hone tak **pichhle user ka
naam** dikhta rehta, aur wo screen permanent delete ka hai.

`08-RISKS.md` ke traps me "Ek component, do route" add kiya, detail ke saath.

> ⚠️ **Is bug ka koi automated test nahi hai.** Admin me component testing ka setup hi
> nahi hai (na jsdom, na testing-library) — poore project me 204 test hain par ek bhi
> React component test nahi. Ye bug us gap me se nikla. Stack add karna ek alag faisla
> hai, client se poochha gaya hai.

**Profile ke messages role-aware hue — aur ek label drift pakdi gayi**

Client ne dekha ki administrator ko apni Profile pe likha aa raha tha _"Ask your
administrator"_ aur _"Your administrator sets this"_ — jabki wo khud administrator hai.

**Check karte waqt ek doosri cheez nikli:** `roles/service.js` me labels ka apna map tha
jisme `admin: "Administrator"` likha hai, aur wahi DB me jaata hai. Par Profile screen
label **key se bana rahi thi** (`admin` se "Admin"). Yaani mera camelCase formatter DB se
diverge kar raha tha — aur wo comment maine khud likha tha ki "labels DB se aate hain".

**Fix (dono ek saath):**

1. `ROLE_LABEL` ab `packages/shared/src/constants` me hai. Seed aur admin **dono wahi**
   padhte hain. `roles/service.js` ka local map hata diya. Ye D-36 ke saath consistent
   hai — built-in roles code-owned hain. Custom roles (Phase 7) ke liye camelCase wala
   fallback bacha hai, kyunki unke labels sirf DB me honge.
2. Dono hints ab `can(user.update)` pe badalte hain — **role ka naam nahi dekha**
   (spec 001). Sawaal capability ka hai: jo khud users manage karta hai, use "apne
   administrator se poochhein" likhna bemaani hai.

|       | Users manage karne wala                  | Baaki sab                                    |
| ----- | ---------------------------------------- | -------------------------------------------- |
| Email | _...not from the Users screen either._   | _...Ask your administrator if you need one._ |
| Role  | _...another administrator has to do it._ | _Your administrator sets this..._            |

Role wali baat code se verify ki: server apna role badalne se **rokta nahi** — sirf
"last administrator" wala guard hai. To "koi doosra administrator badal sakta hai" sach
hai. (Self-role ka guard sirf UI me hai, `disabled={isMe}` — API pe nahi. Alag baat hai,
aaj chhui nahi.)

**Tests:** 204 → **207**. Teen naye: har role ka label ho, `admin` ka label
"Administrator" ho, aur seed DB me wahi labels likhe jo shared me hain — teenon isi drift
ko dobara hone se rokte hain.

**Column sorting ka UI, aur role dene ke do guard (D-39)**

Client ne poochha "Users complete hai?" — nahi tha. Uske baad teen faisle hue:

1. **Activity log DEFER** — client ne poochha ki jab design me hai hi nahi aur unhone
   maanga nahi, to kyun banaye. Design check kiya: **wo sahi the.** Design me jo
   "Activity & Notes" hai wo Enquiry detail ki timeline hai (Phase 7b), site-wide audit
   log nahi. Wo item humare apne plan se aaya tha. Docs update: Phase 0 se hataya,
   `09-OPEN-ITEMS` me **Q-4** banaya taaki chup-chaap gayab na ho, aur **keemat likh di**
   — iska itihaas backfill nahi ho sakta.
2. **Column sorting ka UI** — backend pehle se taiyaar tha (`sort` + `order`), sirf UI
   ka kaam tha. Name aur Last login sortable. Sort URL me rehta hai, header `<button>`
   hai (keyboard ke liye), `aria-sort` bhi.
3. **Do guard (D-39)** — asli baat yahi thi.

**Guard wali baat sirf "UI aur API alag" nahi nikli**

Client ne poochha tha ki server pe fix karne se safe ho jaayega kya. Jaanch me pata chala
ki `updateUser` me **role dene pe koi rok hai hi nahi** — jiske paas `user.update` hai wo
kisi ko bhi kuch bhi role de sakta hai, apne aap ko `admin` samet.

Aaj khatra nahi hai (`user.update` sirf admin ke paas), **par Phase 7 me custom roles
aate hi ye asli privilege escalation ban jaata**. Aur "apna role khud mat badlo" wala
guard ise **rokta nahi** — Manager saathi ko admin banayega, saathi Manager ko.

Isliye dono lagaye: apna role khud nahi, aur apni permission se upar ka role kisi ko
nahi (subset check — role ke naam pe nahi, permissions pe, taaki custom roles pe apne aap
chale). Create pe bhi lagta hai, warna naya admin bana kar uske password se login ka
raasta khula rehta.

**Guard ka order maayne rakha:** "aakhri admin" pehle, "apna role" baad me — taaki aakhri
admin ko "site lock ho jaayegi" wala saaf message mile. Isi order se D-34 ke purane test
bina badle pass rahe.

**Tests:** 207 → **214**. Naye guard ke test **service pe seedhe** chalte hain, HTTP se
nahi — kyunki ye raasta aaj HTTP se banaya hi nahi ja sakta. Wahi tests guard ko Phase 7
tak zinda rakhenge; bina unke ye chup-chaap hat jaata.

**Agla:** Settings — `settings` collection ka schema + migration, phir General screen.

---

## 2026-08-20 (shaam) — Users module poora; RBAC ka faisla pending

**Kya hua**

- Users backend + screens bane: list (pagination, role tabs, search), add, edit,
  delete (reassign dropdown ke saath), `/api/roles`
- Client ne screens test kiye, teen changes maange — sab lag gaye (D-35):
  row me sirf Edit | Delete · Edit se status hataya · **password sirf admin set karta
  hai**, user khud nahi badal sakta
- Uska doosra aadha hissa jodna pada: Edit User me password field. Bina uske bhoole
  hue password ka koi recovery raasta hi nahi bachta

**Chaar bug mile, chaaron chup-chaap fail hone wale**

1. `z.coerce.boolean()` — `Boolean('false') === true`. `COOKIE_SECURE` kabhi off ho
   hi nahi sakta tha, aur uska nateeja tha "login 200 deta hai par session tikta nahi"
2. Migration runner missing directory pe chup-chaap `[]` lautata tha — `pnpm cms
migrate` "koi pending nahi" bol kar exit 0 deta, indexes bante hi nahi
3. Role ka wajood kahin check hi nahi hota tha — `role:"wizard"` wala user ban jaata,
   201 milta, par permissions khaali aur har screen pe 403
4. **Sabse zaroori:** `ensureDefaultRoles()` existing role ko poora skip kar deta tha.
   Matlab code me joda gaya koi bhi naya permission string kisi chalu instance tak
   pahunchta hi nahi tha. `user.delete` isi wajah se Delete button gayab kar raha tha
   → D-36: built-in roles code-owned, hamesha sync, aur migration 004

Aur ek: galat id pe Mongoose CastError seedha 500 banta tha — ab 404.

Do galat baatein maine kahin thin aur wapas leni padin: "Next 15 ko React 19 chahiye"
(nahi — asli wajah `.claude/settings.json` ka `NODE_ENV=development` tha) aur
"CI ka build red hai" (nahi — wo sirf mere chalane par toota tha).

**Faisle:** D-34 (username immutable · asli delete + reassign · admin protected) ·
D-35 (password admin set karta hai · deactivate UI se hata) · D-36 (built-in roles
code-owned, permissions hamesha sync).

**Tests:** 44 → **184**. `pnpm dev` chalta hai, login se delete tak sab asli DB pe
verify kiya.

**Agla — yahin se uthana hai**

Client ne **role-based access control** maanga: Users → Roles submenu, aur role ko jo
sections diye jaayein sirf wahi sidebar me dikhein. Maine approach samjha di
(teen layer · scope wale permissions · role screen ka shape · D-36 ka takraav), par
**abhi tak koi code nahi likha aur do cheezein pending hain**:

1. Spec `006-rbac.md` likhni hai (client ne "haan" nahi bola abhi)
2. **Ek faisla client se lena hai:** built-in roles (jaise `salesAgent`) ko edit karne
   dein, ya unpe "Duplicate" karke copy edit karein? D-36 kehta hai built-in roles har
   deploy pe code se sync hote hain — agar admin unhe edit kare to agla deploy uske
   changes mita dega

## 2026-08-20 — Auth + RBAC + admin shell; docs ko asli state pe laaya

**Kya hua**

- `/status` chalaya to sabse bada mismatch `09-OPEN-ITEMS.md` me tha — "code shuru
  nahi hua" likha tha jabki Phase 0 ~65% ho chuka tha. Wo aur `CLAUDE.md` sync kiye
- Q-1 (login screen) client se clear hua → D-31
- **Backend auth poora:** User/Role/RefreshToken models, migration 002 (TTL index ke
  saath), JWT + cookie layer, CSRF double-submit, `requirePermission()`,
  login/refresh/logout/change-password, `GET|PATCH /api/me`, roles seed
- **Admin shell:** login screen, protected routes, AdminBar, Sidebar (design ke poore
  menu ke saath), `mustChangePassword` gate, NotBuiltYet placeholder screens
- `lib/api.js` ka purana TODO poora — **single-flight refresh mutex** (D-13)
- Tests 44 → **130**. Auth ke integration tests asli Mongo pe chalte hain
- Asli Mongo pe end-to-end verify: login → rotation → reuse detection → family revoke

**Teen asli bug jo raaste me mile**

1. `emailSchema` me `.email()` `.trim()` se **pehle** chal raha tha — `a@b.com`
   reject hota tha aur user ko "email sahi nahi lag raha" dikhta, jabki email sahi thi
2. `.env` file maujood thi par **use koi load hi nahi karta tha** — na dotenv, na
   `--env-file`. `pnpm seed` iske bina chal hi nahi sakti thi (D-33)
3. Migration runner missing directory pe **chup-chaap `[]`** lautata tha —
   `pnpm cms migrate` "koi pending nahi" bol kar exit 0 deta tha aur indexes bante
   hi nahi. Ab loud error deta hai. (`.env` ka `MIGRATIONS_DIR` cwd-relative hai,
   isliye ye asli me ho raha tha)

Ek regression khud banayi aur pakdi: `.env` load karne se **test env local file pe
depend karne laga** (`COOKIE_SECURE=true` se cookie ke naam badle aur ek test fail
hua). Ab `NODE_ENV=test` pe `.env` load hoti hi nahi.

**Faisle:** D-31 login screen · D-32 `bcryptjs` (native bcrypt nahi) · D-33 `.env`
Node ke apne loader se. Aur `07-CONVENTIONS.md` me **R15** likha — "design change
client se aata hai" rule pehle kahin likha hi nahi tha (docs use galti se "rule 8"
bolte the, jabki R8 Zod validation hai).

**Agla**

1. Users screens — list (server-side pagination), invite, edit, deactivate
2. Settings General
3. `roles` module ko `routes.js` do (abhi sirf model + service hai)
4. `apps/api/.env` me `COOKIE_SECURE=false` aur `MIGRATIONS_DIR` wali line theek karo

---

## 2026-08-20 — Client ke asli design aaye; CSS architecture tay hui

**Kya hua**

- Client ne do asli design diye — public site (Andaman travel) aur admin (travel CMS).
  Dono analyse kiye: `docs/10-REFERENCE-DESIGN.md` aur `docs/11-REFERENCE-ADMIN.md`
- Admin design ab **SPEC** hai, reference nahi. `04-ADMIN-UX.md` secondary ho gaya
- CSS architecture tay hui aur implement bhi — Tailwind hataya, plain CSS aaya

**Faisle**

- D-28 Plain CSS — Tailwind, CSS Modules, CSS-in-JS teenon reject.
  Sabse bada reason: blocks ka theming contract stable class names maangta hai,
  Tailwind utility classes se wo toot jaata hai. shadcn/ui bhi gaya (Tailwind pe
  khada tha) — uski jagah Radix primitives aayenge.
- D-29 `salesAgent` paanchwa role. Design ke users list me 4 users us role me hain,
  aur enquiry assignment usi pe chalta hai. D-26 ko partially supersede karta hai.
- D-30 Ruki hui cheezon ke connection point abhi banao — field, API shape aur UI ki
  jagah abhi; data baad me. Khaali cheez khaali dikhe, tooti hui nahi.
- Design badal sakta hai par change client se aayega, developer se nahi (rule 8)

**Design se jo gaps mile**

- Mega-menu — humara menu model simple nested tree hai, design me columns aur
  non-clickable group headings hain. Slice 0 me fix karna hai
- Enquiries ek mini-CRM hai (pipeline, assign, quotation, notes), form inbox nahi.
  Plan me sirf "submissions inbox" tha — bahut under-scoped
- Field DSL me `matrix` aur `table` types chahiye (occupancy slabs, departures)
- Public site "listing" site hai — 20 me se 13 sections ek hi card shape ke.
  Matlab Phase 6 (dynamic lists) is client ke liye Phase 5 se zyada zaroori hai

**Analysis: Appearance / Users / Settings kitne ruke hain**
Users ~90% · Settings ~75% · Appearance ~40%. Teenon `requirePermission()` pe
depend karte hain, aur wo Users module hai — isliye auth pehle.

**Agla:** Phase 0 ka auth — models, login, refresh rotation + reuse detection,
CSRF, requirePermission(), admin login screen + protected routes.
Uske baad Users + Settings, phir Appearance.

**Ek sawaal pending:** login screen design me hai kya? Nahi to WordPress-style
simple banega.

---

rate limit, pino, error envelope, /api/health, graceful shutdown)

- Zod contract freeze (spec 002): block envelope, content, seo, entry +
  create/update/listQuery. Permissions constants (spec 001). Field DSL (D-24).
  JSDoc typedefs.
- Migration runner: dono system — schema (numbered + ledger + checksum guard +
  down() mandatory) aur block-tree (per-document, lazy). CLI: pnpm cms migrate.
  Pehli migration: entries ke 6 indexes.

**Verify (asli mongo pe, sirf test nahi)**
migrate → 6 indexes bane · dobara → no-op · migrate:down → indexes gaye ·
file edit → checksum guard fire · API boot → /api/health 200

**Bug jo mila aur fix hua**
MIGRATIONS_DIR cwd se resolve hoti thi, apps/api se chalane pe ledger "missing"
dikhata tha. Env var override se fix. Ye sirf `pnpm test` se pakda hi nahi jaata —
health endpoint hit karne se mila.

**Faisle:** koi naya nahi

**Desktop pe do files banayi** (samajhne ke liye, repo se bahar)
CMS-Technology-Guide.html · CMS-Build-Roadmap.html

**Agla:** Phase 0 ka auth — User/Role/RefreshToken models + migration, login/logout,
refresh rotation + reuse detection, CSRF, requirePermission(), seed, admin shell.
User se poochha tha: ek saath karein ya do hisson me — jawab pending.

---

## 2026-08-19 — Coding shuru: setup + contract + migrations

**Kya bana**

- Phase 0 setup layer: pnpm monorepo, 3 apps + 2 packages, docker (mongo 8),
  ESLint 10 + Prettier, GitHub Actions CI, Express base (helmet, CORS allowlist,
  rate limit, pino, error envelope, /api/health, graceful shutdown)
- Zod contract freeze (spec 002): block envelope, content, seo, entry +
  create/update/listQuery. Permissions constants (spec 001). Field DSL (D-24).
  JSDoc typedefs.
- Migration runner: dono system — schema (numbered + ledger + checksum guard +
  down() mandatory) aur block-tree (per-document, lazy). CLI: pnpm cms migrate.
  Pehli migration: entries ke 6 indexes.

**Verify (asli mongo pe, sirf test nahi)**
migrate → 6 indexes bane · dobara → no-op · migrate:down → indexes gaye ·
file edit → checksum guard fire · API boot → /api/health 200

**Bug jo mila aur fix hua**
MIGRATIONS_DIR cwd se resolve hoti thi, apps/api se chalane pe ledger "missing"
dikhata tha. Env var override se fix. Ye sirf `pnpm test` se pakda hi nahi jaata —
health endpoint hit karne se mila.

**Faisle:** koi naya nahi

**Desktop pe do files banayi** (samajhne ke liye, repo se bahar)
CMS-Technology-Guide.html · CMS-Build-Roadmap.html

**Agla:** Phase 0 ka auth — User/Role/RefreshToken models + migration, login/logout,
refresh rotation + reuse detection, CSRF, requirePermission(), seed, admin shell.
User se poochha tha: ek saath karein ya do hisson me — jawab pending.

**Kya hua:** …

**Faisle:** … (ya "koi nahi")
**Agla:** …

```

---
## 2026-08-19 — 8 faisle liye, specs approve hue

**Kya hua**

- User se 8 sawaal poochhe, sab ke jawab mile
- Specs 001, 003, 004, 005 → Approved
- 4 naye decision records: D-24 se D-27

**Faisle**

- D-24 Field DSL: **ek DSL** (contexts: content|block), do nahi
- D-25 Trash: **`deletedAt` field**, `status: 'trash'` nahi — restore pe purani state wapas
- D-26 Roles: **char** — `subscriber` nahi. `entry.purge`/`media.purge` sirf admin
- D-27 Pehla milestone: **Slice 0 = Header + Footer** end-to-end
- TypeScript: **nahi** — sab JavaScript, D-03 waise hi
- Seed: **khaali** Home + Blog, koi demo blocks nahi
- Payload spike: **approved**, Phase 1 se pehle

**User ka input (Slice 0 pe)**
Slice normal content page ka nahi, **header/footer** ka hoga — logo, navigation, CTA,
footer columns/social/copyright ka minimal admin config, save/publish, aur public site
pe render. Page builder abhi nahi.

**Imaandari se:** ye slice cache invalidation aur settings/menus pipeline verify karti
hai, par **preview parity nahi** — usme blocks chahiye. Wo risk Phase 5 tak khula.

**Agla**

1. A-2 — Zod contract likho (`packages/shared`)
2. Phase 0 setup layer shuru
3. Payload spike parallel me

---

## 2026-08-19 — Docs v3: merge + `.claude` workspace

**Kya hua**

- Teenon planning docs merge karke topic-wise 10 documents banaye (`.claude/docs/`)
- `03-DECISIONS.md` naya — 23 decisions with context/why/rejected/consequences
- `08-RISKS.md` naya — top 5 risks + 28 traps + phase-wise pre-flight
- `.claude/` workspace banaya — agents, commands, skills, specs, memory
- Root `CLAUDE.md` banaya
- 5 specs banaye: 001 permissions (draft), 002 content contract (pending),
  003 env schema (draft), 004 seed (draft), 005 field DSL (faisla pending)
- Purane docs `docs/archive/v1/` aur `docs/archive/v2-monolithic/` me safe

**Faisle:** koi naya nahi — sirf existing decisions document kiye gaye

**Naya finding:** `contentTypes.fields[]` aur `blockDefinition.schema[]` do alag
field systems hain jo docs me kabhi connect nahi hue. ~50% overlap. Ek DSL banane se
Phase 6 ka kaafi kaam kam ho jaata hai. → `specs/005-field-dsl.md`

**Agla**

1. Specs 001, 003, 004 review + approve
2. 005 (field DSL) ka faisla lo
3. C-1 (TypeScript for packages) ka spike
4. 002 (Zod contract) likho aur freeze
5. `git init` + Phase 0 setup layer shuru

---

## 2026-08-19 — Architecture review + docs v2

**Kya hua**

- Teen planning docs ka independent architecture review
- WordPress ke against product/IA validation
- Findings v2 me merge kiye: distribution model, migrations, URL/path model,
  status lifecycle, cache authority, block→CSS strategy, admin IA
- `admin-wireframe.html` banaya — 7 clickable screens

**Faisle (v2 me added)**

- D-15 distribution: versioned `@cms/*` packages + patla client repo
- D-09 routing: stored `entries.path` + unique index
- D-08 responsive: server-generated scoped CSS
- D-07 preview parity: host-injected primitives
- D-14 cache: Next ISR single authority + tag invalidation
- D-18 statuses: `pending` + `private` + trash

**Agla:** docs organize karna
```
