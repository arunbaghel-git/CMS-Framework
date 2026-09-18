# Session Log

Append-only. Naya entry **upar** add karo.

Format:

```
## YYYY-MM-DD — <ek line summary>

**Kya hua:** …

**Faisle:** … (ya "koi nahi")
**Agla:** …
```

---

## 2026-09-01 — Section ki description ab rich text (D-69); do gap pakde

**Kya hua**

Client ne D-68 wale box me content likha aur seedha sawaal poochha: _"if I need to style any
text how I will style in textarea… why don't we replace it with a text editer"_ — saath me
ye bhi ki WordPress kaunsa editor use karta hai.

**Maine pehle galat mashwara diya, client ne theek kiya**

Maine suggest kiya tha: `sectionLabels` plain rakho, aur ek alag global rich field bana do —
yaani "ek jagah rich, baaki plain". Client ka jawab:

> _"agar 7 section hai to yahi rahenge? aage jake new pages add honge aur style bhi change
> hoga to sabke according banana hoga, itinerary-v3 page akela nahi hai. aur senior suggest
> to use editor for each"_

Wo sahi hai. Meri asymmetry ka koi principled kaaran tha hi nahi — sirf ye ki aaj zaroorat
ek hi jagah dikhi. Aur `CLAUDE.md` ki pehli line hi framework ka vaada hai; sirf
`itinerary-v3` ke hisaab se banana usse takraata hai.

> **Sabak:** "aaj sirf yahan chahiye" ek design principle nahi hai. Jab do jagah ek hi cheez
> kar rahi hon, unhe alag rakhne ke liye **kaaran** chahiye — "abhi zaroorat nahi thi" kaaran
> nahi hai.

**Par ek cheez maine saaf ki, aur wo zaroori thi**

Client ki "naye pages aayenge" wali chinta jayaz hai — par uska jawab **ye change nahi hai**.
`sectionLabels` ki keys `PACKAGE_SECTIONS` se aati hain; wo is theme ke fixed sections ke
liye hai. Naye pages ka jawab plan me pehle se hai: **Phase 5 blocks**. Use generic banane ka
matlab hota blocks ka ek ghatiya duplicate khada karna.

**WordPress wala jawab (client ne poochha tha)**

WP **HTML store** karta hai — Classic me TinyMCE ka Text tab, Gutenberg me HTML + comment
delimiters aur Custom HTML block — aur usse `wp_kses` + `unfiltered_html` capability se
sambhalta hai.

TipTap HTML store hi nahi karta: JSON ka ped store karta hai aur theme usse React elements
banati hai. Isliye XSS **filter** nahi hota, wo **ban hi nahi sakta**. Keemat ye hai ki table
ya iframe nahi ja sakte — client ne kaha abhi wo kisi design me hai hi nahi, to us par focus
nahi kiya (raasta band nahi kiya).

### Teen cheezein jo karte waqt nikleen

**1. Heading level.** Editor ka heading button H2 banata tha, par description page ke `<h2>`
ke **neeche** chhapti hai — wahan aur H2 outline tod deta. Ab `headingLevel` prop hai;
sections pe H3, Overview pe H2. Button ka label bhi wahin se banta hai.

**2. `isEmptyDoc()`.** D-65 ka "khaali = line hata do" string me `''` pe tika tha. Doc me
"khaali" teen shakl leta hai, aur teesri TipTap khud banata hai — editor kholo aur band kar
do → `{content:[{type:'paragraph'}]}`. Wo `content.length` dekh kar bhari hui lagti hai.
Uska apna test hai.

**3. `RichTextDoc` alag kiya.** Renderer pehle sirf envelope se doc nikaal sakta tha; doosri
jagah use karne ka ek hi raasta bachta — nakli envelope banana.

### Do gap jo client ke data ne dikhaye

**A-13 — `bookingSteps` aur `cancellationText` ka admin me koi UI hai hi nahi.**

DB me client ka content padha to dikha ki unhone booking ke chaaron step aur poori
cancellation policy **description me** type kar di hai. Wajah saaf hai: dono field schema,
service, payload aur theme me maujood hain, par **koi screen nahi** jahan se bhare jaayein.

Nateeja live hai — wo text galat field me baitha hai, `ol.steps` ki numbered list nahi ban
raha, aur inke khaali hone se hi 31 Aug wala "Good to know render hi nahi hota" bug bana tha.

**Aur ek baat jo migration nahi kar sakti** — client ne sub-headings **plain lines** me likhi
hain ("The ferries decide this itinerary"). Migration har line ko **paragraph** banati hai;
wo pata hi nahi kar sakti ki kaunsi line heading thi. Shabd sab bache hain, par heading client
ko ek baar haath se lagani hogi.

**Nateeja:** 583 tests (2 naye) · migration **015** · lint · format · admin build clean.
Live verify kiya — page pe ab 14 alag paragraph aate hain, ek chipke hue block ki jagah.

### Usi din aage — tabs, poora h1–h6, aur A-13 ka panel

Client ne editor chalane ke baad teen cheezein kahin. Teenon me maine pehle jo choose kiya
tha wo **kam** nikla, aur client ne theek kiya.

**1. Tabs.** Saat section ek doosre ke neeche the. Ab har section ka apna tab. Ek chhupa
faayda: **ek waqt pe sirf ek TipTap mount hota hai** — wo cheez D-69 me "keemat" ki tarah
likhi thi, aur tabs ne apne aap hal kar di.

**2. Dropdown — pehle naam, phir range.** Maine "Heading"/"Sub-heading" likha tha (target
user non-technical hai) aur range `[3,4]`/`[2,3]` rakhi thi. Client ne dono theek kiye:
_"html tag jaisa kyu nahi hai"_, phir _"only ese dikhe h1 to h6 and p not heading h3 i need
all"_.

Mera tark aaj bhi sach hai — page pe `h1` ek hi hona chahiye, aur section ki description
`h2` ke andar hai. **Par faisla client ka hai**, ye unke apne page ka content hai.

⚠️ **Aur ek cheez ke bina ye feature toota hua hota:** `RichText` level ko **2–4 me clamp**
karta tha. Us clamp ke rehte editor me H1 dena ek chup jhooth hota — client H1 chunta, page
pe H2 banta, bina kisi error ke. Isliye usi din renderer ka clamp 1–6 hua, base heading rule
me `h6` juda (wo `h1…h5` tak hi tha), aur `.blk h1/h5/h6` ki CSS likhi gayi.

> **Sabak:** editor me koi option dena aadha kaam hai. Doosra aadha renderer me hai. Dono ek
> saath na badlein to option to dikhta hai par karta kuch aur hai — aur wo failure chup hoti
> hai.

**3. A-13 ka panel ban gaya** — `Packages ▸ Booking & Cancellation`.

`bookingSteps` aur `cancellationText` poore raaste par pehle se the: schema, model, service,
public payload, theme, aur API ke test bhi. **Bas bharne ki jagah nahi thi.**

> **Sabak (is repo me naya):** field ka poora raasta bana dena kaafi nahi hai. Jab tak use
> bharne ki **jagah** na ho, wo field khaali rehti hai — aur client wo content kahin aur,
> galat shakl me daal deta hai.

Client ne screenshot bheja tha jo maine pehle "design theek nahi dikh raha" samajh kar dekha.
Structure milane pe pata chala ki **wo screenshot hamara page tha hi nahi** — wo reference
design ka tha. Farak sirf aakhir me tha: reference me `ol.steps` ke chaar numbered cards aur
cancellation ki line, hamare page pe unki jagah nau saade paragraph.

**Client ka data hilana pada** — description me se wo nau node hataye gaye jo ab sahi field
me hain. Bina uske wo text page pe **do baar** chhapta (wahi shakl jo 31 Aug ko hotels ki
description pe hui thi).

**Nateeja:** page ka structure ab reference se **node-ke-node** milta hai —
`h2 · h3 p · h3 p · h3 · ol.steps(4× li>p) · p.muted`. 583 tests · lint · format · admin
build clean.

### Aur usi din — alag submenu hataya, sab ek tab me

Maine A-13 ke liye ek **alag sidebar item** bana diya tha (`Packages ▸ Booking &
Cancellation`). Client ne turant pakda:

> _"booking and cancellation ka submenu kyu bana diya — look good to know ka single design
> hai… ye alag se submenu nahi banana tha, section heading me good to know ko hi design kar
> do na"_

**Wo sahi hain, aur meri galti ka shape saaf hai:** maine **data model** dekh kar screen
banayi. `sectionLabels` ek jagah hai aur `bookingSteps`/`cancellationText` doosri, to maine
do screens bana din. Par page pe "Good to know before you book" **ek hi section** hai —
client ko wo do jagah dhoondhne ka koi kaaran nahi.

> **Niyam (ab likha hua):** admin ka dhaancha **page ke section** follow karta hai,
> **collection ke field** nahi.
>
> Ye is repo me pehle bhi laga tha, bas naam nahi mila tha: D-59 me FAQs aur policies isliye
> alag hue ki page pe wo alag cheezein hain, aur D-44 me footer ke columns isliye ek screen
> pe aaye ki page pe wo ek footer hai. Dono baar tark page se aaya tha, collection se nahi.

Ab sab kuch `Section Headings ▸ Good to know` tab me hai — heading, description, steps,
cancellation. Ek Save.

**Do chhote nateeje jo isme nikle:**

- `BookingPanel` apna `.panel` banata tha. Ab wo doosre panel ke **andar** hai, to card ke
  andar card ban jaata — do border, do background. Wrapper `.field` kar diya.
- **Save poora bhejta hai** (`sectionLabels` + booking dono), chahe kaunsa tab khula ho.
  Sirf khule tab ka data bhejna ek chup bug banata: client teen tab me kaam karta, Save
  dabata, aur do ka kaam gayab ho jaata.

⚠️ **Usi niyam se A-14 khula:** `What's Included` bhi apna sidebar item hai jabki wo bhi page
ka ek section hai (`#included`) — yaani us section ka content abhi bhi do jagah hai. Abhi
nahi kiya: client ne sirf "Good to know" kaha tha, aur bina poochhe doosri screen hata dena
wahi galti hoti jo D-43 me "Header tab bina poochhe bana diya" pe hui thi.

### "Good to know" ka spacing — teen wajah, aur do blind spot

Client: _"good to know ka design abhi match nahi hua, thik kar spacing ka issue hai"_, saath
me reference ki file dobara bheji. Wo repo wali se **byte-ke-byte same** nikli — to sawaal
reference ka tha hi nahi.

Selector-by-selector CSS milane pe dono lagbhag ek jaise the. Farak **base rules** aur
**markup** me tha:

**1. `p { margin: 0 }` hamare paas tha hi nahi.** Reference ka apna rule hai. Uske bina har
`<p>` browser ke default `margin: 1em 0` pe chal raha tha — har jagah 16px. Aur ye sirf is
section ka masla nahi tha: `.blk p`, `.steps p`, `.faq p` — teenon reference me isi reset pe
tike hain.

Reset lagne ke baad do rules bemaani ho gaye aur hata diye: `.rt p { margin: 0 0 14px;
line-height: 1.75 }` aur `.rt-sec > *:last-child { margin-bottom: 0 }`. **Dono usi kami ki
bhurpayi the** — maine wo D-69 me khud likhe the, bina ye jaane ki asli kami kahin aur hai.

**2. TipTap ka trailing khaali paragraph.** DB me description ke aakhir me ek khaali `<p>`
baitha tha — ProseMirror heading ke baad wo apne aap chhodta hai. Page pe usse ~23px ki bina
wajah ki jagah banti thi. Ab write pe girta hai (`richDocSchema` ka transform, **sirf
aakhir se** — beech wala client ka faisla ho sakta hai) aur renderer bhi use skip karta hai
(purana data ke liye, migration se behtar).

**3. `.steps` ka `padding: 0`.** Client ne ye khud pakda: _"reference me andar hai hamare me
align ho rha hai"_. Reference me `.steps` pe koi padding likhi hi nahi, aur uska global reset
sirf `ul` pe hai — `ol` pe nahi. Yaani wahan `<ol>` ka browser default 40px bacha rehta hai.
Ab wo `padding-left: 40px` likha hua hai (`.itin` bhi yahi karta hai) — browser ke bharose
nahi chhoda.

### Do blind spot — A-15

