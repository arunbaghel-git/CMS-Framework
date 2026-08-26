# 04 — Admin UX

> ## ⚠️ Ye doc ab SECONDARY hai
>
> Admin ka **final spec** [`reference/admin-design.html`](reference/admin-design.html)
> hai — dekho [`11-REFERENCE-ADMIN.md`](11-REFERENCE-ADMIN.md).
> Wo design **frozen** hai aur bilkul waisa hi banega.
>
> **Conflict ho to design jeetega, ye doc nahi.**
>
> Ye doc ab sirf ek cheez ke liye kaam ka hai: **kyun** har screen aisi hai —
> reasoning, rules, aur wo UX faisle jo design ke peeche hain.

Admin panel ka information architecture aur screen layouts.

**Purana wireframe:** [`admin-wireframe.html`](admin-wireframe.html) — 7 screens,
clickable. Ye humara **pehla draft** tha, asli design aane se pehle. Reference ke liye
rakha hai, par **build isse nahi hoga**.

**Design principle:** har faisla is ek sawaal se guzarta hai —
_"kya ek non-technical banda ye bina call kiye kar lega?"_

---

## 1. Navigation

```
Dashboard

Pages                     All · Trash                         (+ Add New)
Posts                     All · Categories · Tags · Trash     (+ Add New)
[Services] [Portfolio]    contentType se auto-generate        (Phase 6)

Media                     Library · Folders · Trash

Forms                     Forms · Submissions

Appearance                Site Style · Menus · Templates · Patterns

SEO                       Defaults · Redirects · Sitemap

Users (admin)             All Users · Add User · Profile        (D-37)
Users (baaki roles)       Profile

Tools                     Import · Export · Activity Log

Settings                  General · Reading · Permalinks · Media · Scripts
```

**"Appearance" grouping sabse zaroori hissa hai.** Iske bina Menus, Templates aur theme
tokens teen alag features ban jaate hain jinka koi ghar nahi — aur user unhe dhoondh
hi nahi paata.

**Users ka menu role-aware hai (D-37).** Jiske paas `user.read` nahi, use sirf
**Profile** dikhta hai. **Roles submenu abhi nahi hai** — role builder Phase 7 me.

**Naming rule (D-19):** UI me "Entries" ya "Taxonomies" kabhi nahi. Wahan Pages, Posts,
Categories, Tags hi hoga.

---

## 2. List screen ka standard

