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
Posts                     All Posts · Add New · Categories · Blog Page · Blog settings
                          (Tags 9 Sep ko hata; Blog settings 11 Sep ko Settings se yahan — D-93)
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


---

## Packages ki screens — 26 Aug (Slice 2 + Slice 3)

> Ye section `admin-design.html` ke `#s-packages`, `#s-package-edit` aur `#s-taxonomy` se
> aata hai. Design **spec** hai (R15); neeche sirf wo farq likhe hain jo **client ke
> faisle se** aaye, aur wo teenon `03-DECISIONS.md` me hain.

| Screen | File | Aadhaar |
| --- | --- | --- |
| All Packages | `screens/packages/PackagesList.jsx` | `#s-packages` |
| Add New / Edit | `screens/packages/PackageEdit.jsx` | `#s-package-edit` |
| Destinations · Package Type | `screens/packages/TaxonomyScreen.jsx` | `#s-taxonomy` |
| Hotels · Add Ons · Transfer | `screens/packages/MasterListScreen.jsx` | naya, `#s-taxonomy` ka layout |
| What's Included · Itinerary Images · Section Headings | `screens/packages/PackageDefaults.jsx` | naya |
| Settings ▸ CTA Section | `screens/settings/CtaSection.jsx` | `itinerary-v3.html` ka `.offer` (D-67) |

⚠️ **CTA Section `Settings` me hai, `Packages` me nahi** — client ka faisla: "dusre pages
par bhi use hoga" (D-67). Iska matlab package page ka text **do jagah** baithta hai:
headings `Packages ▸ Section Headings` me, aur ye card `Settings ▸ CTA Section` me.

### Ek screen, kai lists

`TaxonomyScreen` aur `MasterListScreen` dono **config se** chalti hain. Wahi wajah jo API
pe hai (D-48 §1, D-49): jo cheezein ek jaisi hain unhe do jagah likhne ka nateeja is repo
me do baar dekha ja chuka hai — wo do jagah ek din alag ho jaati hain.

### Design se jo alag hai, aur kyun

| Kya | Kyun |
| --- | --- |
| `.toggle-ico` **14px** hai, reference me 11px | Client ne bada karwaya (27 Aug) — us naap pe wo caret se zyada ek dhabba lagta tha, aur wo poore admin me chalis jagah hai |
| 782px pe sidebar ke **labels chhupte** hain, reference me nahi | Reference wahan sirf width badalta hai aur labels `overflow-x: hidden` se kat-te hain. Hamare yahan labels chhupane ka kaam `body.collapsed` karta hai, aur 782px pe body collapsed hoti hi nahi — sirf width copy karne pe rail me **aadha kata hua text** dikhta ("Packa", "Setti"). Isliye wahi selector list `body:not(.collapsed)` ke saath dobara likhi hai (31 Aug, `07-CONVENTIONS.md` §9.4) |

