# 11 — Reference Admin Design

**File:** [`reference/admin-design.html`](reference/admin-design.html) — browser me kholo
**Analysed:** 20 Aug 2026

Ye ek **asli admin design** hai (travel CMS). Ye tay karta hai admin sach me kaisa
dikhega aur kaam karega. Ye `04-ADMIN-UX.md` ko replace nahi karta — usko **update**
karta hai.

Design ke CSS comments me `components/admin/Sidebar.jsx` jaise paths hain — matlab ye
humare stack ke hisaab se hi banaya gaya hai.

---

## 1. Jo humare plan se match karta hai ✅

Achhi khabar pehle. Ye sab plan me pehle se hai, ab confirm ho gaya:

| Design me | Humare plan me | Status |
|---|---|---|
| Top admin bar (site name, updates, +New, avatar) | Frontend edit bar (§10) | ✅ match |
| Sidebar: Dashboard · Posts · Media · Pages · … · Appearance · Users · Settings | `04-ADMIN-UX.md` §1 | ✅ **bilkul same** |
| Posts ▸ All / Add New / Categories / Tags | Wahi | ✅ match |
| Row actions: Edit · Quick Edit · Trash · View | Edit · View · Duplicate · Trash | ⚠️ Quick Edit humne drop kiya tha |
| Publish panel (status, visibility, schedule) | §3 Document panel | ✅ match |
| **Appearance ▸ Menus me "Mega menu" option** | ⚠️ Kal ka gap | ✅ **confirm ho gaya** |
| Settings ▸ Site Identity (title, tagline, logo, favicon) | Settings ▸ General | ✅ match |
| Settings ▸ Homepage & Archives (front page, posts page, per page) | Settings ▸ Reading | ✅ match |
| "Discourage search engines" toggle | `searchEngineVisible` (D-27 area) | ✅ match |
| Permalink Structure | Settings ▸ Permalinks | ✅ match |
| SEO & Schema settings | Phase 4 | ✅ match |
| Sidebar collapse button | — | ➕ achha addition |
| Enquiries pe red count badge | Pending review count | ✅ same idea |

> **Mega-menu wali baat confirm ho gayi.** Design me menu item pe "Mega menu" type aur
> "4 child items · mega-menu layout enabled" likha hai. Ye wahi gap tha jo maine
> `10-REFERENCE-DESIGN.md` §3 me flag kiya tha. Ab ye **pakka** Slice 0 me banana hai.

---

## 2. ⚠️ Sabse bada gap — Enquiries ek mini-CRM hai, form inbox nahi

Humara plan (Phase 7): *"Form builder + submissions inbox + CSV export + spam guard"*

Design me jo hai:

```
Enquiry #WD-2026-0138                              [New]

┌─ ENQUIRY DETAILS ──────────┐  ┌─ MANAGE ──────────────┐
│ Name · Email · Phone · City│  │ Status                 │
│ Package · Travel Date      │  │  New · Contacted ·     │
│ Adults/Children · Budget   │  │  Quoted · Negotiating ·│
│ Message                    │  │  Converted · Lost      │
│                            │  │ Priority: Normal/Hot/  │
│ Source: Package page       │  │           Low          │
│ UTM: google / cpc / kerala │  │ Assign to: Neha S ▾   │
│ IP · Landing page          │  │ Follow-up on: [date]   │
└────────────────────────────┘  └────────────────────────┘

┌─ ACTIVITY & NOTES ─────────┐  ┌─ SEND QUOTATION ──────┐
│ • Enquiry received  14:22  │  │ Template ▾            │
│ • Auto-reply sent   14:22  │  │ Quote Amount (₹)      │
│ [ Add internal note ]      │  │ Message               │
└────────────────────────────┘  │ ☑ Attach itinerary PDF│
                                 │ ☑ Send copy on WhatsApp│
┌─ QUICK ACTIONS ────────────┐  └────────────────────────┘
│ 📞 Call  💬 WhatsApp        │
└────────────────────────────┘
```

**Ye lead management system hai.** Isme jo cheezein plan me bilkul nahi hain:

