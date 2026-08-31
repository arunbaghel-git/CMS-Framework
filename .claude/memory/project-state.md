# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 31 Aug 2026 (style pass — public responsive poora, admin baaki)

---

## Abhi kahan hain

**Slice 1 ban chuki hai (26 Aug).** `entries` + `contentTypes` engine chal raha hai —
migration 009, 64 naye test, **447 total passing**. Paanch guard **D-47** me likhe hain.

**Slice 2 bhi ban chuki hai (26 Aug).** `taxonomies` + `hotels` + `addOns` +
`transfers` + singleton `packageDefaults` — migration 010, 30 naye test, **477 total**.
Teen faisle **D-48** me.

**Slice 3 ke dono blocker band ho chuke hain (26 Aug — D-49):**

- **A-7** — `entry.taxonomies` ab har type ki apni key rakhta hai
  (`{categories, tags, destinations, packageTypes}`). spec 002 ka contract **ek baar**
  badla, us waqt `entries` me koi asli data nahi tha.
- **A-6** — `redirects` collection ban gayi (migration 011). Slug badalne pe auto-301,
  chain flatten aur loop se bachav ke saath; descendants ke purane URL bhi zinda.
  Manager UI Phase 4 me hi rahegi.

**Slice 3 ka API hissa poora ho chuka (26 Aug — D-50):** package ka field set aur
`taxonomyTypes` ka gate. Field DSL me ek naya type juda — `tags` (chips).
⚠️ D-50 ka `availability` field usi din **hata diya gaya** (D-54) — client ko wo feature
chahiye hi nahi tha. Aaj koi code use nahi padhta; migration **013** uska index gira deti hai.
012 aur 013 dono files rahengi — applied migration ki file hatane pe runner har boot pe
"missing" ki jhoothi chetavni deta hai.