| Kya | Kyun |
| --- | --- |
| `Code` column nahi hai | Package Code field client ne hata diya (D-50 §2) |
| `Sold Out` tab nahi hai | `availability` field hi hata di gayi — client ko wo feature chahiye hi nahi (**D-54**, D-50 §1 superseded) |
| `Enq.` column `—` dikhata hai | Client ne wo column **1 Sep ko hata diya**. Enquiries ka apna module ab bana hua hai (**D-75**), par per-package ginti wo cheez nahi thi jo unhe chahiye thi |
| **Enquiries ▸ Detail** me Send Quotation · Activity feed · Assign · Priority · Follow-up nahi hain | Har ek kisi na kisi cheez pe ruka hai — SMTP (Phase 0 se blocked), activity log (Q-4 me deferred), aur assignment ke field. Khaali panel dikhane se behtar hai wo panel na dikhna (**D-30**, D-75). Quick Actions (Call · WhatsApp · Email) phir bhi hain — wo **link** hain, hum kuch bhejte hi nahi |
| **Enquiries ki list** ke column form se **derive** hote hain | Design ki table ke column fixed hain, par form client khud banata hai. Column pehle **key ke naam** se milte hain, phir type se — label se kabhi nahi (label badalta hai, key nahi). Sirf-type wala pehla design client ke asli form pe **chup-chaap galat** tha (**D-75**) |
| Editor ki WYSIWYG toolbar nahi hai | Ek toolbar jo kuch kare hi na, wo "toota hua" lagta hai. Wahi tark jisse Slice 0 me "Link type" dropdown hataya gaya tha. **TipTap agla kadam** — data ka shape uske liye pehle se sahi hai |
| **FAQs** panel me policies nahi hain | Design me wo "FAQs & Policies" tha. Policy har package pe same hoti hai aur wo `packageDefaults` me pehle se hai (§2.1) — dono ek panel me rakhne ka matlab hota ki client wahi policy 60 packages pe dobara likhe (**D-59**) |
| Pricing panel **chaaron category ki fixed table** hai — Category · Price From · Strike-through | Design me ek row thi (`Currency · Price From · Strike-through`). Categories fix chaar hain, to unhe ek-ek karke jodwana bane-banaye sach ko dobara bharwana tha. **Khaali daam = wo category is package pe milti hi nahi** aur page se gayab ho jaati hai (client, 27 Aug — **D-57 §1**) |
| Panel me **currency nahi** hai | `settings.currency` se aati hai. Dono jagah hone ka matlab hota "kaunsi jeetegi" (**D-56 §2**) |
| Panel me **Price Basis · GST % · Advance to Book %** nahi hain | Client ne poori row hata di. Page ki `per person on twin sharing…` wali line phir bhi dikhti hai — par uske liye **admin me koi field nahi** hai: wo theme me static hai, kyunki har package pe wahi rehti hai (**D-63**, Q-9) |
| Hotels list me **Note** ek naya optional field hai | Pehle wo har package pe likha jaata tha (`categoryPricing[].note`). Hotel ki khaasiyat hotel ki apni baat hai — ek baar likho, har package me chalti hai (**D-57 §2**) |
| Pricing me **Occupancy Slabs** aur **Fixed Departures** nahi hain | Client ne dono poori tables hata di (spec 007 §4) |
| **Hotels** panel design me tha hi nahi | Spec §4.2 se aaya, aur usme **ek hi blank row** hai — Destination · Category · Hotel · Add (**D-61**). Public table poori tarah derived hai: rows itinerary se, categories pricing se, hotel Hotels master list se (**D-58**, **D-60**). Panel me kuch na karo to bhi table bharti hai; neeche sirf wo rows dikhti hain jo client ne khud jodi hain |
| **Add-ons** sidebar me checkbox list hai | Destinations/Package Type jaisa hi chunav (spec §1.4). Ye D-61 me global ho gaya tha aur **D-64 §4** me wapas chunav pe aaya |
| Itinerary ke din me **Hotel Category** nahi hai | D-51 §3 me client ne maanga tha, live dekhne ke baad hataya — uska jawab page pe kahin dikhta hi nahi tha (**D-64 §2**) |
| Din me **Highlights** ka alag field nahi hai | Ab wo description me hai: `-` se shuru hone wali line bullet banti hai (**D-64 §3**, migration 014) |
| Main column ke panels **drag se reorder** hote hain | Kram `localStorage` me, DB me nahi — ye ek user ki pasand hai (**D-64 §6**). Sidebar nahi, kyunki usme Save baitha hai |
| Har **remove** pe ek confirmation aati hai | Galat click ka koi undo nahi — save tak wo sirf browser me hai (**D-64 §5**) |
| Inclusions & Exclusions ka panel nahi hai | Wo ab **global** hai (spec 007 §1.5) |
| Package Details me paanch field kam hain | Client ne hataye — Package Code, Difficulty, Group Size, Trending ribbon, Enable enquiry form |
| "Travel Themes" ab **Package Type** hai | Free-tag input ki jagah managed list (spec 007 §1.2) |
| Taxonomy list me checkbox column nahi | Bulk actions in chhoti liston pe bane hi nahi — wahi precedent jo `UsersList` pe hai |

### Sidebar ka Packages submenu

Client ki 26 Aug wali list se (spec 007 "Scope me kya hai") — design ke purane paanch item
se nahi. "Departures & Pricing" hat gaya, "Travel Themes" → "Package Type", aur paanch nayi
lists judin.

**"Inclusion/Exclusion" jaan-boojh kar nahi hai** — client ne wo naam bhi bataya tha, par
dono ka target ek hi block hai (§1.5). Do menu item ek hi screen pe le jaate to wo "do alag
cheezein hain" ka jhootha ishaara deta. spec 007 §9 #2 abhi khula hai; wo sach me alag
nikla to yahan ek line judegi.

### Preview ka button kahin nahi hai (client, 4 Sep)