| Feature | Plan me? |
|---|---|
| Status pipeline (6 stages) | ❌ |
| Priority (Hot/Normal/Low) | ❌ |
| Staff ko assign karna | ❌ |
| Follow-up date + reminder | ❌ |
| Activity timeline per enquiry | ❌ (activity log site-wide hai, per-record nahi) |
| Internal notes | ❌ |
| Quotation bhejna (template + amount + PDF) | ❌ |
| WhatsApp integration | ❌ |
| UTM / source / landing page tracking | ❌ |
| Auto-reply email | ❌ |

### Mera suggestion

Ye **alag module** hai, forms ka hissa nahi. Do raaste:

**Option A — Phase 7 ko todo (recommend):**
```
Phase 7a  Forms + basic submissions inbox     (plan ke hisaab se)
Phase 7b  Enquiries / Lead management         (naya, ~2 hafte)
```

**Option B — Enquiries ko poora alag phase banao (Phase 9).**

**Kyun ye zaroori hai:** travel agency ke liye enquiry hi **paisa** hai. Content
management se zyada isi screen pe waqt beetega. Agar ye sirf "submissions inbox"
rahega to client apna kaam Excel me karega — aur CMS aadha bekaar ho jaayega.

**Ek design faisla abhi lena hai:** enquiry `entries` collection me jaayegi ya apni
alag collection me? Mera jawab: **alag collection**. Enquiry content nahi hai — uski
apni lifecycle, apne fields aur apni permissions hain.

---

## 3. Packages ka editor — repeater se kaam nahi chalega

Design ka package editor bahut gehra hai:

### Itinerary Builder
```
⠿ 1  Arrive Kochi → Drive to Munnar        130 km · 4 hrs    ▾
      Day Title        [                    ]
      Overnight Stay   [ Munnar             ]
      Description      [ ................... ]
      Meals            ☑ Breakfast ☐ Lunch ☐ Dinner
      Transfer         ○ Private AC Sedan ● Tempo ○ Flight ○ Train
      Hotel Category   ○ 3★ ● 4★ ○ 5★
      Day Images       [ ＋ Add images ]
      [ Remove Day ]

⠿ 2  Munnar Sightseeing                    Overnight: Munnar  ▸
⠿ 3  ...

[ ＋ Add Day ]  [ ⧉ Duplicate Last Day ]
```

Ye humara **`repeater` field** hai — plan me pehle se hai ✅. Par isme drag-reorder,
collapse/expand aur "duplicate last" bhi chahiye. Wo detail plan me nahi thi.

### Pricing & Departures — yahan naya field type chahiye

```
Occupancy Slabs                     ← ye ek TABLE hai
┌──────────────────────┬──────┬──────┬──────┐
│ Occupancy            │  3★  │  4★  │  5★  │
├──────────────────────┼──────┼──────┼──────┤
│ Double sharing       │      │      │      │
│ Triple sharing       │      │      │      │
│ Extra adult          │      │      │      │
│ Child (5–11, no bed) │      │      │      │
└──────────────────────┴──────┴──────┴──────┘

Fixed Departures                    ← ye bhi table
┌────────────┬──────────┬───────┬────────┬────────┐
│ Start date │ End date │ Seats │ Booked │ Status │
└────────────┴──────────┴───────┴────────┴────────┘
```

**Humare field DSL me `matrix` / `table` type nahi hai** (`packages/shared/field-types.js`).
Repeater se table ban sakti hai par UX kharab hoga — 4 rows × 3 columns ke liye 12
alag repeater items?

**Suggestion:** field DSL me do naye types add karo —
- `matrix` — rows × columns grid (occupancy slabs)
- `table` — repeatable rows with fixed columns (departures)

Ye D-24 (ek DSL) ka extension hai, uske khilaaf nahi.

### Aur ek cheez — multi-currency

Design me currency do jagah hai: Settings me default (INR/USD/AED), aur **har package
pe apni currency**. Humare plan me currency ka koi zikr hi nahi hai.

Travel me ye zaroori hai. Par ye **Phase 6+ ka kaam** hai — abhi sirf note kar rahe hain.

---

## 4. Appearance ka structure thoda alag hai

| Design me | Humare plan me |
|---|---|
| Appearance ▸ **Menus** | ✅ same |
| Appearance ▸ **Homepage Blocks** | ⚠️ hum har page pe builder de rahe hain |
| Appearance ▸ **Banners & Sliders** | ❌ plan me nahi |
| Appearance ▸ **Footer** | ✅ (Settings me tha, yahan Appearance me hai) |

