# 008 — Blog (post detail + blog listing page)

**Status:** 🟢 **Ban gaya** (10 Sep) — Slice A–D2, client ke gine hue dus fix, aur uske upar
**Bulk Upload for blog** (**D-92**). 988 test pass. Faisle **D-91** aur **D-92** me.
⚠️ **Ek verify baaki hai:** `next build` + `next start` pe cache wala pehra (naya post publish →
listing turant update). Dev server pe wo hamesha "pass" dikhta hai — theek wahi shakl jo D-83 me
teen din chhupi rahi thi. **A-21** dekho.
**Phase:** Phase 1 ka bacha hua hissa (**A-9** ka `post` wala aadha) + Phase 3 ka public
render — bilkul wahi shakl jo D-87 (Tour Page) ki thi
**Blocks:** A-9 (`post` ki screens `NotBuiltYet` pe hain)
**Related:** D-46 · D-49 · D-79 · D-80 · D-83 · D-86 · D-87 · D-88 · D-89 · D-90 · A-9 · A-19
**Reference:** [`blog-detail-v1.html`](../docs/reference/blog-detail-v1.html) ·
[`blog-v1.html`](../docs/reference/blog-v1.html) (client, 9 Sep)

---

## Problem

Client blog likhna chahta hai. `post` content type **Phase 1 se DB me maujood hai**
(`content-types.js:421`) — API se aaj bhi ek post banaya ja sakta hai — par admin me uska
koi raasta nahi hai (`/posts` `NotBuiltYet` pe jaata hai), aur public site pe uska koi
template nahi hai (catch-all ki aakhri branch sirf `<h1>` chhapti hai).

Yaani engine taiyaar hai, dono sire nadaarad. Ye wahi haalat thi jo 8 Sep ko `tourPage` pe
thi — Slice A–C ka bhara hua sab kuch public site pe dikhta hi nahi tha (D-87 §11).

Client ne do reference di: **article ka page** aur **listing ka page**, aur kaam ka kram
bhi — **pehle detail, phir listing**.

---

## Scope me kya hai

**Content model**

- `post` type me do badlaav — `taxonomyTypes: ['category']` (Tags nikla) aur
  `hasBuilder: true` do block ke saath (`richText` + `faqs`)
- Naya content type **`blogPage`** — listing page, `tourPage` ka hi joda
- Naya block **`postList`** — `PAGE_BLOCK_TYPES` me, sirf `blogPage` pe
- `settings.blogSettings` — `author{name, role, bio}` aur `showToc`
- Do naye sidebar widget — `topics` · `postPicks`
- `On this post` — heading se derived, `blogSettings.showToc` ke ek checkbox pe

**Public payload**

- `toPublicPost()` — post ka apna payload (byline, prev/next, related, toc)
- `toPostCards()` — card ka **ek** builder, teenon jagah (list · related · postPicks)
- `resolvePostListBlock()` — `postList` ka `data` (cards + facets + featured)

**Admin**

- `Posts ▸ All Posts` · `Add New` · `Categories` · `Blog Page`
- `Settings ▸ Blog settings`
- `Posts ▸ Tags` **hata** diya jaayega

**Theme**

- `components/blog/` — `PostPage` · `PostNav` · `PostList` · `PostCard` · `BlogSchema`

⚠️ **`PostBody` naam ka koi component NAHI banega.** Post ka content `richText` + `faqs` hai,
yaani **wahi `components/tour/Blocks.jsx`** jo pehle se dono render karta hai — aur
`wrapTables()` (D-90) usme module-local hai, export nahi. Doosra renderer likhne ka matlab
hota ki client ki table sirf ek page pe wrap ho. Do copies wali galti D-65/D-51/D-58 pe
teen baar bachayi ja chuki hai.
- Nayi CSS — `.art` `.artfig` `.callout` `.pn` `.pager` `.feat`/`.fcard` `.bpg`/`.bp`
  `.bfilter` `.toc` `.cats` `.pop` `.authorbox` `.share` `.ahead__*`

---

## Scope me kya NAHI hai

- ❌ **Tags** — na taxonomy, na screen, na nav (client, 9 Sep)
- ❌ **`.btopics`** — hero ke neeche `Popular · Best time to visit …` ki chip row
  (client: "remove")
- ❌ **`.vhero__eye`** — `Written on the islands · updated for 2026`. Field (`eyebrow`)
  maujood rahega par khaali; render hota hi nahi
- ❌ **Asli "most read"** — view counting is CMS me hai hi nahi. Uska matlab hai har page
  view pe ek write, jo ISR aur caching dono todta hai (D-83 abhi-abhi theek hua),
  aur uske saath bot filtering + rate limit. **Wo apna alag feature hai.** Yahan
  `postPicks` hai — client 5 tak post khud chunta hai
- ❌ **Comments** — kisi ne maanga nahi
- ❌ **`page` type** — 8 Sep ka sabak: _"Pages par kaam to ho hi nahi raha."_ **Blog ka
  matlab `post` hai.** `page` ki screens A-9 pe khuli rahengi
- ❌ **Author archive** (`/author/x`) — ek hi author hai (§Blog settings)
- ❌ **Category archive ka magic route** — topic-wise page banana ho to wo bas ek aur
  `blogPage` entry hai jisme `postList.categoryId` set ho (`/blog/ferries`).
  `hasArchive`/`archiveBase` aaj bhi kuch nahi karte — poore repo me unka koi padhne wala
  nahi hai, aur packages ka listing bhi ek `tourPage` **entry** hi hai
- ❌ **Share buttons ka koi backend** — `.share` ke chaar link static `href` hain
  (Facebook · X · WhatsApp · copy). Koi count, koi API
- ❌ **Newsletter** — reference me hai hi nahi

---

## Schema impact

| Collection      | Change                                                                     | Day-1 reserve?                    | Migration? |
| --------------- | -------------------------------------------------------------------------- | --------------------------------- | ---------- |
| `contentTypes`  | `post`: `taxonomyTypes ['category']`, `hasBuilder true`, `fields POST_FIELDS` | nahi — code-owned                 | **nahi**   |
| `contentTypes`  | naya type `blogPage`                                                        | nahi — code-owned                 | **nahi**   |
| `entries`       | `postList` block `content.blocks[]` ke andar                                | nahi — envelope FROZEN hai        | **nahi**   |
| `settings`      | `blogSettings{author{name,role,bio}, showToc, postSidebarId, postSidebar}`   | nahi — `.default({})` se bharta   | **nahi**   |
| `sidebars`      | `topics` · `postPicks` — do naye widget type                                | nahi — enum ka vistaar            | **nahi**   |
| `redirects`     | URL switch pe bulk 301 — **maujooda collection**, naya field koi nahi        | nahi                              | **nahi**   |

