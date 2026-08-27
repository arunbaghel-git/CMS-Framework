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

## 2026-08-27 (shaam) — Slice 5 client ke faislon se dobara ghadi gayi; FAQs; CSS milaan

**Kya hua**

Slice 5 subah ban gayi thi (D-56). Uske baad client ne editor **chal kar dekha** aur chhe
badlaav maange — har ek ka apna decision record hai (D-57 se D-62). Saath me FAQs ka panel
bana, aur din ke aakhir me public page ki CSS reference se rule-by-rule milaayi gayi.

**Faisle (sab client ke, R15)**

| #    | Kya badla                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-57 | Pricing panel me **chaaron category ki row hamesha**; `Price Basis · GST · Advance` ki poori row hati; per-category `note` **hotel ke record pe** chala gaya. Khaali daam = wo category page pe nahi |
| D-58 | Hotels panel ki rows **itinerary se** banti hain, chuni nahi jaatin                                                                                                                                  |
| D-59 | **FAQs** ka panel — sirf FAQs, **policies nahi** (wo `packageDefaults` me hi)                                                                                                                        |
| D-60 | Hotel bhi **derive** hota hai (master list se); `fields.hotels[]` ab sirf **override**                                                                                                               |
| D-61 | **Add-ons global** — editor me panel nahi, poori list `packageDefaults` ke payload me                                                                                                                |
| D-62 | **Price line** `Packages ▸ Hotels` screen pe (pehle What's Included pe thi, aur ek bug se **dono** screens pe dikh rahi thi)                                                                         |

**Ek soch jo poore din chali:** har baar client ne wahi cheez hatai jo package me **pehle se
likhi hui** thi — destination itinerary me tha, category pricing me, hotel master list me.
Teenon baar jawab ek hi tha: dobara mat poochho, derive karo. Aaj package editor me pricing
ke aath number, hotels ki zero se ek row, aur FAQs — bas.

**CSS milaan (aakhri hissa)**

`itinerary-v3.html` ki CSS aur `globals.css` ka **rule-by-rule diff** script se nikala
(scratchpad me `css-diff.mjs`). Shuru me **28 selector missing, 29 me values alag**; ab
**4 missing** bache hain aur wo chaaron un sections ke hain jo bane hi nahi.

Do sabse badi cheezein jo pakdi gayin, aur dono chup thin:

1. **Chaar design token maujood hi nahi the** — `--green-600`, `--red-500`, `--r4`,
   `--orange-100`. Token na ho to `var()` **kuch nahi karti**, koi error nahi: "What's
   included" ki hari list saadi kaali render ho rahi thi.
2. **`.blk p` rule tha hi nahi** — har section ke paragraph browser ke default pe (16px
   kaala), jabki design 14px / `--body` maangta hai. Ye poore page pe dikhta tha.

Markup do jagah badla: What's included ab `.inx__c` ke **do card** (hara/laal, tick-cross
SVG), aur booking steps ab **neele number-circle** wale card (CSS counter se).

Ek aur bug isi pass me mila: CTA button `className="b b-o"` pe tha — reference ka naam,
jabki is repo me wo `btn btn--accent` hai. Button bilkul **unstyled** render ho raha tha.

**⚠️ Jo maine toda, aur theek nahi kar paya**

`next build` chalayi jab `next dev` chal raha tha — Windows pe wo `.next/trace` pe EPERM
deti hai, aur beech me maarne se `.next` kharab ho gaya. Pehle har page 500, phir maine
`.next/server` aur `.next/cache` hata diye to 404. **Dev server ko restart chahiye** —
`apps/web` terminal me Ctrl+C, phir `pnpm dev:web`. API (4000) aur admin (5173) theek hain.

Iska seedha nateeja: **poore din ki CSS aankh se verify nahi ho payi**, sirf code aur
reference ka milaan hua.

**Agla — naya session, sirf design**

Client ne kaha: jo sections **bane hue hain** wo design se match hone chahiye, ek-ek karke,
wo screenshot denge. Jo bane hi nahi (Traveller reviews · Similar itineraries · neeche ka
"Want this trip on your dates?" band · sidebar ka price widget) unhe abhi chhod dena hai.

**Teen sawaal khule hain**, teenon unhi na-bane sections ke:

