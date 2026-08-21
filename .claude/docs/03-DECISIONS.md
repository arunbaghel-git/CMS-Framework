# 03 — Decisions

Har bada faisla, uska **kyun**, aur jo **reject kiya** wo bhi. Ye doc isliye hai ki
6 mahine baad koi (ya aap khud) "ye aisa kyun hai?" pooche to jawab yahin mile — aur
galti se koi settled cheez dobara na khole.

Format: **Context → Decision → Kyun → Reject kiya → Nateeja**

---

## D-01 · Per-client instance, multi-tenant SaaS nahi

**Context:** Agency ke paas 10-20 clients honge. Sabko ek app se serve karein ya har
client ka apna deployment?

**Decision:** Har client ka **apna instance** — apna deployment, apna database, apna
domain, apna admin login. Core code sab me same.

**Kyun:** Data isolation automatic mil jaata hai. Multi-tenant me har query me
`siteId` scoping chahiye — aur **ek query bhoolna cross-site data leak hai**, ye
security bug class hai, feature nahi. Saath hi ek client ka traffic spike doosre ko
affect nahi karta, aur client-specific block/theme baaki clients pe asar nahi daalta.

**Reject kiya:** Multi-tenant single deployment. Ye tab sahi hai jab **SaaS** banana ho
(client khud signup kare). Agency model me nahi.

**Nateeja:** Ops cost badhta hai — isiliye D-15 (distribution) aur shared Mongo cluster
zaroori ho jaate hain. `siteId` field phir bhi day 1 se reserve hai, taaki kabhi
multi-site karna pade to bade data pe index rebuild na karna pade.

---

## D-02 · Public site Next.js pe

**Context:** MERN plan tha, matlab React SPA. Par SEO headline feature hai.

**Decision:** Public site **Next.js App Router** pe — SSR/ISR ke saath.

**Kyun:** Pure SPA me crawler ko khaali `<div>` milta hai. Next.js React hi hai, aur
sitemap, ISR, image optimization, metadata API, cache invalidation — sab built-in.

**Reject kiya:** Express + `react-dom/server` se manual SSR. Kaam karta, par upar wali
har cheez khud likhni padti — motay taur pe 3-4 hafte extra, aur permanently maintain
karni padti.

**Nateeja:** Teen apps ho gaye (api, admin, web). Isliye packaging me care chahiye —
deploy **ek unit** ki tarah hota hai, teen alag services ki tarah nahi.

---

## D-03 · JavaScript, TypeScript nahi

**Context:** Poora system ek recursive JSON tree, ek plugin registry, aur teen apps me
shared contracts pe khada hai — ye TypeScript ka sabse strong use-case hai.

**Decision:** **JavaScript (ESM)** everywhere.

**Kyun:** Team ki familiarity. Ye ek legitimate architectural input hai.

**Trade-off saaf hai:** jo safety compiler deta, wo ab **runtime pe** leni padegi. Teen
cheezein non-negotiable ho jaati hain:

1. **Zod har boundary pe** — API input, block props, contentType fields, aur har query param
2. **`jsconfig.json` + `checkJs: true` + JSDoc typedefs** core shapes pe
3. **Block tree operations pe unit tests** — JS me yahi wo jagah hai jahan silent bugs
   sabse zyada aate hain

**Abhi bhi khula:** `packages/shared` aur `packages/blocks` ko TS rakhna (ya Zod se
`.d.ts` generate karna) — ye do packages har app import karta hai, aur `z.infer` se
types waise bhi free milte hain. App code JS reh sakta hai.
→ [`09-OPEN-ITEMS.md`](09-OPEN-ITEMS.md)

---

## D-04 · Ek `entries` collection, "sab kuch content hai"

**Context:** Pages, posts, services, portfolio — alag collections ya ek?

**Decision:** **Ek `entries` collection**, `type` field se alag.

**Kyun:** Custom content types lagbhag free mil jaate hain. Ek list screen, ek editor,
ek permission model, ek search index — sab reuse hote hain. Naya type banane ke liye
code nahi likhna padta (D-06 ke saath milkar).

**Reject kiya:** Per-type collection. Har naye type pe naya model + service +
controller + admin screen — matlab "framework" ka wada hi toot jaata.

**Nateeja:** **UI me `entries` kabhi nahi dikhega** (D-19). Aur `fields` ko Mixed rakhna
padta hai, jiska matlab query params pe strict Zod validation zaroori hai — warna NoSQL
injection ka seedha raasta ban jaata hai.

---

## D-05 · Layout JSON tree me, HTML string me kabhi nahi

**Context:** Page builder ka output kaise store ho?

**Decision:** `{ id, type, props, style, children[] }` ka **JSON tree**.

**Kyun:** HTML string save karte hi teen cheezein hamesha ke liye marr jaati hain —
content dobara edit karna, theme badalna, aur responsive control. Migration bhi
impossible ho jaata hai.

**Reject kiya:** HTML/markdown string, ya "hybrid" (kuch HTML kuch JSON).

**Nateeja:** Block ka `type` string ab DB me stored data hai — **use kabhi rename mat
karo**. Iske liye `content.version` + block-tree migration chahiye (D-16).

---

## D-06 · Block definition me `schema[]` — properties panel auto-generate

**Context:** Har naye block ke liye properties panel bhi haath se likhna padega?

**Decision:** Block definition me ek **`schema` array** ho, jisse properties panel
**automatically** generate ho.

**Kyun:** Yahi wo ek cheez hai jo ise "CMS framework" banati hai, "ek website" nahi.
Naya block = **ek file**. Properties panel, drag list, defaults — sab schema se.
Core code touch nahi hota.

**Nateeja:** Field-type ka set ek DSL ban jaata hai, aur wo `packages/shared` me rehna
chahiye. **Khula sawaal:** kya `contentTypes.fields[]` bhi yahi DSL use kare?
→ [`09-OPEN-ITEMS.md`](09-OPEN-ITEMS.md)

---

## D-07 · Shared renderer + host-injected primitives

**Context:** "Preview me kuch, live pe kuch aur" — ye CMS ka sabse trust-todne wala bug
hai. Isse kaise roka jaaye?

**Decision:** Renderer ek hi jagah (`packages/blocks`), **aur** host apne primitives
inject kare:

```jsx
<BlockRenderer blocks={...} components={{ Link, Image }} />
```

**Kyun:** Sirf component share karna **kaafi nahi hai** — host alag hai. Admin canvas
Vite iframe hai, live page Next.js. Agar blocks `next/image` import karein to canvas
toot jaayega; agar na karein to live site pe image optimization chali jaayegi.
Injection dono bacha leta hai.

**Reject kiya:** (a) Do alag renderer — wahi bug jise rok rahe hain. (b) Blocks me Next
primitives hardcode — canvas hi na chale.

**Escape hatch:** agar Phase 5 me phir bhi divergence dikhe, canvas iframe ko asli Next
app pe draft-mode me point kar do — tab preview _hai hi_ live.

---

## D-08 · Responsive = server-generated scoped CSS

**Context:** `style.{desktop, tablet, mobile}` ko asli CSS me kaise badlein?

**Decision:** Block `id` se class (`.blk-b1`), aur render pe ek `<style>` emit ho jisme
**asli media queries** hon. Function `styleToCss()` `packages/blocks` me.

**Kyun:** **Inline styles se media query likhi hi nahi ja sakti** — matlab responsive
model inline style se implement ho hi nahi sakta. Ye ek hard technical limit hai,
preference nahi.

**Reject kiya:** (a) Inline styles — kaam hi nahi karta. (b) CSS-in-JS — bundle weight

- SSR extraction ki complexity. (c) Utility classes — value space bahut hi seemit ho
  jaata.