⚠️ **`post` se `tag` hatane ka orphan — faisla likha jaana zaroori hai** (`schema-change`
skill Step 2: _"orphan rakhna hai ya purge? DEFINE KARO."_). Jis post pe `taxonomies.tags[]`
bhari ho, uska agla edit D-49 ke gate pe **`422`** khaayega — yaani wo post **edit hi nahi
hoga**.

✅ **Verify ho chuka (9 Sep, asli DB):** `entries` me `type: 'post'` ka count **0** hai, aur
`taxonomies.tag` bhari hui bhi **0**. Isliye **purge nahi**, orphan hai hi nahi.
⚠️ Ye ginti se aaya hai, maan kar nahi — aur **har naye instance pe dobara ginna hoga**
(15 instance), kyunki wahan post ho sakte hain.

**Koi migration nahi lagti.** Teen wajah:

1. `ensureBuiltInContentTypes()` `fields` · `supports` · `taxonomyTypes` · `hasBuilder`
   **hamesha sync** karta hai, aur naye type ko **create** kar deta hai — yahi D-87 me hua
   tha. Deploy pe **`pnpm seed`** chahiye, `pnpm cms migrate` nahi
2. `blogSettings` `.default({})` pe hai — purani settings doc padhne pe apne aap bhar jaati hai
3. Widget ka naya type sirf tab DB me aata hai jab client use jodta hai

⚠️ **`updateSettings()` whitelist NAHI hai** — wo jaal `updatePackageDefaults()` pe hai.
`settings/service.js:153-160` ek generic loop hai, to naya field apne aap `$set` me chala
jaata hai. **Par settings ki apni teen jagah hain, aur wahan bhoolna waisa hi chup hai:**

1. `settingsSchema` (`schemas/settings.js`) — `updateSettingsSchema` `.partial()` se apne
   aap ban jaata hai, isliye ek hi jagah
2. `settings/model.js` — Mongoose `strict` **anjaan `$set` path chup-chaap gira deta hai**.
   Schema me field hai par model me nahi → API `200`, admin `"Saved."`, DB me kuch nahi
3. `toPublicSettings()` = `settingsSchema.parse(rest)` — yahan se chhoote to theme tak
   pahunchta hi nahi

Test phir bhi **response nahi, DB** padhega — bas wajah #2 hai, whitelist nahi.

⚠️ **`settings.postsPageEntryId` aur `postsPerPage` pehle se maujood hain**
(`schemas/settings.js:477-479`) aur wo lagbhag wahi do sawaal poochte hain jo `blogPage`
entry aur `postList.perPage` poochenge. **Is spec me dono use NAHI ho rahe**, aur wajah ye
hai: wo `frontPageType: 'posts'` ka hissa hain (homepage **khud** blog ho), jo scope me
nahi hai. ⚠️ Jis din wo feature banega, `postsPageEntryId` **isi `blogPage` entry** ko point
karega — do alag cheez nahi. Ye likha ja raha hai taaki ek hi cheez ke **chaar** naam na ban
jaayein (D-86).

**Indexes:**

```
Koi naya index nahi.

Prev/Next aur list dono maujooda index se chalte hain:
  { siteId: 1, type: 1, status: 1, publishAt: -1 }   ← migration 001
```

⚠️ **Kram `publishAt` ka hai, `createdAt` ka nahi.** `publishEntry()` publish pe
`publishAt: publishAt ?? new Date()` set karta hai (`service.js:1116`), yaani har published
post pe wo hamesha maujood hai. Wahi `datePublished` structured data me bhi jaayega — ek hi
tareekh, ek hi jagah.

---

## API

```
Naya endpoint koi nahi.
```

⚠️ Ye **jaan-boojh kar** hai aur D-83 ka seedha nateeja. Post ka poora payload aur listing
ke saare cards `GET /api/public/resolve?path=…` ke jawab me hi jaate hain, taaki `path:`
cache tag aur ISR dono muft milein. Alag endpoint banane ka matlab hota wahi bug dobara,
jisme chaar public call har page load pe API tak jaati thi.

**Badalne wale endpoints:**

```
GET    /api/entries?type=post              maujooda — koi badlaav nahi
POST   /api/entries                        maujooda — type=post/blogPage
PATCH  /api/settings                       + blogSettings
POST   /api/content-types/:key/url-pattern NAYA — URL switch ka action (neeche §)
GET    /api/public/resolve?path=…          payload me post/blogPage ki nayi branch
```

⚠️ **URL switch ka route `settings` module me nahi jaayega.** Wo `contentTypes` +
`entries` + `redirects` teenon likhta hai, yaani wo `content-types` module ka kaam hai —
aur wahan wo **generic** ban sakta hai:

```
POST /api/content-types/:key/url-pattern
```

Core route ke naam me `blog` gaadna wahi hardcoding hai jise R6 rokta hai. Blog settings ki
screen bas is route ko call karegi.

**Permissions:** koi nayi nahi. `entry.*` post pe pehle se lagti hain, `settings.update`
Blog settings pe, `taxonomy.*` Categories pe.

⚠️ URL switch **`settings.update` se nahi chalega** — wo har post ka `path` badalta hai.
Uspe `entry.update` **bhi** chahiye. (001-permissions.md me naya string nahi jud raha, sirf
ek route pe do permission.)

**Errors:**

| Code  | Kab                                                                                          |
| ----- | -------------------------------------------------------------------------------------------- |
| `400` | `urlStyle` enum se bahar                                                                       |
| `409` | **URL switch pe slug collision** — `bare` pe jaane se kisi post ka `path` kisi `page`/`tourPage` se takra raha hai. Response me takrane wale slugs ki list |

---

## Admin UI

### Nav (`apps/admin/src/lib/nav.js`)

