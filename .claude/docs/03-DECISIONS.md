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

> ⚠️ **Superseded in part by D-43** — `mobile` ab ek assignable location **nahi** hai.
> Mobile wahi menu render karta hai jo `header` pe assigned hai; do alag content sets
> hamesha drift karte hain. D-17 ka baaki hissa — menus aur locations alag, jitne chaho
> menus, aur item pe `target`/`cssClass` — waisa hi hai.

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
| Logo / Favicon | Superseded by D-41 current scope: `logoMediaId`/`faviconMediaId` + Media upload | Phase 2 → MediaPicker |
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

---

## D-41 · Media foundation — variant aur storage contract freeze

**Context:** Media poori Phase 2 library ke roop me baad me aani thi, par Logo/Favicon
Slice 0 ko block kar rahe hain. Isliye abhi sirf foundation banegi: `media` collection,
upload hardening, local storage driver, S3-compatible storage interface, aur raster image
variants. Files upload ho jaane ke baad variant keys aur public URL scheme badalna stored
data rewrite karne jaisa hoga, isliye ye contract code se pehle freeze karna zaroori hai.

### 1. Variants

Raster uploads se hamesha ye WebP variants banenge:

| key      | Max width | Format |
| -------- | --------- | ------ |
| `thumb`  | 300       | webp   |
| `medium` | 800       | webp   |
| `large`  | 1600      | webp   |

Aspect ratio preserve hoga. `media.variants[]` ka shape wahi rahega jo architecture me
hai: `{ key, url, w, h }`. `w` aur `h` actual output dimensions honge, requested max
width nahi.

Original file metadata store ho sakta hai, par **original file public URL ke roop me
serve nahi hogi**. Public UI ko variant URL hi milega.

### 2. Storage keys aur URLs

Storage key user ke filename se nahi banega. Sanitized original filename sirf metadata
hai; identity nahi.

Key scheme:

```text
sites/{siteId}/media/{yyyy}/{mm}/{mediaId}/{variantKey}.webp
```

Local public URL:

```text
/uploads/sites/{siteId}/media/{yyyy}/{mm}/{mediaId}/{variantKey}.webp
```

S3/R2 public URL:

```text
{CDN_BASE_URL}/sites/{siteId}/media/{yyyy}/{mm}/{mediaId}/{variantKey}.webp
```

`CDN_BASE_URL` nahi ho to S3-compatible driver apna public base derive karega, par
production me CDN expected hai (D-22). DB me canonical value `variants[].url` rahegi,
taaki admin aur public site ko storage driver details na pata hon.

### 3. Allowed MIME types

Foundation me sirf raster image upload allowed hai:

```text
image/jpeg
image/png
image/webp
```

Validation MIME header pe depend nahi karegi. Magic-byte check zaroori hai, size
`MAX_UPLOAD_MB` se capped hai, filename sanitize hoga, aur sharp pixel/decompression-bomb
limit lagegi.

GIF, PDF, video, documents aur SVG foundation scope me nahi hain.

### 4. SVG policy

SVG foundation me **blocked** rahega.

Kyun: SVG ke andar script chal sakta hai, aur CMS admin me ye session-bearing browser me
render hota hai. Block karke baad me sanitize/allow karna safe migration hai; allow karke
baad me block karna live logo tod sakta hai.

Client agar confirm kare ki logo SVG hi hona zaroori hai, to alag decision me sanitizer,
allowed surface, aur serving rules lock honge. Tab tak SVG allowed MIME list me nahi aayega.

### 5. Local storage driver

`STORAGE_DRIVER=local` sirf development/local setup ke liye hai.

`UPLOAD_DIR` resolution explicit hai:

- Absolute path diya ho to wahi use hoga.
- Relative path diya ho to API app root (`apps/api`) se resolve hoga, `process.cwd()` se
  nahi.
- Files `UPLOAD_DIR` ke andar exactly wahi storage key layout use karke likhi jaayengi.

Local driver `/uploads/*` serve karega sirf `STORAGE_DRIVER=local` hone par. Admin dev
server bhi `/uploads` ko API pe proxy karega, taaki DB me relative `/uploads/...` URLs
rahein aur kabhi `localhost:4000` jaisa dev hostname stored media record me na aaye.
Production checklist me media object storage pe jaana zaroori rahega (D-22, operations
docs).

### 6. S3-compatible interface

Storage call site driver-agnostic rahega. Interface minimum ye operations dega:

```text
putObject({ key, body, contentType, cacheControl })
deleteObject({ key })
publicUrl(key)
```

Foundation me local driver implement hoga. S3-compatible interface define hoga, par real
S3/R2 implementation full Media phase tak defer ho sakti hai.

**Important:** Agar `STORAGE_DRIVER=s3` select kiya gaya aur real S3 support abhi
implemented nahi hai, API boot/upload path clear error ke saath fail karega. Local pe
silent fallback kabhi nahi hoga.

### 7. Delete aur `mediaRefs`

Migration 006 me **`mediaRefs` collection/index nahi banega**. Wo full Media phase me
usage tracking ke saath aayega.

Foundation me `media` collection `folderId` aur `deletedAt` fields day 1 se reserve
karegi, taaki folders aur trash baad me migration ke bina aa sakein. Lekin delete/trash,
restore, purge, usage endpoint, crop/rotate, replace, library grid, folders aur full
`<MediaPicker />` foundation scope me nahi hain.

Delete jaan-boojh kar defer hai: `mediaRefs` ke bina delete live pages pe broken images
bana sakta hai. Jab tak usage tracking end-to-end nahi hai, media delete route expose
nahi hoga.

**Reject kiya:**

- **Filename-based public paths** — rename/collision/path traversal ka surface badhta hai.
- **Original image serve karna** — Core Web Vitals aur payload size dono kharab hote hain.
- **SVG sanitize abhi** — dependency aur policy surface badhta hai; immediate Slice 0 need
  PNG/WebP se cover hoti hai.
- **S3 selected hone pe local fallback** — production misconfiguration chup jaati hai aur
  media local disk pe chali jaati hai.
- **Migration 006 me `mediaRefs` banana** — usage model full Media phase ka hai; aadha
  collection/index abhi lock karna unnecessary hai.

---

## D-42 · Logo/Favicon ka reference toota ho to kya ho, aur orphan media ka kya

> **Status: APPROVED — 24 Aug 2026.**
> D-41 media foundation land karne ke baad do gap khule reh gaye the. Dono Slice 0 ke
> header render path pe aate hain, isliye Slice 0 se **pehle** tay kiye gaye.
>
> Pehle draft me §2 ke andar ek **presentation choice** bhi ghusi hui thi ("logo ki jagah
> site name text"). Wo yahan se nikaal di gayi — ye decision sirf internal integrity tay
> karta hai. "Kya dikhe" ab **Q-7** hai, aur wo client ka faisla hai (R15).

**Context:** `settings.logoMediaId` aur `faviconMediaId` sirf strings hain
(`packages/shared/src/schemas/settings.js`). Settings service `Media` ko chhoo tak nahi
rahi — yaani koi bhi value save ho sakti hai, chahe us id ka media maujood ho ya nahi.

Ye sirf theory nahi hai; ye abhi **test me expected behaviour ke roop me likha hua** hai
(`apps/api/src/tests/settings.test.js` → _"logo aur favicon media IDs persist karta hai"_,
jo `64f000000000000000000001` bhejta hai — aisi id jo `media` me hai hi nahi).

---

### 1. Write pe validate — bogus id pehle hi ruke

**Decision:** `PATCH /api/settings` pe `logoMediaId` / `faviconMediaId` non-null aaye to
service check karegi ki us site ka wo media maujood hai (aur `deletedAt: null` hai). Na
mile to **400**, save nahi hoga. `null` hamesha valid hai — wo "logo hata do" hai.

**Kyun:** ye galti aaj chup-chaap DB me baith jaati hai aur Slice 0 me header pe phootti
hai — upload ke hafton baad, jahan wajah dhoondhna mushkil hai. Check ek `findOne` hai.

**Nateeja jo saaf likha hona chahiye:** upar wala maujooda test **fail karega**, kyunki wo
abhi ulta behaviour assert karta hai. Use asli media id se replace karna hoga, aur ek naya
test add hoga: _"anjaan media id 400 deti hai"_.

### 2. Read pe — broken `<img>` kabhi nahi

**Decision:** header render karte waqt `logoMediaId` resolve na ho (Phase 2 me delete aa
jaane ke baad ye ho sakta hai) to **toota hua `<img>` kabhi render nahi hoga** — na 404
wala `src`, na khaali `src`, na alt-text ka toota hua box.

Ye ek **constraint** hai, presentation nahi. Point 1 galti ko andar aane se rokta hai;
point 2 us case ko sambhalta hai jahan reference **baad me** toota. Dono chahiye —
sirf write-validation kaafi nahi, kyunki media baad me delete ho sakti hai.

**Kyun:** **D-30 ka principle** — _"khaali cheez khaali dikhni chahiye, tooti hui nahi."_

**Jo is decision me jaan-boojh kar NAHI hai:** us jagah **kya dikhe** — site name text,
kuch bhi nahi, ya koi placeholder. Wo ek **visible design choice** hai, aur R15 ke hisaab
se wo client se aati hai, developer se nahi. D-27 is pe chup hai, aur public design
reference (`10-REFERENCE-DESIGN.md`) me header ka sirf `[logo]` state hai — missing state
kahin defined nahi.

Wo faisla alag se hoga → `09-OPEN-ITEMS.md` **Q-7**, Slice 0 ke header ka kaam shuru hone
se pehle. Tab tak sirf upar wala constraint binding hai.

**Implementation status:** ye §2 aaj **code me nahi utra hai**, aur jaan-boojh kar. Public
header ka render path abhi maujood hi nahi — `apps/web` me sirf `layout.jsx` aur ek
placeholder `page.jsx` hain, koi header component nahi. Yaani aaj tod-ne ko kuch hai hi
nahi.

Isliye ye ek **locked invariant** hai jo Slice 0 pe binding rahega: **jis PR me public
header ka logo render pehli baar aayega, usi PR me ye invariant honour hoga aur uska test
hoga.** §1 (write validation) aaj ban raha hai; §2 ka enforcement Slice 0 ke saath.

### 3. Orphan media — abhi accept, Phase 2 me sweep

**Context:** admin me file choose karte hi upload ho jaata hai (`General.jsx` ka notice:
_"Logo uploaded. Save changes to apply it."_), Save alag step hai. Do raaste orphan bante
hain:

- upload karke Save na kare → media record + 3 webp files pade reh gaye
- logo replace kare → purana media kisi ka reference nahi raha

Aur delete ka koi route hai hi nahi (D-41 §7).

**Decision:** orphans **abhi accept honge**. Foundation me na koi auto-delete, na cleanup
job.

**Kyun:** `mediaRefs` ke bina "ye media kahin use to nahi ho rahi" ka jawab hai hi nahi.
Us jawab ke bina delete karna theek wahi trap hai jisse D-41 §7 bachna chahta tha — live
page pe toota hua image. Kuch orphan files ki keemat us risk se bahut kam hai.

**Keemat, saaf likhi hui:** jab tak Phase 2 nahi aata, har replace ek dead media record
aur teen webp files chhodta jaayega. Chhoti site pe ye kuch MB hai, par ye **apne aap
saaf nahi hoga**.

**Phase 2 me kya banega:** `mediaRefs` aane ke baad ek "unreferenced media" sweep — pehle
sirf **dikhaye**, delete admin ke confirm pe. Ye Phase 2 ke scope me likha jaana chahiye.

### 4. Upload-on-save nahi

**Reject kiya:** logo ko Save tak buffer me rakhna aur tabhi upload karna.

**Kyun:** isse Settings ke paas media banane ka apna alag raasta ban jaata — theek wahi do
upload-path wali samasya jisse bachne ke liye Media pehle banayi gayi thi. Aur Phase 2 me
MediaPicker aane pe ye poora raasta phenkna padta.

---

**Reject kiya (aur kyun):**

- **Sirf read-side fallback, write pe koi check nahi** — galat id DB me baithi rehti hai
  aur har jagah dobara handle karni padti. Galti ko entry point pe rokna sasta hai.
- **`logoMediaId` pe Mongoose `ref` + populate** — cross-module coupling badhata hai aur
  Settings ke har read pe join laata, jabki 99% baar sirf id chahiye.
- **Replace pe purana media turant delete** — bina `mediaRefs` ke ye maan lena hai ki wo
  media kahin aur use nahi ho rahi. Wahi assumption Phase 5 me blocks ke saath tootegi.

---

## D-43 · Menu ka data contract — Columns → Groups → Links, aur className kabhi behaviour nahi

**Context:** Slice 0 (D-27) ka pehla kaam menu model hai. `02-ARCHITECTURE.md` §3 me
`menus` ek line thi — `siteId, key, name, items[]` — aur **`items[]` ka andar ka shape
kahin define nahi tha**. `10-REFERENCE-DESIGN.md` §3 ne ek fix suggest kiya tha (flat
`children[]` + `menuType` + `linkType: "none"` + `columns`). Client ne ek asli behaviour
reference diya (`home-nav-v3.html`) jisme wo suggested fix **kaafi nahi nikla**.

**Decision:** Poora typed menu contract — **[`specs/006-menu-contract.md`](../specs/006-menu-contract.md)**.
Mukhya baatein:

```
item        menuType: 'link' | 'dropdown' | 'mega'      ← discriminated, ek menu me mixed
dropdown    children[], max depth 3 (top → child → grandchild)
mega        layout (sm|md|wide|full)  +  columns (2..6)     ← DO ALAG properties
            columns[] → column → groups[] → group → links[]
            group.heading? + group.link?  → heading clickable ho sakti hai
            cta? { text, buttonLabel, buttonUrl, variant, className? }  ← optional
className   item · link · mega · column · group — SIRF presentation (R18)
```

**Kyun suggested fix kaafi nahi tha** (teenon behaviour reference se pakde gaye):

1. **Ek column me kai groups.** Reference ke Travel Guide ka column 4 me do groups hain
   ("Honeymoon & Weddings" aur "Group & Corporate"), Activities ke har column me 2-3.
   Flat `children[]` me ye sirf depth-convention se banta — aur tab "ek group wala column"
   aur "plain dropdown" bilkul ek jaise dikhte, renderer ko **guess** karna padta.
2. **Group ki heading clickable hai.** Reference me har heading `<a class="gl" href>` hai.
   `linkType: "none"` ka matlab hi hai "link nahi" — wo case ban hi nahi sakta tha.
3. **Width aur column count do alag axes hain.** Reference me `.mega--full/--wide/--md/--sm`
   positioning+width karti hain aur `.mega__cols--2/--3/--4/--6` grid count. Suggested fix
   me sirf ek `columns` number tha.

**Nateeja — jo aur tay hua:**

| # | Faisla |
| --- | --- |
| **Mixed types** | Ek hi menu me `link` · `dropdown` · `mega` saath rah sakte hain |
| **Dropdown depth** | Max 3. **Imaandari se: iska evidence kisi reference me nahi hai** — frozen design ek indent level dikhata hai, behaviour reference me dropdown hai hi nahi. Ye naya faisla hai |
| **Grandchild ka visual** | Desktop pe right-side flyout, mobile pe nested accordion. Pure CSS/JSX — badla to data change zero |
| **Columns 2-6** | `5` bhi, chahe behaviour reference ki CSS me `--5` na ho. **Theme ko 2 se 6 sab ship karni hogi** |
| **layout × columns** | Compatibility **validation** hai, hint nahi — `MIN_COLUMN_WIDTH = 160px` se derived. `sm`→2 · `md`→2,3,4 · `full`/`wide`→2..6. CMS admin se jaan-boojh kar toota layout nahi banwata |
| **Order** | Array ki position hi order hai — **koi `order` field nahi**. Isliye baad me nested drag-drop pure UI change hoga, migration zero |
| **Mobile** | Wahi menu data, wahi endpoint. **Koi separate mobile menu nahi** |
| **Mega ka CTA mobile pe** | ⚠️ **Revised 25 Aug — ab mobile pe NAHI dikhta** (reference jaisa hi). Detail neeche |
| **Footer** | Wahi generic menu system (D-17). Footer column ki heading `menus.name` se aati hai — koi naya field nahi |
| **Locations** | `header` · `footerColumn1..4`. Generic naam — `footerExplore` jaise content-specific naam ek travel site ke hain, framework ke nahi |

**D-17 partially superseded:** D-17 `mobile` ko ek assignable location batata hai. Ab wo
nahi hai — do content sets hamesha drift karte hain. D-17 ka baaki hissa (menus aur
locations alag, jitne chaho menus) **jaisa tha waisa hai**.

**D-14 ka Slice 0 exception:** D-14 kehta hai tag taxonomy Phase 3 me design hogi. Slice 0
ko `menu:{location}` **abhi** chahiye. Saath me `cache-invalidation` skill ke dependency
map me ek bug bhi theek hua — wo `menu.location` padhta tha, par location menu pe hai hi
nahi, wo `menuLocations` ka assignment hai aur ek menu **kai** locations pe ho sakta hai.

**D-27 ka scope badha:** mega builder ke saath Slice 0 ~1.5 hafte se **~2.5 hafte** ho
jaata hai. Ye chhupaya nahi ja raha — `05-BUILD-PLAN.md` me revise ho chuka hai. Wajah:
client ka behaviour reference mega-menu heavy hai, aur data model aaj freeze karna hi
sasta hai (baad me = 15 instances pe menu data migrate).

**`locale` ek correction hai:** `02-ARCHITECTURE.md` §3.3 me `menus: { siteId, key } unique`
likha tha. §3.1 khud `locale` ko day-1 reserve batata hai, aur `schema-change` skill isi
exact case ko naam se bulaati hai. Sahi index `{ siteId, locale, key }` hai.

### D10 ka revision — 25 Aug

Pehle tay hua tha ki mega ka CTA **mobile drawer me bhi dikhega**, aur wo behaviour
reference se jaan-boojh kar hatna tha. Us waqt wo sahi tha: drawer me CTA ka koi
doosra thikana tha hi nahi.

Uske baad drawer me **header ke CTA buttons** jud gaye (`mdrawer__foot`). Ab har mega ka
apna CTA unhi ke upar dohra padta hai, aur lambe accordion ke aakhir me dab bhi jaata
hai. Isliye ab wo mobile pe nahi dikhta — reference jaisa hi.

**Desktop pe CTA jaisa tha waisa hai** — columns ke neeche full-width row.

Sabak: "reference se hatna" apne aap galat nahi tha; galat ye tha ki us hatne ki wajah
ek aisi kami thi jo baad me bhar gayi. Divergence ke saath uski **wajah** likhi thi,
isiliye wajah khatam hote hi wo dikh gaya.

**Reject kiya:**

- **Flat `children[]` + `linkType: "none"`** — upar wali teen wajah.
- **Uniform tree with `nodeType`** (`item|column|group|link`) — frozen design ke single
  drag-list se behtar match karta, par invalid states representable rehte (mega ke bahar
  column, depth-4 link). Storage typed hai aur editor phir bhi indented list — dono mil gaye.
- **`className` se behaviour infer karna** (`mega-menu menu-6-columns mega-wide`) — R18.
  Reference khud proof hai: `mega--gl2` purely presentational hai, aur `mega--full` do kaam
  kar rahi hai (positioning hook + width). Parse karne wala implementation dono ko structure
  samajh baithta.
- **Alag mobile menu / `mobile` location** — do content sets hamesha drift karte hain.
- **Mega builder ek modal me** — frozen design me modal/drawer primitive hai hi nahi;
  banana R15 todna hota.
- **Footer ke liye alag data model** — menus + locations pehle se generic hain (D-17).
- **`social` ke liye naya repeatable field** — `settings.social` pehle se hai
  (`SOCIAL_KEYS` frozen). Naya banane se do social sources ban jaate.

### Amendment · 25 Aug — `cta.variant`, aur `BUTTON_VARIANTS` ki jagah

Mega ka CTA `className="btn"` pe render ho raha tha aur **plain text jaisa dikhta tha.**
Wajah mera hi purana refactor tha: `.btn` base ab **sirf shape** deta hai (`border: 0`,
koi background nahi) aur rang `btn--outline` / `btn--primary` / `btn--accent` se aata hai.
Header ke buttons pe wo variant tha, mega ke CTA pe nahi — is liye wo naked reh gaya.

Do tarah se theek ho sakta tha. **`className` me `btn--accent` likhwana R18 todta** —
class presentation ka *extra* hai, look ka faisla nahi; aur non-technical client se magic
naam yaad karwana wahi bojh hai jise ye CMS hataata hai. Isliye structured field:

```
cta.variant : outline | primary | accent     default = accent
```

Default `accent` hai kyunki CTA hota hi dhyaan kheenchne ko hai (reference me bhi bhara
hua hai). Public payload me `variant` **hamesha** jaata hai — theme ko fallback ka faisla
nahi karna padta.

**`BUTTON_VARIANTS` `settings.js` se `menu.js` me chala gaya.** Ab uske do consumer hain:
header buttons (settings) aur mega CTA (menu). `settings.js` pehle se `menu.js` se
import karti hai, to ulta import **cycle** banata. Do jagah list rakhna vichaar tha aur
chhod diya — is codebase me wo pehle ho chuka hai aur ek din chup-chaap alag ho jaata hai.

Spec 006 §1.3.2 me poora shape hai.

---

## D-44 · Footer ek composed region hai, menu locations ka set nahi

**Context:** D-43 me footer ke chaar columns **theme locations** the — `footerColumn1..4`,
`menuLocations` collection me assign hote the, aur column ki heading `menus.name` se
render hoti thi. 25 Aug ko client ne teen cheezein maangin, aur teenon usi ek model se
takraa gayin:

1. **Columns ki ginti client chune** — pehle "kitne columns" ka koi concept hi nahi tha;
   theme ne chaar declare kar rakhe the, bas.
2. **Har column me menu, text, ya dono ho sake** — client ke apne footer reference me
   column 1 (support/email/timing) aur column 4 (office addresses) **menu hain hi nahi**,
   wo text blocks hain. D-43 ne yahi maan kar chhoda tha ki wo "Andaman-specific content"
   hai aur framework ke scope me nahi — par client ne wahi maanga.
3. **Footer ka apna logo** — footer gehre background pe hai, wahan aksar inverted logo
   chahiye hota hai.

Saath me client ne ek doosri baat pakdi: social links **do jagah** editable the — Settings
▸ General me aur Appearance ▸ Footer me — jabki data ek hi tha (`settings.social`).

**Decision:** Footer ka poora structure `settings.footerColumns[]` me aata hai. Menu
locations me sirf `header` bachta hai.

```
settings.footerColumns[]   max 6
  id          client-side id (drag-drop ki React key)
  heading     apni field — ab menu ke naam se nahi aati
  type        'menu' | 'text' | 'both'
  width       'normal' | 'wide'      kitna chauda wo THEME tay karti hai (aaj 1.5x)
  menuId      kaunsa menu — pehle ye menuLocations ka kaam tha
  textBlocks[]  max 6 — { id, icon, label, text }

settings.footerLogoMediaId   footer + mobile drawer ka logo
settings.footerNote          bottom bar ke beech ki line (memberships/registrations)
settings.footerDisclaimer    sabse neeche ki fine print
```

**Kyun locations nahi rahe:** jis pal ek column **text-only** ho sakta hai, wo "menu
location" rehta hi nahi. Ek theme location ka poora matlab hi ye hai ki "yahan ek menu
lagta hai" — usme heading, text blocks, width aur *ginti* express karne ki koi jagah nahi.
Do jagah rakhne (locations me menu, settings me baaki) ka nateeja aur bura hota: har
column do documents me aadha-aadha padta.

### 1. Ginti = array ki length, koi `columnCount` field nahi

Admin ka "Number of columns" dropdown `footerColumns` array ko grow/shrink karta hai aur
apni koi state nahi rakhta.

Ye D-43 §1 ka seedha sabak hai: wahan `mega.columnCount` (number) aur `mega.columns[]`
**do alag fields** hain, aur unhe barabar rakhne ke liye ek validation likhni padi.
Yahan wo problem banne hi nahi di gayi.

### 2. `type` structural discriminator hai, aur reference mitta nahi

`type: 'text'` chunne se `menuId` **DB me bacha rehta hai** — bas public payload me nahi
jaata. Client bina data khoye aage-peeche switch kar sakta hai. Wahi soch `headerButtons`
ke `enabled` flag ke peeche hai (D-43), aur wahi `menuType` pe bhi.

Filter **server pe** lagta hai, theme me nahi (`getPublicFooterColumn`) — `type` khud
public payload me jaata hi nahi. Theme ko ye pata hona chahiye ki uske paas kya hai, ye
nahi ki admin ne kya chuna tha.

### 3. Heading apni field hai

D-43 me column ki heading `menus.name` se aati thi. Text-only column me koi menu hai hi
nahi, to naam kahan se aata. Migration 008 purane columns ki heading me menu ka naam bhar
deti hai, isliye kisi chalte hue site ka footer heading khoye bina waisa ka waisa rehta
hai.

### 4. Footer logo — fallback API me hai, theme me nahi

`footerLogoMediaId` khaali ho to public payload ka `footerLogo` **header wale logo se**
bhar jaata hai. Do logo tabhi chahiye jab wo sach me alag hon.

Fallback theme me rakhne ka nateeja: ek din footer ne fallback kiya aur drawer ne nahi,
aur wo bug payload dekh kar samajh hi nahi aata. D-42 §2 waise ka waisa hai — dono na
mile to `null`, aur toota `<img>` phir bhi kabhi render nahi hota.

**Mobile drawer bhi yahi logo use karta hai** (client ka faisla).

Ek sawaal isi ke saath utha tha (Q-8): drawer ka background **safed** hai aur footer ka
**gehra**, to inverted logo dono jagah theek nahi dikhega. **26 Aug ko client ne tay kiya:
ek hi logo dono me theek hai** — yaani logo aisa chuna jaayega jo dono background pe padha
jaa sake, aur theme me do alag logo ka koi raasta nahi banega.

Iska matlab ye bhi hai ki `footerLogoMediaId` ka kaam **"footer ka logo" hai, "dark logo"
nahi** — wo ek alag asset hai, ek alag theme variant nahi.

### 5. Cache — footer ka tag `settings` hai, `menu:*` nahi

Footer ka data ab `/api/public/settings` se jaata hai, isliye **footer me use ho rahe menu
ko badalne pe `settings` tag stale hota hai**. `invalidateMenu()` ab wo bhi check karta
hai.

Ye D-43 §4 wali galti ka agla roop hai: tag wahan se lo jahan assignment **sach me** rehti
hai, wahan se nahi jahan pehle rehti thi.

### 6. Social links sirf Settings ▸ General me — aur ab `x` bhi

Field `settings.social` hi rehta hai. Sirf **duplicate UI** hataya gaya; footer unhe
render karta rehta hai.

Do cheezein saath me theek huin:

- **`x` juda** (reference ke footer me hai). Settings singleton hai (D-01) aur default
  `''` schema se aata hai — **koi migration nahi**.
- **`SOCIAL_KEYS` ka order ab contract ka hissa hai** (f · instagram · youtube · X).
  Theme pehle `Object.entries(social)` pe ghoomti thi — wo Mongo document ki key order
  pe chalta hai, yaani icons ka order ek din chup-chaap badal sakta tha. Admin ke inputs
  bhi ab isi list pe map hote hain, hardcoded nahi — `x` add karte waqt theek wahi jagah
  chhoot rahi thi.

**Brand marks `ICONS` registry me NAHI hain** — alag `SocialIcon.jsx` hai. `ICONS` UI ki
furniture hai jo client kisi bhi text block pe chun sakta hai; brand mark aisa nahi hai,
uska set `SOCIAL_KEYS` se bandha hai. Rendering bhi alag: UI icons stroke-based hain,
brand marks **filled**.

### 7. Bottom bar ke do naye text fields

Reference ke footer me copyright ke alawa **do aur** text hain, aur dono ka apna kaam hai:

| Field | Kahan | Kyun alag field |
| --- | --- | --- |
| `footerNote` | bar ke **beech** me | Membership/registration text. Copyright ke saath ek hi field me daalne se client ko layout line breaks se banana padta |
| `footerDisclaimer` | bar ke **neeche**, poori chaudai | Pricing/availability ki fine print — rang aur size dono alag |

Bar ab **grid** hai, flex nahi: flex me beech wala hissa apni content width se khisak jaata
hai aur copyright lamba hote hi centre se hat jaata.

Dono generic hain, Andaman-specific nahi — har industry me kuch aisa hota hai (travel me
pricing, clinic me medical advice, finance me risk).

### Naya farz jo is faisle ke saath aaya

Menu delete hone pe uska reference **footer columns se bhi** saaf hona chahiye — pehle wo
sirf `menuLocations` se hota tha. Column **delete nahi hota**, sirf uska `menuId` `null`
hota hai: heading aur text blocks client ka content hain.

Isse `menus` ↔ `settings` ke beech ek circular import banta hai. Wo jaan-boojh kar hai aur
chalta hai — dono taraf sirf hoisted function declarations hain aur koi module load ke
waqt doosre ko call nahi karta. Ek event bus is ek jodi ke liye zyada hai.

### 8. Footer ka column ek FLAT list hai

Theme sirf menu ke **top-level `items[]`** render karti hai. Dropdown/mega ke sub-items
hover pe khulte hain, aur footer me hover jaisi koi cheez hai hi nahi.

Yaani footer ke menu me har item **Simple link** hona chahiye. Ye ek chup-chaap hone wali
galti hai — admin mega menu chunta hai, Save theek hota hai, aur site pe uske aadhe links
kahin nahi hote, bina kisi error ke. Isliye Appearance ▸ Footer me column ka Menu chunne
pe **ginti ke saath warning** dikhti hai ("2 items in this menu are a dropdown or mega
menu…"). Khaali cheez khaali dikhni chahiye, tooti hui nahi (D-30).

Footer ko nested render **karwana** ek option tha — reject kiya: reference ka footer flat
hai, aur nested footer ka matlab hota ek naya collapse/expand behaviour banana jo design
me hai hi nahi (R15).

### 9. Mobile pe columns collapse hote hain — desktop pe nahi

Phone pe chaar column ek ke neeche ek 40+ links ka lamba scroll ban jaate hain, aur uske
neeche ka copyright/disclaimer kabhi dikhta hi nahi. Isliye ≤760px pe **heading hi toggle
hai** aur column band khulta hai.

Teen cheezein jaan-boojh kar aisi hain:

1. **Collapse sirf "Menu only" column ka hota hai** (client ka faisla). Text wale column
   khule rehte hain: unme phone, email aur pata hote hain, aur unhe dekhne ke liye tap
   maangna ulta padta. Ek lambi link list chhupane me kuch nahi jaata; contact detail
   chhupane me jaata hai.

   **Shart content se nikalti hai, `type` se nahi** — public payload me `type` jaata hi
   nahi (§2), aur theme ko ye pata hona chahiye ki uske paas **kya hai**, ye nahi ki admin
   ne dropdown me kya chuna tha. Column collapse hota hai jab: heading ho, menu ke items
   hon, aur text block ek bhi na ho. Nateeja wahi hai, aur ek adhoora "Text + Menu" column
   (jisme abhi tak koi text block bhara hi nahi) bhi theek se handle ho jaata hai.

   Heading zaroori hai kyunki **heading hi toggle hai** — bina uske tap karne ko kuch
   bachta hi nahi.
2. **Logo collapse hone wale hisse ke bahar hai** (`brand` prop, `children` nahi).
   Aaj logo wala column text wala hai, to wo waise bhi collapse nahi hota — par ye alag
   rakhna sasta hai aur ek din client logo ko menu column pe le jaaye to bhi wo nahi
   chhupta.
3. **State `false` se shuru hoti hai, aur desktop CSS use dekhti hi nahi.** `matchMedia`
   padh kar initial state banane se server aur client ka pehla render alag ho jaata hai
   (hydration warning). Desktop pe `.ft__body` ka koi `display` rule hai hi nahi, to wo
   block rehta hai chahe state kuch bhi ho — aur JS na chale to mobile pe bhi sab khula
   rehta hai, chhupa hua nahi.

### 10. Phone aur email render ke waqt clickable bante hain

Reference ke footer me phone `tel:` aur email `mailto:` hain. Hamare text blocks plain
text the, to mobile pe number tap hi nahi hota — travel site ke footer me ye asli nuksaan
hai.

**Data me kuch store nahi hota.** `linkifyParts()` (`apps/web/lib/linkify.js`) render ke
waqt text ko tukdon me todta hai aur theme unhe `<a>` ya bare text ki tarah render karti
hai. Client ko koi naya field nahi bharna padta, aur purana data turant clickable ho jaata
hai.

Do doosre raaste reject hue:

| Raasta | Kyun nahi |
| --- | --- |
| Text me HTML allow karna | Admin panel se **stored XSS** ka seedha raasta |
| Har block me ek `link` field | Number do baar likhna padta (text me aur `tel:` me), aur ek block me **do** number alag-alag link nahi ho sakte — reference ka "num1 / num2" wala case toot jaata |

**Phone sirf `phone` icon wale block me pakda jaata hai.** Ye shart hi is design ko bachati
hai: bina uske pincode link ban jaate — reference ke apne footer me "A&N Islands 744102"
aur "New Delhi 110005" hain, aur koi bhi thoda dhila phone regex unhe pakad kar
`tel:744102` bana deta, **bina kisi error ke**. Icon wahi jagah hai jahan client pehle se
bata chuka hai ki block me kya hai; use dobara istemaal karna naya field maangne se behtar
hai.

Email pe ye shart nahi hai — `kuch@kuch.kuch` ka shape itna khaas hai ki wo galti se kisi
pate ya date me nahi milta.

`.ft__sup-value` ki apni class hai, bare `span` nahi: uske andar ab tukde aate hain, aur
`display: block` un tukdon ko mil jaata to "+91 98100 66496 / 98110 66496" teen line ban
jaata.

Test (`linkify.test.js`, 13) me sabse zaroori wo hain jo **nahi** pakadte — pincode, timing,
aur ghar ke number wala pata.

### Text blocks rich text NAHI hain

`text` plain hai — koi HTML, koi markup. Line breaks preserve hote hain (`pre-line`), bas.
Rich text Phase 1 ke `richText` block ke saath aayega; usko yahan aadha-adhoora banane ka
matlab hota **do editor** maintain karna, aur admin se aayi HTML ko render karna stored
XSS ka seedha raasta hai.

### Icons ab ek shared registry me

`BUTTON_ICONS` (settings schema ke andar) ab `constants/icons.js` ki `ICONS` list hai, aur
footer ke text blocks wahi list use karte hain. Teen naye icons: `clock`, `mapPin`,
`building` — teenon reference ke footer se. Koi naam **rename nahi hua**, isliye stored
data pe asar nahi (R4).

**Migration:** `008-footer-columns.js` — purane `footerColumn1..4` assignments
`settings.footerColumns[]` me, phir wo location rows delete. Idempotent (`footerColumns`
pehle se bhari ho to haath nahi lagti) aur `down()` menu wale columns wapas locations me
daal deti hai.

**Supersedes:** D-43 ka footer wala hissa (locations me `footerColumn1..4`), aur D-17 ki
location list ka footer hissa. Baaki D-43 (menu ka typed contract, mega, className) waise
ka waisa hai.

**Jo NAHI kiya:**

- **Per-column background/colour** — footer ka look theme ka kaam hai, content ka nahi
  (R18 ka wahi tark jo `className` pe hai).
- **Text me rich formatting** — upar wali wajah.
- **Social links ka naya repeatable field** — `settings.social` pehle se hai; naya banane
  se do social sources ban jaate (D-43 me bhi yahi reject hua tha).
- **Column ke liye alag collection** — settings singleton hai (D-01), naya field jodna
  sasta hai aur backfill ek hi row pe hota hai.

---

## D-45 · Payload CMS nahi — apna stack hi chalega (C-2 band)

**Context:** 19 Aug ko C-2 approve hua tha — Payload CMS ka 2-din spike, ye dekhne ke liye
ki apna `entries` engine likhne ki jagah usko base banaya ja sakta hai. Us din repo
**khaali** tha, isliye sawaal sasta tha: "2 hafte ka kaam bach jaayega?"

26 Aug tak haalat badal chuki hai. Auth, RBAC, media + variants, settings, admin shell,
Users screens, menus, aur poora public header/footer **ban chuke hain aur chal rahe hain**
— 383 test ke saath. Payload apne saath apna data layer, apna auth aur apna admin panel
laata hai; use "sirf entries ke liye" nahi lagaya ja sakta. Yaani ab uska matlab hai wo
saara chalta hua code **phenkna**.

**Decision:** **Payload nahi.** C-2 band. Apna stack hi aage chalega.

### 1. Sabse bhaari wajah — client ka frozen design

`admin-design.html` **spec hai** (R15), aur design client se aata hai, developer se nahi.
Payload ka admin panel Payload ka hai: usme field-level components badle ja sakte hain
aur custom views jode ja sakte hain, par **shell uska apna hai** — nav, list view, document
edit ka layout.

Yaani har screen pe Payload ko us design me dhakelna padta. Wo shell hum **pehle se bana
chuke hain**, aur wo design se match karta hai. Payload lene ka matlab hota: sabse mehnga
hissa dobara, aur framework ke khilaaf.

### 2. Hamara model "add" ka nahi, "add aur remove" ka hai

Ye project client ke approve kiye hue **tukdon** se banta hai — koi fixed roadmap nahi
hai jisme "pehle ye, phir ye" likha ho. Client tay karta hai kya andar hai aur **kya
bahar**.

Framework me jodna sasta hota hai; **hatana aur badalna** mehnga. Do asli misaal isi repo
se:

- **Users ki list me checkbox column hai hi nahi** — bulk actions scope me nahi the, to
  banaya hi nahi gaya. Payload ki list view apni banti hai; usme se cheez nikalna override
  likhna hai.
- **Appearance ke "Homepage Blocks" aur "Banners & Sliders" tab hata diye gaye** (24 Aug),
  aur ek "Header" tab jo bina poochhe ban gaya tha wo **poora delete** hua. Hamare stack
  me wo `nav.js` ki ek line thi.

Removal-heavy model me framework ka default hamesha saamne khada milta hai.

### 3. Jo Payload muft deta, wo ban chuka hai

Payload se asal me sirf teen cheezein milengi jo abhi nahi hain: `entries` ka CRUD,
drafts/versions, aur blocks field. Wo asli fayda hai — par uske badle auth, RBAC, media,
settings aur poora admin shell dobara likhna padega. Ye ab wo sauda nahi raha jo 19 Aug
ko tha.

### 4. Multi-instance koi wajah nahi banti

Har client ka apna DB, apna domain, core code versioned `@cms/*` se (D-01) — ye Payload pe
depend hi nahi karta. Dono taraf barabar.

### Jo hum Payload se phir bhi lenge — uske **ideas**, framework nahi

Blocks field ka shape aur drafts/versions ka model dekhne layak hain, khaas kar Phase 5
(page builder) se pehle — wahi sabse bada bacha hua risk hai. Do sabak pehle se laagu
hain: `content: { version, blocks[] }` ka shape day-1 se (Phase 1 ka documented trap), aur
block ka `type` string kabhi rename na karna (R4).

**Prior art dekhte raho, framework mat lo.**

### Ye faisla kab dobara khulega

Agar client **design se peeche hat jaaye** (yaani admin ka look framework pe chhod diya
jaaye), to sabse bhaari wajah gir jaati hai aur Payload phir se dekhne laayak ho jaata
hai. Aaj wo sooratehaal nahi hai.

**Supersedes:** C-2 (19 Aug ka approved spike) — wo ab band hai, kiya nahi jaayega.

---

## D-46 · Package `entries` ka ek content type hai — apni collection nahi

**Context:** Client ko tour packages bechne hain (spec 007). Package koi saada page nahi
hai — usme din-wise itinerary hai, chaar hotel category ke alag daam hain, add-ons hain,
aur kai dohrayi jaane wali listein hain. Sawaal: iske liye apni `packages` collection bane,
ya ye `entries` ka ek `type` ho? Spec 007 ne ye §9 #1 pe **client ke liye khula** chhoda
tha, kyunki iske badalne se poora plan badal jaata hai — baaki kisi item ke badalne se nahi.

**Decision (client, 26 Aug):** **Package `entries` ka content type hai.**
`packages` naam ki alag collection **nahi** banegi.

```
entries        type: 'package' | 'page' | 'post'
               title, slug, path, status, publishAt, deletedAt, version, seo
               content{}    spec 002 ka envelope
               fields{}     package ka saara type-specific maal

contentTypes   key: 'package', urlPattern: '/packages/{slug}', hasArchive: true
```

**Kyun:** Status, slug, permalink, trash, revisions, scheduled publish, optimistic
concurrency aur SEO — ye **wahi** cheezein hain jo Pages aur Posts me bhi chahiye. Alag
collection ka matlab hai yahi poora engine dobara likhna, aur phir Pages/Posts ke liye
teesri baar.

Ye repo ye galti **do baar** dekh chuka hai: D-43 §4 ka cache tag (menu pe location padhi
ja rahi thi jabki location assignments pe thi), aur D-44 §5 me wahi bug dobara. Dono baar
wajah ek hi thi — ek cheez ka sach do jagah rakha hua tha.

Ye faisla `02-ARCHITECTURE.md` §3 ke "Sab kuch content hai" principle ka hi palan hai; wo
principle Phase −1 se likha hua hai, par aaj tak uspe koi asli type nahi utra tha.

**Reject kiya:** Alag `packages` collection. Wo pehle mahine tez lagti — package ke fields
seedhe top-level pe, koi `contentTypes` indirection nahi. Par uske baad har engine-level
feature (trash, revisions, scheduled publish, path cascade + 301) do jagah likhni padti,
aur jis din wo do jagah alag ho jaatin, us din bug chup-chaap aata: admin "ho gaya" bolta
aur live page purana rehta.

**Jo phir bhi apni collection me rahenge:** master lists — `hotels`, `addOns`, `transfers`,
aur singleton `packageDefaults`. Ye **content nahi hain** — inka apna URL nahi hai, ye
publish nahi hoti, inka trash/revision/SEO ka koi matlab nahi. `entries` me daalna unpe wo
poora engine thopna hota jiski unhe zaroorat hi nahi. Destinations aur Package Type
`taxonomies` me jaate hain (spec 007 §1) — wo classification hain, content nahi.

Yaani lakeer **"iska apna URL aur publish lifecycle hai?"** pe hai, "ye package se juda hai?"
pe nahi.

**Nateeja:**

1. **Slice 1 asal me Content Core hai.** Packages banate-banate `entries` + `contentTypes`
   ka engine ban jaata hai; uske baad Pages aur Posts sirf apne field set ki baat hain —
   engine dobara nahi likhna padta. Isliye Phase 1 ka scope ghata nahi, sirf uska **order**
   client ke hisaab se badla (D-45 §2).
2. **`fields{}` ka contract spec 005 (field DSL) pe khada hai** — package ke fields
   `contentTypes.fields[]` me declare honge, hardcode nahi.
3. **`content` day 1 se `{ version: 1, blocks: [] }` shape me** — package ka overview rich
   text ek `richText` block ke andar. Ye Phase 1 ka documented trap hai (05-BUILD-PLAN);
   isse Phase 5 me migration nahi likhni padegi.
4. **spec 007 ab 🟢 approved hai.** Uske baaki 15 sawaal (§9 #2–#16) build ke waqt tay ho
   sakte hain — koi plan nahi rokta.

---

## D-47 · Content Core ke paanch guard — Slice 1 ka engine

**Context:** D-46 ne tay kiya ki Package `entries` ka type hai. Uske baad engine likhte
waqt paanch aise sawaal aaye jinka jawab spec me nahi tha, aur jinme se har ek ka "aasaan"
jawab chup-chaap tootne wala tha. Ye paanchon ek saath yahan hain kyunki inka source ek hi
hai — **is CMS ka user non-technical hai, aur uski galti wapas nahi ho sakti.**

### 1. `POST /api/entries` se publish nahi hota

Create hamesha `draft` (ya `pending`) pe utarta hai, chahe client `status: 'published'`
bheje.

**Kyun:** live karne ka ek hi raasta hona chahiye — `POST /:id/publish` — kyunki wahi
jagah hai jahan `entry.publish` / `entry.publish.own` ka check aur publish-revision dono
hain. Create pe status maan lene ka matlab tha ki `contributor` pehle hi request me poora
publish flow bypass kar leta: na permission check hoti, na revision banti, na cache
invalidate hoti. Test: _"create se publish nahi ho sakta"_.

### 2. Published item ka title badalne se URL nahi badalta

Draft pe title badle to slug bhi badalta hai (jab tak slug auto-generated ho). Publish
hone ke baad **nahi**.

**Kyun:** URL badalna ek publishing faisla hai, editing ka side-effect nahi. Client apne
page ka title theek karne jaata hai aur uska live link chup-chaap mar jaata — aur ye
mahino baad pata chalta hai, jab traffic gir chuka hota hai. Slug badalna phir bhi mumkin
hai, par **jaan-boojh kar** — slug field khud edit karke.

### 3. `urlPattern` tabhi badal sakta hai jab us type ki ek bhi entry na ho

**Kyun:** `/packages/{slug}` ko `/tours/{slug}` karne ka matlab hai har entry ka stored
`path` dobara likhna **aur** har purane URL pe 301. Doosra hissa `redirects` collection
maangta hai, jo Phase 4 me hai. Aadha kiya gaya rename hi wo case hai jisme saare link
chup-chaap 404 dene lagte hain — isliye jab tak doosra hissa nahi hai, raasta band hai.

**Reject kiya:** "badalne do, path baad me theek kar lenge." Us beech me site live hoti
hai.

### 4. Revision **poora snapshot** hai, diff nahi — aur restore `path` wapas nahi laata

**Kyun snapshot:** diff store karne ka matlab hai ki purani revision restore karne ke liye
saari beech waali revisions replay karni padein. Retention cap (30) beech se ek revision
hata de, aur poori chain toot jaati hai — yaani jo history dikh rahi hai wo restore ho hi
nahi sakti.

**Kyun `path`/`slug`/`version`/`deletedAt` restore nahi hote:** wo entry ki **abhi ki
pehchaan** hain, uske content ka hissa nahi. Purana path wapas laane ka matlab hota ki
content restore karne se live URL badal jaaye — yaani #2 wali galti, pichhle darwaaze se.

**Aur restore khud ek revision banata hai.** Bina uske restore destructive hoti: jo abhi
live tha wo kahin bacha hi nahi rehta, aur galti se restore karne ka koi undo nahi hota.

### 5. Bachche wale item ko trash me nahi daala ja sakta

**Kyun:** bachchon ka `path` ek aise parent ko point karta rehta jo list me hai hi nahi.
Wo tab tak nahi dikhta jab tak koi unhe khole — aur jab dikhta hai to samajh nahi aata ki
kya hua.

**Reject kiya:** bachchon ko chup-chaap saath me trash karna. Ek click se paanch page
gayab ho jaana non-technical user ke liye sabse darawni cheez hai, aur restore ek-ek karke
karna padta.

**Reject kiya:** bachchon ko chup-chaap root pe khiskana. Wahi cheez **restore pe** hoti
hai (parent trash me ho to bachcha root pe wapas aata) — par wahan wo malbe se bachne ka
raasta hai; yahan wo user ki jaankari ke bina structure badal dena hota.

### Nateeja

Paanchon guard **service layer me** hain, model ke hook me nahi (R1) — is module ka
lagbhag har write `findOneAndUpdate` se hota hai, aur wo `save` hooks chalata hi nahi.
Hook me rakhi hui koi bhi line yahan chup-chaap kabhi na chalne wali line hoti.

**Ek cheez jaan-boojh kar baaki hai:** slug badalne pe purane path ka **301 redirect**
abhi nahi banta (cascade banta hai). Slice 1 me kuch publish hua hi nahi, isliye koi live
URL nahi toot raha — par **Slice 3 (publish) se pehle ye zaroori ho jaayega**.
`09-OPEN-ITEMS.md` me tracked hai.

---

## D-48 · Master lists — ek module, teen routes; aur `locale` kis-kis pe

**Context:** Slice 2 me paanch nayi collections aayin — `taxonomies` (Destinations +
Package Type), `hotels`, `addOns`, `transfers`, aur singleton `packageDefaults`
(spec 007 §1). Teen sawaal aaye jinka jawab convention se seedha nahi nikalta tha.

### 1. `hotels` + `addOns` + `transfers` — **ek module**, teen nahi

Module convention kehti hai "har module ki wahi paanch files". Teen alag module banane ka
matlab hota list/pagination/`siteId` scoping wala **wahi code teen jagah**.

**Decision:** ek `master-lists` module, service me ek **registry**. Har list ki do hi cheez
apni hai — kaunse fields se filter hoti hai, aur write se pehle kya check karna hai.

**Kyun:** is repo ne do baar dekha hai ki do jagah rakhi hui ek cheez ek din alag ho jaati
hai — D-43 §4 (cache tag) aur D-44 §5 (wahi bug dobara). Teen copies teen guna wahi khatra.
`menus` + `menuLocations` ka precedent bhi yahi hai: ek module, do collections.

**Par routes teen alag hain** (`/api/hotels`, `/api/add-ons`, `/api/transfers`) — client ke
liye ye teen alag screens hain, aur unki permissions bhi alag hain (neeche).

**Reject kiya:** ek `/api/master-lists?list=hotel` wala route. Tab permission check ek
query param pe nirbhar ho jaata — yaani client ye chun leta ki uski request kis permission
se guzregi. Wo ek permission bypass hai, ek route design nahi.

### 2. Permissions granular — `hotel.*`, `addOn.*`, `transfer.*`; ek `masterList.*` nahi

**Decision:** 14 nayi permission strings, spec 001 ke naming (`resource.action`) ke hisaab se.

**Kyun:** spec 001 ka apna rule hai — "RBAC retrofit is project ka sabse mehnga refactor
hai." Do permissions ko baad me **ek saath dena** ek line ka kaam hai; ek ko baad me **alag
karna** poora retrofit hai. Aaj koi aisa client nahi hai jo Hotels aur Transfers alag-alag
dena chahe — par ye maan lena ki aisa client kabhi aayega hi nahi, wo faisla mehnga hai.

**Read teenon ki `contributor` ke paas bhi hai.** Wo package edit karte waqt add-on chunta
hai aur hotel dropdown dekhta hai; bina read ke wo saare dropdown khaali rehte — aur wo
failure "kuch nahi mila" jaisi dikhti hai, "permission nahi hai" jaisi nahi.

**Write `editor` aur upar.** Hotel ya add-on jodna site ke **har** package pe asar daalta
hai, sirf apne package pe nahi — wahi boundary jo `taxonomy.*` pe pehle se hai.

### 3. `locale` sirf `taxonomies` pe — master lists pe nahi

Day-1 reserve ka test (`schema-change` §1) poochta hai: _kya ye uniqueness constraint
badalta hai?_

| Collection | Unique index | `locale` day 1 se? |
| --- | --- | --- |
| `taxonomies` | `{siteId, locale, type, slug}` | **haan** — warna multi-language pe unique index badalna padta, jo live data pe sabse mehnga kaam hai |
| `hotels`, `addOns`, `transfers` | koi nahi | **nahi** — field add karna ek saada backfill hai |
| `packageDefaults` | `{siteId}` (singleton) | **nahi** — wahi tark jo `settings` pe hai (D-40) |

Ye wahi galti hai jo `menus` pe hui thi aur D-43 me theek karni padi — us waqt sabak ye
nikla tha ki "locale hamesha daal do" nahi, balki **"jahan uniqueness hai wahan daal do"**.

### 4. `packageDefaults` `settings` me nahi

Ye spec 007 §1.8 me pehle se likha hai, par yahan isliye ki koi ise "singleton hi to hai,
`settings` me daal do" keh kar merge na kar de: `settings` **site** ki settings hai — naam,
logo, timezone, footer. Usme package ka maal daalne ka matlab hai ki kal Pages aur Posts ka
maal bhi wahin jaayega, aur ek din `settings` ek kachra-peti ban jaayegi jise koi khol kar
padh na sake.

### Ek galti jo raaste me pakdi gayi

`packageDefaults` ke model me pehle `siteId: { unique: true }` likh diya gaya tha. Mongoose
ka `autoIndex` usse **apne naam se** (`siteId_1`) bana deta hai, aur phir migration apne
naam wali wahi index nahi bana paati: _"Index already exists with a different name"_.

Production me `autoIndex` off hota hai — yaani ye failure **sirf dev me** dikhti, aur deploy
pe index chup-chaap banti hi nahi. Isiliye har model me likha hua hai: **indexes migration
me, model me nahi.**

**Nateeja:** paanch nayi collections, migration 010, 30 naye test. Ek cheez jaan-boojh kar
baaki hai — "kya koi package is destination/hotel/add-on ko use kar raha hai" wala delete
guard. Package taxonomy ko kaise reference karta hai wo **Slice 3** ka faisla hai
(`09-OPEN-ITEMS.md` A-7). Destination pe hotels wala guard laga hua hai, kyunki wo dono
aaj maujood hain.

---

## D-49 · Taxonomy reference ek jagah, aur slug badalne pe purana URL zinda

**Context:** Slice 3 shuru karne se pehle do cheezein khuli thin — `09-OPEN-ITEMS.md` ki
**A-7** aur **A-6**. Dono ka faisla client ne 26 Aug ko liya. Dono ek hi wajah se aaj tay
hue: `entries` me abhi **koi asli data nahi hai**, isliye dono aaj free hain aur pehle
package publish hone ke baad dono live-data migration ban jaate.

---

### A-7 · `entry.taxonomies` generalize hua — spec 002 ka contract ek baar badla

**Decision:** `taxonomies` ab har taxonomy type ki apni key rakhta hai.

```
// pehle (spec 002)          // ab (D-49)
taxonomies: {                taxonomies: {
  categories: [],              categories:   [],
  tags: []                     tags:         [],
}                              destinations: [],   ← naya
                               packageTypes: []    ← naya
                             }
```

Keys `TAXONOMY_REF_KEY` map se aati hain — nayi taxonomy type jodne pe schema, model,
cache tags, list filter aur delete guard me se **kisi me kuch nahi badalta**.

**Kyun:** spec 007 §2 `destinations[]` ko `entries.fields` me likhta tha. Par Destinations
hain `taxonomies` collection me — yaani ek hi cheez (taxonomy reference) do jagah, do
tareeke se rehti. Uska seedha nateeja teen jagah dikhta:

| Cheez | `fields` me rakhne pe |
| --- | --- |
| `tax:{id}` cache tag | sirf categories/tags pe banta — destination archive publish ke baad bhi purana dikhta, aur wajah kahin nahi dikhti |
| Taxonomy archive | destinations ke liye alag se likhna padta |
| "Kya koi entry ise use kar rahi hai" delete guard | do jagah, do query |

Teesra sabse bhaari hai: bina uske ek destination delete ho jaata aur uska reference har
package me baitha reh jaata.

**Keemat:** ye **spec 002 ka frozen contract** hai. "Frozen" ka matlab "kabhi nahi" nahi —
matlab hai badalne ke liye ek decision record chahiye, aur wo tabhi jab live data pe
migration na lage. Dono shart yahan poori hain.

**Ek chhoti par zaroori baat:** `taxonomyRefsSchema` pe `.strict()` lagaya gaya hai. Zod
default me anjaan keys **chup-chaap hata deta hai** — uske bina `taxonomies: { destination:
[...] }` (singular, galat key) bina kisi error ke gayab ho jaata: admin Save karta, "ho
gaya" dikhta, aur uska chuna hua destination kahin nahi hota. Bilkul wahi trap jo spec 006
me `leafItemSchema` pe pakda gaya tha (D-43 §3).

**Aur write pe har id ka type bhi check hota hai**, sirf maujoodgi nahi. Bina uske ek
Package Type ki id `destinations` me baithayi ja sakti hai — save ho jaati, list me kuch
galat nahi dikhta, aur galti public page ke breadcrumb pe pakdi jaati.

**Reject kiya:** `fields.destinations[]`. Contract safe rehta, par upar wali teen cheezein
har naye taxonomy type pe dobara likhni padtin — aur ek din wo do raaste alag ho jaate.

---

### A-6 · `redirects` ka auto wala hissa Phase 4 se pehle aa gaya

**Decision:** `redirects` collection ab bani (migration 011). `entries` service path badalne
pe **apne aap 301 record karti hai**. Manager UI — haath se redirect banana, chain dekhna,
hits ka report — **Phase 4 (SEO) me hi rahegi**.

**Kyun:** cascade Slice 1 me ban chuka tha (parent ka slug badle to descendants ka path
rebase). Bina redirect ke wo aadha kaam tha: path theek ho jaata, par jo link kisi ne share
kar rakha hai wo chup-chaap 404 dene lagta — bina kisi error ke, aur pata mahino baad
chalta hai jab traffic gir chuka hota.

**Teen kaam ek saath hote hain** (`cache-invalidation` skill, "Slug change ka special case"):

1. **Chain flatten** — jo redirects pehle purane path pe aa rahe the, wo ab seedha naye pe
   jaate hain. Bina iske `/a → /b → /c` banta hai; har hop ek extra round-trip hai, aur
   teen hop ke baad Google follow karna hi band kar deta hai.
2. **Naya redirect** — `from → to`, hamesha `301` (slug badalna permanent faisla hai).
3. **Loop se bachav** — naya path khud kabhi kisi redirect ka `from` nahi bacha rehta.
   Aisa tab hota hai jab slug wapas purane naam pe le jaaya jaaye; us row ko na hatane ka
   matlab hai page apne aap pe redirect karta rehta hai.

**Descendants pe bhi banta hai** — sirf parent pe banane ka matlab hai ki bachche ke saare
share kiye hue link mar jaate hain.

**Purge uspe aane wale redirects bhi le jaata hai** — warna wo ek 404 pe point karte rehte
hain: user ko ek hop milta hai aur phir bhi "page nahi mila". Seedha 404 usse saaf hai.

**Fail-soft hai, par chup nahi.** Redirect na ban paane ke liye admin ka Save fail karna
galat trade hai — par error log hota hai, warna wajah kahin dikhti hi nahi. Wahi rule jo
`revalidateTags()` pe pehle se laga hua hai (D-14).

**Redirect path badalne pe banta hai, publish state dekhe bina.** Ek draft ka URL kisi ke
paas nahi hota, par usi entry ka publish ke baad slug badalna aam baat hai — aur us waqt
"kya ye pehle published thi" ka hisaab rakhna ek aur state hai jo galat ho sakti hai. Ek
bekaar redirect ki keemat ek toote hue link se kam hai.

**`locale` day 1 se hai** (`{siteId, locale, from}` unique) — wahi test jo D-48 §3 me laga
tha. `02-ARCHITECTURE` §3.3 pehle `{siteId, from}` likhta tha; wo menus wali galti ka hi
agla roop hota.

**Reject kiya:** published item pe slug edit band kar dena. 20 minute ka kaam hota, par
client ka haath bandhta — aur Phase 4 me redirects aane pe wo guard hatana padta, yaani
wahi kaam do baar.

---

**Nateeja:** 491 tests. Slice 3 ke aage ka raasta ab khula hai — dono blocker band, aur
dono ka guard test ke saath hai.

---

## D-50 · `availability` `status` se alag — aur package ka pehla field set

**Context:** Slice 3 (All Packages list + Add New) shuru karne se pehle spec 007 §9 ke teen
sawaal khule the, aur teenon list screen ya field set ka shape tay karte the. Client ne
26 Aug ko teenon ka jawab diya.

### 1. ~~`Sold Out` ek **alag field** hai, status nahi~~ — **Superseded by D-54**

> ⚠️ **Ye hissa ab laagu nahi hai.** Client ne 26 Aug ko hi, live page dekhne ke baad,
> `availability` poora hata diya — unhe wo feature chahiye hi nahi. Neeche wala tark us waqt
> sahi tha aur ab bhi padhne laayak hai (ek din wapas maanga jaaye to), par **code me ab
> `availability` kahin nahi hai**. D-54 dekho.

```
status:        published    ← page live hai
availability:  soldOut      ← sirf ek badge
```

**Kyun:** sold-out ho jaana ek **bikri** ki baat hai, publishing ki nahi. `status` me
`soldOut` jodne ka matlab hota ki season khatam hote hi package ka page hi gayab — URL
404 ya draft — aur agle season me use wapas open karne pe SEO ranking dobara banani padti.
Ek travel site pe yahi wo galti hai jo saal me do baar traffic girati.

List ka **"Sold Out" tab** ab `availability` pe filter hai, `status` pe nahi. Design me wo
tab status tabs ke saath dikhta tha — isiliye ye sawaal khula chhoda gaya tha.

**Top-level field hai, `fields` me nahi.** Do wajah: ye publishing lifecycle ki cheez hai
(design ke Publish panel me `status` ke bagal me baithti hai), aur `fields` `Mixed` hai —
wahan ise typed enum nahi mil sakta, aur list ka tab ek unvalidated field pe filter karta.

**Har type pe nahi dikhta:** `supports` me `availability` chahiye. Jo type use support nahi
karta, wahan wo chup-chaap `open` rehti hai — **error nahi**, kyunki ye client ki galti
nahi hai: admin ka form us type pe wo control dikhata hi nahi. Galat data phir bhi nahi
banta.

Index migration 012 me — `{siteId, type, availability}`.

### 2. `Code` column hat gaya (§9 #6)

Client ne 26 Aug ko **Package Code field** hata diya tha, par admin design ki list me `Code`
column bacha hua tha. **Column bhi hat gaya.**

**Kyun:** field hi nahi hai to column ka koi content nahi. Column rakh kar khaali chhodna
non-technical user ko har baar confuse karta hai ("ye kyun khaali hai?"), aur mobile pe
bina wajah jagah leta hai. Baad me zaroorat padi to column wapas laana ek line hai.

**Reject kiya:** code auto-generate karna (`PKG-0042`). Kaam ka hota — phone pe reference
dene ke liye — par wo ek naya field, uska unique counter aur ek naya sawaal hai
("delete hone pe number dobara use ho?"). Client ne maanga nahi.

### 3. ~~`Best For` chhoti chips ki list hai~~ — **Superseded by D-55**

> ⚠️ **Ye hissa ab laagu nahi hai.** Client ne usi din asli page dikhaya — `bestFor` ek
> **line** hai aur wo **listing card** pe hai, package page pe nahi. `tags` field type bhi
> hata diya gaya. D-55 dekho.

`fields.bestFor: string[]` — `Couples`, `First-timers`, `5–7 days`.

**Iske liye field DSL me ek naya type juda: `tags`** (spec 005). `repeater` se kaam chal
sakta tha, par uska har item ek **object** hota hai (`[{ value: 'Couples' }]`) aur uske liye
poora sub-form banta hai — ek chhoti si chips ki list ke liye wo bhaari hai.

Ye type Slice 4 me dobara chahiye hoga: har din ke `highlights` bhi yahi shape hain.

**Reject kiya:** Package Type se derive karna. Ek kam field bharna padta, par client
`First-timers` ya `5–7 days` jaisi baat kahin keh hi nahi paata — aur wahi baatein us
section ka matlab hain.

### 4. `taxonomyTypes[]` — aur `supports: taxonomies` hat gaya

Content type ab batata hai ki wo **kaunsi** taxonomies use karta hai:

```
package  → ['destination', 'packageType']
post     → ['category', 'tag']
page     → []
```

Pehle `supports` me ek `taxonomies` flag tha. Uske saath `taxonomyTypes` rakhne ka matlab
hota **ek hi baat do jagah** — "kya ye type taxonomies use karta hai" aur "kaunsi" — aur wo
do jagah ek din alag ho jaatin: khaali `taxonomyTypes` ke saath `supports: ['taxonomies']`,
aur admin ek khaali section dikhata rehta. Isliye flag hata diya gaya; khaali array hi
"koi nahi" hai.

**Ye ek asli guard bhi ban gaya:** ab ek Post pe `destinations` set nahi ki ja sakti. Bina
iske wo save ho jaati, list me kuch galat nahi dikhta, aur galti tab pakdi jaati jab
destination delete karne pe ek aisi Post use rok deti jiska usse koi lena-dena hi nahi tha.

### Package ka field set — jo abhi bana

```
shortDescription · overview · nights · days · bannerImage
bestSeason · bestFor · featured · seoSchema
```

**Yahan sirf Slice 3 ka hissa hai.** Itinerary (§3), pricing (§4), hotels, FAQs, goodToKnow
aur reviews Slice 4-6 me judenge — unme se kai spec 007 §9 ke baaki khule sawaalon pe ruke
hue hain, aur unhe abhi likhna un sawaalon ka jawab maan lena hota. Yahi tark tha jisse
Slice 1 me field set jaan-boojh kar khaali chhoda gaya tha.

`destinations` aur `packageTypes` is list me **nahi** hain — wo `entry.taxonomies` me hain
(D-49).

**Nateeja:** 504 tests. Slice 3 ka API hissa poora; bacha hua kaam admin ki **screens** hai
(`s-packages` + `s-package-edit`), aur wo frozen design ke hisaab se banegi (R15).

---

## D-51 · Itinerary — do chhote faisle jo din ke card pe dikhte hain

**Context:** Slice 4 (Itinerary Builder) shuru karne se pehle spec 007 §9 ke do sawaal khule
the — **#10** aur **#11** — aur ek teesra (#4 ka bacha hua aadha) khud data se tay ho gaya.
Teenon ek hi jagah pe dikhte hain: public page pe din ke card ki **chips ki patti**.

Andaman reference me wo patti aisi hai:

```
Day 1   Stay: Port Blair · Private cab · Approx. 4 hrs sightseeing
Day 2   Ferry: 90 min · Stay: Havelock · Breakfast included
Day 3   Stay: Havelock · Breakfast included · Add-ons priced below
Day 4   Ferry: 40 min · Stay: Neil Island · Breakfast included
Day 5   Ferry: 2 hrs · Stay: Port Blair · Breakfast included
Day 6   Airport drop · Breakfast included
```

Har chip kisi field se aati hai — `Stay:` → `overnightStayId`, transfer ka naam →
`transferId`, `Breakfast included` → `meals`. **Do chips kisi field se nahi aatin**, aur
wahi #10 tha.

### 1. `note` — ek free-text line per din (§9 #10)

**Decision:** har din pe ek optional `note`. Bhara ho to chip dikhti hai, khaali ho to nahi.
Icon **fixed** hai — client nahi chunta.

**Kyun free text:** dono asli examples aapas me alag kism ke hain — `Approx. 4 hrs
sightseeing` us din ki **mehnat** batata hai, `Add-ons priced below` page me **kahin aur**
bhejta hai. Inhe ek structured field (`duration`, ya `hint`) me nahi baandha ja sakta.

**Kyun ek line, list nahi:** reference me kisi bhi din pe do note nahi hain. `notes[]`
rakhna aaj kaam nahi aata, aur chaar-paanch chips din ka card bhar deti hain.

**Kyun icon fixed:** ek chhoti si line ke liye client se do field bharwana (text + icon)
bhaari hai. Transfer pe icon isliye hai ki wo ek **master list** ka record hai — ek baar
likha jaata hai aur bees packages me chalta hai. Note har din ka apna hai.

**Reject kiya:** field hi na banana. Tab wo do chips page pe aatin hi nahi, aur client ko
wo baat description me likhni padti — jahan wo ek chip ki tarah nahi dikhti.

### 2. `transferNote` din pe hai, Transfer ke record pe nahi (§9 #4 ka bacha aadha)

**Ye poochha nahi gaya — data ne khud tay kar diya.** Reference me ek hi `Ferry` teen alag
duration pe chalti hai: `90 min` (Port Blair → Havelock), `40 min` (Havelock → Neil),
`2 hrs` (Neil → Port Blair).

Duration ko Transfer ke record pe rakhne ka matlab hota har route ke liye ek alag "Ferry"
banana — `Ferry 90 min`, `Ferry 40 min` — aur wo master list ka poora point hi khatam kar
deta (§1: _"jo cheez dohrayi jaati hai wo ek baar likhi jaaye"_).

Free text hai, number nahi: `90 min`, `2 hrs` aur `overnight` teenon likhe jaate hain.

### 3. Per-day Hotel Category **rahegi** (§9 #11)

Spec ne ise sawaal banaya tha kyunki pricing ab package-level pe hai (§4), to per-day
category dohraav lagti thi.

**Client ka faisla: rahegi.** Wajah wahi hai jo spec ne dekhi nahi thi — ek hi package me
kuch raatein alag darje ke hotel me ho sakti hain (Havelock pe premium, Neil pe deluxe), aur
wo baat kahin aur kahi hi nahi ja sakti. Khaali chhodne pe package ki default category
chalti hai.

### Route strip — jo client bharta hi nahi

`routeStrip()` `packages/shared` me hai, aur **lagatar** din jinka overnight stay same hai
wo ek card me judte hain (§3.1).

Ek kinara likhte waqt ulta socha gaya tha aur test ne pakda: `[Port Blair, koi stay nahi,
Port Blair]`. Pehla jawab tha "do alag card". **Sach ulta hai** — strip *raatein* ginti hai,
din nahi; jis din koi stay hi nahi hai wo raat banata hi nahi, to raat 1 aur raat 2 lagatar
hain aur `NIGHTS 1–2 Port Blair` hi sahi hai.

`nightsByStay()` isse **alag** function hai, jaan-boojh kar: hotel table ek hotel ki **ek**
row dikhata hai, uska kram nahi — wahan Port Blair ki dono raatein (1 aur 5) jud kar `2`
banti hain. Ek hi function se dono kaam lene ka matlab hota ki ek jagah galat ho jaaye.

### `fields.itinerary` write pe validate hoti hai

`fields` `Mixed` hai (D-46) aur poora field-DSL validator Phase 6 ke saath aayega. Par
`itinerary` abhi se validate hoti hai — wo package ka sabse bada structured hissa hai,
public page ka aadha render usi se banta hai, aur uske andar **references** hain
(destination ids, transfer ids). Baaki fields aaj plain text aur numbers hain; unpe garbage
ka nateeja ek galat dikhta hua field hai, tooti hui page nahi.

**Har din ki `id` service me milti hai, model ke hook me nahi** (R1) — writes
`findOneAndUpdate` se hote hain aur wo `save` hooks chalata hi nahi. Maujood id kabhi
overwrite nahi hoti; wo reorder ke aar-paar stable rehni chahiye (D-43 §5).

**Nateeja:** 538 tests. spec 007 §9 me ab **9 sawaal** bache.

---

## D-52 · Public page slice ke saath badhega — aur `path:` cache tag

**Context:** spec 007 §7 me public page **Slice 7** hai, par wahin ek bracket bhi likha
hai — _"ya har slice ke saath thoda-thoda, agar client jaldi dekhna chahe"_. 26 Aug ko
client ne wahi chuna.

**Decision:** public package page **abhi** shuru, aur har slice ke saath badhega.

**Kyun:** Slice 4 tak sab kuch sirf admin me dikhta tha. Client form bharta raha aur output
kahin nahi dikha — yaani har galti Slice 7 me ek saath milti, jab use theek karna sabse
mehnga hota. Slice 0 me header ke saath yahi hua tha aur wo faayde ka nikla: asli page pe
data dekhte hi aath iterations ek din me ho gaye the (D-43).

**Nateeja ye hai ki page adhoora dikhega, aur wo theek hai.** Jo sections abhi nahi bane
(pricing, FAQs, reviews) wo **render hi nahi hote** — ek khaali section "abhi nahi bana"
nahi lagta, "toota hua" lagta hai.

### 1. Ek hi route — `app/[[...slug]]/page.jsx`

Poore site ka ek hi route hai, aur wo har URL ke liye `GET /api/public/resolve?path=…`
poochta hai. Koi `app/packages/[slug]` jaisa per-type route **nahi**.

**Kyun:** kis type ka URL kaisa dikhta hai wo `contentTypes.urlPattern` se aata hai aur
client use badal sakta hai. Hardcoded route us din jhooth bol raha hota — aur ye D-09 ka
hi rule hai, sirf ab wo sach me chal raha hai.

`resolve` teen me se ek jawab deta hai: **redirect** (slug badal chuka hai), **entry**, ya
**kuch nahi**. Redirect entry se **pehle** dekha jaata hai — ulta karne ka matlab hota ki
purana path pehle 404 khaaye aur redirect kabhi chale hi na.

**Redirect pe API 200 + payload bhejti hai, HTTP 301 nahi.** Wo `apps/web` ka kaam hai:
server-side `fetch` redirect ko chup-chaap follow kar leta hai, aur tab web ko pata hi na
chalta ki browser ko 301 bhejna tha.

### 2. `path:{path}` — ek cache tag jiske bina kuch kaam hi na karta

Ye likhte waqt pakda gaya, aur ye theek wahi failure hai jiski chetavni
`cache-invalidation` skill deti hai.

`apps/web` ka resolve fetch **`path:` se tag hota hai** — kyunki fetch se *pehle* entry ki
id pata hi nahi hoti, aur 404 wale raaste pe to hoti hi nahi. Par API अब तक sirf
`entry:{id}` aur `type:{type}` bhejti thi. Yaani `entry:{id}` kisi bhi fetch pe laga hi
nahi tha:

```
publish  →  revalidateTag('entry:abc')  →  kisi fetch pe wo tag hai hi nahi
         →  page cache me waisa ka waisa
```

Lakshan: _"publish kiya par site update nahi hui"_ — bina kisi error ke.

**Fix:** `tagsFor()` ab `path:{entry.path}` bhi bhejta hai. Aur path badalne pe **purane
path ka tag bhi** — warna purana URL apna 200 wala jawab cache me pakde rehta aur uspe naya
301 kabhi lagta hi nahi. Descendants ke purane paths bhi (D-49 ka cascade).

### 3. References server pe resolve hote hain, theme me nahi

Public payload me destination aur transfer ki **ids nahi, unke naam** jaate hain; route
strip bhi server pe banti hai (`routeStrip()`, D-51).

**Kyun:** theme ko id se naam dhoondhna padta to har theme apna lookup likhta — aur ek din
admin ka preview kuch aur dikhata aur live page kuch aur. `routeStrip()` `packages/shared`
me hai aur admin ka builder bhi wahi chalata hai, isliye dono **ek hi** jawab dete hain.

Aur payload se `version`, `deletedAt`, `searchText`, `authorId`, `templateId` bahar nahi
jaate (R10). `searchText` sirf safai ki baat nahi — usme poora flattened text hota hai, wo
payload lagbhag do guna kar deta hai, aur render me kabhi use nahi hota.

### 4. Rich text node-by-node render hota hai, `dangerouslySetInnerHTML` se nahi

Rich text **client** likhta hai. Use HTML ki tarah chalane ka matlab hai ki admin ka likha
`<script>` har visitor ke browser me chale (architecture §8.2). TipTap ka doc ek JSON tree
hai, isliye node-by-node render karna sirf safe nahi — wahi sahi tareeka hai.

Link ke `href` pe ek doosri deewar hai (`http`, `https`, `mailto`, `tel`, ya relative hi
chalte hain): TipTap write pe bhi rok-ta hai, par purana data aur import kiya hua content
dono us raaste se aa sakte hain.

Jo node ya mark handle nahi hai wo **text ki tarah girta hai, gayab nahi hota** — ek anjaan
formatting ki wajah se paragraph ka poora text kho jaana sabse bura nateeja hai.

**Nateeja:** 547 tests. `app/page.jsx` ka placeholder hat gaya — optional catch-all `/` bhi
sambhaalta hai, aur do route ek hi path pe rakhna Next me error hai.

---

## D-53 · Slice 5 ke teen sawaal — client ke jawab (§9 #3, #12, #13)

**Context:** Slice 5 (Pricing + Hotels) shuru karne se pehle spec 007 §9 ke teen sawaal
khule the. Client ne 26 Aug ko teenon ka jawab diya. **#13 usi din bana bhi**; #12 Slice 5
ke saath banega; #3 me kuch badalna hi nahi tha.

> ⚠️ Ye record us din **likhna chhoot gaya tha.** Code me (`content-types.js` ka
> `ferriesNote`) aur commit message me "D-53" ka hawala tha, par decision maujood hi nahi
> thi — numbering D-52 se seedha D-54 pe kood rahi thi. Agle `/status` me ye pakda gaya.

### 1. `ferriesNote` — client khud likhega, derive nahi hoga (§9 #13)

Page ke "At a glance" me `Ferries · 3 legs, included` hai. Sawaal tha: ye ginti itinerary se
apne aap nikle, ya client likhe?

**Decision:** client likhega. `fields.ferriesNote`, free text.

**Kyun derive nahi:** dekhne me ye route strip jaisa hi lagta tha — itinerary ke jin dino pe
transfer "Ferry" hai, unki ginti. Par do cheezein raaste me aati hain:

- **Transfer ek free list hai** (spec 007 §1.6). Client `Ferry`, `Catamaran`, `Cruise` —
  kuch bhi likh sakta hai. "Ye ferry hai" pehchanne ke liye us record pe ek flag chahiye
  hota, ya `icon` se andaaza lagana padta — aur wo bharosemand nahi.
- **`included` ginti se aa hi nahi sakta.** Asli line `3 legs, included` hai. Number derive
  ho bhi jaata to us shabd ke liye phir bhi ek field chahiye — yaani do source, ek line.

Ye route strip se **ulta** case hai (D-51): wahan poori line structured data se banti hai,
yahan aadhi nahi ban sakti. Aadha derive karna sabse bura hota — client ko samajh hi nahi
aata ki number kahan se aaya aur wo badalta kyun nahi.

### 2. Har hotel category ke daam ke saath ek chhoti line (§9 #12)

Reference ke `catbar` me har card pe **teen** cheezein hain:

```
Standard    Comfortable, well-located     ₹24,999
Deluxe      Sea-facing on Havelock        ₹29,499
Premium     Beachfront on Havelock        ₹36,999
```

Beech wali line kisi field se nahi aati thi.

**Decision:** `categoryPricing[].note` — ek chhoti line, har category ki apni.

**Kyun:** iske bina cards me sirf naam aur number bachta hai, aur customer ko pata hi nahi
chalta ki ₹5,000 zyada dene se **milta kya hai**. Wahi ek line poore upgrade ko bechti hai.

**Slice 5 me banega** — `categoryPricing[]` abhi bana hi nahi.

### 3. `Room` hotel ke record pe hi rahega (§9 #3)

`Deluxe, twin sharing` — ye hotel ke record pe rahe ya har package apna likhe?

**Decision:** hotel ke record pe. **Yaani kuch nahi badla** — Slice 2 me wahi banaya gaya
tha, bas wo tab tay nahi tha.

**Kyun:** room hotel ki apni property hai — "City Hotel ka Deluxe room". Ek baar likha, har
package me chalta hai. Package pe le jaane ka matlab hota ki client har package pe har
hotel ka room dobara likhe, aur teen destination × chaar category = bara row har baar.

**Reject kiya:** "hotel pe default, package pe override". Wo lachila zaroor hai, par ek aur
field aur ek aur "kaunsa jeetega" wala sawaal laata hai — aur aaj koi aisa case nahi hai
jahan ek hi hotel do packages me alag room de.

`master-lists.js` me `room` ke upar wala ⚠️ comment ab hata diya gaya hai — wo "abhi tay
nahi hai" kehta tha.

---

## D-54 · `availability` hata diya gaya — client ko wo feature chahiye hi nahi

**Supersedes:** D-50 §1

**Context:** D-50 §1 me `availability` (`open` | `soldOut`) joda gaya tha, aur wo faisla
client ne hi liya tha (26 Aug, spec 007 §9 #9). Tark ye tha: sold-out ho jaana **bikri** ki
baat hai, publishing ki nahi — `status` me `soldOut` jodne se season khatam hote hi package
ka page hi gayab ho jaata aur agle season me ranking dobara banani padti.

Us din tak ye sirf design ke `s-packages` me ek tab tha. **Live page dekhne ke baad client
ne kaha ki ye feature chahiye hi nahi** — aur wo unka call hai.

**Decision:** `availability` poori tarah hata diya gaya.

### Kya-kya gaya

```
packages/shared   AVAILABILITY constants · entry schema ka field aur list query param
                  ENTRY_SUPPORT.AVAILABILITY · package ke supports se
apps/api          model ka field · availabilityFor() · counts.soldOut
                  bulk actions `soldOut`/`open` · list ka filter · public payload
apps/admin        editor ka Availability dropdown · list ka "Sold Out" tab
                  bulk dropdown ke do option · row ka badge
apps/web          hero ka "Sold out" badge aur uski CSS
```

### Migration 012 **delete nahi ki gayi**

Ye is faisle ka sabse zaroori hissa hai. 012 (`availability` ka index) apply ho chuki thi.
Applied migration ki file hata dene ka matlab hai ki `migrations` collection me ek record
bacha rahe **jiski file hi na ho** — runner use "missing" report karta hai, aur wo har boot
pe ek jhoothi chetavni banti hai (`index.js` uske liye `logger.error` karta hai).

Isliye 012 waise ki waisi hai, aur **013** uska ulta karti hai: index drop.

Likhte waqt pehle 012 `git rm` kar di gayi thi — wo galti thi aur usi waqt palat di gayi.

### Field collection se nahi hataya, sirf index

- Mongo me ek bacha hua field muft hai — ab koi query use padhti hi nahi
- `entries` me abhi asli data nahi hai, par 15 instances pe `$unset` ka batch chalana ek
  risk hai jiska koi fayda nahi

**Index zaroor gaya:** wo har write pe maintain hota hai, aur ab uspe koi query nahi chalti.

### Jo D-50 se bacha hua hai

D-50 ke baaki teen hisse **waise ke waise** hain — `Code` column ka hatna (§2), `Best For`
ka chips wala shape (§3), aur `taxonomyTypes[]` (§4). Sirf §1 palta hai.

**Ek sabak jo yahan bhi dikha:** D-45 §2 me likha tha ki is project ka model "add aur
remove" ka hai, sirf add ka nahi — client tay karta hai kya andar hai **aur kya bahar**.
`availability` hatana apne stack me chhe file ka kaam tha. Ek framework ke default me se
ise nikalna override likhna hota.

**Nateeja:** 541 tests. spec 007 §9 #9 ab "banaya, phir hata diya" ke roop me band hai.

---

## D-55 · `bestFor` ek line hai, chips nahi — aur wo listing card ka field hai

**Supersedes:** D-50 §3

**Context:** D-50 §3 me `bestFor` ko **chips ki list** (`string[]`) banaya gaya tha, aur uske
liye field DSL me ek naya type bhi joda gaya tha — `tags`. Us waqt sirf spec §2 ki ek line
thi (`bestFor ❓ client ne add karne ko kaha, content tay nahi`), aur maine maan liya ki wo
package page ke hero me chips ki patti banega.

Client ne 26 Aug ko **asli page dikhaya** — `tour-v3.html`, yaani package **listing** page:

```
Emerald Andaman Tour
📍 Port Blair → Havelock
Best for  first-timers on a short break        ← ek line
[2N / 3D] [Ferry] [Breakfast] [Private cab]    ← ye chips ALAG hain
```

**Decision:** `bestFor` ek **plain text line** hai, aur wo **listing card** pe render hota
hai — package page pe nahi.

### Do cheezein jo mai galat samajh baitha tha

1. **Chips ki patti card pe hai, par wo `bestFor` nahi hai.** `2N / 3D`, `Ferry`,
   `Breakfast`, `Private cab` — ye sab **derived** hain: nights/days se, itinerary ke
   transfers se, aur meals se. Chips dekh kar maine maan liya ki `bestFor` unme se hai.
2. **`bestFor` package page pe hai hi nahi.** spec §6 ki mapping table (jo har section ka
   source likhti hai) me wo kahin nahi tha — aur mujhe wahi surag pehle dekh lena chahiye
   tha. Maine use hero me chips ki patti bana kar laga diya tha.

### `tags` field type hata diya gaya

Wo type **sirf** `bestFor` ke liye joda gaya tha (D-50 §3), is umeed ke saath ki Slice 4 me
har din ke `highlights` bhi wahi shape lenge. Slice 4 me `highlights` ek **textarea** bana
(ek line = ek item), isliye `tags` ka koi caller nahi bacha.

Ek DSL type jiska koi user na ho, wo sirf sadta hai — aur Phase 6 ka content-type builder
use ek asli option ki tarah offer karne lagta. `TagsInput.jsx` bhi uske saath gaya.

Wahi tark jo `richTextFromPlain()` pe laga tha (D-52 ke saath): interim scaffolding ka koi
caller na bache to use rakhna "baad me kaam aayega" ka bahana hai.

### Ye field abhi kahin render nahi hota — aur wo theek hai

Package **listing** page (`/packages` archive) abhi bana hi nahi — wo Phase 3 ka kaam hai.
To `bestFor` aaj bharaa to ja sakta hai par dikhta kahin nahi.

Ise "isliye abhi mat banao" ka tark nahi banaya gaya: field **code-owned** hai (D-46), aur
listing card banate waqt uska data pehle se maujood hona hi behtar hai — warna client ko
poori list dobara bharni padti.

**Nateeja:** 541 tests. Admin ke **Info** panel me ab `Best for` ek saada text input hai,
`Ferries` ke saath.

---

## D-56 · Slice 5 — pricing ka shape, aur currency package pe nahi hai

> ⚠️ **Hotels panel wala hissa D-58 se superseded hai** — rows ab itinerary se khud
> banti hain, chuni nahi jaatin.
>
> ⚠️ **§1 aur §3 ka aadha hissa D-57 se superseded hai** (usi din, client ne panel chal kar
> dekhne ke baad): ab chaaron category ki row hamesha hoti hai, `priceBasis`/`gstPercent`/
> `advancePercent` hata diye gaye, aur per-category `note` hotel ke record pe chala gaya.
> §2 (currency) aur baaki sab waise hi hai.

**Context:** Slice 5 (Pricing + Hotels) me spec 007 §4 ko code me utaarna tha. Spec ka
model saaf tha — chaar category, har ek ka apna daam — par **editor ka panel** design se
seedha nahi aata: `admin-design.html` ka "Pricing & Departures" panel ek alag duniya ka
hai, aur uske do bade hisse client pehle hi hata chuka tha.

Do faisle client ne 27 Aug ko liye (R15 — design change client se aata hai), teesra unka
palan hai.

### 1. Pricing panel ki pehli row **category** ki hai, currency ki nahi

Design me pehli `row3` ye thi:

```
Currency   |  Price From  |  Strike-through Price
```

Ab ye hai:

```
Hotel Category  |  Price From  |  Strike-through Price
Note  [......................................]
                                    ＋ Add category
```

Yaani grid **wahi** hai — sirf pehla khana badla. Spec §4 bhi yahi kehta tha ("category ek
dropdown se chuni jaayegi, aur neeche uske apne field bharenge"), par wo panel ke layout pe
chup thi. Client ne 27 Aug ko wo khaali jagah bhar di.

Design ke jo do hisse pehle hi hat chuke the wo waise hi hate rahe: **Occupancy Slabs** aur
**Fixed Departures** (spec §4).

### 2. Currency package pe **nahi** hai — wo `settings.currency` se aati hai

Spec §4 me currency package ka apna field thi (`INR | USD | AED`), aur maine wahi banaya
bhi tha. Client ne 27 Aug ko hata diya: **"currency nahi chahiye"**.

**Kyun ye sahi hai:** ek site ek hi currency me bechti hai, aur wo `settings.currency` me
pehle se maujood hai. Dono jagah rakhne ka matlab sirf ek extra field nahi hota — ek
**sawaal** hota hai: "kaunsi jeetegi". Listing page site ki currency se banti, package page
package ki currency se, aur do jagah do chinh dikhne ki galti mahino baad pakdi jaati.

`formatPrice(amount, currency)` isliye currency **baahar se** leta hai; payload me wo
`getPublicSettings()` se aati hai.

### 3. `pricing{}` ek group hai, paanch alag field nahi

`fields.pricing` ek object hai — andar `categoryPricing[]` (D-57 ke baad **sirf** wahi).
Spec §2 me bhi wo `pricing{}` hai.

Paanch top-level field banane ka matlab hota ki editor me wo alag-alag panel me bikhar
jaate, aur "ye pricing ka hissa hai" wali baat kahin likhi hi na hoti.

`hotels[]` aur `addOns[]` alag rahe — spec §2 me wo bhi alag hain, aur unka jeevan pricing
se alag hai.

### Teen cheezein jo derive hoti hain, store nahi

Ye Slice 5 ka sabse zaroori hissa hai, kyunki teenon ke liye ek-ek field banana bahut
aasan tha:

| Page pe | Kahan se |
| --- | --- |
| Upar ka `₹31,999 → ₹24,999` | **sabse sasti category** — `cheapestPricing()`. Koi "featured category" field nahi |
| Hotels table ka `Nights` | itinerary — `nightsByStay()`. Itinerary badle to table apne aap theek |
| `Standard category — ₹24,999` | category + uska daam se banti hai. Uske baad wali line `packageDefaults.priceNote` se aati hai (D-57 §3) |

Chauthi cheez jo yahan **nahi** hai: `Room`. Wo hotel ke apne record pe hai (D-53 §3).

### Paanch guard — sab reference **banne se pehle**

Wahi invariant jo D-42 §2 ne media pe lagaya tha, aur jo taxonomy refs pe pehle se hai:

1. `hotelId` aur `addOns[]` ki har id sach me maujood ho
2. `destinationId` sach me ek **Destination** ho — koi aur taxonomy nahi
3. ek category do baar price na ho — warna catbar me ek hi tab do baar aata hai aur
   `cheapestPricing()` unme se ek chun leta hai
4. ek destination × category pe do hotel na hon — warna table me us island ki do row
5. `strikePrice > priceFrom`

Paanchwa guard **schema me nahi, service me** hai: schema me lagane ka matlab hota ki aadha
bhara hua form save hi na ho (`strikePrice` pehle likh diya, `priceFrom` abhi baaki).

**Aur ek jagah, delivery ke chhor pe:** public projection me jis row ka hotel ya destination
resolve na ho, wo **payload me aati hi nahi**. Adhoori row bhejne ka matlab hota public
table me ek khaali cell — aur wo customer ko dikhta hai.

### Public page pe teenon jagah ek hi category

Reference me category chunna **teen jagah ek saath** badalta hai: upar ka daam, catbar ka
chuna hua card, aur hotels ki table (design ka apna JS `js-catpick` aur `js-htab` ko sync
karta hai). Isliye selected category ek React **context** me hai, teen alag state me nahi —
warna page pe do alag jawab dikhte aur user ko pata hi na chalta ki kaunsa sach hai.

**Nateeja:** 554 tests (13 naye). Koi migration **nahi** — teenon field `entries.fields`
(Mixed) ke andar hain, na naya collection na naya index.

---

## D-57 · Pricing panel — chaaron category ki row, aur note hotel ke record pe

**Supersedes:** D-56 §1 aur §3 ka aadha hissa

**Context:** D-56 me Slice 5 ban gayi thi, par client ne panel **chal kar dekhne ke baad**
teen aur badlaav maange (27 Aug, usi din). Teenon UI ke faisle hain, par do ka asar seedha
schema pe padta hai — isliye alag record.

### 1. Chaaron category ki row hamesha — koi "＋ Add category" nahi

Pehle panel me ek khaali panel se shuruaat hoti thi aur client ek-ek category jodta tha.

**Decision:** chaaron rows hamesha dikhti hain — Standard · Deluxe · Premium · Luxury.

**Kyun:** categories **fix chaar** hain (§1.3, wo khud client ka faisla tha). Fix cheez ko
ek-ek karke jodwana ek bane-banaye sach ko dobara bharwana hai. Aur "Add category" ka
dropdown ek aur sawaal laata tha: kaunsi bachi hain, aur kram kaun tay karega.

**Iska schema pe asar:** `categoryPricing[].priceFrom` ab **nullable** hai.

**Khaali daam = wo category is package pe milti hi nahi.** Wahi category public page ke
catbar aur hotels ke tabs, dono se gayab ho jaati hai.

Ek alag "ye category on hai" toggle **jaan-boojh kar nahi** banaya: wo ek hi baat do jagah
likhna hota, aur dono ke alag ho jaane pe page pe bina daam ka card dikh jaata.

Chhanni **server pe** hai (`pricedCategories()`), theme me nahi — payload me sirf wahi
categories jaati hain jinka daam hai, sasti se mehngi ke kram me. Do jagah wahi tark rakhne
ka matlab hota ki ek din wo alag ho jaayein aur page pe chaar card par teen tab dikhein.

### 2. `note` package se hat kar **hotel ke record** pe chala gaya

Pehle wo `categoryPricing[].note` thi — har package apni likhta (D-53 §2).

**Decision:** `hotels.note`, optional. Catbar ka card us category ke **pehle hotel** ka note
dikhata hai; "pehla" = package ke `hotels[]` me jo pehle aata hai, yaani kram client ke
haath me hai.

**Kyun:** wahi tark jo `room` pe laga tha (D-53 §3) — hotel ki khaasiyat hotel ki apni baat
hai. Ek baar likho, har package me chalti hai. Package pe rakhne ka matlab tha ki client 60
packages pe wahi line dobara likhe.

> ⚠️ **Ek trade-off jo maine client ko batayi thi:** ek category me kai hotel hote hain
> (teen destination = teen row), aur card pe ek hi line aati hai. Isliye card pe **jis
> hotel ka note pehle milta hai** wahi dikhta hai — hotels[] ka kram badalne pe card ki line
> chup-chaap badal sakti hai. Client ne ye jaante hue chuna.

### 3. `Price Basis · GST % · Advance to Book %` wali poori row hat gayi

Design me ye row thi aur D-56 me bani bhi thi.

**Decision:** teenon field hata diye. `PRICE_BASIS` ka poora constant set bhi gaya — uska
koi caller nahi bacha (wahi tark jo `tags` field type pe laga tha, D-55).

**Par page ka text nahi hata** — client ne saaf kaha: _"jo design me hai wo sab dikhega,
hatane ka koi sawaal hi nahi hota"_ (R15). Page pe `per person on twin sharing, daily
breakfast included` do jagah chhapti hai: hero me daam ke neeche, aur hotels table ke neeche
wali patti me.

**To wo line ab `packageDefaults.priceNote` se aati hai** — ek baar likhi, har package pe
wahi. (⚠️ Uski **screen** aur **kitni jagah dikhti hai**, dono **D-62** me badal gaye:
panel ab Hotels ki screen pe hai, aur hero se wo line hat gayi.) Ye wahi lakeer hai jo What's Included pe pehle se hai (§1.5): jo cheez har package pe
bilkul same chhapti hai, wo package ka data nahi hai.

Pehle wo line **aadhi derived aadhi likhi hui** thi (`per person` basis se, `on twin
sharing, daily breakfast included` kahin se nahi). Aadha derive karna sabse bura shape hai —
wahi galti jo `ferriesNote` pe pakdi gayi thi (D-53 §1). Ab wo poori tarah client ke shabd
hain.

### Ab kya derive hota hai aur kya likha jaata hai

| Page pe | Kahan se |
| --- | --- |
| Upar ka `₹31,999 → ₹24,999` | **derived** — sabse sasti category (`cheapestPricing()`) |
| Hotels table ka `Nights` | **derived** — itinerary se (`nightsByStay()`) |
| `Deluxe category — ₹29,499` ka pehla hissa | **derived** — chuna hua tab + uska daam |
| `per person on twin sharing…` | **likha hua** — `packageDefaults.priceNote` |
| Card ki beech wali line | **likha hua** — us category ke pehle hotel ka `note` |
| Table ka `Room` aur `Note` | **likha hua** — hotel ke apne record se |

**Nateeja:** 557 tests (3 naye — khaali category ka save aur uska page se gayab hona, public
payload ka kram, aur khaali daam pe strike-through ka check na lagna). Koi migration
**nahi**: `pricing` `entries.fields` (Mixed) me hai, aur `hotels.note` / `priceNote` dono
naye optional field hain jinka default `''` hai.

---

## D-58 · Hotels panel ki rows itinerary se banti hain — chuni nahi jaatin

> ⚠️ **"Hotel na chunna bhi ek jawab hai" wala hissa D-60 se superseded hai** — hotel ab
> derive hota hai (master list se), aur `hotels[]` sirf **override** hai. Rows ka itinerary
> se banna waisa hi hai.

**Supersedes:** D-56 ka Hotels panel wala hissa

**Context:** D-57 ke turant baad client ne panel dobara dekha. Hotels panel me har row ke
teen dropdown the — Destination, Category, Hotel — aur ek "＋ Add hotel" button.

**Decision:** rows **apne aap** banti hain. Client sirf hotel chunta hai, aur wo bhi
**optional** hai.

```
Rows  =  itinerary ke overnight stays  ×  wo categories jinka daam bhara hai
```

### Kyun — do khaane pehle se maloom the

Destination aur category dono ka jawab package me pehle se likha hua tha:

- **Destination** — itinerary keh chuki hai ki kahan-kahan raat rukni hai
  (`overnightStayId`, D-51)
- **Category** — pricing keh chuki hai ki is package pe kaunsi category milti hai (D-57 §1)

Unhe dobara chunwana wahi galti thi jo `Nights` ko haath se bharwane me hoti (§4.2): **ek
hi sach do jagah.** Aur uska fail hona chup hai — client itinerary me Neil Island hata deta
hai, hotels panel me uski row baithi rehti hai, koi error kahin nahi aata, aur public table
me ek aisa island dikhta rehta hai jahan koi rukta hi nahi.

### Jagah ek baar, chahe raatein do baar

Port Blair raat 1 aur raat 5 dono me aa sakta hai, par hotel ek hi hai — isliye row bhi ek.
Ye wahi farq hai jo `nightsByStay()` aur `routeStrip()` ke beech hai (D-51): strip me Port
Blair **do** card hai (trip ka kram), table me **ek** row (hotel ki baat).

### Chhanni do jagah — aur dono zaroori hain

**Editor me:** rows hi utni banti hain jitni honi chahiye. Ye bharne se rokta hai.

**Public projection me:** jis row ka `Nights` 0 hai, wo payload me aati hi nahi. Ye us data
ki chhanni hai jo **pehle se bhara ja chuka** hai — package save hone ke baad itinerary badal
sakti hai, aur purani row document me baithi rah jaati hai.

Ek hi jagah rakhna kaafi nahi tha: editor purane documents ko theek nahi karta, aur server
editor ke bina bhi likha ja sakta hai.

### Hotel na chunna bhi ek jawab hai

Har row pe "Not set" pehla option hai. Us jagah ka hotel na chuno to us category ki table me
wo row aati hi nahi — package adhoora bhara ho to page pe adhoori table nahi dikhti.

Isiliye `hotels[]` me row **tabhi** banti hai jab hotel chuna jaata hai: khaali rows save
karne ka koi matlab nahi, aur wo har package ke document me bekaar ka maal chhod jaatin.

**Nateeja:** 558 tests (1 naya — itinerary se hataye gaye destination ki row public table me
nahi aati). Schema **nahi badla**: `hotels[]` ka shape wahi hai (`destinationId`,
`category`, `hotelId`), sirf wo bharne ka tareeka badla hai.

---

## D-59 · FAQs ka panel — sirf FAQs, policies nahi

**Context:** Client ne 27 Aug ko FAQs ka panel maanga, saaf shart ke saath: **"with no
policies"**. Design me wo panel **"FAQs & Policies"** hai (`admin-design.html`), aur uske do
example rows me hi dono kism dikh jaati hain:

```
Is the houseboat private or shared?        ← FAQ — is package ki baat
What is the cancellation policy?          ← POLICY — har package pe same
```

**Decision:** panel ka naam **FAQs** hai aur usme sirf `question` + `answer` hain. Policy
wahin rahegi jahan wo pehle se hai — `packageDefaults.cancellationText` (§2.1).

### Kyun ye sahi lakeer hai

Wahi lakeer jo What's Included pe hai (§1.5), aur jo D-57 §3 me price line pe lagi:
**jo cheez har package pe bilkul same chhapti hai, wo package ka data nahi hai.**

Dono ko ek panel me rakhne ka nateeja seedha hai — client cancellation policy 60 packages pe
dobara likhta, aur ek din wo alag-alag ho jaatin. Us din ye pata karna ki "sahi wali kaunsi
hai" kisi ke bas ka nahi hota.

Ye Slice 6 ka kaam tha (spec §7), par client ne Slice 5 ke saath maanga — wahi precedent jo
public page pe laga tha (D-52): scope client se aata hai, plan ka slice number apne aap koi
rok nahi hai.

### Jawab plain text hai, rich text nahi

Reference me har jawab **ek paragraph** hai (`.faq p`) — koi heading, list ya link nahi.
TipTap pe le jaane ka matlab hota ek aur block tree, uska versioning, aur us sab ka Phase 5
me migration — ek paragraph ke liye.

Agar kal client ko FAQ me link chahiye hoga, to wo ek asli baat hogi aur tab uska apna
faisla hoga. Aaj wo sirf ek andaaza hai.

### Page pe `<details>`, koi JS nahi

Public FAQ accordion browser ka apna `<details>`/`<summary>` hai. Teen faayde, teenon asli:
hydration nahi lagti, JS band ho to bhi khulta hai, aur **band accordion ka text bhi Ctrl+F
se mil jaata hai** — apna banaya hua accordion ye teesra kabhi nahi deta.

**Pehla FAQ khula** rehta hai, reference ki tarah: poori band list ke saamne user ko pata hi
nahi chalta ki andar kya hai.

### Khaali sawaal payload me nahi jaata

Public projection un rows ko gira deti hai jinka `question` khaali hai. Aisi row ka nateeja
page pe ek aisa accordion hota jo khulta to hai par usme kuch likha hi nahi hota.

**Nateeja:** 562 tests (4 naye). Koi migration **nahi** — `faqs` `entries.fields` (Mixed) ke
andar hai.

---

## D-60 · Hotels table apne aap bharti hai — panel sirf override hai

> ⚠️ **Panel wala hissa D-61 se superseded hai** — ab wahan har jodi ki row nahi, ek blank
> row hai aur neeche sirf jodi hui rows. Table ka derive hona waisa hi hai.

**Supersedes:** D-58 ka "client hotel chunta hai" wala hissa

**Context:** D-58 me rows itinerary se banne lagi thin, par **hotel chunna** ab bhi admin ka
kaam tha: na chuno to us jagah ki row public table me aati hi nahi thi. Client ne wahi pakda
— unka matlab tha ki table **public side pe destination ke hisaab se apne aap** bhare, aur
panel sirf tab kaam aaye jab kisi ek package pe koi doosra hotel chahiye ho.

**Decision:** hotel ab **derive** hota hai, chuna nahi jaata.

```
row       =  itinerary ka overnight stay  ×  wo category jiska daam bhara hai
hotel     =  package ka override   ya   master list me us jodi ka hotel
```

`fields.hotels[]` ka shape wahi hai, par uska **matlab badal gaya**: wo ab chunav nahi,
**override** hai. Khaali `hotels[]` ka matlab "kuch nahi dikhega" nahi, "sab apne aap" hai.

### Kyun — teesra khaana bhi pehle se maloom tha

D-58 me destination aur category ke liye yahi tark laga tha: dono package me pehle se likhe
the. Hotel bhi wahi cheez nikla — **Hotels master list keh chuki hai ki Port Blair ke
Standard me kaunsa hotel hai.** Use har package pe dobara chunwana teesri baar wahi galti
thi.

Iska asli faayda ginti me dikhta hai: teen destination × chaar category = **bara** dropdown
har package pe, aur 60 packages pe 720 baar wahi jawab. Ab wo zero hai — jab tak kisi ek
package pe sach me kuch alag na ho.

### Ek jodi pe do hotel — naam ke kram me pehla

Master list me ek destination × category pe do hotel ho sakte hain. Page **naam ke kram me
pehla** dikhata hai (query `sort({ name: 1 })` pe hai).

Koi bhi rule chahiye tha; ye kam se kam **sthir** hai — list me naya hotel jodne se doosre
packages ka page nahi badalta, jab tak wo naam me aage na aaye. Aur theek yahi wo jagah hai
jahan override sach me kaam aata hai.

### Panel me "Auto" ka label — ye zaroori hissa hai, sajawat nahi

Har dropdown ka pehla option `Auto — City Hotel` hai: khaali chhodne pe **kya jaayega**, wo
naam ke saath likha hota hai.

Bina uske panel jhooth bolta: dropdown "Not set" dikhata aur client maan leta ki page pe kuch
nahi jaayega — to wo har row pe bewajah hotel chunta, aur override ka poora faayda khatam ho
jaata.

Wo label admin me **dobara** wahi tark chalata hai jo server pe hai (naam ke kram me pehla).
Do jagah ek hi tark rakhna aam taur pe galat hai — yahan jaan-boojh kar hai, kyunki admin
wala sirf **label** hai, sach nahi. Sach server pe banta hai. Label galat ho jaane ka nateeja
confusion hai; label na hone ka nateeja isse bura hai.

### Chhanni ab teen shart pe

Public projection me row tabhi banti hai jab teenon sach hon:

1. wo jagah itinerary me hai (`Nights > 0`, D-58)
2. us category ka daam bhara hua hai (D-57 §1)
3. us jodi ka koi hotel maujood hai — override ya master list se

Teesri shart wahi invariant hai jo D-42 §2 ne media pe lagaya tha: adhoori row bhejne ka
matlab public table me ek khaali cell hota, aur wo customer ko dikhta hai.

**Nateeja:** 565 tests (3 naye — table bina kuch chune bhar jaati hai, override auto ko hata
deta hai, aur bina daam wali category ki table banti hi nahi). Schema **nahi badla**.

---

## D-61 · Add-ons global ho gaye, aur Hotels panel sirf jodne ke liye rah gaya

> ⚠️ **§1 (add-ons global) D-64 §4 se superseded hai** — wo usi din wapas package ke chunav
> pe aa gaye. §2 (Hotels panel ka blank row) waisa hi hai.

**Supersedes:** spec 007 §1.4 ka "add-ons chune jaate hain" wala hissa · D-60 ka panel wala
hissa

**Context:** Client ne 27 Aug ko package editor khol kar dekha. Hotels panel me bara rows
thin (teen destination × chaar category), aur unme se lagbhag saari sirf wahi dohra rahi
thin jo Hotels master list me pehle se likha tha. Add-ons ka checklist bhi wahin tha.

### 1. Add-ons ab **poori list** chhapti hai — package chunta nahi

Spec §1.4 me iska ulta likha tha, aur wajah bhi likhi thi:

> ⚠️ Add-ons har package pe CHUNE jaate hain, poori list nahi chhapti. […] jo package
> Havelock jaata hi nahi, uspe "Elephant Beach snorkelling" dikhana galat hai.

**Client ne wo palat diya.** Ab har package pe poori Add Ons list chhapti hai, aur package
editor me uska koi panel nahi hai.

**Ye baat likhi ja rahi hai kyunki uska nateeja aage dikhega:** jis package me Havelock hai
hi nahi, uspe bhi Havelock wale add-ons dikhenge. Jis din ye khatakega, jawab yahan likha
hai — wo ek naya bug nahi hoga, ye faisla hoga.

`fields.addOns`, uska guard, `packageAddOnsSchema` aur `useAddOnList` — chaaron hata diye
gaye. Ek field jiska koi user na ho wo sirf sadta hai (wahi tark jo `tags` field type pe
laga tha, D-55).

**Add-ons ab `packageDefaults` ke payload me jaate hain, entry ke nahi.** Ye maine tay
kiya, aur wajah cache hai: ab ye har package pe **wahi** hain, to inka cache tag bhi wahi
hona chahiye (`type:package`). Entry ke payload me rakhne ka matlab hota ki ek naya add-on
jodne pe har package ka `entry:{id}` alag-alag saaf karna pade — aur jo chhoot jaaye wo
stale baitha rahe. Yahi tark `whatsIncluded` aur `bookingSteps` pe pehle se laga hua hai
(§1.8).

### 2. Hotels panel me ab **ek hi blank row** hai

D-60 me panel har jodi ki row dikhata tha, `Auto — <hotel>` label ke saath. Client ne wo
poori list hata di.

```
Hotels
The site picks each hotel from the Hotels list on its own.
Add a row here only if this package needs a different property somewhere.

[Destination ▾]  [Category ▾]  [Hotel ▾]     [＋ Add hotel]

Destination │ Category │ Hotel              │
Havelock    │ Deluxe   │ Sea Palms Resort   │ ✕      ← sirf jodi hui rows
```

Neeche wali list me **sirf wo rows hain jo client ne khud jodi hain** — auto wali kabhi
nahi. Wo list isliye hai ki bina uske jodi hui row kahin dikhti hi nahi aur use hatane ka
koi raasta hi na bachta.

**Jodi hui row us jodi ke auto wale ko hata deti hai**, uske saath nahi dikhti — ek island
ki ek category me do hotel dekh kar customer ko pata hi nahi chalta ki wo kis me ruk raha
hai. (Ye maine tay kiya; client ne is par kuch nahi kaha.)

### Jo kho gaya, aur kyun theek hai

D-60 ka `Auto — <hotel>` label admin me batata tha ki kis jagah kya jaayega. Wo ab nahi
dikhta — dekhne ke liye public page kholna padega.

Panel ka kaam **jodna** hai, preview dikhana nahi. Aur bara rows ki keemat us ek label se
kahin zyada thi: unme se lagbhag saari sirf master list dohra rahi thin.

**Nateeja:** 566 tests. Schema me `fields.addOns` gaya, baaki kuch nahi badla. Koi migration
nahi — purane documents me agar `addOns` bacha hai to use ab koi padhta hi nahi.

---

## D-62 · Price line Hotels ki screen pe — aur hero se hat gayi

**Supersedes:** D-57 §3 ka "kahan rakhi jaaye" wala hissa

**Context:** D-57 §3 me `packageDefaults.priceNote` bani thi aur uska panel **What's
Included** wali screen pe rakha gaya tha — is tark pe ki dono global hain.

Client ne 27 Aug ko do baatein pakdin, dono sahi:

### 1. Panel **dono** screens pe dikh raha tha — ek asli bug

Guard `section !== 'images'` likha gaya tha, jabki screen ke sections ke naam
`whatsIncluded` aur `itineraryImages` hain. `'images'` kisi se match nahi karta, to shart
hamesha sach thi aur panel **Itinerary Images aur What's Included dono** pe aa gaya.

Ye us kism ki galti hai jo test se nahi pakdi jaati aur lint se bhi nahi — string kahin se
bhi aa sakti thi, aur galat hone pe wo **zyada** dikhati hai, kam nahi. Aankh se hi pakdi
jaati hai, aur client ne pakdi.

### 2. Setting wahin honi chahiye jahan uska asar dikhta hai

Ye line page pe **sirf ek jagah** chhapti hai — hotels ki table ke theek neeche:

```
Deluxe category — ₹29,499 per person on twin sharing, daily breakfast included.
                             └──────────── ye hissa ────────────┘
```

**Decision:** panel ab **Packages ▸ Hotels** screen pe hai (`PriceLinePanel.jsx`).

"Global hai isliye globals wali screen pe rakho" ek achha lagne wala tark tha, par usme
client ko ye yaad rakhna padta ki wo line "global" hai — jabki use bas itna pata hai ki wo
hotels ke neeche dikhti hai.

⚠️ **Data ab bhi `packageDefaults` me hi hai**, `hotels` collection me nahi — wo ek hi line
hai poori site ke liye, kisi ek hotel ki baat nahi. Sirf uski **screen** badli hai. Ye farq
maayne rakhta hai: kal koi ise hotel ke record pe le jaana chahe to ye record use rokega.

### Hero se ye line hat gayi

D-57 §3 me maine ise **do** jagah lagaya tha — hotels table ke neeche, aur hero me daam ke
neeche. Wo galat tha, aur reference dekhne se hi saaf hai ki wahan **do alag text** hain:

```
hero            per person · twin sharing                              ← chhoti
hotels ke neeche  per person on twin sharing, daily breakfast included  ← lambi
```

Aur lambi wali hero me kaam kar hi nahi sakti: `.ptitle__p` pe `white-space: nowrap` hai
(reference se), to wo poore column ko tod deti.

**Abhi hero me us daam ke neeche kuch nahi hai.** Chhoti line ke liye koi field nahi bacha —
`priceBasis` D-57 §3 me hata diya gaya tha. Ye ek **jaan-boojh kar chhoda hua gap** hai, na
ki bhoola hua: client ko wo chhoti line chahiye hogi to wo apna ek field maangegi, aur tab
ye tay hoga ki wo package ki hai ya site ki.

**Nateeja:** 566 tests. Schema me kuch nahi badla — `priceNote` wahi hai jahan tha.

---

## D-63 · Price line theme me static — admin se field hata diya

**Supersedes:** D-57 §3 · D-62

**Context:** `per person on twin sharing, daily breakfast included` wali line ka teen din me
teesra ghar badla:

```
D-57 §3   packageDefaults.priceNote bani, panel What's Included wali screen pe
D-62      panel Packages ▸ Hotels pe khiska — setting wahin jahan asar dikhta hai
D-63      field hi hat gaya — line ab theme me static hai
```

Client ne 27 Aug ko kaha: admin se hata kar static daal do.

**Decision:** `PRICE_NOTE` — ek constant `apps/web/components/package/Pricing.jsx` me.
`packageDefaults.priceNote` poori tarah hata diya gaya: schema, model, service ka whitelist
aur public projection, chaaron jagah se.

### Kyun ye sahi hai

Wo line **har package pe, har category pe bilkul wahi** rehti hai. Uske liye admin me ek
field dene ka matlab tha: ek aur screen pe ek aur panel, jise client ek baar bharega aur
phir kabhi nahi chhuega — aur tab tak har naye instance me wo **khaali** rahegi, yaani page
pe aadhi line chhapegi.

Ye wahi lakeer hai jo Q-9 me pehle se khinch chuki hai — **dhaancha static, maal admin se.**
Us list me teen cheezein pehle se thin (hero ka `per person · twin sharing`, catbar ka
vaakya, aur `CATEGORY_COPY`); ye chauthi hai.

### Jo cheez sach me bharni padti hai wo derive hi rehti hai

Patti ka pehla aadha ab bhi derived hai — `Deluxe` chuna hua tab hai aur `₹29,499` uska
apna daam. Sirf poonchh static hui.

### Ek chhoti keemat, aur wo Q-9 me pehle se likhi hai

Ye line English me theme ke code me baithi hai. Jis din koi client `daily breakfast` ki
jagah kuch aur kehna chahega, wo **code change** hoga, admin ka kaam nahi. Q-9 usi sawaal
ka ghar hai — wahan ye chauthi line bhi jud chuki hai.

### Test badal gaya

D-62 ke saath ek **round-trip** test likha gaya tha (PATCH → GET → public payload), kyunki
us waqt field save hi nahi ho raha tha. Ab wo bemaani hai; uski jagah ek guard hai: wo key
public payload me **dobara na aa jaaye**. Warna theme ki static line aur payload ki line do
alag source ban jaate, aur ek din wo alag ho jaate.

**Nateeja:** 567 tests. Migration nahi — field kabhi kisi asli document me tha hi nahi
(mongoose use `$unset` ki zaroorat ke bina chhod deta hai, aur use ab koi padhta nahi).

---

## D-64 · Editor ki safai — do field hate, ek wapas aaya, aur do aadatein judin

**Supersedes:** D-51 §3 (per-day `hotelCategory`) · D-61 (add-ons global)

**Context:** Client ne editor aur page dono chala kar dekha aur ek saath saat baatein kahin.
Chhe UI ki hain, ek asli bug tha. Sab ek hi din ke hain, isliye ek record.

### 1. Transfer duration page pe aati hi nahi thi — bug

Chip ki shart `day.transfer && …` thi, yaani transfer **na chuna ho** to poori chip gir
jaati thi — aur uske saath client ka likha hua `90 min` bhi.

Data me wo teen din maujood the:

```
Day 2 | transferId: —  | transferNote: "90 min"
Day 4 | transferId: —  | transferNote: "40 min"
Day 5 | transferId: —  | transferNote: "2 hrs"
```

Ye chup tha: admin me text bhara hua dikhta tha, page pe kuch nahi. Ab duration akeli ho to
bhi chip banti hai — **ghadi ke icon ke saath**, gaadi ke nahi: bina transfer ke gaadi ka
icon ek aisi baat keh deta hai jo likhi hi nahi gayi.

### 2. Per-day `hotelCategory` hata

D-51 §3 me ye client ke hi kehne pe aaya tha ("ek hi package me kuch raatein alag darje ke
hotel me ho sakti hain"). Live dekhne ke baad unhe wo column bemaani laga, aur wo sahi hai:
pricing package-level pe hai (§4) aur hotels ki table usi se banti hai, to din pe ek aur
category chunne ka jawab **page pe kahin dikhta hi nahi tha**.

Migration nahi lagi — wo ek chunav tha, likha hua text nahi. Mongo me bacha hua field muft
hai aur ab use koi padhta nahi.

### 3. `highlights[]` description me mil gayi — **migration 014**

Din ke card pe do field the: `description` (paragraph) aur `highlights[]` (bullets). Client
ne kaha alag row nahi chahiye, list description me likh denge.

**Niyam ek hi hai: `-` se shuru hone wali line bullet, baaki paragraph.**

> ⚠️ Client ne kaha tha "har nayi line alag bullet". Wo poora nahi kiya gaya, aur wajah data
> me thi: unke har din ka `description` ek **asli paragraph** hai. Har line ko bullet banane
> ka matlab hota ki wo paragraph bhi bullet ban jaaye aur design ka shape hi toot jaaye.
> Sirf bullets likhne pe sirf bullets aate hain — yaani client ki baat bhi poori hoti hai.

Ye markdown **nahi** hai aur na banega: poora markdown lagane ka matlab hota ek parser, uski
sanitisation, aur wo saara sawaal jo rich text pe pehle hi tay ho chuka hai (D-46 §3).

**Migration isliye zaroori thi ki text kho na jaaye** — bina uske client ka likha har
highlight page se chup-chaap gayab ho jaata. `down()` bhi hai, par wo poori tarah ulta nahi
hai aur wo file me likha hua hai: migration ke **baad** likhe gaye bullets bhi wapas
`highlights` ban jaayenge, kyunki dono ek jaise dikhte hain.

### 4. Add-ons wapas package ka chunav — D-61 ka palat

D-61 me client ne add-ons **global** kar diye the (poori list har package pe). Usi din unhone
wapas maanga: sidebar me checklist, Destinations ki tarah.

Aaj ka niyam wahi hai jo spec §1.4 me shuru se likha tha — package chunta hai, poori list
nahi chhapti. `fields.addOns`, uska guard, `packageAddOnsSchema` aur `useAddOnList` chaaron
wapas aa gaye, aur payload `packageDefaults` se wapas **entry** pe chala gaya (ab wo har
package ka apna chunav hai, to cache tag bhi usi entry ka).

> Ye field do baar ja chuka hai aur do baar wapas aaya hai. Wo apne aap me ek jaankari hai:
> jab client ise teesri baar chhuye, pehle ye record padha jaaye.

### 5. Har remove pe ek pooch — `lib/confirm.js`

Itinerary ka din, FAQ, hotels ki override row, master list ka delete, aur image remove — sab
pe. Message me **kya** ja raha hai wo likha aata hai (`Remove Day 3?`); "Remove this?" padh
kar user ko ye pata hi nahi chalta ki uska cursor kis row pe tha.

`window.confirm` hi rakha, apna modal nahi — repo me ye pattern pehle se hai (`Menus.jsx`,
`MegaBuilder.jsx`), aur teesra tareeka banane ka matlab hota ek hi kaam do shakl me.

### 6. Panels ka kram client badal sakta hai — `SortablePanels`

Main column ke paanch panel: Info · Itinerary · Pricing · Hotels · FAQs. Grip panel ke apne
head me hai.

**Kram `localStorage` me hai, DB me nahi.** Ye ek user ki pasand hai, site ki setting nahi —
DB me rakhne ka matlab hota ki ek editor apna kram badle aur baaki sabka badal jaaye. Yahi
tark `Panel` ke collapse state pe pehle se laga hua hai.

**Sidebar jaan-boojh kar chhoda** — usme Publish sabse upar hai aur Save usi ke andar. Use
neeche khiska dena "Save kahan gaya" wala sawaal banata hai.

⚠️ **Ek trade-off jo likha hona chahiye:** dikhne ka kram CSS `order` se aata hai, DOM ka
kram nahi badalta. Keyboard aur screen reader DOM padhte hain, isliye tab karte hue panels
apne **asli** kram me aayenge. Isiliye grip pe keyboard se bhi reorder hota hai (↑/↓).

### 7. Do chhoti cheezein jo isi din nikleen

**Panel ki heading beech me chali gayi thi.** `.panel-head` pe `justify-content:
space-between` hai aur wo bachchon ki **ginti** pe nirbhar tha: do pe theek (h2 baayein,
toggle daayein), teen pe (grip juda) h2 beech me. Fix `.panel-head h2 { margin-right: auto }`
hai — auto margin `justify-content` se pehle jagah leta hai, isliye ab head me do cheezein
hon ya chaar, heading baayein hi rehti hai.

**All Packages me image kabhi wire hi nahi thi.** Cell me ek **khaali `<span class="thumb">`**
tha — sirf gradient placeholder. Ab har row ka `bannerImage` resolve hota hai; media na mile
to wahi placeholder wapas aata hai, toota hua `<img>` kabhi nahi (D-42 §2). Ids sirf **is
page** ki rows se aati hain — `useMediaById` har id pe ek call karta hai, aur bina pagination
ke ye 500 calls ban jaata.

**Nateeja:** 568 tests. Migration **014** (highlights → description). Baaki koi migration
nahi.

---

## D-65

**Package page ke section headings aur unki lines ab admin se aati hain — Q-9 band**
_31 Aug 2026 · client ka faisla_

### Sawaal

`09-OPEN-ITEMS.md` ka **Q-9** aaj tak khula tha: page ke 7 heading aur unke neeche ki
lines theme me hardcoded thin (`PackagePage.jsx` + `Pricing.jsx`). Client **ek shabd bhi**
admin se nahi badal sakta tha — `Popular add-ons` ko `Optional extras` karna ek code change
tha, aur wo change us client ke instance me hi reh jaata. Ye is framework ke buniyaadi vaade
se takraata hai: har client ka apna instance, par core code sab me same.

Q-9 me teen raaste likhe the. Mashwara **#3** tha ("jab zaroorat pade tab"). Client ne
**#2** chuna — sab ek saath, ek screen pe.

### Faisla

**`packageDefaults.sectionLabels`** — 7 section, har ek pe `{ heading, description }`.
Admin me naya screen: **Packages ▸ Section Headings**.

**`packageDefaults` me, package pe nahi.** Ye har package pe **bilkul same** chhapte hain.
Per-package rakhne ka matlab hota 14 naye field har editor me — theek wahi galti jo D-57 aur
D-58 me pakdi gayi thi (jo cheez har package pe same hai, wo package ka data nahi).

**Har section ko heading _aur_ description dono** — chahe aaj us section ke neeche koi line
ho ya na ho. Aaj 7 me se sirf 3 pe line hai (itinerary · hotels · add-ons); baaki 4 pe field
khaali hai. Client ke shabd: _"abhi nahi hai to kya hua, aage text bhi daal sakte hai."_

### Khaali ke do alag matlab — ye is faisle ka asli hissa hai

| Stored            | Page pe                                          |
| ----------------- | ------------------------------------------------ |
| key hai hi nahi   | theme ka heading **aur** theme ki line           |
| `heading: ''`     | theme ka heading — section bina title ke na rahe |
| `description: ''` | **kuch nahi** — line hat jaati hai               |

Line ka hat-na zaroori tha. Hotels wali line me likha hai _"and on the enquiry form"_ — aur
wo form abhi bana hi nahi (Q-2). Pehle uske liye code me comment tha: _"Client kahe to
aakhri teen shabd hata dena ek line ka kaam hai."_ Ab wo client ka apna kaam hai.

"Key hai hi nahi" wala case **naye instance** ke liye hai: jab tak koi screen kholta nahi,
page bilkul waisa hi chalta hai jaisa pehle. Aur admin ka form defaults se **bhara hua**
khulta hai (placeholder se nahi) — placeholder rakhne pe client kisi line ko hata hi nahi
sakta tha, kyunki box khaali karte hi placeholder theme ka text wapas dikha deta.

### Default ek hi jagah hai

`packages/shared/src/constants/package-sections.js` — `PACKAGE_SECTIONS`.

Wahi list **teen** kaam karti hai: theme ka fallback, admin ka pre-fill, aur Zod ki shape.
Alag rakhne pe wo ek din alag ho jaate — admin kuch dikhata, page kuch chhapta, aur kisi ko
pata nahi chalta. Yahi sabak D-43 §2 me `allowedColumnCounts` pe mila tha.

Naya section jodna ab **ek file** ka kaam hai: list me entry daalo, schema aur admin apne
aap saath aa jaate hain.

### Resolve server pe hota hai, theme me nahi

`toSectionLabels()` public projection me hai. Theme me karne ka matlab hota saat jagah
`labels.x?.heading || 'About this itinerary'` likhna — aur wahi wo shakl hai jisme ek din
ek jagah ka default baaki se alag ho jaata hai. Public projection pehle se yahi kaam karti
hai (media → `null`, `href` → resolved).

### Migration nahi lagi

Day-1 reserve test ke teenon jawab "nahi" — na koi query/index chhoota hai, na uniqueness
badalta hai, na backfill mehnga hai. Khaali `{}` ka matlab hi "theme ke apne headings" hai,
to purane documents pe aaj bhi wahi chhapega jo kal chhapta tha.

### `.strict()` — test ne pehli hi baar pakda

`sectionLabels` pe `.strict()` **zaroori** tha. Zod default me anjaan keys chup-chaap **hata
deta hai**, to `{ notASection: {...} }` bhejne pe API **200** deti, key gayab ho jaati, aur
admin ko "ho gaya" dikhta. Theek wahi bug jo D-43 §3 me `leafItemSchema` pe mila tha.

### Saath me ek chup bug bhi theek hua — `cancellationText`

`PackagePage.jsx` **do jagah** `defaults.cancellationText` padhta hai — "Good to know"
section ki shart me, aur uske andar ki `<p>` me. Par `getPublicPackageDefaults()` use payload
me bhejti hi nahi thi.

Nateeja: client jo cancellation policy admin me likhta tha wo page pe **kabhi nahi** aati
thi, aur "Good to know" section sirf tab dikhta tha jab booking steps bhi bhare hon. Kahin
koi error nahi.

Bilkul wahi shakl jo **D-64** wale transfer-duration bug ki thi: admin me text bhara hua
dikhta hai, page pe kuch nahi. Ye is codebase ka apna failure mode hai — **payload me field
add karna bhool jaana**, aur dono taraf ka code sahi dikhna.

### Jo jaan-boojh kar NAHI liya

Page ki chhoti inline lines — `or similar`, `per person · twin sharing`, `PRICE_NOTE`,
catbar wali line, aur hotel tabs ke naam (`Base` · `Sea-facing` · `Beachfront` · `Villas`).
Wo **section ke heading nahi** hain, aur unhe abhi field banana wahi galti hoti jo D-57/D-58
me pakdi gayi thi.

⚠️ Tab wale naam sabse tez kaanta hain — wo **Andaman-specific** hain aur har client ke
instance me wahi rehte hain. Uska record Q-9 me hai aur wo khula rahega.

**Nateeja:** 574 tests (6 naye). Koi migration nahi.

### Amendment — 31 Aug, usi din

**1. Overview pe description ka box nahi hai** (client). Client ne poochha ki "About this
itinerary" ka content to Edit Package ▸ Overview se aata hai na — haan, wahi (`entry.content`,
per-package). Us section ko ek aur description dene ka matlab hota heading aur us rich text
ke **beech** me ek **global** line, jo har package pe wahi rehti. Do intro ek doosre ke upar.

Ab `package-sections.js` me us entry pe `hasDescription: false` hai. Uska asar teen jagah:

- **Zod** — overview ka shape sirf `{ heading }` hai, `.strict()` ke saath. `description`
  bhejne pe **400** aata hai, chup-chaap girta nahi
- **Admin** — textarea ki jagah ek line ka hint: _"The text under this heading comes from
  each package's own Overview."_
- **Payload** — overview pe `description` ki key **aati hi nahi**

Flag ka default **haan** hai (`hasDescription !== false`) — naya section jodne wale ko wahi
milta hai jo aam hai, aur apwaad likh kar batana padta hai.

**2. Fallback ab ek hi jagah — `resolveSectionLabels()` `packages/shared` me.**

Pehli shakl me resolve sirf public projection me tha, aur admin apni **alag copy** rakhta
tha. Wo galat tha, aur usne turant ek asli galti bhi banayi:

Admin ka endpoint **raw stored** bhejta tha. Ek baar `sectionLabels` save ho jaane ke baad
uski har key `{heading, description: ''}` hoti hai — aur admin ka pre-fill
`stored?.description ?? default` likhta tha. `??` `''` pe fallback **nahi** karta (aur
theek yahi chahiye tha), to form khaali descriptions dikhata, client Save dabata, aur saari
lines **chup-chaap mit jaati**. Dev DB pe theek yahi hua.

Ab dono taraf — public projection **aur** admin ka `toApi()` — wahi ek function bulate hain.
Admin ko wahi text milta hai jo page pe chhap raha hai, aur uske paas fallback ki koi logic
bachi hi nahi. **Do jagah likhi hui shart ek din alag ho jaati hai** — yahi D-43 §2 ka sabak
tha, aur is baar wo alag hone me kuch ghante lage.

⚠️ Iske saath ek naya test bhi hai: **admin ka padha hua payload bina badle wapas save ho
jaana chahiye**. Admin Save pe poora object bhejta hai, to payload me koi bhi aisi key jo
schema na le, Save ko 400 pe maar deti — aur wo failure sirf asli admin chalane pe dikhti,
test me kabhi nahi. (Pehle draft me `overview.description: ''` bheji ja rahi thi aur theek
yahi hota.)

**Nateeja:** 578 tests (10 naye). Koi migration nahi.

**3. Hotels ke box pe ek hint** (client ne page pe duplicate text dekha, usi din).

Page pe Hotels ki line ke **neeche** ek aur paragraph dikhta hai — chuni hui category ka
apna text (`CATEGORY_COPY`, `Pricing.jsx`). Wo tabs ke **baad** aata hai aur tab badalne pe
**badal jaata hai**.

Client ne page dekh kar dono paragraph description box me paste kar diye. Nateeja: wo text
page pe **do baar** chhapne laga — ek baar box se, ek baar widget se. Aur tab badalne pe
upar wala "base category" hi likha rehta jabki neeche "sea-facing" aa jaata.

Box ko dekh kar ye pata hi nahi chalta ki neeche wala paragraph kiska hai. Ab section pe
ek optional `hint` field hai aur Hotels pe wo likha hua hai. **Data ki galti thi, code ki
nahi** — par galti karna aasan tha, aur wahi UI ka kaam hai.

⚠️ `CATEGORY_COPY` khud abhi bhi **static** hai (Q-9 ka bacha hua hissa) — aur wo
Andaman-specific hai, isliye Q-9 me wahi sabse tez kaanta likha hai.

**4. Hotels table me theme ka `or similar` hata diya gaya** (client, usi din).

Table ka hotel cell aise chhapta tha: `{hotel.name} <em>or similar</em>` — `or similar`
design ka apna text tha (R15). Par Hotels master list me client ne **aathon** hotel ke naam
me khud "(or similar)" likha hua tha, to page pe wo **do baar** aata:

```
Garden resort, 5 min from Govind Nagar beach (or similar) or similar
```

Do raaste the — naam se hata do (8 record badalte), ya theme se. Client ne theme chuna:
_"jo name hoga wahi dikhega, apne side se add mat karo."_

Ye design se **vichlan** hai, isliye yahan likha ja raha hai (R15 — vichlan client se aaya,
developer se nahi). ⚠️ Iska matlab ye bhi hai ki jis hotel ke naam me "or similar" na likha
ho, uspe page pe kuch nahi aayega — wo ab **content ka faisla** hai, code ka nahi.

**Ye is poore din ka niyam ban gaya:** admin ka text jaisa likha hai **waisa** chhape, theme
uspe apni taraf se kuch na jode. Yahi baat teen jagah alag-alag roop me nikli — section ki
description (paste kiya hua duplicate), hotels table ka `or similar`, aur Overview ka
description box jo hata diya gaya.

---

## D-66

**Hero ki image pe click → popup, ek waqt pe ek image, 4 second pe apne aap agli**
_31 Aug 2026 · client ka faisla_

### Faisla

Hero ke mosaic ka koi bhi tile dabane pe ek popup khulta hai. Usme **saari** images aati
hain — banner aur poora `itineraryImages` pool, sirf wo paanch nahi jo mosaic me dikh rahi
thin — aur **ek waqt pe ek** image dikhti hai, 4 second baad agli.

Hero ka mosaic **waisa hi hai** — refresh pe shuffle hota hai (D-52), par page pe apne aap
slide nahi hota. Client ne sirf popup ki baat ki thi.

### ⚠️ Ye design me hai hi nahi — R15 ka vichlan

`itinerary-v3.html` me `lightbox`, `modal`, `popup`, `dialog` — chaaron me se ek bhi **0
baar** aata hai. Pehle tile ek `<a href={image.url}>` tha, yaani click seedha image file
khol deta tha.

Vichlan **client se aaya hai, developer se nahi** — R15 isi ke liye hai. Yahan likha ja
raha hai taaki koi baad me "design se match karo" ke naam pe ise hata na de.

### Teen cheezein jo shakl tay karti hain

**1. Tile ab `<button>` hai, `<a>` nahi.** Keyboard se pahunchna, Enter/Space, aur screen
reader ka "button" bolna — teenon `<button>` me apne aap milte hain. `<div onClick>` pe wo
teenon haath se banane padte, aur aksar ek chhoot jaata hai.

**2. Click ka index `all` me dhoondha jaata hai, `tiles` me nahi.** `tiles` shuffle ho chuki
paanch hain aur popup **saari** images dikhata hai — tile ka index seedha bhejne pe click
ek image pe hota aur popup kisi aur pe khulta.

**3. Hover-pause sirf image pe hai, backdrop pe nahi.** Ye pehle draft me galat tha aur
build ke dauraan pakda gaya: backdrop poori screen ghera hai, to uspe `onMouseEnter` lagane
ka matlab tha ki desktop pe cursor kahin bhi ho, popup hamesha "paused" rehta — yaani
auto-slide **kabhi chalti hi nahi**. Bilkul chup failure: koi error nahi, bas feature gayab.

### Auto-slide ke teen niyam

| Niyam | Kyun |
| --- | --- |
| Image pe hover karne se rukti hai | Jo image dekhne ke liye user ruka hai, wahi uske haath ke neeche se khisak jaana sabse chidhane wali cheez hai |
| Haath se aage badhne pe timer **dobara** shuru hota hai | Warna user next dabata hai aur 200ms baad slide khud aage badh jaati hai — do image ek saath nikal jaati hain |
| `prefers-reduced-motion` pe chalti hi nahi | Apne aap badalta content us setting ka seedha nishana hai. Arrows tab bhi kaam karte hain |

### Aur kya mila

Esc se band · ← → se aage-peeche · backdrop pe click se band (image pe nahi — warna image
dabate hi popup band ho jaata) · mobile pe swipe (40px se kam ko swipe nahi maana jaata, wo
tap ka haath hilna hota hai) · `1 / 12` counter · popup khulte hi background ka scroll band ·
band hone pe focus **wapas usi tile pe** jaata hai jispe click hua tha.

Koi library nahi li — swipe do touch point ka farak hai, aur baaki sab CSS.

### Kya verify hua

SSR: tiles `<button>` ban kar aa rahe hain, page 200 deta hai, lint/format/578 tests green.

**Asli interaction client ne khud chala kar confirm kiya** (31 Aug) — popup khulta hai aur
slide theek chalti hai.

⚠️ Ye is repo me automated nahi hai: koi browser automation maujood nahi (Playwright aur
Puppeteer dono nahi), aur R3 ke chalte sirf iske liye nayi dependency lena theek nahi laga.
Yaani lightbox ka behaviour **kisi test se bandha hua nahi hai** — aage koi ise tode to
suite chup rahegi. Jis din `apps/web` pe component tests aayein, hover-pause wala case
(neeche §3) pehla candidate hai, kyunki wo bug aankh se bhi nahi dikhta tha — sirf "slide
nahi chal rahi" jaisa lagta.

---

## D-67

**Page ka aakhri CTA card — `settings` me, poori tarah static**
_31 Aug 2026 · client ka faisla_

### Sawaal

Design ka aakhri section (`itinerary-v3.html:2102`, `.offer`) — badge + heading + 3 bullets
+ daayein ek box + do button. Ye un **chaar sections** me se ek tha jo bane hi nahi the
(`09-OPEN-ITEMS`), aur wo **Q-2 (Enquiries) pe atka** tha: uska button `#enquiry` pe jaata
hai aur wo form abhi bana hi nahi.

### Faisla

Client ne atkav khol diya: _"button to form par hi jata hai par abhi bana nahi hai to abhi
fields bana do jisse bad me bhej sake aur ye section rahega poora."_

Yaani **section poora ab banega**, aur button ka target ek **field** hai. Jis din form bane,
sirf ek value bharni hai — koi code change nahi. Ye D-30 ka hi precedent: _connection point
abhi, data baad me._

### `settings` me, `packageDefaults` me nahi

Client: _"dusre pages par bhi use hoga."_

Ye D-46 ka **palan** hai, apwaad nahi. Wahan likha tha ki package ke domain ka maal
`packageDefaults` me jaaye taaki `settings` kachra-peti na bane — par usi tark ka doosra
hissa ye hai ki **jo cheez sirf package ki nahi hai wo `settings` me hi rehni chahiye**.

⚠️ Iska ek nateeja: package page ka text ab **do jagah** hai — headings
`Packages ▸ Section Headings` me (D-65), aur ye card `Settings ▸ CTA Section` me. Ye
qeemat jaan-boojh kar di gayi hai, kyunki card package ka hai hi nahi.

### ⚠️ Poori tarah static — kuch bhi derive nahi hota

Client: _"only static section hoga koi value automaticaly update nahi hogi"_ aur
_"design same rahega jaisa hai price kahin se derive nahi hoga."_

Design me box ka daam aur category **derive** hote the — `js-px` aur `js-cat-name`, wahi
elements jo catbar ke saath badalte hain. Ab wo do saade text field hain (`boxTitle`,
`boxNote`). Design ka **look bilkul waisa hi** hai; sirf source badla.

⚠️ **Iska matlab hai ek hi text har page pe** — ₹24,999 wale package pe bhi aur ₹45,000
wale pe bhi. Isiliye admin screen pe box ke upar ek chetavni likhi hui hai: _"This box shows
the same text on every page — avoid writing an exact price here."_ Ye baat field dekh kar
pata nahi chalti, aur galti chup-chaap live chali jaati.

### Khaali ka matlab har jagah tay hai

| Khaali | Nateeja |
| --- | --- |
| `enabled: false` | poora section render hi nahi hota (payload me `null`) |
| `badge` | upar ka chip nahi aata |
| `bullets` | `<ul>` banti hi nahi |
| `boxTitle` | **poora box** gayab, buttons apne row me chale jaate hain |
| button ka `url` | wo button payload me hi nahi jaata |

Aakhri row hi wo cheez hai jo "form abhi bana nahi" ko khud-ba-khud sambhal leti hai
(D-30: khaali cheez khaali dikhe, tooti hui nahi).

### Filter server pe hai, theme me nahi

`enabled: false` wale aur adhoore (label ya URL bina) button public payload me **jaate hi
nahi**, aur `enabled` khud bahar nahi jaata — theme ko sirf wahi milta hai jo dikhna hai.
Bilkul wahi shakl jo `headerButtons` pe hai (D-43).

Adhoora button rokna zaroori tha kyunki schema use block nahi karta: admin label type kar
ke URL khaali chhod kar Save kar sakta hai, aur wo ek toota hua link ban jaata.

### Do chhoti cheezein

**Buttons `.btn` hi hain, `variant` ke saath** — R18 ka palan: look structured field se aata
hai, className se nahi. Reference me iske liye alag `.b-o`/`.b-g`/`.b-w` classes thin; hamare
paas variants pehle se the, to sirf `width: 100%` box ke andar se aayi.

**`.sec.sec--white` nahi banayi.** Reference me card us wrapper me baithta hai, par hamare
theme me `.sec` hai hi nahi — page ke baaki sections seedhe `.wrap` use karte hain. Ek nayi
`.sec` class ka matlab hota ek aur spacing system, jiska doosra koi user nahi.

**Nateeja:** 581 tests (3 naye). Koi migration nahi — khaali `{}` ka matlab "section off"
hai, aur wahi default hai.

---

## D-68

**`goodToKnow[]` banaya hi nahi gaya — wo content Section Headings ke box me jaata hai**
_31 Aug 2026 · client ka faisla_

### Sawaal

Slice 6 me do cheezein bachi thin: `goodToKnow[]` aur `reviews[]` + rating. Client ne khud
poochha: _"good to know ke section ko ham heading section me dal sakte hai kya?"_

Sawaal seedha uss jagah pe ungli rakhta hai jahan spec ne ek baat **maan** li thi.

### Spec ne kya maana tha

spec 007 §2.1 ka tark: "Good to know before you book" me do kism ka content mila hua hai —

```
h3  The ferries decide this itinerary      ← IS package ke baare me
h3  What the days actually feel like       ← IS package ke baare me
h3  Booking & cancellation                 ← har package pe same
```

…aur isliye pehle do ke liye per-package `goodToKnow[]` chahiye, kyunki _"har itinerary ki
ferry wali majboori alag hoti hai"_.

### Client se poochhne pe jawab: **"same rahega"**

Unka good-to-know content har package pe ek jaisa hai. Yaani wo **per-package data hai hi
nahi**, aur spec ki wo maani hui baat galat thi.

### Faisla

`goodToKnow[]` **banega hi nahi**. Wo content
`packageDefaults.sectionLabels.booking.description` me jaata hai — wo box **D-65 me pehle se
ban chuka hai** aur page pe theek wahin chhapta hai jahan ye hissa hona chahiye: heading ke
neeche, booking steps se upar.

```
Good to know before you book        ← sectionLabels.booking.heading
<good-to-know ka content>           ← sectionLabels.booking.description  ← yahan
1. Tell us your dates…              ← packageDefaults.bookingSteps
Cancellations more than 30 days…    ← packageDefaults.cancellationText
```

Sirf ek badlaav laga: description ka cap **1000 → 3000 chars** (`cancellationText` pehle se
5000 pe hai — usi shreni ka content hai).

**Kya bach gaya:** ek repeatable field, ek admin panel, uske tests, aur theme me use
render karne ka code. Wahi galti thi jo D-57/D-58 me pakdi gayi — _jo cheez pehle se hai,
use dobara mat poochho._

### ⚠️ Ek cheez us box me nahi ho sakti — sub-headings

Wo **plain text** block hai (XSS ka wahi tark jo FAQs aur footer text blocks pe hai —
D-59, D-44 §8), aur page pe ek `<p>` banta hai jisme line breaks `pre-line` se zinda rehte
hain. Design ke `h3` us box se **nahi** banenge.

Jis din client ko wo `h3` chahiye, ye faisla dobara khulega — aur tab tak koi bekaar field
DB me nahi padi hai. Ulta case (field bana kar hatana) D-54 me ho chuka hai aur usme
migration likhni padi thi.

### Iska asar Slice 6 pe

Slice 6 me ab **sirf `reviews[]` + rating** bacha hai, aur wo `spec 007 §9 #8` pe ruka hai
(rating haath se ya `reviews[]` se gini jaaye).

**Nateeja:** koi naya code nahi, koi migration nahi. Sirf ek cap badla aur spec/docs sync.

### Amendment — 31 Aug, usi din: section ka guard description ko ginta hi nahi tha

Client ne D-68 wale box me text daala aur **page pe kuch nahi aaya**.

Data theek save hua tha (`sectionLabels.booking.description: "test"`). Bug guard me tha:

```jsx
{(steps.length > 0 || defaults?.cancellationText) && (   // ← description hai hi nahi
  <section id="booking">
    <SectionHead label={labels.booking} />
```

Client ke paas booking steps 0 the aur cancellation text khaali — to poora section gir
gaya, unki likhi line samet.

**Yahi kami chhe jagah thi**, sirf `booking` pe nahi: `itinerary`, `included`, `faq`
(`PackagePage.jsx`), aur `hotels` · `addOns` (`Pricing.jsx`). Sab jagah guard **sirf section
ke apne data** ko dekhta tha. D-68 se pehle ye kami dikhti nahi thi kyunki description ek
**intro line** thi, section ki wajah nahi. D-68 ne use section ka asli content bana diya.

Ab har guard me `wrote(key)` hai — "client ne is section me kuch likha hai?".

⚠️ `HotelsSection` me do alag return hain, ek shart nahi: neeche `active` `tabs[0]` se
banta hai aur khaali `tabs` pe wo `undefined` ho kar `active.category` pe **crash** karta.

### Ye is codebase ka pehchana hua failure mode hai — teesri baar

| Kab | Kya |
| --- | --- |
| **D-64** | `day.transfer &&` — transfer na chuna ho to akeli likhi duration bhi gir jaati thi |
| **D-65** | `cancellationText` public payload me ja hi nahi raha tha |
| **D-68 (yahan)** | section ka guard description ko ginta hi nahi tha |

Teenon baar lakshan bilkul ek: **admin me text bhara hua dikhta hai, page pe kuch nahi, aur
kahin koi error nahi.** Teenon baar client ne pakda, kisi test ne nahi.

**Wajah bhi ek hi hai:** koi naya field jodte waqt uske **saare consumer** nahi dekhe jaate
— payload, guard, aur render teen alag jagah hain, aur teenon me se ek chhoot jaana kaafi
hai. Naya field jodo to teenon check karo.

⚠️ **Iska koi test nahi hai.** `apps/web` pe koi test layer hai hi nahi (25 test files, sab
API ke). Verify live page se hua. Jab tak theme pe tests nahi aate, ye class dobara bhi
sirf client hi pakdega.

---

## D-69

**Section ki description ab rich text hai — har section pe editor**
_1 Sep 2026 · client ka faisla (unke senior ka order)_

### Sawaal

D-68 ke baad client ne "Good to know" ka content us box me likha. Text page pe aaya, aur
phir seedhi baat aayi:

> _"if I need to style any text how I will style in textarea… why don't we replace it with
> a text editor so that I can style any text"_

Textarea me bold, heading ya list ban hi nahi sakti. Aur DB dekhne pe saaf ho gaya ki wo
sach me sub-headings likh rahe the — plain lines me:

```
The ferries decide this itinerary          ← ye ek heading hai
Private catamarans open bookings 60–90…
What the days actually feel like           ← ye bhi
```

### Client ka dobara jawab, jab maine "sirf ek section rich" ka mashwara diya

> _"agar 7 section hai to yahi rahenge? aage jake new pages add honge aur style bhi change
> hoga to sabke according banana hoga, itinerary-v3 page akela nahi hai. aur senior suggest
> to use editor for each"_

Ye sahi hai. Mera mashwara **galat tha** — maine "ek jagah rich, baaki plain" suggest kiya
tha, aur uska koi principled kaaran nahi tha, sirf ye ki aaj zaroorat ek hi jagah dikhi. Wo
asymmetry har naye developer ko seekhni padti. `CLAUDE.md` ki pehli line hi framework ka
vaada hai; sirf `itinerary-v3` ke hisaab se banana usse takraata hai.

### Faisla

`sectionLabels[*].description` — `string` se **TipTap doc**. Saaton section pe (chhe pe —
Overview pe description hai hi nahi, D-68). Editor wahi jo Overview pe hai.

`heading` **plain hi hai** — ek line ka `<h2>`, usme bold ka koi matlab nahi.

### ⚠️ Ek cheez saaf kar di gayi thi — "naye pages" is se hal NAHI hote

Client ki chinta jayaz thi, par uska jawab ye change nahi hai. `sectionLabels`
`packageDefaults` pe hai aur uski keys `PACKAGE_SECTIONS` se aati hain — wo **is theme ke
fixed sections** ke liye hai, aur naye page type pe apne aap nahi failega.

Naye pages ka jawab plan me pehle se hai — **page builder / blocks** (Phase 5,
`packages/blocks`, `content.blocks`). `sectionLabels` ko generic banane ka matlab hota
blocks ka ek **ghatiya duplicate** khada karna, aur phir dono ko nibhana.

- **Ye change** → har section ka text style ho sake ✅
- **Naye pages** → Phase 5 blocks, alag kaam ✅

### Rich text ≠ HTML — aur yahi is faisle ki buniyaad hai

Client ne poochha tha ki WordPress kya use karta hai. WP **HTML store** karta hai (Classic =
TinyMCE ka Text tab; Gutenberg = HTML + comment delimiters, Custom HTML block) aur usse
`wp_kses` + `unfiltered_html` capability se sambhalta hai.

TipTap HTML store **nahi** karta — wo nodes ka JSON ped store karta hai, aur theme us ped se
React elements banati hai (`RichTextDoc`). Kahin `dangerouslySetInnerHTML` hai hi nahi.
Isliye XSS **filter** nahi hota, wo **ban hi nahi sakta** — hum wo problem paalte hi nahi.

Keemat: aap wahi likh sakte hain jo editor ke schema me hai. **Table, iframe, custom markup
nahi.** Client (1 Sep): _"abhi to table nahi hai kisi design me but cant say future me ho,
par abhi is par focus nahi karte"_ — to wo raasta khula chhoda gaya hai, banaya nahi.

### Teen cheezein jo karte waqt nikleen

**1. Heading level.** Editor ka heading button H2 banata tha. Par description page ke `<h2>`
ke **neeche** chhapti hai — wahan aur H2 daalne se document ka outline toot jaata (screen
reader aur SEO dono uspe chalte hain). Ab `RichTextEditor` pe `headingLevel` prop hai;
sections pe **H3**, Overview pe H2. Button ka label bhi wahin se banta hai, warna wo "H2"
likhta aur H3 banata.

**2. `isEmptyDoc()` — D-65 ka poora niyam isi pe tika hai.**
String me `''` do-tuk tha. Doc me "khaali" **teen** shakl leta hai, aur teesri TipTap khud
banata hai: editor kholo aur band kar do → `{content:[{type:'paragraph'}]}`. Wo
`content.length` dekh kar "bhari hui" lagti hai, jabki page pe usse ek khaali `<p>` ke alawa
kuch nahi banta. Uska apna test hai.

**3. `RichTextDoc` alag kiya gaya.** Renderer pehle sirf `content.blocks[…].props.doc` se doc
nikaal sakta tha. Doosri jagah use karne ka ek hi raasta bachta — nakli envelope banana, jo
har call site pe ek jhooth hota.

### Migration 015

`description` strings → docs, `textToDoc()` se (wahi helper jo defaults pe chalta hai).
Idempotent: sirf **string** values chhui jaati hain.

`down()` **lossy hai aur hona hi tha** — bold, heading, list aur link plain text me hote hi
nahi. Wo sirf itna vaada karta hai ki *shabd* wapas aa jaayein.

⚠️ Migration purani lines ko **paragraph** banati hai, heading nahi — wo pata hi nahi kar
sakti ki client ne kaunsi line heading ki tarah likhi thi. Client ko sub-headings ek baar
haath se mark karni hongi. Ye lossy nahi hai (shabd sab bache hain), par batana zaroori hai.

**Nateeja:** 583 tests (2 naye). Migration **015**.

### Amendment — 1 Sep, usi din: tabs, aur block-type dropdown

Client ne editor chalane ke baad do cheezein maangi.

**1. Section Headings ab tabs me hai.**

Saat section ek doosre ke neeche the — ek bahut lambi scroll, aur kis section pe kaam ho
raha hai wo kho jaata tha. Ab har section ka apna tab hai.

⚠️ Iska ek **aur** faayda hai jo dikhta nahi: **ek waqt pe sirf ek TipTap instance mount
hota hai.** Chhe editors ek saath chalana muft nahi — har ek apna ProseMirror view aur
plugins leke aata hai. Ye wahi cheez thi jo D-69 me "keemat" ki tarah likhi gayi thi, aur
tabs ne use apne aap hal kar diya.

Tab badalne se **kuch nahi khota** — saara data `labels` state me hai; tab sirf ye tay karta
hai ki kaunsa dikh raha hai, aur Save hamesha **poora** object bhejta hai. Ye Settings wale
route-based tabs se alag hai: wo alag screens hain, ye ek hi screen ke hisse jo ek saath
save hote hain.

**2. Block type ab dropdown hai — "Paragraph · Heading · Sub-heading".**

Pehle ek hi toggle button tha ("H3"). Client: _"why there is only h2 or h3 in editor could
there we all headings and p tag so that i can choose which word will be heading and which
will text simple"_

Do asli kami thi: **"Paragraph" naam ki koi cheez dikhti hi nahi thi** (heading ko wapas
paragraph banane ke liye usi button ko dobara dabana padta, jo pata hi nahi chalta), aur ek
se zyada level chunne ka koi raasta nahi tha.

### ⚠️ "All headings" nahi diye ja sakte — aur wajah sanak nahi hai

| Level | Kyun / kyun nahi |
| --- | --- |
| `h1` | Page pe **ek hi** hota hai — package ka title. Doosra `h1` outline tod deta hai |
| `h2` | Section ka apna heading hai. Description uske **andar** hai, to wahan `h2` uska bhai ban jaata — Overview me theek, sections me galat |
| `h3` `h4` | Section ke andar sahi nesting. Yahi chahiye the |
| `h5` `h6` | Theme inhe render hi **nahi** karti — `RichText` level ko 2–4 me clamp karta hai. Dropdown me dena ek jhooth hota |

Isliye `headingLevels` prop: sections pe `[3, 4]`, Overview pe `[2, 3]`.

**Do chhoti cheezein jo isme nikleen:**

- **Dropdown `ToolButton` nahi hai.** Wo `onMouseDown` + `preventDefault` karta hai (taaki
  selection na khoye) — par `<select>` pe wahi chaal dropdown **khulne hi nahi deti**.
  Select me selection `onChange` tak bachi rehti hai, isliye wo chaal chahiye bhi nahi.
- **`.blk h4` ka koi rule tha hi nahi** — reference me `h4` kahin aata hi nahi. Base heading
  rule sirf weight/colour deta hai, size nahi; yaani `h4` body ke size pe chalta aur `h3` se
  uska farak sirf spacing ka rehta. Ab 14.5px (h3 15.5 aur body 14 ke beech).
- **`.tabs` sirf `<a>` pe thi** (Settings ke route-tabs). In-page tabs `<button>` hain, to
  selector dono ko leta hai — aur button ka apna browser chrome hataana padta hai.
  ⚠️ `font: inherit` **`font-size` se pehle** likhna padta hai; shorthand baad me aaye to
  wo size ko reset kar deta hai.

### Amendment — 1 Sep: poora `h1`–`h6`, aur A-13 ka panel

**1. Dropdown me sirf tag ke naam, aur poora `h1`–`h6`** (client: _"only ese dikhe h1 to h6
and p not heading h3 i need all"_).

Pehle maine `[3, 4]` (sections) aur `[2, 3]` (Overview) rakhe the, "Heading"/"Sub-heading"
ke naam ke saath. Do baar client ne ise theek kiya — pehle naam pe (_"html tag jaisa kyu
nahi hai"_), phir range pe.

Mera tark aaj bhi sach hai: page pe `h1` ek hi hona chahiye (package ka title), aur section
ki description uske `h2` ke **andar** hai, to wahan `h2` outline me uska bhai ban jaata hai.
**Par ye faisla client ka hai** — ye unke apne page ka content hai.

⚠️ **Ek cheez ke bina ye feature toota hua hota.** `RichText` level ko **2–4 me clamp**
karta tha. Us clamp ke rehte editor me H1 dena ek **chup jhooth** hota: client H1 chunta aur
page pe H2 banta, bina kisi error ke. Isliye usi din teen cheezein saath badlin —

- renderer ka clamp `1–6` (clamp poori tarah hataya nahi: `<h9>` ek invalid tag hai aur
  React use chup-chaap render kar deta)
- base heading rule me `h6` juda (wo `h1…h5` tak hi tha)
- `.blk h1`, `.blk h5`, `.blk h6` ki CSS — reference me ye teenon kahin aate hi nahi the

⚠️ `.blk h1` jaan-boojh kar `.blk h2` se **chhota** hai: page ka asli `<h1>` package ka
title hai, aur section ke andar wala `h1` uska muqabla nahi karna chahiye.

**2. A-13 band — `Packages ▸ Booking & Cancellation`.**

`bookingSteps` aur `cancellationText` poore raaste par pehle se the (schema · model ·
service · public payload · theme), aur API ke test bhi. **Bas bharne ki jagah nahi thi.**

> **Sabak, aur ye is repo me naya hai:** field ka poora raasta bana dena kaafi nahi hai. Jab
> tak use bharne ki **jagah** na ho, wo field khaali rehti hai — aur client wo content kahin
> aur, galat shakl me daal deta hai. Yahan client ne chaaron step aur poori cancellation
> policy `sectionLabels.booking.description` me type kar di, jahan wo saade paragraph ban
> gaye. Uska ek aur nateeja bhi tha: dono khaali hone se hi 31 Aug wala "Good to know render
> hi nahi hota" bug bana tha.

Panel FAQs wale hi pattern pe hai — accordion + drag. Drag yahan **zaroori** hai, sajawat
nahi: page pe ye ek numbered list (`ol.steps`) hai aur number CSS counter se aata hai, to
step 2 aur 3 ka kram badalne ka koi doosra raasta hi nahi.

**Client ka data hilaya gaya (usi din):** description me se wo nau node hataye gaye jo ab
sahi field me hain. Bina uske wo text page pe **do baar** chhapta — theek wahi shakl jo
31 Aug ko hotels ki description pe hui thi.

**Nateeja:** page ka structure ab reference se **node-ke-node** milta hai —
`h2 · h3 p · h3 p · h3 · ol.steps(4× li>p) · p.muted`. 583 tests · lint · format · admin
build clean.

### Amendment — 1 Sep: alag submenu **hata diya**, sab "Good to know" tab me

Maine `Packages ▸ Booking & Cancellation` ek **alag sidebar item** banaya tha. Client ne
turant pakda:

> _"booking and cancellation ka submenu kyu bana diya — look good to know ka single design
> hai… ye alag se submenu nahi banana tha, section heading me good to know ko hi design kar
> do na"_

**Wo sahi hain.** Page pe "Good to know before you book" **ek hi section** hai. Uska content
do sidebar items me baant dena client se ye ummeed karta tha ki wo **hamara data model** yaad
rakhe — ki heading/description `sectionLabels` me hain aur steps/cancellation
`packageDefaults` ke apne field hain. Wo baat client ke liye maayne hi nahi rakhti.

Ab sab kuch `Section Headings ▸ Good to know` wale tab me hai: heading, description (rich
text), booking ke steps, aur cancellation policy. Save ek hi hai.

> ### Niyam jo isse nikla
>
> **Admin ka dhaancha page ke section follow karta hai, collection ke field nahi.**
>
> Ye is repo me pehle bhi laga tha par likha nahi gaya tha — D-59 me FAQs aur policies alag
> hue kyunki wo page pe alag cheezein hain, aur D-44 me footer ke columns ek screen pe aaye
> kyunki page pe wo ek footer hai. Maine yahan ulta kiya: do alag field dekhe aur do alag
> screen bana di.

**Do chhote nateeje:**

- `BookingPanel` ab apna `.panel` nahi banata — wo doosre panel ke **andar** render hota hai,
  aur apna card banane se card ke andar card aa jaata (do border, do background). Ab wahi
  `.field` shape jo baaki controls ka hai.
- **Save poora bhejta hai** — `sectionLabels` aur booking dono, chahe kaunsa bhi tab khula
  ho. Sirf khule tab ka data bhejna ek chup bug banata: client teen tab me kaam karta, Save
  dabata, aur do ka kaam gayab ho jaata.

⚠️ **Isi tark se ek sawaal khula hai:** `What's Included` bhi apna sidebar item hai, jabki
wo bhi page ka ek section hai (`#included`). Usi niyam se wo bhi apne tab me jaana chahiye.
Abhi nahi kiya — client ne sirf "Good to know" kaha, aur ye khud ek nayi screen-level tabdeeli
hai. `09-OPEN-ITEMS` me likha hua hai.

### Amendment — 1 Sep: "Good to know" ka spacing, aur ek reset jo kabhi tha hi nahi

Client: _"good to know ka design abhi match nahi hua, thik kar spacing ka issue hai"_ —
saath me unhone reference ki file dobara bheji. Wo repo wali file se **byte-ke-byte same**
nikli, to sawaal reference ka nahi tha.

Milaan pe **teen** asli wajah nikleen. Selector-by-selector CSS dono me ek jaisa tha; farak
markup aur base rules me tha.

**1. `p { margin: 0 }` hamare paas tha hi nahi.**

Reference ka apna rule hai (line 60). Uske bina har `<p>` browser ke default `margin: 1em 0`
pe chalta tha — **har jagah 16px upar aur neeche**, jo design me hai hi nahi. Aur ye sirf is
section ka masla nahi tha: `.blk p`, `.steps p` (step cards ke andar) aur `.faq p` — teenon
reference me isi reset pe tike hain aur apna margin likhte hi nahi.

⚠️ **Ye drift dono check scripts se chhoot gayi thi.** `css-diff.mjs` me ek **hardcoded
class-prefix allowlist** hai, aur `media-diff.mjs` sirf `@media` blocks dekhti hai — yaani
bare element selectors (`p`, `ul`, `body`) kisi bhi check me aate hi nahi. Wahi jagah hai
jahan page-wide reset rehte hain.

Reset lagne ke baad do rules bemaani ho gaye aur hata diye gaye: `.rt p { margin: 0 0 14px;
line-height: 1.75 }` aur `.rt-sec > *:last-child { margin-bottom: 0 }`. Dono **usi kami ki
bhurpayi** the — ab spacing wahan se aati hai jahan reference se aati hai (`.blk p + p`,
`.blk h3` ke apne margins).

⚠️ Reference ka `ul { margin:0; padding:0; list-style:none }` **jaan-boojh kar nahi liya** —
reference me rich text hai hi nahi, aur wo reset `.rt ul` ke bullets maar deta.

**2. TipTap ka trailing khaali paragraph — asli mujrim.**

DB me description ke aakhir me ek **khaali `<p>`** baitha tha. ProseMirror heading ke baad wo
apne aap chhodta hai (cursor rakhne ki jagah), aur wo chup-chaap save ho jaata hai. Page pe
usse line-height jitni — ~23px — bina wajah ki jagah banti thi.

Do jagah theek kiya:

- **Write pe** — `richDocSchema` ab aakhir ke khaali paragraph gira deta hai. **Sirf aakhir
  se**, beech se nahi: beech ka khaali paragraph client ne jaan-boojh kar chhoda ho sakta hai
- **Render pe** — khaali paragraph render hi nahi hota. Purana data pehle se DB me ho sakta
  hai, aur uske liye migration likhne se behtar hai ki renderer khud sambhal le

**3. Do chhoti drift jo saath me mileen.**

- ⚠️ `.steps b` pe maine `margin-bottom` 4px se **2px** kar diya tha (reference ki value),
  ye soch kar ki wo drift hai kyunki uspe koi comment nahi tha. **Client ne use wapas 4px
  kiya**, ab comment ke saath: _"i am doing it 4px dont change it"_. Ye unka faisla hai
  (R15) — client CSS ki values khud tune karta hai, aur wahi "mat badalna" wali list ka
  pehla niyam hai. **Sabak: comment ka na hona "ye drift hai" ka saboot nahi hai.**
- cancellation ka paragraph `.muted` class le raha tha jiska theme me **koi rule hai hi
  nahi** — wo class kuch karti hi nahi thi. Reference me wahan `style="margin-top:12px"` hai;
  ab wo `.blk__note` hai

**Nateeja:** us section ka markup ab reference se **element-ke-element** ek jaisa hai, aur
`css-diff` me `.steps b` wali drift bhi khatm. 585 tests (2 naye).

**4. `.steps` ka `padding-left` — client ne pakda ki cards align ho rahe hain.**

> _"reference me andar hai hamare me align ho rha hai"_

Reference me `.steps` pe koi padding likhi hi **nahi** hai, aur uska global reset sirf `ul` pe
hai — `ol` pe nahi. Yaani wahan `<ol>` ka **browser default 40px** bacha rehta hai aur cards
andar dikhte hain. Hamare paas `padding: 0` likha tha, isliye wo heading ke saath align ho
gaye.

Ab `padding-left: 40px` **likha hua** hai, browser ke bharose nahi chhoda — `.itin` (doosra
`<ol>`) bhi pehle se yahi karta hai. Bharose pe chhodne ka matlab hai ki kal koi
`ol { padding: 0 }` jaisa reset jode aur ye layout chup-chaap khisak jaaye.

⚠️ **`css-diff.mjs` ka doosra blind spot:** wo reference me maujood properties ko milaata hai,
aur **hamari taraf ki extra property** uske check me aati hi nahi. `padding: 0` theek wahi
shakl thi — reference me wo property hai hi nahi, to script ke paas milane ko kuch tha hi
nahi.

> **Dono blind spot ek saath likhe ja rahe hain**, kyunki aaj dono ne kaata:
>
> | Kya chhoot jaata hai | Kyun |
> | --- | --- |
> | bare element selectors (`p`, `ul`, `body`) | `css-diff` me hardcoded class-prefix allowlist |
> | hamari taraf ki **extra** property | script sirf ref → ours milaati hai, ulta nahi |
>
> Dono me se koi bhi ek page-wide layout badal sakta hai.

---

## D-70

**Traveller reviews universal hain, aur rating haath se likhi jaati hai**
_1 Sep 2026 · client ka faisla — spec 007 §9 #8 band_

> ⚠️ **Rating wala hissa Superseded by D-87** (7 Sep). Rating ab **per-package** hai —
> `tour-v3.html` ek listing page hai, aur wahan chaudah cards pe ek hi `4.9 ★ 412 trips`
> jhootha dikhta hai. `packageDefaults.rating` **rehta hai**, par ab wo _default_ hai:
> khaali `fields.rating` par wahi chalti hai.
>
> **`reviews` wala hissa waisa ka waisa hai** — wo aaj bhi universal hai, apni collection me,
> aur package usme se kuch chunta nahi. "Haath se likhi jaati hai" bhi waisa hi hai — rating
> aaj bhi `reviews[]` se **gini nahi jaati**, sirf uski _jagah_ badli hai.

### Sawaal

Slice 6 ka bacha hua hissa `reviews[]` + rating tha, aur spec 007 §9 #8 do mahine se khula
tha: `ratingValue`/`ratingCount` haath se likhe jaayein ya `reviews[]` se gine jaayein?

### Client ka jawab

> _"client review section there will be one menu in sidebar and we can add multiple reviews
> in that… universal hogi koi chunaw nahi"_
>
> _"for this section there will be a tab in section heading in that will have heading 4.9
> average and count 412 trips it will be universal for all"_

### Faisla — do hisse, do jagah

| Kya | Kahan | Kyun |
| --- | --- | --- |
| Reviews (star · month · text · name · last line) | nayi `reviews` collection | ek dohrayi jaati hui cheez, master list jaisi |
| Rating (`4.9` / `412 trips`) | `packageDefaults.rating` | ek hi jodi, list nahi |

**Reviews ka apna top-level sidebar menu hai**, `Packages` ka submenu nahi. Pehle wo
submenu bana diya gaya tha (data ke hisaab se wo Hotels/Add Ons jaisa hi hai) aur client ne
palta — unki baat pehli baar me saaf thi: _"one menu in sidebar"_. Wajah data me nahi,
**daayre me** hai: Hotels package ke **andar** ki cheez hai (har package chunta hai), reviews
kisi package ke andar nahi — wo poori site ki hain. **Admin ka dhaancha cheez ke daayre ko
follow karta hai, uske data model ko nahi.**

**`entries` pe koi `reviews[]` field nahi bani.** Spec §7 me wo per-package socha gaya tha;
client ne ulta chuna. Wahi faisla `goodToKnow[]` pe hua tha (D-68) — **jo har package pe same
chhapta hai, wo package ka data nahi hai.**

**Rating gini nahi jaati.** Ginne ka natija ulta hota: page pe likhi hui teen-chaar review ka
average dikhta, jabki `412 trips` saalon ka aankda hai. Jo cheez sach me kahin aur se aati
hai use derive karne ka dikhawa karna sabse mehnga jhooth hai — dikhne me sahi, aur jaanch ka
koi raasta nahi.

### Aur jo isse nikla

- **`reviews` master-lists module ki chauthi list hai**, apna module nahi (D-48 §1 ka hi
  tark). Sirf do line judi — service ka registry aur validation ka map
- **Aadhe taare nahi** — design me sirf bhare/khaali taare hain, `4.5` ka koi roop hi nahi
- **`month` string hai, `Date` nahi** (`2026-03`). `Date` banate hi timezone 1 taareekh ki
  raat ko pichhla mahina bana deta. Sort bhi isi pe chalti hai — `YYYY-MM` ka lexical aur
  chronological kram ek hi hai
- **`value: 0` = rating dikhani hi nahi** — hero aur section, dono se line gayab (D-30)

---

## D-71

**Similar itineraries apne aap chunte hain — wahi nights AUR days**
_1 Sep 2026 · client ka faisla — spec 007 §9 #15 band_

### Sawaal

§9 #15: similar itineraries apne aap chunein ya client haath se chune?

### Client ka jawab

> _"similar itinerary ke section me jo cards hai same days bale jitne cards honge like agar
> 5 night 6 days bale 10 packages hai to abhi jis package ke page par hai bo package card
> chod kar remaining package of same days bale card visible honge"_
>
> Match: _"(5N/6D = 5N/6D) only"_ · Cards: _"Design me 3 cards hain, uske bad 1,2,3 button
> pagination"_

### Faisla

**Nights aur days dono barabar, khud ko chhod kar.** Sirf days nahi — 4N/6D "same days" hai
par same trip nahi.

**Koi naya field nahi bana.** Card ka har tukda derive hota hai: route stays se, chips
nights/days + transfers + meals se, daam sabse sasti category se. Wahi soch jo route strip
(D-51) aur hotels table (D-58/D-60) pe hai — jo package pe pehle se hai use dobara mat
poochho. Nateeja: naya package publish karte hi wo purane packages ke page pe apne aap aa
jaata hai.

**Cap 12** — cap ke bina ek din 60 package wali site pe har package ka payload dus guna ho
jaata.

⚠️ **Card ka badge (`HONEYMOON`, `2 DIVES`) nahi bana** — client: "abhi chhod do". Uske liye
ya Package Type se maana nikaalna padta ya ek naya field.

⚠️ **Har card pe rating wahi ek hai.** Reference me har card ka apna number hai (`4.9 ★ 305`,
`4.8 ★ 158`) — wo per-package rating maan kar likha gaya tha, aur D-70 me client ne ulta
chuna. Client ko ye batate hue confirm kiya gaya: _"hatega kuch nahi abhi universal kar do"_.

---

## D-72

**Enquiry forms ban gaye — par inbox nahi, aur mail nahi**
_1 Sep 2026 · client ka faisla — Q-2 ka pehla hissa_

### Sawaal

`admin-design-v2.html` (client ne 1 Sep ko diya) me poora Enquiries module hai — All
Enquiries, Enquiry Detail, Enquiry Forms, Add New Form, Export CSV. Q-2 do mahine se khula
tha: Enquiries Phase 7b ho ya alag Phase 9?

### Client ka jawab

> _"banana hai abhi Enquiry Forms, Add New Form only kyuki desing me chahiye itinerary page
> par"_

Yaani asli maang module nahi, **package page ka chalta hua form** hai — D-67 ka wo hissa jo
khula reh gaya tha (button ban gaya tha, form nahi).

### Faisla — kya bana, kya nahi

| Cheez | Bana? | Kyun |
| --- | --- | --- |
| `forms` collection + builder | ✅ | client ne yahi maanga |
| Package page pe form | ✅ | asli maang yahi thi |
| `enquiries` collection | ✅ **client ne nahi maanga** | neeche |
| All Enquiries / Detail / Export CSV | ❌ | client ne "only" kaha |
| Email bhejna | ❌ | SMTP Phase 0 se blocked |
| `Conv.` column | ❌ | client ne mana kiya |
| Contact page / Popup / Sticky bar placement | ❌ | page builder chahiye (Phase 5) |

**`enquiries` collection bina maange banayi gayi, aur wo jaan-boojh kar hai.** Ek form jo
bhara jaata hai par kahin store nahi hota, wo client ki asli enquiries chup-chaap kho deta
hai. Screen baad me ban jaayegi; **kho gaya data nahi banta.** Ye scope badhana nahi hai —
scope wahi hai, bas uska adhoora roop data kha jaata.

### Ye is repo ka pehla bina-auth likhne wala endpoint hai

Isliye rok teen jagah hai: honeypot (bhara ho to 201, store kuch nahi — error dena bot ko
ishaara dena hai), rate limit (5/10 min, sirf IP pe), aur service ka apna check (form active
hai?, required bhare hain?, **koi anjaan key to nahi**). Teesra sabse zyada maayne rakhta
hai: Zod ne shape rok li (R9 — nested value reject), par naam sirf form ka document jaanta
hai.

---

## D-73

**Har font-size ab `:root` se — code me tokens, admin me nahi**
_1 Sep 2026 · client ka faisla_

### Sawaal

> _"check if fontsize, fontface, color, site width and fontweight and other common css can
> be managed from one location like for h1 size from one location same for other"_

Rang, width, radius, shadow aur font-family **pehle se** tokens me the. **Font-size kahin
nahi tha** — 81 declaration, 20 alag value. "h1 chhota karo" jaisa sawaal grep se shuru hota
tha aur har baar ek-do jagah chhoot jaati thi.

### Client ka jawab, jab do raaste diye gaye

> _"Code tokens means code label par admin me nahi"_

Yaani ek Settings ▸ Typography screen **nahi** chahiye — sirf code me ek jagah.

### Faisla

12-step scale (`--fs-5xs` … `--fs-3xl`), paanch clamp wale bade size, role wale
`--fs-h1`–`--fs-h6` + `--fs-body`, aur paanch weight tokens.

**Role wale token naap wale ko point karte hain, apni value nahi rakhte** — warna `--fs-h5`
aur `--fs-md` dono 13.5px hote aur ek din chup-chaap alag ho jaate.

Ye **refactor** hai, redesign nahi: 136 selector ki computed value pehle aur baad me milayi
gayi, ek bhi nahi badli.

⚠️ Teen size literal rahe — 20px (`.faq summary::after`), 30px (`.lbx__nav` ka chevron),
34px (`.offer__box b`). Wo **glyph** ke naap hain, text scale ka hissa nahi.

---

## D-74

**Admin ka spec ab `admin-design-v2.html` hai — v1 itihaas ban gayi**
_3 Sep 2026 · client ka faisla_

### Sawaal

Client ne **1 Sep** ko `admin-design-v2.html` di, aur usi din uske Enquiries wale hisse se
D-72 bana. Par docs kabhi update nahi hui: `CLAUDE.md`, `07-CONVENTIONS.md` (R15) aur
`README.md` teenon **v1** ko "FROZEN spec" batate rahe, aur v2 ka zikr poore repo me
**sirf ek jagah** tha (D-72 ke andar).

2 Sep tak ye chubha nahi kyunki v2 sirf Enquiries ke liye kholi gayi thi. 3 Sep ko client ne
paanch kaam ki list di (speed · editor · media · enquiries · bulk upload) — aur tab sawaal
ruk gaya: **kaunsi file spec hai?** R15 kehta hai "design jeetega", par ye likha hi nahi tha
ki design **kaunsa**.

### Client ka jawab

> _"v2"_

### Faisla

`docs/reference/admin-design-v2.html` **spec hai**. v1 itihaas.

**v2 v1 ka poora superset hai** — dono ke headings milaye gaye: v1 ka **ek bhi** screen v2 me
se hata nahi, aur v2 me chhe naye headings hain, sab ek hi cheez ke: `Enquiry Forms`,
`Enquiry Form`, `Basics`, `Fields`, `Where it appears`, `Save`. Sidebar ke `data-screen`
dono me same hain (dashboard · posts · media · pages · packages · enquiries · appearance ·
users · settings).

Isliye is faisle se **koi bana hua screen galat nahi hota** — jo v1 ke hisaab se bana hai wo
v2 me bhi wahi hai.

### Purane references jaan-boojh kar nahi badle

Repo me `admin-design.html` ke **32 zikr** hain, 13 file me. Sirf teen **authority** wali
jagah badli gayi (`CLAUDE.md`, R15, `README.md`); baaki sab **us waqt ka sach** hain —
"D-62 ke waqt design me ye tha" jaisi lines ko aaj ki file pe point karna itihaas badalna
hota. Yahi niyam is doc ka apna hai: purani entry delete nahi hoti, "superseded" likha
jaata hai.

### Ek cheez jo iske baad bhi khuli hai

**Design me har screen hai nahi.** `Bulk Upload` (client ne 3 Sep ko maanga) v2 me kahin
nahi hai — na sidebar me, na koi mockup. Us soorat me R15 khatam nahi hota: uska look bhi
client ka faisla hai, developer ka nahi. R15 me ye ab likha hua hai.

---

## D-75

**Enquiries inbox — column form ke naam se derive hote hain, aur CRM ka aadha hissa nahi bana**
_3 Sep 2026 · client ka faisla_

### Sawaal

`enquiries` 1 Sep se bhar rahi thi par use dekhne ki screen nahi thi (**D-72**: client ne
_"only Enquiry Forms"_ kaha tha). 3 Sep ko client ne inbox maanga. Do sawaal khade hue:

1. `admin-design-v2.html` ka Enquiry Detail poora **sales CRM** hai — kitna banega?
2. Design ki table ke column **fixed** hain (Package · Travel date · Pax · Budget), par form
   **client khud banata hai**. Column aayenge kahan se?

### Client ka jawab — scope

> _"Jo bina blocker ke ban sakta hai — poora"_

| Bana | Nahi bana, aur kyun |
| --- | --- |
| List (tabs · filter · search · bulk · pagination) | **Send Quotation** · auto-reply — SMTP Phase 0 se blocked |
| Detail (saare khaane · source · time) | **Activity feed** — activity log Q-4 me deferred, data source hi nahi |
| Status · Internal notes | **Assign · Priority · Follow-up** — field nahi; `salesAgent` ke permissions Phase 7b pe |
| Export CSV · trash | **UTM · IP · Landing page** — capture hi nahi hote (IP store karna alag faisla) |
| Quick Actions — Call · WhatsApp · Email | **PDF Itinerary** · `#WD-2026-0138` jaisi ID |

Jo nahi bana uska **panel bhi nahi dikhta** (D-30) — khaali dabba dikhana client ko ye
batana hai ki wo kaam karta hai.

⚠️ **Quick Actions SMTP pe ruke hue nahi hain** kyunki wo teen **link** hain (`tel:`,
`wa.me`, `mailto:`) — bhejne ka kaam browser aur client ka apna app karta hai, hum nahi.

### Faisla — column kaise nikalte hain

`deriveEnquiryColumns()` (`packages/shared/src/schemas/form.js`): **pehle key ka pattern,
phir type.** Label se kabhi nahi.

**Key pe bharosa isliye ho sakta hai** ki admin me use badalne ka koi raasta hai hi nahi
(`formFieldSchema` ka apna comment) — label badalta hai, key nahi.

⚠️ **Pehla design sirf `type` pe tha, aur wo galat tha — asli data ne pakda.** Client ke
chalte hue form me `mobile` aur `email` dono ka type **`text`** hai (`phone`/`email` nahi),
aur `guests` ek `select` hai. Sirf-type wala niyam:

```
Phone   → khaali          (koi `phone` type field hai hi nahi)
Email   → khaali          (koi `email` type field hai hi nahi)
Budget  → "2 adults"      (pehla bina-source `select` = guests)
```

Teenon galtiyaan **chup** thi — koi error nahi, bas galat khaana. Ye wahi shakl hai jo D-64
(transfer duration) aur D-65 (`cancellationText`) pe thi. Ab dono form pe sahi chalta hai,
aur client ke asli form ki shape ka ek **regression test** hai.

### Do aur cheezein

**`submission.update` ek naya permission hai** (spec 001 me nahi tha). Status badalna aur
note likhna **write** hai; use `submission.read` ke neeche rakhne ka matlab hota ki har
padhne wala lifecycle bhi badal sake. Migration **018** ise built-in roles pe sync karti hai.

⚠️ **`submission.delete` editor ko nahi mili** — wahi lakeer jo `entry.purge` pe hai. Aur
`POST /api/enquiries/bulk` route pe sirf `update` maangta hai par usi se `delete` bhi ho
sakta tha; wo check **controller me** hai, warna bulk delete ka pichhla darwaza ban jaata.
Uska apna test hai.

**Delete = trash** (R12) — `deletedAt`. Permanent delete ka koi raasta jaan-boojh kar nahi:
enquiry kisi asli grahak ki bhari hui hai. Client ne reference-check wale gate se **mana kiya**
("seedha trash me"), aur wo unka faisla hai — trash restorable hai, isliye nuksaan ulta ja
sakta hai.

### Sidebar ke do item — client ne usi din tay kar diye

Dono design ke nav se aaye the aur ajeeb baithte the: **`Enquiry Detail`** (bina id ke
khulega kis pe?) aur **`Export CSV`** (nav se download?). Maine dono ko **hataya nahi** —
D-43 me "bina poochhe UI hatana" ki galti ho chuki hai — aur interim daal diya.

**`Enquiry Detail` ka interim galat tha.** Wo list pe bhej deta tha, aur client ne turant
pakda: _"why enquiry detail submenu also show list of enquiry, it should show enquiry
details right"_. Baat sahi hai — item ka naam detail kehta hai, to detail hi khulni chahiye.
Ab wo **sabse nayi** enquiry kholta hai (inbox me sabse aam kaam bhi wahi hai). Ek bhi
enquiry na ho to ek saaf khaali state.

Sabak: **jab kisi cheez ka interim daalo, to wo cheez ka naam jo vaada karta hai wahi
nibhaana chahiye.** "List pe bhej do" ne kaam to kiya, par label se jhooth bol raha tha.

`Export CSV` waise hi hai — wo sach me download shuru karta hai, aur wahi uska naam kehta hai.

### Row actions — do, chaar nahi

Design me har row pe chaar hain: `View · Reply · Assign · Delete`. Bane sirf **View** aur
**Delete**. `Reply` SMTP maangta hai (Phase 0 se blocked) aur `Assign` ke liye koi
`assignedTo` field hi nahi hai — jo kaam karta hi na ho uska link dikhana client ko ye
batana hai ki wo kaam karta hai (D-30).

⚠️ Ye `.row-actions` hain, yaani **hover pe dikhte hain** — wahi WordPress wala pattern jo
Packages list pe pehle se hai. Client ne pehle inhe "aa hi nahi rahe" bataya tha; wo isliye
ki wo bane hi nahi the (3 Sep me jude).

---

## D-76

**Enquiries inbox — client ne usi din kaat kar chhota kar diya**
_3 Sep 2026 · client ka faisla — D-75 ka amendment_

### Sawaal

D-75 wala inbox banne ke baad client ne use live chala kar ek poora brief diya. Kaafi kuch
jo maine design se uthaya tha, unhe chahiye hi nahi tha.

### Client ka brief, aur uspe kya hua

| Client ne kaha | Kya kiya |
| --- | --- |
| _"in submenu i dont need enquiry detail, export csv"_ | Dono nav item **hat gaye**; `EnquiryLatest.jsx` aur `EnquiryExport.jsx` delete |
| _"only all enquiries submenu hoga jisme export csv button hoga"_ | Submenu me teen bache — All Enquiries · Enquiry Forms · Add New Form (client ne pushti ki ki baaki do rahenge) |
| _"export csv me filter based export, from date to this date"_ | **Date range** filter — par wo list pe lagti hai, aur export usi query ko aage bhejta hai |
| _"i dont need Assigned tab, Budget"_ | `Budget` column hata. **`Assigned` banaya hi nahi tha** — wo design me hai, hamare yahan kabhi nahi tha |
| _"replace Contact to name and add email tab not below the name"_ | `Contact` → **Name**, aur `Email` + `Phone` apne alag column (pehle wo naam ke neeche ek line me the) |
| _"buttons will be only view and delete"_ | Wahi do — `Reply`/`Assign` waise bhi nahi bane the |
| _"only status dropdown, i dont need quick actions, Activity & Notes, Send Quotation"_ | Detail pe sirf **Enquiry Details** + **Status**. Notes ka panel, uska field, API aur test sab gaye (migration **019**) |

### Do baatein likhne laayak

**1 · Date range list pe hai, export pe nahi.** Export apna alag filter nahi rakhta — wo wahi
query aage bhejta hai jo list chala rahi hai (`enquiryFilter()` ek hi jagah hai). Isse client
ke liye niyam ek line ka reh jaata hai: **"jo list me dikh raha hai, wahi CSV me aayega."**
Do jagah do filter rakhne ka matlab hota ki ek din wo alag ho jaate aur CSV chup-chaap kuchh
aur deta.

⚠️ `to` **poore din** ko pakadta hai (`$lt` agla din, `$lte` wo din nahi). `03-09` likhne
wala "3 tarikh tak" kehta hai, "3 tarikh ki raat 12:00:00 tak" nahi — bina iske us din ki
saari enquiries chhoot jaati, aur wo galti chup hoti: filter chalta hua dikhta, data gayab.

**2 · Export ka link ab `query` se banta hai, `window.location.search` se nahi — aur wo ek
asli bug tha.** URL me `tab=new` hota hai par API `status=new` maangti hai. Yaani status ka
tab chuna hua ho to bhi CSV me **poori list** aa jaati — koi error nahi, bas galat file.
Isi kism ki chup galtiyaan is repo me baar-baar mili hain (D-64, D-65, D-75).

### Notes ka field poora hataya gaya — D-54 se ulta

Client ne saaf kaha "poora hata do, field bhi". D-54 me `availability` ka field Mongo me
chhod diya gaya tha; farak ye hai ki wahan us field me **asli data baith chuka tha**. Notes
kabhi kisi ne likhe hi nahi the — 018 ne sirf khaali `[]` daala tha. Khaali khaana chhodne ka
matlab hota agle developer ke liye ek jhoothi ummeed ("ye kis kaam ka hai?").

`updateEnquirySchema` ab `.strict()` ke saath sirf `status` leta hai, to `note` bhejne pe
**400** aata hai — dead API chup rehne se behtar hai ki wo saaf mana kare. Uska apna test hai.

---

## D-77

**Editor TinyMCE hoga — GPL wali branding client ko manzoor hai, aur editor har section pe**
_3 Sep 2026 · client ka faisla_

### Sawaal

Client ki maang thi: Visual aur Text (HTML) do tab, aur Text me `class`/`id`/inline `style`
likho to **kuch gayab na ho**.

TipTap wo nahi kar sakta aur ye uski kami nahi — wo **schema-based** (ProseMirror) hai: jo
tag uske schema me nahi, wo hata deta hai, chahe aap HTML tab me khud likho. Schema me tag
jodte rehne se wo ek **list** hi rahega, "kuch bhi" kabhi nahi banega.

WordPress ye isliye kar leta hai ki wo **TinyMCE** use karta hai, jo DOM-based hai, aur uska
`post_content` **raw HTML** hi hota hai. Yaani gayab hone ke liye wahan kuch convert hi nahi
hota.

### Do faisle

**1 · Editor TinyMCE hoga, aur free (GPL) version chalega.**

Maine do kaante saaf-saaf rakhe the: TinyMCE 7 GPL pe hai, aur free me editor ke andar
**"Powered by Tiny"** branding aati hai — jo client ke admin panel me dikhegi (R15 ke against
jaati hai). Client ka jawab:

> _"we can use TinyMCE free — bala branding dikhe koi bat nahi"_

Yaani branding manzoor hai. Commercial license nahi lena.

⚠️ Ye **client ka jaan-boojh kar liya gaya faisla** hai, developer ka nahi — R15 ke hisaab se
aage koi ise "design se match karo" ke naam pe palat na de.

**2 · Editor har section pe lagega, sirf Overview pe nahi.**

> _"editor should be on each section becouse in future user can change text style so we will
> use editor"_

Aaj kai jagah plain `textarea` hai. Client ki wajah aage ki hai: text ka style badalne ki
zaroorat kabhi bhi kisi bhi section pe aa sakti hai, aur tab ek-ek karke editor lagana poora
retrofit ban jaata.

### Iske saath jo badlega — aur wo chhota nahi hai

| Cheez | Aaj | TinyMCE ke baad |
| --- | --- | --- |
| Content ka shape | TipTap ka JSON (`props.doc`) | **raw HTML string** |
| Public render | `RichText.jsx` — node ka whitelist | **sanitized HTML** |
| Nayi dependency | — | TinyMCE + ek HTML sanitizer |
| Purana content | — | **migration** — JSON se HTML |

⚠️ `valid_elements: '*[*]'` **zaroori hai** — TinyMCE ka default bhi thodi safai karta hai
(WordPress ki jaani-pehchani shikayat). Us setting se wo safai band ho jaati hai, aur tab wo
WordPress se **behtar** behave karta hai, uske barabar nahi.

⚠️ Sanitizer **chhod nahi sakte**: raw HTML store karne ka matlab hai ki `<script>` ya
`onclick=` ka raasta khul jaata hai. Wo admin-only input hai, par admin ka account bhi churaya
ja sakta hai.

**Ban gaya** — D-80 ke saath, usi din (3 Sep). Content ab HTML hai, sanitizer server pe hai,
aur editor `HtmlEditor.jsx` me.

### ⚠️ Ek chup failure jo isi me phansi thi — `skin.min.css`, extension ke saath

Pehli baar chalane pe **Visual tab bilkul khaali** aaya: na toolbar, na content, aur console
me **koi error nahi**. Wajah `TinyMceEditor.jsx` ki ek import line thi:

```js
import 'tinymce/skins/ui/oxide/skin' // ❌ skin.js pe resolve hui
import 'tinymce/skins/ui/oxide/skin.min.css' // ✅ asli CSS
```

Us folder me `skin.js` **aur** `skin.css` dono hain, aur bina extension ke Vite `.js` pehle
uthata hai. Wo JS file maujood thi aur chal bhi gayi — bas editor ki poori UI CSS kabhi load
nahi hui. Bina skin ke `.tox-edit-area__iframe` ki oonchai 0 ho jaati hai aur toolbar ke icon
bhi 0×0 — yaani editor "chal" raha tha, **dikh nahi raha tha**.

**Pakadne ka tareeka:** build ke output me `TinyMceEditor-*.css` chunk hona chahiye (~107 kB).
Wo chunk na ho to skin load nahi ho rahi, chahe screen pe kuch bhi dikhe.

Wahi shakl jo transfer-duration (D-64), `cancellationText` (D-65) aur migration 020 ke
`packageDefaults` wale bug ki thi: **dono taraf ka code sahi dikhta hai**, bas beech ka ek naam
galat hota hai aur failure chup rehti hai.

### Text tab me WordPress wale quicktags

Client ne screenshot bhej kar kaha ki editor "WordPress jaisa" dikhna chahiye. Isliye
`HtmlEditor.jsx` me Classic Editor ka poora chrome hai: **Add Media** upar-baayein, boxed
**Visual | Text** tabs upar-daayein, aur Text tab me `b · i · link · b-quote · del · ins · ul ·
ol · li · code · img · close tags`.

⚠️ Quicktags me **khule tag ka stack** bhi hai — text chune bina `b` dabaao to `<strong>` lagta
hai aur button `/b` ban jaata hai. Ye WordPress ki nakal nahi, zaroorat hai: iske bina buttons
sirf tab kaam karte jab pehle se text chuna ho, aur khaali box me kuch likhne ka raasta hi na
rehta.

---

## D-78

**Media Library + MediaPicker ban gaye — Phase 2 ka bacha hua hissa**
_3 Sep 2026 · client ka faisla_

### Sawaal

`/media` sidebar me tha par `NotBuiltYet` pe jaata tha. Foundation D-41 me pull-forward ho
chuka tha (upload · WebP variants 300/800/1600 · storage driver · magic-byte check · size
cap) — sirf screen nahi thi. Client: _"since media ka desision already doc me hai to media
section bhi bana do"_.

Scope ka faisla pehle hi ho chuka tha: **Library + Picker + editor me image insert** (client,
3 Sep). Editor wala hissa TinyMCE ke saath aayega (D-77); baaki do ab bane.

### Kya bana

| Cheez | |
| --- | --- |
| `Media Library` screen | grid · search · pagination · drag-drop upload · detail panel (Alt/Title/Caption + File URL) |
| `MediaPicker` component | popup — **Media Library tab default**, `Upload` doosra |
| `DELETE /api/media/:id` | naya route — **trash** (`media.delete`) |

**Picker ka default tab library hai, upload nahi** — aur wo jaan-boojh kar hai. Client ki
purani shikayat thi: _"jo images admin me upload karta hu … mujhe fir se upload karna padta
hai har baar"_. Uska ek hissa A-16 ka bug tha (files mit rahi thi), par **doosra hissa ye tha
ki pehle se upload ki hui image chunne ka koi raasta hi nahi tha**.

### Picker ek jagah laga, paanch jagah mil gaya

`MediaDrop.jsx` ke apne comment me likha tha: _"jab picker aayega to badalna sirf yahi ek file
hogi"_. Wahi hua — usme ek optional `onSelect` prop juda, aur ab **paanchon** jagah "Choose
from library" mil gaya: Settings ka Logo aur Favicon, Footer ka logo, package ka banner, aur
destination ka banner.

Ye us purane comment ka nateeja hai, ittefaq nahi: uss din component alag kiya gaya tha
**isi** din ke liye.

### Filters — design ke hisaab se (do baar galat karne ke baad)

⚠️ **Filters pe maine do galtiyaan ki, aur client ne dono tok di.**

Pehle maine design ke teenon filter chhod diye aur wajah likh di. Client: _"media me filters
to hai hi nahi add karo"_. Phir maine month dropdown ki jagah **date range** bana diya aur
sort ka apna dropdown jod diya — kyunki mujhe wo behtar laga. Client ne dobara tok diya:

> _"filters admin refrence me hai ese lagao by own kyu decide kar rhe ho"_

**Baat sahi hai, aur ye seedha R15 hai.** Ab filters bilkul `#s-media` jaise hain — teen
dropdown, `Filter` button, spacer, phir search; wahi kram, wahi labels. Grid me har tile ke
neeche filename ki patti bhi juri (design ka `.cap`, uske apne naapon se).

**Sabak:** "design se behtar" sochna hi wo jagah hai jahan R15 lagta hai. Reference me month
dropdown tha; date range **zyada kaam ka** ho sakta hai, par wo faisla client ka hai. Jahan
mujhe design me kami lage, wahan **poochhna** hai — chup-chaap behtar bana dena nahi.

| Design ka filter | Haalat |
| --- | --- |
| `All media items · Images · Videos · Documents (PDF)` | ✅ bana. ⚠️ `Videos`/`Documents` **khaali** aayenge — `MEDIA_MIME` sirf JPG/PNG/WebP leta hai. Vikalp phir bhi hain kyunki design me hain |
| `All dates` / `August 2026` | ✅ bana. Mahine **data se** aate hain (`mediaMonths()`), banaye nahi jaate — jis mahine me kuch hai hi nahi wo dikhta hi nahi |
| `Unattached` / `Attached` | ❌ **kabhi nahi banega** — client ne 3 Sep ko `mediaRefs` se hi mana kar diya (**D-79**) |

**`Filter` button hai, isliye dropdown badalne se list turant nahi badalti** — design me wo
button hai, aur uska matlab yahi hai ki chunav pehle hote hain, apply baad me. Har dropdown ka
apna draft state hai; URL me sirf apply hua filter jaata hai.

⚠️ Mahine ki range `$lt` **agle mahine ki 1** pe khatam hoti hai, us mahine ki "31" pe nahi —
warna February pe wo chup-chaap galat ho jaati (28/29 din). Uska apna test hai.

### `Unattached`/`Attached` kyun nahi bana — aur ye "maine chhod diya" nahi hai

Iske liye **`mediaRefs` backlink index** chahiye (Phase 2 ka apna item), jo abhi maujood nahi.
Bina uske "ye image kahin lagi hai ya nahi" ka jawab **andaaze se** dena padta — har us jagah
ko haath se scan karke jahan media id store hoti hai (settings ke teen field, entry ka banner,
itinerary images, taxonomy ka banner…).

Us andaaze me **ek jagah chhoot jaana kaafi hai**: ek lagi hui image `Unattached` me dikhti,
koi use delete kar deta, aur wo page chup-chaap adhoora ho jaata (D-42 §2 ki wajah se toota
`<img>` bhi nahi dikhta). Isliye ye filter **galat data ke saath dena, na dene se bura** hai.

⚠️ **Client ne isse mana kar diya (D-79)** — _"delete to kar sakte hai chahe kahin lagi ho ya
nahi"_. Isliye ye filter, "Used in" panel aur delete-guard teenon nahi banenge.


### Teen aur baatein — client ne screen chala kar (3 Sep)

**1 · Tile pe filename hata diya.** Design me har tile ke neeche `.cap` ki patti hai aur wo
banayi bhi gayi thi; client: _"image name nahi chahiye image par"_. Filename detail panel me
pehle se hai, to wo kahin kho nahi raha.

**2 · Detail panel ab band ho sakta hai.** Uska `×` dabate hi grid **poori chaudai** le leta
hai, aur kisi image pe click karte hi wo wapas khul jaata hai (client: _"jisse only images
show ho"_). Saath me "Select an image to see its details." wali line bhi hat gayi — wo ek
khaali dabba ghere rehti thi jiska kaam sirf ye batana tha ki wo khaali hai.

Do column ka switch **CSS se** hai (`:has(.ml-side)`), JSX me koi doosra flag nahi: panel hai
ya nahi — ye ek hi sach hai, aur use do jagah rakhna hi drift ki shuruaat hoti.

**3 · `File URL` ab poora URL deta hai — ye ek asli bug tha.**

Client ne wo path copy karke browser me khola aur kuch nahi mila:

```
/uploads/sites/default/media/2026/09/6a982ced…/large.webp     ← aadha
http://localhost:5173/uploads/sites/default/…/large.webp      ← ab
```

Wajah wahi hai jo D-42 §2 ke saath likhi gayi thi: variant ki `url` **jaan-boojh kar
relative** hoti hai — usme kabhi `localhost:4000` store nahi hota, warna wo dev hostname DB
me baith kar prod me toot-ta. Par ek **copy karne wale box** me relative path bemaani hai.

Origin `window.location.origin` se lagta hai, kisi env se nahi: admin aur `/uploads`
same-origin pe hain (02-ARCHITECTURE §1) — dev me Vite proxy se, prod me reverse proxy se.
Verify bhi kiya: `:5173` aur `:4000` dono se wo URL `200 image/webp` deta hai.

⚠️ CDN aane pe (`CDN_BASE_URL`) variant ki url **absolute** hoti hai — tab use chhua nahi
jaata, warna origin do baar lag jaata.
### Delete trash hai, aur file disk pe rehti hai

Client ne Enquiries pe bhi yahi chuna tha ("seedha trash me") — media pe wo aur zaroori hai:

1. **File wapas nahi aati.** Record chhupana ulta ja sakta hai, file mit jaana nahi — **A-16
   ka poora sabak** yahi tha (`pnpm test` ne client ki images uda di thi).
2. **`mediaRefs` bana hi nahi**, to file mitana ek aisa page tod sakta hai jispe wo lagi hai —
   aur wo toot **chup** hoti: D-42 §2 ki wajah se toota `<img>` render hi nahi hota, page bas
   adhoora dikhta hai.

Isliye `media.purge` ka koi route abhi bhi nahi hai. Button ka label bhi **"Delete"** hai,
"Delete permanently" nahi — label ko wahi kehna chahiye jo wo sach me karta hai.

---

## D-79

**`mediaRefs` nahi banega — delete pe koi rok nahi, aur "Used in" panel bhi nahi**
_3 Sep 2026 · client ka faisla_

### Sawaal

D-78 ke baad ek hi bada item bacha tha: `mediaRefs` backlink index. Uspe **teen** cheezein
tiki thi — design ka `Unattached`/`Attached` filter, detail panel me "Used in", aur **delete
pe guard**. Client ko poora hisaab diya gaya: kya milta hai, kitna waqt lagta hai, aur asli
khatra kya hai (ek save path chhoot jaaye to guard **jhooth** bolega).

### Client ka jawab

> _"delete to kar sakte hai chahe kahin lagi ho ya nahi koi bat nahi, detailed panel ki
> jarurat nahi hai"_

### Faisla

**`mediaRefs` nahi banega.** Uske saath teenon cheezein bhi nahi banengi:

| Jo nahi banega | |
| --- | --- |
| Delete-guard | Delete hamesha chalega — chahe wo image kahin lagi ho |
| "Used in" panel | Detail me sirf file ki apni jaankari rahegi |
| `Unattached` / `Attached` filter | Design me hai, par **ab kabhi nahi banega** — uska data hi nahi hoga |

Media ke filters do hi rahenge: **kism** aur **mahina**.

⚠️ **Iska maloom nateeja:** kisi lagi hui image ko delete karne pe wo page se **chup-chaap**
gayab ho jaayegi — D-42 §2 ki wajah se toota `<img>` bhi nahi dikhta, page bas adhoora ho
jaata hai. Client ko ye batakar hi faisla liya gaya.

Ek cheez us nuksaan ko halka rakhti hai: **delete = trash** (R12). Record `deletedAt` pe
jaata hai aur **file disk pe rehti hai** — yaani galti ulti ja sakti hai (DB me `deletedAt`
hata do). Ye D-78 me pehle se tay tha, aur ab wo aur zyada maayne rakhta hai.

⚠️ Ek kaam ab bhi haath se karna padega: "kaunsi media kahin use nahi ho rahi" — jaise 3 Sep
ko 183 orphan records mitane se pehle karna pada tha. Wo scan har baar dobara likhna padega.

### Iske saath Phase 2 band

Ye Phase 2 ka aakhri **maanga hua** item tha. Jo aur bacha hai — folders, rename, bulk
select, crop/rotate, replace file — wo kisi cheez ko rok nahi raha aur client ne maanga nahi.
Media ab "current scope complete" hai, wahi lakeer jo Settings ▸ General pe D-40 me lagi thi.

---

## D-80

**Rich text ab HTML hai, editor TinyMCE — aur iske saath XSS ki problem hum aaj se paal rahe hain**
_3 Sep 2026 · client ka faisla · spec 002 ka **doosra** badlaav_

### Sawaal

Client ko WordPress ke Classic Editor jaisa chahiye tha: **Visual aur Text (HTML) do tab**, aur
Text me `class` · `id` · inline `style` likho to **kuch gayab na ho**.

TipTap wo nahi kar sakta, aur ye uski kami nahi. Wo **schema-based** (ProseMirror) hai: jo tag
uske schema me nahi wo hata deta hai, chahe aap HTML tab me khud likho. Schema me tag jodte
rehne se wo ek **list** hi rahega — "kuch bhi" kabhi nahi banega. WordPress ye isliye kar leta
hai ki uska `post_content` **raw HTML** hi hota hai; gayab hone ke liye kuch convert hi nahi hota.

### Ye repo is din ke liye tayyar tha — aur uski keemat pehle se likhi hui thi

`rich-doc.js` me D-69 ke waqt likha gaya tha:

> _"TipTap HTML store nahi karta… kahin `dangerouslySetInnerHTML` hai hi nahi. Nateeja: XSS
> **filter** nahi hota, wo **ban hi nahi sakta**. WordPress ko `wp_kses` isliye chahiye ki wo
> HTML string store karta hai; hum wo problem paalte hi nahi… par jis din wo chahiye, ye ek
> naya faisla hoga (**sanitizer + permission gate**)."_

Wo din aa gaya. Yaani ye faisla ek **maloom** keemat chuka raha hai: **XSS ki problem hum aaj
se paal rahe hain**, aur uska ilaaj sanitizer hai.

### Client ke chaar faisle

| | |
| --- | --- |
| Editor | **TinyMCE 7**, GPL — _"we can use TinyMCE free bala branding dikhe koi bat nahi"_ (D-77) |
| HTML tab kise | **Sabko** jo content edit kar sakta hai. `unfiltered_html` jaisa role gate nahi |
| Editor kahan | _"editor will be everywhere"_ — har prose field |
| Design | _"public site ka design bilkul nahi badlega, baki editor add karna hai"_ |

### Icons theme ke hi rahe — kyunki WordPress bhi yahi karta hai

Beech me ye maana gaya tha ki ✓/✗ ke icons HTML tab me dikhne chahiye ("jo DOM me hai wo HTML
me dikhega"). **Wo andaaza WordPress pe theek nahi baithta**, aur check karke pata chala:

- WordPress me checkmark list icons **theme aur CSS se** aate hain — `::before` me
  `content:"\2713"`, block style class (`is-style-check`), Font Awesome, ya Additional CSS
- Classic Editor ki apni documentation: _"the editor typically displays generic formatting,
  while the **frontend will apply the full, complete formatting based on the theme**"_

Yaani Text tab me sirf wahi hota hai jo author ne likha. Hamara code **theek yahi** kar raha
tha (`<li><Tick />{line}</li>`), isliye wo waise ka waisa hai.

Ek keemat bhi bach gayi: icon content hota to kal tick ka design badalne pe wo **har row me**
haath se badalna padta.

### Scope — kahan editor, kahan nahi

**Poora editor (block HTML):** Overview (`entry.content`) · saaton `sectionLabels[].description`
· `itinerary[].description` · `faqs[].answer` · `bookingSteps[].text` · `cancellationText`.

**Sirf inline HTML:** `whatsIncluded.included[]` / `.excluded[]` — wo `string[]` hi rehte hain
(✓/✗ theme lagata hai), par line ke **andar** `<b>`/`<a>`/`<span>` chalta hai. Block tag wahan
allow **nahi** — `<li>` ke andar `<p>` line ko uske icon se alag kar deta hai. Ye rok design
ki hai, sirf suraksha ki nahi.

**Plain hi rahe:** `sectionLabels[].heading` · `itinerary[].title` · `transferNote` ·
`legs[].note` · `bookingSteps[].title` · `faqs[].question` — ek line ke label hain.

### Do purane faisle palat gaye

- **D-59** — FAQ answers plain the ("ek paragraph ke liye ek aur block tree bekaar hai"). Wo
  tark tab theek tha jab rich text ka matlab block tree tha; ab wo ek saada HTML string hai.
- **D-64** — `-` se shuru hone wali line bullet banti thi (migration 014 ne data usi shape me
  daala tha). Ab wo asli `<ul>` hai; convention sirf naye plain text ke converter me zinda hai.

### Suraksha — safai write pe, render pe nahi

`apps/api/src/core/sanitize-html.js` — do profile (block · inline), aur wo **service layer me
write pe** chalti hai (R1). Isliye DB me kabhi gandi HTML pahunchti hi nahi, aur theme us par
bharosa kar sakti hai.

**Render pe saaf karna galat hota:** tab zeher DB me pada rehta aur har naya reader ko khud
bachna padta — ek reader bhoolte hi wo chal jaata.

⚠️ **Browser me sanitize karna sirf dikhawa hai** — koi bhi admin ka JS chhod kar seedha API
call kar sakta hai. Isliye `packages/shared` me safai **nahi** hai.

⚠️ `svg` allow hai, aur ye D-41 ki "SVG upload block" se **alag** hai: wahan ek **file** thi
jo apne origin pe chalti; yahan admin ka inline markup hai jo isi sanitizer se guzarta hai.

⚠️ `iframe` sirf `https:` ke saath allow hai — client ne future ke liye maanga. Maloom risk
(phishing/clickjacking embed); band karna config me ek line hai.

### Migration 020 — teen cheezein jo pakdi gayin

1. **`packageDefaults` camelCase hai.** Pehli baar `packagedefaults` likha tha aur migration ka
   **aadha hissa chup-chaap chala hi nahi** — Mongo ka collection naam case-sensitive hai, aur
   galat naam pe `find()` bas khaali cursor deta hai. Migration "✓" dikha kar nikal gayi thi;
   verification step ne pakda.
2. **Escape.** Purana text plain tha — `Kids < 5 years free` bilkul theek line thi. HTML me wo
   ek adhoora tag ban jaati aur uske aage ka sab gayab. Har purani value pehle escape hoti hai.
3. **Migration 015 ka import toot gaya.** Wo `textToDoc` `@cms/shared` se leti thi; wo helper
   aaj hat gaya, aur poora migration runner boot pe girne laga. **Sabak:** migration waqt me
   jama hoti hai — uska tark uske andar hona chahiye. Helper ab 015 me inline hai.

### Bundle — TinyMCE lazy hai

Seedha import karne se admin ka bundle **864 kB → 1,836 kB** ho gaya tha (naapa gaya). Ab
`TinyMceEditor.jsx` alag file hai aur `React.lazy()` se aati hai: main bundle **480 kB** — yaani
pehle se bhi halka, kyunki editor ka bhaar sirf package wali screens uthati hain.

### ✅ Design parity — naapi gayi, maani nahi gayi (3 Sep)

Is poore kaam ki ek hi shart thi: _"public site ka design bilkul nahi badlega"_. Wo shart
**maap kar** band ki gayi hai, dekh kar nahi.

Chaaron package page migration se **pehle** capture hue the; naye code se dobara capture ho kar
tag-by-tag mile:

| | `p` | `ul` | `ol` | `li` | `h2` | `h3` | `strong` | `em` | `a` | `img` | `table` | `details` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| farak | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Chaaron page pe, teraah tag pe, **ek bhi farak nahi**. Class ki poori list (145 alag-alag
`class="…"`) me sirf **ek** farak nikla, aur wo jaan-boojh kar tha:

```
- class="itin__l"        ← theme khud lagata tha, ab lagta hi nahi
```

Uski CSS ab structure pe bandhi hai (`.itin__c ul` · `.itin__c ul li` · `… li::before`), isliye
editor se bani saadi `<ul>` ko bhi wahi neele dot wale bullet milte hain. `<ul>` ki ginti dono
taraf **barabar** hai — list gayab nahi hui, sirf uska class chhoot gaya.

### ⚠️ Ek jhoothi ghabrahat — aur wo kaise bani

Pehli baar ye check chalaya to nateeja darawna tha: **18 `<li>` aur 6 `<ul>` gayab**, teen
`<h3>` kam. Lagta tha migration ne lists kha li hain.

Wajah check me thi, code me nahi. "After" wala capture `next start` se liya gaya tha jo **subah
11:54 ke build** pe chal raha tha — yaani **purana compiled renderer** (TipTap ka node-walker)
**nayi HTML data** padh raha tha. Us jodi me lists ka gayab hona tay tha.

**Sabak:** migration ke baad ka capture hamesha **naye build** se lena. `next start` chup-chaap
purana bundle serve karta rehta hai — DB naya ho jaata hai, code nahi, aur diff jhooth bolta
hai. `.next/BUILD_ID` ka waqt dekh lena kaafi hai.

---

## D-81

**Bulk Upload — Google Sheet se package pages** (client, 3–4 Sep)

Client ke paas 20+ itinerary packages Google Docs me likhe hue hain. Haath se daalne ka matlab
hai har package pe **38 khaane** bharna — Meta Title se lekar har din ka Title, Meals, Transfer
aur Description tak. Ab wo sheet ka URL paste karta hai aur package **ban kar publish** ho
jaate hain.

Sidebar me **top-level** menu hai, submenu nahi — client ne saaf kaha tha:
_"sidebar me menu banana hai not submenu remember"_.

### ✅ Google ka koi account nahi chahiye — naapa gaya

Shuru me lagta tha ki Drive integration (OAuth ya service account) karna padega. Naap kar dekha:

| Raasta | Nateeja |
| --- | --- |
| `docs.google.com/…/export?format=csv` (sheet) | **200** — bina kisi login ke |
| `docs.google.com/…/export?format=html` (doc) | **200** — bina kisi login ke |
| `sheets.googleapis.com/v4/…` (asli API) | **403** — _"unregistered callers"_ |

Pehla raasta wahi hai jo browser me **File → Download** dabane pe chalta hai — uspe koi pehchan
maangi hi nahi jaati. Teesri line batati hai ki **likhna** kabhi anonymous nahi ho sakta, chahe
file duniya bhar ko dikh rahi ho.

Ye farak isliye maayne rakhta hai ki client ne pehle sheet me `Status`/`Published URL` bharne ki
baat ki thi, phir palat diya: _"mat likho wapas uspe, apne admin me hi status show karte jao"_.
Us ek line ne **poora OAuth/service-account ka kaam** scope se bahar kar diya — koi naya env
var, koi credential, koi nayi dependency nahi.

Status DB me rehta hai (`importRuns`), aur wo sheet se **behtar** nikla: screen band karke wapas
aao to bhi list bani rehti hai, aur har package ka URL seedha clickable hota hai.

⚠️ Shart ek hi hai: sheet aur docs **"anyone with the link"** pe shared rehne chahiye.

### ⚠️ Google formatting **class** se bhejta hai, tag se — aur ye ek galti thi jo pakdi gayi

Pehle maana gaya tha ki bold inline `style="font-weight:700"` se aata hai, aur uska demo bhi
"chal gaya" — kyunki demo ka HTML khud likha gaya tha. Asli export aisa hai:

```html
<style>.c2{font-weight:400}  .c4{font-weight:700}</style>
<p class="c0"><span class="c4">Port Blair</span> and Neil.</p>
```

`<strong>` kahin nahi hai — bold ki poori jaankari **`.c4` ke naam me** hai. Seedhe `class` hata
dene se client ka **saara bold aur italic chup-chaap gir jaata**, aur pata tab chalta jab wo
live page kholta.

Isliye `core/google-html.js` do kadam me chalti hai aur kram badla nahi ja sakta: pehle
`<style>` padh kar class ka naksha, phir `<span class="c4">` → asli `<strong>`. Safai uske
**baad** hoti hai.

⚠️ Iska profile `sanitize-html.js` walon se **alag** hai. `BLOCK` profile `class`/`style`
jaan-boojh kar allow karta hai (D-80 — client ko HTML tab me apni class likhni thi). Yahan
source alag hai: ye class client ne nahi likhi, **Google ne thopi** hai.
**Profile source ke hisaab se chunna chahiye, field ke hisaab se nahi.**

### Teen nateeje — aur `draft` client ka apna faisla hai

| Nateeja | Kab |
| --- | --- |
| **Published** | sab kuch resolve ho gaya |
| **Draft** | package **ban gaya**, par koi reference nahi mila |
| **Failed** | package ban hi **nahi saka** — naam nahi tha, ya doc nahi khuli |

Client ne kaha tha: _"rok do publish mat karo, aur status me dikhta jayega ki kya choota hai aur
draft ban jayega"_. Yaani content chala jaana chahiye, sirf publish rukna chahiye.

Matching **case aur extra space maaf** karti hai, spelling nahi — _"case sensitive to use krna
chahiye ek dum strict nahi karna hai baki spelling mistake hone par rok do"_. `havelock` =
`Havelock`; `Havelok` rukta hai.

⚠️ **Importer master list me kabhi naya naam nahi banata.** Ek typo `Havelok` us list me ghus
gaya to wo hamesha ke liye wahan rahega aur usse bane saare page usi galat naam pe rahenge.

⚠️ **Ek naam do jagah milna bhi blocker hai.** Taxonomy ki uniqueness `slug` pe hai, `name` pe
nahi — do destination ka naam sach me "Havelock" ho sakta hai. Chup-chaap pehla utha lena
**galat hotel** live page pe daal deta.

### Preview ki screen jaan-boojh kar nahi hai

Ek baar wo plan me thi. Client ne hata di — _"20 packages ka review thodi dekhega"_ — aur wo
theek tha: preview ka asli kaam content dekhna nahi, **galti pakadna** tha, aur wo import ke
**baad** wale nateeje me utni hi achhi tarah ho jaata hai. Flow ab do kadam ka hai:
sheet do → Import → Result.

### Mapper wo data kabhi nahi bhejta jise service thukra degi

`assertPackageRefs()` kuch cheezein **422** ke saath phenkta hai jo Zod me hain hi nahi — ek hi
category do baar, `strikePrice` jo `priceFrom` se bada na ho, ek hi `destinationId:category`
jodi do baar. Mapper wo bhej de to **poora package fail** ho jaata, sirf ek daam ki galti pe.

Isliye har aisi shart `mapper.js` me **pehle** dekhi jaati hai aur uska nateeja ek issue banta
hai, exception nahi. Wahi baat lambai ki hadd pe: line kaat kar note likha jaata hai, kyunki ek
61 character ki `Transfer Duration` ki wajah se package rukna galat hai.

Iska test mapper ka output **asli Zod schemas se guzarta hai** — aur usi ne ek asli bug pakda:
`₹` ka entity (`&#8377;`) decode nahi ho raha tha, to `₹24,999` se `837724999` ban raha tha, jo
`pricingSchema` ki hadd paar kar ke poore package ko giraata.

### Dobara chalana surakshit hai — aur do jaal yahin the

Pehchan **slug** se hoti hai. Do cheezein iske bina toot jaati hain:

1. `createEntry` `status: 'published'` ko **chup-chaap `draft`** kar deta hai — isliye hamesha
   do call: `createEntry()` phir `publishEntry()`.
2. `resolveSlugAndPath()` slug ka takrav dekh kar chup-chaap `-2` laga deta hai, **aur trash me
   padi entry bhi slug pakde rehti hai**. Us `-2` wale page ko agla run pehchanta hi nahi, aur
   har run ek aur duplicate banata. Isliye slug pehle se dekha jaata hai, aur trash wali entry
   pe saaf message aata hai.

⚠️ **Pehle se published page dobara publish nahi hota.** Wo `version` phir badha deta, ek aur
revision likhta, aur `publishAt` ko aaj pe reset kar deta — yaani bees package ki "Published on"
har import pe badal jaati.

⚠️ **Live page naye blocker ki wajah se neeche nahi laaya jaata.** Ek hotel ke naam ki typo
bees live page utaar de — wo aapdaa hoti.

⚠️ Din aur hotel ke `id` **tay** hain (`d1`, `dest-pb:standard`), random nahi. `normalizeFields`
bina `id` wale ko har baar naya `randomUUID()` de deta hai — yaani har import pe har din "naya"
ban jaata aur revision me poora itinerary badla hua dikhta.

### Kaam ek request me kyun nahi hota

Naapa gaya: ek doc ~**0.5s** me aata hai. 20 doc = ~10s sirf laane me, uske upar create +
publish + revalidate, aur banner image ki `sharp` processing. Asli kul **30–120 second**.

Ek HTTP request itni der nahi ruk sakti (production ka reverse proxy 60s pe kaat deta hai, aur
admin ke axios pe koi timeout hai hi nahi). Sabse bura hissa: us waqt tak **kuch import ho chuka
hota hai** aur client ko pata hi nahi chalta ki kya bana.

Isliye run DB me banta hai aur turant laut jaata hai; rows ek-ek karke chalti hain (`index.js`
me 2s ka tick, `publishDueEntries()` wala hi claim-loop pattern); admin **poll** karta hai.
SSE nahi — is codebase me wo hai hi nahi, aur ek chhote feature ke liye naya transport gadhna
theek nahi tha.

⚠️ Rows ek saath nahi chalti: `resolveSlugAndPath()` padho-phir-likho hai, do row ek saath ek
slug pe pahunche to dono duplicate bana deti hain. Google bhi anonymous export pe throttle
karta hai, aur `sharp` isi process ka CPU khaati hai.

⚠️ Timer `app.js` me **nahi** hai — wahi wajah jo scheduled publish pe likhi hai: har test file
apna timer chalu kar deti aur vitest kabhi khatam na hota.

### Banner image — repo ka pehla user-controlled outbound URL

`Banner Image URL` client ke doc se aata hai, yaani use koi bhi likh sakta hai jise doc pe edit
ka haq ho. Bina rok ke wo `http://169.254.169.254/…` (cloud metadata) ya `http://localhost:4000/…`
(hamari apni API, auth ke peeche se) daal sakta hai — ye **SSRF** hai. `core/revalidate.js` pe ye
khatra nahi tha: uska pata config se aata hai.

Isliye hostname resolve kar ke uska **asli IP** dekha jaata hai (sirf naam dekhna kaafi nahi —
`evil.example.com` bhi `127.0.0.1` pe point kar sakta hai), `https`/`http` ke alawa kuch nahi,
`content-type` image hona chahiye, aur byte cap `MAX_UPLOAD_MB` se aata hai.

Drive ka share link (`drive.google.com/file/d/…/view`) **HTML ka page** deta hai, image nahi —
use `uc?export=download` me badla jaata hai. Phir bhi image na mile to **sirf image fail hoti
hai, package nahi**.


⚠️ **Par sabse aam banner URL bahar ka hota hi nahi — wo hamara apna hota hai.** Ye pehle asli
import pe pakda gaya (4 Sep): client ne admin me apni image ka **"File URL" copy** kiya aur doc
me chipka diya —

```
http://localhost:5173/uploads/sites/default/media/2026/09/6a982ced…/large.webp
```

Importer use bahar ka URL samajh kar download karne gaya, aur SSRF guard ne `localhost` ko
**theek hi** roka. Package draft reh gaya aur client ko ek aisa error mila jo uski galti jaisa
lagta tha — jabki usne bilkul sahi image chuni thi.

Download karna waise bhi galat tha: wo image **pehle se Media me hai**, aur har run uska ek naya
record aur teen naye WebP variants bana deta.

Ab URL pehle apni hi media ke liye dekha jaata hai. Media ki **id URL ke andar hi likhi hoti
hai** (`buildMediaVariantKey()` ka format), to use utha liya jaata hai — koi download nahi, koi
duplicate nahi, aur dev aur production dono me ek jaisa. Media library me wo image na ho to saaf
blocker milta hai, ek network error nahi.

### Test me network chhua hi nahi jaata

Is repo me HTTP mocking ka koi pattern nahi tha. `vi.stubGlobal('fetch')` chhoda gaya — wo
global badal deta hai aur uska risaav doosri files tak jaata hai. Uski jagah wahi shakl li gayi
jo `createMediaFromUpload(input, { storage })` pe pehle se hai: **dependency argument se aati
hai**. `startImport()` aur `processImportQueue()` `deps.fetchImpl` lete hain.

### Ek aur cheez jo build ke waqt pata chali

**Hotel ka apna record bhi `category` rakhta hai** — Hotels ki list (destination × category) pe
bani hai, isliye ek hi naam kai category pe ho sakta hai. Sirf naam se dhoondhne pe har hotel
line "ek se zyada mile" wala blocker deti. Ab pehle usi category me dhoondha jaata hai jo doc ke
label ne batayi (`Deluxe Hotel` → deluxe). Hotel ki apni category label se alag ho to wo
**note** hai, blocker nahi — wo galti bhi ho sakti hai aur jaan-boojh kar bhi.


### FAQs — `Question` / `Answer` ki jodi (client, 4 Sep)

Pehle version me FAQ ka **koi label tha hi nahi**, isliye har imported package pe `faqs: null`
rehta tha. Client ne format chuna: `FAQs` heading, phir jitni baar chahiye
`Question` → sawaal → `Answer` → jawab.

Numbering **nahi** hai (`Day 1` jaisi) — har `Question` khud hi naya FAQ shuru kar deta hai.
Client ko har sawaal pe ginti likhna ek aur cheez hoti jo galat ho sakti thi.

⚠️ **Sawaal plain text hai, jawab HTML.** `faqSchema` yahi kehta hai aur page bhi wahi dikhata
hai: sawaal `<summary>` me jaata hai (wahan markup ka koi matlab nahi) aur jawab `<details>` ke
andar, jahan paragraph aur bullets dono chalte hain.

⚠️ Bina jawab wala sawaal **chhod diya jaata hai** — page pe wo ek aisa sawaal banta jise kholne
par kuch milta hi nahi. Schema use rok nahi paata (`answer` ka default `''` hai), isliye rok
mapper me hai, ek note ke saath.

Isi ke saath parser ab **teen hisson** me chalta hai (upar ka hissa · itinerary · FAQs), aur
section marker har hisse me pehchane jaate hain. Bina uske itinerary ke baad likha `FAQs` ek din
ka label samajh liya jaata aur poori FAQ list chup-chaap itinerary me chali jaati. Kram tay nahi
hai — client FAQs pehle likhe ya baad me, dono chalta hai.

### Client ko batane wali do baatein

- **Template me chaar price line jodni hain** (`Standard Price` … `Luxury Price`). Unke bina
  page pe **na daam dikhega na koi hotel category** (D-56 — khaali daam ka matlab hai "ye
  category milti hi nahi")
- **Hotel ke naam copy-paste karne honge**, type nahi. Asli naam lambe hain (_"Beachfront resort
  at Laxmanpur or similar"_), aur ek akshar galat hone pe row draft banegi

### Bacha hua

`tools.import` abhi **sirf admin** ke paas hai (migration 021 ne roles sync kiye). Editor ko bhi
chahiye to wo `ROLE_PERMISSIONS` me ek line aur ek nayi migration hai.

v1 me sirf **packages** import hote hain. Client ne "other pages" bhi kaha tha, par unka koi
template abhi nahi hai — uske bina parser andaaze pe banta.

---

## D-82

**Itinerary Settings, aur structured data ki teen galtiyaan** (client, 4 Sep)

Live check karte hi chaar cheezein nikli. Teen schema ki thi, ek admin ki.

### 1 · `aggregateRating` `TouristTrip` pe valid hi nahi tha

Google ka validator saaf keh raha tha:

> _"The property aggregateRating is not recognised by the schema for an object of type
> TouristTrip."_

Wo sahi tha. schema.org me `aggregateRating` `Product`, `Offer` aur `Event` jaison pe hai,
`Trip` pe hai hi nahi.

Isliye ek **`Product` node** juda, aur rating wahan gayi. Do faayde ek saath:

- **Error chala gaya** — jo tha wo galat markup tha
- **Rich result ab sach me mil sakta hai** — `TouristTrip` khud kisi rich result ko power nahi
  karta; `Product` karta hai. Search me daam aur ⭐ isi se dikhte hain

⚠️ Toggle ka naam shuru se **"Emit Product + Trip schema"** tha — yaani Product wala aadha hissa
kabhi bana hi nahi tha. Naam sahi tha, code adhoora.

⚠️ Daam aur rating dono node pe **ek hi source** se aate hain. Alag ho jaate to wo Google ki
nazar me "misleading structured data" hai, aur wo manual penalty wali shreni hai.

### 2 · Din ka plan schema me jaata hi nahi tha

Pehle sirf `itinerary` jaata tha — yaani **jagah** ka kram (Port Blair → Havelock → Neil). Ab har
din ek **`subTrip`** hai, title aur poore description ke saath.

Dono chahiye aur dono alag hain: `itinerary` batata hai **kahan**, `subTrip` batata hai **kya
hota hai**. Din hi page ka sabse bada hissa hai, aur wo search engine tak pahunch hi nahi raha tha.

### 3 · `stripTags` do vaakya chipka deta tha

Block tag ki jagah **kuch nahi** aata tha, to `…settle in.</p><p>In the evening…` jud kar
`settle in.In the evening` ban jaata. Ye FAQ ke jawab pe bhi lag raha tha — 1 Sep se.

### 4 · Toggle per-package tha, aur isi wajah se kabhi chala hi nahi

`entry.fields.seoSchema` Slice 3 se tha. Live dekhne pe **paanchon package pe wo `false`** mila —
yaani ek bana-banaya feature teen din bekaar pada raha, sirf isliye ki default off tha aur kisi
ne 5 checkbox nahi tick kiye.

Aur wo per-package faisla hai bhi **nahi**: site ya to structured data bhejti hai ya nahi. "Is
package pe bhejo, us pe mat bhejo" ka koi matlab nahi banta.

Ab wo `packageDefaults.seoSchema` hai, **default `true`**, aur uski screen
**Packages ▸ Itinerary Settings** hai. Migration 022 ne purana field entries se hata diya.

### Itinerary Settings — do cheezein code se nikal kar settings me aayi

| Pehle | Ab |
| --- | --- |
| `entry.fields.seoSchema` | `packageDefaults.seoSchema` |
| API me `limit(12)` | `packageDefaults.similar.total` |
| `Similar.jsx` me `const PER_PAGE = 3` | `packageDefaults.similar.perPage` |

Client ko Similar cards ke do number chahiye the (_"i put 10 and i want to show 5 then
pagination"_), aur uske liye do alag file chhoona padta.

⚠️ **Defaults wahi hain jo aaj ka vyavhaar tha** (12 aur 3). Ek naya field aane bhar se kisi
chalte hue page ka look nahi badalna chahiye.

Screen alag hai, `PackageDefaults.jsx` me chautha mode nahi joda: wo pehle se teen mode sambhalti
hai aur 700 line ki hai, jabki in do settings ka usse kuch saanjha nahi.

### ⚠️ Migration format karke chalao, chala kar format mat karo

022 chalne ke **baad** prettier ne use format kiya, aur checksum guard ne turant pakad liya —
theek wahi jo 020 pe hua tha. Wo migration idempotent thi (`$exists` guard + `$unset`), isliye
record hata kar dobara chalane se data pe kuch nahi hua.

Do baar ho chuka hai, to niyam likh dena chahiye: **`pnpm format` pehle, `pnpm cms migrate` baad
me.**

### Bulk Upload me New / Existing mode

Import ke saath ab ek **elaan** jaata hai: sheet me naye package hain ya purane. Default `new`.
Jo row us baat se alag nikle wo **Failed** hoti hai, wajah ke saath.

Ye filter **nahi** hai, aur wajah suraksha ki hai: bina iske ek purana `Package URL` galti se
nayi sheet me reh jaaye to wo ek **live package ko chup-chaap overwrite** kar deta — technically
ek sahi update, par client ke iraade ke bilkul ulta. Jaanch `createEntry`/`updateEntry` se
**pehle** hoti hai, warna nuksaan ho chuka hota hai.

⚠️ UI me ye **radio** hain, checkbox nahi. Client ne "do checkbox" kaha tha par matlab ek chunav
hai — do checkbox se "dono" aur "koi nahi" wali do aisi haalat ban jaati jinka koi matlab hi
nahi hota.

Past imports me **New** aur **Existing** ki ginti judi. Wo `row.action` se aati hai, `run.mode`
se nahi: mode wo hai jo client ne **kaha**, action wo jo sach me **hua**. Alag ho jaayein to wahi
dikhna chahiye.

### Enquiries ke do chhote fix

- **Package column khaali aa raha tha.** Client ke form me `package` naam ka field hai hi nahi —
  usme `hotelCategory` hai. Ab pattern usse bhi milta hai, aur column ka heading field ke apne
  `label` se banta hai, to wo khud **"Hotel category"** kehne lagta hai. Kahin koi hardcoded naam
  nahi
- **Enquiry Detail ke khaane ab ek line me ek.** Teen column me aankh naam-mobile-email tak baar
  baar ghoomti thi; enquiry ek **record** hai jise upar se neeche padha jaata hai

---

## D-83

**ISR cache sach me on — `revalidate` tags ke _saath_, unki _jagah_ nahi**
_4 Sep 2026 · D-14 ka palan, uska badlaav nahi_

### Sawaal

Sawaal poochha hi nahi gaya tha — ye ek chup bug tha jo live check pe nikla. Har page load pe
`apps/web` ki chaaron public call (settings · menu · resolve · package-defaults) API tak jaa
rahi thi, **har baar**. Jabki D-14 se ISR ka poora dhaancha maujood tha.

### Wajah

`lib/cms.js` me fetch aisa likha tha:

```js
fetch(url, { next: { tags } })
```

Next **15** me `fetch` ka default **`no-store`** hai (14 me `force-cache` tha). Sirf `tags`
dene se kuch cache hota hi **nahi** — wo bas tag chipkaata hai, jise saaf karne ke liye baad me
koi aata hai. Yaani ek aisi cheez invalidate ho rahi thi jo kabhi bani hi nahi.

### Faisla

`revalidate: 3600` ab `tags` ke **saath** jaata hai:

```js
fetch(url, { next: { tags, revalidate: CACHE_SECONDS } })
```

**Ye D-14 ka badlaav nahi hai.** Asli invalidation aaj bhi **tag** se hoti hai aur turant hoti
hai — admin me kuch badla, API `POST /api/revalidate` maarti hai, wahi tag saaf. Number us par
**bharosa nahi** karta; wo ek doosri deewar hai.

### Kyun ek number chahiye tha, jabki tag pehle se hai

`core/revalidate.js` jaan-boojh kar **fail-soft** hai — girne pe sirf `logger.warn`, publish
nahi rukta (aur wo theek hai: cache ki dikkat content ko bandhak nahi bana sakti). Par uska
seedha matlab ye hai ki **ek chhooti hui revalidate call** ke baad wo page **hamesha ke liye**
purana reh jaata.

Aur wo failure poori tarah chup hoti: admin me naya content dikhta, site pe purana, kahin koi
error nahi. Ek ghanta isliye ki wo dono taraf sasta hai — normal haalat me tag pehle hi saaf
kar chuka hota hai (yaani ye number kabhi lagta hi nahi), aur webhook toota ho to nuksaan ek
ghante tak seemit rehta hai.

### Sabak

**Jo cheez cache hui hi nahi, uske invalidation ka koi matlab nahi.** Is repo me revalidate ka
raasta poora bana hua tha — route, `tagsFor()`, `path:` tag (D-52), path badalne pe purane tag
ka bhejna. Sab kuch maujood, aur teen hafte tak ek din bhi chala nahi. Iska koi test fail nahi
ho sakta tha: test cache layer ke aar-paar se guzarte hi nahi.

Yahi shakl D-42 §2 wali hai — **invariant delivery layer pe toot-ta hai**, data layer sahi
hone ke bawajood.

⚠️ Saath me ek purana diagnosis galat nikla, wo yahin likha ja raha hai: **favicon theek hai.**
`layout.jsx` use settings se pehle se nikaal raha hai aur page pe `<link>` maujood hai. Wo 404
tab dekha gaya tha jab favicon upload hi nahi hua tha.

---

## D-84

**Media ek saal ke liye `immutable`, aur `srcset` payload me banti hai — theme me nahi**
_4 Sep 2026 · performance ka pehla pass_

### Sawaal

Client ka lakshya: _"Make sure it is fast, can serve page from cache and score of 100 in
Google Page Speed."_ D-83 ne HTML ka cache to on kar diya, par page ka sabse bhaari hissa
HTML hai hi nahi — **images hain**. Un par do alag galtiyaan chal rahi thi.

### 1 · `Cache-Control: public, max-age=0` — har image, har visit pe

`express.static` ka default yahi hai, aur wo tab tak dikhta nahi jab tak koi naapne na
jaaye. Nateeja: package page ki **12 image**, har visitor, har baar — baarah revalidation
round trip, sirf ye poochhne ke liye ki jo file pichli baar mili thi wo abhi bhi wahi hai.

Ab `max-age=31536000, immutable`.

**`immutable` likhne ka haq kahan se aata hai:** us URL ka jawab kabhi badalta hi nahi,
kyunki path me media ki apni id **aur** variant ka naam dono hain
(`.../media/2026/09/<mediaId>/large.webp` — `buildMediaVariantKey`). Nayi file = nayi media
= nayi id = naya URL. Purani file apni jagah pe overwrite hoti hi nahi.

⚠️ **Jis din "replace file" banega, ye line jhooth ho jaayegi.** Wo aaj D-79 me scope se
bahar hai. Us din do me se ek karna hoga: ya replace naya `_id` de, ya URL me content hash
jude. Bina uske browser purani image **saal bhar** dikhata rahega, aur server uska kuch nahi
kar sakta — `immutable` ka matlab hi yahi hai ki browser poochhta tak nahi. Ye chetavni
`app.js` me us line ke upar bhi likhi hai.

### 2 · Har image ek hi variant — chahe slot kitna bhi chhota ho

D-41 se teen variant bante hain (thumb 300 · medium 800 · large 1600), par payload me
**ek** jaata tha. Yaani similar card ka 150px ka khaana bhi 800px chaudi `medium` uthata
tha, phone pe bhi. Browser ke paas chunne ka koi raasta nahi tha — aur chunna wahi sabse
achha kar sakta hai, kyunki DPR, asli layout width aur network sirf usi ko pata hote hain.

Ab `toDisplayImage` ek **ready `srcset` string** bhi bhejti hai.

**String server pe banti hai, theme me nahi** — wahi tark jo `toSectionLabels()` (D-65) pe
tha: variant ka URL kaise banta hai ye media module ka bhed hai. Theme ko wo jodna sikhaane
ka matlab hota ki kal variant ka naam badle to **do repo** badalne padein.

⚠️ **Width se dedupe zaroori hai.** `generateWebpVariants` me `withoutEnlargement: true` hai
— 500px chaudi original pe `medium` aur `large` **dono** 500px bante hain. Ek hi width do
baar bhejna galat to nahi, par bemaani hai. Ek hi variant bache to `srcset` `null` jaata
hai: wo `src` se alag kuch keh hi nahi raha hota.

`sizes` **payload me nahi hai, aur jaan-boojh kar nahi hai** — wo layout ki baat hai, media
ki nahi. Ek hi image header me 200px me baithti hai aur popup me poori screen leti hai.

### 3 · `<Img>` — teen cheezein jo ab har jagah ek jaisi hain

Har `<img>` ab `components/Img.jsx` se banta hai:

| | Pehle | Ab |
| --- | --- | --- |
| `width` / `height` | 12 me se **6** pe | **12/12** — CLS ke liye |
| `loading` | kahin `lazy`, kahin kuch nahi | LCP wali ke alawa sab `lazy` |
| `fetchpriority` | kahin nahi | **sirf hero pe** |

`priority` aur `eager` do alag prop hain. Header ka logo `eager` hai par `priority` nahi:
wo dikhta pehle se hai (isliye `lazy` usko sirf der karta), par usko hero se **aage** bhejne
ka koi matlab nahi. `fetchpriority="high"` ek page pe kai jagah likh dena use bemaani bana
deta hai — jab sab kuch zaroori ho to kuch bhi zaroori nahi.

Image na ho to `<Img>` **kuch render hi nahi karta** — D-42 §2 ki doosri deewar.

### 4 · `Lightbox` ab click pe load hota hai

Popup ka poora JS — auto-slide timer, keyboard handlers, swipe, focus trap, scroll lock —
har visitor utaarta, parse karta aur hydrate karta tha, chahe wo popup kabhi khole hi na.
Zyadatar kabhi nahi kholte. Ab `next/dynamic` (`ssr: false`) — uska pehla render waise bhi
click ke baad hi hota tha.

### ⚠️ Jo is pass me naapa **nahi** gaya

Ye saare badlaav **wajah** se liye gaye hain, kisi Lighthouse run se nahi. Us waqt tak
production build chalana mumkin nahi tha (dev server aur do tunnel chal rahe the), aur
**dev server pe naapa hua number bemaani hota hai** — na minification, na HTML ka cache, aur
upar se dev overlay ka apna JS.

Ek daawa jaan-boojh kar wapas liya gaya: hero gallery ka client-side shuffle (26 Aug ka
client faisla) LCP ko kitna bigaadta hai — ye **theory se** kaha gaya tha aur naapa nahi gaya
tha. Us feature ko naap se **pehle** chhedna galat hoga.

⚠️ Aur ek scoping ki baat jo `100 on all pages` maangne se pehle jaanni chahiye: is site pe
aaj **sirf paanch page hain**, paanchon package. `/` khud **404** deta hai (koi home entry
nahi), aur Pages/Posts ke template abhi bane hi nahi hain (**A-9**).

---

## D-85

**Speed — naap ke saath: mobile 68 → 91, desktop 98**
_4 Sep 2026 · client ka lakshya: "fast, serve page from cache, score of 100"_

D-84 wajah se liya gaya tha, naap se nahi. Ye uska agla kadam hai — **pehle Lighthouse
chalayi, phir sirf wahi cheez chhui jo number me dikhi.**

### Naapne ka tareeka (kyunki bina iske number jhooth bolte hain)

| | |
| --- | --- |
| Kahan | `next build` + `next start`, **dev server pe nahi** |
| Kaise | Lighthouse mobile — 412×823, DPR 1.75, 1.6 Mbps, RTT 150ms, **CPU 4× dheema** |
| Kitni baar | **5 run ka median.** Ek run bekaar hai |

⚠️ **Is machine pe noise bahut hai.** Ek hi build pe TBT 70ms se 1270ms tak aaya. `benchmarkIndex`
1317 se 2536 tak jhoolta hai — yaani ~2× ka farak. Isliye har number median hai, aur jis run me
`benchmarkIndex` gir jaaye use padhna bekaar hai. Docker Desktop, VS Code aur do Chrome saath
chal rahe the.

### Kya nikla — aur kya **nahi** nikla

| Shak | Naap ka jawab |
| --- | --- |
| CSS bhaari hai (118 KB) | ❌ **Galat.** Minify + gzip ke baad 10.5 KB. Style recalc kul **62ms** |
| `:has()` selectors mehnge hain | ❌ **Galat.** Hatane pe Style & Layout **bilkul nahi** ghata |
| RSC flight data (139 KB inline) parse ho raha hai | ❌ **Galat.** Uska script eval **26ms** |
| Layout mehnga hai | ✅ **Sahi.** `Layout` 639ms — sirf **8 event**, aur do sabse bade (407ms + 228ms) poore **1366 element** ka full layout |

Teen shak galat nikle, aur teenon pe kaam shuru karne se pehle naap liya gaya. Yahi is
decision ka asli hissa hai.

### Chaar badlaav, har ek ka apna naap

**1 · Hero ka shuffle server pe (`lib/hero.js`)** — sabse bada.

`Gallery` `useEffect` me shuffle karti thi. Naap me wo aise dikha: 228ms pe paanch image jaati
thin, aur phir **862ms pe paanch aur** — hydration ke baad wali. LCP wali image inhi doosri
paanch me se ek thi.

Ab chunav server pe hota hai, **har request pe** — refresh pe hero phir bhi badalta hai (client
ki 26 Aug wali baat jyon ki tyon), par browser ko wo pehle se HTML me milta hai.

> LCP **6.5s → 3.5s** · CLS **0.147 → 0** (wo shift bhi yahi tha)

⚠️ Ye tabhi chalta hai jab route `ƒ Dynamic` ho. Static/ISR banaane pe randomness **jam
jaayegi** — chetavni `lib/hero.js` me hai.

**2 · `content-visibility: auto` — `.blk` sections, footer, closing CTA**

Page 9800px lamba hai aur poora layout pehle paint se pehle hota tha.

> TBT **834ms → 128ms** · Style & Layout **2952ms → 1043ms** · score **70 → 84**

⚠️ **Iski ek dikhne wali keemat hai, aur wo client ka faisla hona chahiye:** jab tak koi section
render nahi hua, uski unchai `contain-intrinsic-size` se **andaazan** hoti hai. Asli sections
350px se 3145px tak ke hain, isliye pehli baar scroll karte waqt **scrollbar apna naap badalta
hai** (naapa: mobile ~790px, desktop ~1340px ka farak). Ek baar dikh jaane ke baad browser asli
naap yaad rakhta hai (`auto` keyword), to ye sirf pehle scroll pe hota hai.

**3 · Ek character — ₹ — 85 KB ka font utaar raha tha**

Inter ke `latin` subset me rupee ka nishan hai hi nahi; wo **latin-ext** me hai. Page pe ₹ **34
baar** aata hai, aur uske liye browser poori latin-ext file maangta tha — **85 KB**, ek glyph ke
liye, mobile ke link pe ~425ms bandwidth.

Ab ek `@font-face` hai jo kuch **download nahi karta** (`src: local(...)`) aur `unicode-range`
se **sirf ₹** tak seemit hai. Baaki har character Inter ka hi rehta hai.

> Font bytes **133 KB → 48 KB** · FCP **1993ms → 1417ms**

⚠️ Dikhne wala asar: ₹ ab machine ke apne font ka hai, Inter ka nahi.

**4 · Inter ab variable font** — `weight: [...]` hata diya. Chhe static instance ki jagah ek
variable file. Design me kuch nahi badalta (100–900 ka poora range milta hai).

### Nateeja

| | Pehle | Ab |
| --- | --- | --- |
| **Mobile** | 68 | **91** (median, 5 run) |
| **Desktop** | — | **98** |
| FCP | 2.0s | 1.42s |
| LCP | 6.5s | 3.35s |
| TBT | 150ms* | 103ms |
| CLS | 0.147 | **0** |

\* baseline ka TBT ek hi (noisy) run ka tha.

### ⚠️ 100 abhi nahi mila — aur kyun nahi mila

**Sirf LCP bacha hai** (3.35s, chahiye 2.5s se kam). FCP, TBT, CLS, SI — chaaron ab poore
number pe hain.

Aur LCP ab **bandwidth ka sawaal** hai, code ka nahi. Emulated 1.6 Mbps par is page ka saara
saamaan ~440 KB hai: 43 KB HTML + 10 KB CSS + 140 KB JS + 48 KB font + ~200 KB images. Utne
bytes utarne me hi ~2.2 second lagte hain.

Do raaste bache hain, dono me kuch dena padta hai:

| Raasta | Faayda | Keemat |
| --- | --- | --- |
| **Ek naya image variant (~480w)** | ~120 KB kam. Gallery ke chaar chhote tile abhi 800px wali image uthate hain (unhe 320px chahiye) — kyunki `thumb` 300 aur `medium` 800 ke beech kuch hai hi nahi | D-41 ke variants badalne padenge, aur **purani media ka backfill** — original file store hoti hi nahi (sirf variants), to naya variant `large` se banana hoga |
| **Page chhota karna** | HTML 221 KB aur 1366 element — dono seedha LCP pe lagte hain | Ye **content ka faisla** hai, code ka nahi (R15) |

⚠️ **Aur ek scoping ki baat:** ye poora naap **package page** ka hai. Site pe aaj paanch hi page
hain, paanchon package. `/` khud 404 deta hai (A-17).

### Ek koshish jo **kaam nahi aayi** — aur wo yahan isliye likhi hai

`Reviews` aur `Similar` ko `next/dynamic` pe daal kar dekha. Dono client components hain aur
fold se bahut neeche hain (mobile pe ~8400px aur ~9500px), to lagta tha ki unka JS baad me
utaara ja sakta hai.

| | Pehle | `dynamic()` ke saath |
| --- | --- | --- |
| First Load JS | 138 kB | **138 kB** |
| Page pe kul JS | 141 KB | **141 KB** — koi naya chunk bana hi nahi |
| Mobile score (5 run ka median) | 91 | **91** |

**Wajah App Router ke dhaanche me hai.** `ssr: false` yahan daala hi nahi ja sakta — reviews
aur similar packages page ka asli **SEO content** hain, unhe crawler ko dikhna chahiye. Aur
`ssr: true` ke saath dono ka HTML server pe banta hai, yaani unka JS **hydration ke liye chahiye
hi chahiye**; Next use route ke bundle me hi rakhta hai.

In dono ka JS bachane ka ek hi asli raasta hai: inhe client components na banana. Aur wo ho nahi
sakta — ek me slider ke arrows ka state hai, doosre me client ki maangi hui `1 2 3` pagination.

`dynamic()` wapas hata diya gaya (jo cheez daawa kuch kare aur kare kuch na, wo rehni nahi
chahiye), par **koshish ka record `PackagePage.jsx` me hai** — wo koshish wajib lagti hai aur
koi phir karega.

⚠️ **`Lightbox` par yahi cheez sach me chalti hai** (`Gallery.jsx`). Farak ye hai ki wo
`ssr: false` pe hai: uska HTML server pe banta hi nahi, wo sirf click ke baad aata hai.

**Ek cheez phir bhi bachi:** `HeroRating` aur `RatingNote` ab apni file me hain
(`Rating.jsx`, server components). Wo `Reviews.jsx` me thin — yaani do **pure display**
component sirf isliye client bundle me ja rahe the ki wo ek client component ki file me baithe
the. Bachat chhoti hai, par jagah galat thi.

---

## D-86

**Bulk Upload har run pe duplicate bana raha tha — aur `Package URL` ab zaroori hai**
_4 Sep 2026 · asli data pe pakda gaya · client ka faisla_

### Kaise pakda gaya

Client ne kaha: _"last two imports dekho koi content change nahi hua fir bhi duplicate ban gaye"_.
DB me dekha to ek hi doc ne **saat live page** bana rakhe the:

```
13:03:59  created  /packages/andaman-tour-from-dehli-package
13:06:15  created  /packages/andaman-tour-from-dehli-package-2   ← base tab live tha
13:07:32  created  ...-3
13:08:22  created  ...-4
13:08:44  created  ...-5
13:20:07  created  ...-6
13:21:34  created  ...-7
```

Har run "Published" bolta raha. Aur **usi run me** doosri row (`andaman-escape-5-nights`) theek se
`Failed` ho rahi thi — _"already exists… choose Existing packages"_. Yahi wo surag tha: guard
kaam kar raha hai, par is doc pe lag nahi raha.

### Jad — dhoondhne ka slug aur save karne ka slug do alag the

| | Pehle |
| --- | --- |
| save (`resolveSlugAndPath`) | `slugify(Package URL \|\| Package Name)` |
| dhoondhna (`importRow`) | `parseSlug(Package URL)` — na `slugify`, na title ka fallback |

`parseSlug()` sirf URL ka aakhri tukda kaat_ta hai; bade akshar jaise ke waise chhod deta hai.
Client ne doc me `Andaman-tour-from-dehli-package` likha tha (**bada A**). DB pe chala kar dekha:

```
findEntryBySlug("Andaman-tour-from-dehli-package")  ->  kuch nahi mila     ← Mongo case-sensitive
findEntryBySlug("andaman-tour-from-dehli-package")  ->  MILA
```

Aur us ek `null` se **teen** cheezein ek saath chup ho gayi thi:

1. **New/Existing ka guard** — `existing` khaali, to mode ki jaanch hui hi nahi
2. **Trash wala guard** — `existing?.deletedAt` kabhi sach hua hi nahi. Wo message shuru se
   likha tha aur **kisi ne kabhi dekha nahi**
3. **`createEntry`** ne slugify karke lowercase base maanga, wo pehle se tha, to `-2`… `-7`

Doosri shakl bhi wahi bug thi: `Package URL` doc me ho hi na, to `slug ? … : null` ki wajah se
**lookup hota hi nahi tha** — har run naya page.

### Fix 1 · Lookup wahi banega jo storage banata hai

```js
const lookupSlug = slugify(slug || input.title)
const existing = lookupSlug ? await findEntryBySlug('package', lookupSlug, siteId) : null
```

`slugify()` wahi function hai jo `resolveSlugAndPath()` chalata hai — dobara likhne ka matlab
hota ki kal wo badle aur ye peeche reh jaaye. Saath me mapper bhi ab **normalized slug** hi
bhejta hai (`slugify(parseSlug(...))`), warna `updateEntry` har baar "slug badla" samajhta.

### Fix 2 · `Package URL` ke bina page publish nahi hoga — client ka faisla

> _"agar doc me Package URL na ho to draft bane publish na ho ye thik hai… isse unnecessary page
> publish nahi honge"_

⚠️ **Dono "zaroori" ek jaise nahi hain, aur ye farak jaan-boojh kar hai:**

| Doc me nahi hai | Nateeja | Package bana? |
| --- | --- | --- |
| `Package Name` | **Failed** | ❌ naam ke bina banaya hi nahi ja sakta |
| `Package URL` | **Draft** | ✅ ban gaya, content poora — sirf publish ruka |

Wahi soch jo poore importer me hai: _content chala jaaye, sirf publish ruke_. Client URL likh kar
Existing mode me dobara chala de, page live ho jaata hai; uska likha hua kuch nahi khota.

⚠️ Wajah "khaali khaana" nahi, **khaali pehchaan** hai. Fix 1 ke baad bina URL wala doc bhi
idempotent ho chuka tha — par sirf tab tak jab tak naam na badle. Naam badalte hi derived slug
badal jaata aur agla import **doosra live page** bana deta, dono theek dikhte hue. Ye us raaste
ko band karta hai.

### Fix 3 · Import me suffix lagna hamesha galti ka nishaan hai

`resolveSlugAndPath()` takrav pe chup-chaap `-2` laga deta hai. Admin me wo theek hai (do page ka
naam sach me ek jaisa ho sakta hai), **import me kabhi nahi**: yahan ya to purana update hona tha
ya sach me naya banna tha — beech ka `…-7` kisi ne maanga hi nahi hota.

Ab resolved slug maange gaye slug se alag ho to wo **blocker** hai (Draft, `throw` nahi — package
ban chuka hai aur uska content bachna chahiye).

Fix 1 ke baad ye raasta lagbhag band ho chuka hai, isliye ye **un wajahon ke liye hai jo abhi
dikhi nahi**. Test reserved slug se likha gaya (`Package URL: uploads` → `uploads-2`), kyunki wahi
gine-chune bache hue raaston me se ek hai.

### Sabak

**Ek hi cheez ke do naam do jagah mat banao.** Yahan identity do jagah bani — ek `parseSlug` se,
ek `slugify` se — aur beech ki khaayi ne teen guard chup-chaap mar diye. Guard ka na chalna kabhi
error nahi deta; wo sirf **kuch na hone** jaisa dikhta hai.

⚠️ Aur ek cheez jo isi jaanch me dikhi aur abhi **theek nahi ki gayi**: DB me do collection hain —
`importRuns` (0 documents) aur `importruns` (20 documents, asli data). Mongoose apne aap lowercase
karta hai; `importRuns` shayad migration 021 ne banayi. Aaj kuch toot nahi raha, par agar us
migration ne index **khaali** collection pe banaye hain to asli data bina index ke chal raha hai.
`09-OPEN-ITEMS.md` **A-18**.

774 tests pass.

---

## D-87

**Tour Page — ek edit screen, blocks content editor me, aur rating per-package**
_7 Sep 2026 · client ka faisla · Slice A (neev) ban chuki hai_

### Sandarbh

Client ne teen nayi design reference di — `tour-v3.html` (package listing page),
`page-template.html` (14-block palette) aur `page-template-text.html` (text-first page).
`page-template.html` **scope se bahar** hai: wo Phase 5 ka block builder hai aur
`packages/blocks` abhi khaali (`export {}`).

Din bhar baat hui aur client **do baar palta**. Pehle "do template" tay hua tha — Text
article aur Package archive, ek chooser ke saath. Phir usne wo poora rad kiya:

> **Koi template nahi.** Ek hi edit screen, aur layout content editor ke blocks se aayega.

### Client ke 14 faisle

| # | Faisla |
| --- | --- |
| 1 | Tour ka **apna top-level menu**, Pages ke submenu me nahi |
| 2 | Koi template nahi — ek hi edit screen. Chooser, dropdown, switch-confirm sab rad |
| 3 | Edit screen: Title · Eyebrow · **Sub heading (editor)** · Stat rail · Content |
| 4 | Content editor me **blocks** — `Two column` · `Cards` · `Package list` · `FAQs` |
| 5 | Cards editor ke **andar**, alag panel nahi |
| 6 | Package list bhi editor ka block — jahan chaahein wahan |
| 7 | FAQs bhi block, aur uska **schema server pe us block se** banega |
| 8 | Package list ke filter: Package Type · Duration, **har duration ka apna count** |
| 9 | Byline poori tarah **automatic** — author · updatedAt · read time. Koi field nahi |
| 10 | Banner image Settings me universal. Page pe Featured image ho to wo jeetegi |
| 11 | Trust badges → **`Settings ▸ Tour settings`** |
| 12 | Breadcrumb label hataya — parent se auto |
| 13 | Eyebrow line rahegi — per-page |
| 14 | Sidebar + form placement per-page se hat kar **`Appearance ▸ Sidebar`** me |

### §1 — Do content type, ek field set

`page` aur `tourPage` do **alag types** hain, par unka field set **ek hi constant** hai
(`PAGE_FIELDS`). Alag type isliye ki client ne teen cheezein alag maangi (#1): apna menu,
apni list, apna URL — aur teenon `type` se hi aati hain.

Ek hi type me `isTour` jaisa flag rakhne ka matlab hota ki **har** list query, **har** nav
item aur **har** permission check us flag ko yaad rakhe. Ek jagah bhoolte hi Tour Pages
`All Pages` me chhap jaate.

Field set do copies me **nahi** rakha gaya, aur wo bhi soch kar: do copies ka matlab hota
ki kal koi ek me field jode aur doosre me bhool jaaye, aur wo farak **sirf ek type ke edit
screen pe** dikhe.

⚠️ `tourPage` bhi `/{slug}` par hai, `page` ki tarah — `/tours/{slug}` par nahi.
`PackagePage.jsx:95` ka `ARCHIVE_CRUMB` `/andaman-tour-packages/` pe link karta hai aur wo
aaj **404 deta hai**. Root pe hone se wo link bina kisi redirect ke sach ho jaata hai.
Do types ka ek URL space share karna safe hai: `{siteId, locale, path}` day 1 se unique hai
(§3.1), isliye dusra write duplicate key pe girta hai — chup-chaap overwrite nahi hota.

### §2 — Block ki settings HTML me nahi baith sakti thi

> ⚠️ **Superseded by §7** (usi din, shaam). Client ne demo dekh kar model palta — blocks ab
> `content.blocks[]` me hain, apne panel ke saath. Neeche wala hissa us waqt ka sach hai; wo
> kyun likha gaya wo padhna abhi bhi kaam ka hai, par **code ab aisa nahi hai**.

`Package list` block ke apne settings hain (Package Type, Destination, sort, per-duration
count). Teen raaste the:

| Raasta | Faisla |
| --- | --- |
| `data-*` attribute | ❌ `sanitize-html.js` ka `COMMON_ATTRS` sirf `class·id·style·title·dir·lang` deta hai. `data-*` kholna matlab sanitizer ka daayra **har** profile pe badhana (Overview, FAQ answer, itinerary din, cancellation policy) — R20 ka ulta |
| class name me encode | ❌ Nazuk aur padhne me bura; per-duration count jaisi nested setting isme aati hi nahi |
| **`id` + alag `fields`** | ✅ **Chuna gaya** |

Block ko `id` milti hai (`<div class="cms-package-list" id="blk-a1b2">`) aur settings
`fields.blocks['blk-a1b2']` me jaati hain. Do faayde: **sanitizer ko haath nahi lagta**, aur
shape `block.js` ke FROZEN `{id, type, props}` se hi aata hai — yaani Phase 5 ka asli
registry aane pe takrav nahi hoga.

⚠️ **Keemat maan li gayi hai:** settings do jagah hain. Client editor me wrapper delete kar
de to `fields` me entry bachi reh jaati hai. Wo apne aap galat kuch nahi karti — theme HTML
padhti hai aur sirf wahi blocks banati hai jo wahan hain — par safai `pruneOrphanBlocks()`
me hoti hai, aur wo **saaf ki hui** `content` par chalti hai, `input.content` par nahi.

⚠️ Safai **ek taraf** chalti hai: HTML me jo `id` nahi, uski settings jaati hain. Ulta kabhi
nahi — HTML me ek `id` bina settings ke ho sakti hai (naya block, abhi kuch chuna nahi), aur
wo bilkul theek haalat hai.

⚠️ Sirf `fields` ka PATCH (jaise sidebar se Featured toggle) `current.content` padhta hai,
warna wo request har block ki settings orphan samajh kar uda deti — us request me `content`
hai hi nahi. Iska apna test hai.

### §3 — Rating ab per-package (D-70 palta)

**D-70 → Superseded by D-87.**

1 Sep ko rating **universal** tay hui thi — poori site pe ek jodi, `packageDefaults.rating`
me haath se likhi. Wo faisla sirf **package detail page** dekh kar liya gaya tha, jahan wo do
jagah chhapti hai aur dono jagah wahi number theek lagta hai.

7 Sep ko `tour-v3.html` aayi — ek **listing** page, jahan chaudah package ek doosre ke neeche
khade hote hain. Wahan har card pe ek hi `4.9 ★ 412 trips` sirf galat nahi dikhta, wo
**jhootha** dikhta hai: teen alag package, teen alag safar, ek hi ginti.

⚠️ **Khaali ka matlab yahan D-70 se alag hai.** Wahan khaali `value` (0) = "rating dikhani hi
nahi". Per-package field pe wo matlab nahi chalta: paanchon live package pe aaj
`fields.rating` hai hi nahi, aur us matlab ka nateeja hota ki deploy karte hi paanchon page se
rating **gayab** ho jaaye — jabki client ne wo `packageDefaults` me likhi hui hai aur wo aaj
chhap rahi hai.

Niyam: **khaali `value` par `packageDefaults.rating` chalti hai.** Package ka apna number usko
_override_ karta hai, mitata nahi. Dono khaali hon tabhi line gayab hoti hai.

⚠️ Fallback **payload banate waqt** lagta hai, write pe nahi — store wahi hota hai jo client ne
likha. Warna default badalne pe purane package apni purani value pe atke rehte. Wahi tark jo
`sectionLabels` ke resolve pe hai (D-65).

⚠️ Ek nateeja maan lena chahiye: client "is package ki rating **mat** dikhao" nahi keh sakta jab
tak site-level wali khaali na ho. Aaj wo kisi ne maanga nahi. Jis din maange, uske liye
`value: -1` jaisa sentinel **mat** banana — ek alag `hideRating` toggle sasta aur saaf rahega.

### §4 — `details`/`summary` sanitizer me nahi the

D-87 ki jaanch me ek **chupa hua bug** nikla, jo is kaam ka hissa nahi tha.

Package page ka FAQ accordion `<details>` se banta hai (D-59: _"koi JS nahi"_) — par wo theme
ke JSX me likha hai, isliye sanitizer se guzarta hi nahi. Jis din client editor me khud
`<details>` likhta, wo **write pe chup-chaap gayab** ho jaata: 200 aata, "Saved." dikhta, aur
content ka wo hissa DB tak pahunchta hi nahi.

Wahi shakl jo `cancellationText` (D-65) aur transfer duration (D-64) ke bug ki thi. FAQs block
inhi se accordion banata hai, isliye ab dono `BLOCK` profile me hain.

⚠️ `open` attribute jaan-boojh kar **nahi** diya — wo layout faisla hai (kaunsa FAQ khula
khule), aur wo theme ka kaam hai, client ki HTML ka nahi.

### §5 — `sanitizeEntryFields()` ki list ab ulta jaal hai

`fields.subheading` aur blocks ke andar ka prose bhi ab us list me hain.

⚠️ **Is list me naya field jodna bhoolna ek chup-chaap XSS hai** (R20). Ye us "whitelist wale
jaal" ki **ulti shakl** hai jo `updatePackageDefaults()` pe chaar baar laga: wahan bhoolne se
content **kho** jaata tha, yahan bhoolne se content **bach** jaata hai, bina safai ke — aur
wahi zyada khatarnak hai.

Card ka text **inline** profile se guzarta hai, block se nahi — wahi wajah jo `whatsIncluded`
ki lines pe hai: wo `<p>` ke andar chhapta hai aur wahan ek aur block tag layout tod deta hai.

### Kya ban chuka hai (Slice A)

| | |
| --- | --- |
| `packages/shared/src/schemas/page.js` | naya — block settings, stat rail, eyebrow, sub heading, `collectBlockIdsFromHtml()` |
| `content-types.js` | `PAGE_FIELDS` (dono types), naya `tourPage` type, package pe `rating` |
| `package-defaults.js` | `ratingSchema` alag nikla — ab do jagah lagta hai |
| `sanitize-html.js` | `details`/`summary`; `sanitizeEntryFields()` me `subheading` + blocks |
| `entries/service.js` | `rating` · `statRail` · `blocks` ka normalization, `pruneOrphanBlocks()` |
| Tests | **789 pass** (774 baseline + 15) |

⚠️ **Koi migration nahi lagi.** `tourPage` naya type hai, aur `ensureBuiltInContentTypes()`
naye type ko **create** kar deta hai (`urlPattern` ka "sirf create pe" wala niyam yahan rukavat
nahi hai — wo maujooda type badalne par lagta hai). `rating`/`PAGE_FIELDS` `fields` me hain, jo
**hamesha** sync hote hain. Deploy pe `pnpm seed` chahiye, `pnpm cms migrate` nahi.

### §6 — Public payload (Slice B)

**`toPublicEntry()` har type pe chalti thi, aur wo poori tarah package-shaped hai.** Ek `page`
resolve karne pe chaar taxonomy query, ek `Transfer.find()` aur `resolveSimilarPackages()` ka
poora daur chalta tha — sirf khaali arrays banane ke liye. Aaj tak wo chhupa raha kyunki
`page` ka koi template hi nahi tha (A-9), to us payload ko koi padhta hi nahi tha.

Ab `PAGE_TYPES` (`page`, `tourPage`) ke liye `toPublicPage()` alag hai. Set isliye, `type ===
'page'` jaisa check bikhraana wahi hardcoding hai jise D-09 ne mana kiya tha.

**Card builder `resolveSimilarPackages()` se bahar nikla** — `toPackageCards()`. Tour page ka
`Package list` **bilkul wahi card** chahta hai, aur do copies rakhne ka nateeja pehle ho chuka
hai: `bestFor` similar cards pe **chhoot gaya tha** aur 2 Sep ko alag se jodna pada.

⚠️ **Naya endpoint jaan-boojh kar nahi banaya.** List `resolve` ke payload me hi jaati hai,
`similar[]` ki tarah — usse `path:` cache tag (D-52) aur ISR (D-83) dono muft milte hain. Alag
endpoint ka matlab hota ki wo call cache ke bahar rehti aur har page load pe API tak jaati —
theek wahi bug jo D-83 me teen hafte chhupa raha.

⚠️ **Facets `limit` se pehle ginte hain.** `2N / 3D [3]` poori filtered list ki ginti hai,
dikh rahe cards ki nahi — warna chauthaa package limit se bahar chhootte hi number jhootha ho
jaata.

⚠️ **`8N and longer` ek hi bucket hai** — reference me literally `data-f="d8,d9,d12"` likha
hai. Bina uske ek 8N, ek 9N aur ek 12N package teen alag pills bana dete.

⚠️ **Sort JS me hota hai, Mongo me nahi**, aur wo majboori hai: `price-asc`/`price-desc`
`cheapestPricing()` se aate hain, jo derived hai. Mongo me sort karne ka matlab hota ya to use
store karna — aur phir wo har pricing edit pe stale — ya wahi ginti aggregation me dobara
likhna. Isliye `PACKAGE_LIST_SCAN_CAP = 200` ki chhat hai (site pe aaj **paanch** package hain).

⚠️ **Breadcrumb `parentId` se banta hai, path se nahi** — aur ye do alag cheezein hain.
`tourPage` `hierarchical: false` hai, isliye uska URL flat rehta hai (`/tour-packages`), par
`parentId` phir bhi store hota hai aur breadcrumb usi se banta hai. Yaani client URL badle
bina page ko ek jagah "rakh" sakta hai. Iska apna test hai.

**`htmlToText()` `packages/shared` me aa gaya.** Wo pehle `Schema.jsx` me `stripTags` tha —
theme ke andar. Read time ke liye server pe bhi wahi chahiye tha, aur do copies banana theek
wahi galti hoti jo `sectionLabels` (D-65), route strip (D-51) aur hotels table (D-58) pe
bachayi gayi thi. D-82 wala "block tag ki jagah ek space" fix bhi wahin chala gaya.

**`Settings ▸ Tour settings` ka schema bhi ab hai** (`tourSettings`) — screen Slice C me
banegi. Schema pehle isliye ki payload me uska raasta abhi se sach ho, warna wahan ek aisi
field padhi jaati jo maujood hi nahi.

⚠️ **Trust badges `getPublicSettings()` me hain, page ke payload me nahi.** Wo global hain
(#11) aur hero package page pe bhi hai; dono jagah bhejne ka matlab hota ek hi cheez do jagah.

⚠️ `updateSettings()` me whitelist wala jaal **nahi** hai — wo input pe loop karta hai. Par gate
Zod pe khisak jaata hai: field `settings.js` ke schema me na ho to validation use chup-chaap
gira degi (wahi lakshan, alag jagah).

**Live check (D-82/D-83 wala sabak):** `/packages/discover-andaman` asli DB pe resolve kiya —
6 din, 4 similar cards, aur rating `packageDefaults` se **4.9 / 412** par gir rahi hai. Yaani
per-package rating aane ke baad bhi live site pe koi regression nahi.

**804 test pass** (789 baseline + 15).

### §7 — Content ek block list hai (7 Sep shaam — **§2 ka palat**)

> ⚠️ **§2 ab purana hai — Superseded by §7.** Wahan likha tha ki layout ek hi HTML field me
> rahega aur blocks uske andar `<div id="blk-a1b2">` ki tarah baithenge, settings alag
> `fields.blocks{}` me. **Wo model client ne demo me dekh kar mana kar diya.**

Client ke shabd:

> _"Two column / Cards wala poora panel hoga, ye nahi ki content editor ke andar hi bana
> diya. Add kar sake ki 2 column chahiye — dropdown se."_

**Ab `content.blocks[]` hi kram hai.** Har block apna panel hai, `Add block` dropdown se judta
hai, grip se reorder hota hai. **Normal likhai bhi ek block hai** (`richText`, UI me "Text") —
ek page pe kai ho sakte hain.

#### Ye sirf UI ki pasand nahi thi

Reference page (`tour-v3.html`) me blocks content ke **beech** me aate hain:

```
h2 → PACKAGE LIST → h2 → CARDS → h2 → TWO COLUMN → h2 → FAQs
```

"Ek content editor + neeche alag panels" us page ko bana hi nahi sakta tha. Isliye content
**khud** blocks ki list hai, aur `richText` unme se ek type.

#### Jo is palat se apne aap khatam ho gaya

| §2 ki keemat | §7 me |
| --- | --- |
| settings do jagah — HTML me `id`, `fields.blocks{}` me props | **ek hi jagah** — block ke apne `props` |
| orphan blocks, aur `pruneOrphanBlocks()` | ban hi nahi sakte |
| `collectBlockIdsFromHtml()` ka regex | zaroorat nahi |
| sanitizer me `data-*` ka poora sawaal | uthta hi nahi |
| TinyMCE me `contenteditable=false` wrapper sambhalna | har Text block ka apna saada editor |

Aur sabse badi baat: ye **`block.js` ka wahi FROZEN `{id, type, props}`** hai jo spec 002 me
Phase 1 se maujood hai. Yaani hum framework ke apne block model par hain, uske aas-paas ki
jugaad par nahi — aur Phase 5 ka builder yahi data utha lega. `hasBuilder` ab `page` aur
`tourPage` dono pe `true` hai, aur wo flag ab **sach me** batata hai ki editor kaisa khulega.

#### `blockSchema.id` ab optional hai — aur wo shape ka badlaav nahi hai

FROZEN wala vaada `{id, type, props, style, children}` **paanch keys** par hai, unke required
hone par nahi. Aaj tak blocks **sirf server pe** bante the (`contentFromRichText()` ek hi block
deta hai, id `rt1`), isliye required rakhna sasta tha. Ab client dropdown se blocks jodta hai.

Stored data me `id` phir bhi **hamesha** hoti hai — `normalizeContent()` use write pe bhar deta
hai. Wahi jodi jo `faqSchema` aur `itinerarySchema` pe pehle se hai: input me optional, DB me
hamesha maujood.

#### Kram: normalize **pehle**, safai **baad me**

`sanitizeContent(normalizeContent(input.content))`. Ulta karne ka matlab hota ki
`parseBlockProps()` saaf ki hui HTML ko phir se input wali gandi value se badal de — theek
wahi jaal jo `normalizeFields()` ke aakhir me likha hai (D-80).

⚠️ **`sanitizeContent()` ab chaar block ki HTML saaf karti hai** — `richText.html`,
`twoColumn.left`/`.right`, `cards.items[].text` (inline profile), `faqs.items[].answer`. **Naya
block type jodte waqt use bhi jodna hai.** Yahan chhoot jaane ka matlab ye nahi ki content gir
jaayega — wo bilkul theek save hoga, **bina safai ke** (R20). Ye whitelist wale jaal ki **ulti
shakl** hai: wahan bhoolne se content kho jaata tha, yahan bhoolne se bach jaata hai.

⚠️ **Anjaan type ke props chhoot jaate hain, girte nahi.** `blockSchema.props`
`z.record(z.unknown())` hai — spec 002 ka Phase 5 escape hatch, jaan-boojh kar khula. Ek naya
block type jodne wale ko yaad rehna chahiye: `PAGE_BLOCK_PROP_SCHEMAS` me naam **na** hone ka
matlab hai "koi validation nahi", "block nahi ban sakta" nahi. Iska apna test hai.

#### Demo aur schema, dono design ke hisaab se theek kiye gaye

Slice A ka schema **plan se** banaya gaya tha, `admin-design-v3.html` se nahi. Milaan pe paanch
farak nikle, aur design jeeta (R15):

| Demo me | Slice A me tha | Ab |
| --- | --- | --- |
| Package list pe `Heading` + `Line under heading` | nahi tha | `heading`, `subheading` |
| `Featured pehle` **alag checkbox**, Sort me teen option | `sort` enum me `featured` ghusa hua, paanch option | `featuredFirst` boolean + teen ka enum |
| `Rating aur discount badge dikhayein` | nahi tha | `showBadges` |
| Cards pe `Tag (optional)` | maine `icon` enum banaya tha | `tag` |
| FAQs block pe `Heading` | nahi tha | `heading` |

`featuredFirst` sort ke **upar** lagta hai, uski jagah nahi — wo ek tie-break hai jo kisi bhi
sort ke saath chal sakta hai. Iska apna test hai.

**Duration ki ginti padhne ke liye hai, likhne ke liye nahi** — demo me wo ek editable input
tha, jise theek kiya gaya. Client ab sirf chunta hai ki **kaunsi durations dikhein**
(`props.durations`, khaali = sab); ginti server pe hoti hai. Store karne ka matlab hota ki naya
package publish karte hi har tour page ka number chup-chaap jhootha ho jaaye (D-58 ka hi niyam).

⚠️ Durations ka filter facets se **pehle** lagta hai — ulta karne pe bar me ek pill dikhti
jiska koi card list me hai hi nahi, aur usse click karne pe page khaali ho jaata.

#### Ek aur cheez jo is jaanch me pakdi gayi — test suite rate limit kha rahi thi

`entries.test.js` ka har test `beforeEach` me chaar login karta hai, aur file ab 168 test ki
hai — yaani ek minute me global limiter ki 1000-request wali chhat paar. Naye tests **429**
khaane lage, aur wo failure bilkul logic bug jaisi dikhti hai:
`Cannot read properties of undefined (reading 'entry')`.

Ab limiter test me band hai (`isTest`, `core/env.js`). ⚠️ **Auth ka apna limiter alag hai aur
chalta rehta hai** — brute force ka bachav test me bhi test hona chahiye.

**810 test pass** (804 baseline se, purane §2 wale tests hata kar naye jode gaye).

### §8 — Admin ki screens (Slice C)

**Paanch screens:** `Pages` list · `Tour Pages` list · **ek hi** edit screen (dono ke liye) ·
`Settings ▸ Tour settings`.

#### A-9 band ho gaya

`entries` engine 26 Aug se `page` type sambhal raha hai (D-46) aur wo seed me register bhi hai,
par admin me uska koi raasta nahi tha — nav ke links `NotBuiltYet` pe jaate the. Yaani **API se
page banaya ja sakta tha, client se nahi.**

#### Do list, ek component

`admin-design-v3.html` ke `#s-pages` aur `#s-tour` ek hi table hain; teen cheezein alag hain —
heading, "Add New" ka text, aur teesra column (Pages pe `Author`, Tour pe `Packages`). Isliye
`EntriesList.jsx` ek hai aur do patle wrapper.

⚠️ **`PackagesList.jsx` isme nahi ghusaya gaya**, aur wo jaan-boojh kar hai: us screen ke apne
filter (Destination, Package Type), apna `From price` column aur apne bulk action (Featured)
hain. Unhe props se on/off karna wahi component banata hai jise koi chhoona nahi chahta.

⚠️ Tour list ka `Packages` column abhi **blocks ki ginti** dikhata hai, packages ki nahi. Design
me wahan `11` jaisa number hai jo us page ke `Package list` block se aane wale packages ka hai —
wo ginti live packages pe depend karti hai, isliye server pe hi ban sakti hai aur uske liye list
endpoint ko per-row query karni padegi. Wo alag se hoga; tab tak wahi dikhta hai jo sach me pata
hai (D-30).

#### Generic hooks `lib/use-entries.js` me nikal gaye

List, counts, ek entry, content type, media aur currency — ye chhe kisi bhi content type pe ek
jaise hain. `usePackages.js` ab unhi ka **patla wrapper** hai; uske exported naam wahi rakhe gaye
(`usePackages`, `usePackage`, `usePackageCounts`, `usePackageType`), isliye Slice 3-6 ki paanch
screens ko haath nahi lagana pada.

Copy karna sasta dikhta tha. Is repo me wo galti **do baar** ho chuki hai aur dono baar shakl ek
thi: `bestFor` similar cards pe chhoot gaya tha (2 Sep), aur Bulk Upload ka slug do jagah do
tarah se banta tha (D-86) — us ek `null` se **teen guard** chup-chaap mar gaye the.

#### Blocks ka editor

Har block apna panel: rangeen chip, ek line ka summary (**band hone pe bhi**), ⌃⌄ se reorder,
✕ se remove (confirmation ke saath). Neeche `＋ Add block…` dropdown.

Paanch editors — Text (`HtmlEditor`), Two column (do **alag** editor), Cards (title · text ·
`Tag (optional)`), Package list (heading · filters · durations · teen checkbox · limit), FAQs
(heading · sawaal-jawab · schema toggle).

⚠️ **Duration ki ginti admin me dikhti hi nahi.** Demo me har pill ke aage ek editable input tha;
wo padhne ki cheez hai, likhne ki nahi. Client sirf chunta hai ki **kaunsi** durations dikhein —
ginti page pe server se aati hai. Store karne ka matlab hota ki naya package publish karte hi wo
chup-chaap jhoothi ho jaaye (D-58 ka hi niyam).

⚠️ **Anjaan block type pe editor nahi khulta, par uska content chhoota bhi nahi.** Phase 5 ka koi
block ya purana data yahan aa sakta hai; uske props server pe bhi chhoot jaate hain, isliye admin
bhi use waise ka waisa chhod deta hai aur ek hint dikhata hai.

#### Permissions — pehli baar

⚠️ **Slice C se pehle Pages ke dono nav link pe `permission` thi hi nahi**, aur `ROUTE_GUARDS` me
`/pages` tha hi nahi. Yaani menu **sabko** dikhta tha. Ab dono jagah lagi hui hai, `/tour` ke
saath.

#### `Settings ▸ Tour settings`

Client ka faisla #11. Do panel: universal banner (`MediaDrop`) aur trust badges (icon enum +
text, max 6).

⚠️ **Tab ka naam client ka hai aur wo content se thoda tang hai** — dono cheezein package page pe
bhi chalti hain, sirf Tour pages pe nahi.

⚠️ **Whitelist wala jaal yahan nahi hai** — `updateSettings()` input pe loop karta hai. Par gate
Zod pe khisak jaata hai: field `settings.js` ke schema me na ho to validation use chup-chaap gira
degi (wahi lakshan, alag jagah). Isliye live check DB se padha gaya, response se nahi.

#### Live check — asli DB pe (D-82/D-83 wala sabak)

Ek Tour Page banaya, publish kiya, resolve kiya, phir **hata diya**:

```
path      : /zz-claude-e2e-check
byline    : {"author":"Arun","readMinutes":1}      ← apne aap
content?  : payload me nahi jaata (sahi)
blocks    : richText → packageList → faqs          ← kram waisa hi
  cards   : 3 (limit 3), price-asc pe
  facets  : 5N / 6D[5]
  total   : 5
  rating  : {"value":4.9,"count":412}              ← packageDefaults se
  faq id  : mil gayi
```

`tourSettings` alag se DB me likh kar padha gaya, aur khaali text wala badge public payload se
chhant gaya. Dono ke baad DB **waisi ki waisi** — paanchon package, koi test data nahi.

⚠️ Ek chhoti si baat sikhne wali: pehli koshish me `publishEntry` ne **403** diya kyunki fake
actor ke paas asli permission strings nahi thi — guard theek chala. Par us fail hui run ka draft
DB me reh gaya tha aur usse agla page `-2` pe chala gaya. Wo bhi saaf kiya gaya.

**810 test pass**, admin build pass, lint + format clean.

### §9 — Package list ab **chunav** hai, filter nahi (8 Sep)

Client ne block ka poora model palta:

> _"Isme do column honge — left side saare packages dikhenge, aur right me wo aayenge jo main
> choose karunga. Upar ek filter hoga jisme radio buttons honge taaki ek hi filter choose ho.
> Right side me added packages ko drag and drop kar sakein."_

Aur uske baad, saaf karte hue: _"Filter jo admin me choose karenge wo frontend par package show
ho jayenge. Purane filter hat jaayein. Agar day-wise wala radio choose karenge to dikh jaayengi
pills."_

#### Kya badla

| | 7 Sep (purana) | 8 Sep |
| --- | --- | --- |
| List kahan se | server derive karta tha | **`props.packageIds`** — client ka chunav |
| Kram | `sort` enum se | **usi array ka** — drag-and-drop |
| Ginti | `limit` | jitne chune |
| Kasauti | Package Type + Destination + Duration checkboxes, sab ek saath | **ek radio** — All · Package Type · Destination · Day wise |
| Pills | `showFilters` checkbox | **sirf `Day wise` radio pe** |

`sort`, `featuredFirst`, `durations` aur `limit` **chaaron hat gaye** — jab kram aur ginti dono
client tay kar raha hai, unka koi matlab nahi bachta. `showBadges` bacha (wo filter nahi, display
hai).

#### ⚠️ Ek keemat maan li gayi hai

**Naya package publish hone pe wo apne aap kisi tour page pe nahi aayega** — client ko us page pe
jaakar use chunna padega. Pehle ulta tha. Ye us control ki keemat hai jo picker deta hai, aur wo
client ka faisla hai.

#### ⚠️ Do filter, do alag kaam — usi din theek hua

Pehle **ek hi radio** dono kaam karta tha: admin me list chhoti karta tha, **aur** page pe pills
laata tha. Client ne wo alag karwaya:

> _"Jo filter abhi admin me hai wo **only left side ke liye** rahega. Ab right side me bhi ek
> checkbox ka filter lagao jo single check kar sake, **for showing filtered packages on
> frontend**."_

| | Kahan | Kiske liye |
| --- | --- | --- |
| `browseBy` | picker ka **baayan** column | **admin** — package dhoondhne ke liye |
| `pageFilter` | picker ka **daayan** column | **visitor** — page pe filter bar |

Ye lakeer zaroori thi. Ek hi control se dono kaam karwane ka matlab tha ki client ko "Honeymoon"
chunna pade **sirf** isliye ki wo Honeymoon packages dhoondh raha hai — aur uska side-effect page
pe chala jaata.

⚠️ **`pageFilter` ab teen kism ki bar bana sakta hai**, sirf duration nahi: `packageType`,
`destination`, `duration`. Taxonomy wali facets `resolveTaxonomies()` se naam uthati hain aur
**naam se sort** hoti hain, ginti se nahi — warna ek package publish hote hi pills apni jagah
badal leti aur client ko lagta ki bar hil rahi hai.

⚠️ **Ek package kai taxonomies me ho sakta hai**, isliye facets ke `count` ka jod cards ki ginti
se **zyada** ho sakta hai. Live check pe wahi dikha — 5 packages, aur
`Havelock[5] Neil Island[5] Port Blair[5]`. Ye theek hai: "Havelock ke 5" ka matlab hai paanch
package Havelock jaate hain, ye nahi ki wo paanch **sirf** Havelock jaate hain.

⚠️ **UI checkbox hai, behaviour radio ka** — client ne shart yahi rakhi (_"single check kar sake,
not multiple"_). Chuna hua dobara click karne pe `none` pe wapas; wo raasta radio nahi deta.

⚠️ `browseBy` me `duration` **nahi** hai: `nights` `fields` ke andar hai aur list endpoint uspe
filter nahi karta, to wo option baayen kuch narrow karta hi nahi. Use rakhne ka matlab hota ek
aisa radio jo dabaane pe kuch na kare.

#### Search — baayen column me

`q` param pe, **server pe** (R14). ⚠️ **300ms ka debounce zaroori hai**: hook apni dep badalte hi
refetch karta hai, to bina debounce ke har keystroke ek API call banati.

#### FAQs block me description

Heading ke neeche ki line, **asli editor** — wahi jodi jo `packageDefaults.sectionLabels` pe hai
(D-65/D-69), aur usi wajah se: client ko usme bold aur link chahiye hote hain.

⚠️ **Khaali line poori tarah gayab ho jaati hai**, khaali heading ki tarah fallback pe nahi jaati —
D-65 wala hi model. Aur wo `sanitizeContent()` ki list me bhi juda: chhoot jaane ka matlab hota ki
wo HTML **bina safai ke bach** jaati (R20).

#### Teen chetavniyaan jo code me likhi hain

⚠️ **Kram `packageIds` ka hai, Mongo ka nahi** — `$in` apna kram rakhta hi nahi, aur wo kram client
ne drag se banaya hai.

⚠️ **Jo id resolve na ho wo chup-chaap gir jaati hai** — draft, unpublish, ya trash. Page pe ek
toota hua card dikhane se behtar hai ki wo card na ho (D-30, D-42 §2 wala hi invariant).
**Trash `status` ko haath nahi lagati** (D-25), yaani ek trashed package abhi bhi `published` hai
— list ko sirf `deletedAt: null` bachata hai. Dev DB me is waqt 5 live aur 8 trashed packages
hain, to ye kaalpanik nahi; uska apna test hai.

⚠️ **`PACKAGE_LIST_SCAN_CAP` khatam** — wo 200 ki chhat isliye thi ki `price-asc` derived value pe
sort karta tha aur uske liye poora set uthana padta tha. Ab ek `$in` query hai, koi scan nahi.

### §10 — Sidebar page pe, form Appearance me (8 Sep)

Client: _"Sidebar me only layout aur visibility tay karega, not kaunsa form — wo to Appearance me
alag kaam hai."_

Isliye **faisla #14 poora palta nahi, wo do hisson me bat gaya**:

| Sawaal | Kahan |
| --- | --- |
| Sidebar hai ya nahi, aur kis taraf | **page pe** — `fields.sidebar` (`none` · `left` · `right`) |
| Usme kya dikhega (form, widgets) | `Appearance ▸ Sidebar` — **Slice E**, abhi bana nahi |

Ye lakeer theek jagah hai: **layout page ka apna faisla hai** (ek lambe article pe sidebar chubhta
hai, ek listing page pe kaam ka hai), par **content site ka** — har page pe alag form rakhna wahi
bikhraav banata jise D-65 ne section labels pe roka tha.

⚠️ Default `none` hai, `right` nahi. Reference tour page pe sidebar hai, par default se use daal
dene ka matlab hota ki har naya page bina maange ek khaali sidebar le kar aaye (D-30).

#### Sidebar ek **named cheez** banega — par Slice E me, abhi nahi

Client ne aage jaakar saaf kiya:

> _"Sidebar me choose karne par, suppose Left — to uske baad saare sidebar ki list aa jaayegi,
> uske baad choose kar lenge kaunsa sidebar add karna hai."_

Yaani sidebar Menus jaisi cheez hai: ek site pe **kai sidebars**, har ek ka apna naam aur apne
widgets. Page do cheezein chunta hai — **jagah** (left/right) aur **kaunsa sidebar**.

⚠️ **Wo dropdown abhi nahi bana, aur ye jaan-boojh kar hai.** `sidebars` naam ki koi collection
hai hi nahi — wo poora `Appearance ▸ Sidebar` ka kaam hai (Slice E): nayi collection, module,
screen aur public payload. Abhi dropdown daal dene ka matlab hota ek **hamesha khaali** control
jisme se kuch chunna mumkin hi na ho — aur wo D-30 ka palan nahi, uska ulta hai.

**Client ne raasta B chuna** (8 Sep): page pe abhi sirf `none`/`left`/`right`, aur "kaunsa
sidebar" wala chunav Slice E ke saath aayega. Tab `fields.sidebar` ek string se `{ position, id }`
banega — ek chhota shape badlaav, aur uski migration bhi chhoti hogi kyunki tab tak asli data
lagbhag hoga hi nahi.

⚠️ Ye poochhna zaroori tha. Ek din pehle bilkul yahi galti ho chuki thi: Pages ki screens bina
poochhe ban gayi thin kyunki wo "aas-paas ka kaam" lagta tha. **Scope ek faisle se nahi badhta.**

⚠️ Enum chhota hai par phir bhi `.parse()` hota hai — theme isse **seedha class me** badalti hai
(`.pgl--sideleft`), aur bina rok ke koi bhi string wahan pahunch sakti hai.

#### ⚠️ Slice C ne scope paar kar liya tha — Pages wapas nikal gaye (8 Sep)

**D-87 ka kaam Tour ka tha.** Slice C me faisla #2 ("koi template nahi, ek hi edit screen") ko
ek kadam aage kheench liya gaya: _"ek hi screen"_ ka matlab _"ek jaise types"_ maan liya gaya,
aur `page` ko `tourPage` ka poora field set aur poori screens mil gayin.

Client ne do kadam me wo pakda:

1. _"Kal to hamne tour par kaam kiya tha, to page me bhi tour ka content kyun aa raha hai?"_
   — About Us jaise saade page pe bhi **Eyebrow**, **Stat rail** aur Content me **Package list**
   block dikh rahe the; teenon `tour-v3.html` ke hero/listing ki cheezein hain
2. _"Pages ▸ Add New par kuch nahi aana chahiye, kyunki ispar kaam to ho hi nahi raha."_

Dono theek the. Ab:

| Kya | Haalat |
| --- | --- |
| `page` ka field set | **`[]`** — bilkul waisa jaisa D-87 se pehle tha |
| `page` ki screens | wapas **`NotBuiltYet`** pe (`/pages/*`) — **A-9 phir se khula** |
| `tourPage` | `[eyebrow, subheading, statRail]`, aur uski teenon screens live |
| `PageEdit.jsx` | ab sirf `/tour` use karta hai, par **`type` prop se hi chalta hai** |

⚠️ **Screens ka code hata nahi, wo Tour ka ban gaya.** `EntriesList.jsx` aur `PageEdit.jsx` dono
`type` se chalte hain aur `lib/use-entries.js` generic hai. Jis din Pages ka kaam aayega, wo
`TYPE_CONFIG` me **ek row** aur do route jodne ka kaam hai — screens dobara likhni nahi padengi.
`PagesList.jsx` delete ho gayi (commit `1e7688d` me padi hai), kyunki wo teen line ka wrapper
thi.

⚠️ **`ROUTE_GUARDS` se `/pages` ke teen guard hata diye gaye.** `permissionForRoute()` exact
pattern se milaata hai, aur jo route hi nahi hai uska guard likhna sirf ye jhootha ishaara deta
ki wahan kuch hai. **`NAV` me un links pe `permission` phir bhi lagi hui hai** — wo alag sawaal
hai (menu me item dikhe ya nahi), aur uska jawab screen banne ka intezaar nahi karta.

⚠️ **Deploy pe `pnpm seed` chahiye** — field set code-owned hai aur `fields` hamesha sync hote
hain (D-46). Bina uske DB me purana set pada rehta aur admin wahi dikhata. Dev DB pe chala liya:
`page: []`, `tourPage: [eyebrow, subheading, statRail]`.

**Sabak:** _scope ek faisle se nahi badhta._ "Ek hi screen" screen ke baare me tha, types ke
baare me nahi. Ye wahi shakl hai jo D-43 pe pakdi gayi thi (_"Header tab bina poochhe bana diya"_)
— sirf ulti taraf se: wahan ek screen zyada ban gayi thi, yahan ek poora content type.

#### ⚠️ Agle din pakda gaya — `useEntryList` ka infinite loop (8 Sep)

Client ko admin me _"Bahut zyada requests. Thodi der baad."_ dikha — **rate limiter** ka message
(`app.js`, dev me 1000 req/min).

Asli galti wahan nahi thi. `useEntryList` ki effect dep `[type, query]` thi, yaani **object ki
identity**, aur `PageEdit` use inline object se bulata tha:

```js
useEntryList('page', { limit: 200, status: 'published' })
```

Wo object har render pe naya banta hai → nayi identity → naya `load` → `useEffect` chali →
`setState` → dobara render → phir naya object. **Page/Tour ka edit screen kholte hi
`/api/entries` par requests ki jhadi lag jaati thi.**

Ilaaj **hook me** hai, call site pe nahi: dep ab `listParamsKey(type, query)` hai — content ka
key, identity nahi. Call site pe `useMemo` lagana bhi kaam karta, par wo **har naye caller pe
yaad rakhna** padta, aur ye jaal chup hai (koi error nahi, sirf ek "dheemi" screen). Rok wahin
honi chahiye jahan use koi bypass na kar sake — wahi soch jo `useMediaById` pe pehle se thi.

⚠️ **Sabse zaroori sabak: lakshan galat jagah dikha.** 429 dekh kar pehla shak limiter pe jaata
hai. Limiter ne ulta **madad** ki — usne ek chup bug ko sunai dene laayak bana diya.

Admin ke liye koi React test setup nahi hai (na jsdom, na testing-library), isliye hook khud
test nahi hota. Par jo hissa **toota tha** wo pure hai, aur wo ab
`lib/use-entries.test.js` me pin hai — teen test, **813 pass**.

### Ab bhi khula

- **Slice D** — theme (`.vhero` · `.vrail` · `.fbar`/`.dpill` · `.prows` · `.dcard` · two-column
  · `.toc` · `.ctastrip`), aur `apps/web` ka catch-all page-shaped payload padhna
- **Slice E** — `Appearance ▸ Sidebar` (faisla #14). Ab uska daayra teen cheezein hai:
  **(a)** `sidebars` collection — named sidebars, har ek ke apne widgets (client, 8 Sep);
  **(b)** page pe "kaunsa sidebar" wala dropdown, yaani `fields.sidebar` string se
  `{ position, id }`; **(c)** `forms.placement` ka wo gap jo `form.js:152` pe likha hai —
  paanch placement design hui thin, do hi bani
- **Tour list ka `Packages` column** — abhi **blocks ki ginti** hai, packages ki nahi. Design me
  wahan `11` jaisa number hai; wo live packages pe depend karta hai, isliye server pe hi ban
  sakta hai aur uske liye list endpoint ko per-row query karni padegi

---

### §11 — Slice D: theme (8 Sep)

D-87 ka **aakhri** hissa. Ab tak `apps/web` ka catch-all me sirf ek branch thi
(`entry.type === 'package'`); `page`/`tourPage` neeche wale fallback pe girte the aur wahan
**sirf `<h1>`** chhapta tha. Yaani jo kuch Slice A–C me admin me bhara ja raha tha, wo public
site pe **dikhta hi nahi tha**.

### Kya bana

| Cheez | Kahan |
| --- | --- |
| Page shell — hero · stat rail · byline · `.pgl` | `components/tour/TourPage.jsx` |
| Paanch block ka render | `components/tour/Blocks.jsx` |
| `Package list` block + duration pills | `components/tour/PackageList.jsx` |
| Sidebar ke teen widget | `components/tour/Sidebar.jsx` |
| `BreadcrumbList` + **ek** `FAQPage` | `components/tour/TourSchema.jsx` |
| CSS — `.vhero*` · `.vrail*` · `.sec--*` · `.fbar`/`.dpill` · `.dgrid`/`.dcard` · `.twocol` · `.pgl--sideleft` | `app/globals.css` |

### §11.1 — `.pgl` chhua nahi gaya

Ye Slice D ka **pehle se likha hua maloom kaanta** tha (`09-OPEN-ITEMS`): `.pgl` package detail
page pe bhi chalti hai aur wahan sidebar **right** hai (`minmax(0,1fr) 322px`); tour page pe wo
**left** hai. Uska `grid-template-columns` seedha badalne ka matlab hota package page tod dena.

Isliye `.pgl--sideleft` ek **modifier** hai. DOM me `main` pehle aur `aside` baad me rehta hai —
jagah `grid-column` se badalti hai, markup se nahi (reference me bhi wahi comment hai). Isse
chhoti screen pe stacking apne aap sahi rehti hai.

⚠️ **1024px pe `grid-column` ko wapas `auto` karna zaroori tha.** Ek hi column bachne par
`grid-column: 2` ek **implicit** doosra column bana deta hai aur layout chup-chaap do column ka
hi reh jaata — wo galti sirf chhoti screen pe dikhti.

### §11.2 — Card ka markup ek jagah aa gaya

`PackageList` ko bilkul wahi `.prow` card chahiye tha jo `Similar` (package page) render karta
hai. Do copies banane ka nateeja is repo me pehle ho chuka hai aur wo **chup** tha: `bestFor`
similar cards pe chhoot gaya tha.

Ab dono `components/PackageCard.jsx` use karte hain. Saath me ek purani galti bhi theek hui —
`Similar` har card pe **ek hi global rating** dikhata tha, jabki D-87 §3 ke baad
`toPackageCards()` har card ki apni `rating` bhejta hai (fallback server pe lag chuka hota hai).
Ab card apni rating dikhata hai.

### §11.3 — `EnquiryForm` ka `variant`, do form nahi

Reference me tour ka form `.wdg--cta` hai (`tour-v3.html:1890`) — package page wale `.wdg--book`
se alag: usme **neela price header hai hi nahi**, aur uske upar ek `<h3>` + `<p>` hai.

Naya form component **nahi** banaya. Submit, validation, honeypot, thank-you aur reset — sab ek
hi jagah rehne chahiye; do copies me se ek hamesha pichhad jaati hai. `EnquiryForm` ab
`variant="book" | "cta"` leta hai.

⚠️ Uske liye ek naya hook laga — **`useOptionalCategory()`**. `useCategory()` provider ke bina
**throw** karta hai, aur wo package page ke liye sahi hai (wahan provider ka na hona ek asli bug
hai: catbar aur form alag daam dikhane lagte). Tour page pe koi **ek** package hai hi nahi, to
pricing aur category dono hote hi nahi — wahan throw karna galat hota. Purana guard waisa ka
waisa hai; jise category **chahiye** wo `useCategory()` leta hai, jise **mil sakti** hai wo naya.

### §11.4 — Structured data: package wala `Schema.jsx` yahan nahi

`Schema.jsx` poori tarah package-shaped hai — `TouristTrip`, `Product`, `AggregateOffer`,
`AggregateRating`, route ka `ItemList`. Tour page ek **listing** hai; uspe koi ek trip, ek daam
ya ek rating hai hi nahi. Wo nodes bhejne ka matlab hota Google ko wo batana jo page pe dikh hi
nahi raha — _"misleading structured data"_, manual penalty wali shreni. Yahi chetavni
`Schema.jsx` ke sar pe pehle se likhi hai.

Isliye `TourSchema.jsx` sirf do node bhejta hai: `BreadcrumbList` aur **ek** `FAQPage`.

⚠️ **Saare FAQ blocks milaa kar ek hi `FAQPage`** (client, 8 Sep). Ek page pe kai FAQs block ho
sakte hain; har ek ka apna node bhejna ek hi page pe do-teen `FAQPage` bana deta, jiske liye
Google saaf mana karta hai.

### §11.5 — ⚠️ Ek guard galat tha, aur wo live check me hi pakda gaya

`Package list` ki filter bar pehle `facets.length > 1` pe dikhti thi — soch ye thi ki ek hi pill
bemaani hai.

Asli page pe **saare paanch package `5N / 6D`** ke hain, yaani facet **ek** hi tha — aur client
ka chuna hua `pageFilter: duration` **chup-chaap gayab** ho gaya.

Ab wo `> 0` pe hai. **Sabak wahi jo D-86 me likha hai:** _guard ka chalna kabhi error jaisa nahi
dikhta, wo "kuch na hone" jaisa dikhta hai._ Aur ek pill pe bhi bar bekaar nahi hai — `.fbar__c`
ki ginti (`5 packages`) apne aap me kaam ki hai.

### Live check — asli DB, production build

`next build` + `next start`, phir asli tour page fetch (200, 170 KB):

```
.vhero 1 · .vrail__c 4 · .sec--blue 1 · .pgl--sideleft 1 · .vbyline 1
.blk 10 · .dgrid 2 · .dcard 9 · .twocol 1 · .prows 1 · .prow 5
.wdg 3 (html · planner · cta) · .faq 1
fbar: Duration | All | 5N / 6D | 5
JSON-LD: 1 FAQPage, 9 Question — koi TouristTrip/Product nahi
byline: "Arun · Updated 8 Sept 2026 · 4 min read"
```

Sidebar ka kram wahi mila jo client ne admin me lagaya tha (Packages by duration → Talk to a
planner → Enquiry form), aur wahi jo reference me hai.

⚠️ **`BreadcrumbList` is page pe nahi aaya, aur wo sahi hai** — page ka koi parent nahi hai, to
chain me sirf wo khud bachta hai. Ek item ka breadcrumb bemaani hai.

### ⚠️ Ek galti jo maine ki

Dev server chalte waqt `pnpm --filter @cms/web build` chala diya. Dono ek hi `.next` folder use
karte hain, aur build ne dev ke vendor chunks ke upar likh diya — dev server har page pe **500**
dene laga (`Cannot find module './vendor-chunks/zod@3.24.1.js'`). Code me kuch nahi tooTa tha.

**Niyam:** `next build` sirf tab jab dev band ho. Naapne ke liye bhi yahi hai (D-85), par wahan
wajah alag thi — dev ka number bemaani hota hai.

## D-88

**`Appearance ▸ Sidebar` — named sidebars, teen widget, aur position page pe**
_8 Sep 2026 · client ka faisla · Slice E ka contract_

### Sandarbh

D-87 ka faisla #14 sidebar aur form placement ko per-page se hata kar
**`Appearance ▸ Sidebar`** me bhej chuka tha, par usme sirf **kahan** tay hua tha — **kya**
nahi. 8 Sep ko client ne pehla hissa chuna (raasta B): page pe sirf `none`/`left`/`right`,
aur "kaunsa sidebar" wala chunav Slice E ke saath. Aaj baaki tay hua.

Wo ek sawaal jispe poora module ruka tha — _sidebar me kya-kya daala ja sakta hai, list
fixed hai ya client apne widget bana sakta hai?_ — ab band hai: **list fixed hai, teen
type ki.**

### Client ke faisle

| #   | Faisla                                                                     |
| --- | -------------------------------------------------------------------------- |
| 1   | **Multiple named sidebars** — ek nahi, jitne chahiye                       |
| 2   | Har sidebar me **teen kism** ki cheezein: Form · Talk to a planner · HTML   |
| 3   | Form widget me **forms ki list** aati hai, usme se ek chunte hain           |
| 4   | Talk to a planner — **"if needed"**, yaani chahiye to daalo                 |
| 5   | HTML — text/details, ya koi bhi list (jaise `Packages by duration`)         |
| 6   | Page pe left/right chunne ke **baad** hi sidebars ki list dikhegi           |
| 7   | **Package page nahi badlega** — uska sidebar hardcoded hi rahega           |
| 8   | `On this page` **abhi nahi** — wo `tour-v3.html` me hai hi nahi, baad me   |

### §1 — Design v3 se paanch farak, aur wo jaan-boojh kar hain

`admin-design-v3.html` me Sidebar ka **poora screen pehle se bana hua hai**
(`#s-sidebar`, line 682; nav line 341). Wahi file hai jispe Slice A ka milaan hua tha aur
jahan **design jeeta tha** (R15). Yahan uska model **chhe** jagah palta hai (chhata §9 me):

| Cheez                | Design v3                                                                                                                             | Ab                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Kitne sidebar        | **Ek hi** — screen ka title `Sidebar`, ek `Save changes`                                                                              | **Multiple**, named                                    |
| Left / Right         | **Global** — "Sidebar ki jagah" panel usi screen pe                                                                                    | **Har page pe apna** (client, 8 Sep)                   |
| Kaunsa form          | **"Kis page pe kaunsa form"** — niyam ki table (`Tour pages — sab` · `Package pages — sab` · `Pages — sab` + kisi ek page ka override) | Sidebar ke **andar** widget ka chunav                  |
| Widgets              | **Chaar**: Enquiry form · On this page · Talk to a planner · Packages by duration _(sirf Tour pages pe)_                               | **Teen**: Form · Talk to a planner · HTML              |
| Packages by duration | Apna widget, **derive** hota hua                                                                                                      | **HTML** — client haath se likhega                    |

⚠️ **Ek keemat jo is palat ke saath aati hai:** design ki table ek baar me _saare_ Pages ko
ek sidebar de deti thi. Named sidebars me har page pe jaakar chunna padega — theek wahi
trade-off jo 8 Sep ko package list pe liya gaya tha (_"naya package publish hone pe wo apne
aap kisi tour page pe nahi aayega"_). 5–10 page pe ye kuch nahi hai; 50 pe chubhega.

⚠️ **Attribution:** faisle #1 aur #6 `project-state.md` me 8 Sep ko **client ke naam se**
darj hain. #2–#5 aaj aaye aur inka client-attribution likha jaana **baaki hai** — ship se
pehle confirm ho jaaye, kyunki design se hatna client se aata hai, developer se nahi (R15).

### §2 — Widgets ek **ordered list** hai, teen slot nahi

Client ne "teen cheezein" kaha. Wo teen **types** hain, teen **khaane** nahi — yaani ek
sidebar me do HTML widget bhi ho sakte hain, aur unka **kram** client tay karta hai.

Wajah reference me hi hai — do page pe kram alag hai:

| Page                                     | Kram                                                     |
| ---------------------------------------- | -------------------------------------------------------- |
| `tour-v3.html:1849+`                     | Packages by duration → Talk to a planner → Enquiry form   |
| Aaj ka package page (`PackagePage.jsx:770`) | Enquiry form → Talk to a planner                      |

Teen fixed slot rakhne ka matlab hota ki kram bhi fix ho jaata aur doosra HTML widget kabhi
ban hi nahi sakta.

Aur **"Talk to a planner ka checkbox" alag se banta hi nahi** — widget list me hona hi on
hai, hata dena hi off. Ek hi cheez ke do control (list me maujood + ek checkbox) wahi shakl
hoti jo D-86 ke slug pe thi.

Shape wahi **FROZEN `{ id, type, props }`** hai jo `content.blocks[]` ka hai (D-87 §7), par
**apna alag enum** — `blockSchema` reuse nahi hota. `packageList` sidebar me bemaani hai aur
`talkToPlanner` main content me; ek hi enum me daalna wahi jhootha control banata jo
`optionalTag` pe bana tha (`form.js:140`).

| type            | props                | Data kahan se                                                        |
| --------------- | -------------------- | -------------------------------------------------------------------- |
| `enquiryForm`   | `{ formId }`         | `forms` collection — sirf `active`                                   |
| `talkToPlanner` | `{ heading }`        | Sab **derive** — phone/whatsapp `settings` se, email form ke `emailTo` se |
| `html`          | `{ heading, html }`  | TinyMCE, **write pe sanitize** (R20)                                  |

⚠️ `talkToPlanner` ke props me contact **kabhi nahi** — 2 Sep ko `settings.contactEmail`
isi liye palta tha. Koi contact na ho to widget render hi nahi hota (D-30).

### §3 — Storage flat, payload resolved

`project-state.md` me likha tha ki `fields.sidebar` string se `{ position, id }` banega.
**Ulta kiya gaya — do flat field:**

| Field              | Value                          | Kyun                                                                                                        |
| ------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `fields.sidebar`   | `none` · `left` · `right`      | Ship ho chuka, tested (`entries.test.js:2807`), aur theme ise **wrapper** pe use karti hai (`.pgl--sideleft`) |
| `fields.sidebarId` | string / khaali                | Purely additive                                                                                              |

Object banane ka matlab hota entries pe **migration**, payload ka shape badalna, aur teen
test dobara likhna — un teenon ki keemat kuch nahi khareedti.

⚠️ `sidebarId` bhara ho par `sidebar: 'none'` ho to value **rehne do, mitao mat** — client
left/right toggle karke wapas aayega. Wahi soch jo D-87 §3 ki rating pe hai (override karta
hai, mitata nahi).

Payload me theme ko `sidebarId` **kabhi nahi** jaata — `toPublicPage()` use **server pe**
resolve karti hai:

```
entry.sidebar        'left'          ← jaisa hai, layout ke liye
entry.sidebarWidgets [ {...}, ... ]  ← naya, content ke liye
```

Dono top-level, aur **ek bhi purana test nahi tootta**. Yahi wo lakeer hai jo client ne khud
khinchi thi — layout page ka, content site ka.

⚠️ **Alag endpoint bilkul nahi.** Slice B me yahi bachaya gaya tha aur D-83 wahi bug tha:
alag call `path:` tag aur ISR dono se bahar hoti hai, yaani har page load pe ek aur round trip.

### §4 — Package page ko haath nahi lagega (client, #7)

Uska sidebar `PackagePage.jsx:770` pe hardcoded hai — enquiry form + Talk to a planner — aur
waisa hi rahega. Isse teen kharche apne aap khatam ho gaye: mojooda paanch package pe backfill
migration, `MobileBar` wali 2 Sep ki interaction, aur `forms.placement` ka duplicate hona.

⚠️ **`forms.placement` zinda rahega**, aur wo ab bhi theek hai: `placement` sirf **package
pages** ko serve karta hai, sidebar widget ka `formId` sirf **page/tourPage** ko. Dono kabhi
milte hi nahi, isliye ye D-86 wali "ek hi cheez ke do naam" **nahi** hai. `form.js:152` ka gap
(paanch placement design hui, do bani) isse na khulta hai na band hota hai.

### §5 — Kaunse type ko picker **kab** milega

| Type            | Kab                                                              |
| --------------- | ---------------------------------------------------------------- |
| `tourPage`      | **Ab** — `fields.sidebar` maujood hai, `sidebarId` jodna hai      |
| `package`       | **Kabhi nahi** — hardcoded (#7)                                  |
| `page` · `post` | **Jab unki screens banengi** (A-9)                               |

⚠️ `page` ka `fields: []` hai aur uski screens `NotBuiltYet` pe (`content-types.js:325`) — wo
8 Sep ko _"Pages par kaam to ho hi nahi raha"_ pe wapas ki gayi thi. Sidebar picker ek
**field** hai aur use set karne ke liye **edit screen** chahiye. **A-9 is kaam me dobara nahi
khulega** — wahi galti hai jo Slice C me hui thi.

### §6 — Kya jaan-boojh kar NAHI banega

- **`On this page`** — client ne defer kiya (#8). Wo `tour-v3.html` me hai hi nahi; sirf
  `page-template.html:1862` me hai, aur Pages ki screens bani nahi. Jab banega tab ye tay hoga
  ki uski **jagah** sidebar ki list me ho aur **on/off** page pe — ya wo hamesha sabse upar aaye
- **`packagesByDuration` ka derived widget** — client ne saaf kaha ki wo HTML se banega.
  ⚠️ Keemat: daam haath se likhe jaayenge aur wo purane ho sakte hain
- **Niyam ki table** (design v3 wali) — §1
- **Sidebar delete pe guard** — delete hamesha chalega (D-79 ka precedent). Jis page ka
  `sidebarId` gayab ho, wahan sidebar **render hi na ho** (D-42 §2: toota hua kabhi nahi)
- **"Used on N pages" column** — wo per-row query maangta hai, theek wahi jo Tour list ke
  `Packages` column pe abhi adhoora pada hai

### §7 — Kaante

| Kaanta                                   | Kya karna hai                                                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sanitize bhoolna**                     | `html` widget ki HTML write pe saaf ho (R20). Bhoolne pe content girta **nahi**, wo **bina safai ke bach jaata** hai — CLAUDE.md ke mutabik ye `updatePackageDefaults()` wale whitelist jaal se **zyada khatarnak** hai |
| **Migration lagegi**                     | Slice A–C me koi nahi lagi thi. Yahan `sidebars` ke indexes + roles me `sidebar.read`/`sidebar.update` ka sync chahiye (021 ne roles ke liye yahi kiya)                            |
| **`pnpm format` pehle, migrate baad me** | D-82 — do baar ulta hua aur checksum guard ne pakda                                                                                                                               |
| **Collection ka naam `sidebars`**        | Pehle se lowercase, to A-18 wala `importRuns`/`importruns` jaal yahan nahi lagta. Migration me bhi wahi naam                                                                       |
| **Bekaar `sidebarId` pe 500 nahi**       | Chup-chaap gir jaaye — package list ke tests me ye niyam pehle se hai                                                                                                             |
| **Cache**                                | Sidebar save pe `type:page` + `type:tourPage` revalidate. Yahi `forms` wala precedent hai (`public/service.js:1296`), naya machinery kuch nahi                                     |
| **Drag pehle se maujood hai**            | `lib/drag-list.js` + `SortablePanels.jsx`. Ise "baad me lagayenge" likhna wahi chup ka udhaar hai jo 8 Sep ko blocks ke ⌃⌄ button pe pakda gaya tha                              |

### §8 — Module ka shape

Ek collection, ek module (paanch file). ⚠️ `menus` se farak: usme `menuLocations` doosri
collection thi kyunki assignment menu ke bina bemaani hai. Yahan assignment **page pe** hai
(`fields.sidebarId`), isliye **location table ki zaroorat hi nahi**.

### §9 — `Cards` aur `Two column` ko apna heading + description (client, 8 Sep)

**Design se chhata farak** (§1 ki table ka agla row). `admin-design-v3.html` ke panels me:

| Block          | Design me heading field |
| -------------- | ----------------------- |
| FAQs           | ✅ (line 974)           |
| Package list   | ✅ (Slice A me joda)    |
| **Cards**      | ❌ sirf `Columns` (906) |
| **Two column** | ❌ sirf `Split` (936)   |

### Sawaal jisne ise khola

Client ne poochha: _"`How many days are enough for Andaman?` is section me cards bhi hai aur
heading + description bhi — heading + description kahan dun?"_

Reference me wo teenon **ek hi `.blk`** ke andar hain:

```html
<div class="blk">
  <h2>How many days are enough for Andaman?</h2>
  <p>The honest answer is decided by the ferries…</p>
  <div class="dgrid"><div class="dcard">…</div></div>
</div>
```

Design ka jawab ye hai ki heading aur prose **upar wale Text block** ke hain. Par hamare model
me Text apna block hai — yaani **admin me do panel, page pe ek dabba**. Aur `.blk` sirf spacing
nahi hai, wo ek **card** hai (`background` + `border` + `border-radius` + `padding`,
`globals.css:1672`), to do block = **do alag safed dabbe**.

### Do raaste the

| Raasta                          | Kya hota                                                                    | Keemat                                                                          |
| ------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **A** — theme render pe group kare | Text ek section shuru karta, uske baad ke layout blocks usi me judte, agle Text tak | Ek **jaadu jo admin me dikhta hi nahi** — client do panel dekhta, page pe ek dabba |
| **B** — block apna heading rakhe | Har layout block **apna poora section**                                     | Design ke do panel se vichlan                                                   |

**Client ne B chuna**, aur wo theek hai — teen wajah se:

1. **Ye zyada consistent hai, kam nahi.** `faqs` aur `packageList` ke paas ye pehle se hain;
   `cards` aur `twoColumn` hi apwaad the.
2. **Reference ke dono cards section ek-ek block se ban jaate hain** — `tour-v3.html:1683`
   (heading + description + cards) aur `:1789` (heading + cards, bina description). Kisi Text
   block ki zaroorat hi nahi bachti.
3. **Admin == page.** A me client ko ek aisa behaviour yaad rakhna padta jo screen pe likha hi
   nahi hai.

⚠️ **A ka ek chhupa hua nuksaan bhi tha:** grouping ka niyam theme me hota, aur Phase 5 ka
builder isi data ko uthayega — us din wo niyam builder me dobara likhna padta, ya wahan page
alag dikhta. Block ka heading block ke apne props me hona is sawaal ko hamesha ke liye band kar
deta hai.

### Jo jaan-boojh kar **nahi** kiya

**"Upar wale se jodo" wala checkbox nahi banaya.** Wo theek wahi galti hoti jo 8 Sep ko
`showBadges` aur `emitSchema` pe pakdi gayi thi: _jo cheez apne aap sahi ho sakti hai, uspe
toggle rakhna client ko ek aisa faisla dena hai jo uska hai hi nahi._

### Keemat

⚠️ Client ab heading block me bhi likh sakta hai **aur** upar Text block me `<h2>` bhi — tab do
heading dikhengi. Ye risk `faqs` aur `packageList` pe **pehle se** hai aur aaj tak problem nahi
bani, isliye iske liye koi rok nahi lagayi gayi.

### Kya badla

- `cardsPropsSchema` aur `twoColumnPropsSchema` me `heading` + `description` — dono
  `.default('')` pe, isliye **koi migration nahi**; purane blocks waise ke waise parse hote hain
- `description` `faqs` wali hi shakl me hai: `htmlSchema.pipe(max 2000)`, aur admin me **asli
  editor** (D-69 wala tark — client ko bold aur link chahiye hote hain)
- ⚠️ **`sanitizeContent()` me dono jodna zaroori tha** — `cards.description` aur
  `twoColumn.description`. Ye wahi jaal hai jo is file me teen jagah likha hai: chhoot jaane se
  content girta **nahi**, wo **bina safai ke bach** jaata hai
- Admin me teenon block ab ek hi `SectionHeadingFields` component use karte hain — do (ab teen)
  copies wahi galti hoti jo `bestFor` aur `cancellationText` pe ho chuki hai
- Band panel ka summary ab **heading** dikhata hai — client section ko uske naam se pehchanta
  hai, uske `50-50` ya `3 columns` se nahi

---

## D-89

**Design se milaan — client ke screenshot se pakde hue farak**
_8 Sep 2026 · client ka faisla · Slice D ke baad ka daur_

### Sandarbh

Slice D ban jaane ke baad client ne page **chala kar** dekha aur design ke saath section-by-section
milaan karwaya. Us daur me **13 farak** nikle. Do baatein unme saaf dikhti hain:

1. **Zyada tar farak "bana hua par juda nahi" wale the** — schema, payload aur admin teenon
   maujood, aur theme me use padhne wala koi nahi. Ye wahi shakl hai jo D-82 (`seoSchema`),
   D-65 (`cancellationText`) aur D-86 (teen mare hue guard) pe pehle bhi thi.
2. **Do jagah maine reference dekhe bina maan liya tha ki kya hona chahiye** — byline aur
   package list ka `.blk`. Dono baar reference ne ulta kaha.

### Naye contract (paanch)

| Kya | Kahan | Kyun |
| --- | --- | --- |
| `tourSettings.heroButton { label, url }` | `settings.js` | Hero ka pehla button. **Dono chahiye** — ek bhi khaali ho to button nahi dikhta |
| `twoColumnPropsSchema.style` | `page.js` | `plain` \| `includedExcluded` |
| `htmlWidgetSchema.props.icon` | `sidebar.js` | Widget ke heading ka icon — **shared `ICONS`** pe |
| `enquiryFormWidgetSchema.props.heading` + `.description` | `sidebar.js` | `.wdg--cta` ka `<h3>` + `<p>` |
| `unwrapBareSpans()` | `core/sanitize-html.js` | Paste ke saath aaya bekaar `<span>` |

**Koi migration nahi** — paanchon `.default()` pe hain, purana data waise ka waisa parse hota hai.

### §1 — Hero: button ke do alag source (client ka faisla)

Client: _"only Get my itinerary & price in tour settings, whatsapp to settings ke general se
utha lega."_

| Button | Kahan se |
| --- | --- |
| Pehla | `Tour ▸ Tour settings ▸ Hero button` — label + link |
| WhatsApp | `Settings ▸ General` ka number — **koi alag field nahi** |

⚠️ WhatsApp ke liye field na banana ek faisla hai: number wahan pehle se hai, aur dobara maangne
ka matlab hota ek hi number do jagah — theek wahi galti jo 2 Sep ko `settings.contactEmail` pe
pakdi gayi thi. Uska **label** theme me likha hai (ek shabd, har site pe wahi) — wahi tark jo
`Planner` ke "Chat with us" aur card ke "Best for" pe hai.

⚠️ **h1 me `₹11,499 pp` ka neela `<em>` nahi bana** — client ne "kuch mat karo" chuna. `title`
plain text field hai aur wo list, SEO, `<title>` tag, breadcrumb aur schema paanchon jagah jaata
hai; use HTML banane ka matlab hota har jagah tags strip karna.

### §2 — Byline: faisla sahi tha, uski **jagah** galat thi

Byline har page pe laga di gayi thi, D-87 ke faisle #9 (_"byline poori tarah automatic"_) ke
bharose. Client ne pakda: _"vbyline to tour page ke design me hai hi nahi."_

Reference gine gaye:

| File | `byline` / `min read` |
| --- | --- |
| `tour-v3.html` | **0** |
| `itinerary-v3.html` | **0** |
| `page-template-text.html` | **11** |

Yaani byline ek **article** page ki cheez hai, listing page ki nahi. Ab wo sirf `type === 'page'`
pe render hoti hai.

⚠️ **Sabak:** faisla #9 batata hai ki byline ka **data kahan se aata hai** — ye nahi ki wo **kis
page pe dikhta hai**. Ek faisle se doosra maan lena wahi galti hai jo Slice C me hui thi (_"ek hi
edit screen"_ ko _"ek jaise types"_ samajhna).

⚠️ Payload me `byline` phir bhi jaata hai aur uske tests bhi hain — wo galat nahi tha.

### §3 — Jo "bana hua par juda nahi" tha

| Cheez | Haalat |
| --- | --- |
| **Trust badges** | Schema + admin screen + payload teenon Slice C me bane, theme me koi padhta hi nahi tha |
| `Icon.jsx` me `shield`/`pin`/`doc`/`check` | `trustBadgeSchema` ka enum inhe shuru se deta hai aur admin ka dropdown dikhata hai — par unke SVG the hi nahi. Client `shield` chunta, save hota, page pe kuch na dikhta |
| `.prow__off` (`22% off`) | CSS aur value dono nadaarad |
| `.wdgl` · `.wdg__b` · `.wdg__h svg` · `.wdg--cta` · `.vhero__cta` · `.vhero__trust` | CSS likhi hi nahi gayi thi |
| `StickySide` | Component pehle se tha, tour page pe lagaya nahi gaya |
| `entry.url` | 4 Sep se bheja ja raha tha; `EntriesList` purana `entry.path` padh raha tha |

⚠️ **In sab ka lakshan ek hi hai — "kuch na hona".** Koi error nahi, koi 500 nahi. Yahi D-86 me
likha gaya tha aur yahi phir se hua.

### §4 — Do jagah reference ne mera andaza ulta kiya

**Package list pe `.blk` nahi hai.** Maine har block ko `.blk` de diya tha; reference me wo ek
saada `<div id="pklist">` hai (`tour-v3.html:1432`). Cards khud apne dabbe hain — unhe ek aur
dabbe me rakhna do border ek doosre ke andar bana deta tha.
⚠️ Keemat: us section se `content-visibility` bhi gaya (D-85). **A-17 dobara naapte waqt hisaab
me rahe.**

**Duration pill pe ginti nahi hai.** Maine `<i>{count}</i>` daal diya tha; reference me pill sirf
`2N / 3D` hai aur ginti `.fbar__c` me daayein kinare pe. Server phir bhi `count` bhejta hai aur wo
theek hai — wo `limit` se pehle gini jaati hai.

### §5 — `Two column` ko `Included / Not included` (client ka chunav)

Design me wo do rangeen dabbe hain — baayan halka neela hara heading ke saath, daayan halka
gulaabi laal heading ke saath.

Theme ko kaise pata chale ki kaunsa khaana "not included" hai? Heading me "Not" dhoondhna bhasha
pe nirbhar hota aur chup-chaap galat hota. Client ne dropdown wala raasta chuna: **doosra khaana
hamesha "not included"** — wahi kram reference me hai.

✅ **Iske liye ek bhi nayi CSS nahi likhni padi** — `.inx`, `.inx__c`, `.inx__c.no` aur unke `h3`
ke rang `globals.css` me pehle se the (package page ke "What's included" ke liye). Bas wahi
wrapper laga diya.

⚠️ Us style pe `ratio` lagta hi nahi (`.inx` hamesha `1fr 1fr`), isliye admin me `Split` chhup
jaata hai.

### §6 — ⚠️ Do jagah CSS **client ki likhi hui class** pe nirbhar thi

Ye D-89 ka sabse kaam ka hissa hai.

**`.wdgl`** — client ne editor me `<ul class="wdgl">` likha tha. Wo class DB me **thi**, phir kai
save ke baad **gayab ho gayi** (`version: 27` pe sirf `<ul>` bacha tha). Sanitizer nirdosh hai —
uspe seedha chala kar dekha, wo `class` ko chhoota hi nahi. Yaani wo **editor me** khoyi.

**`.faq p`** — FAQ jawab ka padding sirf tab lagti thi jab jawab `<p>` me lipta ho. Client ka
pehla FAQ **plain text** tha aur baaki `<p><span>…` — nateeja: pehla jawab kinare se chipka, baaki
theek.

**Dono ka ilaaj ek hi hai:** look ko us markup ka mohtaaj mat rakho jo editor **shayad** dega.

- `.wdgl, .wdg__b ul` — saadi list bhi sahi dikhti hai; `.wdgl` alias ki tarah zinda hai
- `.faq details > div` — padding wrapper pe, jo hamesha hota hai

⚠️ **Ye ek naya, aam khatra hai, do jagah ka ittefaq nahi** — A-19 me khula rakha gaya hai.

### §7 — Paste ke bekaar `<span>`

Client ne FAQ me saada text paste kiya aur Text tab me `<p><span>No. Roundtrip flights…</span></p>`
dikha. Use laga ki **kuch aur paste ho gaya**; text bilkul sahi tha.

Wo span browser ke clipboard se aata hai, aur bach isliye jaata hai ki D-80 me humne TinyMCE se
khud kaha tha _"kuch mat chhaanto"_ (`valid_elements: '*[*]'`) — taaki client ka `class`/`id`/
`style` na gire.

Ab safai **do jagah** hai, aur wo jaan-boojh kar hai:

| Kahan | Kaam |
| --- | --- |
| `unwrapBareSpans()` — server | **Authority.** Editor kuch bhi de, DB me saaf jaata hai |
| TinyMCE ka `paste_postprocess` | Sirf UX — client ko **turant** saaf HTML dikhe |

⚠️ **Sirf attribute-rahit `<span>` khulta hai.** `<span class>` aur `<span style>` bilkul chhue
nahi jaate — D-80 ka poora vaada usi pe khada hai.

⚠️ Do cheezein jaanch kar **khaarij** ki gayin, taaki dobara shak na ho: editor ka binding sahi
hai (har FAQ ka apna `key`/`value`/`onChange`), aur tab-switch ka logic bhi sahi hai (Visual me
paste purane draft se overwrite nahi hota).

### §8 — `Tour settings` ab `Settings` me nahi, `Tour` me

`/settings/tour` → `/tour/settings` (client). Storage wahi (`settings.tourSettings`), permission
bhi wahi (`settings.read`) — sirf menu me jagah badli. Screen ka heading `Tour` hua aur
`SettingsTabs` hata di, warna nav kuch aur kehti aur screen kuch aur.

### §9 — ⚠️ Design v3 se ab **saat** farak

D-88 §1 ki paanch, D-88 §9 ka chhata (Cards/Two column ka heading), aur ab ye saatvaan:
`Two column` ka `Style` dropdown. **Client-attribution abhi bhi likha jaana baaki hai.**

### ⚠️ Ek galti jo maine do baar ki

Dev server chalte waqt `next build` chalaya — dono ek hi `.next` folder use karte hain, aur build
ne dev ke vendor chunks ke upar likh diya. Har page **500** dene laga
(`Cannot find module './vendor-chunks/zod@3.24.1.js'`). Code me kuch nahi tooTa tha.

**Niyam: `next build` sirf tab jab dev band ho.** (D-85 me bhi yahi likha hai, par wahan wajah
alag thi — dev ka naapa hua number bemaani hota hai.)

---

## D-90

**Tour page ka aakhri daur — client ke pandrah kaam**
_9 Sep 2026 · client ka faisla · D-89 ke baad, Tour page band karne se pehle_

### Sandarbh

D-89 wala milaan ho jaane ke baad client ne page dobara chala kar dekha aur **pandrah** cheezein
gina di — kuch naye field, kuch missing control, kuch naap aur rang. Ye "design review" ka doosra
daur tha, aur uska character pehle daur se alag hai:

- D-89 me zyada tar farak **"bana hua par juda nahi"** wale the
- D-90 me zyada tar farak **"theme content pe bharosa kar rahi thi"** wale hain — CSS ya markup us
  cheez ka intezaar kar raha tha jo client ke likhe HTML me shayad ho, shayad na ho

Doosri kism zyada khatarnak hai, kyunki wo **kabhi-kabhi** kaam karti hai. Teen table me se do pe
`.tblw` tha aur ek pe nahi; do FAQ `<p>` me the aur ek plain text tha. Aisi cheez testing me
nikalti hi nahi.

### §1 — Naye contract (do)

| Kya | Kahan | Kyun |
| --- | --- | --- |
| `fields.heading` — `pageHeadingSchema` | `schemas/page.js` + `content-types.js` | Page ka **dikhne wala** `<h1>` |
| `packageListPropsSchema.linkLabel` + `.linkUrl` | `schemas/page.js` | Heading ke daayein `.viewall` link |

**Koi migration nahi** — dono `.default('')` pe hain.

Ek teesri cheez payload me judi par wo contract nahi hai: **`enquiry.sourceUrl`** — wo `sourcePath`
se `env.SITE_URL` laga kar controller me banta hai, DB me kuch naya nahi jaata.

### §2 — `title` ka kaam chhota ho gaya

Ye is daur ka sabse bada dhaanche wala badlaav hai.

Pehle `entry.title` **sab kuch** tha: page ka `<h1>`, slug ka source, breadcrumb, admin ki list,
SEO title, schema, aur card ka naam. Client ko `<h1>` me styling chahiye thi — design me
`₹11,499 pp` neela hai — par `title` me HTML daalna har doosri jagah pe tag chhaap deta.
`<title>` tag ke andar `<em>` browser ke tab me literally dikhta hai.

Ab batwara saaf hai:

| Kahan | Kaun |
| --- | --- |
| Page ka `<h1>` | **`fields.heading`** (naya) |
| Slug · breadcrumb · admin list · SEO · schema · cards | `title` (plain, jaisa tha) |

Client ke apne shabd: _"current jo hai use only slug ke liye rakhte hain, to breadcrumb bhi simple
ho jayega."_

⚠️ **`inlineHtmlSchema` pe hai, `htmlSchema` pe nahi — aur wahi poora point hai.** Inline profile
me block tags (`<p>`, `<h2>`, `<ul>`, `<table>`) allowed hi nahi, isliye `<h1>` ke andar wo ghus hi
nahi sakte. Do jagah pehra hai aur dono zaroori hain: `normalizeFields()` me parse (shape), aur
`sanitizeEntryFields()` me `sanitizeInlineHtml` (safai, R20).

⚠️ **Khaali chhodo to theme `title` pe girti hai** — wo fallback **theme me** hai, payload me
nahi. Payload me bhar dena do jagah wahi text rakhna hota, aur ek din wo alag ho jaate. (D-65 me
tark ulta tha: wahan default **server ka** hai, isliye resolve server pe hota hai. Yahan default
`title` hai, jo payload me pehle se maujood hai.)

### §3 — Editor ek jaisa rakhna, chahe keemat lage

Pehle `Page heading` ka apna **chhota** toolbar tha — bold · italic · highlight · link, koi tabs
nahi. Wo soch kar banaya gaya tha: field `<h1>` me chhapta hai, to usme heading dropdown aur image
ka button dikhana hi nahi chahiye.

Client ne mana kiya: _"page header ka editor different kyu hai other editors se, make it same
becouse admin could be confuse."_

Faisla: **ek jaisa editor jeeta.** Ab wahi `HtmlEditor` hai jo baaki jagah hai.

⚠️ **Iski keemat hai aur wo bhugtani padegi:** toolbar me ab heading dropdown, list aur image
dikhte hain, par save pe wo gir jaate hain (inline profile). Yaani UI ek cheez ki ijaazat deti
dikhti hai jo hoti nahi — normally ye bug hota. Yahan wo jaan-boojh kar hai, aur uska ilaaj
**field ki hint** hai, jo pehle se bata deti hai ki kya bachega.

⚠️ Uske saath `HtmlEditor` ka **`Highlight` button hat gaya** — wo sirf us chhote toolbar ke liye
bana tha. Ab heading ka neela tukda **Italic** se banta hai: theme me `.vhero h1 em` ko
`font-style: normal` ke saath accent rang milta hai (`tour-v3.html:719`), yaani wahan `<em>`
tirchha hota hi nahi. Ye hint me likha hai — warna client tirchha maangta, neela paata, aur use
bug samajhta.

### §4 — "Bana hua par juda nahi" — teen aur (D-89 §3 ka silsila)

| Cheez | Kab se maujood | Kya nadaarad tha |
| --- | --- | --- |
| **Per-package rating** | D-87 §3 (7 Sep) | Admin me bharne ka koi raasta hi nahi — `PackageEdit` pe panel tha hi nahi |
| **`statSchema.highlight`** | D-87 (7 Sep) | Admin me tick karne ka checkbox nahi — hamesha `false`, `.vrail__c--p` ka neela rang kabhi aata hi nahi |
| **Package page ki rating** | D-87 §3 (7 Sep) | `PackagePage.jsx` abhi bhi `defaults.rating` padh raha tha (purana D-70 wala comment saath tha). Card update ho gaya tha, page nahi |

⚠️ **Teesra sabse seekhne layak hai.** D-87 §3 ne rating per-package ki, `toPackageCards()` badal
gaya — par `PackagePage.jsx` chhoot gaya. Client ne bilkul yahi shakl bataayi: _"card me updated
hai, page pe purana 412 aa raha hai."_ Ek hi baat ke **do padhne wale** the aur sirf ek badla.

Ab wo `entry.rating ?? defaults?.rating` hai. Live check: 412 → 350.

### §5 — ⚠️ Theme ne content pe bharosa kiya, teesri baar

D-89 §6 me do jagah mili thi (`.wdgl`, `.faq p`). 9 Sep ko **teesri** mili, aur ab ye ek pattern
hai, ittefaq nahi.

**Tables.** `.tblw` me `border-radius` ke saath **`overflow-x: auto`** bhi hai. Client ke teen
table me se do pe wrapper tha, ek pe nahi — us ek pe na gol kone aaye, aur mobile pe wo apni
`min-width: 520px` le kar page se **bahar nikal gayi**. Client ne dono lakshan bataye.

⚠️ **Maine pehle ise content ki galti kaha tha, aur wo galat tha.** Ye wahi kism ki cheez hai jise
theme ko sambhalna chahiye. Ab `wrapTables()` (`components/tour/Blocks.jsx`) har `<table>` ko khud
lapetta hai — `richText` me aur `twoColumn` ke dono khaano me.

Wo **do kadam** me chalta hai aur kram maayne rakhta hai:

1. purane `.tblw` wrapper **hatao**
2. phir sab pe ek jaisa **lagao**

Sirf doosra kadam karne se pehle se lipti tables **do baar** lipat jaatin — do border, ek doosre ke
andar.

Regex HTML pe aam taur pe bura auzaar hai; yahan chalta hai kyunki daayra tang aur maloom hai —
`<table>` apne andar `<table>` nahi rakhti, aur ye HTML sanitizer se ho kar aa chuki hai.

**Ab teenon jagah ka niyam ek hi hai:** _look ko us markup ka mohtaaj mat rakho jo editor **shayad**
dega._

### §6 — Naap aur rang (client ke chhe)

| Kya | Kya hua |
| --- | --- |
| **₹ patla chhap raha tha** | `RupeeLocal` ka pehla `@font-face` bina `font-weight` descriptor ke tha, yaani **400**. Jahan daam `font-weight: 900` pe hai, wahan ank bold aur ₹ regular — ek hi shabd me bagal-bagal. Naya face `local('Segoe UI Bold')…` `font-weight: 700 900` pe. **Kuch download nahi hota** (D-85 ne 85 KB wali file hataayi thi, wo wapas nahi aayi) |
| **`.blk` pe base 14px** | Client ne 1 Sep ko `body` pe `15px` lene se mana kiya tha (_"only line height"_), yaani jo apna naap nahi likhta wo browser ke 16px pe girta hai. `.blk p`/`h2`/`.tbl` ke apne naap the; client ke likhe `<ul>`/`<li>` ka koi rule tha hi nahi. Ab base block pe hai — apna naap likhne wala waise bhi jeet-ta hai |
| **Paragraph ka gap** | `.blk p + p { margin-top: 10px }` **2 Sep ko chup-chaap comment ho gaya tha** (commit `3f6ca4c`, jiska maqsad mobile pe rating khiskana tha — debugging ka bacha hua). Nateeja: package page **aur** tour page dono pe paragraph chipke hue. 7 din tak kisi ne nahi dekha |
| **Tour page ka background** | Reference ka `body` tinted hai, hamara safed. Package page tint `.pkg` se leta hai; tour ke paas wrapper tha hi nahi. Naya `.tour { background: #f4f7fb }`. ⚠️ `body` badal kar theek **nahi** kiya — wo har page pe lagta (post ka fallback bhi) |
| **Do jagah dugna padding** | Breadcrumb ka `padding-top`, aur `.pgl--sideleft` ka `padding-bottom` — `.sec` pe pehle se padding thi |
| **Responsive** | `.dgrid` tablet pe 3 column; `.vrail__in` tablet 4 / mobile 2 |

⚠️ **Do baar client ne "FAQ ke neeche bekaar jagah" bataayi aur dono baar wajah alag thi** — pehli
baar `.pgl--sideleft` ki padding, doosri baar CTA ka **safed band safed page pe** (dikhta hi nahi
tha, par jagah ghera rahi thi). Doosri wali `.tour` ke tint se apne aap theek hui.

### §7 — Mobile sidebar (client ka niyam)

Mobile pe teen widget ke teen alag natije chahiye the:

| Widget | Mobile pe |
| --- | --- |
| `Packages by duration` (html) | **rahega**, jaisa hai |
| `Talk to a planner` | **chhup jayega** |
| Enquiry form | **popup**, `.mobar` ke saath — bilkul itinerary page jaisa |

⚠️ **Ye rule do baar galat likha gaya, aur dono baar wajah ek hi thi: selector wo baat poochh raha
tha jo wo jaanta hi nahi tha.**

1. Pehle `.wdg:not(.wdg--book)` — _"book ke alawa sab chhupa do"_. Sidebar me sirf **do** widget the
   (Planner + form) tab tak chala; tour page aate hi wo `Custom HTML` widget bhi kha gaya
2. Phir `.pgl:not(.pgl--tour)` — maine maan liya tha ki _"tour page pe koi `.mobar` hai hi nahi"_.
   **Wo galat tha** (`tour-v3.html:2038`)

Ab selector wahi kehta hai jo matlab hai: **`.pgl__side .wdg--planner` chhupta hai.** Baaki sab
`.wdg--book, .wdg--cta` ke popup rule se aa jaata hai.

⚠️ `.wdg--cta` me `.bkg__t` (neela price header) hota hi nahi — wahan heading aur uske neeche ki
line hai. Sheet me wahi chipki rehni chahiye aur fields scroll karein, warna heading scroll me upar
chali jaati hai aur user ko pata hi nahi chalta ki wo kya bhar raha hai.

### §8 — Enquiry ka poora URL

Detail screen pe `Submitted from /packages/discover-andaman` likha aata tha. Admin apne hi origin
pe chalta hai (`:5173`), to wo relative path **admin ka** pata lagta hai — aur us text ko copy
karke koi khol hi nahi sakta tha.

⚠️ **Ye wahi chup bug hai jo `entries` pe 4 Sep ko pakda gaya tha (`withUrl`), aur usse pehle Bulk
Upload ke result pe (D-81). Teesri baar.**

`sourceUrl` server pe `env.SITE_URL` se banta hai (`forms/controller.js`), kisi setting se nahi —
wahi pattern jo `entries/controller.js` pe hai. Settings se lene ka matlab hota `settings.read` ke
peeche chala jaana, jo `salesAgent` ke paas hai hi nahi — aur usi ke liye ye screen bani hai (D-29).

⚠️ `sourcePath` **hataya nahi gaya** — list ke `enq-src` column me wo abhi bhi chhota dikhta hai,
aur wahan poora URL bemaani hota.

⚠️ **Ye abhi tak asli enquiry pe verify nahi hua** — test enquiry maujood hi nahi thi.
`09-OPEN-ITEMS.md` me khula hai.

### §9 — `.viewall` link — text bhi field hai, sirf URL nahi

Reference me heading ke daayein _"Need something custom? →"_ hai (`tour-v3.html:1436`). Client ne
**dono** field maange, sirf URL nahi.

Theme me text likh dene ka matlab hota ki wo har client ki site pe wahi rahe aur admin se badla hi
na ja sake — wahi Q-9 wala kaanta jo `TAB_NOTE` pe abhi tak khula hai.

⚠️ **Dono chahiye** — ek bhi khaali ho to link render nahi hota (D-30). Aadha link ek aisa button
hai jo click pe kuch nahi karta; wahi rok `heroButton` (D-89) aur D-67 ke CTA button pe hai.

### §10 — ⚠️ Design v3 se ab **saat** farak, attribution abhi bhi baaki

D-89 §9 me saat gine gaye the. D-90 ne unme **naya farak nahi** joda — `Page heading` aur
`Link label`/`Link URL` dono `admin-design-v3.html` me hain hi nahi, par wo client ke seedhe
maange hue field hain, andaza nahi.

**D-88 §1 ke #2–#5 ka client-attribution likha jaana abhi bhi baaki hai.**

### ⚠️ Ek galti jo is daur me hui

`git add -A` ne client ke apne hand-edit (`RatingPanel.jsx` aur `PackageEdit.jsx` se teen hint
hataana) **table wale commit me** kheench liye — commit message me unka koi zikr nahi hai.
Commit `6869feb` me wo saath hain.

**Niyam: commit se pehle `git status` padho, aur `-A` tabhi jab pata ho ki tree me sirf apna kaam
hai.** Client screens khol kar baitha ho sakta hai.

---

## D-91

**Blog — post ka page, listing page, aur post ke URL ka switch** (9–10 Sep, spec 008)

Client ne `blog-detail-v1.html` aur `blog-v1.html` di, aur **kaam ka kram khud chuna**: pehle
detail, phir listing. Poora contract [`specs/008-blog.md`](../specs/008-blog.md) me hai.

Ye D-87 (Tour Page) ki hi shakl hai — A-9 ka bacha hua `post` wala aadha + Phase 3 ka public
render — par usse teen cheezein alag nikli, aur teenon niche likhi hain.

### §1 — Client ke faisle jinpe poora design khada hai

| # | Faisla | Nateeja |
| - | ------ | ------- |
| 1 | Listing ka filter + pagination **client-side** | saare post ek payload me; `POST_LIST_CAP = 200` uski keemat hai |
| 2 | Post ka editor = `richText` + `faqs` | FAQ alag block, kyunki `FAQPage` schema usi se banti hai |
| 3 | Byline **sirf `blogSettings.author`** se | `authorId` andar rehta hai, page pe kabhi nahi (R10) |
| 4 | `postPicks` widget — client khud chunta hai | **view counting hai hi nahi**, aur wo jaan-boojh kar |
| 5 | TOC pe ek checkbox, "sabke liye" | ⚠️ maine ulta suggest kiya tha, client ne palta (R15) |
| 6 | Mobile pe form popup + CTA settings se | dono maujooda component — `EnquiryDockProvider` + `CtaSection` |
| 7 | Post ki heading `title` se **alag** | 9 Sep ko maine ulta tay kiya tha; client ne 10 Sep ko palta |
| 8 | Post ke URL ka switch `Blog settings` me | `/blog/{slug}` ↔ `/{slug}`, **301 ke saath** |

### §2 — ⚠️ `hierarchical` se URL switch nahi ban sakta

Pehli soch yahi thi: `nested` mode me `post.hierarchical = true` kar do aur path parent chain
se bane. **Wo chalta nahi** — `ensureBuiltInContentTypes()` `hierarchical` ko **har seed pe**
wapas seed ki value pe le aata hai (uska apna comment: _"`fields` `supports` `taxonomyTypes`
`hasBuilder` `hierarchical` → hamesha"_). Agla `pnpm seed` client ki setting chup-chaap palat
deta.

`urlPattern` **sirf create pe** set hota hai, isliye wahi ek bacha hua raasta hai. Isliye
`syncPostUrlPattern()` teen kaam **ek saath** karta hai: pattern badlo, har path dobara likho,
har purane path se **301**. Teesra chhoot jaye to client ke share kiye hue aur Google me index
ho chuke saare blog link mar jaate hain.

⚠️ Ye wahi "convert URL pattern" wala bulk operation hai jiska zikr `updateContentType()` ke
guard me hai. **Wo guard chhua nahi gaya** — content type screen se badalna waise hi band hai.

### §3 — URL aur breadcrumb do alag cheezein thin, ab ek hain

Client ne pakda: reference me breadcrumb `Home › Andaman Travel Guide › Post` hai, hamare yahan
`Home › Post`, jabki URL `/blog/…` kehta hai.

Jad: `/blog/` ek **literal string** tha `urlPattern` me — kisi entry se juda hi nahi. Aur
**`/blog` pe koi page tha hi nahi** (404), jabki URL uska vaada karta tha.

Ilaaj: blog page ka slug `blog`, aur har post ka `parentId` wahi page. Ab:

```
slug  = blog                  →  /blog/how-to-plan-an-andaman-trip
title = Andaman Travel Guide  →  Home › Andaman Travel Guide › How to plan…
```

⚠️ Post `hierarchical: false` hi hai — parent **sirf breadcrumb** ke liye hai, path `urlPattern`
se banta hai.

### §4 — ⚠️ Chaar bug, chaaron "bana hua par juda nahi"

D-89 ka wahi pattern, aur wo ab **ittefaq nahi, pattern hai**:

1. **`type:post` tag ko koi padhta hi nahi** — `apps/web` sirf `path:` se tag karta hai. Naya
   post publish hone pe listing ka cache saaf hota hi nahi tha
2. **`settings.siteUrl` payload me tha hi nahi** — `TourSchema.jsx` 8 Sep se `?? settings?.siteUrl`
   padh raha tha aur wo hissa **kabhi chala hi nahi**
3. **TOC payload me 8 item ke saath jaati thi aur render koi nahi karta tha**
4. **`blogPage` theme ki branch me nahi tha** — payload poora sahi, page pe sirf `<h1>`

⚠️ Aur ek paanchvan, jo isse bhi purana tha: **`extractBlockText()` sirf top-level string props
padhta tha**, yaani `faqs.items[].answer` kabhi ginta hi nahi tha — read time jhootha **aur**
`entries.searchText` adhoora. Client ke likhe FAQ admin search me **aaj tak aate hi nahi the**.

### §5 — ⚠️ Reference ki CSS raw px ke saath copy karna galat tha

Maine `blog-detail-v1.html` ki CSS jaisi ki waisi chipka di. Nateeja: ek hi site pe **do body
size** — tour pe `--fs-body` (14px), blog pe hardcoded 15.5px — aur D-73 ka poora token wala
kaam bypass.

Client ka niyam (10 Sep) isse bada hai:

> _"Reference me space ya font-size mismatch hai to poora copy karne ki zaroorat nahi. Standard
> check karke jo most of time aa raha hai wo choose karo."_

Ab `.art` ki apni typography **hata di gayi** — `.blk` hi chalata hai (body 14px, h2 ke neeche
10px, h3 ke neeche 7px). Card ka body text bhi `--fs-body` pe hai, kyunki us role ka naap client
ne 8 Sep ko `.dcard p` pe khud chuna tha (`b69d5bb`).

⚠️ **Ye galti do baar hui** — pehli baar poori CSS raw copy, doosri baar (usi din ke fix me) har
px ko uske **exact** token pe map karna, yaani naam badalna par value nahi.

### §6 — ⚠️ A-19 ka apna ilaaj hi ek naya bug bana

D-89 me `.wdgl` ke liye selector jaan-boojh kar chauda kiya gaya tha — `.wdg__b ul`, yaani
sidebar ki **koi bhi** list. `.toc` bhi wahi `ul` hai, aur wo chauda selector (`0,2,2`)
`.toc li a` (`0,1,2`) ko **hara raha tha**.

Phir usse bachne ke liye maine `.toc` ko **poore rule set** se nikal diya — jisme
`list-style: none; padding: 0` wala **reset** bhi tha. Client ko browser ke bullets aur 40px
indent dikhe.

**Sabak: defensive selector ka daayra jitna chauda, uska agla shikaar utna hi anjaan.**

### §7 — ⚠️ `content-visibility` margin collapse rok deti hai

`Frequently asked questions` ke upar gap **dugna** tha. Do margin (`.art > .blk + .blk` ka 32px
aur `.art h2` ka 38px) collapse hone chahiye the — hote nahi, kyunki `.blk` pe
`content-visibility: auto` hai (D-85) aur wo apne saath **containment** laata hai.

D-85 ne wo speed ke liye lagaya tha; uska layout wala side-effect kahin likha nahi tha. Ab hai.

### §8 — ⚠️ Ek asli data loss, aur uski jad

Live test me `updateSettings({ blogSettings: { postUrlMode: 'root' } })` ne **poora
`blogSettings` object replace** kar diya — client ka author text uud gaya (wapas daal diya
gaya).

`$set['blogSettings'] = value` puraane object ko badal deta hai. `social` pe ye jaal **pehle se
handle tha**; `blogSettings` pe nahi. Admin ka form hamesha poora object bhejta hai, isliye ye
wahan **kabhi dikhta hi nahi** — ek script se ek field patch karte hi dikha.

Ab `MERGED_KEYS = ['social', 'blogSettings']`. ⚠️ Merge **ek hi star** gehra hai — naya nested
object jodo to yahi sawaal dobara poochhna hoga.

### §9 — Do jagah ek hi list rakhne ke do nateeje

| Kahan | Kya hua |
| ----- | ------- |
| `PAGE_TYPES` (API) vs catch-all ki branch (theme) | `blogPage` ek me tha, doosre me nahi — page khaali |
| `EntriesList` ka `thirdColumn` | default `packages` tha, aur wo **do baar** galat nikla (Posts pe, Blog Pages pe) — heading `Packages`, aur cell me hamesha 0 |

Doosre ka ilaaj: column ab **optional** hai. Jo screen maange wahi milta hai; default kuch nahi.

### §10 — Design se milaan, client ke chalane pe

Client ne dono page chala kar **pandrah se zyada** cheezein gina di, aur unme se do aisi thin
jo maine reference **dekhe bina** maan li thin:

- **Hero me excerpt** — `.ahead__d` ki CSS reference me padi hai par **markup me kahin use hi
  nahi hoti**. Maine CSS dekh kar maan liya ki wahan text aata hoga
- **Sidebar me `All topics` ka row** — reference ke `.cats` me sirf chhe categories hain

⚠️ **Yahi galti D-89 me do baar ho chuki thi** (byline aur `.blk`). Ab teen baar. **Reference ki
CSS dekh kar markup maan lena** is repo ki ek pehchani hui galti hai.


### §x — 11 Sep: switch listing ka cache saaf nahi karta tha (A-21 me pakda)

Production build pe naapa: switch ke baad purana URL sahi redirect karta tha, par `/blog` ke card
**ek ghante tak** (`CACHE_SECONDS`) purane URL pe link karte the. `syncPostUrlPattern()` har moved
post ke dono path bhejta tha, par listing page ka `path:` tag nahi — aur `type:post` ko web me
koi fetch lagati hi nahi.

Ye **wahi galti** hai jo 9 Sep ko `invalidate()` me pakdi gayi thi aur `blogListingTags()` se
theek hui thi. Us fix se switch wala doosra raasta chhoot gaya. Ab dono ek hi helper use karte
hain, aur `syncPostUrlPattern()` apne bheje hue `tags` lautata hai taaki test dekh sake **kaunse**
tags gaye — aaj tak koi test ye dekhta hi nahi tha, isliye ye chup raha.
---

## D-92

**Bulk Upload for blog — Google Docs se post pages** (10 Sep, spec 008)

Client ki team blog ke article Google Docs me likhti hai. D-81 wala Bulk Upload package ke liye
pehle se chal raha tha; ab wahi `target` se post bhi banata hai. **Ek hi module, ek hi screen.**

### §1 — Do module kyun nahi bane

Bulk Upload ka **85% hissa target se bemutalliq** hai: sheet ka CSV, Google fetch, sign-in page
ka pehchana, SSRF guard, run + rows ka model, claim loop, atki hui rows, purane run hataana,
New/Existing ka assertion, publish ke do niyam, admin ki screens aur polling.

Sirf **teen** cheezein alag hain, aur wahi `targets.js` me hain: doc kaise padha jaaye, payload
kaise bane, aur kaunsi master lists chahiye.

Do module ka matlab hota do copies — aur is repo me uska nateeja teen baar dekha ja chuka hai
(`bestFor` D-87, `htmlToText`, aur D-86 ka slug). Post ke tests **wahi `runImport()`** chalate
hain jo package ke chalate hain, sirf `target` alag hai.

⚠️ **Koi migration nahi lagi** — `target` ka default `package` hai, aur purane run pe wo **sach**
hai, andaza nahi: us waqt import package ka hi hota tha. Iska apna test hai (`$unset` karke).

### §2 — Labels client ke apne hain

Naksha client ke doc se **padha** gaya, gadha nahi: `Blog title` · `Blog heading` · `Excerpt` ·
`Category` · `Banner Image URL` · `Content` · `Faq:` → `Heading` / `Question` / `answer`.

⚠️ **`Blog URL` ek hi cheez hai jo maine jodi**, aur wo D-86 ki wajah se: uske bina slug title se
banta, aur title thoda badalte hi agla import purane post ko pehchanta hi nahi aur ek **doosra
live post** bana deta. Wo failure poori tarah chup hoti — dono live, dono theek dikhte.

FAQ ka parser (`Question`/`answer`) bina ek line likhe reuse ho gaya — wo D-81 se maujood tha.

### §3 — Do jagah post package se jaan-boojh kar alag hai

| | Package | Post | Kyun |
| --- | --- | --- | --- |
| Khaali `Category` | chal jaata hai | **blocker** | Blog ka poora navigation topic pe khada hai — pills, Topics, `categoryId` wale landing page. Bina category ke post live to hota hai par **kisi topic ke neeche milta nahi** |
| Khaali `Content` | — | **blocker** | Padhne ko kuch hai hi nahi |
| Banner image | `fields.bannerImage` | `featuredImageId` | Post pe wo `entrySchema` ka top-level field hai. Ek hi jagah maan lene se image `fields` me chali jaati, jahan `Mixed` hone se Zod use rok bhi nahi paata — chup-chaap padi rehti aur page pe kabhi na dikhti |

### §4 — ⚠️ Google ke baare me teen andaze galat nikle, teenon live chalane pe

Ye is kaam ka sabse zaroori hissa hai. Har baar code-level pe sab "pass" tha.

**1. Image `data:` URI me aati hai, CDN URL me nahi.** Maine `lh7-*.googleusercontent.com` maan
liya tha aur wo file ke comment me likha bhi tha. Asli export inline base64 bhejta hai. Do chup
nateeje the: sanitizer `data` ko allowed schemes me na paa kar **`src` hata deta tha**, aur
importer `fetchImage()` pe jaata jahan SSRF guard use theek hi thukra deta.

✅ Ek faayda muft mila: `stemFor()` poori `data:` URI ko hash karta hai, yaani naam **apne aap
content ka hash** ban gaya. "src sthir rahega ya nahi" wala shak uthta hi nahi.

**2. `<thead>` aata hai, `<th>` nahi.** CSS me maine likha tha ki thead hota hi nahi — galat. Wo
`<thead>` **aur** ek toota hua `<tbody></tbody>` bhejta hai (`<tr>` ke **andar**), par cells sab
`<td>`. Mere pehle selector ka `tr:first-child` **do** rows pakadta tha — thead ki header row aur
tbody ki **pehli data row**.

**3. Table ke bina `<th>` ke header ban hi nahi sakta tha.** Ilaaj CSS nahi, **markup** hai:
`ensureTableHeader()` render pe pehli row ke `<td>` ko `<th>` bana deta hai. Look, semantics aur
markup — teenon ek saath theek.

### §5 — Kram ka ek bug jisne poora article kha liya

Images pehle **mapper ke baad** import hoti thi. `data:` URI ~100KB ki hai, do image yaani ~200KB
ka article — aur mapper use `htmlSchema` ki hadd (40,000) pe kaat_ta tha, **base64 ke beech**. Us
toote HTML ko write pe sanitizer poora phenk deta tha.

Asli run ka nateeja: article **7 character** ka bacha — na heading, na table, na image — aur row
ne phir bhi **"Published"** kaha, kyunki clamp sirf ek `note` tha.

Ab images **parse se pehle**, poori doc HTML par utarti hain (sirf `richText` blocks pe nahi —
isse FAQ ke jawab ki image bhi apne aap sambhal jaati hai). Aur `Content` ka kat jaana ab
**blocker** hai: HTML ko character se kaatna hamesha khatarnak hai.

### §6 — FAQ ka heading section marker se takraya

Client ke article me FAQ ka heading literally _"Frequently asked questions"_ tha — aur wahi vaakya
`FAQ_SECTION_LABELS` me ek **section marker** bhi hai. Parser use ek **doosra `faqStart`** samajh
leta tha: `currentKey` reset, heading chup-chaap gayab. Chaaron sawaal theek aate the.

Post me sirf **ek** section hai, isliye ab marker tabhi dhoondha jaata hai jab `section === 'top'`
ho. Package ka parser is se alag hai — wahan teen section hain aur itinerary ke baad `FAQs` aana
asli baat hai (D-81).

### §7 — Design ke wo hisse jo doc likh hi nahi sakta

Reference (`blog-detail-v1.html`) me `callout` · `callout--w` · `pullq` · `lead` apne `<div>` aur
class se bante hain. Google Doc me wo likhne ka koi tareeka hai hi nahi, to client ke article me
wo **saade paragraph** ban kar aate the.

Ab writer ek nishaan likhta hai aur theme use asli block banati hai — `Note:` · `Warning:` ·
`Quote:`, aur title ke liye uska apna **bold**. `lead` apne aap lagta hai (pehla paragraph), kyunki
use nishaan ke bharose chhodna sirf bhoolne ka mauka dena hai.

⚠️ **Nishaan ke shabd maine chune the, client ne nahi** — A-22. ✅ 11 Sep: client ne chaaron
(`Caption:` ke saath) rakh liye aur asli doc pe khud chala kar dekhe.

⚠️ **Teenon ka ghar theme hai, importer nahi** — wahi jagah jahan `wrapTables()` hai (D-90 §5).
Isse ye TinyMCE se likhe content pe bhi chalte hain, aur DB me content saaf rehta hai: nishaan
hata do to page apne aap saade paragraph pe wapas. Aur ye sirf **blog post** pe chalte hain
(`<Blocks article />`) — har `richText` pe chalane se tour/package ka pehla paragraph bhi bada ho
jaata.

### §8 — Jo test ke bahar tha wo do baar toota

Ye transforms pehle `Blocks.jsx` ke andar the, jahan unka test **likha hi nahi ja sakta tha** (wo
JSX hai aur poora component tree kheenchti hai). Table ka header usi wajah se **do baar** galat
bana, aur dono baar galti **live page pe** pakdi gayi.

Ab wo `apps/web/lib/article-html.js` me hain, `linkify.js` ke saath — 16 test.

**Sabak:** jo cheez sirf render pe chalti hai use JSX me mat rakho; use ek pure function banao,
warna uski galti sirf aankh se pakdi jaayegi.

### §9 — Ek chhoti galti jo maine khud ki

CSS me likha tha ki imported article ka bold saada dikhta hai. **Wo naapa hua nahi tha.**
Reference ki apni line (`blog-detail-v1.html:985`) pe hi `.art b, .art strong` dono hain, aur wo
hamare paas bhi hai — blog pe bold kabhi toota hi nahi tha. `.blk p :is(b, strong)` phir bhi rakha
gaya, par asli faayda **tour/package pages** pe hai jahan `.art` hai hi nahi aur TinyMCE `<strong>`
likhta hai.

### §10 — 11 Sep: table ka dhaancha, image + caption, aur do lead

Client ne test post chala kar teen cheezein gina di. Teeno ka ilaaj theme me hai
(`apps/web/lib/article-html.js`), importer me nahi — wahi jagah jahan `wrapTables()` hai.

**1. Table — pehli row `<thead>`, baaki `<tbody>`, cell me `<p>` nahi.** Google har cell ki value
`<p>` me bhejta hai, aur `.art p` ka font-size/margin cell ke andar lag kar `.tbl td` ko hara deta
tha — styling "lagti hi nahi" thi. Client ki maang: _"only first row will be table head other will
be table body"_. `normalizeTable()` ab bina `<th>` wali table ko **rows aur cells nikaal kar dobara
banata hai**: `class="tbl"`, `<thead><th>`, `<tbody>`, cell ke `<p>` khule (kai ho to `<br>`), aur
Google ka `colspan="1"` gira. Kal ka `ensureTableHeader()` sirf `<td>` → `<th>` karta tha; toota
hua nesting aur `<p>` waise ke waise reh jaate the.

⚠️ Jis table me `<th>` pehle se ho uska dhaancha **nahi** chhuta — 11 Sep ko DB me gina: tour page
ki 3 aur do post ki 2-2 tables, sab `class="tbl"` + `<th>`. Un par sirf cell ke `<p>` khulte hain.

⚠️ Iske saath CSS ke kal wale chaaron `.art .tblw > table` selector **hata diye**. Table ko ab
`.tbl` class hi mil jaati hai, to CSS wapas reference ki shakl me hai.

**2. Image aur caption ek `<figure class="artfig">` me.** Google image ko `<p><img></p>` me
bhejta hai aur uske neeche ki line ek alag `<p>`. `leadParagraph()` image wale paragraph ko chhod
kar **agle** paragraph ko lead maan leta tha — yaani caption hi `.lead` ban jaati thi. Ab
`wrapFigures()`: akeli image → `figure.artfig`, aur uske turant neeche `Caption:` wali line →
`figcaption`. Poori line italic ho to italic hat jaata hai — reference ka caption seedha hai.

⚠️ **Caption nishaan se banti hai, andaze se nahi.** "Image ke neeche italic line = caption" maan
lena aasaan tha, par tab image ke turant baad ka **koi bhi** italic paragraph chup-chaap caption ban
jaata. Client ne nishaan ki ijaazat khud di: _"if you need you can add tags like note, warning"_.

**3. Do lead paragraph — 10 Sep se live, kisi ne dekha nahi.** Haath se likhe
`/how-to-plan-an-andaman-trip` me `<p class="lead">` pehle se tha. `leadParagraph()` sirf saada
`<p>` pakadta hai, to usne use chhod kar agle paragraph ko bhi lead bana diya. Ab content me lead
pehle se ho to kuch nahi hota. Ye `ce8ed98` ki galti thi, aur page chalane pe hi pakdi gayi.

**4. Kram ab `articleHtml()` me.** Caption ka lead ban jaana **kram ka bug** tha — figure banne se
pehle lead dhoondha ja raha tha. Jab tak kram `Blocks.jsx` me likha tha uska test ho hi nahi
sakta tha; ab `wrapTables → wrapFigures → leadParagraph → markedBlocks` ek function me hai aur
uska apna test hai. `leadParagraph()` nishaan wale paragraph (`Note:` · `Warning:` · `Quote:` ·
`Caption:`) bhi chhodta hai — warna `Note:` se shuru hone wala article callout banne se reh jaata.

⚠️ Reference ke `<tr class="on">` (highlighted row) ke liye nishaan **jaan-boojh kar nahi** banaya —
reference me bhi uska koi style hai hi nahi (`.on` sirf map aur pills pe hai).

**Live (asli DB):** test post — `table.tbl` 2/2, `<thead>`/`<tbody>` 2/2, 6 `th`, cell me 0 `<p>`;
haath ka post — lead 1 (pehle 2), figure/figcaption waise ke waise; tour page — koi farak nahi (uska
ek `.lead` uske apne content ka hai). Test post pe caption tab tak lead rahega jab tak doc me
`Caption:` na likha jaaye. **1009 test pass.**

### §11 — 11 Sep: import wali image pe `width`/`height`

A-21 ke naap (A-17) me article pe **CLS 0.103** mila. Us page pe wajah hotlinked image thi, par
jaanch me nikla ki **Bulk Upload se aayi har image** bhi bina naap ke thi: Google naap `style` me
bhejta hai, sanitizer use hata deta hai, aur `importInlineImages()` sirf `src` badalta tha. Media
record me `variants[].w/h` pehle se tha (model me required) — bas lagta nahi tha.

Ab `src` ke saath **`large` variant ka hi** `width`/`height` lagta hai — wahi variant jiska URL
`src` me jaata hai, warna aspect ratio galat hota. Pehle ka `width`/`height` **hat kar** naya
lagta hai: do baar likha attribute browser pehla padhta hai. Variant me naap na ho to sirf `src`
badalta hai (galat naap se koi naap behtar). Hamari apni media ka tag chhua nahi jaata.

⚠️ `.artfig img` pe **`height: auto`** juda — `width: 100%` ke saath `height` attribute image ko
khinch deta. `.art .blk :not(.artfig) > img` pe wo pehle se tha.

⚠️ **Pehle se import hue post** tabhi theek honge jab `Existing` mode me dobara import ho. Image
dobara nahi utarti (naam `data:` URI ke hash se), sirf naap lagta hai. **1016 test pass.**

### §12 — 11 Sep: Past imports ka filter, aur 20 har type ke

Client ne poochha: _"Past imports should be filter like i only want packages Past imports to see or
post?"_ Tab tak backend me koi filter tha hi nahi — `GET /api/bulk-imports` sirf `page`/`limit`
leta tha, aur screen pe `Type` column tha par chhaanne ka raasta nahi.

**1. Filter — `All · Packages · Blog posts`, default `All`.** `importRunQuerySchema` me optional
`target`; khaali ho to dono type, yaani 10 Sep wala bartaav. Filter server pe hai, screen pe nahi —
20 ki list ko screen pe chhaanne se `Packages` pe utne hi dikhte jitne us 20 me package the.

⚠️ **Filter "What are you importing?" dropdown se juda nahi hai.** Wo tay karta hai kya banega, ye
tay karta hai kya dikhe. Dono ek karne pe Posts import chunte hi package ka itihaas chup-chaap chhup
jaata.

**2. 20 har type ke — dono milaa kar nahi.** Ye sawaal ke andar chhupa hua bug tha: `pruneOldRuns()`
ek hi ginti rakhta tha, to blog ke 20 import lagataar chalte hi package ka **poora** itihaas mit
jaata — aur naya `Packages` filter khaali dikhta. Sirf filter bana dena us bug ko dhak deta. Ab
safai sirf naye run ke type me hoti hai.

⚠️ **Bina `target` wale purane run package hain** — dono jagah (`listImportRuns()` aur
`pruneOldRuns()`) `{ $in: ['package', null] }` se, jo ghaayab field ko bhi pakadta hai. Iske bina
`Packages` filter unhe chhod deta, aur safai unhe kabhi na ginti, to wo hamesha pade rehte. Test
unhe `collection.insertOne` se banata hai — Mongoose ka default wo haalat bana hi nahi paata.

Koi migration nahi, koi naya index nahi (collection me ab zyada se zyada 40 run hain). Filter design
me nahi hai — Bulk Upload ki poori screen hi `admin-design-v2.html` me nahi hai; shakl wahi
`.subsubsub` jo run ke nateeje wali screen pe hai. **1023 test pass.**

### §13 — 11 Sep: post ka parent Blog settings se (admin list ka `—` aur breadcrumb)

Client ne Posts list me pakda ki kuch post ke aage `—` hai, kuch ke nahi. `—` post ke `parentId` se
aata hai (`EntriesList.jsx`), aur **parent kahin tay hi nahi hota tha**: 9 Sep ke 12 post ko ek baar
mila (D-91 §3), uske baad ka har post — admin ka ek, Bulk Upload ke do — bina parent ke bana. URL
switch (`syncPostUrlPattern()`) sirf path badalta tha. Nateeja: setting `root` thi, phir bhi 12 pe
dash; aur live API pe 3 post ka breadcrumb `Home › Post` tha jabki baaki ka
`Home › Andaman Travel Guide › Post`.

Client ka niyam: _"/blog/blogname set karun to dash aaye, /blogname karun to hat jaaye — yahi to hona
chahiye"_. Yaani breadcrumb URL ke saath chale — D-91 §3 ka hi siddhant:

| `postUrlMode` | URL          | parent            | admin list | breadcrumb           |
| ------------- | ------------ | ----------------- | ---------- | -------------------- |
| `nested`      | `/blog/post` | blog listing page | `—`        | `Home › Blog › Post` |
| `root`        | `/post`      | koi nahi          | —          | `Home › Post`        |

**1. Parent server tay karta hai — `postParentFor()`.** `createEntry()` post ka bheja hua parent
nahi maanta. `updateEntry()` har save pe setting se milaata hai: admin ka form purana `parentId`
hamesha wapas bhejta hai, use maana jaata to setting badalne ke baad bhi wo laut aata. Path nahi
chhuta — post ka path `urlPattern` se banta hai, parent se nahi. Bulk Upload dono raaston se guzarta
hai (New → create, Existing → update), isliye wahan alag code nahi laga.

**2. `syncPostUrlPattern()` pattern na badle to bhi parent jaanchta hai.** Pehle wo seedha lautta
tha, isliye bhatke hue post Blog settings dobara Save karne se bhi theek nahi hote. Sirf parent badle
to sirf us post ka `path:` tag jaata hai — listing, sitemap aur feed pe uska asar nahi.

**3. Migration 024** — pehle se pada data usi niyam pe. Cache wahan saaf nahi hota (`SITE_URL` wala
revalidate migration ke paas nahi); badle hue pages `CACHE_SECONDS` me khud naya breadcrumb dikhate
hain. Local DB pe mode `root` tha — 12 post ka parent hata, ab 15 me se kisi pe nahi.

⚠️ **URL wala hissa pehle se sahi tha.** Client ne poochha ki Bulk Upload current setting dekh kar
URL banaye — wo pehle se hota tha: Bulk Upload `createEntry()` se banata hai, jo `urlPattern` se
path banata hai, aur doc ke `Blog URL` ka sirf aakhri tukda slug banta hai (`/blog/x` likha ho to
bhi `root` mode me `/x`). Chhoota sirf parent tha. Ab dono modes ka test Bulk Upload ke raaste se
hai.

⚠️ **Seema:** listing page (`postList` wala `blogPage`) baad me bane ya trash ho, to posts ka parent
tab tak purana rehta hai jab tak Blog settings Save na ho ya post save na ho. Wahi seema URL prefix
pe pehle se hai. **1029 test pass.**

---

## D-93

**11 Sep — client ki list: admin ke 5 aur public ke 4 badlaav (blog + reviews).** Client ne kaha tha
_"ask if any question if didnt understand so unnecessary mashup na ho"_ — chaar sawaal pooche gaye
(heading, categories, hero byline, TOC), baaki code se saaf the. **Koi migration nahi lagi.**

### §1 — Post ka `<h1>` ab **Title** hai — D-91/10 Sep ka `Post heading` palta

Client: _"Edit/Add post will not be having Page Header becouse heading will be title now no need
extra same heading same title"_. 10 Sep ko ulta faisla tha (_"blog ki heading aur slug alag
rahenge"_) — wo **superseded** hai.

- `POST_FIELDS = []`, post pe Page Header panel nahi (`header: false`), payload me `fields` nahi,
  card ka title bhi `title`
- 4 post me heading title se alag thi. Client: _"ye to content hai update ho jayega"_ — koi
  migration nahi; purana `fields.heading` DB me pada hai, koi padhta nahi
- Bulk Upload: `Blog heading` label parser me pehchana jaata hai (warna uski line Content me
  ghusti), par kahin nahi jaata — bhara ho to **note**. `tourPage` ka `fields.heading` (D-90)
  chhua nahi gaya

### §2 — Post me **kai categories** (checkboxes)

Client: _"category will be checkbox not dropdown so user can choose multiple"_ aur sawaal pe
**"Saari categories"** — card aur hero pe har chuni hui category ka badge. Storage pehle se array
tha (D-49), sirf UI aur padhne wale badle:

- payload me `category` → **`categories[]`** (card, lead card, post page, schema `articleSection`)
- pills aur Topics me post **har** category me ginta hai — jod posts se zyada ho sakta hai, client
  ne jaan kar chuna. List pe filter `categories.some()`
- Related reading **kisi bhi** category se (`$in`) — pehle sirf pehli dekhi jaati thi
- Badge ka kram **category list ka** hai, tick karne ka nahi
- Bulk Upload me comma se kai pehle se chalti thin (`parseNameList`); ab wo sab dikhti bhi hain

### §3 — Category ka badge rang (colour picker)

Naya `taxonomies.color` (`#rrggbb` ya khaali). 10 Sep ko ye field **jaan-boojh kar nahi** bana tha
(PostCard.jsx ka tark: "client se aisa chunav jo uska nahi"); client ne ab maanga. **Khaali =
Automatic** — wahi id-based rang jo pehle tha, isliye purani categories waisi hi dikhti hain.
Picker khaali value rakh nahi sakta, isliye "Use automatic" ka button hai. Halke rang pe text gehra
ho jaata hai (`inkOn()`). ⚠️ `updateTaxonomy()` ki whitelist me `color` juda — test DB padhta hai.

### §4 — Excerpt optional, card content se bharta hai, panel content ke baad

Khaali excerpt pe card **content ke text blocks** ki pehli **24 shabd** (`autoExcerpt()`, reference
ke card 20–22 shabd ke hain), kate hue pe `…`. Likha hua hamesha jeetta hai. Sirf card ke liye —
post page pe excerpt waise bhi nahi chhapta, aur meta description ka fallback likha hua excerpt hi
rehta hai (andaza nahi). Admin me Excerpt panel ab **Content (aur FAQ) ke baad**.

### §5 — Post hero ki byline, aur pinned TOC

- Hero me role (`Planners in Port Blair`) ki jagah naam ke neeche **`Published … · 9 min read`**
  (client ke shabd). Role author box me rehta hai
- `On this post` **pinned** — client: _"jab tak content end na ho jaye fir scroll ho jayega"_.
  `StickySide` ki jagah `PinnedSide`: column `align-self: stretch`, andar `.pgl__pin` sticky. Koi JS
  nahi. Sirf TOC wale post pe; 1024px se neeche pin nahi. ⚠️ Aaj post sidebar me koi widget nahi
  (blogSettings me sidebar chuni hi nahi) — widget juda to wo pinned TOC ke peeche se nikalega

### §6 — Chhote badlaav

| Kya | Kaise |
| --- | --- |
| Review me aadhe taare (1.5–4.5) | `multipleOf(0.5)`; card pe `☆` ke upar aadha `★` (`starParts()`); text me number saath. ⚠️ `starString()` pehle `Math.round` karta tha — 4.5 **paanch** taare dikhta |
| Bulk Upload ka dropdown chhota | `.bu-target` |
| Blog settings → **Posts** ke submenu | `/posts/settings`, `SettingsTabs` hati — `Tour settings` (8 Sep) wala hi raasta. Storage/permission wahi |
| Categories screen ka column | `Packages` → **`Posts`** (`countLabel`) |
| Tour Pages list ka `Packages` column | hataya (`thirdColumn` nahi) |
| `/blog` ki `9 articles` ginti | hati (`.bfilter__c`) |

### §7 — Usi shaam do sudhaar, client ke dekhne ke baad

**1. Pinned sidebar — ab bilkul reference (`blog-detail-v1.html`) jaisi.** Do galat koshishein
pehle hui, dono client ne pakdi:

- §5 wali — sirf TOC sticky, widgets normal scroll → form TOC ke peeche se nikalta tha
- doosri — poori sidebar ek **andar-scroll** wale dabbe (`.pgl__pin`, `max-height`) me, aur
  PostNav/Related `.pgl` ki alag row me. Client: _"blog-detail-v1.html check in this how scrolling
  is happening becouse what you applied is not good"_

Reference me CSS ke comment me ek "script" ka zikr hai (`top` ko disha ke saath khiskana), par wo
script file me **hai hi nahi**. Asli bartaav: `.pgl__side { position: sticky; top: 78px }` — poori
column (TOC → form → Most read) ek saath chipki, koi andar-scroll nahi, aur `.pgl__main` (article +
`.pn` + Related) khatam hone pe upar. Ab post pe wahi hai: `PinnedSide` ek saada `.pgl__side`,
`StickySide` ki JS nahi. `.pgl__pin`/`.pgl__after`/`.pgl--post` hata diye.

**Sabak:** reference ka comment nahi, reference ka **chalta hua bartaav** padho. Pehli baar
`StickySide` bhi usi comment ko padh kar bana tha. ⚠️ Iski keemat: sidebar screen se lambi ho to
uska neeche ka hissa `.pgl` khatam hone pe hi dikhta hai — reference me bhi yahi hai

**2. Admin ke dropdown kabhi poori chaudai nahi** — _"koi bhi dropdown full page width nahi
lega"_. `primitives.css` me `select.inp, .sel { max-width: 360px }` — har screen pe ek saath.
Pehla ilaaj (`.bu-target { width: auto }`) `.inp` ke `width: 100%` se haar gaya tha aur sirf ek
screen ka tha; hata diya.

⚠️ **Doosri baar sudhra, usi shaam.** Sab dropdown pe lagi rok badi screen pe un rows ko bigaad rahi
thi jahan do-teen dropdown saath hain. Client: _"i was asking you fix only for one dropdown in a
row"_. Ab rok sirf tab jab `.field` seedha ek-column panel body (ya uske `<form>`) me ho —
`panel-body row2/row3` aur `.row2`/`.row3` ke andar nahi. Naap client ne khud tune kiya: 360 →
622px → 750px se upar **`50%`** (badi screen pe baaki fields ke saath line me). `50%` sidebar ke
panel (Publish ka Status) ko aadha kar deta tha, isliye ab **`max(50%, 300px)`** — tang column me
300px poori chaudai se zyada hai, to wahan dropdown poora bharta hai.

**Live:** API pe payload `categories[]`, bina `fields` ke. Client ne isi beech Blog settings
`/blog/…` pe kiya — D-92 §13 ne saare post ka parent blog page kar diya (dash wapas), redirect bane.
⚠️ Port 3000 pe `next start` ka **12:58 wala build** chal raha tha — site ke badlaav wahan tabhi
dikhenge jab client naya build chalaye. **1038 test pass.**

---

## D-94

**11 Sep — header button ki jagah: nav ke pehle ya aakhir (`position`).** Client ne pehle
`blog-detail-v1.html` ki ek copy pe trial maanga (_"dont change code now … i want to check first"_):
Awards logo ke baad rakha — client ne kaha _"can we do it with nav not logo"_ — phir nav ke theek
pehle, aur wo pasand aaya (_"nav ke pass me thik hai"_). Uske baad teen baatein, teenon ab code me:

**1. `headerButtons[].position` — `left` | `right`, default `right`.** `left` = nav ke theek pehle,
nav ke saath beech me; `right` = header ke aakhir, jaisa 25 Aug se hai. Purane button bina kuch kiye
`right` pe rehte hain — **koi migration nahi** (model ka default + public map ka guard). ⚠️ Model ka
nested schema **strict** hai — `position` wahan na hota to Zod pass karta aur Mongoose chup-chaap
gira deta. Admin: `Appearance ▸ Menus ▸ Header Buttons` me har button pe **Position** dropdown.

**2. Layout — sirf tab badalta hai jab koi `left` button ho** (`.hdr__top--lbtn`). Nav `flex: 1` se
apni chaudai (`flex: 0 1 auto`) pe aata hai aur **dono** button group `margin-left: auto` lete hain,
to [left buttons + nav] beech me rehta hai. Tablet/mobile (≤1040, nav chhup jaata hai) pe dono group
**ek saath daayein** — client: _"tablet and mobile par dono buttons ek sath hone chahiye"_. Left
group bhi `order: 2` pe aata hai aur right ka auto margin hat-ta hai: logo … [Awards][Get quote][☰].

**3. "Icon only on mobile" ab sach me sirf mobile pe** — label **750px** se neeche chhupta hai (header
ka phone breakpoint, jahan logo bhi chhota hota hai). Pehle 1040px pe tha, yaani tablet pe bhi
"Awards" ka text gayab. Client: _"only on mobile award text should be hidden"_.

⚠️ Reference me Awards 1150px se neeche icon ban jaata tha (_"no room for the label next to Get
quote"_). Ab label tablet pe dikhta hai, aur jab Awards `left` ho to desktop pe nav ke saath jagah
baant-ta hai — 1100–1200px pe nav ki tangi client ko dekhni hai. **1040 test pass.**

**4. Menu dono taraf barabar doori pe (usi shaam, screenshot ke baad).** Awards→Home ~44px aur
Contact Us→Get quote ~118px tha. Client: _"reward button exact place pe rahega, nav ko thoda right
le jakar space equal"_. Desktop (≥1041px) pe `.hdr__top--lbtn` ab grid hai —
`logo | 2fr | left | 1fr | nav | 1fr | right`. Khaali jagah 2:1:1: left buttons se pehle aadhi (wahi
jo do `margin-left: auto` dete the, isliye Awards bilkul nahi hilta), bachi aadhi nav ke dono taraf
barabar. Fixed jagah bhi pehle jitni (`column-gap: 8px` spacer ke dono taraf = purana 16px gap).
Tablet/mobile pe flex hi.

## D-95

**14 Sep — saada page: `page-template-text.html` (A-9 ka `page` wala aadha band).** Client ne apni
reference file di aur ek list me bataya kya hatana hai, kya badalna hai. Build se pehle har khula
sawaal poochha gaya (client: _"do not assume if not confirmed"_). Koi migration nahi.

**1. Reference se hataya (client):** eyebrow `Andaman beaches · updated for 2026` · byline ka author
`Andaman Tourism team` / `Written in Port Blair` · sidebar ka `Quick facts` · content ke baad ki
`.ctastrip` `Get a free itinerary`.

**2. Hero.** `<h1>` = **Title**, saada text, koi accent rang nahi (Post jaisa, D-93 — `fields.heading`
page pe nahi). Sub heading rich text. Byline sub heading ke **neeche**: `Updated Aug 2026 · 6 min read`
— date **last edit** (`updatedAt`) ki, aur **sirf mahina + saal** (_"20 aug ye nahi"_). Banner **sirf
Featured image** se — Tour settings wali universal image page pe fallback **nahi** (_"koi banner
nahi"_). Stat rail rahi.

**3. Hero ke do button — page ka apna** (_"pages par specific rahega inside edit page"_), Tour ki tarah
Settings me nahi. `fields.heroButton {label, url}` (shape `heroButtonSchema` — `tourSettings.heroButton`
bhi ab wahi constant) aur `fields.showWhatsapp` checkbox; number `settings.whatsapp` se. Label ya link
khaali → button nahi. ⚠️ Checkbox **default on** (`!== false`) — reference me dono button hain.

**4. Content — Text block + FAQs block** (Post wale `POST_BLOCK_TYPES`). Client ne poochha tha ki FAQ
editor ke andar ho sakta hai ya nahi. Jawab: ho sakta hai (server `<h3>`/`<p>` padh kar schema bana
sakta hai), par mashwara **alag block** ka tha — editor ke andar sawaal ko `<h3>` ki jagah bold kar
dene se schema **chup-chaap** nahi banta (D-86 wala jaal), aur Google Aug 2023 se FAQ rich result
travel site pe waise bhi kam dikhata hai. Client ne alag block chuna. Schema wahi `TourSchema` —
Breadcrumb + FAQPage (_"abhi jaisa hai thik hai"_).

**5. Font — _"body font only no lead font"_.** `articleHtml(html, { lead: false })`: callout
(`Note:`/`Warning:`/`Quote:`), caption aur table page pe bhi bante hain — kyunki page ka Bulk Upload
bhi unhi nishaan se likhega — sirf bada pehla paragraph nahi. Naap reference ke nahi, hamare tokens ke
(_"font jo decide kiya bo rahega"_). Content `.art.art--page` card me: `.art` ki typography, par
**hover nahi** (wo blog ke liye maanga gaya tha) aur har `<h2>` ke upar reference wali line (`.rte h2`).

**6. Sidebar per page** (`sidebar` + `sidebarId`, Tour jaisa) aur **`On this page` ka checkbox bhi per
page** (`fields.showToc`, default on) — Post pe wo `blogSettings` me sab posts ke liye ek hai. TOC ka
loop `toPublicPost()` se nikal kar `withToc()` bana, dono ki saanjhi. ⚠️ **Sirf `page` pe chalta hai** —
Tour/Blog listing ke `<h2>` pe `id` lagana kisi ne maanga nahi. Admin me checkbox tabhi dikhta hai jab
sidebar chuni ho (TOC sidebar ke andar baithti hai).

**7. Mobile — form popup, `Talk to a planner` chhupta hai, CTA static settings se.** Teeno pehle se bane
the (`EnquiryDockProvider` + `MobileBar`, `.pgl__side .wdg--planner`, `CtaSection`) — naya kuch nahi.

**8. Render — `components/page/TextPage.jsx`, `TourPage` nahi.** 14 Sep tak `page` `TourPage` se render
hota tha (sirf ek byline ki shart ke saath). Paanch cheezein alag hone pe wo paanch `type === 'page'`
ban jaati — `PostPage` bhi isi wajah se alag hai. Saanjhe tukde bahar nikle: `blog/Toc.jsx`,
`tour/HeroButtons.jsx`, `tour/StatRail.jsx`. `TourPage` ka `Byline` aur `.vbyline` CSS hataye (ab koi
padhne wala nahi tha).

**9. Admin — `Pages ▸ All Pages · Add New`** (`/pages`, `NotBuiltYet` se bahar). List: Title · Author ·
Status · Updated (design `#s-pages`). Edit: `TYPE_CONFIG.page` — Page header (Sub heading · Button label
· Button link · Show WhatsApp), Stat rail, Content, Publish, Page settings (Sidebar · Which sidebar ·
Show "On this page" · Parent · Featured image), SEO. Permalink parent ke neeche dikhta hai (`page`
`hierarchical`). `hero` flag do me bata: `eyebrow` + `statRail`.

⚠️ **Deploy pe `pnpm seed` chahiye** — `page` ka field set ab khaali nahi, aur `normalizeFields()` sirf
declared fields parse karta hai. Bina seed ke `heroButton`/`showToc` store to honge par parse nahi
(`"false"` string bhi chala jaata). API restart bhi.

⚠️ **Render hote hue dekha nahi gaya** — port 3000 pe client ka `next start` hai. **1051 test pass**,
admin build pass. Aankh wala kaam **A-25**.

**10. Bulk Upload for pages (usi din, client).** Wahi `bulk-imports` module, teesra target `page`
(`IMPORT_TARGET.PAGE`). Admin ka dropdown, New/Existing pages ke label aur Past imports ka `Pages`
filter `IMPORT_TARGETS` se apne aap aaye; 20 run har type ke (D-92 §12) bhi. Naya: `page-doc.js`
(parser), `page-mapper.js`, `TARGET_CONFIG.page`.

Doc ke labels — client ke template ke (`Meta Title` · `Meta Description` · `Page title` · `Page URL` ·
`Banner Image URL` · `Stat Rail` · `Content` · `Faq:` → `Heading` · `Question` · `answer`) aur client
ke chune teen: `Parent page` (title se) · `Sub heading` · `Button label` / `Button link`.
**Stat Rail optional**, har card ke chaar label — `Value` · `Suffix` · `Label` · `Highlight` (`Yes`);
har `Value` naya card, 4 tak. Sidebar doc me nahi: **naya** page `Pages Sidebar` (naam se) ke saath
right pe; na mile to note aur bina sidebar.

⚠️ **`prepare` hook** — `updateEntry()` `fields` poora badalta hai, to re-import admin me chune
`sidebar`/`sidebarId`/`showWhatsapp`/`showToc` mita deta. Page target purane `fields` pe doc ke khaane
milaata hai. ⚠️ `Parent page` na mile → blocker (root pe publish hota, baad me URL badalta); khaali →
`parentId` bheja hi nahi jaata. Sub heading 2000 se lambi → chhodi jaati hai (HTML kaati nahi jaati).

**Usi din client ne apna doc khud bhara** (sheet wala `1AtY5YIu…`) aur ek label joda: **`On this page:
Yes/No`** → `fields.showToc` — doc me likha ho tabhi bheja jaata hai, na ho to admin ka chunav bachta
hai. ⚠️ Bina iske wo line `Parent page` ke khaane me jud jaati thi (`"Andaman Beaches\nOn this page:
Yes"`) aur page draft rehta — asli doc pe chala kar pakda. Stat Rail client ne **ek line me** likhi
(`Value: Free`, `Suffix : entry`) — parser use pehle se samajhta tha.

Fixture ab **wahi client ka doc** hai (`packages/shared/src/import/__fixtures__/page-template.html`),
sirf image ka ~100KB `data:` URI ek 1200×800 solid PNG se badla gaya.

**11. Page pe FAQ saada, accordion nahi (usi din, client).** Reference (`page-template-text.html`) me FAQ
content ka hissa hai — `h2` heading, har sawaal `h3`, jawab paragraph. Data **FAQs block me hi** raha
(schema hamesha, Bulk Upload waisa hi); sirf `page` pe `Blocks` ko `plainFaqs` milta hai. Koi nayi CSS
nahi — `.art` ke `h2/h3/p` aur `.art--page h2` ki line. Tour aur Blog pe accordion hi.

**12. Pages settings — subah ke teen chunav palte (usi shaam, client).**
- **`Pages ▸ Pages settings`** (`/pages/settings`, `settings.pageSettings`, model me bhi) — do cheezein
  sab pages ke liye: `bannerMediaId` (Featured image na ho to hero ka banner; §2 ka _"koi banner nahi"_
  palta) aur `showToc` (default on; §6 ka per-page checkbox palta). Tour settings ki image page pe
  **nahi** aati — har type ka fallback apni screen se.
- **`Show WhatsApp button` hata** (§3 palta) — button hamesha, number `settings.whatsapp` se.
  `showWhatsapp`/`showToc` page ke field set, `normalizeFields()` aur payload teeno se gaye. Purane page
  ke `fields` me pade reh sakte hain; koi nahi padhta (test hai).
- **Bulk Upload:** doc ki `On this page` line ab page pe kuch nahi likhti — label pehchana jaata hai
  (warna `Parent page` me judti) aur ek note aata hai. `Blog heading` (D-93) wala hi tareeka.
- **Content card pe hover wapas** — `.art--page:hover` ka override hata (wo mera chunav tha, §5); ab
  blog jaisa neela border.
- **Form ke input pe focus ka neela border/glow nahi — har jagah** (base `.fld :focus`). Pehle sirf
  sidebar pe lagaya, client ne _"in all even packages and tour"_ kaha; `.fld` sirf `EnquiryForm` use
  karta hai, to package ka book form, tour/blog/page ka cta form aur mobile popup — sab.
- **Past imports me pagination** — All me teeno type ke run jud kar (60 tak), har type ka tab apne 20.
- **Page ka FAQ saada** (§11), **TOC pe current section `.on`** (IntersectionObserver, reference ka hi
  `rootMargin`), breadcrumb ke `›` ki jagah (`.vcrumb > span { display: contents }`), figure ke upar
  14px, hero byline me dot alag element (page + post), aur header ka band flyout `display: none`
  (touch device pe page 1385px ka ban kar zoom-out ho raha tha).

---

## D-96

**Home page — ek hi entry, `/` pe, sections ki list (client, 15 Sep)**

**Status:** ✅ Section 1 (Hero with form) ban gaya. Baaki sections client ek-ek karke batayega.
**Reference:** `.claude/docs/reference/home-nav-v3.html` (repo me 24 Aug se; header/footer isi se bane the)

### Client ke faisle

| # | Faisla |
| --- | --- |
| 1 | `Pages ▸ Home Page` — **seedha edit screen**, list nahi. Home ek hi hai |
| 2 | Page **sections** ka hai; reference ke number (`3. HERO`…) kram nahi hain — kram **drag** se |
| 3 | Har section pe **background colour — koi bhi rang, picker se** |
| 4 | Header + footer **jo bane hain wahi** |
| 5 | Hero: desktop + mobile image; baayein title + description + 4 stats; daayein **form, id se chuna** |
| 6 | Title ka neela hissa **Italic** se (Tour page jaisa) |
| 7 | Form card ki hari patti **admin field** (`ribbon`) |
| 8 | Button ka text **form ki setting** — `Enquiry Forms ▸ Button label` (_"future me helpful ho"_) |
| 9 | Button ke neeche ki line = form ka maujooda **Note under the button**, bas **taale ka icon** |
| 10 | Mobile pe form text ke **neeche seedha** (reference jaisa), popup nahi |
| — | Eyebrow chip (`★ 4.8 on Google…`) — **abhi tay nahi**, isliye nahi bana |

### 1. `homePage` type, `urlPattern: '/'` — `settings.homepageEntryId` nahi

D-40 me `frontPageType` + `homepageEntryId` rakhe gaye the ("koi bhi page front page ban sake"), aur
02-ARCHITECTURE §4 / 08-RISKS usi raaste ki baat karte the. Client ne ulta maanga — **ek dedicated
home**. Pointer rakhne ka matlab hota ek hi baat ke do source (entry ka path ek kahe, settings doosra) —
D-43 §4 aur D-44 §5 wali galti. `cms-architect` ne yahi palat sujhaya.

Path `/` hone se teen cheezein **bina special case** ke milti hain: `resolvePublicPath('/')` seedha
chalta hai, `tagsFor()` `path:/` pehle se bhejta hai, aur `{siteId, locale, path}` unique index **DB
me** "ek hi home" pakka karta hai.

- `resolvePath()` ko kuch nahi badalna pada — pattern me `{slug}` na ho to `replace` wahi `/` lautata
  hai. Naya helper **`hasFixedPath(contentType)`** (`path.js`) service ke liye
- `resolveSlugAndPath()` tay path pe `-2`/`-3` ka loop nahi chalata — ek baar dekhta hai, takraav pe
  **409 "There is already a Home Page"**. Bina iske 50 koshish ke baad "free URL nahi mila" aata
- **Home trash nahi hota** (`trashEntry()` — `path === '/'` pe 422). Utaarna ho to Draft. Bulk bhi
  isi raaste se
- Slug phir bhi banta hai (`home`) — `{siteId, type, slug}` unique hai. Title badalne pe path `/` hi
  rehta hai, `recordAutoRedirect()` `from === to` pe kuch nahi karta
- ⚠️ `urlPatternSchema` ka `{slug}` wala niyam **custom types pe waisa ka waisa** — built-in seed us
  schema se guzarta hi nahi
- ⚠️ **Screen kholne se entry nahi banti** (R13). Khaali editor, pehli Save POST
- `frontPageType`/`homepageEntryId` **model me pade rahenge, koi nahi padhta** (D-40 §4: singleton
  field saste hain)

### 2. Sections = `content.blocks[]`, background `props` me

Wahi FROZEN `{id, type, props}` envelope (D-87 §7). `HOME_PAGE_BLOCK_TYPES = ['heroForm']`.

- **Background `props.background` me, envelope ke `style` me nahi.** `style` responsive spacing ke liye
  hai (§6) aur use padhne wala `styleToCss()` abhi bana hi nahi (`packages/blocks` khaali hai). Hero ki
  image bhi props me hai — rang aur image saath
- **D-08/D-20 ("sirf token rang") ka apwaad** — client ne picker maanga (R15), aur D-93 me
  `taxonomies.color` free hex pehle se hai. Rok **shape** pe: `sectionBackgroundSchema` =
  `^#[0-9a-fA-F]{6}$` ya khaali, lowercase me store. Theme me inline `--hf-bg` variable — `;`/`url()`
  wali string Zod pe hi girti hai (test hai)
- Type ka naam **`heroForm`** — "home" nahi (R4: naam permanent hai, aur kal ye section kisi aur page pe
  bhi lag sakta hai)

### 3. Form seedha section me — sidebar nahi

Client ne poochha tha sidebar setting chahiye ya nahi. **Nahi:** sidebar widget ki **list** hai, hero me
ek card ki jagah hai, aur named sidebar beech me rakhne se home ka form badalne ke liye Appearance ▸
Sidebar jaana padta. Props ki shape wahi jo `enquiryForm` widget ki hai (`formId` + heading +
description), aur form usi `getPublicFormById()` se resolve hota hai.

- Payload: `toPublicHome()` (alag, `toPublicPage()` nahi — breadcrumb/byline/TOC/sidebar ka kaam home
  pe bekaar chalta). `resolveHomeSection()` `data: { image, mobileImage, form }` deta hai aur props se
  **`imageId`/`mobileImageId`/`formId` hata deta hai** (D-88 wala `sidebarId` tark). Khaali `value`
  wale stats gir jaate hain
- Draft/delete form → `null`, card gayab (D-42 §2)
- Web: `EnquiryForm` ka teesra `variant="hero"` — class `.hf-card`, **`.wdg` nahi** (uske mobile rules
  form ko `display: none` karke sheet banate). Dock hero pe kabhi nahi

### 4. `forms.submitLabel` — naya field

Zod + **model** + `toPublicForm()` + FormBuilder + `emptyForm()`. Khaali pe theme ka purana `Get this
itinerary` — package/tour/blog ke chalte form ka button nahi badla. Test **DB** padhta hai (D-86 wala
jaal — model me na ho to Mongoose chup-chaap gira deta).

### 5. Cache — form badle to uske pages

`forms` service pehle sirf `type:package` bhejti thi, jo home pe kuch saaf nahi karta. Naya
**`pathTagsForForm(formId)`** (entries service) — jin entries ke `content.blocks.props.formId` me ye form
hai unke `path:` tag. `/` hardcode nahi. Update aur delete dono pe.

⚠️ **Wahi bug sidebar pe zinda hai, aur wo is kaam ka hissa nahi** — `sidebars` service
`type:page`/`type:tourPage` bhejti hai jinhe web ki koi fetch nahi lagati. Sidebar ya uske form ka
badlaav tour/page/blog pe **ek ghante** (`CACHE_SECONDS`) baad dikhta hai. **A-26**.

### 6. Theme

- `components/home/HomePage.jsx` (sections ka naksha) + `HeroForm.jsx`, catch-all me `homePage` branch
- CSS prefix **block ka** (`.hf-*`), reference ka nahi — `.art`/`.faq`/`.sec` aaj hi takraate hain
- Parda (gradient) `color-mix()` se **usi background rang** se — reference ka `rgba(11,43,74,…)` copy
  karne pe client ka rang parde ke neeche dab jaata. Default rang pe bilkul reference jaisa
- Mobile image: `Img` ka naya `mobile` prop → `<picture><source media="(max-width: 760px)">`. CSS
  background nahi (preload scanner use nahi dekhta, D-85 ka LCP jaata). 760 = site ka mobile breakpoint
- ~~Naye tokens `--fs-hero` · `--fs-hero-sub` · `--fs-hero-num`~~ — **usi din hataye** (§8). Sirf `--sh-4`
  bacha (card ki shadow)

### 8. Font baaki pages jaisa — reference ka nahi (client, usi din)

Client: _"font jo decide kiya hai use rakho jaise other pages me hai, so sabka same rahe"_ — wahi niyam jo
D-95 pe tha (_"font jo decide kiya bo rahega reference ka nahi"_). Pehle hero ne reference ke naap liye the
(h1 24–38px, number 19px).

Ab home ke selectors **maujooda rules ke saath grouped** hain, copy nahi — taaki client jab Tour ka font
tune kare, home apne aap saath chale:

| Home | Kiske saath |
| --- | --- |
| `.hf-hero h1` · `h1 em` · `__sub` · `__sub p` | `.vhero h1` · `.vhero__sub` (Tour/Page/Blog hero) |
| `.hf-stat b` · `span` | `.vrail__c b` · `span` (stat rail) — rang home ke rule me safed |
| `.hf-card__head h3` · `p` · `.hf-card__note` | `.wdg--cta h3` · `p` · `small` (sidebar ka form card) — rang/margin home ke rule me |

⚠️ Grouped rule ka **rang/margin** home pe galat hai (Tour ka card neela, home ka safed), isliye home ke
apne rule usi selector se file me **baad me** aate hain aur sirf wahi override karte hain. Font ki koi
property home ke rule me nahi — wo likhna phir se do jagah ka naap bana deta.

### 9. Enquiry Forms — fields drag se (client, usi din)

_"delete then create karna padta hai"_ — `FormBuilder` ki fields table me ⠿ grip, wahi `useListDrag`
(keyboard ↑/↓ bhi). Kram sirf array ki position hai: koi migration nahi, enquiries ke `values` key se
baithe hain. ⚠️ Kram page pe asar karta hai — do **lagataar** `half` hi ek row bante hain (`toRows()`).

### 7. Jo jaan-boojh kar nahi bana

- **Eyebrow chip** — client ne tay nahi kiya
- **Mobile bar** (`.mobar` — Call · WhatsApp · Get free quote) aur **floating buttons** — reference me
  hain, abhi maange nahi gaye
- **JSON-LD** home pe — koi section abhi use nahi maangta
- ⚠️ Form me `source: packages` wala dropdown hero pe **nahi dikhega** — use vikalp package page deta
  hai. Client ke form me aisa field ho to use apne vikalp wala select banana hoga

**Koi migration nahi.** Deploy pe **`pnpm seed`** (`homePage` type banta hai) + API restart.

### 10. Design se milaan — sirf heading aur body ka font hamara (client, usi din, data bhar kar)

§8 zyada door chala gaya tha: stats aur form card bhi dusre pages ke rules se jud gaye the. Client ka
niyam saaf hua — _"make design match, only body font and heading font will be our decided"_.

| Cheez | Ab |
| --- | --- |
| h1 ka size/weight · sub line ka font | hamara (`.vhero h1` / `.vhero__sub` ke saath grouped) |
| h1 ki chaudai | design ka **`19ch`** (Tour ka 20ch nahi); sub line `58ch`, margin 10px |
| Stats | design ka `.hero__stats` — number 19px 900, label 11.5px 600, **uppercase nahi** (pehle `.vrail__c` se aa gaya tha) |
| Card heading · description · note | design ka `.quote__head` — 19px · 12.5px · 11.5px (pehle `.wdg--cta` ke 16/12.5/11) |

⚠️ **Description bada kyun tha:** client ki `formDescription` bina `<p>` ke save hui hai (asli payload me
dekha), aur naap sirf `.hf-card__head p` pe tha — to text card ka 16px le raha tha. Ab naap description ke
`div` pe hai. Wahi A-19 wala sawaal, chauthi jagah.

`--fs-hero-num: 19px` token wapas aaya (sirf card heading aur stat number).

**All Pages me Home Page** — list ke upar ek row (`EntriesList` ka `pinnedType`), sirf All tab ke pehle page
pe aur bina search/date filter ke. Edit → `/pages/home`, View → site ka `/`. Na checkbox, na Trash.
`homePage` ko `page` nahi banaya — list query use laati nahi, aur type badalna `/` aur "ek hi home" dono todta.

### 11. Section 2 — `Info cards` (client, usi din)

Client: _"box layout — card me icon, title, description, label (blog/article jaisa); card ka look: border
ya bina, top/left border, icon aur title ka layout, icon ka bg rang, text center ya left"_. Reference ke
chaar section dekh kar setting ka dhaancha banana tha: **Achievements** (Trusted by ke upar), **Certified
by**, **Why us?**, **Popular articles**.

**Charon ek hi section (`infoCards`)**, chaar block type nahi — grid aur card ka dhaancha ek hai (icon →
label → title → text), farak sirf look ka:

| Look | Border | Icon | Text | Heading |
| --- | --- | --- | --- | --- |
| Achievements | + upar sunehri patti | 42px dabba, upar | left | — |
| Certified by | poora | dabba, upar | **center** | center |
| Why us | + baayein neeli patti | **bina dabba, title ki line me** | left | center |
| Popular articles | poora, hover + link | dabba, upar, **label** | left | **left + View all** |

Client ke chaar jawab (sawaal pooche gaye): icon **list + upload** (upload jeet-ti hai) · label **haath
se** · link **optional, poora card** · description **chhota editor** (bold/italic/link, inline profile).

- **Props:** `background` · `heading` · `description` · `headingAlign` (`center|left`) · `linkLabel`/`linkUrl`
  · `columns` (2–4) · `border` (`none|full|top|left`) · `accentColor` · `iconPosition` (`above|inline`) ·
  `iconBox` · `iconBg` · `iconColor` · `textAlign` · `items[]` ≤12 `{icon, imageId, label, title, text, url}`.
  Saare rang wahi hex rok (`sectionBackgroundSchema`)
- **Admin "Start from"** — chaaron look ek click me; **store nahi hota**, sirf look ki values bharta hai
  (heading/cards/background nahi chhoota). Naya section "Certified by" look se khulta hai
- **Icons** shared `ICONS` me jude (`shieldCheck · users · briefcase · globe · vehicle · eye · home · rupee`),
  alag list nahi (`icons.js` ka tark) — header/footer ke dropdown me bhi dikhenge
- Tour ka `cards` block **reuse nahi** — uska look `tour-v3.html` ka hai, label/link nahi
- ⚠️ **Link wala card `<a>` nahi** — description me link ho sakta hai aur `<a>` ke andar `<a>` HTML todta hai.
  Title ka link `::after` se poore card pe phaila hai
- Payload: `resolveInfoCards()` — card ki image `thumb` resolve, `imageId` bahar nahi; **khaali card gira**
- Font: section heading/line `.sh h2`/`.sh p` ke saath grouped (hamara); card ke naap design ke (title 15px,
  label 10px — naye tokens `--fs-card-title`/`--fs-card-label`, text 12.5px)

⚠️ Render aankh se nahi dekha (client ke home me section nahi joda) — **A-28** me jodna.

**§11 amendment (client, usi din):** card ki description ab **body font** (`--fs-body`, 14px, `.blk p` jaisa)
aur title **16px** (`--fs-2xl`) — design ke 12.5px/15px nahi. `--fs-card-title` token hata.

### 12. Section 3 — FAQ (client, usi din)

Reference ka `23. FAQ`: heading + line center, list 860px beech me, `<details>` accordion, pehla khula, aur
script — **ek waqt me ek hi khula**.

**Naya block type nahi — wahi `faqs`.** Schema, `sanitizeContent()`, admin ka `FaqsBlock` editor, card ki ids
aur `FAQPage` structured data sab pehle se the. Sirf teen cheezein judi:

- `faqsPropsSchema.background` (hex rok) — **admin me sirf home pe dikhta hai** (`PageBlocks` ka naya `home`
  prop, `PageEdit` `homePage` pe bhejta hai). Tour/Page/Post pe khaana nahi, theme padhti nahi; khaali
  default purane data pe asar nahi
- `HOME_PAGE_BLOCK_TYPES` me `faqs`
- Theme: `HomeFaqs.jsx` (`.hsec` — background + reference ka padding) + `FaqAccordion.jsx` (`'use client'`,
  `onToggle` pe baaki band). Look `.faq` hi — package page wala, reference se hi; koi nayi accordion CSS nahi.
  JS na chale to `<details>` phir bhi khulta-band hota hai
- **Section heading ek component me nikla** — `SectionHead.jsx` (`.hsh`, pehle `InfoCards` ka `.ic__sh`).
  Do section ek hi dhaancha maang rahe the
- Structured data: `HomePage` `TourSchema` render karta hai — home pe breadcrumb nahi banti (ek kadam), saare
  `faqs` milaa kar ek `FAQPage`

Font: sawaal `.faq summary` (14.5px, package page jaisa), jawab body font — dono maujooda. 3 naye API test.

**§12 amendment (client, usi din):** FAQ pe **Section alignment** — `faqsPropsSchema.align` (`center|left`,
default center). Admin me sirf home pe (background ke saath). Left pe heading baayein aur list kinare se
(860px chaudai wahi, `.hq--left .faq { margin-inline: 0 }`).

### 13. Section 5 — Customer reviews (video) + Reviews ke do tab (client, usi din)

Client: _"Reviews admin me tab — text (pehle se) aur video, parallel"_; section 5 = reference ka
`11. VIDEO CUSTOMER REVIEWS` — **image, video link, title, package name**.

Client ke teen jawab (pooche gaye): click pe **popup me video** · package name **haath se** · section me
**chunein, kram drag se**.

**Data — nayi collection `videoReviews`, `reviews` me `kind` nahi.** Text reviews package page pe
**bina filter** jaati hain (`getPublicPackageDefaults()`, D-70). Ek collection me `kind` rakhne ka matlab
hota har query ko filter yaad rakhna — ek bhoolte hi khaali video card package page pe. Alag collection me
wo galti ban hi nahi sakti.

- Master-lists module ki paanchvi list (`LISTS.videoReview`): `imageId · videoUrl (https) · name
  (UI me "Title") · packageName`. `name` isliye ki generic screen ka search aur delete-confirm usi pe
- **Permission wahi `review.*`** — client ke liye ek hi "Reviews"; nayi permission = roles migration
- **Migration 025** — sirf index `{siteId, createdAt:-1}`. Local pe chal chuki
- `/api/video-reviews` (list/get/create/update/delete, permanent delete — master list)
- **`videoEmbedUrl()`** (shared) — YouTube (`watch`/`youtu.be`/`shorts`/`embed`) → `youtube-nocookie`,
  Vimeo → player. Baaki (Instagram…) `null` → theme link naye tab me. Server payload me banata hai

**Admin:** `/reviews` ab `ReviewsScreen` — `.tabs` (**Text reviews · Video reviews**, `?tab=video`), dono
`MasterListScreen`. Us screen me do naye field type: `media` (MediaDrop; edit pe hatane se `null` jaata
hai) aur `url`; list me image ka thumbnail. ⚠️ **`/reviews` ka route guard 1 Sep se chhoota hua tha** — juda.

**Section `videoReviews`:** `background · heading · description · headingAlign (default left) · link ·
reviewIds[] ≤20`. Admin: wahi do-column `.picker` jo Package list pe hai (baayein saare, daayein chune, ⠿
drag). Heading position + link ab `HeadingPositionFields` me — Info cards aur yahan saanjha.
Payload: `resolveVideoReviews()` — `reviewIds` ke kram me, delete wala gira, `reviewIds` bahar nahi,
`data.reviews[{id,name,packageName,videoUrl,embedUrl,image}]`.

**Web:** `VideoReviews.jsx` + `VideoRail.jsx` (`'use client'`) — reference ki 9:14 tiles (`.vrl`), play
button, naam + package. **Iframe sirf popup khulne pe** (chhe YouTube iframe pehle se = ~3 MB JS, D-85
jaata). Popup `.vmod`: Esc, parde pe click, focus wapas tile pe, scroll lock.

**Cache — do purane gap band:**
- **Text reviews ka koi tag jaata hi nahi tha** — `master-lists` service `revalidateTags` bulati hi nahi
  thi; review badalne ke baad package page ek ghanta purana. Ab `LISTS.review.tags = ['type:package']`
- Video review badle/hate → `pathTagsForVideoReview()` (jin pages ke section me chuna hai unke `path:`).
  `pathTagsForForm` ab saanjhe `pathTagsForBlockRef(field, id)` pe
- ⚠️ Hotels · Add-ons · Transfers pe abhi bhi koi tag nahi — **A-29**

5 naye API test + 2 shared.

### 14. Section 4 — Image cards (client, usi din)

Client: _"box with image — bg-image, title; card vertical ya horizontal (height/width), alignment, aur
heading ke saath link button (All beaches, All places) jiska text aur link badle"_. Reference: **Andaman's best
islands** (`.isl`) · **Popular beaches** · **Places to visit** (`.pt`). Client lunch pe tha aur kaha _"build
karo, main data bhar ke dekhunga"_ — isliye sawaal nahi pooche, faisle neeche likhe hain.

**Ek section `imageCards`** (Info cards wali soch, §11):

- Props: `background · heading · description · headingAlign (default left) · link` + look `shape
  (square|portrait|tall|landscape|wide) · columns 2–6 · mobileColumns 1–2 · textAlign · textPosition
  (bottom|middle)` + `items[] ≤24 {imageId, title, subtitle, tag, url}`
- **Mere chunav (client dekhega):** card me `subtitle` (beaches ka `Havelock`) aur `tag` (islands ki chip)
  optional jode — reference me hain, client ne sirf "bg-image, title" kaha tha. Khaali chhodne pe nahi dikhte
- "Start from": Best islands (wide, 4, phone 1) · Popular beaches (square, 4, phone 2) · Places to visit
  (square, 5, phone 2). Naya section beaches look se khulta hai
- Islands ke do group (`Top islands`/`Offbeat islands`) — **do section**, doosra bina heading. Admin hint me likha
- Card plain text hai, isliye link wala card seedha `<a>`. Payload: `resolveImageCards()` (`medium` image,
  `imageId` bahar nahi, na title na image wala card gira)
- Web `ImageCards.jsx` (`.imc`/`.imcc`), parda aur naap reference ke; tablet pe 3 column (2 wala 2 hi).
  Heading `SectionHead` (hamara font)

**Usi din — Media upload ka bug:** Media Library aur picker me _"Upload file is required"_. Admin ke axios
client ka default `Content-Type: application/json` dekh kar axios 1.x `FormData` ko **JSON bana deta tha**
(`{"file":{}}`). Logo/footer/banner ki screens multipart header khud bhejti thin, isliye wo chalti rahin.
Ilaaj `lib/api.js` ke interceptor me, ek jagah — `FormData` pe multipart. Node me dohra kar pakka kiya.

### 15. "Start from" presets hata diye (client, usi din)

Client: _"ye CMS kai websites ke liye hai; Start from ko Andaman se chipka dena achha chunav nahi — hata do"_.
Info cards (§11) ke chaar aur Image cards (§14) ke teen preset ke **naam hi ek site ke the** (Achievements,
Certified by, Andaman's best islands, Popular beaches…). Agle client ke admin me wo dropdown bemaani — aur
jhootha — hota.

- Dono editors se dropdown aur `INFO_CARDS_PRESETS` / `IMAGE_CARDS_PRESETS` hate. Store kabhi hote hi nahi the,
  isliye koi data ya migration nahi
- Naya section ab **schema ke saade default** se khulta hai — Info cards: border chaaron taraf, icon upar,
  dabba ke saath, text left, heading centre; Image cards: square, 4 column, phone pe 2, text neeche-left
- Look ki saari settings waisi hi hain — reference ka koi bhi look haath se ban jaata hai

⚠️ **Sabak (core vs theme):** admin ke **labels/defaults** me client-specific shabd core me nahi aane chahiye —
wahi tark jo Q-9 me `TAB_NOTE` (`Sea-facing`, `Beachfront`) pe likha hai. Aisa kuch chahiye ho to wo client ke
theme/instance ka hissa hai.

### 16. Section 6 — Testimonials, text reviews se (client, usi din)

Reference ka `22. TESTIMONIALS` (`.tm`): heading centre, 4 card — upar-baayein quote icon, text, neeche
avatar initials + naam + chhoti line. Pehle client ne sirf **jaanch** maangi (content upload chal raha tha,
code nahi); jaanch me nikla ki `reviews` me sab khaane pehle se hain (`text · name · lastLine`), koi field ya
migration nahi chahiye. Phir client ke paanch jawab:

| Sawaal | Jawab |
| --- | --- |
| Kaunse reviews | section me **chuno, drag se kram** (`testimonialIds`) |
| Icon | quote **fixed**, rang section se (`iconColor`) |
| Avatar | naam se **initials** (theme me, koi field nahi) |
| Taare / mahina | **nahi** — reference me nahi |
| Columns | **fixed** — 4 → tablet 2 → phone 1 |

- Section `testimonials`: `background · heading · description · headingAlign (centre) · link · iconColor ·
  testimonialIds[] ≤20`. Payload `resolveTestimonials()` — sirf `{id, text, name, lastLine}`; rating/month
  jaan-boojh kar nahi; delete wala gira
- ⚠️ **`testimonialIds`, `reviewIds` nahi** — `reviewIds` video ka hai aur `pathTagsForBlockRef` field naam se
  query karta hai. Test pakka karta hai ki text review ki id video wale tag me nahi aati
- Cache: `LISTS.review.tags` ab `type:package` + `pathTagsForTestimonial()`
- **Admin `ListPicker`** — do-column picker ek component me nikla (pehle `VideoReviewsBlock` ke andar);
  Customer reviews aur Testimonials dono isi pe
- Web `Testimonials.jsx` — `<figure>` · `<blockquote>` · `<figcaption>`; review ka text body font. Section ka
  default rang reference ka halka neela (`.hsec--tint`)

**Koi migration nahi.** Deploy pe sirf API restart.

**§11/§16 amendment (client, usi din):** home ke section ki heading `var(--fs-h2)` aur neeche ki line **body
font** (`--fs-body`) — baaki pages (`.blk h2`) jaisa. Pehle `.hsh` ko `.sh h2`/`.sh p` (package page ka
19–25px / 13.5px) ke saath group kiya tha — galat saathi. `.sh` package page ka hai, chhua nahi. Testimonials
ke card me naam bhi body font.

### 17. Section 7 — Logo grid (client, usi din)

Reference ka `8. CLIENT LOGOS` / _Trusted by leading organisations_. Client: _"isme images add hongi — har logo
pe 2 option: image + optional heading"_.

- Section `logoGrid`: `background (default halka neela) · heading · description · headingAlign (centre) · link ·
  items[] ≤48 {imageId, title} · closingTitle · closingText`
- Tile: image ho to logo (max 40px oonchai, `contain`) aur heading uske neeche chhoti line + `alt`. **Image na ho**
  to heading hi tile ka text — reference aaj yahi hai (`ICICI Bank`). Dono na hon to logo gira
- Columns **fixed** — reference ke breakpoints: 6 → 1180px pe 4 → 760px pe 3
- **Closing line** (`.ctrust` — `EXPERIENCE. EXCELLENCE. TRUST.` + chhoti line) — reference ke isi section me hai,
  isliye optional khaane diye (**mera chunav**, client ne alag se nahi maanga). Khaali pe nahi banti
- Payload `resolveLogoGrid()` — `thumb` image, `imageId` bahar nahi
- Admin: har logo ek patli row (⠿ · chhota image dabba · heading · ✕), `＋ Add logo`

Koi migration nahi. 1 naya API test.

**§14/§17 amendment (client, usi din):** home ke headings me reference ke `.5` wale naap poore — 15.5px → **16px**
(Logo grid ki closing title, `--fs-2xl`), 14.5px → **14px** (Image cards ka title, `--fs-base`). Baaki home CSS
me `--fs-xl`/`--fs-lg` kahin nahi. FAQ ka sawaal (`.faq summary`, 14.5px) package page ke saath saanjha hai —
chhua nahi.

### 18. Future customizer ke liye taiyaari — rang aur font tokens pe (client, usi din)

Client: _"aage admin me customize option aa sakta hai jahan rang aur font handle honge — kya hum usi hisaab se
kar rahe hain?"_ Naap ke jawab diya, phir client ne kaha _"abhi kar do"_. **Dikhne me kuch nahi badla** — har
value wahi hai, sirf ghar badla.

1. **Gehre parde token pe** — `--shade` (`#071e34`) aur `--scrim` (`#081422`) `:root` me; 7 jagah (hero, image
   cards, video tiles/popup, package ka mobile sheet) `color-mix(in srgb, var(--shade) N%, transparent)`.
   Safed (`#fff`, safed alpha) aur video box ka `#000` neutral hain — nahi chhue
2. **Admin ke color picker ka "Default"** — `THEME_COLORS` (`packages/shared/src/constants/theme-colors.js`),
   11 jagah se haath ka hex hata. ⚠️ Abhi ye `:root` ki **copy** hai; `schemas.test.js` ka test dono ko milaata
   hai — ek badla aur doosra nahi to test girta hai
3. **Poori site ke 26 literal font-size tokens pe** — 16 maujooda scale ke token pe (11px → `--fs-4xs` …), 10
   naye kaam ke naam se usi value pe: `--fs-hero-title` · `--fs-hero-sub` · `--fs-stat` · `--fs-section` ·
   `--fs-price-side` · `--fs-price-row` · `--fs-offer` · `--fs-quote` · `--fs-card-lg` · `--fs-card-md` ·
   `--fs-glyph`. Ab `globals.css` me ek bhi font-size seedha px me nahi (sirf `inherit`)

**Niyam aage ke liye:** naya CSS rang aur font sirf `:root` tokens se; admin me dikhne wala default rang
`THEME_COLORS` se.

⚠️ **Jo is kaam me nahi hai:** tokens ke naam abhi ek site ke hain (`--blue-900`, `--orange-500`), kaam ke nahi
(`--brand`, `--accent`). Customizer banate waqt 5-6 kaam ke naam wale tokens upar se banenge — **A-30**.

### 19. Section 8 — Package grid (client, usi din)

Reference ka `10. PACKAGES` / _Andaman's best-selling packages_. Pehle jaanch (card ke har khaane ka data
`toPackageCards()` me pehle se hai; DB me 5 package — banner, route, ferry, breakfast, daam + strike sab bhare;
rating sirf ek ki apni), phir client ke jawab:

| Sawaal | Jawab |
| --- | --- |
| Kaunse packages | **saare published, apne aap** — max 16, aage "View all" link |
| Baayein badge | **jitne Package Type chune, sab** |
| Chips | sirf apne aap wale — duration · Ferry · Breakfast |
| Filter pills | All + **saare** Package Type (jinme koi package hai) |
| Rating | package ki apni, warna site ki default |

- Section `packageGrid`: `background · heading · description · headingAlign (left) · link · showFilter`. Cards
  ka koi chunav store nahi hota
- Payload `resolvePackageGrid()` — published (+ scheduled jiska waqt aa gaya), **sabse naya publish pehle**
  (**mera chunav** — client ne kram nahi bataya), `PACKAGE_GRID_SCAN` = 60 tak. Theme ek waqt me 16 dikhati hai;
  list badi isliye ki pill pe us type ke pehle 16 aayein. `data: { cards, facets, currency }`
- `toPackageCards()` me naye: `tags[]` (saare type ke naam), `packageTypeIds[]`, `destinationIds[]`
- Web: `PackageGrid.jsx` + `PackageGridCards.jsx` (`'use client'`, pills) — reference ka vertical `.pk`
  card (`.ipkc`), Tour ka `.prow` nahi. Discount wahi hisaab (strike vs asli daam)

**Do purane bug saath me band:**

1. **Tour page ka Package list — `Package Type`/`Destination` filter kabhi chala hi nahi.** Web sirf
   `durationBucket()` se chhaantta tha aur card me taxonomy ids thin hi nahi — pill dabate hi list khaali. Ab
   `pageFilter` ke hisaab se `packageTypeIds`/`destinationIds`; bar ka label bhi filter ke hisaab se
   (pehle hamesha "Duration")
2. **Package badalne pe home/tour page ka cache saaf nahi hota tha** — `tagsFor()` `type:package` bhejta hai, jo
   resolve fetch pe laga hi nahi. Naya `packageListingTags()` (`invalidate()` me) — jin pages me
   `packageGrid`/`packageList` hai unke `path:`. ⚠️ `packageDefaults` (site ki default rating) badalne pe ab
   bhi sirf `type:package` jaata hai — A-29 me joda

2 naye API test. Koi migration nahi.

### 22. Section 10 — Text with video (client, usi din)

Reference ka `20. ABOUT US + OUR STORY VIDEO`: baayein heading · paragraph · teen point (icon + title + line) ·
button, daayein image box — ▶ aur caption, click pe video. Client: _"a two column layout to build"_. Pehle dhaancha
dikhaya, teen sawaal pooche, phir code.

| Sawaal | Client |
| --- | --- |
| Video link khaali ho to? | **box sirf image** — na ▶, na click |
| Image baayein bhi? | haan — `imageSide: right | left` |
| Points kitne? | **6** |

- Section `textVideo` (label **Text with video** — "About us" ek site ka naam hai, §15): `background (default halka
  neela) · heading · text (html) · items[] ≤6 {icon, imageId, title, text (inline)} · buttonLabel/buttonUrl ·
  imageSide · imageId · videoUrl · videoTitle · videoText`
- Points ka array **`items`** naam se — `normalizeContent()` home ke har repeater ko `items` pe hi id deta hai
- `videoUrl` — khaali ya `https://` (`videoReviewSchema` wali hi rok; popup na bane to link `<a href>` me jaata hai)
- Payload `resolveTextVideo()`: `data.image` (`large`) + `data.embedUrl` (`videoEmbedUrl()`), points ki image
  `thumb`, khaali point gira, koi `imageId` bahar nahi
- Box ke teen roop (`VideoBox.jsx`): embed → **button** + popup · doosra link (Instagram) → **link** naye tab me ·
  khaali → saada image, opacity poori, parda sirf caption ho to
- ⚠️ **Popup `VideoModal.jsx` me nikla** — pehle `VideoRail.jsx` ke andar tha; doosra section aate hi saanjha
  (do copies ek din alag ho jaati hain). `onClose` ref me rakha — inline arrow ko effect ki dep banana har render
  pe focus galat jagah bhejta
- Tour ka `twoColumn` reuse **nahi** — wo do khaali HTML dabbe hain; points ki list aur video popup editor me client
  khud nahi bana sakta
- Naap: heading `--fs-h2`, paragraph aur point ki line **body font**, point title 14px, caption title 15px → **16px**
  (§17 amendment wala niyam), 1024px se neeche ek column aur image hamesha text ke neeche (reference)

### 23. Section 11 — Award badges (client, usi din)

Reference ka `6. AWARD BADGES` / _TripAdvisor Travellers' Choice — 8 consecutive years_: heading + line beech me,
neeche sunehre golon ki row (`2018` / `CHOICE`). Client: _"static section, tell me how to build"_.

| Sawaal | Client |
| --- | --- |
| Badge ka rang | suggestion maana — **ek picker**, default sunehra |
| Image ka option | **haan** — har badge pe |

- Section `awardBadges` (label **Award badges**): `background (default halka neela) · heading · description ·
  headingAlign (centre) · link · badgeColor · items[] ≤24 {imageId, title, label}`. **Static** — Offer cards jaisa
- **Ek rang, baaki usse** — border, andar ka halka rang, saal ka gehra aur label ka beech ka `color-mix()` se.
  Sunehre pe reference ke `#8a6212` / `#b08a3a` / `#fffdf7` ke kareeb. `THEME_COLORS.gold` juda (admin ka Default)
- Image ho to gole me image (`contain`, border nahi), text uska `alt`; na image na saal to badge gira
- ⚠️ **Render me bug pakda:** `.awb` pe `--awb-c: var(--gold)` default tha, jabki admin ka rang `section` pe aata hai —
  bachche ka variable jeet-ta hai, yaani **chuna hua rang kabhi lagta hi nahi**. Tests pass the (wo DB/payload
  dekhte hain). Ab default `var(--awb-c, var(--gold))` fallback me. Wahi D-86 wali shakl — "kuch na hona"
- 8px label ke liye naya token `--fs-badge-label` (scale me itna chhota nahi tha)

Dono ke 5 API test (asli DB) + 2 shared. Koi migration nahi. **1139 test** pass.

### 24. Client ke teen fix — hero ka eyebrow, About us ka box, islands ka tag (client, 16 Sep)

Client ne reference **browser me chala kar** screenshot bheji (R15: jo dikh raha hai wahi design hai). Koi
migration nahi.

**1. Home hero pe eyebrow** — `heroFormPropsSchema.eyebrow` (wahi `eyebrowSchema` jo `tourPage` pe hai;
plain text, koi HTML nahi). Admin me `Hero with form` ka naya khaana.

⚠️ Reference ke home hero me ye ek **chip** hai (`.hero__eyebrow` — gol pill, border, halka background), par
client ne **`.vhero__eye`** maanga — tour/blog wali saadi uppercase line + sunehra star. Wahi class reuse hui;
sirf jagah ki doori home ke liye alag (`.hf-hero__copy .vhero__eye`), kyunki tour me wo breadcrumb ke neeche
baithta hai aur home me sabse upar.

⚠️ **Star ab `Icon` se** — `TourPage.jsx` me uska apna `<Star/>` tha; doosri jagah aate hi wo do copies ban
jaata. `Icon` ko naya `filled` prop mila (`fill: currentColor`, `stroke: none`), aur dono jagah wahi hai.
`eyebrowSchema` ki jagah bhi badli — wo `heroFormPropsSchema` ke **baad** define hoti thi, yaani seedha use
karne pe TDZ error milta.

**2. About us ka box — na radius, na shadow, aur image kati hui nahi.**

Ye sabse seekhne layak hai: reference ki CSS me `.vidbox` pe `border-radius: var(--r4)`, `overflow: hidden`
aur `aspect-ratio: 16/11` **likhe hue hain** — par uska markup ek **inline `<a>`** hai. Inline box pe
`overflow` lagta hi nahi, radius dikhta nahi, aur `aspect-ratio` bhi nahi chalti. Isliye asli page pe kone
seedhe hain aur image apni ratio me chhapti hai. **Likhi hui CSS aur chalti hui CSS alag thi, aur maine likhi
hui padh kar bana diya tha.** Ab hamara box bhi wahi karta hai (image na ho to `.txv__box--noimg` se 16/11,
warna box gir jaata).

⚠️ Ye D-89/D-91 wali galti ka **ulta roop** hai: wahan reference ki CSS dekh kar markup maan liya gaya tha,
yahan CSS dekh kar uska **asar** maan liya gaya. Dono ka ilaaj ek hai — reference ko **chala kar** dekho.

**3. Islands ke card ka tag chhoti line ke saath** — `.imcc__b` ab flex column nahi, saada block (reference ka
`.isl__b`): title apni line pe, aur uske neeche subtitle + chip **ek hi line me**. Chip `inline-block` hai
(`margin-left: 7px`). Flex column har bachche ko apni line deta tha.

1 naya API test (eyebrow plain text hai aur payload me jaata hai). ⚠️ Poori suite is machine pe **disk full**
(`ENOSPC`) ki wajah se nahi chal payi — aaj ke hisse ke 309 test pass (home + shared + web).

### 25. `Custom editor` block + `Settings ▸ Custom CSS` (client, 16 Sep)

Client: _"custom editor option in home content blocks"_ aur _"custom css submenu in settings … so user can
enter css for home custom blocks"_. Teen sawaal pooche gaye, teenon ka jawab client ka:

| Sawaal | Client |
| --- | --- |
| CSS kahan lage | **poori site par** |
| Block kahan mile | **home aur Tour dono pe** |
| Block ki apni class | **haan** (mera suggestion) |

**Kyun do alag cheezein banani padi** — kyunki ek ke bina doosri bemaani hai: sanitizer `<style>` **aur**
`<script>` ka poora content girata hai (R20, D-80 ke saath hi tay hua tha). Yaani client apne HTML ke saath
uski CSS likh hi nahi sakta. Do raaste the — sanitizer me `<style>` kholna (poore site ki CSS ek block ke
andar, aur `</style` se HTML todne ka raasta), ya CSS ko apni jagah dena. Doosra chuna gaya.

- Block `customHtml` (UI: **Custom editor**): `background` (sirf home ke panel me) · `className` · `html`
- `className` ki shape Zod me sakht hai (`[A-Za-z0-9 _-]`) — wo seedha `class="…"` me jaati hai
- Theme me **ek hi component** (`components/CustomHtml.jsx`), do roop: home pe `.hsec` (poori chaudai,
  andar `.wrap`), Tour pe `.blk` (column ke andar). Do copies wahi galti hoti jo D-65/D-51/D-58 pe bachayi gayi
- `wrapTables()` yahan bhi chalta hai — A-19 wali baat: look client ki likhi class pe na tike
- `settings.customCss` → `getPublicSettings()` → `layout.jsx` ka ek `<style>`, har page pe

⚠️ **`</style` do jagah ruka hai** — Zod me (write) aur render me. CSS me JavaScript chalti nahi, isliye
asli khatra sirf yahi hai ki wo do akshar `<style>` tag **jaldi band** kar dein aur uske aage ka sab HTML ban
jaaye. Ye A-27 wali hi baat hai: value jahan render hoti hai, uska vyakaran wahin rokna padta hai.

⚠️ **Mongoose ka purana jaal** — `settings` model me field jodna zaroori tha; sirf Zod me jodne se API 200
deti, admin "Saved." dikhata aur DB me kuch na jaata (D-86). Test isiliye **response nahi, DB** padhta hai.

2 naye API test. Koi migration nahi (naya field default `''`, koi index nahi).

### 20. Package Type pe badge ka rang (client, usi din)

Client: _"Package Type ke Add/Edit me color picker, Posts ki Category jaisa — badge ko apna rang mile"_.

- **Server pe kuch naya nahi laga** — `taxonomies.color` (D-93) har type pe store hota tha (Zod, model aur
  `updateTaxonomy()` ki whitelist teeno type-agnostic), aur `resolveTaxonomies()` use pehle se bhejta tha.
  Sirf admin me control nahi tha
- Admin: `Packages ▸ Package Type` pe `hasColor` + apni hint (`colorHint` prop) — "Automatic" ka matlab yahan
  theme ka **narangi** (category ki tarah chaar rang ka rotation nahi)
- Card payload: `tags[]` ab `{ name, color }` (§19 me string the), aur `tagColor` (pehle type ka) Tour/Similar
  card ke liye
- Web: **`lib/badge.js`** — `badgeStyle(color)` + `inkOn()` (halke rang pe gehra text). Pehle `PostCard.jsx` ke
  andar tha; ab blog category, home Package grid aur Tour/Similar ka `.prow__tag` teeno isi se
- Destination ki screen pe rang **nahi** — wahan koi badge nahi banta

Koi migration nahi. `home-page.test.js` rang payload tak jaanchta hai.

### 21. Section 9 — Offer cards, ek static section chaar reference sections ke liye (client, usi din)

Reference: **Popular sightseeing** · **Trending activities** (`.tt`) · **Popular cruises & ferries** (`.cr`) · **Andaman's
trusted travel company since 2009** (`.cat`). Pehle jaanch (code nahi): pehle teen **packages nahi** hain — CMS me
unki koi list nahi; category strip Package Type se aadha judta hai. Teen raaste dikhaye (section me likho / master
list / content type). Client: _"static block for all"_ — **section me hi cards**. Dhaancha pehle dikhaya, phir haan.

- Section `offerCards`: `background · heading · description · headingAlign (left) · link · cardStyle
  (imageTop|imageBackground) · shape (photo 3:2|wide 16:9|square|landscape 4:3) · layout (slider|grid) · columns
  2–6 · items[] ≤24`
- Card: `imageId · badge · badgeColor · title · subtitle · chips[] ≤3 · price · oldPrice · priceNote · rating
  (0–5, khaali = null) · url`. **Jo khaana khaali, card pe nahi** — isi se ek card charon look deta hai
- **Daam text hai** (`₹3,950`, `On request`) — discount apne aap nahi, ₹ khud likhna. Client ke saamne rakha gaya
- **24 card ki chhat** — client ne poochha _"24 kyun"_; wajah batayi (admin ka lamba panel, page ka bojh, galti se
  hazaaron card), reference me 6–8 hain; client ne 24 rakha
- `priceNote` image-top card pe daam ke **baad** (`₹3,950 /cab`), background card pe **pehle** (`from ₹22,540`)
- Slider CSS scroll hai (reference ki `.rail`, koi JS nahi): desktop pe `columns` poore, tablet pe 2.4, phone pe 1.3
  (agla card jhaankta hai). Badge ka rang `lib/badge.js`
- Admin: background card chunne pe badge/chips/old price/rating ke khaane chhup jaate hain (wo us look me hain hi nahi)
- ⚠️ Static ki keemat: ek hi activity do section me ho to do baar likhni padegi — master list wala raasta (B) client ko
  dikhaya gaya tha

2 naye API test. Koi migration nahi.

**§24 amendment (client, usi din):** home ka eyebrow reference me **chip** hai — `.hero__eyebrow`: halka
background (`rgb(255 255 255 / 10%)`), patli border, gol kone, weight 700, **na uppercase na
letter-spacing**, aur star ka rang text jaisa (sunehra nahi). Pehle wahi `.vhero__eye` laga diya tha jo
tour/blog pe hai, aur client ne turant pakda — _"design home reference se match nahi kar raha"_. Class wahi
rahi (client ne naam se maanga tha); badlaav sirf `.hf-hero__copy` ke andar, taaki tour aur blog ke hero
jaise the waise rahein. ⚠️ **Sabak wahi purana** — naam maangne ka matlab look maangna nahi hota; reference
ka wo section khol kar dekh lena tha.

**§21 amendment (client, 16 Sep):** is section ka admin me naam **Package cards** hai, "Offer cards" nahi.
⚠️ Badla sirf **label** (`BLOCK_LABEL` aur band panel ki summary) — block ka `type` `offerCards` hi rahega,
kyunki wo DB me stored data hai (R6). Purani docs me purana naam mile to wo us waqt ka sach hai.

### 26. Tour page pe `Read more:` — nishaan se collapse (client, 16 Sep)

Client: pehle section (`Andaman tour packages for 2026`) lamba ho jaata hai, to uska aage ka hissa chhupe
aur **Read more / Read less** se khule.

**Pehla khayal shabd ginne ka tha, aur wo client ne khud chhod diya.** Maine do cheezein rakhi thin —
ginti se kaatne pe HTML ke tag beech me toot-te hain, aur client ko dikhta hi nahi ki page pe kahan se
kategga. Uske baad client ka apna sujhav aaya, aur wo is repo ka **pehle se chalta hua** pattern nikla:

> _"user put a read more text in editor … jahan read more add kiya wahan se collapse automatically"_

Yaani wahi ghar jahan `Note:` · `Warning:` · `Quote:` · `Caption:` rehte hain (D-92 §10): **nishaan content
me, dhaancha theme me**. Isliye is kaam me **na koi naya field bana, na checkbox, na settings** — sirf
`readMoreSplit()` (`apps/web/lib/article-html.js`, 4 naye test).

| Editor me | Page pe |
| --- | --- |
| `Read more:` | uske aage ka sab `<details>` me, link ka text **Read more** |
| `Read more: Poori jaankari` | wahi, par link **Poori jaankari** |

- **`<details>`, koi JS nahi** — wahi faisla jo FAQ pe hai (D-59). SSR pe theek, hydration ka sawaal hi nahi
- Label band pe client ka, khule pe hamesha **Read less** (`.rdm__m` / `.rdm__l`, CSS se badalta hai)
- Pehla nishaan hi chalta hai; baad wale hat jaate hain (warna wo page pe literally chhap jaate), aur
  nishaan ke aage kuch na ho to wo bhi bas hat jaata hai (D-30)
- ⚠️ **Sirf `wrapTables` wale raaste pe** — Tour aur Package page ke Text block. Blog/Page ka article
  `articleHtml()` se jaata hai aur wahan ye nishaan abhi kuch nahi karta (client: _"only in tour page"_).
  Chahiye ho to ek line ka kaam hai
- ⚠️ Admin ke editor me client ko wahi `Read more:` wali line dikhegi, dabba nahi — wahi **A-23**, aur wahi
  jaan-boojh kar: content saaf rehta hai aur nishaan hata dene se page apne aap purana ho jaata hai

### 27. Home ka island map — static, custom editor se (client, 16 Sep)

Reference ka `INTERACTIVE ISLAND MAP`. Client ka faisla saaf tha:

> _"since it's a static section we can use it as it is and paste in custom editor as html — you can write
> css in backend here, not in custom css because it's not gonna change"_

Yaani **content custom editor me, CSS theme me**. Ye batwara theek hai aur ab is project ka niyam bhi:
Custom CSS wo hai jo client badalta rahega; ye dhaancha tay hai, isliye wo `globals.css` me hai —
poora `.home-island-map` ke **andar** (wahi class client ne block pe di), taaki `.hot`/`.pin`/`.icount`
jaise aam naam poore site pe na phailein.

⚠️ **Do sanitizer badlaav karne pade, aur dono bina inke chup-chaap kaat-te the:**

| Kya girta tha | Nateeja |
| --- | --- |
| SVG ka `<text>` / `<tspan>` | map pe **har island ka naam gayab** — sirf rangeen gol bachte |
| `<g>` pe `stroke-width` · `opacity` | samundar ki halki contour lines gehri aur mota ho jaati |

Dono tag/attribute **nirjeev** hain (sirf text aur look), isliye allow karne se koi naya raasta nahi khula.
`<script>`, `data-*`, `tabindex` ab bhi girte hain — aur wahi wajah hai ki ye section **static** hai:
reference me island pe click karne wala kaam poora ek `<script>` se chalta hai.

- Paste karne wala HTML repo me hai — [`docs/snippets/home-island-map.html`](../snippets/home-island-map.html)
- Panel ek hi island dikhata hai (reference ka default, Havelock); pins hover pe ubharte hain
- Pills `<button>` nahi, `<a>` hain — `button` sanitizer me hai hi nahi (aur bina JS wo karta bhi kya)
- 1 naya API test. Koi migration nahi

⚠️ Asli interactivity (click se panel badle) chahiye ho to wo custom editor se ban hi nahi sakti — uske liye
apna section banega, jisme islands ki list admin me hogi.

### 28. Home pe mobile ki patti — CTA popup nahi, link (client, 16 Sep)

Client: _"mobile par form abhi jaisa hai same rahega, mobar bhi bana do; Get free quote ko contact page se
link kar denge, popup nahi chahiye"_.

- `settings.quoteUrl` (+ `Settings ▸ General ▸ Get quote link`) — khaali to wo button aata hi nahi (D-30)
- `MobileBar` me naya `quoteUrl` — **doosra component nahi banaya**; wahi jodi jo `EnquiryForm` ke
  `variant` pe hai (D-87 §11). `hasForm` ho to purana popup wala button, warna link
- `HomePage` ab `settings` leta hai (catch-all se), aur patti `<main>` ke **bahar** hai

⚠️ **Popup home pe jaan-boojh kar nahi** — home ka form hero me pehle se khula baitha hai; ek hi page pe do
form ek doosre ko kaat-te.

⚠️ **Ek purani chhoot yahin pakdi:** 760px se neeche `body { padding-bottom: 70px }` **har page** pe lagta
hai (wo patti ke liye hai). Yaani home pe wo jagah mahino se khaali chhod di ja rahi thi aur patti thi hi
nahi — patti chhoot gayi thi, hatayi nahi gayi thi.

1 naya API test (DB + public payload). Koi migration nahi.

### 29. Custom editor ke HTML me tabs — island map sach me chalta hai (client, 16 Sep)

Client ne §27 wala static version dekh kar saaf kiya ki pills page pe nahi jaatin: _"only cards switch
honge aur map ke hot points update honge … dusre page par jane ke liye to View packages button hai"_.
Aur uska sawaal bhi bilkul theek tha:

> _"demo me to only HTML, CSS aur JS hai, to usme kaise perfectly work kar raha hai? same logic ke saath
> class bhi add hai block me, use hi implement kar do — simple"_

**Naya block nahi banaya** (client: _"new block nahi banana hai"_). Jo batwara CSS pe tay hua tha, wahi JS
pe laga diya: **content custom editor me, behaviour theme me.**

| Class | Kaam |
| --- | --- |
| `sw-tab i-<key>` | dabane wali cheez — pill ya map ka pin |
| `sw-panel i-<key>` | uska card — ek waqt me ek |
| `is-on` | JS lagata hai, CSS use padhti hai |

- `apps/web/lib/html-switch.js` — `switchKey()` (pure, 3 test)
- `apps/web/components/home/HtmlSwitcher.jsx` — ek listener root pe (delegation), `role`/`tabindex` JS lagata
  hai (wo sanitizer se guzarte hi nahi), aur Enter/Space bhi chalte hain
- `CustomHtml` use **sirf tab** render karta hai jab HTML me `sw-tab` ho — warna har saada block bekaar me
  client component ban jaata
- Snippet ab poora hai: 10 island ke card reference ke apne data se (`.claude/docs/snippets/home-island-map.html`)

⚠️ **Key `class` se aati hai, `data-i` se nahi** — reference `data-i="havelock"` padhta hai par sanitizer
`data-*` girata hai (D-80 ka allowlist). Yahi ek badlaav reference se liya gaya.

⚠️ **Mount se pehle pehla card dikhta hai** (`.sw-panel:first-of-type`), aur mount hote hi `sw-ready` lag kar
wo kaam JS le leta hai. Bina iske pehla paint khaali jaata — aur SSR ka HTML bhi khaali, jo crawler ke liye
"yahan kuch hai hi nahi" jaisa hota.

⚠️ **Is file me kisi island ka naam nahi hai** — `home-island-map` bhi nahi. Behaviour dhaanche pe chalta hai,
naam pe nahi, isliye kal koi bhi tabs wala dabba custom editor me banaya ja sakta hai (multi-site niyam).

**§29 amendment (client, usi din):** paste karte hi **saare das card ek saath dikhe**. Do galtiyaan thin,
dono CSS ki:

1. **`:first-of-type` wahan chalta hi nahi tha** — wo "apne **tag** ka pehla bhai" poochhta hai, class ka
   nahi, aur `.imap` ke andar pehla `div` map ka dabba (`.imap__c`) hai. Yaani ek bhi panel us niyam me
   aata hi nahi tha. Ab `.sw-panel ~ .sw-panel` hai — seedha wahi sawaal: _"jiske pehle koi aur panel ho"_
2. **`.home-island-map .ipanel` (do class) `.sw-panel` (ek class) se bhaari tha**, isliye `display: none`
   haar jaata tha. Ab chhupane wale niyam bhi usi scope me hain (`.home-island-map … .ipanel.sw-panel`)

⚠️ **Dono ka lakshan ek hi tha, aur wo JS ki galti jaisa dikhta tha** — jabki JS bilkul theek chal raha tha.
Yahi D-91 wali `.wdg__b ul` ki shakl hai: niyam sahi likha hua tha, par doosra niyam usse bada tha.

⚠️ Ab **JS na chale tab bhi** ek hi card dikhta hai (pehla). Pehle wo soorat "sab kuch dikh gaya" wali thi —
aur wahi client ko dikha, kyunki pehle paint pe `sw-ready` lagi hi nahi hoti.

### 30. `Enquiry form` ab page ke content me bhi — contact page ki neev (client, 16 Sep)

Contact page ka reference (`contact-us.html`) dekh kar saaf hua ki uska sabse bada hissa (_"Send us your
dates"_) **main column ka form** hai — aur form ab tak sirf teen jagah lag sakta tha: package/tour ka sidebar
widget, aur home ka hero. Yaani wo page banaya hi nahi ja sakta tha.

**Baaki poora page pehle se bana hua hai** — banner (`.vhero`), main + sidebar (`.pgl`), closing CTA, mobile
patti: sab `page` type me (D-95). Isliye contact page ek **normal Page entry** hogi, naya content type nahi.

- Block `enquiryForm`: `formId` · `heading` · `description` — wahi shape jo sidebar widget aur hero ki hai,
  taaki form server pe **ek hi raaste** se resolve ho (`getPublicFormById()`)
- `page` ka dropdown ab `Text · FAQs · Custom editor · Enquiry form`
- Theme: `EnquiryForm` ka naya `variant="page"` — **koi card nahi**, kyunki wo khud `.blk` ke andar hai.
  Dock/sheet bhi nahi (wahi wajah jo `hero` pe hai: form pehle se khula baitha hai)
- `Blocks` ab `path` leta hai — uske bina enquiry ki detail screen pe "kis page se aayi" khaali rehta (D-90)

**Client ke chaar faisle** (poochhe gaye, 16 Sep):

| Sawaal | Jawab |
| --- | --- |
| Form block kahan | **sirf Pages** — _"home par already hai aur tour page par need nahi"_ |
| Steps / offices / office hours | **Custom editor** se |
| `Info cards` / `Two column` bhi kholein? | **nahi** — _"un me to design alag hai"_ (unka look home/tour ka hai) |
| Google map | **iframe chalega** (sanitizer me `iframe` sirf `https` pe pehle se allowed) |

⚠️ **Fields, button ka text aur neeche ki line block me nahi hain** — wo form ki apni settings hain. Har
field pe `full`/`half` width pehle se maujood hai, isliye reference ka do-column layout bina kisi naye kaam
ke ban jaata hai. Ek hi cheez ke do malik banana wahi jaal hota jo D-86 me slug pe laga tha.

2 naye API test. Koi migration nahi.

**§30 amendment — contact page ke baaki hisse (client, usi din):** steps · offices + map · office hours ·
sidebar ka Quick contact — chaaron **Custom editor** se (client ka faisla), CSS **theme me** (wahi batwara
jo island map pe tay hua, §27). Paste karne wale HTML `docs/snippets/contact-*.html` me hain, aur unka text
reference ka apna hai.

⚠️ **Do cheezein sanitizer pe chalate waqt hi pakdi gayin, dono chup thin:**

| Kya | Lakshan |
| --- | --- |
| `<address>` allowlist me tha hi nahi | pata **text ban kar** bach jaata, uski CSS lagti hi nahi |
| bina class ke `<span>` | `unwrapBareSpans` (D-89) use khol deta hai — text bachta hai, styling nahi |

Pehla theek kiya (`address` ab allowed — tag nirjeev hai), doosre ke liye **snippets me har span pe class**
hai. Naam se farak nahi padta; CSS `span` pe hai, class sirf use zinda rakhne ke liye chahiye.

⚠️ **Yahi wajah hai ki snippet "likh kar de dena" kaafi nahi tha** — teenon file sanitizer se chala kar
milaayi gayi (`sanitizeContent()` → diff). Bina us jaanch ke client ke page pe aadha design chup-chaap gir
jaata, aur wo "CSS kaam nahi kar rahi" jaisa dikhta.

Classes (client block ke panel me likhta hai): `contact-methods` · `contact-steps` · `contact-offices` ·
`contact-hours`, aur sidebar ke Custom HTML widget me `contact-quick`.
Map Google ka embed hai (`iframe`, `loading="lazy"`) — sanitizer me `iframe` sirf `https` pe pehle se allowed.

### 31. `Section Layout` — contact jaise page ka apna template (client, 16 Sep)

Contact page banate waqt asli dikkat frame ki nikli: `page` ka poora content **ek safed card** me baithta
hai (`.art--page`, D-95 — `page-template-text.html` ka design), jabki `contact-us.html` me **har section apna
card** hai. Client ne raasta khud chuna:

> _"jo page template pehle se bani hui hai usko change nahi karenge, pages ke sidebar me ek Section Layout
> naam ki template aur add kar denge"_

**Teen raaste rakhe gaye the** — (A) page pe layout ka chunav, (B) naya type, (C) sab kuch Custom editor me.
Client ne **B** chuna, aur uski do keematein batakar hi: `type` badalna allowed nahi (bana hua page doosre
template me nahi ja sakta — client: _"me dobara page bana dunga"_), aur aage har page wali cheez do jagah
sochni padegi.

| | `page` | `sectionPage` |
| --- | --- | --- |
| Frame | poora content ek card me | **har block apna card**, `.secpg` wrapper |
| Blocks | Text · FAQs (saada) · Custom editor | Text · FAQs (**accordion**) · Custom editor · **Enquiry form** |
| Hero | Stat rail · Hero button · WhatsApp | **teenon nahi** |
| Pages settings | banner fallback + On this page | **sirf banner fallback** (client: _"on this page list nahi"_) |
| Bulk Upload | chalta hai | **chhoota hi nahi** — re-import se blocks udne ka khatra yahan hai hi nahi |
| URL | `/{slug}`, nested | wahi |

- **Screens dobara nahi likhi** — `PageList` aur `PageEdit` dono `type` se chalte hain (`TYPE_CONFIG` me ek
  row). Wahi saancha jo 8 Sep ko bach gaya tha
- Theme me bhi **ek hi component** — `TextPage` ka naya `sections` prop: wrapper badalta hai, baaki (hero,
  breadcrumb, sidebar, byline) waisa ka waisa. Alag component banane ka matlab hota us sab ka doosra copy
- `.secpg` ki CSS me **sirf gap** hai — card ka look `.blk` ka apna hai; gap isliye ki Tour page pe blocks
  seedha `.pgl__main` (grid) ke bachche hote hain aur yahan beech me ek wrapper hai

⚠️ **URL dono ka `/{slug}` hai aur takrav nahi hota** — uniqueness `entries.path` pe hai, type pe nahi.
Yahi `tourPage` pe pehle se chal raha hai.

⚠️ **Deploy pe `pnpm seed` chahiye** (naya content type wahin banta hai) aur API restart. Koi migration nahi.

2 naye API test (payload + field set, aur `page` chhua nahi gaya — wo test hi is faisle ka pehra hai).

**§31 ka sudhaar (client, usi din) — naya type nahi, `Template` ka dropdown.** Pehla roop galat tha: maine
_"pages ke sidebar me template add kar denge"_ ko **admin ke left menu** ka sidebar samajh kar `sectionPage`
naam ka poora content type bana diya (apni list, apna Add New). Client ne turant pakda — _"did I ask you to
add submenu under the pages? I asked in Add New Page sidebar choose template dropdown"_ — yaani **edit
screen ke sidebar** (`Page settings` panel) me ek dropdown.

Ab wahi hai, aur wo har tarah se behtar bhi nikla:

| | Type wala roop (hataya) | `fields.template` (ab) |
| --- | --- | --- |
| Admin | do list, do Add New | **ek hi list** |
| Baad me badalna | ho hi nahi sakta (`type` immutable) | **dropdown se, kabhi bhi** |
| Purane page | — | apne aap `default`, koi migration nahi |
| Bulk Upload | alag type chhoota hi nahi | `fields` re-import pe **bach jaate hain** (`prepare`) |

- `PAGE_FIELDS` me naya `template` (`default` | `sections`), parse `normalizeFields()` me — anjaan value 4xx
- `PAGE_DEFAULT_BLOCK_TYPES` (Text · FAQs · Custom editor) aur `SECTION_PAGE_BLOCK_TYPES` (+ **Enquiry form**)
- Admin: `Page settings ▸ Template`; dropdown badalte hi `Add block` ki list aur hero ke do panel (Stat rail ·
  Hero button) bhi badal jaate hain
- Payload: `sections` pe `toc` khaali aur `heroButton` `null` — **server pe**, taaki theme me wahi shart
  dobara na likhni pade (D-95 wala sabak)
- Theme: `TextPage` me ek hi jagah — `fields.template === 'sections'`

⚠️ **`Enquiry form` ab `default` template pe nahi hai** — client ne yahi poochha tha (_"why there is still
enquiry form in page template"_). Wo 16 Sep subah juda tha, jab plan tha ki contact ek normal Page banegi.

4 API test — unme se ek ye pehra bhi hai ki **`sectionPage` naam ka koi type bana hi na rahe**.

**§30 ka doosra daur — client ne page chala kar chaar cheezein batayi (16 Sep):**

| Kya | Asli wajah |
| --- | --- |
| `contact-steps` aur `contact-hours` me background nahi | `.chb--box` ka `background: var(--chb-bg, transparent)` `.blk` ke safed card ko **dhak** raha tha. **Client ne khud theek kiya** (`var(--surface)`) |
| `contact-methods` ke card ka border aadha | `.blk` ka `content-visibility: auto` (D-85) paint **contain** karta hai, aur client ne us block ki padding 0 ki thi — card bilkul kinare pe the (hover pe 2px upar bhi uthte hain). Ab us block pe containment band |
| `contact-steps` ka design Tour ke Booking & cancellation jaisa | **Bilkul wahi tha** — `.steps` `globals.css` me pehle se hai (D-59), aur maine uski **doosri copy likh di thi**. Copy hata di; ab dono ek hi jagah se |
| Form poori chaudai ke button ke saath, aur uska card hi nahi | Reference me do card hain — bahar `.blk` (heading + line) aur andar `.cform` (sirf fields + button, halki shadow), aur `.formnote` **andar wale ke bahar**. Ab wahi: `<form>` khud card hai, footnote uske bahar, button apni naap ka |

⚠️ **Do galtiyaan meri ek hi kism ki thin** — jo cheez repo me pehle se thi (`.steps`, aur `.blk` ka card),
maine uske upar apni parat likh di. Isi wajah se `.contact-steps` ka `.steps` hata dena "kaam" tha, jodna
nahi.

⚠️ **Client ke do CSS edit `globals.css` me hain aur wo waise hi rakhe gaye hain** (`.chb--box` ka background,
aur `.contact-methods` ka `background/border/padding`) — memory ka niyam: client ke hand-tune palatne nahi.

**§30 — contact ka sidebar (client, 16 Sep):** `At a glance` aur `Registered & enlisted` — dono
**Custom HTML** widget, snippets `docs/snippets/contact-glance-sidebar.html` aur
`contact-registered-sidebar.html`.

- `At a glance` (`.qfacts`) aur social ke gol button (`.socials`) ki CSS theme me, `.wdg__b` ke **andar**
- `Registered & enlisted` ki list ke liye **kuch likhna hi nahi pada** — `.wdgl` (aur uska class-mukt saathi
  `.wdg__b ul`) D-89 §6 se maujood hai. A-19 wali soch ka seedha faayda: look class ke bharose nahi tha

⚠️ **`aria-label` sanitizer me allowed kiya** — icon-only link (`<a aria-label="Instagram"><svg/></a>`) se
wo attribute gir raha tha, aur us link ka screen reader ke liye **koi naam bachta hi nahi**. Ye galti
aankhon se dikhti hi nahi. Attribute nirjeev hai (sirf naam batata hai), isliye allow karne se koi naya
raasta nahi khulta. 1 naya test: `aria-label` bache, `onclick` phir bhi gire.

### 32. Site ka apna 404 (client, 16 Sep)

Client: _"abhi theek hai, par accha nahi lag raha"_. Wajah ye thi ki **hamara 404 tha hi nahi** — Next ka
apna default aata tha (system font me `404 | This page could not be found.`), aur uske upar-neeche hamara
header aur footer. Yaani visitor ko site ke beech me ek anjaan page milta tha.

`apps/web/app/not-found.jsx` — bada halka `404`, ek heading, do line, aur teen tak button.

⚠️ **Har link settings se, ek bhi hardcoded nahi** — `/` (wo har site pe hota hai), `settings.quoteUrl`
(Get quote link) aur `settings.whatsapp`. Jo na ho uska button banta hi nahi (D-30). `/packages` ya
`/contact` jaisa raasta likhna R3 ka ulta hota: routing ka ekmatra source `entries.path` hai, aur har
client ke page alag hote hain.

⚠️ **Koi naya rang ya naap nahi** — design ki koi reference file 404 ke liye hai hi nahi, isliye page poori
tarah site ke apne tokens pe khada hai (wahi halka neela section, wahi buttons). Naya kuch gadhne ka matlab
hota ek aisa page jo kal customizer (A-30) ke saath badle hi na.

⚠️ Dev me iska HTML stream hota hai, isliye `curl` ko sirf shell dikhta hai — markup RSC payload me hai.
Aankh se dekhna baaki (A-28 ki list me).

### 33. Code me bacha hua site ka naam — breadcrumb (client, 16 Sep)

Client ka sawaal seedha tha: _"kya koi Andaman-specific data hai jo doosri site ka content daalne par bhi
Andaman ka naam dega, **even in code**?"_ Poore `apps/` pe grep kiya (comments aur test chhod kar), aur jo
mila wo yahan likha hai. **Do jagah asli thi:**

| # | Kahan | Kya chhapta tha |
| --- | --- | --- |
| 1 | `PackagePage.jsx` ka `ARCHIVE_CRUMB` | har package page ke breadcrumb me `Andaman Tour Packages` aur link `/andaman-tour-packages/` |
| 2 | `Pricing.jsx` ka `CATEGORY_COPY` | chaar tab ke naam (`Base`·`Sea-facing`·`Beachfront`·`Villas`) **aur** unke teen-teen line ke description, jinme Havelock · Neil · Port Blair · Marine Hill · Sitapur likhe hain |

**Is section me #1 theek hua** (client: _"#1 karo"_):

- ~~`packageDefaults.archiveCrumb` (`label` + `url`), admin me **Packages ▸ Section Headings** ke neeche do khaane~~
  — **Superseded by D-97 §6 (17 Sep):** ab `breadcrumbPageId`, Tour page ka dropdown, **Itinerary Settings** me
- Payload: **dono bhare hon tabhi** crumb jaata hai, warna `null` — aadhi shart theme me nahi likhni padti (D-30)
- Theme: khaali pe breadcrumb `Home › Package` reh jaata hai. Naye instance pe yahi sahi hai — _"ek crumb jo
  404 pe le jaaye, usse na hona behtar"_ (1 Sep ka wahi tark, ab data se)
- ⚠️ `updatePackageDefaults()` ki **whitelist me bhi jodna pada** — wo jaal chaar baar lag chuka hai, isliye
  test **DB padhta hai, response nahi**

⚠️ **#2 abhi bacha hua hai** aur wo bada hai: wo sirf naam nahi, poore vaakya hain jo har package page pe
chhapte hain. Ye wahi `TAB_NOTE` wala kaanta hai jo **Q-9** me "sabse tez" likha gaya tha — par wahan sirf
tab ke naam likhe the, jabki asal me description bhi wahin hain.

**Chhota hissa — admin ke placeholder** (`Plan your Andaman trip`, `Operating from Port Blair`,
`Radhanagar Beach`, `e.g. 6N Blissful Andaman`, `Andaman Tourism team`, `tel:+919810066496`…). Ye **save
nahi hote** aur page pe kabhi nahi jaate, par doosre client ke admin me udaharan galat site ke dikhenge.

✅ **Jo saaf nikla:** seed (naya instance `My Site` naam se banta hai), `package-sections.js` ke saare default
heading (generic: `About this itinerary`, `Hotels on this package`), 404, header, footer, mobile patti, aur
home ke saare section.

## D-97

**301 Redirects aur package ka breadcrumb — dono admin se (client, 17 Sep)**

**Status:** ✅ Dono ban gaye. Koi migration nahi.
**Shuruaat:** client ne `/packages/` khola to 404 aaya (package ka URL `/packages/{slug}` hai, par
`/packages` pe koi page nahi). Saath me poochha ki `Section Headings` ke **har tab** me Breadcrumb label/link
kyun hai.

### Client ke faisle

| # | Faisla |
| --- | --- |
| 1 | Package ka URL **wahi rahega** — `/packages/andaman-honeymoon-bliss`. Nested (`/andaman-tour-packages/…`, reference jaisa) **nahi** |
| 2 | `/packages/` jaise URL ke liye WordPress ke Redirection plugin jaisa screen — **Settings ▸ 301 Redirects** (naam client ka) |
| 3 | Breadcrumb ka beech wala kadam **Packages ▸ Itinerary Settings** me |
| 4 | Wahan **dropdown**, aur usme **sirf Tour pages** (client: _"dropdown agar best hai to ise karo"_) |
| — | `To` me bahar ka link — client ne samjhne ke liye poochha, faisla nahi diya; suggestion (dono, sirf `https://`) pe bana |
| 5 | **Temporary (302) ka chunav nahi** — _"make it simple no extra things"_ (usi din, screen dekh kar). Form me sirf From + To, har redirect `301`; `statusCode` bhejna 400 |

### 1. Kya pehle se tha

`redirects` collection (D-49): `from` · `to` · `statusCode` · `hits` · `isAuto`, public resolve me redirect ki
jaanch, web pe `permanentRedirect()`/`redirect()`, permissions `redirect.*`, aur API me list + delete. Kami
sirf **create/update** aur **screen** ki thi.

### 2. `from` aur `to` ke niyam

- **`from`** — hamesha isi site ka path. `pathSchema` (lowercase slug) **nahi** lagta: redirect ka sabse bada
  kaam purane site ke URL hain (`/Old_Tour.html`). Store se pehle trailing slash hata aur **lowercase** —
  `findRedirect()` lookup se pehle bhi yahi karta hai, taaki `/Packages/` bhi match ho. `?`/`#`/space mana,
  aur **`/` mana** (home redirect = poori site ka pehla page gayab)
- **`to`** — site ka path **ya** `https://` link. `javascript:`/`data:`/`http:`/`//host` sab 400. Path pe
  query/hash allowed (`/contact?from=brochure`)

### 3. Resolve ka kram palta — **page pehle, redirect baad me**

D-49 se resolve redirect ko page se **pehle** dekhta tha. Sirf auto-redirect hote hue ye theek tha (unka `from`
kabhi live page nahi hota — loop guard mita deta hai). Haath ke redirect ke saath nahi: `/offers` redirect
banao, phir `/offers` naam ka page — page **kabhi dikhta hi nahi**, koi error nahi. Ab redirect sirf tab dekha
jaata hai jab us path pe dikhne wala page **nahi** hai. Draft page redirect ko nahi rokta.

Saath me create/update pe rok (D-86 wala sabak — "kuch na hona" sabse mehnga):

| Rok | Message |
| --- | --- |
| `from` pe koi page hai (draft bhi) | `"Offers" lives at /offers. Change that page's URL first…` |
| `from` pe pehle se redirect | `/a already redirects to /b. Edit that one instead.` |
| `from` = `to` | `From and To are the same page.` |
| `/a → /b` hai aur `/b → /a` banao | `…would loop forever.` |
| `to` (ya chain ka aakhri `to`) Trash/draft page pe | `"X" at /x is in the Trash — visitors would see a 404…` (client, 17 Sep: _"rokna hai"_) |
| `to` (ya chain ka aakhri `to`) pe **kuch hai hi nahi** | `Nothing lives at /x — visitors would see a 404…` (client, 17 Sep — `/blogss` → package ka `/packages/` ke bina likha URL save ho gaya tha) |

Chain dono taraf flatten hoti hai — `to` khud redirect ho to seedha uske aakhri `to` pe, aur jo redirects
`from` pe aa rahe the wo naye `to` pe. `to` pe live page ho to us path ka purana redirect follow **nahi** hota
(resolve wahan page dikhata hai).

**Trash ke saath (client ne poochha, 17 Sep):** trash karne se redirect nahi banta · trash page ke URL **se** redirect
ban sakta hai · restore pe page jeet-ta hai · Trash se permanent delete us URL ki taraf jaane wale **saare** redirects
(manual bhi) hata deta hai — client: _"jaisa hai waisa rehne do"_.

### 4. Auto aur manual

- Auto-redirect (slug badalne pe) **admin ke banaye ko kabhi overwrite nahi karta** — `recordAutoRedirect()`
  pehle manual dhoondhta hai
- Auto wale bhi list me dikhte hain (`Automatic` badge). **Edit karte hi wo manual** (`isAuto: false`)
- List ka `isAuto` filter `z.coerce.boolean()` pe tha — `"false"` bhi `true` banta. Ab `enum`. Wahi bug jo
  20 Aug ko `COOKIE_SECURE` pe mila tha

### 5. Jo jaan-boojh kar nahi bana, aur cache

- **Regex/wildcard** — non-technical client ke haath me ek galat pattern poori site redirect kar deta hai
- **`hits` ki ginti** — resolve ISR ke peeche hai (ginti jhoothi) aur GET me likhna R13 todta. Field waisa hi
- **Cache:** create/update/delete pe `path:<from>` saaf hota hai (update pe purana `from` bhi, aur chain me
  badle hue redirects ke `from` bhi). ⚠️ Browser ka `/Packages` (bada akshar) apne `path:/Packages` tag pe
  cache hota hai, wo ek ghante me hi badlega — lowercase URL turant

### 6. Breadcrumb — label + link ki jagah Tour page

D-96 §33 ne `packageDefaults.archiveCrumb { label, url }` banaya tha, `Section Headings` ke neeche. Wo panel
tabs ke **bahar** tha, isliye har tab pe dikhta tha — jaise har section ka apna breadcrumb ho. Aur haath ka link
Tour page se juda nahi tha.

- Ab **`packageDefaults.breadcrumbPageId`** — `Packages ▸ Itinerary Settings ▸ Breadcrumb ▸ Packages listing
  page`, dropdown me sirf Tour pages (draft bhi, `(draft — not shown)` ke saath)
- Payload ki shakl **wahi** `archiveCrumb: { label, url }` — label Tour page ka **Title** (D-90 ke baad Title
  hi breadcrumb ka naam hai), url uska **path**. Theme ko kuch nahi badalna pada
- Page draft/trash/delete = `null` → `Home › Package` (D-30)
- Write pe jaanch: id sach me Tour page ho, warna 422 (bekaar id chup-chaap save hoti to breadcrumb gayab)
- ⚠️ Whitelist (`updatePackageDefaults()`) me joda, aur test **DB padhta hai**
- **Cache:** web ka `/public/package-defaults` fetch ab `type:package` **aur `type:tourPage`** pe tag hai —
  Tour page ka title/slug badle to breadcrumb turant badle
- `archiveCrumb` 17 Sep ko asli DB me **khaali** tha, isliye migration nahi. Field model/schema se hata

### Tests

`redirects.test.js` naya (16, asli DB) · `master-lists.test.js` ka archiveCrumb test ab breadcrumbPageId pe.

## D-98

**Theme admin se — Settings ▸ Fonts · Colours · Layout (client, 17 Sep)**

**Status:** ✅ Teeno ban gaye (API + admin + site). Koi migration nahi. **Render client ne abhi nahi dekha.**
**Reference:** `.claude/docs/reference/admin-design-v4.html` — v3 + teen naye Settings tab. Base client ki
`travel-cms-admin_v2.html` (Fonts + Colours), badlaav client ke saath tay hue (neeche).

### Client ka lakshya

_"CMS multiple site ke liye hai — another site data aaye to admin se sab manage ho, code likhne na aana pade."_
Aam look Settings se; khaas cheezein developer Custom CSS / Custom editor se.

### Faisle

| # | Faisla |
| --- | --- |
| 1 | Size: **9 step** (H1–H6 · Body · Small · Extra small), har ek pe Desktop/Tablet/Mobile + weight + line + character spacing |
| 2 | Rang: **6** (Store Colour · Accent · Headings · Body text · Page background · Dark sections) + **Advanced** (sab Auto) |
| 3 | Label **"Store Colour"** (client), code me `primary` |
| 4 | **Layout** tab naya: width, side space, corners, shadow, button, header height + logo height/max width, footer logo + white box, sticky |
| 5 | Logo ki sirf **height** — width apne aap; max width sirf chaude logo ki rok |
| 6 | Tinted page background admin me **nahi** (client: _"page background to same hi rahega"_) |

### 1. Pehle hardcoded → token (look nahi badla)

`globals.css` me 273 seedhi values token pe aayin (128 hex, ~50 rgba → `color-mix(…transparent)`, 8 size,
51 weight, radius, header/logo/button). Script ne har badli line ka resolved value purane se milaya — **0 farak**.
`@font-face` ke andar `var()` nahi chalta — wahan `400` hi raha. `StickySide.jsx` ka `TOP = 78` ab CSS se padha jaata hai.

### 2. ⚠️ Niyam: jo nahi badla, wo site pe bheja hi nahi jaata

`packages/shared/src/theme-{colors,layout,fonts}.js` — defaults **aaj ke `globals.css` ke values** hain.
Kisi group ka value default ke barabar ho to uska CSS emit nahi hota. Isliye:

- is site pe pehli baar Save = **koi farak nahi** (formula se bane shade CSS ke hand-tuned shade se thode alag hain)
- client jo badalta hai, sirf wahi (aur uske auto shade) site pe jaata hai
- teeno ke tests `globals.css` padh kar defaults milate hain — CSS badlo to defaults bhi

Site pe: public settings me `themeCss` (server pe bana) → `layout.jsx` ka `<style>` **Custom CSS se pehle**.
Selector `html:root` (`:root` se zyada specific), tablet/mobile ke `@media` blocks alag.

### 3. Colours

- Store Colour group: `--blue-50/100/500/600/700`, `--accent`, dark pe halke neele, widget icon
- Accent: orange shades, dark pe halka orange; button text naye rang pe padhne layak (`readableOn`)
- Body/Page: muted, faint, line, slate — page badle to body ke shade bhi dobara
- Dark: `--blue-900`, shade/scrim/overlay, `--on-dark` (halka dark ho to text gehra)
- Advanced → naye token: `--btn-p-*` (`.btn--accent`, `.mobar__cta`), `--btn-s-*` (`.btn--primary`), `--btn-o`,
  `--header-bg/text` (`.hdr`, `.nav__l`), `--footer-bg/text` (`.ft` — footer ke andar `--on-dark` isi se),
  `--card` (12 card selector), `--gold`/`--green-600`/`--red-500`, per-heading `--h1-c…`

### 4. Layout

- Kone: `sharp` / `soft` (aaj) / `round` → `--r1..r4`. Sharp me `--r2: 2px`, taaki `calc(var(--r2) - 2px)` negative na ho
- Width ki hadd **1200–1600** — 1100 pe is site ka header menu Awards aur Get quote ke neeche dab gaya (render se dekha)
- Side space: desktop, mobile (≤760), tablet dono ke beech
- Logo height header − 16 se zyada nahi (server pe bhi); desktop header badla to mobile ki apni value bhi likhi jaati hai
- Sticky band: `--header-pos: relative`, sidebar `--sticky-top` aur `scroll-padding` header ke bina

### 5. Fonts

- **Google font save pe server download karta hai** (`apps/api/src/modules/settings/fonts.js`) → `/uploads/sites/<site>/fonts/google/<slug>/<hash>.woff2`.
  Visitor Google se kuch nahi maangta (D-85). Sirf `latin` + `latin-ext`. Sirf `fonts.gstatic.com` ke URL liye jaate hain
- Google ek bhi na-maujood weight maango to 400 deta hai → axis kram se aazmaye jaate hain (asli Google pe naapa:
  DM Sans pehli koshish, Merriweather teesri, Playfair chauthi, Poppins chhathi)
- Admin ka bheja `faces` kabhi nahi maana jaata; wahi family pehle se ho to dobara download nahi
- Custom: `POST /api/settings/fonts` — **magic bytes** (`wOF2`/`wOFF`), 2MB, content hash naam
- Size: har `--fs-*` token ek step me (test check karta hai koi chhoota/do baar nahi). Step badla → uske saare token
  desktop/tablet/mobile teen naap pe (clamp ki jagah). Default = step ke pehle token ka aaj ka naap
- ⚠️ **Weight · line spacing · character spacing sirf asli `h1`–`h6` aur `body` pe.** Card title jaise `<div>` ka weight uski
  apni CSS se — alag refactor
- Heading font `h1`–`h6` pe (`--font-heading`); component titles jo `<div>` hain wo body font lete hain

### ⚠️ Jo abhi nahi dekha gaya

- Admin screens browser me **login karke** nahi khuli (credentials nahi) — build, lint, tests pass
- Site pe asar **asli DB ke bina** dekha: page ka HTML + test `themeCss` ek chhote proxy se screenshot — rang, layout, size teeno lage
- Google download asli network pe sirf **CSS parse** tak chalaya; file save test me nakli fetch se
- Session ke aakhir me C: **31 MB** pe aa gayi, Mongo (Docker) ruk gaya — dev API bhi. Code ka kasoor nahi (API akele chal jaati hai)

## D-99

**Headings ke common naap — har h1 ek, har section heading ek, har h3 ek (client, 18 Sep)**

**Status:** ✅ Lag gaya. **Migration 026.** HTML nahi badla (SEO).

### Kyun

A-32 ki baat: ek hi tag alag jagah alag size ka tha (reference se — D-73 ki virasat). `<h3>` 15 rule me 8 size.
Client ne page-wise dekh kar naap tay kiye, taaki token kam hon aur Fonts ki H1/H2/H3 row sach me har h1/h2/h3 chalaye.

| Tag | Desktop | Tablet (≤1024) | Mobile (≤767) | Kahan |
| --- | --- | --- | --- | --- |
| h1 | 40 | 34 | 28 | hero, package title, blog post title, content h1, 404 |
| h2 | 25 | 23 | 21 | har section heading + offer heading |
| h2 footer | 11.5 | — | — | `.ft__col h2` — alag hi (client) |
| h3 | 16 | 16 | 16 | har card title / h3 |
| h3 apwaad | 19 | 19 | 18 | `--fs-h3-lg` — home form card, island map panel |
| h3 apwaad | 24 | 22 | 20 | `--fs-h3-xl` — blog ka bada feature card (ek hi page) |

Home ke offer cards (13) · package grid card (14) · Included/Excluded (13) → 16 — client: _"koi bat nhi, abhi common rakho"_.
Tablet/mobile client ne kaha _"inhi common fonts ke hisab se"_ — aaj ke clamp ke anupaat se nikaale.

### Code

- `globals.css`: `--fs-h1/h2/h3` = 40/25/16 (+ `@media` 1024/767), naye `--fs-h3-lg`/`--fs-h3-xl`. Hate: `--fs-title`,
  `--fs-hero-title`, `--fs-section`, `--fs-display`, `--fs-card-lg`, `--fs-card-md`, `--fs-xl`
- `theme-fonts.js`: **H1–H6 steps ab sirf apne tag ka token** — admin me H2 badlo to sirf section heading. Daam, stats,
  quote, bade numbers aur h3 ke do apwaad `FONT_FIXED_TOKENS` me — admin se nahi, A-32 ("Text Elements") tak
- Body step me `--fs-md` bhi aaya (mega menu links)
- **Migration 026**: `themeFonts.scale` me jo step 17 Sep ke default ke barabar save tha wo hataya — warna naye
  default ke saamne wo "badla hua" ginta aur site pe lagta (jaise har h3 pe 21px). Client ka badla hua value nahi chhuta
- Test: H1–H3 defaults `globals.css` (root + dono @media) se milte hain; har `--fs-*` ya step me ya fixed list me

⚠️ Mobile ka render aankh se nahi dekha — headless Chrome 500px se chhoti window nahi banata.

### D-99 §2 — text ke 3 naap aur bade non-heading (usi din)

| Kya | Naya | Client |
| --- | --- | --- |
| Har paragraph/button/table cell | **Body 14** (13.5 · 14 · 14.5 the) | ✅ |
| Meta, nav, mega menu links, breadcrumb, table header | **Small 13** (12 · 12.5 · 13 the — 12 wale 25 jagah) | ✅ |
| Badge, chip, label, footer heading, award badge "CHOICE" (8 tha) | **Extra small 11** (10–11.5 the) | ✅ |
| FAQ ka sawaal | h3 16 (14.5 tha) | ✅ |
| Home Customer reviews — naam / package | Small / Extra small | ✅ |
| `.imcc__b span` | Small | ✅ |
| Package bada daam (38) | **h1** | ✅ |
| Package intro (17) · tour/home hero line (15.5) · 16 wale sab (icons, caption, contact phone…) · island count (17) | **h3 16** | ✅ |
| Hotel category daam (17) · home hero stats/daam (19) · contact promise (18) · pull quote (21) | **19** (`--fs-h3-lg`, mobile 18) | ✅ |
| FAQ + / − icon (20) | alag hi (`--fs-glyph`) — _"h3 change hua to icon thodi change karenge"_ | ✅ |
| Offer box 34 · sidebar daam 30 · stat patti 28 · row daam 26 · map pin 9.5 | same | ✅ |

**Token: 41 (subah) → 36 (§1) → 17.** Fonts ki Body / Small / Extra small rows ab ek-ek token chalati hain
(`--fs-body` / `--fs-small` / `--fs-xsmall`); `FONT_FIXED_TOKENS` me 8 bache. Migration nahi lagi (in teen ke default nahi badle).

### D-99 §3 — Fonts ke weight / line / spacing sach me lagein (usi din)

Client ne pakda nahi, maine jaanch me dikhaya: Fonts screen ke weight/line/spacing sirf asli `h1`–`h6` aur `body` pe
lagte the — hero title, section heading, cards ka apna weight CSS me tha aur wahi jeet-ta tha. **Small / Extra small
ke khaane kuch karte hi nahi the.** Client: _"1 + 2(a) shuru karo"_.

- `globals.css`: har rule jo kisi level ka size leta hai (245), uska apna weight/line/spacing ab
  `var(--<level>-w, <aaj ki value>)` — **167 weight · 57 line · 68 spacing**. Admin na badle to fallback = aaj ki value
  (script ne poori file verify ki — variables hata do to CSS bilkul pehle jaisi)
- `themeFontCss`: har level ke `--<key>-w/lh/ls` (Small/Extra small bhi — `key` se, tag nahi) aur **sirf jo field
  badla** — sirf size badalne pe weight nahi jaata, warna level ke saare rules ke alag weight chup-chaap ek ho jaate
- Test: level-size wale har rule ka weight/line/spacing variable ke peeche hai (koi naya rule bhoole to fail)

**Naap (globals.css ke declarations, :root chhod kar):** size 245/262 (94%) · weight 174/215 (81%) · line 64/80 (80%) ·
spacing 75/91 (82%) — **kul 86% Settings ▸ Fonts se**. Baaki: 8 fixed size token + `--fw-*` (Custom CSS se, D-99 ka
snippet), aur size-level ke bina wale rules (`strong`, `b`, 404 number) — wahan Custom CSS me selector.

## D-100

**Settings ▸ Layout ▸ Spacing — Section spacing, Block spacing, Cards gap (row + column).** 18 Sep, client. Koi migration
nahi.

Client ne Layout ke naye options me se sirf yahi chune — _"ye almost 100% site par use honge"_. Box padding, sidebar
chaudai, article chaudai, image ke kone, form ke khaane, header shadow, button ke capitals: **nahi**.

**§1 — Teen tarah ki jagah, do khaane.** Site pe "section ke beech ki jagah" teen shakal me thi:

| Token | Kahan | Default (mobile → desktop) |
| --- | --- | --- |
| `--space-section` | poori chaudai ke band — home ke sections (`.hsec` · `.ic`), neela banner (`.sec`), package CTA (`.pkg__cta`) | 28 → 46 |
| `--space-block` | block design — card se card: package/tour `.pgl__main`, Section layout page `.secpg` | 22 → 38 |
| `--space-block-in` | single content card ke **andar** block se block — Default page, blog post (`.art > .blk + .blk`) | 22 → 32 |

Client ne poochha ki block aur single content alag design hain; faisla: `--space-block-in` ka **apna khaana nahi** —
Block spacing ke anupaat me chalta hai (desktop × 32/38, mobile wahi). Client ko ye farak samajhna hi na pade ki blocks
alag cards me hain ya ek card ke andar. Hero ki andar ki padding, tour ki stat patti, 404, heading ke neeche ki jagah
aur footer **bahar** — unka apna design hai.

**§2 — Clamp ka beech ka hissa aaj ki chaudai pe.** Admin sirf desktop aur mobile deta hai. `themeLayoutCss`
`clamp(mobile, calc(mobile + (100vw − from) × slope), desktop)` banata hai, jahan `from/to` aaj ke clamp se nikle
(`3.4vw` = 820→1350, `2.8vw` = 790→1360, `2.6vw` = 850→1230) — yaani sirf sire badalte hain, bartaav nahi. Dono barabar
ho to seedha `px`. Desktop mobile se chhota bhi chal jaata hai (clamp ke lo/hi palat kar).

**§3 — Cards gap common, row aur column alag.** Card grids 10 · 11 · 12 · 14 me bati thin; client: _"1-2px se kuch nahi
hota"_ — sab 14. Row aur column ke **do khaane** (client: _"may be i want row or column gap kam"_), CSS me
`gap: var(--gap-card-row) var(--gap-card-col)`. 19 grid: `.atg .inx .catbar__g .sim .rev__track .prows .dgrid .bpg .pn
.feat .feat__side .ic__grid .vrl .imc .tmg .lgg .ipk .ofc--grid .contact-steps .promise`. Mobile `.imc` ka 11px hata.
Reviews slider ki card chaudai (`calc((100% − 2 × gap) / 3)`) aur Offer slider ka `--ofc-gap` ab column gap se.
**Bahar:** gallery (collage), award badges, contact methods/offices, mega menu, mobile patti, form.

**Look:** script ne purani aur nayi CSS milaayi (tokens default pe) — farak **sirf** cards gap ka: `.atg .sim .rev__track
.dgrid .pn .contact-steps .promise` 12→14, `.catbar__g .lgg` 10→14, mobile `.imc` 11→14. Section/block spacing
bilkul wahi. Test: har card grid token pe hai, aur defaults `globals.css` se milte hain.

## D-101

**Home page ki speed — naap ke saath, mobile 77 → 91–97 (PageSpeed), desktop 100.** 18 Sep, client ka lakshya (A-17):
_"fast, serve page from cache, score of 100 in Google Page Speed, all pages"_. Koi migration nahi.

**Naapne ka tareeka** wahi jo D-85 me hai: `next build` + `next start`, Lighthouse mobile, 5 run ka median; aakhir me asli
**PageSpeed Insights** tunnel se (`merncms-site-tunnel`). Local 93 aur PageSpeed 91–97 aapas me milte hain.
⚠️ Keyless PageSpeed API ka saanjha quota din me khatam ho jaata hai (`429`) — browser se `pagespeed.web.dev` chalta hai.

| Badlaav | Home mobile (median) | LCP |
| --- | --- | --- |
| Shuru | 77 | 4.7s |
| §2 Custom editor ki `<img>` lazy | 89 | 3.35s |
| ~~§5 `experimental.inlineCss`~~ | ~~74~~ — rad | — |
| §3 fold ke neeche ke sections `content-visibility` | 92 | ~3.15s |
| §4 band mobile drawer `content-visibility: hidden` | 93 | ~3.05s |

**§1 — Apne origin ka `/uploads/` link relative, write pe (`relativizeOwnUploads()`, `core/sanitize-html.js`).** Console
me das `ERR_CONNECTION_REFUSED`: island map (Custom editor) ki image `http://localhost:5173/uploads/…` thin — Media Library
ka **Copy URL** jaan-boojh kar poora URL deta hai, aur admin ka origin paste ho gaya. Live pe ye image kabhi chalti hi nahi.
Ab sanitizer (block **aur** inline profile) `OWN_ORIGINS` (`SITE_URL` · `ADMIN_URL` · `EXTRA_CORS_ORIGINS`, ab
`core/env.js` me ek jagah — CORS bhi wahi padhta hai) wale `src/href/srcset/poster` ko `/uploads/…` bana deta hai, aur
`../../uploads/` ko bhi. Doosri site ka link aur CDN ka absolute URL nahi chhue jaate.
⚠️ `../../uploads/` TinyMCE ne banaya tha — default `relative_urls: true` link ko **admin ke page** (`/pages/home`) ke
hisaab se relative karta hai. Ab `relative_urls: false` + `remove_script_host: true` (`HtmlEditor.jsx`).

**§2 — `lazyImages()` (`apps/web/lib/article-html.js`), `CustomHtml` me.** Island map ki 10 `large.webp` (~330 KB)
page khulte hi utarti thin, jabki ek waqt me ek tab dikhta hai — hero ki image ke saath bandwidth baantti thin. Client ki
likhi `<img>` pe `loading="lazy" decoding="async"`, sirf jahan `loading` khud na likha ho. Ghar theme (wahi tark jo
`wrapTables()` pe) — DB me HTML jaisa likha waisa.

**§3 — `.home > section:not(:first-child)` pe `content-visibility: auto`.** D-85 wala hi ilaaj, home pe. Pehla section
(hero / jo sabse upar ho) chhoda. Keemat wahi: pehle scroll pe scrollbar ka naap badalta hai, aur `contain: paint`
section ke bahar ka hissa kaat-ta hai — isliye **`VideoModal` ab `createPortal(…, document.body)`** se: section ke andar
`position: fixed` screen se nahi, section se chipakta.

**§4 — Band drawer `content-visibility: hidden`.** `visibility: hidden` ka layout **phir bhi hota hai**; drawer me ~205
element (poora menu) the — page ke pehle layout ke ~361 me se aadhe. `content-visibility` ka transition
`allow-discrete`, taaki band hote waqt slide ke **baad** lage.

**§5 — `experimental.inlineCss` naapa aur rad hua.** FCP ~0.3s sudhra, par CSS RSC payload me bhi chali gayi — HTML
340 → 558 KB, TBT 129 → ~600ms, **89 → 74**. `next.config.js` me wajah likhi hai.

**§6 — Jo bacha (A-17):** render-blocking CSS (~420ms) — poori site ki **ek** 108 KB file, home uska ~15% use karta
hai. Do raaste: critical CSS (CLS ka khatra) ya CSS ka template-wise batwara (ek catch-all route ki wajah se shayad kaam
na kare). Abhi nahi — pehle baaki pages 90+. **Chhue nahi:** unused JS 46 KB (Next/React framework), legacy JS 11 KB
(Next ka polyfill, iOS < 15.4 ke liye), hero image ka size (client khud chhoti image lagayega).
⚠️ Ek aur mila: page ka HTML `Cache-Control: private, no-store` jaata hai — data cache hota hai (D-83), poora page
CDN/browser me nahi. "Serve page from cache" wali shart hosting ke waqt.
⚠️ Beech me mila (docs me nahi tha): machine pe **Windows service `MongoDB`** bhi `127.0.0.1:27017` pe chalti hai. Docker
band hone pe API chup-chaap us **khaali** DB se jud gayi, `My Site` wali settings bana di, aur site ne wo ek ghanta cache
rakhi. Asli DB (Docker) safe raha.

---

## D-102

**Desktop ke floating WhatsApp + phone button — reference ka `.float`, jo kabhi bana hi nahi tha**
(client, 21 Sep 2026)

**Status:** ✅ ban gaya · koi migration nahi

### §1 — Ye naya feature nahi hai

Client ne kaha _"whatsapp and phone icon on desktop too but with settings — in which side left or
right"_, aur saath me _"kisi bhi reference me dekho kaise aa rahe hai desktop par"_.

Dekhne pe nikla ki `.float` **saaton site reference me maujood hai**, bilkul ek hi CSS ke saath —
`home-nav-v3` · `tour-v3` · `itinerary-v3` · `blog-v1` · `blog-detail-v1` · `contact-us` ·
`page-template-text`. Theme me wo kabhi bana hi nahi. Yaani R15 ke hisaab se ye **chhoota hua**
hissa tha, naya ask nahi.

⚠️ **Lakshan wahi tha jo D-86 aur D-89 me likha gaya hai — "kuch na hona".** Koi error nahi, koi
toota hua page nahi. `.mobar` ban gayi thi (wo bhi usi reference me thi, do line neeche) aur
`.float` chhoot gayi. Reference se milaan **section-by-section** hota to ye pehle din pakda jaata.

### §2 — Reference ne chaar faisle khud kar diye

| Sawaal | Reference ka jawab |
| --- | --- |
| Kram | WhatsApp **upar**, phone neeche (`flex-direction: column`) |
| Shakl | 48×48 gol, sirf icon, **koi label nahi** — naam `aria-label` me |
| Default taraf | `right: 16px; bottom: 16px` |
| Mobile | 760px se neeche `display: none` — wahan `.mobar` yahi do kaam karti hai |

z-index ka kram bhi wahin se: `.sidetab` 94 < **`.float` 95** < `.mobar` 96.

⚠️ **Ek mashwara reference ne kaat diya.** Maine pehle kaha tha ki desktop pe hover karne par number
dikhna chahiye (kyunki desktop pe `tel:` ka khaas matlab nahi). Reference me saada `tel:` link hai —
R15 ke hisaab se wo jeeta, aur wo idea chhod diya gaya.

### §3 — `floatingContactSide`, aur uska **koi on/off toggle nahi**

Ek hi field, dono button ke liye (client ka apna shabd: _"left ya right ka dropdown **for both
buttons**"_): `settings.floatingContactSide` — `'right'` (default) | `'left'`.

⚠️ **Toggle jaan-boojh kar nahi hai.** Button `settings.phone` aur `settings.whatsapp` se bante hain;
dono khaali to component `null` lautata hai — wahi D-30 wala guard jo `.mobar` pe pehle se hai. Alag
toggle rakhne ka matlab hota **"band" ke do matlab**, aur wo ek din alag ho jaate: number bhara hua
par toggle off, ya ulta. Admin ki hint yahi batati hai, warna client "band kaise karun" pe atak jaata.

### §4 — `left` ek **modifier** hai, `.float` ka badla hua roop nahi

```css
.float        { right: 16px }
.float--left  { left: 16px; right: auto }
```

⚠️ **`right: auto` zaroori hai** — sirf `left` likhne se dono taraf set reh jaate aur button khinch
kar poori chaudai le leta. Base class ko seedha badalna wahi galti hoti jo `.pgl` pe bachayi gayi thi
(D-87 §11): `.pgl--sideleft` bhi isliye modifier bana tha.

### §5 — Dono ek saath kabhi nahi, aur wo rok **CSS me** hai

760px se neeche `.float` gayab, `.mobar` haazir. Ye JS se karne ka matlab hota server pe ye tay karna
ki screen kitni chaudi hai — jo ISR ke saath ho hi nahi sakta (sab ko ek hi HTML jaata hai).

Iska test bhi likha gaya (`apps/web/components/floating-contact.test.js`) — component ka render test
is repo me possible nahi (theme ke components ka koi render setup nahi), par ye invariant **CSS me**
hai aur CSS padhi ja sakti hai. Wahi tark jo D-92 §10 pe liya gaya tha.

⚠️ Test likhte waqt ek cheez khud pakdi gayi: `globals.css` me `@media (max-width: 760px)` ke
**kai** block hain, isliye sirf pehla uthana galat jawab deta hai.

### §6 — `layout.jsx` me mount, kisi page component me nahi

`settings` wahan pehle se hai, aur isse ye saare page type pe ek saath aa jaata hai.

⚠️ **Page-by-page lagane ka nateeja saamne hi hai** — `.mobar` har page component me alag se lagayi
gayi thi aur wo **tour page aur blog listing pe aaj bhi nahi hai**. Naya page type banate waqt aisi
cheez har baar chhoot sakti hai.

### §7 — Kahan-kahan juda (chain poori hai)

Zod (`schemas/settings.js`) → Mongoose model (**strict** — bina iske field chup-chaap girta, API
phir bhi 200 deti) → public projection (`toPublicSettings`) → admin ka dropdown → theme.

⚠️ Test **response nahi, DB** padhta hai — wahi whitelist wala jaal jo `updatePackageDefaults()` pe
chaar baar lag chuka hai.

✅ **Cache ka koi kaam nahi karna pada** — `updateSettings()` pehle se `revalidateTags(['settings'])`
bhejti hai aur `getSettings()` usi tag pe hai. A-26/A-29 wala rog yahan banta hi nahi. Agar ye field
home ke section me rakha jaata to wahi bug dobara banta.

### §8 — Jo nahi banaya

**`.sidetab`** — daayein kinare pe khadi do vertical patti (`Why us?` · `Offers`), z-index 94. Wo bhi
saaton reference me hai aur wo bhi kabhi nahi bani. Client ne 21 Sep ko kaha _"only these 2 buttons
ke liye banao aur patti baad me"_ — isliye wo khuli hui hai (A-34).

---

## D-103

**Enquiries ▸ Popup — poori site ka ek popup enquiry form** (client, 21 Sep 2026)

**Status:** ✅ ban gaya · koi migration nahi

### §1 — Client ne scope do baar badla, aur dono baar chhota nahi kiya

Pehla message: _"form Popup on home page / session based / 1 time or multitime / kitne time tak"_,
ek screenshot ke saath jiske baare me unhone khud kaha _"this image is not actual design reference,
its only details"_.

Doosra message ne teen cheezein badlin:

1. _"popup enquiries me banega as a submenu"_ — jagah `Settings` nahi, **Enquiries**
2. _"only home page nahi hoga, may be all pages ke liye ho"_ — sirf home nahi
3. _"saare options admin ke paas ho — kitna time baad dikhe, kaun se page par"_

Uske baad ke chaar jawab: **single popup only, single setting for all pages** · page **type ke
checkbox** se · timing _"admin can handle by enter time"_ · images **jitni chahiye utni**
(_"if i choose 2 then 2, i choose 1 then one"_).

### §2 — Screen Enquiries me, data `settings` me — aur ye teesri baar hai

`settings.popupSettings`. Screen `/enquiries/popup`.

**Screen ki jagah data ki jagah tay nahi karti.** Bilkul wahi batwara `Tour settings` (8 Sep —
menu me Tour ke neeche, storage `settings.tourSettings`) aur `Blog settings` (D-93 — menu me Posts
ke neeche, storage `settings.blogSettings`) pe ho chuka hai. Permission bhi wahi rehti hai:
`settings.read` nav pe, `settings.update` form pe. `form.read` maangna jhooth hota — form yahan
sirf **chuna** jaata hai.

⚠️ **`settings` me hone ka ek asli faayda hai:** `updateSettings()` pehle se
`revalidateTags(['settings'])` bhejti hai, yaani popup badlo aur wo **turant** site pe. Home ka
section hota to badlaav ek ghante tak na dikhta — A-26/A-29 wala hi rog.

⚠️ Route `/enquiries/popup` **`/enquiries/:id` se pehle** hai. File me ye chetavni pehle se likhi
thi (`forms` ke liye), aur wahi jaal is static segment pe bhi lagta.

### §3 — Popup ke apne fields nahi hain

Screenshot me saat khaane the. Wo sab `forms` module se aate hain — client `Enquiry Forms` me form
banata hai aur popup me use **chun** leta hai (`formId`). Popup ko fields ka gyaan hai hi nahi.

Form ki paribhasha do jagah rakhne ka nateeja D-86 me dekha ja chuka hai. Theme me bhi doosra form
component nahi bana — `EnquiryForm` ka `variant="page"` (koi card nahi, kyunki popup khud card hai),
wahi faisla jo D-87 §11 pe tha.

### §4 — Dikhne ka faisla teen hisson me bant-ta hai

| Sawaal | Kahan |
| --- | --- |
| Popup chalu hai? form hai? koi page ticked hai? | **server** — `toPublicPopup()` (API) |
| *Is* page pe aaye ya nahi | **server** — `popupForType()` (catch-all) |
| Is *visitor* ko aaye ya nahi | **browser** — `sessionStorage`/`localStorage` |

Teesra server pe ho hi **nahi sakta**: har page ek hi cached HTML deta hai (ISR), isliye server ko
pata ho hi nahi sakta ki kis visitor ne popup dekha. Iska ek nateeja client ko pata hona chahiye —
**history saaf karne pe popup phir dikhega**.

### §5 — Page chunav **type ke checkbox** se, per-page list se nahi

`POPUP_PAGE_TYPES` — `homePage` · `package` · `tourPage` · `post` · `blogPage` · `page`.

Client ka faisla, aur wo unke kaam ka hai: **naya page banega to wo apne type ka niyam khud le
lega.** Per-page list me naya page apne aap nahi judta aur use yaad rakh kar jodna padta — aur
bhoolna hi is repo ki sabse aam galti hai.

⚠️ `showOn` **`.strict()`** hai. Bina iske `showOn: { tourPages: true }` (ek `s` zyada) 200 deta,
"Saved." dikhta, aur popup un pages pe **kabhi nahi** aata. Ek page type ka naam galat likhna sabse
aasan galti hai, isliye rok schema me.

⚠️ Ye chhe naam **theme ki catch-all branch** ke saath jude hue hain. Naya page type jodo to
`POPUP_PAGE_TYPES` me bhi jodo — warna us type pe popup chup-chaap kabhi nahi aayega.

### §6 — Teen bug tests ne pakde, live chalane se pehle

**(a) Adhoora PATCH poora popup uda deta tha.** `popupSettingsSchema` ke har field pe `.default()`
hai; `updateSettingsSchema` ka `.partial()` **sirf upar wale level pe** lagti hai (file me ye
comment pehle se tha). Isliye `{ enabled: false }` Zod se **poora** object ban kar nikalta
(`formId: ''`, `heading: ''`…) aur `MERGED_KEYS` wala merge un khaali defaults ko DB pe likh deta.
Ye 10 Sep wale `blogSettings` data-loss ka hi ek kadam pehle wala roop hai. Ilaaj:
`popupSettings: popupSettingsSchema.partial().optional()`.

**(b) `showOn` ki anjaan key chup-chaap gir rahi thi** — `.strict()` (§5).

**(c) Heading ki HTML sanitize hi nahi ho rahi thi.** ⚠️ **Settings me ye pehli HTML hai** — aaj tak
yahan sab plain text tha (`customCss` ka apna guard schema me hai), isliye is module me koi sanitizer
tha hi nahi. Ab `sanitizePopupSettings()` hai (R20). **Naya HTML field settings me jodo to wahan bhi
jodo** — chhoot jaane ka matlab ye nahi ki content girega, wo **bina safai ke bach jaayega**.

⚠️ **Wo function pehle galat jagah likha gaya tha** — `settings/service.js` me, jabki R20 saaf kehta
hai ki har service apna sanitize na likhe. Session ke aakhir me doc-check pe pakda gaya aur
`core/sanitize-html.js` me chala gaya, baaki chaar ke saath. R20 ki table ab paanchon entry point
ginati hai (usme `sanitizeSidebarWidgets()` bhi chhoota hua tha).

### §7 — Aur ek bug **live check** pe nikla, jo koi test nahi pakadta

Popup pehle `getSettings()` ke saath aata tha. Gating (`popupForType()`) sahi thi, par `/blog` aur
package page ke HTML me popup ka poora maal — **resolved form ke saare fields samet** — phir bhi
mil raha tha.

Jad: `settings` ka poora object teen **client components** ko jaata hai — `MobileNav` (header me,
yaani **har page pe**), `MobileBar` aur `TourSchema`. Client component ke props RSC flight data me
serialize hote hain. Yaani gating ke bawajood maal har page pe pahunch raha tha.

Ilaaj: `getSettings()` ab `popup` **nikal** deti hai, aur popup `getPopup()` se alag milta hai.
**Doosra round trip nahi** — dono wahi ek cached fetch padhte hain (`settings` tag).

⚠️ Baaki settings ab bhi poori serialize hoti hai. `MobileNav` ko chaar-paanch field chahiye, poora
object nahi — wo alag kaam hai (**A-36**).

### §8 — Form badle to `settings` ka cache bhi saaf

`forms/service.js` ab `type:package` + **`settings`** + `pathTagsForForm()` bhejti hai. Popup ka form
`pathTagsForForm()` me aata hi nahi (popup kisi ek page ka nahi, settings ka hissa hai). Bina iske
popup ka form ek ghante tak purana rehta, aur uska lakshan phir wahi "save nahi hua" jaisa hota.

### §9 — Jo nahi banaya

- **Campaign ki Start/End date** — maine mashwara diya tha, client ne us sawaal ka jawab timing ke
  saath diya (_"kab popup aayega admin can handle by enter time"_) aur tareekh nahi maangi. Jodna
  aasan hai: do field + `toPublicPopup()` me ek shart
- **Auto-close (N second baad popup khud band)** — maine iske khilaf salaah di (user form bhar raha
  ho aur popup gayab ho jaaye) aur client ne nahi maanga
- **Kai popups ki list** — client ne saaf kaha _"single popup only"_

---

## D-104

**Itinerary ke do khaane badle, aur ek naya Notes section bana** (client, 21 Sep 2026)

**Status:** ✅ ban gaya · **migration 027**

### §1 — Client ke chaar point, aur teen faisle jo poochhne pade

Client ke shabd:

1. _"make Meals input field in Itinerary Builder not checkbox becouse it could be more then 3 so in
   doc we can enter comma saperate"_
2. _"Popular add-ons ke thik upar ek notes ka section hoga jisme notes section aayega heading an
   content … also update in bulk upload for package bulk upload"_
3. _"itinerary builder me Transfer duration me About 2 hrs text data in doc to Transfer me merge
   hoke page par kyu aa rha hai"_
4. _"since Note is going to be section then remove from itinerary builder"_

#3 ek **sawaal** tha, instruction nahi — jawab §5 me. Baaki teen pe teen cheezein client se poochhi
gayin, kyunki har jawab alag kaam banata tha:

| Sawaal | Client ka jawab |
| --- | --- |
| Notes section ka heading kahan se — global ya per-package? | **Heading + content dono per-package** |
| Purane per-day `note` ka kya — DB me chhodein, mitaayein, ya section me jod dein? | **Migration se DB se bhi saaf** |
| Meals free text hone ke baad listing card ka `Breakfast` chip kaise tay ho? | **Text me `breakfast` shabd dhoondho** |

### §2 — Meals ab free text hain (enum gaya)

`z.array(z.enum(['breakfast','lunch','dinner'])).max(3)` → `z.array(z.string().trim().min(1))`.

**Ye A-38 ka seedha nateeja hai.** Client ke asli Kerala doc me Day 2 pe `Evening tea` likha tha.
Importer use enum ke bahar maan kar row ke issues me likh deta tha — yaani client ko **bataya** to
jaata tha, par us din ka wo meal page pe **kabhi nahi** pahunchta tha. Client ka jawab seedha tha:
teen se zyada ho sakte hain, to ginti ki hadd hi mat rakho.

⚠️ **Array hi rahi, ek string nahi.** Chip `Breakfast, Evening tea included` banti hai **aur** har
item ko alag se dekhna padta hai (`hasBreakfast()`); ek hi string rakhne par comma dono jagah dobara
todni padti — do alag jagah, wahi jaal jo D-43 §2 pe likha hai.

⚠️ **`MEAL_LABEL` khatam ho gaya.** Wo enum code (`breakfast`) ko dikhne wale naam (`Breakfast`) me
badalta tha, **do jagah** — `packages/shared` me aur `PackagePage.jsx` me apni copy. Ab jo likha hai
wahi chhapta hai, to naksha ki zaroorat hi nahi.

⚠️ **`hasBreakfast()` `packages/shared` me hai, `public/service.js` me nahi.** Listing card ka
`Breakfast` chip isi se banta hai aur wo pehle `meals.includes('breakfast')` tha — free text ke saath
wo `Breakfast (buffet)` pe jhootha `false` deta. Matcher ek hi jagah hai, isliye kal koi doosra reader
bhi wahi niyam padhega (D-65 wala hi tark).

Admin me ab ek text box hai (`Breakfast, Dinner`), aur **comma pe todna/jodna wahin hota hai** — DB
me har meal apni entry rehti hai.

### §3 — Naya `fields.notes` — page ka ekmatra per-package heading wala section

`packages/shared/src/schemas/package-notes.js` — `{ heading, content }`. Page pe `Popular add-ons`
ke **theek upar**, `<section class="blk" id="notes">`.

⚠️ **Heading `Section Headings` se NAHI aata, aur ye D-65 ka apwaad hai.** Page ke baaki nau section
apna heading `packageDefaults.sectionLabels` se lete hain — ek jagah badlo, sab packages pe lage.
Client ne is ek ke liye ulta maanga (_"heading an content"_), aur uski wajah bhi saaf hai: notes har
package ke **apne** hote hain, to unka naam bhi har package ka apna hona chahiye (`Ferry timings` ek
pe, `Permit rules` doosre pe). Isliye ye section `PACKAGE_SECTIONS` me **hai hi nahi** aur
`Section Headings` screen pe uska koi tab bhi nahi — tab banane ka matlab hota do jagah.

⚠️ **Khaali ka matlab yahan D-65 se ulta hai.** Wahan khaali `heading` pe theme ka default wapas aata
hai (section bina title ke na rahe); yahan **dono khaali = section hai hi nahi**. Ye section optional
hai, aur theme us par kuch gadhti nahi: sirf heading likhi ho to akela heading, sirf content ho to
bina heading ke content — dono soorat client ki likhi hui hain.

Faisla payload me hota hai, theme me nahi — `notes` ya to poora object hai ya `null` (D-42 §2 wala
hi tark, taaki theme ko "dikhana hai ya nahi" khud na poochhna pade).

⚠️ `content` HTML hai, isliye `sanitizeEntryFields()` me wo bhi juda (R20). **Heading plain text hai**
— wo `<h2>` ke andar seedha chhapta hai, aur wahan editor dene ka matlab hota client heading ke andar
`<p>` daal de. Wahi lakeer jo `sectionLabels.heading` pe hai.

### §4 — Per-day `note` hat gaya, aur uska text mit gaya

`itinerary[].note` ek chip thi (`Approx. 4 hrs sightseeing`, spec 007 §9 #10, D-51 §1).

**Asli wajah A-38 me dikhi thi:** client us khaane me poora paragraph likh raha tha aur wo **200 akshar
pe kat** jaata tha — kyunki wo khaana ek chip ke liye bana tha. Section usi text ki sahi jagah hai, aur
client ne khud kaha ki tab wo din wala khaana rehna hi nahi chahiye.

**Mitane se pehle asli DB ginayi gayi — 84 din me se 49 pe `note` tha, aur wo sirf paanch alag
lines thi.** Sab chhoti chip hi hain, yaani field jiske liye bana tha wahi usme likha tha; koi lamba
paragraph is soorat me nahi khoya. Record isliye yahan hai ki mitaya hua text kahin to likha rahe:

| Kitne din pe | Line |
| --- | --- |
| 12 | `Add-ons priced below` |
| 11 | `Approx. 3 hrs sightseeing` |
| 11 | `Ferry tickets included` |
| 11 | `Kept free in case a ferry is cancelled` |
| 4 | `Approx. 4 hrs sightseeing` |

⚠️ **Migration 027 ne wo text DB se mita diya** — ye client ka chuna hua vikalp hai (teen me se: DB me
pada rehne do · mita do · naye section me jod do). Isliye `down()` use wapas nahi la sakta; wo sirf
`meals` ka naksha ulta karta hai. Asli rollback `mongodump` hai — wahi jo D-80/020 pe likha gaya tha.

⚠️ **Importer me `Notes` ka label jaan-boojh kar bacha hua hai.** Client ke purane doc me har din ke
neeche `Notes :` likha hai. Label `DAY_LABELS` se hata dene ka matlab hota ki wo line kisi label se
match na kare — aur tab wo **upar wale khaane ki value me chipak** jaati, bina kisi warning ke. **A-38
me theek yahi hua tha** (`Pricing` `bestFor` ke andar chala gaya tha). Ab parser use padhta hai aur
mapper use **girata hai, ek note ke saath**: _"Day notes are no longer used — put this text in the
'Notes Content' field above the itinerary."_

### §5 — Transfer aur duration ab do alag chip (client ka sawaal #3 ka jawab)

Client ne poochha ki doc ka `Transfer duration: About 2 hrs` page pe Transfer me **merge ho kar** kyun
aa raha hai. Wo bug nahi tha — `PackagePage.jsx` dono ko ek chip me jodti thi:

```js
text: [day.transfer?.name, day.transferNote].filter(Boolean).join(': ')   // `Ferry: About 2 hrs`
```

Client ka faisla: do alag chip, apne naam ke saath — **`Transfer: Flight`** aur
**`Transfer duration: About 2 hrs`** (unke apne shabd). Wahi shakl jo `Stay: Havelock` ki pehle se hai.

⚠️ **Duration ki chip transfer ke bina bhi banti hai** — ye shart D-64 me isliye kholi gayi thi ki
pehle `day.transfer &&` thi, yaani transfer na chuna ho to client ka likha hua `90 min` page pe **aata
hi nahi tha**, bilkul chup-chaap. Batwaare me wo shart bach gayi hai.

### §6 — Bulk Upload me do naye label

`Notes Heading` (plain text) aur `Notes Content` (doc ki apni HTML — bold/list/link bachte hain, wahi
batwara jo Overview aur Day Description pe hai).

⚠️ **Akela `Notes` label pehle tha, aur wo usi din hata dena pada.** Wo `Notes Content` ka shortcut
tha. Client ne doc me bilkul seedhi cheez likhi — `Notes Heading` ke neeche heading ki value **`Notes`**
— aur wo value **khud ek label ban gayi**: heading khaali reh gayi aur wo shabd content ka shuruaat maana
gaya. Koi error nahi, bas ek khaali heading. **Ye wahi shakl hai jo A-38 ke `Pricing` ki thi** — sirf ulti
taraf se: wahan text label na hone ki wajah se chipak gaya, yahan text label hone ki wajah se ud gaya.
Shortcut ka faayda us jaal ke saamne kuch bhi nahi tha. Ab uska apna test hai.

⚠️ **Dono `Day wise Itinerary` se PEHLE likhne hote hain.** Uske baad parser `DAY_LABELS` padhta hai
aur ye match hi nahi honge — wahi niyam jo `Best For`, `Ferries` aur hotel ke daam pe pehle se hai.
Client ke template me ye baat likhi jaani chahiye.

### §6.1 — Bullets din wale bullets jaise (client, usi din live dekh kar)

Client ne asli doc import karke page chala kar dekha: _"li ka marker color jaisa
`/packages/discover-andaman` pe hai waisa karo, baaki theek hai."_

Un bullets ka rang browser se aata hi nahi — itinerary ke din me wo `::before` ka **6px neela
dot** (`--blue-500`) hai. Notes ke liye wahi teen rule **dobara likhne ki jagah selector me
`.nts` jod diya gaya** (`RichTextDoc className="rt nts"`).

⚠️ **Copy na banane ki wajah wahi hai jo D-43 §2 aur D-65 pe likhi hai** — do jagah ek jaisa CSS
ek din alag ho jaata hai. Aur yahan wo itihaas theek isi rule pe pehle se likha hai: wo pehle
`.itin__l` thi, ek class jo theme khud lagata tha, aur D-80 me editor se aayi `<ul>` pe wo class
hoti hi nahi thi. Dono list ki wajah ek hi hai — **dono editor se aati hain**, isliye dono
**jagah** se bandhi hain, class se nahi (A-19).

### §7 — Kya nahi banaya

- **`Section Headings` me Notes ka tab** — client ne per-package heading maanga (§3)
- **`packageDefaults` me Notes ka global fallback** — na maanga gaya; jodne ka matlab hota "khaali ke
  do matlab" ka sawaal phir se
- **Meals ka koi suggestion/datalist** — teen naam ka dropdown wapas wahi hadd hota jo hatayi gayi

---

## D-105

**Master lists me bhara hua khaana khaali nahi kiya ja sakta tha** (client, 21 Sep 2026)

**Status:** ✅ theek ho gaya · koi migration nahi

Client, Kerala ke add-ons theek karte hue: _"in Add Ons why i am not able to update any value"_.

### §1 — Lakshan wahi tha jo is repo me baar-baar aata hai: **kuch na hona**

Client `Where` mitakar **Update** dabata tha. API **200** deti thi, admin _"Add-on updated."_
dikhata tha, aur DB me **purani value** baithi rehti thi. Koi error kahin nahi — na browser me,
na server pe. Bilkul wahi shakl jo D-86 (guard chup-chaap mar gaye) aur D-89 ("bana hua par juda
nahi") me likhi hai.

Saboot DB me pada tha: Kerala ke do add-ons pe `where` = `"All three ferry legs"` — wo **Andaman
ke `Ferry class upgrade`** ki line hai. Client use mitana chah raha tha aur mita hi nahi paa raha tha.

### §2 — Jad admin me thi, server me nahi

Poora server ka raasta saaf tha, aur wo pehle verify kiya gaya: `updateAddOnSchema.parse({price:''})`
→ `{price:''}` ✅ · `updateItem()` ka `$set: input` generic hai (koi whitelist nahi) ✅ ·
`addOnSchema` (model) me `price`/`where` dono hain ✅.

Galti `MasterListScreen.jsx` ke `submit()` me ek line thi:

```js
(value !== '' && value != null) || (editingId && mediaKeys.includes(key))
```

**Koi bhi khaali value payload se gir jaati thi.** Uski asli wajah theek thi aur us waqt likhi bhi
gayi thi — khaali `destinationId` server pe _"ye destination dhoondho"_ ban jaata hai aur 422 deta
hai. Par us ek line ne **har optional khaane** ko bhi pakad liya, aur nateeja ye tha ki bhara hua
khaana **kabhi khaali ho hi nahi sakta tha** — paanchon screens pe: add-on ka `price`/`where`,
hotel ka `room`/`note`, transfer ka `icon`, review ka `month`/`lastLine`, video review ka
`packageName`.

### §3 — Khaali ke do matlab, aur wo **field pe** nirbhar karte hain

| Khaana | Khaali bheja jaata hai? |
| --- | --- |
| `required` (naam · destination · category · stars · video link) | ❌ — wo form ki galti hai, server ki baat nahi |
| optional text | ✅ **sirf edit pe** — matlab "isse hata do" |
| `media` | ❌ create pe · ✅ edit pe (`null`, warna purani image chipki rehti) |

⚠️ **Create pe khaali ab bhi nahi jaata, aur wo jaan-boojh kar hai** — nayi row pe "hata do" ki koi
baat hi nahi hoti; wahan khaali ka matlab sirf "bhara nahi", aur schema ka apna default (`''`) wahi
kaam kar deta hai. Ye D-65 wale **"khaali ke do matlab"** ka hi doosra roop hai.

Pehle jaanch li gayi ki koi optional khaana khaali string pe 422 to nahi deta — `month` · `lastLine` ·
`room` · `note` · `icon` · `packageName`, chhaton pass. `videoUrl` (`.url()`) 422 deta, par wo
`required` hai, isliye us raaste pe aata hi nahi.

### §4 — Niyam JSX se bahar nikla, apne test ke saath

`lib/master-list-payload.js` → `toMasterListPayload()`, **6 test**.

⚠️ **`submit()` ke andar rehne se is niyam ka test likha hi nahi ja sakta tha**, aur usi wajah se wo
galti chup padi rahi. Yahi sabak D-92 §11 me `wrapTables()` pe mila tha: jo sirf chalane pe dikhta
hai, wo live page pe hi pakda jaata hai — aur tab tak client use jhel chuka hota hai.

---

## D-103 §8 — Popup ki naap aur close button (client, 21 Sep 2026, live dekh kar)

**Status:** ✅ theek ho gaya · koi migration nahi

Client ne popup **browser me khul_te hue** dekha (A-37 ka wahi check jo baaki tha) aur teen cheezein
batayin: _"popup ki width aur height thik karo, why there is scroller coming, aur close icon ko popup
ke side me rakho not on image."_

### Teenon shikayat ki **ek hi jad** thi

Dabba `840px` chauda tha aur uski image `aspect-ratio: 4 / 3` pe. Yaani image ki ooonchai **dabbe ki
chaudai se** banti thi — **ek** image hi `630px` oonchi, aur uske neeche poora form. Popup screen se
bahar nikal jaata tha, aur isliye scrollbar aata tha.

| Kya | Pehle | Ab |
| --- | --- | --- |
| Chaudai | `min(840px, 100%)` | **`min(560px, 100%)`** |
| Image ki ooonchai | `aspect-ratio: 4/3` (chaudai se) | **`clamp(130px, 20vh, 220px)`** (viewport se) |
| Scroll | `.pmod` **aur** `.pmod__box` dono | sirf `.pmod__box` |
| Close button | dabbe ke **andar**, image ke upar | dabbe ke **bahar** (`top: -44px`) |

⚠️ **Dabbe ka scroll hataya nahi gaya, sirf bemaani ho gaya.** Wo chhoti screen pe (ya lambe form pe)
Submit tak pahunchne ka **ekmatra** raasta hai — hata dene se phone pe form bhara hi nahi ja sakta.
Do scrollbar ka ilaaj `.pmod` (parde) se `overflow-y` hatana tha, dabbe se nahi.

⚠️ **`aspect-ratio` ki jagah `vh` — aur wo ittefaq nahi hai.** `aspect-ratio` ooonchai ko **chaudai**
se baandhta hai, yaani chhoti screen pe bhi image apna hissa nahi chhodti. Popup ko viewport me
samaana hai, isliye uski sabse badi cheez ki hadd bhi **viewport** se aani chahiye. `object-fit:
cover` ab bhi utna hi zaroori hai — client ki teen image teen alag naap ki hongi.

### ⚠️ Close button ke liye ek shell jodna pada, aur wo naya dhaancha nahi hai

Button `.pmod__box` ke andar tha. Use bahar le jaane ke liye aisa maa-baap chahiye jo **scroll aur
clip dono na kare** — aur `.pmod__box` dono karta hai (`overflow-y: auto` + rounded corners). Wahan
rakhne se button ya kat jaata, ya dabbe ke saath scroll hota.

Isliye `.pmod__shell` — bilkul wahi dhaancha jo **`.vmod`** (video popup) pe pehle se chal raha hai,
aur naap/jagah bhi wahin se li gayi (`top: -44px`, 36×36, `--on-dark` ka 16% wala circle).

⚠️ **Parde ki `padding` ab `56px 16px 16px` hai** — upar ki jagah **button ke liye** hai. Wo hat gayi
to button chhoti screen pe screen ke bahar chala jaata hai, aur tab popup band karne ka Esc ke alawa
koi raasta nahi bachta. Iska apna test hai.

⚠️ **Shell ki apni koi ooonchai nahi hai** (wo dabbe jitni hi hai), isliye button ke aas-paas ki khaali
jagah ab bhi `.pmod` ki hai — aur wahan click karne pe popup band hota hai. Wo handler
`event.target === event.currentTarget` pe chalta hai, to shell ke aane se wo toota nahi.

### 4 naye test — aur wo client ke dekhe hue tootan se aaye hain

`apps/web/components/popup-form.test.js` — wahi tark jo `floating-contact.test.js` ke sar pe likha hai:
is component ka sabse aasan tootan **CSS me** hai, JSX me nahi.

⚠️ **Test likhte waqt do baar apne hi comments code samajh liye gaye** — `aspect-ratio` ka zikr
`.pmod__pic` ke apne comment me hai aur `.pmod__box` ka zikr JSX ke comment me, aur dono assertion
unhi pe pass/fail ho rahi thi. Ab CSS aur JSX dono **comments hata kar** padhe jaate hain. Is repo me
comments me aksar **purani** value likhi hoti hai, isliye ye jaal yahan aam hai.

### ⚠️ Usi shaam ek aur sabak — D-89 wala `.next` jaal dobara laga

Verify karne ke liye `pnpm --filter @cms/web build` chala diya gaya **jabki dev server chal raha tha**.
Dono ek hi `.next` use karte hain; build ne uske vendor chunks kaat diye aur `:3000` **500** dene laga.
Code me kuch nahi toota tha — sirf chalta hua process. Ilaaj: dev server restart.

**Ye chetavni D-89 me pehle se likhi hai**, aur usi din client ko bhi batayi gayi thi. Phir bhi lagi.
Seedha niyam: **`next build` chalane se pehle `netstat` se dekho ki `:3000` khaali hai ya nahi.**

---

## D-103 §9 — Close button ka background, aur andar ka dabba (client, 22 Sep 2026, live dekh kar)

Client ne popup ka screenshot bheja: _"the close button does not look good, give it a background,
and also why there is scroller"_. **Do shikayat, par jad ek hi jagah nahi thi** — ek shakl ki thi,
doosri layout ki.

### §9.1 — Close button ab **thos** background pe hai

`.pmod__x` ka background `color-mix(in srgb, var(--on-dark) 16%, transparent)` tha — wo
`.vmod__x` (video popup) se aaya tha.

⚠️ **Wahan wo chalta hai, yahan nahi.** `.vmod` ke peeche poora video/kaala hota hai, to 16% safed
ka gola saaf dikh jaata hai. Enquiry popup ka button **site ke header ke upar** baithta hai (dabbe
ke bahar, `top: -44px`), jahan parde ke peeche se page ka halka rang aa raha hota hai — screenshot
me wo nav ke `Destinations` ke upar lagbhag gayab tha.

Ab `background: var(--surface)` + `color: var(--ink)` + `box-shadow: var(--sh-3)` — dabbe jaisa hi
safed gola, kisi bhi backdrop pe padha jaata hai. Hover pe ✕ accent rang ka.

⚠️ **`.vmod__x` jaan-boojh kar nahi badla** — wahan purana look sahi kaam karta hai. Ye wahi
`.pgl--sideleft` wali lakeer hai: ek jagah ka look doosri jagah se udhaar mat lo jab backdrop alag ho.

### §9.2 — Scroller ki asli wajah: **dabbe ke andar dabba**

Form popup me `variant="page"` pe chalta hai (D-103 §3 — doosra form component nahi banaya), aur
`.bkg--page form` apna card banata hai: `border` + `box-shadow` + `padding: clamp(18px, 2.4vw, 26px)`.

Contact page pe wo bilkul sahi hai — wahan form article ke beech me baithta hai aur use apna dabba
chahiye. Par popup **khud ek safed card hai**, to wahan wo do cheezein kar raha tha:

1. **dikhne me** dabbe ke andar dabba (client ke screenshot me andar ka border saaf dikhta hai)
2. **padding do baar** — `.pmod__body` ki apni (18/20/22) **aur** form ki (26 tak), yaani ~50px
   bekaar ooonchai. Yahi scroller aane ki sabse badi wajah thi

Ab `.pmod__body .bkg--page form` me wo card hata diya gaya. ⚠️ Override **`.pmod__body` ke andar
scoped** hai — bina scope ke contact page ka card bhi chala jaata.

⚠️ **Scroll poori tarah hata nahi, aur nahi hatna chahiye.** Chhoti screen ya lambe form pe wo
chahiye hi — bina uske Submit tak pahunchne ka koi raasta nahi bachta (D-103 §8 me yahi tay hua
tha). Ab wo **kam** aata hai, aur jab aata hai to `scrollbar-width: thin` + halka thumb ke saath —
Windows ka native bar (upar-neeche teer wala) nahi, wahi patla bar jo `.vrl` pe pehle se chal raha hai.

### §9.3 — Do chhoti safai jo isi kaam me nikli

⚠️ **`.pmod__x` pe `line-height: 1` D-103 me galti se likha gaya tha.** Us rule me
`font-size: var(--fs-small)` hai, aur `theme-fonts.test.js` ka niyam kehta hai ki aise rule me
`line-height` us level ke variable ke peeche ho. Button ko uski zaroorat hai hi nahi —
`place-items: center` ✕ ko beech me rakhta hai, aur `.vmod__x` pe wo kabhi thi bhi nahi.

**Wo test 21 Sep se do cheezein pakad rahi thi, aur dono ek jaisi dikhti thi.** Ek client ka apna
`.hf-stat span` edit tha (chhua nahi jaata), doosri meri. Ginti ek hi thi (`1 failed`), isliye
lagta tha ki purani wali hi hai — HEAD se milaa kar hi pata chala ki **do** hain.

⚠️ **`popup-form.test.js` ka `ruleOf()` galat rule padh raha tha.** Wo `indexOf(selector + ' {')`
karta tha, aur `.bkg--page form {` **`.pmod__body .bkg--page form {` ke andar** poora maujood hai —
yaani base rule maangne pe scoped override milta tha. Ab wo `\n` se line ke shuru pe anchored hai.
Theek wahi "rule mila hi nahi" wali chup galti jiski chetavni us file me pehle se likhi thi.

### §9.4 — Phone pe poori image-patti nahi (client, 22 Sep — do kadam me)

Client ne do message me kaha: pehle _"phone par popup se image hata do jisse poora popup thik se
dikhe, scroll na ho"_, phir _"image ke sath wala text bhi hatega"_.

`@media (max-width: 760px)` me `.pmod__pics { display: none }` — yaani image **aur** uske upar wala
heading dono. Patti `clamp(130px, 20vh, 220px)` leti thi; §9.2 wale ~50px ke saath milaa kar popup ab
aam phone pe bina scroll ke samaa jaata hai.

⚠️ **Beech me ek kadam galat andaaza tha, aur wo likhne laayak hai.** Pehle message par sirf
`.pmod__pic` chhupayi gayi thi aur heading jaan-boojh kar **bachayi** gayi thi — is soch se ki client
ka likha content chup-chaap gayab karna theek wahi galti hoti hai jo D-86 / D-89 / D-102 me pakdi gayi.
Client ne agle hi message me wo bhi hatane ko kaha.

**Sabak:** wo soch galat nahi thi — client ko **poochhna** sahi tha, aur poochha bhi gaya tha
("kaho to heading bhi hata dun"). Galti sirf ye hoti ki bina bataye maan liya jaata. Ab CSS aur test
dono me saaf likha hai ki **ye chhupna chaha hua hai, bug nahi** — warna agla padhne wala D-86 wala
sabak padh kar ise "theek" kar dega.

⚠️ **`.pmod__h--plain` isse bach jaata hai, aur wo sahi hai.** Wo bina image wale popup ka heading hai
aur `.pmod__pics` ke **bahar** rehta hai. Client ne "image ke saath wala text" hatane ko kaha tha —
jahan image hai hi nahi, wahan wo popup ka ekmatra title hai; use bhi chhupane ka matlab hota phone pe
ek **bina naam ka form**.

⚠️ **`eager` hata diya gaya — `display: none` wali image phir bhi download hoti hai.** Browser use
tabhi chhodta hai jab wo `lazy` ho. Yaani chhupi hui image theek us jagah bandwidth kha rahi thi
jahan wo sabse mehngi hai. `lazy` par kuch khota nahi: popup **khulne pe hi mount** hota hai, to
desktop pe image us waqt viewport me hoti hai aur turant utarti hai — wahi lamha jo `eager` deta tha.

⚠️ D-103 ka purana comment kehta tha ki `lazy` se "khaali dabba" dikhega. Wo tab sach hota jab popup
page ke saath render hota — par wo usi D-103 me badal chuka tha (popup sirf khulne pe banta hai) aur
**comment purana reh gaya tha**. Theek wahi jaal jiski chetavni `popup-form.test.js` ke sar pe likhi
hai: is repo ke comments me aksar hatayi hui value likhi hoti hai.

⚠️ **Teen image ko do column me laane wala phone rule hata diya gaya** — jab patti dikhti hi nahi to
uska column ka hisaab ek jhootha ishaara hai.

4 naye test (ab 11): poori patti phone pe chhupti hai · uska heading bhi jaata hai (**aur ye chaha
hua hai — test me hi likha hai ki badalne se pehle client se poochho**) · `--plain` wala heading
bachta hai · image `lazy` hai.

#### ⚠️ Chhote phone pe scroll phir bhi rahega, aur uski wajah image nahi hai

Mota hisaab (form ek column me — 7 khaane + message + submit ≈ 740px):

| Phone | Patti ke saath | Patti ke bina |
| --- | --- | --- |
| iPhone 12 (844px) | scroll | **samaa jaata hai** |
| Pixel 7 (915px) | scroll | **samaa jaata hai** |
| iPhone SE (667px) | scroll | **scroll** |

667px wali screen pe form khud itna lamba hai ki wo samaa hi nahi sakta. Do raaste, dono client ke
faisle hain: popup wale form me **kam khaane** rakhna, ya popup ke andar field ka gap kasna. Abhi
koi nahi liya gaya.
