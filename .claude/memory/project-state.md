# Project State

> Har session ke shuru me padho, aur session ke end me update karo.
> **Last updated:** 15 Sep 2026 (shaam) — **~302 commit**, **push ho gaya** (client ki ijaazat se, 15 Sep).
> **1139 test pass (DB ke saath)**, lint + format clean, admin build pass.
> ⚠️ Kitne commit push hone baaki hain ye **`git log --oneline origin/main..HEAD`** batata hai —
> yahan likha number handoff ke waqt ka hai aur har commit ke saath purana ho jaata hai.

---

## ⏭️ Nayi session yahan se shuru kare — **Home page: Section 1–11 ban gaye, agla section client batayega** (15 Sep)

> 15 Sep shaam ka handoff. Aakhri kaam **Section 10 — Text with video** aur **Section 11 — Award badges**
> (`e34fe14`, D-96 §22–§23), phir client ka CSS hand-edit (`.awb__b { gap: inherit }`) alag commit me.
> **Sab push ho chuka** (`origin/main`). Section list neeche "Usi din baad me" me, har faisla D-96 §1–§23 me.
>
> **Agli session ka pehla kaam:**
>
> 1. Client se poochho — agla home section kaunsa (reference `home-nav-v3.html` ka number/naam)
> 2. Code se pehle **dhaancha dikhao + sawaal poochho** (niyam #5), haan ke baad banao
> 3. Home khatam hone ke **baad** (client ne kaha: _"pahle home page build ho jaye fir karte hai"_): A-29 + A-26
>    (cache bug, dono ek ilaaj), A-27, A-18, aur docs ki safai (09-OPEN-ITEMS ke purane header/"Ab ka order",
>    A-9/A-21/A-22 ko resolved me le jaana)
>
> ⚠️ Client ka asli home DB me hai (17+ section) — **test ke liye use mat chhedo**. Render sample data se
> scratchpad me dekho (esbuild + `renderToStaticMarkup`, `NODE_PATH=apps/web/node_modules`, `--format=cjs`).
> ⚠️ Browser me aankh se dekhna baaki — A-28 (#16–#18 naye). ⚠️ CI abhi bhi red aayegi — A-12 (env ki wajah).

### Is session ke niyam (client ke) — har naye section pe lagu

1. **Font:** sirf **body font aur heading font** hamare tay kiye hue; baaki sab (size, weight, spacing,
   text-transform, rang) **reference design jaisa**. Section heading = `var(--fs-h2)` (`.hsh h2`), description
   = body font. Reference ke `.5px` round karo — 15.5 → 16, 14.5 → 14. Design me uppercase nahi to hum bhi nahi
2. **Multi-site CMS:** core me Andaman-specific label/preset/default **nahi** ("Start from" presets isi wajah se hate, §15)
3. **Customizer ki taiyaari:** naya rang/font seedha CSS me nahi — `:root` tokens (`--fs-*`, `--fw-*`, rang) pe (§18, A-30)
4. **Reference se markup/setting padh kar banao**, andaaza nahi. Detail na ho to poochho; jo section maanga nahi, mat banao
5. **Pehle dhaancha batao, phir code** — client "do not write code" bole to sirf jaanch + options
6. Har section pe: **background colour** (`SectionBackground`), heading/description/align (`SectionHeadingFields`),
   list ho to **drag se kram** (`useListDrag`), optional heading-link (`linkLabel`/`linkUrl`)
7. CSS prefix block ka apna (`.hf-`, `.ic`, `.imc`, `.vrl`, `.tmg`, `.lgg`, `.ipk`, `.ofc`) — reference ki class seedhi mat lo
8. Admin UI text English; client se baat Hinglish, headings file ke exact English shabd
9. Commit se pehle `git status` — client ke hand-edit (CSS tune) alag commit me, palatna nahi. **Push kabhi bina ijaazat nahi**
10. Migration ho to `pnpm format` pehle, `pnpm cms migrate` baad (D-82)

### Kaam ka tareeka (tooling)

- Windows git-bash me heredoc/`node -e` ki quoting tootti hai → badi edits ke liye scratchpad me `.cjs` script
  likh kar chalao; replacement already ho to skip (idempotent)
- Har section ke baad: `pnpm lint`, `home-page.test.js` + shared tests, web `/` aur admin 200, docs (D-96 §N,
  02-ARCHITECTURE, 04-ADMIN-UX, 09-OPEN-ITEMS A-28 row, ye file), `pnpm format:check`, local commit

Poora hisaab **D-96**. Reference `.claude/docs/reference/home-nav-v3.html` (repo me pehle se tha).

**Client ka tareeka:** poora page ek saath nahi — **section by section**, jaise detail aaye. Reference
ke number kram nahi hain; kram admin me drag se. Har section pe **background colour picker**.
⚠️ Jo section maanga nahi gaya use pehle se mat banao. Eyebrow chip **abhi tay nahi**.

### Kya bana

| Kahan  | Kya                                                                                                                                                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shared | `homePage` type (`urlPattern: '/'`), `hasFixedPath()`, `HOME_PAGE_BLOCK_TYPES`, `heroFormPropsSchema`, `sectionBackgroundSchema` (hex), `forms.submitLabel`                                                                                  |
| api    | tay path pe 409 (ek hi home), home trash nahi (422), `sanitizeContent` me `heroForm`, `toPublicHome()` + `resolveHomeSection()`, `pathTagsForForm()` (form badle → uske pages ka cache)                                                      |
| admin  | **Pages ▸ Home Page** (`/pages/home`, `HomePageEdit` → `PageEdit type="homePage"`), `Hero with form` editor (bg picker · 2 image · title · description · 4 stats · form · ribbon · heading · description), Enquiry Forms me **Button label** |
| web    | `components/home/HomePage.jsx` + `HeroForm.jsx`, `EnquiryForm variant="hero"` (`.hf-card`, popup nahi, taale wala note), `Img` ka `mobile` prop (`<picture>`), `.hf-*` CSS                                                                   |

**Tests:** naya `home-page.test.js` (13, asli DB) + shared (5). `entries.test.js` me built-in types ki
ginti 5 → 6. Poori suite: 1106 pass + 4 fail wale run ke baad teen asli fix hue, `users.test` A-11
flake nikla (akele pass). Lint · format · admin build pass.

### Live (15 Sep, asli DB)

- `pnpm seed` chala — `homePage` type **ban chuka** hai. API `--watch` pe naye code pe
- Ek temp home banaya → API payload me ids nahi, stats filter, form resolve · web `/` pe saari `.hf-*`
  classes, `--hf-bg`, `<em>` wala h1, taale ka note → **hataya**, `path:/` revalidate. `/` wapas 404
- ✅ **Client usi waqt admin me tha** — "Home Page" naam ka form bana kar **Button label `Send me a quote →`**
  save kiya (DB me dikha). Yaani naya field live chal raha hai
- ⚠️ Browser me aankh se **nahi** dekha (desktop/mobile layout, 1040px, rang ka parda) — **A-28**

### Usi din baad me

- Hero design se milaya — **sirf heading aur body ka font hamara**, baaki design ke naap (D-96 §8, §10)
- All Pages ke upar Home Page ki row; Enquiry Forms me fields drag se (§9)
- **Section 2 — Info cards** (§11): Achievements/Certified by/Why us/Popular articles ek section, "Start from"
  presets, icon list + upload, label, optional link, chhota editor. 16 home test. Render aankh se nahi dekha (A-28 #7)
- Info cards: description body font, title 16px (§11 amendment)
- **Section 3 — FAQ** (§12): wahi `faqs` block, home pe background + ek-hi-khula accordion, `SectionHead.jsx`
  saanjha, `TourSchema` se FAQPage. 19 home test (A-28 #8)
- FAQ Section alignment (centre/left)
- **Section 5 — Customer reviews** (§13): nayi `videoReviews` collection (migration 025, local pe chali),
  Reviews screen me Text/Video tabs, section me picker + drag, YouTube/Vimeo popup. Text reviews ka cache
  tag bhi ab jaata hai. A-29 (hotels/add-ons/transfers ka cache)
- ⚠️ Deploy pe: `pnpm format` → `pnpm cms migrate` (025) → API restart
- **Media upload bug** (Library/picker: "Upload file is required") — axios JSON header, `lib/api.js` interceptor
- **"Start from" presets hate** (§15) — naam Andaman ke the, CMS har client ka
- **Section 6 — Testimonials** (§16): text reviews se, picker (`ListPicker` saanjha), quote icon ka rang, initials,
  4 column fixed. Koi migration nahi
- Home section heading `--fs-h2` + line body font (pehle galti se `.sh` ke saath grouped the)
- Rang/font tokens pe (§18) — customizer ki taiyaari, A-30
- **Section 8 — Package grid** (§19): saare published apne aap (16), saare type badge, pills; Tour page ka Package Type
  filter bug aur package badalne pe listing cache — dono band
- Package Type pe badge ka rang (§20)
- **Section 9 — Offer cards** (§21): sightseeing/activities/ferries/category strip — ek static section, 24 card,
  image-top ya background, slider/grid
- **Section 10 — Text with video** (§22): reference ka About us + Our story video. Points ≤6 (icon/upload),
  button, image side Right/Left, video link khaali = saada image, YouTube/Vimeo popup. Popup `VideoModal.jsx` me
  nikla (Customer reviews bhi wahi). Client ke teen jawab D-96 §22 me
- **Section 11 — Award badges** (§23): static gole (bada + chhota text), ek badge colour (default sunehra),
  har badge pe optional image. 37 home test. Koi migration nahi (A-28 #16–#18)
- **16 Sep — client ke teen fix** (§24): hero pe **Eyebrow** ka khaana (`.vhero__eye` look, chip nahi),
  About us ka box **bina radius/shadow** aur image **bina crop** (reference ki likhi CSS uske inline `<a>` pe
  chalti hi nahi — usse **chala kar** dekhna zaroori tha), aur islands ka tag chhoti line ke **saath ek line me**.
  ⚠️ Is machine pe **C: bhar gayi thi** — poori suite `ENOSPC` pe girti hai; aaj ke hisse ke 309 test pass
- **16 Sep — Tour ka `Read more:`** (§26): content me nishaan likho, uske aage ka sab collapse —
  `<details>`, koi JS/field/checkbox nahi. Sirf Tour/Package ke Text block pe
- **16 Sep — Custom editor + Custom CSS** (§25): naya `customHtml` block (**home aur Tour dono pe**), aur
  `Settings ▸ Custom CSS` (`settings.customCss`) jo **har page** ke `<head>` me jaati hai (client ka faisla).
  Block me `<style>` likha hi nahi ja sakta — sanitizer use girata hai, isliye CSS ka ghar settings hai
- **Section 7 — Logo grid** (§17): image + optional heading, 6/4/3 column, optional closing line (mera chunav)
- **Section 4 — Image cards** (§14): islands/beaches/places ek section, shape/columns/alignment, subtitle + tag
  optional (mera chunav, client dekhega). Client lunch ke baad data bharega (A-28 #10–#11)

### Agla kadam

1. Client home page khud banaye (Pages ▸ Home Page) aur dekhe — A-28 ki list
2. Agla section client batayega. Naya section = **chaar jagah server** (`HOME_PAGE_BLOCK_TYPES` + props
   schema, `sanitizeContent()`, `resolveHomeSection()`) + admin editor (`PageBlocks` me `EDITORS` +
   `emptyBlock` + label/class + **`SectionBackground`**) + theme (`HomePage.jsx` ka `SECTIONS` + file + `.xx-*` CSS)
3. Reference ki class names seedha mat lo — `.art`/`.faq`/`.sec`/`.b` hamari site pe takraate hain
4. Naye open items: **A-26** (sidebar ka cache ek ghanta — purana bug), **A-27** (`style.background` future XSS)

⚠️ Push nahi hua — client ki ijaazat se hi.

---

## (purana) Nayi session yahan se shuru kare — **Home page build** (client, 14 Sep raat)

Client agli session me **home page** banana chahta hai. Abhi `/` **404** deta hai — koi home entry nahi
hai (A-17 me likha hai). Shuru karne se pehle:

1. **Client se reference file** maango (jaise `page-template-text.html` / `blog-v1.html` aayi thi) aur
   `.claude/docs/reference/` me rakho. Reference dekhe bina markup mat maano — ye galti D-89 · D-91 me
   teen baar hui
2. **Maujooda raasta:** `settings.frontPageType` + `settings.homepageEntryId` schema me **pehle se hain**
   (D-40), par unka koi screen/resolve nahi bana. `apps/web/app/[[...slug]]/page.jsx` `/` ke liye
   `resolvePath('/')` karta hai. Yaani faisla ye hai: home ek `page` entry ho (Settings se chuni) ya
   apna type (`homePage`, jaise `tourPage`/`blogPage`) — **client se poochho**, apne se mat chuno
3. Tour page (D-87) ka blocks wala saancha sabse kareeb hai — `PageEdit.jsx` `TYPE_CONFIG` row +
   `Blocks.jsx` + `toPublicPage()`. Naya block chahiye to `schemas/page.js` + `sanitizeContent()` +
   admin `PageBlocks.jsx` + theme `Blocks.jsx` — **chaaron** (CLAUDE.md ki chetavni)

### 15 Sep subah — Pages ke khule sawaal band

- Client ne Pages ka sab kuch **live dekh liya**; FAQ editor ka `<p>` — _"sab thik hai"_; header flyout
  1280px pe — theek. **A-25** aaj ki haalat pe dobara likha (sirf do chhoti baatein baaki)
- **Post edit ki Featured image** — galat hint (_"Settings wali universal image aayegi"_, post pe fallback
  hai hi nahi) hata; box me ab sirf "No file selected". `MediaDrop` hint na ho to ek hi line dikhata hai
- Live check payload se: API naye code pe, `pageSettings` DB me save. ⚠️ Web (3000) band tha — browser
  wala TOC/popup test pehle nahi chala — web chalu hone pe chala, dono pass (A-25)

### Is session (14 Sep) ka bacha hua

- **`pnpm test` DB ke saath 1092/1092 pass** (Docker chalu tha). A-11 wala `media.test.js` kabhi-kabhi
  parallel load me girta hai — akele 3/3 pass
- Live pe dekhne ke liye: `pnpm seed` (page field set sync) → **API restart** (`pageSettings` naya) →
  admin me **Pages ▸ Pages settings** me banner + On this page set karo
- Client ke doc (`1AtY5YIu…`) se **`On this page: Yes` wali line hata do** — ab note deti hai. Fixture
  (`page-template.html`) me wo line hai aur tests usi note ko expect karte hain; doc badalne se fixture
  nahi badalta (wo repo me ek copy hai). Fixture dobara lena ho to tests ke "On this page ka note" wale
  expect bhi hatane honge
- Commit 14 Sep raat: do commit — mera kaam, aur client ka `PageBlocks.jsx` hint hataana (alag)
- ⚠️ `origin/main..HEAD` me 3+ commit hain — **push nahi hua**, client ki ijaazat se hi

---

## ⏭️ (purana) Nayi session yahan se shuru kare (15 Sep)

### Pehle ye teen (is kram me)

1. **Docker Desktop chalu karo** → `pnpm test`. `bulk-imports.test.js` ka `page ka import` describe (11
   test) aur 14 Sep ke naye entries tests ek baar bhi DB pe nahi chale — Mongo band tha
2. `pnpm seed` (page ka naya field set sync) → API restart
3. Admin me **Bulk Upload ▸ Pages ▸ New pages** — client ki sheet
   (`1_60GIBswRgWM33l1xXO2H0PBZvuizxT3XV5rXFDg_2g`). Page `/andaman-beaches/bharatpur-beach` pe bane,
   Pages Sidebar right pe. **Client test ke baad design ke badlaav batayega**

### 14 Sep — Bulk Upload for pages (D-95 §10)

- `IMPORT_TARGET.PAGE` — admin dropdown, New/Existing pages, Past imports ka Pages filter + 20 run apne aap
- `page-doc.js` (parser) · `page-mapper.js` · `TARGET_CONFIG.page` ka **`prepare`** hook — re-import admin
  ke `sidebar`/`sidebarId`/`showWhatsapp` nahi mitata; `showToc` sirf tab jab doc me `On this page` ho
- Doc labels: Meta Title · Meta Description · Page title · Page URL · Parent page (title) · Sub heading ·
  On this page: Yes/No · Banner Image URL · Button label · Button link · Stat Rail (Value/Suffix/Label/
  Highlight, optional) · Content · Faq: (Heading/Question/answer)
- Naya page → `Pages Sidebar` (naam se) right pe; na mile to note
- ⚠️ Client ke doc pe pakda: `On this page` anjaan label tha → `Parent page` me judta → draft. Theek
- Fixture = client ka asli doc (image 1200×800 PNG se badli). **`.prettierignore` me hai** — prettier ne
  use reformat karke test toda tha
- Client ki Drive me mera banaya test doc `Page template — Bharatpur Beach (test)` (`1lTBzMbC…`, private)
  ab zaroori nahi — client ne apna doc bhar liya. Hatana client ka faisla

### Usi din: sidebar

Client: _"sidebar me kuch nahi karna abhi sab thik hai"_ — screenshot milaan me desktop/tablet reference
jaisa tha. Custom HTML widget me design sirf `<ul><li><a>naam<b>right</b></a></li></ul>` pe lagta hai;
baaki markup (qfacts, wdgt tags, saada p) ki CSS nahi hai — client ko bataya.

---

## ⏭️ 14 Sep — saada page (D-95). Pehla kaam: A-25

**Kya bana:** `page-template-text.html` — client ki list (4 hatao · 4 badlo · 2 admin) aur uske baad
chaar sawaal-jawab. Poora hisaab **D-95** me. **1051 test**, lint/format clean, admin build pass.
Commit ho gaya (14 Sep), push nahi.

| Kahan  | Kya                                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| shared | `page` ka **apna** field set (`PAGE_FIELDS`), `heroButtonSchema` + `pageToggleSchema`                                                                                                            |
| api    | `normalizeFields()` me teen naye parse; `withToc()` (post se nikla, page bhi use karta hai); `toPublicPage()` me page ka banner bina fallback, `toc`, `fields.heroButton`/`showWhatsapp`         |
| web    | `components/page/TextPage.jsx` (naya), `blog/Toc.jsx` · `tour/HeroButtons.jsx` · `tour/StatRail.jsx` bahar nikle, `articleHtml({ lead })`, `.art--page` CSS, `TourPage` se page ka `Byline` gaya |
| admin  | `/pages` routes + guards, `PageList.jsx`, `TYPE_CONFIG.page` (`hero` flag → `eyebrow` + `statRail`)                                                                                              |

⚠️ **Live pe dekhne se pehle:** `pnpm seed` → API restart → dev band karke `next build` (D-89).

**Usi din baad me:** All Pages me `All dates` dropdown (`EntriesList` ka `dateFilter`). Client ne
chalaya to _"Month must look like 2026-08"_ aaya — `entryListQuerySchema.month` ka regex `^d{4}` tha
(backslash gayab, 10 Sep se). **Posts ka All dates bhi kabhi nahi chala tha**; tests `listEntries()`
seedha bulate the. Regex theek + schema test. API restart ke baad hi live pe theek hoga.

⚠️ **Do chunav mere hain, client ke nahi** — `Show WhatsApp` aur `Show "On this page"` default
ticked; aur har `<h2>` ke upar reference wali patli line (`.rte h2`) + content card pe hover nahi.

⚠️ Post ki edit screen pe Featured image ki hint _"Na daali to Settings wali universal image aayegi"_
**pehle se galat** hai — post pe koi fallback nahi (`toPublicPost()`). Chhua nahi, client ko batana hai.

---

## ⏭️ (purana) Nayi session yahan se shuru kare (12 Sep)

### Abhi ki asli haalat (naapi hui, 11 Sep raat)

| Kya           | Value                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commits       | **~272** — 11 Sep ka kaam client ne khud push kiya (`300f907` unka apna `Packages.css` tweak). Uske baad ke handoff/format commit push hone baaki ho sakte hain — `git log --oneline origin/main..HEAD` dekho. Push hamesha **sirf client ke kehne pe** |
| Tests         | **1040 pass**, 38 file (`pnpm test`, exit 0)                                                                                                                                                                                                            |
| Builds        | ⚠️ Port 3000 pe client ka **`next start` 12:58 wala build** hai — aaj ke saare site badlaav usme **nahi** dikhte. Naya build client chalayega (dev band karke — D-89)                                                                                   |
| Lint · Format | dono clean                                                                                                                                                                                                                                              |
| Migrations    | **24 files**, 24/24 applied — **024** = post ka parent Blog settings se (D-92 §13)                                                                                                                                                                      |
| Decisions     | **D-94** tak                                                                                                                                                                                                                                            |
| DB            | 5 package (+12 trash) · 1 tour page · 1 blog page (`/blog`) · **15 post** · 6 category · 3 sidebar · 16 media · Blog mode **`nested`** · header: **Awards `left`**, Get quote `right`                                                                   |

### 11 Sep ko kya hua — poora hisaab D-92 §10–§13, D-93, D-94 me

- **Article ka design** — table (`<thead>`/`<tbody>`, cell me `<p>` nahi), `Caption:` → `figure`,
  do lead ka bug (D-92 §10); import wali images pe `width`/`height` (§11)
- **A-21 chaaron naap** — URL switch pe blog listing ka cache saaf nahi hota tha (theek); hydration 0;
  `/blog` 85, article 67 (A-17)
- **Past imports** — `All · Packages · Blog posts` filter, 20 run **har type ke** (§12)
- **Post ka parent Blog settings se**, server pe — admin ka `—` aur breadcrumb URL ke saath (§13,
  migration 024). Client ne shaam ko mode `nested` kiya — code ne sahi kiya
- **Client ki 11 Sep list (D-93)** — post ka `<h1>` = Title (Page Header gaya), kai categories +
  badge rang, excerpt optional (card content ke 24 shabd), hero byline me date · read time, review
  me aadhe taare, Blog settings → Posts submenu, Tour list ka Packages column aur `/blog` ki ginti hati
- **Post sidebar** — do galat koshishon ke baad ab **reference jaisi saada sticky** (D-93 §7).
  Sabak: reference ka comment nahi, uska chalta hua bartaav padho
- **Admin dropdown** — row me akela ho to 750px se upar `max(50%, 300px)` (client ka apna tune,
  `primitives.css` — "design se match" ke naam pe mat palatna)
- **Header button `position`** (D-94) — `left` nav ke pehle, tablet/mobile pe dono ek saath daayein,
  icon-only sirf 750px se neeche; desktop pe menu dono taraf **barabar** doori (§4, grid 2:1:1)

### Pehla kaam: A-24 — aaj ke badlaav client ki aankh se

Aaj ka koi bhi site badlaav **render hote hue dekha nahi gaya** (port 3000 pe purana build). Sab
tests/lint se verify hain, aankh se nahi. List **09-OPEN-ITEMS A-24** me — header ki 1100–1200px
wali tangi sabse pehle.

### Dhyan rahe

- ⚠️ `next build` **sirf dev band karke** — dono ek hi `.next` use karte hain (D-89). Client ka
  `next start` bhi usi `.next` pe hai — use chhedna nahi, client khud chalata hai
- **Tunnel** (docker: `merncms-admin-tunnel`, `merncms-site-tunnel`) — URL har restart pe badalta
  hai. Admin tunnel badle to `apps/api/.env` ke `EXTRA_CORS_ORIGINS` me naya URL aur `pnpm dev:api`
  **restart** (`--watch` `.env` nahi dekhta). URL nikaalna: `docker logs merncms-admin-tunnel 2>&1 |
grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1`
- `C:\Users\deepa\Downloads\blog-detail-v1.html` — client ki **trial copy** (header ke prayog), repo
  ke bahar. Asli reference `.claude/docs/reference/blog-detail-v1.html` chhua nahi gaya
- `C:\Users\deepa\merncms-a21` — A-21 ka bacha hua worktree folder (303 MB); git se hat chuka,
  folder client ko khud mitana hai (`rm` ki ijaazat nahi mili thi)
- Commit se pehle **`git status` padho** — client khud CSS tune karta hai (aaj `primitives.css`);
  uska badlaav apne commit me mat kheencho, alag commit (client ki ijaazat se)

### Shuru karne ke liye

```bash
docker compose up -d mongo
pnpm dev
```

`pnpm seed` ki zaroorat nahi. Nayi migration **024** pehle hi chal chuki hai; kisi naye instance pe
`pnpm cms migrate` chahiye (pehle `pnpm format`, phir migrate — D-82).

---

## 11 Sep — A-21 ki jaanch (production build)

Alag setup me chalaya — git worktree `C:/Users/deepa/merncms-a21`, DB copy `merncms_a21`, API 4001,
web 3001. Client ka dev server aur asli DB dono nahi chhue.

- ✅ **#1** publish → listing turant update. Cache sach me on hai — seedha DB edit se saabit
- ✅ **#2** URL switch → 308. **Listing ke purane links wala bug mila aur theek hua**
  (`syncPostUrlPattern()` ab `blogListingTags()` bhi bhejta hai, test ke saath)
- ✅ **#3** hydration / console errors 0 (dono page). ⚠️ Pill pe click wala filter naapa nahi
- ✅ **#4** `/blog` **85**, article **67** — LCP render-bound (Style & Layout), article ka CLS aur
  Best practices ek hotlinked image se. Poora hisaab **A-17** me
- ✅ Bulk Upload ki images pe ab `width`/`height` (D-92 §11). Purane imported post ke liye
  `Existing` mode me dobara import chahiye
- ✅ Past imports ka filter `All · Packages · Blog posts` (`?target=`), aur 20 run **har type ke**
  — pehle blog ke import package ka itihaas mita dete the (D-92 §12). 1023 test
- ✅ Post ka parent ab Blog settings se (D-92 §13): `/blog/…` → blog page (admin me `—`, breadcrumb
  `Home › Blog › Post`), `/…` → koi nahi. Server tay karta hai (create · update · switch), Bulk
  Upload bhi. **Migration 024** local pe chal chuki (15 post, sab bina parent — mode `root`). 1029 test
  ⚠️ Usi shaam client ne mode `nested` + blog page slug `blog` kiya — ab saare post `/blog/…`, parent
  blog page (dash dikhta hai). Code ne sahi kiya.
- ✅ **D-93 — client ki 11 Sep list** (admin 5 + public 4): post ka `<h1>` = Title (Page Header
  gaya, D-91 palta), kai categories (checkbox, har jagah saare badge), category ka badge rang,
  excerpt optional + card content se (24 shabd), hero byline me date · read time, TOC pinned,
  review aadhe taare, Blog settings → Posts submenu (`/posts/settings`), Tour list ka Packages
  column aur `/blog` ki ginti hati. Koi migration nahi. **1038 test**
  ⚠️ Port 3000 pe `next start` (12:58 ka build) — site ke badlaav naya build chalane pe dikhenge
- ✅ **D-94 — header button `position`** (left = nav ke pehle, right = aakhir, default right).
  Tablet/mobile pe dono ek saath daayein; icon-only label sirf 750px se neeche. Pehle
  `Downloads/blog-detail-v1.html` pe trial (client ne dekha, nav ke paas pasand). 1040 test
- A-18 confirm: index khaali `importRuns` pe, asli data `importruns` bina index ke

✅ a21 setup hata diya — `merncms_a21` drop, 3001/4001 band, worktree git se hata. Asli `merncms` aur
client ke servers nahi chhue.

---

## 11 Sep — client ki pehli do improvements (D-92 §10)

1. **Table:** cell ke `<p>` khule, pehli row `<thead><th>`, baaki `<tbody>`, `class="tbl"` —
   `normalizeTable()`. Haath se likhi (`<th>` wali) tables ka dhaancha nahi chhuta. CSS ke kal wale
   `.art .tblw > table` selector hata diye
2. **Image + caption:** `figure.artfig` + `figcaption`, `Caption:` nishaan se — `wrapFigures()`
3. **Do lead ka bug** (10 Sep se live): haath ke post pe `<p class="lead">` pehle se tha aur
   `leadParagraph()` doosra bhi bana raha tha. Theek
4. Kram `articleHtml()` me, test ke saath

⚠️ **Test post pe caption tab tak lead dikhega jab tak client doc me us line ke aage `Caption:`
na likhe** — ye code ki nahi, content ki baat hai.

✅ **Client ne chaaron nishaan asli doc pe khud chala kar dekh liye**, aur **guide v3 nahi banegi**
— shabd unhone note kar liye (A-22 band). Docs ka chhoota hissa bhi likha gaya: `02-ARCHITECTURE`
§3 me `importRuns` + §9 me endpoints, aur `04-ADMIN-UX` me Bulk Upload ki screen.

---

## 10 Sep (shaam-raat) — Bulk Upload for blog (D-92)

**16 commit.** Poore faisle **D-92** me, contract **spec 008 §11** me. Neeche sirf wo jo agli
session ko turant chahiye.

### Kya bana

Ek hi `bulk-imports` module ab `target` se **package aur post dono** banata hai. Admin me ek hi
screen, upar ek dropdown (`Packages` / `Blog posts`), aur Past imports me `Type` ka column.

Sirf teen cheezein target se badalti hain (`targets.js`): doc kaise padha jaaye, payload kaise
bane, aur kaunsi master lists chahiye. Post ke tests **wahi `runImport()`** chalate hain jo
package ke chalate hain.

### ⚠️ Chhe bug mile — **paanch sirf live chalane pe**

Ye is din ka sabse zaroori sabak hai. Har baar code-level pe sab "pass" tha.

1. **`&mdash;` decode hi nahi hota tha** — plain-text khaanon (excerpt, meta description) me wo
   **literally** chhapta. HTML wale khaane me nuksaan nahi hota, isliye chhoot jaata
2. **Table ke cells chipak jaate the** — `Makruzz90 minutes` (D-82 wala `stripTags`)
3. **Google image `data:` URI me bhejta hai**, CDN URL me nahi. Maine ulta maan liya tha
4. **Images clamp ke baad import hoti thi** → article **7 character** ka bacha aur row ne
   "Published" kaha
5. **FAQ ka heading** `"Frequently asked questions"` khud ek section marker hai — chup-chaap gayab
6. **`<thead>` aata hai, `<th>` nahi** — mere CSS ka `tr:first-child` pehli **data row** ko bhi
   header bana deta tha

### Do cheezein jo aage kaam aayengi

**1. Jo sirf render pe chalta hai use JSX me mat rakho.** `wrapTables()` aur uske saathi
`Blocks.jsx` me the, jahan unka test likha hi nahi ja sakta tha — table ka header usi wajah se
**do baar** galat bana. Ab wo `apps/web/lib/article-html.js` me hain, 16 test ke saath.

**2. Design ke wo hisse jo doc likh hi nahi sakta, theme sambhalti hai.** `Note:` · `Warning:` ·
`Quote:` nishaan se `.callout` · `.callout--w` · `.pullq` bante hain, aur `.lead` apne aap. Ghar
theme hai, importer nahi — wahi jagah jahan `wrapTables()` hai (D-90 §5). DB me content saaf
rehta hai. ⚠️ Isi ka nateeja **A-23** hai: admin ke editor me ye dabbe nahi dikhte.

### Live check (asli DB, asli sheet, poora article)

- content 7,577 chars · 7 `h2` · 2 table (`thead` + 6 `th`) · 1 `ul` · 2 `ol` · 1 `a` · 1 `img`
- link ka Google redirect unwrap · koi `data:` URI nahi · koi `&mdash;` nahi
- **dobara chalane pe 0 naye post, 0 naye media** — image ka naam content ka hash hai
- payload: `toc` 8 item, `readMinutes` 6, FAQ heading
- `existing` mode me naye slug pe saaf **Failed** — D-86 ka assertion asli data pe chala

### Team ke do doc (client ki Drive me)

- [Template — full test article](https://docs.google.com/document/d/1UvtC6tG44rTcx68x85nnaV2WL6pw924_SDdX7epwACQ/edit)
- [Guide v2 — content kaise likho](https://docs.google.com/document/d/1h7yYppW8LhrztmI92zOKchkIQnuYL2qAW5JWvYBulYI/edit)

⚠️ Dono **private** hain. Team ko bhejne se pehle share karna hoga.

---

## 10 Sep — Blog poora ho gaya: Slice D2, URL switch, aur client ke gine hue fix (D-91)

**9 commit.** Spec 008 ab **🟢**. Poore faisle **D-91** me — neeche sirf wo jo agli session ko
turant chahiye.

### Client ne page **chala kar** dus cheezein gina di

Aur unme se **do** aisi thin jo maine reference **dekhe bina** maan li thin:

- **Hero me excerpt** — `.ahead__d` ki CSS reference me padi hai par uska **markup kahin use hi
  nahi hota**. Maine CSS dekh kar maan liya
- **Sidebar me `All topics` ka row** — reference ke `.cats` me sirf chhe categories hain

⚠️ **Yahi galti D-89 me do baar ho chuki thi** (byline aur `.blk`). Ab **teen baar**.
**Reference ki CSS dekh kar markup maan lena is repo ki ek pehchani hui galti hai.**

### Do cheezein jo aaj sabse zyada seekhne layak thin

**1. A-19 ka apna ilaaj hi ek naya bug bana.** D-89 me `.wdgl` ke liye selector chauda kiya gaya
tha — `.wdg__b ul`. `.toc` bhi wahi `ul` hai, to wo TOC ka look kha gaya. Phir maine `.toc` ko
**poore rule set** se nikala — jisme `list-style: none; padding: 0` ka **reset** bhi tha — aur
client ko browser ke bullets dikhe. **Defensive selector ka daayra jitna chauda, uska agla
shikaar utna hi anjaan.**

**2. `content-visibility` margin collapse rok deti hai.** FAQ ke upar gap dugna tha; dono margin
collapse hone chahiye the. `.blk` pe `content-visibility: auto` (D-85) containment laata hai, jo
collapsing rok deti hai. D-85 ne wo speed ke liye lagaya tha; layout wala side-effect kahin likha
nahi tha.

### ⚠️ Ek asli data loss hua

Live test me `updateSettings({ blogSettings: { postUrlMode: 'root' } })` ne **poora
`blogSettings` replace** kar diya — client ka author text uud gaya (**wapas daal diya gaya**).
`social` pe ye jaal pehle se handle tha, `blogSettings` pe nahi. Ab `MERGED_KEYS` me dono hain.

**Admin ka form hamesha poora object bhejta hai, isliye ye wahan kabhi dikhta hi nahi** — ek
script se ek field patch karte hi dikha.

### DB me kya hai (client ne khud bhara)

**13 post** — ek poora bhara hua (reference wala article + 4 FAQ), baaki placeholder body ke
saath. **1 blog page** `/blog` pe (title `Andaman Travel Guide`, slug `blog`), jiske `postList`
me teen featured chune hue hain. **6 category**, **3 sidebar** (`Tour Page` · `Blog detail Page`
· `Main Blog`).

⚠️ Un placeholder posts ka body `Write this section.` hai — client apne content se badlega.

---

## 9 Sep (raat) — Blog shuru: spec 008, Slice A–C aur D1

**5 commit.** Client ne `blog-v1.html` (listing) aur `blog-detail-v1.html` (post) di.
**Kaam ka kram unka hai — pehle detail, phir listing.** Poora contract
[`specs/008-blog.md`](../specs/008-blog.md) me (🟡 Draft), `cms-architect` se review ho chuka.

### Client ke chaar faisle (inhi pe poora design khada hai)

| #   | Faisla                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Listing ka filter + pagination client-side** — saare post ek saath payload me, `perPage` (9) theme lagati hai. Isi se pills ↔ Topics ka **do-tarfa sync muft** milta hai |
| 2   | **Post ka editor = `richText` + `faqs`** — FAQ alag block isliye ki `FAQPage` schema usi se banti hai                                                                       |
| 3   | **Byline sirf `blogSettings.author` se** — `authorId` andar rehta hai, page pe kabhi nahi                                                                                   |
| 4   | **`postPicks` widget** ("Most read") — client 5 tak post khud chunta hai. **View counting hai hi nahi**                                                                     |
| 5   | **TOC pe checkbox** (`blogSettings.showToc`) — ⚠️ maine ulta suggest kiya tha, client ne palta (R15)                                                                        |
| 6   | **Mobile pe form popup + CTA settings se** — dono maujooda component, naya kuch nahi                                                                                        |

### Kya bana

- **Slice A** (`8e3922a`) — `post` se `tag` gaya + `hasBuilder`, naya `blogPage` type,
  `postList` block, `blogSettings`, do naye widget (`topics`/`postPicks`)
- **Slice B** (`0789664`) — `toPublicPost()`, `toPostCards()`, prev/next, related, TOC
- **Slice C** (`01198fb`) — Posts ki screens, Blog Page, `Settings ▸ Blog settings`
- **Slice D1** (`4ac0c3e`, `468e892`) — post ka page live

### ⚠️ Chaar bug mile, **chaaron "bana hua par juda nahi"**

1. **Cache** — API `type:post` bhejti hai par `apps/web` me use **koi padhta hi nahi**
   (`cms.js` sirf `path:` se tag karta hai). Naya post publish hone pe `/blog` ka cache saaf
   hota hi nahi tha. Ab `invalidate()` un `blogPage` entries ke `path:` bhi bhejta hai jinme
   `postList` hai. ⚠️ **Ye abhi sirf code level pe sach hai — asli pehra `next build` pe hai**
2. **`settings.siteUrl` payload me tha hi nahi** — `TourSchema.jsx` 8 Sep se
   `?? settings?.siteUrl` padh raha hai aur wo hissa **kabhi chala hi nahi**. Yaani jis instance
   pe `NEXT_PUBLIC_SITE_URL` na ho, wahan **tour page ke schema ke saare absolute URL chup-chaap
   gir jaate the**. Ab `env.SITE_URL` se jaata hai
3. **TOC** payload me 8 item ke saath ja rahi thi aur render koi nahi kar raha tha
4. **`extractBlockText()` sirf top-level string props padhta tha** — `faqs.items[].answer` kabhi
   ginta hi nahi tha. Yaani read time jhootha **aur** `entries.searchText` adhoora: client ke
   likhe FAQ admin search me **aaj tak aate hi nahi the**

### ⚠️ Ek aur, client ke chalane pe (`468e892`)

Client: _"main content me jo `.blk` hai usme padding nahi hai design me, na koi border."_ Uske
peeche ek bada issue nikla: reference ke `.art > p` waale selector `.blk` ke **through pahunchte
hi nahi the**, kyunki hamara content `.blk` ke andar baithta hai. Yaani **article ki poori
typography lag hi nahi rahi thi** (15.5px/1.75 ki jagah tour page waali). Ab wo descendant hain.

### DB me kya hai (asli data, client ne khud bhara)

**12 published post** — ek poora bhara hua (reference wala article + 4 FAQ), **gyarah placeholder
body ke saath** (title · excerpt · category · date sab `blog-v1.html` se asli). 6 categories,
`Blog Page` sidebar (`enquiryForm` + `html` + `postPicks`), `blogSettings` poori bhari hui.

⚠️ **Un gyarah ka body `Write this section.` hai — client apne content se badlega.** Maine koi
tathya nahi gadha (ferry timings, daam, PADI) — wo ek asli travel business ki site pe jaate.

### ⏭️ Agla kaam

1. **Slice D2 — listing page** (`blog-v1.html`): `.feat`/`.fcard` (Start here ke 3),
   `.bfilter` ki pills, `.pager`, aur **Topics ↔ pills ka do-tarfa sync**.
   ⚠️ Client ne kaha tha _"/blog wala page baad me, data bhi baad me daal dunga"_
2. **`next build` + `next start` pe verify** — cache wala fix (#1 upar) **sirf wahin** sach me
   test hota hai. ⚠️ Build se pehle dev band karo (dono ek hi `.next`)
3. **Spec ke teen khule sawaal** — Q-B1 (`blogPage` ek ya kai), Q-B2 (`postPicks` ka default
   heading), aur URL switch (`/blog/{slug}` ↔ `/{slug}`, Slice E — abhi bana hi nahi)
4. **A-9 ka `page` wala aadha ab bhi khula** — blog ka matlab `post` tha, aur wahi kiya gaya

---

## 9 Sep — Tour page band. Client ke pandrah kaam (D-90)

**12 commit.** D-89 wale milaan ke baad client ne page **dobara** chala kar dekha. Poora hisaab
**D-90** me; yahan sirf wo cheezein jo aage kaam aayengi.

### Ek naya contract jo aage har page pe asar karega — `fields.heading`

`entry.title` ab page ka `<h1>` **nahi** hai. Naya `fields.heading` wo kaam karta hai; `title`
slug · breadcrumb · admin list · SEO · schema ke liye bacha.

| Kahan            | Kaun                        |
| ---------------- | --------------------------- |
| Page ka `<h1>`   | **`fields.heading`** (naya) |
| Baaki sab jagah  | `title` (plain, jaisa tha)  |
| Khaali `heading` | theme `title` pe girti hai  |

⚠️ **`inlineHtmlSchema` pe hai** — block tags `<h1>` ke andar ghus hi nahi sakte. Pehra do jagah:
`normalizeFields()` (shape) aur `sanitizeInlineHtml` (safai, R20).

⚠️ **Pages/Posts ka kaam shuru karte waqt ye yaad rahe** — abhi ye field sirf `tourPage` pe hai
(`TOUR_PAGE_FIELDS`). `page`/`post` ki screens banate waqt tay karna hoga ki unhe bhi milega ya
nahi.

### Teen "bana hua par juda nahi" phir mile (D-89 §3 ka silsila)

Per-package rating ka panel, `statRail[].highlight` ka checkbox, aur `PackagePage.jsx` ka
`defaults.rating` — teenon me schema · payload · theme taiyaar the, **admin me control nadaarad**
ya **doosra padhne wala chhoot gaya** tha.

⚠️ **Teesra sabse seekhne layak hai:** D-87 §3 ne rating per-package ki, `toPackageCards()` badla,
par `PackagePage.jsx` chhoot gaya. Client ki shakayat bilkul yahi thi — _"card me updated hai,
page pe purana 412 aa raha hai."_ **Ek hi baat ke do padhne wale the aur sirf ek badla.**

### A-19 ki teesri jagah mil gayi — ab ye pattern hai, ittefaq nahi

`.wdgl` · `.faq p` ke baad ab **`.tblw`**. Client ke teen table me se do pe wrapper tha, ek pe
nahi — us ek pe na gol kone aaye, aur mobile pe wo page se bahar nikal gayi.

**Ab `wrapTables()` theme me khud wrapper lagata hai** (`components/tour/Blocks.jsx`). Naya CSS
likhte waqt sawaal ye hai: _"agar client ye class na likhe to kya hoga?"_

### ⚠️ Ek galti jo maine ki — `git add -A`

Client ne usi waqt `RatingPanel.jsx` aur `PackageEdit.jsx` se teen hint hataayi thi. Mere
`git add -A` ne wo **table wale commit** (`6869feb`) me kheench liye — commit message me unka
zikr tak nahi hai.

**Niyam: commit se pehle `git status` padho. `-A` tabhi jab pata ho ki tree me sirf apna kaam
hai.** Client screens khol kar baitha ho sakta hai.

⚠️ Un hint ko **wapas mat jodo** — wo client ka faisla hai (A-20 #3).

---

## ⏭️ Kal ka kaam — kya bacha hai

### Client ne kaha: **tour page ka design complete hai.** Agla kaam **blog** hai.

### 1. Blog = A-9 kholna

`post` content type **pehle se maujood hai** (`content-types.js:421`) — uski screens
`NotBuiltYet` pe hain. Yaani naya module banana **nahi** hai.

✅ **Saancha taiyaar hai** — `EntriesList.jsx` aur `PageEdit.jsx` dono `type` se chalte hain
(Tour ke liye yahi use hua), aur `lib/use-entries.js` ke hooks kisi bhi type pe chalte hain.
Kaam `TYPE_CONFIG` me ek row + do route ka hai.

⚠️ **8 Sep ka sabak dohraana nahi hai:** blog ka matlab **`post`** hai. `page` usme apne aap mat
ghusaao — client ne wo saaf mana kiya tha (_"Pages par kaam to ho hi nahi raha"_). Scope ek
faisle se nahi badhta.

⚠️ Blog ke apne sawaal jo abhi tay nahi hain: `post` ko `fields.heading` milega ya nahi, archive
page (`/blog`) banega ya nahi, aur categories/tags ki screens (`/posts/categories`,
`/posts/tags` — dono abhi `NotBuiltYet`). **Ye client se poochhne wali cheezein hain.**

### 2. A-20 — tour page ke chaar bache hue kaante (naya, D-90)

Sabse zaroori: **`enquiry.sourceUrl` asli enquiry pe verify nahi hua** (test enquiry thi hi
nahi). Ek form bhar kar `Enquiry Details` khol kar dekhna hai.

### 3. A-17 — speed ke number ab **purane** hain

Mobile 91 · desktop 98 wale number **sirf package page** ke the, 4 Sep ke. Uske baad ek poora
naya page bana, `globals.css` ~600 line badi hui, aur `pklist` se `content-visibility` hat gaya.
**Naapna ab do page pe hai**, aur **dev band karke**.

### 4. A-19 — editor se `class` kho sakti hai

Ab teen jagah mil chuki hai. Wajah abhi tay nahi; pehla shak `lists` plugin pe hai.

### 5. A-18 — `importRuns` / `importruns` — 5 minute ka kaam, verify ho chuka

### 6. ⚠️ D-88 §1 · D-89 §9 — design v3 se **saat** farak, attribution baaki

### Baaki purane: A-12 (CI) · A-15 · A-14 · Q-7 · Q-9 · Q-3 · Q-4

---

## 8 Sep — teen bade kaam ek din me

**Slice E (D-88) · Slice D (D-87 §11) · design se milaan (D-89).** Iske saath **D-87 aur D-88
dono poore ho gaye** — Tour Page ka poora kaam khatam hai.

### 1. Slice E — `Appearance ▸ Sidebar` (D-88)

Nayi `sidebars` collection + module, **migration 023**, teen widget type
(`enquiryForm` · `talkToPlanner` · `html`), page pe `fields.sidebarId`, aur payload me
`entry.sidebarWidgets[]` (server pe resolve — `sidebarId` theme ko kabhi nahi jaata).

Saath me **D-88 §9** — `Cards` aur `Two column` ko apna `heading` + `description`. Us se
"theme render pe blocks ko group kare" wala jaadu poori tarah khatam ho gaya: **ek panel = ek
dabba**.

### 2. Slice D — theme (D-87 §11)

`components/tour/` — `TourPage` · `Blocks` · `PackageList` · `Sidebar` · `TourSchema`, aur ~500
line nayi CSS. Ab tak catch-all me sirf `type === 'package'` wali branch thi; tour page pe **sirf
`<h1>`** chhapta tha.

- `.pgl` **chhua nahi gaya** — `.pgl--sideleft` modifier hai (package page ka sidebar right hai)
- Card ka markup `components/PackageCard.jsx` me ek jagah aaya — `Similar` aur `PackageList` dono
- `EnquiryForm` ab `variant="book" | "cta"`; uske liye `useOptionalCategory()` juda
- `TourSchema` alag — sirf `BreadcrumbList` + **saare FAQ blocks milaa kar ek** `FAQPage`

### 3. Design se milaan (D-89) — client ne page chala kar 13 farak nikale

Poora hisaab **D-89** me. Do baatein yaad rakhne laayak:

⚠️ **Zyada tar farak "bana hua par juda nahi" wale the** — trust badges, `entry.url`,
`StickySide`, `Icon.jsx` ke chaar icon, `.wdgl`/`.wdg__b`/`.wdg--cta` ki CSS. Sab ka lakshan ek
hi tha: **kuch na hona**. Koi error nahi. Yahi D-86 me likha gaya tha.

⚠️ **Do jagah maine reference dekhe bina maan liya tha** — byline (design me hai hi nahi, wo
`page-template-text.html` ki cheez hai) aur package list ka `.blk` (reference me saada `<div>`).
Dono baar reference ne ulta kaha.

**Paanch naye contract, koi migration nahi:** `tourSettings.heroButton`, `twoColumn.style`,
html widget ka `icon`, enquiryForm ka `heading`/`description`, aur `unwrapBareSpans()`.

---

## 8 Sep — D-87 ka doosra din. Client ne chala kar bahut kuch palta

**14 commit.** Din ki shakl saaf thi: client ne admin sach me chalaya, aur jo tooTa ya bemaani
laga wo batata gaya. **Chaar me se teen badlaav uske the, aur teenon theek the.**

### Do bug jo client ne pakde, aur dono "khaali" jaise dikhte the

| Lakshan                                                             | Asli wajah                                                                                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"Bahut zyada requests. Thodi der baad."_                           | `useEntryList` ki dep **object ki identity** thi. `PageEdit` inline object bhejta tha → har render pe naya → infinite loop. Rate limiter ne use **sunai dene laayak** bana diya                   |
| _"Packages to hain, phir left side me koi package aa hi nahi raha"_ | Picker `limit: 200` bhejta tha, `entryListQuerySchema` ka cap **100** hai → har request 400. Aur picker sirf `data` padhta tha, `error` nahi — to **failure khaali state ki shakl me** dikhta tha |

⚠️ **Dono ka sabak ek hi hai:** _guard ya call ka fail hona kabhi error jaisa nahi dikhta — wo
"kuch na hone" jaisa dikhta hai_ (D-86 wali baat). Ab `ENTRY_LIST_MAX_LIMIT` shared se export
hota hai (number do jagah haath se likhna hi galti thi), aur picker error **laal me alag se**
dikhata hai.

### ⚠️ Sabse bada sabak — scope ek faisle se nahi badhta

Slice C me faisla #2 (_"koi template nahi, ek hi edit screen"_) ko ek kadam aage kheench liya
gaya: _"ek hi screen"_ ka matlab _"ek jaise types"_ maan liya, aur `page` ko `tourPage` ke poore
fields **aur poori screens** mil gayin.

Client ne do kadam me wo pakda: pehle _"page me tour ka content kyun aa raha hai?"_, phir saaf
_"Pages par kaam to ho hi nahi raha."_

**Ab `page` bilkul waisa hai jaisa D-87 se pehle tha** — `fields: []`, screens `NotBuiltYet` pe,
**A-9 phir se khula**. ✅ Saancha bach gaya: `EntriesList.jsx`/`PageEdit.jsx` dono `type` se
chalte hain, to Pages/Posts ka din aane pe **ek row + do route** ka kaam hai.

### ⚠️ R17 dobara toota — aur client ne dobara wahi tarike se pakda

UI ka text Hinglish me chala gaya tha. R17 me **literally** likha hai ki 21 Aug ko yahi hua tha
aur _"client ne Profile screen dekh kar poochha tha"_.

Sab English me kar diya. ⚠️ Ek label phir bhi chhoot gaya tha (`banaayein` mere sweep ke
shabd-list me nahi tha) — client ne wo bhi pakda. **Sweep list adhoori thi, wo bhi ek sabak hai.**

### Package list ka poora model palat gaya — ab wo **chunav** hai

|                 | 7 Sep                   | 8 Sep                                                            |
| --------------- | ----------------------- | ---------------------------------------------------------------- |
| List            | server filter se derive | **do-column picker** — `packageIds` hi list hai                  |
| Kram            | `sort` enum             | **usi array ka**, drag-and-drop se                               |
| Ginti           | `limit`                 | jitne chune                                                      |
| Admin ka filter | ek radio, dono kaam     | **`browseBy`** — sirf baayen column chhota karta hai             |
| Page ka filter  | wahi radio              | **`pageFilter`** — checkbox jo single check ho, teen kism ki bar |

⚠️ **Keemat maan li gayi:** naya package publish hone pe wo apne aap kisi tour page pe **nahi**
aayega — client ko us page pe jaakar chunna padega.

Saath me: baayen column me **search** (server pe, 300ms debounce), aur FAQs block me
**description** ka editor.

### Do toggle hataye — dono ek hi wajah se

| Hata         | Client ne kaha                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `showBadges` | _"rating aur discount badge wala checkbox hatao, default package me hoga to automatically aayega hi"_ |
| `emitSchema` | _"do I need this checkbox?"_                                                                          |

⚠️ **Niyam jo isse nikla:** _jo cheez apne aap sahi ho sakti hai, uspe toggle rakhna client ko ek
aisa faisla dena hai jo uska hai hi nahi_ — aur har toggle ek aisi haalat banata hai jisme koi
use band karke bhool jaata hai. FAQ schema ab **saare FAQ blocks milaa kar ek hi `FAQPage`**
banayega (Slice D me).

### Ek option hataya tha — client ne poochha "kyun", aur wo theek tha

`Day wise` ko baayen ke filter se nikaal diya gaya tha kyunki list endpoint `nights` pe filter
karta hi nahi tha. **Option hatane ki jagah use chalana chahiye tha.** Ab `entryListQuerySchema`
me `duration` param hai aur `durationQuery()` bucket ko Mongo filter me badalti hai.

⚠️ `d8plus` sirf ek aur bucket nahi, wo ek **range** hai (8 aur usse zyada). Uska matlab
`durationQuery()` me **ek hi jagah** likha hai — do jagah likhne ka matlab hota wahi shakl jo
D-86 ke slug pe thi.

### Panels ab sach me khulte-bandh hote hain

`PageEdit` me raw `<div className="panel">` likh diya gaya tha, jabki **`Panel` component pehle
se maujood hai**. Chhe panel `Panel` pe le gaye. Stat rail aur SEO **band khulte hain** (design
me bhi wahi). Publish ke Save/Trash `footer` me hain — body band hone pe render hi nahi hoti,
aur Save chhupna nahi chahiye.

### Blocks ab drag se, aur unka head bhi sach me toggle hai

Wahi do kamiyaan blocks pe bhi thi, aur client ne dono pakdi:

- **⌃⌄ ke button hataye, ab grip se drag** — wo "abhi ke liye" wala shortcut tha aur galat tha:
  **usi screen ke package picker me `useListDrag` pehle se chal raha tha.** Drag ka intezaam
  maujood tha aur use blocks pe lagaya hi nahi gaya
- **`▾` ek saada `<span>` tha** — dikhta button jaisa, par toggle sirf summary ke text pe. Ab
  poora head toggle hai (`role="button"`, Enter/Space bhi), aur grip aur ✕ apna click rok lete
  hain

⚠️ **Sabak:** _jab ek pattern isi repo me pehle se chal raha ho, "baad me lagayenge" likhna ek
chup ka udhaar hai._ Picker aur blocks ek hi screen pe the, aur do alag tareeke se chal rahe the.

---

## ✅ (purana) 8 Sep subah ka "Agla kaam" — dono raaste ab band

> Ye section us waqt ka hai jab Slice D aur E dono baaki thin. **Dono usi din ban gayin**
> (D-87 §11 aur D-88), isliye neeche ka sab **itihaas** hai — kaam ki list nahi.
>
> Neeche jo "maloom kaante" likhe hain wo sach nikle aur teenon sambhal liye gaye: `.pgl` chhua
> nahi gaya (`.pgl--sideleft` modifier bana), `.b`/`.b-o` ki jagah `.btn--accent` use hui, aur
> sticky filter bar `.blk` ke andar nahi gayi.

### Slice D — theme (D-87 ka aakhri bada hissa)

`apps/web` ka catch-all abhi **har** payload `PackagePage` pe bhejta hai; usme page-shaped branch
chahiye. Naya CSS: `.vhero*` · `.vrail*` · `.fbar`/`.dpill` · `.prows` · `.prow__off` ·
`.dcard`/`.dgrid` · two-column · `.toc` · `.ctastrip`.

✅ **`.prow` poora bana hua hai** — `globals.css:3544–3766` + `Similar.jsx`.

⚠️ **Maloom kaante:**

- `.pgl` package page pe sidebar **right** rakhta hai; tour page pe ulta. **`.pgl` badla to
  package detail page tootega** — `.pgl--sideleft` modifier chahiye
- `.b` / `.b-o` / `.b-wa` hamare paas nahi — `.btn--outline` / `.btn--accent` hain.
  `.sec--blue` bhi nahi — `.pkg` / `.pkg__cta` (`globals.css:4376`)
- `.blk` pe `content-visibility` hai — sticky filter bar uske **andar nahi** (D-85)
- `PackagePage.jsx:95` ka `ARCHIVE_CRUMB` abhi bhi 404 deta hai; client jis din wo tour page
  banayega, apne aap theek ho jaayega
- FAQ schema: **saare FAQ blocks milaa kar ek hi `FAQPage`** (aaj tay hua)

### ✅ Slice E — `Appearance ▸ Sidebar` — **ban gayi (D-88, 8 Sep)**

Wo ek sawaal jispe poora module ruka tha — _sidebar me kya-kya daala ja sakta hai, list fixed hai
ya client apne widget bana sakta hai?_ — client ne band kar diya: **list fix hai, teen type ki.**

| Cheez                 | Kya bana                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `sidebars` collection | Nayi, apna module (paanch file), **migration 023** (indexes + roles sync)                      |
| Widgets               | `enquiryForm` · `talkToPlanner` · `html` — **ordered list**, `{id, type, props}`               |
| Page pe               | `fields.sidebar` (jaisa tha) + naya `fields.sidebarId`. Dropdown `none` chhodne par khulta hai |
| Payload               | `entry.sidebarWidgets[]` — resolve hua maal. **`sidebarId` theme ko kabhi nahi jaata**         |
| Admin                 | `Appearance ▸ Sidebar` list + editor, `PageBlocks` ka hi saancha (drag, toggle, summary)       |

⚠️ **`fields.sidebar` `{ position, id }` NAHI bana** — upar wala plan palta gaya. Do flat field
rakhne se entries pe **koi migration nahi lagti**, payload ka shape nahi badalta, aur teen purane
test waise ke waise chalte hain. Poora tark D-88 §3 me.

⚠️ **`forms.placement` ka gap na khula na band hua** — wo sirf **package pages** ko serve karta
hai (jo hardcoded hi rahenge, client ka faisla), aur sidebar ka `formId` sirf `page`/`tourPage`
ko. Dono kabhi milte hi nahi, isliye ye D-86 wali "ek hi cheez ke do naam" nahi hai.

⚠️ **`On this page` nahi bana — client ne defer kiya.** Wo `tour-v3.html` me hai hi nahi (sirf
`page-template.html:1862` me), aur Pages ki screens bani nahi (A-9). Jab banega tab tay hoga ki
uski **jagah** sidebar ki list me ho aur **on/off** page pe — ya wo hamesha sabse upar aaye.

⚠️ **Design v3 se paanch farak** — `admin-design-v3.html:682` pe Sidebar ka poora screen bana hua
hai (ek hi sidebar · global left/right · form ke liye niyam ki table · chaar widget). Client ne
uski jagah named sidebars chune. **D-88 §1 me poora hisaab hai, aur usme likha hai ki #2–#5 ka
client-attribution abhi likha jaana baaki hai** (R15 — design se hatna client se aata hai).

### Slice C ka ek adhoora hissa

**Tour list ka `Packages` column** abhi **blocks ki ginti** dikhata hai, packages ki nahi. Design
me wahan `11` jaisa number hai — wo live packages pe depend karta hai, isliye server pe hi ban
sakta hai aur uske liye list endpoint ko per-row query karni padegi.

---

## ⏭️ (purana) Nayi session yahan se shuru kare (7 Sep, raat)

### Abhi ki asli haalat (naapi hui)

| Kya           | Value                                                           |
| ------------- | --------------------------------------------------------------- |
| Commits       | **179**                                                         |
| Push          | ✅ **0 unpushed** — `origin/main` = `HEAD` = `02d2e83`          |
| Tests         | **810 pass**, 31 file (`pnpm test`, exit 0)                     |
| Admin build   | ✅ `vite build` pass                                            |
| Lint · Format | dono clean                                                      |
| Tree          | clean                                                           |
| Migrations    | **22 files**, 22/22 applied — **koi nayi nahi lagi**            |
| Decisions     | **D-87** tak                                                    |
| DB            | 5 package · 4 content type (`package` `page` `post` `tourPage`) |

### Pehle ye do

```bash
docker compose up -d mongo
pnpm seed          # ⚠️ ZAROORI — tourPage type isi se banta hai
pnpm dev
```

⚠️ **`pnpm cms migrate` ki zaroorat nahi** — D-87 me koi migration nahi lagi. `tourPage` naya
type hai aur `ensureBuiltInContentTypes()` naye type ko **create** kar deta hai; `fields` hamesha
sync hote hain. Naye instance pe sirf `pnpm seed` chahiye.

---

## 7 Sep — Tour Page (D-87). Slice A · B · C ban gayi

**8 commit.** Client ne `tour-v3.html` di (package **listing** page) aur din me **do baar
palta** — dono baar model badla, dono baar code uske peechhe gaya.

### Client ke faisle jo code me hain

| #   | Faisla                                                                  | Kahan                            |
| --- | ----------------------------------------------------------------------- | -------------------------------- |
| 1   | Tour ka **apna top-level menu**                                         | `nav.js`                         |
| 2   | Koi template nahi — **ek hi edit screen**                               | `PageEdit.jsx`                   |
| 3   | Title · Eyebrow · Sub heading · Stat rail · Content                     | wahi                             |
| 4   | Content me **blocks** — Text · Two column · Cards · Package list · FAQs | `PageBlocks.jsx`                 |
| 7   | FAQ ka schema **us block se**                                           | `faqsPropsSchema.emitSchema`     |
| 8   | Duration filter, har ek ki apni ginti                                   | `durationFacets()` — **derived** |
| 9   | Byline poori tarah **automatic**                                        | `toPublicPage().byline`          |
| 10  | Banner Settings me, Featured image jeet-ti hai                          | `Settings ▸ Tour settings`       |
| 11  | Trust badges → **`Settings ▸ Tour settings`**                           | wahi                             |
| 12  | Breadcrumb **parent se auto**                                           | `resolveBreadcrumbs()`           |
| 13  | Eyebrow per-page                                                        | `fields.eyebrow`                 |

### ⚠️ Sabse zaroori: §2 ka model usi din palat gaya (§7)

Kuch ghante ke liye blocks ek hi HTML field ke andar `<div id="blk-…">` the aur settings
`fields.blocks{}` me. **Client ne demo dekh kar mana kiya** — "poora panel hoga, dropdown se add
kare". Ab **`content.blocks[]` hi kram hai**, aur Text bhi ek block hai.

Us palat se **teen problem apne aap khatam** ho gayi: settings ka do jagah hona, orphan blocks,
aur sanitizer me `data-*` kholne ka sawaal. Ab hum `block.js` ke FROZEN `{id, type, props}` par
hain — Phase 5 ka builder yahi data uthayega.

⚠️ `blockSchema.id` ab **input me optional** hai (shape nahi badla). `normalizeContent()` write
pe bhar deta hai — wahi jodi jo `faqs[]` aur `itinerary[]` pe hai.

### ⚠️ Rating ab per-package — D-70 palta

Listing page pe chaudah cards pe ek hi `4.9 ★ 412 trips` **jhootha** dikhta hai.

**Khaali `value` par `packageDefaults.rating` chalti hai** — package ka number use _override_
karta hai, mitata nahi. Fallback **payload banate waqt** lagta hai, write pe nahi. Isiliye
paanchon live package pe aaj bhi 4.9/412 chal raha hai (live check kiya).

### Do chupe hue bug jo raaste me mile

1. **`details`/`summary` sanitizer me the hi nahi.** FAQ accordion theme ke JSX me hai isliye
   aaj tak chala; client editor me khud `<details>` likhta to wo **write pe chup-chaap gayab**
   hota. Wahi shakl jo D-64/D-65 ke bug ki thi.
2. **Test suite rate limit kha rahi thi.** `entries.test.js` ka har test `beforeEach` me chaar
   login karta hai; file 168 test ki hui aur 1000 req/min ki chhat paar ho gayi. Naye tests
   **429** khaate the aur wo failure bilkul logic bug jaisi dikhti thi
   (`Cannot read properties of undefined`). Ab limiter test me band hai (`isTest`) — **auth ka
   apna limiter chalta rehta hai**.

### ⚠️ Slice A ka schema plan se bana tha, design se nahi

`admin-design-v3.html` se milaan pe **paanch farak** nikle aur design jeeta (R15): Package list
ka heading + line, `featuredFirst` alag checkbox (sort me teen hi option), `showBadges`, cards pe
`tag` bajaye `icon`, FAQs ka heading. **Sabak:** schema design se milao, plan se nahi.

### Live check — asli DB pe (D-82/D-83 wala sabak)

Ek tour page banaya → publish → resolve → **hata diya**. Blocks kram me, byline apne aap, kachcha
`content` payload me nahi, list ne 5 me se 3 cards diye, facets `5N/6D[5]`, rating
`packageDefaults` se. `tourSettings` alag se **DB se** padha gaya (response se nahi). Dono ke
baad DB waisi ki waisi.

⚠️ Ek fail hui run ka draft DB me reh gaya tha aur usse agla page `-2` pe chala gaya — wo bhi
saaf kiya. **Sabak: e2e script ka cleanup `finally` me hona chahiye.**

---

## ✅ Slice D (theme) ban gayi — D-87 §11, 8 Sep

**D-87 ki saari slices ab poori hain (A · B · C · D · E).**

Ab tak catch-all me sirf `type === 'package'` wali branch thi; tour page fallback pe girta tha
jahan **sirf `<h1>`** chhapta tha. Naya: `components/tour/` — `TourPage` · `Blocks` ·
`PackageList` · `Sidebar` · `TourSchema`, aur ~470 line CSS.

**Live check (production build, asli DB, `/andaman-tour-packages-starting-11-499-pp-2026`):**

```
200 · 170 KB
.vhero 1 · .vrail__c 4 · .sec--blue 1 · .pgl--sideleft 1 · .vbyline 1
.blk 10 · .dgrid 2 · .dcard 9 · .twocol 1 · .prows 1 · .prow 5
.wdg 3 (html · planner · cta form) · .faq 1
fbar: Duration | All | 5N / 6D | 5
JSON-LD: 1 FAQPage (9 Question) — koi TouristTrip/Product nahi
byline: "Arun · Updated 8 Sept 2026 · 4 min read"
```

Sidebar ka kram wahi mila jo client ne admin me lagaya tha.

⚠️ **Ek guard galat tha aur live check ne hi pakda** — filter bar `facets.length > 1` pe thi.
Asli page ke saare paanch package `5N/6D` ke hain, yaani facet ek hi tha aur **client ka chuna
hua `pageFilter` chup-chaap gayab** ho gaya. Ab `> 0`. Wahi D-86 wala sabak: guard ka chalna
kabhi error jaisa nahi dikhta.

⚠️ **`next build` sirf tab jab dev band ho.** Dono ek hi `.next` use karte hain; dev chalte waqt
build chalane se uske vendor chunks kat gaye aur har page **500** dene laga
(`Cannot find module './vendor-chunks/zod@3.24.1.js'`). Code me kuch nahi tooTa tha.

⚠️ **`.pgl` chhua nahi gaya** — `.pgl--sideleft` modifier hai. 1024px pe `grid-column` wapas
`auto` karna zaroori tha, warna implicit doosra column bacha rehta.

---

## (purana) 7 Sep ka "Agla kaam" — Slice D (theme)

`apps/web` ka catch-all abhi **har** payload `PackagePage` pe bhejta hai; usme page-shaped branch
chahiye. Naye CSS: `.vhero*` (7) · `.vrail*` (4) · `.fbar`+`.dpill` · `.prows` · `.prow__off` ·
`.dcard`/`.dgrid` · two-column · `.toc` · `.ctastrip`.

**`.prow` poora bana hua hai** — `globals.css:3544–3766` (23 rule) + `Similar.jsx`. Sirf
`.prow__off` naya.

⚠️ **Maloom kaante:**

- `.pgl` package page pe sidebar **right** rakhta hai; tour page pe wo ulta hai. `.pgl` **badla to
  package detail page tootega** — `.pgl--sideleft` modifier chahiye
- `.b` / `.b-o` / `.b-wa` hamare paas **nahi** hain — `.btn--outline` / `.btn--accent` hain.
  `.sec--blue` bhi nahi — `.pkg` / `.pkg__cta` hain (`globals.css:4376`)
- `.blk` pe `content-visibility` + `contain: paint` hai — sticky filter bar `.blk` ke **andar
  nahi** rakhni (D-85)
- `PackagePage.jsx:95` ka `ARCHIVE_CRUMB` `/andaman-tour-packages/` pe link karta hai aur wo
  **abhi bhi 404** deta hai. Client jis din wo tour page banayega, wo apne aap theek ho jaayega —
  koi code change nahi

~~Uske baad **Slice E**~~ — ✅ **Slice E 8 Sep ko ban gayi** (D-88), yaani **ab sirf Slice D
bachi hai**. ⚠️ Aur ye andaza galat nikla: Slice E ne `forms.placement` ka gap **nahi** bhara —
package pages hardcoded hi rahe (client), isliye `placement` ka kaam waisa hi hai aur
`form.js:152` ka gap **abhi bhi khula** hai.

### Slice C ka ek adhoora hissa

**Tour list ka `Packages` column** abhi **blocks ki ginti** dikhata hai, packages ki nahi. Design
me wahan `11` jaisa number hai — wo live packages pe depend karta hai, isliye server pe hi ban
sakta hai aur uske liye list endpoint ko per-row query karni padegi.

---

## ⏭️ (purana) Nayi session yahan se shuru kare (7 Sep, subah)

### Abhi ki asli haalat (naapi hui, 7 Sep)

| Kya           | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Commits       | **172**                                                |
| Push          | ✅ **0 unpushed** — `origin/main` = `HEAD` = `d7efd37` |
| Tests         | **774 pass**, 31 file (`pnpm test`, exit 0)            |
| Lint · Format | dono clean                                             |
| Tree          | clean                                                  |
| Migrations    | **22 files**, 22/22 applied, pending 0                 |
| Decisions     | **D-86** tak                                           |

⚠️ Neeche wala "(5 Sep)" wala section **purana** hai — usme 169 commit, 28 unpushed aur 764
test likhe hain. Wo 4 Sep ki raat ka sach tha; uske baad **teen commit** aur hue (D-84 media
`immutable` + `srcset`, D-85 speed 68→91/98, D-86 Bulk Upload ka duplicate bug) **aur sab push
ho chuka**. Ye section usko replace nahi karta, uske **upar** baithta hai.

### 7 Sep — koi code nahi likha, sirf design tay hua

Client ne teen nayi reference di — `tour-v3.html` (package archive/listing page),
`page-template.html` (14-block palette) aur `page-template-text.html` (text-first page).
`page-template.html` **scope se bahar** hai (`packages/blocks` khaali hai, wo Phase 5 hai).

Din bhar design pe baat hui aur **do baar palTa**: pehle "do template" (Text article +
Package archive), phir client ne wo rad karke **ek hi edit screen + content editor me blocks**
tay kiya. Ek admin mockup bana kar dikhaya gaya
(`C:\Users\deepa\Downloads\travel-cms-admin.html` — repo ke bahar, `admin-design.html` v1 ki
copy pe).

**Poora plan aur saare faisle yahan hain:**
`C:\Users\deepa\.claude\plans\c-users-deepa-downloads-tour-v3-html-tod-vivid-wave.md`

⚠️ **Repo me ek bhi file nahi badli** — `git status` khaali, HEAD wahi `d7efd37`.
⚠️ Client senior se confirm kar raha hai; kaam uske baad shuru hoga.
⚠️ Teen sawaal khule hain: block ke settings kahan rahenge (`id` + alag `fields` ka mashwara),
rating universal rahe ya per-package (D-70 palTe ya nahi), aur trust badges + universal banner
image Settings ke kaunse tab me.

---

## ⏭️ (purana) Nayi session yahan se shuru kare (5 Sep)

**⚠️ Pehle ek chetavni:** 3 aur 4 Sep ka kaam is file me **do din tak likha hi nahi gaya**.
Neeche wala "(3 Sep)" wala section 2 Sep ki raat ka hai — usme `origin/main = f0b7964` aur
"624 test" likha hai, aur wo dono **purane** hain. Ye section usko replace nahi karta, uske
**upar** baithta hai.

### Abhi ki asli haalat (naapi hui, 4 Sep)

| Kya           | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| Commits       | **169** — `f0b7964` ke baad **28 aur**                            |
| Push          | ⚠️ **28 unpushed.** `origin/main` abhi bhi `f0b7964` pe khada hai |
| Tests         | **764 pass**, 31 file (`pnpm test`, exit 0)                       |
| Lint · Format | dono clean                                                        |
| Migrations    | **22 files** — 018 se 022 nayi                                    |
| Decisions     | **D-83** tak                                                      |

### Pehle ye do

```bash
docker compose up -d mongo
pnpm cms migrate          # 018–022 me se jo baaki hain
pnpm dev
```

⚠️ **Migration ka naya niyam (D-82):** `pnpm format` **pehle**, `pnpm cms migrate` **baad me**.
Do baar (020 aur 022 pe) migration chalne ke **baad** prettier ne use format kiya aur checksum
guard ne turant pakda. Dono baar migration idempotent thi isliye data bacha — teesri baar ki
guarantee nahi hai.

---

## 4 Sep — Bulk Upload ka asli istemaal, structured data, aur cache

**11 commit.** Din ki shakl yahi thi: client ne Bulk Upload **asli sheet aur doc pe** chalaya,
aur jo toota wo theek hota gaya.

### Bulk Upload sach me chala (D-81 ka doosra din)

- **Pehla asli end-to-end** — client ki apni sheet + doc se _"Andaman Escape 5 Nights"_ ban kar
  publish hua: 6 din, chaaron daam strike ke saath, chaaron hotel, teen destination, HTML
  paragraphs aur bullets. Dobara chalane pe wahi package **update** hua, duplicate nahi bana
- **Banner ka sabse aam URL bahar ka hota hi nahi.** Client ne admin ka "File URL" copy karke
  doc me chipkaya (`localhost:5173/uploads/…`), importer use bahar ka URL samajh kar download
  karne gaya, aur **SSRF guard ne localhost ko theek hi roka**. Client ko aisa error mila jo
  uski galti jaisa lagta tha, jabki usne bilkul sahi image chuni thi. Ab URL pehle **apni hi
  media** ke liye dekha jaata hai (id URL ke andar hi likhi hoti hai) — koi download nahi, koi
  duplicate variant nahi
- **Doc se FAQs** — format client ne chuna: `FAQs` heading, phir `Question` → sawaal →
  `Answer` → jawab. Parser ab **teen hisson** me chalta hai aur section marker har hisse me
  pehchane jaate hain; bina uske itinerary ke baad likha "FAQs" ek **din ka label** samajh liya
  jaata aur poori list chup-chaap itinerary me chali jaati
- **New / Existing mode** — import ke saath ek **elaan** jaata hai. Ye filter nahi, **assertion**
  hai: bina iske ek purana `Package URL` nayi sheet me reh jaaye to wo ek live package ko
  chup-chaap overwrite kar deta. Jaanch `createEntry`/`updateEntry` se **pehle** hoti hai
- **Past imports** — 20 run ka cap (purane run apni saari rows subdocument me rakhte hain, aur
  list 20 se aage jaati hi nahi), aur `Failed` pe **hover ka popup** jisme wajah dikhti hai
- **Result ka page link admin ke port pe khulta tha** — `row.path` seedha `href` me tha. Ab
  poora URL server se, `env.SITE_URL` se juda hua

### D-82 — structured data ki teen galtiyaan, aur Itinerary Settings

Live check pe **chaar** cheezein nikli:

1. **`aggregateRating` `TouristTrip` pe valid hi nahi tha** — Google ka validator sahi tha. Ab
   ek **`Product` node** juda aur rating wahan gayi. Do faayde: error gaya, aur rich result ab
   sach me mil sakta hai (`TouristTrip` khud kisi rich result ko power nahi karta)
2. **Din ka plan schema me jaata hi nahi tha** — pehle sirf `itinerary` (jagah ka kram). Ab har
   din ek **`subTrip`** hai. Dono chahiye: `itinerary` batata hai **kahan**, `subTrip` **kya**
3. **`stripTags` do vaakya chipka deta tha** — `settle in.In the evening`. FAQ ke jawab pe bhi,
   1 Sep se
4. **Toggle per-package hone ki wajah se kabhi on hi nahi hua** — paanchon package pe `false`
   mila. Ek bana-banaya feature teen din bekaar pada raha. Ab `packageDefaults.seoSchema`,
   default **`true`**, screen **Packages ▸ Itinerary Settings**. Migration 022

Usi screen pe Similar ke do number bhi code se nikal kar settings me aaye (`similar.total`,
`similar.perPage`) — client ko _"i put 10 and i want to show 5 then pagination"_ chahiye tha.

⚠️ **Whitelist wala jaal chauthi baar laga** — `updatePackageDefaults()` ka `$set` ek whitelist
hai; `seoSchema` aur `similar` schema/model/screen teenon me jud gaye, whitelist me nahi.
Client ne 4 bhara, "Saved." dikha, page pe 3 hi rahe. Chetavni us function ke upar **pehle se
bold me likhi thi** aur phir bhi lagi — isliye ab dono field ka apna test hai jo **response
nahi, DB** padhta hai.

### Cache sach me on hua (D-83) — aakhri commit, aur sabse chup bug

`lib/cms.js` me `fetch(url, { next: { tags } })` likha tha. Next **15** me `fetch` ka default
**`no-store`** hai (14 me `force-cache` tha) — sirf tags dene se kuch cache hota hi nahi, wo bas
tag chipkaata hai. Nateeja: **har page load pe chaaron call API tak jaati thi, har baar.**

Poora ISR dhaancha bana hua tha — route, `tagsFor()`, `path:` tag (D-52), path badalne pe
purane tag ka bhejna — aur teen hafte tak **ek din bhi chala nahi**. Ab `revalidate: 3600` tags
ke **saath** hai, unki jagah nahi.

⚠️ Ek purana diagnosis galat nikla: **favicon theek hai.** Wo 404 tab dekha gaya tha jab
favicon upload hi nahi hua tha.

---

## 3 Sep — Enquiries inbox, Media Library, TinyMCE, Bulk Upload ki neev

**17 commit.** Chaar dhaare:

| Kya                                                                                        | Decision                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enquiries inbox** — All Enquiries · Detail · Export CSV                                  | **D-75**, usi din client ne chala kar **chhota** kar diya — **D-76** (submenu me teen item, detail pe sirf Status, Notes aur Quick Actions dono hataye). Migration 018 · 019 |
| **Media Library + MediaPicker**, filters, Delete sach me red                               | **D-77 · D-78**                                                                                                                                                              |
| **`mediaRefs` nahi banega** — client ka faisla                                             | **D-79** (aur uske saath `Attached`/`Unattached` filter bhi mar gaya, wo usi pe tika tha)                                                                                    |
| **Editor ab TinyMCE, saara page content HTML**                                             | **D-80** — spec 002 ka **doosra** badlaav. Migration 020                                                                                                                     |
| **Bulk Upload** — doc parser · Google HTML ki safai · module · worker · admin ke do screen | **D-81**, migration 021                                                                                                                                                      |
| **Date picker poore box pe khule** — ab ek rule hai                                        | **R19**                                                                                                                                                                      |
| Design parity naapi — chaaron page, teraah tag, ek bhi farak nahi                          | —                                                                                                                                                                            |

⚠️ **D-80 ke saath XSS ki problem ab hum paal rahe hain.** TipTap schema-based tha isliye XSS
**ban hi nahi sakta tha**; ab content raw HTML hai. Keemat `rich-doc.js` me D-69 ke waqt pehle
se likhi hui thi, aur wo din aa gaya — sanitizer + permission gate ab zaroori hain (R20).

---

## 2 Sep ka handoff (itihaas — us waqt "3 Sep ka plan" tha)

**2 Sep me kya hua:** **30 commit**, teen dhaare me — enquiry form ko _sach me_ chalana,
mobile/responsive pass, aur **A-16 ka fix**. **624 tests pass** (26 file), lint aur format
clean. Sab **push ho chuka** — `origin/main` = `f0b7964`.

⚠️ **Koi nayi migration nahi judi.** 17/17 applied, `pending: 0` — is baar `pnpm cms migrate`
chalane ki zaroorat **nahi** hai (pichli baar thi, isliye likha ja raha hai).

### Pehle ye do

**`docker compose up -d mongo` aur `pnpm dev`** — teenon apps. Bas itna hi; migration wala
kadam is baar nahi hai.

### ✅ A-16 band — `pnpm test` ab uploads ko haath nahi lagata

2 Sep ka sabse zaroori fix, aur **wajah `media.test.js` se badi nikli**. `vitest.config.js`
har test ke liye `UPLOAD_DIR: './uploads'` set karti thi — yaani test me chalne wali **app
bhi dev ke asli folder me likhti thi** — aur `media.test.js` usi folder ko har test se pehle
`rm -r` kar deta tha. **Sirf test ka path badalna aadha fix hota**, app phir bhi wahin likhti.

| Kya laga           |                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `vitest.config.js` | `UPLOAD_DIR` ab `./.test-uploads-media`                                                            |
| `media.test.js`    | `UPLOAD_ROOT` ab `getStorageDriver().root` se — hardcoded nahi, to drift ho hi nahi sakta          |
| Guard              | root `.test-` se shuru na ho to file **chalne se pehle** throw karti hai — data mitne ke baad nahi |
| Safai              | `afterAll` cleanup + `.gitignore` me `.test-uploads*/`                                             |

**Client ke asli data pe verify kiya:** unhone 7 images upload ki (21 file), poori suite
chalayi, phir **md5 checksum** milaya — **0 deleted, 0 changed**. Beech me upload hui 4 aur
images bhi bach gayi.

⚠️ **Ek hissa jaan-boojh kar nahi kiya:** `UPLOAD_DIR` repo ke bahar le jaana. Client ne
poochha _"why you are suggesting to create new folder?"_ aur baat sahi thi — wo suggestion
purani A-16 entry se bina jaanche uthaya gaya tha. Jaanchne pe pata chala ki `git clean` is
repo ki **kisi script/CI me hai hi nahi**, wo sirf manually chalayi jaane wali command hai.
Isliye wo kaam ab **optional** hai, blocker nahi.
👉 `09-OPEN-ITEMS.md` me use "optional" mark karna abhi **baaki** hai — client ne haan/na
nahi kaha.

### 2 Sep ka baaki kaam — do dhaare

#### 1 · Enquiry form ab sach me chalta hai (8 commit)

1 Sep ko form **ban** gaya tha par submit hi nahi hota tha. Do alag jad thi:

- **`credentials` `fetch` me likha hi nahi tha.** `fetch` ka default `omit` nahi,
  **`same-origin`** hai. To logged-in admin ke browser se CSRF cookie chali jaati thi aur API
  header maangti thi → _"CSRF token did not match"_. Ab `credentials: 'omit'`.
  ⚠️ Ye **sirf admin ke apne browser me** dikhta tha (cookie port se bandhi nahi hoti), asli
  visitor ke liye form chalta rehta — aur test se pakdi hi nahi ja sakti thi. Wahi
  delivery-layer wala sabak (D-42 §2).
- **`sourcePage` har submit ke saath jaata tha, chahe form me wo field ho ya na ho.** Client
  ne wo field hata di aur har submission ruk gayi. Server ka check theek hai aur rehna chahiye
  (R9) — galti bhejne wale ki thi. Aakhir me `sourcePath` **payload ka apna khaana** ban gaya
  (`submitEnquirySchema`): ab wo **hamesha** jaata hai, form ke fields se juda hua nahi.

Saath me: submit ke baad form gayab nahi hota (sirf button badalta hai, 6s baad apne aap
wapas), fields khaali ho jaate hain, thank-you message jaisa ka waisa jaata hai, enquiry dev
ke terminal me log hoti hai, aur travel-date pe **poora box** click karne laayak hai.
`hotelCategory` ab `Add a field` ke dropdown me hai.

#### 2 · Mobile / responsive pass (16 commit)

Client phone pe chala kar batata gaya: 1080px se neeche daam ki do line, route strip ka wrap,
gallery popup (buttons image ke saath · backdrop · SVG teer · counter), similar cards
(`Best for` line · rating · margin · tablet pe do, phone pe ek), din ke dono tag ek bracket
me. Do bade kaam:

**Mobile ki sticky patti (`.mobar`)** — Call · WhatsApp · Get free quote, 760px se neeche. Wo
reference me hamesha thi par **kabhi banayi hi nahi gayi**: `.mobar`/`.float`/`.sidetab` site
ka global chrome hain, package page ke section nahi — isliye kisi slice ki list me aaye hi
nahi. Uske saath enquiry form mobile pe ek **sheet** ban gaya, aur wo **wahi ek DOM node** hai
jo desktop pe sidebar me baithta hai (do copies = do alag form state).

**Sidebar sach me sticky ho gayi** — `position: sticky` ke saath reference ka JS bhi chahiye
tha (`StickySide.jsx`), warna lambi sidebar ka aakhir kabhi dikhta hi nahi tha. Aur buttons ki
height ab `min-height` se hai, padding se nahi (padding se banane ka matlab tha wo teen
cheezon ka jod hai — usi din `line-height: 1.55` lagate hi saare button lambe ho gaye the).

### ⚠️ Do cheezein jo maloom hain aur chuni hui hain

1. **Mobile pe email ka koi option nahi bachta** — wo sirf "Talk to a planner" me tha, jo
   patti ke aane se chhup jaata hai. Client: _"no email, only mobile and whatsapp"_.
2. **D-67 wala CTA button mobile pe kahin nahi le jaata** — wo `#enquiry` pe jaata hai, aur
   mobile pe wo form chhupa hua hai. Client ne us din ke liye chhod diya.

### Khule items — ginti ke hisaab se

| #                          | Kya                                                                              | Andaza     |
| -------------------------- | -------------------------------------------------------------------------------- | ---------- |
| **A-12**                   | CI green ho hi nahi sakti — ubuntu pe na Mongo hai na API. **Har commit pe red** | aadha din  |
| **A-14**                   | `What's Included` bhi apne tab me jaana chahiye                                  | 1-2 ghante |
| **A-15**                   | Design-check ki dono script me blind spot                                        | 2-3 ghante |
| **Enquiries inbox**        | All Enquiries · Detail · Export CSV — data bhar raha hai, screen nahi hai        | 1-2 din    |
| **Q-9**                    | Chhoti inline lines — `TAB_NOTE` (Andaman-specific), catbar ki line              | client     |
| **A-9**                    | Pages aur Posts ki screens abhi bhi "abhi nahi bana" pe                          | —          |
| **A-16 ka optional hissa** | `UPLOAD_DIR` repo ke bahar — ab blocker nahi                                     | client     |

⚠️ **A-12 ab pehle se zyada chubhti hai** — 2 Sep ko 30 commit push hue, aur CI un sab pe red
aayegi. Wo red **environment** ki wajah se hai, code ki nahi (local pe 624 test green the).

### 2 Sep ke teen sabak

**Jawab na aana "na" nahi hota.** `hotelCategory` wala gap maine khud dekha, khud poochha, aur
jawab na aane pe chhod diya. Client ne usi din wo field `Package` se bana li — aur usme
packages aane lage. Poochh kar **rukna** aur poochh kar **chhod dena** do alag cheezein hain.

**Base badlo to dekho uspe kaun khada hai.** `.btn` ka base bada karne se header ke buttons
bhi bade ho gaye, jo client ne maanga hi nahi tha — _"header ka style kyu change kiya kal, i
didnt ask for that"_. Reference me do class thi (`b` aur `b-s`), hamare paas ek hi.

**Purani doc ki baat bhi jaanch kar hi aage badhao.** A-16 ka "UPLOAD_DIR bahar le jao" wala
kaam maine bina sawaal kiye aage badha diya kyunki wo doc me likha tha. Client ne poochha
"kyun?" — aur jaanchne pe wo zaroori nikla hi nahi.

---

## 1 Sep ka handoff (itihaas)

**Us din kya hua:** client ne ek 15-item list di (7 public site + 6 admin + reviews + similar +
enquiry forms). **Poori list ban gayi**, aur uske baad client ne live chala kar chaar aur
baatein kahin. Kul **11 commit**. 619 tests pass, lint aur format clean, admin build green.

### Client ne live chala kar jo chaar baatein kahin (sab ho chuki)

1. **Reviews Packages ka submenu nahi, apna menu hona chahiye** — unhone pehli baar me hi
   "one menu in sidebar" kaha tha, maine galat padha. Ab `/reviews` top-level hai
2. **Enquiry form reference se poora match kare** — paanch cheezein chhoot gayi thi:
   Hotel category ka dropdown (jo daam badalta hai), placeholder, `.bkg__two` jodi, `optional`
   tag, aur button ke neeche wali `<small>` line
3. **`From price` me range dikhao, sirf sasta nahi** — ab `₹24,999 – ₹49,999`
4. **"did i ask to add unnecessary things?"** — maine `Built-in fields not in this form` wala
   panel bina maange bana diya tha. Hata diya; unhone jo maanga tha (type dropdown me
   `Package`) wahi bana

### ~~Pehle ye do, warna waqt zaya hoga~~ → ✅ **ho chuka**

> Migration 016 aur 017 **1 Sep ko hi apply ho gayi thi** (17/17, `pending: 0`). Ye kadam
> ab dobara nahi karna — upar 3 Sep wale section me current haalat likhi hai.

1. **`docker compose up -d mongo` aur `pnpm dev`** — teenon apps. `/api/health` pe
   `migrations.pending: 0` dikhna chahiye. Aaj **do nayi migration** judi hain (016 · 017),
   to pehli baar `pnpm cms migrate` chalani padegi.
2. **`pnpm cms migrate` chalao** — 016 aur 017 dono me **roles ka permission sync** hai.
   Bina uske `Packages ▸ Reviews` aur `Enquiries ▸ Enquiry Forms` **menu me dikhenge hi
   nahi** (migration 004 applied ho chuki hai, to naye permission ka koi aur raasta nahi).
   Ye failure chup hai — koi error nahi aata, bas item gayab rehta hai.

### ~~⏳ Ek sawaal jiska jawab nahi aaya~~ → ✅ **2 Sep ko band** (`41e61f5`)

> Jawab kabhi nahi aaya, aur **chhod dena hi galti thi** — client ne us beech wo field
> `Package` se bana li aur usme packages aane lage. Ab `Hotel category` dropdown me hai
> (`source: 'categories'`). Neeche wala text us waqt ka hai.

**`Hotel category` unke form me nahi hai** (wo field baad me juda, aur purane form naye
default nahi uthate). Maine poochha tha ki use bhi `Add a field` ke dropdown me daal doon
ya nahi — jawab nahi aaya. **Ek line ka kaam hai** (`ADDABLE` me ek entry,
`FormBuilder.jsx`), par jaan-boojh kar nahi kiya: client ne sirf `Package` kaha tha, aur
usi din wo bina maange kaam karne pe tok chuke the.

⚠️ Iske bina wo reference wala **daam badalne wala dropdown** apne form me daal hi nahi
sakte — yaani enquiry form ka sabse kaam ka hissa unke paas nahi hai. Kal pehla sawaal yahi
poochho.

### Client ko ye chaar cheezein batani hain

| #   | Kya                                                                                    | Kyun                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Trip schema ek checkbox pe hai** — `Edit Package ▸ SEO ▸ Emit Product + Trip schema` | Wo field Slice 3 se maujood tha aur aaj tak kuch karta hi nahi tha. Default **off** hai, to purane packages pe wo tick karni padegi                                                                                                                      |
| 2   | **Enquiry ka mail abhi jaata nahi** — SMTP Phase 0 se blocked                          | Submissions `enquiries` collection me store ho rahi hain, par unhe **dekhne ki screen nahi** hai. Ye client ka faisla tha ("only Enquiry Forms"), par unhe pata hona chahiye ki abhi wo enquiries sirf DB me hain                                        |
| 3   | **Hero popup ka backdrop ab halka safed hai** (P1)                                     | Client ne "shadow hatao" kaha tha. Poora transparent nahi kiya — tab peeche ka page image ke aar-paar padha jaane lagta. Agar wo sach me poora transparent chahte hain, wo ek line hai                                                                   |
| 4   | **`optional` ka tag ab kahin nahi hai**                                                | Client ne uska checkbox hatane ko kaha, aur uske saath maine poora code bhi hata diya (bina UI ke wo config kahin se set hi nahi ho sakti thi). Nateeja: reference me `Special request` ke label ke aage jo halka `optional` hai, wo page pe nahi aayega |

### Khule items — ginti ke hisaab se

| #                   | Kya                                                                               | Andaza     |
| ------------------- | --------------------------------------------------------------------------------- | ---------- |
| **A-12**            | CI green ho hi nahi sakti — ubuntu pe na Mongo hai na API. **Har commit pe red**  | aadha din  |
| **A-14**            | `What's Included` bhi apne tab me jaana chahiye — wo bhi page ka ek section hai   | 1-2 ghante |
| **A-15**            | Design-check ki dono script me blind spot                                         | 2-3 ghante |
| **Enquiries inbox** | All Enquiries · Enquiry Detail · Export CSV — data bhar raha hai, screen nahi hai | 1-2 din    |
| **Q-9**             | Chhoti inline lines — `or similar`, `TAB_NOTE` (Andaman-specific), catbar ki line | client     |
| **A-9**             | Pages aur Posts ki screens abhi bhi "abhi nahi bana" pe                           | —          |

### Aaj ke do sabak

**Client jo shabd me kehta hai, wahi maano — apna "behtar" version nahi.** Unhone
_"one menu in sidebar"_ kaha; maine use "Packages ke submenu me ek item" padh liya kyunki
**data** ke hisaab se reviews baaki master lists jaisi hi hai. Par unki baat daayre ki thi,
data ki nahi.

**Aur jo nahi maanga, wo mat banao — chahe wo unki hi dikkat solve karta ho.** Unhone poochha
ki missing field admin me dikhe; maine ek poora "Built-in fields not in this form" panel bana
diya. Unhone tok diya, aur jo maanga tha wo do line ka tha (type dropdown me ek entry). Dikkat
sahi pakdi thi, hal apne mann se bana liya.

### Kal ka sabse kaam ka sabak

**Design ki "galti" pehle apna hi na-samajhna hoti hai.** `.prow` ke responsive rules dekh
kar maine unhe likhne ki galti samajh liya (1180px pe kam column, 1024px pe zyada) aur apne
do breakpoint laga diye. Wo galat tha: 1024px pe **sidebar hat jaata hai**, isliye card ka
column chauda ho jaata hai. Reference ke naap sahi the.

⚠️ Aur wahi purana: **`updatePackageDefaults()` ka `$set` ek whitelist hai.** `rating` usme
jodna bhool gaya tha — Zod pass karta, API 200 deti, admin "Saved." dikhata, aur value DB tak
pahunchti hi nahi. Test ne pakda. Ye is repo ki chauthi baar wali shakl hai (D-64, D-65,
D-68). Whitelist ke upar ab chetavni likhi hai.

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

**Agla kaam: Slice 6 ka bacha hua hissa** — sirf `reviews[]` + rating
(`ratingValue`/`ratingCount`).

**31 Aug — `goodToKnow[]` banega hi nahi (D-68).** Client ne khud poochha: _"good to know ke
section ko ham heading section me dal sakte hai kya?"_ Poochhne pe pata chala ki unka
good-to-know content **har package pe same** rehta hai.

spec 007 §2.1 ne **ulta maan liya tha** — "har itinerary ki ferry wali majboori alag hoti
hai" — aur usi maani hui baat pe ek per-package repeatable field khada tha. Ab wo content
`sectionLabels.booking.description` me jaata hai; wo box **D-65 me pehle se ban chuka tha**
aur page pe theek wahin chhapta hai jahan ye hissa hona chahiye (heading ke neeche, booking
steps se upar). Sirf ek cap badla: description 1000 → **3000 chars**.

⚠️ **Ek bug isi se nikla (usi din theek):** section ka guard description ko **ginta hi nahi
tha** — client ne box bhara aur page pe kuch nahi aaya. Guard sirf section ke apne data ko
dekhta tha (`steps.length > 0 || cancellationText`), aur client ke paas dono khaali the, to
poora section gir gaya. **Yahi kami chhe jagah thi** (itinerary · included · faq · booking ·
hotels · addOns); ab har guard me `wrote(key)` hai.

⚠️ **Ye is codebase ka pehchana hua failure mode hai — teesri baar.** D-64 (transfer chip),
D-65 (`cancellationText` payload me nahi tha), aur ab ye. Teenon baar lakshan ek: admin me
text bhara dikhta hai, page pe kuch nahi, koi error nahi. Teenon baar **client ne pakda,
kisi test ne nahi** — `apps/web` pe koi test layer hai hi nahi. Naya field jodo to uske
**teenon** consumer dekho: payload · guard · render.

⚠️ **Us box me sub-headings nahi ban sakte** — wo plain text hai (XSS ka wahi tark jo FAQs
aur footer text blocks pe hai). Design ke `h3` ("The ferries decide this itinerary") usse
nahi banenge. Jis din client ko wo chahiye, D-68 dobara khulega — aur tab tak koi bekaar
field DB me nahi padi. Ulta case (field bana kar hatana) **D-54** me ho chuka hai aur usme
migration likhni padi thi.

### 🔴 A-12 — CI green ho hi nahi sakti (31 Aug ko pakda, **theek NAHI kiya**)

Pehli baar `pnpm build` local pe chalane par nikla. `ci.yml` `ubuntu-latest` pe chalta hai
aur usme **koi service container nahi** — na Mongo, na API. Isliye:

- `pnpm test` ❌ integration tests ko chalta Mongo chahiye
- `pnpm build` ❌ `apps/web` ka layout build ke waqt `getSettings()` fetch karta hai

Build wala aankhon se dekha: API band thi to `next build` `/_not-found` pe teen baar
60-second timeout kha kar gira; API chalu karte hi green ho gaya.

⚠️ **Har commit pe red hai, isliye red hona ab koi signal hi nahi raha** — us haalat me ek
din koi asli failure bhi ignore ho jaayega (A-11 wali flaky-test chetavni ka bada roop).

Poora tark aur mashwara `09-OPEN-ITEMS.md` → **A-12** me. Andaza: aadha din.

### ✅ 1 Sep — section ki description ab **rich text** hai (D-69, migration 015)

"Good to know ka style" wala sawaal band. Har section pe wahi TipTap editor jo Overview pe
hai — Bold · Italic · **H3** · bullet list · numbered list · link. `heading` plain hi hai.

**Client ne mera mashwara palta, aur wo sahi the.** Maine "ek jagah rich, baaki plain"
suggest kiya tha; unka jawab: _"agar 7 section hai to yahi rahenge? aage jake new pages add
honge… aur senior suggest to use editor for each"_. Meri asymmetry ka koi principled kaaran
tha hi nahi.

⚠️ **Par "naye pages" iska hal nahi hai** — `sectionLabels` ki keys `PACKAGE_SECTIONS` se
aati hain, wo is theme ke fixed sections ke liye hai. Naye pages ka jawab **Phase 5 blocks**
hai. Use generic banana blocks ka ghatiya duplicate khada karna hoga.

**Teen cheezein yaad rakhne laayak:**

1. **`headingLevel` prop** — description page ke `<h2>` ke neeche chhapti hai, to wahan H3.
   H2 daalne se document ka outline toot-ta hai.
2. **`isEmptyDoc()`** — D-65 ka "khaali = line hata do" isi pe tika hai. TipTap khaali editor
   ko `{content:[{type:paragraph}]}` chhod jaata hai, jo `content.length` se "bhari hui"
   lagti hai. Uska apna test hai.
3. **Rich text ≠ HTML** — TipTap JSON store karta hai, isliye XSS ban hi nahi sakta (WP ko
   `wp_kses` isliye chahiye ki wo HTML store karta hai). Keemat: table/iframe nahi ja sakte.
   Client ne kaha abhi wo kisi design me hai hi nahi.

**Usi din do aur cheezein (client):**

1. **Section Headings ab tabs me hai** — saat section ek doosre ke neeche the. Tabs ka ek
   chhupa faayda bhi hai: **ek waqt pe sirf ek TipTap mount hota hai** (D-69 me wo "keemat"
   ki tarah likha tha; tabs ne apne aap hal kar diya). Tab badalne se kuch nahi khota —
   data `labels` state me hai, Save poora object bhejta hai.
2. **Block type ab dropdown hai** — Paragraph · Heading · Sub-heading. Pehle ek hi toggle
   button tha aur "Paragraph" naam ki koi cheez dikhti hi nahi thi.

⚠️ **"All headings" nahi diye ja sakte:** `h1` page pe ek hi hota hai (package ka title),
`h2` section ka apna heading hai (description uske andar hai), aur `h5`/`h6` theme render
hi nahi karti — `RichText` level ko **2–4 me clamp** karta hai. Isliye sections pe
`[3, 4]`, Overview pe `[2, 3]`.

⚠️ **Client ko ek kaam haath se karna hai:** migration ne har line ko **paragraph** banaya —
wo pata hi nahi kar sakti ki kaunsi line heading thi. Unhone sub-headings plain lines me
likhi hain ("The ferries decide this itinerary"); unhe ek baar H3 mark karna hoga. Shabd sab
bache hain.

### ✅ A-13 band — `Section Headings ▸ Good to know` tab me (1 Sep)

`bookingSteps` aur `cancellationText` poore raaste par pehle se the — schema, model,
service, public payload, theme, aur API ke test bhi. **Bas bharne ki jagah nahi thi.**

> **Sabak (is repo me naya):** field ka poora raasta bana dena kaafi nahi hai. Jab tak use
> bharne ki **jagah** na ho, wo field khaali rehti hai — aur client wo content kahin aur,
> galat shakl me daal deta hai. Yahan client ne chaaron step aur poori cancellation policy
> `sectionLabels.booking.description` me type kar di thi, jahan wo saade paragraph ban gaye.
> Uska ek aur nateeja bhi tha: dono khaali hone se hi 31 Aug wala "Good to know render hi
> nahi hota" bug bana tha.

⚠️ **Maine pehle iska alag sidebar item banaya tha, aur client ne palta:**

> _"booking and cancellation ka submenu kyu bana diya — look good to know ka single design
> hai… section heading me good to know ko hi design kar do na"_

Wo sahi hain. Page pe "Good to know before you book" **ek hi section** hai; uska content do
sidebar items me baantna client se ye ummeed karta tha ki wo **hamara data model** yaad rakhe.

> **Niyam jo isse nikla:** admin ka dhaancha **page ke section** follow karta hai,
> **collection ke field** nahi. Ye pehle bhi laga tha (D-59 me FAQs/policies alag, D-44 me
> footer ke columns ek screen pe) par likha nahi gaya tha. Maine yahan ulta kiya — do alag
> field dekhe aur do alag screen bana di.

⚠️ **Isi tark se A-14 khula hai:** `What's Included` bhi apna sidebar item hai jabki wo bhi
page ka ek section hai. Abhi nahi kiya — client ne sirf "Good to know" kaha, aur bina
poochhe doosri screen hatana wahi galti hoti jo D-43 me "Header tab bina poochhe bana diya"
pe hui thi.

Panel FAQs wale hi pattern pe hai. **Drag zaroori hai, sajawat nahi** — page pe ye ek
numbered list (`ol.steps`) hai aur number CSS counter se aata hai, to step 2 aur 3 ka kram
badalne ka koi doosra raasta hi nahi.

⚠️ **Client ka data hilaya gaya** — description me se wo nau node hataye jo ab sahi field me
hain. Bina uske wo text page pe **do baar** chhapta (wahi shakl jo 31 Aug ko hotels ki
description pe hui thi).

**Page ka structure ab reference se node-ke-node milta hai:**
`h2 · h3 p · h3 p · h3 · ol.steps(4× li>p) · p.muted`

### ✅ Editor me poora `h1`–`h6` (1 Sep, client)

Dropdown me ab sirf tag ke naam hain — `P`, `H1`…`H6`. Maine pehle range seemit rakhi thi
(`[3,4]` / `[2,3]`) aur naam likhe the ("Heading"); client ne dono theek kiye.

⚠️ **Iske bina feature toota hua hota:** `RichText` level ko **2–4 me clamp** karta tha —
H1 chunne pe page pe H2 banta, bina error ke. Usi din teen cheezein saath badlin: renderer
ka clamp 1–6, base heading rule me `h6` (wo `h1…h5` tak hi tha), aur `.blk h1/h5/h6` ki
CSS. `.blk h1` jaan-boojh kar `.blk h2` se **chhota** hai — page ka asli `<h1>` package ka
title hai.

### ✅ "Good to know" ka style — ho gaya (1 Sep)

Ye 31 Aug ki shaam ka khula sawaal tha. Jawab: **rich text editor** (D-69) — teen raaston
me se #1 aur #3 ka mel. Client ne saath me tabs, poora `h1`–`h6`, aur A-13 ka panel bhi
maanga; teenon upar likhe hain.

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

**Admin ka responsive bhi ho gaya (31 Aug).** `admin-design.html` ke dono media block ab
maujood hain — `media-diff.mjs` admin pe **0 drift** deti hai. Teen jagah gaya, kyunki is
codebase me media rule apne base rule ke saath rehta hai: `Sidebar.css` (rail 52px),
`layout.css` (`.main` ka margin + padding), `primitives.css` (`.row2`/`.row3` ek column).

⚠️ **Ek jagah reference se jaan-boojh kar aage gaye.** Reference 782px pe sirf sidebar ki
**width** badalta hai, labels nahi chhupata — wahan wo `overflow-x: hidden` se kat jaate
hain. Hamare yahan labels chhupane ka kaam `body.collapsed` karta hai, aur 782px pe body
collapsed hoti hi **nahi**. Sirf width copy karne pe rail me aadha kata text dikhta —
"Packa", "Setti". Isliye wahi selector list `body:not(.collapsed)` ke saath dobara likhi
hai; **dono list saath badalni hain.**

**`media-diff.mjs` ab kai CSS files le sakti hai** (doosre argument se aage). Pehle wo sirf
`globals.css` pe chalti thi, isliye admin ka milaan ho hi nahi sakta tha — admin ki CSS
`styles/`, `components/` aur `screens/` me bant-ti hai.

**Handoff ke sabak permanent docs me utar diye gaye** — CSS ke chaar chup failure ab
`07-CONVENTIONS.md` **§9** me hain (ek-class override ka load order · missing CSS var ka
transparent · `:has()` guard media me · "reference ka media block kis state pe tika hai"),
aur admin ka 782px wala deviation `04-ADMIN-UX.md` ki table me.
`.claude/HANDOFF-style-pass.md` ab delete kiya ja sakta hai.

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