```
Posts
├─ All Posts        /posts            entry.read
├─ Add New          /posts/new        entry.create
├─ Categories       /posts/categories taxonomy.read
├─ Blog Page        /blog-page        entry.read      ← naya
└─ ~~Tags~~                                            ← hata

Settings
└─ Blog settings    /settings/blog    settings.update  ← naya
```

⚠️ **Har link pe `permission` hona zaroori hai.** 8 Sep ko Pages ke links pe wo thi hi
nahi — menu sabko dikhta tha. `ROUTE_GUARDS` me wahi routes jaayenge jo sach me bane hain.

### Screens

| Screen           | Kaise banega                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| All Posts        | `EntriesList.jsx` — `TYPE_CONFIG` me ek row (`type` se chalti hai)        |
| Add New / Edit   | `PageEdit.jsx` — wahi, `POST_BLOCK_TYPES` ke saath                        |
| Categories       | `TaxonomyScreen` — `type="category"` prop pehle se leta hai               |
| Blog Page        | `EntriesList` + `PageEdit`, `type="blogPage"`                             |
| Blog settings    | `Settings ▸ Tour settings` ka hi joda                                     |

✅ **Saancha bacha hua hai** — `EntriesList.jsx` aur `PageEdit.jsx` dono `type` se chalte hain
aur `lib/use-entries.js` ke hooks kisi bhi type pe (D-87 Slice C ka bacha hua faayda).

⚠️ **Par "kuch likhna nahi padega" kehna zyada hoga.** `PageEdit.jsx` me `excerpt` aur
`category` ka **ek bhi zikr nahi** — wo `tourPage` ko chahiye hi nahi the. Post ko dono
chahiye, yaani **do naye panel**, `TYPE_CONFIG` se gated.

### Post ka editor

```
Title              (slug · breadcrumb · admin list · SEO · schema)
Featured image     hero ka banner + card ki image + og:image
Excerpt            card ka .bp__x aur meta description
Category           ek dropdown (Tags nahi)
Content            ＋ Add block… → Text (richText) · FAQs
SEO panel          maujooda
```

⚠️ **`fields.heading` post pe NAHI hai.** D-90 ne wo `tourPage` ke liye banaya tha
(`entry.title` ab `<h1>` nahi). Blog pe uski wajah nahi hai — article ka `<h1>` uska title
hi hai, aur reference me `.ahead__t` bilkul wahi text hai jo breadcrumb aur card pe hai.
Ek aur field ka matlab hota ek hi cheez do jagah (D-86).

---

## Ab har feature — kaise banega

### 1. `postList` block (blog-v1)

```js
heading, subheading, linkLabel, linkUrl   // packageList jaisa hi
featuredIds:  []      // max 3 — "Start here" ka 1 bada + 2 chhote
categoryId:   null    // list ek topic pe seemit (khaali = sab)
showFilter:   true    // .bfilter ki pills
perPage:      9       // .bpg me ek page pe kitne card
```

⚠️ **Source query hai, chunav nahi — aur ye `packageList` se jaan-boojh kar ulta hai.**
`packageList` me client har package haath se chunta hai (`packageIds[]`), aur D-87 §8 ne
saaf likha ki naya package apne aap kisi page pe **nahi** aayega. Package ke liye wo theek
tha (paanch hain, curated hain). **Blog pe wo galat hoga** — naya post publish karte hi
list me aana chahiye. Isliye `postList` saare published post query karta hai, `publishAt`
desc.

Sirf **featured teen** haath se chunte hain — wahi do-column picker jo `packageList` ke
liye bana hai.

⚠️ **Featured teen grid me dobara nahi aate.** Reference me bhi wahi hai: Start here ke
teen aur neeche ke nau, sab alag. Bina is niyam ke wahi card do jagah dikhega.

⚠️ **Cards yahan store nahi hote** — props batate hain kya chahiye, cards server pe
`resolve` ke payload me bante hain (`similar[]` aur `packageList` ki tarah).

### 2. Filter · Topics · pagination (blog-v1) — **poori tarah client-side**

Client ka faisla (9 Sep). Teenon ek hi state padhte hain:

1. Saare published post **ek hi baar** payload me
2. Pill **ya** sidebar Topic pe click → grid turant filter, aur **dono jagah** wo topic
   active. Do-tarfa sync isliye muft hai ki dono ek hi state ke do control hain
3. Filter ke baad bache cards `perPage` (9) ke page me bant jaate hain
4. `perPage` se kam bache → `.pager` **render hi nahi hota** (D-30)
5. `.bfilter__c` ki ginti (`9 articles`) filter ke **baad** ki hai

⚠️ **Facets `perPage` se pehle ginte hain, filter ke baad** — wahi niyam jo D-87 Slice B pe
hai (`2N / 3D [3]` jhootha ho jaata warna).

⚠️ **`POST_LIST_CAP = 60`.** Ye chhat jaan-boojh kar hai aur likhi ja rahi hai taaki baad me
dhoondhni na pade: is model me saare post payload me jaate hain. 60 tak ye theek hai
(~45 KB). Blog isse bada hone pe raasta URL wala hai (`?topic=&page=`), aur uski keemat
poore page ki ISR hai — `searchParams` Next 15 me route ko dynamic kar deta hai. **Aaj wo
keemat dene ki koi wajah nahi.**

### 3. Previous / Next (blog-detail)

Kram wahi jo list ka hai — `publishAt` desc. Post P ke liye **do query, dono indexed**:

```js
const visible = {
  siteId, locale, type: 'post', deletedAt: null,
  // R2 ka self-healing — scheduled jiska waqt aa chuka wo bhi published hai
  $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: now } }],
}

// Tie ka pehra query me hai, sirf text me nahi — compound cursor
prev = findOne({ ...visible, $or: [ { publishAt: { $lt: P.publishAt } },
                                    { publishAt: P.publishAt, _id: { $lt: P._id } } ] })
         .sort({ publishAt: -1, _id: -1 })

next = findOne({ ...visible, $or: [ { publishAt: { $gt: P.publishAt } },
                                    { publishAt: P.publishAt, _id: { $gt: P._id } } ] })
         .sort({ publishAt:  1, _id:  1 })
```