> Teenon me se **ek bhi** script se nahi pakda gaya. Dono baar client ne pakda.
>
> | Kya chhoot jaata hai                       | Kyun                                                                                          |
> | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
> | bare element selectors (`p`, `ul`, `body`) | `css-diff.mjs` me hardcoded class-prefix allowlist; `media-diff.mjs` sirf `@media` dekhti hai |
> | hamari taraf ki **extra** property         | script sirf ref → ours milaati hai, ulta nahi                                                 |
>
> Dono me se koi bhi ek **page-wide** layout badal sakti hai. `09-OPEN-ITEMS` → **A-15**.

### Aur ek sabak — comment ka na hona saboot nahi hai

Maine `.steps b` ka `margin-bottom` 4px se 2px kar diya tha, ye soch kar ki wo drift hai
"kyunki uspe koi comment nahi tha". Client ne use wapas 4px kiya, ab comment ke saath:
_"i am doing it 4px dont change it"_.

Wo unka faisla hai (R15). **Comment ka na hona ye saabit nahi karta ki value galti se alag
hai** — wo sirf itna batata hai ki wajah likhi nahi gayi. Reference se milane se pehle
poochhna chahiye tha.

## 2026-08-31 (raat) — `goodToKnow[]` banaya hi nahi gaya (D-68)

**Kya hua**

Slice 6 shuru karne se pehle client ne khud poochha: _"good to know ke section ko ham
heading section me dal sakte hai kya?"_

Sawaal ne theek uss jagah pe ungli rakhi jahan spec ne ek baat **maan** li thi. spec 007
§2.1 kehti thi ki us section me do kism ka content hai — do `h3` "IS package ke baare me"
hain aur booking/cancellation global hai — aur isi par ek per-package repeatable field
(`goodToKnow[]`) khada tha. Tark tha: _"har itinerary ki ferry wali majboori alag hoti hai."_

Poochhne pe client ka jawab: **"same rahega."**

Yaani wo per-package data hai hi nahi. Spec ki maani hui baat galat thi, aur us par ek
repeater field + admin panel + tests + theme code banne wale the.

**Ab wo content kahan jaata hai**

`packageDefaults.sectionLabels.booking.description` — wo box **D-65 me pehle se ban chuka
tha**, khaali pada tha, aur page pe theek wahin chhapta hai jahan ye hissa hona chahiye:

```
Good to know before you book        ← sectionLabels.booking.heading
<good-to-know ka content>           ← sectionLabels.booking.description   ← yahan
1. Tell us your dates…              ← packageDefaults.bookingSteps
Cancellations more than 30 days…    ← packageDefaults.cancellationText
```

Sirf ek badlaav laga: description ka cap **1000 → 3000 chars**. 1000 ek intro _line_ ke naap
ka tha; ab usme do-teen paragraph jaate hain. (`cancellationText` pehle se 5000 pe hai —
usi shreni ka content.)

**Koi naya code nahi. Koi migration nahi.**

> **Sabak:** spec me likhi hui baat aur client ka asli case do alag cheezein ho sakti hain.
> Yahan spec ka tark padhne me bilkul theek lagta tha (ferry ki majboori sach me alag hoti
> hai) — par is client ke content me wo farak hai hi nahi. **Field banane se pehle ek line
> ka sawaal poochh lena ek poore panel se sasta pada.** Wahi lakeer D-57/D-58 pe thi: jo
> cheez pehle se hai, use dobara mat poochho.

⚠️ **Ek hadd jo saaf likhi hui hai:** us box me **sub-headings nahi** ban sakte. Wo plain
text hai (XSS ka wahi tark jo FAQs — D-59 — aur footer text blocks — D-44 §8 — pe hai), aur
page pe ek `<p>` banta hai jisme line breaks `pre-line` se zinda rehte hain. Design ke `h3`
usse nahi banenge. Jis din client ko wo chahiye, D-68 dobara khulega.

Ulta case pehle ho chuka hai: **D-54** me `availability` bana kar hataya gaya tha aur uske
liye migration likhni padi. Yahan kuch bana hi nahi, to hatane ko bhi kuch nahi.

**Slice 6 me ab sirf `reviews[]` + rating bacha hai**, aur wo spec 007 §9 #8 pe ruka hai
(rating haath se likhi jaaye ya `reviews[]` se gini jaaye — mashwara **haath se**, kyunki
design me `412 traveller reviews` hai par cards teen hi hain).

**Nateeja:** 581 tests · lint · format clean. Sirf ek cap aur docs sync.

## 2026-08-31 (raat) — Admin ka responsive; handoff ke sabak permanent docs me

**Kya hua**

