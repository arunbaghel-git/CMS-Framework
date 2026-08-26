# 007 — Packages

**Status:** 🟡 Draft — client ke saath 26 Aug ko discuss hua, kuch item abhi khule hain
**Phase:** Phase 1 — Content Core, par **client ke order se** (D-45 §2)
**Blocks:** Packages ka poora feature; iske baad Pages/Posts lagbhag muft
**Related:** D-25 (trash), D-30 (ruki hui cheezein), D-45 (apna stack), spec 002 (content
contract), spec 005 (field DSL), `docs/reference/admin-design.html`,
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

> ❓ **Ye faisla client ko confirm karna hai.** Iske badalne se poora plan badal jaata hai,
> baaki kisi bhi item ke badalne se nahi.

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
- **Rating aur reviews** — page pe `4.9 ★ · 412 traveller reviews` hai, source tay nahi ❓

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
addOns[]              Add Ons se chune hue
hotels[]              Hotels se chune hue — §4.2
faqs[]                question · answer
availability          `open` | `soldOut`   ❓ status hai ya alag field
featured              boolean
```

**Ye admin design me the, par client ne hata diye (26 Aug):**

```
Package Code · Difficulty · Group Size · Show "Trending" ribbon
Enable enquiry form · Travel Themes (tag input) · Day Images
Gallery grid (sirf 1 banner bacha) · Fixed Departures · Occupancy Slabs
Inclusions & Exclusions panel
```

> ⚠️ **Package Code hata diya, par All Packages list me `Code` column hai.** Column bhi
> hatana hoga, ya code kahin aur se aayega. ❓

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
| Title · `4.9 ★ · 412 reviews` | title · ❓ |
| `Port Blair · Havelock · Neil` | destinations[] |
| `5 nights / 6 days` | nights, days |
| `₹31,999 → ₹24,999 per person · twin sharing` | pricing — sabse sasti category |
| `pintro` | shortDescription |
| About this itinerary | overview (rich text) |
| Route strip | **itinerary se derived** (§3.1) |
| At a glance — Duration · Ferries · Hotels · Best season | derived · ferriesNote ❓ · category · bestSeason |
| Day-by-day | itinerary[] |
| Din ki chips | `Stay:` overnightStay · transfer · meals · note |
| Hotel category tabs + tables | categoryPricing[] + hotels[] |
| Popular add-ons | **Add Ons** (global) |
| What's included | **What's Included** (global) |
| FAQ | faqs[] |
| Booking form | pricing + settings (phone/email) |
| Related packages | ❓ manual ya apne aap |

---

## 7. Build ka order

Har slice ke baad kuch **chalta hua** hona chahiye — client dekh sake.

```
SLICE 1   entries + contentTypes engine
          status · slug · path · trash · publish · revisions · optimistic concurrency
          + `package` type register
          → abhi kuch dikhta nahi, par sab isi pe khada hai

SLICE 2   Master lists (chhoti screens, ek jaisi)
          Destinations · Package Type · Transfer · Add Ons · What's Included · Hotels
          → client apni vocabulary bhar sakta hai

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
          + FAQ

SLICE 7   Public package page — poora render
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
| `settings` | `whatsIncluded{included[],excluded[]}` · `itineraryImages[]` | — | nahi (singleton, D-01) |

**Indexes** — `siteId` hamesha pehle (schema-change skill §5):

```
entries    { siteId, locale, path }           unique    ← routing ka primary path
           { siteId, type, status, updatedAt }          ← admin list
           { siteId, deletedAt }                        ← trash
           { siteId, publishAt }                        ← scheduled publish (D-11)
taxonomies { siteId, type, slug }             unique
hotels     { siteId, destinationId, category }
```

> ⚠️ **Text index sirf ek** ho sakta hai (schema-change §5) — isliye `searchText`
> denormalized field day 1 se, aur naya text index kabhi nahi.

---

## 9. Khule sawaal

Inme se koi bhi **plan ko nahi rokta** — build ke waqt tay ho sakte hain. Sirf pehla
buniyaadi hai.

| # | Sawaal | Kab chahiye |
| --- | --- | --- |
| **1** | **Package = `entries` ka type?** (upar wala faisla) | Slice 1 se pehle |
| 2 | `What's Included` aur `Inclusion/Exclusion` — ek hi hain? | Slice 2 |
| 3 | `Room` hotel ke record me ya package me? | Slice 2 |
| 4 | Transfer record me icon? Duration per-day? | Slice 2 |
| 5 | Package Type flat ya hierarchical? | Slice 2 |
| 6 | List ka `Code` column — hataayein? | Slice 3 |
| 7 | `Best For` me kya bharega? | Slice 3 |
| 8 | Rating (`4.9 ★ · 412`) kahan se? | Slice 3 |
| 9 | `Sold Out` — status hai ya `availability` field? | Slice 3 |
| 10 | Din ka `note` field (`Approx. 4 hrs sightseeing`)? | Slice 4 |
| 11 | Per-day `Hotel Category` dropdown hatana hai? | Slice 4 |
| 12 | Category ka `note` field? | Slice 5 |
| 13 | `Ferries: 3 legs` — apne aap gine ya likha jaaye? | Slice 5 |
| 14 | Related packages — manual ya apne aap? | Slice 7 |
| 15 | Enquiries (Q-2) — `Enq.` column aur booking form iska intezaar kar rahe hain | baad me |

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