⚠️ Chaar cheezein is query me jaan-boojh kar hain: **`deletedAt: null`** (trash ka post chain
me nahi), **`locale`**, **scheduled ka self-healing** (`resolvePackageListBlock` bilkul yahi
karta hai) — aur `_id` ka compound cursor. Sirf `status: 'published'` maangne se ek
scheduled-ho-kar-nikal-chuka post chain se **gayab** ho jaayega.

⚠️ Do `$or` ek saath hain (`visible` ka aur cursor ka) — Mongo me wo `$and` me lapetne padte
hain, warna doosra pehle ko **chup-chaap overwrite** kar deta hai.

- **Previous = purana**, **Next = naya**
- Sabse naya post → `next` `null` → theme us taraf **kuch render nahi karti** (D-30)
- Sabse purana post → `prev` `null`
- Ek hi post ho → dono `null` → poora `.pn` gayab

⚠️ **Tie ka pehra zaroori hai.** Do post ka `publishAt` ek hi second pe ho (bulk publish) to
`$lt`/`$gt` dono ko chhod dega aur chain toot jaayegi. Tiebreak `_id` pe — tab kram **total**
rehta hai aur do post ke beech loop nahi banta.

⚠️ **Scan nahi hai** — `findOne` + sort + index, do document. `PACKAGE_LIST_SCAN_CAP` wali
problem yahan aati hi nahi.

⚠️ **Saare post pe, category ke andar nahi.** Wo padhne ki chain hai; same-category ka kaam
`Related reading` kar raha hai.

### 4. Related reading (blog-detail)

`resolveSimilarPackages()` ka hi model — **poori tarah derived, koi field nahi**:

```
same category · khud ko chhod kar · published · publishAt desc · limit 4
```

⚠️ **Us category me 2 hi post hain to 2 hi dikhenge.** Kisi aur category se bhar kar 4 nahi
kiye jaayenge — "Related reading" jo related na ho, wo chhoti list se bura hai (D-30).

⚠️ Reference me **3** card hain, client ne **4** kaha — client jeeta (R15). `.bpg` waise bhi
`auto-fit` hai.

### 5. Read time — **lagbhag muft, par ek badlaav lagega**

`readingMinutes(htmlToText(extractBlockText(blocks)))` `toPublicPage()` me pehle se chal
raha hai (`rich-html.js:203`) — 200 shabd/minute, minimum `1` (`0 min read` tooti cheez
jaisa dikhta hai). Use `toPostCards()` me bhi le jaana hai taaki har card pe `8 min read`
aaye, aur wahi ginti `BlogPosting.wordCount` me bhi jaati hai.

⚠️ **`extractBlockText()` `faqs` ka jawab nahi ginta.** `block.js:109-123` sirf **top-level
string props** padhta hai:

```js
for (const value of Object.values(node.props ?? {})) {
  if (typeof value === 'string' && value.trim()) out.push(value.trim())
}
```

`faqs.props.items[].answer` ek array ke **andar** hai — kabhi nahi ginta. Post ka aadha
content FAQ me ho sakta hai, to read time jhooth bolega.

⚠️ **Aur wahi function `entries.searchText` bharta hai** (`entries/service.js:152`) — MongoDB
ek collection pe sirf **ek** text index deta hai, isliye admin ki poori search usi pe khadi
hai. Yaani ye badlaav do cheezein theek karta hai (read time **aur** FAQ ka content search me
aana), par uska apna test chahiye — `searchText` ka behaviour badal raha hai.

### 6. `On this post` (TOC) — **heading se generate, Blog settings ke ek checkbox pe**

**Client ka faisla (9 Sep):** _"On this post to heading se generate hoga aur blog settings me
checkbox bana denge sabke liye ki show karna hai ya nahi."_

```js
blogSettings.showToc: boolean   // default true
```

- TOC post ke `<h2>` se **apne aap** banti hai — koi field, koi list nahi
- Ek hi checkbox **saare post** ke liye
- ⚠️ **Ye sidebar ka widget NAHI hai.** Theme use post ke sidebar me sabse upar khud
  render karti hai, uske neeche named sidebar ke widgets. Widget banane ka matlab hota do
  control (checkbox **aur** list me hona), aur do me se ek hi yaad rehta
- ⚠️ Checkbox on hone par bhi, jis post me **3 se kam `<h2>`** hain wahan TOC render **nahi**
  hoti — ek item ka TOC bekaar hai (D-30). Checkbox "dikhao" kehta hai, "zabardasti dikhao"
  nahi

⚠️ **Ye maine ulta suggest kiya tha aur client ne palta** — maine kaha tha koi checkbox na
ho (`showBadges`/`emitSchema` wala tark, 8 Sep). Client ne checkbox maanga, aur **R15 kehta
hai design/scope ka change client se aata hai, developer se nahi.** Ye likha ja raha hai
taaki koi baad me "ye toggle to hamare hi niyam ke khilaf hai" keh kar hata na de.

⚠️ **Heading ki `id` server pe banegi, editor me nahi.** TinyMCE se aayi `<h2>` pe id nahi
hoti. `toPublicPost()` **ek hi pass** me HTML ko id ke saath lautaayegi **aur** `toc[]` bhi —
dono ek jagah se, warna theme aur payload do alag slug banayenge (D-65 wala hi tark).
⚠️ Client se `id` likhwana **A-19 ke saamne** rakhna hai — wo `class` teen jagah kha chuka hai.

⚠️ D-88 ne TOC ko defer kiya tha aur wo sidebar schema ke sar pe likha hai — ab uski jagah
aa gayi.

### 7. Byline aur author — **sirf `blogSettings.author` se**

```js
blogSettings.author = { name, role, bio }
// "Andaman Tourism team" / "Planners in Port Blair" / authorbox ka paragraph
```

Aaj byline `doc.authorId → User.name` se banti hai, yaani **asli admin user ka naam**
(`arun`) chhap jaayega. Isliye:

- Public byline ka **ekmatra source** `blogSettings.author` hai
- `authorId` andar rehta hai — kisne likha, permissions, `entry.author` filter — par
  **page pe kabhi nahi jaata**
- Avatar ke `AT` initials **naam se derive** honge — koi field nahi

⚠️ Ise "fallback" banane ka matlab hota ek hi cheez ke do source, aur ek din wo alag ho
jaate — theek wahi shakl jo 9 Sep ko rating pe hui thi (card me naya, page pe purana `412`).

