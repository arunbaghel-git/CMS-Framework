# 006 — Menu data contract (Slice 0)

**Status:** 🟢 **Approved** — 24 Aug 2026 (D-43)
**Phase:** Slice 0 — Header + Footer (D-27)
**Blocks:** `menus` module, public header/footer render, `menuLocations`, Appearance ▸ Menus, Appearance ▸ Footer
**Related:** D-14 (cache), D-17 (menus vs locations), D-27 (Slice 0), D-30 (connection point abhi), D-40 (settings), D-42 (media id validation) · R8, R9, R10, R11, R12, R14, R15, R17 · proposed **D-43** + **R18**
**References validated against:** `docs/reference/admin-design.html` (frozen admin spec) · `~/Desktop/andaman/home-nav-v3.html` (behaviour reference, copy karne ke liye nahi)

---

## Problem

`menus` collection `02-ARCHITECTURE.md` §3 me ek line hai — `siteId, key, name, items[]`.
**`items[]` ka andar ka shape kahin define nahi hai.** Jo shape `10-REFERENCE-DESIGN.md`
§3 me suggest hua tha (flat `children[]` + `menuType` + `linkType: "none"` + `columns`)
wo behaviour reference ke against **kaafi nahi nikla**:

- Reference me ek column me **kai groups** hote hain (Travel Guide ka column 4, Activities
  ke saare columns). Flat `children[]` me wo sirf depth-convention se banta hai — aur tab
  "ek group wala column" aur "plain dropdown" ek jaise dikhte hain, renderer ko guess
  karna padta hai.
- Reference me har group heading **clickable link** hai (`<a class="gl">`). `linkType: "none"`
  ka matlab hi hai "link nahi" — wo case ban hi nahi sakta.
- Reference me width (`.mega--full/--wide/--md/--sm`) aur column count
  (`.mega__cols--2/--3/--4/--6`) **do alag axes** hain. Suggested shape me sirf ek
  `columns` number tha.

Abhi is contract ko freeze karna **muft** hai: `apps/api/src/modules/` me koi `menus`
module nahi, koi migration nahi, koi stored menu data nahi. Baad me badalna = 15 live
instances pe menu data migrate karna.

---

## Scope me kya hai

- `menus` document ka poora typed shape — `link` · `dropdown` · `mega`
- `mega` ka `Columns → Groups → Links` shape, CTA ke saath
- `menuLocations` + theme location registry ka mechanism
- `layout` × `columns` ka compatibility rule (broken layout banne hi na de)
- Public payload ka shape — `GET /api/public/menus/:location`
- Desktop **aur** mobile ka rendering contract, ek hi payload se
- Admin interaction spec (implementation se pehle, D12)
- Appearance ▸ Footer ka minimal scope
- Cache tags aur unka dependency map
- Migration 007 + indexes

## Scope me kya NAHI hai

- **Koi implementation code.** Ye sirf contract hai.
- `entries` / `taxonomies` module — Slice 0 me exist hi nahi karte (§4.2)
- Page builder, blocks, templates
- Menu ka Trash / restore UI — soft delete field reserve hai, screen nahi (§9.1)
- ~~Mega columns/groups ka nested drag-drop~~ — **ban chuka hai** (Q-C revised, 24 Aug)
- Q-7 (logo ka fallback) — abhi khula hai, is contract ko block nahi karta
- Header ka awards badge, support line, sticky mobile CTA bar — ye
  `10-REFERENCE-DESIGN.md` §6 ke **proposals** hain, koi approved decision nahi.
  Andaman-specific hain, isliye Slice 0 se bahar (§8.3)
- Footer ka logo/support/address column — wahi wajah (§8.3)
- Multi-locale menus — field day-1 reserve hai, feature nahi (§9.1)

---

## 1. `menus` document

