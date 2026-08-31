# Handoff — style pass (sab screens, khaas kar mobile)

> Ye ek **handoff** hai, permanent doc nahi. Kaam khatam hone pe delete kar dena.
> Likha: 31 Aug 2026, us session se jo D-65 · D-66 · D-67 pe kaam kar rahi thi.

## Kaam

Public site aur admin dono ko reference design ke hisaab se **har screen size** pe theek
karna. Client ne khaas kar mobile pe farak batayaa hai.

**Pehle `.claude/CLAUDE.md` aur `docs/07-CONVENTIONS.md` padho** — R15 (design frozen) aur
R17 (UI text English) is kaam pe seedha lagte hain.

## Reference kahan hai

| File                                       | Kiska spec                       |
| ------------------------------------------ | -------------------------------- |
| `.claude/docs/reference/itinerary-v3.html` | public **package page**          |
| `.claude/docs/reference/home-nav-v3.html`  | public **header / nav / drawer** |
| `.claude/docs/reference/admin-design.html` | **admin** ka poora layout        |

Analysis: `docs/10-REFERENCE-DESIGN.md` (public) · `docs/11-REFERENCE-ADMIN.md` (admin).

---

## ✅ Public **package page** ka responsive ho chuka hai (31 Aug)

Neeche wali table ab **itihaas** hai — package page wale saare selector theek kiye ja chuke
hain. Verify karne ka tareeka ab likha hua hai:

```bash
node .claude/scripts/media-diff.mjs                                    # package page
node .claude/scripts/media-diff.mjs .claude/docs/reference/home-nav-v3.html   # header/nav
```

Ye script `css-diff.mjs` ki kami bharti hai — wo media blocks ko **jaan-boojh kar hata**
deti hai, isliye responsive ka poora hissa kisi check me aata hi nahi tha.

**Jo bacha hai:** admin (`admin-design.html`), aur public ka footer grid (neeche dekho).

## 🎯 Breakpoints hi alag the — ye thi asli wajah

Layout flip **galat chaudai** pe ho raha tha, CSS galat nahi thi.

| Kya                              | Reference               | Pehle hamare     | Ab                  |
| -------------------------------- | ----------------------- | ---------------- | ------------------- |
| `.pgl` — sidebar collapse        | **1180px** + **1024px** | 1000px (ek step) | ✅ do step          |
| `.pgl__side`                     | **1024px** + **760px**  | 1000px           | ✅                  |
| `.ptitle` · `.ptitle__p`         | **1080px**              | 1000px           | ✅                  |
| `.gal` — hero mosaic             | **860px**               | 760px            | ✅                  |
| `.inx` — Included / Not included | **760px**               | rule hi nahi tha | ✅                  |
| `.itin__d` · `.itin__k`          | **860px**               | 860 **aur** 760  | ✅ duplicate hataya |
| `.offer__in` — CTA card          | **1024px**              | 860px            | ✅                  |
| `.mega--md`                      | **1180px**              | rule nahi        | ✅                  |

Sabse asardaar `.pgl` wala tha: reference **do** kadam me girta hai (pehle sidebar 322→290px,
phir 1024 pe neeche), hamare paas ek hi step tha — isliye **1024–1180px ke beech** page
reference se milta hi nahi tha.

Do cheezein jo karte waqt kaatti hain, dono ab CSS me comment ke saath likhi hain:

- **`.gal` ka `:has()` guard.** `.gal:has(...)` ki specificity `.gal` se zyada hai, isliye
  media block me dono ko **saath** likhna padta hai — warna 5 se kam image wale pool pe
  mobile layout lagta hi nahi.
- **`border-radius` pe `!important`.** Desktop ke kinare `.gal button:nth-child(3)` /
  `:last-child` pe hain (0,2,1), media ka `.gal button` (0,1,1) unse haar jaata hai.

`.gal a` → hamare theme me `.gal button` hai (D-66); script me uska rename map likha hai.

---

## ⛔ Ye mat badalna — ye jaan-boojh kar reference se alag hain

Har ek **client ke faisle** se hai (R15). "Design se match karo" ke naam pe inhe wapas
karna is project me pehle bhi ho chuka hai, aur har baar dobara palatna pada.