### 8. URL style — **checkbox nahi, ek confirm wala action. Aur koi naya field nahi.**

```
'prefixed'   // /blog/{slug}   ← aaj yahi hai
'bare'       // /{slug}
```

⚠️ **`settings.blogSettings.urlStyle` naam ka koi field NAHI banega.** Wo khud D-86 hota:
`urlStyle` aur `contentTypes.post.urlPattern` ek hi sach ke do stored naam, aur wo drift kar
sakte hain — koi `urlPattern` badal de aur `urlStyle` jhooth bolti rahe. **Ekmatra source
`contentTypes.post.urlPattern` hai;** screen use padh kar current haalat dikhati hai aur
toggle action ko call karti hai.

`urlPattern` contentType pe hai aur `ensureBuiltInContentTypes()` use **kabhi sync nahi
karta**; uske upar ye likha hai:

> _"Seed ko chupke se URL pattern badalne dena matlab ek deploy pe poori site ke link badal
> jaayein, bina kisi redirect ke."_

Isliye toggle dabane pe chaar kaam ek saath:

1. `contentTypes.post.urlPattern` badlo
2. Har post ka `path` `resolvePath()` se dobara nikalo
3. Har **purane** path pe **301** banao — `redirects` collection pehle se chain-flatten aur
   loop guard deti hai (D-49)
4. Har purana aur naya `path:` tag purge karo

Screen pe confirm ho: **"12 posts will move. 12 redirects will be created."**

⚠️ **`bare` pe collision ka asli khatra hai.** Index `siteId_type_slug_unique` hai — ek post
aur ek `tourPage` ka slug **aaj same ho sakta hai**. `/{slug}` pe jaate hi dono ka `path` ek
ho jaayega aur `siteId_locale_path_unique` phategi. Isliye: switch se **pehle** collision
ginno, aur mile to **`409` de kar switch mana kar do**, takrane wale slug naam le kar.
Chup-chaap `-2` lagana sabse bura — wo permanent URL me baith jaata hai. (D-86: guard ka na
chalna kabhi error nahi deta, wo sirf "kuch na hone" jaisa dikhta hai.)

⚠️ **Listing page ka slug is se nahi badalta** — wo apni entry hai, apna slug (`/blog`).
Yahi entry-based listing ka faayda hai.

### 9. Do naye sidebar widget

```js
SIDEBAR_WIDGET_TYPES = ['enquiryForm', 'talkToPlanner', 'html', 'topics', 'postPicks']
```

| Type        | Props                             | Data                                                    |
| ----------- | --------------------------------- | ------------------------------------------------------- |
| `topics`    | `heading`, `icon`                 | Categories + `usageCount` — service me pehle se hai      |
| `postPicks` | `heading`, `icon`, `postIds[]` ≤5 | Client khud chunta hai (`.pop` — "Most read")            |

⚠️ **`toc` widget nahi hai** — wo `blogSettings.showToc` pe hai (§6, client ka faisla).

✅ **Client ne `Blog Page` naam ki sidebar pehle se bana rakhi hai** (DB, 9 Sep —
`enquiryForm` + `html`). `postPicks` usi me judega; nayi sidebar banane ki zaroorat nahi.

⚠️ **Dono me se kisi me HTML nahi hai**, isliye `sanitizeSidebarWidgets()` me kuch jodna
nahi hai — par **check karke** likha ja raha hai, kyunki wo jaal do jagah likha hua hai
(`sanitize-html.js:427`) aur uska lakshan content ka **girna nahi, bina safai ke bach jaana**
hai.

⚠️ `postPicks` par `postIds` ki koi **guard nahi** — jo id resolve na ho (trash, unpublish)
wo chup-chaap gir jaati hai (D-79 ka precedent, D-42 §2 ka invariant).

### 10. Structured data

| Page          | `@graph`                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| blog-detail   | `BreadcrumbList` + `BlogPosting` + **saare `faqs` blocks milaa kar ek** `FAQPage` |
| blog-v1       | `BreadcrumbList` + `Blog` with `blogPost[]`                                       |

⚠️ **`TouristTrip`/`Product`/`AggregateRating` yahan kabhi nahi** — `Schema.jsx` poori tarah
package-shaped hai. Listing page pe wo bhejna "misleading structured data" hai (D-87 §11 ka
hi faisla).

⚠️ D-82 ka sabak: structured data **live chala kar** verify hoti hai. Teen galtiyaan us din
sirf live check pe hi mili thin.

---

## Jodne ke point — jahan "bana hua par juda nahi" hota hai

D-89 me 13 me se zyada tar farak isi shakl ke the, aur **sab ka lakshan ek hi tha: kuch na
hona.** Koi error nahi. Isliye har jodne ka point yahan naam le kar likha hai.

| # | Kahan                                                         | Kya jodna hai                                                                |
| - | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1 | `public/service.js` — `PAGE_TYPES = new Set(['page','tourPage'])` | `blogPage` isme. **`post` isme NAHI** — uski apni teesri branch (`toPublicPost()`). Aaj `post` `toPublicEntry()` pe girta hai, jo poori tarah package-shaped hai (`resolveSimilarPackages()` samet) |
| 2 | `public/service.js` — `resolvePageBlocks()`                    | `postList` ki branch. Aaj sirf `packageList` ko `data` milta hai, baaki `return block`      |
| 3 | `schemas/page.js` — `PAGE_BLOCK_PROP_SCHEMAS`                  | `postList: postListPropsSchema`. Us naksha ke upar likha hai: **"is naksha me naam na hone ka matlab hai koi validation nahi"** |
| 4 | `public/service.js` — `toPublicPost()`                          | `toc[]` **yahin** banti hai, `resolveSidebarWidgets()` me nahi. Ye jaan-boojh kar hai: us function ko entry ka koi context milta hi nahi, aur TOC widget hai bhi nahi (§6) |
| 5 | `apps/web/app/[[...slug]]/page.jsx`                            | Do nayi branch — `post` aur `blogPage`. Aaj dono aakhri fallback pe girte hain jahan **sirf `<h1>`** chhapta hai |
| 6 | `entries/service.js` — `tagsFor()`                              | Listing ka `path:` tag (§Cache impact)                                        |
| 7 | `admin/lib/nav.js` — `NAV` + `ROUTE_GUARDS`                     | Naye link. ⚠️ **Aaj `posts` group aur uske chaaron link pe `permission` hai hi nahi** — menu sabko dikhta hai. 8 Sep ko ye Pages pe theek hua tha; **zinda instance Posts par hai**, theek wahi jagah jise ye kaam chhoo raha hai |

