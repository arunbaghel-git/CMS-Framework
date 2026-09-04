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