Design me `Preview` **teen jagah** hai — `Edit Package` ke header me (line 711), publish box ke
actions me (622), aur Enquiry Form pe (1210). Hamare paas ek bhi nahi hai, aur ye **client ka
faisla** hai: _"nahi draft me preview nahi karbana to button bhi mat lagao preview bala"_.

Wajah tark se milti hai: preview ka poora matlab **draft** dekhna hai, aur draft public site pe
hai hi nahi — uska link 404 deta. Use sach me chalane ke liye `apps/web` me ek token wala route
chahiye (WordPress jaisa), jo apne aap me ek alag kaam hai. Aadha bana kar 404 pe le jaana usse
bura hota.

Uski jagah **`View`** aaya — `All Packages` ke row actions me, design ki tarah, par **sirf
published** package pe. `url` API se aata hai aur draft pe wo `null` hota hai, isliye link
banta hi nahi.

⚠️ Wo `entry.path` **nahi** hai. Admin apne port pe chalta hai (`:5173`), to relative path admin
me hi khulta hai — wahi bug Bulk Upload ke result screen pe pehle ho chuka hai (D-81). Poora URL
`env.SITE_URL` se banta hai, `entries/controller.js` me — wahi pattern jo `settings` pe hai.

### Image ka field ek click me library kholta hai (client, 4 Sep)

Pehle box pe click karne se computer ka **file dialog** khulta tha, aur library ek alag
**"Choose from library"** button ke peeche thi. Client ne wo button hatane ko kaha — _"sidha
media gallery open ho, pahle jaise editor me hota hai"_.

Baat data se bhi milti hai: aam kaam **"jo pehle se upload hai wahi chuno"** hai, nayi file
daalna kabhi-kabhar. Upload ka raasta khota nahi — `MediaPicker` ka apna **Upload** tab hai jo
file upload karke use turant chun bhi leta hai. Yaani dono cheezein pehle se **kam** click me.

Ye `MediaDrop.jsx` me ek jagah badla, isliye chaaron jagah ek saath — Settings ka Logo/Favicon,
Footer ka logo, package ka banner aur destination ka banner.

---

## Tour page ka aakhri daur — admin ke chaar badlaav (9 Sep, D-90)

### `Page heading` — ek naya field, aur `Title` ka kaam chhota

`Tour Page` ke edit screen pe `Title` ke neeche naya **`Page heading`** hai. Wahi page ka `<h1>`
banta hai; `Title` ab slug, breadcrumb, admin ki list, SEO aur schema ke liye hai. Client ka apna
vaakya: _"current jo hai use only slug ke liye rakhte hain, to breadcrumb bhi simple ho jayega."_

⚠️ **Editor bilkul wahi hai jo baaki jagah hai** — poore tabs ke saath. Pehle iska apna chhota
toolbar tha (bold · italic · highlight · link); client ne mana kiya: _"page header ka editor
different kyu hai other editors se, make it same becouse admin could be confuse."_

⚠️ **Uski ek keemat hai, aur wo hint me likhi hai.** Toolbar me heading dropdown, list aur image
ab dikhte hain, par ye field `<h1>` ke **andar** chhapta hai — save pe wo gir jaate hain. Hint
pehle se bata deti hai ki sirf bold, italic aur link bachenge.

⚠️ **Accent rang `Italic` se aata hai**, kisi alag button se nahi. Theme me `.vhero h1 em` ko
`font-style: normal` ke saath accent rang milta hai, yaani wahan `<em>` tirchha hota hi nahi.
Isiliye `HtmlEditor` ka purana `Highlight` button hata diya gaya — wo sirf us chhote toolbar ke
liye tha. Ye baat bhi hint me hai, warna client tirchha maangta aur neela paa kar use bug samajhta.

### `Package edit` pe ab apna `Rating` panel

Sidebar me naya **`Rating`** panel — wahi `RatingPanel` component jo `Packages ▸ Section Headings`
pe site ki rating ke liye chalta hai. Dobara nahi likha gaya.

⚠️ **Ye "bana hua par juda nahi" ka udaharan tha** — `fields.rating` D-87 §3 se schema, service aur
payload teenon me kaam kar raha tha; bas **bharne ka raasta nahi tha**, isliye har package pe site
wali rating hi chhapti thi.

⚠️ **Ek hi panel, do jagah, aur `0` ka matlab dono jagah alag:**

| Kahan | `0` ka matlab |
| --- | --- |
| `Section Headings ▸ Traveller reviews` | rating **dikhani hi nahi** — page se line gayab |
| `Package edit ▸ Rating` | is package ki **apni rating nahi** — site wali chalti hai (D-87 §3) |

