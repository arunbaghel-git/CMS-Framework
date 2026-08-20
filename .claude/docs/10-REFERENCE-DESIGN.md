# 10 — Reference Design (Andaman Tourism)

**Live design:** https://html.justgoweb.com/andaman/home-nav-v3.html
**Analysed:** 20 Aug 2026

Ye ek **asli client design** hai. `05-BUILD-PLAN.md` kehta hai ki block list guess se
nahi, asli design se nikalni chahiye — ye doc wahi kaam karta hai.

Teen cheezein isse tay hoti hain:
1. **Slice 0** ka asli scope (header/footer kitna bada hai)
2. **Phase 5** ki 10-block list
3. **Phase 6** ke content types

---

## 1. Sabse bada finding — ye site "listing" site hai, "page builder" site nahi

Homepage ke 20 sections me se **13 sections ek hi shape** ke hain:

```
card = image + badge + title + meta line + price + rating
```

Packages · Activities · Sightseeing tours · Ferries · Islands · Beaches ·
Places · Articles — sab yahi hain, bas data alag hai.

> **Matlab:** is client ko 20 alag blocks nahi chahiye. Use chahiye **ek dynamic
> list block** jo content type se data kheenche — jo Phase 6 ka `postList` block hai.

**Iska asar plan pe:**

| | Pehle socha tha | Is design ke baad |
|---|---|---|
| Phase 5 (builder) | Sabse zaroori | Zaroori, par akela kaafi nahi |
| Phase 6 (content types + dynamic lists) | "Framework banne ka phase" | **Is client ke liye ye Phase 5 se zyada zaroori hai** |

Ye plan ko galat nahi thehraata — dono phase waise hi rahenge. Par agar kabhi
prioritise karna pada, to **Phase 6 pehle** karna is client ke liye behtar hoga.

---

## 2. Content types jo is design se nikle

Har ek `contentTypes` collection me entry banega (Phase 6), aur inke fields
`fields` Mixed me jaayenge (D-21).

| Content type | Fields jo design me dikhe | Archive |
|---|---|---|
| `package` | image, badge, route, duration, inclusions[], MRP, price, discount%, rating, reviewCount, category | ✅ `/packages` |
| `activity` | image, badge, title, duration, price, rating | ✅ `/activities` |
| `tour` (sightseeing) | image, badge, title, duration, details, price, rating | ✅ `/sightseeing` |
| `ferry` | image, operator, from, to, travelTime, class, price | ✅ `/ferry` |
| `island` (destination) | image, name, localName, attractions[], stats{places, packages, activities, ferries} | ✅ `/destinations` |
| `beach` | image, name, island | ✅ `/beaches` |
| `place` (attraction) | image, name | ✅ `/places` |
| `post` (article) | built-in | ✅ `/blog` |
| `testimonial` | quote, name, title, packageType | ❌ (sirf block me) |
| `faq` | question, answer | ❌ |
| `award` | title, year(s), description | ❌ |
| `certification` | logo, org name | ❌ |

**Note:** `testimonial`, `faq`, `award`, `certification` ke apne URLs nahi chahiye —
ye sirf blocks me dikhte hain. Inpe `hasArchive: false` aur shayad `hasBuilder: false`.

**Taxonomy:** Packages pe filter tabs hain (All · Honeymoon · Family · Budget ·
Luxury · Adventure · Offbeat) — ye ek `packageType` category hai. Islands pe bhi
"Featured" vs "Offbeat" ka grouping hai.

---

## 3. ⚠️ Gap — mega-menu abhi ke model se nahi banega

Design ka navigation **mega-menu** hai:

```
Travel Guide ▾
  ┌─────────────────────────────────────────────────────────┐
  │ Plan Your Trip    Things To Do     Stay & Eat           │
  │  · link            · link           · link              │
  │  · link            · link           · link              │
  │                                                          │
  │ Honeymoon         Andaman By Month  Packages From       │
  │  · link            · link            Your City          │
  └─────────────────────────────────────────────────────────┘

Packages ▾   → 40+ itineraries, duration aur type ke hisaab se grouped
```

**Abhi ka menu model** (`02-ARCHITECTURE.md` §3):
```json
{ "id", "label", "linkType", "entryId", "url", "target", "cssClass", "children": [] }
```

Ye ek **simple nested tree** hai. Isse mega-menu nahi banta, kyunki:

| Design me chahiye | Abhi ke model me hai? |
|---|---|
| Column me group karna | ❌ |
| Group ka heading jo **link nahi** hai | ❌ (har item ka link type hai) |
| Menu ka type — simple dropdown vs mega | ❌ |
| Mega-menu me promo image / featured card | ❌ |

**Suggested fix** (chhota hai, par abhi karna sasta hai):

```json
{
  "id": "m1",
  "label": "Travel Guide",
  "linkType": "entry|url|taxonomy|none",   // ← "none" = sirf heading
  "menuType": "link|dropdown|mega",         // ← naya
  "columns": 3,                             // ← mega ke liye
  "children": []
}
```

`linkType: "none"` se group headings ban jaayenge, aur `menuType` se theme decide
karega ki simple dropdown render kare ya mega panel.

> **Ye Slice 0 ka faisla hai** — menu model wahin ban raha hai. Baad me badalna
> matlab menu data migrate karna.

---

## 4. Header ka asli scope (Slice 0 ke liye)