Har content type pe **bilkul same** layout — Pages, Posts, Services, sab.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Pages                                                  [+ Add New]  │
├──────────────────────────────────────────────────────────────────────┤
│  All (24) │ Published (18) │ Draft (4) │ Pending (2) │ Trash (7)     │
├──────────────────────────────────────────────────────────────────────┤
│  [ search ]  [ author ▾ ]  [ date ▾ ]         24 items · page 1 of 2 │
├──────────────────────────────────────────────────────────────────────┤
│ ☑ TITLE              AUTHOR   URL              STATUS      MODIFIED  │
│ ☑ Home · front page  Deepak   /                published   2 hrs ago │
│   ↳ Edit · View · Duplicate · Trash        ← row hover pe             │
│ ☑ About Us           Deepak   /about           published   3 days    │
│ ☐ Our Team           Priya    /about/team      published   3 days    │
│ ☐ Teeth Whitening    Priya    /services/…      pending     20 min    │
├──────────────────────────────────────────────────────────────────────┤
│ ☑ 2 selected   [ Bulk actions ▾ ]  [Apply]                           │
└──────────────────────────────────────────────────────────────────────┘
```

| Element                    | Kyun zaroori                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| **Status count tabs**      | User ko turant pata chale kitna kaam pending hai                                           |
| **URL column**             | Stored `path` se. Nested pages ka structure yahin dikhta hai                               |
| **Row actions**            | **View** sabse zyada use hota hai — live page kholne ke liye                               |
| **Bulk actions**           | Publish · Unpublish · Trash · Assign category. 200 posts wala client inke bina call karega |
| **Server-side pagination** | Day 1 se. Saara data ek page me = admin hang                                               |
| **"front page" marker**    | `settings.homepageEntryId` se                                                              |

---

## 3. Entry editor (rich text mode)

Jab `contentType.hasBuilder = false` ho (Posts).

```
┌───────────────────────────────────────────┬─────────────────────────┐
│  Edit Post          [Preview][Save][Publish]                        │
├───────────────────────────────────────────┼─────────────────────────┤
│  5 Signs You Need a Root Canal            │ DOCUMENT                │
│  /blog/signs-you-need-a-root-canal · Edit │  Status      pending    │
│  ┌─────────────────────────────────────┐  │  Visibility  Public     │
│  │ H2 B I Link List Quote Image Embed  │  │  Publish     Immediately│
│  ├─────────────────────────────────────┤  │  Template    Single Post│
│  │                                     │  │  Author      Priya      │
│  │  (TipTap rich text)                 │  │  Revisions   14 · Browse│
│  │                                     │  ├─────────────────────────┤
│  └─────────────────────────────────────┘  │ AUTOSAVE FOUND          │
│  ┌─────────────────────────────────────┐  │  Newer autosave 18:42   │
│  │ SEO                                 │  │  [Compare] [Restore]    │
│  │ Search│Social│Schema│Advanced       │  ├─────────────────────────┤
│  │ Title: %title% | %sitename%         │  │ CATEGORIES & TAGS       │
│  │ Description: […]                    │  ├─────────────────────────┤
│  │ ✓ 4 of 5 checks passing             │  │ FEATURED IMAGE          │
│  └─────────────────────────────────────┘  └─────────────────────────┘
```

**Zaroori details:**

- **Autosave recovery** — 30s autosave ka payoff yahi hai. Bina iske autosave ka koi
  matlab nahi
- **Revisions on save**, sirf publish pe nahi. Recovery ka asli case _"maine save karke
  tod diya"_ hai. Restore se pehle **changed-summary** dikhao ("3 blocks changed,
  1 added") — timestamp list se blind restore non-technical user ke liye darawna hai
- **SEO title template** placeholder me dikhe, taaki user ko samajh aaye khaali chhodne
  pe kya hoga
- **Optimistic concurrency** — save pe `version` jaaye, mismatch pe 409 aur saaf message

---

## 4. Page builder

Jab `contentType.hasBuilder = true` ho (Pages).

```
┌─────────┬──────────────────────────────────┬─────────────────┐
│ BLOCKS  │  Desktop│Tablet│Mobile  (iframe) │ Document│ Block │
│ ┌──┬──┐ │  ┌────────────────────────────┐  ├─────────────────┤
│ │▭ │▯ │ │  │  ┌──────────────────────┐  │  │ Text            │
│ │⫲ │H │ │  │  │ ≡ ⯇ ⯈ 🔗 ⧉ 🗑        │  │  │ [Gentle dent…]  │
│ │≡ │▣ │ │  │  ├──────────────────────┤  │  │ Level  H1 ▾     │
│ │▬ │␣ │ │  │  │ Gentle dentistry…    │  │  │                 │
│ │▶ │▧ │ │  │  │ [Book a visit]       │  │  │ BREAKPOINT      │
│ └──┴──┘ │  │  └──────────────────────┘  │  │ [Desktop]│T│M   │
├─────────┤  │  ┌────┐┌────┐┌────┐        │  │ Font size 48px  │
│ LAYERS  │  │  │    ││    ││    │        │  │ Align  Center   │
│ ▾Section│  │  └────┘└────┘└────┘        │  │ ● Mobile inherits│
│  ◆Head..│  │  ┌──────────────────────┐  │  │   from Desktop  │
│  ≡Text  │  │  │  Drop block here     │  │  │ Padding  80px   │
│  ▬Button│  │  └──────────────────────┘  │  │ Colour  Ink ▾   │
└─────────┴──────────────────────────────────┴─────────────────┘
```

| Hissa                | Detail                                                               |
| -------------------- | -------------------------------------------------------------------- |
| **Left**             | Block library (categories + search) + layers/tree view               |
| **Center**           | Canvas — **sandboxed iframe**, theme CSS aur admin CSS na takraayein |
| **Right**            | **Do tabs: Document aur Block**                                      |
| **Floating toolbar** | Selection pe — align, link, duplicate, delete, move                  |
| **Top**              | Undo/redo, breakpoint switch, preview, save/publish, unsaved guard   |

**Do tabs kyun zaroori hain:** builder mode me user ko slug, status, template ya
category set karni ho to jagah honi chahiye. Sirf block properties dikhana matlab user
ko editor se bahar jaana padega.

**Floating toolbar kyun:** align/link/duplicate/delete high-frequency actions hain.
Inhe right panel me bhejoge to editing slow lagegi. **Panel configuration ke liye hai,
toolbar editing ke liye.**

**Responsive inherit indicator:** mobile pe value set nahi hai to saaf dikhe ki desktop
se aa rahi hai — warna user samajh nahi paata ki usne kya set kiya aur kya inherit hua.

---

## 5. Media library

```
┌────────────────────────────────────────┬─────────────────────────┐
│  Media Library      [Grid][List][+ Upload]                       │
│  [All media][Team photos][Treatments][Blog][Trash 3]             │
├────────────────────────────────────────┼─────────────────────────┤
│  ┌────┐┌────┐┌────┐┌────┐              │ clinic-front.jpg        │
│  │▨▨▨ ││▨▨▨ ││▨▨▨ ││▨▨▨ │              │ ┌───────────────────┐   │
│  └────┘└────┘└────┘└────┘              │ │      ▨▨▨▨▨        │   │
│  ┌────┐┌────┐┌────┐┌────┐              │ └───────────────────┘   │
│  │▨▨▨ ││▨▨▨ ││▨▨▨ ││▨▨▨ │              │ Alt text · required     │
│  └────┘└────┘└────┘└────┘              │ [Acme Dental entrance]  │
│                                        │ [Crop/rotate][Replace]  │
│                                        ├─────────────────────────┤
│                                        │ USED IN 3 PLACES        │
│                                        │  Home       hero block  │
│                                        │  About Us   image block │
│                                        │  Settings   OG image    │
│                                        │  Delete blocked while   │
│                                        │  references exist       │
└────────────────────────────────────────┴─────────────────────────┘
```

- **Folders** — date-based organization nahi. Users folders maangte hain
- **Alt text required-flagged** — Phase 4 ke SEO checklist se juda hai
- **Crop / rotate** — non-technical user ke paas koi doosra image tool nahi hota
- **Replace file** — image swap ho, URL aur saare references same rahein
- **"Used in N places"** — `mediaRefs` backlink index se. References hone pe delete block
- **`<MediaPicker />` reusable modal** — entry editor aur page builder dono isko use karte hain

---

## 6. Appearance → Menus

```
┌───────────────────────────────────┬─────────────────────────────┐
│ Primary Navigation      6 items   │ THEME LOCATIONS             │
│  ⠿⠿ Home            entry · /     │  Header      Primary Nav    │
│  ⠿⠿ About Us        entry ·/about │  Footer col 1  Footer Links │
│     ⠿⠿ Our Team     entry ·/about/│  Footer col 2  Patient Info │
│  ⠿⠿ Services        archive       │  Mobile drawer Not assigned │
│     ⠿⠿ Teeth Whit…  entry         ├─────────────────────────────┤
│  ⠿⠿ Blog            archive       │ ITEM SETTINGS — About Us    │
│  ┌ Drop here to add ┐             │  Label     [About Us]       │
│  └──────────────────┘             │  Link type [Entry ▾]        │
│                                   │  Open in   [Same tab ▾]     │
│                                   │  CSS class [e.g. nav-cta]   │
└───────────────────────────────────┴─────────────────────────────┘
```

**Menus aur locations alag hain** (D-17): jitne chaho menus banao, theme jo locations
declare kare uspe assign kar do. Fixed `main|footer` keys ka matlab hota ki client ko
doosra footer menu chahiye to code change karna pade.

**CSS class per item** — nav me "Book Now" button isi se banta hai.

> ⚠️ **Upar wale wireframe ka "Link type [Entry ▾]" abhi UI me nahi hai** (24 Aug).
>
> Data ka field `link.type` maujood hai (`'entry' | 'url' | 'taxonomy'`) aur server
> abhi sirf `url` accept karta hai — `entries` module Phase 1 me aayega. Tab tak wo
> dropdown hamesha-disabled rehta aur kisi state se bind nahi tha, isliye hata diya gaya:
> client use click karta aur kuch na hota.
>
> Phase 1 me yahan **asli** control banega, jo `item.link.type` se bind hoga aur entry/
> taxonomy picker kholega. Tab ye wireframe sach ho jaayega.
**Par CSS class se behaviour kabhi tay nahi hota (R18)** — layout, columns aur menu type
sab structured fields hain.

### 6.1 Menu item ke teen type (D-43, spec 006)

Har top-level item pe `menuType` hai — **ek hi menu me teenon mix ho sakte hain**:

```
Simple link   label + URL, bas
Dropdown      + sub items, max depth 3 (top → child → grandchild)
Mega menu     + layout (sm|md|wide|full) + columnCount (2..6)
              + Columns → Groups → Links   (ek column me kai groups)
              + optional CTA row