**Nateeja:** CSP me is `<style>` ke liye nonce chahiye. Aur value space constrained
rakhna hoga (spacing scale, token colors) — free-form CSS nahi (D-20).

---

## D-09 · Routing ka single source: stored `path` field

**Context:** URL kaise resolve ho? `{siteId, type, slug}` unique hai — kaafi hai?

**Decision:** Har entry pe computed **`path` field stored**, `{siteId, locale, path}`
**unique**. `apps/web` me sirf ek catch-all route.

**Kyun:** `{siteId, type, slug}` unique hone ke baawajood ek `page` "about" aur ek
`service` "about" **dono `/about` pe resolve kar sakte hain** — unique index isko rok
nahi paata. Aur `by-path` query ko har request pe url pattern reverse-engineer karna
padta.

**Reject kiya:** Runtime pe path compute karna; per-type hardcoded routes jaise
`app/blog/[slug]` — wo `contentType.urlPattern` ke configurable hone ka matlab hi
khatam kar deta hai.

**Nateeja:** Parent ka slug badle to **descendants ka path cascade update** karna hoga

- har ek pe 301. Reserved slugs (`/admin`, `/api`) block karne padenge.

---

## D-10 · Business logic service layer me, Mongoose hooks me nahi

**Context:** Revision snapshot, cache invalidation, publish state machine — kahan likhein?

**Decision:** Mongoose hooks me **sirf pure data normalization** (slugify, trim,
`updatedAt`, counts). Koi side effect nahi, koi I/O nahi. Baaki sab **service layer** me.

**Kyun:** `updateOne` / `findOneAndUpdate` / `bulkWrite` `save` hooks **chalate hi nahi
hain**. Hook me rakha logic chup-chaap skip ho jaayega — **koi error nahi, koi log
nahi**. Ye debug karne me sabse mushkil bug class hai.

**Nateeja:** Controller patla, model sirf schema, saara kaam `service.js` me. Test bhi
service layer pe likhe jaate hain.

---

## D-11 · Scheduled publish DB-based, `setTimeout` se kabhi nahi

**Context:** "Is post ko kal 9 baje publish karo" kaise implement ho?

**Decision:** `status:'scheduled'` + indexed `publishAt`. Cron har minute **atomic
`findOneAndUpdate`** se claim kare. Saath hi public read query khud bhi
`scheduled && publishAt <= now` ko published maane.

**Kyun:** `setTimeout` restart pe schedule kho deta hai — chup-chaap. Atomic claim
multi-instance pe double-publish rokta hai. Aur read-query wali baat isko
**self-healing** banati hai: cron band ho jaaye to bhi site sahi dikhegi.

**Reject kiya:** `setTimeout`, aur "sirf cron" (bina self-healing read).

---

## D-12 · Same-origin topology

**Context:** Admin aur API alag domain pe hon ya ek?

**Decision:** **Same-origin** — admin `example.com/admin`, API `example.com/api`, ek
reverse proxy ke peeche.

**Kyun:** Cross-origin (`admin.x.com` ↔ `api.x.com`) me `SameSite=None` majboori ban
jaati hai, aur **SameSite ka protection zero ho jaata hai** — phir CSRF token akela
sahara bachta hai. Same-origin me `SameSite=Lax` kaam karta hai aur token
defence-in-depth ban jaata hai.

**Nateeja:** Dev me Vite proxy se wahi setup banana padega. Aur **state-changing GET
kabhi nahi** — `SameSite=Lax` top-level GET navigation pe cookie bhejta hai.

---

## D-13 · httpOnly cookies + `refreshTokens` collection

**Context:** Token kahan store ho, aur "reuse detection" kaise ho?

**Decision:** httpOnly · Secure · SameSite=Lax · `__Host-` prefix cookies. Access 15
min, refresh 7 din with rotation. Aur **`refreshTokens` collection** (`jti` +
`familyId`).

**Kyun:** localStorage me token rakhna CMS me khaas taur pe khatarnak hai — user rich
text aur embed HTML daalta hai, XSS surface bada hai. Aur **reuse detection stateless
JWT se ho hi nahi sakti** — server pe state chahiye hi chahiye.

**Nateeja:** Admin API client me **single-flight refresh mutex** zaroori — warna 5
parallel 401 se 5 refresh chalenge, rotation ke saath 4 "chori" lagenge, aur user
random logout ho jaayega. Ye bug week 3 me aata hai aur din bharbhar misdiagnose hota hai.

---

## D-14 · Next ISR hi ekmatra cache authority

**Context:** Public API pe LRU cache, Next ISR, aur revalidate webhook — teenon?

**Decision:** **Next ISR hi authority.** Public API pe koi TTL cache nahi. Invalidation
**tag-based**, ek explicit dependency map se.

**Kyun:** Teen cache aur ek signal = "publish kiya par site update nahi hui" wala
ticket. Aur `revalidatePath()` kaafi nahi — ek post publish hone pe post page, archive,
saare pagination pages, har taxonomy archive, post-list wale pages, menu, sitemap aur
feed — sab stale hote hain.

**Nateeja:** Tag taxonomy Phase 3 me design hogi, Phase 8 me retrofit nahi. Revalidate
webhook pe shared secret zaroori — warna wo ek public cache-purge endpoint hai.

---

## D-15 · Core versioned packages me, client repo patla

**Context:** "Har client ka apna instance" — to core ka security fix 12 chalte hue
instances tak pahunchega kaise?

**Decision:** Core repo `@cms/api`, `@cms/admin`, `@cms/web`, `@cms/blocks`,
`@cms/shared` publish kare (semver). Har client ka **alag patla repo** — sirf pinned
versions, `.env`, `theme/`, `blocks/`, `migrations/`.

**Kyun:** Ye D-01 ki laagat ka jawab hai. `themes/<client>/` core repo ke andar rakhne
ka matlab hai **fork per client** — 12 fork, aur har security fix 12 baar cherry-pick.
Agency framework isi tareeke se marte hain.

**Reject kiya:** (a) Fork per client. (b) Ek codebase jo env se sab clients serve kare
— wo "separate installations" wale premise ke khilaaf hai.

**Nateeja:** Migration system (D-16) zaroori ho jaata hai. Aur ye ek query me pata
chalna chahiye: **kaunsa client kis core version pe hai.**

---

## D-16 · Do alag migration system

**Context:** Schema badle to? Block tree ka shape badle to?

**Decision:** Do alag systems —

| Kism            | Kab chalti hai                | Kaise                                                                  |
| --------------- | ----------------------------- | ---------------------------------------------------------------------- |
| **Schema/data** | Deploy step pe, boot se pehle | Numbered files, `migrations` collection me record, ordered, idempotent |
| **Block tree**  | Read pe lazily + batch job    | Per-document aur idempotent                                            |

**Kyun:** Ye alag isliye hain ki ek page ka `content.version` v1 pe ho sakta hai jab
site v4 pe hai. Block migration ko har document pe apne aap chalna hoga, ek baar nahi.

**Nateeja:** `contentTypes` se field delete hone pe kya ho — ye bhi define karna padega,
warna admin ek click me 400 entries ka data uda dega.

---

## D-17 · Menus aur locations alag

**Context:** `menus.key` me `main|footer` hardcode karein?

**Decision:** **Nahi.** Jitne chaho menus banao; theme `location` declare kare
(`header`, `footer`, `mobile`); assignment alag `menuLocations` collection me.

**Kyun:** Fixed keys ka matlab tha ki client ko doosra footer menu chahiye to **code
change** karna padega — aur ye framework ke apne "no code per client" rule ko hi tod
deta hai.