⚠️ **Naya widget type ek enum ki line nahi, chhe file hai:**
`schemas/sidebar.js` (enum + `SIDEBAR_WIDGET_LABEL` + union) · `sidebars/model.js` ·
`public/service.js` ka switch · `admin/…/SidebarWidgets.jsx` · `web/components/…/Sidebar.jsx`.
⚠️ Us switch me `default: return null` hai — **anjaan type chup-chaap gir jaata hai**, koi
error nahi.

⚠️ **`postList` "sirf `blogPage` pe" — ye sirf UI-level hai.** Server pe per-type block
allowlist hai hi nahi (`PageBlocks.jsx` ka `types` prop hi rok hai). Ye theek hai aur
`packageList` pe pehle se aisa hi hai — par likha ja raha hai taaki koi baad me server guard
na dhoondhe.

---

## Cache impact

Naya tag koi nahi — par ek **naya consumer** chahiye.

### ⚠️ Yahan ek asli chhed hai — naya post listing pe apne aap nahi aayega

API `type:post` **pehle se bhejti hai** (`entries/service.js:699-728`, `tagsFor()`). Par web
side use **koi padhta hi nahi**:

```js
// apps/web/lib/cms.js:96
const data = await getJson(`/public/resolve?path=...`, [`path:${path}`])
```

Blog listing bhi `resolvePath()` se hi aati hai, yaani uska cache `path:/blog` pe tagged hai.
Naya post publish → `path:{naya-post}` + `type:post` purge → **`/blog` ka cache waisa ka
waisa**, poore `CACHE_SECONDS` tak.

⚠️ Ye theek wahi shakl hai jo **D-83** ki thi — revalidate ka poora dhaancha khada tha aur
ek din chala nahi. Aur `postList` **query se** chalta hai (§1), yaani blog ka poora point
"publish karo, turant dikhe" isi par tika hai.

**Ilaaj — ✅ Slice B me ban gaya** (`entries/service.js`, `blogListingTags()`): `invalidate()`
ab `post` pe un `blogPage` entries ke **`path:` tag bhi** bhejta hai jinke `content.blocks[]`
me `postList` hai. Ek query, poori tarah generic, koi hardcoded `/blog` nahi — aur maujooda
`path:` consumer hi chal jaata hai. Yahi `tagsFor()` ke apne comment ka niyam hai: tag wahan
se lo jahan **fetch sach me hota hai**. Baaki har type pe wo bina Mongo chhue lauta jaata hai.

⚠️ **Ye abhi sirf unit level pe sach hai.** Asli pehra `next build` + `next start` pe hai —
dev server pe ye test hamesha pass karega chahe tag juda ho ya nahi. Wo Slice D me hoga, jab
theme banegi (D-83 bilkul aise hi teen din chhupa raha tha).

⚠️ `resolvePath()` me `type:post` seedha jod dena **ilaaj nahi** — wo fetch har URL pe chalti
hai (fetch se pehle type pata hi nahi hota), to ek post publish poori site ka cache uda dega.

**Baaki dependency map:**

| Kaam                             | Purge                                            |
| -------------------------------- | ------------------------------------------------ |
| Post publish / unpublish / edit  | `path:{path}` + **purana path** + `type:post` + **listing ka `path:`** |
| Category rename                  | `tax:{id}` + `type:post`                         |
| Blog Page edit                   | `path:{path}` + `type:blogPage`                  |
| Blog settings save               | `settings`                                       |
| Sidebar edit                     | jo pehle se D-88 pe hai                           |
| **URL switch**                   | **har post ka purana + naya `path:`** + listing ka `path:` |

⚠️ D-83 ka pehra: `fetch` pe `{ next: { tags } }` **akela kuch cache nahi karta** — Next 15 me
default `no-store` hai.

---

## Acceptance criteria

**Content model**

- [ ] `pnpm seed` ke baad `post.taxonomyTypes` sirf `['category']` hai, `hasBuilder` `true`,
      aur `fields` khaali nahi
- [ ] `pnpm seed` `blogPage` type **create** kar deta hai, aur dobara chalane pe `up-to-date`
      kehta hai (idempotent)
- [ ] Post pe `tag` taxonomy set karne ki koshish **`422`** deti hai (D-49 ka gate —
      `entries/service.js:352` `unprocessable()` phenkta hai, `400` nahi)
- [ ] `entries.test.js:913` update ho gaya — wo aaj `taxonomyTypes` `['category','tag']`
      assert karta hai aur is badlaav se **toot jaayega**
- [ ] `Add block…` post pe **sirf** `Text` aur `FAQs` dikhata hai
- [ ] `blogSettings` save karne ke baad **DB padh kar** value milti hai (response nahi —
      `$set` whitelist ka jaal)

**Public payload — post**

- [ ] `byline.author` `blogSettings.author.name` se aata hai, `authorId` se **nahi** —
      admin user ka naam badal kar verify
- [ ] `authorId`, email, username payload me **kahin nahi** (R10)
- [ ] Sabse naye post pe `next` `null`, sabse purane pe `prev` `null`
- [ ] Ek hi published post ho to `prev` aur `next` dono `null`
- [ ] Do post ka `publishAt` ek hi ho to chain phir bhi total hai — `A → B` aur `B → A`
      dono nahi hote
- [ ] `related[]` me sirf usi category ke post, khud ko chhod kar, **max 4**
- [ ] Category me 2 post hon to `related` me **2** aate hain, 4 nahi
- [ ] `toc[]` sirf tab bharta hai jab `<h2>` **3 ya zyada** hain **aur** `showToc` on hai
- [ ] `showToc` off karne pe `toc[]` khaali aata hai — theme me chhupaya nahi jaata
- [ ] `toc[].id` aur body ki `<h2 id>` **bilkul** match karte hain
- [ ] `readMinutes` `faqs` block ke text ko bhi ginta hai, sirf `richText` ko nahi
      (⚠️ `extractBlockText()` badalna padega — aaj ye **fail** karta hai)
