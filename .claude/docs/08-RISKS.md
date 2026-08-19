# 08 — Risks & Known Traps

Har phase shuru karne se pehle apne phase wala section padho.

---

## Top 5 risks

### 1 · Page builder ka scope phat jaana
**Kya hoga:** "Elementor jaisa sab kuch" chaahoge to 3 mahine me bhi launch nahi hoga.

**Bachav:** Phase 5 me **sirf 10 blocks**, fixed layout system, constrained controls.
Animations, custom CSS box, z-index/absolute positioning — explicitly out.

**Signal ki risk aa gaya:** Phase 5b 2 hafte se zyada le raha hai, ya block list 10 se
badh rahi hai.

---

### 2 · Preview ≠ live output
**Kya hoga:** Client ka trust khatam. Ye ek baar ho jaaye to har publish se pehle client
manually check karega — aur CMS ka poora point khatam.

**Bachav:** Ek hi renderer (`packages/blocks`) + host-injected primitives (D-07) + ek hi
`styleToCss()`. Canvas sandboxed iframe me.

**Signal:** builder me spacing thoda alag dikhna. Chhota lagta hai — **ye chhota nahi
hai**, turant fix karo.

---

### 3 · Core update ka koi raasta na hona
**Kya hoga:** 3 client ship karne ke baad decide karoge to teen fork ban chuke honge,
aur unhe wapas merge karna naya project hai. Har security fix N baar.

**Bachav:** D-15 — versioned packages + patla client repo. **Phase −1 me freeze**,
baad me nahi.

**Signal:** koi client-specific file core repo me commit ho rahi hai.

---

### 4 · Phase 5 ko Phase 3-4 se pehle chhedna
**Kya hoga:** Bina public renderer aur templates ke builder banaoge to preview aur live
kabhi match nahi karenge — aur wo bug baad me **poora rewrite** maangta hai.

**Bachav:** Build order ka palan karo. Phase 3 me renderer pehle, builder Phase 5 me.

---

### 5 · Estimates 2x nikal jaana
**Kya hoga:** 23-28 hafte ka plan 40+ ho jaaye, aur client commitments toot jaayein.

**Bachav:** Phase 0→3 ka **patla vertical slice** pehle live karo (ek content type,
do block, ek template). Usse asli velocity pata chal jaayegi, aur do sabse risky design
(preview parity, cache invalidation) tab test ho jaayenge jab badalna sasta hai.

---

## Known traps — poori list

| Trap | Kya hoga | Bachav | Phase |
|---|---|---|---|
| **Slug unique par path nahi** | Do type ek hi URL pe, silent collision | Stored `path` + unique index | 1 |
| **Hardcoded `/blog/[slug]` route** | `urlPattern` configurable hone ka matlab khatam | Ek catch-all, `path` se resolve | 3 |
| **`/` kahin define hi nahi** | Homepage ka koi jawab nahi | `settings.homepageEntryId` | 3 |
| **Do cache layer** | "Publish kiya, site update nahi hui" | Ek authority + tag invalidation | 3 |
| **`revalidatePath` akela** | Archive, sitemap, feed stale reh jaate hain | Dependency map se `revalidateTag` | 3 |
| **Text index block content miss karta hai** | Admin search chup-chaap kuch nahi dhoondhta | `searchText` denormalized field | 1 |
| **`pending` status nahi** | `contributor` role non-functional | Status lifecycle | 1 |
| **Trash nahi** | Non-technical user data uda dega | `deletedAt` day 1 | 1 |
| **Reuse detection stateless JWT pe** | Feature exist hi nahi karta | `refreshTokens` collection | 0 |
| **Parallel 401 → refresh stampede** | Random logout, week 3 me | Single-flight mutex | 0 |
| **Hook me business logic** | `findOneAndUpdate` pe chup-chaap skip | Sab service layer me | 0 |
| **`setTimeout` se schedule** | Restart pe schedule kho jaata hai | DB-based cron + self-healing read | 1 |
| **Autosave + 2 editors** | Silent lost update | `version` field → 409 | 1 |
| **Original image serve karna** | Site slow, CWV down | Upload pe hi sharp se webp variants | 2 |
| **SVG upload** | SVG ke andar `<script>` chal jaata hai | Sanitize ya disallow | 2 |
| **Media local disk pe** | Instance stateful, deploy/backup mushkil | S3/R2 + CDN production default | 2 |
| **Media delete without usage check** | Live pages pe broken images | `mediaRefs` backlink index | 2 |
| **Staging Google me index** | Client ka duplicate content live se compete kare | `searchEngineVisible` + banner | 4 |
| **`settings.scripts` sab roles ko** | Editor → admin privilege escalation | Sirf `admin` role | 4 |
| **Canvas iframe same-origin** | Untrusted block content admin session ke saath | `sandbox` attribute | 5 |
| **HTML string save karna** | Aage kuch edit nahi hota | Hamesha JSON tree | 5 |
| **Inline style se responsive** | Media query likhi hi nahi ja sakti | `styleToCss()` scoped CSS | 5 |
| **Block `type` rename** | Saare stored pages toot jaate hain | Kabhi rename mat karo, migration likho | 5 |
| **contentType field delete** | 400 entries ka data ud jaata hai | Delete behaviour define karo | 6 |
| **Custom fields ko strict schema** | Har client pe migration | `fields` Mixed, validation contentType se | 6 |
| **Saara data ek page me** | Admin hang | Server-side pagination day 1 se | 1 |
| **15 alag backup cron** | 15 silent failure modes | Central fleet ops | 8 |
| **Untested backup** | Restore ke waqt pata chalta hai | Quarterly restore test | 8 |

---

## Phase-wise pre-flight

**Phase 0 se pehle**
- [ ] Phase −1 ke 8 faisle freeze
- [ ] Permission string list likhi hui hai
- [ ] Env schema define hai
- [ ] TypeScript ka faisla ho gaya (O-1)

**Phase 1 se pehle**
- [ ] `entries` + block envelope ka Zod contract freeze
- [ ] Seed definition tay
- [ ] Payload spike ho gaya ya explicitly skip kiya (O-2)

**Phase 3 se pehle**
- [ ] Cache tag taxonomy design hui
- [ ] Homepage/posts-page settings ka model tay
- [ ] Theme locations ka contract tay

**Phase 5 se pehle**
- [ ] Phase 3-4 poora aur live
- [ ] Ek asli client design blocks me toota hua hai (10 ki list guess se nahi nikli)
- [ ] `styleToCss()` ka output format tay

**Phase 8 se pehle**
- [ ] Kam se kam ek client instance staging pe chal raha hai
- [ ] Upgrade runbook ek baar practice ho chuka hai

---

## Jo risk accept kiya hai

Ye jaan-boojh kar liye gaye risks hain — inpe dobara bahes nahi karni:

| Risk | Kyun accept kiya |
|---|---|
| **JavaScript, TypeScript nahi** | Team familiarity. Mitigation: Zod + checkJs + tree-op tests (D-03) |
| **Teen apps ka ops overhead** | SEO ke liye Next.js chahiye hi (D-02). Mitigation: ek deployable unit + shared Mongo cluster |
| **Multi-instance ka ops cost** | Data isolation ka fayda zyada hai (D-01). Mitigation: fleet-level ops |
| **Custom CMS core build karna** | Control aur licensing. **Par:** Payload spike se ek baar verify karo (O-2) |
| **Builder me constrained controls** | Non-technical user ko poora CSS dena = site todne ka tool (D-20) |