1. `ratingValue` haath se likha jaaye ya `reviews[]` se gina jaaye (spec §9 #8) — mera
   mashwara **haath se**: `412` ka matlab hai "412 reviews hain", jabki page pe teen dikhte
   hain; derive karne pe wo **3** ho jaata
2. Similar itineraries **apne aap** chunein ya haath se (spec §9 #15) — mashwara **apne aap**
3. Neeche ka band aur sidebar widget me **enquiry form** hai, aur Enquiries Phase 7b me hai
   (Q-2) — form ka khaali shell, ya "Call/WhatsApp" button (settings me phone pehle se hai)

## 2026-08-27 — Slice 5 — Pricing + Hotels (D-56); docs sync

**Kya hua**

- Session `/status` se shuru — **4 doc mismatch** mile aur sab theek kiye (neeche), phir
  Slice 5 banayi: `fields.pricing{}` + `fields.hotels[]` + `fields.addOns[]`, admin ke do
  naye panel, aur public page pe price block · catbar · hotels table · add-ons.
- **Koi migration nahi lagi** — teenon field `entries.fields` (Mixed) ke andar hain, na
  naya collection na naya index.

**Faisle — D-56, dono client se (27 Aug)**

1. **Pricing panel ki pehli row `Category · Price From · Strike-through` hai.** Design me
   wahan `Currency · Price From · Strike-through` tha. Grid wahi `row3` hai — sirf pehla
   khana badla, kyunki daam ab har category ka apna hai.
2. **Currency package pe hai hi nahi.** Spec §4 me wo package ka field thi (INR|USD|AED)
   aur maine bana bhi di thi; client ne hata di. Wo `settings.currency` se aati hai.
   Dono jagah rakhne ka matlab ek extra field nahi, ek **sawaal** hota: "kaunsi jeetegi".

**Teen cheezein derive hoti hain, store kahin nahi** — ye slice ka sabse zaroori hissa
hai, kyunki teenon ke liye ek-ek field banana bahut aasan tha:

| Page pe                                  | Kahan se                                   |
| ---------------------------------------- | ------------------------------------------ |
| Upar ka `₹31,999 → ₹24,999`              | sabse sasti category — `cheapestPricing()` |
| Hotels table ka `Nights`                 | itinerary — `nightsByStay()`               |
| `Standard category — ₹24,999 per person` | price + basis se                           |

`Room` bhi package pe nahi hai — hotel ke apne record pe (D-53 §3).

**Paanch guard, sab reference BANNE se pehle** (D-42 §2 wala invariant): hotel/add-on ki
id sach ho · `destinationId` sach me Destination ho · ek category do baar price na ho · ek
destination × category pe do hotel na hon · `strikePrice > priceFrom`. Aakhri wala schema
me **nahi**, service me hai — schema me lagane ka matlab hota ki aadha bhara hua form save
hi na ho.

Aur delivery ke chhor pe ek aur: public projection me jis row ka hotel ya destination
resolve na ho, wo **payload me aati hi nahi** — adhoori row ka nateeja public table me ek
khaali cell hota, jo customer ko dikhta hai.

**Public page pe teenon jagah ek hi category.** Reference me category chunna upar ka daam,
catbar ka card aur hotels ki table — teenon ek saath badalta hai (design ka JS `js-catpick`
aur `js-htab` ko sync karta hai). Isliye selected category ek React **context** me hai,
teen alag state me nahi.

**Docs jo badle:** `03-DECISIONS` (D-56) · `02-ARCHITECTURE` §3 (`entries.fields` ka naya
maal) · `04-ADMIN-UX` (editor ke naye panel, aur `Sold Out`/`From price` wali do stale
rows) · `09-OPEN-ITEMS` · `CLAUDE.md` · project-state.

**Session ke shuru me jo 4 mismatch mile the**

1. `project-state.md` khud se ulta bol rahi thi — "Slice 5 ke teenon sawaal band (D-53)"
   aur do line neeche "teen sawaal khule hain". Doosri line hatayi.
2. `09-OPEN-ITEMS.md` ka header "383 tests" keh raha tha (andar ek jagah 491) — asli 541.
3. §"spec 007 §9" table me row 5 **do baar** thi — ek band, ek khuli. Duplicate hatayi.
4. 27 Aug ka CORS/tunnel kaam kisi doc me record nahi tha — teen jagah juda, aur
   `EXTRA_CORS_ORIGINS` `06-OPERATIONS` §4.0 me documented (env var ka doc rule miss
   ho gaya tha).

Saath me do stale claim: project-state `availability` ko live field bata rahi thi (D-54 me
hat chuka), aur `entries.test.js` ka section header wahi purani baat keh raha tha.

**Ek cheez jo verify nahi ho payi:** `pnpm --filter @cms/web build` chal nahi sakti jab
`next dev` chalu ho — `.next/trace` pe Windows ka file lock EPERM deta hai. Uski jagah
**chalte hue dev server pe** verify kiya: package page **200** deti hai aur `Pricing.jsx`
compile ho kar chalta hai (provider `<main>` ko lapetta hai). Admin ka `vite build` clean
hai.

**Agla**

1. **Slice 6** — Itinerary Images pool + gallery, aur FAQs · goodToKnow[] · reviews[] +
   rating (spec 007 §7)
2. `apps/web/.env` — `API_URL` + `REVALIDATE_SECRET` (**A-5**, manual step)
3. Pricing ko asli data ke saath dekhna — dev DB ke package me abhi pricing khaali hai,
   isliye page pe catbar/table abhi dikhte nahi (wo khud ko chhupate hain, wahi design hai)

## 2026-08-27 — Dev server tunnel/LAN se khula, CORS reject 403 hua; docs sync

**Kya hua**

- Kaam share karne ke liye cloudflared tunnel lagaya, aur usme **do asli gap** mile —
  demo ke nahi, code ke:
  1. **Vite sirf localhost pe bind tha.** Next (`apps/web`) default `0.0.0.0` pe bind
     hota hai, Vite `[::1]` pe — isliye tunnel se site chal gayi aur admin **502** de raha
     tha. `host: true` juda. Iske bina teen cheezein kabhi nahi hotin: docker se pahunch,
     LAN pe mobile se test, aur koi bhi tunnel.
  2. **CORS reject 500 ban jaata tha.** Allowlist se bahar ka origin aane pe ek plain
     `Error` throw hoti thi; wo `AppError` nahi hai, to error handler use generic **500**
     bana deta tha aur login screen pe sirf "Something went wrong. Please try again."
     dikhta tha. Yaani **configuration ki galti server crash jaisi dikhti thi.** Ab wo
     `forbidden()` hai aur message me origin ka naam aata hai, taaki use seedha
     `EXTRA_CORS_ORIGINS` me copy-paste kiya ja sake.
- `/status` chalaya — **4 doc mismatch** mile, sab theek kiye (neeche).

**Ek baat jo pehle GALAT kahi gayi thi:** "Vite `/api` proxy karta hai to same-origin hai,
CORS nahi phansega." Browser POST/PATCH/DELETE pe `Origin` header **hamesha** bhejta hai,
chahe same-origin ho — isiliye `/api/me` (GET) pe 401 aaya par login (POST) pe 500.

**Faisle:** **koi naya D-xx nahi.** Ye D-12 ka **palan** hai, uska apwaad nahi — `*`
jaan-boojh kar support nahi kiya gaya (cookies `credentials: true` ke saath jaati hain,
aur wildcard + credentials = kisi bhi site ka JS aapke admin ki taraf se request bhej
sake). `SITE_URL` ko list nahi banaya ja sakta — wo revalidate webhook ka **target** bhi
hai (`core/revalidate.js`), isliye alag var: **`EXTRA_CORS_ORIGINS`** (comma se alag,
optional). spec 003 me documented.

**Docs jo badle (mismatch sync)**

1. `project-state.md` **khud se ulta bol rahi thi** — ek jagah "Slice 5 ke teenon sawaal
   band (D-53)", do line neeche "Usme teen sawaal khule hain". Doosri line hatayi.
2. `09-OPEN-ITEMS.md` ka header **"383 tests passing"** keh raha tha (andar ek jagah 491) —
   asli **541**. Poora status block Phase 1 ki aaj ki haalat pe likha gaya.
3. `09-OPEN-ITEMS.md` §"spec 007 §9" table me **row 5 do baar** thi — ek band (D-53), ek
   khuli. Duplicate hatayi; sahi ginti **6 khule** (#2 #5 #8 #14 #15 #16).
4. Aaj ka kaam kisi doc me record nahi tha — project-state, session-log aur "Ab ka order"
   teenon me juda.

Saath me do stale claim bhi theek hue: project-state abhi bhi `availability` ko live field
bata rahi thi (wo **D-54** me hat chuka, migration 013 index gira deti hai), aur
`entries.test.js` ka section header bhi wahi purani baat keh raha tha.

**Agla**

1. `apps/web/.env` — `API_URL` + `REVALIDATE_SECRET` (**A-5**, manual step)
2. **Slice 5 — Pricing + Hotels** (spec 007 §4), admin + public page dono ek saath.
   Teenon sawaal D-53 me band, koi rukawat nahi
3. `EXTRA_CORS_ORIGINS` `apps/api/.env.example` me hai ya nahi — verify karo

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

**Settings ban gaya — model, migration, aur General screen (D-40)**

Client ne poochha "Settings Phase 0 ka hissa hai?" — jawab **aadha haan** nikla. Plan me
`Settings` ka **model** Phase 0 me tha par **screens Phase 7** me. Par status docs teenon
jagah "Phase 0 — Settings screens" keh rahe the. Wo mismatch tha, aur maine bhi pichhle
jawabon me wahi dohraya tha bina build plan padhe.

Faisla (D-40): screens **aage khisak gayi**, wahi precedent jo Users ke saath laga tha —
client ke design me Settings poora maujood hai. **Sections plan se nahi, design se**:
General · SEO & Schema · Email/SMTP · Integrations. Design ne "Reading" ko General ke
andar hi rakh diya hai, aur Permalinks/Scripts uske paas hain hi nahi.

**Kya bana**

```
packages/shared/src/schemas/settings.js   Zod contract + defaults + toPublicSettings
apps/api/src/modules/settings/            paanch file ka poora module
migrations/005-settings.js                unique index + pehla document
apps/admin/src/screens/settings/General   design ke chaar section
```

**Teen faisle jo code me dikhte hain**

1. **Site URL read-only hai.** Design me input jaisa dikhta hai, par value `env.SITE_URL`
   se aati hai aur settings document me wo field hai hi nahi. Usi value pe CORS allowlist
   aur canonical URLs khade hain (D-12) — admin ke haath me dena matlab ek galat entry
   site ke links aur security dono ek saath tod de. Screen wajah bhi likhti hai.
2. **Document migration me banta hai, sirf seed me nahi** — D-36 ka wahi sabak: seed sirf
   naye instance pe chalti hai. Upar se service ka read self-healing hai.
3. **Logo, Favicon, Homepage disabled hain** (Media Phase 2, entries Phase 1) — D-30.

**Ek asli bug test ne pakda**

`social` nested hai. Service dot-notation theek use kar rahi thi, par
`updateSettingsSchema` me har link pe `.default()` tha — to
`{ social: { instagram: x } }` parse hote hi **facebook aur youtube `` ban jaate**.
Yaani ek link badalne se baaki do chup-chaap ud jaate. Schema service ki mehnat pehle hi
bekaar kar deta tha. Ab update wala social **nested partial** hai.

**Tests:** 214 → **231** (17 naye). Lint, prettier, admin build clean.

**⚠️ Ek blocker mila jo 20 Aug ka bacha hua hai**

`pnpm cms migrate:status` kehta hai `004-sync-builtin-role-permissions.js` **modified**
hai. File git me kabhi badli nahi — par migration **13:35** pe chali thi aur commit
**19:07** pe hua, aur beech me `pnpm format` ne use reformat kar diya. DB me purana
checksum pada hai.

`migrate()` checksum mismatch pe **throw** karta hai, isliye **005 apply nahi ho sakti**
jab tak ye theek na ho. 004 ka `up()` poori tarah idempotent hai (code se permissions
`$set` karta hai), isliye ledger row hata kar dobara chalana surakshit hai — par wo
client ke dev DB pe likhna hai, isliye poochha gaya hai.

**General ka design theek kiya — aur ek galti pakdi gayi**

Client ka faisla. Us section ke teenon fields (Front page displays · Homepage · Posts per
page) ka koi asar hi nahi hai jab tak `entries` na aayen. Ek disabled field khaali dikhta
hai; poora section jiske saare controls kuch karte hi nahi — wo **jhootha** lagta hai.
Fields schema me maujood hain, sirf UI Phase 1 me aayegi. D-40 me likh diya.

**Media ka faisla: alag session me**

Logo/Favicon ke liye Media chahiye, aur Media Slice 0 ka bhi blocker hai (D-27 ke scope me
"logo" likha hai). Recommendation di thi — **poora Phase 2 Media nahi, sirf uski
foundation** (model · storage driver abstraction · upload hardening · sharp variants),
kyunki Settings pe alag "logo upload" banane se do upload raaste ban jaate aur logo
`media` collection se bahar reh jaata. Client ne kaha wo **naye session me** hoga taaki
Media ka poora kaam ek hi session me rahe.

**Agla:** Media foundation (naya session) → phir General ka Logo/Favicon → General poora.
Uske baad Slice 0 — Header + Footer (D-27).

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