⚠️ **Client ne 9 Sep ko is panel ki teenon hint hata di** (dono jagah se, aur per-package wali bhi).
Wajah samajh aati hai — ek hi hint dono jagah sach nahi ho sakti. Ab wo farak sirf code comments me
likha hai (`RatingPanel.jsx` ka header, `PackageEdit.jsx` ka panel comment). **Hint wapas jodna
client ka faisla hai — khud mat jodo.**

### `Stat rail` me `Highlight this one`

Har stat row pe naya checkbox. `statSchema.highlight` D-87 se maujood tha, payload use bhejta tha
aur theme uspe `.vrail__c--p` (accent rang) lagati thi — **admin me tick karne ka raasta hi nahi
tha**, yaani wo hamesha `false` rehta aur design ka neela `₹11,499` kabhi aata hi nahi.

### `Package list` block me `Link label` + `Link URL`

Block ke heading/subheading ke neeche do naye box — reference ka _"Need something custom? →"_
(`tour-v3.html:1436`).

⚠️ **Text bhi field hai, sirf URL nahi** — client ka chunav. Theme me likh dene ka matlab hota ki
wo har client ki site pe wahi rahe.

⚠️ **Dono chahiye** — ek bhi khaali ho to link render nahi hota, aur hint yahi kehti hai. Aadha
link ek aisa button hai jo click pe kuch nahi karta.

### `Enquiry Details` pe ab poora URL

`Submitted from` ab **poora URL** dikhata hai aur wo ek **link** hai (naye tab me khulta hai).

⚠️ Pehle wahan `sourcePath` tha. Admin apne origin pe chalta hai (`:5173`), to relative path admin
ka pata lagta tha — us text ko copy karke koi khol hi nahi sakta tha. **Wahi bug `All Packages` ke
`View` link pe aur Bulk Upload ke result pe pehle ho chuka hai (D-81) — ye teesri baar tha.**

`sourceUrl` server pe `env.SITE_URL` se banta hai, kisi setting se nahi — `settings.read`
`salesAgent` ke paas hai hi nahi, aur ye screen usi ke liye bani hai (D-29).

⚠️ **List me abhi bhi `sourcePath` hai** — `enq-src` column chhota hai, wahan poora URL bemaani
hota.

---

## Bulk Upload — ek screen, do target (D-81, D-92)

Google Sheet me Google Docs ki list, aur har doc se ek page. Pehle sirf package (D-81, 3–4 Sep);
10 Sep se blog post bhi (D-92).

⚠️ **Ye screen admin design me hai hi nahi** — client ne design ke baad maanga. Isliye koi nayi
shakl nahi gadhi gayi: wahi `.panel` + `table.list` jo baaki screens pe hai. Iska apna design
chahiye ho to wo client se aayega (R15).

| Kya | Kahan |
| --- | --- |
| Sidebar | **top-level `Bulk Upload`, submenu nahi** — client, 3 Sep: _"sidebar me menu banana hai not submenu"_ |
| Routes | `/bulk-upload` (form + Past imports) · `/bulk-upload/:id` (ek run ka nateeja) |
| Permission | dono screen `tools.import` pe — aaj sirf `admin` ke paas (migration 021) |

### Import ka form

| Field | Kya hai |
| --- | --- |
| `What are you importing?` | dropdown — `Packages` / `Blog posts`. Har kism ka apna doc template hai |
| `Google Sheet link` | sheet me `Doc File` column, har row me ek doc ka link |
| `What is in this sheet?` | radio — `New packages` / `Existing packages` (ya `… posts`) |

⚠️ **Dropdown hai, sidebar me doosra menu nahi** — client ka faisla (10 Sep). Do top-level menu
banana D-81 wali unki apni baat ke ulta jaata, aur Past imports ki list bhi ek hi rehti hai.

⚠️ **Radio ek elaan hai, filter nahi** (D-81): jo row us baat se alag nikle wo `Failed` hoti hai.
Bina iske ek purana URL galti se nayi sheet me reh jaaye to wo ek live page ko chup-chaap overwrite
kar deta.

⚠️ **Radio ke label aur API ke error message ek hi jagah se aate hain** — `IMPORT_TARGET_LABEL`
(`packages/shared`). Error kehta hai _"choose New posts"_ aur radio pe literally `New posts` likha
hai. Do jagah haath se likhne pe ek din ek badalta aur doosra nahi — tab error client ko ek aise
button ki taraf bhejta jo us naam se hai hi nahi.

