# 11 — Admin Design (FINAL SPEC)

**File:** [`reference/admin-design.html`](reference/admin-design.html) — browser me kholo
**Status:** 🔒 **FROZEN** — 20 Aug 2026

> ## ⚠️ Ye reference nahi, SPEC hai
>
> Admin **bilkul aisa hi banega** — layout, colours, spacing, wording, sab.
> Ismein se cherry-pick nahi karna, apna variation nahi banana.
>
> **Koi bhi change sirf client ke kehne pe hoga.** Agar build ke waqt lage ki kuch
> theek nahi hai — pehle poochho, khud mat badlo.

Design ke CSS comments me `components/admin/Sidebar.jsx` jaise paths hain — matlab ye
humare stack ke hisaab se hi banaya gaya hai. CSS aur structure seedha use kiya ja
sakta hai.

**Is doc ka kaam ab ye hai:** design ko dekh kar wo **technical capabilities** list
karna jo isse banane ke liye chahiye — aur jo abhi plan me nahi thin.

`04-ADMIN-UX.md` ab is design ke aage **secondary** hai. Conflict ho to design jeetega.

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

## 6. Design ke wo hisse jo **exactly** aise hi banenge

Design frozen hai, isliye ye sab jaisa hai waisa hi:

| Cheez | Note |
|---|---|
| Colour scheme, spacing, typography | Design ka CSS seedha use hoga |
| Admin bar + collapsible sidebar | Wahi structure, wahi behaviour |
| Sidebar ka order aur icons | Jaisa design me hai |
| Har screen ka layout aur panel positions | Wahi |
| Button labels aur wording | Wahi — "Send Quotation", "Add Day", "Duplicate Last Day" |
| WordPress-jaisa look | **Jaan-boojh kar** — client isse pehle se jaanta hai |

**Sirf ek cheez badlegi:** "Wanderly" branding demo content hai — wo per-client
settings se aayegi (`settings.siteName`, logo).

---

## 7. Jo BANANA hai — summary

Design frozen hai, isliye ye ab "sochna hai" nahi, **"banana hai"** hai.

| # | Kya banana hai | Kahan | Kab |
|---|---|---|---|
| 1 | Mega-menu support — `menuType` + `linkType: none` + `columns` | Menu model | **Slice 0** |
| 2 | **Enquiries module** — apni collection, pipeline, quotation, notes | Naya module | Phase 7b |
| 3 | Field DSL me `matrix` + `table` types | `field-types.js` + D-24 | Phase 5c se pehle |
| 4 | Repeater me drag-reorder + collapse + "duplicate last" | Field types | Phase 6 |
| 5 | Quick Edit (inline row edit) | Phase 1 list screens | Phase 1 |
| 6 | Settings ▸ Email/SMTP + Integrations screens | Phase 7 | Phase 7 |
| 7 | Dashboard: enquiry chart + top packages + quick draft | Phase 7 | Phase 7 |
| 8 | Appearance ▸ Homepage Blocks (alag screen) | Phase 5 | Phase 5 |
| 9 | Appearance ▸ Banners & Sliders | Phase 5/6 | Phase 6 |
| 10 | Sidebar collapse | Admin shell | Phase 0 |
| 11 | Multi-currency (site + per-package) | Phase 6 | Phase 6 |
| 12 | Departures & Pricing cross-package view | Phase 6 | Phase 6 |

**#8 ka faisla ho gaya:** design me Homepage Blocks alag screen hai, to **wahi banega** —
har page pe builder wala model isse replace nahi karega. Dono saath rahenge:
normal pages pe builder, homepage ke liye alag screen.

---

## 8. Design frozen hai — phir framework ka kya?

Pehli nazar me lagta hai ki ye D-01 se takra raha hai: design me "Packages",
"Itinerary Builder", "Departures" hain — par humara CMS to **generic framework** hai
jo dental clinic ke liye bhi chalna chahiye.

**Takraav hai nahi.** Sahi tareeke se dekho:

> Ye design **ek travel client ka instance** dikhata hai, na ki wo cheez jo core ship
> karta hai. Generic engine jab travel ke config se chalta hai, to bilkul **yahi**
> admin banta hai.

```
CORE me ye GENERIC capability hoti hai   →   Travel config se ye BANTA hai
──────────────────────────────────────       ────────────────────────────
contentTypes + auto-generated screens    →   "Packages" sidebar + list + editor
repeater field                           →   Itinerary Builder (7 din)
matrix + table fields                    →   Occupancy slabs, Fixed departures
taxonomies                               →   Destinations, Travel Themes
menus + mega-menu                        →   Travel ka mega-menu
patterns                                 →   Banners & Sliders
```

Matlab **sidebar me "Packages" hardcoded nahi hoga** — wo `contentTypes` collection se
aayega (Phase 6). Dental clinic ke instance me wahi jagah "Treatments" dikhaayegi.

Yahi is design ka sabse achha **proof** hai: agar generic engine se ye poora travel
admin ban jaata hai, to engine sach me kaam kar raha hai.

**Sirf ek cheez core me hardcoded hogi — Enquiries.** Lead management lagbhag har
agency client ko chahiye (dental clinic ko bhi enquiries aati hain), aur uski apni
lifecycle hai jo `contentTypes` se nahi banti.

**Build karte waqt ka rule:** koi bhi cheez banate waqt poochho —
*"ye core me generic hai, ya travel config se aa rahi hai?"*
Agar core me "package" ya "itinerary" shabd likhna pad raha hai (Enquiries ke alawa),
to kuch galat ja raha hai.