**Nateeja:** Menu item pe `target` aur `cssClass` bhi chahiye — nav me "Book Now" button
isi se banta hai, aur agency ise lagbhag har build pe maangti hai.

---

## D-18 · Trash, aur `pending` + `private` statuses

**Context:** Sirf draft/published/scheduled kaafi hai?

**Decision:** Nahi. **`pending`** aur **`private`** add, aur delete ka matlab **trash**
(`deletedAt`), permanent delete sirf Trash screen ke andar se.

**Kyun:**

- `pending` ke bina `contributor` role ka koi "kaam ho gaya, review karo" state hi nahi
  bachta — matlab role **non-functional** hai.
- `private` client staging pages ke liye chahiye (live, par sirf logged-in ko dikhe).
- Target user non-technical hai — **delete galti se hoga**, ye maan kar chalna hai.

**Nateeja:** `deletedAt` day 1 se, kyunki ye har list query aur har index ko chhoota hai.

---

## D-19 · Internal naam aur UI naam alag

**Context:** Data model generalized hai (`entries`, `taxonomies`). UI me kya dikhe?

**Decision:** UI me **kabhi bhi** internal naam nahi.

| Code me            | UI me                    |
| ------------------ | ------------------------ |
| `entries`          | Pages / Posts / Services |
| `taxonomies`       | Categories / Tags        |
| `template.regions` | Template Parts           |
| `pattern (synced)` | Synced Patterns          |

**Kyun:** Model ka generalized hona **developer ki suvidha** hai. Client ko "Entries"
screen dikhana usse har roz confuse karega. Familiar vocabulary CMS ki adoption ka
sabse sasta lever hai.

---

## D-20 · Builder me controls jaan-boojh kar seemit

**Context:** Kitna control dena hai? Elementor jaisa sab kuch?

**Decision:** Sirf **spacing, alignment, visibility, columns, font size** — aur
constrained value space (spacing scale, token colors). Free-form CSS box nahi, absolute
positioning nahi, z-index nahi, animations nahi.

**Kyun:** Non-technical user ko poora CSS dena matlab use site todne ka tool dena. Aur
"Elementor jaisa sab kuch" ka scope 3 mahine me bhi launch nahi hone deta.

**Reject kiya:** Custom CSS box (Phase 6+ me bhi soch samajh kar).

---

## D-21 · Custom fields `Mixed`, validation contentType se

**Context:** `entries.fields` ka schema strict ho?

**Decision:** `fields` ko **Mixed** rakho; validation `contentType.fields[]` se runtime
pe.

**Kyun:** Strict Mongoose schema ka matlab hota ki har client ke har naye field pe
migration likhni pade — content-type builder ka poora point hi khatam.

**Nateeja:** Query params pe **strict Zod validation zaroori** ho jaati hai. `req.query`
ya `req.body` ko kabhi seedha Mongoose query me spread mat karo — ye NoSQL injection ka
direct raasta hai.

---

## D-22 · Media production me object storage pe

**Context:** Upload kahan jaayein — local disk ya S3?

**Decision:** Storage adapter interface, par **production default S3/R2 + CDN**. Local
sirf dev.

**Kyun:** Local disk instance ko **stateful** bana deta hai — container deploy, scaling
aur backup teenon mushkil ho jaate hain. Aur baad me switch karne ka matlab har existing
client ki files migrate karna.

---

## D-23 · Comments aur plugin system nahi

**Decision:** Native comments **nahi** — third-party embed block. Plugin system **nahi**.

**Kyun:** Comments agency sites pe spam + moderation ka bojh hain, aur zyadatar clients
unhe band hi rakhte hain. Plugin system ki zaroorat tab hoti hai jab code aapke paas na
ho — yahan hai; blocks hi extension point hain.

Ye **decisions** hain, omissions nahi — isliye likhe gaye hain.

---

## D-24 · Ek field DSL, do nahi

**Context:** `contentTypes.fields[]` (Phase 6) aur `blockDefinition.schema[]` (Phase 5)
dono field-definition systems hain. Overlap ~50%. Docs me ye kabhi connect nahi kiye gaye the.

**Decision:** **Ek DSL**, `packages/shared/src/field-types.js` me, har type pe
`contexts: ['content'|'block']` ke saath. Ek `<FieldRenderer field context />`
component dono jagah kaam karega.

```js
text     contexts: ['content','block']
richText contexts: ['content']
spacing  contexts: ['block']
```

**Kyun:** Overlap already aadha hai — do systems rakhna matlab drift pakka. Phase 6 ka
estimate 3-4 hafte hai aur shared renderer usme se kaafi kaat deta hai. Coupling
manageable hai — `contexts` ek simple filter hai, complex abstraction nahi.

**Reject kiya:** Do alag DSL. Har system apne hisaab se evolve kar sakta, par field
renderer do baar banta, naya field type do jagah add hota, aur waqt ke saath `select`
dono jagah thoda alag behave karne lagta.

**Nateeja:** Ye faisla `packages/shared` ko chhoota hai, matlab **Phase 0 ka kaam** hai,
Phase 5 ka nahi. `responsive: true` sirf `block` context me honour hoga.

---

## D-25 · Trash = `deletedAt` field, `status: 'trash'` nahi

**Context:** Delete ko soft-delete karna hai (D-18). Mechanism kya ho — ek naya status,
ya alag timestamp field?

**Decision:** **`deletedAt` timestamp field.** `status` ko chhua nahi jaata.

**Kyun:** Restore ka matlab _"jaisa tha waisa"_ hona chahiye. `status: 'trash'` karne pe
ye info kho jaati hai ki entry pehle published thi ya draft — restore pe user ko dobara
publish karna padta, aur wo ek silent data-loss jaisa feel hota hai.

**Reject kiya:** `status: 'trash'` — simple dikhta hai par publish state kha jaata hai.

**Nateeja:** Har list query me `deletedAt: null` add karna padega — isliye ye index me
shamil hai (`{ siteId, deletedAt, updatedAt }`). Bhoolne pe trashed entries public site
pe dikh sakti hain, isliye ye service layer ka default filter hona chahiye, controller ka nahi.

---

## D-26 · Char roles, `subscriber` nahi

> ⚠️ **Partially superseded by D-29** — ab paanch roles hain (`salesAgent` add hua).
> `subscriber` wali baat waise hi rehti hai: wo abhi bhi nahi banega.

**Context:** Paanch roles plan kiye the — `admin`, `editor`, `author`, `contributor`,
`subscriber`.

**Decision:** **Char roles.** `subscriber` (read-only) abhi nahi banega.

**Kyun:** Agency sites pe read-only user ka koi asli use-case nahi mila. Permission
system string-based hai, isliye kabhi zaroorat padi to role add karna sasta hai —
schema change nahi hai.

**Nateeja:** Seed 4 roles banayega. `role` enum me `subscriber` nahi hoga.

**Saath me:** `entry.purge` (permanent delete) **sirf `admin`** ko. Editor trash me daal
sakta hai, mita nahi sakta — client ka data ek galti se hamesha ke liye jaane ka raasta
band.

---

## D-27 · Pehla milestone: Header + Footer ka vertical slice

**Context:** Phase 0 se seedha shuru karein, ya pehle ek patli end-to-end slice?

**Decision:** **Pehle ek patli slice** — aur wo slice **Header + Footer** hoga, koi
content page nahi.

Scope:

```
Admin me   : logo, navigation, CTA button, footer columns, social links, copyright
API        : settings + menus (admin write, public read)
Public site: header aur footer asli API data se render
```