Style session ne public ka kaam poora kiya aur admin jaan-boojh kar chhoda (client: "admin
ka CSS baad me"). Aaj wo bacha hua block laga, aur handoff file ko delete karne laayak
banaya gaya.

**Kaam khud chhota tha — `admin-design.html` me kul do media block hain, ek gayab tha:**

```
Sidebar.css     @media 782px  →  body:not(.collapsed) .sidebar 52px
layout.css      @media 782px  →  .main ka margin-left + padding 8px 12px 40px
primitives.css  @media 782px  →  .row2 / .row3 ek column
```

Zaroori sab pehle se maujood tha — `--sidebar-w-collapsed: 52px`, `.main` ka margin,
`.row2`/`.row3`, aur `body.collapsed` wali aadat. Sirf block likhna tha.

**Par ek gotcha tha jo sirf reference padhne se nahi dikhta**

Reference 782px pe **sirf width** badalta hai, labels nahi chhupata — wahan wo
`overflow-x: hidden` se kat jaate hain. Hamare theme me labels chhupane ka kaam
`body.collapsed` wale rule karte hain (wo hamara apna add-on hai, reference me `.label`/
`.caret` chhupte hi nahi), aur **782px pe body collapsed hoti hi nahi**.

Yaani seedha copy karne pe 52px ke rail me aadha kata hua text dikhta: "Packa", "Setti".
Isliye wahi selector list `body:not(.collapsed)` ke saath dobara likhi gayi.

Duplicate jaan-boojh kar hai — CSS me do alag conditions ko bina dohraaye jodne ka koi
tareeka nahi (na nesting, na preprocessor — D-28). Comment dono jagah likha hai ki **dono
list saath badalni hain**.

> **Sabak jo naya hai:** reference ka media block akela nahi padha jaata. Wo baaki CSS ki
> **kis shart pe tika hai**, wo bhi dekhna padta hai. Yahan wo shart ek aisi class thi jo
> hamare theme me hai hi zyada (`body.collapsed` pe `.label` chhupana), aur usi se bug
> banta.

**`media-diff.mjs` ab kai file le sakti hai**

Script sirf `apps/web/app/globals.css` pe chalti thi, isliye **admin ka milaan ho hi nahi
sakta tha** — admin ki CSS `styles/`, `components/` aur `screens/` me 14 file me bantti hai.
Ab doosre argument se aage jitni bhi file do, wo jod kar ek maani jaati hain. Default
behaviour waisa ka waisa (public ka check bina argument ke chalta hai).

```bash
node .claude/scripts/media-diff.mjs .claude/docs/reference/admin-design.html \
  $(find apps/admin/src -name "*.css" | sort)
# → 0 selector ka breakpoint alag
```

Jo 9 "sirf hamare paas" nikle wo sab hamari apni screens ke hain — `.edit-grid.appearance-grid`
(1100), `.edit-grid.tax-grid` (900), `.mega-link` (900), aur ye 5 label-hiding wale (782).

**Handoff ke sabak permanent jagah pe utaare gaye**

Handoff delete hone wali file hai, aur usme do cheezein aisi thin jo baad me bhi kaam ki
hain. Pehle maine handoff ke top pe likh diya tha ki "wo apni pakki jagah pe ja chuki hain"
— **wo galat tha, tab tak gayi nahi thin.** Check karke pakda, phir sach banaya:

- `07-CONVENTIONS.md` **§9 — CSS ke chaar chup failure** (naya section): ek-class override
  ka load order · missing CSS variable ka chup-chaap transparent ban jaana · `:has()` guard
  ka media block me chhoot jaana · aur upar wala "media block kis state pe tika hai" wala.
  Saath me media-diff chalane ke teenon command.
- `04-ADMIN-UX.md` ki "Design se jo alag hai" table me 782px wala deviation.

> **Ek aadat jo yahan kaam aayi:** kuch likhne se pehle wo sach hai ya nahi, wo grep karke
> dekha. Do line ka claim tha aur dono galat nikle.

**Nateeja:** 581 tests · lint · format · admin build clean. Koi test nahi juda — CSS ke liye
is repo me koi test layer nahi hai; verify `media-diff.mjs` aur build ke output se hua.

**Ek sawaal ab bhi client pe khula hai** (style session ne uthaya tha): reference ke `body`
pe `font-size: 15px` aur `line-height: 1.55` hain, hamare paas nahi — yaani jis text pe
humne khud size nahi likha wo poore site pe ek pixel bada hai. Asar har page pe hai, isliye
bina poochhe nahi kiya gaya.

## 2026-08-31 (style pass) — public page har chaudai pe; mobile ka scroll; admin ka field gap

**Kya hua**

`HANDOFF-style-pass.md` wala kaam uthaya. **Public package page ka responsive poora ho gaya**;
admin client ke kehne pe **baad ke liye chhoda** ("admin ka CSS baad me").

Paanch commit: `217722c` (responsive + script) · `589d13f` (mobile scroll) · `74ac010`
(admin field gap) · `b5fa5d6` (handoff) · `943ed54` (client ka textarea tune).

### 1. Pehle naapne ka auzaar banaya — `.claude/scripts/media-diff.mjs`

Handoff me is jagah `node -e '...'` ka **khaali placeholder** tha, yaani wo doc apne hi
kaam ko verify karne ka tareeka nahi deta tha.

Asli kami iske peeche thi: **`css-diff.mjs` media blocks ko jaan-boojh kar hata deti hai.**
Wo sirf desktop milaati hai. Isliye responsive ka poora hissa aaj tak kisi check me aaya hi
nahi, aur breakpoints chup-chaap alag ho gaye — kisi ne kuch toda nahi tha, wo kabhi milaye
hi nahi gaye the.

Nayi script dono file ke `@media` block padhti hai aur **sirf un selectors pe bolti hai jo
hamari CSS me sach me hain** — warna reference ke doosre pages ka shor (`.hawards`,
`.vrail`, `.clogos`) asli mismatch dabaa deta hai.

### 2. "Mobile theek nahi aa raha" ki wajah CSS galat hona nahi tha

**Layout galat chaudai pe flip ho raha tha.** Script ne aath farq nikale, sab theek kiye:

| Selector                 | Reference   | Pehle            |
| ------------------------ | ----------- | ---------------- |
| `.pgl`                   | 1180 + 1024 | 1000 (ek step)   |
| `.pgl__side`             | 1024 + 760  | 1000             |
| `.ptitle` · `.ptitle__p` | 1080        | 1000             |
| `.gal`                   | 860         | 760              |
| `.inx`                   | 760         | rule hi nahi tha |
| `.itin__d` · `.itin__k`  | 860         | 860 **aur** 760  |
| `.offer__in`             | 1024        | 860              |
| `.mega--md`              | 1180        | rule nahi        |

Teen sabse kaam ke:

- **`.pgl`** reference me **do kadam** me girta hai (1180 pe sidebar 322→290px, 1024 pe
  neeche). Hamare paas ek hi step tha, isliye **1024–1180px ke beech page reference se
  milta hi nahi tha** — sidebar poori chaudi rehti thi aur content ka column nichud jaata.
- **`.gal`** ke purane 760 block me chauthe tile se aage sab `display: none` the. Yaani
  **phone pe pool ki aadhi tasveerein dikhti hi nahi thin**, jabki design me sab dikhti hain.
- **`.itin__d` ka duplicate** — wahi kaam 860 pehle se kar raha tha, to 860 ka `gap: 10px`
  phone pe chup-chaap `8px` ban jaata tha.

`.gal` me do specificity ke kaante mile, dono ab comment ke saath: `:has()` guard `.gal` se
bhaari hai (media me dono **saath** likhne padte hain, warna 5 se kam image wale pool pe
mobile layout lagta hi nahi), aur kinaron pe `!important` chahiye kyunki desktop ka
`.gal button:nth-child(3)` (0,2,1) media ke `.gal button` (0,1,1) se jeet jaata hai.

### 3. Phone pe poore page ka horizontal scroll — band drawer

Desktop pe kuch galat nahi dikhta tha. `.mdrawer` **hamesha DOM me rehta hai** (conditionally
render karne pe slide wali transition chalti hi nahi) aur band haalat me `translateX(100%)`
se screen ke daayein bahar khada tha. Chrome aise fixed element ko scroll area me nahi ginta
— **iOS Safari ginta hai**.

Ab wo band hone pe `visibility: hidden` bhi hai. Isse ek **doosra bug** bhi theek hua jo alag
se maujood tha: `aria-hidden` ke bawajood drawer ke saare link **Tab se focus ho jaate the**.

Saath me `body { overflow-x: hidden }` (reference me hai, hamare paas nahi tha). Dono isliye
ki akela `overflow-x` wajah nahi hataata, **lakshan chhupata hai** — aur tab agli baar yahi
galti chup-chaap kat jaati.

> Baaki sambhavit source check kar liye, teenon saaf: `.tblw` ka `overflow-x: auto` `.tbl` ke
> 520px `min-width` ko sambhal raha hai, lightbox conditionally render hota hai, aur `.drop`
> ka 220px nav ke andar hai jo 1040 se neeche `display: none` hai.

### 4. Admin — Section Headings me input aur textarea chipke hue the

Wajah screen ki nahi, **primitives ki**: form control ka default margin 0 hai, `.field` sirf
apne **neeche** 14px deta hai, aur do control ke **beech** ka koi rule tha hi nahi. Ab tak
har `.field` me ek hi control hota tha, isliye ye kami kabhi dikhi nahi.
`.field > :is(.inp, .sel, .ta) + :is(.inp, .sel, .ta) { margin-top: 8px }` — poore admin me
scan kiya, do stacked control **sirf isi screen pe** hain.

Screen-level override jaan-boojh kar nahi likha — component CSS bundle me primitives se
pehle aati hai, to barabar specificity pe wo haar jaata (D-43 aur D-44 §6 me do baar kat
chuka hai).

### 5. Admin ke do aur chhote kaam (client ne chalte-chalte maange)

- **`.ta` ka `min-height` 110 → 150px** (`943ed54`) — client ka apna tune. Value unki hai;
  maine sirf upar wahi bachaav wala comment daala jo `.toggle-ico` (D-64) aur `.btn` pe hai,
  taaki agla "design se match" pass ise wapas na kar de. ⚠️ Ye **poore admin ke har
  textarea** pe lagta hai, sirf Section Headings pe nahi.
- **Footer column ka `Menu` dropdown ab `max-width: 300px`** (`15d629e`) — usme sirf menu ka
  naam aata hai, par box poori row kha raha tha. Selector `.field > .sel.ftr-menu-sel` —
  **do class**, wahi primitives wali wajah. `max-width` liya, fix `width` nahi: card chhoti
  screen pe sikudta hai aur fix chaudai wahan uske bahar nikal jaati.

> Aaj teen baar ek hi cheez kaati: **is codebase me ek-class wala override bharose ke laayak
> nahi hai.** `.field` ka gap, `.ftr-menu-sel`, aur pehle `.ftr-block-icon`/`.edit-grid` —
> sab me primitives load order se jeet jaata hai. Admin me koi bhi width/spacing override
> likhte waqt pehla sawaal yahi hona chahiye.

**Faisle**

| Kya                                             | Kaun           |
| ----------------------------------------------- | -------------- |
| Admin ka baaki CSS **baad me**                  | client         |
| `.ta` ka `min-height` **150px** (reference 110) | client ka tune |
| Header/footer ke chaar farq **nahi** chhue      | maine, R15 se  |

Header ke teen farq (1040 pe sikudna, `.brand__img` 750px, `.burger` base 33px) aur footer ka
flex model — sab apne comment ke saath likhe hue the aur ek seedha `.btn` ke tuned padding pe
hai. Chaaron ab handoff ki **"mat badalna"** table me hain.

**Agla**

1. **Admin ka responsive** — `admin-design.html` ke do media block me se `782px` wala **poora
   gayab** hai (sidebar phone pe collapse nahi hota, `.row2`/`.row3` multi-column rehti hain).
   Uska code aur zaroori tokens ki line numbers handoff me likh diye hain.
2. **`body` ka `font-size: 15px` + `line-height: 1.55`** — reference me hai, hamare paas nahi.
   Browser default 16px hai, yaani jis text pe humne khud size nahi likha wo **poore site pe**
   ek pixel bada hai. Asar har page pe hai, isliye bina poochhe nahi kiya — **client ka jawab
   baaki hai.**
3. `css-diff.mjs` ke **paanch jhoothe alert** ab bhi hain (`>` combinator, quote ka farq,
   shorthand) — dono script ek din milani chahiye.

---

## 2026-08-31 — A-5 band; section headings (D-65); R17; lightbox (D-66); CTA card (D-67)

**Kya hua**

Teen hisse. Pehla — `/status` ne declared aur asli state ka farak nikala. Doosra — A-5
(`apps/web/.env`) band hua. Teesra — client ne teen naye feature maange, aur unme se
**pehla** ban gaya.

### 1. Docs sach se alag ho gaye the

31 Aug ke docs-sync commit (`e4b095d`) ne `project-state`, `09-OPEN-ITEMS` aur `session-log`
theek kiye the — par **`CLAUDE.md` chhoot gayi**. Usme teen cheezein purani thin: test count
(554 vs 568), "agla kaam" (usme wo bhi likha tha jo ban chuka tha), aur **D-61 vs D-64 ka
takraav** — ek hi file me "add-ons global hain" aur "add-ons wapas package pe" dono likhe the.

Wahi takraav **do aur jagah** mila: `project-state.md` aur `02-ARCHITECTURE.md` §3. Teenon
me D-61 ab "itihaas" ke blockquote me hai.

> **Sabak:** doc-sync commit me _saari_ jagah check karni padti hain jahan wahi baat likhi
> hai. Ek jagah theek karke commit kar dena us baat ko aur zyada bhramit karta hai — ab do
> jagah do alag jawab dete hain, aur padhne wale ko pata nahi kaunsa naya hai.

### 2. A-5 band — par ek footgun ke saath

Secret `apps/api/.env` aur `apps/web/.env` dono me same hai (fingerprint se verify kiya,
value kabhi print nahi ki). Endpoint ab galat secret pe **401** deta hai, `503` nahi.

⚠️ **Next `.env` sirf boot pe padhta hai.** File banane ke baad web dev server restart na ho
to wahi purana 503 aata rehta hai — aur lakshan bilkul waisa hi dikhta hai jaise `.env` bani
hi na ho.

### 3. D-65 — section ke heading aur lines ab admin se (Q-9 ka bada hissa)

Client ne Q-9 ke teen raaston me se **#2** chuna. Poora tark D-65 me hai. Chaar baatein jo
yaad rakhne laayak hain:

**a. Har section ko heading _aur_ description — chahe aaj line ho ya na ho.** Client ke
shabd: _"abhi nahi hai to kya hua, aage text bhi daal sakte hai."_ Aaj 7 me se sirf 3 pe
line hai; baaki 4 ka field khaali hai aur khaali rehne pe page pe kuch nahi chhapta.

**b. Khaali ke do alag matlab, aur admin ka form isi wajah se bhara hua khulta hai.**

Pehla draft placeholder wala tha. Wo **galat** tha: placeholder pe client kisi line ko
**hata** hi nahi sakta — box khaali karte hi placeholder theme ka text wapas dikha deta hai.
Isliye form defaults se bhara hua khulta hai, aur niyam seedha hai: jo box me dikh raha hai
wahi page pe chhapega. Khaali `heading` phir bhi theme se bharti hai (section bina title ke
na rahe), par khaali `description` line ko sach me hata deti hai.

Ye sirf theory nahi thi — hotels wali line me abhi bhi likha hai _"and on the enquiry
form"_, aur wo form bana hi nahi (Q-2). Pehle uske liye code me comment tha: "client kahe to
aakhri teen shabd hata dena ek line ka kaam hai." Ab wo client ka apna kaam hai.

**c. `.strict()` — test ne pehli hi baar pakda, aur ye doosri baar hai.**

Zod default me anjaan keys **chup-chaap hata deta hai**. Uske bina `{ notASection: {...} }`
bhejne pe API **200** deti, key gayab ho jaati, aur admin ko "ho gaya" dikhta. Theek wahi
bug jo D-43 §3 me `leafItemSchema` pe mila tha.

Maine test pehle likha aur wo **fail hua** — 200 aaya jahan 400 chahiye tha. Agar test na
hota to ye kabhi pakda hi na jaata.

**d. Default ek hi jagah — `package-sections.js`.**

Wahi list teen kaam karti hai: theme ka fallback, admin ka pre-fill, Zod ki shape. Do jagah
rakhne pe wo ek din alag ho jaate aur admin kuch dikhata, page kuch chhapta. D-43 §2 wala
`allowedColumnCounts` ka sabak.

### 4. Aur ek chup bug — `cancellationText` payload me tha hi nahi

`PackagePage.jsx` **do jagah** `defaults.cancellationText` padhta hai, par
`getPublicPackageDefaults()` use bhejti hi nahi thi. Nateeja: client ki likhi cancellation
policy page pe **kabhi** nahi aati thi, aur "Good to know" section sirf tab dikhta tha jab
booking steps bhi bhare hon. Kahin koi error nahi, dono taraf ka code padhne me sahi.

Ye bilkul wahi shakl hai jo D-64 wale transfer-duration bug ki thi. **Do baar ho chuka hai,
to ab ye is codebase ka pehchana hua failure mode hai:** payload me field add karna bhool
jaana. Theme use padhta rehta hai, admin use save karta rehta hai, aur beech me kuch nahi.

Live API se pakda — `/api/public/package-defaults` ki keys ginne pe wo teen thin
(`whatsIncluded`, `bookingSteps`, `itineraryImages`), jabki theme chaar padh raha tha.

### Kya bana

```
packages/shared/src/constants/package-sections.js   PACKAGE_SECTIONS — 7 section, defaults
packages/shared/src/schemas/package-defaults.js     sectionLabels + .strict()
apps/api/src/modules/package-defaults/model.js      sectionLabels (Mixed, bookingSteps jaisa)
apps/api/src/modules/public/service.js              toSectionLabels() + cancellationText FIX
apps/web/components/package/SectionHead.jsx         naya — heading + optional line
apps/web/components/package/PackagePage.jsx         5 section ab payload se
apps/web/components/package/Pricing.jsx             hotels + add-ons ab payload se
apps/admin/src/screens/packages/PackageDefaults.jsx teesra section — sectionLabels
apps/admin/src/lib/nav.js + App.jsx                 /packages/section-headings
```

**Migration nahi lagi** — day-1 reserve test ke teenon jawab "nahi", aur khaali `{}` ka
matlab hi "theme ke apne headings" hai.

**Nateeja:** 574 tests (6 naye) · lint clean · format clean. Live verify kiya — payload me
saaton section aaye, aur rendered page pe wahi text (JSX se saare hardcoded heading hat
chuke hain, sirf comments me naam bache hain).

### Client ke do aur feature — abhi baaki

- **Hero pe click → popup, images auto-slide.** ⚠️ Design reference me lightbox/modal/popup
  **0 baar** hai — ye R15 ka documented deviation banega.
- **Settings me CTA section** (page ka aakhri card). Ye design me **pehle se hai**
  (`itinerary-v3.html:2102`, `.offer`) aur un 4 missing sections me se ek hai. ⚠️ Usme daam
  aur category **derived** hain, aur ek button `#enquiry` pe jaata hai — jo Q-2 pe atka hai.

### 5. R17 — admin ka saara UI text ab English me

Upar wali baat client ne turant pakad li aur theek karne ko kaha. **16 string** Hinglish se
English hui — `hint`, `subtitle`, `placeholder` aur ek `title`:

```
App.jsx                    Package Type ka subtitle
ItineraryBuilder.jsx       4 hint — transfer duration · note · route strip · `-` wala bullet niyam
MasterListScreen.jsx       4 hint — room · note · where · icon
PackageDefaults.jsx        3 subtitle + 1 placeholder + 1 hint
PackageEdit.jsx            2 hint — bestFor · ferriesNote
TaxonomyScreen.jsx         slug ka hint
```

**Comments aur test names Hinglish hi hain** — R17 saaf kehta hai "UI ka text English me,
code comments Hinglish". Grep se ye do alag karna aasan nahi tha: pehle scan me 50 me se
zyada tar hits **multi-line JSX comments** (`{/* … */}`) ki continuation lines thin, jo
`*` se shuru nahi hoti. Isliye aakhir me ek chhota script likha jo pehle block/line comments
ko blank karta hai, phir Hinglish dhoondhta hai — usne do string aur nikaleen jo aankh se
chhoot gayi thin.

⚠️ **Ek string jaan-boojh kar chhodi:** `lib/auth.jsx` ka
`throw new Error('useAuth ko <AuthProvider> ke andar hi call karo')`. Wo UI ka text nahi,
developer ke liye assertion hai — comment wali shreni me aata hai. Client kabhi nahi dekhega.

`apps/web` pehle se saaf tha (public site ka text design se aata hai, aur wo English hai).

### 6. D-66 — hero ka lightbox

Client ne maanga: hero pe click → popup, aur images kuch der baad apne aap slide hon.
Poora tark D-66 me. Do baatein yahan likhne laayak:

**Design me lightbox hai hi nahi.** `itinerary-v3.html` me `lightbox`/`modal`/`popup`/
`dialog` — chaaron 0 baar. Pehle tile ek `<a href={image.url}>` tha. Ye R15 ka vichlan hai,
client se aaya.

**Ek bug build ke dauraan pakda jo aankh se bhi nahi dikhta.** Maine hover-pause **backdrop**
pe lagaya tha. Backdrop poori screen ghera hai — yaani desktop pe cursor kahin bhi ho, popup
hamesha "paused" rehta aur auto-slide **kabhi chalti hi nahi**. Koi error nahi, bas feature
gayab. Ab pause sirf image pe hai.

⚠️ Lightbox **kisi test se bandha hua nahi** — repo me browser automation nahi hai
(Playwright/Puppeteer dono nahi) aur R3 ke chalte sirf iske liye nayi dependency lena theek
nahi laga. Client ne khud chala kar confirm kiya.

### 7. D-67 — page ka aakhri CTA card

Design ka `.offer` — wo un **chaar sections me se ek** tha jo bane hi nahi the, aur **Q-2
(Enquiries) pe atka** tha kyunki uska button `#enquiry` pe jaata hai.

**Client ne atkav khol diya:** _"button to form par hi jata hai par abhi bana nahi hai to
abhi fields bana do jisse bad me bhej sake aur ye section rahega poora."_ Yaani section poora
ab bana, aur button ka target ek field hai — form banne pe sirf ek value bharni hai. D-30 ka
precedent.

**Do faisle jo maine pehle galat maan liye the, aur client ne theek kiye:**

Maine poochha tha ki fields `packageDefaults` me jaayein ya `settings` me, aur mera mashwara
`packageDefaults` tha (package page ka card hai, aur D-46 kehta hai package ka maal wahan
jaaye). Client ne `settings` chuna — wajah: _"dusre pages par bhi use hoga."_ Wo sahi hai,
aur ye D-46 ka **palan** hai, apwaad nahi: usi tark ka doosra hissa kehta hai ki jo cheez
sirf package ki nahi, wo `settings` me rahe.

Doosra — maine box ke daam ko derive rakhne ka option diya tha. Client: _"design same rahega
jaisa hai price kahin se derive nahi hoga."_ Ab wo saada text hai. **Look bilkul waisa hi,
sirf source badla.**

⚠️ Iska ek nateeja hai jo maan lena chahiye: **ek hi text har page pe dikhega** — ₹24,999
wale package pe bhi aur ₹45,000 wale pe bhi. Isiliye admin screen pe box ke upar ek chetavni
likhi hui hai. Ye baat field dekh kar pata nahi chalti, aur galti chup-chaap live chali
jaati.

⚠️ **Package page ka text ab do jagah hai** — headings `Packages ▸ Section Headings` me,
CTA card `Settings ▸ CTA Section` me. Ye qeemat jaan-boojh kar di gayi.

**Dev DB me smoke data daala hua hai** taaki section dikhe; client apna content bharega.

## 2026-08-27 (raat, doosra hissa) — Editor ki safai (D-64), aur code push

**Kya hua**

Design pass ke baad client ne editor aur page dono chala kar dekha aur ek saath **saat**
baatein kahin. Chhe UI ki, ek asli bug. Commit `370d0f9`.

**Bug — transfer duration page pe aati hi nahi thi**

Chip ki shart `day.transfer &&` thi, yaani transfer **na chuna ho** to poori chip gir jaati
thi — aur uske saath client ka likha `90 min` bhi. Data me teen din wahi the:

```
Day 2 | transferId: —  | transferNote: "90 min"
Day 4 | transferId: —  | transferNote: "40 min"
Day 5 | transferId: —  | transferNote: "2 hrs"
```

Ye chup tha: admin me text bhara hua dikhta tha, page pe kuch nahi.

**Baaki chhe**

| Kya                                    | Note                                                                |
| -------------------------------------- | ------------------------------------------------------------------- |
| Din se `hotelCategory` hata            | D-51 §3 ka palat — uska jawab page pe kahin dikhta hi nahi tha      |
| `highlights[]` description me mil gayi | `-` wali line = bullet. **Migration 014** purana data laayi         |
| Add-ons wapas package ka chunav        | D-61 ka palat, usi din. Payload `packageDefaults` se wapas entry pe |
| Har remove pe confirmation             | `lib/confirm.js` — message me batata hai **kya** ja raha hai        |
| Panels drag se reorder                 | `SortablePanels` — kram `localStorage` me, DB me nahi               |
| `.toggle-ico` 11 → 14px                | Reference se jaan-boojh kar alag, client ka faisla                  |

**Do chhote fix jo isi kaam se nikle, dono chup the**

1. **Panel ki heading beech me chali gayi thi.** `.panel-head` pe `space-between` hai aur wo
   bachchon ki **ginti** pe nirbhar tha: do pe theek (h2 baayein, toggle daayein), teen pe
   (grip juda) h2 beech me. Fix `h2 { margin-right: auto }` — auto margin
   `justify-content` se pehle jagah leta hai, isliye ab head me do cheezein hon ya chaar,
   heading baayein hi rehti hai.
2. **All Packages me image kabhi wire hi nahi thi** — cell me ek **khaali
   `<span class="thumb">`** tha, sirf gradient placeholder. Ab banner resolve hota hai;
   media na mile to wahi placeholder wapas aata hai, toota `<img>` kabhi nahi (D-42 §2).

**Ek jagah client ki baat poori nahi maani, aur wo record me hai**

Client ne kaha tha "har nayi line alag bullet". Wo poora nahi kiya — **paragraph wali line
paragraph hi rehti hai**. Wajah data me thi: unke har din ka `description` ek **asli
paragraph** hai, aur har line ko bullet banane ka matlab hota wo paragraph bhi bullet ban
jaaye. Sirf bullets likhne pe sirf bullets aate hain, yaani unki baat bhi poori hoti hai.
Tark D-64 §3 me likha hai taaki wapas jaana ho to saamne rahe.

**Push** — saat commits `origin/main` pe gaye (`ef95732..370d0f9`). Push se pehle
`format:check` aur `lint` dono chalaye; CI ka pehla step wahi hai aur ek purana commit
(`3c29b58`) us par red ho chuka hai.

**Aakhir me ek doc safai (usi din, baad me)**

`project-state` aur `09-OPEN-ITEMS` dono ka "Agla kaam" ab bhi **poora Slice 6** keh raha
tha — "Itinerary Images pool + gallery, aur FAQs · goodToKnow · reviews". Usme se aadha
pehle hi ban chuka hai (pool + gallery Slice 4/D-52 me, FAQs D-59 me), yaani `/status`
naye session ko wo kaam batata jo ho chuka hai. Dono lines theek ki gayin, aur page ke
**chaar na-bane sections** ka apna item bhi `09-OPEN-ITEMS` me likh diya gaya.

**Agla**

1. **Slice 6 ka bacha hua hissa** — `goodToKnow[]` aur `reviews[]` + rating
2. Uska ek sawaal: §9 #8 — rating haath se ya `reviews[]` se (mashwara: haath se)
3. `apps/web/.env` (**A-5**), aur Hotels list me do entry ulti hain

## 2026-08-27 (raat) — Public package page design se milaya, section-dar-section

**Kya hua**

Client ne har section ka screenshot bhej kar `itinerary-v3.html` se milaan karwaya — ek
section ek baar, sirf design. Jo sections bane hi nahi (Traveller reviews · Similar
itineraries · neeche ka enquiry band · sidebar ka price widget) unhe chhoda.

Commit: **`a33a143`** — 4 files, 546 insertions. `apps/web` ki teen file + `09-OPEN-ITEMS`.

**Do base rule jo maujood hi nahi the — dono chup, dono ka asar poore page pe**

1. **`h1..h5` ka rule tha hi nahi.** Har heading `body` se `--body` (`#4a5a6d`) le rahi thi,
   jabki design `--ink` (`#111d2b`) maangta hai — package page ka `<h1>` isi wajah se saada
   grey dikh raha tha. Saath me browser ka default margin bhi lag raha tha, isliye
   `.blk h2 { margin-bottom: 10px }` jaise rules **aadhe hi** chalte the: neeche ka margin
   hamara, upar ka browser ka. `font-weight` bhi 700 tha, 800 nahi — aur code me comment
   likha tha ki "weight base rule se aata hai", jabki wo base rule tha hi nahi.
2. **`.blk ul.tick` me list ka reset nahi tha.** Reference me wo global
   `ul { margin: 0; padding: 0; list-style: none }` se aata hai, jo yahan **nahi** daala ja
   sakta — RichText ki list ko uske apne bullet chahiye. Bina reset ke list 40px andar khisak
   kar heading se alag ho jaati thi.

Doosri wali ki chupai khaas thi: `<li>` pe `display: flex` hai, to bullet dikhta hi nahi —
**sirf khisakav dikhta hai**, aur wo galti jaan-boojh kar diya gaya indent lagti hai.

Ye pichhle session wale `.blk p` ki **teesri aur chauthi** misaal hain. Ab tak chaar base
rules gayab nikle hain (`p`, `h1..h5`, aur do jagah list reset) — yaani `globals.css` reference
ke **rules** se selector-by-selector likhi gayi thi, uske **base resets** se nahi. `css-diff`
inhe kabhi nahi pakdegi kyunki wo sirf `.`-wale selectors dekhti hai.

**Padding ka override — client ne khud pakda**

Maine pehle token compare kar ke kaha tha "width me koi farq nahi hai" (`1280px`/`26px`, dono
taraf same). Wo **galat** tha: `.pkg__hero` aur `.pgl`, dono pe `class="… wrap"` bhi hai aur
dono `padding` **shorthand** use kar rahe the. Shorthand ka beech wala `0` left/right ko bhi
0 karta hai, aur dono rules `.wrap` ke **baad** aate hain — specificity barabar (0-1-0), to
baad wala jeeta aur `padding-inline: var(--pad)` chup-chaap ud gaya. Banner ke neeche ka
poora page kinare se chipka tha. Ab dono `padding-block` pe hain.

**Sabak:** token milaana kaafi nahi hota — cascade me kaun kise kha raha hai, wo alag sawaal
hai. `.wrap` jaisi utility class ke saath koi bhi `padding`/`margin` shorthand shak ke daayre
me hai.

**Day-by-day poora dobara likha**

Ye section sabse door tha — purani CSS Slice 4 ka kaam-chalau roop thi (ek saadi do-column
list). Ab reference wala poora dhaancha: rail (`.itin__d::before`), uske circle
(`.itin__k::after`), `Day 1` ka neela pill, neele bullet, chips ke icon, aur 860px pe mobile
treatment jahan rail aur circle chhup jaate hain.

`.itin { padding-left: 40px }` yahan ki sabse aham line hai: rail aur circle `.itin__d` ke
**bahar** bethte hain (negative `left`), to list ko utni jagah chhodni padti hai. Reference me
wo jagah `<ol>` ke **browser-default** padding se aa rahi thi — maine wo likh di, kyunki UA
default pe layout tikana chup-chaap tootne wali cheez hai.

**Baaki milaan**

`.pmeta` ke icon · `<h1>` ka neela `<em>` (nights/days se derive) · route strip ka teer (CSS
maujood thi, SVG kabhi daala hi nahi gaya — comment tak likha tha "reference me ye ek SVG hai,
lakeer nahi") · at-a-glance ka kram (`Hotels` teesre pe) · `.dnav` ki values · hotels table ka
paanchva `Note` column hataya (reference me chaar hi hain) · `or similar` ab italic.

**Faisle — sab client ke, ek hi soch me**

| Kya                                 | Faisla                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Hero ki `per person · twin sharing` | pehle `priceNote` daali thi, client ne **static** karwaya — "har cheez dynamic thodi aayegi" |
| catbar ka text                      | reference wala poora — `and ferry class` chhoot gaya tha (R15)                               |
| hotels intro                        | reference wala poora — pehli line gayab thi                                                  |
| tab ka label + panel ka paragraph   | **hardcode** — client ne admin me nayi jagah dene se saaf mana kiya                          |

`CATEGORY_COPY` (`apps/web/components/package/Pricing.jsx`) me chaaron category ka `label`
aur `text` hai. ⚠️ Isme `Sea-facing`, `Beachfront`, `Havelock`, `Sitapur` — sab **Andaman ki
baat hai**, jabki core code har client ke instance me wahi rehta hai. Maine mana kiya tha
(mashwara: maujood `note` use karo, ya field banao); client ne dono thukra diye. Isliye wo
`packages/shared` me **nahi**, theme layer me hai — client ka theme ise badal sake bina core
chhue.

**`Q-9` khula** (`09-OPEN-ITEMS`) — 7 heading aur 6 lines static hain, client ek shabd bhi
admin se nahi badal sakta. Teen raaste likhe hain; mashwara: **jab zaroorat pade tab** field
banao, 12 field pehle se mat banao (wahi galti jo D-57/D-58 me pakdi gayi thi).

> Ye item pehle `Q-8` likha gaya tha — number pehle se resolved item pe tha (drawer vs footer
> logo). Doosre session ne `Q-9` kar diya.

**Do cheezein jo admin ka data hain, design nahi**

1. Hotels master list me teenon hotel ke naam me `(or similar)` likha hai, aur page apni taraf
   se `or similar` **jodta** hai — table me do baar dikhta hai.
2. Din 2, 4, 5 pe `transferNote` bhara hai (`90 min`, `40 min`, `2 hrs`) par **transfer chuna
   nahi** — chip transfer se banti hai, isliye ferry ki chip banti hi nahi. Reference me wahan
   `Ferry: 90 min` hai.

**`css-diff` ab bharosemand nahi rahi**

Paanch jhoothe alert de rahi hai: `.atg div` (hamare paas `.atg > div` hai),
`.htab button[aria-selected="true"]` aur uska `span` (hum `'true'` single quote me likhte
hain), `.hpan[hidden]` (hum panel conditionally render karte hain), aur `.blk ul.tick` ka
`margin-top` (humne shorthand likha). Script selector aur value ko **string** ki tarah milaati
hai. Aage use karne se pehle ye teen cheezein sikhani hongi: `>` combinator, quote ka farq,
aur shorthand. Warna wo confuse karegi.

**Agla**

1. `(or similar)` aur ferry transfer — admin me theek karna
2. Tabs ke neeche ka paragraph aur tab label ab hardcoded hain — `Q-9` ke saath review
3. `p { margin: 0 }` ka global reset abhi bhi nahi hai — "About this itinerary" ke do
   paragraph ke beech ka gap reference se zyada hai. Jaan-boojh kar chhoda (RichText).

---

## 2026-08-27 (shaam) — Slice 5 client ke faislon se dobara ghadi gayi; FAQs; CSS milaan

**Kya hua**

Slice 5 subah ban gayi thi (D-56). Uske baad client ne editor **chal kar dekha** aur chhe
badlaav maange — har ek ka apna decision record hai (D-57 se D-62). Saath me FAQs ka panel
bana, aur din ke aakhir me public page ki CSS reference se rule-by-rule milaayi gayi.

**Faisle (sab client ke, R15)**

| #    | Kya badla                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-57 | Pricing panel me **chaaron category ki row hamesha**; `Price Basis · GST · Advance` ki poori row hati; per-category `note` **hotel ke record pe** chala gaya. Khaali daam = wo category page pe nahi |
| D-58 | Hotels panel ki rows **itinerary se** banti hain, chuni nahi jaatin                                                                                                                                  |
| D-59 | **FAQs** ka panel — sirf FAQs, **policies nahi** (wo `packageDefaults` me hi)                                                                                                                        |
| D-60 | Hotel bhi **derive** hota hai (master list se); `fields.hotels[]` ab sirf **override**                                                                                                               |
| D-61 | **Add-ons global** — editor me panel nahi, poori list `packageDefaults` ke payload me                                                                                                                |
| D-62 | **Price line** `Packages ▸ Hotels` screen pe (pehle What's Included pe thi, aur ek bug se **dono** screens pe dikh rahi thi)                                                                         |

**Ek soch jo poore din chali:** har baar client ne wahi cheez hatai jo package me **pehle se
likhi hui** thi — destination itinerary me tha, category pricing me, hotel master list me.
Teenon baar jawab ek hi tha: dobara mat poochho, derive karo. Aaj package editor me pricing
ke aath number, hotels ki zero se ek row, aur FAQs — bas.

**CSS milaan (aakhri hissa)**

`itinerary-v3.html` ki CSS aur `globals.css` ka **rule-by-rule diff** script se nikala
(scratchpad me `css-diff.mjs`). Shuru me **28 selector missing, 29 me values alag**; ab
**4 missing** bache hain aur wo chaaron un sections ke hain jo bane hi nahi.

Do sabse badi cheezein jo pakdi gayin, aur dono chup thin:

1. **Chaar design token maujood hi nahi the** — `--green-600`, `--red-500`, `--r4`,
   `--orange-100`. Token na ho to `var()` **kuch nahi karti**, koi error nahi: "What's
   included" ki hari list saadi kaali render ho rahi thi.
2. **`.blk p` rule tha hi nahi** — har section ke paragraph browser ke default pe (16px
   kaala), jabki design 14px / `--body` maangta hai. Ye poore page pe dikhta tha.

Markup do jagah badla: What's included ab `.inx__c` ke **do card** (hara/laal, tick-cross
SVG), aur booking steps ab **neele number-circle** wale card (CSS counter se).

Ek aur bug isi pass me mila: CTA button `className="b b-o"` pe tha — reference ka naam,
jabki is repo me wo `btn btn--accent` hai. Button bilkul **unstyled** render ho raha tha.

**⚠️ Jo maine toda, aur theek nahi kar paya**

`next build` chalayi jab `next dev` chal raha tha — Windows pe wo `.next/trace` pe EPERM
deti hai, aur beech me maarne se `.next` kharab ho gaya. Pehle har page 500, phir maine
`.next/server` aur `.next/cache` hata diye to 404. **Dev server ko restart chahiye** —
`apps/web` terminal me Ctrl+C, phir `pnpm dev:web`. API (4000) aur admin (5173) theek hain.

Iska seedha nateeja: **poore din ki CSS aankh se verify nahi ho payi**, sirf code aur
reference ka milaan hua.

**Agla — naya session, sirf design**

Client ne kaha: jo sections **bane hue hain** wo design se match hone chahiye, ek-ek karke,
wo screenshot denge. Jo bane hi nahi (Traveller reviews · Similar itineraries · neeche ka
"Want this trip on your dates?" band · sidebar ka price widget) unhe abhi chhod dena hai.

**Teen sawaal khule hain**, teenon unhi na-bane sections ke:

1. `ratingValue` haath se likha jaaye ya `reviews[]` se gina jaaye (spec §9 #8) — mera
   mashwara **haath se**: `412` ka matlab hai "412 reviews hain", jabki page pe teen dikhte
   hain; derive karne pe wo **3** ho jaata
2. Similar itineraries **apne aap** chunein ya haath se (spec §9 #15) — mashwara **apne aap**
3. Neeche ka band aur sidebar widget me **enquiry form** hai, aur Enquiries Phase 7b me hai
   (Q-2) — form ka khaali shell, ya "Call/WhatsApp" button (settings me phone pehle se hai)

## 2026-08-27 — Slice 5 — Pricing + Hotels (D-56); docs sync

**Kya hua**

- Session `/status` se shuru — **4 doc mismatch** mile aur sab theek kiye (neeche), phir
  Slice 5 banayi: `fields.pricing{}` + `fields.hotels[]` + `fields.addOns[]`, admin ke do
  naye panel, aur public page pe price block · catbar · hotels table · add-ons.
- **Koi migration nahi lagi** — teenon field `entries.fields` (Mixed) ke andar hain, na
  naya collection na naya index.

**Faisle — D-56, dono client se (27 Aug)**

1. **Pricing panel ki pehli row `Category · Price From · Strike-through` hai.** Design me
   wahan `Currency · Price From · Strike-through` tha. Grid wahi `row3` hai — sirf pehla
   khana badla, kyunki daam ab har category ka apna hai.
2. **Currency package pe hai hi nahi.** Spec §4 me wo package ka field thi (INR|USD|AED)
   aur maine bana bhi di thi; client ne hata di. Wo `settings.currency` se aati hai.
   Dono jagah rakhne ka matlab ek extra field nahi, ek **sawaal** hota: "kaunsi jeetegi".

**Teen cheezein derive hoti hain, store kahin nahi** — ye slice ka sabse zaroori hissa
hai, kyunki teenon ke liye ek-ek field banana bahut aasan tha:

| Page pe                                  | Kahan se                                   |
| ---------------------------------------- | ------------------------------------------ |
| Upar ka `₹31,999 → ₹24,999`              | sabse sasti category — `cheapestPricing()` |
| Hotels table ka `Nights`                 | itinerary — `nightsByStay()`               |
| `Standard category — ₹24,999 per person` | price + basis se                           |

`Room` bhi package pe nahi hai — hotel ke apne record pe (D-53 §3).

**Paanch guard, sab reference BANNE se pehle** (D-42 §2 wala invariant): hotel/add-on ki
id sach ho · `destinationId` sach me Destination ho · ek category do baar price na ho · ek
destination × category pe do hotel na hon · `strikePrice > priceFrom`. Aakhri wala schema
me **nahi**, service me hai — schema me lagane ka matlab hota ki aadha bhara hua form save
hi na ho.

Aur delivery ke chhor pe ek aur: public projection me jis row ka hotel ya destination
resolve na ho, wo **payload me aati hi nahi** — adhoori row ka nateeja public table me ek
khaali cell hota, jo customer ko dikhta hai.

**Public page pe teenon jagah ek hi category.** Reference me category chunna upar ka daam,
catbar ka card aur hotels ki table — teenon ek saath badalta hai (design ka JS `js-catpick`
aur `js-htab` ko sync karta hai). Isliye selected category ek React **context** me hai,
teen alag state me nahi.

**Docs jo badle:** `03-DECISIONS` (D-56) · `02-ARCHITECTURE` §3 (`entries.fields` ka naya
maal) · `04-ADMIN-UX` (editor ke naye panel, aur `Sold Out`/`From price` wali do stale
rows) · `09-OPEN-ITEMS` · `CLAUDE.md` · project-state.

**Session ke shuru me jo 4 mismatch mile the**

1. `project-state.md` khud se ulta bol rahi thi — "Slice 5 ke teenon sawaal band (D-53)"
   aur do line neeche "teen sawaal khule hain". Doosri line hatayi.
2. `09-OPEN-ITEMS.md` ka header "383 tests" keh raha tha (andar ek jagah 491) — asli 541.
3. §"spec 007 §9" table me row 5 **do baar** thi — ek band, ek khuli. Duplicate hatayi.
4. 27 Aug ka CORS/tunnel kaam kisi doc me record nahi tha — teen jagah juda, aur
   `EXTRA_CORS_ORIGINS` `06-OPERATIONS` §4.0 me documented (env var ka doc rule miss
   ho gaya tha).

Saath me do stale claim: project-state `availability` ko live field bata rahi thi (D-54 me
hat chuka), aur `entries.test.js` ka section header wahi purani baat keh raha tha.

**Ek cheez jo verify nahi ho payi:** `pnpm --filter @cms/web build` chal nahi sakti jab
`next dev` chalu ho — `.next/trace` pe Windows ka file lock EPERM deta hai. Uski jagah
**chalte hue dev server pe** verify kiya: package page **200** deti hai aur `Pricing.jsx`
compile ho kar chalta hai (provider `<main>` ko lapetta hai). Admin ka `vite build` clean
hai.

**Agla**

1. **Slice 6** — Itinerary Images pool + gallery, aur FAQs · goodToKnow[] · reviews[] +
   rating (spec 007 §7)
2. `apps/web/.env` — `API_URL` + `REVALIDATE_SECRET` (**A-5**, manual step)
3. Pricing ko asli data ke saath dekhna — dev DB ke package me abhi pricing khaali hai,
   isliye page pe catbar/table abhi dikhte nahi (wo khud ko chhupate hain, wahi design hai)

## 2026-08-27 — Dev server tunnel/LAN se khula, CORS reject 403 hua; docs sync

**Kya hua**

- Kaam share karne ke liye cloudflared tunnel lagaya, aur usme **do asli gap** mile —
  demo ke nahi, code ke:
  1. **Vite sirf localhost pe bind tha.** Next (`apps/web`) default `0.0.0.0` pe bind
     hota hai, Vite `[::1]` pe — isliye tunnel se site chal gayi aur admin **502** de raha
     tha. `host: true` juda. Iske bina teen cheezein kabhi nahi hotin: docker se pahunch,
     LAN pe mobile se test, aur koi bhi tunnel.
  2. **CORS reject 500 ban jaata tha.** Allowlist se bahar ka origin aane pe ek plain
     `Error` throw hoti thi; wo `AppError` nahi hai, to error handler use generic **500**
     bana deta tha aur login screen pe sirf "Something went wrong. Please try again."
     dikhta tha. Yaani **configuration ki galti server crash jaisi dikhti thi.** Ab wo
     `forbidden()` hai aur message me origin ka naam aata hai, taaki use seedha
     `EXTRA_CORS_ORIGINS` me copy-paste kiya ja sake.
- `/status` chalaya — **4 doc mismatch** mile, sab theek kiye (neeche).

**Ek baat jo pehle GALAT kahi gayi thi:** "Vite `/api` proxy karta hai to same-origin hai,
CORS nahi phansega." Browser POST/PATCH/DELETE pe `Origin` header **hamesha** bhejta hai,
chahe same-origin ho — isiliye `/api/me` (GET) pe 401 aaya par login (POST) pe 500.

**Faisle:** **koi naya D-xx nahi.** Ye D-12 ka **palan** hai, uska apwaad nahi — `*`
jaan-boojh kar support nahi kiya gaya (cookies `credentials: true` ke saath jaati hain,
aur wildcard + credentials = kisi bhi site ka JS aapke admin ki taraf se request bhej
sake). `SITE_URL` ko list nahi banaya ja sakta — wo revalidate webhook ka **target** bhi
hai (`core/revalidate.js`), isliye alag var: **`EXTRA_CORS_ORIGINS`** (comma se alag,
optional). spec 003 me documented.

**Docs jo badle (mismatch sync)**

1. `project-state.md` **khud se ulta bol rahi thi** — ek jagah "Slice 5 ke teenon sawaal
   band (D-53)", do line neeche "Usme teen sawaal khule hain". Doosri line hatayi.
2. `09-OPEN-ITEMS.md` ka header **"383 tests passing"** keh raha tha (andar ek jagah 491) —
   asli **541**. Poora status block Phase 1 ki aaj ki haalat pe likha gaya.
3. `09-OPEN-ITEMS.md` §"spec 007 §9" table me **row 5 do baar** thi — ek band (D-53), ek
   khuli. Duplicate hatayi; sahi ginti **6 khule** (#2 #5 #8 #14 #15 #16).
4. Aaj ka kaam kisi doc me record nahi tha — project-state, session-log aur "Ab ka order"
   teenon me juda.

Saath me do stale claim bhi theek hue: project-state abhi bhi `availability` ko live field
bata rahi thi (wo **D-54** me hat chuka, migration 013 index gira deti hai), aur
`entries.test.js` ka section header bhi wahi purani baat keh raha tha.

**Agla**

1. `apps/web/.env` — `API_URL` + `REVALIDATE_SECRET` (**A-5**, manual step)
2. **Slice 5 — Pricing + Hotels** (spec 007 §4), admin + public page dono ek saath.
   Teenon sawaal D-53 me band, koi rukawat nahi
3. `EXTRA_CORS_ORIGINS` `apps/api/.env.example` me hai ya nahi — verify karo

## 2026-08-21 — Users ka menu role-aware hua; Roles submenu drop; Profile screen bani

**Kya hua**

- `/status` chalaya — **6 doc mismatch** mile. Sabse bade: `CLAUDE.md` "~85%, 130 tests,
  agla kaam Users" keh rahi thi jabki Users ho chuke the aur **184 tests** hain; aur wo
  abhi bhi keh rahi thi ki `roles` module ke paas koi HTTP surface nahi (jabki
  `controller.js` + `routes.js` do commit pehle aa chuke the). `09-OPEN-ITEMS` "175 tests"
  aur "GitHub repo khaali hai" — dono galat (origin/main `0e328cb` pe hai, 18 unpushed)
- Client ne Users section ka **asli shape** diya. Kal wala "Users → Roles" submenu ka plan
  **drop** — uski jagah menu role ke hisaab se badlega (D-37)
- Pehle **sirf docs** — client ne yahi kaha tha. Baad me usi session me code bhi

**Ek takraav pakda gaya (isiliye poochha)**

Client ne kaha "editor apni profile se naam aur password badal sake". Par **D-35 §1 ulta
kehta hai** — "user apna password khud nahi badal sakta" — aur wo code me laga hua bhi
hai: `auth/service.js` me `/api/auth/change-password` `mustChangePassword` false hone pe
**403** deta hai. Bina poochhe likh dete to doc apne hi decision se takraati.
Client se teen jawab liye: current password **zaroori** · admin ka reset field **rahega** ·
profile pe sirf **naam + password** (email/avatar nahi).

**Faisle:** **D-37** — (1) Users ka menu role-aware: admin ko All Users · Add User ·
Profile, baaki sabko sirf Profile; Roles submenu **nahi**, role builder Phase 7 me hi.
(2) User apna password Profile se khud badal sakta hai, current password ke saath —
**D-35 §1 superseded**, baaki D-35 waisa hi.

**Ek blocker apne aap khatam ho gaya:** Q-1 (built-in role edit ho ya "Duplicate") RBAC ko
block kar raha tha. Role-edit ka koi UI hi nahi ban raha, to wo Phase 7 pe khisak gaya.

**Docs jo badle:** `03-DECISIONS` (D-37 add, D-35 §1 superseded mark) · `02-ARCHITECTURE`
(§8.3 password ke do raaste, §8.4 profile) · `04-ADMIN-UX` (nav) · `05-BUILD-PLAN`
(Users/Profile Phase 7 → Phase 0, custom-role builder Phase 7 me hi, `subscriber` wali
purani line) · `09-OPEN-ITEMS` · `CLAUDE.md` · project-state.

**Phir code — D-37 poora laga**

```
apps/admin/src/lib/nav.js            nav registry (NAV + ROUTE_GUARDS) + 11 test
apps/admin/src/screens/Profile.jsx   naam + password, dono alag panel
apps/admin/src/screens/NoAccess.jsx  permission na ho to yahi dikhta hai
```

Sidebar ab `nav.js` se render hoti hai, `App.jsx` me `RequirePermission` guard aaya, aur
Users flat link se accordion group ban gaya. Backend me `changePassword()` ka 403 gate
hata, aur wo ab purane saare sessions maar kar **turant naya issue** karta hai.

**Chaar cheezein jo raaste me theek karni padin**

1. **`revokeAllSessions()` chalu session bhi maar deta tha.** Sirf gate hata dena kaafi
   nahi tha — user apna hi password badal kar logout ho jaata. Ab revoke ke baad
   `issueSession()` chalta hai aur controller naye cookies set karta hai.
2. **`Shell` pehle `RequirePermission` ke andar tha** — matlab access-nahi-hai wala page
   bina sidebar ke, layout ke bahar render hota. Shell bahar kiya.
3. **`forbidden` import orphan ho gaya tha** auth service me — lint ne pakda.
4. **Sidebar ka accordion `/users` pe band rehta tha.** Pehle Users flat link tha to
   dikkat nahi thi; group bante hi reload pe pata hi nahi chalta ki aap kahan khade ho.
   Ab current page ka group apne aap khulta hai.

**Ek cheez jaan-boojh kar nahi ki:** baaki menu items (Posts, Packages, Settings…) pe
`permission` nahi lagayi. Client ne abhi sirf Users ka shape maanga hai aur design frozen
hai (R15) — aaj hi sab pe laga dena us rule ko developer ki taraf se todna hota.

**Naya rule:** `07-CONVENTIONS.md` **R16** — nav item aur route guard ek hi jagah se.

**Tests:** 184 → **198**. Purana D-35 gate wala test (jo 403 expect karta tha) D-37 ke
hisaab se badla, aur `nav.js` ke 11 naye test aaye. Lint clean, admin build clean.

**Client ne test kiya aur ek asli bug nikaala (D-38)**

Sawaal seedha tha: _"Profile se password badal kar browser band karun, phir kholun —
Login aayega ya Dashboard?"_ Jawab tha **Dashboard, chahe "Remember me" tick kiya ho ya
nahi** — jo galat hai.

`setAuthCookies()` ka `persistent` flag refresh aur change-password dono me **hardcoded
`true`** tha. Matlab session cookie pehle auto-refresh pe hi (login ke ~15 min baad)
7-din wali persistent cookie ban jaati thi. **Checkbox practically bemaani tha.**
Ye D-37 se nahi aaya — refresh me pehle se tha; password wale raaste me wahi pattern
copy hua isliye dikh gaya.

**Fix:** `remember` ab `refreshTokens` record me hai aur har rotation ke saath chalta
hai. Login likhta hai, refresh aur change-password wahi padhte hain. Migration nahi
chahiye — collection ephemeral hai aur uspe TTL index hai, purane records `false` padhte
hain (safe direction).

**Saath me TTL bhi badli** (client ka faisla, teen options me se): `REFRESH_TOKEN_TTL`
7d se **24h**, aur naya `REFRESH_TOKEN_TTL_REMEMBER` = **7d**. Dono sliding hain —
ghadi inactivity pe chalti hai, login se nahi. Reference ke liye WordPress dekha:
wo 2 din / 14 din deta hai par **absolute**, sliding nahi.

**Tests:** 198 → **204**. Chhe naye test sirf isi baat pe ki _login ke baad wali_
request persistence badalti to nahi — kyunki bug wahin tha, login me nahi.

**Ek manual step baaki:** `apps/api/.env.example` me naya var add karna hai (wo file
mere permissions me nahi hai). Default code me hai, isliye kuch tootega nahi.

**Poora admin English me convert hua (R17)**

Client ne Profile pe read-only fields dekhe aur do cheezein kahin: (1) unhe `inp` jaisa
dikhna chahiye, (2) _"hint Hindi me kyun aa raha hai?"_

Doosre sawaal ka jawab check karne pe ye nikla: **language ka koi rule likha hi nahi
tha.** Code din-1 se Hinglish me drift kar raha tha, jabki client ka design — jo FROZEN
spec hai (R15) — **poora English me hai** (`URL-friendly, lowercase, hyphens only.`).
Yaani design ke hisaab se UI kabhi English me honi chahiye thi.

Client ne poora admin English karne ka faisla liya. **~107 strings** badle:

```
admin JSX          Profile · UserForm · UsersList · DeleteUser · Login
                   ChangePassword · NoAccess · NotBuiltYet · Dashboard · AdminBar · App
packages/shared    Zod ke validation messages
apps/api           errors.js · auth aur users service ke saare messages
                   middleware (auth, csrf) · rate limit
```

**Sirf JSX badalna aadha kaam hota.** API ke error messages aur Zod ke messages seedha
admin ke notice me chhapte hain (`errorMessage()` unhe wahin se uthata hai) — wo na
badalte to pehli hi failed login pe Hinglish dikh jaati.

**Hinglish jaan-boojh kar bacha:** code comments, test ke naam, aur developer errors
(`useAuth ko <AuthProvider> ke andar hi call karo`). Wo user kabhi nahi dekhta.

Ek test bhi update hua — `users.test.js` message text pe assert kar raha tha.

**Naya rule:** `07-CONVENTIONS.md` **R17** — user ko dikhne wala har text English me.
Isme wo table bhi hai ki kya English aur kya Hinglish, taaki ye drift dobara na ho.

**Profile ka read-only field** ab `<input className="inp" readOnly disabled />` hai —
wahi pattern jo Edit User me username/email pe hai. `.profile-ro` CSS hat gayi.

**Client ne ek aur bug pakda — stale form state**

Edit user karke **Add User** dabao, to `/users/new` ka form **pichhle user ke data se
bhara** khulta tha.

**Wajah React Router ka documented behaviour hai:** `/users/:id` aur `/users/new` dono
`<UserForm />` render karte hain, to route badalne pe React purana instance dobara use
kar leta hai aur `useState` zinda reh jaati hai. `useEffect` bhi nahi bachata — usme
`if (isNew) return` tha, jo form clear kiye bina nikal jaata tha.

**Fix:** component ko `key={id ?? new}` ke saath wrap kiya — route badalte hi poora
remount. Effect me manually reset karna bhi chalta, par phir har naya `useState` yaad
rakhna padta.

**`DeleteUser` me bhi wahi kiya** — client ne wo nahi bola, par wahan ye zyada khatarnaak
tha: ek delete screen se doosri pe jaate waqt naya user load hone tak **pichhle user ka
naam** dikhta rehta, aur wo screen permanent delete ka hai.

`08-RISKS.md` ke traps me "Ek component, do route" add kiya, detail ke saath.

> ⚠️ **Is bug ka koi automated test nahi hai.** Admin me component testing ka setup hi
> nahi hai (na jsdom, na testing-library) — poore project me 204 test hain par ek bhi
> React component test nahi. Ye bug us gap me se nikla. Stack add karna ek alag faisla
> hai, client se poochha gaya hai.

**Profile ke messages role-aware hue — aur ek label drift pakdi gayi**

Client ne dekha ki administrator ko apni Profile pe likha aa raha tha _"Ask your
administrator"_ aur _"Your administrator sets this"_ — jabki wo khud administrator hai.

**Check karte waqt ek doosri cheez nikli:** `roles/service.js` me labels ka apna map tha
jisme `admin: "Administrator"` likha hai, aur wahi DB me jaata hai. Par Profile screen
label **key se bana rahi thi** (`admin` se "Admin"). Yaani mera camelCase formatter DB se
diverge kar raha tha — aur wo comment maine khud likha tha ki "labels DB se aate hain".

**Fix (dono ek saath):**

1. `ROLE_LABEL` ab `packages/shared/src/constants` me hai. Seed aur admin **dono wahi**
   padhte hain. `roles/service.js` ka local map hata diya. Ye D-36 ke saath consistent
   hai — built-in roles code-owned hain. Custom roles (Phase 7) ke liye camelCase wala
   fallback bacha hai, kyunki unke labels sirf DB me honge.
2. Dono hints ab `can(user.update)` pe badalte hain — **role ka naam nahi dekha**
   (spec 001). Sawaal capability ka hai: jo khud users manage karta hai, use "apne
   administrator se poochhein" likhna bemaani hai.

|       | Users manage karne wala                  | Baaki sab                                    |
| ----- | ---------------------------------------- | -------------------------------------------- |
| Email | _...not from the Users screen either._   | _...Ask your administrator if you need one._ |
| Role  | _...another administrator has to do it._ | _Your administrator sets this..._            |

Role wali baat code se verify ki: server apna role badalne se **rokta nahi** — sirf
"last administrator" wala guard hai. To "koi doosra administrator badal sakta hai" sach
hai. (Self-role ka guard sirf UI me hai, `disabled={isMe}` — API pe nahi. Alag baat hai,
aaj chhui nahi.)

**Tests:** 204 → **207**. Teen naye: har role ka label ho, `admin` ka label
"Administrator" ho, aur seed DB me wahi labels likhe jo shared me hain — teenon isi drift
ko dobara hone se rokte hain.

**Column sorting ka UI, aur role dene ke do guard (D-39)**

Client ne poochha "Users complete hai?" — nahi tha. Uske baad teen faisle hue:

1. **Activity log DEFER** — client ne poochha ki jab design me hai hi nahi aur unhone
   maanga nahi, to kyun banaye. Design check kiya: **wo sahi the.** Design me jo
   "Activity & Notes" hai wo Enquiry detail ki timeline hai (Phase 7b), site-wide audit
   log nahi. Wo item humare apne plan se aaya tha. Docs update: Phase 0 se hataya,
   `09-OPEN-ITEMS` me **Q-4** banaya taaki chup-chaap gayab na ho, aur **keemat likh di**
   — iska itihaas backfill nahi ho sakta.
2. **Column sorting ka UI** — backend pehle se taiyaar tha (`sort` + `order`), sirf UI
   ka kaam tha. Name aur Last login sortable. Sort URL me rehta hai, header `<button>`
   hai (keyboard ke liye), `aria-sort` bhi.
3. **Do guard (D-39)** — asli baat yahi thi.

**Guard wali baat sirf "UI aur API alag" nahi nikli**

Client ne poochha tha ki server pe fix karne se safe ho jaayega kya. Jaanch me pata chala
ki `updateUser` me **role dene pe koi rok hai hi nahi** — jiske paas `user.update` hai wo
kisi ko bhi kuch bhi role de sakta hai, apne aap ko `admin` samet.

Aaj khatra nahi hai (`user.update` sirf admin ke paas), **par Phase 7 me custom roles
aate hi ye asli privilege escalation ban jaata**. Aur "apna role khud mat badlo" wala
guard ise **rokta nahi** — Manager saathi ko admin banayega, saathi Manager ko.

Isliye dono lagaye: apna role khud nahi, aur apni permission se upar ka role kisi ko
nahi (subset check — role ke naam pe nahi, permissions pe, taaki custom roles pe apne aap
chale). Create pe bhi lagta hai, warna naya admin bana kar uske password se login ka
raasta khula rehta.

**Guard ka order maayne rakha:** "aakhri admin" pehle, "apna role" baad me — taaki aakhri
admin ko "site lock ho jaayegi" wala saaf message mile. Isi order se D-34 ke purane test
bina badle pass rahe.

**Tests:** 207 → **214**. Naye guard ke test **service pe seedhe** chalte hain, HTTP se
nahi — kyunki ye raasta aaj HTTP se banaya hi nahi ja sakta. Wahi tests guard ko Phase 7
tak zinda rakhenge; bina unke ye chup-chaap hat jaata.

**Settings ban gaya — model, migration, aur General screen (D-40)**

Client ne poochha "Settings Phase 0 ka hissa hai?" — jawab **aadha haan** nikla. Plan me
`Settings` ka **model** Phase 0 me tha par **screens Phase 7** me. Par status docs teenon
jagah "Phase 0 — Settings screens" keh rahe the. Wo mismatch tha, aur maine bhi pichhle
jawabon me wahi dohraya tha bina build plan padhe.

Faisla (D-40): screens **aage khisak gayi**, wahi precedent jo Users ke saath laga tha —
client ke design me Settings poora maujood hai. **Sections plan se nahi, design se**:
General · SEO & Schema · Email/SMTP · Integrations. Design ne "Reading" ko General ke
andar hi rakh diya hai, aur Permalinks/Scripts uske paas hain hi nahi.

**Kya bana**

```
packages/shared/src/schemas/settings.js   Zod contract + defaults + toPublicSettings
apps/api/src/modules/settings/            paanch file ka poora module
migrations/005-settings.js                unique index + pehla document
apps/admin/src/screens/settings/General   design ke chaar section
```

**Teen faisle jo code me dikhte hain**

1. **Site URL read-only hai.** Design me input jaisa dikhta hai, par value `env.SITE_URL`
   se aati hai aur settings document me wo field hai hi nahi. Usi value pe CORS allowlist
   aur canonical URLs khade hain (D-12) — admin ke haath me dena matlab ek galat entry
   site ke links aur security dono ek saath tod de. Screen wajah bhi likhti hai.
2. **Document migration me banta hai, sirf seed me nahi** — D-36 ka wahi sabak: seed sirf
   naye instance pe chalti hai. Upar se service ka read self-healing hai.
3. **Logo, Favicon, Homepage disabled hain** (Media Phase 2, entries Phase 1) — D-30.

**Ek asli bug test ne pakda**

`social` nested hai. Service dot-notation theek use kar rahi thi, par
`updateSettingsSchema` me har link pe `.default()` tha — to
`{ social: { instagram: x } }` parse hote hi **facebook aur youtube `` ban jaate**.
Yaani ek link badalne se baaki do chup-chaap ud jaate. Schema service ki mehnat pehle hi
bekaar kar deta tha. Ab update wala social **nested partial** hai.

**Tests:** 214 → **231** (17 naye). Lint, prettier, admin build clean.

**⚠️ Ek blocker mila jo 20 Aug ka bacha hua hai**

`pnpm cms migrate:status` kehta hai `004-sync-builtin-role-permissions.js` **modified**
hai. File git me kabhi badli nahi — par migration **13:35** pe chali thi aur commit
**19:07** pe hua, aur beech me `pnpm format` ne use reformat kar diya. DB me purana
checksum pada hai.

`migrate()` checksum mismatch pe **throw** karta hai, isliye **005 apply nahi ho sakti**
jab tak ye theek na ho. 004 ka `up()` poori tarah idempotent hai (code se permissions
`$set` karta hai), isliye ledger row hata kar dobara chalana surakshit hai — par wo
client ke dev DB pe likhna hai, isliye poochha gaya hai.

**General ka design theek kiya — aur ek galti pakdi gayi**

Client ka faisla. Us section ke teenon fields (Front page displays · Homepage · Posts per
page) ka koi asar hi nahi hai jab tak `entries` na aayen. Ek disabled field khaali dikhta
hai; poora section jiske saare controls kuch karte hi nahi — wo **jhootha** lagta hai.
Fields schema me maujood hain, sirf UI Phase 1 me aayegi. D-40 me likh diya.

**Media ka faisla: alag session me**

Logo/Favicon ke liye Media chahiye, aur Media Slice 0 ka bhi blocker hai (D-27 ke scope me
"logo" likha hai). Recommendation di thi — **poora Phase 2 Media nahi, sirf uski
foundation** (model · storage driver abstraction · upload hardening · sharp variants),
kyunki Settings pe alag "logo upload" banane se do upload raaste ban jaate aur logo
`media` collection se bahar reh jaata. Client ne kaha wo **naye session me** hoga taaki
Media ka poora kaam ek hi session me rahe.

**Agla:** Media foundation (naya session) → phir General ka Logo/Favicon → General poora.
Uske baad Slice 0 — Header + Footer (D-27).

---

## 2026-08-20 (shaam) — Users module poora; RBAC ka faisla pending

**Kya hua**

- Users backend + screens bane: list (pagination, role tabs, search), add, edit,
  delete (reassign dropdown ke saath), `/api/roles`
- Client ne screens test kiye, teen changes maange — sab lag gaye (D-35):
  row me sirf Edit | Delete · Edit se status hataya · **password sirf admin set karta
  hai**, user khud nahi badal sakta
- Uska doosra aadha hissa jodna pada: Edit User me password field. Bina uske bhoole
  hue password ka koi recovery raasta hi nahi bachta

**Chaar bug mile, chaaron chup-chaap fail hone wale**

1. `z.coerce.boolean()` — `Boolean('false') === true`. `COOKIE_SECURE` kabhi off ho
   hi nahi sakta tha, aur uska nateeja tha "login 200 deta hai par session tikta nahi"
2. Migration runner missing directory pe chup-chaap `[]` lautata tha — `pnpm cms
migrate` "koi pending nahi" bol kar exit 0 deta, indexes bante hi nahi
3. Role ka wajood kahin check hi nahi hota tha — `role:"wizard"` wala user ban jaata,
   201 milta, par permissions khaali aur har screen pe 403
4. **Sabse zaroori:** `ensureDefaultRoles()` existing role ko poora skip kar deta tha.
   Matlab code me joda gaya koi bhi naya permission string kisi chalu instance tak
   pahunchta hi nahi tha. `user.delete` isi wajah se Delete button gayab kar raha tha
   → D-36: built-in roles code-owned, hamesha sync, aur migration 004

Aur ek: galat id pe Mongoose CastError seedha 500 banta tha — ab 404.

Do galat baatein maine kahin thin aur wapas leni padin: "Next 15 ko React 19 chahiye"
(nahi — asli wajah `.claude/settings.json` ka `NODE_ENV=development` tha) aur
"CI ka build red hai" (nahi — wo sirf mere chalane par toota tha).

**Faisle:** D-34 (username immutable · asli delete + reassign · admin protected) ·
D-35 (password admin set karta hai · deactivate UI se hata) · D-36 (built-in roles
code-owned, permissions hamesha sync).

**Tests:** 44 → **184**. `pnpm dev` chalta hai, login se delete tak sab asli DB pe
verify kiya.

**Agla — yahin se uthana hai**

Client ne **role-based access control** maanga: Users → Roles submenu, aur role ko jo
sections diye jaayein sirf wahi sidebar me dikhein. Maine approach samjha di
(teen layer · scope wale permissions · role screen ka shape · D-36 ka takraav), par
**abhi tak koi code nahi likha aur do cheezein pending hain**:

1. Spec `006-rbac.md` likhni hai (client ne "haan" nahi bola abhi)
2. **Ek faisla client se lena hai:** built-in roles (jaise `salesAgent`) ko edit karne
   dein, ya unpe "Duplicate" karke copy edit karein? D-36 kehta hai built-in roles har
   deploy pe code se sync hote hain — agar admin unhe edit kare to agla deploy uske
   changes mita dega

## 2026-08-20 — Auth + RBAC + admin shell; docs ko asli state pe laaya

**Kya hua**

- `/status` chalaya to sabse bada mismatch `09-OPEN-ITEMS.md` me tha — "code shuru
  nahi hua" likha tha jabki Phase 0 ~65% ho chuka tha. Wo aur `CLAUDE.md` sync kiye
- Q-1 (login screen) client se clear hua → D-31
- **Backend auth poora:** User/Role/RefreshToken models, migration 002 (TTL index ke
  saath), JWT + cookie layer, CSRF double-submit, `requirePermission()`,
  login/refresh/logout/change-password, `GET|PATCH /api/me`, roles seed
- **Admin shell:** login screen, protected routes, AdminBar, Sidebar (design ke poore
  menu ke saath), `mustChangePassword` gate, NotBuiltYet placeholder screens
- `lib/api.js` ka purana TODO poora — **single-flight refresh mutex** (D-13)
- Tests 44 → **130**. Auth ke integration tests asli Mongo pe chalte hain
- Asli Mongo pe end-to-end verify: login → rotation → reuse detection → family revoke

**Teen asli bug jo raaste me mile**

1. `emailSchema` me `.email()` `.trim()` se **pehle** chal raha tha — `a@b.com`
   reject hota tha aur user ko "email sahi nahi lag raha" dikhta, jabki email sahi thi
2. `.env` file maujood thi par **use koi load hi nahi karta tha** — na dotenv, na
   `--env-file`. `pnpm seed` iske bina chal hi nahi sakti thi (D-33)
3. Migration runner missing directory pe **chup-chaap `[]`** lautata tha —
   `pnpm cms migrate` "koi pending nahi" bol kar exit 0 deta tha aur indexes bante
   hi nahi. Ab loud error deta hai. (`.env` ka `MIGRATIONS_DIR` cwd-relative hai,
   isliye ye asli me ho raha tha)

Ek regression khud banayi aur pakdi: `.env` load karne se **test env local file pe
depend karne laga** (`COOKIE_SECURE=true` se cookie ke naam badle aur ek test fail
hua). Ab `NODE_ENV=test` pe `.env` load hoti hi nahi.

**Faisle:** D-31 login screen · D-32 `bcryptjs` (native bcrypt nahi) · D-33 `.env`
Node ke apne loader se. Aur `07-CONVENTIONS.md` me **R15** likha — "design change
client se aata hai" rule pehle kahin likha hi nahi tha (docs use galti se "rule 8"
bolte the, jabki R8 Zod validation hai).

**Agla**

1. Users screens — list (server-side pagination), invite, edit, deactivate
2. Settings General
3. `roles` module ko `routes.js` do (abhi sirf model + service hai)
4. `apps/api/.env` me `COOKIE_SECURE=false` aur `MIGRATIONS_DIR` wali line theek karo

---

## 2026-08-20 — Client ke asli design aaye; CSS architecture tay hui

**Kya hua**

- Client ne do asli design diye — public site (Andaman travel) aur admin (travel CMS).
  Dono analyse kiye: `docs/10-REFERENCE-DESIGN.md` aur `docs/11-REFERENCE-ADMIN.md`
- Admin design ab **SPEC** hai, reference nahi. `04-ADMIN-UX.md` secondary ho gaya
- CSS architecture tay hui aur implement bhi — Tailwind hataya, plain CSS aaya

**Faisle**

- D-28 Plain CSS — Tailwind, CSS Modules, CSS-in-JS teenon reject.
  Sabse bada reason: blocks ka theming contract stable class names maangta hai,
  Tailwind utility classes se wo toot jaata hai. shadcn/ui bhi gaya (Tailwind pe
  khada tha) — uski jagah Radix primitives aayenge.
- D-29 `salesAgent` paanchwa role. Design ke users list me 4 users us role me hain,
  aur enquiry assignment usi pe chalta hai. D-26 ko partially supersede karta hai.
- D-30 Ruki hui cheezon ke connection point abhi banao — field, API shape aur UI ki
  jagah abhi; data baad me. Khaali cheez khaali dikhe, tooti hui nahi.
- Design badal sakta hai par change client se aayega, developer se nahi (rule 8)

**Design se jo gaps mile**

- Mega-menu — humara menu model simple nested tree hai, design me columns aur
  non-clickable group headings hain. Slice 0 me fix karna hai
- Enquiries ek mini-CRM hai (pipeline, assign, quotation, notes), form inbox nahi.
  Plan me sirf "submissions inbox" tha — bahut under-scoped
- Field DSL me `matrix` aur `table` types chahiye (occupancy slabs, departures)
- Public site "listing" site hai — 20 me se 13 sections ek hi card shape ke.
  Matlab Phase 6 (dynamic lists) is client ke liye Phase 5 se zyada zaroori hai

**Analysis: Appearance / Users / Settings kitne ruke hain**
Users ~90% · Settings ~75% · Appearance ~40%. Teenon `requirePermission()` pe
depend karte hain, aur wo Users module hai — isliye auth pehle.

**Agla:** Phase 0 ka auth — models, login, refresh rotation + reuse detection,
CSRF, requirePermission(), admin login screen + protected routes.
Uske baad Users + Settings, phir Appearance.

**Ek sawaal pending:** login screen design me hai kya? Nahi to WordPress-style
simple banega.

---

rate limit, pino, error envelope, /api/health, graceful shutdown)

- Zod contract freeze (spec 002): block envelope, content, seo, entry +
  create/update/listQuery. Permissions constants (spec 001). Field DSL (D-24).
  JSDoc typedefs.
- Migration runner: dono system — schema (numbered + ledger + checksum guard +
  down() mandatory) aur block-tree (per-document, lazy). CLI: pnpm cms migrate.
  Pehli migration: entries ke 6 indexes.

**Verify (asli mongo pe, sirf test nahi)**
migrate → 6 indexes bane · dobara → no-op · migrate:down → indexes gaye ·
file edit → checksum guard fire · API boot → /api/health 200

**Bug jo mila aur fix hua**
MIGRATIONS_DIR cwd se resolve hoti thi, apps/api se chalane pe ledger "missing"
dikhata tha. Env var override se fix. Ye sirf `pnpm test` se pakda hi nahi jaata —
health endpoint hit karne se mila.

**Faisle:** koi naya nahi

**Desktop pe do files banayi** (samajhne ke liye, repo se bahar)
CMS-Technology-Guide.html · CMS-Build-Roadmap.html

**Agla:** Phase 0 ka auth — User/Role/RefreshToken models + migration, login/logout,
refresh rotation + reuse detection, CSRF, requirePermission(), seed, admin shell.
User se poochha tha: ek saath karein ya do hisson me — jawab pending.

---

## 2026-08-19 — Coding shuru: setup + contract + migrations

**Kya bana**

- Phase 0 setup layer: pnpm monorepo, 3 apps + 2 packages, docker (mongo 8),
  ESLint 10 + Prettier, GitHub Actions CI, Express base (helmet, CORS allowlist,
  rate limit, pino, error envelope, /api/health, graceful shutdown)
- Zod contract freeze (spec 002): block envelope, content, seo, entry +
  create/update/listQuery. Permissions constants (spec 001). Field DSL (D-24).
  JSDoc typedefs.
- Migration runner: dono system — schema (numbered + ledger + checksum guard +
  down() mandatory) aur block-tree (per-document, lazy). CLI: pnpm cms migrate.
  Pehli migration: entries ke 6 indexes.

**Verify (asli mongo pe, sirf test nahi)**
migrate → 6 indexes bane · dobara → no-op · migrate:down → indexes gaye ·
file edit → checksum guard fire · API boot → /api/health 200

**Bug jo mila aur fix hua**
MIGRATIONS_DIR cwd se resolve hoti thi, apps/api se chalane pe ledger "missing"
dikhata tha. Env var override se fix. Ye sirf `pnpm test` se pakda hi nahi jaata —
health endpoint hit karne se mila.

**Faisle:** koi naya nahi

**Desktop pe do files banayi** (samajhne ke liye, repo se bahar)
CMS-Technology-Guide.html · CMS-Build-Roadmap.html

**Agla:** Phase 0 ka auth — User/Role/RefreshToken models + migration, login/logout,
refresh rotation + reuse detection, CSRF, requirePermission(), seed, admin shell.
User se poochha tha: ek saath karein ya do hisson me — jawab pending.

**Kya hua:** …

**Faisle:** … (ya "koi nahi")
**Agla:** …

```

---
## 2026-08-19 — 8 faisle liye, specs approve hue

**Kya hua**

- User se 8 sawaal poochhe, sab ke jawab mile
- Specs 001, 003, 004, 005 → Approved
- 4 naye decision records: D-24 se D-27

**Faisle**

- D-24 Field DSL: **ek DSL** (contexts: content|block), do nahi
- D-25 Trash: **`deletedAt` field**, `status: 'trash'` nahi — restore pe purani state wapas
- D-26 Roles: **char** — `subscriber` nahi. `entry.purge`/`media.purge` sirf admin
- D-27 Pehla milestone: **Slice 0 = Header + Footer** end-to-end
- TypeScript: **nahi** — sab JavaScript, D-03 waise hi
- Seed: **khaali** Home + Blog, koi demo blocks nahi
- Payload spike: **approved**, Phase 1 se pehle

**User ka input (Slice 0 pe)**
Slice normal content page ka nahi, **header/footer** ka hoga — logo, navigation, CTA,
footer columns/social/copyright ka minimal admin config, save/publish, aur public site
pe render. Page builder abhi nahi.

**Imaandari se:** ye slice cache invalidation aur settings/menus pipeline verify karti
hai, par **preview parity nahi** — usme blocks chahiye. Wo risk Phase 5 tak khula.

**Agla**

1. A-2 — Zod contract likho (`packages/shared`)
2. Phase 0 setup layer shuru
3. Payload spike parallel me

---

## 2026-08-19 — Docs v3: merge + `.claude` workspace

**Kya hua**

- Teenon planning docs merge karke topic-wise 10 documents banaye (`.claude/docs/`)
- `03-DECISIONS.md` naya — 23 decisions with context/why/rejected/consequences
- `08-RISKS.md` naya — top 5 risks + 28 traps + phase-wise pre-flight
- `.claude/` workspace banaya — agents, commands, skills, specs, memory
- Root `CLAUDE.md` banaya
- 5 specs banaye: 001 permissions (draft), 002 content contract (pending),
  003 env schema (draft), 004 seed (draft), 005 field DSL (faisla pending)
- Purane docs `docs/archive/v1/` aur `docs/archive/v2-monolithic/` me safe

**Faisle:** koi naya nahi — sirf existing decisions document kiye gaye

**Naya finding:** `contentTypes.fields[]` aur `blockDefinition.schema[]` do alag
field systems hain jo docs me kabhi connect nahi hue. ~50% overlap. Ek DSL banane se
Phase 6 ka kaafi kaam kam ho jaata hai. → `specs/005-field-dsl.md`

**Agla**

1. Specs 001, 003, 004 review + approve
2. 005 (field DSL) ka faisla lo
3. C-1 (TypeScript for packages) ka spike
4. 002 (Zod contract) likho aur freeze
5. `git init` + Phase 0 setup layer shuru

---

## 2026-08-19 — Architecture review + docs v2

**Kya hua**

- Teen planning docs ka independent architecture review
- WordPress ke against product/IA validation
- Findings v2 me merge kiye: distribution model, migrations, URL/path model,
  status lifecycle, cache authority, block→CSS strategy, admin IA
- `admin-wireframe.html` banaya — 7 clickable screens

**Faisle (v2 me added)**

- D-15 distribution: versioned `@cms/*` packages + patla client repo
- D-09 routing: stored `entries.path` + unique index
- D-08 responsive: server-generated scoped CSS
- D-07 preview parity: host-injected primitives
- D-14 cache: Next ISR single authority + tag invalidation
- D-18 statuses: `pending` + `private` + trash

**Agla:** docs organize karna
```