### Past imports

Filter (`.subsubsub`): `All` · `Packages` · `Blog posts` · `Pages` — default `All` (client, 11 Sep;
Pages 14 Sep).

**Pagination (client, 14 Sep)** — 20 ek page pe, list ke upar `N items ‹ 1 ›`. `All` me teeno type ke
run **jud kar** aate hain (har type ke 20, yaani 60 tak); har type ka tab apne 20. Pehle list sirf
page 1 maangti thi, to All me sabse naye 20 hi dikhte aur baaki type ke run "gayab" lagte. Tab
badalne pe page 1.

`When` · **`Type`** · `Sheet` · `New` · `Existing` · `Published` · `Draft` · `Failed` · `Status`

- **`Type` 10 Sep ko juda.** Us field se pehle ke run `Packages` dikhate hain — us waqt import package
  ka hi hota tha, isliye ye sach hai, andaza nahi (koi migration nahi lagi)
- **Filter upar wale "What are you importing?" se juda nahi hai** — wo tay karta hai kya banega, ye
  tay karta hai kya dikhe. Filter server pe hota hai (`?target=`), screen pe nahi
- **Sirf 20 run** bachte hain (client, 4 Sep: _"i need only 20 past import"_) — **har type ke 20**
  (11 Sep). Pehle dono milaa kar 20 the, yaani blog ke import package ka itihaas mita dete
- ⚠️ Filter `admin-design-v2.html` me nahi hai (poori screen hi nahi hai) — client ka faisla, D-92 §12
- `Failed` pe hover → alag-alag wajah, zyada se zyada paanch. Ek hi wajah se das row fail hon to wo
  ek hi line hai
- `New`/`Existing` wo hai jo **sach me hua** (`row.action`), wo nahi jo client ne radio pe chuna

### Ek run ka nateeja

Tabs: `All` · `Published` · `Draft` · `Failed`. Columns: **`Packages` / `Blog posts`** · `Status` ·
`What’s missing` · `Page`.

- Pehle column ka naam run ke target se aata hai
- `What’s missing` me har issue ka **khaana, doc me kya likha tha, aur kya karna hai** — teeno.
  `value` isliye ki client doc me seedha Ctrl-F kar sake
- `Page` ka link **poora URL** hai (`env.SITE_URL` se). Sirf path dene pe admin (`:5173`) use apna
  hi pata samajhta tha — wahi bug jo baad me `View` link aur `Enquiry Details` pe bhi mila
- Chalte run pe har 3 second poll, khatam hote hi **band** — prod ka rate limiter per-IP hai, aur
  ek bhoola hua poll poore office ko 429 dila sakta hai

### Jo admin me dikhta hi nahi

Blog doc ke nishaan — `Note:` · `Warning:` · `Quote:` · `Caption:` — **page pe** block bante hain
(theme, `lib/article-html.js`), DB me nahi. Post ke editor (TinyMCE) me client ko wahi saadi line
dikhti hai, dabba nahi. Jaan-boojh kar — **A-23**.

## 11 Sep — client ki list aur header ki jagah (D-93, D-94)

⚠️ Inme se **koi bhi** `admin-design-v2.html` me nahi hai — sab client ke 11 Sep ke faisle hain.

### Posts

- **Menu:** `All Posts · Add New · Categories · Blog Page · Blog settings`. Blog settings
  `Settings` se yahan aaya (`/posts/settings`, heading `Blog settings`, `SettingsTabs` nahi) — wahi
  raasta jo `Tour settings` ne 8 Sep ko liya
- **Post edit:** **Page Header panel nahi** — `<h1>` ab Title hai. **Categories = checkboxes** (kram
  list ka, tick karne ka nahi). **Excerpt** panel Content (aur uske FAQ block) ke **baad**, optional —
  khaali pe card content ki pehli 24 shabd dikhata hai. **Featured image** ke box me koi hint nahi, sirf
  "No file selected" (client, 15 Sep — pehle wali "Settings wali universal image" jhooth thi, post pe
  fallback hai hi nahi)
- **Categories screen:** ginti ka column **`Posts`** (pehle `Packages` likha tha), naya **Badge
  colour** — colour picker + `Use automatic` (khaali = Automatic, reference ke chaar rang me se), aur
  list me naam ke aage rang ka chhota dot