**Kyun:** Header/footer har page pe aate hain, matlab sabse zyada reuse hone wala hissa
hain. Aur ye original Phase 3 order se already match karta hai ("header/footer pehle,
asli API data se, dummy se nahi"). Isse ye poora pipeline ek baar end-to-end verify ho
jaata hai: admin → API → public render → cache invalidation.

**Reject kiya:** Ek normal content page ka slice. Wo `entries` + `path` routing test
karta, par header/footer se kam reuse deta.

**Nateeja / imaandari se:** Ye slice **cache invalidation** aur settings/menus pipeline
verify karta hai — par **preview parity verify nahi karta**, kyunki usme blocks chahiye.
Wo risk Phase 5 tak khula rahega. Page builder is slice me nahi banega.

---

## Abhi khule hue faisle

| #   | Faisla                                      | Status                                                                                                                |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| O-1 | `packages/shared` + `blocks` TypeScript me? | ✅ **Tay: nahi** — sab JavaScript. D-03 waise hi rahega, mitigations (Zod + checkJs + tree-op tests) ab optional nahi |
| O-2 | Payload CMS ka 2-din spike                  | ✅ **Approved** — Phase 1 se pehle hoga. Result se ye decisions badal sakti hain                                      |

Baaki open items: [`09-OPEN-ITEMS.md`](09-OPEN-ITEMS.md)

---

## D-28 · Plain CSS, Tailwind nahi

**Context:** `apps/admin` me Tailwind install ho chuka tha aur `shadcn/ui` plan me tha.
Phir client ka **frozen admin design** aaya — jo plain CSS hai, 23 CSS variables ke
token system ke saath. Sawaal: design ko Tailwind me convert karein ya CSS waise hi lein?

**Decision:** **Poore project me plain CSS.** Tailwind aur shadcn/ui dono hataye gaye.

**Kyun:**

1. **Blocks ka theming contract Tailwind se tootta hai.** `02-ARCHITECTURE.md` §6.4
   kehta hai blocks ko *stable class names + CSS variables* expose karni hain, taaki
   client theme unhe override kar sake. Tailwind utility classes se ye possible hi nahi
   hai. Ye akela hi kaafi reason tha.
2. **Design frozen hai, matlab CSS bhi frozen hai.** 242 lines ka taiyaar CSS ko dobara
   likhne ka koi return nahi — sirf visual drift ka risk hai.
3. **Change karna aasan rehta hai.** Client bole "sidebar chhota karo" → `--sidebar-w`
   ek line. Tailwind me JSX me utility classes dhoondhni padtin.
4. **Design se diff karna** seedha rehta hai — code aur frozen design compare ho sakte hain.
5. **Team plain CSS me comfortable hai.** Familiarity ek asli architectural input hai —
   yahi baat D-03 (TypeScript nahi) me bhi maani gayi thi.

**Reject kiya:**
- **Tailwind** — upar wale 5 reasons.
- **CSS Modules** (`Header.module.css`) — class names hash ho jaate (`.sidebar` →
  `._sidebar_x7f2k`). Isse frozen design se compare karna aur **theme override dono
  marr jaate** — aur theme override humare framework ki jaan hai.
- **CSS-in-JS** — SSR extraction ki complexity + bundle weight. Blocks ke liye ye
  D-08 me pehle hi reject ho chuka tha.
- **Sab ek hi file me** — 2000+ lines, kuch dhoondhna mushkil.
- **Sirf per-component, shared layer ke bina** — `.btn` har jagah duplicate hota.

**Nateeja:**
- `shadcn/ui` bhi gaya (wo Tailwind pe khada hai). Uska visual hissa design se mil raha
  hai. Jo bacha — accessibility behaviour (dropdown keyboard nav, dialog focus trap) —
  wo **Radix primitives** se aayega: headless, unstyled, humari CSS ke saath chalte hain.
- CSS structure ab teen layer ka hai — detail `02-ARCHITECTURE.md` §11.
- Global class names hain, isliye **har component ka prefix zaroori** (`ab-`, `menu-`,
  `blk-`) warna collision hogi.

**Kya ise palat sakta hai:** agar client design badalta rehne lage (frozen na rahe), to
Tailwind ki speed kaam aa sakti hai. Par blocks pe tab bhi Tailwind nahi — wahan
theming contract non-negotiable hai.

---

## D-29 · Paanchwa role — `salesAgent`

> **D-26 ko partially supersede karta hai** ("char roles"). `subscriber` wali baat
> waise hi rehti hai — wo abhi bhi nahi banega.

**Context:** Admin design me users list par role filter tabs hain —
`Administrator (2)` · `Editor (2)` · **`Sales Agent (4)`** · `Author (1)`. Aur enquiry
screen me "Assign to: Neha S ▾" hai. Sabse zyada users isi role me hain.

**Decision:** **`salesAgent`** paanchwa role banega. Roles ab:
`admin` · `editor` · `author` · `contributor` · `salesAgent`

**Kyun:** Enquiries ka poora assignment model isi pe khada hai. Aur ye role content
roles se alag kism ka hai — sales agent ko content edit nahi karna, use **enquiries**
chahiye. Bina iske ya to har sales person ko `editor` banana padega (jo use poora
content access de dega), ya assignment feature bekaar ho jaayega.

**Permissions:**
```
salesAgent  →  enquiry.read · enquiry.update · enquiry.assign.own
               enquiry.quote · entry.read (sirf packages dekhne ke liye)
               content pe koi write permission NAHI
```

**Reject kiya:** Sales person ko `editor` banana — wo use poore content ka access de
deta, jo galat hai. Aur "koi role nahi, bas ek flag" — phir permission system ka
matlab hi nahi rehta.

**Nateeja:** `ROLE` enum aur `ROLE_PERMISSIONS` dono me add hoga
(`packages/shared/src/constants/`). Seed 5 roles banayega, 4 nahi. Enquiries ke
permission strings spec 001 me add karne honge — wo abhi likhe nahi gaye kyunki
Enquiries module Phase 7b me hai.

---

## D-30 · Ruki hui cheezon ke "connection point" abhi banao

**Context:** Bahut si cheezein abhi block hain — homepage dropdown ke liye entries
nahi, logo upload ke liye media nahi, users list me posts count ke liye entries nahi.
Sawaal: inhe abhi chhod dein ya jagah bana dein?

**Decision:** **Field, API shape aur UI ki jagah abhi banao. Data baad me aayega.**

| Cheez | Abhi | Jab dependency aayegi |
|---|---|---|
| Homepage / Posts page | Field + dropdown, list khaali | Phase 1 → query add |
| Logo / Favicon | Field hai, abhi URL text box | Phase 2 → MediaPicker |
| Posts count | Column hai, `—` dikhta hai | Phase 1 → count query |
| Enquiries count | Column hai, `—` dikhta hai | Phase 7b → count query |
| Menu me Pages/Destinations | Panel hai, list khaali | Phase 1 + 6 |

**Kyun:** Yahi rule `siteId`, `deletedAt`, `locale` pe pehle apply ho chuka hai —
**field abhi, feature baad me**. Abhi chhoda to Phase 1 me **teen jagah** dobara
chhuni padengi (schema, API, UI) aur schema badalna matlab migration. Abhi bana diya
to sirf ek query add hogi.

**Shart:** khaali cheez **khaali dikhni chahiye, tooti hui nahi.**
```
❌  Homepage  [ ▾ ]                              khaali dropdown — user confused
✅  Homepage  [ Koi page nahi hai — pehle banao ]
```
Non-technical user ko pata chale ki **abhi kuch nahi hai**, na ki **kuch toot gaya hai**.

---

## D-31 · Login screen design me nahi hai — WordPress-style banega

**Context:** Admin ka design (`docs/reference/admin-design.html`) SPEC hai — jo usme hai
wahi banega. Par usme **login screen nahi hai**. Auth ka poora backend design pe depend
nahi karta, sirf ye ek screen ruki hui thi.

**Decision:** Client ke paas login ka design nahi hai. **WordPress-style simple centered
card** banega — par design ke **apne tokens** (colours, spacing, radius, fonts) use karke,
taaki login aur baaki admin ek hi product lage.

**Kyun:** Ye ekmatra screen hai jo design me nahi hai. Guess karke poora naya visual
language banane se do alag-alag dikhne wale product ban jaate. Tokens reuse karne se
screen design ke andar hi rehti hai, bhale layout khud invent kiya ho.

**Scope:** logo/site name · email + password · "Remember me" · error message ki jagah ·
"Forgot password?" ka link (Phase 0 me dead, SMTP Phase 2+ me).

**Kya NAHI:** koi naya colour, naya font, naya spacing scale. Sab
`apps/admin/src/styles/tokens.css` se aayega.

**Nateeja:** Q-1 band. Baad me client login ka design de to **sirf ye ek screen** badlegi
— auth backend, routes, session handling sab waise hi rehta hai. Ye rule 8 (design change
client se aata hai) ka apwaad nahi hai — client ne hi "nahi hai, tum banao" kaha.

---

## D-32 · Password hashing — `bcryptjs`, native `bcrypt` nahi

**Context:** Spec 004 kehta hai "password bcrypt hashed". Do implementations hain:
native `bcrypt` (C++ addon) aur `bcryptjs` (pure JavaScript).

**Decision:** **`bcryptjs`**, cost 12.

**Kyun:** R3 khud warn karta hai — *"sharp/bcrypt jaise native modules mismatch pe
toot-te hain"*. Dev Windows pe hai, prod Linux pe; har client ka apna instance deploy
hota hai (D-01), matlab ye build har jagah alag machine pe chalega. Ek native addon
jo kahin build na ho, wo poore instance ko boot hone se rok dega — aur wo failure
deploy ke waqt milegi, pehle nahi.

Hash format dono ka same hai (`$2a$`), isliye kabhi native pe jaana ho to **data
migrate nahi karna padega** — sirf import badlega.

**Keemat:** `bcryptjs` native se dheema hai. Login pe ~250ms lagta hai (cost 12), jo
ek baar ka operation hai. Agar kabhi login throughput problem bane, tab native pe
jaana khula hai.

**Reject kiya:** `argon2` — behtar algorithm hai par wo bhi native addon hai, wahi
problem. `crypto.scrypt` (zero dependency) — spec bcrypt kehta hai, aur bcrypt ka
ecosystem/tooling zyada jaana-pehchana hai.

---

## D-33 · `.env` Node ke apne loader se, `dotenv` package se nahi

**Context:** `apps/api/.env` maujood thi par usse **koi load hi nahi karta tha** —
na `dotenv`, na `--env-file`. Sab kuch shell me export kiye gaye vars pe chal raha tha.
`pnpm seed` iske bina chal hi nahi sakti thi.

**Decision:** `core/env.js` `process.loadEnvFile()` (Node ≥ 20.12) use karta hai.
Path `import.meta.url` se banta hai, `process.cwd()` se nahi.

**Kyun:**
- **Koi nayi dependency nahi** — Node me pehle se hai
- **cwd pe bharosa nahi** — `pnpm seed` repo root se chalti hai, `pnpm dev:api`
  `apps/api` se. cwd-relative path ek jagah kaam karta, dusri jagah nahi
- **Test me load hoti hi nahi** (`NODE_ENV=test` pe skip) — warna suite developer ki
  local file pe depend karne lagti: kisi ke yahan `COOKIE_SECURE=true` hai to cookie
  ke naam badal jaate hain aur wahi test CI pe pass, local pe fail hota hai

**Nateeja:** Shell/CI ke vars `.env` se **jeette hain** — production me `.env` file
hoti hi nahi, wahan asli env vars aate hain.

---

## D-34 · Users — `username`, asli delete, aur administrator ki suraksha

**Context:** Admin design ke Users screen me do cheezein thin jo hamare model se
takraati thin: ek **Username** column (Name aur Email se alag), aur row action me
**"Delete"** — jabki architecture §8.3 kehta tha ki user delete hota hi nahi, sirf
deactivate hota hai.

Dono client ke saamne rakhe gaye. Faisle:

### 1. `users.username` — naya field, immutable

Login **email** se hi rahega. Username display ke liye hai aur aage author archive URL
(`/author/aditya`) me jaayega.

**Immutable** isliye ki wo URL me jaata hai — badalne se purane link 404 ho jaate hain.
`updateUserSchema` me ye field hai hi nahi, isliye koi update path use chhoo bhi nahi
sakta.

Admin form me type karta hai; khaali chhoda to server email se bana leta hai
(`suggestUsernameFromEmail`) aur takraav pe number lagata hai. Wahi function migration
ka backfill bhi use karta hai — taaki purane user ka username wahi bane jo aaj naye ko
suggest hota.

> Day-1 reserve test me ye **do** pe haan deta hai: naya unique constraint hai, aur
> baad me 15 instances pe backfill + unique index build karna mehnga hota. Isliye
> abhi. Migration `003-user-username.js` — **pehle backfill, phir unique index**
> (ulta karne pe wo instances fail hote jinke paas pehle se users hain).

### 2. Delete asli delete hai, trash nahi

Design jeeta (R15). User ki row DB se mit jaati hai — trash nahi, restore nahi.

Delete se pehle poochha jaata hai **"iska content kise dein"**, WordPress ki tarah.
**"Saara content bhi delete karo" wala option nahi banega** — ek click me client ki
200 posts udna, wo bhi bina Trash ke, is system me sabse mehnga hadsa hota.

`reassignContent()` abhi `{ entries: 0 }` lautata hai kyunki `entries` collection
Phase 1 me banega. Poora flow (confirm screen, dropdown, API contract) aaj bana hua
hai; Phase 1 me sirf wahi ek function bharna hai — D-30 wala pattern.

### 3. Administrator kabhi delete nahi hota

`admin` role wale user pe delete chalta hi nahi — 403, aur message "Deactivate
karein". Uski jagah **Deactivate** hai, jo login band karta hai par record aur content
bacha rehta hai.

**Demote karke delete karne ka raasta bhi band:** aakhri admin ka role badalna allowed
nahi. Ek se zyada admin hon to demote ho sakta hai — tab bhi site ke paas ek admin
bacha rehta hai.

Teesra guard: **koi apna khud ka account delete ya deactivate nahi kar sakta.**

> Ye teenon **service me** hain, middleware me nahi. `requirePermission()` sirf ye
> jaanta hai ki "ye kaam kar sakte ho ya nahi" — "kis PE kar sakte ho" ke liye
> document chahiye, jo sirf service ke paas hota hai.

### 4. `user.delete` naya permission — sirf admin

`entry.purge` aur `media.purge` wahi rule follow karte hain: mitane wala kaam
recoverable nahi hota, isliye ek hi role ke paas. Editor user ko deactivate kar sakta
hai, mita nahi sakta.

**Ek aur cheez jo raaste me pakdi gayi:** role ka wajood kahin check hi nahi ho raha
tha. `role: "wizard"` wala user ban jaata tha — create `201` deta, par uski
permissions hamesha khaali rehti aur wo har screen pe 403 khaata, bina kisi error ke.
Ab `assertRoleExists()` `roles` **collection** se check karta hai (enum se nahi —
Phase 7 ke custom roles enum me nahi honge).

**Reject kiya:** username ko editable rakhna (URL badalne pe redirect ka poora
intezaam chahiye hota); "saara content delete" wala option; aur admin protection ko
sirf "aakhri admin" tak seemit rakhna — client ne kaha ki administrator practically
owner hi hoga, isliye poora block hi simple aur sahi hai.

---

## D-35 · Password administrator set karta hai, user nahi

> **D-34 ko extend karta hai.** Wahan Users ka delete/username tay hua tha; ye password
> aur account status ke baare me hai.
>
> ⚠️ **§1 ab Superseded by D-37** — user apna password **Profile se khud badal sakta hai**
> (current password ke saath). §2 aur admin ka reset field jaise the waise hi hain.

**Context:** Users screens test karne ke baad client ne teen cheezein badalne ko kahin:
row me Deactivate nahi chahiye, Edit form me status nahi chahiye, aur naya user wahi
password use kare jo administrator ne diya hai.

### 1. ~~User apna password khud nahi badal sakta~~ — Superseded by D-37

> Ye hissa ab lagoo nahi hota. Profile screen se har user apna password khud badal sakta
> hai. Neeche wala text **historical** hai — kyun tab aisa tay hua tha, wo padhne ke liye.

Password ka ekmatra source **administrator** hai — Add User form me set karta hai, aur
Edit User me kabhi bhi reset kar sakta hai.

`/api/auth/change-password` khatam nahi kiya — wo **sirf tab khulta hai jab
`mustChangePassword` true ho**, aur wo sirf ek jagah lagta hai: **seed se bana admin**,
jiska password `.env` file me plain text me padha hai. Wo ek baar badalta hai, uske
baad wahi raasta uske liye bhi band ho jaata hai (403).

**Nateeja:** password bhoolne pa recovery ka ekmatra raasta admin hai. Isliye Edit User
me password field **zaroori** hai — wo isi decision ka doosra aadha hissa hai, alag
feature nahi. Password reset hote hi us user ke **saare chalu sessions revoke** ho
jaate hain: wo purane password ki umeed pe khule the.

Form se bana user ab `mustChangePassword: false` ke saath aata hai. `createUser` ka
default bhi `false` hai; `ensureAdminUser` (seed) explicitly `true` bhejta hai.

### 2. Deactivate poori tarah UI se hat gaya

Row actions ab bilkul design jaise hain — **Edit | Delete**. Edit form me status
dropdown nahi hai.

> **Iska ek natija saaf likh dena zaroori hai:** administrator delete nahi hota
> (D-34) aur ab deactivate bhi nahi hota — matlab **administrator ka access chheenne ka
> koi raasta nahi bacha**. Client ne ye jaan-boojh kar chuna: administrator practically
> owner hi hai aur ek hi hai. Kabhi doosra admin banane ki naubat aaye to ye decision
> dobara dekhni padegi.

`status` field aur `/api/users/:id/deactivate` **rehne diye gaye** — `inactive` user ka
login abhi bhi block hota hai, aur field hataane ka matlab hota migration + login check
badalna. UI se koi raasta nahi jaata; ye jaan-boojh kar reserve hai (D-30 wala pattern).

**Raaste me pakda gaya:** galat id (`/api/users/kuch-bhi`) pe Mongoose `CastError`
seedha 500 ban jaata tha. Wo client ki galti hai, server ki nahi — ab 404 deta hai.
Iske bina har galat link error logs me jaata aur monitoring bewajah alert karti.

**Reject kiya:** change-password endpoint bilkul hata dena — tab seed admin apna
plain-text wala password kabhi badal hi nahi paata.

---

## D-36 · Built-in roles code-owned hain — unki permissions hamesha sync hoti hain

**Context:** `user.delete` (D-34) code me juda, seed bhi chala, par admin ko Users list
me Delete button dikha hi nahi. DB dekha to `admin` role ke paas 66 permissions thin,
code me 67.

Wajah: `ensureDefaultRoles()` existing role ko **poora skip** kar deta tha (idempotency
ke naam pe). Matlab **code me joda gaya koi bhi naya permission string kisi chalu
instance tak kabhi pahunchta hi nahi tha.**

Ye is project ka sabse khatarnaak kism ka bug hai: koi error nahi, koi log nahi, bas
button render nahi hota. Dhoondhne pe pehla shak UI pe jaata hai, jabki galti data me
hai. Aur ye har naye permission ke saath, har client instance pe dohraata.

**Decision:** **built-in roles (`isBuiltIn: true`) code-owned hain.** Unki permissions
`ROLE_PERMISSIONS` se hamesha sync hoti hain — `force` ka intezaar nahi.

Custom roles (`isBuiltIn: false`, Phase 7) ko ye haath nahi lagata — unki permissions
admin ne set ki hain.

**Do raaste, kyunki do alag mauke hain:**

| Kab | Kaun |
| --- | --- |
| Naya instance | `pnpm seed` → `ensureDefaultRoles()` |
| Chalu instance, deploy pe | `pnpm cms migrate` → `migrations/004-…` |

Seed sirf naye instance pe chalta hai, isliye akela kaafi nahi tha — chalu instances
tak pahunchne ka raasta migration hi hai (06-OPERATIONS §3.1 ka deploy step).

**Nateeja jo yaad rakhna hai:** aage jab bhi `PERMISSION` me koi string add karo, us
release me ek **sync migration** bhi chahiye — warna wo permission sirf naye instances
pe pahunchegi. `004` isi ka template hai (chhoti, `up()` me sirf ek loop).

**Reject kiya:** boot pe sync karna — index build ki tarah, ye deploy-time kaam hai,
boot-time nahi (migration 001 ka comment yahi kehta hai). Aur `pnpm seed --force` pe
chhod dena — force label/description bhi reset karta hai, aur "yaad rakhna padega"
wala hal wahi hai jo abhi fail hua.

Spec 001 ka _"mapping DB me, code me hardcode nahi"_ tootta nahi: source of truth abhi
bhi `roles` collection hai, aur custom roles usi collection me banenge. Sirf built-in
roles ka **content** code se aata hai.

---

## D-37 · Users ka menu role ke hisaab se — aur Profile se apna password khud badalna

> **D-35 ka §1 supersede karta hai.** D-35 ka baaki hissa — admin ka reset field aur
> deactivate ka UI se hatna — waise ka waisa hai.

**Context:** Client ne Users section ka asli shape diya. Pehle plan me **Users → Roles**
submenu tha (role builder ke saath); wo **abhi nahi chahiye**. Uski jagah Users ka menu
**role ke hisaab se badalta hai**.

### 1. Users ka menu role-aware hai

```
Administrator                    Editor / Author / Contributor / Sales Agent
Users                            Users
├─ All Users                     └─ Profile
├─ Add User
└─ Profile
```

Sidebar me `Users` ab flat link nahi rahega — **accordion group** banega, jaise Settings
hai. Jiske paas `user.read` nahi, use sirf **Profile** dikhega.

**"Roles" submenu abhi nahi banega.** Role ki permissions edit karna Phase 7 ka
custom-role builder hai — `roles/routes.js` me yahi likha hai aur wo waisa hi rahega
(`GET /api/roles` read-only).

> **Iska ek seedha faayda:** Q-1 (built-in role edit ho sake ya sirf "Duplicate")
> **ab kisi cheez ko block nahi karta**. Wo faisla Phase 7 pe khisak gaya, kyunki
> built-in role edit karne ka koi UI hi nahi ban raha.

### 2. Profile se user apna naam aur password khud badal sakta hai

D-35 kehta tha password ka ekmatra source administrator hai. Client ne ab tay kiya ki
har user **apni Profile se** apna password badal sake.

| Field    | Profile pe                             |
| -------- | -------------------------------------- |
| Naam     | editable                               |
| Password | editable — **current password zaroori** |
| Username | read-only (D-34 — immutable)           |
| Email    | read-only                              |
| Role     | read-only                              |

**Current password kyun zaroori hai:** iske bina kisi ka khula hua session mil jaana
seedha **account takeover** ban jaata hai — jise session mila wo password badal kar asli
user ko hamesha ke liye bahar kar dega. Current password maangne se chura hua session
sirf tab tak chalta hai jab tak expire na ho. Ye "ek extra step" nahi, session hijack
aur account takeover ke beech ki deewar hai.

**Admin ka reset field rahega** — D-35 ka doosra aadha hissa. Abhi koi "forgot password"
email flow nahi hai (SMTP pending), isliye password bhoolne pe recovery ka ekmatra raasta
admin hi hai. Dono raaste saath chalenge: user khud badle, ya admin reset kare.

Password badalne pe **baaki sessions revoke** honge, chalu wala zinda rahega — warna user
apna hi password badal kar khud logout ho jaayega.

**Code me kya badlega (abhi likha nahi gaya):** `/api/auth/change-password` filhaal
`mustChangePassword` false hone pe **403** deta hai (`apps/api/src/modules/auth/service.js`).
Wo gate hatana padega. `mustChangePassword` wala **forced** flow (seed admin) waise hi
rahega — wo poori screen block karta hai aur alag cheez hai.

**Reject kiya:**

- **Bina current password ke change** — aasaan hai, par upar wali wajah se nahi.
- **Profile pe email editable** — email login ki identity hai; badalne pe verification
  ka poora flow chahiye, jo SMTP pe block hai.
- **Avatar** — Phase 2 (Media library) pe block hai.

**Nateeja jo yaad rakhna hai:** nav ab **role-aware** hai, isliye Sidebar ka hardcoded
`MENU` array kaafi nahi. Har item pe `permission` chahiye, aur wahi ek registry admin ka
**route guard** bhi padhega. Do jagah rakhoge to naya section jodte waqt ek jagah update
karna bhoolna pakka hai — aur bhoolne ka nateeja "screen chhupi hui hai par URL type
karke khul jaati hai" jaisa chup-chaap bug hota hai.

---

## D-38 · "Remember me" poore session tak chalta hai — aur do alag TTL

**Context:** Client ne D-37 wala Profile password test kiya aur poochha: *"password badal
kar browser band karun, phir kholun — Login aayega ya Dashboard?"*

Jawab tha **Dashboard — chahe "Remember me" tick kiya ho ya nahi.** Ye galat tha.

`setAuthCookies()` ka `persistent` flag teen jagah se aata tha, aur do jagah **hardcoded
`true`** tha:

| Kahan               | Kya bhejta tha       |
| ------------------- | -------------------- |
| Login               | `input.rememberMe` ✅ |
| Refresh             | `true` ❌            |
| Change password     | `true` ❌            |

Matlab session cookie pehle auto-refresh pe hi (login ke ~15 min baad) 7-din wali
persistent cookie ban jaati thi. **"Remember me" checkbox practically bemaani tha.**

> Ye bug D-37 se nahi aaya — refresh me pehle se tha. Password wale raaste me wahi
> pattern copy hua, isliye dikh gaya. Client ke testing ne pakda.

### 1. `remember` ab session ke saath chalta hai

`refreshTokens` record me ek `remember` field hai. Login use likhta hai; har rotation
use aage carry karti hai; refresh aur change-password **wahi** padh kar cookie set karte
hain.

**Record me kyun, cookie ya JWT me kyun nahi:** cookie se ye padha hi nahi ja sakta
(`httpOnly`), aur JWT me daalne se har rotation pe use dobara sign karna padta — wahi
ek jagah jahan wo chhoot jaata. Record rotation ke aar-paar zinda rehta hai aur use koi
client badal nahi sakta.

**Migration nahi likhi.** `refreshTokens` ephemeral hai aur uspe TTL index hai — purane
records apne aap chale jaate hain, aur tab tak `remember` unka `false` padha jaata hai.
Ye **safe direction** hai: galti ho to session chhota hota hai, lamba nahi.

### 2. Do TTL — 24 ghante, aur "Remember me" pe 7 din

```
REFRESH_TOKEN_TTL           24h    default
REFRESH_TOKEN_TTL_REMEMBER  7d     checkbox tick hone pe
```

**Dono sliding hain** — har refresh pe ghadi reset. Matlab ye *"kitne din baad login"*
nahi hai, *"kitne din **kaam na karne** pe login"* hai. Roz CMS kholne wale ko kabhi
login nahi maangega.

**Bina "Remember me" wale pe do rok saath lagti hain:** cookie session cookie hai
(browser band = gaya) **aur** token 24 ghante me marta hai. WordPress bhi dono saath
lagata hai.

### 3. Reference: WordPress kya karta hai

| | WordPress | Hum |
| --- | --- | --- |
| Remember me OFF | 2 din + session cookie | **24 ghante** + session cookie |
| Remember me ON | 14 din | **7 din** |
| Ghadi | **absolute** — login se fix | **sliding** — activity pe reset |

Hum WordPress se sakht hain, par sliding hone ki wajah se kaam karne walon ko wo sakhti
mehsoos nahi hoti.

**Reject kiya:**

- **Dono ke liye 24h.** Sabse sakht, par phir checkbox ka matlab sirf "browser band
  karne pe logout na ho" reh jaata. Client ke users hafte me ek-do baar login karte
  hain — wo har baar password dhoondhte, aur wahi "password bhool gaya" wali call aati
  jiska abhi koi email-recovery raasta hai hi nahi.
- **WordPress jaisi absolute expiry.** Roz kaam karne wale ko beech kaam me logout
  karna — bina auto-save ke ye seedha content ka nuksaan hai (autosave Phase 1 me hai).
- **`remember` JWT ke andar rakhna.** Signed hai isliye surakshit to hai, par har
  rotation pe use dobara daalna yaad rakhna padta — wahi galti jo abhi hui.
- **Absolute cap (30 din) bhi lagana.** 24h sliding ke saath chura hua token waise bhi
  ek din se zyada nahi jeeta. Do ghadiyaan rakhne se debugging mushkil hoti hai.

**Nateeja jo yaad rakhna hai:** ab **jahan bhi `setAuthCookies()` call ho, `remember`
session se aana chahiye** — kabhi hardcoded nahi. Naya auth endpoint bane to `tokens`
object seedha pass karo (`setAuthCookies(res, tokens)`); `issueSession()` usme
`remember` pehle se bhar deta hai.

---

## D-39 · Role dene ke do guard — apna role, aur privilege escalation

**Context:** Client ne poochha ki Edit User me "apna role nahi badal sakte" wali rok
server pe bhi honi chahiye ya nahi. Jaanch me pata chala ki wo rok **sirf browser me**
thi (`disabled={isMe}`), aur `PATCH /api/users/<apni-id>` se chal jaati thi.

Uske saath ek badi cheez mili: `updateUser` me **role dene pe koi rok hai hi nahi**.
Jiske paas `user.update` hai, wo kisi ko bhi koi bhi role de sakta hai — apne aap ko
`admin` samet.

**Aaj ye khatra nahi hai** — `user.update` aur `user.invite` sirf admin ke paas hain,
aur admin already admin hai. **Par Phase 7 me custom roles aayenge**, aur tab:

```
admin ek role "Manager" banata hai, usme user.update de deta hai
  -> Manager: PATCH /api/users/<apni-id> { role: "admin" }
  -> Manager ab administrator hai
```

### 1. Apna role koi khud nahi badal sakta — administrator bhi nahi

```js
if (String(user._id) === String(actor?._id)) throw forbidden('You cannot change your own role')
```

**Ye guard akela kaafi nahi hai** — aur yahi is decision ka sabse zaroori hissa hai.
Manager apne saathi ko admin bana dega, aur saathi Manager ko. Isliye doosra guard hi
asli rok hai.

### 2. Jo permission khud ke paas nahi, wo kisi ko de nahi sakte

Actor sirf wahi role de sakta hai **jiski saari permissions uske apne paas hain**. Rule
permissions pe hai, **role ke naam pe nahi** — isliye Phase 7 ke custom roles pe ye apne
aap chalta hai aur koi list hardcode nahi karni padti (spec 001).

Ye guard **create aur update dono** pe lagta hai. Sirf update pe lagana adhoora hota:
naya admin bana lo, uska password bhi tum hi set kar rahe ho, phir usi se login kar lo.

**Actor na ho to guard nahi lagta.** Seed ka koi actor hota hi nahi — wahan guard lagta
to `pnpm seed` pehla admin bana hi nahi paata, aur wo chicken-and-egg har naye instance
pe atakta.

### 3. Guard ka order maayne rakhta hai

```
role ka wajood  ->  aakhri admin  ->  apna role  ->  assign kar sakte ho?
```

"Aakhri admin" **pehle** hai, jaan-boojh kar: use "site lock ho jaayegi" wala saaf
message milna chahiye, general wala nahi. Isi order se D-34 ke purane tests bhi bina
badle pass rehte hain.

**Reject kiya:**

- **Sirf pehla guard lagana** — upar wali wajah se. Wo UI ka jhooth theek karta hai,
  escalation nahi rokta.
- **Role ki "seniority" ka order banana** (admin > editor > author…) — custom roles is
  line pe fit hi nahi hote. Permissions ka subset check khud ba khud sahi jawab deta hai.
- **Phase 7 tak rukna** — tab ye yaad rakhna padta, aur yahi wo galti hai jo
  `ensureDefaultRoles()` ke saath ho chuki hai (D-36). Aaj lagane me koi behaviour nahi
  badalta, isliye aaj hi sasta hai.

**Nateeja jo yaad rakhna hai:** ye guard **aaj kuch rokta nahi**. Uske test isliye service
pe seedhe chalte hain (HTTP se ye raasta banaya hi nahi ja sakta) — aur wahi tests use
Phase 7 tak zinda rakhenge. Bina test ke ye chup-chaap hat jaata aur kisi ko pata bhi
nahi chalta.

---

## D-40 · Settings — screens design se, aur Site URL admin ke haath me nahi

**Context:** Phase 0 khatam karte waqt client ne poochha ki Settings Phase 0 ka hissa hai
ya nahi. Jaanch me teen alag baatein nikli.

### 1. Settings ki screens Phase 7 se aage khisak gayi

Plan me `Settings` ka **model** Phase 0 me tha par **screens** Phase 7 me. Client ke
design me Settings ka poora screen maujood hai, aur wo abhi chahiye.

Ye wahi precedent hai jo **Users** ke saath laga tha (D-34): wo bhi plan me Phase 7 thi
aur client ke kehne pe Phase 0 me aa gayi. "Plan me Phase 7 likha hai" apne aap me koi
rok nahi hai — scope client se aata hai (R15).

### 2. Sections plan se nahi, **design se**

| Plan (Phase 7)                                     | Client ka design                             |
| -------------------------------------------------- | -------------------------------------------- |
| General · Reading · Permalinks · Media · Scripts   | General · SEO & Schema · Email/SMTP · Integrations |

Design jeeta (R15). Dhyan dene layak: design ne **Reading ko General ke andar** rakh diya
hai ("Homepage & Archives" ke roop me), aur Permalinks/Media/Scripts uske paas hain hi
nahi. Wo jab aayenge tab client se aayenge.

General screen ke section design se hi aate hain: Site Identity · Locale & Currency ·
Contact & Social.

**"Homepage & Archives" General me nahi hai — aur design me bhi kabhi tha hi nahi.**

Client ne 21 Aug ko ise General se hatane ko kaha. Jaanch me pata chala ki wo sirf ek
preference nahi thi — **galti humari taraf se hui thi.** Design me Settings ke **paanch
tab** hain (General · Reading & Permalinks · SEO & Schema · Email/SMTP · Integrations),
aur Homepage & Archives **"Reading & Permalinks" tab me** rehta hai. Pehle wo galti se
General ke andar bana diya gaya tha.

Ye khud-ba-khud sahi bhi nikla: us section ke teenon fields (Front page displays ·
Homepage · Posts per page) ka koi asar hi nahi hai jab tak `entries` (Phase 1) na aayen —
Homepage ka dropdown bharne ko koi page nahi, aur "Latest posts" chunne pe dikhane ko koi
post nahi. Fields `settings` me maujood hain; UI "Reading & Permalinks" ke saath aayegi.

**Tab bar ab bana hua hai** (`SettingsTabs.jsx`). Design me tabs ek hi screen ke andar
pane badalte hain; hamare paas har tab ka apna route hai, isliye wo **asli link** hain.
Dikhne me farq nahi padta, par back button, refresh aur link share teenon kaam karte hain.
Labels aur order `lib/nav.js` se aate hain — wahi list jo sidebar padhta hai (R16).

> Sidebar me abhi **chaar** item hain (design ke sidebar se) par tab bar me **paanch**
> (design ke tab bar se). Ye takraav design ke apne andar hai. "Reading & Permalinks"
> Phase 1 me banegi, tab ye apne aap sulajh jaayega.

**Teen fields jaan-boojh kar disabled hain** — Logo, Favicon (Media, Phase 2) aur
Homepage (`entries`, Phase 1). Field aur uska contract aaj maujood hain, data baad me
(D-30). Hata dene se baad me poori screen dobara likhni padti.

### 3. Site URL admin edit nahi kar sakta

Design me "Site URL" ek input jaisa dikhta hai. Wo **read-only** banaya gaya hai, aur
value `env.SITE_URL` se aati hai — settings document me wo field hai hi nahi.

**Kyun:** usi value pe **CORS allowlist** aur canonical URLs khade hain (D-12). Use
admin ke haath me dena ka matlab hota ki ek galat entry site ke saare links aur uski
security allowlist — dono ek saath tod de. Ye deployment ki config hai, content ki nahi.
Screen wajah bhi likhti hai, taaki wo "toota hua field" na lage.

### 4. Ek document, aur wo migration se banta hai

`settings` singleton hai: `{ siteId: 1 }` pe **unique index**. Iske bina do documents
ban jaane pe `findOne()` "jo pehle mil jaaye" lautata hai, aur admin ke save random taur
pe gayab hone lagte hain.

Document **migration 005 me** banta hai, sirf seed me nahi — kyunki **seed sirf naye
instance pe chalti hai**. D-36 ka wahi sabak: chalu instances tak pahunchne ka raasta
`pnpm cms migrate` hai. Uske upar service ka read bhi self-healing hai (na mile to bana
deta hai), taaki migration chhoot jaane pe bhi admin ko 404 na mile.

**Reject kiya:**

- **`siteUrl` ko settings field banana** — upar wali wajah se.
- **Poore `social` object ko `$set` karna** — ek link badalne se baaki do ud jaate.
  Service dot-notation use karti hai, aur `updateSettingsSchema` me `social` **nested
  partial** hai. Ye dono ek saath chahiye: pehle sirf service theek ki thi, aur schema ke
  defaults uski mehnat pehle hi bekaar kar dete the — test ne pakda.
- **Saare planned fields (defaultSeo, titleTemplates, scripts) abhi jodna** — singleton
  collection me field baad me jodna sasta hai (backfill karne ko ek hi row hai). Wo apne
  screen ke saath aayenge.