- [ ] `searchText` bhi FAQ ka jawab rakhta hai, aur admin search usse post dhoondh leti hai
      (usi badlaav ka doosra sira)
- [ ] `post` `toPublicPost()` se aata hai — payload me `similar`, `pricing`, `itinerary`
      jaisi ek bhi package-shaped key **nahi** hai

**Public payload — blog listing**

- [ ] `postList.data.cards` me **saare** published post hain (`POST_LIST_CAP` tak),
      `publishAt` desc
- [ ] `featuredIds` ke teen post `cards[]` me **nahi** hain
- [ ] Naya post publish karne pe wo listing me **apne aap** aata hai (koi block edit nahi)
- [ ] ⚠️ **Aur wo `next build` + `next start` pe bhi dikhta hai** — yaani listing ka cache
      sach me purge hua. Ye sabse zaroori assertion hai: dev server pe ye hamesha pass
      karega chahe tag juda ho ya nahi (D-83 bilkul aise hi teen din chhupa raha)
- [ ] Trash me daala post na `cards` me hai, na `featured` me, na `postPicks` me
- [ ] `facets` filter ke baad ki ginti dete hain, `perPage` se pehle
- [ ] `categoryId` set ho to sirf us category ke post aate hain

**Theme — blog-detail**

- [ ] `/blog/<slug>` `200` deta hai aur `.art` render karta hai (aaj sirf `<h1>` chhapta hai)
- [ ] Sabse naye post pe `.pn` me **sirf** Previous ka link hai
- [ ] `<3` heading wale post pe `On this post` widget **render hi nahi hota**
- [ ] TOC ke link pe click karne pe page usi heading pe jaata hai
- [ ] JSON-LD me **ek** `FAQPage` hai (saare `faqs` block milaa kar), aur koi `TouristTrip`
      **nahi**
- [ ] Client ke likhe `<table>` pe `.tblw` wrapper apne aap lagta hai (`wrapTables()`, D-90)

**Theme — blog-v1**

- [ ] Pill pe click → grid filter hota hai **aur** sidebar me wahi topic active
- [ ] Sidebar Topic pe click → grid filter hota hai **aur** wahi pill active
- [ ] Filter ke baad `perPage` se kam card bachein to `.pager` **gayab** hota hai
- [ ] `.bfilter__c` ki ginti filter ke **baad** ki hai
- [ ] `Start here` me theek **teen** card hain (1 bada + 2 chhote)
- [ ] `.btopics` aur `.vhero__eye` page pe **hain hi nahi**

**URL switch**

- [ ] `bare` pe switch ke baad har post ka `path` `/{slug}` hai
- [ ] Har purane `/blog/{slug}` pe **301** milta hai naye path pe
- [ ] Slug collision hone pe switch **`409`** deta hai aur **kuch nahi badalta** —
      na `urlPattern`, na koi `path`
- [ ] Blog Page ka apna slug switch se **nahi** badalta

**Tests**

- [ ] Integration — `blog.test.js`: prev/next ke chaar edge case, related ka cap,
      toc ka `<3` guard, listing ka featured-exclusion, URL switch ka collision `409`
- [ ] Unit — `postList` props schema, `toc` slug builder
- [ ] ⚠️ Test me login rate limit ka dhyaan — global limiter test me band hai (`isTest`),
      **auth ka apna limiter chalta rehta hai**

**Docs**

- [ ] `02-ARCHITECTURE.md` §3 — `blogSettings`, `blogPage`, teen widget
- [ ] `03-DECISIONS.md` — naya `D-91`
- [ ] `04-ADMIN-UX.md` — Posts ka nav, Blog settings ki screen
- [ ] `09-OPEN-ITEMS.md` — **A-9 ka `post` wala aadha band**, `page` wala khula rahega
- [ ] `CLAUDE.md` — status line

---

## Open questions

- **Q-B1 — `blogPage` ek hi hoga ya kai?** Client ne _"ek submenu me single page"_ kaha. Spec
  use aam list ki tarah rakhta hai (jaise `tourPage`), yaani usme aam taur pe **ek hi row**
  hogi par doosra banaya ja sakta hai. Ye jaan-boojh kar hai — topic-wise landing page (§Scope
  me kya NAHI hai) isi se banta hai. **Client confirm kare.**
- **Q-B1 ka abhi tak ka sach:** client ne **ek hi** `blogPage` banaya hai (`Andaman Travel
  Guide`, slug `blog`). Screen aam list hi hai, to doosra banane ka raasta khula hai — par abhi
  uski zaroorat padi nahi. Sawaal khula hai, plan nahi rok raha.
- **Q-B2 — `postPicks` ka heading kya default ho?** Reference me `Most read` hai, par data
  hand-picked hai. `Editor's picks` zyada sach hoga. **Client ka faisla** (R15) — wo heading
  waise bhi field hai.
### ✅ Q-B3 — post ka sidebar: **`blogSettings` me ek baar** (client ne confirm kiya, 10 Sep)

Client ne **do alag sidebar** banayin — `Main Blog` (topics · postPicks · enquiryForm) listing
ke liye, aur `Blog detail Page` (enquiryForm · postPicks) post ke liye. Yaani raasta A hi sahi
tha: post ki sidebar `blogSettings.postSidebarId` se aati hai, aur listing page apni `fields` se
apni chunta hai.

`post.fields` aaj **khaali** hai (`content-types.js:436`) — na `sidebar`, na `sidebarId`.
Iske bina `topics` · `postPicks` · `Sidebar` ka koi source hi nahi.

**Spec ne raasta A liya hai:**

```js
blogSettings.postSidebarId    // kaunsi — client ki maujooda "Blog Page" sidebar
blogSettings.postSidebar      // none | left | right
```

Wajah: client ne TOC ke liye bhi _"sabke liye"_ kaha, aur unke paas **ek hi** `Blog Page`
sidebar hai (DB, 9 Sep). Har post pe do field bharwana bojh hai, aur ek baar bhoolne pe us
post pe sidebar chup-chaap gayab (D-42 §2).

⚠️ **`blogPage` par ye laagu nahi** — wo `page`/`tourPage` jaisa hai, uske paas apne
`fields.sidebar` + `fields.sidebarId` rahenge. Yaani client chahe to listing aur post pe
**alag** sidebar rakh sakta hai (reference me waise hi hai — listing pe `Topics`, detail pe
`On this post`), ya dono pe wahi ek.