```

CTA row me chaar field hain: **Text**, **Button label**, **Button URL**, aur
**Button style** — wahi teen choice jo header ke buttons pe hai (Outline / Primary /
Accent), default **Accent**. Style dropdown hai, CSS class nahi: R18 kehta hai class
sirf *extra* styling hai, aur client se `btn--accent` yaad karwana is CMS ke maqsad ke
khilaaf hai. (Ye 25 Aug me juda — pehle CTA plain text jaisa render ho raha tha; D-43 ka
amendment dekho.)

Item ka `.day-body` khulne pe **progressive** hota hai: Simple pe do field, Dropdown pe
sub items ki list, Mega pe inline builder. Non-technical client ko mega ki complexity
tabhi dikhti hai jab wo mega chune.

**Mega builder modal nahi hai** — frozen design me modal/drawer primitive hai hi nahi.
Wo mega item ke apne `.day-body` ke andar nested `.day` accordions se banta hai (wahi
primitive jise design khud "menu items" ke liye likhta hai).

**Reorder:** **har level pe drag-drop**, design ke `.grip` handle se — top-level items,
mega ke columns, groups aur links sab. Handle focus karke ↑/↓ se bhi hota hai (drag-drop
akela keyboard se chalta hi nahi). Order data me array ki position
hai, isliye wo pure UI change hoga.

### 6.2 Theme locations

```
Header                             ← theme declare karta hai, core enum nahi (D-17)
```

Naam **generic** hain — `footerExplore` jaise content-specific naam ek travel site ke
hain, framework ke nahi. Unassigned ek valid state hai aur wo kuch render nahi karta.

⚠️ **`mobile` location nahi hai** — mobile wahi menu render karta hai jo Header pe hai
(D-43 ne D-17 ka ye hissa supersede kiya).

⚠️ **Footer Column 1..4 bhi ab locations nahi hain** — D-44. Wo poora structure
Appearance ▸ Footer me chala gaya (§6.3). Panel me ab **sirf Header** dikhta hai.

### 6.3 Appearance ▸ Footer — footer ka poora structure yahin hai (D-44)

> **Pehle yahan likha tha:** _"footer ke columns menus hi hain; Footer tab me sirf social
> links aur copyright hain"_. 25 Aug ko client ne teen cheezein maangin jo us model me
> fit hi nahi hotin — columns ki **ginti** chunna, column me **text** rakhna, aur footer
> ka **apna logo**. Poora tark D-44 me hai.

Screen pe teen panel:

| Panel | Kya |
| --- | --- |
| **Footer Logo** | Ek image field. Khaali chhoda to Settings ▸ General wala logo chalta hai. Mobile drawer bhi yahi logo dikhata hai |
| **Footer Columns** | "Number of columns" (0–4), phir har column ka apna card — drag se reorder |
| **Copyright** | `{year}` placeholder ke saath. Save isi panel ke `panel-foot` me |

Ek column ke card me: **Heading** · **Shows** (Menu only / Text only / Text + Menu) ·
**Width** (Normal / Wide) · **Text blocks** (icon + label + textarea, drag se reorder) ·
**Menu** (Appearance ▸ Menus me bane menus ka dropdown).

**Social links yahan se hata diye gaye** — wo Settings ▸ General me pehle se the aur data
ek hi hai (`settings.social`). Do jagah ek hi field rakhne ka nateeja: client ek jagah
badalta hai aur doosri jagah purana dekh kar confuse hota hai. Footer unhe render karta
rehta hai.

**Column ki heading ab apni field hai**, `menus.name` se nahi aati — text-only column me
koi menu hai hi nahi (D-44 §3).

Public site pe: **≤1024px pe 2 column, ≤760px pe 1 column** (reference ke apne
breakpoints). Mobile pe **sirf "Menu only" column collapsible** hote hain (heading hi
toggle hai) — text wale column khule rehte hain, kyunki unme contact detail hoti hai
(D-44 §9).

Text block me likha phone aur email public site pe **apne aap clickable** ho jaate hain —
client ko kuch alag nahi bharna padta. Phone tabhi pakda jaata hai jab block ka icon
**Phone** ho, warna pincode aur ghar ke number bhi link ban jaate (D-44 §10).

⚠️ **Footer ka column flat list hai** — menu ke sirf top-level items dikhte hain. Dropdown/
mega ke sub-items hover pe khulte hain aur footer me hover hai hi nahi. Screen ismein
warning deti hai jab chune hue menu me aise item hon (D-44 §8).

> `05-BUILD-PLAN.md` pehle "Footer columns — links" ko settings ke saath likhta tha aur ye
> doc unhe locations ke saath. D-43 me faisla "columns = menus" hua tha; **D-44 me wo palat
> gaya** — ab footer ka poora structure settings me hai, yaani build-plan wali line hi
> sahi nikli.

⚠️ Abhi Appearance me sirf **Menus** aur **Footer** dikhte hain. Design ke baaki do tab
(Homepage Blocks, Banners & Sliders) tab wapas aayenge jab wo screens banengi.

### 6.4 Header ka CTA button

D-27 ke scope me "CTA button" hai. Wo **Appearance ▸ Menus ke left column me** baithta
hai (Theme Locations ke neeche), kisi alag "Header" tab me nahi — kyunki Menus screen hi
asal me header ki screen hai.

Ye ek **menu item jaan-boojh kar nahi** hai. Client ke behaviour reference me CTA
`<nav>` ke bahar `.hdr__r` me baithta hai aur mobile pe **dikhta rehta hai**, jabki menu
items drawer me chale jaate hain. Use `menuType` banane se wo drawer me chala jaata — ek
conversion button ke liye ye ulta padta. Aur `menuType` ek **structural** discriminator
hai ("andar kya hai, kaise khulta hai"), look ka nahi.

Jise nav ke **andar** button chahiye — wo kisi bhi item pe `className: nav-cta` laga
sakta hai. D-17 exactly yahi kehta hai: _"nav me 'Book Now' button isi se banta hai"_.

⚠️ CTA `settings` document me hai, menu me nahi — isliye uski permission `settings.update`
hai, `menu.update` nahi. `author`/`contributor` ko (jinke paas `menu.read` hai par
`settings.read` nahi) ye panel dikhta hi nahi, aur screen ka baaki hissa normal chalta hai.

---

## 7. Settings → Reading

```
┌──────────────────────────────┬────────────────────────────────────┐
│ FRONT PAGE                   │ ⚠ SEARCH ENGINE VISIBILITY         │
│  ☑ A static page             │   Discourage search engines  [ON]  │
│  ☐ Your latest posts         │   Adds noindex site-wide and       │
│  Homepage   [Home → / ]      │   blocks crawling in robots.txt.   │
│  Posts page [Blog → /blog]   │   Banner stays visible in admin.   │
├──────────────────────────────┼────────────────────────────────────┤
│ ARCHIVES                     │ PERMALINKS                         │
│  Posts per page  [10]        │  Pages     /{parent}/{slug}        │
│  Feed items      [20]        │  Posts     /blog/{slug}            │
│  Full text in RSS  [ ]       │  Services  /services/{slug}        │
│                              │  Category base  /category          │
│                              │  Tag base       /tag               │
└──────────────────────────────┴────────────────────────────────────┘
```

- **Front page** — teen planning documents me kabhi ye likha hi nahi tha ki `/` resolve
  kaise hota hai. Ye screen uska jawab hai
- **Posts page** setting hi `/blog` ko ek URL banati hai, uski pagination ke saath
- **Search engine visibility** — ek toggle, site-wide `noindex` + robots.txt, aur admin
  me permanent banner. Staging site ka Google me index ho jaana agency ka sabse mehnga
  routine accident hai
- **Permalinks** deliberately chhota set — `?p=123` ya date-based patterns nahi.
  Publish ke baad pattern badla to redirects automatic

---

## 8. Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠ Search engines are blocked. Turn off in Settings → Reading.   │
├─────────────────────────────────────────────────────────────────┤
│  24        86        2            7          12                 │
│  Pages     Posts     Pending      Trash      Submissions        │
│                      review ⚠                                   │
├──────────────────────────────┬──────────────────────────────────┤
│ RECENTLY EDITED              │ SITE HEALTH                      │
│  Teeth Whitening   pending   │  Core version  v2.4.1 · latest   │
│  Home              published │  Migrations    none pending      │
│  5 Signs You Need… draft     │  Last backup   4 hrs ago         │
│  Festive Offer     scheduled │  Broken links  1 found           │
└──────────────────────────────┴──────────────────────────────────┘
```

