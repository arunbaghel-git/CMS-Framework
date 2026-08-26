# 007 — Packages

**Status:** 🟢 Approved — 26 Aug. Buniyaadi faisla (Package = `entries` ka type) client
ne confirm kar diya → **D-46**. Baaki 15 sawaal (§9) build ke waqt tay honge, koi plan nahi
rokte.
**Phase:** Phase 1 — Content Core, par **client ke order se** (D-45 §2)
**Blocks:** Packages ka poora feature; iske baad Pages/Posts lagbhag muft
**Related:** D-46 (package = entries ka type), D-25 (trash), D-30 (ruki hui cheezein),
D-45 (apna stack), spec 002 (content contract), spec 005 (field DSL), `docs/reference/admin-design.html`,
`docs/reference/itinerary-v3.html`

---

## Problem

Client ko **tour packages** bechne hain. Aaj CMS me content ka koi concept hai hi nahi —
`entries` collection bani hi nahi. Yaani abhi ek bhi page, post ya package banaya nahi ja
sakta; sirf config (settings, menus, media) hai.

Package koi saada page nahi hai: usme din-wise itinerary hai, chaar hotel category ke alag
daam hain, add-ons hain, aur kai aisi listein hain jo har package me dohrayi jaati hain.

**Do reference is spec ke aadhar hain:**

| File | Kya batati hai |
| --- | --- |
| `docs/reference/admin-design.html` | admin ka screen — `s-packages`, `s-package-edit`, `s-taxonomy` |
| `docs/reference/itinerary-v3.html` | public page — asli output, aur **isi se pata chalta hai ki data me kya chahiye** |

⚠️ Dono me farq hai. Jahan takraav hai, wahan **client ka 26 Aug ka faisla** jeeta hai; wo
har jagah likha hua hai.

---

## Buniyaadi faisla — Package `entries` ka content type hai

**`packages` naam ki alag collection nahi banegi.**

Package me status, slug, permalink, trash, revisions, publish, SEO — ye **wahi** hain jo
Pages aur Posts me honge. Alag collection ka matlab hai yahi poora engine dobara likhna,
aur do jagah likhne ka nateeja is repo me pehle bhi dekha ja chuka hai (D-43 §4 ka cache
tag, D-44 §5 ka wahi bug dobara).

```
entries          ek engine — type se farq
  type: 'package' | 'page' | 'post'
  title, slug, path, status, publishAt, deletedAt, version, seo
  content{}     rich text / blocks  (spec 002 ka envelope)
  fields{}      type-specific data  ← package ka saara maal yahan

contentTypes     har type ka apna field set (spec 005 ka DSL)
  key: 'package', urlPattern: '/packages/{slug}', hasArchive: true
```

**Nateeja:** Packages banane me Content Core ka kaam bhi ho jaata hai. Uske baad Pages aur
Posts sirf apne field set ki baat hain — engine dobara nahi likhna padta.

> ✅ **Client ne 26 Aug ko confirm kar diya** — poora tark aur reject kiya hua raasta
> **D-46** me. Master lists (`hotels`, `addOns`, `transfers`, `packageDefaults`) phir bhi
> apni collection me rehti hain: unka apna URL aur publish lifecycle nahi hai. Lakeer wahi
> hai — "iska apna URL aur publish lifecycle hai?", "ye package se juda hai?" nahi.

---

## Scope me kya hai

10 submenu, jaise client ne 26 Aug ko bataye:

```
1. All Packages          6. What's Included
2. Add New               7. Package Type
3. Destinations          8. Itinerary Images
4. Hotels                9. Transfer
5. Add Ons              10. Inclusion/Exclusion  ← #6 ka hi doosra naam (neeche dekho)
```

## Scope me kya NAHI hai

- **Pages aur Posts ki screens** — engine banega, unki screens baad me
- **Enquiries module** — package se juda hua hai par alag kaam hai (Q-2)
- **Page builder / blocks** — package ka content rich text hai, blocks nahi (Phase 5)
- **Booking ka asli flow** — page pe form hai, par wo submit hone ke baad ka kaam Enquiries
  ke saath aayega