**"Homepage Blocks" alag screen kyun?** Kyunki homepage ek normal page nahi hai — usme
dynamic sections hain (best-selling packages, trending activities). Design isse
**alag screen** maanta hai, page builder ka hissa nahi.

Ye humare model se **behtar** ho sakta hai for this client. Par abhi decide mat karo —
Phase 5 se pehle sochenge. Note kar liya.

**Banners & Sliders** ek alag chhota module hai (homepage slider, promo banners).
Ise `pattern` ya ek content type se cover kar sakte hain — naya module banane ki
zaroorat shayad na pade.

---

## 5. Chhoti cheezein jo add karni chahiye

| Cheez | Kyun |
|---|---|
| **Quick Edit** | Maine ise "drop" list me daala tha. Design me hai, aur travel me packages ki price/status roz badalti hai — inline edit sach me kaam aayega. **Wapas add karo.** |
| **Sidebar collapse** | Chhota, par builder screen pe jagah bachati hai |
| **Settings ▸ Email/SMTP** | Humne SMTP env me rakha tha. Client ko UI chahiye — auto-reply aur quotation isi se jaayenge |
| **Settings ▸ Integrations** | WhatsApp, payment gateway, analytics — ek jagah |
| **Packages ▸ Departures & Pricing** (cross-package view) | Saare packages ki departures ek screen pe — seats/booked manage karne ke liye |
| **Dashboard: Enquiries chart + Top Packages** | Humne "recent edits" socha tha. Travel me enquiry funnel zyada zaroori hai |

---

## 6. Kya **nahi** lena (mera suggestion)

| Cheez | Kyun nahi |
|---|---|
| Design ka WordPress-jaisa exact colour scheme | Familiar hona achha hai, par hu-ba-hu copy nahi. Apna palette rakho — `04-ADMIN-UX.md` wala |
| "Wanderly" branding | Demo content hai |
| Har package pe alag currency | Phase 6+ — abhi site-level currency kaafi hai |
| Banners & Sliders alag module | Patterns se ho jaayega. Naya module tabhi jab pattern kam pade |

---

## 7. Plan me kya badalna hai — summary

| # | Kya | Kahan | Kab |
|---|---|---|---|
| 1 | Mega-menu support (confirm ho gaya) | Menu model | **Slice 0** |
| 2 | **Enquiries ko alag module banao** — 7b ya Phase 9 | `05-BUILD-PLAN.md` | Phase 7 se pehle decide |
| 3 | Field DSL me `matrix` + `table` types | `field-types.js` + D-24 | Phase 5c se pehle |
| 4 | Repeater me drag-reorder + collapse + duplicate | Phase 6 field types | Phase 6 |
| 5 | Quick Edit wapas scope me | `04-ADMIN-UX.md` §2 | Phase 1 |
| 6 | Settings me Email/SMTP + Integrations screens | Phase 7 | Phase 7 |
| 7 | Dashboard me enquiry funnel + top packages | Phase 7 | Phase 7 |
| 8 | Homepage Blocks alag screen? — sochna hai | Phase 5 | Phase 5 se pehle |
| 9 | Multi-currency — note kiya, abhi nahi | — | Phase 6+ |

---

## 8. Ek badi baat

Ye design **travel-specific** hai — Packages, Itinerary, Departures, Enquiries.
Humara CMS **generic framework** hai jo kisi bhi client ke liye chalna chahiye (D-01).

**Dono ko milane ka sahi tareeka:**

```
CORE (@cms/*)                        CLIENT REPO (travel)
─────────────────                    ────────────────────
entries + contentTypes         →     "package" content type
repeater / matrix / table      →     itinerary, departures, slabs
custom collections support     →     enquiries module
menus + mega-menu              →     travel mega-menu
patterns                       →     banners & sliders
```

Matlab: **core me generic capability banao, travel-specific cheezein client repo me**
(R6). Warna agla client — jo dental clinic hai — uske admin me "Itinerary Builder"
dikhega, aur framework ka poora point khatam ho jaayega.

**Sirf ek exception:** Enquiries. Lead management lagbhag har agency client ko chahiye
(dental clinic ko bhi enquiries aati hain). Isliye **wo core me hona chahiye**, travel
me nahi.