| Kya                                           | Kahan                | Kyun                                                                                                                                                 |
| --------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.btn` ka padding / font-size                 | `globals.css:180`    | Client ne khud tune kiya (25 Aug). Reference ka `.b` 11px 20px / 14px pe hai; hamara compact hai. **Comment code me likha hai.**                     |
| `.toggle-ico` **14px** (reference 11px)       | `primitives.css:119` | Client ne bada karwaaya (D-64) — 11px pe caret ek dhabba lagta tha, aur wo admin me 40 jagah hai                                                     |
| `.panel-foot` ka `flex-wrap: wrap`            | `primitives.css`     | Design me nahi hai, par nuksaan bhi nahi — jaan-boojh kar chhoda gaya                                                                                |
| Hotels table me `or similar` **nahi** hai     | `Pricing.jsx`        | Client: "jo name hoga wahi dikhega, apne side se add mat karo" (D-65)                                                                                |
| Hero pe **lightbox** hai                      | `Lightbox.jsx`       | Design me lightbox/modal/popup **0 baar** hai. Client ne maanga (D-66)                                                                               |
| CTA card ka box **static text** hai           | `CtaSection.jsx`     | Design me daam derive hota tha; client ne band kiya (D-67)                                                                                           |
| `.sec` / `.sec--white` **nahi banayi**        | —                    | Reference me CTA us wrapper me hai; hamare theme me `.sec` hai hi nahi, sab `.wrap` use karte hain (D-67)                                            |
| Appearance me sirf **Menus + Footer**         | `nav.js`             | Homepage Blocks aur Banners & Sliders jaan-boojh kar hataye (D-43)                                                                                   |
| Header 1040px pe sikudta hai (ref 600px)      | `globals.css`        | 1040 wahi jagah hai jahan nav chhup kar burger banta hai. Do alag breakpoint rakhne se beech ki widths pe adhoori haalat banti — comment code me hai |
| `.brand__img` **750px** pe chhota (ref 600px) | `globals.css`        | Hamare header me logo + do button + burger ek line me aate hain; tangi 750 pe hi shuru ho jaati hai — comment code me hai                            |
| `.burger` base hi **33px** (ref 38px)         | `globals.css`        | Reference 600px pe 33px karta hai; hamara burger dikhta hi 1040 se neeche hai, isliye 33px seedha base pe                                            |
| Footer **flex** hai, `.ft__g` grid nahi       | `globals.css`        | D-44 — client column ki ginti aur har column ki width khud chunta hai; reference ka fix grid us model me fit hi nahi hota                            |

⚠️ **Aur ek aam niyam:** client CSS ki values khud haath se tune karta hai. Koi value
reference se alag mile aur uske upar comment ho — wo galti nahi hai. Comment padho, phir
haath lagao.

---

## 💣 Is codebase me CSS ke teen chup failure

Teenon pehle ho chuke hain. Har ek me koi error nahi aata — bas dikhna galat ho jaata hai.

**1. Ek-class wale override bharose ke laayak nahi hain.**
`primitives.css` ka `.sel { width: 100% }` aur tumhara `.my-class { width: 130px }` — dono
ki specificity (0,1,0). Barabar hone pe jeet **load order** se tay hoti hai, aur component
CSS bundle me primitives se **pehle** aati hai. Do baar kaat chuka hai: `.edit-grid` ×
`.appearance-grid` (D-43), aur `.ftr-block-icon` (D-44 §6 — usme Label ka input 20px ke
dabbe me nichud gaya tha aur client ko dikha hi nahi ki wahan koi field hai).
**Ilaaj:** do class likho — `.ftr-block-head .sel.ftr-block-icon`.

**2. CSS variable missing ho to browser chup rehta hai.**
`background: var(--blue-900)` jab token defined hi na ho → **transparent**. Koi error, koi
warning nahi. Poora footer grey dikhne laga tha (D-44 §7). Naya token add karo to ek baar
aankh se dekh lo.

**3. `:has()` wale layout guards.**
`.gal:has(button:nth-child(-n + 4):last-child)` jaisa rule 5 se kam images pe strip banata
hai. Selector badlo to ye bhi badalna padega — warna khaali pool pe grid tootta hai.

---

## Territory — takraav se bachne ke liye

Aaj (31 Aug) ki main session ne ye files chhui hain. Inpe kaam karte waqt pehle `git pull`
/ latest commit dekh lena:

```
apps/web/app/globals.css                    ← lightbox + CTA card ka CSS aaj juda
apps/web/components/package/*.jsx           ← SectionHead · Lightbox · CtaSection naye
apps/admin/src/screens/appearance/Appearance.css   ← footer label ki width aaj badli
apps/admin/src/screens/settings/CtaSection.jsx     ← naya
packages/shared/src/constants/package-sections.js  ← naya
```

⚠️ **Do session ek saath CSS pe kaam na karein.** 25 Aug ko yahi hua tha aur do commit
hunk-level pe alag nahi ho paaye — dono ek hi commit me jaana pada (`project-state.md` me
likha hai). Main session ab **style pe kuch nahi chhoo rahi**; ye pass poori tarah is
session ka hai.

---

## Verify kaise karo

```bash
docker compose up -d mongo
pnpm dev                 # api :4000 · admin :5173 · web :3000
```

Dev server **LAN/tunnel se khulta hai** (27 Aug) — asli phone pe kholne ke liye
`EXTRA_CORS_ORIGINS` me apna origin daalna hoga, `docs/06-OPERATIONS.md` §4.0.

Public page: `http://localhost:3000/packages/discover-andaman`
Admin: `http://localhost:5173`

Har change ke baad:

```bash
pnpm lint && pnpm format:check && pnpm test
pnpm --filter @cms/admin build
```

⚠️ **CI ka pehla step `pnpm format:check` hai** — push se pehle hamesha chala lo, warna CI
pehle hi step pe red ho jaata hai.

⚠️ **Push sirf permission pe.** Ye is project ka pakka niyam hai.

## Doc update

Style ka kaam bhi doc rule se bandha hai (`CLAUDE.md` → "Doc update rule"):

- Koi **client ka faisla** aaye jo design se hate → naya `D-xx` `docs/03-DECISIONS.md` me
- Admin ka koi screen/nav badle → `docs/04-ADMIN-UX.md`
- Us table me bhi likho jo `04-ADMIN-UX.md` ke aakhir me hai (design se liye gaye farq)