**Client sirf itna confirm kare:** post ka sidebar ek hi rahega na, ya kisi post pe alag
chahiye hoga?

---

## Rejected alternatives

**`post` ko `tourPage` ke paanchon block dena.** Kisi ne maanga nahi, aur `packageList` ek
blog post pe bemaani hai. 8 Sep ka sabak: **scope ek faisle se nahi badhta.**

**Listing ko `tourPage` me daal dena** (naya type na banana). Sasta lagta, par client ko blog
index `Tour Pages` ke andar dhoondhna padta. D-87 §1 ne `tourPage` ko `page` se alag isliye
kiya tha ki **menu, list aur URL teenon alag** maange gaye the — yahan bhi wahi teen alag hain.

**`hasArchive`/`archiveBase` ko sach me implement karna** (magic `/blog` route). Wo do field
aaj **kisi ne padhe hi nahi hain**, aur packages ka listing bhi ek entry hi hai. Magic route ka
matlab hota ki client us page ka heading, hero, sidebar aur SEO kuch bhi na badal sake — aur
phir uske liye ek alag settings screen banti. Entry rakhne se `path:` tag, ISR, redirects,
breadcrumb aur SEO **sab muft** mil jaate hain.

**Server-side filter + pagination (`?topic=&page=`).** Crawlable aur hamesha scale karta,
par `searchParams` Next 15 me route ko **dynamic** kar deta hai — poore page ki ISR chali
jaati, jo D-83 me abhi-abhi theek hui hai. Aur do-tarfa sync har click pe ek reload ban
jaata. **`POST_LIST_CAP = 60` paar hone par ye wapas khulega.**

**Alag public endpoint `GET /api/public/posts`.** ⚠️ **Pehli wajah jo maine likhi thi wo
galat thi** — "`path:` tag aur ISR chale jaate" sach nahi hai: har `getJson()` call ka apna
cache entry aur apne tags hote hain, aur `getPackageDefaults()` theek yahi karta hai
(`cms.js:104` — `type:package` pe cache). **Asli wajah do hain:** ek aur round trip har page
load pe (wahi jise D-83 ne chaar se ek kiya), aur `postList` block ke props (featured,
category, perPage) server pe pehle se maujood hain — unhe query string me dobara bhejna ek
hi cheez ke do naam banata.

⚠️ Par ye raasta **band nahi hai**: agar cache ka ilaaj (§Cache impact) mushkil nikla, to
listing ke liye ek alag tagged fetch (`type:post`) bilkul chal sakti hai — wahi shakl jo
`getPackageDefaults()` ki hai.

**Asli view counting ("Most read").** Har page view pe ek write; ISR aur caching dono todta
hai, bot filtering aur rate limit chahiye. Ek decorative widget ke liye ye keemat bahut
zyada hai. Client 5 post khud chun leta hai.

**Per-post author.** Do source ka matlab ek din wo alag ho jaate — 9 Sep ko rating pe theek
yahi hua tha (`toPackageCards()` badla, `PackagePage.jsx` chhoot gaya, client ne kaha _"card
me updated hai, page pe purana 412 aa raha hai"_).

**~~TOC ka checkbox Blog settings me.~~** — ⚠️ **Client ne 9 Sep ko ye palat diya.** Maine
`showBadges`/`emitSchema` wale tark pe checkbox mana kiya tha; client ne kaha _"blog settings
me checkbox bana denge sabke liye"_. **R15: change client se aata hai, developer se nahi.**
Ab wo `blogSettings.showToc` hai (§6). Iske badle `toc` **sidebar widget** wala raasta
chhoda gaya — wo do control bana deta (checkbox aur list me hona).

**`fields.heading` post pe.** D-90 ne wo `tourPage` ke liye banaya tha kyunki wahan `<h1>`
aur breadcrumb ka text alag chahiye tha. Blog pe wo ek hi hai — dusra field ek hi cheez ke
do naam bana deta (D-86).

---

## §11 — Bulk Upload for blog (10 Sep, D-92)

Client ki team article Google Docs me likhti hai. D-81 wala Bulk Upload ab `target` se post bhi
banata hai — **ek hi module, ek hi screen, ek dropdown**.

### Doc ka contract

| Label | Jaata hai | Na mile to |
| --- | --- | --- |
| `Blog title` | `title` | **Failed** |
| `Blog URL` | `slug` | **Draft** (D-86 ka niyam) |
| `Blog heading` | `fields.heading` | theme `title` pe girti hai |
| `Meta Title` / `Meta Description` | `seo{}` | khaali |
| `Excerpt` | `excerpt` | khaali |
| `Category` | `taxonomies.categories` | **Draft** |
| `Banner Image URL` | `featuredImageId` | note |
| `Content` | `richText` block | **Draft** |
| `Faq:` → `Heading` / `Question` / `answer` | `faqs` block | — |

### Content me design kaise aata hai

Apne aap: `h2`/`h3`, pehla paragraph (`.lead`), table (pehli row hamesha header), image (Media
library me utar kar), bullet aur numbered list, bold/italic, link.

Nishaan se: `Note:` → `.callout`, `Warning:` → `.callout--w`, `Quote:` → `.pullq`, aur image ke turant neeche `Caption:` → `figure.artfig` ka
`figcaption` (D-92 §10). Title ke liye
writer ka apna bold.

Team ka guide: [Blog post guide v2](https://docs.google.com/document/d/1h7yYppW8LhrztmI92zOKchkIQnuYL2qAW5JWvYBulYI/edit)

### Live check (10 Sep, asli DB + asli sheet)

Poora `/how-to-plan-an-andaman-trip` ka article doc me daal kar chalaya:

- content 7,577 chars · 7 `h2` · 2 table (`thead` + 6 `th`) · 1 `ul` · 2 `ol` · 1 `a` · 1 `img`
- link ka Google redirect unwrap · koi `data:` URI nahi · koi `&mdash;` nahi
- dobara chalane pe **0 naye post, 0 naye media**
- payload: `toc` 8 item, `readMinutes` 6, FAQ heading
- `existing` mode me naye slug pe saaf **Failed** — D-86 ka assertion asli data pe chala

⚠️ Poore faisle aur unke saath pakde gaye chhe bug **D-92** me.