- **Asli review system** — verified booking se juda hua, submission aur moderation wala
  reviews ka feature. Rating aur review ke **fields** scope me hain (§2.2) taaki page render
  ho sake, par unhe bharne ka koi automatic raasta abhi nahi banega

---

## 1. Master lists — jo submenu se aati hain

Client ka poora model yahi hai: **jo cheez dohrayi jaati hai, wo ek baar likhi jaaye aur
har package usme se chune.** Isse spelling har jagah ek jaisi rehti hai aur ek hi cheez
baar-baar type nahi karni padti.

### 1.1 Destinations — hierarchical taxonomy

**Admin design ka `s-taxonomy` waise ka waisa** (client: "abhi jo hai admin me same
rahega").

```
name · slug · parent (India → Kerala → Munnar) · description · bannerImage
list me: Name · Slug · Description · Packages count
```

Kahan dikhta hai: breadcrumb, `Port Blair · Havelock · Neil` wali line, route strip ke
cards, har din ka Overnight Stay, aur Hotels ka pehla dropdown.

### 1.2 Package Type — flat taxonomy

Admin design ke **"Travel Themes"** ki jagah. Honeymoon · Adventure · Family · Pilgrimage
jaise. Package editor ke sidebar wala free-tag input **hata diya gaya**; ab ye ek managed
list hai.

List screen me iska column **"Theme"** hai.

> ❓ Hierarchical chahiye ya flat — abhi flat maan kar chal rahe hain.

### 1.3 Hotels

```
destination (Destinations se) · category (fixed 4) · name · room ❓
```

Public page pe iska output:

```
Island       │ Nights │ Hotel                                       │ Room
Port Blair   │   1    │ City hotel near Aberdeen Bazaar (or similar) │ Deluxe, twin sharing
```

`Nights` itinerary se aata hai, `Hotel` yahan se.

**Category ki ginti fix hai — 4** (`standard · deluxe · premium · luxury`), client ka
faisla. Code me constant, koi master list nahi.

> ❓ `Room` (`Deluxe, twin sharing`) hotel ke record me rahega ya package me — tay nahi.

### 1.4 Add Ons

Public page ka **"Popular add-ons"** table.

```
name · price · where
```

**`price` free text hai, number nahi** — page pe `₹3,500 – ₹4,500 pp` (range) aur
`₹2,500 per couple` (alag basis) dono hain. Number field me ye likhe hi nahi ja sakte.

**`where` me din ka zikr nahi hoga.** Page pe abhi `Elephant Beach or Nemo Reef, Havelock
— Day 3` likha hai, par `— Day 3` us package ka hai; global list me wo nahi jaa sakta.
Master list me sirf jagah rahegi.

⚠️ **Add-ons har package pe CHUNE jaate hain, poori list nahi chhapti.** Ye What's Included
se alag hai — wo global hai, ye nahi. Wajah seedhi hai: jo package Havelock jaata hi nahi,
uspe "Elephant Beach snorkelling" dikhana galat hai. Editor me checkbox list hogi, aur
package sirf apne chune hue add-ons render karega (`fields.addOns[]`, §2).

### 1.5 What's Included — ek **global** list

Public page ka `What's included` block — do column, INCLUDED aur NOT INCLUDED.

```
included[]     line ka text
excluded[]     line ka text
```

**Ye poori tarah global hai — har package pe wahi list chhapti hai** (client ka faisla).
Package editor me iska koi panel **nahi** hai; admin design wala "Inclusions & Exclusions"
panel hata diya gaya.

> ⚠️ **Content ki ek zaroori baat:** page ka aaj ka text package-specific hai —
> *"**5 nights** on twin sharing"*, *"**Port Blair → Havelock → Neil** ferry tickets"*.
> Global list me ye lines **generic** likhni padengi, jaise *"Accommodation on twin sharing
> with daily breakfast"* aur *"All ferry tickets on your route"*. Ye content likhne ka
> kaam hai, code ka nahi — par pehle se pata hona chahiye.

**`Inclusion/Exclusion` isi submenu ka doosra naam hai.** Client ne dono naam bataye the,
par dono ka target ek hi block hai. Spec me ek hi maan kar chal rahe hain.

> ❓ Agar ye sach me do alag cheezein hain to build ke waqt batana — ek section badlega.

### 1.6 Transfer

Admin design me har din ek dropdown hai:

```html
<label>Transfer</label>
<select>
  <option>Private AC Sedan</option><option>Tempo Traveller</option>
  <option>Flight</option><option>Train</option>
</select>
```

Abhi wo **hardcoded** hai. Submenu us list ko client ke haath me deti hai, taaki wo
`Catamaran`, `Ferry`, `Airport drop` jaise apne option jod sake.

Public page pe din ki chip me dikhta hai: `🚗 Private cab`, `⛴ Ferry: 90 min`.

> ❓ Record me sirf naam rahega ya icon bhi — page pe car aur ferry ke alag icon hain.
> ❓ Duration (`90 min`) har din likhi jaayegi ya nahi.

### 1.7 Itinerary Images — ek **global pool**

Client ek baar ~20 image daalta hai. Har package page pe unme se kuch dikhti hain, aur
**refresh pe badal jaati hain**. Sirf itinerary/package pages pe (client ka faisla).

Public page pe: upar ka gallery strip — 5 image + `+18 photos`.

**Randomness client-side hogi.** Wajah: site Next.js ISR pe hai (D-14) — page ek baar
bante hi cache ho jaata hai, to server pe random karne ka koi matlab nahi; jo pehli baar
chuna wahi sabko dikhta rehta. Server saari URL bhej dega (bas strings), browser load pe
chunega. ISR waise ka waisa rehta hai.

**Package ka banner isse alag hai** — wo har package ka apna, editor me.

---

### 1.8 packageDefaults — Packages ke apne globals

Kuch cheezein har package pe **bilkul same** chhapti hain. Wo kisi ek package ka data nahi
hain, par site ki setting bhi nahi hain — wo **Packages ke domain ki globals** hain.

```
packageDefaults          ek document (wahi pattern jo settings ka hai, D-01)
  whatsIncluded
    included[]           §1.5
    excluded[]           §1.5
  itineraryImages[]      §1.7 — media ids ka pool
  bookingSteps[]         title + text — page ka "How booking works" (§6)
  cancellationText       "Cancellations more than 30 days before travel…"
```

**Ye `settings` me kyun nahi daala:** technically wahan daalna sasta tha (singleton hai,
naya field bhaari nahi padta). Par `settings` **site** ki settings hai — site ka naam,
logo, timezone, footer. Usme package ka maal daalne ka matlab hai ki kal Pages aur Posts
aayenge to unka maal bhi wahin jaayega, aur ek din `settings` ek kachra-peti ban jaayegi
jise koi khol kar nahi padh sakta.

Alag global rakhna aaj bhi utna hi sasta hai, aur naam se hi pata chalta hai ki andar kya
hai.

---

## 2. Package ka apna data

Jo master list se nahi aata, wo `entries.fields` me:

```
shortDescription      page ka `pintro` — title ke neeche ek line
bestFor               ❓ client ne add karne ko kaha, content tay nahi
nights, days          `5 nights / 6 days`
bannerImage           ek hi image (gallery grid hata diya gaya)
overview              rich text — "About this itinerary"
bestSeason            `Oct – May`
ferriesNote           `3 legs, included`   ❓ ya legs se apne aap gine jaayein

destinations[]        Destinations se
packageTypes[]        Package Type se

itinerary[]           din-wise — §3
pricing{}             §4
addOns[]              Add Ons se CHUNE hue (§1.4) — poori list nahi chhapti
hotels[]              Hotels se chune hue — §4.2
faqs[]                question · answer — page ka "Questions about this package"
goodToKnow[]          heading + rich text — §2.1
ratingValue           4.9   ratingCount           412   / teen jagah dikhta hai — §2.2
reviews[]             §2.2
seoSchema             boolean — design ke SEO panel ka "Emit Product + Trip schema"
availability          `open` | `soldOut`   ❓ status hai ya alag field
featured              boolean
```

**`Visibility` ka koi naya field nahi hai.** Admin design ke Publish panel me
`Visibility: Public` likha hai — wo `status: 'private'` hi hai, jo spec 002 me pehle se
maujood hai. Ye yahan isliye likha hua hai taaki koi `visibility` naam ka doosra field na
bana de, aur phir do jagah se ek hi cheez tay hone lage.

**Ye admin design me the, par client ne hata diye (26 Aug):**

```
Package Code · Difficulty · Group Size · Show "Trending" ribbon
Enable enquiry form · Travel Themes (tag input) · Day Images
Gallery grid (sirf 1 banner bacha) · Fixed Departures · Occupancy Slabs
Inclusions & Exclusions panel
```

> ⚠️ **Package Code hata diya, par All Packages list me `Code` column hai.** Column bhi
> hatana hoga, ya code kahin aur se aayega. ❓

### 2.1 "Good to know before you book"

Page pe ye ek poora `<h2>` section hai, aur usme **do alag kism ka content** mila hua hai:

```
Good to know before you book
  h3  The ferries decide this itinerary      ← IS package ke baare me
  h3  What the days actually feel like       ← IS package ke baare me
  h3  Booking & cancellation
      ol.steps  Tell us your dates → Get the day-by-day plan
                → Confirm with 25% → Travel with a local on call
      p         cancellation policy
```

Pehle do package ke apne hain — har itinerary ki ferry wali majboori alag hoti hai. Aakhri
wala **har package pe bilkul same** hai; booking ka tareeka package se nahi badalta.

Isliye do jagah:

| Hissa | Kahan |
| --- | --- |
| `goodToKnow[]` — heading + rich text, repeatable | package me (§2) |
| `bookingSteps[]` + `cancellationText` | `packageDefaults` me (§1.8) |

Theme dono ko ek hi section me jod kar dikhati hai.

### 2.2 Rating aur reviews

Rating page pe **teen jagah** hai — header me (`4.9 ★ · 412 traveller reviews`), aur
"Similar itineraries" ke har card pe. Yaani ye package ka apna data hai, kisi ek jagah ka
text nahi.

Uske alawa page pe **review cards** bhi hain. Design me wo placeholder hain, par shape saaf
hai:

```
★★★★★   Month 2026
"Placeholder review text — swap in a verified guest review…"
Guest name
Travelled 5N / 6D · verified booking

reviews[]
  stars · date · text · guestName · tripLine
```

⚠️ **Ye asli review system NAHI hai.** Verified booking se juda hua, moderation wala reviews
ka feature apna alag kaam hai — usme submission, spam aur "verified" ka matlab tay karna
padta hai. Abhi sirf **fields** rakhe ja rahe hain taaki page render ho sake aur client
haath se review daal sake.

> ❓ `ratingValue`/`ratingCount` haath se bharenge, ya `reviews[]` se apne aap gine
> jaayein — tay nahi.

---

## 3. Itinerary Builder

Har din:

```
title             `Arrive at Sri Vijaya Puram, Corbyn's Cove…`
overnightStay     dropdown — Destinations se   ← client ne free text se badla
description       paragraph
highlights[]      bullet list (page ka `itin__l`)
meals             breakfast · lunch · dinner (checkbox)
transfer          Transfer list se
transferNote      `90 min`  ❓
dayTag            `Arrival day`  — din ke card pe chhota label
note              `Approx. 4 hrs sightseeing` · `Add-ons priced below`  ❓
```

Din drag se reorder hote hain (wahi `useListDrag` jo menus me hai), aur collapse/expand
hote hain (wahi `.day` accordion).

**Day Images hata diye gaye.**

> ❓ Admin design me har din ek **Hotel Category** dropdown bhi hai (`3★ Deluxe` waghairah).
> Naye model me category package-level hai, to wo per-day dropdown bemaani lagta hai —
> hatana hai ya nahi, tay nahi.

### 3.1 Route strip apne aap banta hai

Ye **sabse zaroori derived cheez** hai — client ko iske liye kuch bharna nahi padega:

```
Itinerary                              →   Route strip
  Day 1  Overnight: Port Blair              NIGHTS 1     Port Blair
  Day 2  Overnight: Havelock          →     NIGHTS 2–3   Havelock
  Day 3  Overnight: Havelock                NIGHT 4      Neil Island
  Day 4  Overnight: Neil Island             NIGHT 5      Port Blair
  Day 5  Overnight: Port Blair
  Day 6  (departure)
```

**Lagatar din jinka Overnight Stay same hai wo ek card me judte hain.** Kitne bhi din hon
(2, 4, 6) — cards khud ban jaate hain.

Isi se `Nights` column bhi aata hai (§1.3 ka hotel table), aur `Duration` chip bhi.

---

## 4. Pricing

```
currency        INR | USD | AED        ← poore package ke liye ek
priceBasis      per person | per couple | per group
gstPercent
advancePercent

categoryPricing[]   char category, har ek ka apna
  category      standard | deluxe | premium | luxury
  priceFrom     24999
  strikePrice   31999
  note          `A clear step up on all three islands…`  ❓
```

Editor me category ek **dropdown** se chuni jaayegi, aur neeche uske apne field bharenge
(client ka faisla). Fixed Departures aur Occupancy Slabs dono hata diye gaye.

Page ke upar ka `₹31,999 → ₹24,999` sabse sasti category se aata hai, aur booking form ka
hotel-category dropdown inhi chaar se banta hai.

`₹24,999 per person on twin sharing, daily breakfast included` wali line **price + basis se
apne aap ban sakti hai** — alag field ki zaroorat nahi.

### 4.2 Hotels package me

Har category × har destination ke liye ek hotel:

```
hotels[]
  destination   Port Blair
  category      standard
  hotelId       Hotels list se
```

`Nights` itinerary se, `Room` hotel ke record se (❓ ya yahan se).

---

## 5. Screens

| Screen | Aadhaar | Note |
| --- | --- | --- |
| All Packages | `s-packages` **waise ka waisa** | status tabs · bulk actions · 3 filter · 9 column · row actions (Edit · Duplicate · Itinerary · Trash · View) |
| Add New / Edit | `s-package-edit`, §2–4 ke hisaab se | 8 panel, kuch hataye kuch jude |
| Destinations | `s-taxonomy` waise ka waisa | hierarchical |
| Package Type | wahi screen, flat | |
| Hotels | naya | list + form |
| Add Ons | naya | list + form |
| What's Included | naya | do list — included, excluded |
| Transfer | naya | chhoti list |
| Itinerary Images | naya | media grid, multi-upload |

### 5.1 Admin design ke dason panel kahan gaye

Ye table isliye hai ki koi bhi ek nazar me check kar sake ki design ka koi panel chhoot to
nahi gaya:

| Design ka panel | Spec me |
| --- | --- |
| Title · Permalink · Overview | §2 — `title`, `slug`, `overview` |
| Itinerary Builder | §3 |
| Inclusions & Exclusions | **hataya** — ab global (§1.5) |
| Pricing & Departures | §4 — Fixed Departures aur Occupancy Slabs hataye |
| FAQs & Policies | §2 `faqs[]` + §2.1 `goodToKnow[]` |
| Publish (Status · Visibility · Availability) | §2 — `status` · `private` · `availability` ❓ |
| Package Details | §2 — `nights`, `days`, `bestSeason`, `featured`; baaki 5 hataye |
| Destinations | §1.1 |
| Travel Themes | **badla** → Package Type (§1.2) |
| Gallery | §2 `bannerImage` — grid hataya, ek banner bacha |
| SEO | §2 — `seo` + `seoSchema` |
| Enquiries (sidebar) | scope se bahar — Q-2 |

**`s-packages` me teen cheezein chhupi hain:**

1. **`Sold Out` ek tab hai** — hamare statuses me wo nahi hai (D-25). Edit screen ke sidebar
   me alag se `Availability: Open` likha hai, to shayad wo alag field hai ❓
2. **`Enq.` column** — Enquiries module ke bina khaali rahega
3. **`Itinerary` ek row action hai** — Edit se alag, seedha itinerary builder kholta hai

---

## 6. Public page → data ki mapping

`itinerary-v3.html` ke har hisse ka source:

| Page pe | Kahan se |
| --- | --- |
| Breadcrumb | `entries.path` + Destinations |
| Gallery strip + `+18 photos` | **Itinerary Images** (global pool, client-side shuffle) |
| Title · `4.9 ★ · 412 reviews` | title · ratingValue + ratingCount (§2.2) |
| `Port Blair · Havelock · Neil` | destinations[] |
| `5 nights / 6 days` | nights, days |
| `₹31,999 → ₹24,999 per person · twin sharing` | pricing — sabse sasti category |
| `pintro` | shortDescription |
| About this itinerary | overview (rich text) |
| Route strip | **itinerary se derived** (§3.1) |
| At a glance — Duration · Ferries · Hotels · Best season | derived · ferriesNote ❓ · category · bestSeason |
| Day-by-day itinerary | itinerary[] |
| Din ki chips | `Stay:` overnightStay · transfer · meals · note |
| Hotel category tabs + tables | categoryPricing[] + hotels[] |
| Popular add-ons | **Add Ons** — package me chune hue (§1.4) |
| What's included | **What's Included** — global, `packageDefaults` (§1.5, §1.8) |
| Good to know before you book | goodToKnow[] + `packageDefaults` ke bookingSteps/cancellation (§2.1) |
| Questions about this package | faqs[] |
| Reviews ke cards | reviews[] (§2.2) |
| Similar itineraries | **derived** (§6.1) |
| Want this trip on your dates? | booking form — pricing + settings (phone/email) |
| Booking form ka Hotel category | categoryPricing[] ke chaar |
| Publish panel ka `Visibility` | `status: 'private'` — naya field nahi (§2) |

**Page ke nau `<h2>` — sab is table me hain:** About this itinerary · Day-by-day
itinerary · Hotels on this package · Popular add-ons · What's included · Good to know
before you book · Questions about this package · Similar itineraries · Want this trip on
your dates?

### 6.1 "Similar itineraries" — sab kuch pehle se maujood data se banta hai

Card ka shape:

```
HONEYMOON                          ← packageTypes[]
Andaman Honeymoon Delights         ← title
Port Blair → Havelock → Neil       ← route — itinerary se derived (§3.1)
4N / 5D · Ferry · Breakfast        ← nights/days · transfer · meals — sab derived
₹…                4.9 ★           ← pricing · ratingValue
```

**Koi naya field nahi chahiye.** Sirf ye tay karna hai ki packages chune kaise jaayein:

- **Apne aap** — same Destination ya same Package Type wale, price ke aas-paas
- **Haath se** — client har package pe 3 related chune

**Salah: apne aap.** Haath se chunne ka matlab hai ki 60 packages me har ek pe 3 chunna, aur
naya package aane pe purane 60 kabhi update nahi honge. Manual override baad me juda ja
sakta hai — wo ek field ka kaam hai. ❓

---

## 7. Build ka order

Har slice ke baad kuch **chalta hua** hona chahiye — client dekh sake.

```
SLICE 1   entries + contentTypes engine                      ✅ 26 Aug
          status · slug · path · trash · publish · revisions · optimistic concurrency
          + `package` type register
          → abhi kuch dikhta nahi, par sab isi pe khada hai
          64 naye test · migration 009 · D-47 (paanch guard)
          ⚠️ slug badalne pe purane path ka 301 abhi nahi banta — Slice 3 se pehle

SLICE 2   Master lists (chhoti screens, ek jaisi) + packageDefaults   ✅ 26 Aug
          Destinations · Package Type · Transfer · Add Ons · Hotels
          packageDefaults — What's Included · booking steps · cancellation
          → client apni vocabulary bhar sakta hai
          API taiyaar · 30 naye test · migration 010 · D-48
          Screens abhi nahi bani — wo admin ka kaam hai (§5)

SLICE 3   All Packages list + Add New (basic)
          title · slug · shortDescription · overview · nights/days · banner
          destinations · packageTypes · status
          → client package bana kar publish kar sakta hai

SLICE 4   Itinerary Builder
          din · overnight stay · description · highlights · meals · transfer
          + route strip derive
          → public page ka sabse bada hissa zinda

SLICE 5   Pricing + Hotels
          categoryPricing + hotels[] + 4 tab
          → daam aur hotel table live

SLICE 6   Itinerary Images pool + gallery
          + FAQ · goodToKnow[] · reviews[] + rating

SLICE 7   Public package page — poora render
          + Similar itineraries (§6.1 — derived)
          (ya har slice ke saath thoda-thoda, agar client jaldi dekhna chahe)
```

**Slice 1 aur 2 ek saath ho sakte hain** — dono ek doosre pe depend nahi karte.

---

## 8. Schema impact

| Collection | Change | Day-1 reserve | Migration |
| --- | --- | --- | --- |
| `entries` | **nayi** | `siteId` `locale` `path` `deletedAt` `version` `searchText` — sab day 1 se (02-ARCH §3) | haan — indexes |
| `contentTypes` | **nayi** | `siteId` | haan — indexes |
| `taxonomies` | **nayi** — Destinations + Package Type | `siteId` `parentId` | haan |
| `hotels` | **nayi** | `siteId` | haan |
| `addOns` | **nayi** | `siteId` | haan |
| `transfers` | **nayi** | `siteId` | haan |
| `packageDefaults` | **naya global** — `whatsIncluded{included[],excluded[]}` · `itineraryImages[]` · `bookingSteps[]` · `cancellationText` | `siteId` | haan — ek document seed |
| `settings` | kuch nahi badalta — package ka maal wahan **nahi** jaayega (§1.8) | — | nahi |

**Indexes** — `siteId` hamesha pehle (schema-change skill §5):

```
entries    { siteId, locale, path }           unique    ← routing ka primary path
           { siteId, type, status, updatedAt }          ← admin list
           { siteId, deletedAt }                        ← trash
           { siteId, publishAt }                        ← scheduled publish (D-11)
taxonomies { siteId, type, slug }             unique
hotels     { siteId, destinationId, category }
packageDefaults { siteId }                    unique    ← singleton, wahi pattern jo settings ka
```

> ⚠️ **Text index sirf ek** ho sakta hai (schema-change §5) — isliye `searchText`
> denormalized field day 1 se, aur naya text index kabhi nahi.

---

## 9. Khule sawaal

Inme se koi bhi **plan ko nahi rokta** — build ke waqt tay ho sakte hain. Jo ek buniyaadi
tha (#1), wo 26 Aug ko band ho gaya (D-46).

| # | Sawaal | Kab chahiye |
| --- | --- | --- |
| ~~1~~ | ~~Package = `entries` ka type?~~ ✅ **haan** — 26 Aug, **D-46** | ~~Slice 1 se pehle~~ |
| 2 | `What's Included` aur `Inclusion/Exclusion` — ek hi hain? | Slice 2 |
| 3 | `Room` hotel ke record me ya package me? | Slice 2 |
| 4 | Transfer record me icon? Duration per-day? | Slice 2 |
| 5 | Package Type flat ya hierarchical? | Slice 2 |
| 6 | List ka `Code` column — hataayein? | Slice 3 |
| 7 | `Best For` me kya bharega? | Slice 3 |
| 8 | `ratingValue`/`ratingCount` haath se, ya `reviews[]` se gine jaayein? §2.2 | Slice 6 |
| 9 | `Sold Out` — status hai ya `availability` field? | Slice 3 |
| 10 | Din ka `note` field (`Approx. 4 hrs sightseeing`)? | Slice 4 |
| 11 | Per-day `Hotel Category` dropdown hatana hai? | Slice 4 |
| 12 | Category ka `note` field? | Slice 5 |
| 13 | `Ferries: 3 legs` — apne aap gine ya likha jaaye? | Slice 5 |
| 14 | `packageDefaults` naam theek hai, ya kuch aur? §1.8 | Slice 2 |
| 15 | Similar itineraries — apne aap (salah) ya haath se? §6.1 | Slice 7 |
| 16 | Enquiries (Q-2) — `Enq.` column aur booking form iska intezaar kar rahe hain | baad me |

---

## 10. Jo pehle se maloom traps hain

- **`content` ka shape day 1 se `{ version, blocks[] }`** — rich text ek `richText` block
  ke andar. Phase 5 me migration nahi likhni padegi (05-BUILD-PLAN Phase 1 ka documented
  trap).
- **`resolvePath()` ek hi jagah** — parent slug badle to descendants cascade + har ek pe
  301 (Phase 1 ka rule).
- **Reserved slugs** — `/admin` `/api` `/_next` `/media` `/uploads` block (`RESERVED_SLUGS`).
- **Scheduled publish DB-based**, `setTimeout` kabhi nahi (D-11).
- **Har list pe server-side pagination day 1 se** (R14).
- **Master list se koi item delete ho** to us par point karne wale packages ka reference
  saaf hona chahiye — wahi farz jo D-44 me menu delete pe aaya tha.