Slice 0 me socha tha: logo · navigation · CTA · footer. Design me isse **zyada** hai:

```
┌──────────────────────────────────────────────────────────────┐
│  [logo]   Home  Travel Guide▾  Packages▾  Activities▾        │
│           Destination▾  Ferry▾  Contact      [🏆 Awards]     │
│                                              [Get quote]      │
│           "Talk to an island expert · 4 hr response"          │
└──────────────────────────────────────────────────────────────┘
```

**Settings me chahiye:**
- Logo (already planned)
- Primary CTA button — label + link (`Get quote`)
- Secondary badge/link — label + link + icon (`Awards`)
- Support line — text + response time (`Talk to an island expert · 4 hrs`)

**Aur ek cheez jo plan me nahi thi — sticky bottom CTA bar (mobile):**
```
┌──────────────────────────────────────────┐
│ Why us? │ Offers │ 📞 Call │ 💬 WhatsApp │ Get free quote │
└──────────────────────────────────────────┘
```
Ye conversion ke liye hai aur har page pe aata hai. Settings-driven hona chahiye:
phone number, WhatsApp number, button labels, on/off toggle.

**Slice 0 me add karo:** header CTA + support line + sticky mobile CTA bar.
Footer plan ke hisaab se hi hai (4 columns + addresses + social + copyright +
disclaimer) — koi change nahi.

---

## 5. Phase 5 ki block list — is design se derived

Design ke 20 sections ko todne pe **ye blocks** nikalte hain. Notice: `postList`
akela 8 sections cover kar leta hai.

### Core layout (plan me pehle se hain)
| Block | Kahan use hua |
|---|---|
| `section` | har section ka wrapper |
| `container` | width control |
| `columns` | about (3 col), footer (4 col) |
| `heading` | har section ka title |
| `text` | descriptions |
| `image` | hero, inline images |
| `button` | CTAs |
| `spacer` | gaps |

### Is design se naye (Phase 5 me shamil karne laayak)
| Block | Kahan use hua | Note |
|---|---|---|
| **`postList`** | Packages · Activities · Tours · Ferries · Islands · Beaches · Places · Articles | **Sabse zaroori block.** 8 sections ye akela cover karta hai. Phase 6 ka hai, par is client ke liye Phase 5 me hi chahiye |
| `statsRow` | hero ke neeche (17 yrs · 38,000+ · 24 hrs · 0 hidden) | 3-6 numbers + label |
| `logoGrid` | corporate trust · certifications | 2 jagah use hua |
| `faqAccordion` | FAQ section | 7 items |
| `testimonialCards` | testimonials | quote + name + title |
| `featureCards` | Why us (4 cards) | icon + title + text |
| `offerBanner` | "Offer live now" | heading + bullets + 2 CTA |
| `videoEmbed` | About us story | 1 video |
| `videoGrid` | customer video reviews (6) | thumbnails |
| `photoGrid` | beaches · places | image + overlay label — ya `postList` ka ek layout variant |
| `leadForm` | "Plan your Andaman trip" | Phase 7 ka form builder isse cover karega |

### Jo custom rahega (core me nahi)
| Block | Kyun |
|---|---|
| `interactiveMap` | Andaman-specific. Client repo ke `blocks/` me jaayega (R6) |
| `awardsTimeline` | 2018–2026 wali timeline — bahut specific hai |

> **Nateeja:** core blocks ~19 hain, aur sirf **2 client-specific**. Ye achha ratio
> hai — matlab framework ka model sahi hai.

---

## 6. Plan me kya badalna chahiye

| # | Kya | Kahan | Kab |
|---|---|---|---|
| 1 | Menu model me `menuType` + `linkType: "none"` + `columns` | `02-ARCHITECTURE.md` §3 | **Slice 0 se pehle** |
| 2 | Header settings: CTA button, badge, support line | Slice 0 scope | Slice 0 |
| 3 | Sticky mobile CTA bar (phone, WhatsApp, quote) | Slice 0 scope | Slice 0 |
| 4 | `postList` block ko Phase 5b me laao (Phase 6 se pehle) | `05-BUILD-PLAN.md` | Phase 5 |
| 5 | Phase 5b ki block list update — upar wali list se | `05-BUILD-PLAN.md` | Phase 5 |
| 6 | `hasArchive: false` wale content types support karo | Phase 6 | Phase 6 |

Point 1 sabse urgent hai — menu model Slice 0 me hi ban raha hai.

---

## 7. Jo is design ne confirm kiya (koi change nahi)

Ye achhi khabar hai — plan ke kai faisle is asli design pe sahi baithe:

- **"Sab kuch content hai" (D-04)** — 12 content types, sab ek `entries` collection me
- **`fields` Mixed (D-21)** — package pe price/rating/discount, ferry pe operator/class.
  Strict schema hota to har type pe migration likhni padti
- **Stored `path` (D-09)** — `/packages/honeymoon-4n5d`, `/destinations/havelock`,
  `/beaches/radhanagar` — teen alag types, teen alag URL patterns, ek hi routing
- **Constrained builder controls (D-20)** — design me har section ka spacing consistent
  hai. Free-form CSS diya hota to client ise tod deta
- **SEO (Phase 4)** — 40+ package pages, 10 places, 8 beaches. Sitemap, title
  templates aur breadcrumbs yahan sach me kaam aayenge
- **Server-side pagination (R14)** — 40+ packages, 16 cards ek carousel me