**Site Health card** agency ke liye hai, client ke liye nahi — core version, pending
migrations, last backup. Ye wo teen sawaal hain jo per-client SSH kiye bina pata hone
chahiye.

---

## 9. Frontend edit bar

Logged-in user jab **live site** dekhe, upar ek patli bar aaye: **"Edit this page"**.

**Kyun:** iske bina loop ye hai — site pe typo dikha → admin kholo → list me page
dhoondho → edit karo. Bar ke saath: typo dikha → click → edit.

Ek din ka kaam hai aur roz kaam aata hai. Session/origin design Phase 3 me waise bhi ho
raha hai, isliye wahin add karna sasta hai.

---

## 10. Cross-cutting UX rules

| Rule                                            | Kyun                                              |
| ----------------------------------------------- | ------------------------------------------------- |
| Har destructive action pe **undo ya confirm**   | Non-technical user, galti hogi hi                 |
| Delete ka matlab **trash**, permanent nahi      | Recovery ka raasta hamesha khula rahe             |
| Har list pe **server-side pagination** day 1 se | Warna admin hang                                  |
| Empty / error / loading states har screen pe    | Non-technical user ke liye yahi **actual UX** hai |
| Error message me **kya hua + ab kya karein**    | "Something went wrong" bekaar hai                 |
| Save ke baad **toast** with clear wording       | "Published" — action ka echo                      |
| Pre-publish panel me SEO checklist              | Tab me dabaa hua checklist koi nahi dekhta        |