```
menus
├─ siteId          day-1 reserve (§3.1)
├─ locale          day-1 reserve — §9.1 dekho, ye ek CORRECTION hai
├─ key             machine name, per {siteId, locale} unique
├─ name            human name. FOOTER COLUMN HEADING BHI YAHI HAI (§7.3)
├─ items[]         ordered — array ki position hi order hai (§1.5)
├─ version         optimistic concurrency
├─ deletedAt       soft delete (R12)
└─ createdAt / updatedAt
```

### 1.1 `item` — `menuType` pe discriminated

Teen shapes, aur **teenon ek hi menu me mix ho sakte hain** (requirement #1):

```
item
├─ id            stable string, reorder pe nahi badalta
├─ label         nav me dikhne wala text
├─ link          §1.2 — har item pe, `mega` pe bhi (top-level clickable ho sakta hai)
├─ className     optional, presentation only (R18)
└─ menuType      'link' | 'dropdown' | 'mega'
    │
    ├─ 'link'      → aur kuch nahi
    ├─ 'dropdown'  → + children[]     max depth 3 total (§1.4)
    └─ 'mega'      → + mega{}         §1.3
```

`menuType` **structured field hai** — renderer isi se decide karta hai. `className` se
kabhi nahi (R18/D8).

### 1.2 `link` object — har level pe wahi shape

```
link
├─ type      'entry' | 'url' | 'taxonomy'
├─ entryId       type='entry' pe
├─ url           type='url' pe
├─ taxonomyId    type='taxonomy' pe
├─ target    '_self' | '_blank'          04-ADMIN-UX §6 "Open in"
└─ className optional
```

⚠️ **`entry` aur `taxonomy` aaj reserve hain, live nahi.** Slice 0 me `entries` aur
`taxonomies` module hain hi nahi (§4.2) — write validation abhi sirf `url` accept
karegi. Phase 1 me switch on hote hi schema badalna nahi padega. Ye D-30 ka pattern hai:
_connection point abhi, data baad me._

### 1.3 `mega` — Columns → Groups → Links

```
mega
├─ layout      'sm' | 'md' | 'wide' | 'full'      width/position — column count se ALAG
├─ columnCount 2 | 3 | 4 | 5 | 6                  declared grid count
├─ className   optional
├─ columns[]   length === columnCount (§2.2)
│   └─ column
│       ├─ className   optional
│       └─ groups[]    ordered, ek column me kai groups (requirement #4)
│           └─ group
│               ├─ heading    optional — group ka title
│               ├─ link       optional — heading ko clickable banata hai (§1.3.1)
│               ├─ className  optional
│               └─ links[]    ordered — har ek { label, link, className? }
└─ cta         optional — §1.3.2
```

#### 1.3.1 Group ke teenon case bante hain

`heading` aur `link` dono optional hone se wahi teen case ban jaate hain jo behaviour
reference me hain:

| Case | Kaise |
| --- | --- |
| Heading + links | `heading` set, `link` nahi |
| **Clickable heading** + links | `heading` + `link` dono set — reference me har `<a class="gl">` yahi hai |
| Bina heading ke sirf links | dono khaali |

**`linkType: "none"` ki zaroorat khatam.** Wo ek workaround tha jo clickable heading ko
possible hi nahi hone deta tha — `10-REFERENCE-DESIGN.md` §3 ka suggested fix isse
**superseded** ho jaata hai.

Rule: `link` tabhi valid hai jab `heading` bhi ho — bina label ke link render nahi ho sakta.

#### 1.3.2 `cta` — optional, per mega

```
cta
├─ text          "Not sure where to start?"
├─ buttonLabel   "Talk to an island expert"
├─ buttonUrl
└─ className     optional — reference me button ki class alag-alag hai (b-o vs b-l)
```

Reference me paanchon mega pe CTA hai aur wo `grid-column: 1/-1` se columns ke **neeche
full-width row** banta hai. Par structurally **optional** hai (D6) — koi bhi mega bina
CTA ke valid hai.

`cta` hai to `text` · `buttonLabel` · `buttonUrl` **teenon** required (all-or-nothing).
`className` optional.

### 1.4 `dropdown` ki depth — max 3 (Q-A / D2)

```
top-level  →  child  →  grandchild     ✅
                      →  great-grandchild   ❌ validation error
```

**Imaandari se:** depth 3 ka evidence **kisi bhi reference me nahi hai.** Frozen admin
design sirf **ek** indent level dikhata hai (`admin-design.html:1109-1111`,
`margin-left:24px`), aur behaviour reference me ek bhi normal dropdown nahi hai — wahan
saare non-simple items mega hain. Depth 3 ek naya faisla hai (D2), reference se derived
nahi.

Grandchild ka **visual** isliye bhi kahin defined nahi tha. Q-A ka faisla: desktop pe
**right-side flyout**, mobile pe **nested accordion**. Ye pure CSS/JSX hai — client ka
design aage isse alag bole to **data change zero**.

### 1.5 Order (Q-C / D-C)

**Koi `order` field nahi.** Array ki position hi order hai — `items[]`, `children[]`,
`columns[]`, `groups[]`, `links[]` sab BSON me ordered hain.

Isliye drag-drop aur keyboard reorder **ek hi data** likhte
hain. Drag-drop add karna pure UI change hoga — **koi migration nahi**.

---

## 2. Layout × columns compatibility (Q-E / D-E)

> "CMS ko admin se jaan-boojh kar toota hua layout nahi banwana chahiye."

Hint kaafi nahi — ye ek **validation rule** hai, server aur builder dono pe.

### 2.1 Rule — ek constant se derived

Theme ke layout widths (ye **hamare** theme ke constants hain; behaviour reference ke
`sm: 300px` ko `420px` kiya gaya hai kyunki 300px pe 2 columns bhi padhne laayak nahi
bachte):

```
sm    420px          md    780px
full  container (max 1280px)        wide  1700px

MEGA_PADDING_X = 48px      COLUMN_GAP = 20px      MIN_COLUMN_WIDTH = 160px

usable   = layoutWidth − MEGA_PADDING_X
colWidth = (usable − COLUMN_GAP × (columns − 1)) / columns

VALID  ⇔  colWidth >= MIN_COLUMN_WIDTH
```

### 2.2 Nateeja — allowed combinations

| `layout` | Allowed `columns` | Blocked kyun |
| --- | --- | --- |
| `sm` | 2 | 3 pe column 111px — link text 3 line me toot-ta hai |
| `md` | 2, 3, 4 | 5 pe 130px, 6 pe 105px |
| `full` | 2, 3, 4, 5, 6 | — |
| `wide` | 2, 3, 4, 5, 6 | — |

**`columns: 5` support hai** (D4) — behaviour reference ki CSS me `--5` nahi hai, par wo
theme ki kami hai, CMS ki nahi. **Theme ko 2 se 6 tak sab ship karni hogi**, warna admin
me 5 chunne pe site chup-chaap toot jaayegi.

`columns[].length === columnCount` bhi validator enforce karta hai — count aur content kabhi
drift nahi karte. Builder me count ghatane pe confirm dikhta hai (§6.4).

---

## 3. `menuLocations` aur theme registry

### 3.1 D-17 ka core rule bacha hua hai

D-17 ka poora point yahi tha ki **core me location keys hardcode na hon**, warna client ko
ek aur footer column chahiye to code change karna pade. To:

```
menuLocations
├─ siteId       day-1 reserve
├─ locale       day-1 reserve — §9.1
├─ location     free string — core isko enum nahi karta
└─ menuId       null allowed = "Not assigned" (04-ADMIN-UX §6 me ye state pehle se hai)
```

**Theme apni locations declare karta hai** — id + English label (R17). Admin ka Theme
Locations panel isi registry se render hota hai, kisi core enum se nahi.

### 3.2 Slice 0 ka theme kya declare karega (Q-D)

Aapne poocha tha ki existing architecture me behtar generic convention hai kya —
**haan, hai:** `02-ARCHITECTURE.md:125` `location(header|footer|…)` likhta hai aur D-17
bhi `header` kehta hai. Isliye `headerPrimary` ki jagah **`header`**:

| Location id | Label (UI, English) |
| --- | --- |
| `header` | Header |
| `footerColumn1` | Footer Column 1 |
| `footerColumn2` | Footer Column 2 |
| `footerColumn3` | Footer Column 3 |
| `footerColumn4` | Footer Column 4 |

Naam **generic** hain, content-specific nahi — `footerExplore` / `footerPackages` jaise
naam ek travel site ke hain, framework ke nahi.

⚠️ **`mobile` location nahi hai.** D-17 usko list karta hai; D9 ke baad wo drift ka
darwaza hai. Mobile wahi menu render karta hai jo `header` pe assigned hai (§5.2).
→ **D-17 partially superseded** (delete nahi, "Superseded in part by D-43" likha jaayega).

Unassigned location kuch render nahi karta — khaali cheez khaali dikhe, tooti hui nahi (D-30).

---

## 4. Public API

```
GET /api/public/menus/:location
```

### 4.1 Response

```
{
  location: 'header',
  menu:  { key, name },            ← name footer column heading banta hai (§7.3)
  items: [ { id, menuType, label, href, target, className,
             children?,            dropdown pe
             mega? } ]             mega pe — columns[]/groups[]/links[]/cta
}
```

**Har `href` server pe already resolved hai.** Ye R10 ka seedha nateeja hai — routing ka
ekmatra source `entries.path` hai. Agar payload `entryId` bheje aur Next use path me
badle, to path resolution ki **doosri copy** `apps/web` me ban jaati hai, aur wo do
jagah se drift karti hai.

`className` payload me jaata hai par renderer uspe **kabhi branch nahi karta** (R18).

### 4.2 Slice 0 ki honest limitation

`entries` module abhi hai hi nahi (`migrations/001-entries-indexes.js` sirf indexes
banati hai — collection khaali hai, model nahi hai). Iska matlab:

- Slice 0 me menu item sirf **custom URL** ho sakta hai
- Frozen design ka "Add Menu Items" panel (`admin-design.html:1098`) — uski
  **Pages aur Destinations checklists khaali rahengi** (D-30: khaali dikhe, chhupi nahi)
- `05-BUILD-PLAN.md` ke Slice 0 done-criteria ka _"menu me ek item add karo"_ ek custom
  link hoga
- `href` resolver me `entry`/`taxonomy` ki branch Phase 1 me judegi — schema tab bhi nahi badlega

### 4.3 Admin API

```
GET    /api/admin/menus                 list — R14 pagination day 1 se
POST   /api/admin/menus
GET    /api/admin/menus/:id
PATCH  /api/admin/menus/:id
DELETE /api/admin/menus/:id             soft delete (R12) — §9.1
GET    /api/admin/menu-locations
PUT    /api/admin/menu-locations
```

**Permissions:** `menu.read` · `menu.update` — dono `packages/shared/src/constants/permissions.js`
me **pehle se hain**. Create/update/delete teenon `menu.update` pe. Koi nayi permission
nahi → `001-permissions.md` untouched.

**Errors:**

| Code | Kab |
| --- | --- |
| `400` | Zod fail — depth > 3 · `columns[].length ≠ columnCount` · invalid layout×columns (§2.2) · `cta` adhoora · `link` bina `heading` · Slice 0 me `linkType: entry\|taxonomy` |
| `404` | Menu ya location maujood nahi |
| `409` | `{siteId, locale, key}` duplicate · `version` mismatch (optimistic concurrency) |

R13 — koi state-changing GET nahi.

---

## 5. Rendering contract — ek hi data, dono devices (D9)

**Koi alag mobile menu nahi.** Dono `GET /api/public/menus/header` ke same payload se
bante hain. Behaviour reference bhi yahi karta hai — uska JS comment literally kehta hai
_"cloned from the desktop nav so the two never drift"_ — par wo runtime pe DOM clone karta
hai; hamare paas structured payload hai, isliye hum dono ko usi data se render karenge.

### 5.1 Desktop

| `menuType` | Render |
| --- | --- |
| `link` | Simple nav link |
| `dropdown` | Panel; grandchild **right-side flyout** (Q-A) |
| `mega` | `layout` se width/position, `columns` se grid; columns → groups → links; `cta` full-width row neeche |

### 5.2 Mobile — same payload, drawer/accordion

| `menuType` | Render |
| --- | --- |
| `link` | Flat link |
| `dropdown` | Accordion; grandchild **nested accordion** |
| `mega` | Accordion — columns **flatten**, groups apne order me, har group ka heading heading hi rehti hai |

**Column flatten natural hai** kyunki column ek **pure layout wrapper** hai — usme koi
content nahi hota, sirf groups hote hain. Yahi is shape ka sabse bada practical fayda hai.

⚠️ **CTA mobile pe us item ke accordion section ke bottom pe aayega (D10).** Behaviour
reference isko mobile me **drop** karta hai (`:not(.mega__cta)`). Ye **jaan-boojh kar
liya gaya divergence** hai — yahan isliye likha hai ki koi baad me isse "reference se
match karne" ke naam pe hata na de.

---

## 6. Admin interaction spec

> D12: implement karne se pehle interaction define ho, aur **existing design system se
> bahar koi naya visual invent na ho.**

### 6.1 Design me primitives pehle se hain

`admin-design.html:1332` ka CSS comment:

```
/* ---------- accordions (itinerary / faq / menu items) ---------- */
```

Yaani **menu items ko accordion se banana design ka apna irada hai.** Available:
`.day` / `.day-head` / `.day-body` · `.grip` (drag handle) · `.toggle-ico` · `.panel` ·
`.field` · `.inp` · `.sel` · `.chips` · `.tabs`.

⚠️ **Design me koi modal/drawer primitive nahi hai** (poori file me `.modal`, `.drawer`,
`.sheet` — teenon absent). Isliye mega builder **modal nahi ho sakta**.

### 6.2 Top-level list — design-exact

Frozen design jaisa hi: sibling `.day` accordions, `.grip` se drag-drop, nested item
`margin-left:24px`. Type badge `.day-head` me (`Page` / `Mega menu` / `sub item` — design
me already yahi wording hai).

### 6.3 Item ka `.day-body` — progressive

```
Label                    [text]
Link type                [Custom URL ▾]   Entry/Taxonomy disabled, "Available in Phase 1"
URL                      [text]
Open in                  [Same tab ▾]
Menu type                [Simple | Dropdown | Mega Menu ▾]
CSS class                [text]
```

`Menu type` badalne par hi aage ke fields khulte hain — Simple pe kuch nahi, Dropdown pe
children ki list, Mega pe §6.4 ka builder. Non-technical client ko mega ki complexity
**tabhi** dikhti hai jab wo mega chune.

### 6.4 Mega builder — inline, nested `.day` se

Mega item ke `.day-body` ke **andar**:

```
Mega layout   [Wide ▾]        Columns  [6 ▾]   ← §2.2 se invalid options DISABLED
Mega CSS class [text]

┌ ⠿ Column 1                                   [▲ ▼] [×] ┐
│   ┌ Group 1                          [▲ ▼] [×] ┐        │
│   │  Heading      [text]                        │        │
│   │  Heading link [optional]                    │        │
│   │  CSS class    [text]                        │        │
│   │  Links        ⠿ label + URL  [▲ ▼] [×]      │        │
│   │               [+ Add link]                  │        │
│   └─────────────────────────────────────────────┘        │
│   [+ Add group]                                          │
└──────────────────────────────────────────────────────────┘

CTA  ☐ Enable
     Text · Button label · Button URL · CSS class
```

- **Columns/groups/links pe drag handle (`⠿`)** — har level pe, top-level items jaisa hi
  (Q-C revised, 24 Aug: pehle ↑▼ buttons the, client ne drag maanga)
- `Columns` ghataने pe confirm: _"2 columns will be removed"_ (§2.2 equality rule)
- `Mega layout` badalne pe invalid `columns` values disable ho jaati hain (§2.2)

Sab kuch existing primitives se — **koi naya visual nahi**.

---

## 7. Appearance ▸ Footer

### 7.1 Frozen design isme chup hai

`admin-design.html:1094` me tabs hain — `Menus · Homepage Blocks · Banners & Sliders ·
**Footer**` — par **Footer tab ka koi content spec nahi hai**, wo ek khaali label hai.
Isliye (aapke instruction ke hisaab se) **WordPress sirf UX reference** hai — ek simple
settings panel jisme repeatable rows hon. Architecture copy nahi.

### 7.2 Slice 0 me sirf non-navigation footer settings

D-27 kehta hai: _"footer columns, social links, copyright"_. Footer columns menu system se
aate hain (§3.2), to Footer tab me sirf do cheezein bachti hain:

| Field | Status |
| --- | --- |
| Social links | ✅ **`settings.social` pehle se maujood hai** — `instagram`, `facebook`, `youtube` (`settings/model.js`, `SOCIAL_KEYS` frozen). Koi naya field nahi |
| Copyright text | 🆕 `settings.footerCopyright` — **ekmatra naya field** |

Screen Appearance ▸ Footer ke neeche hai, par likhta `settings` document me hai
(`PATCH /api/settings`, permission `settings.update`). **UI ki jagah ≠ storage ki jagah** —
naya collection ya nayi permission ki zaroorat nahi.

### 7.3 Footer column ka heading

Behaviour reference ke footer me har menu column pe `<h4>` hai — "Explore", "Packages".
Wo **`menus.name` se aayega**, koi naya field nahi. `GET /api/public/menus/:location`
`menu.name` pehle se de raha hai (§4.1).

### 7.4 Jo Slice 0 me NAHI hai

Behaviour reference ke footer ka column 1 (logo + customer support + email + timing) aur
column 4 (office addresses) **menu hain hi nahi** — wo Andaman-specific content blocks
hain. Aapke Q-B instruction ke hisaab se ye Slice 0 se bahar hain. Slice 0 ka footer =
**up to 4 menu columns + social + copyright**, bas.

---

## 8. Cache impact

### 8.1 Tags

```
menu:{location}      ← .claude/skills/cache-invalidation/SKILL.md me pehle se defined
settings             ← footerCopyright isi ke andar
```

### 8.2 ⚠️ Skill ke dependency map me ek bug hai

Skill likhta hai:

```js
'menu.update': (menu) => [`menu:${menu.location}`]
```

Par **menu ke paas `location` hai hi nahi** — location `menuLocations` ka assignment hai,
aur ek hi menu **kai locations** pe assigned ho sakta hai. Sahi shape:

```
menu.update    →  menuLocations me menuId dhoondho → uski saari locations invalidate
location.update → purani AUR nayi dono location invalidate
menu.delete    →  wahi, aur assignments clear (§9.1)
```

Ye skill ka doc fix isi PR me jaana chahiye.

### 8.3 D-14 ka Slice 0 exception

D-14 kehta hai tag taxonomy **Phase 3** me design hogi. Slice 0 ko **abhi** chahiye —
`REVALIDATE_SECRET` `env.js` me pehle se hai (min 32). D-43 me ye exception record hoga.

---

## 9. Schema impact

| Collection | Change | Day-1 reserve? | Migration? |
| --- | --- | --- | --- |
| `menus` | **Naya collection** | `siteId` · `locale` · `version` · `deletedAt` — §9.1 | ✅ 007 (collection + indexes) |
| `menuLocations` | **Naya collection** | `siteId` · `locale` | ✅ 007 |
| `settings` | `+ footerCopyright` (string, default `''`) | nahi — additive optional | ❌ backfill nahi chahiye; model default + Zod `.default('')` wahi karte hain jo `social` ke waqt kiya tha |

### 9.1 Day-1 reserve test (skill Step 1)

| Field | q1 har query/index? | q2 uniqueness badalta? | q3 backfill mehnga? | Faisla |
| --- | --- | --- | --- | --- |
| `siteId` | ✅ | ✅ | ✅ | **Reserve** — §3.1 |
| `locale` | — | ✅ `{siteId, key}` → `{siteId, locale, key}` | ✅ | **Reserve** — skill isi example ko naam se bulaati hai |
| `deletedAt` | ✅ har list query filter karti hai | — | ✅ | **Reserve** — R12 |
| `version` | — | — | — | **Reserve (recommended)** — menu ek bada nested tree hai; do admin ek saath save karein to silent lost update. Yahi `entries.version` ki wajah hai |

⚠️ **`locale` ek CORRECTION hai.** `02-ARCHITECTURE.md` §3.3 abhi likhta hai
`menus: { siteId: 1, key: 1 } unique`. Wo `locale` ko miss karta hai — aur §3.1 khud
`locale` ko day-1 reserve list me rakhta hai. Doc update zaroori.

### 9.2 Indexes (skill Step 5 — `siteId` sabse pehle)

```
menus:         { siteId: 1, locale: 1, key: 1 }             unique
menus:         { siteId: 1, deletedAt: 1, updatedAt: -1 }
menuLocations: { siteId: 1, locale: 1, location: 1 }        unique
```

Naya text index nahi (ek hi allowed hai). Unique index se pehle duplicate check —
collections nayi hain, to khaali hain.

### 9.3 Soft delete ka nateeja

Menu soft-delete hone pe uske **saare location assignments clear** honge (service layer,
R1) — warna location ek marey hue menu ko point karti rahegi aur public read khaali
lautata rahega bina wajah bataye.

Slice 0 me menu ka **Trash/restore UI nahi** hai. Yaani delete kiya hua menu UI se wapas
nahi aata. Field reserve hai, screen Phase 2 ke Trash work ke saath aayegi.

---

## 10. Acceptance criteria

- [ ] Ek hi menu me `link` · `dropdown` · `mega` teenon top-level items **saath** rah sakte hain
- [ ] `mega` me ek column me **do ya zyada groups** store aur render hote hain (Activities case)
- [ ] Group ki heading **clickable** ho sakti hai aur bina link ke bhi ho sakti hai
- [ ] `layout` aur `columns` **alag** fields hain; `wide`+6 aur `md`+4 dono valid hain
- [ ] §2.2 ka koi bhi invalid combination `400` deta hai — sirf UI hint nahi
- [ ] `columns[].length ≠ columnCount` pe `400`
- [ ] Depth-4 dropdown pe `400`; depth-3 accept
- [ ] `cta` optional hai; adhoora `cta` `400` deta hai
- [ ] `GET /api/public/menus/:location` har item pe **resolved `href`** deta hai, `entryId` nahi
- [ ] Public payload me koi admin-only field nahi
- [ ] Mobile aur desktop **ek hi** endpoint se render hote hain — koi doosra menu source nahi
- [ ] Mega ka CTA mobile accordion ke bottom pe dikhta hai (D10)
- [ ] `className` **kahin bhi** rendering branch decide nahi karta (R18) — test isko assert kare
- [ ] Menu delete pe uske location assignments clear ho jaate hain
- [ ] Menu update pe uski **saari** assigned locations ke tags invalidate hote hain (§8.2)
- [ ] Migration 007 idempotent hai, `down()` ke saath, do baar chala ke verify
- [ ] Test: Zod contract unit tests + `menus`/`menu-locations` integration tests (chalta Mongo chahiye) + public payload shape test
- [ ] Docs updated: `02-ARCHITECTURE.md` §3 + §3.3 · `03-DECISIONS.md` (D-43, D-17 supersede note) · `07-CONVENTIONS.md` (R18) · `04-ADMIN-UX.md` §6 · `05-BUILD-PLAN.md` · `10-REFERENCE-DESIGN.md` §6 · `cache-invalidation/SKILL.md`

---

## 11. Open questions — resolved

Ye chhe sawaal **developer ne apni sifarish pe resolve kiye** (24 Aug, user lunch pe the
aur unhone aage badhne ko kaha). Teenon me se koi bhi **client ka design faisla nahi
hai** — sab engineering calls hain, aur teenon reversible hain. **Review chahiye.**

| # | Sawaal | Faisla | Palatna kitna mehnga |
| --- | --- | --- | --- |
| **O-1** | Footer me kitni column locations? | **4** — reference ka footer 4-col grid hai, `10-REFERENCE-DESIGN.md` bhi "4 columns" kehta hai | Theme registry ki ek line. Koi migration nahi |
| **O-2** | Theme location registry kahan? | **`packages/shared/src/constants/theme-locations.js`** — admin aur web dono padhte hain | Ek file move. Koi migration nahi |
| **O-3** | `columns` explicit ya derived? | **Explicit** (D3/D4 ke hisaab se), `columns[].length === columnCount` validator ke saath | Field hatana = migration. Isliye explicit rakha — badhna sasta hai, hatana mehnga |
| **O-4** | `version` Slice 0 me enforce? | **Haan** — `409` deta hai jab do admin ek saath save karein | Sirf service ka ek check |
| **O-5** | D-27 ka scope/estimate | **Badha hua record kiya** — `05-BUILD-PLAN.md` me Slice 0 ab ~2.5 hafte, mega builder ke saath | — |
| **O-6** | Q-7 interim | **Logo absent pe kuch render nahi hota** (nav left shift), code me `Q-7 INTERIM` comment | Ek JSX branch. Data bilkul nahi |

> **Q-7 khud abhi bhi khula hai** — wo client ka faisla hai (R15) aur `09-OPEN-ITEMS.md`
> me waise hi khada hai. O-6 sirf ye tay karta hai ki jawab aane tak header **toota hua
> `<img>` render na kare** (D-42 §2 locked invariant).

---

## 12. Rejected alternatives

| Kya | Kyun chhoda |
| --- | --- |
| **Flat `children[]` + `linkType: "none"`** (`10-REFERENCE-DESIGN.md` §3 ka suggested fix) | "Ek column, teen groups" sirf depth-convention se banta — aur tab single-group column aur plain dropdown ek jaise dikhte, renderer ko guess karna padta. Clickable group heading ban hi nahi sakti thi |
| **Uniform tree with `nodeType` (`item\|column\|group\|link`)** | Frozen design ke single drag-list se behtar match karta, par invalid states representable rehte (mega ke bahar column, depth-4 link). Storage typed hai aur editor phir bhi indented list hai — dono mil gaye |
| **Reference ke `mega--full` + `mega--wide` ka pair copy karna** | Reference me dono saath lage hain aur `--full` ka asli kaam width nahi, `:has()` wala `position:static` hook hai — `--wide` uski width overwrite kar deta hai. Ek class do kaam kar rahi hai; hamara `layout` saaf 4-value enum hai |
| **`className` se behaviour infer karna** (`mega-menu menu-6-columns`) | R18/D8. Reference khud proof hai: `mega--gl2` purely presentational hai — parse karne wala implementation usko structure samajh baithta |
| **Alag mobile menu / `mobile` location** | D9. D-17 usko allow karta tha; do content sets hamesha drift karte hain |
| **Mega builder ek modal me** | Frozen design me modal/drawer primitive hai hi nahi — banana R15 todna hota |
| **Footer ke liye alag data model** | D11. Menus + locations pehle se generic hain (D-17); doosra model banane ka koi kaaran nahi bacha |
| **`social` ke liye naya repeatable field** | `settings.social` pehle se hai (`SOCIAL_KEYS` frozen). Naya banane se do social sources ban jaate |