**Slice 3 poori ho chuki (26 Aug)** — API aur screens dono. Saath me Slice 2 ki saat
screens bhi ban gayin (Destinations · Package Type · Hotels · Add Ons · Transfer ·
What's Included · Itinerary Images), kyunki unke bina package editor me chunne ko kuch
hota hi nahi.

**A-8 bhi band ho gaya** — Overview ab TipTap pe hai.

**Slice 4 bhi ban chuki (26 Aug)** — Itinerary Builder, aur uske saath **route strip ka
live preview** jo poori tarah derived hai (§3.1). Teen sawaal band — D-51.

**Public package page shuru ho gaya (D-52)** — client ka faisla: page Slice 7 ka intezaar
nahi karega, har slice ke saath badhega. Abhi live: hero, overview, route strip, day-by-day
itinerary, What is included, booking steps, gallery.

**Ek gap jiska record ab hai — A-9:** Pages aur Posts ki screens abhi bhi "abhi nahi
bana" pe hain, jabki engine (D-46) unhe support karta hai aur seed me dono types register
hain. Kaam Packages wali screens ka doosra roop hai.

**Slice 5 ke teenon sawaal band ho chuke hain (D-53)** — `Room` hotel ke record pe,
category ke daam ke saath ek chhoti line, aur `Ferries` client likhega (`ferriesNote` ban
bhi chuka). Yaani Slice 5 pe **koi rukawat nahi** hai.

**Slice 5 ban gayi (27 Aug — D-56)** — admin aur public page dono ek saath.
`fields.pricing{}` (basis · GST · advance · categoryPricing[]), `fields.hotels[]` aur
`fields.addOns[]`; admin me do naye panel (**Pricing** · **Hotels**) aur sidebar ka
**Add-ons** checklist; page pe price block · catbar · hotels table · add-ons. 13 naye test.

**FAQs ka panel bhi ban gaya (D-59)** — client ne Slice 5 ke saath maanga, Slice 6 ka
intezaar nahi. **Sirf FAQs, policies nahi**: cancellation `packageDefaults` me hi rahegi
(wahi lakeer jo What's Included aur price line pe hai — jo har package pe same hai, wo
package ka data nahi). Jawab **plain text** hai, aur page pe accordion `<details>` se banta
hai — band accordion ka text bhi Ctrl+F se milta hai.

**Editor ki safai — D-64 (27 Aug).** Client ne editor aur page dono chala kar dekha aur ek
saath saat baatein kahin:

- **Transfer duration page pe aati hi nahi thi** — chip ki shart `day.transfer &&` thi, to
  duration akeli likhi ho to poori chip gir jaati thi. Chup bug: admin me text dikhta tha,
  page pe kuch nahi
- Din se **Hotel Category** hata (D-51 §3 ka palat) — uska jawab page pe kahin dikhta hi
  nahi tha
- **`highlights[]` description me mil gayi** — niyam: `-` se shuru hone wali line bullet,
  baaki paragraph. **Migration 014** ne purana data isi shape me daal diya
- **Add-ons wapas package ka chunav** (D-61 ka palat) — sidebar me checklist, aur payload
  `packageDefaults` se wapas entry pe
- Har **remove** pe confirmation (`lib/confirm.js`)
- Main column ke **panels drag se reorder** hote hain (`SortablePanels`) — kram
  `localStorage` me, DB me nahi
- Do chhote fix: panel ki heading beech me chali gayi thi (`space-between` + teesra bachcha),
  aur All Packages ka thumbnail **kabhi wire hi nahi tha** (khaali `<span class="thumb">`)

⚠️ `.toggle-ico` ab **14px** hai jabki reference me 11px — client ka faisla, comment me wajah
likhi hai taaki koi "design se match karo" ke naam pe wapas na kar de.

**Price line ab theme me static hai (D-63)** — admin se uska field **hata diya gaya**
(27 Aug). Wo har package pe, har category pe wahi rehti hai, to uske liye admin me ek aur
jagah dena bina wajah tha. Ab wo `PRICE_NOTE` hai (`components/package/Pricing.jsx`), Q-9
wali baaki teen static lines ke saath.

> Pehle ka safar (ab sirf itihaas): D-62 me wo Packages ▸ Hotels screen pe thi; usse pehle What's Included wali
> screen pe thi, aur ek bug ki wajah se **dono** screens pe dikh rahi thi (guard me
> `section !== 'images'` likha tha jabki sections ke naam `whatsIncluded`/`itineraryImages`
> hain — shart hamesha sach thi). Data ab bhi `packageDefaults` me hai, sirf screen badli.

**Hero me daam ke neeche `per person · twin sharing` hai — aur wo static hai** (27 Aug raat,
client ka faisla). Pehle ye gap tha: reference ki wo **chhoti** line hotels wali lambi line se
alag hai aur uske liye koi field nahi bacha tha (`priceBasis` D-57 me hata). Pehle
`packageDefaults.priceNote` daal kar dekhi gayi — wo poora vaakya hai ("per person on twin
sharing, daily breakfast included.") aur `.ptitle__p` ke `white-space: nowrap` me grid column
ko kheench deti thi. Client ne kaha "har cheez dynamic thodi aayegi", to line theme me likhi
hui hai. `priceNote` apni asli jagah — hotels table ke neeche — waisi hi chal rahi hai.

**Add-ons wapas package ka chunav hain (D-64)** — sidebar me checklist, payload
`packageDefaults` se wapas entry pe. Yaani **spec §1.4 ka asli niyam** hi chal raha hai:
jo package Havelock jaata hi nahi, uspe wahan ke add-ons nahi dikhte.

> ⚠️ **D-61 ab purana hai** (ab sirf itihaas): us din add-ons global kar diye gaye the —
> editor me panel nahi, page pe poori Add Ons list, aur payload `packageDefaults` se
> (cache tag `type:package`). Client ne **usi din** palat diya — D-64. Agar kahin
> "add-ons global hain" padho, wo D-61 wali purani line hai.

**Hotels panel me ab ek hi blank row hai (D-61)** — Destination · Category · Hotel · Add.
Neeche sirf wo rows jo client ne khud jodi hain, ✕ ke saath. Jodi hui row us jodi ke auto
wale ko **hata deti hai**.

**Public hotels table poori tarah derived hai (D-58 + D-60)** — rows itinerary ke overnight
stays se, categories pricing se, aur hotel **Hotels master list** se (ek jodi pe do hotel hon
to naam ke kram me pehla). `fields.hotels[]` ab chunav nahi, **override** hai: package ke
panel me kuch na karo to bhi table bharti hai.

⚠️ **Row teen shart pe banti hai:** wo jagah itinerary me ho · us category ka daam bhara ho ·
us jodi ka koi hotel maujood ho. Panel ke har dropdown ka pehla option `Auto — <hotel>` hai,
taaki khaali chhodne pe kya jaayega wo naam ke saath dikhe.

**Client ke chaar faisle (27 Aug — D-56, D-57):** Pricing panel me **chaaron category ki
row hamesha** (Category · Price From · Strike-through), **currency nahi** (settings se),
**Price Basis / GST / Advance ki poori row nahi**, aur per-category `note` **hotel ke
record pe** chala gaya (Hotels submenu me optional field).

⚠️ **Khaali daam = wo category is package pe milti hi nahi** — wo catbar aur hotels tabs
dono se gayab ho jaati hai. Chhanni server pe hai (`pricedCategories()`), theme me nahi.

**Design ka koi text nahi hataya (R15).** Jo per-package field nahi rahe unka source badla:
`per person on twin sharing…` ab `packageDefaults.priceNote` se (Packages ▸ What's Included
wali screen pe naya "Price line" panel), aur card ki beech wali line us category ke pehle
hotel ke `note` se.

⚠️ **Teen cheezein derive hoti hain, store kahin nahi:** upar ka `₹31,999 → ₹24,999`
(sabse sasti category), hotels table ka `Nights` (`nightsByStay()`), aur `Deluxe category —
₹29,499` ka pehla hissa. `Room` aur `Note` dono package pe nahi hain — wo hotel ke apne
record pe hain (D-53 §3, D-57 §2).

**A-5 band ho gaya (31 Aug)** — `apps/web/.env` ban gayi (`API_URL` + `REVALIDATE_SECRET`),
aur secret `apps/api/.env` wale se **bilkul same** hai. Revalidate ab configured hai: galat
secret pe endpoint **401** deta hai, `503` nahi. ⚠️ **Next `.env` sirf boot pe padhta hai** —
file banane ke baad web dev server restart karna zaroori hai, warna wahi purana 503 aata
rahega aur lagega ki `.env` kaam hi nahi kar rahi.

**31 Aug — section ke heading aur lines ab admin se (D-65).** Q-9 ka bada hissa band.
`packageDefaults.sectionLabels` — 7 section, har ek pe `{ heading, description }`; naya
screen **Packages ▸ Section Headings**. Client ne Q-9 ke teen raaston me se **#2** chuna,
aur har section ko heading **aur** description dono diye — chahe aaj us section ke neeche
line ho ya na ho ("abhi nahi hai to kya hua, aage text bhi daal sakte hai").

**Teen baatein jo yaad rakhni hain:**

1. **Default ek hi jagah hai** — `packages/shared/src/constants/package-sections.js`. Wahi
   list theme ka fallback, admin ka pre-fill aur Zod ki shape teenon deti hai. Naya section
   jodna ab ek file ka kaam hai. Alag rakhne pe wo ek din alag ho jaate — D-43 §2 wala sabak.
2. ⚠️ **Khaali ke do alag matlab.** Khaali `heading` pe theme ka heading wapas aata hai
   (section bina title ke na rahe), par khaali `description` line ko **hata** deti hai.
   Isiliye admin ka form defaults se **bhara hua** khulta hai — placeholder pe client kisi
   line ko hata hi nahi sakta tha, kyunki box khaali karte hi placeholder text wapas dikha
   deta. Hotels wali line me abhi bhi ek jhootha vaada hai ("and on the enquiry form", Q-2),
   aur ab client use khud kaat sakta hai.
3. **`.strict()` test ne pehli hi baar pakda.** Zod anjaan keys chup-chaap hata deta hai, to
   galat section key bhejne pe API 200 deti aur key gayab ho jaati. Wahi bug jo D-43 §3 me
   `leafItemSchema` pe mila tha — **doosri baar**.
4. **Overview pe description ka box nahi hai** (client, usi din). Uska text Edit Package ▸
   Overview (`entry.content`) se aata hai, aur wo per-package hai — wahan global line dena
   do intro ek doosre ke upar rakhna hota. `hasDescription: false`, aur payload me wo key
   aati hi nahi.
5. ⚠️ **Fallback ab ek hi jagah hai** — `resolveSectionLabels()` (`packages/shared`), jise
   public projection **aur** admin ka `toApi()` dono bulate hain. Pehli shakl me admin ki
   apni copy thi aur usne turant ek asli galti bana di: admin ko raw stored milta tha, aur
   save ho chuke doc me har description `''` hoti hai — `?? ` `''` pe fallback nahi karta,
   to form khaali dikhata aur agla Save saari lines **chup-chaap mita deta**. Dev DB pe
   theek yahi hua. Naya test: **admin ka padha hua payload bina badle wapas save ho jaana
   chahiye**.

**Aur ek chup bug isi kaam me nikla — `cancellationText`.** `PackagePage.jsx` use **do
jagah** padhta hai, par `getPublicPackageDefaults()` use payload me bhejti hi nahi thi.
Yaani client ki likhi cancellation policy page pe **kabhi** nahi aati thi, aur "Good to
know" section sirf tab dikhta tha jab booking steps bhi bhare hon. Kahin koi error nahi.
Bilkul wahi shakl jo D-64 wale transfer-duration bug ki thi. **Is codebase ka apna failure
mode yahi hai — payload me field add karna bhool jaana, aur dono taraf ka code sahi dikhna.**

**Agla kaam: Slice 6 ka bacha hua hissa** — `goodToKnow[]` aur `reviews[]` + rating
(`ratingValue`/`ratingCount`).

**31 Aug — hero ka lightbox ban gaya (D-66).** Tile pe click → popup, usme **saari** images
(banner + poora pool), **ek waqt pe ek**, 4 second pe apne aap agli. Hero ka mosaic waisa hi
hai. ⚠️ Design me lightbox/modal/popup **0 baar** hai — R15 ka vichlan, client se aaya.

**Client ne khud chala kar confirm kiya** — popup khulta hai, slide theek chalti hai.

⚠️ Par lightbox **kisi test se bandha hua nahi hai** — repo me koi browser automation nahi
(Playwright/Puppeteer dono nahi), aur R3 ke chalte sirf iske liye nayi dependency lena theek
nahi laga. Aage koi ise tode to suite chup rahegi. Jis din `apps/web` pe component tests
aayein, **hover-pause** wala case pehla candidate hai — wo bug aankh se bhi nahi dikhta tha,
sirf "slide nahi chal rahi" jaisa lagta.

**31 Aug — page ka aakhri CTA card ban gaya (D-67).** Design ka `.offer` — badge + heading +
bullets + box + 2 button. Ab `settings.ctaSection` me, screen: **Settings ▸ CTA Section**.

**Teen baatein:**

1. **`settings` me hai, `packageDefaults` me nahi** — client: "dusre pages par bhi use
   hoga". Ye D-46 ka palan hai, apwaad nahi. ⚠️ Par iska nateeja ye hai ki package page ka
   text ab **do jagah** hai — headings Packages me, ye card Settings me.
2. ⚠️ **Poori tarah static — kuch bhi derive nahi hota** (client: "price kahin se derive
   nahi hoga"). Design me box ka daam aur category `js-px`/`js-cat-name` se aate the; ab wo
   saade text hain. Look bilkul waisa hi, sirf source badla. **Ek hi text har page pe
   dikhega**, isliye admin screen pe box ke upar chetavni likhi hai ki wahan pakka daam mat
   likho.
3. **Button ka URL ek field hai** — enquiry form (Q-2) bana hi nahi. Client: "abhi fields
   bana do jisse bad me bhej sake". Khaali URL pe button payload me jaata hi nahi, yaani
   page pe dikhta nahi (D-30). Form banne pe sirf ek value bharni hai, koi code change nahi.

Isse `09-OPEN-ITEMS` ke **chaar missing sections me se ek** band ho gaya. Sidebar ka
price+enquiry widget abhi bhi Q-2 pe hai — wahan asli form chahiye, sirf link nahi.

⚠️ **Dev DB me smoke data daala hua hai** (badge/heading/bullets/box/2 button) taaki section
dikhe. Client apna content bharega — Settings ▸ CTA Section se.

**31 Aug — style pass: public package page ab har chaudai pe reference se milta hai.**

Client ne mobile pe farak bataya tha. Wajah CSS galat hona nahi thi — **layout galat chaudai
pe flip ho raha tha**. Ye aaj tak kisi check me nahi aaya kyunki **`css-diff.mjs` media blocks
ko jaan-boojh kar hata deti hai**; wo sirf desktop milaati hai. Naya auzaar
`.claude/scripts/media-diff.mjs` wahi kami bharta hai.

Aath breakpoint theek hue. Sabse asardaar `.pgl`: reference **do kadam** me girta hai (1180 pe
sidebar 322→290px, 1024 pe neeche), hamare paas ek hi tha — isliye **1024–1180px ke beech page
reference se milta hi nahi tha**. `.gal` ke purane block me chauthe tile se aage sab
`display: none` the, yaani phone pe pool ki **aadhi tasveerein dikhti hi nahi thin**.

**Phone ka horizontal scroll bhi theek hua** — `.mdrawer` hamesha DOM me rehta hai aur band
haalat me screen ke daayein bahar khada tha. Chrome fixed element ko scroll area me nahi
ginta, **iOS Safari ginta hai** — isliye bug sirf phone pe dikhta tha. Ab `visibility: hidden`
bhi hai, jisse ek **a11y bug** bhi gaya: `aria-hidden` ke bawajood drawer ke link **Tab se
focus ho jaate the**.

⚠️ **Admin ka responsive baaki hai — client ne kaha "baad me".** `admin-design.html` ke do
media block me se **782px wala poora gayab** hai: phone pe sidebar collapse nahi hota aur
`.row2`/`.row3` multi-column rehti hain. Uska code aur zaroori tokens ki line numbers
`.claude/HANDOFF-style-pass.md` me likhi hain.

⚠️ **Ek sawaal client pe khula hai:** `body` me `font-size: 15px` aur `line-height: 1.55`
reference me hain, hamare paas nahi. Browser default 16px hai, yaani jis text pe humne khud
size nahi likha wo **poore site pe** ek pixel bada hai. Asar har page pe hai, isliye bina
poochhe nahi kiya.

**Header aur footer jaan-boojh kar nahi chhue** — unke chaar farq apne-apne comment ke saath
likhe hue the aur ek seedha `.btn` ke client-tuned padding pe hai. Chaaron ab handoff ki
"mat badalna" table me hain, taaki agla pass unhe "match" karne na chal de.

⚠️ Slice 6 ka aadha pehle hi ban chuka hai, isliye uska poora naam padh kar mat chalna:
**Itinerary Images ka pool aur gallery Slice 4/D-52 me aa gaye the**, aur **FAQs D-59 me**
(client ne Slice 5 ke saath maang li thi). Sirf upar wali do cheezein baaki hain.

Un dono se public page ke do khaali section bharenge — **Traveller reviews**, aur "Good to
know" ka **upar wala hissa** (abhi wahan sirf global booking steps + cancellation hain).

**Ek sawaal ispe ruka hai** (spec 007 §9 #8): `ratingValue` (4.9) aur `ratingCount` (412)
client haath se likhe, ya `reviews[]` se gine jaayein? Mashwara: **haath se** — design me
`412 traveller reviews` hai par cards teen hi hain, to derive karne pe wo number chup-chaap
**3** ho jayega aur `4.9 average from 412 trips` wali line jhooth bolegi.

**27 Aug — dev server tunnel/LAN se khulta hai, aur CORS reject 403 hai.** Kaam share
karne ke liye cloudflared tunnel lagate waqt do gap mile, dono asli: Vite sirf localhost pe
bind tha (`host: true` juda — iske bina docker se pahunch, LAN pe mobile test, aur koi bhi
tunnel kabhi nahi chalta), aur allowlist se bahar ka origin **500** ban jaata tha kyunki wahan
plain `Error` throw hoti thi — login screen pe sirf "Something went wrong" dikhta tha, yaani
**configuration ki galti server crash jaisi lagti thi**. Ab wo `forbidden()` hai aur message
me origin ka naam aata hai. Naya env var **`EXTRA_CORS_ORIGINS`** (comma se alag, optional) —
`SITE_URL` ko list nahi banaya ja sakta kyunki wo revalidate webhook ka **target** bhi hai,
aur `*` jaan-boojh kar support nahi (cookies `credentials` ke saath jaati hain — D-12).
spec 003 update ho chuki hai. **Koi naya D-xx nahi liya** — ye D-12 ka palan hai, uska
apwaad nahi.

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
          Revalidate webhook                ✅  31 Aug — apps/web ki .env ban gayi (A-5 band)
          Admin UX iterations (24 Aug)      ✅  drag-drop · accordions · header buttons
          Header design match (25 Aug)      ✅  buttons · drawer · Inter · sticky
          Footer ka naya model (D-44)       ✅  25 Aug — migration 008
          Footer design + responsive        ✅  reference ke values · mobile toggle
          Mega CTA ka variant               ✅  CTA plain text jaisa dikh raha tha
          Q-7 (logo fallback)               🔴  client ka faisla
          Q-8 (drawer vs footer logo)       ✅  26 Aug — ek hi logo dono me theek hai
Phase 1   Content Core — Packages ke order se (spec 007, D-46)
          spec 007 — Packages               ✅  🟢 approved, 26 Aug
          Slice 1  entries + contentTypes    ✅  26 Aug — D-47, migration 009
          Slice 2  master lists + defaults   ✅  26 Aug — D-48, migration 010
          A-6 + A-7 (Slice 3 ke blocker)   ✅  26 Aug — D-49, migration 011
          Slice 3  API (field set etc.)      ✅  26 Aug — D-50, migration 012
          availability hata (D-54)          ✅  26 Aug — migration 013, index gira
          Slice 3  admin ki screens          ✅  26 Aug — list + editor
          Slice 2  ki saat screens           ✅  26 Aug — taxonomy + master lists
          A-8      Overview ka TipTap        ✅  26 Aug — bold/italic/list/link
          Slice 4  Itinerary Builder         ✅  26 Aug — D-51, route strip live
          Public package page        🟡  26 Aug — D-52, slice ke saath badhega
          Dev tunnel/LAN + CORS 403   ✅  27 Aug — EXTRA_CORS_ORIGINS, spec 003
          Slice 5  Pricing + Hotels           ✅  27 Aug — D-56 se D-60, koi migration nahi
          FAQs ka panel (Slice 6 se aage)    ✅  27 Aug — D-59, sirf FAQs
          Public page ka design pass         ✅  27 Aug raat — a33a143, section-dar-section
          Section headings admin se (D-65)   ✅  31 Aug — Q-9 ka bada hissa, migration nahi
          cancellationText payload me        ✅  31 Aug — chup bug, D-64 wali hi shakl
          R17 — admin ka UI text English me  ✅  31 Aug — 16 string; comments Hinglish hi
          Slice 6-7                          🔴  ← agla kaam. specs/007-packages.md §7
          Hero ka lightbox + auto-slide      ✅  31 Aug — D-66, R15 ka vichlan (client)
          Closing CTA card (settings se)     ✅  31 Aug — D-67, Q-2 ka atkav khula
          Public page ka RESPONSIVE pass     ✅  31 Aug — 8 breakpoint, media-diff.mjs
          Phone ka horizontal scroll         ✅  31 Aug — band drawer, + a11y bug
          Admin ke chhote CSS fix            ✅  31 Aug — field gap, textarea 150px, menu dropdown
          Admin ka responsive                🔴  ← 782px block gayab. Client: baad me
Phase 2+  Media library aur aage           🔴
```

**Health:** 581 tests passing · lint clean · admin build clean · API media/settings
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

### 27 Aug (raat) — public package page ka design pass (`a33a143`)

Client ne har section ka screenshot de kar `itinerary-v3.html` se milaan karwaya. Jo sections
bane hi nahi (reviews · similar itineraries · enquiry band · sidebar widget) unhe chhoda.

**Sabse kaam ki baat aage ke liye: ab tak `globals.css` me chaar _base_ rule gayab nikle
hain** — `p`, `h1..h5`, aur do jagah list ka reset. Wajah ek hi hai: CSS reference ke
**class rules** se selector-by-selector likhi gayi thi, uske **base resets** se nahi. Aur
`css-diff.mjs` inhe kabhi nahi pakdegi, wo sirf `.`-wale selectors dekhti hai. Kisi bhi naye
section pe pehle ye dekho ki reference ka koi element-level rule to nahi chhoot raha.

Do aur cheezein jo is pass me sikhi:

- **Token milaana kaafi nahi hota.** Maine `1280px`/`26px` dono taraf same dekh kar kaha tha
  "width theek hai" — galat. `.pkg__hero` aur `.pgl` pe `padding` **shorthand** tha aur dono pe
  `.wrap` bhi; shorthand ka beech wala `0` left/right bhi 0 kar deta tha, aur wo rules `.wrap`
  ke baad aate the. `.wrap` jaisi utility ke saath koi bhi `padding`/`margin` shorthand shak ke
  daayre me hai.
- **`css-diff.mjs` ab paanch jhoothe alert deti hai** (`>` combinator, quote ka farq,
  shorthand). Aage bharosa karne se pehle wo teen cheezein sikhani hongi.

**Naya hardcoded content — `CATEGORY_COPY`** (`apps/web/components/package/Pricing.jsx`):
hotel tabs ka chhota label aur panel ka paragraph. ⚠️ Isme `Sea-facing`, `Beachfront`,
`Havelock`, `Sitapur` — **Andaman ki baat**, jabki core code har client me wahi rehta hai.
Client ne admin me jagah dene se mana kiya aur maujood `note` bhi thukra diya. Theme layer me
hai, `packages/shared` me nahi. Poora sandarbh **`Q-9`** me (`09-OPEN-ITEMS`) — 7 heading aur
6 lines static hain.

**Do cheezein admin ke data ki hain, code ki nahi:** Hotels master list me naam ke andar
`(or similar)` likha hai (page khud jodta hai, do baar dikhta hai), aur din 2/4/5 pe
`transferNote` bhara hai par transfer chuna nahi — isliye ferry ki chip banti hi nahi.

---

## Faisle jo ho chuke hain

| Faisla                | Nateeja                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Field DSL             | **Ek DSL** — `contexts: ['content'\|'block']` (D-24)                                               |
| TypeScript            | **Nahi** — sab JavaScript (D-03)                                                                   |
| Trash                 | **`deletedAt` field**, `status: 'trash'` nahi (D-25)                                               |
| Roles                 | **Paanch** — `subscriber` nahi (D-26), `salesAgent` hai (D-29)                                     |
| Permanent delete      | **Sirf admin**                                                                                     |
| Seed content          | **Khaali** Home + Blog                                                                             |
| Payload spike         | **Band — Payload nahi** (D-45). Client ka frozen design + 2 hafte ka chalta hua code               |
| Pehla milestone       | **Slice 0: Header + Footer** (D-27)                                                                |
| **CSS**               | **Plain CSS** — Tailwind, CSS Modules, CSS-in-JS teenon reject (D-28)                              |
| **Ruki hui cheezein** | Connection point abhi, data baad me (D-30)                                                         |
| **Login screen**      | Design me nahi tha → WordPress-style, design ke tokens se (D-31)                                   |
| **Password hashing**  | `bcryptjs` cost 12 — native `bcrypt` nahi (D-32)                                                   |
| **`.env` loading**    | Node ka `process.loadEnvFile()` — `dotenv` nahi (D-33)                                             |
| **Users**             | `username` immutable · asli delete + reassign · admin protected (D-34)                             |
| **Password**          | Sirf admin set karta hai; user khud nahi badal sakta (D-35)                                        |
| **Built-in roles**    | Code-owned — permissions har deploy pe sync hoti hain (D-36)                                       |
| **Users ka menu**     | Role-aware — admin ko 3 item, baaki ko sirf Profile (D-37)                                         |
| **Apna password**     | User Profile se khud badal sakta hai, current password ke saath (D-37)                             |
| **Session ki umr**    | 24 ghante · "Remember me" pe 7 din · dono sliding (D-38)                                           |
| **Role dena**         | Apna role khud nahi · apni permission se upar ka role kisi ko nahi (D-39)                          |
| **Settings**          | Screens design se (Phase 7 se aage khiskin) · Site URL env se, editable nahi (D-40)                |
| **Media**             | Foundation Phase 2 se aage khiski · variant + storage contract frozen · SVG blocked (D-41)         |
| **Logo ka reference** | Media id write pe validate hoti hai · broken `<img>` kabhi nahi · orphan media abhi accept (D-42)  |
| **Menu ka contract**  | Typed · mega = Columns→Groups→Links · layout aur columnCount alag · mobile wahi data (D-43)        |
| **className**         | Sirf presentation — behaviour kabhi nahi (R18, D-43)                                               |
| **Footer ka model**   | `settings.footerColumns[]` — ginti client chunta hai · menu/text/dono · apna logo (D-44)           |
| **Package kya hai**   | `entries` ka ek **type** — apni collection nahi (D-46). Master lists apni collection me            |
| **Engine ke guard**   | Create se publish nahi · published ka title URL nahi badalta · revision poora snapshot (D-47)      |
| **Master lists**      | Teenon ek module me, par teen alag routes aur alag permissions. `locale` sirf taxonomies pe (D-48) |
| **Taxonomy ka ref**   | `entry.taxonomies` me, har type ki apni key — `fields` me nahi (D-49). spec 002 ek baar badla      |
| **Slug badalna**      | Auto-301 + chain flatten + loop se bachav; descendants pe bhi (D-49)                               |
| **Sold Out**          | ~~`availability` field~~ — **hata diya** (D-54); client ko wo feature chahiye hi nahi              |
| **Route strip**       | Derived — lagatar same stay wale din judte hain. `nightsByStay()` alag hai (D-51)                  |

Specs 001–007: 001/002/003 ✅ implemented, 004 🟡 aadha, 005 🟢 approved,
**006 ✅ implemented** (menu contract), **007 🟢 approved** (Packages — D-46).

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

**Saat cheezein jo yaad rakhni hain:**

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

**C-2 (Payload spike)** ab band hai — D-45 (26 Aug). Apna stack hi chalega.

> **Kyun spec pehle:** isi session me dono raaste dikh gaye. D-41 ne media ka contract
> code se pehle freeze kiya — implementation ek baar me saaf utri. Logo ka reference bina
> soche ban gaya tha — uske liye baad me D-42 likhni padi aur ek test ulta assert kar raha
> tha.

---

## 25 Aug — header design ke hisaab se poora

Slice 0 ka header ab client ke reference (`~/Desktop/andaman/home-nav-v3.html`) se match
karta hai. Din bhar client ke saath iterations chale.

```
Header buttons   variant (Outline/Primary/Accent) · icon (7 SVG) · iconOnlyOnMobile
Drawer           logo upar · groups apne accordion me · neeche CTA + "Call <phone>"
Typography       Inter (next/font/google) · reference ke asli colour tokens
Sizing           radius/shadow tokens, sticky header, reference ke mobile overrides
```

**Chhe cheezein jo yaad rakhni hain:**

1. **Do MongoDB ek hi port pe the** — Docker ka container aur Windows ka `MongoDB` service,
   dono 27017 pe. Windows pe `127.0.0.1` wali specific binding Docker ki `0.0.0.0` se **jeet**
   jaati hai, isliye API khaali DB pe chali gayi aur login fail hone laga. `/api/health` phir
   bhi `db: "connected"` bolti rahi — asli surag `migrations.pending: 7` tha. Windows service
   band ki. Machine restart pe wapas chalu ho jaayegi: `sc.exe config MongoDB start= disabled`.
2. **`apps/api/uploads` gayab tha** aur saari media 404 de rahi thi. Ab boot pe resolved path
   log hota hai aur folder na ho to warn. **Purani media wapas nahi aayi** — jo images kahin
   use ho rahi thin, wo dobara upload karni padengi.
3. **`system-ui` vs Inter hi sabse bada visual farak tha.** Windows pe wo Segoe UI banta hai;
   same size/weight pe bhi text halka lagta hai. Saath me kai jagah font-weight likha hi nahi
   tha (drawer/mega/dropdown/footer ke links) — browser 400 laga raha tha, reference 500 pe hai.
4. **`wide`/`full` mega me 3px ka hover gap tha.** Un layouts me `<li>` `position: static` hota
   hai, to `top: 100%` header se naapta hai (64px) jabki link 61px pe khatam hota tha. Nav items
   ab header ki poori height lete hain.
5. **`.btn` ka padding/font-size client ne khud tune kiya hai** — reference se alag hai,
   jaan-boojh kar. Comment me likha hai. **Reference se "match" karne ke naam pe wapas mat badalna.**
6. **D10 palta** — mega ka CTA ab mobile pe nahi dikhta. Wajah D-43 me likhi hai: jis kami ki
   wajah se D10 liya gaya tha (drawer me CTA ka thikana na hona), wo kami bhar gayi.
7. **Mega ka CTA plain text jaisa render ho raha tha.** `.btn` base ab sirf shape deta hai
   (rang variant se aata hai) aur `SiteHeader` CTA ko naked `className="btn"` pe render kar
   raha tha. Ab `cta.variant` ek **structured field** hai (Outline/Primary/Accent, default
   Accent) — class me `btn--accent` likhwana R18 todta. Saath me `BUTTON_VARIANTS`
   `settings.js` se `menu.js` me shift hua, kyunki uske ab do consumer hain aur ulta import
   cycle banata. D-43 ka amendment + spec 006 §1.3.2 dekho.

---

## 25 Aug — footer ka data model badla (D-44)

Client ne teen cheezein maangin, aur teenon D-43 wale model me fit hi nahi hoti thin:
columns ki **ginti** chunna, column me **text** rakhna, aur footer ka **apna logo**.

```
settings.footerColumns[]   max 4 — { id, heading, type, width, menuId, textBlocks[] }
settings.footerLogoMediaId footer + mobile drawer
migrations/008             purane footerColumn1..4 assignments settings me
THEME_MENU_LOCATIONS       ab sirf { header }
packages/shared/constants/icons.js   ICONS + ICON_LABELS — buttons AUR footer dono
apps/web/components/Icon.jsx         ButtonIcon se generalize hua (+clock, mapPin, building)
apps/admin/components/admin/MediaDrop.jsx   General se nikal kar shared hua
```

**Chhe cheezein jo yaad rakhni hain:**

1. **"Number of columns" ki apni state nahi hai** — wo array ko grow/shrink karta hai.
   D-43 §1 me `mega.columnCount` × `mega.columns[]` pe wahi do-source wali dikkat aa
   chuki thi; yahan wo banne hi nahi di gayi.
2. **`type: 'text'` pe `menuId` mit-ta nahi** — bas public payload me nahi jaata. Client
   wapas 'both' kar de to menu turant laut aata hai. Filter **server pe** hai, theme me
   nahi; `type` khud bahar jaata hi nahi.
3. **Footer ka cache tag `settings` hai, `menu:*` nahi.** Footer ka data ab
   `/api/public/settings` se jaata hai, isliye footer me use ho rahe menu ko badalne pe
   `settings` stale hoti hai. `invalidateMenu()` ab wo check karta hai — ye D-43 §4 wali
   galti ka hi agla roop tha.
4. **Menu delete ab footer ka reference bhi saaf karta hai.** Column **delete nahi hota**,
   sirf `menuId` `null` — heading aur text blocks client ka content hain. Isse
   `menus` ↔ `settings` ka circular import banta hai; wo jaan-boojh kar hai aur chalta
   hai (dono taraf hoisted functions, koi top-level call nahi).
5. **Media resolve na ho to id bhi saaf karni padti hai, sirf preview nahi.** Warna server
   D-42 §1 pe har Save 400 deta aur client uske paas se nikal bhi nahi sakta (Remove button
   tabhi dikhta hai jab preview mila ho). ⚠️ Settings ▸ General me abhi bhi wahi shape hai —
   aaj pahunch me nahi (Media delete bana hi nahi), par Phase 2 me wahan bhi karna hoga.
6. **Ek-class wale CSS override is codebase me bharose ke laayak nahi hain.** Footer ke
   text block ka icon dropdown `.ftr-block-icon { width: 130px }` se fix karna chaha —
   par `primitives.css` ka `.sel { width: 100% }` **barabar specificity** rakhta hai, aur
   component ki CSS bundle me primitives se pehle aati hai. Nateeja: select poori row kha
   gaya aur **Label ka input ek 20px ke dabbe me nichud gaya** — client ko dikha hi nahi
   ki wahan koi field hai. Ab `.ftr-block-head .sel.ftr-block-icon`. Ye theek wahi bug hai
   jo D-43 ke iterations me `.edit-grid` × `.appearance-grid` pe hua tha — **doosri baar**.
7. **CSS variable missing hone pe browser chup rehta hai.** `--blue-900` add karna chhoot
   gaya tha (mera guard `var(--blue-900)` ke usage se match ho gaya), aur
   `background: var(--blue-900)` chup-chaap **transparent** ban gaya — poora footer grey
   dikhne laga. Koi error, koi warning nahi. Naya token add karo to ek baar aankh se dekho.
8. **Text plain hai, rich text nahi.** Line breaks `pre-line` se preserve hote hain.
   Admin se aayi HTML render karna stored XSS ka seedha raasta hai.

**Uske baad footer design ke hisaab se poora hua (usi din):**

```
--blue-900 token         footer ka background transparent ban raha tha (neeche #7)
Social                   asli brand SVG (SocialIcon.jsx) · 'x' juda · order SOCIAL_KEYS se
footerNote               bottom bar ke beech ki line (memberships)
footerDisclaimer         sabse neeche ki fine print
Wide column              2x se 1.5x — reference ka `1.5fr 1fr 1fr 1fr`
Breakpoints              1024 → 2 col, 760 → 1 col (reference ke apne)
--pad                    26 / 23 / 20 — desktop / tablet / mobile
Columns ka cap           4 se 6 (min-width 180 → 140, warna 6 wrap ho jaate)
FooterColumn.jsx         mobile pe collapse — sirf MENU-ONLY column
lib/linkify.js           phone/email render pe clickable (+13 test) — 26 Aug
```

**Mobile ka toggle content se decide hota hai, `type` se nahi** — public payload me
`type` jaata hi nahi (D-44 §2). Column collapse hota hai jab heading ho, menu ke items
hon, aur text block ek bhi na ho. Text wale column khule rehte hain kyunki unme phone,
email aur pata hote hain (D-44 §9).

**Migration 008 idempotent hai aur asli DB pe verify ki gayi:** `footerColumns` pehle se
bhari ho to haath nahi lagti (dev DB pe wahi hua — tumhara naya footer data bacha raha),
aur footer wali `menuLocations` rows delete ho gayin. `down()` menu wale columns wapas
locations me daal deti hai.

---

## ⚠️ Naya session shuru karte waqt

### 1. Servers

```bash
docker compose up -d mongo
pnpm dev            # api :4000 · admin :5173 · web :3000
```

⚠️ Agar login fail ho ya data gayab lage — `/api/health` me `migrations.pending` dekho. 0 na ho
to API galat Mongo pe hai (upar point 1).

### 1b. ⚠️ Working tree me **bina commit** ka kaam hai (25 Aug shaam)

Us waqt **do session** saath chal rahi thin — ek footer (D-44) pe, ek mega CTA ke variant pe.
Isliye ye paanch files tree me hain aur **abhi tak commit nahi hui**:

| File                                                | Kya                                                             |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `packages/shared/src/schemas/menu.js`               | `BUTTON_VARIANTS` + `megaCtaSchema.variant` + public payload    |
| `packages/shared/src/schemas/settings.js`           | apna duplicate `BUTTON_VARIANTS` hataya, ab `menu.js` se import |
| `apps/web/components/SiteHeader.jsx`                | `btn btn--${cta.variant}`                                       |
| `apps/admin/src/screens/appearance/MegaBuilder.jsx` | "Button style" dropdown                                         |
| `apps/admin/src/screens/appearance/menu-tree.js`    | `blankCta()` me `variant: 'accent'`                             |

⚠️ **`menu.js` aur `settings.js` ek saath hi commit hone chahiye.** Akele `menu.js` commit
karne pe dono files `BUTTON_VARIANTS` export karengi, `schemas/index.js` ka `export *`
ambiguous ho jaayega aur admin ka import chup-chaap toot jaayega — wo commit build hi nahi hoga.

Alag commit karne ki koshish ki thi, par `settings.js` me dono sessions ke edit **ek hi hunk
me** guthhe hain (unka `ICONS`/`BUTTON_ICONS`, mera `BUTTON_VARIANTS`) — hunk-level pe alag
nahi ho sakte. Isliye ye kaam poore footer ke saath ek hi commit me jaana hai.

Us waqt sab green tha: lint clean, format clean, admin build clean, tests pass.

⚠️ **Par `cta.variant` ka koi test nahi hai.** Is project me contract test se bandhta hai
(spec 006 §10), aur ye ek contract change hai — do case chhoote hue hain: `variant` diye
bina CTA banane pe default `accent` aana chahiye, aur anjaan variant pe `400`. Commit se
pehle `apps/api/src/tests/menus.test.js` me daal do.

### 2. Push baaki hai

**4 commits unpushed.** Push se pehle `pnpm build` chalana hai — wo CI ka aakhri step hai aur
local pe kabhi chala hi nahi, kyunki web ka dev server `.next` hold kiye rehta hai:

```bash
# web dev server band karo (Ctrl+C), phir
rm -rf apps/web/.next
pnpm build && git push
```

### 3. Agla kaam

**Footer poora ho chuka hai** — data model, admin screen, aur design/responsive teenon.
Chaar chhoti cheezein khuli hain, koi bhi bada kaam nahi rok rahi:

| #   | Kya                                                                                                                | Kitna   |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| —   | `pnpm build` **kabhi chala hi nahi** — CI ka aakhri step. Web dev band karke `rm -rf apps/web/.next && pnpm build` | 5 min   |
| A-5 | ~~`apps/web/.env` — `API_URL` + `REVALIDATE_SECRET`~~ ✅ **31 Aug ko ban gayi**                                    | ho gaya |

C-2 band ho chuka hai (D-45), to agla bada kaam **Phase 1 — Content Core** hai — ya jo bhi
client agla approve kare (D-45 §2: is project ka order client se aata hai, kisi fixed
roadmap se nahi).

### 4. Khule items

- **Q-7** — logo na mile to kya dikhe (client ka faisla). Header aur drawer dono interim pe hain
- ~~**A-5** — `apps/web/.env`~~ ✅ **31 Aug ko ban gayi** — revalidate ab configured hai
- **spec 006 §11** — mere 6 resolved decisions ka review baaki

### 5. Ek chhoti gandagi

**Test suite kabhi-kabhi flaky hai** — aaj teen baar `2 failed`/`3 failed` aaya aur turant dobara
chalane pe 355/355 pass. Code ka bug nahi lagta: saare integration test ek hi Mongo pe chalte
hain aur `beforeEach` me wahi collections wipe karte hain, jabki vitest files ko **parallel**
chalata hai. Ye ek asli race hai. Theek karna chahiye — warna kisi din CI bina wajah red hoga
aur log usse "ignore karo, flaky hai" maanne lagenge.

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

HEAD     Footer ab client chalata hai — columns, text, logo (D-44)
513a120  Session handoff — 25 Aug ka header work aur naye session ka plan
ef62308  Header design ke hisaab se poora — buttons, drawer, typography
f5432f2  Adhoori menu rows ab save hoti hain — aur error batata hai kahan
17f3f94  Upload directory missing ho to boot pe bolo, chup mat raho
0cfe50b  ← origin/main yahin khada hai (Kal ka plan — pnpm build verify)
```

52 commits · working tree clean · **5 commits unpushed** (`origin/main` `0cfe50b` pe hai).
25 Aug ke 5 commits: upload-dir warning → menu rows fix → header design → handoff → footer.
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