- **All Posts** ka Category column — saari categories, comma se

### Reviews

Stars dropdown: `5 · 4.5 · 4 · 3.5 · 3 · 2.5 · 2 · 1.5 · 1`. List me `★★★★☆ 4.5` — text me aadha
taara nahi banta, isliye number saath.

### Tour Pages

List ka `Packages` column hata (client ne mana kiya).

### Pages (D-95, 14 Sep)

`NotBuiltYet` se bahar. **All Pages** — design `#s-pages` jaisa: Title · Author · Status · Updated,
aur Posts jaisa **All dates** dropdown (client, 14 Sep — design me nahi hai; Category wala nahi).
**Edit Page** — design ke `#s-page-edit` se farak, sab client ke:

- **Page heading nahi** — `<h1>` Title hai. **Eyebrow nahi**
- Page header me **Button label · Button link** (hero button page ka apna). WhatsApp button **hamesha**,
  number Settings ▸ General se — checkbox 14 Sep shaam hata
- **Pages ▸ Pages settings** (`/pages/settings`): Banner image (Featured image na ho to) · Show "On this
  page" — sab pages ke liye (D-95 §12)
- Content ke blocks sirf **Text + FAQs**
- Featured image ki hint: khaali = Pages settings ki banner image
- Permalink parent ke path ke neeche dikhta hai

### Pages ▸ Home Page (D-96, 15 Sep)

Design v3 me home ki koi screen hai hi nahi — ye poori tarah client ke kehne pe hai. `/pages/home`
**seedha edit screen** kholta hai (home ek hi hai): na list, na "Add New", na "Back to list".

- Title + permalink **`/`** (slug ka Edit link nahi). Content panel me **sections** — `＋ Add block…`
  se jodo, ⠿ se drag. Publish panel me Trash button **nahi** (hint: Draft karo). Page settings panel
  nahi (featured image, parent, sidebar — kuch nahi). SEO panel wahi
- Home na bana ho to upar notice — pehli **Save** banati hai
- **Hero with form** section: Background colour (picker + "Use default") · Desktop image · Mobile
  image · Title (Italic = accent) · Description · 4 Stats (Value/Label) · Form (sirf Active) · Ribbon ·
  Heading · Description
- **Enquiry Forms ▸ Basics** me naya **Button label** (placeholder `Get this itinerary`)
- **Info cards** section: Background · Heading (Heading · Description · Centre/Left, Left pe Link label/URL) ·
  Card look (Columns · Card border ·
  Top/left colour · Icon position · Text alignment · Coloured box + Icon box colour · Icon colour) · Cards (⠿ drag,
  Icon ya apni image · Label · Title · Description · Link)
- **All Pages** ke upar Home Page ki row (Edit · View)
- **Enquiry Forms** ki fields table me ⠿ — drag se kram
- **Customer reviews** section: Background · Heading (position + link) · picker — All video reviews ＋ / In this
  section (⠿ drag, ✕)
- **Image cards** section: Background · Heading (position + link) · Card look (Card shape · Columns on desktop/phone · Text alignment · Text position) · Cards (⠿ drag — Image · Title · Small line · Tag · Link)
- **Testimonials** section: Background · Quote icon colour · Heading (position + link) · picker — All text reviews ＋ / In this section (⠿ drag, ✕)
- **Logo grid** section: Background · Heading (position + link) · Logos (⠿ · Image · Heading optional · ✕, ＋ Add logo) · Closing line (Title · Text)
- **Reviews** screen me do tab — **Text reviews** · **Video reviews** (Image · Video link · Title · Package name)

### Dropdown ki chaudai — sab screens (`primitives.css`)

Row me **akela** dropdown (jiska `.field` seedha ek-column panel body ya uske `<form>` me ho) 750px se
upar **`max(50%, 300px)`**. `.row2`/`.row3` (ya `panel-body row2/row3`) wale nahi — wahan wo apne
column me poore rehte hain. Naap client ne khud tune kiya (360 → 622px → 50% → `max()`, taaki
sidebar ka Publish Status aadha na rahe).

### Appearance ▸ Menus ▸ Header Buttons

Har button pe **Position**: `Left — before the menu` / `Right — end of header` (default **Right** —
purane button wahin). Left button site pe nav ke theek pehle aata hai; tablet/mobile pe dono group
ek saath daayein. **"Icon only on mobile"** ab sach me sirf phone (750px se neeche) pe label chhupata
hai — pehle 1040px pe tha.
